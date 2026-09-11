import { Platform, type ViewStyle } from "react-native";

export const colors = {
  background: "#0A0A0F",
  backgroundRaised: "#0E0E15",
  surface: "#13131A",
  surfaceElevated: "#191922",
  surfaceSoft: "#1A1A24",
  border: "#292938",
  borderSoft: "#20202D",
  violet: "#A78BFA",
  violetBright: "#C4B5FD",
  pink: "#F472B6",
  pinkSoft: "#FDA4D0",
  mint: "#34D399",
  mintSoft: "#A7F3D0",
  orange: "#FDBA74",
  white: "#F8F8FF",
  textSecondary: "#8B8B9B",
  textTertiary: "#5F6070",
  danger: "#F87171",
} as const;

export const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
    ...Platform.select({ android: { elevation: 5 } as ViewStyle, default: {} }),
  },
  violet: {
    shadowColor: colors.violet,
    shadowOpacity: 0.42,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    ...Platform.select({ android: { elevation: 9 } as ViewStyle, default: {} }),
  },
} as const;

export const radii = {
  small: 12,
  medium: 18,
  large: 26,
  pill: 999,
} as const;
