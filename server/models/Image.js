// models/Image.js
import mongoose from 'mongoose';

const ImageSchema = new mongoose.Schema({
  ownerEmail: { type: String, required: true, index: true },
  original: {
    filename: String,
    url: String,
    size: Number,
    mimetype: String,
    hash: String,
  },
  watermark: {
    status: { type: String, enum: ['none', 'queued', 'processing', 'done', 'failed'], default: 'none' },
    options: { type: Object },
    resultPath: String,
    error: String,
  },
  createdAt: { type: Date, default: Date.now },
});

ImageSchema.index({ ownerEmail: 1, createdAt: -1 });

export default mongoose.models.Image || mongoose.model('Image', ImageSchema);
