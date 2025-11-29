// src/Navbar.jsx
import { Link, useLocation } from "react-router-dom";
import "./navbar.css"; // 이미 있으면 사용, 없으면 제거해도 됨

export default function Navbar({ user, onLogout }) {
  const location = useLocation();
  const isActive = (path) => location.pathname === path;

  if (!user) {
    return (
      <nav className="navbar">
        <div className="logo">Crypto Watermark</div>
      </nav>
    );
  }

  const displayName = user.name || user.email || "사용자";

  return (
    <nav className="navbar">
      <div className="logo">Crypto Watermark</div>

      <div className="nav-links">
        <Link className={isActive("/") ? "active" : ""} to="/">
          Home
        </Link>
        <Link
          className={isActive("/mypage") ? "active" : ""}
          to="/mypage"
        >
          MyPage
        </Link>
        <Link
          className={isActive("/verify") ? "active" : ""}
          to="/verify"
        >
          Verify
        </Link>
        {user.email === "admin@example.com" && (
          <Link
            className={isActive("/admin") ? "active" : ""}
            to="/admin"
          >
            Admin
          </Link>
        )}
      </div>

      <div className="nav-right">
        <span className="nav-user">{displayName}</span>
        <button className="logout-btn" onClick={onLogout}>
          로그아웃
        </button>
      </div>
    </nav>
  );
}
