import { StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SHADOWS,
    GUIDE_SPACING,
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
    backgroundColor: PREMIUM_COLORS.cream,
  },
  loadingText: {
    marginTop: GUIDE_SPACING.md,
    fontSize: 14,
    color: GUIDE_COLORS.textSecondary,
  },

  // Filter chips - Legacy (keep for compatibility)
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    gap: GUIDE_SPACING.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
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
  },

  // Schedule Card
  scheduleCard: {
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    flexDirection: "row",
    overflow: "hidden",
    ...GUIDE_SHADOWS.sm,
  },
  cardLeftBorder: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: GUIDE_SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.sm,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Days row
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: PREMIUM_COLORS.warmGray,
  },
  dayChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayChipTextSmall: {
    fontSize: 11,
  },

  // Note row
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 18,
  },

  // Rejection box
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
    padding: GUIDE_SPACING.sm,
    backgroundColor: "#FEE2E2",
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: GUIDE_SPACING.sm,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    lineHeight: 16,
  },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: GUIDE_SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
    fontFamily: "monospace",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
  },
  actionsRow: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xl * 2,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: GUIDE_COLORS.textSecondary,
    textAlign: "center",
    marginBottom: GUIDE_SPACING.md,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: PREMIUM_COLORS.gold,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    ...GUIDE_SHADOWS.md,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: PREMIUM_COLORS.cream,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: GUIDE_SPACING.xs,
  },
  modalBody: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
  },
  /** Ít padding đáy scroll — ô ghi chú gần hàng nút hơn */
  modalScrollContent: {
    paddingBottom: GUIDE_SPACING.xs,
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    marginHorizontal: GUIDE_SPACING.lg,
    marginTop: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.sm,
    backgroundColor: "#FEF3C7",
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  rejectionNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#D97706",
  },

  // Form
  formGroup: {
    marginBottom: GUIDE_SPACING.lg,
  },
  formGroupLast: {
    marginBottom: 0,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },
  required: {
    color: "#DC2626",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: "#FFFFFF",
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textAreaContainer: {
    alignItems: "flex-start",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: GUIDE_COLORS.textPrimary,
    padding: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  /** Giờ lễ — pill vàng + picker chính */
  timePillRow: {
    marginBottom: GUIDE_SPACING.sm,
  },
  timePillTouchable: {
    alignSelf: "flex-start",
  },
  timePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm + 2,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.goldLight,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.gold,
  },
  timePillText: {
    fontSize: 17,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  iosTimeToolbar: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.cream,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  iosTimeToolbarBtn: {
    paddingVertical: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
  },
  iosTimeToolbarText: {
    fontSize: 16,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  quickTimeRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.sm,
  },
  quickTimeChip: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  quickTimeChipActive: {
    backgroundColor: PREMIUM_COLORS.goldLight,
    borderColor: PREMIUM_COLORS.gold,
  },
  quickTimeChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  quickTimeChipTextActive: {
    color: PREMIUM_COLORS.goldDark,
  },
  weekOverviewSection: {
    marginBottom: GUIDE_SPACING.md,
  },
  weekOverviewToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
  },
  weekOverviewTitleText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  weekGridRow: {
    flexDirection: "row",
    gap: 4,
    marginTop: GUIDE_SPACING.sm,
  },
  weekCell: {
    flex: 1,
    minWidth: 0,
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: 2,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  weekCellSelected: {
    borderColor: PREMIUM_COLORS.gold,
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  /** Không có lịch — tránh nhầm với “0” như empty list; không bấm lọc */
  weekCellEmpty: {
    opacity: 0.65,
  },
  weekCellDay: {
    fontSize: 11,
    fontWeight: "700",
  },
  weekCellCount: {
    fontSize: 15,
    fontWeight: "800",
    color: GUIDE_COLORS.textPrimary,
    marginTop: 2,
  },
  weekCellCountMuted: {
    color: GUIDE_COLORS.gray400,
    fontWeight: "600",
  },
  clearDayFilterBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    marginTop: GUIDE_SPACING.sm,
    paddingVertical: 4,
  },
  clearDayFilterText: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },
  listFooter: {
    alignItems: "center",
    paddingTop: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.md,
  },
  listFooterLine: {
    width: 120,
    height: StyleSheet.hairlineWidth,
    backgroundColor: GUIDE_COLORS.gray300,
    marginBottom: GUIDE_SPACING.sm,
  },
  listFooterText: {
    fontSize: 12,
    color: GUIDE_COLORS.textSecondary,
    fontWeight: "500",
  },
  charCount: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
    textAlign: "right",
    marginTop: GUIDE_SPACING.xs,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },

  // Modal footer — paddingTop nhỏ để sát ô ghi chú; paddingBottom set trong TSX (safe area + sm)
  modalFooter: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: PREMIUM_COLORS.gold,
    ...GUIDE_SHADOWS.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});
