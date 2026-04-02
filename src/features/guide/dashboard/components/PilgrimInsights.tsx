/**
 * PilgrimInsights Component
 * Displays live check-in count and pilgrim activity
 * Features:
 * - Glassmorphism cards with sacred theme
 * - Pulsing live indicator with ripple effect
 * - Monochrome gold color palette
 * - Background pilgrim silhouette icon
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { GlassCard } from "../../../../components/ui/GlassCard";
import {
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { SACRED_COLORS, SACRED_RADIUS, SACRED_TYPOGRAPHY } from "../../../../constants/sacred-theme.constants";
import { useI18n } from "../../../../hooks/useI18n";
import { getFontSize, getSpacing } from "../../../../utils/responsive";

interface PilgrimInsightsProps {
  primaryCount: number;
  secondaryCount: number;
  sectionLabel?: string;
  title?: string;
  primaryLabel?: string;
  secondaryLabel?: string;
  primaryIcon?: keyof typeof Ionicons.glyphMap;
  secondaryIcon?: keyof typeof Ionicons.glyphMap;
  primaryBackgroundIcon?: keyof typeof Ionicons.glyphMap;
  secondaryBackgroundIcon?: keyof typeof Ionicons.glyphMap;
  showPrimaryDot?: boolean;
  onViewAll?: () => void;
}

export const PilgrimInsights: React.FC<PilgrimInsightsProps> = ({
  primaryCount,
  secondaryCount,
  sectionLabel,
  title,
  primaryLabel,
  secondaryLabel,
  primaryIcon = "walk-outline",
  secondaryIcon = "calendar-outline",
  primaryBackgroundIcon = "people-outline",
  secondaryBackgroundIcon = "footsteps-outline",
  showPrimaryDot = false,
  onViewAll,
}) => {
  const { t } = useI18n();

  return (
    <View style={styles.container}>
      {/* Section Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>
            {sectionLabel || t("pilgrimInsights.sectionLabel")}
          </Text>
          <Text style={styles.sectionTitle}>
            {title || t("pilgrimInsights.title")}
          </Text>
        </View>
        {onViewAll && (
          <TouchableOpacity style={styles.viewAllButton} onPress={onViewAll}>
            <Text style={styles.viewAllText}>{t("common.viewAll")}</Text>
            <Ionicons name="chevron-forward" size={16} color={SACRED_COLORS.gold} />
          </TouchableOpacity>
        )}
      </View>

      {/* Stats Cards - Glassmorphism */}
      <View style={styles.cardsRow}>
        {/* Current Pilgrims Card */}
        <GlassCard
          variant="cream"
          intensity="medium"
          padding={getSpacing(GUIDE_SPACING.md)}
          style={styles.statCard}
          withBorder
        >
          {/* Icon with indicator dot */}
          <View style={styles.cardIconRow}>
            <View style={styles.cardIconContainer}>
              <Ionicons name={primaryIcon} size={18} color={SACRED_COLORS.gold} />
            </View>
            {showPrimaryDot && <View style={styles.activeDot} />}
          </View>

          {/* Count */}
          <Text style={styles.bigNumber}>{primaryCount}</Text>
          <Text style={styles.cardLabel}>
            {primaryLabel || t("pilgrimInsights.currentPilgrims")}
          </Text>

          {/* Background Icon (pilgrim silhouette) */}
          <View style={styles.bgIcon}>
            <Ionicons
              name={primaryBackgroundIcon}
              size={50}
              color={SACRED_COLORS.goldLight}
            />
          </View>
        </GlassCard>

        {/* Today's Visitors Card */}
        <GlassCard
          variant="cream"
          intensity="medium"
          padding={getSpacing(GUIDE_SPACING.md)}
          style={styles.statCard}
          withBorder
        >
          {/* Icon */}
          <View style={styles.cardIconRow}>
            <View style={styles.cardIconContainer}>
              <Ionicons
                name={secondaryIcon}
                size={18}
                color={SACRED_COLORS.gold}
              />
            </View>
          </View>

          {/* Count */}
          <Text style={styles.bigNumber}>{secondaryCount}</Text>
          <Text style={styles.cardLabel}>
            {secondaryLabel || t("pilgrimInsights.todayVisitors")}
          </Text>

          {/* Background Icon */}
          <View style={styles.bgIcon}>
            <Ionicons
              name={secondaryBackgroundIcon}
              size={50}
              color={SACRED_COLORS.goldLight}
            />
          </View>
        </GlassCard>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: getSpacing(GUIDE_SPACING.lg),
    marginTop: getSpacing(GUIDE_SPACING.xl),
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  sectionLabel: {
    fontSize: getFontSize(12),
    fontWeight: "700",
    color: SACRED_COLORS.gold,
    letterSpacing: SACRED_TYPOGRAPHY.letterSpacing.sacred,
    marginBottom: 4,
  },
  sectionTitle: {
    fontSize: getFontSize(20),
    fontWeight: "700",
    color: SACRED_COLORS.charcoal,
    letterSpacing: SACRED_TYPOGRAPHY.letterSpacing.tight,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: SACRED_COLORS.gold,
  },
  cardsRow: {
    flexDirection: "row",
    gap: getSpacing(GUIDE_SPACING.md),
  },
  statCard: {
    flex: 1,
    minHeight: 130,
    position: "relative",
    overflow: "hidden",
  },
  cardIconRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  cardIconContainer: {
    width: 32,
    height: 32,
    borderRadius: SACRED_RADIUS.sm,
    backgroundColor: SACRED_COLORS.glassGold,
    justifyContent: "center",
    alignItems: "center",
  },
  activeDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: SACRED_COLORS.success,
  },
  bigNumber: {
    fontSize: getFontSize(40),
    fontWeight: "700", // Bold for better readability
    color: SACRED_COLORS.charcoal,
    marginTop: 12,
    letterSpacing: SACRED_TYPOGRAPHY.letterSpacing.tight,
  },
  cardLabel: {
    fontSize: getFontSize(12),
    fontWeight: "500",
    color: SACRED_COLORS.graphite,
    marginTop: 4,
  },
  bgIcon: {
    position: "absolute",
    right: -5,
    bottom: -5,
    opacity: 0.6,
  },
});

export default PilgrimInsights;
