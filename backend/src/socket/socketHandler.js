import User from '../models/User.js';
import Conversation from '../models/Conversation.js';
import Message from '../models/Message.js';

// Store online users
const onlineUsers = new Map();

export const socketHandler = (io) => {
  io.on('connection', (socket) => {
    console.log('🔌 New client connected:', socket.id);

    // ✅ User comes online
    socket.on('user-online', async (userId) => {
      console.log(`👤 User ${userId} is online`);
      onlineUsers.set(userId, socket.id);
      
      await User.findByIdAndUpdate(userId, {
        status: 'online',
        lastSeen: Date.now()
      });

      socket.broadcast.emit('user-status-change', {
        userId,
        status: 'online'
      });
    });

    // ✅ User goes offline
    socket.on('user-offline', async (userId) => {
      console.log(`👤 User ${userId} is offline`);
      onlineUsers.delete(userId);
      
      await User.findByIdAndUpdate(userId, {
        status: 'offline',
        lastSeen: Date.now()
      });

      socket.broadcast.emit('user-status-change', {
        userId,
        status: 'offline'
      });
    });

    // ✅ Update about
    socket.on('update-about', async (data) => {
      try {
        const { userId, about } = data;
        
        await User.findByIdAndUpdate(userId, { about });
        
        socket.broadcast.emit('about-updated', {
          userId,
          about
        });
        
        console.log(`📝 About updated for user ${userId}: ${about}`);
      } catch (error) {
        console.error('Update about error:', error);
      }
    });

    // ✅ Join conversation room
    socket.on('join-conversation', (conversationId) => {
      const roomName = `conversation-${conversationId}`;
      socket.join(roomName);
      console.log(`📚 Socket ${socket.id} joined room: ${roomName}`);
      
      const room = io.sockets.adapter.rooms.get(roomName);
      const roomSize = room ? room.size : 0;
      console.log(`📊 Room ${roomName} now has ${roomSize} clients`);
      
      socket.emit('room-info', { 
        roomName, 
        clientCount: roomSize 
      });
    });

    // ✅ Leave conversation room
    socket.on('leave-conversation', (conversationId) => {
      const roomName = `conversation-${conversationId}`;
      socket.leave(roomName);
      console.log(`📚 Socket ${socket.id} left room: ${roomName}`);
      
      const room = io.sockets.adapter.rooms.get(roomName);
      const roomSize = room ? room.size : 0;
      console.log(`📊 Room ${roomName} now has ${roomSize} clients`);
    });

    // ✅ SEND MESSAGE - FIXED to send to all participants directly
    socket.on('send-message', async (data) => {
      try {
        console.log('📤 Backend received send-message:', data);
        
        const { conversationId, senderId, content, type = 'text', fileName, fileSize, replyTo } = data;

        const conversation = await Conversation.findById(conversationId)
          .populate('participants', '_id');
        
        if (!conversation) {
          console.error('❌ Conversation not found:', conversationId);
          socket.emit('message-error', { error: 'Conversation not found' });
          return;
        }

        console.log('✅ Conversation found:', conversationId);
        console.log('✅ Participants:', conversation.participants.map(p => p._id.toString()));

        const participants = conversation.participants.map(p => p._id.toString());
        const receiverId = participants.find(id => id !== senderId);
        
        if (receiverId) {
          const receiver = await User.findById(receiverId);
          if (receiver && receiver.blockedUsers && receiver.blockedUsers.includes(senderId)) {
            console.log(`🚫 User ${senderId} is blocked by ${receiverId}`);
            socket.emit('message-error', { 
              error: 'You are blocked by this user' 
            });
            return;
          }
        }

        const messageData = {
          conversation: conversationId,
          sender: senderId,
          content,
          type,
          fileName: fileName || '',
          fileSize: fileSize || 0,
          status: 'sent'
        };
        
        if (replyTo) {
          messageData.replyTo = replyTo;
        }

        const newMessage = new Message(messageData);
        await newMessage.save();
        console.log('✅ Message saved to database:', newMessage._id);

        await newMessage.populate('sender', 'name email avatar');
        
        if (replyTo) {
          await newMessage.populate('replyTo', 'content sender');
        }

        await Conversation.findByIdAndUpdate(conversationId, {
          lastMessage: newMessage._id,
          lastMessageTime: newMessage.createdAt
        });
        console.log('✅ Conversation updated with last message');

        const conversationWithParticipants = await Conversation.findById(conversationId)
          .populate('participants', '_id');

        const allParticipants = conversationWithParticipants.participants.map(p => p._id.toString());
        const receiverIds = allParticipants.filter(id => id !== senderId);
        console.log('✅ Receiver IDs:', receiverIds);

        for (const receiverId of receiverIds) {
          const conversationDoc = await Conversation.findById(conversationId);
          if (!conversationDoc.unreadCount) {
            conversationDoc.unreadCount = new Map();
          }
          const currentUnread = conversationDoc.unreadCount.get(receiverId) || 0;
          conversationDoc.unreadCount.set(receiverId, currentUnread + 1);
          await conversationDoc.save();
        }
        console.log('✅ Unread counts updated');

        const roomName = `conversation-${conversationId}`;
        const room = io.sockets.adapter.rooms.get(roomName);
        const roomSize = room ? room.size : 0;
        
        console.log(`📤 Emitting to room: ${roomName}`);
        console.log(`📊 Room has ${roomSize} clients`);
        
        // ✅ Emit new message to room
        io.to(roomName).emit('new-message', newMessage);
        console.log('✅ Message emitted to room:', roomName);

        // ✅ ALSO send new-message directly to ALL participants (including those not in room)
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            console.log(`📤 Sending new-message directly to participant ${participantId}`);
            io.to(participantSocketId).emit('new-message', newMessage);
          }
        }

        // ✅ Fetch full conversation with participants for sidebar update
        const fullConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');

        // ✅ FIXED: Only emit conversation update to participants who are NOT the sender
        // The sender already has the correct status from new-message event
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId && participantId !== senderId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: fullConversation
            });
            console.log(`✅ Sent conversation update to participant ${participantId}`);
          }
        }

        // ✅ IMMEDIATELY update message status to 'delivered' in database
        const updatedMessage = await Message.findByIdAndUpdate(
          newMessage._id, 
          { status: 'delivered' },
          { new: true }
        ).populate('sender', 'name email avatar');
        console.log('✅ Message status updated to delivered in database:', updatedMessage.status);

        // ✅ IMMEDIATELY emit message-delivered to sender (NO DELAY)
        socket.emit('message-delivered', {
          messageId: newMessage._id,
          conversationId,
          message: updatedMessage
        });
        console.log('✅ Delivery status sent to sender immediately');

        // ✅ Also send to sender's other devices
        const senderSocketId = onlineUsers.get(senderId);
        if (senderSocketId && senderSocketId !== socket.id) {
          io.to(senderSocketId).emit('message-delivered', {
            messageId: newMessage._id,
            conversationId,
            message: updatedMessage
          });
          console.log('✅ Delivery status sent to sender\'s other device');
        }

        // ✅ Emit to room as well
        io.to(roomName).emit('message-delivered', {
          messageId: newMessage._id,
          conversationId,
          message: updatedMessage
        });
        console.log('✅ Delivery status sent to room');

        // ✅ Notify receivers
        for (const receiverId of receiverIds) {
          const receiverSocketId = onlineUsers.get(receiverId);
          if (receiverSocketId) {
            console.log(`📤 Notifying receiver ${receiverId} at socket ${receiverSocketId}`);
            io.to(receiverSocketId).emit('new-message-notification', {
              message: newMessage,
              conversationId
            });
          } else {
            console.log(`⚠️ Receiver ${receiverId} is not online`);
          }
        }

      } catch (error) {
        console.error('❌ Send message error:', error);
        console.error('❌ Error stack:', error.stack);
        socket.emit('message-error', { 
          error: error.message || 'Failed to send message' 
        });
      }
    });

    // ✅ COMPLETELY FIXED: Mark messages as read with proper individual events
    socket.on('mark-read', async (data) => {
      try {
        const { conversationId, userId } = data;
        console.log(`👀 Marking messages as read for user ${userId} in conversation ${conversationId}`);

        // ✅ Get messages that will be marked as read (messages from OTHER users)
        const messagesToUpdate = await Message.find({
          conversation: conversationId,
          sender: { $ne: userId },
          readBy: { $ne: userId },
          status: { $ne: 'read' }
        });

        console.log(`📊 Found ${messagesToUpdate.length} messages to mark as read`);

        // ✅ Update messages in database
        if (messagesToUpdate.length > 0) {
          await Message.updateMany(
            {
              conversation: conversationId,
              sender: { $ne: userId },
              readBy: { $ne: userId },
              status: { $ne: 'read' }
            },
            {
              $addToSet: { readBy: userId },
              status: 'read'
            }
          );
          console.log(`✅ Updated ${messagesToUpdate.length} messages to read`);
        }

        // ✅ Update unread count - SET TO 0 for this user
        const conversation = await Conversation.findById(conversationId);
        if (conversation) {
          if (!conversation.unreadCount) {
            conversation.unreadCount = new Map();
          }
          conversation.unreadCount.set(userId, 0);
          
          // ✅ IMPORTANT FIX: Also update lastMessage status if it's from the other user
          if (conversation.lastMessage) {
            const lastMessage = await Message.findById(conversation.lastMessage);
            if (lastMessage && lastMessage.sender.toString() !== userId) {
              // If the last message is from the other user, update its status to read
              if (!lastMessage.readBy) {
                lastMessage.readBy = [];
              }
              if (!lastMessage.readBy.includes(userId)) {
                lastMessage.readBy.push(userId);
                lastMessage.status = 'read';
                await lastMessage.save();
                
                // Update the conversation's lastMessage reference
                conversation.lastMessage = lastMessage._id;
              }
            }
          }
          
          await conversation.save();
          console.log(`✅ Unread count reset to 0 for user ${userId}`);
        }

        const roomName = `conversation-${conversationId}`;
        const conv = await Conversation.findById(conversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());

        // ✅ Get sender IDs (participants who sent the messages being read)
        const senderIds = [...new Set(messagesToUpdate.map(m => m.sender.toString()))];
        console.log(`📤 Sender IDs to notify:`, senderIds);

        // ✅ Emit individual message-read events for EACH message
        for (const message of messagesToUpdate) {
          const messageId = message._id.toString();
          const senderId = message.sender.toString();
          console.log(`📤 Emitting individual message-read for message: ${messageId} from sender: ${senderId}`);
          
          // ✅ Emit to room
          io.to(roomName).emit('message-read', {
            messageId: messageId,
            conversationId,
            userId
          });
          
          // ✅ IMPORTANT: Also emit directly to the sender's socket
          const senderSocketId = onlineUsers.get(senderId);
          if (senderSocketId) {
            console.log(`📤 Sending message-read directly to sender ${senderId} at socket ${senderSocketId}`);
            io.to(senderSocketId).emit('message-read', {
              messageId: messageId,
              conversationId,
              userId
            });
          }
          
          // ✅ Emit to each participant individually
          for (const participantId of allParticipants) {
            const participantSocketId = onlineUsers.get(participantId);
            if (participantSocketId) {
              io.to(participantSocketId).emit('message-read', {
                messageId: messageId,
                conversationId,
                userId
              });
            }
          }
        }

        // ✅ Also emit bulk messages-read event for sidebar
        console.log(`📤 Emitting messages-read to room: ${roomName}`);
        io.to(roomName).emit('messages-read', {
          conversationId,
          userId
        });

        // ✅ Also emit messages-read to each sender directly
        for (const senderId of senderIds) {
          const senderSocketId = onlineUsers.get(senderId);
          if (senderSocketId) {
            console.log(`📤 Sending messages-read directly to sender ${senderId}`);
            io.to(senderSocketId).emit('messages-read', {
              conversationId,
              userId
            });
          }
        }

        // ✅ Emit to each participant individually for sidebar
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            console.log(`📤 Sending messages-read to participant ${participantId}`);
            io.to(participantSocketId).emit('messages-read', {
              conversationId,
              userId
            });
          }
        }

        // ✅ FIXED: Get updated conversation with LAST MESSAGE STATUS properly set
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');

        // ✅ FIXED: Only emit conversation-updated to participants who are NOT the sender
        // The sender's ChatList will update via message-read events
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            // ✅ Don't send conversation-updated to the user who marked as read
            // They already have the blue tick from message-read events
            if (participantId !== userId) {
              io.to(participantSocketId).emit('conversation-updated', {
                conversation: updatedConversation
              });
              console.log(`✅ Sent conversation update to participant ${participantId}`);
            } else {
              console.log(`⏭️ Skipping conversation-updated for user ${userId} who marked as read`);
            }
          }
        }

        console.log(`✅ All read events emitted successfully for ${messagesToUpdate.length} messages`);

      } catch (error) {
        console.error('❌ Mark read error:', error);
      }
    });

    // ✅ Typing indicator - FIXED to send to all participants
    socket.on('typing', (data) => {
      const { conversationId, userId, isTyping } = data;
      console.log('📤 Typing event received:', { conversationId, userId, isTyping });
      
      const roomName = `conversation-${conversationId}`;
      
      // ✅ Emit to everyone in the room EXCEPT the sender
      socket.to(roomName).emit('user-typing', {
        conversationId,
        userId,
        isTyping
      });
      
      // ✅ Also send to each participant individually (including those not in room)
      const room = io.sockets.adapter.rooms.get(roomName);
      if (room) {
        room.forEach((socketId) => {
          if (socketId !== socket.id) {
            io.to(socketId).emit('user-typing', {
              conversationId,
              userId,
              isTyping
            });
          }
        });
      }
      
      // ✅ Also send to all online participants of this conversation
      const getConversationParticipants = async () => {
        try {
          const conv = await Conversation.findById(conversationId).populate('participants', '_id');
          const allParticipants = conv.participants.map(p => p._id.toString());
          for (const participantId of allParticipants) {
            if (participantId !== userId) {
              const participantSocketId = onlineUsers.get(participantId);
              if (participantSocketId) {
                io.to(participantSocketId).emit('user-typing', {
                  conversationId,
                  userId,
                  isTyping
                });
              }
            }
          }
        } catch (error) {
          console.error('Error getting conversation participants:', error);
        }
      };
      
      getConversationParticipants();
      
      console.log(`✅ Typing event broadcasted to room: ${roomName}, isTyping: ${isTyping}`);
    });

    // ✅ Edit message
    socket.on('edit-message', async (data) => {
      try {
        const { messageId, conversationId, content } = data;
        
        await Message.findByIdAndUpdate(messageId, {
          content,
          isEdited: true,
          editedAt: new Date()
        });
        
        const updatedMessage = await Message.findById(messageId).populate('sender', 'name email avatar');
        
        const roomName = `conversation-${conversationId}`;
        io.to(roomName).emit('message-edited', {
          messageId,
          content,
          isEdited: true,
          message: updatedMessage
        });
        
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');
          
        const conv = await Conversation.findById(conversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());
          
        io.to(roomName).emit('conversation-updated', {
          conversation: updatedConversation
        });
        
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: updatedConversation
            });
          }
        }
        
      } catch (error) {
        console.error('Edit message error:', error);
      }
    });

    // ✅ Delete message
    socket.on('delete-message', async (data) => {
      try {
        const { messageId, conversationId, deleteFor } = data;
        
        if (deleteFor === 'everyone') {
          await Message.findByIdAndUpdate(messageId, {
            isDeleted: true,
            content: 'This message was deleted'
          });
        }
        
        const roomName = `conversation-${conversationId}`;
        io.to(roomName).emit('message-deleted', {
          messageId,
          deleteFor
        });
        
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');
          
        const conv = await Conversation.findById(conversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());
          
        io.to(roomName).emit('conversation-updated', {
          conversation: updatedConversation
        });
        
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: updatedConversation
            });
          }
        }
        
      } catch (error) {
        console.error('Delete message error:', error);
      }
    });

    // ✅ Reaction
    socket.on('message-reaction', async (data) => {
      try {
        const { messageId, conversationId, userId, emoji } = data;
        
        const message = await Message.findById(messageId);
        if (!message) return;
        
        if (!message.reactions) {
          message.reactions = [];
        }
        
        const existingIndex = message.reactions.findIndex(
          r => r.userId.toString() === userId
        );
        
        if (existingIndex !== -1) {
          const existingEmoji = message.reactions[existingIndex].emoji;
          if (existingEmoji === emoji) {
            message.reactions.splice(existingIndex, 1);
          } else {
            message.reactions[existingIndex].emoji = emoji;
          }
        } else {
          message.reactions.push({ userId, emoji });
        }
        
        await message.save();
        
        const roomName = `conversation-${conversationId}`;
        
        io.to(roomName).emit('message-reaction', {
          messageId,
          userId,
          emoji,
          reactions: message.reactions
        });
        console.log(`✅ message-reaction emitted to room ${roomName}`);
        
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');
          
        const conv = await Conversation.findById(conversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());
          
        io.to(roomName).emit('conversation-updated', {
          conversation: updatedConversation
        });
        
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: updatedConversation
            });
          }
        }
        
      } catch (error) {
        console.error('Reaction error:', error);
      }
    });

    // ✅ Forward message
    socket.on('forward-message', async (data) => {
      try {
        const { originalMessageId, targetConversationId, senderId, content } = data;
        
        const messageData = {
          conversation: targetConversationId,
          sender: senderId,
          content: content,
          type: 'text',
          status: 'sent',
          isForwarded: true,
          originalMessageId: originalMessageId
        };
        
        const newMessage = new Message(messageData);
        await newMessage.save();
        
        await newMessage.populate('sender', 'name email avatar');
        
        await Conversation.findByIdAndUpdate(targetConversationId, {
          lastMessage: newMessage._id,
          lastMessageTime: newMessage.createdAt
        });
        
        const roomName = `conversation-${targetConversationId}`;
        
        io.to(roomName).emit('new-message', newMessage);
        console.log(`✅ Forwarded message emitted to room ${roomName}`);
        
        const updatedConversation = await Conversation.findById(targetConversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');
          
        const conv = await Conversation.findById(targetConversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());
          
        io.to(roomName).emit('conversation-updated', {
          conversation: updatedConversation
        });
        
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: updatedConversation
            });
          }
        }
        
        console.log('✅ Message forwarded successfully');
        
      } catch (error) {
        console.error('Forward message error:', error);
      }
    });

    // ✅ Block user event
    socket.on('user-blocked', async (data) => {
      try {
        const { userId } = data;
        console.log(`🚫 User ${userId} has been blocked`);
        
        const conversations = await Conversation.find({
          participants: { $in: [userId] }
        });
        
        for (const conv of conversations) {
          socket.leave(`conversation-${conv._id}`);
        }
        
        socket.broadcast.emit('user-blocked', {
          userId,
          blocked: true
        });
        
      } catch (error) {
        console.error('Block event error:', error);
      }
    });

    // ✅ Clear chat event
    socket.on('clear-chat', async (data) => {
      try {
        const { conversationId } = data;
        console.log(`🗑️ Chat cleared for conversation: ${conversationId}`);
        
        const roomName = `conversation-${conversationId}`;
        io.to(roomName).emit('clear-chat', {
          conversationId
        });
        
        const updatedConversation = await Conversation.findById(conversationId)
          .populate('participants', 'name email avatar status lastSeen')
          .populate('lastMessage');
          
        const conv = await Conversation.findById(conversationId).populate('participants', '_id');
        const allParticipants = conv.participants.map(p => p._id.toString());
          
        io.to(roomName).emit('conversation-updated', {
          conversation: updatedConversation
        });
        
        for (const participantId of allParticipants) {
          const participantSocketId = onlineUsers.get(participantId);
          if (participantSocketId) {
            io.to(participantSocketId).emit('conversation-updated', {
              conversation: updatedConversation
            });
          }
        }
        
      } catch (error) {
        console.error('Clear chat error:', error);
      }
    });

    // ✅ Debug: List all rooms
    socket.on('get-rooms', () => {
      const rooms = Array.from(socket.rooms);
      console.log('📋 Socket rooms:', rooms);
      socket.emit('rooms-list', rooms);
    });

    // ✅ Disconnect
    socket.on('disconnect', async () => {
      console.log('🔌 Client disconnected:', socket.id);

      let disconnectedUserId = null;
      for (const [userId, socketId] of onlineUsers.entries()) {
        if (socketId === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }

      if (disconnectedUserId) {
        console.log(`👤 User ${disconnectedUserId} went offline`);
        await User.findByIdAndUpdate(disconnectedUserId, {
          status: 'offline',
          lastSeen: Date.now()
        });

        socket.broadcast.emit('user-status-change', {
          userId: disconnectedUserId,
          status: 'offline'
        });
      }
    });
  });
};

export const isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

export const getUserSocketId = (userId) => {
  return onlineUsers.get(userId);
};