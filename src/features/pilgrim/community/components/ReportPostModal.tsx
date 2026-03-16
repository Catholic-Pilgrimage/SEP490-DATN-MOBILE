import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import reportApi from "../../../../services/api/shared/reportApi";
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

const REPORT_REASONS: ReasonOption[] = [
  {
    value: "spam",
    icon: "block",
    label: "Spam",
    description: "Nội dung quảng cáo, lặp lại hoặc không liên quan",
  },
  {
    value: "harassment",
    icon: "person-off",
    label: "Quấy rối",
    description: "Bắt nạt, đe dọa hoặc quấy rối người khác",
  },
  {
    value: "hate_speech",
    icon: "do-not-disturb",
    label: "Ngôn từ thù ghét",
    description: "Phân biệt đối xử, kỳ thị tôn giáo hoặc sắc tộc",
  },
  {
    value: "false_information",
    icon: "report-gmailerrorred",
    label: "Thông tin sai lệch",
    description: "Tin giả, thông tin gây hiểu lầm",
  },
  {
    value: "violence",
    icon: "warning",
    label: "Bạo lực",
    description: "Nội dung bạo lực hoặc kích động bạo lực",
  },
  {
    value: "nudity",
    icon: "visibility-off",
    label: "Nội dung không phù hợp",
    description: "Hình ảnh hoặc nội dung khiêu dâm, phản cảm",
  },
  {
    value: "scam",
    icon: "gpp-bad",
    label: "Lừa đảo",
    description: "Lừa đảo tài chính hoặc giả mạo danh tính",
  },
  {
    value: "other",
    icon: "more-horiz",
    label: "Lý do khác",
    description: "Lý do không nằm trong danh sách trên",
  },
];

const ReportPostModal: React.FC<ReportPostModalProps> = ({
  visible,
  onClose,
  targetId,
  targetType = "post",
}) => {
  const { t } = useTranslation();
  const { height: SCREEN_HEIGHT } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const [step, setStep] = useState<"reason" | "detail">("reason");
  const [selectedReason, setSelectedReason] = useState<ReportReason | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const slideAnim = React.useRef(new Animated.Value(0)).current;
  const overlayOpacity = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
    if (visible) {
      slideAnim.setValue(SCREEN_HEIGHT);
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
  }, [visible, slideAnim, overlayOpacity, SCREEN_HEIGHT]);

  const animateClose = useCallback(() => {
    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
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
  }, [slideAnim, overlayOpacity, SCREEN_HEIGHT, onClose]);

  const handleSelectReason = (reason: ReportReason) => {
    setSelectedReason(reason);
    setStep("detail");
  };

  const handleSubmit = async () => {
    if (!selectedReason) return;

    setSubmitting(true);
    try {
      const res = await reportApi.createReport({
        target_type: targetType,
        target_id: targetId,
        reason: selectedReason,
        description: description.trim() || undefined,
      });

      if (res.success || res.data) {
        Toast.show({
          type: "success",
          text1: t("report.successTitle", { defaultValue: "Đã gửi báo cáo" }),
          text2: t("report.successMessage", {
            defaultValue: "Cảm ơn bạn đã báo cáo. Chúng tôi sẽ xem xét nội dung này.",
          }),
        });
        animateClose();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Lỗi" }),
          text2: res.message || t("report.errorMessage", {
            defaultValue: "Không thể gửi báo cáo. Vui lòng thử lại.",
          }),
        });
      }
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("report.errorMessage", {
          defaultValue: "Không thể gửi báo cáo. Vui lòng thử lại.",
        });
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Lỗi" }),
        text2: message,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal visible transparent animationType="none" statusBarTranslucent>
      <View style={styles.modalRoot}>
        <TouchableWithoutFeedback onPress={animateClose}>
          <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
        </TouchableWithoutFeedback>

        <Animated.View
          style={[
            styles.sheet,
            {
              maxHeight: SCREEN_HEIGHT * 0.85,
              minHeight: SCREEN_HEIGHT * 0.6,
              paddingBottom: insets.bottom,
              transform: [{ translateY: slideAnim }],
            },
          ]}
        >
          {/* Handle bar */}
          <View style={styles.handleBar}>
            <View style={styles.handle} />
          </View>

          {/* Header */}
          <View style={styles.header}>
            {step === "detail" && (
              <TouchableOpacity
                onPress={() => setStep("reason")}
                style={styles.headerBackBtn}
              >
                <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
              </TouchableOpacity>
            )}
            <Text style={styles.headerTitle}>
              {step === "reason"
                ? t("report.title", { defaultValue: "Báo cáo" })
                : t("report.detailTitle", { defaultValue: "Chi tiết báo cáo" })}
            </Text>
            <TouchableOpacity onPress={animateClose} style={styles.headerCloseBtn}>
              <Ionicons name="close" size={24} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.divider} />

          {step === "reason" ? (
            <>
              {/* Subtitle */}
              <View style={styles.subtitleContainer}>
                <MaterialIcons name="flag" size={20} color={COLORS.danger} />
                <Text style={styles.subtitle}>
                  {t("report.selectReason", {
                    defaultValue: "Vui lòng chọn lý do báo cáo",
                  })}
                </Text>
              </View>

              {/* Reason list */}
              <ScrollView
                style={styles.reasonList}
                showsVerticalScrollIndicator={false}
              >
                {REPORT_REASONS.map((reason) => (
                  <TouchableOpacity
                    key={reason.value}
                    style={styles.reasonItem}
                    onPress={() => handleSelectReason(reason.value)}
                    activeOpacity={0.6}
                  >
                    <View style={styles.reasonIconContainer}>
                      <MaterialIcons
                        name={reason.icon as any}
                        size={22}
                        color={COLORS.textSecondary}
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
                ))}
                <View style={{ height: Math.max(insets.bottom, SPACING.lg) }} />
              </ScrollView>
            </>
          ) : (
            <>
              {/* Selected reason badge */}
              <View style={styles.selectedReasonContainer}>
                <View style={styles.selectedReasonBadge}>
                  <MaterialIcons name="flag" size={16} color={COLORS.danger} />
                  <Text style={styles.selectedReasonText}>
                    {REPORT_REASONS.find((r) => r.value === selectedReason)?.label}
                  </Text>
                </View>
              </View>

              {/* Description input */}
              <View style={styles.detailContainer}>
                <Text style={styles.detailLabel}>
                  {t("report.descriptionLabel", {
                    defaultValue: "Mô tả thêm (không bắt buộc)",
                  })}
                </Text>
                <TextInput
                  style={styles.detailInput}
                  value={description}
                  onChangeText={setDescription}
                  placeholder={t("report.descriptionPlaceholder", {
                    defaultValue:
                      "Cung cấp thêm thông tin để giúp chúng tôi hiểu vấn đề...",
                  })}
                  placeholderTextColor={COLORS.textTertiary}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />
                <Text style={styles.charCount}>
                  {description.length}/500
                </Text>
              </View>

              {/* Submit button */}
              <View style={[styles.submitContainer, { paddingBottom: Math.max(insets.bottom, SPACING.lg) }]}>
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
                        {t("report.submit", { defaultValue: "Gửi báo cáo" })}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ReportPostModal;

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
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

  // Header
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

  // Subtitle
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

  // Reason list
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

  // Step 2: Detail
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

  // Submit
  submitContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
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
