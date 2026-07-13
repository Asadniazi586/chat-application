import React, { createContext, useState, useEffect, useContext } from 'react';
import api from '../utils/api'; // ✅ Use the API instance
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // ✅ REGISTER - Using api instance
  const register = async (name, email, password) => {
    try {
      console.log('📝 Attempting registration:', { name, email });

      const response = await api.post('/auth/register', { name, email, password });
      console.log('✅ Registration response:', response.data);

      if (response.data.token && response.data.user) {
        toast.success('Registration successful! Please login.');
        return { success: true, user: response.data.user };
      } else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // ✅ LOGIN - Using api instance
  const login = async (email, password) => {
    try {
      console.log('📝 Attempting login:', { email });

      const response = await api.post('/auth/login', { email, password });
      console.log('✅ Login response:', response.data);

      if (response.data.token && response.data.user) {
        const { token, user: userData } = response.data;

        localStorage.setItem('token', token);
        setToken(token);
        setUser(userData);

        console.log('✅ User set:', userData);
        toast.success(`Welcome back, ${userData.name}! 🎉`);
        return { success: true, user: userData };
      } else {
        throw new Error(response.data.message || 'Login failed');
      }
    } catch (error) {
      console.error('❌ Login error:', error);
      const message = error.response?.data?.message || 'Login failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    toast.success('Logged out successfully');
  };

  // Load user on initial load
  useEffect(() => {
    const loadUser = async () => {
      if (!token) {
        setLoading(false);
        return;
      }

      try {
        console.log('📥 Loading user from token...');
        const response = await api.get('/auth/me');
        console.log('✅ User loaded:', response.data);

        if (response.data.user) {
          setUser(response.data.user);
        } else {
          throw new Error('Invalid response format');
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