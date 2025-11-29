import fetch from "node-fetch";

// 로그인 결과에서 받은 진짜 토큰 (따옴표 안에 한 줄로!)
const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6MTc2MDI2NDI0NDEzNywiZW1haWwiOiJ0ZXN0QG5hdmVyLmNvbSIsImlhdCI6MTc2MDI2NjIzMCwiZXhwIjoxNzYwMjY5ODMwfQ.s7y7PkZd5shsJFwWU4Fr1rVY-tZ...";

async function checkProfile() {
  const res = await fetch("http://localhost:4000/auth/profile", {
    method: "GET",
    headers: {
      "Authorization": `Bearer ${token}`, // 헤더에 토큰 추가
    },
  });

  const data = await res.json();
  console.log("서버 응답:", data);
}

checkProfile();

