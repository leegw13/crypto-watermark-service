// server.js (ESM)
import express from 'express';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import path from 'path';

//수정사항
import cors from "cors";
app.use(cors());

// 라우터
import uploadRouter from './routes/upload.js';
import imagesRouter from './routes/images.js';
import watermarkRouter from './routes/watermark.js'; // 이미 있으면 그대로 사용

// 모델
import User from './models/User.js';

dotenv.config();

// ✅ MongoDB 연결
mongoose
  .connect(process.env.MONGODB_URI, { dbName: process.env.MONGO_DB || 'watermark' })
  .then(() => console.log('✅ MongoDB connected'))
  .catch((err) => console.error('❌ MongoDB connection error:', err));

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

// ==================== 공통 미들웨어 ====================
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
function auth(req, res, next) {
  let token = null;
  const h = req.headers.authorization || '';
  if (h.startsWith('Bearer ')) token = h.slice(7).trim();
  if (!token && req.query?.token) token = String(req.query.token);
  if (!token && req.body?.token) token = String(req.body.token);

  if (!token) {
    return res.status(401).json({
      message: '토큰이 없습니다.',
      hint: "헤더 'Authorization: Bearer <token>' 또는 '?token=' 쿼리로 보내보세요.",
    });
  }
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload; // { id, email, iat, exp }
    return next();
  } catch (err) {
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
app.post('/auth/register', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: '이메일/비밀번호가 필요합니다.' });
    }
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: '이미 존재하는 이메일입니다.' });

    const passwordHash = await bcrypt.hash(password, 10);
    const doc = await User.create({ email, passwordHash });

    return res.status(201).json({ message: '회원가입 성공', userId: String(doc._id) });
  } catch (e) {
    console.error('[register]', e);
    return res.status(500).json({ message: '서버 오류', error: String(e) });
  }
});

// 로그인
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: '이메일/비밀번호가 필요합니다.' });
    }

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: '이메일 또는 비밀번호가 올바르지 않습니다.' });

    const token = jwt.sign({ id: String(user._id), email: user.email }, JWT_SECRET, { expiresIn: '1h' });
    return res.json({ message: '로그인 성공', token });
  } catch (e) {
    console.error('[login]', e);
    return res.status(500).json({ message: '서버 오류', error: String(e) });
  }
});

// 프로필 (보호 라우트) — DB에서 조회
app.get('/auth/profile', auth, async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select('_id email createdAt');
    if (!me) return res.status(404).json({ message: '사용자를 찾을 수 없습니다.' });
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
app.use('/upload', auth, uploadRouter);       // POST /upload
app.use('/images', auth, imagesRouter);       // GET /images, GET /images/:id
app.use('/watermark', auth, watermarkRouter); // 워터마크 라우트(있다면 보호)

// 404
app.use((req, res) => {
  res.status(404).json({ message: 'Not Found' });
});

// ==================== 서버 시작 ====================
app.listen(PORT, () => {
  console.log(`✅ Server running on http://localhost:${PORT}`);
});

// (선택) 외부에서 인증 미들웨어 사용 가능하도록 export
export { auth };

