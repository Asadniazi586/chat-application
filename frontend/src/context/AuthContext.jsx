import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // ✅ REGISTER
  const register = async (name, email, password) => {
    try {
      console.log('📝 Registering:', { name, email });
      
      const response = await api.post('/auth/register', { name, email, password });
      console.log('✅ Registration response:', response.data);

      if (response.data.success || response.data.token) {
        toast.success('Registration successful! Please login.');
        return { success: true };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // ✅ LOGIN
  const login = async (email, password) => {
    try {
      console.log('📝 Logging in:', { email });
      
      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Login response:', response.data);

      if (response.data.success && response.data.token) {
        const { token, user: userData } = response.data;
        
        localStorage.setItem('token', token);
        setToken(token);
        setUser(userData);
        
        console.log('✅ User logged in:', userData.name);
        toast.success(`Welcome back, ${userData.name}! 🎉`);
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const message = error.response?.data?.message || 'Login failed';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // ✅ LOGOUT
  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // ✅ LOAD USER
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log('📥 Loading user...');
        const response = await api.get('/auth/me');
        console.log('✅ User loaded:', response.data);
        
        if (response.data.user) {
          setUser(response.data.user);
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    loadUser();
  }, [token]);

  const value = {
    user,
    setUser,
    login,
    register,
    logout,
    loading,
    token,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;