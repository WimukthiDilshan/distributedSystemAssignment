import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Paper, CircularProgress, Chip, Button, Avatar, Card, CardContent, IconButton, Divider } from '@mui/material';
import axios from 'axios';
import toast from 'react-hot-toast';
import L from 'leaflet';
import PhoneIcon from '@mui/icons-material/Phone';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;

// Custom icons for different markers
const deliveryAgentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const destinationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Component to fit bounds to include all markers
function BoundsUpdater({ positions }) {
  const map = useMap();
  
  useEffect(() => {
    if (positions && positions.length > 0) {
      // Create a bounds object using the positions
      const bounds = L.latLngBounds(positions);
      
      // Fit the map to the bounds with some padding
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [map, positions]);
  
  return null;
}

export default function OrderTracking({ orderId, onClose }) {
  const [trackingData, setTrackingData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshInterval, setRefreshInterval] = useState(null);
  const [agentDetails, setAgentDetails] = useState(null);
  const mapRef = useRef(null);
  
  // Function to fetch tracking data
  const fetchTrackingData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(
        `http://localhost:3000/api/delivery/track/${orderId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setTrackingData(response.data);
      
      // If we have a delivery agent ID and don't have agent details yet, fetch them
      if (response.data?.deliveryAgentId && !agentDetails) {
        fetchDeliveryAgentDetails(response.data.deliveryAgentId, token);
      }
      
      setError(null);
    } catch (err) {
      console.error('Error fetching tracking data:', err);
      setError(err.response?.data?.message || 'Failed to fetch tracking data');
      toast.error(err.response?.data?.message || 'Failed to fetch tracking data');
      
      // Clear the refresh interval if we encounter an error
      if (refreshInterval) {
        clearInterval(refreshInterval);
        setRefreshInterval(null);
      }
    } finally {
      setLoading(false);
    }
  };

  // Function to fetch delivery agent details
  const fetchDeliveryAgentDetails = async (agentId, token) => {
    try {
      const response = await axios.get(
        `http://localhost:3000/api/auth/users/${agentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setAgentDetails(response.data);
    } catch (err) {
      console.error('Error fetching delivery agent details:', err);
      toast.error('Failed to load delivery agent information');
    }
  };
  
  // Handle calling the delivery agent
  const handleCallAgent = () => {
    if (agentDetails?.phone) {
      window.location.href = `tel:${agentDetails.phone}`;
    } else {
      toast.error('Delivery agent phone number is not available');
    }
  };
  
  // Fetch data when component mounts
  useEffect(() => {
    fetchTrackingData();
    
    // Set up auto-refresh every 15 seconds
    const interval = setInterval(fetchTrackingData, 15000);
    setRefreshInterval(interval);
    
    // Clean up interval when component unmounts
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [orderId]);
  
  // Calculate positions for map bounds
  const getMapPositions = () => {
    const positions = [];
    
    if (trackingData?.currentLocation?.lat && trackingData?.currentLocation?.lng) {
      positions.push([trackingData.currentLocation.lat, trackingData.currentLocation.lng]);
    }
    
    if (trackingData?.deliveryAddress?.coordinates?.lat && trackingData?.deliveryAddress?.coordinates?.lng) {
      positions.push([trackingData.deliveryAddress.coordinates.lat, trackingData.deliveryAddress.coordinates.lng]);
    }
    
    return positions;
  };
  
  if (loading) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="350px">
        <CircularProgress size={40} sx={{ mb: 2 }} />
        <Typography variant="body1">Loading tracking information...</Typography>
      </Box>
    );
  }
  
  if (error) {
    return (
      <Box display="flex" flexDirection="column" justifyContent="center" alignItems="center" height="350px" p={3}>
        <Typography variant="body1" color="error" gutterBottom>{error}</Typography>
        <Button 
          variant="outlined" 
          color="primary" 
          onClick={onClose}
          sx={{ mt: 2 }}
        >
          Close
        </Button>
      </Box>
    );
  }
  
  const positions = getMapPositions();
  const defaultCenter = positions.length > 0 ? positions[0] : [20.5937, 78.9629]; // Default to center of India
  
  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6" fontWeight="bold">Live Order Tracking</Typography>
        <Chip 
          label="Live" 
          color="success" 
          size="small" 
          sx={{ 
            height: '20px', 
            '& .MuiChip-label': { px: 1, fontSize: '0.625rem' } 
          }} 
        />
      </Box>
      
      {/* Delivery Agent Information Card */}
      {agentDetails && (
        <Card variant="outlined" sx={{ mx: 2, mb: 3, borderRadius: 2 }}>
          <CardContent sx={{ p: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Avatar 
                  src={agentDetails.profilePicture || ''}
                  alt={agentDetails.name || 'Delivery Agent'}
                  sx={{ 
                    width: 50, 
                    height: 50,
                    bgcolor: 'primary.main'
                  }}
                >
                  {agentDetails.name ? agentDetails.name.charAt(0).toUpperCase() : 'DA'}
                </Avatar>
                <Box>
                  <Typography variant="subtitle1" fontWeight="bold">
                    {agentDetails.name || 'Delivery Agent'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Delivery Personnel
                  </Typography>
                </Box>
              </Box>
              
              <IconButton 
                color="primary" 
                onClick={handleCallAgent}
                sx={{ 
                  bgcolor: 'rgba(3, 169, 244, 0.1)', 
                  '&:hover': { bgcolor: 'rgba(3, 169, 244, 0.2)' } 
                }}
                aria-label="call delivery agent"
              >
                <PhoneIcon />
              </IconButton>
            </Box>
            
            {agentDetails.phone && (
              <Typography variant="body2" sx={{ mt: 1 }}>
                Contact: {agentDetails.phone}
              </Typography>
            )}

            <Box sx={{ mt: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Your order is on the way. You can call the delivery agent if needed.
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}
      
      <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden', mx: 2, mb: 3 }}>
        <Box sx={{ height: 350, width: '100%', position: 'relative' }}>
          <MapContainer
            center={defaultCenter}
            zoom={13}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            
            {/* Delivery agent marker */}
            {trackingData?.currentLocation?.lat && trackingData?.currentLocation?.lng && (
              <Marker 
                position={[trackingData.currentLocation.lat, trackingData.currentLocation.lng]} 
                icon={deliveryAgentIcon}
              >
                <Popup>
                  <Typography variant="body2" fontWeight="medium">
                    {agentDetails?.name || 'Delivery Agent'}
                  </Typography>
                  <Typography variant="body2">
                    Current location: {trackingData.currentLocation.address || 'On the way'}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(trackingData.currentLocation.updatedAt).toLocaleTimeString()}
                  </Typography>
                </Popup>
              </Marker>
            )}
            
            {/* Delivery destination marker */}
            {trackingData?.deliveryAddress?.coordinates?.lat && trackingData?.deliveryAddress?.coordinates?.lng && (
              <Marker 
                position={[
                  trackingData.deliveryAddress.coordinates.lat, 
                  trackingData.deliveryAddress.coordinates.lng
                ]} 
                icon={destinationIcon}
              >
                <Popup>
                  <Typography variant="body2" fontWeight="medium">Delivery Destination</Typography>
                  <Typography variant="body2">
                    {trackingData.deliveryAddress.street}
                  </Typography>
                  <Typography variant="body2">
                    {`${trackingData.deliveryAddress.city}, ${trackingData.deliveryAddress.state} ${trackingData.deliveryAddress.zipCode || ''}`}
                  </Typography>
                </Popup>
              </Marker>
            )}
            
            {/* Update map bounds to include all markers */}
            <BoundsUpdater positions={positions} />
          </MapContainer>
        </Box>
      </Paper>
      
      <Box sx={{ p: 2 }}>
        <Typography variant="body2" color="text.secondary" align="center">
          Location data is automatically refreshed every 15 seconds
        </Typography>
      </Box>
    </Box>
  );
} 