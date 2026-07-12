/**
 * Design tokens for the app. Dark-only fintech palette:
 * 3 neutrals + 1 primary accent + 1 danger.
 */
export const colors = {
  background: "#0A0B0E",
  surface: "#14161C",
  border: "#23262F",
  foreground: "#F2F4F8",
  muted: "#8A8F9D",
  primary: "#4ADE80",
  primaryForeground: "#04150B",
  danger: "#F87171",
} as const

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 999,
} as const

export const type = {
  /** Large screen titles. */
  title: { fontSize: 28, fontWeight: "700" as const, color: colors.foreground, letterSpacing: -0.5 },
  /** Section headings. */
  heading: { fontSize: 18, fontWeight: "600" as const, color: colors.foreground },
  /** Default body text. */
  body: { fontSize: 15, fontWeight: "400" as const, color: colors.foreground, lineHeight: 22 },
  /** Secondary/help text. */
  caption: { fontSize: 13, fontWeight: "400" as const, color: colors.muted, lineHeight: 19 },
  /** Monospaced values (addresses, amounts). */
  mono: { fontSize: 14, fontFamily: "monospace" as const, color: colors.foreground },
} as const
