// constants/Colors.ts
export const Colors = {
  primary: {
    navy: '#1B3A57',
    navyLight: '#264653',
    coral: '#E8755A',
    coralLight: '#F09070',
  },
  secondary: {
    teal: '#2A9D8F',
    purple: '#9B59B6',
    orange: '#F39C12',
  },
  neutral: {
    background: '#FFFFFF',
    trailDust: '#F8F9FA',
    white: '#FFFFFF',
    grey: '#6C757D',
    greyLight: '#ADB5BD',
    greyDark: '#495057',
    border: '#E9ECEF',
  },
  highlight: {
    gold: '#D4AF37',
    success: '#6BCF7F',
    error: '#FF4757',
    warning: '#FFA502',
  },
  gradient: {
    sunset: ['#E8755A', '#D4AF37'] as const,
    ocean: ['#2A9D8F', '#264653'] as const,
    dusk: ['#9B59B6', '#E8755A'] as const,
    adventure: ['#1B3A57', '#264653'] as const,
  },
  shadow: {
    light: 'rgba(0, 0, 0, 0.06)',
    medium: 'rgba(0, 0, 0, 0.10)',
    heavy: 'rgba(0, 0, 0, 0.15)',
  },
};
