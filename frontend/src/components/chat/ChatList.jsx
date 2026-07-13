import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { CheckCheck, MessageCircle, CheckSquare, Square, Pin, Clock } from 'lucide-react'
import api from '../../utils/api'

const ChatList = ({ 
  conversations, 
  currentConversation, 
  onSelectConversation, 
  loading,
  isSelectMode = false,
  selectedConversations = [],
  toggleConversationSelection = () => {},
  setConversations
}) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [onlineUsers, setOnlineUsers] = useState([])
  const [typingUsers, setTypingUsers] = useState({})

  // ✅ Use socket.onAny to catch ALL events and filter for user-typing
  useEffect(() => {
    if (!socket) {
      console.log('⏳ Socket not available in ChatList')
      return
    }

    console.log('🔄 ChatList: Setting up onAny listener for user-typing...')

    const handleAnyEvent = (event, ...args) => {
      if (event === 'user-typing') {
        const data = args[0]
        console.log('📩📩📩 ChatList onAny caught user-typing:', data)
        
        const { conversationId, userId, isTyping } = data
        
        if (userId === user?._id) {
          console.log('⏭️ ChatList: Skipping own typing event')
          return
        }
        
        if (!conversationId) {
          console.warn('⚠️ ChatList: No conversationId in typing event')
          return
        }
        
        const convId = conversationId.toString()
        
        setTypingUsers(prev => {
          if (isTyping) {
            console.log(`✅ ChatList: Adding typing for conversation: ${convId} by user: ${userId}`)
            const newState = { ...prev, [convId]: userId }
            return newState
          } else {
            console.log(`✅ ChatList: Removing typing for conversation: ${convId}`)
            const newState = { ...prev }
            delete newState[convId]
            return newState
          }
        })
      }
    }

    socket.onAny(handleAnyEvent)
    console.log('✅ ChatList: onAny listener registered')

    return () => {
      if (socket) {
        socket.offAny(handleAnyEvent)
        console.log('🧹 ChatList: onAny listener removed')
      }
    }
  }, [socket, user?._id])

  // ✅ Handle visibility change to refresh when coming back to chat list
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('📱 ChatList became visible - refreshing conversations')
        try {
          const response = await api.get('/conversations')
          if (setConversations) {
            setConversations(response.data)
          }
        } catch (error) {
          console.error('Failed to refresh conversations:', error)
        }
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [setConversations])

  // ✅ Force refresh when component mounts
  useEffect(() => {
    const refreshConversations = async () => {
      try {
        const response = await api.get('/conversations')
        if (setConversations) {
          setConversations(response.data)
        }
      } catch (error) {
        console.error('Failed to refresh conversations:', error)
      }
    }
    refreshConversations()
  }, [setConversations])

  // ✅ All other socket listeners
  useEffect(() => {
    if (!socket) {
      return
    }

    console.log('🔄 Setting up ChatList other socket listeners...')

    const handleStatusChange = ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return prev.includes(userId) ? prev : [...prev, userId]
        } else {
          return prev.filter(id => id !== userId)
        }
      })
    }

    const handleConversationUpdated = ({ conversation }) => {
      if (!conversation || !setConversations) return
      
      setConversations(prev => {
        const exists = prev.some(c => c._id === conversation._id)
        if (exists) {
          const newConvs = prev.filter(c => c._id !== conversation._id)
          return [conversation, ...newConvs]
        } else {
          return [conversation, ...prev]
        }
      })
    }

    const handleNewMessage = (message) => {
      if (!message || !message.conversation || !setConversations) return
      
      const conversationId = message.conversation._id || message.conversation
      
      setConversations(prev => {
        const existingIndex = prev.findIndex(c => c._id === conversationId)
        
        if (existingIndex === -1) {
          return prev
        }
        
        const updatedConversations = [...prev]
        const conv = { ...updatedConversations[existingIndex] }
        
        const isTemp = message._id && message._id.startsWith('temp_')
        
        conv.lastMessage = {
          ...message,
          status: message.status || 'sent',
          isTemp: isTemp
        }
        conv.updatedAt = message.createdAt || new Date().toISOString()
        
        if (message.sender?._id !== user?._id) {
          conv.unreadCount = {
            ...conv.unreadCount,
            [user?._id]: (conv.unreadCount?.[user?._id] || 0) + 1
          }
        }
        
        updatedConversations.splice(existingIndex, 1)
        updatedConversations.unshift(conv)
        
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

    const handleMessagesRead = ({ conversationId, userId }) => {
      if (!setConversations) return
      
      if (userId === user?._id) {
        setConversations(prev => {
          return prev.map(conv => {
            if (conv._id === conversationId) {
              const updatedConv = { ...conv }
              updatedConv.unreadCount = {
                ...conv.unreadCount,
                [user?._id]: 0
              }
              if (conv.lastMessage && conv.lastMessage.sender?._id !== user?._id) {
                updatedConv.lastMessage = {
                  ...conv.lastMessage,
                  status: 'read'
                }
              }
              return updatedConv
            }
            return conv
          })
        })
      }
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

    const handleMessageDelivered = ({ messageId, conversationId, message }) => {
      if (!setConversations) return
      
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c._id === conversationId)
        if (convIndex === -1) return prev
        
        const conv = { ...prev[convIndex] }
        
        if (conv.lastMessage && conv.lastMessage._id === messageId) {
          conv.lastMessage = {
            ...conv.lastMessage,
            status: 'delivered'
          }
        }
        
        const newConversations = [...prev]
        newConversations[convIndex] = conv
        
        return newConversations
      })
    }

    const handleMessageRead = ({ messageId, conversationId, userId }) => {
      if (!setConversations) return
      if (userId === user?._id) return
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId && conv.lastMessage && conv.lastMessage._id === messageId) {
            const updatedConv = { ...conv }
            updatedConv.lastMessage = {
              ...conv.lastMessage,
              status: 'read'
            }
            return updatedConv
          }
          return conv
        })
      })
    }

    socket.on('user-status-change', handleStatusChange)
    socket.on('conversation-updated', handleConversationUpdated)
    socket.on('new-message', handleNewMessage)
    socket.on('new-message-notification', handleNewMessage)
    socket.on('message-reaction', handleMessageReaction)
    socket.on('messages-read', handleMessagesRead)
    socket.on('message-deleted', handleMessageDeleted)
    socket.on('message-delivered', handleMessageDelivered)
    socket.on('message-read', handleMessageRead)

    console.log('✅ ChatList other socket listeners registered')

    return () => {
      if (socket) {
        socket.off('user-status-change')
        socket.off('conversation-updated')
        socket.off('new-message')
        socket.off('new-message-notification')
        socket.off('message-reaction')
        socket.off('messages-read')
        socket.off('message-deleted')
        socket.off('message-delivered')
        socket.off('message-read')
      }
    }
  }, [socket, user, setConversations])

  // ✅ Reorder conversations based on updatedAt
  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const sorted = [...conversations].sort((a, b) => {
        const timeA = new Date(a.updatedAt || a.lastMessageTime || 0).getTime()
        const timeB = new Date(b.updatedAt || b.lastMessageTime || 0).getTime()
        return timeB - timeA
      })
      
      if (JSON.stringify(sorted.map(c => c._id)) !== JSON.stringify(conversations.map(c => c._id))) {
        setConversations(sorted)
      }
    }
  }, [conversations, setConversations])

  useEffect(() => {
    if (conversations && conversations.length > 0) {
      const onlineFromConversations = conversations
        .filter(conv => !conv.isGroup)
        .map(conv => {
          const other = conv.participants?.find(p => p._id !== user._id)
          return other?.status === 'online' ? other._id : null
        })
        .filter(id => id !== null)

      if (onlineFromConversations.length > 0) {
        setOnlineUsers(prev => {
          const newUsers = [...prev]
          onlineFromConversations.forEach(id => {
            if (!newUsers.includes(id)) {
              newUsers.push(id)
            }
          })
          return newUsers
        })
      }
    }
  }, [conversations, user._id])

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

  const getStatusIcon = (conversation) => {
    if (!conversation.lastMessage) return null
    
    if (conversation.lastMessage.sender?._id !== user._id) return null
    
    const status = conversation.lastMessage.status
    
    switch (status) {
      case 'sent':
        return <CheckCheck size={14} className="inline text-gray-400 mr-1" />
      case 'delivered':
        return <CheckCheck size={14} className="inline text-gray-400 mr-1" />
      case 'read':
        return <CheckCheck size={14} className="inline text-[#53BDEB] mr-1" />
      default:
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

  // ✅ FIXED: Handle conversation click without keyboard dismissal
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
        const online = isUserOnline(conversation)
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
                {unreadCount > 0 && !typingText && (
                  <span className="bg-[#25D366] text-white text-xs font-bold rounded-full px-2 py-0.5 min-w-[20px] text-center ml-2 flex-shrink-0">
                    {unreadCount}
                  </span>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

export default ChatList