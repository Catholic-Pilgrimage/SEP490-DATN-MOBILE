import { StyleSheet } from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.creamBg,
  },

  // ============================================
  // HEADER
  // ============================================
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  editHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    justifyContent: "center",
    alignItems: "center",
  },

  // ============================================
  // STEP INDICATOR
  // ============================================
  stepIndicatorContainer: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  progressBarBg: {
    height: 3,
    backgroundColor: GUIDE_COLORS.gray200,
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: GUIDE_SPACING.sm,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: 2,
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.sm,
    gap: GUIDE_SPACING.sm,
  },
  stepBadge: {
    backgroundColor: GUIDE_COLORS.primaryMuted,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 2,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  stepBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.primaryDark,
  },
  stepLabelText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamInk,
  },
  stepDotsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  stepDotItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  stepDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotCompleted: {
    backgroundColor: GUIDE_COLORS.success,
  },
  stepDotActive: {
    backgroundColor: GUIDE_COLORS.primary,
  },
  stepDotInactive: {
    backgroundColor: GUIDE_COLORS.gray200,
  },
  stepDotNumber: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.gray400,
  },
  stepDotNumberActive: {
    color: GUIDE_COLORS.surface,
  },
  stepConnector: {
    width: 40,
    height: 2,
    backgroundColor: GUIDE_COLORS.gray200,
    marginHorizontal: GUIDE_SPACING.xs,
  },
  stepConnectorCompleted: {
    backgroundColor: GUIDE_COLORS.success,
  },

  // ============================================
  // CONTENT
  // ============================================
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // ============================================
  // SECTIONS — Sentence case, bold, darker color
  // ============================================
  section: {
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
    marginBottom: GUIDE_SPACING.sm,
    // No textTransform (sentence case by default)
    // No letterSpacing
  },

  // ============================================
  // BANNER — Reduced height ~120px
  // ============================================
  bannerSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  bannerContainer: {
    width: "100%",
    height: 120,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderStyle: "dashed",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  bannerPlaceholderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
  },
  bannerEditOverlay: {
    position: "absolute",
    bottom: GUIDE_SPACING.xs,
    right: GUIDE_SPACING.xs,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  bannerHint: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamMuted,
    marginTop: GUIDE_SPACING.xs,
    textAlign: "center",
  },

  // ============================================
  // INPUT FIELD
  // ============================================
  fieldContainer: {
    marginBottom: GUIDE_SPACING.md,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: GUIDE_SPACING.xs,
  },
  label: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamLabel,
  },
  required: {
    color: GUIDE_COLORS.error,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    paddingHorizontal: GUIDE_SPACING.sm,
    minHeight: 48,
  },
  /** Multiline: cột, full width — cuộn nội bộ khi vượt maxHeight */
  inputContainerMultiline: {
    flexDirection: "column",
    alignItems: "stretch",
    paddingVertical: GUIDE_SPACING.sm,
  },
  /** Mô tả: tối thiểu ~4 dòng, tối đa cố định — dài hơn thì cuộn trong ô */
  inputMultiline: {
    flex: 0,
    alignSelf: "stretch",
    width: "100%",
    minHeight: 100,
    maxHeight: 220,
    textAlignVertical: "top",
  },
  inputDisabled: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    opacity: 0.92,
  },
  inputError: {
    borderColor: GUIDE_COLORS.error,
    borderWidth: 1.5,
  },
  inputIcon: {
    marginRight: GUIDE_SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamInk,
    paddingVertical: GUIDE_SPACING.sm,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  placeholder: {
    color: GUIDE_COLORS.gray400,
  },
  charCount: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamMuted,
    textAlign: "right",
    marginTop: 4,
  },

  // ============================================
  // INLINE ERROR
  // ============================================
  errorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  errorText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.error,
    flex: 1,
  },

  // ============================================
  // DATE RANGE HINT
  // ============================================
  dateRangeHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.successLight,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    marginBottom: GUIDE_SPACING.md,
  },
  dateRangeHintText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.successDark,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
  },

  // ============================================
  // CATEGORY DROPDOWN (Grouped)
  // ============================================
  dropdownContainer: {
    marginTop: GUIDE_SPACING.xs,
    maxHeight: 300,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    ...GUIDE_SHADOWS.md,
    overflow: "hidden",
  },
  dropdownGroupHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  dropdownGroupLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamLabel,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg + GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  dropdownItemActive: {
    backgroundColor: GUIDE_COLORS.primaryMuted,
  },
  dropdownItemText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamInk,
  },
  dropdownItemTextActive: {
    color: GUIDE_COLORS.primaryDark,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },

  // ============================================
  // ROW LAYOUT
  // ============================================
  row: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  halfField: {
    flex: 1,
  },

  // ============================================
  // REJECTION BOX
  // ============================================
  rejectionBox: {
    flexDirection: "row",
    backgroundColor: "#FFEBEE",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    marginBottom: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.sm,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.error,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.error,
  },

  // ============================================
  // INFO BOX
  // ============================================
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  infoText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamMuted,
    flex: 1,
  },

  // ============================================
  // AI ASSIST
  // ============================================
  aiAssistCard: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.primary + '30', // 30% opacity
    padding: GUIDE_SPACING.md + 2,
    marginBottom: GUIDE_SPACING.lg + 4,
    gap: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.md,
  },
  aiAssistContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.sm,
  },
  aiAssistIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  aiAssistTextWrap: {
    flex: 1,
    gap: 4,
  },
  aiAssistTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  aiAssistSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
    lineHeight: 20,
  },
  aiAssistLoadingBox: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.xs,
  },
  aiAssistLoadingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  aiAssistLoadingTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  aiAssistLoadingDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
    lineHeight: 20,
  },
  aiAssistRetryBox: {
    backgroundColor: "#FFF8EC",
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.18)",
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  aiAssistRetryContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
  },
  aiAssistRetryText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    lineHeight: 20,
    color: GUIDE_COLORS.creamLabel,
  },
  aiAssistRetryButton: {
    alignSelf: "flex-start",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs + 2,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.primaryMuted,
  },
  aiAssistRetryButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.primaryDark,
  },
  aiAssistButton: {
    borderRadius: GUIDE_BORDER_RADIUS.md,
    overflow: 'hidden',
  },
  aiAssistButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.sm + 2,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  aiAssistButtonGradientDisabled: {
    opacity: 0.72,
  },
  aiAssistButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: "#3D2000",
  },

  // ============================================
  // AI SUGGESTION MODAL
  // ============================================
  aiModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  aiModalSafeArea: {
    flex: 1,
    justifyContent: "flex-end",
  },
  aiModalSheet: {
    backgroundColor: GUIDE_COLORS.creamBg,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.xl,
    maxHeight: "82%",
  },
  aiModalHandle: {
    alignSelf: "center",
    width: 44,
    height: 4,
    borderRadius: 999,
    backgroundColor: GUIDE_COLORS.gray300,
    marginBottom: GUIDE_SPACING.md,
  },
  aiModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.md,
  },
  aiModalHeaderIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  aiModalHeaderTextWrap: {
    flex: 1,
    gap: 4,
  },
  aiModalTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  aiModalSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
    lineHeight: 20,
  },
  aiModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    justifyContent: "center",
    alignItems: "center",
  },
  aiSuggestionList: {
    flexGrow: 0,
  },
  aiSuggestionListContent: {
    gap: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.sm,
  },
  aiSuggestionCard: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.creamBorder,
    gap: GUIDE_SPACING.sm,
    ...GUIDE_SHADOWS.sm,
    overflow: 'hidden',
  },
  aiSuggestionGradientBorder: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
  },
  aiSuggestionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.xs,
  },
  aiSuggestionIndexBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.xs,
  },
  aiSuggestionIndexText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primaryDark,
  },
  aiSuggestionHeaderLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  aiSuggestionName: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  aiSuggestionCategoryBadge: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    backgroundColor: GUIDE_COLORS.primaryMuted,
  },
  aiSuggestionCategoryText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.primaryDark,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },
  aiSuggestionChipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.xs,
  },
  aiSuggestionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  aiSuggestionChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
  },
  aiSuggestionDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
    lineHeight: 18,
  },
  aiSuggestionApplyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: GUIDE_SPACING.xs,
    paddingTop: GUIDE_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.creamBorder,
  },
  aiSuggestionApplyText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
  },

  // ============================================
  // ACTION BUTTONS
  // ============================================
  actionButtons: {
    gap: GUIDE_SPACING.md,
    marginTop: GUIDE_SPACING.lg,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    ...GUIDE_SHADOWS.md,
  },
  editButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },
  // Save button — text changed to dark brown for WCAG AA contrast
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    ...GUIDE_SHADOWS.md,
  },
  saveButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: "#3D2000", // Dark brown for contrast on gold background
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.creamElevated,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  cancelButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamLabel,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.creamElevated,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.error,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },

  // ============================================
  // STEP NAVIGATION BUTTONS (Create mode)
  // ============================================
  stepNavigation: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
    marginTop: GUIDE_SPACING.xl,
  },
  stepNavButtonPrimary: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    ...GUIDE_SHADOWS.md,
  },
  stepNavButtonFull: {
    flex: 1,
  },
  stepNavButtonPrimaryText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: "#3D2000", // Dark brown for WCAG AA contrast on gold
  },
  stepNavButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.creamElevated,
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  stepNavButtonSecondaryText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamLabel,
  },
});
