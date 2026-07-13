import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { 
  ArrowLeft, Camera, Edit2, Check, User, Lock, 
  ChevronRight, Shield, Bell, Moon, LogOut, 
  CircleUser, Circle, MessageSquare, PhoneCall
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ProfileSidebar = ({ onBack }) => {
  const { user, setUser, logout } = useAuth()
  const { socket } = useSocket()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editAbout, setEditAbout] = useState(user?.about || 'Alhamdulillah ❤️')
  const [selectedImage, setSelectedImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

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

  // Compress image before upload
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
  };

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
      
      const response = await axios.post('/api/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      if (response.data.success) {
        const avatarUrl = response.data.url
        setSelectedImage(avatarUrl)
        
        await axios.put('/api/users/profile', { avatar: avatarUrl })
        
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

  const handleLogout = () => {
    if (socket && user) {
      socket.emit('user-offline', user._id)
    }
    logout()
  }

  const getAvatarUrl = () => {
    if (selectedImage) return selectedImage
    if (user?.avatar) return user.avatar
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=100`
  }

  const getSmallAvatar = () => {
    if (selectedImage) return selectedImage
    if (user?.avatar) return user.avatar
    return `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=24`
  }

  const menuSections = [
    { id: 'profile', icon: User, label: 'Profile' },
    { id: 'account', icon: Shield, label: 'Account' },
    { id: 'privacy', icon: Lock, label: 'Privacy' },
    { id: 'notifications', icon: Bell, label: 'Notifications' },
    { id: 'theme', icon: Moon, label: 'Theme' }
  ]

  const avatarUrl = getAvatarUrl()
  const smallAvatar = getSmallAvatar()

  return (
    <div className="flex flex-col h-full bg-white dark:bg-[#1A2A32] border-r border-gray-200 dark:border-gray-800">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
        <button onClick={onBack} className="text-white hover:text-white/80 transition mr-3">
          <ArrowLeft size={24} />
        </button>
        <h2 className="text-white text-lg font-semibold">Profile</h2>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Avatar */}
        <div className="flex flex-col items-center mb-6">
          <div className="relative group">
            <img
              src={avatarUrl}
              alt={user?.name}
              className="w-24 h-24 rounded-full object-cover border-4 border-[#25D366]"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=100`
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-1.5 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition shadow-lg disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={14} />
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
          <h3 className="mt-2 text-lg font-semibold text-gray-800 dark:text-white">
            {user?.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            {user?.about || 'Alhamdulillah ❤️'}
          </p>
        </div>

        {/* Edit Profile */}
        <div className="bg-gray-50 dark:bg-[#0B141A] rounded-xl p-4 mb-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
            {isEditing ? (
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-40"
              />
            ) : (
              <span className="text-sm font-medium text-gray-800 dark:text-white">{user?.name}</span>
            )}
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">About</span>
            {isEditing ? (
              <input
                value={editAbout}
                onChange={(e) => setEditAbout(e.target.value)}
                className="text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-40"
              />
            ) : (
              <span className="text-sm text-gray-800 dark:text-white">{user?.about || 'Alhamdulillah ❤️'}</span>
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
                className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveProfile}
                className="px-3 py-1 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#20b858] transition flex items-center gap-1"
              >
                <Check size={14} />
                Save
              </button>
            </div>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="w-full py-1.5 text-sm text-[#25D366] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
            >
              <Edit2 size={14} />
              Edit Profile
            </button>
          )}
        </div>

        {/* Menu Sections */}
        <div className="space-y-1">
          {menuSections.map((section) => {
            const Icon = section.icon
            return (
              <button
                key={section.id}
                onClick={() => {
                  toast.info(`${section.label} - Coming Soon!`, { icon: '🚀' })
                }}
                className="flex items-center justify-between w-full p-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className="text-gray-500 dark:text-gray-400" />
                  <span className="text-sm text-gray-700 dark:text-gray-300">{section.label}</span>
                </div>
                <ChevronRight size={16} className="text-gray-400" />
              </button>
            )
          })}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full mt-4 p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition text-red-600 dark:text-red-400 flex items-center gap-3"
        >
          <LogOut size={18} />
          <span className="text-sm font-medium">Log out</span>
        </button>
      </div>

      {/* Bottom Nav - With Profile Avatar */}
      <div className="flex-shrink-0 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A2A32]">
        <div className="flex items-center justify-around py-2 px-2">
          {[
            { id: 'chats', icon: MessageSquare, label: 'Chats', onClick: onBack },
            { id: 'status', icon: Circle, label: 'Status', onClick: () => toast.info('📱 Status - Coming Soon!', { icon: '🚀' }) },
            { id: 'calls', icon: PhoneCall, label: 'Calls', onClick: () => toast.info('📞 Calls - Coming Soon!', { icon: '🚀' }) },
            { id: 'profile', icon: null, label: 'Profile', isAvatar: true }
          ].map((item) => {
            const Icon = item.icon
            const isActive = item.id === 'profile'
            
            return (
              <button
                key={item.id}
                onClick={item.onClick || (() => {})}
                className={`flex flex-col items-center gap-0.5 px-3 py-1 rounded-lg transition ${
                  isActive ? 'text-[#25D366]' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                }`}
              >
                {item.isAvatar ? (
                  <img
                    src={smallAvatar}
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
                  <Icon size={20} />
                )}
                <span className={`text-[10px] font-medium ${isActive ? 'text-[#25D366]' : ''}`}>
                  {item.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default ProfileSidebar