const jwt = require('jsonwebtoken');

// Protects a route: reads "Authorization: Bearer <token>", verifies it,
// and attaches the logged-in user's id to req.userId for the route to use.
// Any route that uses this middleware requires the user to be logged in.
function verifyToken(req, res, next) {
  const header = req.headers.authorization; 

  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = header.split(' ')[1];

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.userId = payload.userId;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
}

module.exports = { verifyToken };