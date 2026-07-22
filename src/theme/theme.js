import { createTheme } from '@mui/material/styles';

const theme = createTheme({
  direction: 'rtl',
  palette: {
    mode: 'light',
    primary: {
      main: '#4285F4',
      light: '#6EA8FE',
      dark: '#2B6FD4',
      contrastText: '#FFFFFF',
    },
    secondary: {
      main: '#FF8C42',
      light: '#FFB380',
      dark: '#E06B1F',
      contrastText: '#FFFFFF',
    },
    error: {
      main: '#EF4444',
      light: '#FCA5A5',
    },
    warning: {
      main: '#FDE047',
    },
    info: {
      main: '#93C5FD',
    },
    success: {
      main: '#34D399',
      light: '#A7F3D0',
    },
    background: {
      default: '#FDF6EC',
      paper: '#FFFFFF',
    },
    text: {
      primary: '#1A1A2E',
      secondary: '#6B7280',
    },
    divider: '#E5E7EB',
    // Custom colors for tables
    available: '#93C5FD',
    occupied: '#FCA5A5',
    reserved: '#FDE047',
  },
  typography: {
    fontFamily: '"Cairo", "Inter", "Helvetica", "Arial", sans-serif',
    h1: {
      fontWeight: 700,
      fontSize: '2rem',
      color: '#1A1A2E',
    },
    h2: {
      fontWeight: 700,
      fontSize: '1.75rem',
      color: '#1A1A2E',
    },
    h3: {
      fontWeight: 700,
      fontSize: '1.5rem',
      color: '#1A1A2E',
    },
    h4: {
      fontWeight: 600,
      fontSize: '1.25rem',
      color: '#1A1A2E',
    },
    h5: {
      fontWeight: 600,
      fontSize: '1.125rem',
      color: '#1A1A2E',
    },
    h6: {
      fontWeight: 600,
      fontSize: '1rem',
      color: '#1A1A2E',
    },
    body1: {
      fontSize: '0.938rem',
      lineHeight: 1.6,
      color: '#1A1A2E',
    },
    body2: {
      fontSize: '0.813rem',
      lineHeight: 1.5,
      color: '#6B7280',
    },
    caption: {
      fontSize: '0.75rem',
      color: '#6B7280',
    },
    button: {
      fontWeight: 600,
      textTransform: 'none',
      fontSize: '0.938rem',
    },
  },
  shape: {
    borderRadius: 12,
  },
  shadows: [
    'none',
    '0 1px 3px rgba(0,0,0,0.04)',
    '0 2px 8px rgba(0,0,0,0.06)',
    '0 4px 12px rgba(0,0,0,0.08)',
    '0 6px 16px rgba(0,0,0,0.1)',
    '0 8px 24px rgba(0,0,0,0.12)',
    ...Array(19).fill('0 8px 24px rgba(0,0,0,0.12)'),
  ],
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          backgroundColor: '#FDF6EC',
        },
      },
    },
    MuiButton: {
      defaultProps: {
        disableElevation: true,
        disableRipple: false,
      },
      styleOverrides: {
        root: {
          borderRadius: '12px',
          padding: '10px 24px',
          fontSize: '0.938rem',
          fontWeight: 600,
          transition: 'all 0.2s ease',
        },
        containedPrimary: {
          backgroundColor: '#4285F4',
          color: '#FFFFFF',
          '&:hover': {
            backgroundColor: '#2B6FD4',
            transform: 'translateY(-1px)',
            boxShadow: '0 4px 12px rgba(66, 133, 244, 0.3)',
          },
        },
        containedError: {
          backgroundColor: '#EF4444',
          '&:hover': {
            backgroundColor: '#DC2626',
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
          color: '#1A1A2E',
          '&:hover': {
            borderColor: '#4285F4',
            backgroundColor: 'rgba(66, 133, 244, 0.04)',
          },
        },
        text: {
          color: '#6B7280',
          '&:hover': {
            backgroundColor: 'rgba(66, 133, 244, 0.04)',
          },
        },
      },
    },
    MuiPaper: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          borderRadius: '16px',
        },
      },
    },
    MuiCard: {
      defaultProps: {
        elevation: 0,
      },
      styleOverrides: {
        root: {
          borderRadius: '16px',
          border: '1px solid #E5E7EB',
          backgroundColor: '#FFFFFF',
          backgroundImage: 'none',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: '24px',
          fontWeight: 500,
          fontSize: '0.875rem',
          height: '36px',
          transition: 'all 0.2s ease',
        },
        filled: {
          '&.MuiChip-colorPrimary': {
            backgroundColor: '#4285F4',
            color: '#FFFFFF',
          },
        },
        outlined: {
          borderColor: '#E5E7EB',
          color: '#6B7280',
          '&:hover': {
            borderColor: '#4285F4',
            backgroundColor: 'rgba(66, 133, 244, 0.04)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            borderRadius: '12px',
            backgroundColor: '#FFFFFF',
            '& fieldset': {
              borderColor: '#E5E7EB',
            },
            '&:hover fieldset': {
              borderColor: '#4285F4',
            },
            '&.Mui-focused fieldset': {
              borderColor: '#4285F4',
              borderWidth: '1.5px',
            },
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid #F3F4F6',
          padding: '14px 16px',
          fontSize: '0.875rem',
        },
        head: {
          fontWeight: 600,
          color: '#6B7280',
          backgroundColor: '#FAFBFC',
          fontSize: '0.813rem',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        },
      },
    },
    MuiTableRow: {
      styleOverrides: {
        root: {
          '&:hover': {
            backgroundColor: '#F9FAFB',
          },
          transition: 'background-color 0.15s ease',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'all 0.2s ease',
          '&:hover': {
            transform: 'scale(1.1)',
          },
        },
      },
    },
    MuiDialog: {
      styleOverrides: {
        paper: {
          borderRadius: '20px',
          padding: '8px',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#1A1A2E',
          fontSize: '0.75rem',
          padding: '8px 14px',
          borderRadius: '8px',
        },
      },
    },
    MuiBadge: {
      styleOverrides: {
        badge: {
          fontWeight: 600,
          fontSize: '0.75rem',
        },
      },
    },
  },
});

export default theme;
