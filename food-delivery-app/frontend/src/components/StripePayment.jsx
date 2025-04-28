import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { Box, Button, CircularProgress, Typography, Paper, Alert, Fade, Divider } from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

const cardElementOptions = {
  style: {
    base: {
      fontSize: '16px',
      color: '#424770',
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      fontSmoothing: 'antialiased',
      '::placeholder': {
        color: '#aab7c4',
      },
      ':-webkit-autofill': {
        color: '#3A4256',
      },
    },
    invalid: {
      color: '#e53935',
      iconColor: '#e53935',
    },
  },
  hidePostalCode: true
};

// Form to collect payment details
const CheckoutForm = ({ clientSecret, orderId, onSuccess }) => {
  const stripe = useStripe();
  const elements = useElements();
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [cardComplete, setCardComplete] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements || !cardComplete) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Use token from localStorage as fallback
      const authToken = token || localStorage.getItem('token');
      if (!authToken) {
        setError('Authentication token not found. Please log in again.');
        toast.error('Authentication error');
        return;
      }

      // Use the card Element to create a payment method
      const cardElement = elements.getElement(CardElement);

      // Confirm the payment
      const { error: paymentError, paymentIntent } = await stripe.confirmCardPayment(clientSecret, {
        payment_method: {
          card: cardElement,
        }
      });

      if (paymentError) {
        setError(paymentError.message);
        toast.error('Payment failed: ' + paymentError.message);
      } else if (paymentIntent.status === 'succeeded') {
        // Payment succeeded, notify the server
        await axios.post(`http://localhost:3003/api/orders/${orderId}/payment-completed`, {}, {
          headers: { Authorization: `Bearer ${authToken}` }
        });
        
        toast.success('Payment successful!');
        onSuccess();
      }
    } catch (err) {
      console.error('Payment error:', err);
      setError('An unexpected error occurred during payment processing.');
      toast.error('Payment processing error: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Fade in timeout={500}>
      <form onSubmit={handleSubmit}>
        <Box sx={{ mb: 4 }}>
          <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 3 }}>
            Enter your card details to complete payment
          </Typography>

          {/* Card icons */}
          <Box 
            sx={{ 
              display: 'flex', 
              gap: 1, 
              mb: 3 
            }}
          >
            <img 
              src="https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg" 
              alt="Visa" 
              style={{ height: '24px' }} 
            />
            <img 
              src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg" 
              alt="Mastercard" 
              style={{ height: '24px' }} 
            />
            <img 
              src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46273d4f569f9b34ceeef7407.svg" 
              alt="Amex" 
              style={{ height: '24px' }} 
            />
          </Box>

          <Paper 
            variant="outlined" 
            sx={{ 
              p: 2.5, 
              borderRadius: 2,
              borderColor: cardComplete ? '#4caf50' : '#e0e0e0',
              transition: 'all 0.3s ease',
              boxShadow: cardComplete ? '0 0 0 1px #4caf50' : 'none',
              '&:hover': {
                borderColor: '#bbbbbb'
              },
              mb: 3
            }}
          >
            <CardElement 
              options={cardElementOptions}
              onChange={(e) => setCardComplete(e.complete)}
            />
          </Paper>

          <Typography variant="caption" color="text.secondary">
            Your card information is securely processed by Stripe. We never store your card details.
          </Typography>
        </Box>
        
        {error && (
          <Alert 
            severity="error" 
            sx={{ 
              mb: 3, 
              borderRadius: 2,
              '& .MuiAlert-icon': {
                fontSize: '1.5rem'
              }
            }}
          >
            {error}
          </Alert>
        )}

        <Button
          type="submit"
          variant="contained"
          color="primary"
          fullWidth
          disabled={!stripe || loading || !cardComplete}
          sx={{ 
            py: 1.5,
            borderRadius: 2,
            fontWeight: 'bold',
            backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
            ':hover': {
              backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
            }
          }}
        >
          {loading ? (
            <CircularProgress size={24} sx={{ color: 'white' }} />
          ) : (
            'Pay Now'
          )}
        </Button>
        
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
          <Button
            onClick={() => {
              // Cancel payment and go back
              if (typeof onSuccess === 'function') {
                onSuccess();
              }
            }}
            sx={{ borderRadius: 2 }}
          >
            Cancel Payment
          </Button>
        </Box>

        <Box sx={{ textAlign: 'center', mt: 3 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
            <span role="img" aria-label="secure" style={{ marginRight: '8px', fontSize: '1rem' }}>🔒</span>
            <Typography variant="body2" color="text.secondary">
              Secure Payment by Stripe
            </Typography>
          </Box>
        </Box>
      </form>
    </Fade>
  );
};

// Main Stripe payment component
export default function StripePayment({ orderId, onSuccess }) {
  const [stripePromise, setStripePromise] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { token } = useAuth();
  
  // For demo purposes, add state to handle mock payment flow
  const [showMockForm, setShowMockForm] = useState(true);
  const [mockCardDetails, setMockCardDetails] = useState({
    cardNumber: '',
    cardExpiry: '',
    cardCvc: ''
  });
  const [processingPayment, setProcessingPayment] = useState(false);

  useEffect(() => {
    // For demo/test environment, we'll use a mock payment flow
    // In production, this would actually connect to Stripe
    const mockInitializePayment = async () => {
      try {
        setLoading(true);
        
        // Simulate API call delay
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Set fake client secret and stripe promise
        setClientSecret('mock_client_secret');
        setStripePromise(true); // Just a placeholder
        
      } catch (err) {
        console.error('Failed to initialize payment:', err);
        setError('Failed to initialize payment service');
        toast.error('Payment initialization failed');
      } finally {
        setLoading(false);
      }
    };

    if (orderId) {
      mockInitializePayment();
    }
  }, [orderId]);

  const handleMockInputChange = (e) => {
    const { name, value } = e.target;
    setMockCardDetails(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleMockSubmit = async (e) => {
    e.preventDefault();
    
    // Since we've prefilled the values, we don't need to check if they're empty
    // We'll proceed with the payment intent creation
    
    setProcessingPayment(true);
    
    try {
      // First, call the create-payment-intent endpoint to create a payment intent
      const createPaymentResponse = await axios.post('http://localhost:3003/api/payments/create-payment-intent', {
        orderId: orderId
      }, {
        headers: { 
          Authorization: `Bearer ${token || localStorage.getItem('token')}` 
        }
      });
      
      // Check if payment intent was created successfully
      if (createPaymentResponse.data.clientSecret) {
        // In a real implementation, we would use the client secret to confirm the payment with Stripe
        // For this mock implementation, we'll simulate a successful payment
        
        // Call the success callback after a short delay to simulate payment processing
        setTimeout(() => {
          const transactionId = createPaymentResponse.data.paymentIntentId || 'pi_mock_123456789';
          toast.success(`Payment successful! Transaction ID: ${transactionId.slice(-8)}`);
          
          // Call the success callback
          if (typeof onSuccess === 'function') {
            onSuccess();
          }
          setProcessingPayment(false);
        }, 1500);
      } else {
        toast.error('Failed to create payment intent');
        setProcessingPayment(false);
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error('Payment processing failed: ' + (error.response?.data?.message || error.message));
      setProcessingPayment(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" p={4} gap={2}>
        <Typography variant="body1" color="text.secondary" gutterBottom>
          Preparing payment...
        </Typography>
        <CircularProgress size={40} thickness={4} />
      </Box>
    );
  }

  if (error) {
    return (
      <Box>
        <Alert 
          severity="error" 
          sx={{ 
            mb: 3, 
            borderRadius: 2,
            p: 2,
            '& .MuiAlert-icon': {
              fontSize: '1.5rem'
            }
          }}
        >
          {error}
        </Alert>
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 2 }}>
          <Button 
            variant="outlined"
            onClick={() => window.location.reload()}
            sx={{ borderRadius: 2 }}
          >
            Retry Payment
          </Button>
          
          <Button
            variant="contained"
            color="primary"
            onClick={() => {
              if (typeof onSuccess === 'function') {
                // Go back to the order screen
                onSuccess();
              }
            }}
            sx={{ 
              borderRadius: 2,
              backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
              ':hover': {
                backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
              }
            }}
          >
            Back to Order
          </Button>
        </Box>
      </Box>
    );
  }

  return (
    <Box>
      {showMockForm ? (
        <Fade in timeout={500}>
          <form onSubmit={handleMockSubmit}>
            <Box sx={{ mb: 3 }}>
              <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 'medium', mb: 2 }}>
                Enter your card details to complete payment
              </Typography>

              {/* Card icons */}
              <Box 
                sx={{ 
                  display: 'flex', 
                  gap: 1, 
                  mb: 2 
                }}
              >
                <img 
                  src="https://js.stripe.com/v3/fingerprinted/img/visa-729c05c240c4bdb47b03ac81d9945bfe.svg" 
                  alt="Visa" 
                  style={{ height: '24px' }} 
                />
                <img 
                  src="https://js.stripe.com/v3/fingerprinted/img/mastercard-4d8844094130711885b5e41b28c9848f.svg" 
                  alt="Mastercard" 
                  style={{ height: '24px' }} 
                />
                <img 
                  src="https://js.stripe.com/v3/fingerprinted/img/amex-a49b82f46273d4f569f9b34ceeef7407.svg" 
                  alt="Amex" 
                  style={{ height: '24px' }} 
                />
              </Box>

              {/* Mock Card Number */}
              <Paper 
                variant="outlined" 
                sx={{ 
                  p: 2, 
                  borderRadius: 2,
                  borderColor: mockCardDetails.cardNumber.length > 0 ? '#4caf50' : '#e0e0e0',
                  transition: 'all 0.3s ease',
                  boxShadow: mockCardDetails.cardNumber.length > 0 ? '0 0 0 1px #4caf50' : 'none',
                  '&:hover': {
                    borderColor: '#bbbbbb'
                  },
                  mb: 2
                }}
              >
                <input
                  type="text"
                  name="cardNumber"
                  placeholder="Card Number: 4242 4242 4242 4242"
                  value={mockCardDetails.cardNumber || "4242 4242 4242 4242"}
                  onChange={handleMockInputChange}
                  style={{
                    border: 'none',
                    width: '100%',
                    fontSize: '16px',
                    outline: 'none',
                    background: 'transparent'
                  }}
                />
              </Paper>

              {/* Mock Expiry and CVC in one row */}
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    borderColor: mockCardDetails.cardExpiry.length > 0 ? '#4caf50' : '#e0e0e0',
                    transition: 'all 0.3s ease',
                    boxShadow: mockCardDetails.cardExpiry.length > 0 ? '0 0 0 1px #4caf50' : 'none',
                    '&:hover': {
                      borderColor: '#bbbbbb'
                    },
                    flex: 1
                  }}
                >
                  <input
                    type="text"
                    name="cardExpiry"
                    placeholder="MM/YY"
                    value={mockCardDetails.cardExpiry || "12/25"}
                    onChange={handleMockInputChange}
                    style={{
                      border: 'none',
                      width: '100%',
                      fontSize: '16px',
                      outline: 'none',
                      background: 'transparent'
                    }}
                  />
                </Paper>

                <Paper 
                  variant="outlined" 
                  sx={{ 
                    p: 2, 
                    borderRadius: 2,
                    borderColor: mockCardDetails.cardCvc.length > 0 ? '#4caf50' : '#e0e0e0',
                    transition: 'all 0.3s ease',
                    boxShadow: mockCardDetails.cardCvc.length > 0 ? '0 0 0 1px #4caf50' : 'none',
                    '&:hover': {
                      borderColor: '#bbbbbb'
                    },
                    flex: 1
                  }}
                >
                  <input
                    type="text"
                    name="cardCvc"
                    placeholder="CVC"
                    value={mockCardDetails.cardCvc || "123"}
                    onChange={handleMockInputChange}
                    style={{
                      border: 'none',
                      width: '100%',
                      fontSize: '16px',
                      outline: 'none',
                      background: 'transparent'
                    }}
                  />
                </Paper>
              </Box>

              <Typography variant="caption" color="text.secondary">
                Your card information is securely processed. We never store your card details.
              </Typography>
            </Box>

            <Button
              type="submit"
              variant="contained"
              color="primary"
              fullWidth
              size="large"
              disabled={processingPayment}
              sx={{ 
                py: 1.5,
                mt: 1,
                mb: 2,
                borderRadius: 2,
                fontWeight: 'bold',
                backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                ':hover': {
                  backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
                  boxShadow: '0 4px 16px rgba(0,0,0,0.2)',
                }
              }}
            >
              {processingPayment ? (
                <CircularProgress size={24} sx={{ color: 'white' }} />
              ) : (
                'Pay Now'
              )}
            </Button>
            
            <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center' }}>
              <Button
                onClick={() => {
                  // Cancel payment and go back
                  if (typeof onSuccess === 'function') {
                    onSuccess();
                  }
                }}
                sx={{ borderRadius: 2 }}
              >
                Cancel Payment
              </Button>
            </Box>

            <Box sx={{ textAlign: 'center', mt: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1 }}>
                <span role="img" aria-label="secure" style={{ marginRight: '8px', fontSize: '1rem' }}>🔒</span>
                <Typography variant="body2" color="text.secondary">
                  Secure Payment by Stripe
                </Typography>
              </Box>
            </Box>
          </form>
        </Fade>
      ) : (
        <Elements stripe={stripePromise} options={{ clientSecret }}>
          <CheckoutForm 
            clientSecret={clientSecret} 
            orderId={orderId} 
            onSuccess={onSuccess} 
          />
        </Elements>
      )}
    </Box>
  );
} 