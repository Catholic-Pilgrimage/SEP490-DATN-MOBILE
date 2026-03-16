import { Platform, StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SHADOWS,
    GUIDE_SPACING,
    GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { PREMIUM_COLORS } from "../constants";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  backgroundDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    opacity: 0.03,
    zIndex: 0,
  },
  backgroundIcon: {
    transform: [{ rotate: "12deg" }, { translateX: 48 }, { translateY: -48 }],
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
  },
  mediaTabContainer: {
    flex: 1,
    paddingHorizontal: GUIDE_SPACING.lg,
  },

  // Site Header
  siteHeaderFixed: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.md,
  },
  siteHeaderTop: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.md,
  },
  siteHeaderText: {
    flex: 1,
  },
  siteTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.5,
    marginBottom: GUIDE_SPACING.xs,
  },
  siteLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  siteLocationText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: PREMIUM_COLORS.gold,
    fontStyle: "italic",
  },
  notificationButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: GUIDE_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...GUIDE_SHADOWS.sm,
  },
  notificationBadge: {
    position: "absolute",
    top: -3,
    right: -3,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    paddingHorizontal: 4,
    backgroundColor: GUIDE_COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: PREMIUM_COLORS.cream,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Pill Tabs - Premium Soft Pill Design
  tabsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.md,
  },
  underlineTabs: {
    flexDirection: "row",
    flex: 1,
    gap: GUIDE_SPACING.xs,
  },
  underlineTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 4,
  },
  underlineTabActive: {
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  underlineTabText: {
    fontWeight: "500",
    color: GUIDE_COLORS.gray400,
  },
  underlineTabTextActive: {
    color: PREMIUM_COLORS.goldDark,
    fontWeight: "700",
  },

  // Segmented Control - Premium Design
  segmentedControl: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: 3,
    ...GUIDE_SHADOWS.sm,
  },
  segmentedTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.sm + 2,
    paddingHorizontal: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: "transparent",
    flexDirection: "column",
    gap: 2,
  },
  segmentedTabActive: {
    backgroundColor: PREMIUM_COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.goldDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentedTabFirst: {
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.md,
    borderBottomLeftRadius: GUIDE_BORDER_RADIUS.md,
  },
  segmentedTabLast: {
    borderTopRightRadius: GUIDE_BORDER_RADIUS.md,
    borderBottomRightRadius: GUIDE_BORDER_RADIUS.md,
  },
  segmentedTabText: {
    fontWeight: "600",
    color: PREMIUM_COLORS.brown,
  },
  segmentedTabTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },

  // Placeholder Section
  placeholderSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
    gap: GUIDE_SPACING.lg,
  },
  placeholderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    color: GUIDE_COLORS.textMuted,
    marginBottom: GUIDE_SPACING.xs,
  },
  placeholderSubtext: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },

  // FAB - Premium with soft floating shadow
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});
