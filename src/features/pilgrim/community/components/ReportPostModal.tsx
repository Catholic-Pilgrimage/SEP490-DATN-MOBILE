import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import type { TFunction } from "i18next";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { createReport } from "../../../../services/api/shared/reportApi";
import { ReportReason, ReportTargetType } from "../../../../types/report.types";

interface ReportPostModalProps {
  visible: boolean;
  onClose: () => void;
  targetId: string;
  targetType?: ReportTargetType;
}

interface ReasonOption {
  value: ReportReason;
  icon: string;
  label: string;
  description: string;
}

const getReasonPalette = (reason: ReportReason) => {
  switch (reason) {
    case "spam":
      return {
        icon: "#B45309",
        background: "rgba(245, 158, 11, 0.18)",
        border: "rgba(180, 83, 9, 0.35)",
      };
    case "harassment":
      return {
        icon: "#7C3AED",
        background: "rgba(124, 58, 237, 0.16)",
        border: "rgba(124, 58, 237, 0.32)",
      };
    case "hate_speech":
      return {
        icon: "#DC2626",
        background: "rgba(220, 38, 38, 0.14)",
        border: "rgba(220, 38, 38, 0.3)",
      };
    case "false_information":
      return {
        icon: "#2563EB",
        background: "rgba(37, 99, 235, 0.14)",
        border: "rgba(37, 99, 235, 0.28)",
      };
    case "violence":
      return {
        icon: "#B91C1C",
        background: "rgba(185, 28, 28, 0.15)",
        border: "rgba(185, 28, 28, 0.32)",
      };
    case "inappropriate":
      return {
        icon: "#DB2777",
        background: "rgba(219, 39, 119, 0.13)",
        border: "rgba(219, 39, 119, 0.28)",
      };
    case "scam":
      return {
        icon: "#0D9488",
        background: "rgba(13, 148, 136, 0.14)",
        border: "rgba(13, 148, 136, 0.3)",
      };
    case "other":
    default:
      return {
        icon: "#64748B",
        background: "rgba(100, 116, 139, 0.12)",
        border: "rgba(100, 116, 139, 0.26)",
      };
  }
};

const getReportReasons = (t: TFunction): ReasonOption[] => [
  {
    value: "spam",
    icon: "block",
    label: t("report.reasons.spam.label", { defaultValue: "Spam" }),
    description: t("report.reasons.spam.description", {
      defaultValue: "Advertising, repeated, or irrelevant content",
    }),
  },
  {
    value: "harassment",
    icon: "person-off",
    label: t("report.reasons.harassment.label", { defaultValue: "Harassment" }),
    description: t("report.reasons.harassment.description", {
      defaultValue: "Bullying, threats, or harassment toward others",
    }),
  },
  {
    value: "hate_speech",
    icon: "do-not-disturb",
    label: t("report.reasons.hateSpeech.label", {
      defaultValue: "Hate speech",
    }),
    description: t("report.reasons.hateSpeech.description", {
      defaultValue: "Discrimination or attacks based on religion or ethnicity",
    }),
  },
  {
    value: "false_information",
    icon: "report-gmailerrorred",
    label: t("report.reasons.falseInformation.label", {
      defaultValue: "False information",
    }),
    description: t("report.reasons.falseInformation.description", {
      defaultValue: "Fake or misleading information",
    }),
  },
  {
    value: "violence",
    icon: "warning",
    label: t("report.reasons.violence.label", { defaultValue: "Violence" }),
    description: t("report.reasons.violence.description", {
      defaultValue: "Violent content or incitement to violence",
    }),
  },
  {
    value: "inappropriate",
    icon: "visibility-off",
    label: t("report.reasons.inappropriate.label", {
      defaultValue: "Inappropriate content",
    }),
    description: t("report.reasons.inappropriate.description", {
      defaultValue: "Sexual, explicit, or sensitive imagery/content",
    }),
  },
  {
    value: "scam",
    icon: "gpp-bad",
    label: t("report.reasons.scam.label", { defaultValue: "Scam" }),
    description: t("report.reasons.scam.description", {
      defaultValue: "Financial scams or impersonation",
    }),
  },
  {
    value: "other",
    icon: "more-horiz",
    label: t("report.reasons.other.label", { defaultValue: "Other reason" }),
    description: t("report.reasons.other.description", {
      defaultValue: "A reason not listed above",
    }),
  },
];

const ReportPostModal: React.FC<ReportPostModalProps> = ({
  visible,
  onClose,
  targetId,
  targetType = "post",
}) => {
  const { t } = useTranslation();
  const { height: screenHeight } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const reportReasons = React.useMemo(() => getReportReasons(t), [t]);

  const [step, setStep] = useState<"reason" | "detail">("reason");
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(
    null,
  );
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, []);

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(screenHeight);
      overlayOpacity.setValue(0);
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          useNativeDriver: true,
          damping: 25,
          stiffness: 200,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible, slideAnim, overlayOpacity, screenHeight]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: screenHeight,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setStep("reason");
      setSelectedReason(null);
      setDescription("");
      onClose();
    });
  }, [slideAnim, overlayOpacity, screenHeight, onClose]);

  const handleSelectReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep("detail");
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    try {
      const res = await createReport({
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      if (res.success || res.data) {
        Toast.show({
          type: "success",
          text1: t("report.successTitle", { defaultValue: "Report submitted" }),
          text2: t("report.successMessage", {
            defaultValue: "Thank you. We will review this content soon.",
          }),
        });
        animateClose();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Error" }),
          text2:
            res.message ||
            t("report.errorMessage", {
              defaultValue: "Unable to submit report. Please try again.",
            }),
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("report.errorMessage", {
          defaultValue: "Unable to submit report. Please try again.",
        });
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Error" }),
        text2: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  const selectedReasonLabel = reportReasons.find(
    (reason) => reason.value === selectedReason,
  )?.label;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <TouchableWithoutFeedback onPress={animateClose}>
        <View style={styles.modalRoot}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
        </View>
      </TouchableWithoutFeedback>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={[styles.keyboardAvoidingContainer, { bottom: keyboardHeight }]}
      >
        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: keyboardHeight > 0 
                ? Math.min(screenHeight * 0.85, screenHeight - keyboardHeight - 40)
                : screenHeight * 0.85,
              minHeight: Math.min(screenHeight * 0.6, screenHeight - keyboardHeight - 40),
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          <View style={styles.header}>
            {step === "detail" && (
              <TouchableOpacity
                onPress={() => setStep("reason")}
                style={styles.headerBackBtn}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>
              {step === "reason"
                ? t("report.title", { defaultValue: "Report" })
                : t("report.detailTitle", { defaultValue: "Report details" })}
            </Text>
            <TouchableOpacity
              onPress={animateClose}
              style={styles.headerCloseBtn}
            >
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

            {step === "reason" ? (
              <>
                <View style={styles.subtitleContainer}>
                  <MaterialIcons name="flag" size={20} color={COLORS.danger} />
                  <Text style={styles.subtitle}>
                    {t("report.selectReason", {
                      defaultValue: "Please choose a reason for this report",
                    })}
                  </Text>
                </View>

                <ScrollView
                  style={styles.reasonList}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {reportReasons.map((reason) => {
                    const palette = getReasonPalette(reason.value);

                    return (
                      <TouchableOpacity
                        key={reason.value}
                        style={styles.reasonItem}
                        onPress={() => handleSelectReason(reason.value)}
                        activeOpacity={0.6}
                      >
                        <View
                          style={[
                            styles.reasonIconContainer,
                            {
                              backgroundColor: palette.background,
                              borderColor: palette.border,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name={reason.icon as any}
                            size={22}
                            color={palette.icon}
                          />
                        </View>
                        <View style={styles.reasonTextContainer}>
                          <Text style={styles.reasonLabel}>{reason.label}</Text>
                          <Text style={styles.reasonDescription}>
                            {reason.description}
                          </Text>
                        </View>
                        <Ionicons
                          name="chevron-forward"
                          size={20}
                          color={COLORS.textTertiary}
                        />
                      </TouchableOpacity>
                    );
                  })}
                  <View style={{ height: SPACING.lg }} />
                </ScrollView>
              </>
            ) : (
              <>
                <ScrollView
                  style={{ flex: 1 }}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: SPACING.md }}
                >
                  <View style={styles.selectedReasonContainer}>
                    <View style={styles.selectedReasonBadge}>
                      <MaterialIcons name="flag" size={16} color={COLORS.danger} />
                      <Text style={styles.selectedReasonText}>
                        {selectedReasonLabel}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.detailContainer}>
                    <Text style={styles.detailLabel}>
                      {t("report.descriptionLabel", {
                        defaultValue: "Additional details (optional)",
                      })}
                    </Text>
                    <TextInput
                      style={styles.detailInput}
                      value={description}
                      onChangeText={setDescription}
                      placeholder={t("report.descriptionPlaceholder", {
                        defaultValue:
                          "Add more information to help us understand the issue...",
                      })}
                      placeholderTextColor={COLORS.textTertiary}
                      multiline
                      maxLength={500}
                      textAlignVertical="top"
                    />
                    <Text style={styles.charCount}>{description.length}/500</Text>
                  </View>
                </ScrollView>

                <SafeAreaView edges={["bottom"]} style={styles.submitSafeArea}>
                  <View style={[styles.submitContainer, { marginBottom: keyboardHeight > 0 ? 8 : 0 }]}>
                    <TouchableOpacity
                      style={[
                        styles.submitButton,
                        submitting && styles.submitButtonDisabled,
                      ]}
                      onPress={handleSubmit}
                      disabled={submitting}
                      activeOpacity={0.8}
                    >
                      {submitting ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <>
                          <MaterialIcons name="send" size={18} color="#fff" />
                          <Text style={styles.submitButtonText}>
                            {t("report.submit", { defaultValue: "Send report" })}
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </SafeAreaView>
              </>
            )}
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

export default ReportPostModal;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardAvoidingContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.large,
  },
  handleBar: {
    alignItems: "center",
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.xs,
  },
  handle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.borderMedium,
    borderRadius: 2,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    position: "relative",
  },
  headerBackBtn: {
    position: "absolute",
    left: SPACING.md,
    padding: 4,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  headerCloseBtn: {
    position: "absolute",
    right: SPACING.md,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSoft,
    justifyContent: "center",
    alignItems: "center",
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
  },
  subtitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
    backgroundColor: COLORS.dangerLight,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  reasonList: {
    flex: 1,
  },
  reasonItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  reasonIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  reasonTextContainer: {
    flex: 1,
    marginRight: SPACING.sm,
  },
  reasonLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  reasonDescription: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  selectedReasonContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.sm,
  },
  selectedReasonBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 6,
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
  },
  selectedReasonText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.danger,
  },
  detailContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
  },
  detailLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  detailInput: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    paddingBottom: SPACING.md,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    minHeight: 120,
    maxHeight: 180,
    lineHeight: 22,
  },
  charCount: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
    textAlign: "right",
    marginTop: 4,
  },
  submitSafeArea: {
    backgroundColor: COLORS.white,
  },
  submitContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.white,
  },
  submitButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.danger,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
  },
});
