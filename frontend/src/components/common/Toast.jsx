import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react'

const Toast = ({ 
  message, 
  type = 'info', 
  duration = 3000, 
  onClose 
}) => {
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      if (onClose) setTimeout(onClose, 300)
    }, duration)

    return () => clearTimeout(timer)
  }, [duration, onClose])

  const icons = {
    success: <CheckCircle size={20} className="text-green-500" />,
    error: <AlertCircle size={20} className="text-red-500" />,
    info: <Info size={20} className="text-blue-500" />
  }

  const bgColors = {
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
    error: 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800',
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800'
  }

  if (!visible) return null

  return (
    <div 
      className={`fixed top-4 right-4 z-[100] flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg ${bgColors[type]} max-w-md animate-slide-in`}
    >
      {icons[type]}
      <p className="flex-1 text-sm text-gray-700 dark:text-gray-200">{message}</p>
      <button
        onClick={() => {
          setVisible(false)
          if (onClose) setTimeout(onClose, 300)
        }}
        className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-full transition"
      >
        <X size={16} className="text-gray-500" />
      </button>
    </div>
  )
}

export default Toast