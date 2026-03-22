export const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  goldDark: "#B8960C",
  cream: "#FAF7F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  brown: "#8B7355",
  brownLight: "#E8E0D5",
  emerald: "#10B981",
  sapphire: "#2563EB",
  ruby: "#E11D48",
} as const;

export const STATUS_COLORS = {
  pending: { color: "#E67E22", bg: "#FFF8E1", icon: "schedule" as const },
  approved: { color: "#27AE60", bg: "#E8F5E9", icon: "check-circle" as const },
  rejected: { color: "#E74C3C", bg: "#FFEBEE", icon: "cancel" as const },
} as const;
