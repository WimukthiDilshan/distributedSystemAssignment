import { useState, useEffect, useCallback } from 'react';
import { 
  Container, 
  Typography, 
  Box, 
  Paper, 
  Button, 
  Grid, 
  Card, 
  CardContent, 
  Chip, 
  Divider, 
  List, 
  ListItem, 
  ListItemText, 
  CircularProgress,
  Badge,
  IconButton,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Modal,
  Pagination,
  TextField,
  InputAdornment,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Tabs,
  Tab
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import DeliveryMap from '../components/DeliveryMap';
import SearchIcon from '@mui/icons-material/Search';

export default function DeliveryDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [activeOrder, setActiveOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    completed: 0,
    pending: 0,
    total: 0,
    earnings: 0
  });
  const [error, setError] = useState(null);
  const [showLocationMap, setShowLocationMap] = useState(false);
  const [deliveryLocation, setDeliveryLocation] = useState(null);
  const [isActive, setIsActive] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState(null);
  
  // New states for delivered orders
  const [deliveredOrders, setDeliveredOrders] = useState([]);
  const [showDeliveredOrders, setShowDeliveredOrders] = useState(false);
  const [deliveredOrdersLoading, setDeliveredOrdersLoading] = useState(false);
  
  // Email notification state
  const [emailPreviewUrl, setEmailPreviewUrl] = useState(null);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  
  // New state for pagination and filtering
  const [page, setPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [restaurantFilter, setRestaurantFilter] = useState('all');
  const [restaurantList, setRestaurantList] = useState([]);
  const ordersPerPage = 9; // Show 9 orders per page in a 3x3 grid
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isBackgroundRefreshing, setIsBackgroundRefreshing] = useState(false);

  // New state for sort options
  const [sortOption, setSortOption] = useState('distance');

  // Reset function for tab state
  const resetTabState = useCallback(() => {
    // Reset UI state when needed
    setPage(1);
    setError(null);
  }, []);
  
  // Function to handle tab changes
  const handleTabChange = useCallback((newValue) => {
    resetTabState();
    
    // Set tab states based on the selected tab
    const isDelivered = newValue === 1;
    
    setShowDeliveredOrders(isDelivered);
    
    // Update URL parameter for better navigation
    const url = new URL(window.location);
    if (isDelivered) {
      url.searchParams.set('tab', 'delivered');
    } else {
      url.searchParams.delete('tab');
    }
    window.history.replaceState({}, '', url);
  }, [resetTabState]);

  // Load data from localStorage and handle URL parameters
  useEffect(() => {
    // Cleanup and reset for initial state
    setActiveOrder(null);
    
    // Load cached stats from localStorage if available
    const cachedStats = localStorage.getItem('dashboardStats');
    if (cachedStats) {
      try {
        setStats(JSON.parse(cachedStats));
      } catch (e) {
        console.error('Error parsing cached stats:', e);
      }
    }
    
    // Check if we have cached orders and load them immediately
    const cachedOrders = localStorage.getItem('cachedAvailableOrders');
    if (cachedOrders) {
      try {
        const parsedOrders = JSON.parse(cachedOrders);
        const cachedTime = localStorage.getItem('cachedOrdersTimestamp');
        const now = new Date().getTime();
        
        // Only use cached orders if they're less than 30 seconds old
        if (cachedTime && (now - parseInt(cachedTime)) < 30000) {
          console.log('Loading orders from cache');
          setOrders(parsedOrders);
          
          // Extract restaurant names for filter
          const restaurants = [...new Set(parsedOrders.map(order => order.restaurantName))].filter(Boolean);
          setRestaurantList(restaurants);
          
          // Show cached orders immediately while fetching fresh ones
          setLoading(false);
          setIsInitialLoad(false);
        }
      } catch (error) {
        console.error('Error parsing cached orders:', error);
      }
    }

    // Check URL parameters for tab selection
    const urlParams = new URLSearchParams(window.location.search);
    const tabParam = urlParams.get('tab');
    
    if (tabParam === 'delivered') {
      setShowDeliveredOrders(true);
    } else {
      setShowDeliveredOrders(false);
    }
    
    // Load initial data
    fetchDeliveryAgentStatus();
  }, []);

  // Effect for data fetching to avoid conflicts with initialization
  useEffect(() => {
    // Begin fetching the live data immediately, even if we have cached data
    fetchOrders(false, true);
    fetchActiveOrder();
    fetchStats();
    
    if (showDeliveredOrders) {
      fetchDeliveredOrders();
    }
  }, [showDeliveredOrders]);

  // Set up polling for data updates with more frequent checks
  useEffect(() => {
    // Initial setup - fetch orders with higher frequency
    const ordersInterval = setInterval(() => {
      if (isActive && !showDeliveredOrders) {
        // Pass true to indicate this is a background refresh (won't show loading indicator)
        fetchOrders(true, false);
      }
    }, 5000); // Check every 5 seconds for new orders - more frequent updates
    
    // Set up less frequent polling for active orders and stats
    const statusInterval = setInterval(() => {
      if (isActive) {
        fetchActiveOrder();
        fetchStats();
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(ordersInterval);
      clearInterval(statusInterval);
      if (refreshInterval) {
        clearInterval(refreshInterval);
      }
    };
  }, [isActive, showDeliveredOrders]);

  // Refresh active order and stats when any state changes
  useEffect(() => {
    // Update stats to reflect the current state
    fetchStats();
  }, [activeOrder?._id]);

  // Fetch the delivery agent's current status and location
  const fetchDeliveryAgentStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      const response = await axios.get(
        'http://localhost:3000/api/delivery/stats',
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data) {
        setIsActive(response.data.isActive || false);
        
        if (response.data.location) {
          setDeliveryLocation({
            coordinates: {
              lat: response.data.location.lat,
              lng: response.data.location.lng
            },
            street: response.data.location.address || 'Unknown Street',
            city: '',
            state: '',
            country: '',
            zipCode: ''
          });
        }
      }
    } catch (error) {
      console.error('Error fetching delivery agent status:', error);
      // Don't set error state as this is not critical
    }
  };

  const fetchOrders = async (isBackgroundRefresh = false, isForcedRefresh = false) => {
    try {
      // Only show loading indicator for initial loads, not background refreshes
      if (!isBackgroundRefresh) {
        setLoading(true);
      } else {
        setIsBackgroundRefreshing(true);
      }
      
      if (!isForcedRefresh) {
        setError(null);
      }
      
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // Check if delivery agent is active
      if (!isActive) {
        setOrders([]);
        if (!isForcedRefresh) {
          setError('You must be active to view available orders.');
        }
        if (!isBackgroundRefresh) {
          setLoading(false);
        } else {
          setIsBackgroundRefreshing(false);
        }
        return;
      }

      // Fetch available orders using the API Gateway
      const ordersResponse = await axios.get(
        'http://localhost:3000/api/delivery/available-orders', 
        {
          headers: { Authorization: `Bearer ${token}` },
          // Add cache buster parameter to prevent browser caching
          params: { _t: new Date().getTime() }
        }
      );
      
      // Cache the fresh orders in localStorage for faster load on next visit
      try {
        localStorage.setItem('cachedAvailableOrders', JSON.stringify(ordersResponse.data));
        localStorage.setItem('cachedOrdersTimestamp', new Date().getTime().toString());
      } catch (error) {
        console.warn('Failed to cache orders:', error);
        // Continue normal operation even if caching fails
      }
      
      // Set orders and extract unique restaurant names for filtering
      setOrders(ordersResponse.data);
      
      // Extract unique restaurant names for the filter dropdown
      const restaurants = [...new Set(ordersResponse.data.map(order => order.restaurantName))].filter(Boolean);
      setRestaurantList(restaurants);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        pending: ordersResponse.data.length
      }));
      
      // Mark initial load as complete
      setIsInitialLoad(false);
    } catch (error) {
      console.error('Error fetching orders:', error);
      if (!isForcedRefresh) {
        if (error.response?.status === 400 && error.response.data?.detail === 'Please update your location first') {
          setError('Please update your location to see nearby orders.');
        } else if (error.response?.status === 404 && error.response.data?.message.includes('not found')) {
          setError('Please update your status to active to see available orders.');
        } else {
          setError('Failed to fetch orders: ' + (error.response?.data?.message || error.message));
        }
      }
    } finally {
      if (!isBackgroundRefresh) {
        setLoading(false);
      } else {
        setIsBackgroundRefreshing(false);
      }
    }
  };

  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        console.error('Authentication token not found when fetching stats');
        return;
      }

      // Fetch delivery stats through the API Gateway
      const statsResponse = await axios.get(
        'http://localhost:3000/api/delivery/stats', 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Delivery stats:', statsResponse.data);
      
      // Get actual counts from the API or use the current state as fallback
      const completedCount = statsResponse.data.completedCount || deliveredOrders.length;
      const pendingCount = orders.length;
      const totalCount = statsResponse.data.totalCount || completedCount;
      
      // Update stats with real data and save to localStorage for persistence
      const updatedStats = {
        completed: completedCount,
        pending: pendingCount,
        total: totalCount,
        earnings: statsResponse.data.totalEarnings || 0
      };
      
      // Save stats to localStorage to persist across refreshes
      localStorage.setItem('dashboardStats', JSON.stringify(updatedStats));
      
      setStats(updatedStats);
    } catch (error) {
      console.error('Error fetching stats:', error);
      
      // Try to load stats from localStorage if the API call failed
      const cachedStats = localStorage.getItem('dashboardStats');
      if (cachedStats) {
        try {
          setStats(JSON.parse(cachedStats));
        } catch (e) {
          console.error('Error parsing cached stats:', e);
        }
      }
    }
  };

  const fetchActiveOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.error('Authentication token not found when fetching active order');
        return;
      }

      // Fetch the delivery agent's active deliveries through the API Gateway
      const activeResponse = await axios.get(
        'http://localhost:3000/api/delivery/my-deliveries', 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('My deliveries:', activeResponse.data);
      
      // Find the active delivery (if any)
      const activeDelivery = activeResponse.data.find(order => 
        order.status === 'out_for_delivery'
      );
      
      if (activeDelivery) {
        console.log('Active delivery found:', activeDelivery);
        setActiveOrder(activeDelivery);
        setIsActive(true);
      }
    } catch (error) {
      console.error('Error fetching active order:', error);
      // Don't set error state for active order, as it's not critical
    }
  };

  const acceptOrder = async (order) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      console.log('Accepting order:', order._id);
      
      // Add a loading state for the current order
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o._id === order._id ? { ...o, isAccepting: true } : o
        )
      );
      
      // Accept the order through the API Gateway
      const acceptResponse = await axios.post(
        `http://localhost:3000/api/delivery/orders/${order._id}/accept`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Order accepted response:', acceptResponse.data);
      
      // Clear any existing email preview URL
      setEmailPreviewUrl(null);
      
      // Only set active order if we have a successful response
      if (acceptResponse.data && acceptResponse.data.order) {
        setActiveOrder(acceptResponse.data.order);
        
        // Check if email was sent but don't expect a preview URL anymore
        if (acceptResponse.data.emailSent) {
          // Show success notification without link
          toast.success(
            'Order accepted! Email notification sent to customer.',
            { duration: 5000, icon: '📧' }
          );
        } else {
          // Standard success notification
          toast.success(`You have accepted the order from ${order.restaurantName || 'the restaurant'}`);
        }
      } else {
        toast.error('Could not retrieve order details. Please try again.');
      }
      
      // Clear the loading state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o._id === order._id ? { ...o, isAccepting: false } : o
        )
      );
      
      // Refresh orders
      fetchOrders();
    } catch (error) {
      console.error('Error accepting order:', error);
      
      // Clear the loading state
      setOrders(prevOrders => 
        prevOrders.map(o => 
          o._id === order._id ? { ...o, isAccepting: false } : o
        )
      );
      
      // Check for specific error messages
      if (error.response?.status === 403 || error.response?.data?.message?.includes('Not authorized')) {
        toast.error('Authorization error. Please update your delivery agent status or contact support.');
        
        // Refresh delivery agent status
        fetchDeliveryAgentStatus();
      } else {
        toast.error('Failed to accept order: ' + (error.response?.data?.message || error.message));
      }
    }
  };

  const completeDelivery = async () => {
    if (!activeOrder) return;
    
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      console.log('Completing delivery for order:', activeOrder._id);
      
      // Mark delivery as complete through the API Gateway using the new endpoint
      const deliveryResponse = await axios.post(
        `http://localhost:3000/api/delivery/orders/${activeOrder._id}/deliver`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      // Basic success notification
      toast.success('Delivery marked as completed!');
      
      // Check if email was sent but don't expect a preview URL anymore
      if (deliveryResponse.data.emailSent) {
        // Show email notification toast without link to preview
        toast.success(
          'Delivery confirmation email sent to customer!',
          { duration: 5000, icon: '📧' }
        );
      }
      
      // Update stats
      fetchStats();
      
      // Reset active order
      setActiveOrder(null);
      
      // Switch to delivered orders view
      setShowDeliveredOrders(true);
      
      // Fetch delivered orders
      fetchDeliveredOrders();
    } catch (error) {
      console.error('Error completing delivery:', error);
      toast.error('Failed to complete delivery: ' + (error.response?.data?.message || error.message));
    }
  };

  // Function to handle location selection from map
  const handleLocationSelect = (location) => {
    console.log('Selected location:', location);
    setDeliveryLocation(location);
  };

  // Function to mark delivery agent as active with location
  const markAsActive = () => {
    setShowLocationMap(true);
  };

  // Function to update location even when already active
  const updateLocation = () => {
    setShowLocationMap(true);
  };

  // Function to confirm location and mark as active
  const confirmLocation = async () => {
    if (!deliveryLocation) {
      toast.error('Please select your location on the map first');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      // Update the delivery agent's location and status
      await axios.post(
        'http://localhost:3000/api/delivery/update-status',
        { 
          isActive: true,
          location: {
            lat: deliveryLocation.coordinates.lat,
            lng: deliveryLocation.coordinates.lng,
            address: deliveryLocation.street || 'Unknown street'
          }
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setIsActive(true);
      setShowLocationMap(false);
      toast.success('Location updated and status set to active!');
      
      // Fetch nearby orders immediately with loading indicator
      setLoading(true);
      await fetchOrders();
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error('Failed to update location: ' + (error.response?.data?.message || error.message));
    }
  };

  // Function to toggle active status
  const toggleActiveStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Authentication token not found. Please log in again.');
        return;
      }

      if (isActive) {
        // Deactivate the delivery agent
        await axios.post(
          'http://localhost:3000/api/delivery/update-status',
          { 
            isActive: false
          },
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );
        
        setIsActive(false);
        toast.success('You are now inactive');
        
        // Clear refresh interval
        if (refreshInterval) {
          clearInterval(refreshInterval);
          setRefreshInterval(null);
        }
      } else {
        // If going active, prompt for location first
        markAsActive();
      }
    } catch (error) {
      console.error('Error toggling active status:', error);
      toast.error('Failed to update status: ' + (error.response?.data?.message || error.message));
    }
  };

  // Handle sort option change
  const handleSortOptionChange = (event) => {
    setSortOption(event.target.value);
  };

  // Get filtered and paginated orders
  const getFilteredOrders = () => {
    return orders.filter(order => {
      // Filter by restaurant if selected
      const matchesRestaurant = restaurantFilter === 'all' || 
                               order.restaurantName === restaurantFilter;
      
      // Filter by search term in order ID, restaurant name, or address
      const matchesSearch = searchTerm === '' || 
                           order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (order.restaurantName && order.restaurantName.toLowerCase().includes(searchTerm.toLowerCase())) ||
                           (order.deliveryAddress && 
                            `${order.deliveryAddress.street} ${order.deliveryAddress.city} ${order.deliveryAddress.state}`
                            .toLowerCase().includes(searchTerm.toLowerCase()));
      
      return matchesRestaurant && matchesSearch;
    });
  };
  
  // Get sorted orders based on selected sort option
  const getSortedOrders = () => {
    const filtered = getFilteredOrders();
    
    switch(sortOption) {
      case 'distance':
        return [...filtered].sort((a, b) => {
          // Default to distance sorting
          return (a.totalDistance || Infinity) - (b.totalDistance || Infinity);
        });
      case 'price_high':
        return [...filtered].sort((a, b) => {
          return (b.totalAmount || 0) - (a.totalAmount || 0);
        });
      case 'price_low':
        return [...filtered].sort((a, b) => {
          return (a.totalAmount || 0) - (b.totalAmount || 0);
        });
      case 'newest':
        return [...filtered].sort((a, b) => {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        });
      default:
        return filtered;
    }
  };
  
  // Get paginated orders for current page
  const getPaginatedOrders = () => {
    const sorted = getSortedOrders();
    const startIndex = (page - 1) * ordersPerPage;
    return sorted.slice(startIndex, startIndex + ordersPerPage);
  };
  
  // Calculate total pages
  const totalPages = Math.ceil(getFilteredOrders().length / ordersPerPage);
  
  // Handle page change
  const handlePageChange = (event, value) => {
    setPage(value);
  };
  
  // Handle search term change
  const handleSearchChange = (event) => {
    setSearchTerm(event.target.value);
    setPage(1); // Reset to first page on new search
  };
  
  // Handle restaurant filter change
  const handleRestaurantFilterChange = (event) => {
    setRestaurantFilter(event.target.value);
    setPage(1); // Reset to first page on filter change
  };

  // Function to fetch delivered orders
  const fetchDeliveredOrders = async () => {
    try {
      setDeliveredOrdersLoading(true);
      setError(null);
      const token = localStorage.getItem('token');
      
      if (!token) {
        setError('Authentication token not found. Please log in again.');
        return;
      }

      // Fetch completed deliveries using the API Gateway
      const response = await axios.get(
        'http://localhost:3000/api/delivery/my-delivered-orders', 
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      
      console.log('Delivered orders:', response.data);
      
      setDeliveredOrders(response.data);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        completed: response.data.length
      }));
    } catch (error) {
      console.error('Error fetching delivered orders:', error);
      setError('Failed to fetch delivered orders: ' + (error.response?.data?.message || error.message));
    } finally {
      setDeliveredOrdersLoading(false);
    }
  };

  // Show appropriate content based on current tab
  const showAvailableOrders = !showDeliveredOrders;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ pt: 4, pb: 8 }}>
      {/* Page Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Delivery Dashboard
        </Typography>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ mr: 2 }}>
            <Chip
              label={isActive ? 'Active' : 'Inactive'}
              color={isActive ? 'success' : 'default'}
              sx={{ mr: 1 }}
            />
          </Box>
          
          {isActive ? (
            <>
              <Button 
                variant="outlined" 
                color="primary"
                onClick={updateLocation}
                sx={{ mr: 2 }}
              >
                Update Location
              </Button>
              <Button 
                variant="outlined" 
                color="error"
                onClick={toggleActiveStatus}
              >
                Go Inactive
              </Button>
            </>
          ) : (
            <Button 
              variant="contained" 
              color="success"
              onClick={markAsActive}
            >
              Mark as Active
            </Button>
          )}
        </Box>
      </Box>
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Completed Deliveries
            </Typography>
            <Typography variant="h4">{stats.completed}</Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Available Orders
            </Typography>
            <Typography variant="h4">
              {stats.pending}
              {isBackgroundRefreshing && <CircularProgress size={16} sx={{ ml: 1 }} />}
            </Typography>
          </Paper>
        </Grid>
        <Grid item xs={12} sm={6} md={4}>
          <Paper sx={{ p: 2, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Total Deliveries
            </Typography>
            <Typography variant="h4">{stats.total}</Typography>
          </Paper>
        </Grid>
      </Grid>

      {/* Navigation Tabs */}
      <Paper sx={{ mb: 4 }}>
        <Tabs
          value={showDeliveredOrders ? 1 : 0}
          onChange={(e, newValue) => handleTabChange(newValue)}
          variant="fullWidth"
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Tab label="Available Orders" />
          <Tab label="Delivered Orders" />
        </Tabs>
      </Paper>
      
      {/* Current Location Map (when active without order) */}
      {isActive && !activeOrder && deliveryLocation && showAvailableOrders && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Your Current Location
          </Typography>
          <Box sx={{ height: 300 }}>
            <DeliveryMap 
              onLocationSelect={handleLocationSelect}
              initialAddress={deliveryLocation}
              isSelectable={false}
            />
          </Box>
          <Box sx={{ mt: 2 }}>
            <Typography variant="subtitle1" fontWeight="bold">Current Position:</Typography>
            <Typography>
              {deliveryLocation.street}, {deliveryLocation.city}, {deliveryLocation.state} {deliveryLocation.zipCode}, {deliveryLocation.country}
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Active Delivery */}
      {activeOrder && showAvailableOrders && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Active Delivery
          </Typography>
          
          {emailPreviewUrl && (
            <Box sx={{ mb: 3, p: 2, backgroundColor: '#e8f5e9', borderRadius: 1 }}>
              <Typography variant="subtitle1" fontWeight="bold" color="primary">
                Email Notification Sent
              </Typography>
              <Typography variant="body2" sx={{ mb: 1 }}>
                A notification email has been sent to the customer about their order being on the way.
              </Typography>
            </Box>
          )}
          
          <Grid container spacing={2}>
            <Grid item xs={12} md={6}>
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Restaurant
                </Typography>
                <Typography variant="body1">
                  {activeOrder.restaurantName || 'Not specified'}
                </Typography>
                {activeOrder.restaurantLocation?.address && (
                  <Typography variant="body2" color="text.secondary">
                    {activeOrder.restaurantLocation.address}
                  </Typography>
                )}
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Delivery Address
                </Typography>
                <Typography variant="body1">
                  {activeOrder.deliveryAddress?.street}, {activeOrder.deliveryAddress?.city}, {activeOrder.deliveryAddress?.state}, {activeOrder.deliveryAddress?.zipCode}
                </Typography>
              </Box>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Order Items
                </Typography>
                <List dense disablePadding>
                  {activeOrder.items?.map((item, index) => (
                    <ListItem key={index} sx={{ py: 0.5 }}>
                      <ListItemText
                        primary={`${item.quantity}x ${item.name}`}
                        secondary={`$${(item.price * item.quantity).toFixed(2)}`}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
              
              <Box sx={{ mb: 3 }}>
                <Typography variant="subtitle1" fontWeight="bold">
                  Total Amount
                </Typography>
                <Typography variant="h6">${activeOrder.totalAmount?.toFixed(2) || '0.00'}</Typography>
              </Box>
              
              <Box sx={{ mt: 3, display: 'flex', justifyContent: 'center' }}>
                <Button 
                  variant="contained" 
                  color="success" 
                  onClick={completeDelivery}
                  startIcon={<span className="material-icons">check_circle</span>}
                >
                  Mark as Delivered
                </Button>
              </Box>
            </Grid>
            <Grid item xs={12} md={6}>
              <Box sx={{ height: '100%', minHeight: 300 }}>
                <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                  Delivery Location
                </Typography>
                <DeliveryMap 
                  initialAddress={activeOrder.deliveryAddress || deliveryLocation}
                  onLocationSelect={() => {}}
                  isSelectable={false}
                />
              </Box>
            </Grid>
          </Grid>
        </Paper>
      )}
      
      {/* Delivered Orders Section */}
      {showDeliveredOrders && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Typography variant="h5" gutterBottom>
            Delivered Orders
          </Typography>
          
          {deliveredOrdersLoading ? (
            <Box display="flex" justifyContent="center" alignItems="center" py={4}>
              <CircularProgress />
            </Box>
          ) : deliveredOrders.length === 0 ? (
            <Alert severity="info" sx={{ mb: 3 }}>
              You have not completed any deliveries yet.
            </Alert>
          ) : (
            <>
              <Box sx={{ mb: 3 }}>
                <Typography variant="body2" color="text.secondary">
                  Total delivered orders: {deliveredOrders.length}
                </Typography>
              </Box>
              
              <Grid container spacing={3}>
                {deliveredOrders.map((order) => (
                  <Grid item xs={12} sm={6} md={4} key={order._id}>
                    <Card sx={{ height: '100%' }}>
                      <CardContent>
                        <Typography variant="h6" gutterBottom>
                          Order #{order._id.substring(order._id.length - 6)}
                        </Typography>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Restaurant
                          </Typography>
                          <Typography variant="body1" fontWeight="medium">
                            {order.restaurantName || 'Not specified'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Delivery Address
                          </Typography>
                          <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                            {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Items
                          </Typography>
                          <Typography variant="body1">
                            {order.items?.length || 0} items
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Total Amount
                          </Typography>
                          <Typography variant="body1" fontWeight="bold">
                            ${order.totalAmount?.toFixed(2) || '0.00'}
                          </Typography>
                        </Box>
                        
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Delivered On
                          </Typography>
                          <Typography variant="body1">
                            {new Date(order.updatedAt).toLocaleDateString()} at {new Date(order.updatedAt).toLocaleTimeString()}
                          </Typography>
                        </Box>
                        
                        <Chip 
                          label="Delivered" 
                          color="success" 
                          sx={{ mt: 1 }}
                        />
                      </CardContent>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </>
          )}
        </Paper>
      )}
      
      {/* Available Orders Section */}
      {showAvailableOrders && (
        <Paper sx={{ p: 3, mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <Typography variant="h5">
                Available Orders
              </Typography>
              {isBackgroundRefreshing && (
                <CircularProgress size={20} sx={{ ml: 2 }} />
              )}
            </Box>
            
            <Box sx={{ display: 'flex', gap: 2 }}>
              {/* Manual refresh button */}
              <Button 
                size="small"
                onClick={() => fetchOrders(false, true)}
                disabled={loading || isBackgroundRefreshing}
                startIcon={<span className="material-icons">refresh</span>}
                sx={{ minWidth: 'auto', p: '4px' }}
              >
                Refresh
              </Button>
              
              {/* Sort dropdown */}
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="sort-select-label">Sort By</InputLabel>
                <Select
                  labelId="sort-select-label"
                  id="sort-select"
                  value={sortOption}
                  onChange={handleSortOptionChange}
                  label="Sort By"
                >
                  <MenuItem value="distance">Distance (Nearest)</MenuItem>
                  <MenuItem value="price_high">Price (Highest)</MenuItem>
                  <MenuItem value="price_low">Price (Lowest)</MenuItem>
                  <MenuItem value="newest">Newest First</MenuItem>
                </Select>
              </FormControl>
              
              {/* Restaurant filter */}
              <FormControl variant="outlined" size="small" sx={{ minWidth: 150 }}>
                <InputLabel id="restaurant-select-label">Restaurant</InputLabel>
                <Select
                  labelId="restaurant-select-label"
                  id="restaurant-select"
                  value={restaurantFilter}
                  onChange={handleRestaurantFilterChange}
                  label="Restaurant"
                >
                  <MenuItem value="all">All Restaurants</MenuItem>
                  {restaurantList.map(restaurant => (
                    <MenuItem key={restaurant} value={restaurant}>{restaurant}</MenuItem>
                  ))}
                </Select>
              </FormControl>
              
              {/* Search input */}
              <TextField
                placeholder="Search orders..."
                value={searchTerm}
                onChange={handleSearchChange}
                size="small"
                sx={{ minWidth: 200 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>
          
          {!isActive && (
            <Alert severity="info" sx={{ mb: 3 }}>
              Please mark yourself as active and set your location to see nearby orders.
            </Alert>
          )}
          
          {isActive && orders.length === 0 && !loading && (
            <Alert severity="info" sx={{ mb: 3 }}>
              No available orders found in your area. Try updating your location or check back later.
            </Alert>
          )}
          
          <Grid container spacing={3}>
            {getFilteredOrders().length === 0 ? (
              <Grid item xs={12}>
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography color="text.secondary">
                    No available orders {restaurantFilter !== 'all' ? `from ${restaurantFilter}` : ''} 
                    {searchTerm ? ` matching "${searchTerm}"` : ''}.
                  </Typography>
                </Box>
              </Grid>
            ) : (
              getPaginatedOrders().map((order) => (
                <Grid item xs={12} sm={6} lg={4} key={order._id}>
                  <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom>
                        Order #{order._id.substring(order._id.length - 6)}
                      </Typography>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Restaurant
                        </Typography>
                        <Typography variant="body1" fontWeight="medium">
                          {order.restaurantName || 'Not specified'}
                        </Typography>
                      </Box>
                      
                      {order.totalDistance !== undefined && (
                        <Box sx={{ mb: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            Distance
                          </Typography>
                          <Typography variant="body1" color="primary" fontWeight="medium">
                            {order.totalDistance.toFixed(2)} km away
                          </Typography>
                        </Box>
                      )}
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Delivery Address
                        </Typography>
                        <Typography variant="body1" sx={{ fontSize: '0.875rem' }}>
                          {order.deliveryAddress?.street}, {order.deliveryAddress?.city}, {order.deliveryAddress?.state}
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Items
                        </Typography>
                        <Typography variant="body1">
                          {order.items?.length || 0} items
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                          Total Amount
                        </Typography>
                        <Typography variant="body1" fontWeight="bold">
                          ${order.totalAmount?.toFixed(2) || '0.00'}
                        </Typography>
                      </Box>
                    </CardContent>
                      
                    <Box p={2} pt={0}>
                      <Button 
                        variant="contained" 
                        color="primary" 
                        fullWidth
                        onClick={() => acceptOrder(order)}
                        disabled={!!activeOrder || !isActive || order.isAccepting}
                      >
                        {order.isAccepting ? (
                          <CircularProgress size={24} color="inherit" />
                        ) : !isActive 
                          ? 'Mark as active first' 
                          : !!activeOrder 
                          ? 'Finish current delivery' 
                          : 'Accept Order'}
                      </Button>
                    </Box>

                    {order.createdAt && (
                      <Box position="absolute" top={12} right={12}>
                        <Chip 
                          size="small" 
                          label={`${Math.round((new Date() - new Date(order.createdAt)) / 60000)} min ago`} 
                          color="default"
                        />
                      </Box>
                    )}
                  </Card>
                </Grid>
              ))
            )}
          </Grid>
          
          {/* Pagination controls */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination 
                count={totalPages} 
                page={page} 
                onChange={handlePageChange} 
                color="primary" 
              />
            </Box>
          )}
          
          {/* Order count */}
          <Box sx={{ mt: 3, textAlign: 'center' }}>
            <Typography variant="body2" color="text.secondary">
              Showing {getFilteredOrders().length > 0 ? 
                `${(page - 1) * ordersPerPage + 1}-${Math.min(page * ordersPerPage, getFilteredOrders().length)} of ` : ''}
              {getFilteredOrders().length} orders
            </Typography>
          </Box>
        </Paper>
      )}
      
      {/* Location Map Dialog */}
      <Dialog
        open={showLocationMap}
        onClose={() => setShowLocationMap(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {isActive ? 'Update Your Location' : 'Set Your Current Location'}
        </DialogTitle>
        <DialogContent>
          <Box sx={{ pt: 2 }}>
            <DeliveryMap 
              onLocationSelect={handleLocationSelect} 
              initialAddress={deliveryLocation}
              isSelectable={true}
            />
            {deliveryLocation && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle1" fontWeight="bold">Selected Location:</Typography>
                <Typography>
                  {deliveryLocation.street}, {deliveryLocation.city}, {deliveryLocation.state} {deliveryLocation.zipCode}, {deliveryLocation.country}
                </Typography>
              </Box>
            )}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowLocationMap(false)}>Cancel</Button>
          <Button 
            onClick={confirmLocation} 
            variant="contained" 
            color="primary"
            disabled={!deliveryLocation}
          >
            Confirm Location
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 