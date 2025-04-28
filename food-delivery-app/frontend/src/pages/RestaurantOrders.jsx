import { useState, useEffect } from 'react';
import { 
  Container, 
  Typography, 
  Paper, 
  Box, 
  Chip, 
  CircularProgress, 
  Grid, 
  Card, 
  CardContent, 
  Divider, 
  Button,
  List,
  ListItem,
  ListItemText,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Fade,
  Snackbar,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';

// Order status component
const OrderStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return { bg: '#FFF4E5', text: '#FF9800' };
      case 'preparing': return { bg: '#E3F2FD', text: '#2196F3' };
      case 'ready': return { bg: '#E8F5E9', text: '#4CAF50' };
      case 'delivered': return { bg: '#DCEDC8', text: '#689F38' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#F44336' };
      default: return { bg: '#F5F5F5', text: '#9E9E9E' };
    }
  };

  const { bg, text } = getStatusColor();

  return (
    <Chip 
      label={status.charAt(0).toUpperCase() + status.slice(1)} 
      sx={{ 
        backgroundColor: bg, 
        color: text,
        fontWeight: 'medium',
        borderRadius: '16px',
        fontSize: '0.85rem',
      }}
    />
  );
};

export default function RestaurantOrders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [snackbarOpen, setSnackbarOpen] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');
  const [snackbarSeverity, setSnackbarSeverity] = useState('success');
  const { user, token, restaurantId, updateRestaurantId } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();

  const statusFilters = ['all', 'pending', 'preparing', 'ready', 'delivered', 'cancelled'];

  useEffect(() => {
    if (user?.role !== 'restaurant_admin') {
      navigate('/');
      toast.error('Unauthorized access');
      return;
    }
    
    // Check for restaurantId
    const currentRestaurantId = restaurantId || localStorage.getItem('adminRestaurantId');
    
    if (!currentRestaurantId) {
      setSnackbarMessage('Restaurant ID not found. Please go to Restaurants page first.');
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      setLoading(false);
      
      // Add debug info
      console.error('Missing restaurantId in context and localStorage');
      console.log('Auth context:', { user, restaurantId });
      console.log('LocalStorage adminRestaurantId:', localStorage.getItem('adminRestaurantId'));
      
      // Redirect to restaurants page to select a restaurant
      setTimeout(() => {
        navigate('/restaurants');
      }, 3000);
      
      return;
    }
    
    console.log('Using restaurantId:', currentRestaurantId);
    // Store in localStorage as a backup
    localStorage.setItem('adminRestaurantId', currentRestaurantId);
    
    fetchOrders();
  }, [user, restaurantId]);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Get restaurantId from all possible sources
      const currentRestaurantId = restaurantId || localStorage.getItem('adminRestaurantId');
      
      if (!currentRestaurantId) {
        throw new Error('Restaurant ID not found in your profile');
      }
      
      console.log('Fetching orders for restaurant:', currentRestaurantId);
      
      // Include the restaurantId in the URL as a query parameter and in a custom header
      const response = await axios.get(`http://localhost:3003/api/orders/restaurant/orders?restaurantId=${currentRestaurantId}`, {
        headers: { 
          Authorization: `Bearer ${token || localStorage.getItem('token')}`,
          'X-Restaurant-Id': currentRestaurantId
        }
      });
      
      console.log(`Fetched ${response.data.length} orders for restaurant ${currentRestaurantId}`);
      
      if (response.data.length === 0) {
        console.log('No orders found for this restaurant');
        toast.success('No orders found for your restaurant yet');
      }
      
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching restaurant orders:', error);
      const errorMessage = error.response?.data?.message || error.message;
      const errorDetail = error.response?.data?.detail || '';
      
      // Log detailed error information
      console.log('Error response:', error.response?.data);
      console.log('User context:', { userId: user?.id, role: user?.role });
      
      toast.error('Failed to load orders: ' + errorMessage);
      setSnackbarMessage(errorMessage + (errorDetail ? ` ${errorDetail}` : ''));
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
      
      // Reset orders to empty array on error
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (order) => {
    setSelectedOrder(order);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    // Refresh orders list to get updated status
    fetchOrders();
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      // Get current restaurantId from context or localStorage
      const currentRestaurantId = restaurantId || localStorage.getItem('adminRestaurantId');
      
      if (!currentRestaurantId) {
        throw new Error('Restaurant ID not found in your profile');
      }
      
      const response = await axios.patch(
        `http://localhost:3003/api/orders/${orderId}/status?restaurantId=${currentRestaurantId}`,
        { status: newStatus },
        {
          headers: { 
            Authorization: `Bearer ${token || localStorage.getItem('token')}`,
            'X-Restaurant-Id': currentRestaurantId
          }
        }
      );
      
      // Update the order in the local state
      setOrders(orders.map(order => 
        order._id === orderId ? { ...order, status: newStatus } : order
      ));
      
      // If a specific order is selected, update it too
      if (selectedOrder && selectedOrder._id === orderId) {
        setSelectedOrder({ ...selectedOrder, status: newStatus });
      }
      
      setSnackbarMessage(`Order status updated to ${newStatus}`);
      setSnackbarSeverity('success');
      setSnackbarOpen(true);
    } catch (error) {
      console.error('Error updating order status:', error);
      const errorMessage = error.response?.data?.message || 'Failed to update order status';
      setSnackbarMessage(errorMessage);
      setSnackbarSeverity('error');
      setSnackbarOpen(true);
    }
  };

  const getFilteredOrders = () => {
    // Filter orders based on status and search term
    return orders.filter(order => {
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const matchesSearch = 
        searchTerm === '' || 
        order._id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase()));

      return matchesStatus && matchesSearch;
    });
  };

  // Sort orders based on active tab
  const getSortedOrders = () => {
    const filteredOrders = getFilteredOrders();
    
    switch (activeTab) {
      case 0: // Most recent
        return [...filteredOrders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      case 1: // Oldest first
        return [...filteredOrders].sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
      case 2: // Pending first
        return [...filteredOrders].sort((a, b) => {
          const statusOrder = { pending: 0, preparing: 1, ready: 2, delivered: 3, cancelled: 4 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      default:
        return filteredOrders;
    }
  };

  const sortedOrders = getSortedOrders();

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="70vh"
        gap={2}
      >
        <Typography variant="h5" color="primary" gutterBottom>
          Loading restaurant orders...
        </Typography>
        <CircularProgress color="primary" size={60} thickness={4} />
      </Box>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ mt: 4, mb: 8 }}>
      <Fade in timeout={600}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom 
            fontWeight="bold"
            sx={{
              background: '-webkit-linear-gradient(45deg, #2196F3, #3f51b5)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            Restaurant Orders Management
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search orders by ID or item name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                sx={{ 
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <span style={{ fontSize: '1.2rem' }}>🔍</span>
                    </InputAdornment>
                  ),
                }}
              />
            </Grid>
            <Grid item xs={12} md={6}>
              <FormControl fullWidth>
                <InputLabel id="status-filter-label">Filter by Status</InputLabel>
                <Select
                  labelId="status-filter-label"
                  value={filterStatus}
                  label="Filter by Status"
                  onChange={(e) => setFilterStatus(e.target.value)}
                  sx={{ 
                    borderRadius: 2,
                    textTransform: 'capitalize'
                  }}
                >
                  {statusFilters.map((status) => (
                    <MenuItem key={status} value={status} sx={{ textTransform: 'capitalize' }}>
                      {status === 'all' ? 'All Orders' : status}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>

          <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
            <Tabs 
              value={activeTab} 
              onChange={handleTabChange} 
              aria-label="order sorting tabs"
              textColor="primary"
              indicatorColor="primary"
            >
              <Tab label="Most Recent" />
              <Tab label="Oldest First" />
              <Tab label="Pending First" />
            </Tabs>
          </Box>

          {sortedOrders.length === 0 ? (
            <Paper 
              sx={{ 
                p: 5, 
                textAlign: 'center',
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                mt: 4
              }}
            >
              <Box 
                sx={{ 
                  position: 'absolute', 
                  top: 0, 
                  left: 0, 
                  right: 0, 
                  height: '8px', 
                  backgroundImage: 'linear-gradient(to right, #2196F3, #3f51b5)' 
                }} 
              />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                {snackbarMessage.includes('Restaurant ID not found') 
                  ? "Restaurant Not Linked" 
                  : "No Orders Found"}
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                paragraph
                sx={{ fontSize: '1.1rem', maxWidth: '600px', mx: 'auto', mb: 4 }}
              >
                {snackbarMessage.includes('Restaurant ID not found') 
                  ? "Your user account is not properly linked to a restaurant. Please go to the Restaurants page and create or select your restaurant."
                  : searchTerm || filterStatus !== 'all' 
                    ? "No orders match your current filters. Try adjusting your search criteria."
                    : "Your restaurant doesn't have any orders yet."}
              </Typography>
              {snackbarMessage.includes('Restaurant ID not found') && (
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => navigate('/restaurants')}
                  sx={{ mt: 2 }}
                >
                  Go to Restaurants
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {sortedOrders.map((order) => (
                <Grid item xs={12} md={6} lg={4} key={order._id}>
                  <Card 
                    sx={{ 
                      cursor: 'pointer',
                      transition: 'transform 0.2s, box-shadow 0.2s',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: '0 8px 24px rgba(0,0,0,0.15)'
                      },
                      position: 'relative',
                      overflow: 'hidden',
                      height: '100%'
                    }}
                    onClick={() => handleOrderSelect(order)}
                  >
                    <Box 
                      sx={{ 
                        position: 'absolute', 
                        top: 0, 
                        left: 0, 
                        right: 0, 
                        height: '4px', 
                        backgroundImage: 'linear-gradient(to right, #2196F3, #3f51b5)' 
                      }}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            Order #{order._id.substring(order._id.length - 6).toUpperCase()}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                          </Typography>
                        </Box>
                        <OrderStatus status={order.status} />
                      </Box>

                      <Divider sx={{ my: 2 }} />

                      <Typography variant="body2" sx={{ mb: 2 }}>
                        {order.items.length} {order.items.length === 1 ? 'item' : 'items'}
                      </Typography>

                      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mb: 2 }}>
                        {order.items.slice(0, 3).map((item) => (
                          <Chip
                            key={item._id}
                            label={`${item.name} x${item.quantity}`}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: '16px' }}
                          />
                        ))}
                        {order.items.length > 3 && (
                          <Chip
                            label={`+${order.items.length - 3} more`}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: '16px' }}
                          />
                        )}
                      </Box>

                      <Divider sx={{ my: 2 }} />
                      
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Typography fontWeight="bold">Total:</Typography>
                        <Typography 
                          fontWeight="bold"
                          sx={{
                            background: '-webkit-linear-gradient(45deg, #2196F3, #3f51b5)',
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent'
                          }}
                        >
                          ${order.totalAmount.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          )}

          {/* Order Details Dialog */}
          <Dialog
            open={dialogOpen}
            onClose={handleCloseDialog}
            maxWidth="sm"
            fullWidth
            PaperProps={{
              sx: {
                borderRadius: 3,
                boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
                overflow: 'hidden'
              }
            }}
          >
            {selectedOrder && (
              <>
                <Box 
                  sx={{ 
                    position: 'absolute', 
                    top: 0, 
                    left: 0, 
                    right: 0, 
                    height: '5px', 
                    backgroundImage: 'linear-gradient(to right, #2196F3, #3f51b5)',
                    zIndex: 2
                  }}
                />
                <DialogTitle sx={{ pt: 4 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="h5" fontWeight="bold">
                      Order Details
                    </Typography>
                    <OrderStatus status={selectedOrder.status} />
                  </Box>
                </DialogTitle>
                <DialogContent sx={{ px: 3, py: 2 }}>
                  <Box sx={{ mb: 3 }}>
                    <Typography variant="body2" color="text.secondary">
                      Order #{selectedOrder._id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(selectedOrder.createdAt), 'MMMM d, yyyy h:mm a')}
                    </Typography>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Items
                  </Typography>
                  <List disablePadding>
                    {selectedOrder.items.map((item) => (
                      <ListItem key={item._id} disablePadding sx={{ py: 1 }}>
                        <ListItemText
                          primary={
                            <Typography variant="body1" fontWeight="medium">
                              {item.name}
                            </Typography>
                          }
                          secondary={
                            <Typography variant="body2" color="text.secondary">
                              Size: {item.size}
                            </Typography>
                          }
                        />
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                          <Typography variant="body2" color="text.secondary">
                            x{item.quantity}
                          </Typography>
                          <Typography variant="body2" fontWeight="medium">
                            ${(item.price * item.quantity).toFixed(2)}
                          </Typography>
                        </Box>
                      </ListItem>
                    ))}
                  </List>

                  <Divider sx={{ my: 3 }} />

                  <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                    Delivery Address
                  </Typography>
                  <Typography variant="body2">
                    {selectedOrder.deliveryAddress.street}
                  </Typography>
                  <Typography variant="body2">
                    {`${selectedOrder.deliveryAddress.city}, ${selectedOrder.deliveryAddress.state} ${selectedOrder.deliveryAddress.zipCode || ''}`}
                  </Typography>
                  {selectedOrder.deliveryAddress.country && (
                    <Typography variant="body2">
                      {selectedOrder.deliveryAddress.country}
                    </Typography>
                  )}

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      Payment Information
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      <Typography variant="body2">Method:</Typography>
                      <Chip
                        label={selectedOrder.paymentMethod === 'cash' ? 'Cash on Delivery' : 
                               selectedOrder.paymentMethod === 'card' ? 'Credit/Debit Card' : 'Wallet'}
                        size="small"
                        icon={
                          <span style={{ fontSize: '1rem' }}>
                            {selectedOrder.paymentMethod === 'cash' ? '💵' : 
                             selectedOrder.paymentMethod === 'card' ? '💳' : '👛'}
                          </span>
                        }
                        sx={{ borderRadius: '16px' }}
                      />
                    </Box>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="body2">Status:</Typography>
                      <Chip
                        label={
                          selectedOrder.paymentStatus === 'pending' ? 'Pending' :
                          selectedOrder.paymentStatus === 'completed' ? 'Paid' :
                          selectedOrder.paymentStatus === 'failed' ? 'Failed' : 'Refunded'
                        }
                        color={
                          selectedOrder.paymentStatus === 'completed' ? 'success' :
                          selectedOrder.paymentStatus === 'failed' ? 'error' :
                          selectedOrder.paymentStatus === 'refunded' ? 'info' : 'warning'
                        }
                        size="small"
                        variant="outlined"
                        sx={{ borderRadius: '16px' }}
                      />
                    </Box>
                  </Box>

                  <Divider sx={{ my: 3 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                    <Typography variant="body1">Total Amount:</Typography>
                    <Typography variant="body1" fontWeight="bold">${selectedOrder.totalAmount.toFixed(2)}</Typography>
                  </Box>

                  {/* Update Order Status Section */}
                  {selectedOrder.status !== 'cancelled' && selectedOrder.status !== 'delivered' && (
                    <>
                      <Divider sx={{ my: 3 }} />
                      <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                        Update Order Status
                      </Typography>
                      <Box sx={{ display: 'flex', gap: 2, mt: 2 }}>
                        {selectedOrder.status === 'pending' && (
                          <Button 
                            variant="contained" 
                            color="primary"
                            fullWidth
                            onClick={() => handleStatusChange(selectedOrder._id, 'preparing')}
                          >
                            Mark as Preparing
                          </Button>
                        )}
                        {(selectedOrder.status === 'pending' || selectedOrder.status === 'preparing') && (
                          <Button 
                            variant="contained" 
                            color="success"
                            fullWidth
                            onClick={() => handleStatusChange(selectedOrder._id, 'ready')}
                          >
                            Mark as Ready
                          </Button>
                        )}
                      </Box>
                    </>
                  )}
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                  <Button 
                    onClick={handleCloseDialog} 
                    variant="outlined"
                    sx={{ 
                      borderRadius: 2,
                      px: 3
                    }}
                  >
                    Close
                  </Button>
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Snackbar for notifications */}
          <Snackbar
            open={snackbarOpen}
            autoHideDuration={6000}
            onClose={() => setSnackbarOpen(false)}
            anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
          >
            <Alert 
              onClose={() => setSnackbarOpen(false)} 
              severity={snackbarSeverity} 
              sx={{ width: '100%' }}
            >
              {snackbarMessage}
            </Alert>
          </Snackbar>
        </Box>
      </Fade>
    </Container>
  );
} 