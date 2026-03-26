import { Platform, StyleSheet } from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { PREMIUM_COLORS } from "../constants";

export const styles = StyleSheet.create({
  /** Nền kem — phần dưới hero + transition mềm */
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.creamBg,
  },

  // Image Container
  imageContainer: {
    width: "100%",
    aspectRatio: 4 / 3,
    backgroundColor: "#000",
    position: "relative",
    zIndex: 1,
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  /** Vùng chạm mở lightbox phóng to ảnh */
  imagePressable: {
    width: "100%",
    height: "100%",
  },
  /**
   * Hero 4:3 — YouTube 16:9: căn giữa theo chiều dọc, tránh khoảng đen lệch một phía
   * (iframe full trước đây gây letterbox trong WebView).
   */
  youtubeHeroShell: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  /** Khung 16:9 full chiều ngang, cao suy ra từ tỷ lệ — nằm giữa vùng đen */
  youtubeEmbedFrame: {
    width: "100%",
    aspectRatio: 16 / 9,
    minHeight: 0,
    minWidth: 0,
    alignSelf: "stretch",
  },
  youtubeInlinePlaceholder: {
    width: "100%",
    aspectRatio: 16 / 9,
    alignSelf: "stretch",
    backgroundColor: "#000",
  },
  replaceOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 5,
  },
  replaceOverlayText: {
    marginTop: GUIDE_SPACING.sm,
    color: "rgba(255,255,255,0.9)",
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
  },
  /** Chỉ tối viền trên — phần giữa ảnh/video vẫn trong suốt */
  topGradientScrim: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 88,
    zIndex: 4,
  },
  /** Viền dưới — hòa vào nền kem của panel chồng */
  bottomGradientScrim: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 88,
    zIndex: 4,
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
  headerRightCluster: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.38)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.35,
        shadowRadius: 4,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  /** Nút fullscreen mô hình 3D — nổi bật trên nền tối */
  headerButtonModel3d: {
    backgroundColor: PREMIUM_COLORS.gold,
    borderColor: "rgba(0,0,0,0.14)",
    borderWidth: 1,
  },
  /** CTA phía trên panel — chỉ mô hình 3D */
  model3dFullscreenCtaWrap: {
    position: "absolute",
    left: GUIDE_SPACING.md,
    right: GUIDE_SPACING.md,
    alignItems: "center",
    zIndex: 8,
    pointerEvents: "box-none",
  },
  /** Viền kính nhẹ quanh badge trạng thái — tách khỏi nền ảnh */
  statusBadgeShell: {
    borderRadius: GUIDE_BORDER_RADIUS.md,
    paddingHorizontal: 4,
    paddingVertical: 3,
    backgroundColor: "rgba(0,0,0,0.22)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.28)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
      },
      android: { elevation: 3 },
    }),
  },

  // Media Type Badge
  mediaTypeBadge: {
    position: "absolute",
    bottom: GUIDE_SPACING.md,
    left: GUIDE_SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.22)",
    zIndex: 9,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.25,
        shadowRadius: 2,
      },
      android: { elevation: 4 },
    }),
  },
  mediaTypeBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },

  /** YouTube hero: overlay giữa — tap mở fullscreen */
  youtubePlayOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.25)",
    zIndex: 6,
  },
  youtubePlayCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.4)",
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.45,
        shadowRadius: 10,
      },
      android: { elevation: 10 },
    }),
  },

  // Play Button
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -38,
    marginLeft: -38,
    width: 76,
    height: 76,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.38)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 8,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.4,
        shadowRadius: 8,
      },
      android: { elevation: 8 },
    }),
  },

  // Content Panel — kem + overlap hero; marginTop chỉ nhẹ hơn -22 để bo góc không che quá nhiều ảnh
  contentPanel: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.creamPanel,
    marginTop: -12,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    zIndex: 2,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: "#2A2118",
        shadowOffset: { width: 0, height: -6 },
        shadowOpacity: 0.14,
        shadowRadius: 14,
      },
      android: {
        elevation: 10,
      },
    }),
  },
  dragHandleContainer: {
    alignItems: "center",
    paddingTop: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.xs,
  },
  dragHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUIDE_COLORS.creamHandle,
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
    color: GUIDE_COLORS.creamLabel,
  },
  captionEditHint: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    lineHeight: 18,
    color: GUIDE_COLORS.creamMuted,
    marginBottom: GUIDE_SPACING.sm,
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
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamInk,
    lineHeight: 24,
  },

  // Replace image file (pending / rejected)
  replaceFileSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  replaceFileLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamLabel,
    marginBottom: GUIDE_SPACING.sm,
  },
  replaceFileButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: `${GUIDE_COLORS.primary}40`,
    backgroundColor: `${GUIDE_COLORS.primary}08`,
  },
  replaceFileButtonDisabled: {
    opacity: 0.55,
  },
  replaceFileButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.primary,
  },
  replaceFileHint: {
    marginTop: GUIDE_SPACING.sm,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
    lineHeight: 18,
  },

  // Edit Caption
  editCaptionContainer: {
    gap: GUIDE_SPACING.md,
  },
  captionInput: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primary,
    padding: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.creamInk,
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
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  cancelButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamLabel,
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
    alignSelf: "center",
    gap: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    marginTop: GUIDE_SPACING.xl,
    marginBottom: GUIDE_SPACING.lg,
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 13,
    fontWeight: "500" as const,
    color: GUIDE_COLORS.creamMuted,
  },

  // Approved Notice
  approvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  approvedNoticeText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
  },

  // Metadata Section
  metadataSection: {
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  metadataTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.creamLabel,
    marginBottom: GUIDE_SPACING.md,
  },
  metadataRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
  },
  metadataLabel: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamMuted,
  },
  metadataValue: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.creamInk,
  },
  metadataDivider: {
    height: 1,
    backgroundColor: GUIDE_COLORS.creamBorder,
    marginVertical: 2,
  },

  // Video Error Fallback
  videoErrorFallback: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#111",
  },
  videoErrorText: {
    color: "rgba(255,255,255,0.5)",
    marginTop: GUIDE_SPACING.sm,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
  },
});
