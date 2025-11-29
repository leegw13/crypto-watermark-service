// middleware/verifyToken.js
import jwt from 'jsonwebtoken';

export function verifyToken(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    // 기대 형식: "Bearer <token>"
    const token = header.startsWith('Bearer ') ? header.split(' ')[1] : null;
    if (!token) {
      return res.status(401).json({ message: '토큰이 없습니다. (Authorization: Bearer <token>)' });
    }
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // 이후 라우트에서 사용 가능
    next();
  } catch (err) {
    return res.status(403).json({ message: '유효하지 않은 토큰입니다.', error: String(err) });
  }
}
export default verifyToken;
