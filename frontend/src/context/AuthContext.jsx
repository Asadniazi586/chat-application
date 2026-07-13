import React, { createContext, useState, useEffect, useContext } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token'));

  // Configure axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete axios.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ✅ REGISTER - FIXED to handle both response formats
  const register = async (name, email, password) => {
    try {
      console.log('📝 Attempting registration:', { name, email });

      const response = await axios.post('/api/auth/register', { name, email, password });
      console.log('✅ Registration response:', response.data);

      // ✅ Check if response has token (successful registration)
      if (response.data.token && response.data.user) {
        toast.success('Registration successful! Please login.');
        return { success: true, user: response.data.user };
      } 
      // ✅ Check if response has success: true
      else if (response.data.success === true) {
        toast.success('Registration successful! Please login.');
        return { success: true };
      }
      // ❌ Registration failed
      else {
        throw new Error(response.data.message || 'Registration failed');
      }
    } catch (error) {
      console.error('❌ Registration error:', error);
      const message = error.response?.data?.message || 'Registration failed. Please try again.';
      toast.error(message);
      return { success: false, error: message };
    }
  };

  // ✅ LOGIN - FIXED to handle both response formats
  const login = async (email, password) => {
    try {
      console.log('📝 Attempting login:', { email });

      const response = await axios.post('/api/auth/login', { email, password });
      console.log('✅ Login response:', response.data);

      // ✅ Check if response has token and user
      if (response.data.token && response.data.user) {
        const { token, user: userData } = response.data;

        // Store token
        localStorage.setItem('token', token);
        setToken(token);
        setUser(userData);

        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;

        console.log('✅ User set:', userData);
        console.log('✅ User ID:', userData?._id);

        toast.success(`Welcome back, ${userData.name}! 🎉`);
        return { success: true, user: userData };
      } 
      // ✅ Check if response has success: true
      else if (response.data.success === true && response.data.user) {
        // If backend uses different field names
        const userData = response.data.user;
        const token = response.data.token || localStorage.getItem('token');
        
        if (token) {
          localStorage.setItem('token', token);
          setToken(token);
          setUser(userData);
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
        }

        console.log('✅ User set:', userData);
        toast.success(`Welcome back, ${userData.name}! 🎉`);
        return { success: true, user: userData };
      }
      // ❌ Login failed
      else {
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
    delete axios.defaults.headers.common['Authorization'];
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
        const response = await axios.get('/api/auth/me');
        console.log('✅ User loaded:', response.data);

        if (response.data.user) {
          setUser(response.data.user);
        } else if (response.data.success === true && response.data.user) {
          setUser(response.data.user);
        } else {
          throw new Error('Invalid response format');
        }
      } catch (error) {
        console.error('❌ Error loading user:', error);
        localStorage.removeItem('token');
        setToken(null);
        delete axios.defaults.headers.common['Authorization'];
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