import React, { useState, useEffect, useRef, useMemo } from 'react'
import Sidebar from '../components/sidebar/Sidebar'
import ChatWindow from '../components/chat/ChatWindow'
import { useAuth } from '../hooks/useAuth'
import { useSocket } from '../hooks/useSocket'
import toast from 'react-hot-toast'
import { 
  MessageCircle, Users, Phone, Camera, Search, MoreVertical, X, 
  UserPlus, Loader, CircleUser, Circle, PhoneCall, ArrowLeft, ChevronRight,
  User, Shield, Lock, Bell, Moon, LogOut, Edit2, Check, UserCheck,
  Trash2, CheckSquare, Square
} from 'lucide-react'
import MobileContactProfile from '../components/common/MobileContactProfile'
import ChatList from '../components/chat/ChatList'
import SearchBar from '../components/sidebar/SearchBar' // ✅ Add this import
import api from '../utils/api'

const ChatPage = () => {
  const [conversations, setConversations] = useState([])
  const [currentConversation, setCurrentConversation] = useState(null)
  const [messages, setMessages] = useState([])
  const [loading, setLoading] = useState(true)
  const { user, setUser, logout } = useAuth()
  const { socket, isConnected } = useSocket()
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [showChat, setShowChat] = useState(false)
  const [activeTab, setActiveTab] = useState('chats')
  const [showFullProfile, setShowFullProfile] = useState(false)
  const [showMobileContactProfile, setShowMobileContactProfile] = useState(false)
  const [selectedMobileContact, setSelectedMobileContact] = useState(null)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAbout, setEditAbout] = useState('')
  const [selectedImage, setSelectedImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)
  
  // Search states - These are still needed for desktop but mobile now uses SearchBar component
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searchLoading, setSearchLoading] = useState(false)
  const [showSearchResults, setShowSearchResults] = useState(false)
  const [searchingUser, setSearchingUser] = useState(false)
  const searchRef = useRef(null)

  // ✅ Selection states for deleting conversations
  const [isSelectMode, setIsSelectMode] = useState(false)
  const [selectedConversations, setSelectedConversations] = useState([])

  
  // ✅ Create a Set of existing user IDs
  const existingUserIds = useMemo(() => {
    const ids = new Set()
    conversations.forEach(conv => {
      if (!conv.isGroup && conv.participants) {
        conv.participants.forEach(p => {
          if (p._id !== user?._id) {
            ids.add(p._id)
          }
        })
      }
    })
    return ids
  }, [conversations, user?._id])

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
      if (window.innerWidth >= 768) {
        setShowChat(true)
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // ✅ Load user data when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditAbout(user.about || 'Alhamdulillah ❤️')
      if (user.avatar) {
        setSelectedImage(user.avatar)
      }
    }
  }, [user])

  // ✅ Ensure socket connection
  useEffect(() => {
    if (!socket || !user) return
    console.log('🔌 Setting up socket connection for:', user._id)
    socket.emit('user-online', user._id)
  }, [socket, user])

  // ✅ JOIN ALL CONVERSATION ROOMS
  useEffect(() => {
    if (!socket || !user || conversations.length === 0) return
    console.log('📚 Joining ALL conversation rooms...', conversations.length)
    conversations.forEach(conv => {
      if (!conv.isGroup) {
        socket.emit('join-conversation', conv._id)
        console.log(`📚 Joined room: conversation-${conv._id}`)
      }
    })
    return () => {
      conversations.forEach(conv => {
        if (!conv.isGroup) {
          socket.emit('leave-conversation', conv._id)
        }
      })
    }
  }, [socket, user, conversations])

  // ✅ Handle profile open event
  useEffect(() => {
    const handleOpenProfile = () => {
      if (isMobile) {
        setShowFullProfile(true)
      } else {
        document.dispatchEvent(new CustomEvent('openProfileDesktop'))
      }
    }
    document.addEventListener('openProfile', handleOpenProfile)
    return () => {
      document.removeEventListener('openProfile', handleOpenProfile)
    }
  }, [isMobile])

  // Load conversations - ✅ FIXED
  useEffect(() => {
    const loadConversations = async () => {
      if (!user) {
        setLoading(false)
        return
      }
      try {
        console.log('📥 Loading conversations for user:', user._id)
        const response = await api.get('/conversations')
        console.log('📥 Conversations loaded:', response.data.length)
        setConversations(response.data)
      } catch (error) {
        console.error('❌ Error loading conversations:', error)
        toast.error('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }
    loadConversations()
  }, [user])

  // ✅ Handle new message - NO TOAST
  useEffect(() => {
    if (!socket) return

    console.log('📡 Setting up new-message listener in ChatPage')

    const handleNewMessage = (message) => {
      console.log('📩 New message received via socket in ChatPage:', message)
      
      if (message.sender?._id === user?._id) return
      
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv._id === message.conversation) {
            const currentUnread = conv.unreadCount?.[user?._id] || 0
            return {
              ...conv,
              lastMessage: message,
              lastMessageTime: message.createdAt,
              unreadCount: {
                ...conv.unreadCount,
                [user?._id]: currentUnread + 1
              }
            }
          }
          return conv
        })

        const sorted = [...updated]
        sorted.sort((a, b) => {
          if (a._id === message.conversation) return -1
          if (b._id === message.conversation) return 1
          const timeA = new Date(a.lastMessageTime || 0).getTime()
          const timeB = new Date(b.lastMessageTime || 0).getTime()
          return timeB - timeA
        })

        return sorted
      })
      
      if (currentConversation?._id === message.conversation) {
        setMessages(prev => {
          const exists = prev.some(msg => msg._id === message._id)
          if (exists) return prev
          return [...prev, message]
        })
      }
    }

    socket.on('new-message', handleNewMessage)

    return () => {
      socket.off('new-message')
    }
  }, [socket, user?._id, currentConversation])

  // ✅ Handle message-delivered events for real-time updates
  useEffect(() => {
    if (!socket) return

    console.log('📡 Setting up message-delivered listener in ChatPage')

    const handleMessageDelivered = ({ messageId, conversationId, message }) => {
      console.log('📩 ChatPage message-delivered RECEIVED:', { messageId, conversationId })
      
      setConversations(prev => {
        const convIndex = prev.findIndex(c => c._id === conversationId)
        if (convIndex === -1) return prev
        
        const conv = { ...prev[convIndex] }
        
        if (message) {
          conv.lastMessage = {
            ...message,
            status: 'delivered'
          }
        } else if (conv.lastMessage && conv.lastMessage._id === messageId) {
          conv.lastMessage = {
            ...conv.lastMessage,
            status: 'delivered'
          }
        }
        
        conv.updatedAt = new Date().toISOString()
        
        // ✅ Move to top
        const newConversations = [conv, ...prev.filter((_, i) => i !== convIndex)]
        console.log('✅ ChatPage: Conversation moved to top with delivered status')
        return newConversations
      })
    }

    socket.on('message-delivered', handleMessageDelivered)

    return () => {
      socket.off('message-delivered')
    }
  }, [socket, setConversations])

  // ✅ Handle message-read events for real-time blue ticks
  useEffect(() => {
    if (!socket) return

    console.log('📡 Setting up message-read listener in ChatPage')

    const handleMessageRead = ({ messageId, conversationId }) => {
      console.log('📩 ChatPage message-read RECEIVED:', { messageId, conversationId })
      
      setConversations(prev => {
        return prev.map(conv => {
          if (conv._id === conversationId && conv.lastMessage && conv.lastMessage._id === messageId) {
            const updatedConv = { ...conv }
            updatedConv.lastMessage = {
              ...conv.lastMessage,
              status: 'read'
            }
            console.log('✅ ChatPage: Blue tick updated for message in sidebar')
            return updatedConv
          }
          return conv
        })
      })
    }

    socket.on('message-read', handleMessageRead)

    return () => {
      socket.off('message-read')
    }
  }, [socket, setConversations])

  // ✅ Manual refresh function - for debugging - ✅ FIXED
  const manualRefresh = async () => {
    try {
      console.log('🔄 Manual refresh triggered...')
      const response = await api.get('/conversations')
      setConversations(response.data)
      console.log('✅ Manual refresh complete, conversations:', response.data.length)
      toast.success('Conversations refreshed!')
    } catch (error) {
      console.error('❌ Manual refresh failed:', error)
    }
  }

  // Make available in console
  window.manualRefresh = manualRefresh

  // ✅ Search users - Desktop only (mobile uses SearchBar component)
  useEffect(() => {
    const searchUsers = async () => {
      if (!searchQuery.trim() || searchQuery.length < 2) {
        setSearchResults([])
        setShowSearchResults(false)
        return
      }

      setSearchLoading(true)
      try {
        const response = await api.get(`/users/search?q=${searchQuery}`)
        const filtered = response.data.filter(u => u._id !== user?._id)
        setSearchResults(filtered)
        setShowSearchResults(true)
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setSearchLoading(false)
      }
    }

    const debounce = setTimeout(searchUsers, 500)
    return () => clearTimeout(debounce)
  }, [searchQuery, user?._id])

  // ✅ Updated handleSelectConversation with dontOpenChat flag - ✅ FIXED
  const handleSelectConversation = async (conversation, dontOpenChat = false) => {
    console.log('📂 Selecting conversation:', conversation._id)
    
    // ✅ For mobile: if dontOpenChat is true, just add to list without opening
    if (dontOpenChat) {
      setConversations(prev => {
        const exists = prev.some(conv => conv._id === conversation._id)
        if (exists) return prev
        return [conversation, ...prev]
      })
      
      if (socket && user?._id) {
        socket.emit('mark-read', {
          conversationId: conversation._id,
          userId: user._id
        })
      }
      return
    }
    
    setCurrentConversation(conversation)
    
    if (isMobile) {
      setShowChat(true)
    }

    if (socket) {
      socket.emit('join-conversation', conversation._id)
    }

    try {
      const response = await api.get(`/messages/${conversation._id}`)
      console.log('📥 Loaded messages:', response.data.length)
      setMessages(response.data || [])
      
      if (socket && user?._id) {
        socket.emit('mark-read', {
          conversationId: conversation._id,
          userId: user._id
        })
      }

      setConversations(prev =>
        prev.map(conv =>
          conv._id === conversation._id
            ? {
                ...conv,
                unreadCount: {
                  ...conv.unreadCount,
                  [user?._id]: 0
                }
              }
            : conv
        )
      )
    } catch (error) {
      console.error('❌ Error loading messages:', error)
      toast.error('Failed to load messages')
    }
  }

  const handleBack = () => {
    setShowChat(false)
  }

  // ✅ Start conversation with searched user - FIXED for mobile (don't open chat) - ✅ FIXED
  const startConversation = async (selectedUser) => {
    if (existingUserIds.has(selectedUser._id)) {
      toast.info(`Already chatting with ${selectedUser.name}`)
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      return
    }

    setSearchingUser(true)
    try {
      const response = await api.post('/conversations', {
        participantId: selectedUser._id
      })
      
      const conversation = response.data
      
      // ✅ Add conversation to the top immediately (don't open chat)
      setConversations(prev => {
        const exists = prev.some(conv => conv._id === conversation._id)
        if (exists) return prev
        return [conversation, ...prev]
      })
      
      // ✅ On mobile, just add to list, don't open chat window
      if (isMobile) {
        // ✅ Just add to conversations list, user can click to open
        setSearchQuery('')
        setSearchResults([])
        setShowSearchResults(false)
        toast.success(`Started chat with ${selectedUser.name}`)
        setSearchingUser(false)
        return
      }
      
      // ✅ On desktop, select the conversation (opens in sidebar)
      handleSelectConversation(conversation)
      
      setSearchQuery('')
      setSearchResults([])
      setShowSearchResults(false)
      
      toast.success(`Started chat with ${selectedUser.name}`)
    } catch (error) {
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        toast.info(`Already chatting with ${selectedUser.name}`)
        setSearchQuery('')
        setSearchResults([])
        setShowSearchResults(false)
      } else {
        toast.error('Failed to start conversation')
      }
      console.error(error)
    } finally {
      setSearchingUser(false)
    }
  }

  // ✅ Delete selected conversations - FIXED for flashing - ✅ FIXED
  const deleteSelectedConversations = async () => {
    console.log('🗑️ deleteSelectedConversations called, selected:', selectedConversations.length)
    if (selectedConversations.length === 0) return

    try {
      // ✅ First, immediately remove from UI (no flashing)
      const convIdsToDelete = [...selectedConversations]
      
      // ✅ Immediately update UI
      setConversations(prev => prev.filter(conv => !convIdsToDelete.includes(conv._id)))
      setSelectedConversations([])
      setIsSelectMode(false)
      
      if (currentConversation && convIdsToDelete.includes(currentConversation._id)) {
        setCurrentConversation(null)
        setMessages([])
        if (isMobile) {
          setShowChat(false)
        }
      }
      
      // ✅ Then delete from server
      for (const convId of convIdsToDelete) {
        await api.delete(`/conversations/${convId}`)
      }
      
      toast.success(`${convIdsToDelete.length} conversation(s) deleted`)
    } catch (error) {
      console.error('Delete conversations error:', error)
      toast.error('Failed to delete conversations')
      // ✅ Reload if deletion failed
      const response = await api.get('/conversations')
      setConversations(response.data)
    }
  }

  // ✅ Toggle conversation selection
  const toggleConversationSelection = (convId) => {
    console.log('🔄 toggleConversationSelection called for:', convId)
    setSelectedConversations(prev => {
      if (prev.includes(convId)) {
        return prev.filter(id => id !== convId)
      } else {
        return [...prev, convId]
      }
    })
  }

  // ✅ Select all conversations
  const selectAllConversations = () => {
    console.log('📋 selectAllConversations called')
    const allIds = conversations.map(conv => conv._id)
    setSelectedConversations(prev => {
      if (prev.length === allIds.length) {
        return []
      }
      return allIds
    })
  }

  // ✅ Handle conversation update for reordering
  const handleConversationUpdate = (conversationId) => {
    if (!conversationId) return
    setConversations(prev => {
      const sorted = [...prev]
      sorted.sort((a, b) => {
        if (a._id === conversationId) return -1
        if (b._id === conversationId) return 1
        const timeA = new Date(a.lastMessageTime || 0).getTime()
        const timeB = new Date(b.lastMessageTime || 0).getTime()
        return timeB - timeA
      })
      return sorted
    })
  }

  // Get chat preview
  const getChatPreview = (conversation) => {
    if (!conversation.lastMessage) return 'No messages yet'
    const msg = conversation.lastMessage
    if (typeof msg === 'string') return msg
    if (msg.type === 'image') return '📷 Photo'
    if (msg.type === 'video') return '🎥 Video'
    if (msg.type === 'file') return '📎 File'
    return msg.content || 'No messages yet'
  }

  const getChatName = (conversation) => {
    if (conversation.isGroup) return conversation.groupName || 'Group'
    const other = conversation.participants?.find(p => p._id !== user?._id)
    return other?.name || 'Unknown User'
  }

  const getChatAvatar = (conversation) => {
    if (conversation.isGroup) {
      return 'https://ui-avatars.com/api/?name=Group&background=25D366&color=fff&size=40'
    }
    const other = conversation.participants?.find(p => p._id !== user?._id)
    return other?.avatar || `https://ui-avatars.com/api/?name=${other?.name || 'U'}&background=25D366&color=fff&size=40`
  }

  const getLastMessageTime = (conversation) => {
    if (!conversation.lastMessageTime) return ''
    const date = new Date(conversation.lastMessageTime)
    const now = new Date()
    const diff = now - date

    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m`
    if (diff < 86400000) return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' })
  }

  // ✅ Get user avatar with fallback
  const getUserAvatar = () => {
    if (selectedImage) return selectedImage
    if (user?.avatar) return user.avatar
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=24`
  }

  // ✅ Compress image for upload
  const compressImage = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = (event) => {
        const img = new Image();
        img.src = event.target.result;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 300;
          const MAX_HEIGHT = 300;
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > MAX_WIDTH) {
              height *= MAX_WIDTH / width;
              width = MAX_WIDTH;
            }
          } else {
            if (height > MAX_HEIGHT) {
              width *= MAX_HEIGHT / height;
              height = MAX_HEIGHT;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);

          canvas.toBlob((blob) => {
            if (blob) {
              const compressedFile = new File([blob], file.name, {
                type: 'image/jpeg',
                lastModified: Date.now()
              });
              resolve(compressedFile);
            } else {
              reject(new Error('Compression failed'));
            }
          }, 'image/jpeg', 0.7);
        };
        img.onerror = reject;
      };
      reader.onerror = reject;
    });
  }

  // ✅ Handle image upload - ✅ FIXED
  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setUploading(true)
    try {
      const compressedFile = await compressImage(file);
      
      const formData = new FormData()
      formData.append('file', compressedFile)
      
      const response = await api.post('/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.success) {
        const avatarUrl = response.data.url
        setSelectedImage(avatarUrl)
        
        await api.put('/users/profile', { avatar: avatarUrl })
        
        if (setUser) {
          setUser({ ...user, avatar: avatarUrl })
        }
        
        toast.success('Profile picture updated!')
      }
    } catch (error) {
      console.error('Upload error:', error)
      toast.error(error.response?.data?.message || 'Failed to upload image')
    } finally {
      setUploading(false)
    }
  }

  // ✅ Handle save profile - ✅ FIXED
  const handleSaveProfile = async () => {
    try {
      const response = await api.put('/users/profile', { 
        name: editName, 
        about: editAbout 
      })
      
      if (setUser && response.data.user) {
        setUser(response.data.user)
      }
      
      toast.success('Profile updated!')
      setIsEditing(false)
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    }
  }

  // ✅ Bottom navigation items (Mobile) - FIXED
  const bottomNavItems = [
    { 
      id: 'updates', 
      icon: Users, 
      label: 'Updates',
      onClick: () => {
        setActiveTab('updates')
        setShowFullProfile(false)
        // ✅ Close any open chat
        if (isMobile && showChat) {
          setShowChat(false)
        }
        toast.info('📱 Updates - Coming Soon!', { icon: '🚀' })
      }
    },
    { 
      id: 'calls', 
      icon: Phone, 
      label: 'Calls',
      onClick: () => {
        setActiveTab('calls')
        setShowFullProfile(false)
        // ✅ Close any open chat
        if (isMobile && showChat) {
          setShowChat(false)
        }
        toast.info('📞 Calls - Coming Soon!', { icon: '🚀' })
      }
    },
    { 
      id: 'chats', 
      icon: MessageCircle, 
      label: 'Chats',
      onClick: () => {
        setActiveTab('chats')
        setShowFullProfile(false)
        // ✅ Close any open chat and go back to chat list
        if (isMobile && showChat) {
          setShowChat(false)
        }
      }
    },
    { 
      id: 'profile', 
      icon: null,
      label: 'You',
      isAvatar: true,
      onClick: () => {
        setActiveTab('profile')
        // ✅ Close any open chat
        if (isMobile && showChat) {
          setShowChat(false)
        }
        setShowFullProfile(true)
      }
    }
  ]

  // ✅ Handle mobile contact profile
  const handleMobileContactProfileClick = (contact) => {
    setSelectedMobileContact(contact)
    setShowMobileContactProfile(true)
  }

  const handleMobileContactProfileBack = () => {
    setShowMobileContactProfile(false)
    setSelectedMobileContact(null)
  }

  // ✅ Mobile Profile View - FIXED: No keyboard dismissal
  const MobileProfileView = () => {
    const avatarUrl = getUserAvatar()
    
    // ✅ Handle input focus to keep keyboard open
    const handleInputFocus = (e) => {
      e.stopPropagation()
      // Scroll to input if needed
      setTimeout(() => {
        e.target.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }, 300)
    }
    
    return (
      <div className="flex flex-col h-full bg-white dark:bg-[#1A2A32]">
        <div className="flex items-center px-3 sm:px-4 py-2.5 sm:py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
          <button 
            onClick={() => {
              setShowFullProfile(false)
              setActiveTab('chats')
              setIsEditing(false)
            }} 
            className="text-white hover:text-white/80 transition mr-2 sm:mr-3"
          >
            <ArrowLeft size={20} className="sm:size-24" />
          </button>
          <h2 className="text-white text-base sm:text-lg font-semibold">Profile</h2>
        </div>

        <div className="flex-1 overflow-y-auto p-3 sm:p-4">
          <div className="flex flex-col items-center mb-4 sm:mb-6">
            <div className="relative group">
              <img
                src={avatarUrl}
                alt={user?.name}
                className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-[#25D366]"
                onError={(e) => {
                  e.target.onerror = null
                  e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=120`
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="absolute bottom-0 right-0 p-1.5 sm:p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition shadow-lg disabled:opacity-50"
              >
                {uploading ? (
                  <div className="animate-spin rounded-full h-3 w-3 sm:h-4 sm:w-4 border-2 border-white border-t-transparent" />
                ) : (
                  <Camera size={14} className="sm:size-16" />
                )}
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
              />
            </div>
            <h3 className="mt-2 sm:mt-3 text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">
              {editName}
            </h3>
            <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400">
              {editAbout}
            </p>
          </div>

          <div className="bg-gray-50 dark:bg-[#0B141A] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 space-y-2.5 sm:space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Name</span>
              {isEditing ? (
                <input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  // ✅ Keep keyboard open
                  onFocus={handleInputFocus}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="text-xs sm:text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-28 sm:w-40"
                  placeholder="Enter name"
                />
              ) : (
                <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white">{editName}</span>
              )}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">About</span>
              {isEditing ? (
                <input
                  value={editAbout}
                  onChange={(e) => setEditAbout(e.target.value)}
                  // ✅ Keep keyboard open
                  onFocus={handleInputFocus}
                  onTouchStart={(e) => e.stopPropagation()}
                  className="text-xs sm:text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-28 sm:w-40"
                  placeholder="Enter about"
                />
              ) : (
                <span className="text-xs sm:text-sm text-gray-800 dark:text-white">{editAbout}</span>
              )}
            </div>
            {isEditing ? (
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(user?.name || '')
                    setEditAbout(user?.about || 'Alhamdulillah ❤️')
                  }}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#20b858] transition flex items-center gap-1"
                >
                  <Check size={12} className="sm:size-14" />
                  Save
                </button>
              </div>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full py-1 sm:py-1.5 text-xs sm:text-sm text-[#25D366] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2"
              >
                <Edit2 size={12} className="sm:size-14" />
                Edit Profile
              </button>
            )}
          </div>

          <div className="space-y-0.5 sm:space-y-1">
            {[
              { icon: User, label: 'Profile' },
              { icon: Shield, label: 'Account' },
              { icon: Lock, label: 'Privacy' },
              { icon: Bell, label: 'Notifications' },
              { icon: Moon, label: 'Theme' }
            ].map((item, index) => {
              const Icon = item.icon
              return (
                <button
                  key={index}
                  onClick={() => toast.info(`${item.label} - Coming Soon!`, { icon: '🚀' })}
                  className="flex items-center justify-between w-full p-2.5 sm:p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                >
                  <div className="flex items-center gap-2 sm:gap-3">
                    <Icon size={16} className="sm:size-18 text-gray-500 dark:text-gray-400" />
                    <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">{item.label}</span>
                  </div>
                  <ChevronRight size={14} className="sm:size-16 text-gray-400" />
                </button>
              )
            })}
          </div>

          <button
            onClick={() => {
              if (socket && user) {
                socket.emit('user-offline', user._id)
              }
              logout()
            }}
            className="w-full mt-3 sm:mt-4 p-2.5 sm:p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400 flex items-center gap-2 sm:gap-3"
          >
            <LogOut size={16} className="sm:size-18" />
            <span className="text-xs sm:text-sm font-medium">Log out</span>
          </button>
        </div>

        {/* ✅ BOTTOM NAVIGATION - Profile page (SAME PADDING as chats) */}
        <div className="profile-bottom-nav">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isAvatar = item.isAvatar
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 px-2 sm:px-4 py-0.5 transition min-w-[44px] sm:min-w-[60px] touch-manipulation ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}
              >
                {isAvatar ? (
                  <img
                    src={avatarUrl}
                    alt="You"
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <Icon size={20} className="sm:size-22" />
                )}
                <span className="text-[8px] sm:text-[10px] leading-3 font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // ✅ Mobile Chat List - Using SearchBar component for search
  const MobileChatList = () => {
    const avatarUrl = getUserAvatar()
    
    console.log('🔍 MobileChatList render - isSelectMode:', isSelectMode, 'selected:', selectedConversations.length)
    
    const handleToggleSelectMode = (e) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      console.log('📱 Toggling selection mode - conversations:', conversations.length)
      if (conversations.length > 0) {
        setIsSelectMode(true)
        console.log('✅ Selection mode set to true')
      } else {
        toast.info('No conversations to select')
      }
    }
    
    const handleSelectAll = (e) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      console.log('📱 Select all clicked')
      selectAllConversations()
    }
    
    const handleDeleteSelected = (e) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      console.log('📱 Delete clicked, selected:', selectedConversations.length)
      deleteSelectedConversations()
    }
    
    const handleCancelSelection = (e) => {
      if (e) {
        e.preventDefault()
        e.stopPropagation()
      }
      console.log('📱 Cancel selection clicked')
      setIsSelectMode(false)
      setSelectedConversations([])
    }
    
    return (
      <div className="flex flex-col h-full bg-[#ECE5DD] dark:bg-[#0B141A]" style={{ height: '100%', minHeight: '100vh', minHeight: '-webkit-fill-available' }}>
        {/* ✅ Header - Responsive */}
        <div className="bg-[#075E54] dark:bg-[#1A2A32] px-3 sm:px-4 py-2.5 sm:py-3 flex items-center justify-between flex-shrink-0">
          <h1 className="text-white text-base sm:text-xl font-semibold">WhatsApp</h1>
          <div className="flex items-center gap-2 sm:gap-4">
            {isSelectMode ? (
              <>
                <button
                  onClick={handleSelectAll}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchEnd={handleSelectAll}
                  className="text-white hover:text-white/80 transition p-1"
                >
                  {selectedConversations.length === conversations.length && conversations.length > 0 ? (
                    <CheckSquare size={18} className="sm:size-22" />
                  ) : (
                    <Square size={18} className="sm:size-22" />
                  )}
                </button>
                <button
                  onClick={handleDeleteSelected}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchEnd={handleDeleteSelected}
                  className={`text-white hover:text-white/80 transition p-1 ${
                    selectedConversations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                  disabled={selectedConversations.length === 0}
                >
                  <Trash2 size={18} className="sm:size-22" />
                </button>
                <button
                  onClick={handleCancelSelection}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchEnd={handleCancelSelection}
                  className="text-white hover:text-white/80 transition p-1"
                >
                  <X size={18} className="sm:size-22" />
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={handleToggleSelectMode}
                  onTouchStart={(e) => e.preventDefault()}
                  onTouchEnd={handleToggleSelectMode}
                  className="text-white hover:text-white/80 transition p-1"
                  id="select-mode-button"
                >
                  <CheckSquare size={18} className="sm:size-22" />
                </button>
                <button 
                  className="text-white p-1" 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toast.info('📷 Camera - Coming Soon!', { icon: '🚀' })
                  }}
                >
                  <Camera size={18} className="sm:size-22" />
                </button>
                <button 
                  className="text-white p-1" 
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    toast.info('📱 More options - Coming Soon!', { icon: '🚀' })
                  }}
                >
                  <MoreVertical size={18} className="sm:size-22" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* ✅ Search Bar - Using SearchBar component with keyboard fix */}
        <div className="bg-[#075E54] dark:bg-[#1A2A32] px-2 sm:px-3 pb-2 flex-shrink-0">
          <SearchBar
            onSelectConversation={handleSelectConversation}
            showSearch={true}
            setShowSearch={() => {}}
            conversations={conversations}
            setConversations={setConversations}
            isMobile={true}
          />
        </div>

        {/* ✅ Tabs - Responsive */}
        <div className="bg-white dark:bg-[#1A2A32] border-b border-gray-200 dark:border-gray-800 flex-shrink-0">
          <div className="flex overflow-x-auto px-2 py-1 gap-1">
            {['All', 'Unread', 'Favourites', 'Groups'].map((tab, index) => (
              <button
                key={index}
                className={`px-3 sm:px-4 py-1 text-[10px] sm:text-sm font-medium rounded-full whitespace-nowrap transition ${
                  index === 0
                    ? 'bg-[#25D366] text-white'
                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                {tab}
              </button>
            ))}
          </div>
        </div>

        {/* ✅ Archived - Responsive */}
        <div className="bg-white dark:bg-[#1A2A32] px-3 sm:px-4 py-1.5 sm:py-2 border-b border-gray-100 dark:border-gray-800 flex-shrink-0">
          <span className="text-[10px] sm:text-sm text-gray-500 dark:text-gray-400 font-medium">Archived</span>
        </div>

        {/* ✅ Chat List - Takes remaining space */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-[#1A2A32]" style={{ flex: '1 1 auto', minHeight: 0 }}>
          <ChatList
            conversations={conversations}
            setConversations={setConversations}
            currentConversation={currentConversation}
            onSelectConversation={handleSelectConversation}
            loading={loading}
            isSelectMode={isSelectMode}
            selectedConversations={selectedConversations}
            toggleConversationSelection={toggleConversationSelection}
          />
        </div>

        {/* ✅ BOTTOM NAVIGATION - Chats section */}
        <div className="bottom-nav">
          {bottomNavItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            const isAvatar = item.isAvatar
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 px-2 sm:px-4 py-0.5 transition min-w-[44px] sm:min-w-[60px] touch-manipulation ${
                  isActive ? 'text-white' : 'text-white/60'
                }`}
              >
                {isAvatar ? (
                  <img
                    src={avatarUrl}
                    alt="You"
                    className="w-5 h-5 sm:w-6 sm:h-6 rounded-full object-cover border-2 border-white/30"
                  />
                ) : (
                  <Icon size={20} className="sm:size-22" />
                )}
                <span className="text-[8px] sm:text-[10px] leading-3 font-medium">{item.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    )
  }

  // Desktop View
  if (!isMobile) {
    return (
      <div className="flex h-full w-full">
        <div className="w-[30%] border-r border-gray-200 dark:border-gray-800">
          <Sidebar
            conversations={conversations}
            setConversations={setConversations}
            currentConversation={currentConversation}
            onSelectConversation={handleSelectConversation}
            loading={loading}
            isSelectMode={isSelectMode}
            selectedConversations={selectedConversations}
            toggleConversationSelection={toggleConversationSelection}
            deleteSelectedConversations={deleteSelectedConversations}
            selectAllConversations={selectAllConversations}
            setIsSelectMode={setIsSelectMode}
          />
        </div>
        <div className="flex-1">
          <ChatWindow
            conversation={currentConversation}
            messages={messages}
            setMessages={setMessages}
            onConversationUpdate={handleConversationUpdate}
            setConversations={setConversations}
          />
        </div>
      </div>
    )
  }

  return (
    <div className="h-full w-full">
      {showMobileContactProfile && selectedMobileContact ? (
        <MobileContactProfile 
          contact={selectedMobileContact} 
          onBack={handleMobileContactProfileBack} 
        />
      ) : showFullProfile ? (
        <MobileProfileView />
      ) : !showChat ? (
        <MobileChatList />
      ) : (
        <ChatWindow
          conversation={currentConversation}
          messages={messages}
          setMessages={setMessages}
          onBack={handleBack}
          onContactProfileClick={handleMobileContactProfileClick}
          onConversationUpdate={handleConversationUpdate}
          setConversations={setConversations}
        />
      )}
    </div>
  )
}

export default ChatPage