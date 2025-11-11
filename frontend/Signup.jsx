import { useState } from 'react';

export default function Signup({ onSignedUp }) {
  const [name, setName]   = useState('');
  const [email, setEmail] = useState('');
  const [pw, setPw]       = useState('');
  const [pw2, setPw2]     = useState('');
  const [msg, setMsg]     = useState('');

  const handleSignup = () => {
    if (!name || !email || !pw || !pw2) return setMsg('모든 칸을 입력하세요.');
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return setMsg('이메일 형식이 올바르지 않습니다.');
    if (pw.length < 8) return setMsg('비밀번호는 8자 이상이어야 합니다.');
    if (pw !== pw2) return setMsg('비밀번호가 일치하지 않습니다.');

    const users = JSON.parse(localStorage.getItem('users') || '{}');
    const key = email.toLowerCase();
    if (users[key]) return setMsg('이미 가입된 이메일입니다.');

    users[key] = { name, pw }; // 데모용: 평문 저장(실서비스 금지)
    localStorage.setItem('users', JSON.stringify(users));

    setMsg('회원가입 완료! 이제 로그인하세요 ✅');
    setName(''); setEmail(''); setPw(''); setPw2('');
    onSignedUp?.();
  };

  return (
    <div className="panel">
      <h2>회원가입</h2>

      <label>이름</label>
      <input placeholder="홍길동" value={name} onChange={(e) => setName(e.target.value)} />

      <label>이메일</label>
      <input type="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />

      <label>비밀번호</label>
      <input type="password" placeholder="8자 이상" value={pw} onChange={(e) => setPw(e.target.value)} />

      <label>비밀번호 확인</label>
      <input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} />

      <button onClick={handleSignup}>회원가입</button>
      <p className={`msg ${msg.includes('완료') ? 'success' : msg ? 'error' : ''}`}>{msg}</p>
    </div>
  );
}
/*📘 회원 데이터 유효성 검사 후 localStorage 에  
     계정 저장, 성공 시 로그인 탭으로 전환*/