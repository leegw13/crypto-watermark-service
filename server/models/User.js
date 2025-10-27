// models/User.js
import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  email: { type: String, unique: true, required: true, index: true },
  passwordHash: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
});

// 이미 등록되었으면 재사용, 아니면 새로 등록
export default mongoose.models.User || mongoose.model('User', UserSchema);
