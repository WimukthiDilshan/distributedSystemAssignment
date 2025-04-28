import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  Paper,
  TextField,
  Grid,
  Card,
  CardContent,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Fade,
  Stepper,
  Step,
  StepLabel,
  Chip,
  Avatar,
  useTheme
} from '@mui/material';
import { useCart } from '../contexts/CartContext';
import { useAuth } from '../contexts/AuthContext';
import StripePayment from '../components/StripePayment';
import DeliveryMap from '../components/DeliveryMap';
import toast from 'react-hot-toast';
import axios from 'axios';

// Food-themed icons/emojis
const FoodIcon = () => <span style={{ fontSize: '1.5rem' }}>🍔</span>;
const DeliveryIcon = () => <span style={{ fontSize: '1.5rem' }}>🛵</span>;
const PaymentIcon = () => <span style={{ fontSize: '1.5rem' }}>💳</span>;
const SuccessIcon = () => <span style={{ fontSize: '1.5rem' }}>✅</span>;

export default function Cart() {
  const { cart, itemCount, loading, updateQuantity, removeFromCart, clearCart } = useCart();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [address, setAddress] = useState({
    street: '',
    city: '',
    state: '',
    zipCode: '',
    country: '',
    coordinates: {
      lat: null,
      lng: null
    }
  });
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [orderId, setOrderId] = useState(null);
  const [paymentStep, setPaymentStep] = useState('address'); // 'address', 'payment', 'complete'
  const [activeStep, setActiveStep] = useState(0);
  const navigate = useNavigate();
  const { user, token } = useAuth();
  const theme = useTheme();

  // Calculate total values
  const subtotal = cart.totalAmount || 0;
  const deliveryFee = 3.99;
  const taxRate = 0.07;
  const tax = subtotal * taxRate;
  const total = subtotal + deliveryFee + tax;

  // Animation effect
  const [animateItems, setAnimateItems] = useState(false);
  useEffect(() => {
    if (cart.items?.length > 0) {
      setAnimateItems(true);
    }
  }, [cart.items]);

  const handleQuantityChange = (itemId, newQuantity) => {
    if (newQuantity < 1) return;
    updateQuantity(itemId, newQuantity);
  };

  const handleAddressChange = (e) => {
    const { name, value } = e.target;
    setAddress(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handlePaymentMethodChange = (e) => {
    setPaymentMethod(e.target.value);
  };

  // New function to handle location selection from map
  const handleLocationSelect = (selectedAddress) => {
    setAddress(prev => ({
      ...prev,
      street: selectedAddress.street || prev.street,
      city: selectedAddress.city || prev.city,
      state: selectedAddress.state || prev.state,
      zipCode: selectedAddress.zipCode || prev.zipCode,
      country: selectedAddress.country || prev.country,
      coordinates: selectedAddress.coordinates
    }));
    
    toast.success('Delivery location selected!');
  };

  const handleContinueToPayment = async () => {
    try {
      // Validate address fields
      const requiredFields = ['street', 'city', 'state'];
      const missingFields = requiredFields.filter(field => !address[field]);
      
      if (missingFields.length > 0) {
        toast.error('Please fill all required address fields');
        return;
      }

      // Always ensure zipCode has a value, even if empty
      const orderAddress = {
        ...address,
        zipCode: address.zipCode || '00000'  // Use default if empty
      };

      setCheckoutLoading(true);
      
      // Use token from localStorage as fallback
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        toast.error('Authentication token not found. Please log in again.');
        setCheckoutLoading(false);
        return;
      }
      
      // Create the order
      const response = await axios.post('http://localhost:3003/api/orders', {
        deliveryAddress: orderAddress,
        paymentMethod: 'card'
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });
      
      // Store the order ID and move to payment step
      setOrderId(response.data.order._id);
      setPaymentStep('payment');
      setActiveStep(1);
      toast.success('Order created! Please complete payment.');
    } catch (error) {
      console.error('Order creation error:', error);
      toast.error('Failed to create order: ' + (error.response?.data?.message || error.message));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handleCheckout = async () => {
    try {
      // Validate required fields
      if (!address.street || !address.city || !address.state) {
        toast.error('Please fill all required address fields');
        return;
      }
      
      // Always ensure zipCode has a value, even if empty
      const orderAddress = {
        ...address,
        zipCode: address.zipCode || '00000'  // Use default if empty
      };

      setCheckoutLoading(true);
      
      // Use token from localStorage as fallback
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        toast.error('Authentication token not found. Please log in again.');
        setCheckoutLoading(false);
        return;
      }
      
      // Create the order for cash or wallet payment
      const response = await axios.post('http://localhost:3003/api/orders', {
        deliveryAddress: orderAddress,
        paymentMethod
      }, {
        headers: { Authorization: `Bearer ${authToken}` }
      });

      // Set order ID for reference
      setOrderId(response.data.order._id);
      
      // Complete the checkout directly for cash or wallet
      toast.success('Order placed successfully! Your food is on the way 🚀');
      setPaymentStep('complete');
      setActiveStep(2);
      
      // Redirect to orders page after a short delay
      setTimeout(() => {
        setCheckoutOpen(false);
        clearCart();
        navigate('/orders');
      }, 2000);
    } catch (error) {
      console.error('Checkout error:', error);
      toast.error('Failed to place order: ' + (error.response?.data?.message || error.message));
    } finally {
      setCheckoutLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast.success('Payment successful! Your delicious meal is on the way 🚀');
    setPaymentStep('complete');
    setActiveStep(2);
    
    // Show success message for a moment before redirecting
    setTimeout(() => {
      setCheckoutOpen(false);
      clearCart();
      navigate('/orders');
    }, 2000);
  };

  if (loading) {
    return (
      <Box 
        display="flex" 
        flexDirection="column"
        justifyContent="center" 
        alignItems="center" 
        minHeight="80vh"
        gap={2}
      >
        <Typography variant="h5" color="primary" gutterBottom>
          Loading your delicious items...
        </Typography>
        <CircularProgress color="primary" size={60} thickness={4} />
      </Box>
    );
  }

  if (itemCount === 0) {
    return (
      <Container maxWidth="md" sx={{ mt: 4 }}>
        <Fade in timeout={800}>
          <Paper 
            sx={{ 
              p: 5, 
              textAlign: 'center',
              borderRadius: 3,
              boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
              backgroundImage: 'linear-gradient(to bottom right, #f9f9f9, #ffffff)',
              position: 'relative',
              overflow: 'hidden'
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
            <Typography variant="h4" fontWeight="bold" gutterBottom>
              Your Cart is Empty
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              paragraph
              sx={{ fontSize: '1.1rem', maxWidth: '500px', mx: 'auto', mb: 4 }}
            >
              Looks like you haven't added any delicious meals to your cart yet!
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
        </Fade>
      </Container>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4, mb: 8 }}>
      <Fade in timeout={600}>
        <Box>
          <Typography 
            variant="h4" 
            gutterBottom 
            fontWeight="bold"
            sx={{ 
              display: 'flex', 
              alignItems: 'center',
              background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            <FoodIcon />&nbsp;Your Delicious Cart
          </Typography>
          
          {cart.items.length > 0 && (
            <Box mb={3} sx={{ display: 'flex', alignItems: 'center' }}>
              <Chip 
                label={cart.items[0].restaurantName}
                color="primary"
                variant="outlined"
                avatar={<Avatar>🍴</Avatar>}
              />
            </Box>
          )}

          <Grid container spacing={4}>
            <Grid item xs={12} md={8}>
              <Paper 
                sx={{ 
                  p: 3, 
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  position: 'relative',
                  overflow: 'hidden'
                }}
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
                <Typography variant="h6" gutterBottom fontWeight="bold">Your Items</Typography>
                <List>
                  {cart.items.map((item, index) => (
                    <Fade 
                      in={animateItems} 
                      key={item._id} 
                      style={{ transitionDelay: `${index * 100}ms` }}
                    >
                      <Box>
                        {index > 0 && <Divider sx={{ my: 2 }} />}
                        <ListItem
                          disablePadding
                          sx={{ py: 1 }}
                          secondaryAction={
                            <IconButton 
                              edge="end" 
                              color="error"
                              onClick={() => removeFromCart(item._id)}
                              sx={{ mr: 0 }}
                            >
                              <span style={{ fontSize: '1.2rem' }}>🗑️</span>
                            </IconButton>
                          }
                        >
                          <Box sx={{ 
                            display: 'flex', 
                            width: '100%', 
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            pr: 6
                          }}>
                            <Box>
                              <ListItemText
                                primary={
                                  <Typography variant="body1" fontWeight="bold">{item.name}</Typography>
                                }
                                secondary={
                                  <Typography variant="body2" color="text.secondary">
                                    Size: {item.size} | ${item.price?.toFixed(2)} each
                                  </Typography>
                                }
                              />
                            </Box>
                            <Box 
                              display="flex" 
                              alignItems="center" 
                              sx={{ 
                                border: '1px solid #e0e0e0', 
                                borderRadius: 2,
                                px: 0.5
                              }}
                            >
                              <IconButton 
                                size="small" 
                                onClick={() => handleQuantityChange(item._id, item.quantity - 1)}
                                sx={{ color: theme.palette.primary.main }}
                              >
                                <span style={{ fontSize: '1rem' }}>➖</span>
                              </IconButton>
                              <Typography 
                                sx={{ 
                                  mx: 2, 
                                  minWidth: '24px', 
                                  textAlign: 'center',
                                  fontWeight: 'bold'
                                }}
                              >
                                {item.quantity}
                              </Typography>
                              <IconButton 
                                size="small" 
                                onClick={() => handleQuantityChange(item._id, item.quantity + 1)}
                                sx={{ color: theme.palette.primary.main }}
                              >
                                <span style={{ fontSize: '1rem' }}>➕</span>
                              </IconButton>
                            </Box>
                          </Box>
                        </ListItem>
                      </Box>
                    </Fade>
                  ))}
                </List>
              </Paper>
            </Grid>
            
            <Grid item xs={12} md={4}>
              <Card 
                sx={{ 
                  borderRadius: 2,
                  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
                  position: 'relative',
                  overflow: 'hidden',
                  height: '100%'
                }}
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
                  <Typography variant="h6" gutterBottom fontWeight="bold">Order Summary</Typography>
                  
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Items ({itemCount}):</Typography>
                    <Typography>${subtotal.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Delivery Fee:</Typography>
                    <Typography>${deliveryFee.toFixed(2)}</Typography>
                  </Box>
                  <Box display="flex" justifyContent="space-between" mb={1}>
                    <Typography>Tax:</Typography>
                    <Typography>${tax.toFixed(2)}</Typography>
                  </Box>
                  
                  <Divider sx={{ my: 2 }} />
                  
                  <Box display="flex" justifyContent="space-between" mb={3}>
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
                      ${total.toFixed(2)}
                    </Typography>
                  </Box>
                  
                  <Button 
                    variant="contained" 
                    color="primary"
                    fullWidth
                    size="large"
                    onClick={() => setCheckoutOpen(true)}
                    sx={{ 
                      mb: 2,
                      py: 1.5,
                      borderRadius: 2,
                      fontWeight: 'bold',
                      backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                      ':hover': {
                        backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                      }
                    }}
                  >
                    Proceed to Checkout
                  </Button>
                  
                  <Button 
                    variant="outlined" 
                    color="error"
                    fullWidth
                    onClick={() => clearCart()}
                    sx={{ 
                      borderRadius: 2,
                      borderColor: '#f44336',
                      color: '#f44336',
                      ':hover': {
                        borderColor: '#d32f2f',
                        backgroundColor: 'rgba(244, 67, 54, 0.04)',
                      }
                    }}
                  >
                    Clear Cart
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>
      </Fade>

      {/* Checkout Dialog */}
      <Dialog 
        open={checkoutOpen} 
        maxWidth="sm" 
        fullWidth
        scroll="paper"
        onClose={() => {
          // Only allow closing if not in loading state
          if (!checkoutLoading) {
            setCheckoutOpen(false);
            setPaymentStep('address');
            setOrderId(null);
            setActiveStep(0);
          }
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
            overflow: 'hidden',
            maxHeight: '90vh'
          }
        }}
      >
        <Box 
          sx={{ 
            position: 'relative',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            maxHeight: '90vh'
          }}
        >
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
          
          <DialogTitle 
            sx={{ 
              pt: 4, 
              borderBottom: '1px solid #f0f0f0',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              position: 'sticky',
              top: 0,
              backgroundColor: theme.palette.background.paper,
              zIndex: 1
            }}
          >
            <Typography variant="h5" fontWeight="bold" gutterBottom>
              {paymentStep === 'address' && 'Complete Your Order'}
              {paymentStep === 'payment' && 'Payment'}
              {paymentStep === 'complete' && 'Order Complete'}
            </Typography>
            
            <Stepper 
              activeStep={activeStep} 
              sx={{ width: '100%', pt: 2 }}
            >
              <Step>
                <StepLabel 
                  StepIconComponent={() => (
                    <Avatar 
                      sx={{ 
                        width: 30, 
                        height: 30, 
                        bgcolor: activeStep >= 0 ? '#ff9800' : '#e0e0e0'
                      }}
                    >
                      <DeliveryIcon />
                    </Avatar>
                  )}
                >
                  Delivery
                </StepLabel>
              </Step>
              <Step>
                <StepLabel 
                  StepIconComponent={() => (
                    <Avatar 
                      sx={{ 
                        width: 30, 
                        height: 30, 
                        bgcolor: activeStep >= 1 ? '#ff9800' : '#e0e0e0'
                      }}
                    >
                      <PaymentIcon />
                    </Avatar>
                  )}
                >
                  Payment
                </StepLabel>
              </Step>
              <Step>
                <StepLabel 
                  StepIconComponent={() => (
                    <Avatar 
                      sx={{ 
                        width: 30, 
                        height: 30, 
                        bgcolor: activeStep >= 2 ? '#4caf50' : '#e0e0e0'
                      }}
                    >
                      <SuccessIcon />
                    </Avatar>
                  )}
                >
                  Complete
                </StepLabel>
              </Step>
            </Stepper>
          </DialogTitle>
          
          <DialogContent 
            sx={{ 
              p: 4,
              overflow: 'auto',
              '&::-webkit-scrollbar': {
                width: '8px'
              },
              '&::-webkit-scrollbar-thumb': {
                backgroundColor: 'rgba(0,0,0,0.2)',
                borderRadius: '4px'
              }
            }}
          >
            {paymentStep === 'address' && (
              <Fade in timeout={500}>
                <Box>
                  <Typography variant="subtitle1" gutterBottom sx={{ mt: 1, mb: 3, fontWeight: 'medium' }}>
                    Where should we deliver your food?
                  </Typography>
                  
                  <DeliveryMap onLocationSelect={handleLocationSelect} initialAddress={address} />
                  
                  <TextField
                    fullWidth
                    label="Street Address"
                    name="street"
                    value={address.street}
                    onChange={handleAddressChange}
                    margin="normal"
                    required
                    sx={{ mb: 2 }}
                    InputProps={{
                      sx: { borderRadius: 2 }
                    }}
                  />
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="City"
                        name="city"
                        value={address.city}
                        onChange={handleAddressChange}
                        margin="normal"
                        required
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="State"
                        name="state"
                        value={address.state}
                        onChange={handleAddressChange}
                        margin="normal"
                        required
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Grid>
                  </Grid>
                  
                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="ZIP Code"
                        name="zipCode"
                        value={address.zipCode}
                        onChange={handleAddressChange}
                        margin="normal"
                        helperText="Optional"
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Grid>
                    <Grid item xs={6}>
                      <TextField
                        fullWidth
                        label="Country"
                        name="country"
                        value={address.country}
                        onChange={handleAddressChange}
                        margin="normal"
                        helperText="Optional"
                        InputProps={{
                          sx: { borderRadius: 2 }
                        }}
                      />
                    </Grid>
                  </Grid>

                  {/* Coordinates display - visible only if coordinates are selected */}
                  {address.coordinates?.lat && address.coordinates?.lng && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Selected Coordinates: {address.coordinates.lat.toFixed(6)}, {address.coordinates.lng.toFixed(6)}
                      </Typography>
                    </Box>
                  )}

                  <Box my={3}>
                    <FormControl component="fieldset" sx={{ width: '100%' }}>
                      <FormLabel component="legend" sx={{ fontWeight: 'medium', color: 'text.primary', mb: 1 }}>
                        How would you like to pay?
                      </FormLabel>
                      
                      <RadioGroup
                        aria-label="payment-method"
                        name="payment-method"
                        value={paymentMethod}
                        onChange={handlePaymentMethodChange}
                      >
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1, 
                            mb: 1, 
                            borderRadius: 2,
                            borderColor: paymentMethod === 'cash' ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.12)',
                            borderWidth: paymentMethod === 'cash' ? 2 : 1,
                            transition: 'all 0.2s',
                            backgroundColor: paymentMethod === 'cash' ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPaymentMethod('cash')}
                        >
                          <FormControlLabel 
                            value="cash" 
                            control={<Radio color="primary" />} 
                            label={
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>💵</span>
                                  <Typography fontWeight={paymentMethod === 'cash' ? 'bold' : 'normal'}>
                                    Cash on Delivery
                                  </Typography>
                                </Box>
                                {paymentMethod === 'cash' && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: 0.5 }}>
                                    Pay with cash when your order arrives at your doorstep
                                  </Typography>
                                )}
                              </Box>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                        
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1, 
                            mb: 1, 
                            borderRadius: 2,
                            borderColor: paymentMethod === 'card' ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.12)',
                            borderWidth: paymentMethod === 'card' ? 2 : 1,
                            transition: 'all 0.2s',
                            backgroundColor: paymentMethod === 'card' ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPaymentMethod('card')}
                        >
                          <FormControlLabel 
                            value="card" 
                            control={<Radio color="primary" />} 
                            label={
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>💳</span>
                                  <Typography fontWeight={paymentMethod === 'card' ? 'bold' : 'normal'}>
                                    Credit/Debit Card (Stripe)
                                  </Typography>
                                </Box>
                                {paymentMethod === 'card' && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: 0.5 }}>
                                    Secure payment via Stripe - all major cards accepted
                                  </Typography>
                                )}
                              </Box>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                        
                        <Paper
                          variant="outlined"
                          sx={{
                            p: 1,
                            borderRadius: 2,
                            borderColor: paymentMethod === 'wallet' ? theme.palette.primary.main : 'rgba(0, 0, 0, 0.12)',
                            borderWidth: paymentMethod === 'wallet' ? 2 : 1,
                            transition: 'all 0.2s',
                            backgroundColor: paymentMethod === 'wallet' ? 'rgba(255, 152, 0, 0.05)' : 'transparent',
                            cursor: 'pointer'
                          }}
                          onClick={() => setPaymentMethod('wallet')}
                        >
                          <FormControlLabel 
                            value="wallet" 
                            control={<Radio color="primary" />} 
                            label={
                              <Box>
                                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                  <span style={{ marginRight: '8px', fontSize: '1.2rem' }}>👛</span>
                                  <Typography fontWeight={paymentMethod === 'wallet' ? 'bold' : 'normal'}>
                                    Wallet
                                  </Typography>
                                </Box>
                                {paymentMethod === 'wallet' && (
                                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mt: 0.5 }}>
                                    Pay using your account balance
                                  </Typography>
                                )}
                              </Box>
                            }
                            sx={{ width: '100%', m: 0 }}
                          />
                        </Paper>
                      </RadioGroup>
                    </FormControl>
                  </Box>

                  <Box mt={4} mb={2} display="flex" justifyContent="center">
                    <Button 
                      variant="contained" 
                      color="primary"
                      size="large"
                      onClick={paymentMethod === 'card' ? handleContinueToPayment : handleCheckout}
                      disabled={checkoutLoading}
                      sx={{ 
                        px: 5,
                        py: 1.7,
                        borderRadius: 2,
                        fontSize: '1.1rem',
                        fontWeight: 'bold',
                        backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
                        ':hover': {
                          backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                          boxShadow: '0 6px 25px rgba(0,0,0,0.2)',
                        }
                      }}
                    >
                      {checkoutLoading ? 
                        <CircularProgress size={28} color="inherit" /> : 
                        (paymentMethod === 'card' ? 'Continue to Payment' : 'Place Order')
                      }
                    </Button>
                  </Box>
                </Box>
              </Fade>
            )}

            {paymentStep === 'payment' && (
              <StripePayment orderId={orderId} onSuccess={handlePaymentSuccess} />
            )}
            
            {paymentStep === 'complete' && (
              <Fade in timeout={500}>
                <Box 
                  sx={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    justifyContent: 'center', 
                    py: 4
                  }}
                >
                  <Box 
                    sx={{ 
                      width: 100, 
                      height: 100, 
                      borderRadius: '50%', 
                      bgcolor: '#4caf50',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      mb: 3
                    }}
                  >
                    <span style={{ fontSize: '3rem' }}>✅</span>
                  </Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    Order Complete!
                  </Typography>
                  <Typography variant="body1" align="center" color="text.secondary" sx={{ mb: 2 }}>
                    Your delicious food is on the way! 🚀
                  </Typography>
                  
                  {orderId && (
                    <Typography variant="body2" align="center" sx={{ mb: 3 }}>
                      Order ID: <strong>{orderId}</strong>
                    </Typography>
                  )}
                  
                  <Typography variant="body2" align="center" color="text.secondary" sx={{ mb: 4 }}>
                    You'll receive an email confirmation shortly. You can also check your order status in your profile.
                  </Typography>
                </Box>
              </Fade>
            )}
          </DialogContent>
          
          <DialogActions 
            sx={{ 
              p: 3, 
              pt: 2, 
              display: 'flex', 
              justifyContent: 'space-between', 
              width: '100%',
              borderTop: '1px solid rgba(0,0,0,0.08)',
              backgroundColor: theme.palette.background.paper,
              position: 'sticky',
              bottom: 0,
              zIndex: 1
            }}
          >
            {paymentStep === 'address' && (
              <>
                <Button 
                  onClick={() => setCheckoutOpen(false)}
                  sx={{ borderRadius: 2 }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={paymentMethod === 'card' ? handleContinueToPayment : handleCheckout}
                  disabled={checkoutLoading}
                  sx={{ 
                    px: 3,
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 'bold',
                    backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                    ':hover': {
                      backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                    }
                  }}
                >
                  {checkoutLoading ? <CircularProgress size={24} /> : (paymentMethod === 'card' ? 'Continue to Payment' : 'Place Order')}
                </Button>
              </>
            )}
            
            {paymentStep === 'payment' && (
              <>
                <Button 
                  onClick={() => {
                    setPaymentStep('address');
                    setActiveStep(0);
                  }}
                  sx={{ borderRadius: 2 }}
                >
                  Back to Address
                </Button>
                
                {/* In a real application, this would be handled by the payment processor */}
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    // For demo purposes, simulate payment success
                    handlePaymentSuccess();
                  }}
                  sx={{ 
                    px: 3,
                    py: 1.2,
                    borderRadius: 2,
                    fontWeight: 'bold',
                    backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                    ':hover': {
                      backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                    }
                  }}
                >
                  Complete Payment
                </Button>
              </>
            )}
            
            {paymentStep === 'complete' && (
              <Box sx={{ display: 'flex', justifyContent: 'center', width: '100%', gap: 2 }}>
                <Button 
                  variant="outlined"
                  onClick={() => {
                    setCheckoutOpen(false);
                    clearCart();
                  }}
                  sx={{ 
                    px: 3,
                    borderRadius: 2,
                  }}
                >
                  Close
                </Button>
                
                <Button 
                  variant="contained" 
                  color="primary"
                  onClick={() => {
                    setCheckoutOpen(false);
                    clearCart();
                    navigate('/orders');
                  }}
                  sx={{ 
                    px: 3,
                    borderRadius: 2,
                    fontWeight: 'bold',
                    backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                    ':hover': {
                      backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                    }
                  }}
                >
                  View My Orders
                </Button>
              </Box>
            )}
          </DialogActions>
        </Box>
      </Dialog>
    </Container>
  );
} 