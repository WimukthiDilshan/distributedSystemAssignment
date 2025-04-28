import { useState } from 'react';
import { Box, Skeleton } from '@mui/material';

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

const MenuItemImage = ({ image, alt, size = 'medium', style = {} }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  
  // Define dimensions based on size
  let dimensions = { width: 300, height: 200 };
  if (size === 'small') {
    dimensions = { width: 60, height: 60 };
  } else if (size === 'large') {
    dimensions = { width: 500, height: 350 };
  }
  
  // Define image source
  const imgSrc = image 
    ? getImageUrl(image)
    : size === 'small' 
      ? '/placeholder-food-small.jpg' 
      : '/placeholder-food.jpg';
  
  // Handle missing images
  const handleError = (e) => {
    console.log('Image failed to load:', image);
    setError(true);
    setLoading(false);
    
    // Set fallback image
    e.target.src = size === 'small' 
      ? '/placeholder-food-small.jpg' 
      : '/placeholder-food.jpg';
    
    // Prevent infinite loop if placeholder also fails
    e.target.onerror = null;
  };

  // Handle successful load
  const handleLoad = () => {
    setLoading(false);
  };

  return (
    <Box 
      position="relative" 
      borderRadius={1} 
      overflow="hidden"
      width={dimensions.width} 
      height={dimensions.height}
      {...style}
    >
      {loading && (
        <Skeleton 
          variant="rectangular" 
          width={dimensions.width} 
          height={dimensions.height} 
          animation="wave"
          sx={{
            position: 'absolute',
            top: 0,
            left: 0
          }}
        />
      )}
      
      {(!image || error) ? (
        <Box 
          sx={{ 
            width: dimensions.width, 
            height: dimensions.height, 
            bgcolor: 'grey.200',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: size === 'small' ? '12px' : '16px',
            color: 'text.secondary'
          }}
        >
          {size === 'small' ? 'No image' : 'No image available'}
        </Box>
      ) : (
        <Box
          component="img"
          src={imgSrc}
          alt={alt || 'Menu item'}
          sx={{ 
            width: dimensions.width, 
            height: dimensions.height, 
            objectFit: 'cover',
            display: loading ? 'none' : 'block'
          }}
          onError={handleError}
          onLoad={handleLoad}
        />
      )}
    </Box>
  );
};

export default MenuItemImage; 