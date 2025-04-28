import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import toast from 'react-hot-toast';
import { useAuth } from './AuthContext';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState({ items: [], totalAmount: 0 });
  const [itemCount, setItemCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  // Fetch cart on component mount and when user changes
  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCart({ items: [], totalAmount: 0 });
      setItemCount(0);
      setLoading(false);
    }
  }, [user]);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      if (!token) {
        setLoading(false);
        return;
      }

      const response = await axios.get('http://localhost:3003/api/cart', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      
      setCart(response.data);
      updateItemCount(response.data.items);
    } catch (error) {
      console.error('Error fetching cart:', error);
      toast.error('Failed to fetch cart');
    } finally {
      setLoading(false);
    }
  };

  const updateItemCount = (items) => {
    if (!items) return setItemCount(0);
    
    const count = items.reduce((total, item) => total + item.quantity, 0);
    setItemCount(count);
  };

  const addToCart = async (menuItem, restaurantId, restaurantName) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        toast.error('Please login to add items to cart');
        return false;
      }

      const cartItem = {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        size: menuItem.size || 'Medium',
        restaurantId,
        restaurantName
      };

      const response = await axios.post(
        'http://localhost:3003/api/cart/items',
        cartItem,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCart(response.data);
      updateItemCount(response.data.items);
      toast.success('Item added to cart');
      return true;
    } catch (error) {
      console.error('Error adding to cart:', error);
      toast.error(error.response?.data?.message || 'Failed to add item to cart');
      return false;
    }
  };

  const updateQuantity = async (itemId, quantity) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await axios.patch(
        `http://localhost:3003/api/cart/items/${itemId}`,
        { quantity },
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCart(response.data);
      updateItemCount(response.data.items);
      return true;
    } catch (error) {
      console.error('Error updating cart item quantity:', error);
      toast.error('Failed to update quantity');
      return false;
    }
  };

  const removeFromCart = async (itemId) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await axios.delete(
        `http://localhost:3003/api/cart/items/${itemId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCart(response.data);
      updateItemCount(response.data.items);
      toast.success('Item removed from cart');
      return true;
    } catch (error) {
      console.error('Error removing from cart:', error);
      toast.error('Failed to remove item from cart');
      return false;
    }
  };

  const clearCart = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return false;

      const response = await axios.delete(
        'http://localhost:3003/api/cart',
        {
          headers: {
            Authorization: `Bearer ${token}`
          }
        }
      );
      
      setCart(response.data.cart);
      setItemCount(0);
      toast.success('Cart cleared');
      return true;
    } catch (error) {
      console.error('Error clearing cart:', error);
      toast.error('Failed to clear cart');
      return false;
    }
  };

  const value = {
    cart,
    itemCount,
    loading,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart,
    fetchCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
} 