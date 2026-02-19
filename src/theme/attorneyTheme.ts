import { extendTheme } from '@mui/joy/styles';

export const attorneyTheme = extendTheme({
  colorSchemes: {
    light: {
      palette: {
        background: {
          body: '#f5f5f7', // Apple-esque light gray
          level1: '#ffffff',
          level2: '#f5f5f7',
          surface: '#ffffff',
        },
        primary: {
          solidBg: '#0071e3', // Apple Blue
          solidHoverBg: '#0077ed',
          solidActiveBg: '#006edb',
        }
      },
    },
  },
  fontFamily: {
    body: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    display: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
    code: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  radius: {
    sm: '8px',
    md: '12px',
    lg: '18px',
  },
  shadow: {
    sm: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
    md: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  },
  components: {
    JoyButton: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          boxShadow: 'none',
          '&:hover': {
             transform: 'translateY(-1px)',
             boxShadow: '0 4px 12px rgba(0, 113, 227, 0.2)',
          },
          '&:active': {
            transform: 'translateY(0)',
          }
        },
      },
    },
    JoyCard: {
      styleOverrides: {
        root: {
          borderRadius: '16px',
          boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
          border: 'none',
          transition: 'transform 0.2s ease, box-shadow 0.2s ease',
        },
      },
    },
    JoySheet: {
      styleOverrides: {
        root: ({ ownerState }) => ({
           ...(ownerState.variant === 'soft' && {
             backgroundColor: 'rgba(255, 255, 255, 0.6)',
             backdropFilter: 'blur(20px)',
           })
        }),
      },
    },
    JoyInput: {
      styleOverrides: {
        root: {
          boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
          border: '1px solid #d1d5db',
          transition: 'box-shadow 0.2s ease-in-out, border-color 0.2s ease-in-out',
          '&:focus-within': {
            borderColor: '#0071e3',
            boxShadow: '0 0 0 3px rgba(0, 113, 227, 0.2)',
          }
        }
      }
    }
  },
});
