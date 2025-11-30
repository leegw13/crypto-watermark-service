# server/python/app.py
import os
import cv2
import requests
from flask import Flask, request, jsonify

from embed import embed_watermark
from extract import extract_watermark

app = Flask(__name__)

INTERNAL_TOKEN = os.environ.get("INTERNAL_TOKEN", "internal123")
NODE_BASE_URL = os.environ.get("NODE_BASE_URL", "http://localhost:4000")


def _check_internal_token(req):
    header = req.headers.get("X-Internal-Token")
    return header == INTERNAL_TOKEN


@app.route("/health", methods=["GET"])
def health():
    return jsonify(
        {"status": "ok", "message": "Hello, Watermark Server 👋"}
    )


@app.route("/apply", methods=["POST"])
def apply_watermark_route():
    data = request.get_json(force=True, silent=True) or {}
    if not _check_internal_token(request):
        return jsonify({"ok": False, "error": "invalid internal token"}), 403

    image_id = data.get("imageId")
    src_path = data.get("srcPath")
    out_path = data.get("outPath")
    payload = data.get("payload")
    key = int(data.get("key", 1234))
    callback_url = data.get("callbackUrl") or f"{NODE_BASE_URL}/watermark/callback"

    if not (image_id and src_path and out_path and payload):
        return jsonify({"ok": False, "error": "missing fields"}), 400

    try:
        # 워터마크 삽입
        os.makedirs(os.path.dirname(out_path), exist_ok=True)
        embed_watermark(src_path, payload, out_path, key=key)

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
def extract_watermark_route():
    data = request.get_json(force=True, silent=True) or {}
    if not _check_internal_token(request):
        return jsonify({"ok": False, "error": "invalid internal token"}), 403

    src_path = data.get("srcPath")
    key = int(data.get("key", 1234))
    expected_len = int(data.get("expectedLen", 16))  # 문자 길이

    if not src_path:
        return jsonify({"ok": False, "error": "srcPath is required"}), 400

    try:
        bit_len = expected_len * 8
        payload = extract_watermark(src_path, key=key, watermark_length=bit_len)

        return jsonify(
            {"ok": True, "payload": payload, "srcPath": src_path}
        )

    except Exception as e:
        err_msg = f"{type(e).__name__}: {e}"
        print("[extract_watermark error]", err_msg)
        return jsonify({"ok": False, "error": err_msg}), 500


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=False)
