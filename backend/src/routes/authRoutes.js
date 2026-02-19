const express = require('express');
const { 
  adminLogin, 
  memberRegister, 
  memberLogin, 
  getCurrentUser 
} = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

// Admin routes
router.post('/admin/login', adminLogin);

// Member routes
router.post('/register', memberRegister);
router.post('/member/login', memberLogin);

// Unified login endpoint - checks if it's admin (password only) or member (email + password)
router.post('/login', async (req, res) => {
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

// Get current user (works for both admin and members)
router.get('/me', authenticate, getCurrentUser);
router.get('/admin/profile', authenticate, getCurrentUser);

module.exports = router;
