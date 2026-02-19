const { User } = require('../models');
const { generateToken } = require('../utils/jwt');

// Admin login with simple password check
const adminLogin = async (req, res) => {
  try {
    const { password } = req.body;
    
    // Check if password matches the admin password
    if (password === 'AyanIsAwesome') {
      // Generate a simple session token (we can reuse JWT utils for this)
      const token = generateToken({ role: 'admin', id: 'admin', email: 'admin' });
      
      console.log('Admin login successful');
      
      // Return success with token
      res.status(200).json({
        error: false,
        message: 'Admin login successful.',
        data: {
          role: 'admin',
          token
        }
      });
    } else {
      console.log('Admin login failed: Invalid password');
      res.status(401).json({ error: true, message: 'Invalid admin password.' });
    }
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: true, message: 'Error during admin login.' });
  }
};

// Member registration
const memberRegister = async (req, res) => {
  try {
    const { email, password, firstName, lastName, accessCode } = req.body;

    // Validate required fields
    if (!email || !password || !firstName || !lastName) {
      return res.status(400).json({ 
        error: true, 
        message: 'Please provide email, password, firstName, and lastName.' 
      });
    }

    // Verify access code
    if (accessCode !== 'EpsilonSigma') {
      return res.status(403).json({ 
        error: true, 
        message: 'Invalid access code.' 
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(400).json({ 
        error: true, 
        message: 'User with this email already exists.' 
      });
    }

    // Create new user
    const user = new User({
      email: email.toLowerCase(),
      password, // Will be hashed by pre-save hook
      firstName,
      lastName,
      role: 'member'
    });

    await user.save();

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    console.log(`Member registration successful: ${user.email}`);

    res.status(201).json({
      error: false,
      message: 'Registration successful. Please check your email to confirm your account.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Member registration error:', error);
    
    // Handle duplicate email error
    if (error.code === 11000) {
      return res.status(400).json({ 
        error: true, 
        message: 'User with this email already exists.' 
      });
    }

    res.status(500).json({ 
      error: true, 
      message: 'Error during registration.' 
    });
  }
};

// Member login
const memberLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate required fields
    if (!email || !password) {
      return res.status(400).json({ 
        error: true, 
        message: 'Please provide email and password.' 
      });
    }

    // Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ 
        error: true, 
        message: 'Invalid email or password.' 
      });
    }

    // Check if user is active
    if (!user.isActive) {
      return res.status(403).json({ 
        error: true, 
        message: 'Account is deactivated. Please contact support.' 
      });
    }

    // Verify password
    const isValidPassword = await user.validPassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ 
        error: true, 
        message: 'Invalid email or password.' 
      });
    }

    // Generate token
    const token = generateToken({
      id: user._id.toString(),
      email: user.email,
      role: user.role
    });

    console.log(`Member login successful: ${user.email}`);

    res.status(200).json({
      error: false,
      message: 'Login successful.',
      data: {
        user: {
          id: user._id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          role: user.role
        },
        token
      }
    });
  } catch (error) {
    console.error('Member login error:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error during login.' 
    });
  }
};

// Get current user profile (works for both admin and members)
const getCurrentUser = async (req, res) => {
  try {
    // If admin (from admin login)
    if (req.user.role === 'admin' && req.user.id === 'admin') {
      return res.status(200).json({
        error: false,
        data: {
          role: 'admin',
          id: 'admin'
        }
      });
    }

    // If member, fetch from database
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ 
        error: true, 
        message: 'User not found.' 
      });
    }

    res.status(200).json({
      error: false,
      data: {
        id: user._id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role
      }
    });
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Error retrieving user profile.' 
    });
  }
};

// Legacy function name for backwards compatibility
const getAdminProfile = getCurrentUser;

module.exports = {
  adminLogin,
  memberRegister,
  memberLogin,
  getCurrentUser,
  getAdminProfile
};
