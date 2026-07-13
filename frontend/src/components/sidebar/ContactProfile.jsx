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
import axios from 'axios'
import toast from 'react-hot-toast'

const ContactProfile = ({ contact, onBack, onBlock, onUnblock, onClearChat }) => {
  const { user } = useAuth()
  const { socket } = useSocket()
  const [isBlocked, setIsBlocked] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clearingChat, setClearingChat] = useState(false)
  const [freshContact, setFreshContact] = useState(contact)

  useEffect(() => {
    if (contact && user) {
      checkBlockStatus()
      fetchFreshUserData()
    }
  }, [contact, user])

  // ✅ Fetch fresh user data including about
  const fetchFreshUserData = async () => {
    try {
      const response = await axios.get(`/api/users/profile/${contact._id}`)
      if (response.data.success) {
        setFreshContact(response.data.user)
      }
    } catch (error) {
      console.error('Fetch fresh user data error:', error)
      setFreshContact(contact)
    }
  }

  const checkBlockStatus = async () => {
    try {
      const response = await axios.get(`/api/users/check-blocked/${contact._id}`)
      setIsBlocked(response.data.isBlocked)
    } catch (error) {
      console.error('Check block status error:', error)
    }
  }

  const handleBlock = async () => {
    if (!contact) return
    
    setLoading(true)
    try {
      await axios.post('/api/users/block', { userId: contact._id })
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
      await axios.post('/api/users/unblock', { userId: contact._id })
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

  // ✅ Clear chat - WITHOUT confirm alert and WITHOUT loading text on button
  const handleClearChat = async () => {
    if (!contact) return
    
    setClearingChat(true)
    try {
      const conversations = await axios.get('/api/conversations')
      const conversation = conversations.data.find(conv => 
        conv.participants?.some(p => p._id === contact._id)
      )
      
      if (conversation) {
        await axios.delete(`/api/users/clear-chat/${conversation._id}`)
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

  const displayContact = freshContact || contact

  const getAvatar = () => {
    return displayContact.avatar || `https://ui-avatars.com/api/?name=${displayContact.name}&background=25D366&color=fff&size=80`
  }

  // Menu sections - arranged professionally with Block/Clear at bottom
  const menuSections = [
    { icon: Users, label: 'Groups in common', onClick: () => toast.info('Groups in common - Coming Soon!') },
    { icon: Plus, label: `Create group with ${displayContact.name}`, onClick: () => toast.info('Create group - Coming Soon!') },
    { icon: Share2, label: 'Share contact', onClick: () => toast.info('Share contact - Coming Soon!') },
    { icon: Heart, label: 'Add to Favourites', onClick: () => toast.info('Add to favourites - Coming Soon!') },
    { icon: Trash2, label: 'Clear chat', onClick: handleClearChat, isDanger: true },
    { 
      icon: isBlocked ? Check : AlertCircle, 
      label: isBlocked ? `Unblock ${displayContact.name}` : `Block ${displayContact.name}`,
      onClick: isBlocked ? handleUnblock : handleBlock,
      isDanger: !isBlocked,
      isSuccess: isBlocked,
      isLast: true
    },
  ]

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A2A32] border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white hover:text-white/80 transition">
            <ArrowLeft size={24} />
          </button>
          <h2 className="text-white text-lg font-semibold">Contact info</h2>
        </div>
        <div className="flex items-center gap-2">
          <button className="text-white hover:text-white/80 transition">
            <MoreVertical size={20} />
          </button>
        </div>
      </div>

      {/* Contact Info */}
      <div className="flex-1 overflow-y-auto">
        {/* Profile Section */}
        <div className="p-4 flex flex-col items-center border-b border-gray-200 dark:border-gray-700">
          <img
            src={getAvatar()}
            alt={displayContact.name}
            className="w-24 h-24 rounded-full object-cover mb-3 border-4 border-[#25D366]"
          />
          <h3 className="text-xl font-semibold text-gray-800 dark:text-white">{displayContact.name}</h3>
          
          {/* ✅ Show real ABOUT from user - NOT status (online/offline) */}
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mt-1">
            {displayContact.about || 'Alhamdulillah ❤️'}
          </p>

          {/* Action Buttons */}
          <div className="flex items-center gap-6 mt-4">
            <button className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Phone size={18} />
              </div>
              <span className="text-[10px]">Audio</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Video size={18} />
              </div>
              <span className="text-[10px]">Video</span>
            </button>
            <button className="flex flex-col items-center gap-1 text-gray-500 dark:text-gray-400 hover:text-[#25D366] transition">
              <div className="w-10 h-10 bg-[#25D366] text-white rounded-full flex items-center justify-center">
                <Search size={18} />
              </div>
              <span className="text-[10px]">Search</span>
            </button>
          </div>
        </div>

        {/* Media, Links, Docs */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Image size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Media, links and docs</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">0</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Star size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Starred messages</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">None</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Settings Section */}
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Bell size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Notifications</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">On</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Palette size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Chat theme</span>
            </div>
            <ChevronRight size={16} className="text-gray-400" />
          </div>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Save size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Save to Photos</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Default</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Clock size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Disappearing messages</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Off</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
          <div className="flex items-center justify-between px-4 py-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800 transition">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                <Lock size={16} className="text-gray-500" />
              </div>
              <span className="text-sm text-gray-700 dark:text-gray-300">Lock chat</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-400">Lock and hide this chat on this device.</span>
              <ChevronRight size={16} className="text-gray-400" />
            </div>
          </div>
        </div>

        {/* Menu Sections */}
        <div className="py-2">
          {menuSections.map((item, index) => (
            <button
              key={index}
              onClick={item.onClick}
              disabled={loading || clearingChat}
              className={`flex items-center gap-3 w-full px-4 py-3 text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition ${
                item.isDanger ? 'text-red-600 dark:text-red-400' : 
                item.isSuccess ? 'text-green-600 dark:text-green-400' :
                'text-gray-700 dark:text-gray-300'
              } ${item.isLast ? 'border-t border-gray-200 dark:border-gray-700 mt-2 pt-3' : ''} ${
                (loading || clearingChat) ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <item.icon size={18} className={
                item.isDanger ? 'text-red-600 dark:text-red-400' : 
                item.isSuccess ? 'text-green-600 dark:text-green-400' :
                'text-gray-500'
              } />
              {item.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ContactProfile