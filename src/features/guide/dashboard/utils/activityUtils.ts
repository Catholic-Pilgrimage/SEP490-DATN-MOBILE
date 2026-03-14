/**
 * Activity Display Utilities
 * Resolves icon names and colors for different activity types,
 * eliminating deeply nested ternary expressions in the component.
 */

import { PREMIUM_COLORS } from "../constants";

type ActivityType = "nearby_place" | "media" | string;
type NearbyCategory = "accommodation" | "medical" | string;

interface ActivityDisplayConfig {
  icon: string;
  color: string;
  backgroundColor: string;
}

const NEARBY_PLACE_CONFIG: Record<string, ActivityDisplayConfig> = {
  accommodation: {
    icon: "bed",
    color: "#3B82F6",
    backgroundColor: "#DBEAFE",
  },
  medical: {
    icon: "medkit",
    color: "#EF4444",
    backgroundColor: "#FEE2E2",
  },
};

const DEFAULT_NEARBY_CONFIG: ActivityDisplayConfig = {
  icon: "restaurant",
  color: "#10B981",
  backgroundColor: "#D1FAE5",
};

const MEDIA_CONFIG: ActivityDisplayConfig = {
  icon: "image",
  color: PREMIUM_COLORS.gold,
  backgroundColor: "#FEF3C7",
};

const DEFAULT_CONFIG: ActivityDisplayConfig = {
  icon: "calendar",
  color: PREMIUM_COLORS.sapphire,
  backgroundColor: "#DBEAFE",
};

export const getActivityDisplayConfig = (
  type: ActivityType,
  category?: NearbyCategory,
): ActivityDisplayConfig => {
  if (type === "nearby_place") {
    return NEARBY_PLACE_CONFIG[category ?? ""] ?? DEFAULT_NEARBY_CONFIG;
  }
  if (type === "media") {
    return MEDIA_CONFIG;
  }
  return DEFAULT_CONFIG;
};
