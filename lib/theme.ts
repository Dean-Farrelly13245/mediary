// Shared design tokens. Keep values in sync with tailwind.config.js.
// Use these constants in RN style props where Tailwind classes aren't practical
// (animations, measurements, FlatList sizing, etc.).

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

export const radius = {
  sm: 8,
  md: 12,
  lg: 16, // rounded-xl  — inputs
  xl: 20,
  xxl: 24, // rounded-2xl — cards
  full: 9999,
} as const;

export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
} as const;

export const colors = {
  primary: "#7B3FF2",
  secondary: "#2633A0",
  background: "#0E0E1C",
  surface: "#1A1A2E",
  surfaceAlt: "#242438",
  border: "#2A2A40",
  text: "#FFFFFF",
  textMuted: "#9A9AB0",
  success: "#22C55E",
  error: "#EF4444",
  info: "#3B82F6",
} as const;

// Standard debounce for search inputs across the app.
export const DEBOUNCE_MS = 300;

// Minimum tap target per iOS HIG / Material. Use as hitSlop where the visual
// element is smaller than 44x44.
export const HIT_SLOP_44 = { top: 10, bottom: 10, left: 10, right: 10 } as const;

// Default Android ripple config for AppPressable.
export const ANDROID_RIPPLE = { color: "rgba(255,255,255,0.12)", borderless: false } as const;
