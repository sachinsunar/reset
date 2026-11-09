export interface ThemeColors {
  background: string;
  surface: string;
  surfaceMuted: string;
  surfaceStrong: string;
  primary: string;
  primaryText: string;
  primarySoft: string;
  sage: string;
  sageSoft: string;
  text: string;
  textMuted: string;
  textFaint: string;
  border: string;
  borderStrong: string;
  amber: string;
  amberSoft: string;
  gold: string;
  goldSoft: string;
  goldDeep: string;
  emerald: string;
  emeraldSoft: string;
  earth: string;
  earthSoft: string;
  cardRaised: string;
  error: string;
  errorSoft: string;
  success: string;
  successSoft: string;
  overlay: string;
  tabBar: string;
  hero: string;
  heroMuted: string;
  heroText: string;
  heat0: string;
  heat1: string;
  heat2: string;
  heat3: string;
  heat4: string;
  yellow: string;
  yellowSoft: string;
  yellowDeep: string;
  purple: string;
  purpleDeep: string;
  purpleSoft: string;
  turquoise: string;
  turquoiseSoft: string;
  lavender: string;
  cream: string;
}

export const lightColors: ThemeColors = {
  background: '#FFFBE8',
  surface: '#FFFFFF',
  surfaceMuted: '#FFF6C9',
  surfaceStrong: '#F0DDFB',
  primary: '#7A28A8',
  primaryText: '#FFFFFF',
  primarySoft: '#F0DDFB',
  sage: '#008F8D',
  sageSoft: '#D9F7F5',
  text: '#171717',
  textMuted: '#5E5A4C',
  textFaint: '#8E8879',
  border: '#EDE5C4',
  borderStrong: '#D8CFA9',
  amber: '#8A6A00',
  amberSoft: '#FFF3A8',
  gold: '#806F00',
  goldSoft: '#FFF8B8',
  goldDeep: '#655700',
  emerald: '#007F70',
  emeraldSoft: '#D5F6F0',
  earth: '#71602F',
  earthSoft: '#F5E9BE',
  cardRaised: '#FFFFFF',
  error: '#B3293E',
  errorSoft: '#FFE0E5',
  success: '#007F70',
  successSoft: '#D5F6F0',
  overlay: 'rgba(23, 18, 31, 0.55)',
  tabBar: '#FFFFFF',
  hero: '#FFF12E',
  heroMuted: '#5D5200',
  heroText: '#171717',
  heat0: '#FFF6C9',
  heat1: '#FFF09A',
  heat2: '#E8A7FF',
  heat3: '#B94DF2',
  heat4: '#00A9A7',
  yellow: '#FFF12E',
  yellowSoft: '#FFF8B8',
  yellowDeep: '#655700',
  purple: '#B94DF2',
  purpleDeep: '#7A28A8',
  purpleSoft: '#F0DDFB',
  turquoise: '#00C9C7',
  turquoiseSoft: '#D9F7F5',
  lavender: '#F0DDFB',
  cream: '#FFFBE8',
};

export const darkColors: ThemeColors = {
  background: '#17121F',
  surface: '#221A2C',
  surfaceMuted: '#2C2138',
  surfaceStrong: '#3A2A4A',
  primary: '#D58CFF',
  primaryText: '#1C1024',
  primarySoft: '#3A2450',
  sage: '#5DE3DF',
  sageSoft: '#153B3B',
  text: '#FFF9E7',
  textMuted: '#C9BED4',
  textFaint: '#95899F',
  border: '#3A3042',
  borderStrong: '#52425F',
  amber: '#FFE55A',
  amberSoft: '#3A341C',
  gold: '#FFE442',
  goldSoft: '#3B3519',
  goldDeep: '#FFE97A',
  emerald: '#5DE3DF',
  emeraldSoft: '#163A35',
  earth: '#E1CA8F',
  earthSoft: '#352D22',
  cardRaised: '#281F34',
  error: '#FF9AAB',
  errorSoft: '#3D2029',
  success: '#68E5C5',
  successSoft: '#183B31',
  overlay: 'rgba(8, 4, 12, 0.72)',
  tabBar: '#1E1727',
  hero: '#FFF12E',
  heroMuted: '#5D5200',
  heroText: '#171717',
  heat0: '#2C2138',
  heat1: '#4A3560',
  heat2: '#7D45A0',
  heat3: '#B66BE0',
  heat4: '#5DE3DF',
  yellow: '#FFF12E',
  yellowSoft: '#3B3519',
  yellowDeep: '#FFE97A',
  purple: '#B94DF2',
  purpleDeep: '#D58CFF',
  purpleSoft: '#3A2450',
  turquoise: '#00C9C7',
  turquoiseSoft: '#153B3B',
  lavender: '#3A2450',
  cream: '#FFFBE8',
};

export const categoryColors: Record<
  string,
  { light: string; dark: string; bgLight: string; bgDark: string }
> = {
  study: { light: '#7A28A8', dark: '#E3B0FF', bgLight: '#F0DDFB', bgDark: '#382445' },
  fitness: { light: '#007F7D', dark: '#5DE3DF', bgLight: '#D9F7F5', bgDark: '#173B3A' },
  career: { light: '#6F3A9E', dark: '#D9A6FF', bgLight: '#F1E1FC', bgDark: '#342346' },
  sleep: { light: '#5F4595', dark: '#CBB8FF', bgLight: '#EDE7FD', bgDark: '#2B2440' },
  personal: { light: '#776000', dark: '#FFE55A', bgLight: '#FFF6C9', bgDark: '#3B3419' },
};
