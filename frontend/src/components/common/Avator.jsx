import React from 'react'

const Avatar = ({ 
  name, 
  src, 
  size = 40, 
  className = '', 
  online = false,
  status = ''
}) => {
  const getInitials = () => {
    if (!name) return '?'
    const parts = name.split(' ')
    if (parts.length >= 2) {
      return `${parts[0][0]}${parts[1][0]}`.toUpperCase()
    }
    return name.slice(0, 2).toUpperCase()
  }

  return (
    <div className="relative inline-block">
      {src ? (
        <img
          src={src}
          alt={name || 'Avatar'}
          className={`rounded-full object-cover ${className}`}
          style={{ width: size, height: size }}
          onError={(e) => {
            e.target.onerror = null
            e.target.style.display = 'none'
            e.target.parentElement.querySelector('.fallback').style.display = 'flex'
          }}
        />
      ) : null}
      
      <div 
        className={`fallback ${src ? 'hidden' : 'flex'} items-center justify-center rounded-full bg-[#25D366] text-white font-semibold ${className}`}
        style={{ width: size, height: size, fontSize: size * 0.4 }}
      >
        {getInitials()}
      </div>

      {online && (
        <div className="absolute bottom-0 right-0 w-3 h-3 bg-[#25D366] rounded-full border-2 border-white dark:border-gray-800" />
      )}

      {status && (
        <div className="absolute -top-1 -right-1">
          <span className="text-xs bg-red-500 text-white rounded-full px-1.5 py-0.5">
            {status}
          </span>
        </div>
      )}
    </div>
  )
}

export default Avatar