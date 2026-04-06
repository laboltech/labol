const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  const header = req.headers['authorization'];
  if (!header) return res.status(401).json({ error: 'authorization header required' });

  const token = header.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.wallet = decoded.wallet;
    next();
  } catch {
    res.status(401).json({ error: 'invalid or expired token' });
  }
}

module.exports = { requireAuth };
