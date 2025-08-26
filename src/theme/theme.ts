import { createTheme } from '@mui/material/styles';

// Pizza Ranch Color Palette
const pizzaRanchColors = {
  primary: {
    main: '#D9232D', // Red
  },
  secondary: {
    main: '#FFC72C', // Gold
  },
  background: {
    default: '#F5F5F5', // Cream
    paper: '#FFFFFF',
  },
  text: {
    primary: '#212121', // Dark Accent
    secondary: '#757575',
  },
};

// Create a theme instance.
const theme = createTheme({
  palette: {
    primary: pizzaRanchColors.primary,
    secondary: pizzaRanchColors.secondary,
    background: pizzaRanchColors.background,
    text: pizzaRanchColors.text,
  },
  typography: {
    fontFamily: [
      '-apple-system',
      'BlinkMacSystemFont',
      '"Segoe UI"',
      'Roboto',
      '"Helvetica Neue"',
      'Arial',
      'sans-serif',
      '"Apple Color Emoji"',
      '"Segoe UI Emoji"',
      '"Segoe UI Symbol"',
    ].join(','),
  },
});

export default theme;
