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
    backgroundColor: GUIDE_COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.gray100,
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
    color: GUIDE_COLORS.textPrimary,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
  },

  // Sections
  section: {
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textSecondary,
    marginBottom: GUIDE_SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Banner
  bannerSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  bannerContainer: {
    width: "100%",
    height: 180,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.gray100,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerPlaceholderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.gray400,
    marginTop: GUIDE_SPACING.xs,
  },
  bannerEditOverlay: {
    position: "absolute",
    bottom: GUIDE_SPACING.sm,
    right: GUIDE_SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Input Field
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
    color: GUIDE_COLORS.textPrimary,
  },
  required: {
    color: GUIDE_COLORS.error,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    paddingHorizontal: GUIDE_SPACING.sm,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: GUIDE_COLORS.gray100,
  },
  inputIcon: {
    marginRight: GUIDE_SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    paddingVertical: GUIDE_SPACING.sm,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  placeholder: {
    color: GUIDE_COLORS.gray400,
  },
  charCount: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    textAlign: "right",
    marginTop: 4,
  },

  // Row layout
  row: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  halfField: {
    flex: 1,
  },

  // Rejection Box
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

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.gray100,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    marginBottom: GUIDE_SPACING.lg,
  },
  infoText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textMuted,
    flex: 1,
  },

  // Action Buttons
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
    color: GUIDE_COLORS.surface,
  },
  cancelButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.surface,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray300,
  },
  cancelButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textSecondary,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.surface,
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

  // Header Right
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  editHeaderButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
});
