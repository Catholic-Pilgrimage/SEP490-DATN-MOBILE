import { Dimensions, StyleSheet } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SPACING,
    GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

export const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Image Container
  imageContainer: {
    width: "100%",
    height: SCREEN_WIDTH,
    backgroundColor: "#000",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  // Header
  header: {
    position: "absolute",
    left: GUIDE_SPACING.lg,
    right: GUIDE_SPACING.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Media Type Badge
  mediaTypeBadge: {
    position: "absolute",
    bottom: GUIDE_SPACING.md,
    left: GUIDE_SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mediaTypeBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },

  // Play Button
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
  },

  // Content Panel
  contentPanel: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    marginTop: 0,
  },
  scrollContent: {
    padding: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.xl,
  },

  // Rejection Container
  rejectionContainer: {
    backgroundColor: GUIDE_COLORS.errorLight,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: `${GUIDE_COLORS.error}30`,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.sm,
  },
  rejectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.error,
  },
  rejectionReason: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.error,
    lineHeight: 20,
  },

  // Caption Section
  captionSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  captionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.sm,
  },
  captionLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textSecondary,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(216, 126, 14, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  editButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: "#D87E0E",
  },
  captionText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    lineHeight: 24,
  },

  // Edit Caption
  editCaptionContainer: {
    gap: GUIDE_SPACING.md,
  },
  captionInput: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primary,
    padding: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: GUIDE_SPACING.sm,
    marginTop: GUIDE_SPACING.xs,
  },
  cancelButton: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.gray100,
  },
  cancelButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textSecondary,
  },
  saveButton: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "#D87E0E",
    minWidth: 80,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: GUIDE_COLORS.gray300,
  },
  saveButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: "#FFF",
  },

  // Delete Button
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "rgba(244, 67, 54, 0.08)",
    marginBottom: GUIDE_SPACING.lg,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.error,
  },

  // Approved Notice
  approvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.gray100,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
  },
  approvedNoticeText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
  },
});
