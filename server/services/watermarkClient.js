// server/services/watermarkClient.js
import fetch from "node-fetch";

const WM_URL = process.env.WM_SERVICE_URL || "http://localhost:5000";
const INTERNAL_TOKEN = process.env.INTERNAL_TOKEN || "internal123";

/**
 * 워터마크 삽입 요청
 * payload 예시:
 * {
 *   imageId: "...",
 *   ownerEmail: "...",
 *   callbackUrl: "http://localhost:4000/watermark/callback",
 *   srcPath: "C:/.../uploads/original/xxx.png",
 *   outPath: "C:/.../uploads/watermarked/wm-xxx.png",
 *   payload: "9fb9a4a05005ec23",
 *   method: "dwtDct"
 * }
 */
export async function requestApply(payload) {
  const res = await fetch(`${WM_URL}/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`WM apply failed: ${res.status} ${text}`);
  }
}

/**
 * 워터마크 추출 요청
 * payload 예시:
 * {
 *   srcPath: "C:/.../uploads/verify-temp/verify-xxx.png",
 *   method: "dwtDct",
 *   expectedLen: 16   // payload 문자 길이
 * }
 *
 * 반환: { ok: true, payload: "9fb9a4a05005ec23", ... }
 */
export async function requestExtract(payload) {
  const res = await fetch(`${WM_URL}/extract`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Token": INTERNAL_TOKEN,
    },
    body: JSON.stringify(payload),
  });

  const text = await res.text().catch(() => "");
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  // HTTP 에러 또는 Python 쪽에서 ok: false 일 때
  if (!res.ok || data.ok === false) {
    const msg =
      data?.error ||
      data?.message ||
      `WM extract failed: HTTP ${res.status}`;
    const err = new Error(msg);
    err.status = res.status;
    err.data = data;
    throw err;
  }

  return data;
}
