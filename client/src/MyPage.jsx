// src/MyPage.jsx
import { useEffect, useState } from "react";
import "./mypage.css";
import { getImages, buildFileUrl, API_BASE_URL } from "./api";

export default function MyPage({ user }) {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const loadImages = async () => {
    if (!user?.token) {
      setMsg("로그인 정보가 없습니다. 다시 로그인해 주세요.");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setMsg("");

      const data = await getImages(user.token, 1, 50);
      const items = data.items || [];

      setImages(items);

      if (items.length === 0) {
        setMsg("아직 업로드된 이미지가 없습니다.");
      }
    } catch (err) {
      console.error(err);
      setMsg(err.message || "이미지 목록을 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadImages();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.token]);

  const displayName = user?.name || user?.email || "사용자";

  // 🔽 워터마크 결과 다운로드 함수 (토큰을 쿼리로 포함)
  const handleDownload = (imageId) => {
    if (!imageId || !user?.token) return;

    const base = API_BASE_URL.replace(/\/+$/, "");
    const url = `${base}/images/${imageId}/download?token=${encodeURIComponent(
      user.token
    )}`;

    window.location.href = url;
  };

  return (
    <div className="mypage-container">
      <div className="mypage-card">
        <h2 className="mypage-title">마이페이지</h2>
        <h3 className="mypage-welcome">{displayName}님, 반가워요 👋</h3>
        <p className="mypage-subtext">
          업로드했던 이미지들과 워터마크 적용 결과를 한 번에 확인하고,
          <br />
          워터마크가 삽입된 이미지를 바로 다운로드할 수 있습니다.
        </p>

        {loading && (
          <p className="loading-text">목록을 불러오는 중입니다...</p>
        )}

        {!loading && images.length === 0 && (
          <p className="no-img-text">아직 업로드된 이미지가 없습니다.</p>
        )}

        {msg && !loading && <p className="loading-text">{msg}</p>}

        {!loading && images.length > 0 && (
          <div className="image-list">
            {images.map((img, i) => {
              const origSrc = buildFileUrl(img.original?.url);
              const wmStatus = img.watermark?.status;
              const wmSrc =
                wmStatus === "done"
                  ? buildFileUrl(img.watermark?.resultPath)
                  : null;

              return (
                <div className="image-row" key={img.id || i}>
                  <div className="image-col">
                    <p className="img-label">원본 이미지</p>
                    {origSrc ? (
                      <img
                        src={origSrc}
                        alt={`original-${i}`}
                        className="mypage-img"
                      />
                    ) : (
                      <p className="no-img-text">
                        원본 이미지를 찾을 수 없습니다.
                      </p>
                    )}
                  </div>

                  <div className="image-col">
                    <p className="img-label">
                      워터마크 결과{" "}
                      {wmStatus === "queued" && "(처리 대기 중)"}
                      {wmStatus === "processing" && "(처리 중)"}
                      {wmStatus === "failed" && "(실패)"}
                    </p>

                    {wmSrc ? (
                      <>
                        <img
                          src={wmSrc}
                          alt={`watermarked-${i}`}
                          className="mypage-img"
                        />
                        <button
                          style={{ marginTop: "8px", alignSelf: "flex-start" }}
                          onClick={() => handleDownload(img.id)}
                        >
                          워터마크 이미지 다운로드
                        </button>
                      </>
                    ) : wmStatus === "done" ? (
                      <p className="no-img-text">
                        결과 이미지를 찾을 수 없습니다.
                      </p>
                    ) : (
                      <p className="no-img-text">
                        아직 워터마크가 완료되지 않았습니다.
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
