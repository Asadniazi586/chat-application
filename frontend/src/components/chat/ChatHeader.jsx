import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { 
  ArrowLeft, Phone, Video, MoreVertical, 
  Info, Trash2, AlertCircle, X
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const ChatHeader = ({ 
  conversation, 
  onBack, 
  isOnline, 
  otherUser,
  onProfileClick,
  onClearChat,
  onBlockUser,
  onUnblockUser,
  isBlocked = false
}) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [showDropdown, setShowDropdown] = useState(false)
  const [onlineUsers, setOnlineUsers] = useState([])
  const dropdownRef = useRef(null)

  // ✅ Socket listener for online status
  useEffect(() => {
    if (!socket) return

    const handleStatusChange = ({ userId, status }) => {
      setOnlineUsers(prev => {
        if (status === 'online') {
          return prev.includes(userId) ? prev : [...prev, userId]
        } else {
          return prev.filter(id => id !== userId)
        }
      })
    }

    socket.on('user-status-change', handleStatusChange)

    return () => {
      socket.off('user-status-change')
    }
  }, [socket])

  // Click outside dropdown
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!conversation) return null

  const getOtherParticipant = () => {
    if (conversation.isGroup) return null
    return conversation.participants?.find(p => p._id !== user._id)
  }

  const getChatName = () => {
    if (conversation.isGroup) return conversation.groupName || 'Group'
    const other = getOtherParticipant()
    return other?.name || 'Unknown User'
  }

  const getChatAvatar = () => {
    if (conversation.isGroup) {
      return 'https://ui-avatars.com/api/?name=Group&background=25D366&color=fff&size=40'
    }
    const other = getOtherParticipant()
    return other?.avatar || `https://ui-avatars.com/api/?name=${getChatName()}&background=25D366&color=fff&size=40`
  }

  const other = getOtherParticipant()
  const name = getChatName()
  const avatar = getChatAvatar()

  // ✅ Check if user is online
  const isUserOnline = () => {
    if (!other) return false
    return onlineUsers.includes(other._id) || other.status === 'online'
  }

  // ✅ Get status text with last seen
  const getStatusText = () => {
    if (conversation.isGroup) {
      return `${conversation.participants?.length || 0} members`
    }

    if (!other) return 'Offline'

    // ✅ If blocked, show blocked status
    if (isBlocked) {
      return 'Blocked'
    }

    const userOnline = isUserOnline()

    if (userOnline) {
      return 'Online'
    }

    // ✅ Show last seen if available
    if (other.lastSeen) {
      const lastSeenDate = new Date(other.lastSeen)
      const now = new Date()
      const diff = now - lastSeenDate

      if (diff < 60000) return 'Last seen just now'
      if (diff < 3600000) {
        const minutes = Math.floor(diff / 60000)
        return `Last seen ${minutes}m ago`
      }
      if (diff < 86400000) {
        const hours = Math.floor(diff / 3600000)
        return `Last seen ${hours}h ago`
      }
      return `Last seen ${lastSeenDate.toLocaleDateString()}`
    }

    return 'Offline'
  }

  const statusText = getStatusText()
  const userOnline = isUserOnline()

  // ✅ Handle clear chat - FIXED: Use api instead of axios
  const handleClearChat = () => {
    setShowDropdown(false)
    if (onClearChat) {
      onClearChat()
    } else {
      api.delete(`/users/clear-chat/${conversation._id}`)
        .then(() => {
          toast.success('Chat cleared successfully')
        })
        .catch((error) => {
          console.error('Clear chat error:', error)
          toast.error('Failed to clear chat')
        })
    }
  }

  // ✅ Handle block/unblock - FIXED: Use api instead of axios
  const handleBlockToggle = () => {
    setShowDropdown(false)
    if (isBlocked) {
      if (onUnblockUser) {
        onUnblockUser()
      } else {
        api.post('/users/unblock', { userId: other?._id })
          .then(() => {
            toast.success(`${other?.name} unblocked successfully`)
          })
          .catch((error) => {
            console.error('Unblock error:', error)
            toast.error('Failed to unblock user')
          })
      }
    } else {
      if (onBlockUser) {
        onBlockUser()
      } else {
        api.post('/users/block', { userId: other?._id })
          .then(() => {
            toast.success(`${other?.name} blocked successfully`)
          })
          .catch((error) => {
            console.error('Block error:', error)
            toast.error('Failed to block user')
          })
      }
    }
  }

  return (
    <div className="flex items-center justify-between px-4 py-2 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
      <div className="flex items-center gap-3">
        {onBack && (
          <button 
            onClick={onBack} 
            className="text-white hover:text-white/80 transition md:hidden"
          >
            <ArrowLeft size={22} />
          </button>
        )}
        <div 
          className="flex items-center gap-3 cursor-pointer"
          onClick={() => onProfileClick?.(other)}
        >
          <div className="relative">
            <img
              src={avatar}
              alt={name}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = `https://ui-avatars.com/api/?name=${name}&background=25D366&color=fff&size=40`
              }}
            />
            {/* ✅ Green online dot */}
            {!conversation.isGroup && !isBlocked && (
              <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-[#075E54] dark:border-[#1A2A32] ${
                userOnline ? 'bg-[#25D366]' : 'bg-gray-400'
              }`} />
            )}
          </div>
          <div>
            <p className="text-white font-medium text-sm">{name}</p>
            <p className={`text-xs ${
              isBlocked ? 'text-red-400' : 
              userOnline ? 'text-[#25D366]' : 'text-white/70'
            }`}>
              {statusText}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 relative">
        <button className="text-white hover:text-white/80 transition" onClick={() => toast.info('📞 Audio call - Coming Soon!', { icon: '🚀' })}>
          <Phone size={20} />
        </button>
        <button className="text-white hover:text-white/80 transition" onClick={() => toast.info('📹 Video call - Coming Soon!', { icon: '🚀' })}>
          <Video size={20} />
        </button>
        <button 
          className="text-white hover:text-white/80 transition"
          onClick={() => setShowDropdown(!showDropdown)}
        >
          <MoreVertical size={20} />
        </button>
        
        {/* ✅ Dropdown Menu */}
        {showDropdown && (
          <div 
            ref={dropdownRef}
            className="absolute top-full right-0 mt-2 bg-white dark:bg-[#1A2A32] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 min-w-[200px] z-50 py-1"
          >
            <button
              onClick={() => {
                setShowDropdown(false)
                onProfileClick?.(other)
              }}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Info size={16} />
              View Contact
            </button>
            <button
              onClick={handleClearChat}
              className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Trash2 size={16} />
              Clear Chat
            </button>
            {other && (
              <button
                onClick={handleBlockToggle}
                className="flex items-center gap-3 w-full px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition border-t border-gray-200 dark:border-gray-700"
              >
                <AlertCircle size={16} />
                {isBlocked ? `Unblock ${other.name}` : `Block ${other.name}`}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default ChatHeader