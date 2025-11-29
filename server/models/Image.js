﻿// models/Image.js
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },

  original: {
    filename: String,   // 실제 파일명 (디스크)
    url: String,        // 클라이언트에서 접근할 URL (/uploads/original/...)
    size: Number,
    mimetype: String,
    hash: String,       // SHA-256 등
  },

  watermark: {
    status: {
      type: String,
      enum: ['none', 'queued', 'processing', 'done', 'failed'],
      default: 'none',
    },
    options: { type: Object },
    resultPath: String, // 워터마크된 이미지 URL (/uploads/watermarked/...)
    error: String,
  },

  // 👇 비가시 워터마크에 실제로 숨겨 넣을 payload (hex 문자열)
  watermarkPayload: { type: String },

  createdAt: { type: Date, default: Date.now },
});

// 최근 것부터 조회
ImageSchema.index({ ownerEmail: 1, createdAt: -1 });

export default mongoose.models.Image || mongoose.model('Image', ImageSchema);
