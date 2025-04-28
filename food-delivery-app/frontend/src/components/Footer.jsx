import { Box, Container, Grid, Typography, Link, IconButton, useTheme, Divider } from '@mui/material';
import { useColorMode } from '../App';

// Footer icons
const FacebookIcon = () => <span style={{ fontSize: '1.5rem' }}>📘</span>;
const InstagramIcon = () => <span style={{ fontSize: '1.5rem' }}>📸</span>;
const TwitterIcon = () => <span style={{ fontSize: '1.5rem' }}>🐦</span>;
const YoutubeIcon = () => <span style={{ fontSize: '1.5rem' }}>🎬</span>;

export default function Footer() {
  const theme = useTheme();
  const { mode } = useColorMode();
  const isDark = mode === 'dark';

  const footerLinks = [
    {
      title: 'Company',
      links: [
        { name: 'About Us', url: '#' },
        { name: 'Careers', url: '#' },
        { name: 'Blog', url: '#' },
        { name: 'Press', url: '#' }
      ]
    },
    {
      title: 'For Customers',
      links: [
        { name: 'Restaurants', url: '/restaurants' },
        { name: 'Pricing', url: '#' },
        { name: 'Help', url: '#' },
        { name: 'FAQs', url: '#' }
      ]
    },
    {
      title: 'For Restaurants',
      links: [
        { name: 'Join Us', url: '#' },
        { name: 'Partner Benefits', url: '#' },
        { name: 'Resources', url: '#' },
        { name: 'Merchant App', url: '#' }
      ]
    }
  ];

  return (
    <Box
      component="footer"
      sx={{
        bgcolor: isDark ? 'rgba(25, 25, 25, 0.98)' : 'rgba(245, 245, 245, 0.98)',
        py: 6,
        borderTop: `1px solid ${isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)'}`,
      }}
    >
      <Container maxWidth="lg">
        <Grid container spacing={4}>
          {/* Logo and description */}
          <Grid item xs={12} md={4}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <span style={{ fontSize: '1.8rem', marginRight: '8px' }}>🍔</span>
              <Typography
                variant="h6"
                sx={{
                  fontWeight: 'bold',
                  background: '-webkit-linear-gradient(45deg, #ff9800, #f44336)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                FoodExpress
              </Typography>
            </Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2, maxWidth: 300 }}>
              The best local restaurants at your fingertips. Order food with fast and reliable delivery.
            </Typography>
            <Box>
              <IconButton aria-label="Facebook" size="small">
                <FacebookIcon />
              </IconButton>
              <IconButton aria-label="Instagram" size="small">
                <InstagramIcon />
              </IconButton>
              <IconButton aria-label="Twitter" size="small">
                <TwitterIcon />
              </IconButton>
              <IconButton aria-label="Youtube" size="small">
                <YoutubeIcon />
              </IconButton>
            </Box>
          </Grid>

          {/* Footer links */}
          {footerLinks.map((section) => (
            <Grid item xs={12} sm={6} md={2.5} key={section.title}>
              <Typography variant="subtitle1" fontWeight="bold" gutterBottom>
                {section.title}
              </Typography>
              <Box>
                {section.links.map((link) => (
                  <Link
                    key={link.name}
                    href={link.url}
                    underline="hover"
                    color="text.secondary"
                    sx={{
                      display: 'block',
                      mb: 1,
                      transition: 'color 0.2s',
                      '&:hover': {
                        color: theme.palette.primary.main,
                      },
                    }}
                  >
                    {link.name}
                  </Link>
                ))}
              </Box>
            </Grid>
          ))}
        </Grid>

        <Divider sx={{ my: 4, borderColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }} />

        <Box sx={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Typography variant="body2" color="text.secondary">
            © {new Date().getFullYear()} FoodExpress. All rights reserved.
          </Typography>
          <Box>
            <Link
              href="#"
              underline="hover"
              color="text.secondary"
              sx={{ ml: { xs: 0, sm: 2 }, mr: 2 }}
            >
              Privacy Policy
            </Link>
            <Link href="#" underline="hover" color="text.secondary">
              Terms of Service
            </Link>
          </Box>
        </Box>
      </Container>
    </Box>
  );
} 