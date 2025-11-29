// src/Home.jsx
import { useState } from "react";
import "./home.css";
import {
  uploadImage,
  applyWatermark,
  getImage,
  buildFileUrl,
} from "./api";

export default function Home({ user }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [resultURL, setResultURL] = useState(null);
  const [loading, setLoading] = useState(false);
  const [statusText, setStatusText] = useState("");

  // ✅ 이미지 선택
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setSelectedFile(file);
    setResultURL(null);
    setStatusText("");

    // 브라우저 미리보기용
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewURL(ev.target.result);
    };
    reader.readAsDataURL(file);
  };

  // 작은 sleep 함수 (폴링용)
  const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

  // ✅ 워터마크 적용 (서버 연동)
  const handleAddWatermark = async () => {
    if (!selectedFile) {
      alert("이미지를 먼저 선택하세요.");
      return;
    }
    if (!user?.token) {
      alert("로그인 정보가 없습니다. 다시 로그인해 주세요.");
      return;
    }

    try {
      setLoading(true);
      setStatusText("이미지 업로드 중...");

      // 1) 원본 이미지 업로드 → MongoDB + /uploads/original 저장
      const uploadRes = await uploadImage(selectedFile, user.token);
      const image = uploadRes.image;
      const imageId = image?.id || image?._id;

      if (!imageId) {
        throw new Error("서버에서 imageId를 받지 못했습니다.");
      }

      setStatusText("워터마크 작업 요청 중...");

      // 2) 워터마크 작업 요청 → Python 서버가 비가시 워터마크 삽입
      await applyWatermark(imageId, user.token, {
        method: "dwtDct", // routes/watermark.js 기본값과 맞춤
      });

      setStatusText("워터마크 처리 중입니다...(최대 10초)");

      // 3) /images/:id 를 짧게 폴링해서 status 확인
      let final = null;
      for (let i = 0; i < 10; i++) {
        const detail = await getImage(imageId, user.token);
        const status = detail?.watermark?.status;

        if (status === "done") {
          final = detail;
          break;
        }
        if (status === "failed") {
          const errMsg =
            detail?.watermark?.error || "워터마크 처리에 실패했습니다.";
          throw new Error(errMsg);
        }

        // 아직 queued / processing 이면 1초 후 다시
        await sleep(1000);
      }

      if (!final) {
        setStatusText(
          "아직 처리 중입니다. 잠시 후 마이페이지에서 다시 확인해 주세요."
        );
        return;
      }

      // 4) 최종 결과 이미지 URL 구성
      const wmPath = final.watermark?.resultPath || final.original?.url;
      const url = buildFileUrl(wmPath);
      setResultURL(url);
      setStatusText("워터마크 적용 완료!");
    } catch (err) {
      console.error(err);
      setStatusText(err.message || "서버 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  // ✅ 결과 이미지 다운로드
  const handleDownload = () => {
    if (!resultURL) return;
    const a = document.createElement("a");
    a.href = resultURL;
    a.download = "watermarked.png";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  // ✅ 화면에서만 삭제 (서버 기록은 MyPage에서 계속 볼 수 있음)
  const handleDelete = () => {
    setSelectedFile(null);
    setPreviewURL(null);
    setResultURL(null);
    setStatusText("");
  };

  const displayName = user?.name || user?.email || "사용자";

  return (
    <div className="home-container">
      <h2>환영합니다, {displayName}님 🌸</h2>
      <p>이미지를 업로드하고 서버에서 비가시 워터마크를 적용해 보세요.</p>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      <p className="upload-info">
        <strong>Tip:</strong> 워터마크 적용 버튼을 누르면
        <br />
        1) 이미지가 <code>/upload</code>로 업로드되고,<br />
        2) Python 워터마크 서버(Flask)가 비가시 워터마크를 삽입한 뒤,<br />
        3) <code>/watermark/callback</code>으로 결과를 알려줍니다.
      </p>

      {statusText && <p className="loading-text">{statusText}</p>}
      {loading && <p className="loading-text">처리 중...</p>}

      {/* 미리보기 / 결과 */}
      {previewURL && !resultURL && (
        <div className="preview">
          <img src={previewURL} alt="미리보기" />
        </div>
      )}

      {resultURL && (
        <div className="result">
          <img src={resultURL} alt="워터마크 결과" />
        </div>
      )}

      <div className="buttons">
        {/* 워터마크 적용 버튼: 아직 결과가 없을 때만 */}
        {!resultURL && (
          <button
            className="watermark-btn"
            onClick={handleAddWatermark}
            disabled={loading}
          >
            {loading ? "워터마크 처리 중..." : "워터마크 적용"}
          </button>
        )}

        {/* 결과가 있을 때만 다운로드/삭제 */}
        {resultURL && (
          <>
            <button onClick={handleDownload}>다운로드</button>
            <button onClick={handleDelete}>삭제</button>
          </>
        )}
      </div>
    </div>
  );
}
