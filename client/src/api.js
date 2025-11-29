// src/api.js
// ✅ 백엔드(Node 서버)와 통신하는 공용 함수 모음

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

// 업로드/워터마크 결과 파일 URL 만들기
export function buildFileUrl(path) {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;

  const base = API_BASE_URL.replace(/\/+$/, "");
  const rel = path.replace(/^\/+/, "");
  return `${base}/${rel}`;
}

// 공통 응답 처리
async function handleResponse(res) {
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    const message = data?.message || `요청 실패 (HTTP ${res.status})`;
    const error = new Error(message);
    error.status = res.status;
    error.data = data;
    throw error;
  }
  return data;
}

/** ================== 인증 관련 ================== **/

// 회원가입: POST /auth/register
export async function registerUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/register`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res); // { message, userId }
}

// 로그인: POST /auth/login
export async function loginUser(email, password) {
  const res = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });
  return handleResponse(res); // { message, token }
}

/** ================== 이미지 관련 ================== **/

// 이미지 업로드: POST /upload (form-data: image)
export async function uploadImage(file, token) {
  const form = new FormData();
  form.append("image", file); // 서버에서 field name: 'image'

  const res = await fetch(`${API_BASE_URL}/upload`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });
  return handleResponse(res); // { message, image: {...} }
}

// 워터마크 요청: POST /watermark/apply
export async function applyWatermark(imageId, token, options = {}) {
  const res = await fetch(`${API_BASE_URL}/watermark/apply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ imageId, options }),
  });
  return handleResponse(res); // { message, imageId, watermark }
}

// 이미지 상세: GET /images/:id
export async function getImage(imageId, token) {
  const res = await fetch(`${API_BASE_URL}/images/${imageId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(res); // { id, original, watermark, createdAt }
}

// 내 이미지 목록: GET /images?page=&limit=
export async function getImages(token, page = 1, limit = 20) {
  const params = new URLSearchParams({
    page: String(page),
    limit: String(limit),
  });
  const res = await fetch(`${API_BASE_URL}/images?` + params.toString(), {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  return handleResponse(res); // { page, limit, total, items: [...] }
}

// 🔹 새로 추가: 워터마크 검증용 API
export async function verifyImage(file, token) {
  const form = new FormData();
  form.append("image", file);

  const res = await fetch(`${API_BASE_URL}/watermark/extract`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: form,
  });

  return handleResponse(res); // { matched, message, payload, image? }
}
