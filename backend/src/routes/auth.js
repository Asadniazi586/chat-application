import express from 'express';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

console.log('🔧 Loading auth routes...');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || 'your-secret-key', {
    expiresIn: '30d'
  });
};

// @route   POST /api/auth/register
router.post('/register', async (req, res) => {
  try {
    console.log('📝 Registration request received:');
    console.log('📦 Body:', req.body);

    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide name, email and password' 
      });
    }

    if (password.length < 6) {
      return res.status(400).json({ 
        success: false,
        message: 'Password must be at least 6 characters' 
      });
    }

    // Check if user exists
    const userExists = await User.findOne({ email: email.toLowerCase() });
    if (userExists) {
      return res.status(400).json({ 
        success: false,
        message: 'User already exists with this email' 
      });
    }

    // ✅ Create user WITHOUT manually hashing - let the pre('save') hook handle it
    const user = new User({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password: password // ✅ Pass plain password, pre('save') will hash it
    });

    await user.save();
    console.log('✅ User created successfully:', user.email);

    const token = generateToken(user._id);

    res.status(201).json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        lastSeen: user.lastSeen,
        createdAt: user.createdAt
      }
    });
  } catch (error) {
    console.error('❌ Registration error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error during registration' 
    });
  }
});

// @route   POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    console.log('📝 Login request received:');
    console.log('📦 Body:', req.body);

    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        success: false,
        message: 'Please provide email and password' 
      });
    }

    // ✅ Find user
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    console.log('✅ User found:', user.email);
    console.log('🔑 Password in DB:', user.password ? 'Yes' : 'No');
    console.log('📏 Password length:', user.password?.length || 0);

    // ✅ Use the model's comparePassword method
    const isMatch = await user.comparePassword(password);
    console.log('🔐 Password match:', isMatch);

    if (!isMatch) {
      return res.status(401).json({ 
        success: false,
        message: 'Invalid email or password' 
      });
    }

    user.status = 'online';
    user.lastSeen = Date.now();
    await user.save();

    const token = generateToken(user._id);

    console.log('✅ Login successful:', user.email);

    res.json({
      success: true,
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        status: user.status,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('❌ Login error:', error);
    res.status(500).json({ 
      success: false,
      message: error.message || 'Server error during login' 
    });
  }
});

// @route   GET /api/auth/me
router.get('/me', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json({
      success: true,
      user
    });
  } catch (error) {
    console.error('❌ Get user error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   GET /api/auth/debug/:email
// @desc    Debug - Check if user exists
router.get('/debug/:email', async (req, res) => {
  try {
    const { email } = req.params;
    const user = await User.findOne({ email: email.toLowerCase() });
    
    if (!user) {
      return res.json({ 
        exists: false, 
        message: 'User not found' 
      });
    }
    
    res.json({
      exists: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        hasPassword: !!user.password,
        passwordLength: user.password ? user.password.length : 0,
        status: user.status
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// ============================================================
// ✅✅✅ SEARCH ROUTE ✅✅✅
// ============================================================
console.log('🔧 Registering GET /search route...');

router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    console.log('🔍🔍🔍 SEARCH ROUTE HIT! 🔍🔍🔍');
    console.log('🔍 Search query received:', q);
    console.log('👤 Current user ID:', req.user?._id);

    if (!q || q.length < 2) {
      console.log('⚠️ Query too short, returning empty results');
      return res.json([]);
    }

    const users = await User.find({
      _id: { $ne: req.user._id },
      $or: [
        { name: { $regex: q, $options: 'i' } },
        { email: { $regex: q, $options: 'i' } }
      ]
    })
    .select('-password')
    .limit(10);

    console.log(`✅ Found ${users.length} users matching "${q}"`);

    res.json(users);
  } catch (error) {
    console.error('❌ Search error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error during search' 
    });
  }
});

console.log('✅ GET /search route registered');

// ============================================================
// ✅✅✅ PROFILE UPDATE ROUTE ✅✅✅
// ============================================================
router.put('/profile', protect, async (req, res) => {
  try {
    console.log('📝 Profile update request received:');
    console.log('📦 Body:', req.body);

    const { name, about, avatar } = req.body;
    const user = await User.findById(req.user._id);
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (name) user.name = name;
    if (about) user.about = about;
    if (avatar) user.avatar = avatar;
    
    await user.save();
    
    console.log('✅ Profile updated for:', user.email);
    
    res.json({ 
      success: true, 
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        avatar: user.avatar,
        about: user.about,
        status: user.status,
        lastSeen: user.lastSeen
      }
    });
  } catch (error) {
    console.error('❌ Profile update error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile' 
    });
  }
});

// @route   POST /api/auth/logout
router.post('/logout', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    user.status = 'offline';
    user.lastSeen = Date.now();
    await user.save();
    
    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

console.log('✅ All auth routes loaded successfully');

export default router;