import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  CircularProgress,
  Paper,
  Input,
  IconButton,
  Card,
  CardMedia
} from '@mui/material';
import PhotoCamera from '@mui/icons-material/PhotoCamera';
import DeleteIcon from '@mui/icons-material/Delete';
import axios from 'axios';
import toast from 'react-hot-toast';

export default function MenuItemForm() {
  const { restaurantId, itemId } = useParams();
  const navigate = useNavigate();
  const isEditing = Boolean(itemId);
  const [loading, setLoading] = useState(isEditing);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState('');

  const [menuItem, setMenuItem] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Main Course',
    size: 'Medium',
    isAvailable: true
  });

  useEffect(() => {
    if (isEditing) {
      fetchMenuItemDetails();
    }
  }, [itemId]);

  const fetchMenuItemDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/restaurants/${restaurantId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      const foundItem = response.data.menu.find(item => item._id === itemId);
      
      if (foundItem) {
        setMenuItem({
          name: foundItem.name || '',
          description: foundItem.description || '',
          price: foundItem.price ? foundItem.price.toString() : '',
          category: foundItem.category || 'Main Course',
          size: foundItem.size || 'Medium',
          isAvailable: foundItem.isAvailable !== false
        });

        // Set image preview if item has an image
        if (foundItem.image) {
          setImagePreview(`http://localhost:3000${foundItem.image}`);
        }
      } else {
        toast.error('Menu item not found');
        navigate(`/restaurants/${restaurantId}/menu`);
      }
    } catch (error) {
      console.error('Error fetching menu item:', error);
      toast.error('Failed to fetch menu item details');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setMenuItem(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleClearImage = () => {
    setImageFile(null);
    setImagePreview('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      // Validate fields
      if (!menuItem.name || !menuItem.price || !menuItem.category) {
        toast.error('Please fill all required fields: name, price, and category');
        setSubmitting(false);
        return;
      }

      // Get token for API authentication
      const token = localStorage.getItem('token');

      // Create a FormData object if we have an image
      if (imageFile) {
        // Create FormData for image upload
        const formData = new FormData();
        
        // Ensure all values are properly set and converted to appropriate types
        const name = menuItem.name.trim();
        const description = (menuItem.description || '').trim();
        const price = menuItem.price.toString(); // Send as string to avoid number formatting issues
        const category = menuItem.category;
        const size = menuItem.size || 'Medium';
        const isAvailable = String(menuItem.isAvailable); // Convert boolean to string explicitly
        
        // Add menu item data - ensure field names match what the server expects
        formData.append('name', name);
        formData.append('description', description);
        formData.append('price', price);
        formData.append('category', category);
        formData.append('size', size);
        formData.append('isAvailable', isAvailable);
        
        // Add image file - make sure the field name matches what the server expects
        formData.append('image', imageFile);
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            // Important: Do not set Content-Type manually for multipart/form-data
            // Axios will set the correct boundary automatically
          }
        };
        
        // Log what we're about to send
        console.log('Sending form data with image');
        // Log each form data entry to debug
        for (let [key, value] of formData.entries()) {
          console.log(`${key}: ${value}`);
        }
        
        // Add debug query parameter
        const debugParam = '?debug=true';
        
        // Make request with image upload
        if (isEditing) {
          try {
            const response = await axios.put(
              `http://localhost:3000/api/restaurants/menu-with-image/${itemId}${debugParam}`,
              formData,
              config
            );
            console.log('Update response:', response.data);
            toast.success('Menu item updated successfully');
          } catch (error) {
            console.error('Update error:', error);
            throw error;
          }
        } else {
          try {
            const response = await axios.post(
              `http://localhost:3000/api/restaurants/${restaurantId}/menu-with-image${debugParam}`,
              formData,
              config
            );
            console.log('Create response:', response.data);
            toast.success('Menu item added successfully');
          } catch (error) {
            console.error('Create error:', error);
            throw error;
          }
        }
      } else {
        // No image, use regular JSON payload
        const data = {
          name: menuItem.name,
          description: menuItem.description || '',
          price: Number(menuItem.price),
          category: menuItem.category,
          size: menuItem.size || 'Medium',
          isAvailable: menuItem.isAvailable
        };
        
        const config = {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        };
        
        // Log what we're about to send
        console.log('Sending data without image:', data);
        
        // Make request without image
        if (isEditing) {
          const response = await axios.put(
            `http://localhost:3000/api/restaurants/menu/${itemId}`,
            data,
            config
          );
          console.log('Update response:', response.data);
          toast.success('Menu item updated successfully');
        } else {
          const response = await axios.post(
            `http://localhost:3000/api/restaurants/${restaurantId}/menu`,
            data,
            config
          );
          console.log('Create response:', response.data);
          toast.success('Menu item added successfully');
        }
      }
      
      // Navigate back to menu page
      navigate(`/restaurant/manage-menu/${restaurantId}`);
    } catch (error) {
      console.error('Error saving menu item:', error);
      // Log all parts of the error for debugging
      if (error.response) {
        console.error('Response status:', error.response.status);
        console.error('Response headers:', error.response.headers);
        console.error('Response data:', error.response.data);
        
        // Show more detailed error from the server if available
        let errorMessage = 'Failed to save menu item';
        
        if (typeof error.response.data === 'object' && error.response.data.message) {
          errorMessage = error.response.data.message;
          
          // If debug data is available, log it
          if (error.response.data.debug) {
            console.error('Debug info:', error.response.data.debug);
          }
        }
        
        toast.error(errorMessage);
      } else {
        toast.error('Error: ' + (error.message || 'Unknown error'));
      }
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
            onClick={() => navigate(`/restaurant/manage-menu/${restaurantId}`)}
            sx={{ mr: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4">
            {isEditing ? 'Edit Menu Item' : 'Add Menu Item'}
          </Typography>
        </Box>

        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Item Name"
            name="name"
            value={menuItem.name}
            onChange={handleInputChange}
            margin="normal"
            required
          />
          
          <TextField
            fullWidth
            label="Description"
            name="description"
            value={menuItem.description}
            onChange={handleInputChange}
            margin="normal"
            multiline
            rows={3}
          />
          
          <TextField
            fullWidth
            label="Price"
            name="price"
            type="number"
            value={menuItem.price}
            onChange={handleInputChange}
            margin="normal"
            required
            inputProps={{
              min: 0,
              step: 0.01
            }}
          />

          <FormControl fullWidth margin="normal" required>
            <InputLabel>Category</InputLabel>
            <Select
              name="category"
              value={menuItem.category}
              onChange={handleInputChange}
              label="Category"
            >
              <MenuItem value="Appetizer">Appetizer</MenuItem>
              <MenuItem value="Main Course">Main Course</MenuItem>
              <MenuItem value="Dessert">Dessert</MenuItem>
              <MenuItem value="Beverage">Beverage</MenuItem>
              <MenuItem value="Side Dish">Side Dish</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="normal">
            <InputLabel>Size</InputLabel>
            <Select
              name="size"
              value={menuItem.size}
              onChange={handleInputChange}
              label="Size"
            >
              <MenuItem value="Small">Small</MenuItem>
              <MenuItem value="Medium">Medium</MenuItem>
              <MenuItem value="Large">Large</MenuItem>
            </Select>
          </FormControl>
          
          {/* Image Upload Section */}
          <Box mt={3} mb={3}>
            <Typography variant="subtitle1" gutterBottom>
              Food Item Image
            </Typography>
            
            <Box display="flex" alignItems="center" mt={1}>
              <label htmlFor="icon-button-file">
                <Input
                  accept="image/*"
                  id="icon-button-file"
                  type="file"
                  sx={{ display: 'none' }}
                  onChange={handleImageChange}
                />
                <Button
                  variant="contained"
                  component="span"
                  startIcon={<PhotoCamera />}
                >
                  Upload Image
                </Button>
              </label>
              
              {imagePreview && (
                <IconButton 
                  color="error" 
                  onClick={handleClearImage}
                  sx={{ ml: 2 }}
                >
                  <DeleteIcon />
                </IconButton>
              )}
            </Box>
            
            {imagePreview && (
              <Card sx={{ maxWidth: 300, mt: 2 }}>
                <CardMedia
                  component="img"
                  height="200"
                  image={imagePreview}
                  alt={menuItem.name}
                  sx={{ objectFit: 'contain' }}
                />
              </Card>
            )}
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={menuItem.isAvailable}
                onChange={handleInputChange}
                name="isAvailable"
                color="primary"
              />
            }
            label="Item is available"
            sx={{ mt: 2 }}
          />

          <Box mt={4} display="flex" justifyContent="flex-end">
            <Button
              variant="contained"
              color="primary"
              type="submit"
              disabled={submitting}
              sx={{ minWidth: 120 }}
            >
              {submitting ? <CircularProgress size={24} color="inherit" /> : 'Save'}
            </Button>
          </Box>
        </form>
      </Paper>
    </Container>
  );
} 