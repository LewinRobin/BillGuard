export const COLORS = {
  primary: '#1A6B4A',
  primaryLight: '#E8F5EF',
  danger: '#D03C2A',
  dangerLight: '#FDECEA',
  warning: '#C07800',
  warningLight: '#FFF8E1',
  success: '#1A6B4A',
  successLight: '#E8F5EF',
  textPrimary: '#1A1A1A',
  textSecondary: '#5C5C5C',
  textMuted: '#9E9E9E',
  border: '#E0E0E0',
  background: '#F7F8FA',
  surface: '#FFFFFF',
} as const;

export const RISK_COLORS = {
  none: COLORS.success,
  low: COLORS.success,
  medium: COLORS.warning,
  high: COLORS.danger,
} as const;

export const RISK_BG_COLORS = {
  none: COLORS.successLight,
  low: COLORS.successLight,
  medium: COLORS.warningLight,
  high: COLORS.dangerLight,
} as const;
