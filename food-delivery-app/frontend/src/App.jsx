import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import { useState, useMemo, createContext, useContext, useEffect } from 'react';
import CssBaseline from '@mui/material/CssBaseline';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Login from './pages/Login';
import Register from './pages/Register';
import Restaurants from './pages/Restaurants';
import RestaurantMenu from './pages/RestaurantMenu';
import MenuItemForm from './pages/MenuItemForm';
import Cart from './pages/Cart';
import Orders from './pages/Orders';
import RestaurantOrders from './pages/RestaurantOrders';
import DeliveryDashboard from './pages/DeliveryDashboard';
import AdminDashboard from './pages/AdminDashboard';
import Home from './pages/Home';
import { AuthProvider } from './contexts/AuthContext';
import { CartProvider } from './contexts/CartContext';
import PrivateRoute from './components/PrivateRoute';
import ThemeToggle from './components/ThemeToggle';
import RestaurantDetails from './pages/RestaurantDetails';
import UserManagement from './pages/UserManagement';

// Create a context for theme mode
export const ColorModeContext = createContext({
  toggleColorMode: () => {},
  mode: 'light',
});

export function useColorMode() {
  return useContext(ColorModeContext);
}

export default function App() {
  // Get the user's preferred theme from localStorage or default to 'light'
  const storedMode = localStorage.getItem('themeMode') || 'light';
  const [mode, setMode] = useState(storedMode);

  // Update localStorage when theme changes
  useEffect(() => {
    localStorage.setItem('themeMode', mode);
  }, [mode]);

  const colorMode = useMemo(
    () => ({
      toggleColorMode: () => {
        setMode((prevMode) => (prevMode === 'light' ? 'dark' : 'light'));
      },
      mode,
    }),
    [mode],
  );

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: '#ff9800',
            dark: '#f57c00',
            light: '#ffb74d',
            contrastText: '#fff',
          },
          secondary: {
            main: '#f44336',
            dark: '#d32f2f',
            light: '#ef5350',
            contrastText: '#fff',
          },
          success: {
            main: '#4caf50',
          },
          background: {
            default: mode === 'light' ? '#f5f5f5' : '#121212',
            paper: mode === 'light' ? '#ffffff' : '#1e1e1e',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
          h1: {
            fontWeight: 700,
          },
          h2: {
            fontWeight: 700,
          },
          h3: {
            fontWeight: 700,
          },
          h4: {
            fontWeight: 700,
          },
          h5: {
            fontWeight: 700,
          },
          h6: {
            fontWeight: 700,
          },
          button: {
            fontWeight: 600,
          },
        },
        shape: {
          borderRadius: 8,
        },
        components: {
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                borderRadius: 12,
                boxShadow: mode === 'light' 
                  ? '0 4px 12px rgba(0,0,0,0.05)' 
                  : '0 4px 12px rgba(0,0,0,0.25)',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                borderRadius: 12,
              },
            },
          },
        },
      }),
    [mode],
  );

  return (
    <ColorModeContext.Provider value={colorMode}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <AuthProvider>
            <CartProvider>
              <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                <Navbar />
                <div style={{ paddingTop: '70px', flex: 1, paddingBottom: '2rem' }}>
                  <Routes>
                    <Route path="/login" element={<Login />} />
                    <Route path="/register" element={<Register />} />
                    <Route 
                      path="/admin" 
                      element={
                        <PrivateRoute requiredRole="admin">
                          <AdminDashboard />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurants" 
                      element={
                        <PrivateRoute>
                          <Restaurants />
                        </PrivateRoute>
                      } 
                    />
		    <Route 
                      path="/admin/users" 
                      element={
                        <PrivateRoute requiredRole="admin">
                          <UserManagement />
                        </PrivateRoute>
                      } 
                    />

                    <Route 
                      path="/restaurant/menu" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <RestaurantMenu />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/manage-menu/:restaurantId" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <RestaurantMenu isManageView={true} />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/menu/:restaurantId/add" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <MenuItemForm />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/menu/:restaurantId/edit/:itemId" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <MenuItemForm isEdit />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/edit/:restaurantId" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <RestaurantDetails />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/:id" 
                      element={
                        <PrivateRoute>
                          <RestaurantMenu />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/cart" 
                      element={
                        <PrivateRoute>
                          <Cart />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/orders" 
                      element={
                        <PrivateRoute>
                          <Orders />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/restaurant/orders" 
                      element={
                        <PrivateRoute requiredRole="restaurant_admin">
                          <RestaurantOrders />
                        </PrivateRoute>
                      } 
                    />
                    <Route 
                      path="/delivery-dashboard" 
                      element={
                        <PrivateRoute requiredRole="delivery_personnel">
                          <DeliveryDashboard />
                        </PrivateRoute>
                      } 
                    />
                    <Route path="/" element={<Home />} />
                  </Routes>
                </div>
                <Footer />
                <ThemeToggle />
                <Toaster 
                  position="top-right"
                  toastOptions={{
                    style: {
                      borderRadius: '8px',
                      background: mode === 'dark' ? '#2d2d2d' : '#fff',
                      color: mode === 'dark' ? '#fff' : '#333',
                    },
                  }}
                />
              </div>
            </CartProvider>
          </AuthProvider>
        </Router>
      </ThemeProvider>
    </ColorModeContext.Provider>
  );
}
