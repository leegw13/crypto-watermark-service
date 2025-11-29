// src/Signup.jsx
import { useState } from "react";
import { registerUser } from "./api";

export default function Signup({ onSignedUp }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSignup = async () => {
    if (!name || !email || !pw || !pw2)
      return setMsg("모든 칸을 입력하세요.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return setMsg("이메일 형식이 올바르지 않습니다.");
    if (pw.length < 8) return setMsg("비밀번호는 8자 이상이어야 합니다.");
    if (pw !== pw2) return setMsg("비밀번호가 일치하지 않습니다.");

    try {
      setLoading(true);
      setMsg("");

      // ✅ 백엔드에 실제 회원가입 요청
      await registerUser(email, pw); // { message, userId }

      // 🔹 AdminPage에서 쓸 수 있도록 localStorage에도 이름만 저장(옵션)
      const users = JSON.parse(localStorage.getItem("users") || "{}");
      const key = email.toLowerCase();
      if (!users[key]) {
        users[key] = { name }; // 비밀번호는 저장 X
        localStorage.setItem("users", JSON.stringify(users));
      }

      setMsg("회원가입 완료! 이제 로그인하세요 ✅");
      setName("");
      setEmail("");
      setPw("");
      setPw2("");

      // 로그인 탭으로 전환 (AuthPage에서 탭 바꾸는 콜백)
      onSignedUp?.();
    } catch (err) {
      console.error(err);
      setMsg(err.message || "회원가입에 실패했습니다.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="panel">
      <h2>회원가입</h2>

      <label>이름</label>
      <input
        placeholder="홍길동"
        value={name}
        onChange={(e) => setName(e.target.value)}
      />

      <label>이메일</label>
      <input
        type="email"
        placeholder="you@example.com"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <label>비밀번호</label>
      <input
        type="password"
        placeholder="8자 이상"
        value={pw}
        onChange={(e) => setPw(e.target.value)}
      />

      <label>비밀번호 확인</label>
      <input
        type="password"
        value={pw2}
        onChange={(e) => setPw2(e.target.value)}
      />

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "가입 중..." : "회원가입"}
      </button>

      <p
        className={`msg ${
          msg.includes("완료") ? "success" : msg ? "error" : ""
        }`}
      >
        {msg}
      </p>
    </div>
  );
}

/*📘 회원 데이터 유효성 검사 후
     1) 백엔드(/auth/register)에 계정 생성
     2) AdminPage 용으로 localStorage("users")에 이름만 기록 */
