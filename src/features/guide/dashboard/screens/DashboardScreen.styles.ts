/**
 * DashboardScreen Styles
 * Extracted from DashboardScreen.tsx for maintainability
 */

import { Platform, StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import {
    getFontSize,
    getSpacing,
    moderateScale,
} from "../../../../utils/responsive";
import { PREMIUM_COLORS } from "../constants";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // Hero Section
  heroSection: {
    width: "100%",
  },
  heroBackground: {
    flex: 1,
    width: "100%",
  },
  heroGradient: {
    flex: 1,
    justifyContent: "space-between",
  },

  // Top App Bar
  topAppBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getSpacing(GUIDE_SPACING.lg),
    paddingBottom: getSpacing(GUIDE_SPACING.sm),
  },
  appBarButton: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(22, 0.3),
    overflow: "visible",
  },
  appBarButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: moderateScale(22, 0.3),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "visible",
  },
  appBarTitleContainer: {
    alignItems: "center",
  },
  appBarTitle: {
    fontSize: getFontSize(12),
    fontWeight: "600",
    color: "#FFFFFF",
    letterSpacing: 0.4,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  appBarTitleUnderline: {
    width: moderateScale(22, 0.3),
    height: 2,
    backgroundColor: PREMIUM_COLORS.gold,
    marginTop: 4,
    borderRadius: 1,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: PREMIUM_COLORS.ruby,
    width: moderateScale(18, 0.3),
    height: moderateScale(18, 0.3),
    borderRadius: moderateScale(9, 0.3),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    fontSize: getFontSize(10),
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Hero Content
  heroContent: {
    paddingHorizontal: getSpacing(GUIDE_SPACING.xl),
    paddingBottom: getSpacing(GUIDE_SPACING.xxl) * 2.5,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.sm),
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  greetingLine: {
    width: moderateScale(20, 0.3),
    height: 1,
    backgroundColor: PREMIUM_COLORS.gold,
  },
  heroGreeting: {
    fontSize: getFontSize(11),
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSiteName: {
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: getSpacing(GUIDE_SPACING.md),
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMeta: {
    marginTop: getSpacing(GUIDE_SPACING.xs),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: moderateScale(9, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    maxWidth: "100%",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderColor: "rgba(16, 185, 129, 0.18)",
  },
  statusBadgeClosed: {
    backgroundColor: "rgba(255, 252, 247, 0.92)",
    borderColor: "rgba(225, 29, 72, 0.16)",
  },
  statusBadgeLoading: {
    backgroundColor: "rgba(255, 252, 247, 0.9)",
    borderColor: "rgba(148, 163, 184, 0.18)",
  },
  statusDot: {
    width: moderateScale(8, 0.3),
    height: moderateScale(8, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    marginRight: moderateScale(8, 0.3),
  },
  statusDotOpen: {
    backgroundColor: PREMIUM_COLORS.emerald,
  },
  statusDotClosed: {
    backgroundColor: PREMIUM_COLORS.ruby,
  },
  statusDotLoading: {
    backgroundColor: "#94A3B8",
  },
  statusText: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  statusTextOpen: {
    color: "#047857",
  },
  statusTextClosed: {
    color: "#BE123C",
  },
  statusTextLoading: {
    color: "#334155",
  },
  statusSeparator: {
    color: "#94A3B8",
    marginHorizontal: moderateScale(8, 0.3),
    fontSize: getFontSize(12),
    fontWeight: "700",
  },
  statusDetailText: {
    color: "#475569",
    fontSize: getFontSize(11),
    fontWeight: "600",
    letterSpacing: 0.1,
    flexShrink: 1,
  },
  statusFallbackBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: moderateScale(6, 0.3),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: moderateScale(9, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "rgba(255, 252, 247, 0.88)",
    borderWidth: 1,
    borderColor: "rgba(148, 163, 184, 0.16)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.12,
        shadowRadius: 16,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  statusFallbackText: {
    color: "#475569",
    fontSize: getFontSize(11),
    fontWeight: "600",
  },
  heroPatronRow: {
    marginTop: getSpacing(GUIDE_SPACING.sm),
  },
  heroPatronContainer: {
    minWidth: 0,
    alignSelf: "flex-start",
    borderLeftWidth: 2.5,
    borderLeftColor: PREMIUM_COLORS.gold,
    paddingLeft: getSpacing(GUIDE_SPACING.sm),
  },
  heroPatron: {
    color: "#FFF",
    fontWeight: "700",
    lineHeight: getFontSize(18),
    textShadowColor: "rgba(0, 0, 0, 0.45)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroPatronLabel: {
    fontWeight: "700",
    letterSpacing: 0.2,
    color: "rgba(255, 255, 255, 0.9)",
  },

  // Quick Actions
  quickActionsOverlay: {
    marginTop: -getSpacing(GUIDE_SPACING.xl),
    zIndex: 10,
  },
  pilgrimSection: {
    marginTop: getSpacing(GUIDE_SPACING.md),
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  quickActionButton: {
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.goldDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  quickActionGradient: {
    padding: getSpacing(GUIDE_SPACING.lg),
    paddingTop: getSpacing(GUIDE_SPACING.xl),
    paddingBottom: getSpacing(GUIDE_SPACING.lg),
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
  },
  quickActionPattern: {
    position: "absolute",
    top: moderateScale(-20, 0.3),
    right: moderateScale(-20, 0.3),
    opacity: 1,
  },
  quickActionIconContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quickActionLabel: {
    fontSize: getFontSize(14),
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: getSpacing(GUIDE_SPACING.sm),
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionBadge: {
    position: "absolute",
    top: getSpacing(GUIDE_SPACING.sm),
    right: getSpacing(GUIDE_SPACING.sm),
    backgroundColor: "#FFFFFF",
    paddingHorizontal: moderateScale(8, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: moderateScale(12, 0.3),
    minWidth: moderateScale(24, 0.3),
    alignItems: "center",
  },
  quickActionBadgeText: {
    fontSize: getFontSize(11),
    fontWeight: "800",
    color: PREMIUM_COLORS.gold,
  },

  // Sections
  section: {
    paddingTop: getSpacing(GUIDE_SPACING.lg),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.lg),
  },
  sectionLabel: {
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2,
    marginBottom: getSpacing(GUIDE_SPACING.xs),
  },
  sectionTitleSerif: {
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
  },
  viewAllText: {
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },

  // Shift Badge
  shiftBadge: {
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: getSpacing(GUIDE_SPACING.sm),
    alignItems: "flex-end",
  },
  shiftBadgeLabel: {
    fontSize: getFontSize(9),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    opacity: 0.9,
  },
  shiftBadgeTime: {
    fontSize: getFontSize(13),
    fontWeight: "700",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },

  // Timeline
  timeline: {
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: getSpacing(GUIDE_SPACING.md),
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timelineItemActive: {
    borderColor: PREMIUM_COLORS.gold,
    borderWidth: 1.5,
    backgroundColor: "#FFFEF9",
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: getSpacing(GUIDE_SPACING.md),
  },
  timelineDot: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    height: moderateScale(40, 0.3),
    marginTop: getSpacing(GUIDE_SPACING.xs),
    borderRadius: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: moderateScale(4, 0.3),
  },
  timelineTime: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    color: GUIDE_COLORS.gray400,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  timelineTimeActive: {
    color: PREMIUM_COLORS.gold,
  },
  timelineTitle: {
    fontSize: getFontSize(16),
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginTop: 2,
    lineHeight: getFontSize(22),
  },
  timelineTitleMuted: {
    color: GUIDE_COLORS.gray500,
    fontWeight: "600",
  },
  timelineLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
    marginTop: moderateScale(4, 0.3),
  },
  timelineLocation: {
    color: GUIDE_COLORS.gray400,
  },
  timelineActiveIndicator: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingHorizontal: moderateScale(10, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    alignSelf: "flex-start",
  },
  timelineActiveText: {
    fontSize: getFontSize(10),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // Activity List
  activityList: {
    gap: getSpacing(GUIDE_SPACING.md),
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: getSpacing(GUIDE_SPACING.md),
    backgroundColor: "#FFFFFF",
    padding: getSpacing(GUIDE_SPACING.md),
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  activityImageContainer: {
    width: moderateScale(60, 0.3),
    height: moderateScale(60, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.06)",
    backgroundColor: "#FFFFFF",
  },
  activityImage: {
    width: "100%",
    height: "100%",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  activityImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  activityContent: {
    flex: 1,
    minWidth: 0,
    paddingTop: moderateScale(2, 0.3),
  },
  activityHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  activityTitle: {
    fontSize: getFontSize(14),
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    flex: 1,
    lineHeight: getFontSize(20),
  },
  activityMetaLabel: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.gray500,
    marginTop: 4,
    fontWeight: "600",
  },
  activityStatusBadge: {
    paddingHorizontal: moderateScale(8, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  activityStatusText: {
    fontSize: getFontSize(10),
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
    marginTop: moderateScale(8, 0.3),
  },
  activityTime: {
    fontSize: getFontSize(11),
    color: GUIDE_COLORS.gray400,
  },
  activityArrow: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: "rgba(212, 175, 55, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },

  // Empty State
  emptyStateContainer: {
    padding: getSpacing(GUIDE_SPACING.xl),
    alignItems: "center",
    justifyContent: "center",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  emptyStateText: {
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },

  // Bottom spacing
  bottomSpacer: {
    height: 100,
  },
});
