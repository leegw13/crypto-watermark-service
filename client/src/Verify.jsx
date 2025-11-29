// client/src/Verify.jsx
import { useState } from "react";
import "./verify.css";
import { API_BASE_URL } from "./api";

export default function Verify({ user }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);

  const [loading, setLoading] = useState(false);
  const [resultMsg, setResultMsg] = useState("");
  const [matched, setMatched] = useState(null); // true / false / null
  const [payload, setPayload] = useState("");
  const [matchedImage, setMatchedImage] = useState(null);

  const handleFileChange = (e) => {
    const f = e.target.files[0];
    if (!f) return;

    setFile(f);
    setMatched(null);
    setResultMsg("");
    setPayload("");
    setMatchedImage(null);

    const url = URL.createObjectURL(f);
    setPreviewUrl(url);
  };

  const handleVerify = async () => {
    if (!file) {
      setResultMsg("먼저 검증할 이미지를 선택해 주세요.");
      setMatched(null);
      return;
    }
    if (!user?.token) {
      setResultMsg("로그인 정보가 없습니다. 다시 로그인해 주세요.");
      setMatched(null);
      return;
    }

    setLoading(true);
    setResultMsg("");
    setMatched(null);
    setPayload("");
    setMatchedImage(null);

    try {
      const form = new FormData();
      form.append("image", file);

      const res = await fetch(`${API_BASE_URL}/watermark/extract`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
        body: form,
      });

      const data = await res.json().catch(() => ({}));
      console.log("verify resp:", data);

      const okMatched = !!data.matched;
      setMatched(okMatched);
      setPayload(data.payload || "");

      if (okMatched) {
        setResultMsg(
          data.message || "우리 서비스에서 생성한 워터마크가 확인되었습니다."
        );
        setMatchedImage(data.image || null);
      } else {
        setResultMsg(
          data.message ||
            "우리 서비스에서 생성한 워터마크를 찾지 못했습니다."
        );
      }
    } catch (err) {
      console.error(err);
      setMatched(null);
      setResultMsg("워터마크 검증 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="verify-page">
      <div className="verify-card">
        <h2 className="verify-title">워터마크 검증</h2>
        <p className="verify-desc">
          이 서비스에서 생성한 워터마크인지 확인해 드립니다.
        </p>

        <div className="verify-file-row">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileChange}
            className="verify-file-input"
          />
        </div>

        {previewUrl && (
          <div className="verify-preview">
            <p className="verify-label">검증 대상 이미지 미리보기</p>
            <img
              src={previewUrl}
              alt="verify-preview"
              className="verify-preview-img"
            />
          </div>
        )}

        <button
          className="verify-btn"
          disabled={loading || !file}
          onClick={handleVerify}
        >
          {loading ? "검증 중..." : "워터마크 검증하기"}
        </button>

        <p className="verify-help">
          우리 서비스에서 생성한 워터마크 기록을 찾으면, payload와 연결된
          정보가 아래에 표시됩니다.
        </p>

        <div className="verify-result">
          <h3 className="verify-result-title">검증 결과</h3>
          {resultMsg && (
            <p
              className={
                matched === true
                  ? "verify-result-text success"
                  : matched === false
                  ? "verify-result-text fail"
                  : "verify-result-text"
              }
            >
              {matched === true && "✅ "}
              {matched === false && "❌ "}
              {resultMsg}
            </p>
          )}

          <div className="verify-payload-row">
            <span className="verify-payload-label">추출된 payload:</span>
            <span className="verify-payload-value">
              {payload || "(없음)"}
            </span>
          </div>

          {matchedImage && (
            <div className="verify-linked-info">
              <p className="verify-linked-label">
                이 payload 와 연결된 업로드 기록
              </p>
              <ul className="verify-linked-list">
                <li>이미지 ID: {matchedImage.id}</li>
                {matchedImage.ownerEmail && (
                  <li>소유자 이메일: {matchedImage.ownerEmail}</li>
                )}
                {matchedImage.createdAt && (
                  <li>업로드 시각: {new Date(matchedImage.createdAt).toLocaleString()}</li>
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
