import { useColorMode } from '../App';
import { Fab, Tooltip, useTheme } from '@mui/material';
import { useState, useEffect } from 'react';

export default function ThemeToggle() {
  const { mode, toggleColorMode } = useColorMode();
  const theme = useTheme();
  const [showToggle, setShowToggle] = useState(false);
  const [lastScrollTop, setLastScrollTop] = useState(0);

  // Show/hide toggle based on scroll direction
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
      
      // Show toggle on initial load
      if (lastScrollTop === 0 && currentScrollTop === 0) {
        setShowToggle(true);
        return;
      }
      
      // Hide when scrolling down, show when scrolling up
      if (currentScrollTop > lastScrollTop) {
        setShowToggle(false);
      } else {
        setShowToggle(true);
      }
      
      // Remember last scroll position
      setLastScrollTop(currentScrollTop <= 0 ? 0 : currentScrollTop);
    };

    window.addEventListener('scroll', handleScroll);
    // Initial state should be visible
    setShowToggle(true);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [lastScrollTop]);

  return (
    <Tooltip title={`Switch to ${mode === 'light' ? 'dark' : 'light'} mode`}>
      <Fab
        aria-label="toggle theme"
        size="small"
        onClick={toggleColorMode}
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          backgroundColor: theme.palette.mode === 'dark' ? '#f5f5f5' : '#2d2d2d',
          color: theme.palette.mode === 'dark' ? '#2d2d2d' : '#f5f5f5',
          opacity: showToggle ? 1 : 0,
          transition: 'all 0.3s ease',
          transform: showToggle ? 'translateY(0)' : 'translateY(100px)',
          '&:hover': {
            backgroundColor: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
          },
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {mode === 'light' ? '🌙' : '☀️'}
      </Fab>
    </Tooltip>
  );
} 