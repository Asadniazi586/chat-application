import React, { useState, useEffect } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ChatPage from './pages/ChatPage'
import { MessageCircle } from 'lucide-react'

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth()
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white dark:bg-[#0B141A]">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-[#25D366] flex items-center justify-center animate-pulse">
            <MessageCircle size={32} className="text-white" />
          </div>
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#25D366]"></div>
          <p className="text-gray-500 dark:text-gray-400 text-sm">Loading...</p>
        </div>
      </div>
    )
  }
  
  if (!user) {
    return <Navigate to="/login" replace />
  }
  
  return children
}

function App() {
  const [isProfileOpen, setIsProfileOpen] = useState(false)

  useEffect(() => {
    const handleOpenProfile = () => {
      setIsProfileOpen(true)
    }
    document.addEventListener('openProfile', handleOpenProfile)
    return () => {
      document.removeEventListener('openProfile', handleOpenProfile)
    }
  }, [])

  return (
    <AuthProvider>
      <SocketProvider>
        <div className="h-screen w-screen overflow-hidden bg-[#ECE5DD] dark:bg-[#0B141A]">
          <Toaster 
            position="top-right"
            toastOptions={{
              duration: 3000,
              style: {
                background: '#333',
                color: '#fff',
                borderRadius: '12px',
                padding: '16px',
                boxShadow: '0 10px 25px rgba(0,0,0,0.2)',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#25D366',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 4000,
                iconTheme: {
                  primary: '#FF3B30',
                  secondary: '#fff',
                },
              },
            }}
          />
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/register" element={<RegisterPage />} />
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <ChatPage />
                </ProtectedRoute>
              } 
            />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
       
        </div>
      </SocketProvider>
    </AuthProvider>
  )
}

export default App