import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { CircularProgress, Box } from '@mui/material';
import toast from 'react-hot-toast';

export default function PrivateRoute({ children, requiredRole }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight="100vh"
      >
        <CircularProgress />
      </Box>
    );
  }

  // Check if user is authenticated
  if (!user) {
    return <Navigate to="/login" />;
  }

  // If a specific role is required, check if user has that role
  if (requiredRole && user.role !== requiredRole) {
    toast.error(`This page requires ${requiredRole.replace('_', ' ')} privileges`);
    
    // Redirect to appropriate page based on user role
    if (user.role === 'customer') {
      return <Navigate to="/restaurants" />;
    } else if (user.role === 'restaurant_admin') {
      return <Navigate to="/restaurant/menu" />;
    } else if (user.role === 'delivery_personnel') {
      return <Navigate to="/delivery-dashboard" />;
    } else if (user.role === 'admin') {
      return <Navigate to="/admin" />;
    } else {
      return <Navigate to="/" />;
    }
  }

  return children;
} 