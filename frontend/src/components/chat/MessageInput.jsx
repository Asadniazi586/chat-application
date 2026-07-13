import React, { useState, useRef, useEffect } from 'react'
import { Send, Smile, Paperclip, X, Loader } from 'lucide-react'
import EmojiPicker from 'emoji-picker-react'
import axios from 'axios'
import toast from 'react-hot-toast'

const MessageInput = ({ onSendMessage, onTyping, replyTo, onCancelReply }) => {
  const [message, setMessage] = useState('')
  const [isTyping, setIsTyping] = useState(false)
  const [showEmoji, setShowEmoji] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const fileInputRef = useRef(null)
  const emojiRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const inputRef = useRef(null)
  const lastTypingSentRef = useRef(0)

  // Handle click outside emoji picker
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (emojiRef.current && !emojiRef.current.contains(event.target)) {
        setShowEmoji(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input on mount
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }, [])

  // Focus input when replyTo changes
  useEffect(() => {
    if (replyTo && inputRef.current) {
      inputRef.current.focus()
    }
  }, [replyTo])

  // ✅ Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }, [])

  const handleTyping = (value) => {
    setMessage(value)
    
    // ✅ Clear existing timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }

    if (value.trim()) {
      const now = Date.now()
      // ✅ Send typing event every 800ms at most (to avoid flooding)
      if (now - lastTypingSentRef.current > 800) {
        lastTypingSentRef.current = now
        if (onTyping) {
          onTyping(true)
        }
        setIsTyping(true)
      }

      // ✅ Set timeout to stop typing after 5 seconds of no input (increased from 3s to 5s)
      typingTimeoutRef.current = setTimeout(() => {
        setIsTyping(false)
        lastTypingSentRef.current = 0
        if (onTyping) {
          onTyping(false)
        }
      }, 5000)
    } else {
      // ✅ If message is empty, stop typing immediately
      setIsTyping(false)
      lastTypingSentRef.current = 0
      if (onTyping) {
        onTyping(false)
      }
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
    }
  }

  const handleSend = () => {
    if (message.trim() || selectedFile) {
      if (selectedFile) {
        handleFileUpload()
        return
      }
      
      // ✅ Send the message with replyTo
      onSendMessage(message.trim(), 'text', {})
      setMessage('')
      setIsTyping(false)
      lastTypingSentRef.current = 0
      if (onTyping) {
        onTyping(false)
      }
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current)
      }
      
      // Focus back on input
      if (inputRef.current) {
        inputRef.current.focus()
      }
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  const handleFileSelect = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    console.log('📎 File selected:', file.name, file.type, file.size)
    setSelectedFile(file)
    setShowEmoji(false)
  }

  const handleFileUpload = async () => {
    if (!selectedFile) return

    setUploading(true)
    setUploadProgress(0)
    
    const formData = new FormData()
    formData.append('file', selectedFile)

    try {
      console.log('📤 Uploading file...')
      const response = await axios.post('/api/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          )
          setUploadProgress(percentCompleted)
        }
      })

      console.log('✅ Upload successful:', response.data)

      const { url, type, fileName, fileSize } = response.data
      
      onSendMessage(url, type, { fileName, fileSize })
      
      setSelectedFile(null)
      setUploadProgress(0)
      toast.success('File uploaded successfully!')
    } catch (error) {
      console.error('❌ Upload error:', error)
      toast.error(error.response?.data?.message || 'Failed to upload file')
    } finally {
      setUploading(false)
    }
  }

  const removeFile = () => {
    setSelectedFile(null)
    setUploadProgress(0)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji)
    setShowEmoji(false)
    
    // ✅ Trigger typing when emoji is selected
    const now = Date.now()
    if (now - lastTypingSentRef.current > 800) {
      lastTypingSentRef.current = now
      if (onTyping) {
        onTyping(true)
      }
      setIsTyping(true)
    }
    
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current)
    }
    typingTimeoutRef.current = setTimeout(() => {
      setIsTyping(false)
      lastTypingSentRef.current = 0
      if (onTyping) {
        onTyping(false)
      }
    }, 5000) // ✅ Changed to 5 seconds
    
    if (inputRef.current) {
      inputRef.current.focus()
    }
  }

  return (
   <div className="relative bg-white dark:bg-[#1A2A32] border-t border-gray-200 dark:border-gray-700" style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 4px)' }}>
      {/* ✅ Reply Preview */}
      {replyTo && (
        <div className="flex items-center justify-between px-3 sm:px-4 py-1.5 sm:py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <span className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 flex-shrink-0">↩️ Replying to:</span>
            <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 truncate">
              {replyTo.content}
            </span>
          </div>
          <button
            onClick={onCancelReply}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition flex-shrink-0 ml-1.5 sm:ml-2 p-0.5"
          >
            <X size={14} className="sm:size-16" />
          </button>
        </div>
      )}

      {/* Selected File Preview */}
      {selectedFile && (
        <div className="absolute bottom-full left-0 right-0 bg-white dark:bg-[#1A2A32] p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <div className="w-10 h-10 sm:w-12 sm:h-12 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center overflow-hidden flex-shrink-0">
                {selectedFile.type.startsWith('image/') ? (
                  <img
                    src={URL.createObjectURL(selectedFile)}
                    alt="Preview"
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover"
                  />
                ) : selectedFile.type.startsWith('video/') ? (
                  <video
                    src={URL.createObjectURL(selectedFile)}
                    className="w-10 h-10 sm:w-12 sm:h-12 object-cover"
                    muted
                  />
                ) : (
                  <Paperclip size={20} className="sm:size-24 text-gray-400" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm font-medium text-gray-800 dark:text-white truncate max-w-[120px] sm:max-w-[200px]">
                  {selectedFile.name}
                </p>
                <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                  {(selectedFile.size / 1024).toFixed(1)} KB
                </p>
                {uploading && (
                  <div className="w-20 sm:w-32 h-1 bg-gray-200 dark:bg-gray-700 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-[#25D366] transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    />
                  </div>
                )}
              </div>
            </div>
            {!uploading && (
              <button
                onClick={removeFile}
                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition flex-shrink-0"
                disabled={uploading}
              >
                <X size={16} className="sm:size-18 text-gray-500" />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Input Area - Mobile Responsive */}
      <div className="flex items-end gap-1.5 sm:gap-2 p-2 sm:p-3">
        {/* Emoji Button */}
        <div ref={emojiRef} className="relative flex-shrink-0">
          <button
            onClick={() => setShowEmoji(!showEmoji)}
            className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition"
            disabled={uploading}
            type="button"
          >
            <Smile size={20} className="sm:size-24 text-gray-500 dark:text-gray-400" />
          </button>
          
          {showEmoji && (
            <div className="absolute bottom-full left-0 mb-2 z-50">
              <EmojiPicker
                onEmojiClick={handleEmojiClick}
                width={280}
                height={350}
                className="emoji-picker"
                theme={document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'}
              />
            </div>
          )}
        </div>

        {/* File Upload Button */}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-1.5 sm:p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition flex-shrink-0"
          disabled={uploading}
          type="button"
        >
          <Paperclip size={20} className="sm:size-24 text-gray-500 dark:text-gray-400" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,video/*,.pdf,.doc,.docx,.txt"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Text Input */}
        <textarea
          ref={inputRef}
          value={message}
          onChange={(e) => handleTyping(e.target.value)}
          onKeyDown={handleKeyPress}
          placeholder={uploading ? `Uploading... ${uploadProgress}%` : 'Type a message...'}
          className="flex-1 resize-none bg-gray-100 dark:bg-[#0B141A] rounded-lg px-3 sm:px-4 py-1.5 sm:py-2 outline-none text-xs sm:text-sm dark:text-white placeholder-gray-400 max-h-28 sm:max-h-32 min-h-[36px] sm:min-h-[42px]"
          rows={1}
          disabled={uploading}
          style={{ height: '36px' }}
        />

        {/* Send Button */}
        <button
          onClick={handleSend}
          disabled={(!message.trim() && !selectedFile) || uploading}
          className={`p-1.5 sm:p-2 rounded-full transition flex-shrink-0 ${
            message.trim() || selectedFile
              ? 'bg-[#25D366] hover:bg-[#20b858] text-white'
              : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
          }`}
          type="button"
        >
          {uploading ? (
            <Loader size={18} className="sm:size-20 animate-spin" />
          ) : (
            <Send size={18} className="sm:size-20" />
          )}
        </button>
      </div>
    </div>
  )
}

export default MessageInput