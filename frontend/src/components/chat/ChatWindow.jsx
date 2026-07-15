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
  
  const skipScrollRef = useRef(false)
  const scrollTimeoutRef = useRef(null)
  const isSendingRef = useRef(false)
  const sendTimeoutRef = useRef(null)
  
  // ✅ Store temp message IDs to track them
  const tempMessageIdsRef = useRef({})

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
    if (skipScrollRef.current) {
      console.log('⏭️ Skipping scroll - reaction in progress')
      return
    }
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
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current)
      }
    }
  }, [conversation, socket, user, setMessages])

  useEffect(() => {
    if (skipScrollRef.current) {
      console.log('⏭️ Skipping scroll effect - reaction in progress')
      skipScrollRef.current = false
      return
    }
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

    skipScrollRef.current = true
    
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current)
    }
    
    scrollTimeoutRef.current = setTimeout(() => {
      skipScrollRef.current = false
    }, 500)

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
          
          return {
            ...msg,
            reactions: newReactions
          }
        }
        return msg
      })
      
      return updatedMessages
    })

    if (socket && conversation) {
      socket.emit('message-reaction', {
        messageId,
        conversationId: conversation._id,
        userId: user._id,
        emoji
      })
    }
  }

  // ✅ COMPLETELY FIXED: Send message with proper status updates
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

    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current)
    }

    isSendingRef.current = true

    console.log('📤 Sending message with data:', {
      conversationId: conversation._id,
      senderId: userId,
      content: content,
      type: type
    })

    const tempId = `temp_${Date.now()}`
    const tempMessage = {
      _id: tempId,
      conversation: conversation._id,
      sender: {
        _id: userId,
        name: user.name,
        email: user.email,
        avatar: user.avatar
      },
      content: content,
      type: type,
      status: 'sent', // Start with sent
      createdAt: new Date().toISOString(),
      replyTo: replyToMessage ? { 
        _id: replyToMessage._id,
        content: replyToMessage.content,
        sender: replyToMessage.sender
      } : null,
      reactions: [],
      isTemp: true
    }

    // ✅ Store temp ID mapping
    tempMessageIdsRef.current[tempId] = tempId

    // ✅ Add message to chat window
    setMessages(prev => [...prev, tempMessage])
    setTimeout(scrollToBottom, 50)

    // ✅ Update sidebar immediately
    if (setConversations) {
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversation._id)
        if (existingIndex === -1) return prev
        
        const updated = [...prev]
        const conv = { ...updated[existingIndex] }
        
        conv.lastMessage = {
          ...tempMessage,
          status: 'sent'
        }
        conv.updatedAt = tempMessage.createdAt
        
        updated.splice(existingIndex, 1)
        updated.unshift(conv)
        
        return updated
      })
    }

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

    // ✅ Emit with callback
    socket.emit('send-message', messageData, (response) => {
      console.log('📤 send-message callback response:', response)
      
      if (response && response.success) {
        const messageId = response.messageId || tempId
        
        // ✅ Find and update the temp message to delivered
        setMessages(prev => 
          prev.map(msg => {
            if (msg._id === tempId) {
              return { 
                ...msg, 
                status: 'delivered', 
                _id: messageId, 
                isTemp: false 
              }
            }
            if (msg._id === messageId && msg.isTemp) {
              return { 
                ...msg, 
                status: 'delivered', 
                isTemp: false 
              }
            }
            return msg
          })
        )
        
        // ✅ Update sidebar
        if (setConversations) {
          setConversations(prev => {
            const convIndex = prev.findIndex(c => c._id === conversation._id)
            if (convIndex === -1) return prev
            
            const updated = [...prev]
            const conv = { ...updated[convIndex] }
            
            if (conv.lastMessage && conv.lastMessage._id === tempId) {
              conv.lastMessage = {
                ...conv.lastMessage,
                status: 'delivered',
                _id: messageId,
                isTemp: false
              }
            }
            updated[convIndex] = conv
            return updated
          })
        }
      }
      
      sendTimeoutRef.current = setTimeout(() => {
        isSendingRef.current = false
        sendTimeoutRef.current = null
        console.log('✅ Sending flag reset')
      }, 1000)
    })
    
    setReplyToMessage(null)
  }

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
      
      if (isSendingRef.current) {
        console.log('⏭️ Skipping onConversationUpdate - currently sending message')
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
        return
      }
      
      skipScrollRef.current = false
      
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
      
      if (onConversationUpdate && !isSendingRef.current) {
        onConversationUpdate(message.conversation)
      }
    }

    const handleNewMessageNotification = (data) => {
      console.log('📩 ChatWindow new-message-notification:', data)
      const { message } = data
      if (conversation?._id === message.conversation) {
        skipScrollRef.current = false
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
      
      skipScrollRef.current = true
      setTimeout(() => {
        skipScrollRef.current = false
      }, 500)
      
      setMessages(prev => {
        return prev.map(msg => {
          if (msg._id === messageId) {
            if (reactions) {
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

    // ✅ FIXED: Handle message delivered - Update to double tick
    const handleMessageDelivered = ({ messageId, conversationId, message }) => {
      console.log('📩 handleMessageDelivered received:', { messageId, conversationId })
      
      // ✅ Update message status to 'delivered'
      setMessages(prev => {
        return prev.map(msg => {
          // Check if this is the temp message or the actual message
          if (msg._id === messageId || (msg._id.startsWith('temp_') && msg.content === message?.content)) {
            console.log('✅ Updating message to delivered:', msg._id)
            if (message) {
              return { ...message, isTemp: false, status: 'delivered' }
            }
            return { ...msg, status: 'delivered', isTemp: false }
          }
          return msg
        })
      })
      
      // ✅ Update sidebar
      if (setConversations && conversation) {
        setConversations(prev => {
          const convIndex = prev.findIndex(c => c._id === conversationId)
          if (convIndex === -1) return prev
          
          const updated = [...prev]
          const conv = { ...updated[convIndex] }
          
          if (conv.lastMessage && conv.lastMessage._id === messageId) {
            conv.lastMessage = {
              ...conv.lastMessage,
              status: 'delivered'
            }
          }
          updated[convIndex] = conv
          return updated
        })
      }
      
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

    // ✅ FIXED: Handle individual message read (blue tick)
    socket.on('message-read', ({ messageId, conversationId, userId }) => {
      console.log('📩 ChatWindow message-read received:', { messageId, conversationId, userId })
      
      // ✅ Update messages with read status
      setMessages(prev => {
        const messageIndex = prev.findIndex(msg => msg._id === messageId)
        if (messageIndex === -1) return prev
        
        const originalMessage = prev[messageIndex]
        const updatedMessage = {
          ...originalMessage,
          status: 'read',
          readBy: [...(originalMessage.readBy || []), userId]
        }
        
        console.log('✅ Updated message status to read:', updatedMessage.status)
        
        const updatedMessages = [...prev]
        updatedMessages[messageIndex] = updatedMessage
        return updatedMessages
      })
      
      // ✅ Also update the sidebar
      if (setConversations && conversation && conversation._id === conversationId) {
        setConversations(prev => {
          const convIndex = prev.findIndex(c => c._id === conversationId)
          if (convIndex === -1) return prev
          
          const updated = [...prev]
          const conv = { ...updated[convIndex] }
          
          if (conv.lastMessage && conv.lastMessage._id === messageId) {
            conv.lastMessage = {
              ...conv.lastMessage,
              status: 'read'
            }
          }
          updated[convIndex] = conv
          return updated
        })
      }
    })

    // ✅ FIXED: Handle bulk messages read
    const handleMessagesRead = ({ conversationId, userId }) => {
      console.log('📩 ChatWindow messages-read:', { conversationId, userId })
      
      if (conversation?._id === conversationId) {
        setMessages(prev => {
          const updatedMessages = prev.map(msg => {
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
          console.log('📊 Bulk messages updated to read status')
          return updatedMessages
        })
        
        // ✅ Update sidebar with read status
        if (setConversations && conversation) {
          setConversations(prev => {
            const convIndex = prev.findIndex(c => c._id === conversationId)
            if (convIndex === -1) return prev
            
            const updated = [...prev]
            const conv = { ...updated[convIndex] }
            
            if (conv.lastMessage && conv.lastMessage.sender?._id !== user?._id) {
              conv.lastMessage = {
                ...conv.lastMessage,
                status: 'read'
              }
            }
            conv.unreadCount = {
              ...conv.unreadCount,
              [user?._id]: 0
            }
            updated[convIndex] = conv
            return updated
          })
        }
        
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
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current)
      }
    }
  }, [socket, conversation, setMessages, user, onConversationUpdate, setConversations])

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

  const showConnected = !!localStorage.getItem('token')

  return (
    <div className="flex-1 flex flex-col h-full w-full bg-gray-50 dark:bg-[#0B141A] overflow-hidden">
      <div className="flex-shrink-0">
        <ChatHeader 
          conversation={conversation} 
          onBack={onBack}
          isOnline={isOnline}
          otherUser={otherUser}
          onProfileClick={handleContactProfileClick}
          onClearChat={() => {
            if (conversation) {
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

      {replyToMessage && (
        <div className="flex-shrink-0 bg-gray-100 dark:bg-gray-800 px-4 py-2 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <span className="text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">↩️ Replying to:</span>
            <span className="text-xs text-gray-700 dark:text-gray-300 truncate">
              {replyToMessage.content}
            </span>
          </div>
          <button
            onClick={() => setReplyToMessage(null)}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0 ml-2"
          >
            <X size={16} />
          </button>
        </div>
      )}

      <div className={`flex-shrink-0 px-4 py-1 text-xs text-center border-b transition-colors duration-300 ${
        showConnected 
          ? 'bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800'
          : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800'
      }`}>
        {showConnected ? '🟢 Connected to server' : '🔴 Disconnected'}
      </div>

      {pinnedMessages.length > 0 && currentPinnedMessage && (
        <div 
          className="flex-shrink-0 bg-white dark:bg-[#1A2A32] border-b border-gray-200 dark:border-gray-700 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition"
          onClick={handlePinnedClick}
        >
          <div className="flex items-center gap-2 px-4 py-1.5">
            <Pin size={14} className="text-[#25D366] fill-[#25D366]" />
            <span className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
              {currentPinnedMessage.content?.substring(0, 50)}
              {currentPinnedMessage.content?.length > 50 ? '...' : ''}
            </span>
            <span className="text-xs text-[#25D366] ml-auto flex-shrink-0">
              {pinnedIndex % pinnedMessages.length + 1}/{pinnedMessages.length}
            </span>
          </div>
          <div className="h-0.5 bg-[#25D366] w-full" />
        </div>
      )}

      <div 
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 bg-[#ECE5DD] dark:bg-[#0B141A]"
        id="messages-container"
      >
        {loading ? (
          <div className="flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#25D366]" />
          </div>
        ) : (
          <>
            {messages && messages.length === 0 && (
              <div className="flex justify-center my-8">
                <p className="text-gray-500 dark:text-gray-400 text-sm">
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
                    <div className="flex justify-center my-2">
                      <span className="bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs px-3 py-1 rounded-full">
                        {new Date(message.createdAt).toLocaleDateString([], { 
                          weekday: 'long', 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                  )}
                  <div id={`msg-${message._id}`}>
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
            
            {typingUsers.length > 0 && (
              <div className="flex items-start ml-2">
                <div className="bg-white dark:bg-[#1A2A32] rounded-lg px-4 py-2 shadow-sm">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }} />
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }} />
                  </div>
                </div>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      <div className="flex-shrink-0">
        <MessageInput 
          onSendMessage={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyToMessage}
          onCancelReply={() => setReplyToMessage(null)}
        />
      </div>

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