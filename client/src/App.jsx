// src/App.jsx
import { useEffect, useState } from "react";
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import AuthPage from "./AuthPage.jsx";
import Home from "./Home.jsx";
import MyPage from "./MyPage.jsx";
import AdminPage from "./AdminPage.jsx";
import Verify from "./Verify.jsx";
import Navbar from "./Navbar.jsx";

export default function App() {
  const [session, setSession] = useState(null);

  // 앱 처음 켤 때 세션 복원
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem("session");
      if (raw) {
        setSession(JSON.parse(raw));
      }
    } catch {
      // 무시
    }
  }, []);

  const handleLogin = (user) => {
    setSession(user);
  };

  const handleLogout = () => {
    setSession(null);
    sessionStorage.removeItem("session");
  };

  // 로그인 안 된 상태 → AuthPage만
  if (!session) {
    return (
      <BrowserRouter>
        <AuthPage onLogin={handleLogin} />
      </BrowserRouter>
    );
  }

  // 로그인 된 상태
  return (
    <BrowserRouter>
      <Navbar user={session} onLogout={handleLogout} />

      <Routes>
        <Route path="/" element={<Home user={session} />} />
        <Route path="/mypage" element={<MyPage user={session} />} />
        <Route path="/verify" element={<Verify user={session} />} />
        <Route
          path="/admin"
          element={
            session.email === "admin@example.com" ? (
              <AdminPage user={session} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
