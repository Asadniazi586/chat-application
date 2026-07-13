import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { MessageCircle, User, Mail, Lock, Loader, Eye, EyeOff, CheckCircle, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

const RegisterPage = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const { register } = useAuth()
  const navigate = useNavigate()

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    // ✅ Validate name
    if (!formData.name.trim()) {
      toast.error('Please enter your name')
      return
    }

    // ✅ Validate email
    if (!formData.email.trim()) {
      toast.error('Please enter your email')
      return
    }

    // ✅ Validate password
    if (formData.password.length < 6) {
      toast.error('Password must be at least 6 characters')
      return
    }

    // ✅ Check password match
    if (formData.password !== formData.confirmPassword) {
      toast.error('Passwords do not match')
      return
    }

    setLoading(true)
    
    try {
      const result = await register(formData.name, formData.email, formData.password)
      
      if (result.success) {
        // ✅ Registration successful, redirect to login
        // toast.success('Registration successful! Please login.')
        navigate('/login')
      }
      // Error is already shown by toast in AuthContext
    } catch (error) {
      console.error('❌ Registration error:', error)
      toast.error(error.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#ECE5DD] dark:bg-[#0B141A] p-4 py-10">
      <div className="w-full max-w-sm bg-white dark:bg-[#1A2A32] rounded-2xl shadow-lg p-5">
        {/* Logo Section - Compact */}
        <div className="text-center mb-4">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-[#25D366] text-white mb-2">
            <MessageCircle size={24} />
          </div>
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">Create Account</h1>
          <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">Join WhatsApp Clone</p>
        </div>

        {/* Form - More Compact */}
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Name Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Full Name
            </label>
            <div className="relative flex items-center">
              <User className="absolute left-3 text-gray-400" size={16} />
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition dark:text-white placeholder-gray-400"
                placeholder="Enter your full name"
              />
            </div>
          </div>

          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-gray-400" size={16} />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-3 py-2 text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition dark:text-white placeholder-gray-400"
                placeholder="Enter your email"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-gray-400" size={16} />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
                minLength={6}
                className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition dark:text-white placeholder-gray-400"
                placeholder="Minimum 6 characters"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3"
              >
                {showPassword ? (
                  <EyeOff className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" size={16} />
                ) : (
                  <Eye className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" size={16} />
                )}
              </button>
            </div>
          </div>

          {/* Confirm Password Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Confirm Password
            </label>
            <div className="relative flex items-center">
              <Lock className="absolute left-3 text-gray-400" size={16} />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
                className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition dark:text-white placeholder-gray-400"
                placeholder="Confirm your password"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3"
              >
                {showConfirmPassword ? (
                  <EyeOff className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" size={16} />
                ) : (
                  <Eye className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300" size={16} />
                )}
              </button>
            </div>
            {/* Password Match Indicator */}
            {formData.confirmPassword && formData.password && (
              <div className="flex items-center gap-1.5 mt-1">
                {formData.password === formData.confirmPassword ? (
                  <>
                    <CheckCircle className="text-green-500" size={11} />
                    <span className="text-[10px] text-green-500">Passwords match</span>
                  </>
                ) : (
                  <>
                    <XCircle className="text-red-500" size={11} />
                    <span className="text-[10px] text-red-500">Passwords do not match</span>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#25D366] hover:bg-[#20b858] text-white font-semibold py-2 px-4 rounded-lg transition duration-200 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm mt-2"
          >
            {loading ? (
              <>
                <Loader className="animate-spin" size={16} />
                Creating account...
              </>
            ) : (
              'Create Account'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-600 dark:text-gray-400 text-[11px]">
            Already have an account?{' '}
            <Link 
              to="/login" 
              className="text-[#25D366] hover:text-[#20b858] font-semibold transition"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default RegisterPage