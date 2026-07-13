import express from 'express';
import { protect } from '../middleware/auth.js';
import Message from '../models/Message.js';
import Conversation from '../models/Conversation.js';
import { getUserSocketId } from '../socket/socketHandler.js';

const router = express.Router();

// ✅ GET messages for a conversation
router.get('/:conversationId', protect, async (req, res) => {
  try {
    const { conversationId } = req.params;

    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found' 
      });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    const messages = await Message.find({
      conversation: conversationId,
      $or: [
        { isDeleted: false },
        { deletedFor: { $ne: req.user._id } },
        { deletedFor: { $exists: false } }
      ]
    })
    .populate('sender', 'name email avatar')
    .populate('replyTo', 'content sender')
    .sort({ createdAt: 1 })
    .limit(100);

    res.json(messages);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ✅ DELETE message (for everyone or for me) - NO TIME LIMIT
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { deleteFor } = req.query; // 'everyone' or 'me'

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if user is the sender
    const isSender = message.sender.toString() === req.user._id.toString();

    if (deleteFor === 'everyone') {
      // Only sender can delete for everyone
      if (!isSender) {
        return res.status(403).json({ 
          success: false,
          message: 'Not authorized to delete for everyone' 
        });
      }

      // ✅ REMOVED 5-minute limit - Delete instantly
      message.isDeleted = true;
      await message.save();
    } else {
      // Delete for me
      if (!message.deletedFor.includes(req.user._id)) {
        message.deletedFor.push(req.user._id);
        await message.save();
      }
    }

    res.json({ 
      success: true,
      message: 'Message deleted successfully' 
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ✅ EDIT message - NO TIME LIMIT
router.put('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({ 
        success: false,
        message: 'Content is required' 
      });
    }

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if user is the sender
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to edit this message' 
      });
    }

    // ✅ REMOVED 5-minute limit - Edit anytime!

    // Save edit history
    if (!message.editHistory) {
      message.editHistory = [];
    }
    message.editHistory.push({
      content: message.content,
      editedAt: new Date()
    });

    message.content = content.trim();
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    await message.populate('sender', 'name email avatar');

    res.json({ 
      success: true,
      message: message
    });
  } catch (error) {
    console.error('Edit message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

// ✅ FORWARD message - WITH SOCKET EMISSION
router.post('/:messageId/forward', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ 
        success: false,
        message: 'Conversation ID is required' 
      });
    }

    const originalMessage = await Message.findById(messageId);
    if (!originalMessage) {
      return res.status(404).json({ 
        success: false,
        message: 'Message not found' 
      });
    }

    // Check if user is part of target conversation
    const conversation = await Conversation.findById(conversationId);
    if (!conversation) {
      return res.status(404).json({ 
        success: false,
        message: 'Conversation not found' 
      });
    }

    if (!conversation.participants.includes(req.user._id)) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized' 
      });
    }

    // Create forwarded message
    const forwardedMessage = new Message({
      conversation: conversationId,
      sender: req.user._id,
      content: originalMessage.content,
      type: originalMessage.type,
      fileUrl: originalMessage.fileUrl,
      fileName: originalMessage.fileName,
      fileSize: originalMessage.fileSize,
      isForwarded: true,
      forwardedFrom: originalMessage._id,
      status: 'sent'
    });

    await forwardedMessage.save();
    await forwardedMessage.populate('sender', 'name email avatar');

    // Update conversation last message
    await Conversation.findByIdAndUpdate(conversationId, {
      lastMessage: forwardedMessage._id,
      lastMessageTime: forwardedMessage.createdAt
    });

    // ✅ EMIT SOCKET EVENTS FOR REAL-TIME UPDATES
    const io = req.app.get('io');
    if (io) {
      const roomName = `conversation-${conversationId}`;
      
      // Emit new message to room
      io.to(roomName).emit('new-message', forwardedMessage);
      console.log(`✅ Forwarded message emitted to room ${roomName}`);
      
      // Get full conversation for sidebar update
      const updatedConversation = await Conversation.findById(conversationId)
        .populate('participants', 'name email avatar status lastSeen')
        .populate('lastMessage');
      
      // Get all participants
      const allParticipants = conversation.participants.map(p => p.toString());
      
      // Emit conversation update to room
      io.to(roomName).emit('conversation-updated', {
        conversation: updatedConversation
      });
      console.log(`✅ Conversation update emitted to room ${roomName}`);
      
      // Also emit to each participant individually
      for (const participantId of allParticipants) {
        const socketId = getUserSocketId(participantId);
        if (socketId) {
          io.to(socketId).emit('conversation-updated', {
            conversation: updatedConversation
          });
          console.log(`✅ Sent conversation update to participant ${participantId} after forward`);
        }
      }
    }

    res.json({ 
      success: true,
      message: forwardedMessage
    });
  } catch (error) {
    console.error('Forward message error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Server error' 
    });
  }
});

export default router;