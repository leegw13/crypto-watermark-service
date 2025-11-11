import { Link, useLocation } from "react-router-dom";
import "./navbar.css";

export default function Navbar({ user }) {
  const location = useLocation();
  const path = location.pathname;

  // ✅ user가 없을 경우를 대비한 안전 처리
  if (!user) {
    return (
      <nav className="navbar">
        <div className="nav-left">
          <Link to="/" className="nav-logo">Watermark App</Link>
        </div>
      </nav>
    );
  }

  return (
    <nav className="navbar">
      <div className="nav-left">
        <Link to="/" className="nav-logo">Watermark App</Link>
      </div>

      <div className="nav-center">
        <ul className="nav-list">
          <li>
            <Link to="/" className={`nav-link ${path === "/" ? "active" : ""}`}>
              홈
            </Link>
          </li>
          <li>
            <Link
              to="/mypage"
              className={`nav-link ${path === "/mypage" ? "active" : ""}`}
            >
              마이페이지
            </Link>
          </li>

          {user.email === "admin@example.com" && (
            <li>
              <Link
                to="/admin"
                className={`nav-link ${path === "/admin" ? "active" : ""}`}
              >
                관리자
              </Link>
            </li>
          )}
        </ul>
      </div>
    </nav>
  );
}
 /* 📘 상단 메뉴 표시
        현제 페이지에 따라 강조
        관리자 전용 메뉴 노출 */