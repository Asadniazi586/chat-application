import React, { createContext, useState, useEffect, useContext } from 'react'
import io from 'socket.io-client'

export const SocketContext = createContext()

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null)
  // ✅ FIXED: Changed from false to null - null = connecting, true = connected, false = disconnected
  const [isConnected, setIsConnected] = useState(null)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('No token found, skipping socket connection')
      setIsConnected(false)
      return
    }

    console.log('🔌 Initializing socket connection...')
    
    // ✅ FIXED: Use environment variable for socket URL
    const SOCKET_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000'
    console.log('🔌 Socket URL:', SOCKET_URL)
    
    const socketInstance = io(SOCKET_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: 20,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      upgrade: false,
      forceNew: true,
    })

    socketInstance.on('connect', () => {
      console.log('✅ Socket connected:', socketInstance.id)
      setIsConnected(true)
      
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]))
          if (decoded && decoded.id) {
            socketInstance.emit('user-online', decoded.id)
          }
        } catch (e) {
          console.error('Error decoding token:', e)
        }
      }
    })

    socketInstance.on('disconnect', () => {
      console.log('❌ Socket disconnected')
      setIsConnected(false)
    })

    socketInstance.on('reconnect', (attemptNumber) => {
      console.log('🔄 Socket reconnected after', attemptNumber, 'attempts')
      setIsConnected(true)
      
      if (token) {
        try {
          const decoded = JSON.parse(atob(token.split('.')[1]))
          if (decoded && decoded.id) {
            socketInstance.emit('user-online', decoded.id)
          }
        } catch (e) {
          console.error('Error decoding token:', e)
        }
      }
    })

    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 Reconnect attempt:', attemptNumber)
    })

    socketInstance.on('connect_error', (error) => {
      console.error('❌ Socket connection error:', error)
      setIsConnected(false)
    })

    // ✅ Debug: Log all incoming events
    socketInstance.onAny((event, ...args) => {
      console.log(`📡 Socket event received: ${event}`, args)
    })

    setSocket(socketInstance)

    return () => {
      if (socketInstance) {
        if (token) {
          try {
            const decoded = JSON.parse(atob(token.split('.')[1]))
            if (decoded && decoded.id) {
              socketInstance.emit('user-offline', decoded.id)
            }
          } catch (e) {
            console.error('Error decoding token:', e)
          }
        }
        socketInstance.disconnect()
        console.log('🔌 Socket disconnected on cleanup')
      }
    }
  }, [])

  const value = {
    socket,
    isConnected,
  }

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  )
}

export const useSocket = () => {
  const context = useContext(SocketContext)
  if (!context) {
    console.warn('useSocket must be used within a SocketProvider - returning default')
    return { socket: null, isConnected: false }
  }
  return context
}