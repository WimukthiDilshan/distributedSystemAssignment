import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  CircularProgress,
  Paper,
  Divider,
  Grid,
  Chip,
  IconButton
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import RestaurantMap from '../components/RestaurantMap';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';

// Helper function to get correct image URL
const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  
  // Handle both formats: "/uploads/image.jpg" or just "image.jpg"
  if (imagePath.startsWith('/uploads/')) {
    return `http://localhost:3000${imagePath}`;
  } else {
    return `http://localhost:3000/uploads/${imagePath}`;
  }
};

export default function RestaurantDetails() {
  const { restaurantId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const fileInputRef = useRef(null);
  const [restaurant, setRestaurant] = useState({
    name: '',
    description: '',
    cuisine: '',
    phoneNumber: '',
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: ''
    },
    location: {
      type: 'Point',
      coordinates: [0, 0]
    }
  });

  useEffect(() => {
    fetchRestaurantDetails();
  }, [restaurantId]);

  const fetchRestaurantDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/restaurants/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setRestaurant(response.data);
      
      // If the restaurant has an image, set the preview URL
      if (response.data.image) {
        setPreviewUrl(getImageUrl(response.data.image));
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      toast.error('Failed to fetch restaurant details');
      navigate('/restaurants');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.includes('.')) {
      const [parent, child] = name.split('.');
      setRestaurant(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }));
    } else {
      setRestaurant(prev => ({
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
    
    // If the restaurant already had an image, restore it in the preview
    if (restaurant.image) {
      setPreviewUrl(getImageUrl(restaurant.image));
    } else {
      setPreviewUrl('');
    }
    
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleLocationSelect = (addressData) => {
    const { coordinates, ...addressFields } = addressData;
    
    // Update address fields
    setRestaurant(prev => ({
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const token = localStorage.getItem('token');
      
      if (selectedImage) {
        // Create FormData for image upload
        const formData = new FormData();
        
        // Ensure location has proper structure
        const locationData = {
          type: 'Point',
          coordinates: restaurant.location?.coordinates || [0, 0]
        };
        
        // Append all restaurant data
        Object.keys(restaurant).forEach(key => {
          if (key === 'address') {
            formData.append(key, JSON.stringify(restaurant[key] || {}));
          } else if (key === 'location') {
            // Send location data with correct structure
            formData.append('location', JSON.stringify(locationData));
          } else if (key === 'isVerified' || key === 'isAvailable') {
            // Ensure boolean fields are properly converted
            formData.append(key, restaurant[key] === true ? 'true' : 'false');
          } else if (key !== 'image' && key !== '_id' && key !== '__v' && key !== 'createdAt' && key !== 'updatedAt' && key !== 'menu') {
            formData.append(key, restaurant[key] || '');
          }
        });
        
        console.log('Sending location data:', JSON.stringify(locationData));
        
        // Add the image file
        formData.append('image', selectedImage);
        
        await axios.put(
          `http://localhost:3000/api/restaurants/${restaurantId}/with-image`,
          formData,
          {
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'multipart/form-data'
            }
          }
        );
      } else {
        // Regular JSON request without image update
        // Prepare data by removing certain fields and ensuring location structure is correct
        const updateData = { ...restaurant };
        delete updateData._id;
        delete updateData.__v;
        delete updateData.createdAt;
        delete updateData.updatedAt;
        delete updateData.menu;
        
        // Ensure location has the correct structure
        if (updateData.location) {
          updateData.location = {
            type: 'Point',
            coordinates: updateData.location.coordinates || [0, 0]
          };
        }
        
        // Ensure boolean fields are properly set
        if (updateData.isVerified !== undefined) {
          updateData.isVerified = Boolean(updateData.isVerified);
        }
        
        if (updateData.isAvailable !== undefined) {
          updateData.isAvailable = Boolean(updateData.isAvailable);
        }
        
        await axios.put(
          `http://localhost:3000/api/restaurants/${restaurantId}`,
          updateData,
          {
            headers: {
              Authorization: `Bearer ${token}`
            }
          }
        );
      }
      
      toast.success('Restaurant details updated successfully');
      navigate('/restaurants');
    } catch (error) {
      console.error('Error updating restaurant:', error);
      toast.error(error.response?.data?.message || 'Failed to update restaurant');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Container maxWidth="md" sx={{ mt: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Box display="flex" alignItems="center" mb={4}>
          <Button 
            variant="outlined" 
            onClick={() => navigate('/restaurants')}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            Edit Restaurant Details
          </Typography>
        </Box>
        
        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Restaurant Image Upload */}
            <Grid item xs={12}>
              <Box 
                sx={{ 
                  mb: 2, 
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
                  <Box sx={{ position: 'relative', width: '100%', maxWidth: 400, mb: 2 }}>
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
                      maxWidth: 400, 
                      height: 200, 
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
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Restaurant Name"
                name="name"
                value={restaurant.name}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Description"
                name="description"
                value={restaurant.description}
                onChange={handleInputChange}
                margin="normal"
                multiline
                rows={3}
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Cuisine"
                name="cuisine"
                value={restaurant.cuisine}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Phone Number"
                name="phoneNumber"
                value={restaurant.phoneNumber || ''}
                onChange={handleInputChange}
                margin="normal"
                required
                helperText="Phone number for restaurant contact"
              />
            </Grid>
            
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Typography variant="h6" gutterBottom>
                Restaurant Location
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Please select your restaurant's exact location on the map below for delivery and customer visibility.
              </Typography>
              
              <RestaurantMap 
                onLocationSelect={handleLocationSelect}
                initialAddress={{
                  street: restaurant.address?.street || '',
                  city: restaurant.address?.city || '',
                  state: restaurant.address?.state || '',
                  zipCode: restaurant.address?.zipCode || '',
                  country: restaurant.address?.country || '',
                  coordinates: {
                    lat: restaurant.location?.coordinates[1] || 0,
                    lng: restaurant.location?.coordinates[0] || 0
                  }
                }}
              />
              
              {restaurant.location?.coordinates[0] !== 0 && restaurant.location?.coordinates[1] !== 0 && (
                <Box sx={{ mt: 1, mb: 2 }}>
                  <Chip 
                    label={`Selected Coordinates: ${restaurant.location.coordinates[1].toFixed(6)}, ${restaurant.location.coordinates[0].toFixed(6)}`}
                    color="primary"
                    variant="outlined"
                  />
                </Box>
              )}
            </Grid>
            
            <Grid item xs={12} md={12}>
              <TextField
                fullWidth
                label="Street Address"
                name="address.street"
                value={restaurant.address?.street || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="City"
                name="address.city"
                value={restaurant.address?.city || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="State/Province"
                name="address.state"
                value={restaurant.address?.state || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="ZIP/Postal Code"
                name="address.zipCode"
                value={restaurant.address?.zipCode || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Country"
                name="address.country"
                value={restaurant.address?.country || ''}
                onChange={handleInputChange}
                margin="normal"
                required
              />
            </Grid>
            
            <Grid item xs={12}>
              <Box display="flex" justifyContent="flex-end" mt={3}>
                <Button 
                  variant="outlined" 
                  onClick={() => navigate('/restaurants')} 
                  sx={{ mr: 2 }}
                >
                  Cancel
                </Button>
                <Button 
                  variant="contained" 
                  color="primary" 
                  type="submit"
                  disabled={submitting || restaurant.location?.coordinates[0] === 0 || restaurant.location?.coordinates[1] === 0}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </Button>
              </Box>
            </Grid>
          </Grid>
        </form>
      </Paper>
    </Container>
  );
} 