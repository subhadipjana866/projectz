// Dark theme colors
export const darkTheme = {
  bg: 'rgb(16, 22, 34)',
  bgRadiant1: 'rgba(17,82,212,0.15)',
  bgRadiant2: 'rgba(17,82,212,0.1)',
  card: 'rgba(16,22,34,0.4)',
  cardBorder: 'rgba(255,255,255,0.1)',
  primary: '#1152d4',
  primaryDark: '#0d41a0',
  text: '#ffffff',
  textSecondary: '#cbd5e1',
  textTertiary: '#94a3b8',
  inputBg: '#ffffff',
  headerBg: 'rgba(16,22,34,0.4)',
  buttonHover: 'rgba(255,255,255,0.1)',
  successBg: 'green-500/10',
  successBorder: 'green-500/30',
  successText: 'green-400',
  errorBg: 'red-500/10',
  errorBorder: 'red-500/30',
  errorText: 'red-400',
  infoBg: 'blue-500/10',
  infoBorder: 'blue-500/30',
  infoText: 'blue-400',
};

// Light theme colors
export const lightTheme = {
  bg: 'rgb(248, 250, 252)',
  bgRadiant1: 'rgba(19,91,236,0.08)',
  bgRadiant2: 'rgba(19,91,236,0.05)',
  card: 'rgba(255,255,255,0.7)',
  cardBorder: 'rgba(0,0,0,0.05)',
  primary: '#135bec',
  primaryDark: '#0d41a0',
  textPrimary: '#0f172a',
  textSecondary: '#334155',
  textTertiary: '#64748b',
  inputBg: '#ffffff',
  headerBg: 'rgba(255,255,255,0.7)',
  buttonHover: 'rgba(0,0,0,0.05)',
  successBg: 'green-50',
  successBorder: 'green-200',
  successText: 'green-600',
  errorBg: 'red-50',
  errorBorder: 'red-200',
  errorText: 'red-600',
  infoBg: 'blue-50',
  infoBorder: 'blue-200',
  infoText: 'blue-700',
};

export function getThemeColors(isDark) {
  return isDark ? darkTheme : lightTheme;
}
