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

// Multer 저장 방식 설정
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, ORIGINAL_DIR);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const base =
      Date.now().toString(36) + '-' + crypto.randomBytes(6).toString('hex');
    cb(null, `${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

// 👇 wm payload 생성 함수 (HMAC)
function makeWatermarkPayload(ownerEmail, imageId) {
  const secret = process.env.WM_HMAC_SECRET || 'wm-dev-secret';
  const msg = `${ownerEmail}:${imageId}`;
  return crypto
    .createHmac('sha256', secret)
    .update(msg)
    .digest('hex')
    .slice(0, 16); // 16글자(64bit 정도)
}

// POST /upload
// form-data: { image: File }
router.post('/', verifyToken, upload.single('image'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '파일이 없습니다. (field: image)' });
    }
    if (!req.user?.email) {
      return res.status(401).json({ message: '인증 정보가 없습니다.' });
    }

    const ownerEmail = req.user.email;
    const file = req.file;

    // 파일 해시 계산 (SHA-256)
    const filePath = file.path; // multer가 넣어줌
    const buffer = fs.readFileSync(filePath);
    const hash = crypto.createHash('sha256').update(buffer).digest('hex');

    const url = `/uploads/original/${file.filename}`;

    // 1차 저장 (Image 문서 생성)
    let img = await Image.create({
      ownerEmail,
      original: {
        filename: file.filename,
        url,
        size: file.size,
        mimetype: file.mimetype,
        hash,
      },
      watermark: {
        status: 'none',
        options: {},
        resultPath: '',
        error: '',
      },
    });

    // watermarkPayload 생성 후 다시 저장
    const payload = makeWatermarkPayload(ownerEmail, String(img._id));
    img.watermarkPayload = payload;
    await img.save();

    return res.status(201).json({
      message: '업로드 성공',
      image: {
        id: img._id,
        ownerEmail: img.ownerEmail,
        original: img.original,
        watermark: img.watermark,
      },
    });
  } catch (err) {
    console.error('[upload]', err);
    next(err);
  }
});

// Multer/기타 에러 처리
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    return res
      .status(400)
      .json({ message: '업로드 에러', code: err.code, error: err.message });
  }
  if (err) {
    return res
      .status(400)
      .json({ message: '업로드 실패', error: String(err) });
  }
  next();
});

export default router;
