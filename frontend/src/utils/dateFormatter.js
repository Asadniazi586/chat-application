/**
 * Format a date to a readable string
 */
export const formatDate = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  // Less than 1 minute
  if (diff < 60000) return 'Just now'
  
  // Less than 1 hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m ago`
  }
  
  // Less than 24 hours
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  
  // Less than 7 days
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  
  // Default
  return d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })
}

/**
 * Format a date for message grouping
 */
export const formatMessageDate = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  
  if (d >= today) return 'Today'
  if (d >= yesterday) return 'Yesterday'
  
  return d.toLocaleDateString([], { weekday: 'long', month: 'short', day: 'numeric' })
}

/**
 * Check if a message is from today
 */
export const isToday = (date) => {
  const d = new Date(date)
  const now = new Date()
  return d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
}

/**
 * Check if a message is from yesterday
 */
export const isYesterday = (date) => {
  const d = new Date(date)
  const now = new Date()
  const yesterday = new Date(now)
  yesterday.setDate(yesterday.getDate() - 1)
  
  return d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear()
}

/**
 * Get relative time (for chat list)
 */
export const getRelativeTime = (date) => {
  if (!date) return ''
  
  const d = new Date(date)
  const now = new Date()
  const diff = now - d
  
  if (diff < 60000) return 'Just now'
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return `${minutes}m`
  }
  if (diff < 86400000) {
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }
  if (diff < 604800000) {
    return d.toLocaleDateString([], { weekday: 'short' })
  }
  
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' })
}