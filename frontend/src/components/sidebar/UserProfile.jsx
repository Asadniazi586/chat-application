import React, { useState } from 'react'
import { useAuth } from '../../hooks/useAuth'
import { Edit2 } from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const UserProfile = () => {
  const { user, setUser } = useAuth()  // ✅ Get setUser
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')
  const [editAbout, setEditAbout] = useState('')

  React.useEffect(() => {
    if (user) {
      setEditName(user.name || '')
      setEditAbout(user.about || 'Alhamdulillah ❤️')
    }
  }, [user])

  const handleSaveProfile = async () => {
    try {
      const response = await axios.put('/api/users/profile', { 
        name: editName, 
        about: editAbout 
      })
      
      // ✅ Update user with response data
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

  if (!user) return null

  return (
    <div className="p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-[#1A2A32]">
      <div className="flex items-center gap-3">
        <img
          src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=25D366&color=fff&size=40`}
          alt={user.name}
          className="w-12 h-12 rounded-full object-cover"
          onError={(e) => {
            e.target.onerror = null
            e.target.src = `https://ui-avatars.com/api/?name=${user.name}&background=25D366&color=fff&size=40`
          }}
        />
        <div className="flex-1 min-w-0">
          {isEditing ? (
            <div className="space-y-2">
              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none"
                placeholder="Enter name"
              />
              <input
                value={editAbout}
                onChange={(e) => setEditAbout(e.target.value)}
                className="w-full text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-600 rounded px-2 py-1 text-gray-800 dark:text-white focus:ring-2 focus:ring-[#25D366] outline-none"
                placeholder="Enter about"
              />
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setIsEditing(false)
                    setEditName(user.name || '')
                    setEditAbout(user.about || 'Alhamdulillah ❤️')
                  }}
                  className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="text-xs text-[#25D366] hover:text-[#20b858] font-medium"
                >
                  Save
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="font-semibold text-gray-800 dark:text-white text-sm truncate">
                {user.name}
              </p>
              <div className="flex items-center gap-2">
                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                  {user.about || 'Alhamdulillah ❤️'}
                </p>
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-gray-400 hover:text-[#25D366] transition flex-shrink-0"
                >
                  <Edit2 size={12} />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

export default UserProfile