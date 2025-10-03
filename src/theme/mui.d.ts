import '@mui/material/styles';

declare module '@mui/material/styles' {
  interface Palette {
    tp: {
      accent: string;
      accent2: string;
      accentRgb: string;
      accent2Rgb: string;
      cardBg: string;
    };
  }
  interface PaletteOptions {
    tp?: {
      accent?: string;
      accent2?: string;
      accentRgb?: string;
      accent2Rgb?: string;
      cardBg?: string;
    };
  }
}
