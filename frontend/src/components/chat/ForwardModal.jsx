import React, { useState, useEffect } from 'react'
import { X, Send, Check, Loader } from 'lucide-react'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import { useSocket } from '../../hooks/useSocket'
import api from '../../utils/api' // ✅ Add this import

const ForwardModal = ({ message, onClose, onForward, setConversations }) => {
  const [conversations, setConversationsLocal] = useState([])
  const [selectedIds, setSelectedIds] = useState([])
  const [loading, setLoading] = useState(false)
  const [sending, setSending] = useState(false)
  const { user } = useAuth()
  const { socket } = useSocket()

  useEffect(() => {
    const loadConversations = async () => {
      setLoading(true)
      try {
        // ✅ FIXED: Use api instead of axios
        const response = await api.get('/conversations')
        console.log('📥 Conversations loaded:', response.data.length)
        
        // Filter out current conversation
        const filtered = response.data.filter(
          conv => conv._id !== message.conversation
        )
        setConversationsLocal(filtered)
      } catch (error) {
        console.error('Error loading conversations:', error)
        toast.error('Failed to load conversations')
      } finally {
        setLoading(false)
      }
    }
    loadConversations()
  }, [message.conversation])

  const toggleSelect = (id) => {
    setSelectedIds(prev => 
      prev.includes(id) 
        ? prev.filter(item => item !== id)
        : [...prev, id]
    )
  }

  const handleForward = async () => {
    if (selectedIds.length === 0) {
      toast.error('Select at least one conversation')
      return
    }

    setSending(true)
    try {
      for (const convId of selectedIds) {
        // ✅ FIXED: Use api instead of axios
        await api.post(`/messages/${message._id}/forward`, {
          conversationId: convId
        })
      }
      
      // ✅ Update conversations immediately
      if (setConversations) {
        // ✅ FIXED: Use api instead of axios
        const response = await api.get('/conversations')
        setConversations(response.data)
      }
      
      // ✅ Also emit socket event for real-time update
      if (socket && selectedIds.length > 0) {
        const targetConvId = selectedIds[0]
        socket.emit('forward-message', {
          originalMessageId: message._id,
          targetConversationId: targetConvId,
          senderId: user._id,
          content: message.content
        })
        console.log(`📤 Forward-message socket emitted for conversation: ${targetConvId}`)
      }
      
      toast.success(`Message forwarded to ${selectedIds.length} conversation${selectedIds.length > 1 ? 's' : ''}`)
      onForward?.()
      onClose()
    } catch (error) {
      console.error('Forward error:', error)
      toast.error(error.response?.data?.message || 'Failed to forward message')
    } finally {
      setSending(false)
    }
  }

  const getConversationName = (conv) => {
    if (conv.isGroup) return conv.groupName || 'Group'
    const other = conv.participants?.find(p => p._id !== user._id)
    return other?.name || 'Unknown'
  }

  const getConversationAvatar = (conv) => {
    if (conv.isGroup) {
      return `https://ui-avatars.com/api/?name=Group&background=25D366&color=fff&size=32`
    }
    const other = conv.participants?.find(p => p._id !== user._id)
    return other?.avatar || `https://ui-avatars.com/api/?name=${other?.name || 'U'}&background=25D366&color=fff&size=32`
  }

  // ✅ Get other participant for better display
  const getOtherParticipant = (conv) => {
    if (conv.isGroup) return null
    return conv.participants?.find(p => p._id !== user._id)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-[#1A2A32] rounded-2xl max-w-md w-full mx-auto shadow-2xl max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">
            Forward Message
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
          >
            <X size={20} className="text-gray-500" />
          </button>
        </div>

        {/* Message Preview */}
        <div className="p-4 bg-gray-50 dark:bg-[#0B141A] mx-4 mt-4 rounded-xl">
          <p className="text-xs text-gray-500 dark:text-gray-400">Message to forward:</p>
          <p className="text-sm text-gray-800 dark:text-white mt-1 line-clamp-2 break-words">
            {message.content}
          </p>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader className="animate-spin text-[#25D366]" size={32} />
            </div>
          ) : conversations.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                No conversations to forward to
              </p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                Start a new chat first
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {conversations.map((conv) => {
                const isSelected = selectedIds.includes(conv._id)
                const name = getConversationName(conv)
                const avatar = getConversationAvatar(conv)
                const other = getOtherParticipant(conv)
                const lastMessage = conv.lastMessage?.content || 'No messages yet'
                
                return (
                  <button
                    key={conv._id}
                    onClick={() => toggleSelect(conv._id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl transition ${
                      isSelected 
                        ? 'bg-[#25D366]/10 dark:bg-[#25D366]/20 border-2 border-[#25D366]'
                        : 'hover:bg-gray-100 dark:hover:bg-gray-800 border-2 border-transparent'
                    }`}
                  >
                    <img
                      src={avatar}
                      alt={name}
                      className="w-10 h-10 rounded-full object-cover flex-shrink-0"
                      onError={(e) => {
                        e.target.onerror = null
                        e.target.src = `https://ui-avatars.com/api/?name=${name}&background=25D366&color=fff&size=32`
                      }}
                    />
                    <div className="flex-1 text-left min-w-0">
                      <p className="font-medium text-gray-800 dark:text-white text-sm truncate">
                        {name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {lastMessage}
                      </p>
                    </div>
                    {isSelected && (
                      <Check size={20} className="text-[#25D366] flex-shrink-0" />
                    )}
                  </button>
                )
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            {selectedIds.length} selected
          </span>
          <button
            onClick={handleForward}
            disabled={sending || selectedIds.length === 0}
            className="flex items-center gap-2 px-6 py-2 bg-[#25D366] text-white rounded-xl hover:bg-[#20b858] transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <Loader className="animate-spin" size={18} />
            ) : (
              <>
                <Send size={18} />
                Forward
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ForwardModal