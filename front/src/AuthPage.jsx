import { useState } from 'react';
import Login from './Login';
import Signup from './Signup';
import './auth.css';

export default function AuthPage({ onLogin }) {
   // ✅ 현재 탭 상태 ('login' 또는 'signup')
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  return (
    <div className="card">
      /* 로그인/회원가입 탭 버튼 */
      <div className="tabs">
        <button
          className={tab === 'login' ? 'active' : ''}
          onClick={() => setTab('login')}
        >로그인</button>
        <button
          className={tab === 'signup' ? 'active' : ''}
          onClick={() => setTab('signup')}
        >회원가입</button>
      </div>

      {tab === 'login'
        ? <Login onLogin={onLogin} />
        : <Signup onSignedUp={() => setTab('login')} />}
    </div>
  );
}
// 로그인과 회원 가입 화면을 한 카드 안에서 탭전환으로 보여주는 역할