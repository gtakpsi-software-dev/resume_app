const express = require('express');
const rateLimit = require('express-rate-limit');
const { 
  adminLogin, 
  memberRegister, 
  memberLogin, 
  getCurrentUser 
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { error: true, message: 'Too many attempts. Try again in a few minutes.' },
});

router.post('/admin/login', authLimiter, adminLogin);
router.post('/register', authLimiter, memberRegister);
router.post('/member/login', authLimiter, memberLogin);

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  
  // If only password provided, it's admin login
  if (!email && password) {
    return adminLogin(req, res);
  }
  
  // Otherwise, it's member login
  if (email && password) {
    return memberLogin(req, res);
  }
  
  // Invalid request
  return res.status(400).json({ 
    error: true, 
    message: 'Please provide email and password for member login, or password for admin login.' 
  });
});

router.get('/me', authenticate, getCurrentUser);
router.get('/admin/profile', authenticate, getCurrentUser);

module.exports = router;
