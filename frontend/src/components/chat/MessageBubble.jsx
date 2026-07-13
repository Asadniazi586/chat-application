import React, { useState, useRef, useEffect } from 'react'
import { 
  Check, CheckCheck, Clock, Download, Image, Video, File,
  Copy, Trash2, Edit, Forward, X, Send, MoreVertical,
  Reply, Info, Pin, PinOff, Plus
} from 'lucide-react'
import axios from 'axios'
import toast from 'react-hot-toast'
import { useAuth } from '../../hooks/useAuth'
import Portal from '../common/Portal'

const POPUP_GAP = 8
const MENU_WIDTH = 160
const MENU_ITEM_HEIGHT = 28
const MENU_VERTICAL_PADDING = 8
const REACTIONS_WIDTH = 280
const REACTIONS_HEIGHT = 44
const MORE_REACTIONS_WIDTH = 260
const MORE_REACTIONS_HEIGHT = 200
const INFO_WIDTH = 280
const INFO_HEIGHT = 220

const clamp = (value, min, max) => {
  if (max < min) return min
  return Math.min(Math.max(value, min), max)
}

const MessageBubble = ({ 
  message, 
  isOwn, 
  onDelete, 
  onEdit, 
  onForward,
  onReply,
  onPin,
  isPinned,
  onReact
}) => {
  const [showMenu, setShowMenu] = useState(false)
  const [showDeleteMenu, setShowDeleteMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [editContent, setEditContent] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(false)
  const [showInfo, setShowInfo] = useState(false)
  const [showReactions, setShowReactions] = useState(false)
  const [showMoreReactions, setShowMoreReactions] = useState(false)
  const [showMoreMenu, setShowMoreMenu] = useState(false)
  const [, setOverlayTick] = useState(0)
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768)
  const [isLongPress, setIsLongPress] = useState(false)
  const [isReactionInProgress, setIsReactionInProgress] = useState(false)
  const longPressTimer = useRef(null)
  const resetTimerRef = useRef(null)
  
  const menuRef = useRef(null)
  const deleteMenuRef = useRef(null)
  const editInputRef = useRef(null)
  const infoRef = useRef(null)
  const reactionsRef = useRef(null)
  const threeDotsRef = useRef(null)
  const messageBubbleRef = useRef(null)
  const moreReactionsRef = useRef(null)
  const moreMenuRef = useRef(null)
  const { user } = useAuth()
  const showOverlay = showMenu || showDeleteMenu || showInfo || showReactions || showMoreReactions || showMoreMenu

  // 🔍 DEBUG: Log when message prop changes
  useEffect(() => {
    console.log('🔍 MessageBubble received message:', {
      id: message._id,
      content: message.content?.substring(0, 20),
      reactions: message.reactions,
      reactionsCount: message.reactions?.length || 0
    })
  }, [message])

  // ✅ FIX: Close popup when message reactions change (own reaction applied or removed)
  useEffect(() => {
    if (isReactionInProgress) {
      const hasMyReaction = message.reactions?.some(r => r.userId === user?._id) || false
      
      // Close popups regardless of whether reaction was added or removed
      console.log('🔄 Closing popups because reaction action completed')
      setShowReactions(false)
      setShowMoreReactions(false)
      setShowMenu(false)
      setShowMoreMenu(false)
      
      // Reset the flag after a short delay
      clearTimeout(resetTimerRef.current)
      resetTimerRef.current = setTimeout(() => {
        setIsReactionInProgress(false)
        console.log('🔄 Reaction flag reset')
      }, 300)
    }
  }, [message.reactions, user?._id, isReactionInProgress])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      clearTimeout(resetTimerRef.current)
    }
  }, [])

  // Check if mobile on resize
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Main reactions (6 in one line)
  const mainReactions = [
    { emoji: '❤️', label: 'Love' },
    { emoji: '👍', label: 'Like' },
    { emoji: '😂', label: 'Haha' },
    { emoji: '😮', label: 'Wow' },
    { emoji: '😢', label: 'Sad' },
    { emoji: '🙏', label: 'Thankful' }
  ]

  // More reactions (for modal)
  const moreReactions = [
    { emoji: '🔥', label: 'Fire' },
    { emoji: '🎉', label: 'Celebrate' },
    { emoji: '💯', label: '100' },
    { emoji: '🤣', label: 'Rolling' },
    { emoji: '😍', label: 'Love' },
    { emoji: '😱', label: 'Scream' },
    { emoji: '🥰', label: 'Cute' },
    { emoji: '👏', label: 'Clap' },
    { emoji: '😎', label: 'Cool' },
    { emoji: '🤔', label: 'Think' },
    { emoji: '🥳', label: 'Party' },
    { emoji: '😇', label: 'Angel' }
  ]

  // Close menus when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (threeDotsRef.current && threeDotsRef.current.contains(event.target)) {
        return
      }
      
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false)
      }
      if (deleteMenuRef.current && !deleteMenuRef.current.contains(event.target)) {
        setShowDeleteMenu(false)
      }
      if (infoRef.current && !infoRef.current.contains(event.target)) {
        setShowInfo(false)
      }
      if (reactionsRef.current && !reactionsRef.current.contains(event.target)) {
        setShowReactions(false)
      }
      if (moreReactionsRef.current && !moreReactionsRef.current.contains(event.target)) {
        setShowMoreReactions(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(event.target)) {
        setShowMoreMenu(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    if (!showOverlay) return

    const updateOverlayPosition = () => {
      setOverlayTick((tick) => tick + 1)
    }

    window.addEventListener('resize', updateOverlayPosition)
    window.addEventListener('scroll', updateOverlayPosition, true)

    return () => {
      window.removeEventListener('resize', updateOverlayPosition)
      window.removeEventListener('scroll', updateOverlayPosition, true)
    }
  }, [showOverlay])

  useEffect(() => {
    if (isEditing && editInputRef.current) {
      editInputRef.current.focus()
      editInputRef.current.select()
    }
  }, [isEditing])

  const handleTouchStart = () => {
    if (!isMobile) return
    longPressTimer.current = setTimeout(() => {
      setIsLongPress(true)
      setShowMenu(true)
      setShowReactions(true)
      setShowMoreReactions(false)
      setShowMoreMenu(false)
    }, 500)
  }

  const handleTouchEnd = () => {
    if (longPressTimer.current) {
      clearTimeout(longPressTimer.current)
      longPressTimer.current = null
    }
    setTimeout(() => {
      setIsLongPress(false)
    }, 100)
  }

  const getPopupBounds = () => {
    if (typeof window === 'undefined') {
      return {
        top: POPUP_GAP,
        left: POPUP_GAP,
        right: 320 - POPUP_GAP,
        bottom: 640 - POPUP_GAP
      }
    }

    const viewportBounds = {
      top: POPUP_GAP,
      left: POPUP_GAP,
      right: window.innerWidth - POPUP_GAP,
      bottom: window.innerHeight - POPUP_GAP
    }

    const scrollContainer = messageBubbleRef.current?.closest('.overflow-y-auto')
    if (!scrollContainer) return viewportBounds

    const containerRect = scrollContainer.getBoundingClientRect()
    return {
      top: Math.max(viewportBounds.top, containerRect.top + POPUP_GAP),
      left: viewportBounds.left,
      right: viewportBounds.right,
      bottom: Math.min(viewportBounds.bottom, containerRect.bottom - POPUP_GAP)
    }
  }

  const getAlignedLeft = (width) => {
    const bounds = getPopupBounds()
    const bubbleRect = messageBubbleRef.current?.getBoundingClientRect()
    const anchorRect = threeDotsRef.current?.getBoundingClientRect()
    const rect = bubbleRect || anchorRect

    if (!rect) return bounds.left

    const preferredLeft = isOwn ? rect.right - width : rect.left
    return clamp(preferredLeft, bounds.left, bounds.right - width)
  }

  const getMenuHeight = (itemCount) => {
    return MENU_VERTICAL_PADDING + (itemCount * MENU_ITEM_HEIGHT)
  }

  const getStackedPopupPosition = (menuHeight, reactionHeight = REACTIONS_HEIGHT) => {
    const bounds = getPopupBounds()
    const bubbleRect = messageBubbleRef.current?.getBoundingClientRect()
    const anchorRect = threeDotsRef.current?.getBoundingClientRect()
    const rect = bubbleRect || anchorRect

    if (!rect) {
      return {
        menuTop: bounds.top,
        reactionsTop: bounds.top + menuHeight + POPUP_GAP
      }
    }

    const stackHeight = menuHeight + POPUP_GAP + reactionHeight
    const availableAbove = rect.top - bounds.top - POPUP_GAP
    const availableBelow = bounds.bottom - rect.bottom - POPUP_GAP
    const placeBelow = availableAbove < stackHeight && availableBelow >= availableAbove
    const preferredTop = placeBelow
      ? rect.bottom + POPUP_GAP
      : rect.top - stackHeight - POPUP_GAP
    const stackTop = clamp(preferredTop, bounds.top, bounds.bottom - stackHeight)

    return {
      menuTop: placeBelow ? stackTop : stackTop + reactionHeight + POPUP_GAP,
      reactionsTop: placeBelow ? stackTop + menuHeight + POPUP_GAP : stackTop
    }
  }

  const getSinglePopupPosition = (height) => {
    const bounds = getPopupBounds()
    const bubbleRect = messageBubbleRef.current?.getBoundingClientRect()
    const anchorRect = threeDotsRef.current?.getBoundingClientRect()
    const rect = bubbleRect || anchorRect

    if (!rect) return bounds.top

    const fitsAbove = rect.top - bounds.top >= height + POPUP_GAP
    const preferredTop = fitsAbove
      ? rect.top - height - POPUP_GAP
      : rect.bottom + POPUP_GAP

    return clamp(preferredTop, bounds.top, bounds.bottom - height)
  }

  if (message.isDeleted || message.deletedFor?.includes(user?._id)) {
    return (
      <div className={`flex ${isOwn ? 'justify-end' : 'justify-start'} animate-slide-in`}>
        <div className="max-w-[80%]">
          <div className="rounded-lg px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-500 dark:text-gray-400 text-sm italic">
            This message was deleted
          </div>
        </div>
      </div>
    )
  }

const getStatusIcon = () => {
  if (!isOwn) return null
  
  // ✅ Show proper status with spacing
  switch (message.status) {
    case 'sent':
      return <Check size={14} className="text-gray-400" />
    case 'delivered':
      return <CheckCheck size={14} className="text-gray-400" />
    case 'read':
      return <CheckCheck size={14} className="text-[#53BDEB]" />
    default:
      return <Clock size={14} className="text-gray-400" />
  }
}

  const copyMessage = () => {
    if (message.content) {
      navigator.clipboard.writeText(message.content)
      toast.success('Message copied to clipboard')
      setShowMenu(false)
    }
  }

  const deleteMessage = async (deleteFor) => {
    try {
      await axios.delete(`/api/messages/${message._id}?deleteFor=${deleteFor}`)
      onDelete?.(message._id, deleteFor)
      toast.success(`Message deleted${deleteFor === 'everyone' ? ' for everyone' : ''}`)
      setShowMenu(false)
      setShowDeleteMenu(false)
    } catch (error) {
      console.error('Delete error:', error)
      toast.error(error.response?.data?.message || 'Failed to delete message')
    }
  }

  const startEdit = () => {
    setEditContent(message.content)
    setIsEditing(true)
    setShowMenu(false)
  }

  const saveEdit = async () => {
    if (!editContent.trim()) {
      toast.error('Message cannot be empty')
      return
    }

    if (editContent.trim() === message.content) {
      setIsEditing(false)
      return
    }

    try {
      const response = await axios.put(`/api/messages/${message._id}`, {
        content: editContent.trim()
      })
      
      if (response.data.success) {
        toast.success('Message edited')
        const updatedMessage = {
          ...response.data.message,
          isEdited: true,
          editedAt: new Date()
        }
        onEdit?.(updatedMessage)
        setIsEditing(false)
      }
    } catch (error) {
      console.error('Edit error:', error)
      toast.error(error.response?.data?.message || 'Failed to edit message')
    }
  }

  const cancelEdit = () => {
    setIsEditing(false)
    setEditContent('')
  }

  const handleEditKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      saveEdit()
    }
    if (e.key === 'Escape') {
      cancelEdit()
    }
  }

  const forwardMessage = () => {
    onForward?.(message)
    setShowMenu(false)
  }

  const replyMessage = () => {
    onReply?.(message)
    setShowMenu(false)
  }

  const togglePin = () => {
    onPin?.(message)
    setShowMenu(false)
    setShowMoreMenu(false)
    setShowReactions(false)
  }

  const toggleInfo = () => {
    setShowInfo(!showInfo)
    setShowMenu(false)
  }

  const handleReact = (emoji) => {
    console.log('🎯 MessageBubble handleReact START:', { 
      emoji, 
      messageId: message._id,
      currentReactions: message.reactions,
      userId: user?._id
    })
    
    // Set flag to prevent reopening
    setIsReactionInProgress(true)
    
    // Clear any existing reset timer
    clearTimeout(resetTimerRef.current)
    
    // Set a fallback reset timer (in case the reaction doesn't trigger the useEffect)
    resetTimerRef.current = setTimeout(() => {
      setIsReactionInProgress(false)
      console.log('🔄 Reaction flag reset by fallback timer')
    }, 500)
    
    if (onReact) {
      console.log('📤 Calling onReact from MessageBubble')
      onReact(message._id, emoji)
    } else {
      console.warn('⚠️ onReact prop is not available!')
    }
    
    setShowReactions(false)
    setShowMoreReactions(false)
    setShowMenu(false)
    setShowMoreMenu(false)
    document.activeElement?.blur()
  }

  const canDeleteForEveryone = () => {
    return isOwn
  }

  const renderContent = () => {
    if (isEditing) {
      return (
        <div className="w-full min-w-[200px]">
          <div className="flex items-center gap-2">
            <textarea
              ref={editInputRef}
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="flex-1 bg-white dark:bg-gray-800 rounded-lg px-3 py-2 text-sm text-gray-800 dark:text-white outline-none border border-gray-300 dark:border-gray-600 focus:border-[#25D366] resize-none"
              rows={2}
              onKeyDown={handleEditKeyDown}
              placeholder="Edit message..."
            />
            <button
              onClick={saveEdit}
              className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition flex-shrink-0"
            >
              <Send size={16} />
            </button>
          </div>
          <div className="flex items-center justify-between mt-1">
            <span className="text-[10px] text-gray-400">Press Enter to save, Esc to cancel</span>
            <button
              onClick={cancelEdit}
              className="text-xs text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              Cancel
            </button>
          </div>
        </div>
      )
    }

    switch (message.type) {
      case 'image':
        return (
          <div className="max-w-[280px]">
            {!imageLoaded && !imageError && (
              <div className="w-full h-48 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
            )}
            {imageError ? (
              <div className="flex items-center gap-2 text-red-500 text-sm">
                <Image size={20} />
                Failed to load image
              </div>
            ) : (
              <img
                src={message.content}
                alt="Message"
                className={`rounded-lg max-w-full max-h-64 object-cover cursor-pointer hover:opacity-90 transition ${
                  imageLoaded ? 'block' : 'hidden'
                }`}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
                onClick={() => window.open(message.content, '_blank')}
              />
            )}
          </div>
        )
      
      case 'video':
        return (
          <div className="max-w-[280px]">
            <video
              src={message.content}
              controls
              className="rounded-lg max-w-full max-h-64"
              poster={message.thumbnail || ''}
            />
          </div>
        )
      
      case 'file':
        return (
          <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg max-w-[280px]">
            <File size={32} className="text-[#25D366]" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-800 dark:text-white truncate">
                {message.fileName || 'File'}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {message.fileSize ? `${(message.fileSize / 1024).toFixed(1)} KB` : 'File'}
              </p>
            </div>
            <a
              href={message.content}
              download={message.fileName}
              className="p-2 bg-[#25D366] text-white rounded-full hover:bg-[#20b858] transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Download size={16} />
            </a>
          </div>
        )
      
      default:
        return (
          <div className="min-w-[60px]">
            {message.isForwarded && (
              <span className="text-[10px] text-gray-400 block mb-1">Forwarded</span>
            )}
            {message.replyTo && (
              <div className="text-xs text-gray-400 border-l-2 border-[#25D366] pl-2 mb-1 truncate">
                <span className="text-[10px]">↩️ Replying to: </span>
                {message.replyTo.content}
              </div>
            )}
            <p className="text-sm text-gray-800 dark:text-white break-words whitespace-pre-wrap">
              {message.content}
            </p>
            {message.isEdited && (
              <span className="text-[10px] text-gray-400 mt-1 block">(edited)</span>
            )}
          </div>
        )
    }
  }

  const getMainMenuItems = () => {
    const items = [
      { icon: Reply, label: 'Reply', action: replyMessage },
      { icon: Copy, label: 'Copy', action: copyMessage },
      { icon: Edit, label: 'Edit', action: startEdit },
      { icon: Forward, label: 'Forward', action: forwardMessage },
      { icon: isPinned ? PinOff : Pin, label: isPinned ? 'Unpin' : 'Pin', action: togglePin },
      { icon: Trash2, label: 'Delete', action: () => setShowDeleteMenu(true), isDelete: true }
    ]
    return items
  }

  const getMoreMenuItems = () => {
    const items = [
      { icon: isPinned ? PinOff : Pin, label: isPinned ? 'Unpin' : 'Pin', action: togglePin },
      { icon: Info, label: 'Info', action: toggleInfo },
      { icon: Trash2, label: 'Delete', action: () => setShowDeleteMenu(true), isDelete: true }
    ]
    return items
  }

  const mainMenuItems = getMainMenuItems()
  const moreMenuItems = getMoreMenuItems()
  const messageReactions = message.reactions || []

  const visibleMainMenuItemCount = mainMenuItems.filter((item) => {
    if (item.label === 'Delete' && !isOwn) return false
    if (item.label === 'Edit' && !isOwn) return false
    return true
  }).length + 1

  const visibleMoreMenuItemCount = moreMenuItems.filter((item) => {
    if (item.label === 'Delete' && !isOwn) return false
    if (item.label === 'Pin' && !isOwn) return false
    if (item.label === 'Unpin' && !isOwn) return false
    return true
  }).length + 1

  const activeMenuVisible = showMenu || showMoreMenu
  const activeMenuHeight = getMenuHeight(showMoreMenu ? visibleMoreMenuItemCount : visibleMainMenuItemCount)
  const stackedPopupPosition = activeMenuVisible ? getStackedPopupPosition(activeMenuHeight) : null
  const stackedMoreReactionsPosition = activeMenuVisible
    ? getStackedPopupPosition(activeMenuHeight, MORE_REACTIONS_HEIGHT)
    : null

  const menuPopupStyle = {
    top: stackedPopupPosition?.menuTop ?? getSinglePopupPosition(activeMenuHeight),
    left: getAlignedLeft(MENU_WIDTH)
  }

  const reactionsPopupStyle = {
    top: stackedPopupPosition?.reactionsTop ?? getSinglePopupPosition(REACTIONS_HEIGHT),
    left: getAlignedLeft(REACTIONS_WIDTH)
  }

  const moreReactionsPopupStyle = {
    top: stackedMoreReactionsPosition?.reactionsTop ?? getSinglePopupPosition(MORE_REACTIONS_HEIGHT),
    left: getAlignedLeft(MORE_REACTIONS_WIDTH)
  }

  const infoPopupStyle = {
    top: getSinglePopupPosition(INFO_HEIGHT),
    left: getAlignedLeft(INFO_WIDTH)
  }

  return (
    <>
      {showOverlay && (
        <Portal>
          <div 
            className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
            onMouseDown={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setShowMenu(false)
              setShowDeleteMenu(false)
              setShowInfo(false)
              setShowReactions(false)
              setShowMoreReactions(false)
              setShowMoreMenu(false)
              document.activeElement?.blur()
            }}
          />
        </Portal>
      )}

      {showReactions && !isEditing && (
        <Portal>
          <div 
            ref={reactionsRef}
            className="fixed z-50 bg-white dark:bg-[#1A2A32] rounded-full shadow-xl border border-gray-200 dark:border-gray-700 py-1 px-1.5 flex items-center gap-0.5"
            style={reactionsPopupStyle}
          >
            {mainReactions.map((reaction) => (
              <button
                key={reaction.emoji}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  handleReact(reaction.emoji)
                }}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition transform hover:scale-125 text-lg"
                title={reaction.label}
              >
                {reaction.emoji}
              </button>
            ))}
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowMoreReactions(!showMoreReactions)
              }}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition"
            >
              <Plus size={16} className="text-gray-500" />
            </button>
            <button
              onMouseDown={(e) => {
                e.preventDefault()
                e.stopPropagation()
                setShowReactions(false)
              }}
              className="w-6 h-6 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition text-gray-400"
            >
              <X size={12} />
            </button>
          </div>
        </Portal>
      )}

      {showMoreReactions && (
        <Portal>
          <div 
            ref={moreReactionsRef}
            className="fixed z-50 bg-white dark:bg-[#1A2A32] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-3 max-w-[260px]"
            style={moreReactionsPopupStyle}
          >
            <div className="flex items-center justify-between mb-1 pb-1 border-b border-gray-100 dark:border-gray-700">
              <span className="text-[10px] font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">All Reactions</span>
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMoreReactions(false)
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-6 gap-0.5">
              {moreReactions.map((reaction) => (
                <button
                  key={reaction.emoji}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReact(reaction.emoji)
                  }}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition transform hover:scale-110 text-lg"
                  title={reaction.label}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          </div>
        </Portal>
      )}

      {(showMenu && !isEditing) && (
        <Portal>
          <div 
            ref={menuRef}
            className="fixed z-50 bg-white dark:bg-[#1A2A32] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] overflow-hidden"
            style={menuPopupStyle}
          >
            <div className="py-1">
              {mainMenuItems.map((item, index) => {
                if (item.label === 'Delete' && !isOwn) return null
                if (item.label === 'Edit' && !isOwn) return null
                
                return (
                  <button
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      item.action()
                      setShowMenu(false)
                      setShowReactions(false)
                      setShowMoreReactions(false)
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      item.isDelete ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <item.icon size={14} className={item.isDelete ? 'text-red-600 dark:text-red-400' : 'text-gray-500'} />
                    {item.label}
                  </button>
                )
              })}
              
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMenu(false)
                  setShowMoreMenu(true)
                }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-t border-gray-100 dark:border-gray-700"
              >
                <MoreVertical size={14} className="text-gray-400" />
                More
              </button>
            </div>
          </div>
        </Portal>
      )}

      {showMoreMenu && (
        <Portal>
          <div 
            ref={moreMenuRef}
            className="fixed z-50 bg-white dark:bg-[#1A2A32] rounded-xl shadow-xl border border-gray-200 dark:border-gray-700 min-w-[160px] overflow-hidden"
            style={menuPopupStyle}
          >
            <div className="py-1">
              {moreMenuItems.map((item, index) => {
                if (item.label === 'Delete' && !isOwn) return null
                if (item.label === 'Pin' && !isOwn) return null
                if (item.label === 'Unpin' && !isOwn) return null
                
                return (
                  <button
                    key={index}
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      item.action()
                      setShowMoreMenu(false)
                      setShowMenu(false)
                      setShowReactions(false)
                      setShowMoreReactions(false)
                    }}
                    className={`flex items-center gap-3 w-full px-3 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-700 transition ${
                      item.isDelete ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-200'
                    }`}
                  >
                    <item.icon size={14} className={item.isDelete ? 'text-red-600 dark:text-red-400' : 'text-gray-500'} />
                    {item.label}
                  </button>
                )
              })}
              <button
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setShowMoreMenu(false)
                  setShowMenu(true)
                }}
                className="flex items-center gap-3 w-full px-3 py-1.5 text-xs text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 transition border-t border-gray-200 dark:border-gray-700"
              >
                <X size={14} className="text-gray-400" />
                Back
              </button>
            </div>
          </div>
        </Portal>
      )}

      {showInfo && (
        <Portal>
          <div 
            ref={infoRef}
            className="fixed z-50 bg-white dark:bg-[#1A2A32] rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-700 p-4 min-w-[220px] max-w-[280px]"
            style={infoPopupStyle}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-gray-100 dark:border-gray-700">
                <span className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Message Info
                </span>
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowInfo(false)
                  }}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                >
                  <X size={14} />
                </button>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Status</span>
                <span className="text-xs font-medium text-gray-800 dark:text-white flex items-center gap-1">
                  {message.status === 'read' ? (
                    <>
                      <CheckCheck size={14} className="text-[#53BDEB]" />
                      Read
                    </>
                  ) : message.status === 'delivered' ? (
                    <>
                      <CheckCheck size={14} className="text-gray-400" />
                      Delivered
                    </>
                  ) : (
                    <>
                      <Check size={14} className="text-gray-400" />
                      Sent
                    </>
                  )}
                </span>
              </div>
              
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500 dark:text-gray-400">Sent</span>
                <span className="text-xs text-gray-800 dark:text-white">
                  {new Date(message.createdAt).toLocaleString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </span>
              </div>
              
              {message.isEdited && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Edited</span>
                  <span className="text-xs text-gray-800 dark:text-white">
                    {message.editedAt ? new Date(message.editedAt).toLocaleString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      hour: '2-digit',
                      minute: '2-digit'
                    }) : 'Yes'}
                  </span>
                </div>
              )}
              
              {message.readBy?.length > 0 && (
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-500 dark:text-gray-400">Read by</span>
                  <span className="text-xs text-gray-800 dark:text-white">
                    {message.readBy.length} {message.readBy.length === 1 ? 'person' : 'people'}
                  </span>
                </div>
              )}
            </div>
          </div>
        </Portal>
      )}

      <div 
        className={`flex ${isOwn ? 'justify-end' : 'justify-start'} relative group`}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className={`max-w-[80%] ${isOwn ? 'order-1' : 'order-2'}`}>
          <div ref={messageBubbleRef} className={`relative rounded-lg px-4 py-2 shadow-sm ${
            isOwn
              ? 'bg-[#DCF8C6] dark:bg-[#056162] text-gray-800 dark:text-white'
              : 'bg-white dark:bg-[#1A2A32] text-gray-800 dark:text-white'
          }`}>
            {isPinned && !isEditing && (
              <div className="absolute -bottom-0.5 -right-0.5">
                <Pin size={10} className="text-[#25D366] fill-[#25D366]" />
              </div>
            )}

            {!isMobile && !isEditing && (
              <button
                ref={threeDotsRef}
                onMouseDown={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  // Always allow reopening - just close any existing popups first
                  setShowMoreReactions(false)
                  setShowMoreMenu(false)
                  setShowDeleteMenu(false)
                  setShowInfo(false)
                  setShowMenu(true)
                  setShowReactions(true)
                }}
                className="absolute -top-2 p-1 bg-white dark:bg-gray-800 rounded-full shadow-md hover:bg-gray-100 dark:hover:bg-gray-700 transition opacity-0 group-hover:opacity-100 z-10"
                style={{ right: '-2px' }}
              >
                <MoreVertical size={16} className="text-gray-500" />
              </button>
            )}

            {renderContent()}
            
            <div className={`flex items-center gap-1 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">
                {new Date(message.createdAt).toLocaleTimeString([], { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </span>
              {isOwn && getStatusIcon()}
            </div>
            
            {!isOwn && (
              <div className="absolute -bottom-1 left-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-white dark:border-t-[#1A2A32]"></div>
            )}
            
            {isOwn && (
              <div className="absolute -bottom-1 right-0 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-[#DCF8C6] dark:border-t-[#056162]"></div>
            )}
          </div>

          {messageReactions.length > 0 && (
            <div className={`flex flex-wrap gap-0.5 mt-1 ${isOwn ? 'justify-end' : 'justify-start'}`}>
              {messageReactions.map((reaction, idx) => (
                <button
                  key={idx}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    handleReact(reaction.emoji)
                  }}
                  className="text-sm bg-gray-100 dark:bg-gray-700 rounded-full px-1.5 py-0.5 hover:bg-gray-200 dark:hover:bg-gray-600 transition cursor-pointer"
                  title={reaction.userId === user?._id ? 'Click to remove reaction' : ''}
                >
                  {reaction.emoji}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {showDeleteMenu && isOwn && (
        <Portal>
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div 
              ref={deleteMenuRef}
              className="bg-white dark:bg-[#1A2A32] rounded-2xl p-6 max-w-sm w-full mx-auto shadow-2xl"
            >
              <h3 className="text-lg font-semibold text-gray-800 dark:text-white mb-2">
                Delete Message?
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                This message will be deleted for:
              </p>
              <div className="space-y-2">
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    deleteMessage('me')
                  }}
                  className="w-full text-left px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Delete for me</span>
                  <p className="text-xs text-gray-500">Only you won't see this message</p>
                </button>
                
                {canDeleteForEveryone() && (
                  <button
                    onMouseDown={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      deleteMessage('everyone')
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition border border-red-200 dark:border-red-800"
                  >
                    <span className="text-sm font-medium text-red-600 dark:text-red-400">Delete for everyone</span>
                    <p className="text-xs text-gray-500">This message will be deleted for all participants</p>
                  </button>
                )}
                
                <button
                  onMouseDown={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setShowDeleteMenu(false)
                  }}
                  className="w-full text-center px-4 py-3 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-700 transition border border-gray-200 dark:border-gray-700"
                >
                  <span className="text-sm text-gray-500 dark:text-gray-400">Cancel</span>
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}

export default MessageBubble