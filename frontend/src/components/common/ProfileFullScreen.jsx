import React, { useState, useRef, useEffect } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import { 
  ArrowLeft, Camera, Edit2, Check, LogOut,
  ChevronRight, Shield, Bell, Moon, User, Lock, Settings, HelpCircle
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const ProfileFullScreen = ({ onClose }) => {
  const { user, setUser, logout } = useAuth()
  const { socket } = useSocket()
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editAbout, setEditAbout] = useState('Alhamdulillah ❤️')
  const [selectedImage, setSelectedImage] = useState(null)
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef(null)

  useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      if (user.avatar) {
        setSelectedImage(user.avatar)
      }
    }
  }, [user])

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
      await axios.put('/api/users/profile', { 
        name: editName, 
        about: editAbout 
      })
      
      if (setUser) {
        setUser({ ...user, name: editName, about: editAbout })
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

  const menuSections = [
    { icon: Settings, label: 'General' },
    { icon: User, label: 'Profile' },
    { icon: Shield, label: 'Account' },
    { icon: Lock, label: 'Privacy' },
    { icon: Bell, label: 'Notifications' },
    { icon: Moon, label: 'Theme' },
    { icon: HelpCircle, label: 'Help and feedback' }
  ]

  const avatarUrl = getAvatarUrl()

  return (
    <div className="fixed inset-0 z-[200] bg-white dark:bg-[#1A2A32] flex flex-col">
      {/* Header */}
      <div className="flex items-center px-4 py-3 bg-[#075E54] dark:bg-[#1A2A32] flex-shrink-0">
        <button onClick={onClose} className="text-white hover:text-white/80 transition mr-3">
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
              className="w-28 h-28 rounded-full object-cover border-4 border-[#25D366]"
              onError={(e) => {
                e.target.onerror = null
                e.target.src = `https://ui-avatars.com/api/?name=${user?.name || 'User'}&background=25D366&color=fff&size=120`
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              className="absolute bottom-0 right-0 p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition shadow-lg disabled:opacity-50"
            >
              {uploading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
              ) : (
                <Camera size={16} />
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
          <h3 className="mt-3 text-xl font-semibold text-gray-800 dark:text-white">
            {user?.name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{editAbout}</p>
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
              <span className="text-sm text-gray-800 dark:text-white">{editAbout}</span>
            )}
          </div>
          {isEditing ? (
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setIsEditing(false)}
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
          {menuSections.map((section, index) => {
            const Icon = section.icon
            return (
              <button
                key={index}
                onClick={() => toast.info(`${section.label} - Coming Soon!`, { icon: '🚀' })}
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
    </div>
  )
}

export default ProfileFullScreen