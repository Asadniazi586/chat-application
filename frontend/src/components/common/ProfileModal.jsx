import React, { useState, useEffect, useRef } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { X, Camera, Settings, Edit2, Check, User, Mail, Lock, ChevronRight, Shield, Bell, Moon, LogOut, MessageCircle, Users, Phone } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import Portal from './Portal'

const ProfileModal = ({ isOpen, onClose }) => {
  const { user, logout } = useAuth()
  const [activeSection, setActiveSection] = useState('profile')
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState(user?.name || '')
  const [editAbout, setEditAbout] = useState('Alhamdulillah ❤️')
  const [selectedImage, setSelectedImage] = useState(null)
  const fileInputRef = useRef(null)

  // Menu sections
  const menuSections = {
    general: { icon: Settings, label: 'General' },
    profile: { icon: User, label: 'Profile' },
    account: { icon: Shield, label: 'Account' },
    privacy: { icon: Lock, label: 'Privacy' },
    notifications: { icon: Bell, label: 'Notifications' },
    theme: { icon: Moon, label: 'Theme' }
  }

  // Quick actions
  const quickActions = [
    { icon: MessageCircle, label: 'Send document' },
    { icon: Users, label: 'Add contact' },
    { icon: Phone, label: 'Ask Meta AI' }
  ]

  const handleImageUpload = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    try {
      const formData = new FormData()
      formData.append('avatar', file)
      
      const response = await axios.post('/api/upload/avatar', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      
      setSelectedImage(response.data.url)
      toast.success('Profile picture updated!')
    } catch (error) {
      console.error('Upload error:', error)
      toast.error('Failed to upload image')
    }
  }

  const handleSaveProfile = async () => {
    try {
      await axios.put('/api/users/profile', {
        name: editName,
        about: editAbout,
        avatar: selectedImage
      })
      toast.success('Profile updated!')
      setIsEditing(false)
      // Refresh user data
      window.location.reload()
    } catch (error) {
      toast.error('Failed to update profile')
    }
  }

  if (!isOpen || !user) return null

  return (
    <Portal>
      <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 backdrop-blur-sm">
        <div className="bg-white dark:bg-[#1A2A32] rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
            <h2 className="text-lg font-semibold text-gray-800 dark:text-white">
              {activeSection === 'profile' ? 'Profile' : 
               activeSection === 'general' ? 'General' :
               activeSection === 'account' ? 'Account' :
               activeSection === 'privacy' ? 'Privacy' :
               activeSection === 'notifications' ? 'Notifications' :
               activeSection === 'theme' ? 'Theme' : 'Profile'}
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            >
              <X size={20} className="text-gray-500" />
            </button>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {/* Profile Section */}
            {activeSection === 'profile' && (
              <div className="space-y-6">
                {/* Avatar */}
                <div className="flex flex-col items-center">
                  <div className="relative group">
                    <img
                      src={selectedImage || user?.avatar || `https://ui-avatars.com/api/?name=${user?.name}&background=25D366&color=fff&size=120`}
                      alt={user?.name}
                      className="w-28 h-28 rounded-full object-cover border-4 border-[#25D366]"
                    />
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="absolute bottom-0 right-0 p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition shadow-lg"
                    >
                      <Camera size={16} />
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

                {/* Quick Actions */}
                <div className="grid grid-cols-3 gap-2">
                  {quickActions.map((action, index) => (
                    <button
                      key={index}
                      className="flex flex-col items-center gap-1 p-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
                      onClick={() => toast.info(`${action.label} - Coming Soon!`)}
                    >
                      <action.icon size={20} className="text-[#25D366]" />
                      <span className="text-xs text-gray-600 dark:text-gray-400">{action.label}</span>
                    </button>
                  ))}
                </div>

                {/* Edit Profile */}
                <div className="bg-gray-50 dark:bg-[#0B141A] rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600 dark:text-gray-400">Name</span>
                    {isEditing ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        className="text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none"
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
                        className="text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none"
                      />
                    ) : (
                      <span className="text-sm text-gray-800 dark:text-white">{editAbout}</span>
                    )}
                  </div>
                  {isEditing ? (
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setIsEditing(false)}
                        className="px-4 py-1.5 text-sm text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        className="px-4 py-1.5 text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#20b858] transition flex items-center gap-1"
                      >
                        <Check size={16} />
                        Save
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="w-full py-2 text-sm text-[#25D366] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-2"
                    >
                      <Edit2 size={16} />
                      Edit Profile
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* General Section */}
            {activeSection === 'general' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Startup and close</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Chat settings</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            )}

            {/* Account Section */}
            {activeSection === 'account' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Security notifications</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Account info</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <button
                  onClick={logout}
                  className="w-full text-left p-3 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition text-red-600 dark:text-red-400"
                >
                  <span className="text-sm font-medium">Log out</span>
                </button>
              </div>
            )}

            {/* Privacy Section */}
            {activeSection === 'privacy' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Blocked contacts</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Disappearing messages</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            )}

            {/* Notifications Section */}
            {activeSection === 'notifications' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Messages</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Groups</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Sounds</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            )}

            {/* Theme Section */}
            {activeSection === 'theme' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Light</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Dark</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
                <div className="flex items-center justify-between p-3 hover:bg-gray-50 dark:hover:bg-gray-800 rounded-lg transition cursor-pointer">
                  <span className="text-sm text-gray-700 dark:text-gray-300">System default</span>
                  <ChevronRight size={16} className="text-gray-400" />
                </div>
              </div>
            )}
          </div>

          {/* Bottom Menu */}
          <div className="border-t border-gray-200 dark:border-gray-700 p-2 flex flex-wrap gap-1 flex-shrink-0">
            {Object.entries(menuSections).map(([key, { icon: Icon, label }]) => (
              <button
                key={key}
                onClick={() => setActiveSection(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition ${
                  activeSection === key
                    ? 'bg-[#25D366] text-white'
                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <Icon size={16} />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
    </Portal>
  )
}

export default ProfileModal