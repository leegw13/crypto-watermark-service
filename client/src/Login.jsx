// src/Login.jsx
import { useState } from "react";
import { loginUser } from "./api";

export default function Login({ onLogin }) {
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!email || !pw) {
      setMsg("이메일과 비밀번호를 입력하세요.");
      return;
    }

    try {
      setLoading(true);
      setMsg("");

      // ✅ 백엔드에 실제 로그인 요청
      const data = await loginUser(email, pw); // { message, token }
      const token = data.token;
      if (!token) {
        throw new Error("서버에서 토큰을 받지 못했습니다.");
      }

      const normalizedEmail = email.toLowerCase().trim();
      const nameFromEmail = normalizedEmail.split("@")[0];

      // 세션 객체(앱 전체에서 사용)
      const sessionUser = {
        email: normalizedEmail,
        name: nameFromEmail, // Navbar, Home에서 사용
        token,
      };

      // ✅ 세션 저장
      sessionStorage.setItem("session", JSON.stringify(sessionUser));
      setMsg(`${nameFromEmail}님 환영합니다!`);

      // 상위(App)로 전달
      onLogin(sessionUser);
    } catch (err) {
      console.error(err);
      setMsg(err.message || "로그인에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") handleLogin();
  };

  return (
    <div className="panel">
      <h2>로그인</h2>

      <label>이메일</label>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={handleKeyDown}
      />

      <label>비밀번호</label>
      <div className="pw-row">
        <input
          type={show ? "text" : "password"}
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          type="button"
          onClick={() => setShow(!show)}
          className="toggle-bin"
        >
          {show ? "숨김" : "보기"}
        </button>
      </div>

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "로그인 중..." : "로그인"}
      </button>

      <p className="msg">{msg}</p>
    </div>
  );
}

/* 📘 localStorage 대신
       백엔드(/auth/login)에서 JWT 토큰을 받아와
       sessionStorage에 { email, name, token } 저장 */
