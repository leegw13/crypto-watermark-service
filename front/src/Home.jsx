import { useState } from "react";
import "./home.css";

export default function Home({ user }) {
  const [selectedFile, setSelectedFile] = useState(null);
  const [previewURL, setPreviewURL] = useState(null);
  const [resultURL, setResultURL] = useState(null);
  const [loading, setLoading] = useState(false);

  // ✅ 이미지 선택
  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setSelectedFile(file);

    // 미리보기용 URL 생성
    const reader = new FileReader();
    reader.onload = (ev) => {
      setPreviewURL(ev.target.result);
      setResultURL(null);
    };
    reader.readAsDataURL(file);
  };

  // ✅ 워터마크 적용
  const handleAddWatermark = () => {
    if (!selectedFile) {
      alert("이미지를 먼저 선택하세요.");
      return;
    }

    setLoading(true);

    const reader = new FileReader();

    reader.onload = (e) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = e.target.result; // ✅ base64 URL 사용 (모바일 안전)

      img.onload = () => {
        console.log("✅ 이미지 로드됨:", img.width, img.height);
        const w = img.naturalWidth || img.width;
        const h = img.naturalHeight || img.height;

        if (!w || !h) {
          alert("이미지를 불러오지 못했습니다.");
          setLoading(false);
          return;
        }

        // ✅ 캔버스 생성
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = w;
        canvas.height = h;

        // 원본 이미지
        ctx.drawImage(img, 0, 0, w, h);

        // ✅ 워터마크 텍스트 추가
        ctx.font = `${Math.floor(w / 20)}px sans-serif`;
        ctx.fillStyle = "pink";
        ctx.textAlign = "right";
        ctx.textBaseline = "bottom";
        ctx.fillText("© 현서", w - 20, h - 20);

        // 결과 이미지 생성
        const result = canvas.toDataURL("image/png");
        setResultURL(result);
        setLoading(false);
      };

      img.onerror = () => {
        console.error("❌ 이미지 로드 실패:", err);
        alert("이미지를 불러오지 못했습니다. 다른 사진을 시도해보세요.");
        setLoading(false);
      };
    };

    reader.readAsDataURL(selectedFile);
  };

  // ✅ 다운로드
  const handleDownload = () => {
    if (!resultURL) return;
    const a = document.createElement("a");
    a.href = resultURL;
    a.download = "watermarked.png";
    a.click();
  };

  // ✅ 삭제
  const handleDelete = () => {
    setSelectedFile(null);
    setPreviewURL(null);
    setResultURL(null);
  };

  return (
    <div className="home-container">
      <h2>환영합니다, {user.name}님 🌸</h2>
      <p>이미지를 업로드하고 오른쪽 아래에 워터마크를 추가해보세요!</p>

      <input type="file" accept="image/*" onChange={handleFileChange} />

      {loading && <p className="loading-text">워터마크 적용 중입니다...</p>}

      {previewURL && !resultURL && (
        <div className="preview">
          <img src={previewURL} alt="미리보기" />
        </div>
      )}

      {resultURL && (
        <div className="result">
          <img src={resultURL} alt="결과 이미지" />
        </div>
      )}

      <div className="buttons">
        <button onClick={handleAddWatermark} disabled={loading}>
          {loading ? "처리 중..." : "워터마크 적용"}
        </button>
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

/* Home.jsx는 프로젝트의 핵심 — 이미지를 업로드 → 워터마크 삽입 → 다운로드/삭제
모든 로직을 클라이언트 단에서 캔버스로 처리합니다 */