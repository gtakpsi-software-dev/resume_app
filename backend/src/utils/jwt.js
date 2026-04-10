const path = require('path');
const jwt = require('jsonwebtoken');

require('dotenv').config({ path: path.join(__dirname, '..', '..', '.env') });

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error(
    'JWT_SECRET is missing. Set it in backend/.env (see README). If you start the server from the repo root, the app now loads backend/.env explicitly.'
  );
}

// Generate a JWT token
const generateToken = (user) => {
  const payload = {
    id: user.id,
    email: user.email,
    role: user.role
  };

  // Token expires in 24 hours
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
};

// Verify a JWT token
const verifyToken = (token) => {
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    return decoded;
  } catch (error) {
    console.error('JWT verification error:', error.message);
    return null;
  }
};

module.exports = {
  generateToken,
  verifyToken
}; 