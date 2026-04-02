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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.creamInk,
  },
  headerSpacer: {
    width: 40,
  },

  // Progress
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingVertical: GUIDE_SPACING.md,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.gray200,
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepActive: {
    backgroundColor: GUIDE_COLORS.primary,
  },
  progressStepText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.gray500,
  },
  progressStepTextActive: {
    color: GUIDE_COLORS.surface,
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: GUIDE_COLORS.gray200,
    marginHorizontal: GUIDE_SPACING.sm,
  },
  progressLineActive: {
    backgroundColor: GUIDE_COLORS.primary,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  contentArea: {
    flex: 1,
  },
  scrollContent: {
    padding: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.xxxl,
  },

  // Step Content
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 24,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
  },
  stepSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textMuted,
    marginBottom: GUIDE_SPACING.xl,
  },

  // Type Selection
  typeList: {
    gap: GUIDE_SPACING.md,
  },
  typeCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    ...GUIDE_SHADOWS.sm,
  },
  typeIconContainer: {
    width: 56,
    height: 56,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    marginRight: GUIDE_SPACING.md,
  },
  typeCardContent: {
    flex: 1,
  },
  typeCardLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamInk,
    marginBottom: 2,
  },
  typeCardDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
  },

  // URL Input
  urlInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    paddingHorizontal: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.xl,
  },
  urlInputIcon: {
    marginRight: GUIDE_SPACING.sm,
  },
  urlInput: {
    flex: 1,
    height: 56,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamInk,
  },
  continueButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.md,
  },
  continueButtonDisabled: {
    backgroundColor: GUIDE_COLORS.gray300,
  },
  continueButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },

  // Preview
  previewContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.creamElevated,
    marginBottom: GUIDE_SPACING.lg,
    position: "relative",
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  previewTypeBadge: {
    position: "absolute",
    top: GUIDE_SPACING.md,
    left: GUIDE_SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 6,
    paddingHorizontal: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  previewTypeBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  // Caption
  captionContainer: {
    marginBottom: GUIDE_SPACING.lg,
  },
  captionLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamLabel,
    marginBottom: GUIDE_SPACING.sm,
  },
  captionInput: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    padding: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamInk,
    minHeight: 100,
    textAlignVertical: "top",
  },
  captionCount: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamMuted,
    textAlign: "right",
    marginTop: GUIDE_SPACING.xs,
  },

  // Status Notice
  statusNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.warningLight,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.xl,
  },
  statusNoticeText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.warning,
  },

  // Submit
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.md,
  },
  submitButtonDisabled: {
    backgroundColor: GUIDE_COLORS.gray400,
  },
  submitButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.surface,
  },
});
