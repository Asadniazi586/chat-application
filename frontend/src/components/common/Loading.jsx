import React from 'react'

const Loading = ({ size = 'md', fullScreen = false, text = 'Loading...' }) => {
  const sizeClasses = {
    sm: 'h-6 w-6',
    md: 'h-10 w-10',
    lg: 'h-16 w-16'
  }

  const spinner = (
    <div className="flex flex-col items-center gap-3">
      <div className={`animate-spin rounded-full border-4 border-[#25D366] border-t-transparent ${sizeClasses[size]}`} />
      {text && <p className="text-gray-500 dark:text-gray-400 text-sm">{text}</p>}
    </div>
  )

  if (fullScreen) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-white dark:bg-[#0B141A] z-50">
        {spinner}
      </div>
    )
  }

  return spinner
}

export default Loading