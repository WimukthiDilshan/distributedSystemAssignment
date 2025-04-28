import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
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
  IconButton,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  useTheme,
  Fade,
  Avatar
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import OrderTracking from '../components/OrderTracking';

// Order status component
const OrderStatus = ({ status }) => {
  const getStatusColor = () => {
    switch (status) {
      case 'pending': return { bg: '#FFF4E5', text: '#FF9800' };
      case 'preparing': return { bg: '#E3F2FD', text: '#2196F3' };
      case 'ready': return { bg: '#E8F5E9', text: '#4CAF50' };
      case 'out_for_delivery': return { bg: '#E1F5FE', text: '#03A9F4' };
      case 'delivered': return { bg: '#DCEDC8', text: '#689F38' };
      case 'cancelled': return { bg: '#FFEBEE', text: '#F44336' };
      default: return { bg: '#F5F5F5', text: '#9E9E9E' };
    }
  };

  const { bg, text } = getStatusColor();

  return (
    <Chip 
      label={status === 'out_for_delivery' ? 'Out For Delivery' : status.charAt(0).toUpperCase() + status.slice(1).replace(/_/g, ' ')} 
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

export default function Orders() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  
  // New state for order tracking
  const [trackingDialogOpen, setTrackingDialogOpen] = useState(false);

  const statusFilters = ['all', 'pending', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'];

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const response = await axios.get('http://localhost:3003/api/orders/user', {
        headers: { Authorization: `Bearer ${token || localStorage.getItem('token')}` }
      });
      setOrders(response.data);
    } catch (error) {
      console.error('Error fetching orders:', error);
      toast.error('Failed to load orders: ' + (error.response?.data?.message || error.message));
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
  };

  const handleTabChange = (event, newValue) => {
    setActiveTab(newValue);
  };

  const getFilteredOrders = () => {
    // Filter orders based on status and search term
    return orders.filter(order => {
      const matchesStatus = filterStatus === 'all' || order.status === filterStatus;
      const matchesSearch = 
        searchTerm === '' || 
        order.restaurantName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.items.some(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        order._id.toLowerCase().includes(searchTerm.toLowerCase());

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
      case 2: // Highest price
        return [...filteredOrders].sort((a, b) => b.totalAmount - a.totalAmount);
      default:
        return filteredOrders;
    }
  };

  const sortedOrders = getSortedOrders();

  // Handle tracking dialog for out-for-delivery orders
  const handleTrackOrder = () => {
    setTrackingDialogOpen(true);
  };

  const handleCloseTrackingDialog = () => {
    setTrackingDialogOpen(false);
  };

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
          Loading your orders...
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
              background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              mb: 4
            }}
          >
            My Orders
          </Typography>

          <Grid container spacing={2} sx={{ mb: 4 }}>
            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                placeholder="Search orders by restaurant, item, or order ID..."
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
              <Tab label="Highest Total" />
            </Tabs>
          </Box>

          {sortedOrders.length === 0 ? (
            <Paper 
              sx={{ 
                p: 5, 
                textAlign: 'center',
                borderRadius: 3,
                boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                backgroundImage: 'linear-gradient(to bottom right, #f9f9f9, #ffffff)',
                position: 'relative',
                overflow: 'hidden',
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
                  backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)' 
                }} 
              />
              <Typography variant="h5" fontWeight="bold" gutterBottom>
                No Orders Found
              </Typography>
              <Typography 
                variant="body1" 
                color="text.secondary" 
                paragraph
                sx={{ fontSize: '1.1rem', maxWidth: '500px', mx: 'auto', mb: 4 }}
              >
                {searchTerm || filterStatus !== 'all' 
                  ? "No orders match your current filters. Try adjusting your search criteria."
                  : "You haven't placed any orders yet. Explore our restaurants and place your first order!"}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', mb: 3 }}>
                <span style={{ fontSize: '4rem' }}>🍽️</span>
              </Box>
              <Button 
                variant="contained" 
                color="primary"
                size="large"
                onClick={() => navigate('/restaurants')}
                sx={{ 
                  px: 4, 
                  py: 1.5, 
                  borderRadius: 2,
                  fontWeight: 'bold',
                  backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                  ':hover': {
                    backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                  }
                }}
              >
                Browse Restaurants
              </Button>
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
                        backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)' 
                      }}
                    />
                    <CardContent sx={{ p: 3 }}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                        <Box>
                          <Typography variant="h6" fontWeight="bold" gutterBottom>
                            {order.restaurantName}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            Order #{order._id.substring(order._id.length - 6).toUpperCase()}
                          </Typography>
                        </Box>
                        <OrderStatus status={order.status} />
                      </Box>

                      <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                        {format(new Date(order.createdAt), 'MMM d, yyyy h:mm a')}
                      </Typography>

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
                            background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
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
                    backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
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
                    <Typography variant="subtitle1" fontWeight="medium" gutterBottom>
                      {selectedOrder.restaurantName}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Order #{selectedOrder._id}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {format(new Date(selectedOrder.createdAt), 'MMMM d, yyyy h:mm a')}
                    </Typography>
                  </Box>

                  {/* Add Track Order button for out_for_delivery orders */}
                  {selectedOrder.status === 'out_for_delivery' && (
                    <Box sx={{ mb: 3 }}>
                      <Button
                        variant="contained"
                        fullWidth
                        sx={{
                          backgroundImage: 'linear-gradient(to right, #03A9F4, #00BCD4)',
                          color: 'white',
                          borderRadius: 2,
                          py: 1.5,
                          '&:hover': {
                            backgroundImage: 'linear-gradient(to right, #039BE5, #00ACC1)',
                          }
                        }}
                        onClick={handleTrackOrder}
                      >
                        Track Order
                      </Button>
                    </Box>
                  )}

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

                  {selectedOrder.deliveryAddress.coordinates?.lat && selectedOrder.deliveryAddress.coordinates?.lng && (
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                      Coordinates: {selectedOrder.deliveryAddress.coordinates.lat.toFixed(6)}, {selectedOrder.deliveryAddress.coordinates.lng.toFixed(6)}
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
                    <Typography variant="body1">Subtotal:</Typography>
                    <Typography variant="body1">${selectedOrder.totalAmount.toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                    <Typography variant="body1">Delivery Fee:</Typography>
                    <Typography variant="body1">$3.99</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 2 }}>
                    <Typography variant="body1">Tax:</Typography>
                    <Typography variant="body1">${(selectedOrder.totalAmount * 0.07).toFixed(2)}</Typography>
                  </Box>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', pb: 1 }}>
                    <Typography variant="h6" fontWeight="bold">Total:</Typography>
                    <Typography 
                      variant="h6" 
                      fontWeight="bold"
                      sx={{
                        background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent'
                      }}
                    >
                      ${(selectedOrder.totalAmount + 3.99 + (selectedOrder.totalAmount * 0.07)).toFixed(2)}
                    </Typography>
                  </Box>
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
                  {selectedOrder.status !== 'cancelled' && (
                    <Button 
                      variant="contained" 
                      color="primary"
                      onClick={() => navigate(`/restaurant/${selectedOrder.restaurantId}`)}
                      sx={{ 
                        borderRadius: 2,
                        px: 3,
                        backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                        ':hover': {
                          backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                        }
                      }}
                    >
                      Order Again
                    </Button>
                  )}
                </DialogActions>
              </>
            )}
          </Dialog>

          {/* Order Tracking Dialog */}
          <Dialog
            open={trackingDialogOpen}
            onClose={handleCloseTrackingDialog}
            maxWidth="md"
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
                    backgroundImage: 'linear-gradient(to right, #03A9F4, #00BCD4)',
                    zIndex: 2
                  }}
                />
                <DialogContent sx={{ p: 0 }}>
                  <OrderTracking orderId={selectedOrder._id} onClose={handleCloseTrackingDialog} />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 3 }}>
                  <Button 
                    onClick={handleCloseTrackingDialog} 
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
        </Box>
      </Fade>
    </Container>
  );
} 