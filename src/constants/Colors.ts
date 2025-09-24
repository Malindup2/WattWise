// WattWise Color Theme
export const Colors = {
  // Primary green color
  primary: '#49B02D',
  primaryLight: '#5FB833',
  primaryDark: '#3A8C23',

  // Neutral colors
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  darkGray: '#374151',

  // Background variants
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',

  // Status colors (derived from primary)
  success: '#49B02D',
  successLight: '#F0F9F0',

  // Text colors
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textLight: '#9CA3AF',
  textOnPrimary: '#FFFFFF',

  // Border colors
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Shadow colors
  shadow: 'rgba(0, 0, 0, 0.1)',
  shadowDark: 'rgba(0, 0, 0, 0.2)',
} as const;

export const Gradients = {
  primary: ['#49B02D', '#5FB833'],
  primaryVertical: ['#49B02D', '#5FB833', '#49B02D'],
} as const;

export type ColorKey = keyof typeof Colors;
