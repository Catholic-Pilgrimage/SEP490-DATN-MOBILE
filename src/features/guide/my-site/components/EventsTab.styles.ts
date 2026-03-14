import { Platform, StyleSheet } from "react-native";
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

  // List
  listContent: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: 120,
  },

  // Event Card - Ticket style with rounded date column
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    minHeight: 110,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateColumn: {
    width: 64,
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.lg,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.lg,
    borderBottomLeftRadius: GUIDE_BORDER_RADIUS.lg,
  },
  perforatedLine: {
    width: 2,
    backgroundColor: PREMIUM_COLORS.cream,
    marginVertical: GUIDE_SPACING.sm,
    borderRadius: 1,
  },
  dateDay: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  contentColumn: {
    flex: 1,
    padding: GUIDE_SPACING.md,
    paddingLeft: GUIDE_SPACING.sm,
    justifyContent: "center",
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    padding: 6,
    marginRight: -4,
  },
  thumbnail: {
    width: 70,
    height: "100%",
    minHeight: 110,
  },

  // Event Info
  eventName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    flex: 1,
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
    color: GUIDE_COLORS.textSecondary,
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
    marginBottom: GUIDE_SPACING.xs,
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
