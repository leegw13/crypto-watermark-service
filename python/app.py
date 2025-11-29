# server/python/app.py
import os
import cv2
import requests
from flask import Flask, request, jsonify
from imwatermark import WatermarkEncoder, WatermarkDecoder

app = Flask(__name__)

INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "internal123")
NODE_BASE_URL = os.environ.get("NODE_BASE_URL", "http://localhost:4000")


def _check_internal_token(req):
  header = req.headers.get("X-Internal-Token")
  return header == INTERNAL_TOKEN


@app.route("/health", methods=["GET"])
def health():
  return jsonify(
      {
          "status": "ok",
          "message": "Hello, Watermark Server 👋",
      }
  )


@app.route("/apply", methods=["POST"])
def apply_watermark():
  """
  Node 서버에서 오는 워터마크 삽입 요청 처리
  body 예시:
  {
    "imageId": "6791...",
    "ownerEmail": "user@example.com",
    "callbackUrl": "http://localhost:4000/watermark/callback",
    "srcPath": "C:/.../uploads/original/xxx.png",
    "outPath": "C:/.../uploads/watermarked/wm-xxx.png",
    "payload": "9fb9a4a05005ec23",
    "method": "dwtDct"
  }
  """
  if not _check_internal_token(request):
    return jsonify({"ok": False, "error": "invalid internal token"}), 403

  data = request.get_json(force=True, silent=True) or {}
  image_id = data.get("imageId")
  src_path = data.get("srcPath")
  out_path = data.get("outPath")
  payload = data.get("payload")
  method = data.get("method", "dwtDct")
  callback_url = data.get("callbackUrl") or f"{NODE_BASE_URL}/watermark/callback"

  if not (image_id and src_path and out_path and payload):
    return (
        jsonify(
            {
                "ok": False,
                "error": "missing fields",
                "required": ["imageId", "srcPath", "outPath", "payload"],
            }
        ),
        400,
    )

  try:
    bgr = cv2.imread(src_path)
    if bgr is None:
      raise FileNotFoundError(f"이미지를 읽을 수 없습니다: {src_path}")

    encoder = WatermarkEncoder()
    wm_bytes = payload.encode("utf-8")
    encoder.set_watermark("bytes", wm_bytes)

    # 워터마크 삽입
    bgr_encoded = encoder.encode(bgr, method)
    os.makedirs(os.path.dirname(out_path), exist_ok=True)
    cv2.imwrite(out_path, bgr_encoded)

    # 성공 콜백
    try:
      requests.post(
          callback_url,
          headers={"X-Internal-Token": INTERNAL_TOKEN},
          json={"imageId": image_id, "status": "done"},
          timeout=5,
      )
    except Exception as cb_err:
      print("[callback error]", cb_err)

    return jsonify({"ok": True, "status": "done"})

  except Exception as e:
    err_msg = f"{type(e).__name__}: {e}"
    print("[apply_watermark error]", err_msg)
    # 실패 콜백
    try:
      requests.post(
          callback_url,
          headers={"X-Internal-Token": INTERNAL_TOKEN},
          json={"imageId": image_id, "status": "failed", "error": err_msg},
          timeout=5,
      )
    except Exception as cb_err:
      print("[callback error on failure]", cb_err)

    return jsonify({"ok": False, "error": err_msg}), 500


@app.route("/extract", methods=["POST"])
def extract_watermark():
  """
  Node 서버에서 오는 워터마크 추출 요청 처리
  body 예시:
  {
    "srcPath": "C:/.../uploads/verify-temp/verify-xxx.png",
    "method": "dwtDct",
    "expectedLen": 16      # payload "문자 길이"
  }
  """
  if not _check_internal_token(request):
    return jsonify({"ok": False, "error": "invalid internal token"}), 403

  data = request.get_json(force=True, silent=True) or {}
  src_path = data.get("srcPath")
  method = data.get("method", "dwtDct")
  # expectedLen 은 "문자 개수" 기준 → 비트 길이로 환산
  expected_len_chars = int(data.get("expectedLen", 16))
  bit_len = expected_len_chars * 8

  if not src_path:
    return jsonify({"ok": False, "error": "srcPath is required"}), 400

  try:
    bgr = cv2.imread(src_path)
    if bgr is None:
      raise FileNotFoundError(f"이미지를 읽을 수 없습니다: {src_path}")

    # imwatermark 디코더 생성 (bytes + 비트 길이)
    decoder = WatermarkDecoder("bytes", bit_len)
    wm_bytes = decoder.decode(bgr, method)

    # numpy array, bytes 등 여러 타입일 수 있으므로 통일
    if isinstance(wm_bytes, bytes):
      raw = wm_bytes
    else:
      raw = bytes(wm_bytes)

    # UTF-8 문자열로 변환 + 뒤쪽의 널 문자 제거
    payload = raw.decode("utf-8", errors="ignore").rstrip("\x00")

    return jsonify(
        {
            "ok": True,
            "payload": payload,
            "srcPath": src_path,
        }
    )

  except Exception as e:
    err_msg = f"{type(e).__name__}: {e}"
    print("[extract_watermark error]", err_msg)
    return jsonify({"ok": False, "error": err_msg}), 500


if __name__ == "__main__":
  app.run(host="0.0.0.0", port=5000, debug=False)
