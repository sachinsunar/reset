import { Platform } from 'react-native';
import { darkColors, lightColors, ThemeColors } from './colors';

export const spacing = {
  xxs: 4,
  xs: 6,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radii = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const typography = {
  display: { fontSize: 34, lineHeight: 40, fontWeight: '700' as const, letterSpacing: -0.8 },
  title: { fontSize: 26, lineHeight: 32, fontWeight: '700' as const, letterSpacing: -0.4 },
  heading: { fontSize: 19, lineHeight: 25, fontWeight: '600' as const, letterSpacing: -0.2 },
  body: { fontSize: 15, lineHeight: 22, fontWeight: '400' as const },
  bodyStrong: { fontSize: 15, lineHeight: 22, fontWeight: '600' as const },
  small: { fontSize: 13, lineHeight: 19, fontWeight: '400' as const },
  smallStrong: { fontSize: 13, lineHeight: 19, fontWeight: '600' as const },
  caption: { fontSize: 11.5, lineHeight: 16, fontWeight: '500' as const, letterSpacing: 0.2 },
  caps: { fontSize: 10.5, lineHeight: 14, fontWeight: '700' as const, letterSpacing: 1.1 },
} as const;

export const fontFamily = Platform.select({
  ios: 'System',
  android: 'sans-serif',
  default: 'System',
});

export const shadows = {
  card: Platform.select({
    ios: {
      shadowColor: '#171717',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.06,
      shadowRadius: 16,
    },
    android: { elevation: 2 },
    default: {},
  }),
  floating: Platform.select({
    ios: {
      shadowColor: '#171717',
      shadowOffset: { width: 0, height: 10 },
      shadowOpacity: 0.13,
      shadowRadius: 24,
    },
    android: { elevation: 8 },
    default: {},
  }),
};

export type Theme = {
  dark: boolean;
  colors: ThemeColors;
  spacing: typeof spacing;
  radii: typeof radii;
  typography: typeof typography;
  fontFamily: string | undefined;
  shadows: typeof shadows;
};

export const lightTheme: Theme = {
  dark: false,
  colors: lightColors,
  spacing,
  radii,
  typography,
  fontFamily,
  shadows,
};

export const darkTheme: Theme = {
  dark: true,
  colors: darkColors,
  spacing,
  radii,
  typography,
  fontFamily,
  shadows,
};

export const catColor = (category: string, dark: boolean) => {
  const entry = {
    study: { fg: dark ? '#E3B0FF' : '#7A28A8', bg: dark ? '#382445' : '#F0DDFB' },
    fitness: { fg: dark ? '#5DE3DF' : '#007F7D', bg: dark ? '#173B3A' : '#D9F7F5' },
    career: { fg: dark ? '#D9A6FF' : '#6F3A9E', bg: dark ? '#342346' : '#F1E1FC' },
    sleep: { fg: dark ? '#CBB8FF' : '#5F4595', bg: dark ? '#2B2440' : '#EDE7FD' },
    personal: { fg: dark ? '#FFE55A' : '#776000', bg: dark ? '#3B3419' : '#FFF6C9' },
  }[category];
  return entry ?? { fg: dark ? '#9AA69D' : '#7C857E', bg: dark ? '#263029' : '#EFF1EB' };
};
