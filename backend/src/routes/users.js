import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

const router = express.Router();

// @route   GET /api/users/search
// @desc    Search users by name or email
router.get('/search', protect, async (req, res) => {
  try {
    const { q } = req.query;
    
    if (!q || q.length < 2) {
      return res.json([]);
    }

    const users = await User.find({
      $and: [
        { _id: { $ne: req.user._id } },
        {
          $or: [
            { name: { $regex: q, $options: 'i' } },
            { email: { $regex: q, $options: 'i' } }
          ]
        }
      ]
    })
    .select('name email avatar about status lastSeen');

    res.json(users);
  } catch (error) {
    console.error('Search users error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to search users' 
    });
  }
});

// @route   GET /api/users/profile/:userId
// @desc    Get user profile with about
router.get('/profile/:userId', protect, async (req, res) => {
  try {
    console.log('📥 Fetching profile for user:', req.params.userId);
    
    const user = await User.findById(req.params.userId)
      .select('name email avatar about status lastSeen');
    
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    console.log('✅ User profile fetched:', user.name);
    console.log('✅ User about:', user.about);
    
    res.json({ 
      success: true,
      user 
    });
  } catch (error) {
    console.error('Get profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to get user profile' 
    });
  }
});

// @route   PUT /api/users/profile
// @desc    Update user profile (name, about, avatar)
router.put('/profile', protect, async (req, res) => {
  try {
    const { name, about, avatar } = req.body;
    
    console.log('📝 Updating profile for user:', req.user._id);
    console.log('📝 New name:', name);
    console.log('📝 New about:', about);
    console.log('📝 New avatar:', avatar);
    
    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }
    
    // Update fields
    if (name !== undefined && name !== '') user.name = name;
    if (about !== undefined) user.about = about;
    if (avatar !== undefined) user.avatar = avatar;
    
    await user.save();
    
    console.log('✅ Profile updated successfully');
    console.log('✅ New about saved:', user.about);
    
    // Get updated user
    const updatedUser = await User.findById(req.user._id)
      .select('-password');
    
    res.json({ 
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to update profile' 
    });
  }
});

// @route   POST /api/users/block
// @desc    Block a user
router.post('/block', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    const userToBlock = await User.findById(userId);
    if (!userToBlock) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    if (req.user.blockedUsers.includes(userId)) {
      return res.status(400).json({ 
        success: false,
        message: 'User already blocked' 
      });
    }

    req.user.blockedUsers.push(userId);
    await req.user.save();

    // Delete conversation
    await Conversation.findOneAndDelete({
      isGroup: false,
      participants: { $all: [req.user._id, userId] }
    });

    res.json({ 
      success: true,
      message: 'User blocked successfully' 
    });
  } catch (error) {
    console.error('Block error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to block user' 
    });
  }
});

// @route   POST /api/users/unblock
// @desc    Unblock a user
router.post('/unblock', protect, async (req, res) => {
  try {
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'User ID is required' 
      });
    }

    req.user.blockedUsers = req.user.blockedUsers.filter(
      id => id.toString() !== userId
    );
    await req.user.save();

    res.json({ 
      success: true,
      message: 'User unblocked successfully' 
    });
  } catch (error) {
    console.error('Unblock error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to unblock user' 
    });
  }
});

// @route   GET /api/users/check-blocked/:userId
// @desc    Check if a user is blocked
router.get('/check-blocked/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const isBlocked = req.user.blockedUsers.includes(userId);
    
    res.json({ 
      success: true,
      isBlocked 
    });
  } catch (error) {
    console.error('Check blocked error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to check block status' 
    });
  }
});

// @route   DELETE /api/users/clear-chat/:conversationId
// @desc    Clear chat messages
router.delete('/clear-chat/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    console.log('🗑️ Clearing chat for conversation:', conversationId);
    
    // Delete all messages in conversation
    await Message.deleteMany({ conversation: conversationId });
    
    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: null,
      lastMessageTime: null
    });

    console.log('✅ Chat cleared successfully');
    
    res.json({ 
      success: true,
      message: 'Chat cleared successfully' 
    });
  } catch (error) {
    console.error('Clear chat error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to clear chat' 
    });
  }
});

export default router;