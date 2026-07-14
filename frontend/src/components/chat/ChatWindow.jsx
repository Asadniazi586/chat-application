import React, { useState, useEffect, useRef } from 'react'
import { useSocket } from '../../hooks/useSocket'
import { useAuth } from '../../hooks/useAuth'
import ChatHeader from './ChatHeader'
import MessageBubble from './MessageBubble'
import MessageInput from './MessageInput'
import ForwardModal from './ForwardModal'
import ContactProfile from '../sidebar/ContactProfile'
import api from '../../utils/api'
import toast from 'react-hot-toast'
import { MessageCircle, Pin, X, PinOff } from 'lucide-react'

const ChatWindow = ({ 
  conversation, 
  messages, 
  setMessages, 
  onBack,
  onContactProfileClick,
  onConversationUpdate,
  setConversations
}) => {
  const [loading, setLoading] = useState(false)
  const [typingUsers, setTypingUsers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState([])
  const [showForwardModal, setShowForwardModal] = useState(false)
  const [forwardMessageData, setForwardMessageData] = useState(null)
  const [pinnedMessages, setPinnedMessages] = useState([])
  const [pinnedIndex, setPinnedIndex] = useState(0)
  const [replyToMessage, setReplyToMessage] = useState(null)
  const [showContactProfile, setShowContactProfile] = useState(false)
  const [selectedContact, setSelectedContact] = useState(null)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const { socket, isConnected } = useSocket()
  const { user } = useAuth()

  // ✅ Check mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const showToast = (message, type = 'success') => {
    toast.dismiss()
    if (type === 'success') {
      toast.success(message)
    } else if (type === 'error') {
      toast.error(message)
    } else {
      toast(message)
    }
  }

  const scrollToBottom = () => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' })
    }
  }

  const handleContactProfileClick = (contact) => {
    if (onContactProfileClick) {
      onContactProfileClick(contact)
      return
    }
    setSelectedContact(contact)
    setShowContactProfile(true)
  }

  const handleContactProfileBack = () => {
    setShowContactProfile(false)
    setSelectedContact(null)
  }

  useEffect(() => {
    const loadMessages = async () => {
      if (!conversation) return
      
      setLoading(true)
      try {
        // ✅ FIXED: Use api instead of axios
        const response = await api.get(`/messages/${conversation._id}`)
        setMessages(response.data || [])
        setTimeout(scrollToBottom, 100)
      } catch (error) {
        console.error('❌ Error loading messages:', error)
        showToast('Failed to load messages', 'error')
      } finally {
        setLoading(false)
      }
    }

    loadMessages()

    if (socket && conversation) {
      socket.emit('join-conversation', conversation._id)
      
      if (user && user._id) {
        socket.emit('mark-read', {
          conversationId: conversation._id,
          userId: user._id
        })
      }
    }

    return () => {
      if (socket && conversation) {
        socket.emit('leave-conversation', conversation._id)
      }
    }
  }, [conversation, socket, user, setMessages])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleDeleteMessage = (messageId, deleteFor) => {
    setMessages(prev => {
      if (deleteFor === 'everyone') {
        return prev.filter(msg => msg._id !== messageId)
      } else {
        return prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, deletedFor: [...(msg.deletedFor || []), user?._id] }
            : msg
        )
      }
    })
    
    setPinnedMessages(prev => prev.filter(msg => msg._id !== messageId))
    if (pinnedIndex >= pinnedMessages.length - 1) {
      setPinnedIndex(0)
    }
    
    if (socket) {
      socket.emit('delete-message', {
        messageId,
        conversationId: conversation?._id,
        deleteFor
      })
    }
  }

  const handleEditMessage = (updatedMessage) => {
    setMessages(prev => 
      prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      )
    )
    
    setPinnedMessages(prev => 
      prev.map(msg => 
        msg._id === updatedMessage._id ? updatedMessage : msg
      )
    )
    
    if (socket) {
      socket.emit('edit-message', {
        messageId: updatedMessage._id,
        conversationId: conversation?._id,
        content: updatedMessage.content
      })
    }
  }

  const handleForwardMessage = (message) => {
    setForwardMessageData(message)
    setShowForwardModal(true)
  }

  const handleForwardComplete = () => {
    setShowForwardModal(false)
    setForwardMessageData(null)
  }

  const handleReply = (message) => {
    setReplyToMessage(message)
    const inputElement = document.querySelector('textarea')
    if (inputElement) {
      inputElement.focus()
    }
  }

  const handlePin = (message) => {
    setPinnedMessages(prev => {
      const isPinned = prev.some(m => m._id === message._id)
      if (isPinned) {
        showToast('Message unpinned')
        return prev.filter(m => m._id !== message._id)
      } else {
        showToast('Message pinned')
        return [message, ...prev]
      }
    })
    setPinnedIndex(0)
  }

  const isMessagePinned = (messageId) => {
    return pinnedMessages.some(m => m._id === messageId)
  }

  const handlePinnedClick = () => {
    if (pinnedMessages.length === 0) return
    
    setPinnedIndex(prev => (prev + 1) % pinnedMessages.length)
    const message = pinnedMessages[pinnedIndex]
    const element = document.getElementById(`msg-${message._id}`)
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' })
    }
  }

  const handleReaction = (messageId, emoji) => {
    console.log('🎯 ChatWindow handleReaction START:', { 
      messageId, 
      emoji, 
      userId: user?._id,
      currentMessagesCount: messages?.length || 0
    })

    if (!user || !user._id) {
      console.error('❌ No user in handleReaction')
      return
    }

    setMessages(prevMessages => {
      console.log('📊 Updating messages with reaction...')
      
      const updatedMessages = prevMessages.map(msg => {
        if (msg._id === messageId) {
          const currentReactions = msg.reactions || []
          const existingIndex = currentReactions.findIndex(
            r => r.userId === user._id
          )
          
          let newReactions
          
          if (existingIndex !== -1) {
            const existingEmoji = currentReactions[existingIndex].emoji
            if (existingEmoji === emoji) {
              newReactions = currentReactions.filter((_, i) => i !== existingIndex)
              console.log('🔄 Removing reaction:', { messageId, emoji })
            } else {
              newReactions = currentReactions.map((r, i) => 
                i === existingIndex ? { ...r, emoji } : r
              )
              console.log('🔄 Updating reaction:', { messageId, from: existingEmoji, to: emoji })
            }
          } else {
            newReactions = [...currentReactions, { userId: user._id, emoji }]
            console.log('🔄 Adding new reaction:', { messageId, emoji })
          }
          
          const updatedMessage = {
            ...msg,
            reactions: newReactions
          }
          console.log('📊 Updated message reactions:', updatedMessage.reactions)
          return updatedMessage
        }
        return msg
      })
      
      console.log('📊 Updated messages array count:', updatedMessages.length)
      return updatedMessages
    })

    setTimeout(() => {
      setMessages(prev => {
        console.log('🔄 Forcing re-render with messages count:', prev.length)
        return [...prev]
      })
    }, 0)

    if (socket && conversation) {
      console.log('📤 Emitting message-reaction socket event:', {
        messageId,
        conversationId: conversation._id,
        userId: user._id,
        emoji
      })
      socket.emit('message-reaction', {
        messageId,
        conversationId: conversation._id,
        userId: user._id,
        emoji
      })
    } else {
      console.warn('⚠️ Socket not available for reaction emit')
    }
  }

  // ✅ Optimized send message - No flashing
  const handleSendMessage = async (content, type = 'text', metadata = {}) => {
    console.log('📤 handleSendMessage called', { 
      socket: !!socket, 
      isConnected, 
      conversation: !!conversation,
      content 
    })
    
    if (!socket || !isConnected) {
      console.error('❌ Socket not connected!', { socket: !!socket, isConnected })
      showToast('Not connected to server', 'error')
      return
    }

    if (!conversation) {
      console.error('❌ No conversation!')
      showToast('No conversation selected', 'error')
      return
    }

    const userId = user?._id || user?.id
    
    if (!userId) {
      console.error('❌ No user!')
      showToast('Please login first', 'error')
      return
    }

    console.log('📤 Sending message with data:', {
      conversationId: conversation._id,
      senderId: userId,
      content: content,
      type: type
    })

    // ✅ Create temp message with a flag to prevent flashing
    const tempMessage = {
      _id: `temp_${Date.now()}`,
      conversation: conversation._id,
      sender: {
        _id: userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      content: content,
      type: type,
      status: 'sent',
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage ? { 
        _id: replyToMessage._id,
        content: replyToMessage.content,
        sender: replyToMessage.sender
      } : null,
      reactions: [],
      isTemp: true
    }

    setMessages(prev => [...prev, tempMessage])
    setTimeout(scrollToBottom, 50)

    const messageData = {
      conversationId: conversation._id,
      senderId: userId,
      content: content,
      type: type,
      ...metadata
    }

    if (replyToMessage) {
      messageData.replyTo = replyToMessage._id
    }

    socket.emit('send-message', messageData, (response) => {
      console.log('📤 send-message callback response:', response)
    })
    
    setReplyToMessage(null)
  }

  // ✅ Handle typing - FIXED to send to all participants
  const handleTyping = (isTyping) => {
    if (!socket || !conversation || !user || !user._id) return

    console.log('📤 Sending typing event:', { 
      conversationId: conversation._id, 
      userId: user._id, 
      isTyping 
    })
    
    socket.emit('typing', {
      conversationId: conversation._id,
      userId: user._id,
      isTyping
    })
  }

  useEffect(() => {
    if (!socket) {
      console.log('⏳ Socket not ready yet, skipping event setup');
      return;
    }

    console.log('🔄 Setting up ChatWindow socket listeners...');

    const handleNewMessage = (message) => {
      console.log('📩 ChatWindow new-message:', message)
      setMessages(prev => {
        const tempIndex = prev.findIndex(msg => 
          msg._id.startsWith('temp_') && msg.content === message.content
        )
        
        if (tempIndex !== -1) {
          const newMessages = [...prev]
          newMessages[tempIndex] = {
            ...message,
            isTemp: false
          }
          return newMessages
        }
        
        const exists = prev.some(msg => msg._id === message._id)
        if (exists) return prev
        
        return [...prev, message]
      })
      setTimeout(scrollToBottom, 50)
      
      if (onConversationUpdate) {
        onConversationUpdate(message.conversation)
      }
    }

    const handleNewMessageNotification = (data) => {
      console.log('📩 ChatWindow new-message-notification:', data)
      const { message } = data
      if (conversation?._id === message.conversation) {
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === message._id)
          if (exists) return prev
          return [...prev, message]
        })
        setTimeout(scrollToBottom, 50)
      }
    }

    const handleUserStatusChange = ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return prev.includes(userId) ? prev : [...prev, userId]
        } else {
          return prev.filter(id => id !== userId)
        }
      })
    }

    const handleMessageEdited = ({ messageId, content, isEdited }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content, isEdited: true, editedAt: new Date() }
            : msg
        )
      )
      setPinnedMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, content, isEdited: true }
            : msg
        )
      )
    }

    const handleMessageDeleted = ({ messageId }) => {
      setMessages(prev => 
        prev.map(msg => 
          msg._id === messageId 
            ? { ...msg, isDeleted: true }
            : msg
        )
      )
      setPinnedMessages(prev => prev.filter(msg => msg._id !== messageId))
    }

    const handleMessageReaction = ({ messageId, userId, emoji, reactions }) => {
      console.log('📩 Socket reaction received:', { messageId, userId, emoji, reactions })
      
      if (userId === user?._id) {
        console.log('⏭️ Skipping own reaction from socket')
        return
      }
      
      setMessages(prev => {
        console.log('📊 Updating messages from socket reaction...')
        return prev.map(msg => {
          if (msg._id === messageId) {
            if (reactions) {
              console.log('📊 Using full reactions array from socket')
              return { ...msg, reactions }
            }
            
            const currentReactions = msg.reactions || []
            const existingIndex = currentReactions.findIndex(
              r => r.userId === userId
            )
            
            let newReactions
            if (existingIndex !== -1) {
              const existingEmoji = currentReactions[existingIndex].emoji
              if (existingEmoji === emoji) {
                newReactions = currentReactions.filter((_, i) => i !== existingIndex)
              } else {
                newReactions = currentReactions.map((r, i) => 
                  i === existingIndex ? { ...r, emoji } : r
                )
              }
            } else {
              newReactions = [...currentReactions, { userId, emoji }]
            }
            
            return { ...msg, reactions: newReactions }
          }
          return msg
        })
      })
    }

    const handleMessageDelivered = ({ messageId, conversationId, message }) => {
      console.log('📩 handleMessageDelivered INSTANT:', { messageId, conversationId })
      
      setMessages(prev => 
        prev.map(msg => {
          if (msg._id === messageId) {
            if (message) {
              return { ...message, isTemp: false }
            }
            return { ...msg, status: 'delivered' }
          }
          return msg
        })
      )
      
      if (onConversationUpdate && conversation) {
        const updatedConv = {
          ...conversation,
          lastMessage: conversation.lastMessage 
            ? { ...conversation.lastMessage, status: 'delivered' }
            : null
        }
        onConversationUpdate(updatedConv)
      }
    }

    const handleMessagesRead = ({ conversationId, userId }) => {
      console.log('📩 ChatWindow messages-read:', { conversationId, userId })
      
      if (conversation?._id === conversationId) {
        setMessages(prev => 
          prev.map(msg => {
            if (msg.status === 'read' || msg.sender?._id === user?._id) return msg
            
            if (msg.sender?._id === userId) {
              return { 
                ...msg, 
                status: 'read',
                readBy: [...(msg.readBy || []), userId]
              }
            }
            return msg
          })
        )
        
        if (onConversationUpdate && conversation) {
          const updatedConv = {
            ...conversation,
            lastMessage: conversation.lastMessage 
              ? { ...conversation.lastMessage, status: 'read' }
              : null
          }
          onConversationUpdate(updatedConv)
        }
      }
    }

    const handleClearChat = ({ conversationId }) => {
      if (conversation?._id === conversationId) {
        setMessages([])
        toast.info('Chat cleared')
      }
    }

    socket.on('new-message', handleNewMessage)
    socket.on('new-message-notification', handleNewMessageNotification)
    socket.on('user-typing', ({ conversationId, userId, isTyping }) => {
      console.log('📩 user-typing received in ChatWindow:', { conversationId, userId, isTyping, currentUser: user?._id })
      
      if (userId === user?._id) {
        console.log('⏭️ Skipping own typing event in ChatWindow')
        return
      }
      
      if (conversation?._id !== conversationId) {
        console.log('⏭️ Skipping typing event for different conversation')
        return
      }
      
      setTypingUsers(prev => {
        if (isTyping) {
          if (!prev.includes(userId)) {
            console.log('✅ Adding user to typing list:', userId)
            return [...prev, userId]
          }
          return prev
        } else {
          console.log('✅ Removing user from typing list:', userId)
          return prev.filter(id => id !== userId)
        }
      })
    })
    socket.on('message-read', ({ messageId }) => {
      setMessages(prev => 
        prev.map(msg => {
          if (msg._id === messageId && msg.sender?._id !== user?._id && msg.status !== 'read') {
            return { ...msg, status: 'read', readBy: [...(msg.readBy || []), user?._id] }
          }
          return msg
        })
      )
    })
    socket.on('message-delivered', handleMessageDelivered)
    socket.on('messages-read', handleMessagesRead)
    socket.on('message-error', (data) => {
      showToast(data.error || 'Failed to send message', 'error')
    })
    socket.on('user-status-change', handleUserStatusChange)
    socket.on('message-edited', handleMessageEdited)
    socket.on('message-deleted', handleMessageDeleted)
    socket.on('message-reaction', handleMessageReaction)
    socket.on('clear-chat', handleClearChat)

    return () => {
      if (socket) {
        socket.off('new-message')
        socket.off('new-message-notification')
        socket.off('user-typing')
        socket.off('message-read')
        socket.off('message-delivered')
        socket.off('messages-read')
        socket.off('message-error')
        socket.off('user-status-change')
        socket.off('message-edited')
        socket.off('message-deleted')
        socket.off('message-reaction')
        socket.off('clear-chat')
      }
    }
  }, [socket, conversation, setMessages, user, onConversationUpdate])

  const getOtherParticipant = () => {
    if (!conversation || !user) return null
    return conversation.participants?.find(p => p._id !== user._id)
  }

  const isOtherUserOnline = () => {
    const other = getOtherParticipant()
    if (!other) return false
    return onlineUsers.includes(other._id) || other.status === 'online'
  }

  const otherUser = getOtherParticipant()
  const isOnline = isOtherUserOnline()

  if (showContactProfile && selectedContact && !onContactProfileClick) {
    return (
      <ContactProfile 
        contact={selectedContact} 
        onBack={handleContactProfileBack} 
      />
    )
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center bg-gray-50 dark:bg-[#0B141A] h-full w-full">
        <div className="text-center px-4">
          <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center">
            <MessageCircle size={32} className="sm:size-10 text-[#25D366]" />
          </div>
          <h3 className="mt-3 sm:mt-4 text-base sm:text-lg font-semibold text-gray-700 dark:text-gray-300">
            WhatsApp
          </h3>
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            Select a conversation to start chatting
          </p>
        </div>
      </div>
    )
  }

  const currentPinnedMessage = pinnedMessages.length > 0 
    ? pinnedMessages[pinnedIndex % pinnedMessages.length] 
    : null

  return (
    <div className="chat-container flex-1 flex flex-col h-full w-full bg-gray-50 dark:bg-[#0B141A] overflow-hidden" style={{ 
      height: '100%', 
      minHeight: '100vh', 
      minHeight: '-webkit-fill-available', 
      transform: 'translateZ(0)', 
      WebkitTransform: 'translateZ(0)', 
      backfaceVisibility: 'hidden', 
      WebkitBackfaceVisibility: 'hidden',
      willChange: 'transform',
      position: 'relative'
    }}>
      {/* ✅ Chat Header */}
      <div className="flex-shrink-0 relative z-10">
        <ChatHeader 
          conversation={conversation} 
          onBack={onBack}
          isOnline={isOnline}
          otherUser={otherUser}
          onProfileClick={handleContactProfileClick}
          onClearChat={() => {
            if (conversation) {
              // ✅ FIXED: Use api instead of axios
              api.delete(`/users/clear-chat/${conversation._id}`)
                .then(() => {
                  setMessages([])
                  toast.success('Chat cleared successfully')
                })
                .catch((error) => {
                  console.error('Clear chat error:', error)
                  toast.error('Failed to clear chat')
                })
            }
          }}
          onBlockUser={() => {
            if (otherUser) {
              // ✅ FIXED: Use api instead of axios
              api.post('/users/block', { userId: otherUser._id })
                .then(() => {
                  toast.success(`${otherUser.name} blocked successfully`)
                })
                .catch((error) => {
                  console.error('Block error:', error)
                  toast.error('Failed to block user')
                })
            }
          }}
          onUnblockUser={() => {
            if (otherUser) {
              // ✅ FIXED: Use api instead of axios
              api.post('/users/unblock', { userId: otherUser._id })
                .then(() => {
                  toast.success(`${otherUser.name} unblocked successfully`)
                })
                .catch((error) => {
                  console.error('Unblock error:', error)
                  toast.error('Failed to unblock user')
                })
            }
          }}
          isBlocked={otherUser?.blockedUsers?.includes(user?._id) || false}
        />
      </div>

      {/* ✅ Reply To Preview */}
      {replyToMessage && (
        <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">↩️</span>
            <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 truncate">
              {replyToMessage.content}
            </span>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0 ml-1 sm:ml-2 p-0.5"
          >
            <X size={14} className="sm:size-16" />
          </button>
        </div>
      )}

    {/* ✅ Connection Status - FIXED: Show connected immediately, then update */}
<div className={`flex-shrink-0 px-2 sm:px-4 py-0.5 sm:py-1 text-[9px] sm:text-xs text-center border-b transition-colors duration-300 ${
  isConnected === null 
    ? 'bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-400 border-yellow-200 dark:border-yellow-800'
    : isConnected 
      ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800' 
      : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
}`}>
  {isConnected === null ? '🔄 Connecting to server...' : isConnected ? '🟢 Connected to server' : '🔴 Disconnected from server'}
</div>

      {/* ✅ Pinned Message */}
      {pinnedMessages.length > 0 && currentPinnedMessage && (
        <div 
          className="flex-shrink-0 bg-white dark:bg-[#1A2A32] border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          onClick={handlePinnedClick}
        >
          <div className="flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-1 sm:py-1.5">
            <Pin size={12} className="sm:size-14 text-[#25D366] fill-[#25D366] flex-shrink-0" />
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
              {currentPinnedMessage.content?.substring(0, 40)}
              {currentPinnedMessage.content?.length > 40 ? '...' : ''}
            </span>
            <span className="text-[9px] sm:text-xs text-[#25D366] ml-auto flex-shrink-0">
              {pinnedIndex % pinnedMessages.length + 1}/{pinnedMessages.length}
            </span>
          </div>
          <div className="h-0.5 bg-[#25D366] w-full" />
        </div>
      )}

      {/* ✅ Messages Container */}
      <div 
        ref={messagesContainerRef}
        className="messages-container overflow-y-auto px-2 sm:px-3 md:px-4 py-2 sm:py-3 md:py-4 space-y-1.5 sm:space-y-2 bg-[#ECE5DD] dark:bg-[#0B141A]"
        id="messages-container"
        style={{
          WebkitOverflowScrolling: 'touch',
          overscrollBehavior: 'contain',
          touchAction: 'pan-y',
          transform: 'translateZ(0)',
          WebkitTransform: 'translateZ(0)',
          backfaceVisibility: 'hidden',
          WebkitBackfaceVisibility: 'hidden',
        }}
      >
        {loading ? (
          <div className="flex justify-center items-center h-full">
            <div className="animate-spin rounded-full h-6 w-6 sm:h-8 sm:w-8 border-b-2 border-[#25D366]" />
          </div>
        ) : (
          <>
            {messages && messages.length === 0 && (
              <div className="flex justify-center my-6 sm:my-8">
                <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">
                  No messages yet. Say hello! 👋
                </p>
              </div>
            )}
            {messages && messages.map((message, index) => {
              const isOwn = message.sender?._id === user?._id
              const isPinned = isMessagePinned(message._id)
              const showDate = index === 0 || 
                new Date(message.createdAt).toDateString() !== 
                new Date(messages[index - 1]?.createdAt).toDateString()

              return (
                <React.Fragment key={message._id || index}>
                  {showDate && (
                    <div className="flex justify-center my-1.5 sm:my-2">
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-[9px] sm:text-xs px-2 sm:px-3 py-0.5 sm:py-1 rounded-full">
                        {new Date(message.createdAt).toLocaleDateString([], { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  <div id={`msg-${message._id}`} className="w-full">
                    <MessageBubble 
                      message={message} 
                      isOwn={isOwn}
                      onDelete={handleDeleteMessage}
                      onEdit={handleEditMessage}
                      onForward={handleForwardMessage}
                      onReply={handleReply}
                      onPin={handlePin}
                      isPinned={isPinned}
                      onReact={handleReaction}
                    />
                  </div>
                </React.Fragment>
              )
            })}
            
            {/* ✅ Typing Indicator */}
            {typingUsers.length > 0 && (
              <div className="flex items-start ml-1 sm:ml-2">
                <div className="bg-white dark:bg-[#1A2A32] rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-1.5 h-1.5 sm:w-2 sm:h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            
            {/* ✅ Extra bottom spacing */}
            <div className="h-16 sm:h-20" />
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* ✅ Message Input */}
      <div className="message-input-wrapper flex-shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>

      {/* ✅ Forward Modal */}
      {showForwardModal && forwardMessageData && (
        <ForwardModal 
          message={forwardMessageData}
          onClose={() => setShowForwardModal(false)}
          onForward={handleForwardComplete}
          setConversations={setConversations}
        />
      )}
    </div>
  )
}

export default ChatWindow