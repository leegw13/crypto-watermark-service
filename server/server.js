// server.js (ESM)
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';
import cors from 'cors';

// 라우터
import uploadRouter from './routes/upload.js';
import imagesRouter from './routes/images.js';
import watermarkRouter from './routes/watermark.js';

// 모델
import User from './models/User.js';

// ==================== 환경 변수 로드 ====================
dotenv.config();

// ==================== MongoDB 연결 ====================
mongoose
  .connect(process.env.MONGODB_URI, {
    dbName: process.env.MONGO_DB || 'watermark',
  })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

// ==================== Express 앱 생성 ====================
const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ==================== 공통 미들웨어 ====================
// ✅ CORS는 반드시 app 생성 이후에!
app.use(
  cors({
    origin: true,       // 개발 단계: 프론트 도메인 명시해도 됨 (예: 'http://localhost:5173')
    credentials: true,
  })
);

app.use(express.json());

// ✅ /uploads 정적 파일 서빙 + 확장자별 Content-Type 보정
app.use(
  '/uploads',
  express.static(path.resolve('uploads'), {
    setHeaders: (res, filePath) => {
      if (/\.(jpe?g)$/i.test(filePath)) return res.type('image/jpeg');
      if (/\.png$/i.test(filePath)) return res.type('image/png');
      if (/\.webp$/i.test(filePath)) return res.type('image/webp');
      if (/\.gif$/i.test(filePath)) return res.type('image/gif');
      if (/\.svg$/i.test(filePath)) return res.type('image/svg+xml');
      if (/\.pdf$/i.test(filePath)) return res.type('application/pdf');
      return res.type('application/octet-stream');
    },
  })
);

// ==================== JWT 인증 미들웨어 ====================
// ==================== JWT 인증 미들웨어 ====================
function auth(req, res, next) {
  // 1) Python 워터마크 서버에서 오는 내부 콜백은 JWT 없이 통과
  const internalHeader = req.headers['x-internal-token'];
  if (
    internalHeader &&
    internalHeader === process.env.INTERNAL_TOKEN &&
    req.originalUrl.startsWith('/watermark/callback')
  ) {
    // 내부 시스템 간 통신이므로 req.user 없이도 통과시킴
    return next();
  }

  // 2) 그 외 일반 요청은 기존처럼 JWT 검사
  let token = null;
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) token = h.slice(7).trim();
  if (!token && req.query?.token) token = String(req.query.token);
  if (!token && req.body?.token) token = String(req.body.token);

  if (!token) {
    return res.status(401).json({
      message: '토큰이 없습니다.',
      hint:
        "헤더 'Authorization: Bearer <token>' 또는 '?token=' 쿼리로 보내보세요.",
    });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, iat, exp }
    return next();
  } catch (err) {
    console.error('[auth] token verify error:', err);
    return res.status(401).json({
      message: '토큰 검증 실패',
      error: err.name,
      detail: err.message,
      tokenInfo: { length: token.length, parts: token.split('.').length },
    });
  }
}


// ==================== 인증: MongoDB 기반 ====================

// 회원가입
// body: { email, password }
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: '이메일/비밀번호가 필요합니다.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const exists = await User.findOne({ email: normalizedEmail });
    if (exists) {
      return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await User.create({
      email: normalizedEmail,
      passwordHash,
    });

    return res
      .status(201)
      .json({ message: '회원가입 성공', userId: String(doc._id) });
  } catch (e) {
    console.error('[register]', e);
    return res.status(500).json({ message: '서버 오류', error: String(e) });
  }
});

// 로그인
// body: { email, password }
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res
        .status(400)
        .json({ message: '이메일/비밀번호가 필요합니다.' });
    }

    const normalizedEmail = String(email).toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res
        .status(401)
        .json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash || '');
    if (!ok) {
      return res
        .status(401)
        .json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { id: String(user._id), email: user.email },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.json({ message: '로그인 성공', token });
  } catch (e) {
    console.error('[login]', e);
    return res.status(500).json({ message: '서버 오류', error: String(e) });
  }
});

// 프로필 (보호 라우트)
app.get('/auth/profile', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('_id email createdAt');
    if (!me) {
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
    }
    return res.json(me);
  } catch (e) {
    console.error('[profile]', e);
    return res.status(500).json({ message: '서버 오류', error: String(e) });
  }
});

// 헬스체크
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Hello, Watermark Server 👋' });
});

// ==================== 라우트 연결 (보호) ====================
// /upload, /images, /watermark 는 JWT 인증 필요
app.use('/upload', auth, uploadRouter);
app.use('/images', auth, imagesRouter);
app.use('/watermark', auth, watermarkRouter);

// ==================== 404 핸들러 ====================
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ==================== 서버 시작 ====================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// (선택) 외부에서 auth 미들웨어 쓰고 싶을 때를 위한 export
export { auth };
