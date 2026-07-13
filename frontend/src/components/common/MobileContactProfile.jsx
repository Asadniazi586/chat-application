import React, { useState, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { 
  ArrowLeft, Phone, Video, Search, MoreVertical, 
  Image, FileText, Star, Bell, Palette, Save,
  Lock, Users, Plus, Share2, Heart, List, 
  FileDown, Trash2, AlertCircle, MessageCircle,
  User, Clock, Info, ChevronRight, X, Check
} from 'lucide-react'
import api from '../../utils/api'
import toast from 'react-hot-toast'

const MobileContactProfile = ({ contact, onBack, onBlock, onUnblock, onClearChat }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clearingChat, setClearingChat] = useState(false)

  useEffect(() => {
    if (contact && user) {
      checkBlockStatus()
    }
  }, [contact, user])

  const checkBlockStatus = async () => {
    try {
      const response = await api.get(`/users/check-blocked/${contact._id}`)
      setIsBlocked(response.data.isBlocked)
    } catch (error) {
      console.error('Check block status error:', error)
    }
  }

  const handleBlock = async () => {
    if (!contact) return
    
    setLoading(true)
    try {
      await api.post('/users/block', { userId: contact._id })
      setIsBlocked(true)
      toast.success(`${contact.name} blocked successfully`)
      
      if (socket) {
        socket.emit('user-blocked', { userId: contact._id })
      }
      
      onBlock?.(contact._id)
    } catch (error) {
      console.error('Block error:', error)
      toast.error(error.response?.data?.message || 'Failed to block user')
    } finally {
      setLoading(false)
    }
  }

  const handleUnblock = async () => {
    if (!contact) return
    
    setLoading(true)
    try {
      await api.post('/users/unblock', { userId: contact._id })
      setIsBlocked(false)
      toast.success(`${contact.name} unblocked successfully`)
      
      onUnblock?.(contact._id)
    } catch (error) {
      console.error('Unblock error:', error)
      toast.error(error.response?.data?.message || 'Failed to unblock user')
    } finally {
      setLoading(false)
    }
  }

  const handleClearChat = async () => {
    if (!contact) return
    
    setClearingChat(true)
    try {
      const conversations = await api.get('/conversations')
      const conversation = conversations.data.find(conv => 
        conv.participants?.some(p => p._id === contact._id)
      )
      
      if (conversation) {
        await api.delete(`/users/clear-chat/${conversation._id}`)
        toast.success('Chat cleared')
        
        if (socket) {
          socket.emit('clear-chat', { 
            conversationId: conversation._id 
          })
        }
        
        onClearChat?.()
        onBack?.()
      }
    } catch (error) {
      console.error('Clear chat error:', error)
      toast.error('Failed to clear chat')
    } finally {
      setClearingChat(false)
    }
  }

  if (!contact) return null

  const getAvatar = () => {
    return contact.avatar || `https://ui-avatars.com/api/?name=${contact.name}&background=25D366&color=fff&size=80`
  }

  const menuSections = [
    { icon: Users, label: 'Groups in common', onClick: () => toast.info('Groups in common - Coming Soon!') },
    { icon: Plus, label: `Create group with ${contact.name}`, onClick: () => toast.info('Create group - Coming Soon!') },
    { icon: Share2, label: 'Share contact', onClick: () => toast.info('Share contact - Coming Soon!') },
    { icon: Heart, label: 'Add to Favourites', onClick: () => toast.info('Add to favourites - Coming Soon!') },
    { icon: Trash2, label: 'Clear chat', onClick: handleClearChat, isDanger: true },
    { 
      icon: isBlocked ? Check : AlertCircle, 
      label: isBlocked ? `Unblock ${contact.name}` : `Block ${contact.name}`,
      onClick: isBlocked ? handleUnblock : handleBlock,
      isDanger: !isBlocked,
      isSuccess: isBlocked,
      isLast: true
    },
  ]

  // Bottom navigation items
  const bottomNavItems = [
    { id: 'updates', icon: Users, label: 'Updates' },
    { id: 'calls', icon: Phone, label: 'Calls' },
    { id: 'chats', icon: MessageCircle, label: 'Chats' },
    { id: 'profile', icon: User, label: 'Profile', isAvatar: true },
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A2A32]">
      {/* Header */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
        <div className="flex items-center gap-2 sm:gap-3">
          <button onClick={onBack} className="text-white hover:text-white/80 transition p-1">
            <ArrowLeft size={20} className="sm:size-24" />
          </button>
          <h2 className="text-white text-base sm:text-lg font-semibold">Contact info</h2>
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <button className="text-white hover:text-white/80 transition p-1">
            <MoreVertical size={18} className="sm:size-20" />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-3 sm:p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
          <img
            src={getAvatar()}
            alt={contact.name}
            className="w-20 h-20 sm:w-24 sm:h-24 rounded-full object-cover mb-2 sm:mb-3 border-4 border-[#25D366]"
          />
          <h3 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-white">{contact.name}</h3>
          
          <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center mt-0.5 sm:mt-1">
            {contact.about || 'Alhamdulillah ❤️'}
          </p>

          <div className="flex items-center gap-4 sm:gap-6 mt-3 sm:mt-4">
            <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Phone size={16} className="sm:size-18" />
              </div>
              <span className="text-[9px] sm:text-[10px]">Audio</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Video size={16} className="sm:size-18" />
              </div>
              <span className="text-[9px] sm:text-[10px]">Video</span>
            </button>
            <button className="flex flex-col items-center gap-0.5 sm:gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-9 h-9 sm:w-10 sm:h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Search size={16} className="sm:size-18" />
              </div>
              <span className="text-[9px] sm:text-[10px]">Search</span>
            </button>
          </div>
        </div>

        {/* Media, Links, Docs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Image size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Media, links and docs</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-400">0</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Star size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Starred messages</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-400">None</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Bell size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Notifications</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-400">On</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Palette size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Chat theme</span>
            </div>
            <ChevronRight size={14} className="sm:size-16 text-gray-400" />
          </div>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Save size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Save to Photos</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-400">Default</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Clock size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Disappearing messages</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-xs sm:text-sm text-gray-400">Off</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-3 sm:px-4 py-2.5 sm:py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-2.5 sm:gap-3">
              <div className="w-7 h-7 sm:w-8 sm:h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Lock size={14} className="sm:size-16 text-gray-500" />
              </div>
              <span className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">Lock chat</span>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <span className="text-[10px] sm:text-sm text-gray-400">Lock and hide this chat on this device.</span>
              <ChevronRight size={14} className="sm:size-16 text-gray-400" />
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="py-1.5 sm:py-2 pb-20">
          {menuSections.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              disabled={loading || clearingChat}
              className={`flex items-center gap-2.5 sm:gap-3 w-full px-3 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                item.isDanger ? 'text-red-600 dark:text-red-400' : 
                item.isSuccess ? 'text-green-600 dark:text-green-400' :
                'text-gray-700 dark:text-gray-300'
              } ${item.isLast ? 'border-t border-gray-200 dark:border-gray-700 mt-1.5 sm:mt-2 pt-2.5 sm:pt-3' : ''} ${
                (loading || clearingChat) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <item.icon size={16} className={`sm:size-18 ${
                item.isDanger ? 'text-red-600 dark:text-red-400' : 
                item.isSuccess ? 'text-green-600 dark:text-green-400' :
                'text-gray-500'
              }`} />
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* ✅ BOTTOM NAVIGATION - Contact Profile page */}
      <div className="contact-profile-bottom-nav">
        {bottomNavItems.map((item) => {
          const Icon = item.icon
          const isActive = item.id === 'chats'
          const isAvatar = item.isAvatar
          
          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'chats') {
                  onBack?.()
                } else {
                  toast.info(`${item.label} - Coming Soon!`, { icon: '🚀' })
                }
              }}
              className="bottom-nav-item flex flex-col items-center gap-0.5 px-2 sm:px-4 py-0.5 transition touch-manipulation"
              style={{
                minWidth: '48px',
                minHeight: '48px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '4px 8px',
                touchAction: 'manipulation',
                color: isActive ? 'white' : 'rgba(255,255,255,0.6)'
              }}
            >
              {isAvatar ? (
                <img
                  src={getAvatar()}
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

export default MobileContactProfile