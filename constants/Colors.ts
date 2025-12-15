// constants/Colors.ts
export const Colors = {
  primary: {
    navy: '#0F2738', // Deeper, richer navy
    navyLight: '#1B3A57',
    coral: '#FF6B6B', // More vibrant coral
    coralLight: '#FF8787',
  },
  secondary: {
    teal: '#4ECDC4',
    purple: '#9B59B6',
    orange: '#F39C12',
  },
  neutral: {
    trailDust: '#F8F9FA', // Lighter, cleaner background
    white: '#FFFFFF',
    grey: '#6C757D',
    greyLight: '#ADB5BD',
    greyDark: '#495057',
    border: '#E9ECEF',
  },
  highlight: {
    gold: '#FFD93D', // Brighter gold
    success: '#6BCF7F',
    error: '#FF4757',
    warning: '#FFA502',
  },
  gradient: {
    sunset: ['#FF6B6B', '#FFD93D'] as const,
    ocean: ['#4ECDC4', '#556EE6'] as const,
    dusk: ['#9B59B6', '#FF6B6B'] as const,
    adventure: ['#0F2738', '#1B3A57'] as const,
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.08)',
    medium: 'rgba(0, 0, 0, 0.12)',
    heavy: 'rgba(0, 0, 0, 0.16)',
  }
};