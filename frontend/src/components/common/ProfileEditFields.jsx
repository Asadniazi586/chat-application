import React, { useState, useRef, useEffect } from 'react'
import { Check, Edit2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import api from '../../utils/api'

const ProfileEditFields = ({ user, setUser, onSaveComplete }) => {
  const [isEditing, setIsEditing] = useState(false)
  const [name, setName] = useState(user?.name || '')
  const [about, setAbout] = useState(user?.about || 'Alhamdulillah ❤️')
  const [loading, setLoading] = useState(false)
  
  // ✅ Refs for inputs to maintain focus
  const nameInputRef = useRef(null)
  const aboutInputRef = useRef(null)

  // Update local state when user changes
  useEffect(() => {
    if (user) {
      setName(user.name || '')
      setAbout(user.about || 'Alhamdulillah ❤️')
    }
  }, [user])

  // Handle save profile
  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Name is required')
      return
    }

    setLoading(true)
    try {
      const response = await api.put('/users/profile', { 
        name: name.trim(), 
        about: about.trim() || 'Alhamdulillah ❤️'
      })
      
      if (setUser && response.data.user) {
        setUser(response.data.user)
      }
      
      toast.success('Profile updated!')
      setIsEditing(false)
      onSaveComplete?.()
    } catch (error) {
      console.error('Profile update error:', error)
      toast.error('Failed to update profile')
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    setIsEditing(false)
    setName(user?.name || '')
    setAbout(user?.about || 'Alhamdulillah ❤️')
  }

  // Non-editing view
  if (!isEditing) {
    return (
      <div className="bg-gray-50 dark:bg-[#0B141A] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 space-y-2.5 sm:space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Name</span>
          <span className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white">{name}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">About</span>
          <span className="text-xs sm:text-sm text-gray-800 dark:text-white">{about}</span>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="w-full py-1 sm:py-1.5 text-xs sm:text-sm text-[#25D366] hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition flex items-center justify-center gap-1.5 sm:gap-2"
        >
          <Edit2 size={12} className="sm:size-14" />
          Edit Profile
        </button>
      </div>
    )
  }

  // Editing view
  return (
    <div className="bg-gray-50 dark:bg-[#0B141A] rounded-xl p-3 sm:p-4 mb-3 sm:mb-4 space-y-2.5 sm:space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">Name</span>
        <input
          ref={nameInputRef}
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter name"
          className="text-xs sm:text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-28 sm:w-40"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">About</span>
        <input
          ref={aboutInputRef}
          type="text"
          value={about}
          onChange={(e) => setAbout(e.target.value)}
          placeholder="Enter about"
          className="text-xs sm:text-sm bg-white dark:bg-[#1A2A32] border border-gray-300 dark:border-gray-600 rounded-lg px-2 sm:px-3 py-1 sm:py-1.5 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none w-28 sm:w-40"
          autoComplete="off"
          autoCorrect="off"
          spellCheck="false"
          onTouchStart={(e) => e.stopPropagation()}
          onTouchEnd={(e) => e.stopPropagation()}
        />
      </div>
      <div className="flex gap-2 justify-end">
        <button
          onClick={handleCancel}
          disabled={loading}
          className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm text-gray-600 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleSave}
          disabled={loading}
          className="px-2 sm:px-3 py-0.5 sm:py-1 text-xs sm:text-sm bg-[#25D366] text-white rounded-lg hover:bg-[#20b858] transition flex items-center gap-1 disabled:opacity-50"
        >
          {loading ? (
            <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent" />
          ) : (
            <Check size={12} className="sm:size-14" />
          )}
          Save
        </button>
      </div>
    </div>
  )
}

export default ProfileEditFields