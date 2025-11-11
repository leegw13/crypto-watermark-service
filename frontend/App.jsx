import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import AuthPage from "./AuthPage";
import Home from "./Home";
import MyPage from "./MyPage";
import AdminPage from "./AdminPage";

export default function App() {
  // ✅ 로그인 세션 정보 저장 (로그인 상태 유지용)
  const [session, setSession] = useState(null);

  // ✅ 새로고침 시 sessionStorage에서 로그인 정보 복원
  useEffect(() => {
    const saved = sessionStorage.getItem("session");
    if (saved) setSession(JSON.parse(saved));
  }, []);
  // ✅ 로그인 성공 시 세션 저장
  const handleLogin = (user) => setSession(user);
  // ✅ 로그아웃 시 세션 삭제
  const handleLogout = () => {
    sessionStorage.removeItem("session");
    setSession(null);
  };
  // ✅ 로그인 안 된 경우 AuthPage(로그인/회원가입 화면)로 이동
  if (!session) return <AuthPage onLogin={handleLogin} />;

  return (
    <Router>
      <Routes>
        /* 홈 화면 */
        <Route path="/" element={<Home user={session} onLogout={handleLogout} />} />
        /* 마이페이지 */
        <Route path="/mypage" element={<MyPage user={session} onLogout={handleLogout} />} />
        /* 관리자 페이지 */
        {session.email === "admin@example.com" && (
          <Route
            path="/admin"
            element={
              session?.email === "admin@example.com" ? (
                <AdminPage user={session} />
              ) : (
                <Navigate to="/" />
              )
            }
          />
        )}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </Router>
  );
}
/*App.jsx는 전체 페이지 이동의 중심.
로그인 상태(session)에 따라 로그인 화면/홈 화면/관리자 화면을 구분합니다*/