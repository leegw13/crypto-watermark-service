// routes/upload.js (ESM, ownerEmail + MongoDB 저장)
import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import Image from '../models/Image.js';
import { verifyToken } from '../middleware/verifyToken.js';

const router = Router();

// 원본 저장 폴더 보장: /uploads/original
const ORIGINAL_DIR = path.resolve('uploads', 'original');
fs.mkdirSync(ORIGINAL_DIR, { recursive: true });

// 1) 저장 방식: uploads/original에 저장, 파일명: timestamp-랜덤.hex + 원본 확장자
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, ORIGINAL_DIR),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || '';
    const name = Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex') + ext.toLowerCase();
    cb(null, name);
  },
});

// 2) 이미지 파일만 허용
const fileFilter = (req, file, cb) => {
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
  if (allowed.includes(file.mimetype)) cb(null, true);
  else cb(new Error('이미지 파일만 업로드할 수 있습니다.'), false);
};

// 3) 10MB 제한
const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 10 * 1024 * 1024 },
});

// sha256 해시 계산
function sha256(filePath) {
  return new Promise((resolve, reject) => {
    const h = crypto.createHash('sha256');
    const s = fs.createReadStream(filePath);
    s.on('data', (d) => h.update(d));
    s.on('end', () => resolve(h.digest('hex')));
    s.on('error', reject);
  });
}

/**
 * POST /upload
 * form-data: image=<file>
 * 보호 라우트: verifyToken
 * 응답: DB에 메타데이터 저장 + url/hash 등 반환
 */
router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  try {
    if (!req.user?.email) {
      return res.status(401).json({ message: '인증 필요: 토큰에 email이 없습니다.' });
    }
    if (!req.file) {
      return res.status(400).json({ message: 'image 파일이 필요합니다. (form-data key: image)' });
    }

    const { filename, mimetype, size } = req.file;
    const filePath = path.join(ORIGINAL_DIR, filename);
    const hash = await sha256(filePath);
    const url = `/uploads/original/${filename}`;

    const doc = await Image.create({
      ownerEmail: req.user.email,
      original: { filename, url, size, mimetype, hash },
      watermark: { status: 'none', options: {}, resultPath: null, error: null },
    });

    return res.status(201).json({
      id: String(doc._id),
      url: doc.original.url,
      mimetype: doc.original.mimetype,
      size: doc.original.size,
      hash: doc.original.hash,
      createdAt: doc.createdAt,
    });
  } catch (err) {
    console.error('[upload]', err);
    return res.status(500).json({ message: '업로드 실패', error: String(err) });
  }
});

// Multer/기타 에러 처리
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res.status(400).json({ message: '업로드 에러', code: err.code, error: err.message });
  }
  if (err) {
    return res.status(400).json({ message: '업로드 실패', error: String(err) });
  }
  next();
});

export default router;
