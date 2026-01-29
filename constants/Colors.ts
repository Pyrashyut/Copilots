// constants/Colors.ts

export const Colors = {
  primary: {
    navy: '#1B3A57',      // Deep Expedition: Primary / Text
    navyLight: '#264653', // Ocean & Coral: Secondary (Midnight Blue)
    coral: '#E8755A',     // Frolicr Logo / Accent
    coralLight: '#FF9B85', // Lighter tint for interactions
  },
  secondary: {
    teal: '#2A9D8F',      // Ocean & Coral: Accent
    plum: '#5B3256',      // Night Sky: Accent
    aubergine: '#3B2F44', // Golden Hour: Primary
    midnight: '#264653',  // Ocean & Coral: Secondary
  },
  neutral: {
    trailDust: '#F4F1EA', // Deep Expedition: Background (Sand/Stone) - Replaces old "trailDust"
    sand: '#F4F1EA',      // Alias for Sand
    ivory: '#FAF9F7',     // Night Sky: Background (Soft Ivory)
    white: '#FFFFFF',     // Crisp White
    charcoal: '#2D2A32',  // Night Sky: Text
    slate: '#4A4A4A',     // Golden Hour: Secondary Text
    grey: '#6C757D',      // Standard Grey
    greyLight: '#ADB5BD', 
    greyDark: '#495057',
    border: '#E9ECEF',
  },
  highlight: {
    gold: '#D4AF37',      // Deep Expedition: Highlight (Horizon Gold)
    peach: '#FFCB9A',     // Golden Hour: Highlight (Warm Peach)
    success: '#2A9D8F',   // Using Teal for Success
    error: '#E8755A',     // Using Frolicr Coral for Error/Attention
    warning: '#D4A853',   // Night Sky: Gold
  },
  gradient: {
    // Mapping new palette combinations to existing keys used in the app
    
    // Used for Login Background: Deep Navy -> Midnight Blue
    adventure: ['#1B3A57', '#264653'] as const, 
    
    // Used for Buttons/Highlights: Frolicr Coral -> Horizon Gold
    sunset: ['#E8755A', '#D4AF37'] as const,    
    
    // Used for Sign Up: Teal -> Deep Navy
    ocean: ['#2A9D8F', '#1B3A57'] as const,     
    
    // New Palettes available for future use
    goldenHour: ['#3B2F44', '#E8755A'] as const, // Aubergine -> Coral
    nightSky: ['#5B3256', '#FAF9F7'] as const,   // Plum -> Ivory
    frolicrSignature: ['#E8755A', '#F4F1EA'] as const, // Coral -> Sand
  },
  shadow: {
    light: 'rgba(27, 58, 87, 0.08)',  // Tinted with Deep Navy
    medium: 'rgba(27, 58, 87, 0.15)',
    heavy: 'rgba(27, 58, 87, 0.25)',
  }
};