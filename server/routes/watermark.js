// routes/watermark.js
import { Router } from 'express';
import path from 'path';
import Image from '../models/Image.js';
import { requestApply } from '../services/watermarkClient.js';

const router = Router();

/**
 * POST /watermark/apply
 * body: { imageId: string, options?: object }
 * - 인증은 server.js에서 app.use('/watermark', auth, watermarkRouter)로 이미 처리됨
 */
router.post('/apply', async (req, res) => {
  try {
    const { imageId, options = {} } = req.body || {};
    if (!imageId) {
      return res.status(400).json({ message: 'imageId가 필요합니다.' });
    }
    if (!req.user?.email) {
      return res.status(401).json({ message: '인증 필요' });
    }

    const img = await Image.findById(imageId);
    if (!img || img.ownerEmail !== req.user.email) {
      return res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });
    }
    if (!img.original?.url) {
      return res.status(400).json({ message: '원본 파일 경로가 없습니다.' });
    }

    // 상태: queued
    img.watermark = { status: 'queued', options, resultPath: null, error: null };
    await img.save();

    // 워터마크 작업 요청 (외부 서비스)
    await requestApply({
      imageId,
      // 서버 루트 기준으로 안전하게 절대 경로화
      sourcePath: path.resolve('.' + img.original.url),
      options,
    });

    return res.status(202).json({ status: 'queued' });
  } catch (e) {
    console.error('[watermark/apply]', e);
    return res.status(500).json({ message: '워터마크 요청 실패', error: String(e) });
  }
});

/**
 * POST /watermark/callback  (외부 워터마크 서비스 → 내부 콜백)
 * header: X-Internal-Token: <INTERNAL_TOKEN>
 * body: { imageId, status: 'processing'|'done'|'failed', resultPath?, error? }
 */
router.post('/callback', async (req, res) => {
  try {
    if (req.header('X-Internal-Token') !== process.env.INTERNAL_TOKEN) {
      return res.sendStatus(403);
    }

    const { imageId, status, resultPath, error } = req.body || {};
    if (!imageId || !status) {
      return res.status(400).json({ message: 'imageId/status가 필요합니다.' });
    }

    const img = await Image.findById(imageId);
    if (!img) return res.sendStatus(404);

    // 상태 갱신
    img.watermark.status = status;
    if (status === 'done') {
      // 외부 서비스가 파일을 /uploads/watermarked/에 두었다고 가정
      // 이미 절대경로라면 URL로 맞춰서 저장하도록 정규화
      const url = resultPath?.startsWith('/uploads/')
        ? resultPath
        : (resultPath ? `/uploads/watermarked/${resultPath}` : null);
      img.watermark.resultPath = url;
      img.watermark.error = null;
    } else if (status === 'failed') {
      img.watermark.error = error || 'unknown';
    }
    await img.save();

    return res.sendStatus(200);
  } catch (e) {
    console.error('[watermark/callback]', e);
    return res.status(500).json({ message: '콜백 처리 실패', error: String(e) });
  }
});

export default router;
