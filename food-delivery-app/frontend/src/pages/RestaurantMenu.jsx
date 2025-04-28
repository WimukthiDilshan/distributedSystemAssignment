import { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  Container,
  Typography,
  Button,
  Box,
  CircularProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Card,
  CardContent,
  Grid,
  CardActions,
  Divider,
  CardMedia
} from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import MenuItemImage from '../components/MenuItemImage';

// Icon imports (you'll need to install @mui/icons-material)
// import EditIcon from '@mui/icons-material/Edit';
// import DeleteIcon from '@mui/icons-material/Delete';
// import ArrowBackIcon from '@mui/icons-material/ArrowBack';

export default function RestaurantMenu({ isManageView }) {
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const { id: urlParamId, restaurantId } = useParams(); // renamed from restaurantId to avoid confusion
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { addToCart } = useCart();
  
  // Check if user is a restaurant admin and determine view type
  const isRestaurantAdmin = user?.role === 'restaurant_admin';
  const isAdminView = isManageView || location.pathname === '/restaurant/menu';
  
  useEffect(() => {
    // Dismiss any existing toasts when component mounts/updates
    toast.dismiss();
    
    if (isAdminView && isRestaurantAdmin) {
      console.log("Fetching admin restaurant");
      toast.loading("Loading your restaurant menu...");
      if (isManageView && restaurantId) {
        fetchRestaurantDetails(restaurantId);
      } else {
        fetchAdminRestaurantDetails();
      }
    } else if (urlParamId) {
      console.log("Fetching restaurant by ID:", urlParamId);
      toast.loading("Loading restaurant menu...");
      fetchRestaurantDetails(urlParamId);
    } else {
      console.log("No restaurant ID found and not in admin view");
      setLoading(false);
      toast.error("No restaurant information available");
    }
    
    // Cleanup toasts when component unmounts
    return () => {
      toast.dismiss();
    };
  }, [urlParamId, restaurantId, isAdminView, isRestaurantAdmin, isManageView]);

  const fetchAdminRestaurantDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch the restaurant associated with the logged-in admin
      const response = await axios.get(`http://localhost:3000/api/restaurants/admin`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRestaurant(response.data);
      toast.dismiss(); // Dismiss loading toast
      toast.success("Restaurant menu loaded successfully");
    } catch (error) {
      console.error('Error fetching admin restaurant details:', error);
      toast.dismiss(); // Dismiss loading toast
      toast.error('Failed to fetch your restaurant details');
      
      // Fallback: If the admin endpoint doesn't exist, create a demo restaurant
      // This is temporary until the backend endpoint is created
      setRestaurant({
        _id: "demo-restaurant-id",
        name: "Your Restaurant",
        cuisine: "Various",
        isOpen: true,
        menu: [
          {
            _id: "demo-item-1",
            name: "Sample Burger",
            description: "A delicious burger with all the fixings",
            price: 9.99,
            category: "Main Course",
            isAvailable: true
          },
          {
            _id: "demo-item-2",
            name: "Sample Pizza",
            description: "Freshly baked pizza with premium toppings",
            price: 12.99,
            category: "Main Course",
            isAvailable: true
          },
          {
            _id: "demo-item-3",
            name: "Sample Salad",
            description: "Fresh garden salad with house dressing",
            price: 7.99,
            category: "Starters",
            isAvailable: true
          }
        ]
      });
      toast.success("Demo restaurant loaded for testing");
    } finally {
      setLoading(false);
    }
  };

  const fetchRestaurantDetails = async (id) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`http://localhost:3000/api/restaurants/${id}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      setRestaurant(response.data);
      
      // Log restaurant approval status for debugging
      console.log('Restaurant approval status:', response.data.approvalStatus);
      
      toast.dismiss(); // Dismiss loading toast
      toast.success("Restaurant menu loaded successfully");
      
      // Show warnings to restaurant admin based on approval status
      if (isRestaurantAdmin && response.data.approvalStatus) {
        if (response.data.approvalStatus === 'pending') {
          toast.warning('Your restaurant is pending approval from system administrator', {
            duration: 5000
          });
        } else if (response.data.approvalStatus === 'rejected') {
          toast.error('Your restaurant has been rejected and is not visible to customers', {
            duration: 5000
          });
        }
      }
    } catch (error) {
      console.error('Error fetching restaurant details:', error);
      toast.dismiss(); // Dismiss loading toast
      toast.error('Failed to fetch restaurant details');
      
      // Fallback with demo data for testing
      setRestaurant({
        _id: id || "demo-restaurant-id",
        name: "Sample Restaurant",
        cuisine: "International",
        isOpen: true,
        menu: [
          {
            _id: "demo-item-1",
            name: "Deluxe Burger",
            description: "Juicy beef patty with cheese, lettuce, and special sauce",
            price: 8.99,
            category: "Burgers",
            isAvailable: true
          },
          {
            _id: "demo-item-2",
            name: "Veggie Pizza",
            description: "Fresh vegetables on a crispy crust with our signature sauce",
            price: 11.99,
            category: "Pizza",
            isAvailable: true
          },
          {
            _id: "demo-item-3",
            name: "Chocolate Shake",
            description: "Rich and creamy chocolate milkshake",
            price: 4.99,
            category: "Beverages",
            isAvailable: true
          }
        ]
      });
      toast.success("Demo data loaded for testing");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) return;
    
    toast.loading("Deleting menu item...");
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`http://localhost:3000/api/restaurants/menu/${itemId}`, {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      // Update the restaurant state to remove the deleted item
      setRestaurant(prev => ({
        ...prev,
        menu: prev.menu.filter(item => item._id !== itemId)
      }));
      
      toast.dismiss();
      toast.success('Menu item deleted successfully');
    } catch (error) {
      console.error('Error deleting menu item:', error);
      toast.dismiss();
      toast.error('Failed to delete menu item');
      
      // For demo purposes, still update the UI even if the API call fails
      if (itemId.startsWith('demo-')) {
        setRestaurant(prev => ({
          ...prev,
          menu: prev.menu.filter(item => item._id !== itemId)
        }));
        toast.success('Demo item removed from UI');
      }
    }
  };

  const handleAddMenuItem = () => {
    if (restaurant && restaurant._id) {
      // For demo restaurant, show a message
      if (restaurant._id === "demo-restaurant-id") {
        toast.error("Add functionality not available in demo mode");
        return;
      }
      
      navigate(`/restaurant/menu/${restaurant._id}/add`);
    } else {
      toast.error('Restaurant ID not found');
    }
  };

  const handleEditMenuItem = (itemId) => {
    if (restaurant && restaurant._id) {
      // For demo restaurant, show a message
      if (restaurant._id === "demo-restaurant-id" || itemId.startsWith('demo-')) {
        toast.error("Edit functionality not available in demo mode");
        return;
      }
      
      navigate(`/restaurant/menu/${restaurant._id}/edit/${itemId}`);
    } else {
      toast.error('Restaurant ID not found');
    }
  };

  const handleAddToCart = async (menuItem) => {
    // For demo items, show success without actually adding to cart
    if (restaurant._id === "demo-restaurant-id" || menuItem._id.startsWith('demo-')) {
      toast.success(`${menuItem.name} added to cart (demo mode)`);
      return;
    }
    
    try {
      const added = await addToCart(menuItem, restaurant._id, restaurant.name);
      if (added) {
        toast.success(`${menuItem.name} added to cart`);
      }
    } catch (error) {
      console.error('Error adding item to cart:', error);
      toast.error('Failed to add item to cart');
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  if (!restaurant && !loading) {
    return (
      <Container sx={{ mt: 4 }}>
        <Typography variant="h5" color="error">Restaurant not found</Typography>
        <Button 
          variant="outlined" 
          onClick={() => navigate('/restaurants')}
          sx={{ mt: 2 }}
        >
          Back to Restaurants
        </Button>
      </Container>
    );
  }

  // Customer view of menu items
  const CustomerMenuView = () => (
    <Grid container spacing={3}>
      {restaurant.menu?.map((item) => (
        <Grid item xs={12} sm={6} md={4} key={item._id}>
          <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ height: 200, overflow: 'hidden' }}>
              <MenuItemImage
                image={item.image}
                alt={item.name}
                style={{ width: '100%' }}
              />
            </Box>
            <CardContent sx={{ flexGrow: 1 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="h6" component="div">
                  {item.name}
                </Typography>
                <Chip 
                  label={`$${item.price?.toFixed(2)}`} 
                  color="primary"
                  size="small"
                />
              </Box>
              
              <Typography variant="body2" color="text.secondary" paragraph>
                {item.description}
              </Typography>
              
              <Box display="flex" justifyContent="space-between">
                <Typography variant="body2">
                  Category: {item.category}
                </Typography>
                <Typography variant="body2">
                  Size: {item.size || 'Regular'}
                </Typography>
              </Box>
              
              {!item.isAvailable && (
                <Box mt={1}>
                  <Chip 
                    label="Currently Unavailable" 
                    color="error"
                    size="small"
                  />
                </Box>
              )}
            </CardContent>
            <CardActions>
              <Button 
                fullWidth 
                variant="contained" 
                color="primary"
                disabled={!item.isAvailable}
                onClick={() => handleAddToCart(item)}
              >
                Add to Cart
              </Button>
            </CardActions>
          </Card>
        </Grid>
      ))}
    </Grid>
  );

  // Admin view of menu items
  const AdminMenuView = () => (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Food Menu Items
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={handleAddMenuItem}
        >
          Add New Food Item
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="center">Size</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {restaurant.menu && restaurant.menu.length > 0 ? (
              restaurant.menu.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <MenuItemImage
                      image={item.image}
                      alt={item.name}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">${item.price?.toFixed(2)}</TableCell>
                  <TableCell align="center">{item.size || 'Regular'}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={item.isAvailable ? 'Available' : 'Unavailable'} 
                      color={item.isAvailable ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleEditMenuItem(item._id)}
                      >
                        Edit
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteMenuItem(item._id)}
                      >
                        Delete
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" py={3}>
                    No menu items found. Add your first menu item!
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  // Admin menu management view
  const ManageMenuView = () => (
    <>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5" component="h2">
          Manage Food Items
        </Typography>
        <Button 
          variant="contained" 
          color="primary"
          onClick={() => navigate(`/restaurant/menu/${restaurant._id}/add`)}
        >
          Add New Food Item
        </Button>
      </Box>
      
      <TableContainer component={Paper} sx={{ mb: 4 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Image</TableCell>
              <TableCell>Name</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Category</TableCell>
              <TableCell align="right">Price</TableCell>
              <TableCell align="center">Size</TableCell>
              <TableCell align="center">Status</TableCell>
              <TableCell align="center">Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {restaurant.menu && restaurant.menu.length > 0 ? (
              restaurant.menu.map((item) => (
                <TableRow key={item._id}>
                  <TableCell>
                    <MenuItemImage
                      image={item.image}
                      alt={item.name}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>{item.name}</TableCell>
                  <TableCell>{item.description}</TableCell>
                  <TableCell>{item.category}</TableCell>
                  <TableCell align="right">${item.price?.toFixed(2)}</TableCell>
                  <TableCell align="center">{item.size || 'Regular'}</TableCell>
                  <TableCell align="center">
                    <Chip 
                      label={item.isAvailable ? 'Available' : 'Unavailable'} 
                      color={item.isAvailable ? 'success' : 'error'}
                      size="small"
                    />
                  </TableCell>
                  <TableCell align="center">
                    <Box display="flex" justifyContent="center">
                      <IconButton 
                        color="primary" 
                        onClick={() => handleEditMenuItem(item._id)}
                      >
                        Edit
                      </IconButton>
                      <IconButton 
                        color="error" 
                        onClick={() => handleDeleteMenuItem(item._id)}
                      >
                        Delete
                      </IconButton>
                    </Box>
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={8} align="center">
                  <Typography variant="body1" py={3}>
                    No food items found. Add your first food item!
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );

  return (
    <Container sx={{ mt: 4, pb: 6 }}>
      <Box mb={4}>
        {!isAdminView && (
          <Button
            variant="outlined"
            onClick={() => navigate('/restaurants')}
            sx={{ mb: 3 }}
          >
            Back to Restaurants
          </Button>
        )}
        
        {isManageView && (
          <Button
            variant="outlined"
            onClick={() => navigate('/restaurants')}
            sx={{ mb: 3 }}
          >
            Back to Restaurants
          </Button>
        )}
        
        <Typography variant="h4" gutterBottom>
          {isManageView ? `Manage ${restaurant?.name} Menu` : restaurant?.name}
        </Typography>
        
        {!isAdminView && (
          <Box display="flex" gap={1} mb={3}>
            <Chip label={restaurant?.cuisine} color="primary" />
            <Chip label={`Delivery: $3.99`} />
          </Box>
        )}
      </Box>
      
      {/* Approval Status Alert for Restaurant Admins */}
      {isRestaurantAdmin && restaurant && restaurant.approvalStatus && (
        <Box 
          sx={{ 
            p: 2, 
            my: 2, 
            borderRadius: 1,
            bgcolor: 
              restaurant.approvalStatus === 'approved' ? 'success.light' : 
              restaurant.approvalStatus === 'rejected' ? 'error.light' : 
              'warning.light',
          }}
        >
          <Typography variant="subtitle1" fontWeight="bold">
            {restaurant.approvalStatus === 'approved' 
              ? '✓ Your restaurant is approved and visible to customers' 
              : restaurant.approvalStatus === 'rejected'
              ? '✗ Your restaurant has been rejected and is not visible to customers'
              : '⏳ Your restaurant is pending approval from system administrator'}
          </Typography>
          <Typography variant="body2">
            {restaurant.approvalStatus === 'pending' && 
              'Your restaurant will not be visible to customers until it has been approved by a system administrator.'}
            {restaurant.approvalStatus === 'rejected' && 
              'Please contact support for more information about why your restaurant was rejected.'}
          </Typography>
        </Box>
      )}
      
      {isManageView ? <ManageMenuView /> : (isAdminView && isRestaurantAdmin) ? <AdminMenuView /> : <CustomerMenuView />}
    </Container>
  );
} 