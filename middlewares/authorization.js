const jwt = require('jsonwebtoken');
const { User } = require('../models');

// Роль берём из БД, а не из входящего запроса или localStorage.
async function authorization(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authorization token is required' });
  }
  try {
    const decoded = jwt.verify(header.slice(7), process.env.JWT_SECRET);
    const user = await User.findByPk(decoded.id, { attributes: ['id', 'email', 'fullName', 'role'] });
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = { id: user.id, email: user.email, fullName: user.fullName, role: user.role };
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError' || error.name === 'TokenExpiredError' ||
        error.name === 'NotBeforeError') {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
    next(error);
  }
}

module.exports = authorization;
