import { AppBar, Toolbar, Typography, Button, Box, Badge, IconButton, Avatar, Container, Menu, MenuItem, Divider, styled, Tooltip, useTheme } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useCart } from '../contexts/CartContext';
import { useColorMode } from '../App';
import { useState } from 'react';

// Styled components
const StyledAppBar = styled(AppBar)(({ theme }) => ({
  boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
  backgroundImage: theme.palette.mode === 'dark' 
    ? 'linear-gradient(to right, #1a1a1a, #2d2d2d)' 
    : 'linear-gradient(to right, #ffffff, #f9f9f9)',
  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333'
}));

const LogoText = styled(Typography)(({ theme }) => ({
  fontWeight: 'bold',
  fontSize: '1.5rem',
  background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
  WebkitBackgroundClip: 'text',
  WebkitTextFillColor: 'transparent',
  display: 'flex',
  alignItems: 'center'
}));

const NavButton = styled(Button)(({ theme }) => ({
  borderRadius: '8px',
  padding: '8px 16px',
  marginLeft: '8px',
  textTransform: 'none',
  fontWeight: 'bold',
  color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit'
}));

const GradientButton = styled(Button)(({ theme }) => ({
  backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
  color: 'white',
  borderRadius: '8px',
  padding: '8px 16px',
  marginLeft: '8px',
  textTransform: 'none',
  fontWeight: 'bold',
  '&:hover': {
    backgroundImage: 'linear-gradient(to right, #f57c00, #d32f2f)',
  }
}));

// Icons
const CartIcon = () => <span style={{ fontSize: '1.5rem' }}>🛒</span>;
const LogoIcon = () => <span style={{ fontSize: '1.8rem', marginRight: '8px' }}>🍔</span>;
const ProfileIcon = () => <span style={{ fontSize: '1.5rem' }}>👤</span>;
const RestaurantIcon = () => <span style={{ fontSize: '1.5rem' }}>🍽️</span>;
const DeliveryIcon = () => <span style={{ fontSize: '1.5rem' }}>🛵</span>;
const LogoutIcon = () => <span style={{ fontSize: '1.5rem' }}>👋</span>;
const ThemeIcon = ({ mode }) => <span style={{ fontSize: '1.5rem' }}>{mode === 'dark' ? '☀️' : '🌙'}</span>;
const OrdersIcon = () => <span style={{ fontSize: '1.5rem' }}>📋</span>;
const AdminIcon = () => <span style={{ fontSize: '1.5rem' }}>⚙️</span>;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { itemCount } = useCart();
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode, toggleColorMode } = useColorMode();
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  // Get user role to determine which nav items to show
  const userRole = user?.role || '';
  const isDeliveryPersonnel = userRole === 'delivery_personnel';
  const isRestaurantAdmin = userRole === 'restaurant_admin';
  const isCustomer = userRole === 'customer';
  const isAdmin = userRole === 'admin';

  const handleProfileMenuOpen = (event) => {
    setProfileMenuAnchor(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setProfileMenuAnchor(null);
  };

  const handleLogout = () => {
    logout();
    handleProfileMenuClose();
  };

  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(part => part[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  };

  return (
    <StyledAppBar position="fixed" elevation={0}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ py: 1 }}>
          <LogoText 
            variant="h6" 
            component="div" 
            sx={{ flexGrow: 1, cursor: 'pointer' }}
            onClick={() => navigate('/')}
          >
            <LogoIcon />
            FoodExpress
          </LogoText>
          
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
              <IconButton 
                onClick={toggleColorMode}
                sx={{ 
                  mr: 1,
                  color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333',
                  transition: 'all 0.3s ease'
                }}
                aria-label="toggle theme"
              >
                <ThemeIcon mode={mode} />
              </IconButton>
            </Tooltip>
            
            {user ? (
              <>
                {/* Admin Dashboard Button */}
                {isAdmin && (
                  <Tooltip title="Admin Dashboard">
                    <NavButton 
                      onClick={() => navigate('/admin')}
                      startIcon={<AdminIcon />}
                    >
                      Admin
                    </NavButton>
                  </Tooltip>
                )}

                {/* Navigation based on user role */}
                {isDeliveryPersonnel ? (
                  <Tooltip title="Delivery Dashboard">
                    <NavButton 
                      onClick={() => navigate('/delivery-dashboard')}
                      startIcon={<DeliveryIcon />}
                    >
                      Deliveries
                    </NavButton>
                  </Tooltip>
                ) : (
                  <Tooltip title="Browse Restaurants">
                    <NavButton 
                      onClick={() => navigate('/restaurants')}
                      startIcon={<RestaurantIcon />}
                    >
                      Restaurants
                    </NavButton>
                  </Tooltip>
                )}
                
                {/* Orders button for customers */}
                {isCustomer && (
                  <Tooltip title="Your Orders">
                    <NavButton 
                      onClick={() => navigate('/orders')}
                      startIcon={<OrdersIcon />}
                    >
                      Orders
                    </NavButton>
                  </Tooltip>
                )}
                
                {/* Cart button for customers */}
                {isCustomer && (
                  <Tooltip title="Your Cart">
                    <IconButton 
                      onClick={() => navigate('/cart')}
                      sx={{ 
                        mx: 1,
                        color: itemCount > 0 ? '#f44336' : theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <Badge 
                        badgeContent={itemCount} 
                        color="error"
                        sx={{
                          '& .MuiBadge-badge': {
                            background: 'linear-gradient(to bottom right, #ff9800, #f44336)',
                            fontWeight: 'bold'
                          }
                        }}
                      >
                        <CartIcon />
                      </Badge>
                    </IconButton>
                  </Tooltip>
                )}
                
                {/* User profile menu */}
                <Tooltip title="Your Profile">
                  <IconButton 
                    onClick={handleProfileMenuOpen}
                    sx={{ ml: 1 }}
                  >
                    <Avatar 
                      sx={{ 
                        width: 36, 
                        height: 36,
                        background: 'linear-gradient(to bottom right, #ff9800, #f44336)',
                        color: 'white',
                        fontWeight: 'bold',
                        fontSize: '0.9rem'
                      }}
                    >
                      {getInitials(user?.name)}
                    </Avatar>
                  </IconButton>
                </Tooltip>
                
                <Menu
                  anchorEl={profileMenuAnchor}
                  open={Boolean(profileMenuAnchor)}
                  onClose={handleProfileMenuClose}
                  PaperProps={{
                    elevation: 3,
                    sx: {
                      borderRadius: 2,
                      minWidth: 180,
                      overflow: 'visible',
                      mt: 1.5,
                      backgroundColor: theme.palette.mode === 'dark' ? '#333333' : '#ffffff',
                      color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit',
                      '&:before': {
                        content: '""',
                        display: 'block',
                        position: 'absolute',
                        top: 0,
                        right: 14,
                        width: 10,
                        height: 10,
                        bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'background.paper',
                        transform: 'translateY(-50%) rotate(45deg)',
                        zIndex: 0,
                      },
                    },
                  }}
                  transformOrigin={{ horizontal: 'right', vertical: 'top' }}
                  anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
                >
                  <Box sx={{ px: 2, py: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                      {user?.name}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {userRole.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </Typography>
                  </Box>
                  <Divider />
                  
                  {isAdmin && (
                    <MenuItem onClick={() => {
                      navigate('/admin');
                      handleProfileMenuClose();
                    }}>
                      <AdminIcon />&nbsp;Admin Dashboard
                    </MenuItem>
                  )}
                  
                  {isCustomer && (
                    <MenuItem onClick={() => {
                      navigate('/orders');
                      handleProfileMenuClose();
                    }}>
                      <OrdersIcon />&nbsp;My Orders
                    </MenuItem>
                  )}
                  
                  {isRestaurantAdmin && (
                    <MenuItem onClick={() => {
                      navigate('/restaurant/menu');
                      handleProfileMenuClose();
                    }}>
                      Manage Menu
                    </MenuItem>
                  )}
                  
                  <MenuItem onClick={handleLogout}>
                    <LogoutIcon />&nbsp;Logout
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <>
                <NavButton 
                  onClick={() => navigate('/login')}
                >
                  Login
                </NavButton>
                <GradientButton 
                  onClick={() => navigate('/register')}
                >
                  Sign Up
                </GradientButton>
              </>
            )}
          </Box>
        </Toolbar>
      </Container>
    </StyledAppBar>
  );
} 