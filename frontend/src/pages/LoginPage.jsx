import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { MessageCircle, Mail, Lock, Loader, Eye, EyeOff } from 'lucide-react'

const LoginPage = () => {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    
    const result = await login(email, password)
    setLoading(false)
    
    if (result.success) {
      navigate('/')
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
          <h1 className="text-lg font-bold text-gray-800 dark:text-white">WhatsApp Clone</h1>
          <p className="text-gray-500 dark:text-gray-400 text-[11px] mt-0.5">Sign in to continue</p>
        </div>

        {/* Form - Compact */}
        <form onSubmit={handleSubmit} className="space-y-2">
          {/* Email Field */}
          <div>
            <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">
              Email Address
            </label>
            <div className="relative flex items-center">
              <Mail className="absolute left-3 text-gray-400" size={16} />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-9 pr-10 py-2 text-sm bg-gray-50 dark:bg-[#0B141A] border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-[#25D366] focus:border-transparent outline-none transition dark:text-white placeholder-gray-400"
                placeholder="Enter your password"
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

          {/* Remember Me & Forgot Password */}
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-1.5 cursor-pointer">
              <input
                type="checkbox"
                className="w-3 h-3 text-[#25D366] border-gray-300 dark:border-gray-600 rounded focus:ring-[#25D366]"
              />
              <span className="text-[11px] text-gray-600 dark:text-gray-400">Remember me</span>
            </label>
            <button
              type="button"
              className="text-[11px] text-[#25D366] hover:text-[#20b858] font-medium transition"
            >
              Forgot password?
            </button>
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
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-4">
          <p className="text-gray-600 dark:text-gray-400 text-[11px]">
            Don't have an account?{' '}
            <Link 
              to="/register" 
              className="text-[#25D366] hover:text-[#20b858] font-semibold transition"
            >
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}

export default LoginPage