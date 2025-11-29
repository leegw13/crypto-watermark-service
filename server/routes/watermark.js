﻿// server/routes/watermark.js
import express from "express";
import path from "path";
import fs from "fs";
import multer from "multer";

import Image from "../models/Image.js";
import { requestApply, requestExtract } from "../services/watermarkClient.js";

const router = express.Router();

// ==================== 워터마크 삽입 요청 ====================
router.post("/apply", async (req, res) => {
  try {
    const { imageId, options } = req.body || {};
    if (!imageId) {
      return res.status(400).json({ message: "imageId 가 필요합니다." });
    }

    const img = await Image.findById(imageId);
    if (!img) {
      return res.status(404).json({ message: "이미지를 찾을 수 없습니다." });
    }

    // 로그인한 사용자와 소유자 일치 여부 검사
    if (img.ownerEmail !== req.user?.email) {
      return res
        .status(403)
        .json({ message: "이 이미지에 대한 권한이 없습니다." });
    }

    // 원본/워터마크 경로 준비
    const ORIGINAL_DIR = path.resolve("uploads", "original");
    const WM_DIR = path.resolve("uploads", "watermarked");

    const origFilename = img.original?.filename;
    if (!origFilename) {
      return res
        .status(400)
        .json({ message: "원본 파일 정보가 없습니다." });
    }

    const origPath = path.resolve(ORIGINAL_DIR, origFilename);
    const wmFilename = `wm-${origFilename}`;
    const wmDiskPath = path.resolve(WM_DIR, wmFilename);
    const wmUrl = `/uploads/watermarked/${wmFilename}`;

    // DB 상태 업데이트 (queued)
    img.watermark.status = "queued";
    img.watermark.options = options || {};
    img.watermark.resultPath = wmUrl;
    img.watermark.error = null;
    await img.save();

    // Python 서버로 워터마크 작업 요청
    await requestApply({
      imageId: img._id.toString(),
      ownerEmail: img.ownerEmail,
      callbackUrl: `${
        process.env.NODE_BASE_URL ?? "http://localhost:4000"
      }/watermark/callback`,
      srcPath: origPath,
      outPath: wmDiskPath,
      payload: img.watermarkPayload,
      method: options?.method || "dwtDct",
    });

    return res.status(202).json({
      message: "워터마크 작업 요청 완료",
      imageId: img._id,
      watermark: img.watermark,
    });
  } catch (err) {
    console.error("[watermark/apply] error:", err);
    return res.status(500).json({
      message: "워터마크 요청 중 서버 오류가 발생했습니다.",
      error: err.message,
    });
  }
});

// ==================== Python → Node 콜백 ====================
router.post("/callback", async (req, res) => {
  try {
    const { imageId, status, error } = req.body || {};
    if (!imageId) {
      return res.status(400).json({ message: "imageId 가 필요합니다." });
    }
    const img = await Image.findById(imageId);
    if (!img) {
      return res.status(404).json({ message: "이미지를 찾을 수 없습니다." });
    }

    img.watermark.status = status || img.watermark.status;
    if (status === "failed" && error) {
      img.watermark.error = error;
    }

    await img.save();
    return res.json({ ok: true });
  } catch (err) {
    console.error("[watermark/callback] error:", err);
    return res.status(500).json({ ok: false, error: err.message });
  }
});

// ==================== 워터마크 추출 (검증용) ====================

// 메모리 저장소 (검증용 이미지만 잠깐 쓰고 지움)
const verifyUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
});

router.post(
  "/extract",
  verifyUpload.single("image"),
  async (req, res) => {
    try {
      if (!req.file) {
        return res
          .status(400)
          .json({ message: "검증할 이미지 파일이 필요합니다." });
      }

      // 임시 파일로 저장
      const TMP_DIR = path.resolve("uploads", "verify-temp");
      await fs.promises.mkdir(TMP_DIR, { recursive: true });

      const ext =
        path.extname(req.file.originalname || "") || ".png";
      const tmpName = `verify-${Date.now()}-${Math.round(
        Math.random() * 1e6
      )}${ext}`;
      const tmpPath = path.join(TMP_DIR, tmpName);

      await fs.promises.writeFile(tmpPath, req.file.buffer);

      try {
        // Python 서버에 추출 요청
        const PAYLOAD_LEN = 16; // watermarkPayload 길이 (hex 16글자)
        const wmData = await requestExtract({
          srcPath: tmpPath,
          method: "dwtDct",
          expectedLen: PAYLOAD_LEN,
        });

        const payload = wmData.payload;
        if (!payload) {
          return res.status(200).json({
            matched: false,
            message: "워터마크를 추출하지 못했습니다.",
            payload: null,
          });
        }

        // MongoDB에서 같은 payload를 가진 이미지 찾기
        const img = await Image.findOne({
          watermarkPayload: payload,
        }).lean();

        if (!img) {
          return res.status(200).json({
            matched: false,
            message:
              "우리 서비스에서 생성한 워터마크 기록을 찾지 못했습니다.",
            payload,
          });
        }

        return res.status(200).json({
          matched: true,
          message: "우리 서비스에서 생성한 워터마크가 확인되었습니다.",
          payload,
          image: {
            id: img._id,
            ownerEmail: img.ownerEmail,
            createdAt: img.createdAt,
            original: img.original,
            watermark: img.watermark,
          },
        });
      } finally {
        // 임시 파일 삭제 (실패해도 그냥 무시)
        fs.promises.unlink(tmpPath).catch(() => {});
      }
    } catch (err) {
      console.error("[watermark/extract] error:", err);
      return res.status(500).json({
        message: "워터마크 추출 중 서버 오류가 발생했습니다.",
        error: err.message,
      });
    }
  }
);

export default router;
