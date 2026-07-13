import express from 'express';
import { protect } from '../middleware/auth.js';
import Conversation from '../models/Conversation.js';
import User from '../models/User.js';
import Message from '../models/Message.js';

const router = express.Router();

// @route   GET /api/conversations
// @desc    Get all conversations for a user
router.get('/', protect, async (req, res) => {
  try {
    const conversations = await Conversation.find({
      participants: req.user._id
    })
    .populate('participants', 'name email avatar about status lastSeen')
    .populate({
      path: 'lastMessage',
      populate: { path: 'sender', select: 'name avatar' }
    })
    .sort({ lastMessageTime: -1 });

    res.json(conversations);
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// @route   POST /api/conversations
// @desc    Create a new conversation
router.post('/', protect, async (req, res) => {
  try {
    const { participantId } = req.body;

    if (!participantId) {
      return res.status(400).json({ 
        success: false,
        message: 'Participant ID is required' 
      });
    }

    const participant = await User.findById(participantId);
    if (!participant) {
      return res.status(404).json({ 
        success: false,
        message: 'User not found' 
      });
    }

    let existingConversation = await Conversation.findOne({
      isGroup: false,
      participants: { $all: [req.user._id, participantId] }
    })
    .populate('participants', 'name email avatar about status lastSeen');

    if (existingConversation) {
      return res.status(400).json({ 
        success: false,
        message: 'Conversation already exists' 
      });
    }

    const conversation = await Conversation.create({
      participants: [req.user._id, participantId],
      isGroup: false
    });

    await conversation.populate('participants', 'name email avatar about status lastSeen');

    res.status(201).json(conversation);
  } catch (error) {
    console.error('Create conversation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ✅ DELETE /api/conversations/:conversationId
// @desc    Delete a conversation
router.delete('/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;
    
    // Find and delete the conversation
    const conversation = await Conversation.findByIdAndDelete(conversationId);
    
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found' 
      });
    }
    
    // Delete all messages in this conversation
    await Message.deleteMany({ conversation: conversationId });
    
    res.json({ 
      success: true,
      message: 'Conversation deleted successfully' 
    });
  } catch (error) {
    console.error('Delete conversation error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to delete conversation' 
    });
  }
});

export default router;