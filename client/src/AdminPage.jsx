import Navbar from "./Navbar";
import "./admin.css";

export default function AdminPage({ user }) {
  const users = JSON.parse(localStorage.getItem("users") || "{}");

  if (!user) {
    return (
      <div style={{ padding: "20px", textAlign: "center" }}>
        <h2>로그인 정보가 없습니다.</h2>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* ✅ Navbar는 항상 Router 내부에서 렌더링 */}
      <Navbar user={user} />

      <main className="admin-main">
        <div className="admin-card">
          <h2>관리자 페이지</h2>
          <p>현재 등록된 사용자 목록</p>

          <table className="user-table">
            <thead>
              <tr>
                <th>이름</th>
                <th>이메일</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(users).length === 0 ? (
                <tr>
                  <td colSpan="2">등록된 사용자가 없습니다.</td>
                </tr>
              ) : (
                Object.entries(users).map(([email, data]) => (
                  <tr key={email}>
                    <td>{data.name}</td>
                    <td>{email}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
// 관리자 전용 페이지