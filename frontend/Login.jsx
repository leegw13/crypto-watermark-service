import { useState } from 'react';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [pw, setPw] = useState('');
  const [show, setShow] = useState(false);
  const [msg, setMsg] = useState('');

  // ✅ 로그인 버튼 클릭 시
  const handleLogin = () => {
    if (!email || !pw) return setMsg('이메일과 비밀번호를 입력하세요.');

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const user = users[email.toLowerCase()];
    if (!user) return setMsg('가입되지 않은 이메일입니다.');
    if (user.pw !== pw) return setMsg('비밀번호가 올바르지 않습니다.');

    // ✅ 로그인 성공 → 세션에 저장
    const sessionUser = { name: user.name, email: email.toLowerCase() };
    sessionStorage.setItem('session', JSON.stringify(sessionUser));
    setMsg(`${user.name}님 환영합니다!`);
    onLogin(sessionUser);
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
      />

      <label>비밀번호</label>
      <div className="pw-field">
        <input
          type={show ? 'text' : 'password'}
          placeholder="비밀번호"
          value={pw}
          onChange={(e) => setPw(e.target.value)}
        />
        <button type="button" onClick={() => setShow(!show)} className="toggle-bin">
          {show ? '숨김' : '보기'}
        </button>
      </div>

      <button onClick={handleLogin}>로그인</button>
      <p className="msg">{msg}</p>
    </div>
  );
}
/* 📘 localStorage에서 회원 정보 조회
       로그인 성공 시 sessionStorafe에 세션 저장
       비밀번호 보기/숨김 토글 구현 */