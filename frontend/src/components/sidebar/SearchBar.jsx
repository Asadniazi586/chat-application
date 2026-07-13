import React, { useState, useEffect, useRef } from 'react'
import axios from 'axios'
import { Search, X, UserPlus, Loader, UserCheck } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import api from '../../utils/api'  // ✅ Add this
const SearchBar = ({ onSelectConversation, showSearch, setShowSearch, conversations = [] }) => {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const { user } = useAuth()
  const searchRef = useRef(null)

  // ✅ Create a Set of existing user IDs from conversations
  const existingUserIds = new Set()
  conversations.forEach(conv => {
    if (!conv.isGroup && conv.participants) {
      conv.participants.forEach(p => {
        if (p._id !== user?._id) {
          existingUserIds.add(p._id)
        }
      })
    }
  })

  // ✅ Click outside - CLEAR SEARCH TEXT AND RESULTS
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowSearch(false)
        setResults([])
        setQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [setShowSearch])

  useEffect(() => {
    const searchUsers = async () => {
      if (!query.trim() || query.length < 2) {
        setResults([])
        return
      }

      setLoading(true)
      try {
        console.log('🔍 Searching for:', query)
       const response = await api.get(`/auth/search?q=${query}`)
        console.log('✅ Search results:', response.data)
        
        // Filter out current user
        const filtered = response.data.filter(u => u._id !== user._id)
        setResults(filtered)
      } catch (error) {
        console.error('❌ Search error:', error)
        console.error('❌ Error response:', error.response?.data)
        toast.error('Failed to search users')
      } finally {
        setLoading(false)
      }
    }

    const debounce = setTimeout(searchUsers, 500)
    return () => clearTimeout(debounce)
  }, [query, user._id])

  const startConversation = async (selectedUser) => {
    // ✅ Check if user already exists in conversations
    if (existingUserIds.has(selectedUser._id)) {
      toast.info(`Already chatting with ${selectedUser.name}`)
      setShowSearch(false)
      setQuery('')
      setResults([])
      return
    }

    setSearching(true)
    try {
      console.log('💬 Starting conversation with:', selectedUser)
     const response = await api.post('/conversations', {
  participantId: selectedUser._id
})
      
      const conversation = response.data
      console.log('✅ Conversation created:', conversation)
      
      // ✅ Add conversation to sidebar WITHOUT opening chat
      onSelectConversation(conversation, true)  // true = don't open chat
      
      setShowSearch(false)
      setQuery('')
      setResults([])
      toast.success(`Started chat with ${selectedUser.name}`)
    } catch (error) {
      // ✅ Handle duplicate conversation error
      if (error.response?.status === 400 && error.response?.data?.message?.includes('already exists')) {
        toast.info(`Already chatting with ${selectedUser.name}`)
        setShowSearch(false)
        setQuery('')
        setResults([])
      } else {
        console.error('❌ Start conversation error:', error)
        toast.error('Failed to start conversation')
      }
    } finally {
      setSearching(false)
    }
  }

  if (!showSearch) {
    return (
      <div 
        className="flex items-center gap-3 px-4 py-2 bg-gray-100 dark:bg-[#0B141A] rounded-lg cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-800 transition"
        onClick={() => setShowSearch(true)}
      >
        <Search size={18} className="text-gray-500" />
        <span className="text-gray-500 dark:text-gray-400 text-sm">Search or start new chat</span>
      </div>
    )
  }

  return (
    <div ref={searchRef} className="relative">
      <div className="flex items-center bg-gray-100 dark:bg-[#0B141A] rounded-lg px-3">
        <Search size={18} className="text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or email..."
          className="flex-1 bg-transparent px-3 py-2 outline-none text-sm dark:text-white placeholder-gray-400"
          autoFocus
        />
        {query && (
          <button
            onClick={() => setQuery('')}
            className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={16} className="text-gray-500" />
          </button>
        )}
      </div>

      {/* Search Results */}
      {query.length >= 2 && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-[#1A2A32] rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 max-h-64 overflow-y-auto z-50">
          {loading ? (
            <div className="flex items-center justify-center p-4">
              <Loader className="animate-spin text-[#25D366]" size={24} />
            </div>
          ) : results.length > 0 ? (
            results.map((result) => {
              const isAlreadyAdded = existingUserIds.has(result._id)
              
              return (
                <div
                  key={result._id}
                  className={`flex items-center justify-between p-3 ${
                    isAlreadyAdded 
                      ? 'opacity-50 cursor-not-allowed' 
                      : 'hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer'
                  } transition`}
                  onClick={() => {
                    if (!isAlreadyAdded) {
                      startConversation(result)
                    }
                  }}
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={result.avatar || `https://ui-avatars.com/api/?name=${result.name}&background=25D366&color=fff&size=32`}
                      alt={result.name}
                      className="w-10 h-10 rounded-full object-cover"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${result.name}&background=25D366&color=fff&size=32`
                      }}
                    />
                    <div>
                      <p className="font-medium text-gray-800 dark:text-white text-sm">{result.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{result.email}</p>
                    </div>
                  </div>
                  <button
                    className={`p-2 rounded-lg transition flex-shrink-0 ${
                      isAlreadyAdded 
                        ? 'bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 cursor-not-allowed' 
                        : 'bg-[#25D366] text-white hover:bg-[#20b858]'
                    }`}
                    disabled={isAlreadyAdded || searching}
                    onClick={(e) => {
                      e.stopPropagation()
                      if (!isAlreadyAdded) {
                        startConversation(result)
                      }
                    }}
                  >
                    {isAlreadyAdded ? (
                      <UserCheck size={16} />
                    ) : searching ? (
                      <Loader className="animate-spin" size={16} />
                    ) : (
                      <UserPlus size={16} />
                    )}
                  </button>
                </div>
              )
            })
          ) : (
            <div className="p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
              No users found
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default SearchBar