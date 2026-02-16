/**
 * Below are the colors that are used in the app. The colors are defined in the light and dark mode.
 * There are many other ways to style your app. For example, [Nativewind](https://www.nativewind.dev/), [Tamagui](https://tamagui.dev/), [unistyles](https://reactnativeunistyles.vercel.app), etc.
 */

import { Platform } from 'react-native';

const tintColorLight = '#2563EB'; // Royal Blue
const tintColorDark = '#3B82F6'; // Blue 500

export const Colors = {
  light: {
    text: '#0F172A', // Slate 900
    background: '#F8FAFC', // Slate 50
    tint: tintColorLight,
    icon: '#64748B', // Slate 500
    tabIconDefault: '#94A3B8',
    tabIconSelected: '#0284C7',
    // Glassmorphism specific
    card: 'rgba(255, 255, 255, 0.4)', // Frosted White
    cardHighlight: 'rgba(255, 255, 255, 0.6)',
    income: '#059669', // Emerald 600
    expense: '#E11D48', // Rose 600
    warning: '#D97706', // Amber 600
    neutral: '#64748B',
    border: 'rgba(255, 255, 255, 0.6)', // White border
    header: '#F0F9FF',
    shadow: '#000000',
    charts: {
      yellow: '#FCD34D',
      blue: '#38BDF8',
      pink: '#F472B6',
      green: '#34D399',
      purple: '#A78BFA',
    }
  },
  dark: {
    text: '#FFFFFF',
    background: '#020617', // Deep Midnight
    tint: '#38BDF8', // Sky Blue (more vibrant)
    icon: '#94A3B8',
    tabIconDefault: '#64748B',
    tabIconSelected: '#38BDF8',
    // Glassmorphism specific
    card: 'rgba(255, 255, 255, 0.03)', // More subtle glass
    cardHighlight: 'rgba(255, 255, 255, 0.08)',
    income: '#34D399', // Soft Emerald
    expense: '#FB7185', // Soft Rose
    warning: '#FBBF24', // Amber
    neutral: '#94A3B8',
    border: 'rgba(255, 255, 255, 0.08)', // Very subtle border
    header: '#020617',
    shadow: '#000000',
    charts: {
      yellow: '#FCD34D',
      blue: '#38BDF8',
      pink: '#F472B6',
      green: '#34D399',
      purple: '#A78BFA',
    }
  },
};

export const Fonts = Platform.select({
  ios: {
    sans: 'Outfit_400Regular',
    serif: 'ui-serif',
    rounded: 'ui-rounded',
    mono: 'SpaceMono',
  },
  default: {
    sans: 'Outfit_400Regular',
    serif: 'serif',
    rounded: 'sans-serif',
    mono: 'SpaceMono',
  },
  web: {
    sans: "Outfit, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    serif: "Georgia, 'Times New Roman', serif",
    rounded: "'SF Pro Rounded', 'Hiragino Maru Gothic ProN', Meiryo, 'MS PGothic', sans-serif",
    mono: "SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
  },
});
