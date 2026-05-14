// Shared design tokens. Keep values in sync with tailwind.config.js.
// Use these constants in RN style props where Tailwind classes aren't practical
// (animations, measurements, FlatList sizing, etc.).

import { Platform } from "react-native";

// ─── Spacing ───
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
} as const;

// ─── Radii ───
export const radius = {
  sm: 8,
  md: 12,
  lg: 16, // rounded-xl  — inputs
  xl: 20,
  xxl: 24, // rounded-2xl — cards
  full: 9999,
} as const;

// ─── Icon Sizes ───
export const iconSize = {
  sm: 16,
  md: 20,
  lg: 24,
  xl: 28,
} as const;

// ─── Typography ───
export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  base: 15,
  lg: 17,
  xl: 20,
  "2xl": 24,
  "3xl": 30,
} as const;

export const fontWeight = {
  regular: "400" as const,
  medium: "500" as const,
  semibold: "600" as const,
  bold: "700" as const,
  extrabold: "800" as const,
};

// ─── Colors ───
export const colors = {
  primary: "#7B3FF2",
  primaryMuted: "#7B3FF230",
  secondary: "#2633A0",
  accent: "#F6B73C", // star / highlight yellow

  background: "#0E0E1C",
  backgroundDeep: "#050510", // outer web shell
  surface: "#1A1A2E",
  surfaceAlt: "#242438",
  surfaceLight: "#2A2A40",
  border: "#1E1E35",
  borderLight: "#2d2d45",

  text: "#FFFFFF",
  textSecondary: "#CBD5E1", // slate-300
  textMuted: "#9A9AB0",
  textDim: "#6B7280",     // gray-500
  textFaint: "#4B5563",   // gray-600

  success: "#22C55E",
  error: "#EF4444",
  info: "#3B82F6",
  warning: "#F59E0B",

  // Media type badge colors
  movie: "#2563eb",
  tv: "#7c3aed",
  game: "#16a34a",
} as const;

// ─── Card Dimensions ───
// Centralized so MovieCard, TvShowCard, RecommendationCard, game cards
// and RecommendationRow all use the same source of truth.
export const card = {
  width: Platform.OS === "web" ? 140 : 130,
  posterHeight: Platform.OS === "web" ? 210 : 208,
  logBtnSize: 32,
} as const;

// ─── Shadows ───
// Card-level elevation for depth on dark backgrounds.
export const shadow = {
  card: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardLight: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  button: {
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
} as const;

// ─── Gradient Presets ───
export const gradients = {
  heroBanner: [
    "rgba(0,0,0,0.05)",
    "rgba(20,10,40,0.6)",
    "rgba(10,10,20,0.95)",
  ] as [string, string, string],
  cardOverlay: ["transparent", "rgba(0,0,0,0.75)"] as [string, string],
} as const;

// ─── Animation ───
export const animation = {
  fast: 150,
  normal: 250,
  slow: 400,
  /** Scale factor applied on press-in for tactile feedback */
  pressScale: 0.97,
} as const;

// ─── Misc ───

// Standard debounce for search inputs across the app.
export const DEBOUNCE_MS = 300;

// Minimum tap target per iOS HIG / Material. Use as hitSlop where the visual
// element is smaller than 44x44.
export const HIT_SLOP_44 = { top: 10, bottom: 10, left: 10, right: 10 } as const;

// Default Android ripple config for AppPressable.
export const ANDROID_RIPPLE = { color: "rgba(255,255,255,0.12)", borderless: false } as const;
