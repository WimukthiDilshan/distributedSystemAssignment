import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [restaurantId, setRestaurantId] = useState(null);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      fetchUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    // Set restaurantId from user or localStorage
    const rid = user?.restaurantId || localStorage.getItem('adminRestaurantId');
    if (rid) {
      setRestaurantId(rid);
    }
  }, [user]);

  const fetchUser = async () => {
    try {
      const response = await axios.get('http://localhost:3000/api/auth/me');
      setUser(response.data);
    } catch (error) {
      console.error('Error fetching user:', error);
      localStorage.removeItem('token');
      setToken(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      // Check for hard-coded admin credentials
      if (email === 'admin@gmail.com' && password === 'admin123') {
        // Create a mock admin user and token
        const adminUser = {
          id: 'admin-id',
          email: 'admin@gmail.com',
          name: 'System Admin',
          role: 'admin'
        };
        
        // Create a token for the admin (even though it's not from the server)
        const mockToken = 'admin-token-' + Math.random().toString(36).substring(2, 15);
        
        // Store in localStorage and state, similar to normal login
        localStorage.setItem('token', mockToken);
        setToken(mockToken);
        axios.defaults.headers.common['Authorization'] = `Bearer ${mockToken}`;
        setUser(adminUser);
        
        toast.success('Admin login successful!');
        return true;
      }
      
      // Normal login for other users
      const response = await axios.post('http://localhost:3000/api/auth/login', {
        email,
        password,
      });
      
      const { token: newToken, user: userData } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setUser(userData);
      toast.success('Login successful!');
      return true;
    } catch (error) {
      console.error('Login error:', error);
      toast.error(error.response?.data?.message || 'Login failed');
      return false;
    }
  };

  const register = async (userData) => {
    try {
      const response = await axios.post('http://localhost:3000/api/auth/register', userData);
      const { token: newToken, user: newUser } = response.data;
      localStorage.setItem('token', newToken);
      setToken(newToken);
      axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
      setUser(newUser);
      toast.success('Registration successful!');
      return true;
    } catch (error) {
      console.error('Registration error:', error);
      toast.error(error.response?.data?.message || 'Registration failed');
      return false;
    }
  };

  // Function to update restaurant ID in context and localStorage
  const updateRestaurantId = async (restaurantId) => {
    try {
      // Update localStorage
      localStorage.setItem('adminRestaurantId', restaurantId);
      
      // Update state
      setRestaurantId(restaurantId);
      
      // Update user object if it exists
      if (user) {
        setUser({
          ...user,
          restaurantId
        });
      }
      
      // Try to update the user profile on the server
      if (token) {
        await axios.patch('http://localhost:3000/api/auth/update-restaurant-id',
          { 
            userId: user.id || user._id,
            restaurantId
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        console.log('Updated restaurant ID on server successfully');
      }
      
      return true;
    } catch (error) {
      console.error('Error updating restaurant ID:', error);
      return false;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
    setToken(null);
    toast.success('Logged out successfully');
  };

  const value = {
    user,
    token,
    login,
    register,
    logout,
    loading,
    restaurantId: restaurantId || user?.restaurantId || localStorage.getItem('adminRestaurantId') || null,
    updateRestaurantId
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
} 