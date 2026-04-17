import { StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SPACING,
    GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { PREMIUM_COLORS } from "../constants";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },

  listContent: {
    paddingHorizontal: GUIDE_SPACING.md,
  },

  swipeableContainer: {
    // To allow the shadow of the inner card to be visible, we don't hide overflow tightly if not needed.
    // However, if the red background peaks through the corners, we handle it via border-radius.
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "transparent",
  },
  deleteSwipeAction: {
    backgroundColor: "#E74C3C",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.lg,
    borderBottomRightRadius: GUIDE_BORDER_RADIUS.lg,
    height: "100%",
  },
  deleteSwipeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },

  // Event Card - Ticket style with rounded date column
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    minHeight: 110,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    // Note: iOS shadow moved to swipeableContainer to avoid clipping
  },
  dateColumn: {
    width: 68,
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.md,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.lg,
    borderBottomLeftRadius: GUIDE_BORDER_RADIUS.lg,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  dateDayRange: {
    fontSize: 16,
    letterSpacing: -0.2,
  },
  dateRangeStack: {
    alignItems: "center",
    justifyContent: "center",
    gap: 0,
  },
  dateDayRangeStart: {
    fontSize: 18,
    lineHeight: 20,
  },
  dateDayRangeEnd: {
    fontSize: 18,
    lineHeight: 20,
  },
  dateRangeConnector: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255, 255, 255, 0.95)",
    lineHeight: 14,
    marginVertical: 1,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
    marginTop: 1,
  },
  contentColumn: {
    flex: 1,
    padding: GUIDE_SPACING.md,
    paddingLeft: GUIDE_SPACING.md,
    paddingRight: GUIDE_SPACING.xs,
    justifyContent: "center",
    gap: 6,
    overflow: "hidden",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  categoryChip: {
    fontSize: 11,
    fontWeight: "600",
    color: PREMIUM_COLORS.brown,
    backgroundColor: "rgba(199, 169, 78, 0.18)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    overflow: "hidden",
    maxWidth: "70%",
  },
  thumbnailContainer: {
    justifyContent: "center",
    alignItems: "center",
    paddingRight: 12,
    paddingVertical: 12,
  },
  thumbnailWrapper: {
    width: 80,
    height: 80,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#EAEAEA",
    backgroundColor: "#FFFFFF",
    overflow: "hidden",
  },
  thumbnail: {
    width: "100%",
    height: "100%",
  },
  thumbnailGradient: {
    justifyContent: "center",
    alignItems: "center",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 8,
  },
  menuButton: {
    padding: 2,
    marginTop: -2,
    marginRight: -4, // Keep button slightly padded comfortably
  },

  // Event Info
  eventName: {
    flex: 1, // Restrict text width from pushing chevron off
    fontSize: 15,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.3,
  },
  eventDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.md,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: "#666666",
  },
  // Overnight "+1" badge for events crossing midnight
  overnightBadge: {
    backgroundColor: "#FFF3E0",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: "#FFB74D",
    marginLeft: 2,
  },
  overnightText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#E65100",
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: GUIDE_SPACING.xs,
    padding: 6,
    backgroundColor: "#FFEBEE",
    borderRadius: 4,
  },
  rejectionText: {
    fontSize: 11,
    color: "#E74C3C",
    flex: 1,
  },

  // Empty State - Premium
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxl * 2,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: PREMIUM_COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginBottom: GUIDE_SPACING.md,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  emptyButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: "#FFF",
    fontWeight: "600",
  },
});
