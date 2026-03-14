import { Platform, StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { getFontSize, getSpacing } from "../../../../utils/responsive";
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
    backgroundColor: PREMIUM_COLORS.cream,
  },

  // Map Section
  mapContainer: {
    height: 280,
    position: "relative",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    margin: getSpacing(GUIDE_SPACING.md),
    overflow: "hidden",
  },
  map: {
    flex: 1,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  addButton: {
    position: "absolute",
    bottom: getSpacing(GUIDE_SPACING.md),
    right: getSpacing(GUIDE_SPACING.md),
    borderRadius: 28,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
  fullMapButton: {
    position: "absolute",
    bottom: getSpacing(GUIDE_SPACING.md),
    left: getSpacing(GUIDE_SPACING.md),
    width: 44,
    height: 44,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
  },

  // List
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.sm),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
  },
  listTitle: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  listCount: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textMuted,
  },
  listContent: {
    gap: getSpacing(GUIDE_SPACING.sm),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingBottom: getSpacing(GUIDE_SPACING.lg),
  },

  // Pin Card - Ticket style matching EventCard
  pinCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    minHeight: 100,
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
  pinCardAccent: {
    width: 56,
    justifyContent: "center",
    alignItems: "center",
  },
  pinCardEmoji: {
    fontSize: 28,
  },
  pinCardDivider: {
    width: 2,
    backgroundColor: PREMIUM_COLORS.cream,
    marginVertical: GUIDE_SPACING.sm,
    borderRadius: 1,
  },
  pinCardContent: {
    flex: 1,
    padding: GUIDE_SPACING.md,
    paddingLeft: GUIDE_SPACING.sm,
    justifyContent: "center",
    gap: 4,
  },
  pinCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  pinCardBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  pinCardIconActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  iconActionBtn: {
    padding: 4,
  },
  pinCardInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  pinCardMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  pinCardName: {
    flex: 1,
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  pinCardDesc: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textMuted,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 4,
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: getSpacing(GUIDE_SPACING.xxl),
  },
  emptyText: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginTop: getSpacing(GUIDE_SPACING.md),
  },
  emptySubtext: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textMuted,
    marginTop: getSpacing(GUIDE_SPACING.xs),
  },

  // Status badge
  statusBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    marginTop: 4,
  },
  statusText: {
    fontSize: getFontSize(11),
    fontWeight: "600",
  },
  rejectionText: {
    flex: 1,
    fontSize: getFontSize(11),
    color: "#E74C3C",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: PREMIUM_COLORS.cream,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    padding: getSpacing(GUIDE_SPACING.lg),
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  modalTitle: {
    fontSize: getFontSize(17),
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  fieldLabel: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginTop: getSpacing(GUIDE_SPACING.md),
    marginBottom: 4,
  },
  categoryRow: {
    flexDirection: "row",
    gap: getSpacing(GUIDE_SPACING.sm),
    flexWrap: "wrap",
  },
  selectMapBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.gold,
    backgroundColor: PREMIUM_COLORS.goldLight,
    marginTop: 8,
  },
  selectMapText: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  catChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    backgroundColor: "#FFF",
  },
  catChipLabel: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textSecondary,
    fontWeight: "500",
  },
  inputBox: {
    backgroundColor: PREMIUM_COLORS.cream,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: PREMIUM_COLORS.gold,
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: getSpacing(GUIDE_SPACING.sm),
    minHeight: 44,
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textPrimary,
  },
  inputText: {
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textPrimary,
  },
  coordsNote: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textMuted,
    marginTop: getSpacing(GUIDE_SPACING.sm),
    fontStyle: "italic",
  },
  modalActions: {
    flexDirection: "row",
    gap: getSpacing(GUIDE_SPACING.md),
    marginTop: getSpacing(GUIDE_SPACING.lg),
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    alignItems: "center",
  },
  cancelBtnText: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  submitBtn: {
    flex: 2,
    paddingVertical: 14,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: PREMIUM_COLORS.gold,
    alignItems: "center",
  },
  submitBtnText: {
    fontSize: getFontSize(15),
    fontWeight: "700",
    color: "#FFF",
  },

  // List header right
  listHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },

  // Filter trigger button
  filterTriggerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    backgroundColor: "#FFF",
  },
  filterTriggerBtnActive: {
    borderColor: PREMIUM_COLORS.gold,
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  filterTriggerText: {
    fontSize: getFontSize(12),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },

  // Filter Bottom Sheet
  sheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  sheetContainer: {
    backgroundColor: PREMIUM_COLORS.cream,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    paddingHorizontal: getSpacing(GUIDE_SPACING.lg),
    paddingTop: 12,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
      },
      android: { elevation: 16 },
    }),
  },
  sheetHandleWrap: {
    alignItems: "center",
    marginBottom: 12,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUIDE_COLORS.gray200,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  sheetTitle: {
    fontSize: getFontSize(17),
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  sheetSectionTitle: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginBottom: 8,
    marginTop: 4,
  },
  sheetChipRow: {
    flexDirection: "row",
    gap: 8,
    paddingBottom: getSpacing(GUIDE_SPACING.md),
  },
  sheetChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    backgroundColor: "#F9FAFB",
  },
  sheetChipActive: {
    borderColor: PREMIUM_COLORS.gold,
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  sheetChipLabel: {
    fontSize: getFontSize(13),
    fontWeight: "500",
    color: GUIDE_COLORS.textSecondary,
  },
  sheetChipLabelActive: {
    color: PREMIUM_COLORS.gold,
    fontWeight: "700",
  },
  sheetActiveChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1.5,
  },
  sheetActiveChipLabel: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  sheetStatusList: {
    gap: 8,
    marginBottom: getSpacing(GUIDE_SPACING.lg),
  },
  sheetStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 12,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray100,
    backgroundColor: "#FAFAFA",
  },
  sheetStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetStatusLabel: {
    fontSize: getFontSize(14),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  sheetStatusDesc: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textMuted,
    marginTop: 1,
  },
  sheetCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: "auto",
  },
  sheetApplyBtn: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: 14,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: "center",
    marginTop: 4,
  },
  sheetApplyText: {
    fontSize: getFontSize(15),
    fontWeight: "700",
    color: "#FFF",
  },
});
