import Navbar from "./Navbar";
import "./mypage.css";

export default function MyPage({ user, onLogout }) {
  const images = JSON.parse(localStorage.getItem("uploadedImages") || "[]");

  return (
    <>
      <Navbar user={user} onLogout={onLogout} />
      <div className="mypage-container">
        <div className="mypage-card">
          <h2 className="mypage-title">마이페이지</h2>
          <h3 className="mypage-welcome">
            {user.name}님, 반가워요 👋
          </h3>
          <p className="mypage-subtext">
            이미지를 업로드하고 워터마크를 추가해보세요.
          </p>

          <div className="upload-box">
            <p>이미지를 끌어다 놓거나 파일 선택 📂</p>
            <button className="upload-btn">파일 선택</button>
          </div>

          {images.length === 0 ? (
            <p className="no-img-text">업로드된 이미지가 없습니다.</p>
          ) : (
            <div className="image-list">
              {images.map((img, i) => (
                <img
                  key={i}
                  src={img}
                  alt={`uploaded-${i}`}
                  className="mypage-img"
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/*📘 로그인한 사용자의 이름을 표시하고, 
      업로드된 이미지를 로컬에서 표시하는  개인 공간 */