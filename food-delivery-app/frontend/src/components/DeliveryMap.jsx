import { useState, useEffect, useRef } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Box, Typography, Button, Paper } from '@mui/material';
import L from 'leaflet';

// Fix for default marker icons in react-leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

// Component to handle location selection
function LocationMarker({ position, setPosition, onLocationSelect, isSelectable = true }) {
  const map = useMapEvents({
    click(e) {
      // Only allow location selection if map is selectable
      if (isSelectable) {
        const { lat, lng } = e.latlng;
        setPosition([lat, lng]);
        
        // Get address from coordinates using reverse geocoding
        // Add proper User-Agent & rate limiting for OSM policy compliance
        const headers = new Headers({
          'User-Agent': 'FoodDeliveryApp/1.0 (https://example.com; contact@example.com)'
        });
        
        // Small delay to prevent too many API calls
        setTimeout(() => {
          fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`, {
            headers: headers
          })
            .then(response => response.json())
            .then(data => {
              if (data && data.address) {
                const address = data.address;
                
                // Format the address data
                const formattedAddress = {
                  street: `${address.road || ''} ${address.house_number || ''}`.trim(),
                  city: address.city || address.town || address.village || '',
                  state: address.state || '',
                  zipCode: address.postcode || '',
                  country: address.country || '',
                  // Store exact coordinates for precision
                  coordinates: {
                    lat,
                    lng
                  }
                };
                
                // Pass the formatted address up to parent component
                onLocationSelect(formattedAddress);
              }
            })
            .catch(error => console.error('Error fetching address:', error));
        }, 1000); // 1 second delay
      }
    },
  });

  return position ? (
    <Marker position={position}>
      <Popup>Delivery Location</Popup>
    </Marker>
  ) : null;
}

export default function DeliveryMap({ onLocationSelect, initialAddress = {}, isSelectable = true }) {
  // Default to a central location if no initial position
  const [position, setPosition] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const mapRef = useRef(null);
  
  // Try to get user's current location when component mounts
  useEffect(() => {
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setPosition([latitude, longitude]);
          setIsLoading(false);
          
          // If we have a map reference, fly to the user's location
          if (mapRef.current) {
            mapRef.current.flyTo([latitude, longitude], 15);
          }
        },
        () => {
          // Default position if user denies location access
          setPosition([20.5937, 78.9629]); // Default to center of India
          setIsLoading(false);
        }
      );
    } else {
      // Fallback for browsers without geolocation
      setPosition([20.5937, 78.9629]);
      setIsLoading(false);
    }
  }, []);

  // If we already have an address with coordinates, use that position
  useEffect(() => {
    if (initialAddress?.coordinates?.lat && initialAddress?.coordinates?.lng) {
      const { lat, lng } = initialAddress.coordinates;
      setPosition([lat, lng]);
      
      // If we have a map reference, fly to the address position
      if (mapRef.current) {
        mapRef.current.flyTo([lat, lng], 15);
      }
    }
  }, [initialAddress]);

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" height="300px">
        <Typography>Loading map...</Typography>
      </Box>
    );
  }

  return (
    <Paper elevation={0} sx={{ border: '1px solid rgba(0,0,0,0.12)', borderRadius: 2, overflow: 'hidden', mb: 3 }}>
      <Box sx={{ height: 300, width: '100%', position: 'relative' }}>
        {position && (
          <MapContainer
            center={position}
            zoom={15}
            style={{ height: '100%', width: '100%' }}
            ref={mapRef}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
              position={position} 
              setPosition={setPosition} 
              onLocationSelect={onLocationSelect} 
              isSelectable={isSelectable}
            />
          </MapContainer>
        )}
        {isSelectable && (
          <Box 
            position="absolute" 
            bottom={10} 
            left={0} 
            right={0} 
            display="flex" 
            justifyContent="center"
            zIndex={1000}
          >
            <Typography
              variant="caption"
              sx={{
                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                px: 2,
                py: 0.5,
                borderRadius: 5,
                fontWeight: 'medium'
              }}
            >
              Click on the map to select your delivery location
            </Typography>
          </Box>
        )}
      </Box>
    </Paper>
  );
} 