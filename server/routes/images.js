// routes/images.js (ESM, MongoDB)
import { Router } from 'express';
import mongoose from 'mongoose';
import Image from '../models/Image.js'; // ✅ 단수형 파일/모델만 사용

const router = Router();

/**
 * 목록: GET /images?page=1&limit=20
 *  - server.js에서 app.use('/images', auth, imagesRouter)로 마운트되므로
 *    여기서는 경로가 '/'여야 최종 '/images'가 됩니다.
 */
router.get('/', async (req, res) => {
  try {
    if (!req.user?.email) return res.status(401).json({ message: '인증 필요' });

    const page = Math.max(parseInt(req.query.page || '1', 10), 1);
    const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 100);
    const skip = (page - 1) * limit;

    const ownerEmail = req.user.email;

    const [items, total] = await Promise.all([
      Image.find({ ownerEmail })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Image.countDocuments({ ownerEmail }),
    ]);

    return res.json({
      page,
      limit,
      total,
      items: items.map((d) => ({
        id: String(d._id),
        original: {
          url: d.original?.url,
          filename: d.original?.filename,
          size: d.original?.size,
          mimetype: d.original?.mimetype,
          hash: d.original?.hash,
        },
        watermark: d.watermark,
        createdAt: d.createdAt,
      })),
    });
  } catch (e) {
    console.error('[images:list]', e);
    return res.status(500).json({ message: '목록 조회 실패', error: String(e) });
  }
});

/**
 * 상세: GET /images/:id
 *  - 여기서도 앞에 '/images'를 또 쓰지 않습니다.
 */
router.get('/:id', async (req, res) => {
  try {
    if (!req.user?.email) return res.status(401).json({ message: '인증 필요' });

    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: '유효하지 않은 id' });
    }

    const doc = await Image.findOne({ _id: id, ownerEmail: req.user.email });
    if (!doc) return res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });

    return res.json({
      id: String(doc._id),
      original: {
        url: doc.original?.url,
        filename: doc.original?.filename,
        size: doc.original?.size,
        mimetype: doc.original?.mimetype,
        hash: doc.original?.hash,
      },
      watermark: doc.watermark,
      createdAt: doc.createdAt,
    });
  } catch (e) {
    console.error('[images:detail]', e);
    return res.status(500).json({ message: '상세 조회 실패', error: String(e) });
  }
});

export default router;
