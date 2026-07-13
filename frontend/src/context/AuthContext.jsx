import React, { createContext, useState, useEffect, useContext } from 'react'
import axios from 'axios'
import toast from 'react-hot-toast'

export const AuthContext = createContext()

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [token, setToken] = useState(localStorage.getItem('token'))

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    } else {
      delete axios.defaults.headers.common['Authorization']
    }
  }, [token])

  const login = async (email, password) => {
    try {
      console.log('📝 Attempting login:', { email })
      
      const response = await axios.post('/api/auth/login', { email, password })
      console.log('✅ Login response:', response.data)
      
      const { token, user } = response.data
      
      localStorage.setItem('token', token)
      setToken(token)
      setUser(user)
      
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      console.log('✅ User set:', user)
      console.log('✅ User ID:', user?._id)
      
      toast.success(`Welcome back, ${user.name}! 🎉`)
      return { success: true, user }
    } catch (error) {
      console.error('❌ Login error:', error)
      const message = error.response?.data?.message || 'Login failed. Please try again.'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const register = async (name, email, password) => {
    try {
      console.log('📝 Attempting registration:', { name, email })
      
      const response = await axios.post('/api/auth/register', { name, email, password })
      console.log('✅ Registration response:', response.data)
      
      // ✅ Registration successful - don't log in user
      toast.success('Registration successful! Please login.')
      return { success: true }
    } catch (error) {
      console.error('❌ Registration error:', error)
      console.error('❌ Error response:', error.response?.data)
      const message = error.response?.data?.message || 'Registration failed. Please try again.'
      toast.error(message)
      return { success: false, error: message }
    }
  }

  const logout = () => {
    localStorage.removeItem('token')
    setToken(null)
    setUser(null)
    delete axios.defaults.headers.common['Authorization']
    toast.success('Logged out successfully')
  }

  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false)
        return
      }

      try {
        console.log('📥 Loading user from token...')
        const response = await axios.get('/api/auth/me')
        console.log('✅ User loaded:', response.data)
        
        const userData = response.data.user || response.data
        console.log('✅ User data:', userData)
        console.log('✅ User ID:', userData?._id)
        
        setUser(userData)
      } catch (error) {
        console.error('❌ Error loading user:', error)
        console.error('❌ Error response:', error.response?.data)
        localStorage.removeItem('token')
        setToken(null)
        delete axios.defaults.headers.common['Authorization']
      } finally {
        setLoading(false)
      }
    }

    loadUser()
  }, [token])

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    loading,
    token,
    isAuthenticated: !!user && !!token,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

export default AuthContext