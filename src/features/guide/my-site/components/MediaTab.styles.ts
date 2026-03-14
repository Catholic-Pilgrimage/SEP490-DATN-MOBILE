import { Dimensions, Platform, StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SHADOWS,
    GUIDE_SPACING,
    GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 10;
const NUM_COLUMNS = 3;
const ITEM_SIZE =
  (SCREEN_WIDTH - GUIDE_SPACING.lg * 2 - GRID_GAP * (NUM_COLUMNS - 1)) /
  NUM_COLUMNS;

export { GRID_GAP, ITEM_SIZE, NUM_COLUMNS };

export const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  sectionTitleMain: {
    fontSize: 16,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  filterRow: {
    flexDirection: "row",
    gap: GUIDE_SPACING.xs,
  },

  // Section Headers (grouped by date)
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
  },
  sectionListContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },
  sectionGrid: {
    marginBottom: GUIDE_SPACING.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItemEmpty: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
  },
  loadingText: {
    marginTop: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
  },

  // Grid
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.gray100,
  },
  gridItemImage: {
    width: "100%",
    height: "100%",
  },

  // Status Badge positioning within grid item
  statusBadgeContainer: {
    position: "absolute",
    top: 6,
    left: 6,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },

  // Media Type Icon
  videoIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  videoDuration: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "600",
  },
  panaromaIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.gray200,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },
  emptyDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: GUIDE_SPACING.xl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.xl,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    ...GUIDE_SHADOWS.md,
  },
  emptyButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },
});
