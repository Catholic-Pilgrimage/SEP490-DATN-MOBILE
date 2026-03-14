/**
 * Dashboard Constants
 * Shared color palette, responsive helpers, and utility functions
 */

import { Dimensions } from "react-native";
import { GUIDE_SPACING } from "../../../constants/guide.constants";
import { getSpacing, responsive } from "../../../utils/responsive";

// Premium color palette for the dashboard UI
export const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  warmWhite: "#FFFEF9",
  charcoal: "#1A1A1A",
  slate: "#64748B",
  emerald: "#10B981",
  ruby: "#E11D48",
  sapphire: "#2563EB",
  amber: "#F59E0B",
  gradientGold: ["#D4AF37", "#F4E4BA", "#D4AF37"],
  gradientPremium: ["#1A1A1A", "#2D2D2D", "#1A1A1A"],
} as const;

const getScreenWidth = () => Dimensions.get("window").width;

export const getHeroHeight = () => {
  const width = getScreenWidth();
  if (width < 375) return width * 0.85;
  if (width < 414) return width * 0.9;
  if (width >= 768) return width * 0.5;
  return width * 0.95;
};

export const getQuickActionWidth = () => {
  const screenWidth = getScreenWidth();
  const horizontalPadding = getSpacing(GUIDE_SPACING.lg) * 2;
  const gap = getSpacing(GUIDE_SPACING.md);
  return (screenWidth - horizontalPadding - gap) / 2;
};

export const getQuickActionMinHeight = () => {
  return responsive({
    small: 95,
    medium: 105,
    large: 115,
    tablet: 130,
    default: 110,
  });
};

export const getGreetingKey = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.greetings.morning";
  if (hour < 18) return "dashboard.greetings.afternoon";
  return "dashboard.greetings.evening";
};
