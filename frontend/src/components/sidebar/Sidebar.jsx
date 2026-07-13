import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import SearchBar from './SearchBar'
import ChatList from '../chat/ChatList'
import ProfileSidebar from './ProfileSidebar'
import { 
  LogOut, Sun, Moon, Plus, MessageCircle, 
  Users, Phone, Settings, Camera, Search, 
  CircleUser, Circle, MessageSquare, PhoneCall,
  Trash2, CheckSquare, Square, X
} from 'lucide-react'
import toast from 'react-hot-toast'
import axios from 'axios'

const Sidebar = ({ 
  conversations = [], 
  setConversations,
  currentConversation = null, 
  onSelectConversation = () => {}, 
  loading = false,
  isSelectMode = false,
  selectedConversations = [],
  toggleConversationSelection = () => {},
  deleteSelectedConversations = () => {},
  selectAllConversations = () => {},
  setIsSelectMode = () => {}
}) => {
  const { user, setUser, logout } = useAuth()
  const { socket } = useSocket()
  const [isDark, setIsDark] = useState(() => {
    return localStorage.getItem('theme') === 'dark'
  })
  const [showSearch, setShowSearch] = useState(false)
  const [activeTab, setActiveTab] = useState('chats')
  const [showProfile, setShowProfile] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAbout, setEditAbout] = useState('')

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', isDark ? 'dark' : 'light')
  }, [isDark])

  // ✅ Load user data when user changes
  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditAbout(user.about || 'Alhamdulillah ❤️')
    }
  }, [user])

  // Listen for profile open event
  useEffect(() => {
    const handleOpenProfile = () => {
      setShowProfile(true)
    }
    document.addEventListener('openProfile', handleOpenProfile)
    return () => {
      document.removeEventListener('openProfile', handleOpenProfile)
    }
  }, [])

  const toggleTheme = () => {
    const newTheme = !isDark
    setIsDark(newTheme)
    localStorage.setItem('theme', newTheme ? 'dark' : 'light')
    document.documentElement.setAttribute('data-theme', newTheme ? 'dark' : 'light')
  }

  const handleLogout = () => {
    if (socket && user) {
      socket.emit('user-offline', user._id)
    }
    logout()
  }

  // ✅ Handle save profile
  const handleSaveProfile = async () => {
    try {
      const response = await axios.put('/api/users/profile', { 
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

  // ✅ Get user avatar with fallback
  const getUserAvatar = () => {
    if (user?.avatar) {
      return user.avatar
    }
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=24`
  }

  // Bottom navigation items
  const navItems = [
    { 
      id: 'chats', 
      icon: MessageCircle, 
      label: 'Chats',
      onClick: () => {
        setActiveTab('chats')
        setShowProfile(false)
      }
    },
    { 
      id: 'status', 
      icon: Circle, 
      label: 'Status',
      onClick: () => {
        setActiveTab('status')
        setShowProfile(false)
        toast.info('📱 Status - Coming Soon!', { icon: '🚀' })
      }
    },
    { 
      id: 'calls', 
      icon: PhoneCall, 
      label: 'Calls',
      onClick: () => {
        setActiveTab('calls')
        setShowProfile(false)
        toast.info('📞 Calls - Coming Soon!', { icon: '🚀' })
      }
    },
    { 
      id: 'profile', 
      icon: CircleUser, 
      label: 'Profile',
      onClick: () => {
        setActiveTab('profile')
        setShowProfile(true)
      }
    }
  ]

  // If profile is active, show ProfileSidebar
  if (showProfile) {
    return (
      <ProfileSidebar 
        onBack={() => {
          setShowProfile(false)
          setActiveTab('chats')
        }} 
      />
    )
  }

  const avatarUrl = getUserAvatar()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A2A32] border-r border-gray-200 dark:border-gray-800">
      {/* Header - WhatsApp Style */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
        <h1 className="text-white text-xl font-semibold">WhatsApp</h1>
        <div className="flex items-center gap-2">
          {isSelectMode ? (
            <>
              <button
                onClick={selectAllConversations}
                className="text-white hover:text-white/80 transition"
                title="Select all"
              >
                {selectedConversations.length === conversations.length ? (
                  <CheckSquare size={20} />
                ) : (
                  <Square size={20} />
                )}
              </button>
              <button
                onClick={deleteSelectedConversations}
                className={`text-white hover:text-white/80 transition ${
                  selectedConversations.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                disabled={selectedConversations.length === 0}
                title="Delete selected"
              >
                <Trash2 size={20} />
              </button>
              <button
                onClick={() => {
                  setIsSelectMode(false)
                }}
                className="text-white hover:text-white/80 transition"
                title="Cancel selection"
              >
                <X size={20} />
              </button>
            </>
          ) : (
            <>
              <button
                onClick={toggleTheme}
                className="text-white hover:text-white/80 transition p-1"
                title="Toggle theme"
              >
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
              </button>
              <button
                onClick={() => {
                  if (conversations.length > 0) {
                    setIsSelectMode(true)
                  } else {
                    toast.info('No conversations to select')
                  }
                }}
                className="text-white hover:text-white/80 transition p-1"
                title="Select conversations"
              >
                <CheckSquare size={18} />
              </button>
              <button
                onClick={handleLogout}
                className="text-white hover:text-white/80 transition p-1"
                title="Logout"
              >
                <LogOut size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs - All, Unread, Favourites, Groups */}
      <div className="bg-white dark:bg-[#1A2A32] border-b border-gray-200 dark:border-gray-800 flex-shrink-0 px-2 py-1">
        <div className="flex gap-1 overflow-x-auto">
          {['All', 'Unread', 'Favourites', 'Groups'].map((tab) => (
            <button
              key={tab}
              onClick={() => {
                if (tab === 'Unread') {
                  toast.info('📬 Unread messages - Coming Soon!', { icon: '🚀' })
                } else if (tab === 'Favourites') {
                  toast.info('⭐ Favourites - Coming Soon!', { icon: '🚀' })
                } else if (tab === 'Groups') {
                  toast.info('👥 Groups - Coming Soon!', { icon: '🚀' })
                }
              }}
              className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap transition ${
                tab === 'All'
                  ? 'bg-[#25D366] text-white'
                  : 'text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-2 bg-white dark:bg-[#1A2A32] flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1">
            <SearchBar
              onSelectConversation={onSelectConversation}
              showSearch={showSearch}
              setShowSearch={setShowSearch}
              conversations={conversations}
            />
          </div>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="p-2 bg-[#25D366] text-white rounded-lg hover:bg-[#20b858] transition flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>

      {/* Chat List - Scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ChatList
          conversations={conversations}
          setConversations={setConversations}
          currentConversation={currentConversation}
          onSelectConversation={onSelectConversation}
          loading={loading}
          isSelectMode={isSelectMode}
          selectedConversations={selectedConversations}
          toggleConversationSelection={toggleConversationSelection}
        />
      </div>

      {/* ✅ Bottom Navigation - WhatsApp Style with User Avatar and Edit */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A2A32]">
        <div className="flex items-center justify-around py-2 px-2">
          {navItems.map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.id
            
            return (
              <button
                key={item.id}
                onClick={item.onClick}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition group relative ${
                  isActive 
                    ? 'text-[#25D366]' 
                    : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                <div className="relative">
                  {item.id === 'profile' ? (
                    <img
                      src={avatarUrl}
                      alt="Profile"
                      className={`w-6 h-6 rounded-full object-cover border-2 ${
                        isActive ? 'border-[#25D366]' : 'border-transparent'
                      }`}
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=24`
                      }}
                    />
                  ) : (
                    <Icon 
                      size={22} 
                      className={`transition ${isActive ? 'text-[#25D366]' : ''}`}
                    />
                  )}
                </div>
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#25D366]' : ''}`}>
                  {item.label}
                </span>
                {isActive && (
                  <div className="absolute top-0 left-0 right-0 bottom-0 bg-[#25D366]/5 rounded-lg -z-10" />
                )}
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Sidebar