import React, { useState, useEffect, useRef, memo } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { CheckCheck, MessageCircle, CheckSquare, Square, Pin, Clock } from 'lucide-react'
import api from '../../utils/api'

// ✅ Status rank map used to make status transitions monotonic (never go backwards)
const STATUS_RANK = { sent: 0, delivered: 1, read: 2 }

const ChatList = memo(({ 
  conversations, 
  currentConversation, 
  onSelectConversation, 
  loading,
  isSelectMode = false,
  selectedConversations = [],
  toggleConversationSelection = () => {},
  setConversations,
  messageStatuses = {}
}) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState({})

  // ✅ Track status changes for debugging
  const statusLogRef = useRef([])

  const logStatusChange = (conversationId, oldStatus, newStatus, source) => {
    const logEntry = {
      conversationId,
      oldStatus,
      newStatus,
      source,
      timestamp: new Date().toISOString()
    }
    statusLogRef.current.push(logEntry)
    console.log(`🔴🔴🔴 STATUS CHANGE: ${oldStatus} → ${newStatus} from ${source}`, logEntry)
    
    if (statusLogRef.current.length > 100) {
      statusLogRef.current.shift()
    }
  }

  useEffect(() => {
    if (!socket) return

    console.log('🔄 ChatList: Setting up typing listener...')

    const handleTyping = ({ conversationId, userId, isTyping }) => {
      console.log('📩 ChatList user-typing received:', { conversationId, userId, isTyping })
      
      if (userId === user?._id) return
      if (!conversationId) return
      
      const convId = conversationId.toString()
      
      setTypingUsers(prev => {
        if (isTyping) {
          return { ...prev, [convId]: userId }
        } else {
          const newState = { ...prev }
          delete newState[convId]
          return newState
        }
      })
    }

    socket.on('user-typing', handleTyping)

    return () => {
      socket.off('user-typing')
    }
  }, [socket, user?._id])

  useEffect(() => {
    if (!socket) return

    console.log('🔄 ChatList: Setting up socket listeners...')

    const handleStatusChange = ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return prev.includes(userId) ? prev : [...prev, userId]
        } else {
          return prev.filter(id => id !== userId)
        }
      })
    }

    // ✅ FIXED: Handle new message - ALWAYS set own messages to 'delivered' (GRAY tick)
    const handleNewMessage = (message) => {
      if (!message || !message.conversation || !setConversations) return
      
      console.log('📩 ChatList new-message received:', message._id)
      
      const conversationId = message.conversation._id || message.conversation
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversationId)
        
        if (existingIndex === -1) {
          return [{
            _id: conversationId,
            lastMessage: message,
            lastMessageTime: message.createdAt || new Date().toISOString(),
            participants: message.conversation.participants || [],
            isGroup: false
          }, ...prev]
        }
        
        const updatedConversations = [...prev]
        const conv = { ...updatedConversations[existingIndex] }
        
        // ✅ CRITICAL FIX: For own messages, ALWAYS set status to 'delivered' (GRAY tick)
        const isOwnMessage = message.sender?._id === user?._id
        let finalStatus = 'delivered' // Default to delivered
        
        if (isOwnMessage) {
          // ✅ Own messages should ALWAYS be 'delivered' - NEVER 'read' from new-message
          finalStatus = 'delivered'
          console.log(`✅ [ChatList] Own message status set to 'delivered' (GRAY tick)`)
        } else {
          // For other users' messages, use the incoming status
          finalStatus = message.status || 'sent'
        }
        
        const oldStatus = conv.lastMessage?.status || 'none'
        logStatusChange(conversationId, oldStatus, finalStatus, 'handleNewMessage')
        
        conv.lastMessage = {
          ...message,
          status: finalStatus
        }
        conv.updatedAt = message.createdAt || new Date().toISOString()
        conv.lastMessageTime = message.createdAt || new Date().toISOString()
        
        // ✅ Move conversation to top
        updatedConversations.splice(existingIndex, 1)
        updatedConversations.unshift(conv)
        
        console.log(`✅ [ChatList] Updated conversation ${conversationId} with status: ${finalStatus}`)
        
        return updatedConversations
      })
    }

    // ✅ FIXED: Handle new message notification - ALWAYS set own messages to 'delivered'
    const handleNewMessageNotification = (data) => {
      if (!data || !data.message || !setConversations) return
      
      console.log('📩 ChatList new-message-notification received:', data.message._id)
      
      const message = data.message
      const conversationId = message.conversation._id || message.conversation
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversationId)
        
        if (existingIndex === -1) {
          return [{
            _id: conversationId,
            lastMessage: message,
            lastMessageTime: message.createdAt || new Date().toISOString(),
            participants: message.conversation.participants || [],
            isGroup: false
          }, ...prev]
        }
        
        const updatedConversations = [...prev]
        const conv = { ...updatedConversations[existingIndex] }
        
        // ✅ CRITICAL FIX: For own messages, ALWAYS keep 'delivered'
        const isOwnMessage = message.sender?._id === user?._id
        let finalStatus = 'delivered'
        
        if (isOwnMessage) {
          finalStatus = 'delivered'
          console.log(`✅ [ChatList] Own message status forced to 'delivered' in notification`)
        } else {
          // For other users' messages, preserve existing status
          const currentStatus = conv.lastMessage?.status || 'sent'
          // Keep the current status if it's already 'read' or 'delivered'
          finalStatus = currentStatus
        }
        
        logStatusChange(conversationId, conv.lastMessage?.status || 'none', finalStatus, 'handleNewMessageNotification')
        console.log(`📩 Final status: ${finalStatus}`)
        
        conv.lastMessage = {
          ...message,
          status: finalStatus
        }
        conv.updatedAt = message.createdAt || new Date().toISOString()
        conv.lastMessageTime = message.createdAt || new Date().toISOString()
        
        updatedConversations.splice(existingIndex, 1)
        updatedConversations.unshift(conv)
        
        return updatedConversations
      })
    }

    // ✅ FIXED: conversation-updated - status can only move FORWARD (sent -> delivered -> read),
    // never backwards. This stops a stale/late conversation-updated event from downgrading
    // a message that has already legitimately been marked 'read'.
    const handleConversationUpdated = ({ conversation }) => {
      if (!conversation || !setConversations) return
      
      console.log('📩 ChatList conversation-updated received:', conversation._id)
      console.log('📩 Incoming status:', conversation.lastMessage?.status)
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversation._id)
        
        if (existingIndex === -1) {
          return [conversation, ...prev]
        }
        
        const updatedConversations = [...prev]
        const existingConv = updatedConversations[existingIndex]
        
        const currentStatus = existingConv.lastMessage?.status || 'sent'
        const incomingStatus = conversation.lastMessage?.status || 'sent'
        
        // ✅ FIXED: monotonic status - only upgrade, never downgrade
        const finalStatus =
          (STATUS_RANK[incomingStatus] ?? 0) > (STATUS_RANK[currentStatus] ?? 0)
            ? incomingStatus
            : currentStatus
        
        logStatusChange(conversation._id, currentStatus, finalStatus, 'handleConversationUpdated')
        console.log(`📩 Final status: ${finalStatus} (was ${currentStatus}, incoming ${incomingStatus})`)
        
        const updatedLastMessage = {
          ...conversation.lastMessage,
          status: finalStatus
        }
        
        updatedConversations[existingIndex] = {
          ...existingConv,
          ...conversation,
          lastMessage: updatedLastMessage
        }
        
        if (existingIndex !== 0) {
          const conv = updatedConversations.splice(existingIndex, 1)[0]
          updatedConversations.unshift(conv)
        }
        
        return updatedConversations
      })
    }

    const handleMessageReaction = ({ messageId, userId, emoji, reactions }) => {
      if (!setConversations) return
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv.lastMessage && conv.lastMessage._id === messageId) {
            const updatedConv = { ...conv }
            const updatedLastMessage = { ...conv.lastMessage }
            
            if (reactions) {
              updatedLastMessage.reactions = reactions
            } else {
              const currentReactions = updatedLastMessage.reactions || []
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
              updatedLastMessage.reactions = newReactions
            }
            
            updatedConv.lastMessage = updatedLastMessage
            return updatedConv
          }
          return conv
        })
      })
    }

    // ✅ FIXED: Handle messages read - only flip MY sent message to 'read' (BLUE tick)
    // when SOMEONE ELSE did the reading. Previously this fired on my own 'mark-read'
    // action too (which the backend broadcasts to all participants), causing my own
    // message to flip blue even though the other user hadn't actually seen it.
    const handleMessagesRead = ({ conversationId, userId }) => {
      console.log('📩 [ChatList] messages-read received:', { conversationId, userId })
      
      if (!setConversations) return
      
      const iAmTheReader = userId === user?._id
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId) {
            const updatedConv = { ...conv }
            
            // Only clear MY unread badge when I'm the one who read
            if (iAmTheReader && updatedConv.unreadCount) {
              updatedConv.unreadCount = {
                ...updatedConv.unreadCount,
                [userId]: 0
              }
            }
            
            // ✅ Only update the last message status to 'read' (BLUE tick) if it's from
            // the current user AND the OTHER person is the one who read it
            if (!iAmTheReader && updatedConv.lastMessage && updatedConv.lastMessage.sender?._id === user?._id) {
              const oldStatus = updatedConv.lastMessage.status || 'sent'
              const newStatus = 'read'
              
              logStatusChange(conversationId, oldStatus, newStatus, 'handleMessagesRead')
              console.log(`✅ [ChatList] Updated own message status from ${oldStatus} to ${newStatus} (BLUE TICK)`)
              
              updatedConv.lastMessage = {
                ...updatedConv.lastMessage,
                status: newStatus
              }
            }
            
            return updatedConv
          }
          return conv
        })
      })
    }

    // ✅ FIXED: Handle message delivered - only for own messages, preserve 'read'
    const handleMessageDelivered = ({ messageId, conversationId, message }) => {
      if (!setConversations) return
      
      console.log('📩 [ChatList] message-delivered received:', { messageId, conversationId })
      
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c._id === conversationId)
        if (convIndex === -1) return prev
        
        const updated = [...prev]
        const conv = { ...updated[convIndex] }
        
        if (conv.lastMessage && conv.lastMessage._id === messageId) {
          // ✅ Only update if this is the user's own message
          const isOwnMessage = conv.lastMessage.sender?._id === user?._id
          if (isOwnMessage) {
            const oldStatus = conv.lastMessage.status || 'sent'
            // ✅ If already 'read', keep it 'read' (BLUE), otherwise set to 'delivered' (GRAY)
            const newStatus = oldStatus === 'read' ? 'read' : 'delivered'
            
            logStatusChange(conversationId, oldStatus, newStatus, 'handleMessageDelivered')
            console.log(`✅ [ChatList] Updated status from ${oldStatus} to ${newStatus}`)
            
            conv.lastMessage = {
              ...conv.lastMessage,
              status: newStatus
            }
          }
        }
        updated[convIndex] = conv
        return updated
      })
    }

    // ✅ FIXED: Handle message read - update to 'read' (BLUE tick) for messages from current user
    const handleMessageRead = ({ messageId, conversationId, userId }) => {
      console.log('📩 [ChatList] message-read received:', { messageId, conversationId, userId })
      
      if (!setConversations) return
      
      // ✅ Skip when I'm the one who triggered the read (my own mark-read echoed back)
      if (userId === user?._id) {
        console.log('⏭️ [ChatList] Skipping message-read - I am the reader, not the sender')
        return
      }
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId) {
            const updatedConv = { ...conv }
            if (conv.lastMessage && conv.lastMessage._id === messageId) {
              // ✅ Update if the message is from the current user (they sent it)
              if (conv.lastMessage.sender?._id === user?._id) {
                const oldStatus = conv.lastMessage.status || 'sent'
                const newStatus = 'read'
                
                logStatusChange(conversationId, oldStatus, newStatus, 'handleMessageRead')
                console.log(`✅ [ChatList] Updated own message status from ${oldStatus} to ${newStatus} (BLUE TICK)`)
                
                updatedConv.lastMessage = {
                  ...conv.lastMessage,
                  status: newStatus
                }
              }
            }
            return updatedConv
          }
          return conv
        })
      })
    }

    const handleMessageDeleted = ({ messageId, conversationId }) => {
      if (!setConversations) return
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId && conv.lastMessage && conv.lastMessage._id === messageId) {
            const updatedConv = { ...conv }
            updatedConv.lastMessage = {
              ...conv.lastMessage,
              isDeleted: true,
              content: 'This message was deleted'
            }
            return updatedConv
          }
          return conv
        })
      })
    }

    socket.on('user-status-change', handleStatusChange)
    socket.on('new-message', handleNewMessage)
    socket.on('new-message-notification', handleNewMessageNotification)
    socket.on('conversation-updated', handleConversationUpdated)
    socket.on('message-reaction', handleMessageReaction)
    socket.on('messages-read', handleMessagesRead)
    socket.on('message-delivered', handleMessageDelivered)
    socket.on('message-read', handleMessageRead)
    socket.on('message-deleted', handleMessageDeleted)

    return () => {
      socket.off('user-status-change')
      socket.off('new-message')
      socket.off('new-message-notification')
      socket.off('conversation-updated')
      socket.off('message-reaction')
      socket.off('messages-read')
      socket.off('message-delivered')
      socket.off('message-read')
      socket.off('message-deleted')
    }
  }, [socket, user, setConversations])

  useEffect(() => {
    console.log('📊 Current conversations statuses:')
    conversations.forEach(conv => {
      if (conv.lastMessage) {
        console.log(`  - ${conv._id}: ${conv.lastMessage.content?.substring(0, 20)} → status: ${conv.lastMessage.status}`)
      }
    })
  }, [conversations])

  const getOtherParticipant = (conversation) => {
    if (conversation.isGroup) return null
    return conversation.participants?.find(p => p._id !== user._id)
  }

  const getConversationName = (conversation) => {
    if (conversation.isGroup) return conversation.groupName || 'Group'
    const other = getOtherParticipant(conversation)
    return other?.name || 'Unknown User'
  }

  const getConversationAvatar = (conversation) => {
    if (conversation.isGroup) {
      return 'https://ui-avatars.com/api/?name=Group&background=25D366&color=fff&size=40'
    }
    const other = getOtherParticipant(conversation)
    return other?.avatar || `https://ui-avatars.com/api/?name=${other?.name || 'U'}&background=25D366&color=fff&size=40`
  }

  const getLastMessage = (conversation) => {
    if (!conversation.lastMessage) return ''
    
    const msg = conversation.lastMessage
    if (typeof msg === 'string') return msg
    
    if (msg.isDeleted) return 'This message was deleted'
    
    const hasReactions = msg.reactions && msg.reactions.length > 0
    const isOwn = msg.sender?._id === user._id
    
    if (hasReactions) {
      const myReaction = msg.reactions.find(r => r.userId === user._id)
      const otherReaction = msg.reactions.find(r => r.userId !== user._id)
      const senderName = msg.sender?.name?.split(' ')[0] || 'User'
      
      if (otherReaction && !myReaction) {
        return `${otherReaction.emoji} ${senderName} reacted to your message`
      }
      
      if (myReaction && otherReaction) {
        return `${myReaction.emoji} You & ${senderName} reacted`
      }
      
      if (myReaction && !otherReaction) {
        return `${myReaction.emoji} You reacted`
      }
    }
    
    if (msg.type === 'image') return '📷 Photo'
    if (msg.type === 'video') return '🎥 Video'
    if (msg.type === 'file') return '📎 File'
    
    return msg.content || ''
  }

  const getLastMessageTime = (conversation) => {
    if (!conversation.lastMessageTime) return ''
    const date = new Date(conversation.lastMessageTime)
    
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    })
  }

  const isUserOnline = (conversation) => {
    if (conversation.isGroup) return false
    const other = getOtherParticipant(conversation)
    if (!other) return false
    return onlineUsers.includes(other._id) || other.status === 'online'
  }

  // ✅ Get status icon - show gray double tick for 'delivered', blue for 'read'
  const getStatusIcon = (conversation) => {
    if (!conversation.lastMessage) return null
    
    // ✅ Only show status icon for own messages
    if (conversation.lastMessage.sender?._id !== user._id) return null
    
    const status = conversation.lastMessage.status || 'sent'
    
    console.log(`🔵 [ChatList] Status icon for conversation: ${status}`)
    
    if (status === 'read') {
      return <CheckCheck size={14} className="inline text-[#53BDEB] mr-1" />
    } else if (status === 'delivered' || status === 'sent') {
      return <CheckCheck size={14} className="inline text-gray-400 mr-1" />
    } else {
      return <Clock size={14} className="inline text-gray-400 mr-1" />
    }
  }

  const getTypingText = (conversationId) => {
    if (!conversationId) return null
    
    const convId = conversationId.toString()
    
    if (typingUsers[convId]) {
      const typingUserId = typingUsers[convId]
      const conversation = conversations.find(c => c._id.toString() === convId)
      if (conversation) {
        const otherUser = getOtherParticipant(conversation)
        if (otherUser && typingUserId === otherUser._id) {
          return `${otherUser.name?.split(' ')[0] || 'Someone'} is typing...`
        }
      }
    }
    return null
  }

  const handleConversationClick = (conversation, event) => {
    if (event) {
      event.preventDefault()
    }
    if (isSelectMode) {
      toggleConversationSelection(conversation._id)
    } else {
      onSelectConversation(conversation)
    }
  }

  if (loading) {
    return (
      <div className="p-4 space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="animate-pulse flex items-center gap-3">
            <div className="w-12 h-12 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
            <div className="flex-1">
              <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2"></div>
              <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/2"></div>
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (!conversations || conversations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center p-4">
        <div className="w-16 h-16 bg-gray-100 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4">
          <MessageCircle size={32} className="text-gray-400" />
        </div>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          No conversations yet
        </p>
        <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
          Search for users to start chatting
        </p>
      </div>
    )
  }

  return (
    <div>
      {conversations.map((conversation) => {
        const isActive = currentConversation?._id === conversation._id
        const unreadCount = conversation.unreadCount?.[user._id] || 0
        const name = getConversationName(conversation)
        const avatar = getConversationAvatar(conversation)
        const preview = getLastMessage(conversation)
        const time = getLastMessageTime(conversation)
        const isOwn = conversation.lastMessage?.sender?._id === user._id
        const isSelected = selectedConversations.includes(conversation._id)
        const statusIcon = getStatusIcon(conversation)
        const typingText = getTypingText(conversation._id)
        const isPinned = conversation.isPinned || false
        const otherUser = getOtherParticipant(conversation)
        const isOnline = otherUser ? onlineUsers.includes(otherUser._id) || otherUser.status === 'online' : false
        const isNewMessage = conversation.lastMessage?.sender?._id !== user._id && unreadCount > 0

        return (
          <div
            key={conversation._id}
            className={`flex items-center px-4 py-3 hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer transition border-b border-gray-100 dark:border-gray-800 relative ${
              isActive ? 'bg-gray-100 dark:bg-gray-800' : ''
            } ${isSelected ? 'bg-gray-100 dark:bg-gray-800' : ''}`}
            onClick={(e) => handleConversationClick(conversation, e)}
            onTouchStart={(e) => {
              if (isSelectMode) {
                e.preventDefault()
              }
            }}
            onTouchEnd={(e) => {
              if (!isSelectMode) {
                e.preventDefault()
                handleConversationClick(conversation, e)
              }
            }}
          >
            {isSelectMode && (
              <div 
                className="mr-3 flex-shrink-0 cursor-pointer" 
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleConversationSelection(conversation._id)
                }}
                onTouchEnd={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  toggleConversationSelection(conversation._id)
                }}
              >
                {isSelected ? (
                  <CheckSquare size={20} className="text-[#25D366]" />
                ) : (
                  <Square size={20} className="text-gray-400" />
                )}
              </div>
            )}

            <div className="relative flex-shrink-0">
              <img
                src={avatar}
                alt={name}
                className="w-12 h-12 rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = `https://ui-avatars.com/api/?name=${name}&background=25D366&color=fff&size=40`
                }}
              />
              {!conversation.isGroup && (
                <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-white ${
                  isOnline ? 'bg-[#25D366]' : 'bg-gray-400'
                }`} />
              )}
            </div>

            <div className="flex-1 min-w-0 ml-3">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-gray-800 dark:text-white text-base truncate">
                  {name}
                  {isPinned && <Pin size={12} className="inline ml-1 text-gray-400" />}
                </p>
                <span className={`text-xs flex-shrink-0 ml-2 font-medium ${
                  isNewMessage ? 'text-[#25D366] font-semibold' : 'text-gray-400 dark:text-gray-500'
                }`}>
                  {time}
                </span>
              </div>
              <div className="flex items-center mt-1">
                <p className={`text-sm truncate flex-1 ${
                  isNewMessage ? 'text-gray-800 dark:text-white font-medium' : 'text-gray-500 dark:text-gray-400'
                }`}>
                  {typingText ? (
                    <span className="text-[#25D366] animate-pulse font-medium">{typingText}</span>
                  ) : (
                    <>
                      {isOwn && statusIcon}
                      {preview}
                    </>
                  )}
                </p>
                {unreadCount > 0 && !typingText && !isOwn && (
                  <span className="bg-[#25D366] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center ml-2 flex-shrink-0">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})

ChatList.displayName = 'ChatList'

export default ChatList