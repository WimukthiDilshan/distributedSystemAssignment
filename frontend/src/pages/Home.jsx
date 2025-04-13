import { Box, Typography, Container, Grid, Paper, Button, useTheme, Card, CardContent, CardMedia, alpha } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { useColorMode } from '../App';
import { motion } from 'framer-motion';

// Hero image URLs
const lightHeroImage = 'https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1400&q=80';
const darkHeroImage = 'https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1400&q=80';

// Food categories with images
const categories = [
  {
    name: 'Pizza',
    image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Burgers',
    image: 'https://images.unsplash.com/photo-1568901346375-23c9450c58cd?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Sushi',
    image: 'https://images.unsplash.com/photo-1579871494447-9811cf80d66c?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
  },
  {
    name: 'Desserts',
    image: 'https://images.unsplash.com/photo-1563729784474-d77dbb933a9e?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=500&q=80',
  },
];

// Features section
const features = [
  {
    title: 'Fast Delivery',
    description: 'Your favorite food delivered to your doorstep',
    icon: '🚀'
  },
  {
    title: 'Live Tracking',
    description: 'Track your order in real-time',
    icon: '📍'
  },
  {
    title: 'Easy Payment',
    description: 'Multiple payment options available',
    icon: '💳'
  }
];

// Animation variants
const fadeIn = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
};

export default function Home() {
  const navigate = useNavigate();
  const theme = useTheme();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  return (
    <Box>
      {/* Hero Section */}
      <Box
        sx={{
          position: 'relative',
          height: '70vh',
          minHeight: 400,
          backgroundImage: `url(${isDark ? darkHeroImage : lightHeroImage})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          color: 'white',
          display: 'flex',
          alignItems: 'center',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: alpha(isDark ? '#000' : '#333', 0.5),
            zIndex: 1
          }
        }}
      >
        <Container maxWidth="lg" sx={{ position: 'relative', zIndex: 2 }}>
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
          >
            <Typography 
              variant="h2" 
              component="h1"
              sx={{ 
                fontWeight: 'bold',
                mb: 2,
                textShadow: '0 2px 10px rgba(0,0,0,0.3)'
              }}
            >
              Delicious Food,
              <br />
              <Box 
                component="span" 
                sx={{ 
                  background: 'linear-gradient(to right, #ff9800, #f44336)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                Delivered Fast
              </Box>
            </Typography>
          </motion.div>
          
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.2 }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                maxWidth: 600,
                mb: 4,
                textShadow: '0 1px 3px rgba(0,0,0,0.3)'
              }}
            >
              Order from the best local restaurants with easy, on-demand delivery.
            </Typography>
          </motion.div>
          
          <motion.div
            initial="hidden"
            animate="visible"
            variants={fadeIn}
            transition={{ delay: 0.4 }}
          >
            <Button
              variant="contained"
              size="large"
              onClick={() => navigate('/restaurants')}
              sx={{
                backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
                px: 4,
                py: 1.5,
                fontSize: '1.1rem'
              }}
            >
              Order Now
            </Button>
          </motion.div>
        </Container>
      </Box>

      {/* Categories Section */}
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Typography 
          variant="h4" 
          component="h2" 
          sx={{ 
            mb: 4, 
            textAlign: 'center',
            fontWeight: 'bold'
          }}
        >
          Explore Categories
        </Typography>
        
        <Grid container spacing={3}>
          {categories.map((category, index) => (
            <Grid item xs={12} sm={6} md={3} key={category.name}>
              <motion.div
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true }}
                variants={fadeIn}
                transition={{ delay: index * 0.1 }}
              >
                <Card 
                  sx={{ 
                    height: 240,
                    cursor: 'pointer',
                    overflow: 'hidden',
                    transition: 'transform 0.3s, box-shadow 0.3s',
                    '&:hover': {
                      transform: 'translateY(-8px)',
                      boxShadow: '0 12px 20px rgba(0,0,0,0.1)'
                    }
                  }}
                  onClick={() => navigate('/restaurants')}
                >
                  <Box sx={{ position: 'relative', height: '100%' }}>
                    <CardMedia
                      component="img"
                      image={category.image}
                      alt={category.name}
                      sx={{ height: '100%' }}
                    />
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        width: '100%',
                        bgcolor: 'rgba(0, 0, 0, 0.6)',
                        color: 'white',
                        p: 2
                      }}
                    >
                      <Typography variant="h6" component="div">
                        {category.name}
                      </Typography>
                    </Box>
                  </Box>
                </Card>
              </motion.div>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* Features Section */}
      <Box sx={{ 
        bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.03)' : 'rgba(0,0,0,0.02)',
        py: 8 
      }}>
        <Container maxWidth="lg">
          <Typography 
            variant="h4" 
            component="h2" 
            sx={{ 
              mb: 6, 
              textAlign: 'center',
              fontWeight: 'bold'
            }}
          >
            Why Choose Us
          </Typography>
          
          <Grid container spacing={4}>
            {features.map((feature, index) => (
              <Grid item xs={12} md={4} key={feature.title}>
                <motion.div
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true }}
                  variants={fadeIn}
                  transition={{ delay: index * 0.1 }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 3,
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      textAlign: 'center',
                      bgcolor: theme.palette.mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(255,255,255,0.9)',
                      borderRadius: 3,
                      transition: 'transform 0.3s',
                      '&:hover': {
                        transform: 'translateY(-5px)'
                      }
                    }}
                  >
                    <Box 
                      sx={{ 
                        fontSize: '3rem',
                        mb: 2
                      }}
                    >
                      {feature.icon}
                    </Box>
                    <Typography variant="h5" component="h3" gutterBottom>
                      {feature.title}
                    </Typography>
                    <Typography color="text.secondary">
                      {feature.description}
                    </Typography>
                  </Paper>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* Call to Action */}
      <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true }}
          variants={fadeIn}
        >
          <Typography 
            variant="h3" 
            component="h2"
            sx={{ 
              mb: 3,
              fontWeight: 'bold'
            }}
          >
            Ready to Order?
          </Typography>
          
          <Typography 
            variant="h6" 
            color="text.secondary"
            sx={{ mb: 4 }}
          >
            Discover the best food from over 1,000 restaurants
          </Typography>
          
          <Button
            variant="contained"
            size="large"
            onClick={() => navigate('/restaurants')}
            sx={{
              backgroundImage: 'linear-gradient(to right, #ff9800, #f44336)',
              px: 4,
              py: 1.5,
              fontSize: '1.1rem'
            }}
          >
            Browse Restaurants
          </Button>
        </motion.div>
      </Container>
    </Box>
  );
} 