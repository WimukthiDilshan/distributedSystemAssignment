import { useState, useEffect, useRef } from 'react';
import {
  Container,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Box,
  CircularProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Chip,
  IconButton
} from '@mui/material';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import RestaurantMap from '../components/RestaurantMap';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return 'https://via.placeholder.com/300x140?text=No+Image';
  
  // Handle both formats: "/uploads/image.jpg" or just "image.jpg"
  if (imagePath.startsWith('/uploads/')) {
    return `http://localhost:3000${imagePath}`;
  } else {
    return `http://localhost:3000/uploads/${imagePath}`;
  }
};

export default function Restaurants() {
  const [restaurants, setRestaurants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [newRestaurant, setNewRestaurant] = useState({
    name: '',
    description: '',
    cuisine: '',
    adminEmail: '',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    location: {
      coordinates: [0, 0]
    }
  });
  const { user, updateRestaurantId } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchRestaurants();
  }, []);

  const fetchRestaurants = async () => {
    try {
      const token = localStorage.getItem('token');
      
      // Determine which endpoint to use based on user role
      let endpoint = 'http://localhost:3000/api/restaurants';
      
      // If user is not authenticated or is a customer, use the public endpoint
      // that only returns approved restaurants
      if (!user || user.role === 'customer') {
        endpoint = 'http://localhost:3000/api/restaurants/public';
      }
      
      console.log(`Fetching restaurants from endpoint: ${endpoint} ${token ? 'with auth token' : 'without auth'}`);
      console.log('User role:', user?.role || 'unauthenticated');
      
      // Add timestamp to URL to prevent caching
      const response = await axios.get(`${endpoint}?t=${new Date().getTime()}`, {
        headers: token ? {
          Authorization: `Bearer ${token}`,
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        } : {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache'
        }
      });
      
      console.log(`Fetched ${response.data.length} restaurants`);
      
      // Log each restaurant's availability and approval status
      response.data.forEach(restaurant => {
        console.log(`Restaurant: ${restaurant.name}, isAvailable: ${restaurant.isAvailable}, approvalStatus: ${restaurant.approvalStatus || 'N/A'}`);
      });
      
      setRestaurants(response.data);
    } catch (error) {
      console.error('Error fetching restaurants:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to fetch restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setNewRestaurant(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setNewRestaurant(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleImageSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Check if the file is an image
      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }
      // Check if the file size is less than 5MB
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setSelectedImage(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const clearImageSelection = () => {
    setSelectedImage(null);
    setPreviewUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLocationSelect = (addressData) => {
    const { coordinates, ...addressFields } = addressData;
    
    // Update address fields
    setNewRestaurant(prev => ({
      ...prev,
      address: {
        ...prev.address,
        ...addressFields
      },
      location: {
        type: 'Point',
        coordinates: [coordinates.lng, coordinates.lat] // MongoDB stores as [longitude, latitude]
      }
    }));
  };

  const handleSubmit = async () => {
    try {
      const token = localStorage.getItem('token');
      let response;
      
      if (selectedImage) {
        // Create FormData for image upload
        const formData = new FormData();
        formData.append('image', selectedImage);
        
        // Ensure location has proper structure
        const locationData = {
          type: 'Point',
          coordinates: newRestaurant.location?.coordinates || [0, 0]
        };
        
        // Append all restaurant data
        Object.keys(newRestaurant).forEach(key => {
          if (key === 'address') {
            formData.append(key, JSON.stringify(newRestaurant[key] || {}));
          } else if (key === 'location') {
            // Send location data with correct structure
            formData.append('location', JSON.stringify(locationData));
          } else {
            formData.append(key, newRestaurant[key] || '');
          }
        });
        
        console.log('Sending location data:', JSON.stringify(locationData));
        
        response = await axios.post(
          'http://localhost:3000/api/restaurants/with-image',
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        // Regular JSON request without image
        // Ensure location has the correct structure
        const restaurantData = {
          ...newRestaurant,
          location: {
            type: 'Point',
            coordinates: newRestaurant.location?.coordinates || [0, 0]
          }
        };
        
        response = await axios.post(
          'http://localhost:3000/api/restaurants',
          restaurantData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      toast.success('Restaurant created successfully! It will be available to customers after approval by an administrator.');
      
      // Store restaurant ID for restaurant admin
      if (user?.role === 'restaurant_admin' && response.data._id) {
        localStorage.setItem('adminRestaurantId', response.data._id);
      }
      
      setRestaurants([...restaurants, response.data]);
      setOpenDialog(false);
      setNewRestaurant({
        name: '',
        description: '',
        cuisine: '',
        adminEmail: '',
        phoneNumber: '',
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: ''
        },
        location: {
          coordinates: [0, 0]
        }
      });
      setSelectedImage(null);
      setPreviewUrl('');
    } catch (error) {
      console.error('Error adding restaurant:', error);
      toast.error(error.response?.data?.message || 'Failed to add restaurant');
    }
  };

  const toggleRestaurantAvailability = async (restaurantId, currentAvailability) => {
    try {
      const token = localStorage.getItem('token');
      console.log(`Toggling restaurant ${restaurantId} from ${currentAvailability ? 'available' : 'unavailable'} to ${!currentAvailability ? 'available' : 'unavailable'}`);
      
      await axios.patch(
        `http://localhost:3000/api/restaurants/${restaurantId}/availability`,
        { isAvailable: !currentAvailability },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      
      toast.success(`Restaurant ${!currentAvailability ? 'opened' : 'closed'} successfully`);
      
      // Immediately update UI state
      setRestaurants(prevRestaurants => 
        prevRestaurants.map(restaurant => 
          restaurant._id === restaurantId 
            ? { ...restaurant, isAvailable: !currentAvailability } 
            : restaurant
        )
      );
      
      // Also fetch restaurants in the background to ensure sync with server
      setTimeout(() => {
        fetchRestaurants();
      }, 300);
      
    } catch (error) {
      console.error('Error toggling restaurant availability:', error);
      console.error('Error details:', error.response?.data || error.message);
      toast.error('Failed to update restaurant availability');
    }
  };

  const handleManageOrders = (restaurantId) => {
    try {
      console.log('Managing orders for restaurant:', restaurantId);
      
      // First, store the restaurantId in localStorage
      localStorage.setItem('adminRestaurantId', restaurantId);
      
      // Also update it in the context if possible
      if (updateRestaurantId) {
        updateRestaurantId(restaurantId);
      }
      
      // Navigate to the orders page
      navigate(`/restaurant/orders`);
    } catch (error) {
      console.error('Error navigating to manage orders:', error);
      toast.error('Failed to navigate to order management');
    }
  };

  // Add useEffect to refresh restaurants list when this component is mounted
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      // Auto-refresh restaurants list every 30 seconds when this page is active
      if (document.visibilityState === 'visible') {
        console.log('Auto-refreshing restaurants list');
        fetchRestaurants();
      }
    }, 30000); // 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container sx={{ mt: 4 }}>
      <Box display="flex" justifyContent="space-between" mb={4}>
        <Typography variant="h4">
          {user?.role === 'restaurant_admin' ? 'My Restaurants' : 'Restaurants'}
        </Typography>
        {user?.role === 'restaurant_admin' && (
          <Button 
            variant="contained" 
            color="primary"
            onClick={() => setOpenDialog(true)}
            // disabled={5 > 0}
          >
            Add Restaurant
          </Button>
        )}
      </Box>
      
      {user?.role === 'restaurant_admin' && restaurants.length === 0 && (
        <Box textAlign="center" py={5}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            You don't have any restaurants yet
          </Typography>
          <Typography variant="body1" color="text.secondary" paragraph>
            Click the "Add Restaurant" button to create your restaurant.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your restaurant will remain visible to you even if deactivated.
          </Typography>
        </Box>
      )}
      
      <Grid container spacing={3}>
        {restaurants.map((restaurant) => (
          <Grid item xs={12} sm={6} md={4} key={restaurant._id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                boxShadow: 3,
                transition: 'transform 0.3s ease, box-shadow 0.3s ease',
                '&:hover': {
                  transform: 'translateY(-5px)',
                  boxShadow: 6,
                }
              }}
            >
              <CardMedia
                component="img"
                height="140"
                image={getImageUrl(restaurant.image)}
                alt={restaurant.name}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={1}>
                  <Typography gutterBottom variant="h5" component="h2" sx={{ fontWeight: 'bold' }}>
                    {restaurant.name}
                  </Typography>
                  {restaurant.rating > 0 && (
                    <Chip 
                      label={`${restaurant.rating.toFixed(1)} ★`} 
                      size="small" 
                      sx={{ 
                        backgroundColor: '#FFA000', 
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                  )}
                </Box>
                
                {/* Show approval status for restaurant admins */}
                {user && user.role === 'restaurant_admin' && restaurant.approvalStatus && (
                  <Box my={1}>
                    <Chip 
                      label={restaurant.approvalStatus.charAt(0).toUpperCase() + restaurant.approvalStatus.slice(1)} 
                      size="small" 
                      sx={{ 
                        backgroundColor: 
                          restaurant.approvalStatus === 'approved' ? '#4CAF50' : 
                          restaurant.approvalStatus === 'rejected' ? '#F44336' : 
                          '#FFC107', 
                        color: 'white',
                        fontWeight: 'bold'
                      }} 
                    />
                    {restaurant.approvalStatus === 'pending' && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        Waiting for admin approval
                      </Typography>
                    )}
                    {restaurant.approvalStatus === 'rejected' && (
                      <Typography variant="caption" display="block" sx={{ mt: 0.5, color: 'text.secondary' }}>
                        This restaurant has been rejected and is not visible to customers
                      </Typography>
                    )}
                  </Box>
                )}
                
                <Typography variant="body2" color="text.secondary" paragraph>
                  {restaurant.cuisine}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {restaurant.description?.substring(0, 100)}{restaurant.description?.length > 100 ? '...' : ''}
                </Typography>
              </CardContent>
              <Box sx={{ mt: 2 }} display="flex" gap={1} flexDirection={user?.role === 'restaurant_admin' ? 'column' : 'row'}>
                <Button 
                  variant="contained" 
                  color="primary" 
                  fullWidth
                  onClick={() => navigate(user?.role === 'restaurant_admin' 
                    ? `/restaurant/manage-menu/${restaurant._id}` 
                    : `/restaurant/${restaurant._id}`)}
                >
                  {user?.role === 'restaurant_admin' ? 'Manage Menu' : 'View Menu'}
                </Button>
                
                {user?.role === 'restaurant_admin' && (
                  <>
                    <Button 
                      variant="outlined" 
                      color={restaurant.isAvailable ? 'error' : 'success'} 
                      fullWidth
                      onClick={() => toggleRestaurantAvailability(restaurant._id, restaurant.isAvailable)}
                    >
                      {restaurant.isAvailable ? 'Set as Closed' : 'Set as Open'}
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="primary" 
                      fullWidth
                      onClick={() => navigate(`/restaurant/edit/${restaurant._id}`)}
                    >
                      Edit Details
                    </Button>
                    <Button 
                      variant="outlined" 
                      color="info" 
                      fullWidth
                      onClick={() => handleManageOrders(restaurant._id)}
                    >
                      Manage Orders
                    </Button>
                  </>
                )}
              </Box>
            </Card>
          </Grid>
        ))}
      </Grid>
      
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="md" fullWidth>
        <DialogTitle>Add New Restaurant</DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {/* Restaurant Image Upload */}
            <Box 
              sx={{ 
                mb: 3, 
                display: 'flex', 
                flexDirection: 'column', 
                alignItems: 'center',
                border: '1px dashed #ccc', 
                borderRadius: 2,
                p: 2
              }}
            >
              <Typography variant="subtitle1" gutterBottom>
                Restaurant Image
              </Typography>
              
              {previewUrl ? (
                <Box sx={{ position: 'relative', width: '100%', maxWidth: 300, mb: 2 }}>
                  <img 
                    src={previewUrl} 
                    alt="Restaurant preview" 
                    style={{ width: '100%', height: 'auto', borderRadius: 8 }} 
                  />
                  <IconButton 
                    sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'rgba(255,255,255,0.8)' }}
                    onClick={clearImageSelection}
                  >
                    ✕
                  </IconButton>
                </Box>
              ) : (
                <Box 
                  sx={{ 
                    width: '100%', 
                    maxWidth: 300, 
                    height: 150, 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center',
                    bgcolor: '#f5f5f5',
                    borderRadius: 2,
                    mb: 2
                  }}
                >
                  <AddPhotoAlternateIcon sx={{ fontSize: 40, color: '#aaa' }} />
                </Box>
              )}
              
              <Button
                variant="outlined"
                component="label"
                startIcon={<AddPhotoAlternateIcon />}
              >
                {previewUrl ? 'Change Image' : 'Upload Image'}
                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  accept="image/*"
                  onChange={handleImageSelect}
                />
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1 }}>
                Recommended size: 600x300px, max 5MB
              </Typography>
            </Box>
            
            <TextField
              fullWidth
              label="Restaurant Name"
              name="name"
              value={newRestaurant.name}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Description"
              name="description"
              value={newRestaurant.description}
              onChange={handleInputChange}
              margin="normal"
              multiline
              rows={3}
              required
            />
            <TextField
              fullWidth
              label="Contact Email"
              name="adminEmail"
              type="email"
              value={newRestaurant.adminEmail}
              onChange={handleInputChange}
              margin="normal"
              required
              helperText="Email address for restaurant communications"
            />
            <TextField
              fullWidth
              label="Phone Number"
              name="phoneNumber"
              value={newRestaurant.phoneNumber}
              onChange={handleInputChange}
              margin="normal"
              required
              helperText="Phone number for restaurant contact"
            />
            <TextField
              fullWidth
              label="Cuisine"
              name="cuisine"
              value={newRestaurant.cuisine}
              onChange={handleInputChange}
              margin="normal"
              required
            />
            
            <Typography variant="h6" sx={{ my: 2 }}>Restaurant Location</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Click on the map to select the exact location of your restaurant. This helps customers find you easily.
            </Typography>
            
            <RestaurantMap onLocationSelect={handleLocationSelect} />
            
            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField
                  fullWidth
                  label="Street Address"
                  name="address.street"
                  value={newRestaurant.address.street}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="City"
                  name="address.city"
                  value={newRestaurant.address.city}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="State/Province"
                  name="address.state"
                  value={newRestaurant.address.state}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="ZIP/Postal Code"
                  name="address.zipCode"
                  value={newRestaurant.address.zipCode}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
              <Grid item xs={12} md={6}>
                <TextField
                  fullWidth
                  label="Country"
                  name="address.country"
                  value={newRestaurant.address.country}
                  onChange={handleInputChange}
                  margin="normal"
                  required
                />
              </Grid>
            </Grid>
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button 
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={
              !newRestaurant.name ||
              !newRestaurant.cuisine ||
              !newRestaurant.adminEmail ||
              !newRestaurant.phoneNumber ||
              !newRestaurant.address.street ||
              !newRestaurant.address.city ||
              !newRestaurant.address.country ||
              newRestaurant.location.coordinates[0] === 0
            }
          >
            Add Restaurant
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
} 