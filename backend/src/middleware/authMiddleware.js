const jwt = require('jsonwebtoken');

function authMiddleware(req, res, next) {
  // 1. Get the Authorization header
  const authHeader = req.headers['authorization'];

  // 2. Check it exists and starts with "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'No token provided'
    });
  }

  // 3. Extract the token (remove "Bearer " prefix)
  const token = authHeader.split(' ')[1];

  try {
    // 4. Verify the token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 5. Attach decoded user info to req.user
    // Now any route after this middleware can use req.user.sub, req.user.email
    req.user = decoded;
    next(); // continue to the route handler

  } catch (err) {
    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token'
    });
  }
}

module.exports = authMiddleware;