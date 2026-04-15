import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import { SHADOWS, SPACING } from "../../../../../constants/theme.constants";
import pilgrimSOSApi from "../../../../../services/api/pilgrim/sosApi";
import locationService from "../../../../../services/location/locationService";

interface Props {
  visible: boolean;
  onClose: () => void;
  planId: string;
  siteId?: string;
  siteName?: string;
}

export const SOSRequestModal: React.FC<Props> = ({
  visible,
  onClose,
  planId,
  siteId,
  siteName,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const bodyScrollRef = useRef<ScrollView | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const CATEGORIES = [
    {
      id: "lost",
      label: t("sos.requestModal.categories.lost", {
        defaultValue: "Lạc đoàn / Người thân",
      }),
      icon: "people",
    },
    {
      id: "health",
      label: t("sos.requestModal.categories.health", {
        defaultValue: "Vấn đề sức khỏe",
      }),
      icon: "medical",
    },
    {
      id: "item_lost",
      label: t("sos.requestModal.categories.item_lost", {
        defaultValue: "Thất lạc đồ đạc",
      }),
      icon: "briefcase",
    },
    {
      id: "direction",
      label: t("sos.requestModal.categories.direction", {
        defaultValue: "Cần chỉ dẫn gấp",
      }),
      icon: "navigate",
    },
  ];

  useEffect(() => {
    if (!visible) return;
    const timer = setTimeout(() => {
      bodyScrollRef.current?.scrollTo({ y: 0, animated: false });
    }, 0);

    return () => clearTimeout(timer);
  }, [visible]);

  const handleSubmit = async () => {
    if (!selectedCategory) {
      Toast.show({
        type: "error",
        text1: t("sos.requestModal.errors.missingCategory", {
          defaultValue: "Thiếu thông tin",
        }),
        text2: t("sos.requestModal.errors.missingCategoryMsg", {
          defaultValue: "Vui lòng chọn vấn đề bạn đang gặp phải",
        }),
      });
      return;
    }

    setSubmitting(true);
    try {
      if (!siteId) {
        throw new Error(
          t("sos.requestModal.errors.missingSite", {
            defaultValue: "Không xác định được địa điểm cứu trợ",
          }),
        );
      }

      const userLocation = await locationService.getCurrentLocation();

      const res = await pilgrimSOSApi.createSOS({
        site_id: siteId,
        message: `${CATEGORIES.find((c) => c.id === selectedCategory)?.label}. ${description.trim()}`,
        latitude: userLocation.latitude,
        longitude: userLocation.longitude,
      });

      if (res.success) {
        // Reset form
        setSelectedCategory(null);
        setDescription("");
        onClose();

        setTimeout(() => {
          Toast.show({
            type: "success",
            text1: t("sos.requestModal.success.title", {
              defaultValue: "Đã gửi yêu cầu",
            }),
            text2: t("sos.requestModal.success.message", {
              defaultValue:
                "Ban quản lý đã nhận được thông tin cứu trợ của bạn.",
            }),
          });
        }, 300);
      } else {
        throw new Error(res.message);
      }
    } catch (e: any) {
      const apiMessage: string = e?.response?.data?.message || e?.message || "";

      if (apiMessage.includes("quá xa") || apiMessage.includes("too far")) {
        Toast.show({
          type: "error",
          text1: t("sos.requestModal.errors.outOfRange", {
            defaultValue: "Ngoài phạm vi",
          }),
          text2:
            apiMessage ||
            t("sos.requestModal.errors.outOfRangeMsg", {
              defaultValue:
                "Bạn đang quá xa địa điểm này. Cần ở trong phạm vi 1 km để gửi SOS.",
            }),
          visibilityTime: 5000,
        });
      } else if (
        apiMessage.includes("already") ||
        apiMessage.includes("đang chờ")
      ) {
        Toast.show({
          type: "info",
          text1: t("sos.requestModal.errors.alreadyPending", {
            defaultValue: "Thông báo",
          }),
          text2: t("sos.requestModal.errors.alreadyPendingMsg", {
            defaultValue: "Bạn đã có một yêu cầu SOS đang chờ xử lý.",
          }),
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("sos.requestModal.errors.sendError", {
            defaultValue: "Lỗi gửi yêu cầu",
          }),
          text2:
            apiMessage ||
            t("sos.requestModal.errors.sendErrorMsg", {
              defaultValue: "Vui lòng thử lại sau",
            }),
        });
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={
          Platform.OS === "ios" ? Math.max(insets.top, 8) : 0
        }
        style={styles.overlay}
      >
        <SafeAreaView edges={["bottom"]} style={styles.safeArea}>
          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="hand-right" size={28} color="#9A3412" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>
                  {t("sos.requestModal.title", {
                    defaultValue: "Bạn cần hỗ trợ?",
                  })}
                </Text>
                <Text style={styles.subtitle}>
                  {t("sos.requestModal.subtitle", {
                    siteName:
                      siteName ||
                      t("sos.requestModal.defaultSiteName", {
                        defaultValue: "điểm đến",
                      }),
                    defaultValue:
                      "Kết nối với Ban quản lý tại {{siteName}}",
                  })}
                </Text>
              </View>
              <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                <Ionicons name="close" size={24} color="#9CA3AF" />
              </TouchableOpacity>
            </View>

            <ScrollView
              ref={bodyScrollRef}
              style={styles.body}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={styles.bodyContent}
            >
              <Text style={styles.sectionLabel}>
                {t("sos.requestModal.sectionIssue", {
                  defaultValue: "Vấn đề bạn đang gặp phải:",
                })}
              </Text>
              <View style={styles.categoryGrid}>
                {CATEGORIES.map((cat) => {
                  const isSelected = selectedCategory === cat.id;
                  return (
                    <TouchableOpacity
                      key={cat.id}
                      style={[
                        styles.categoryBtn,
                        isSelected && styles.selectedCategory,
                      ]}
                      onPress={() => setSelectedCategory(cat.id)}
                    >
                      <Ionicons
                        name={cat.icon as any}
                        size={18}
                        color={isSelected ? "#fff" : "#9A3412"}
                      />
                      <Text
                        style={[
                          styles.categoryLabel,
                          isSelected && styles.selectedCategoryText,
                        ]}
                      >
                        {cat.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <Text style={styles.sectionLabel}>
                {t("sos.requestModal.sectionDetails", {
                  defaultValue: "Chi tiết (nếu cần):",
                })}
              </Text>
              <TextInput
                style={styles.input}
                placeholder={t("sos.requestModal.detailsPlaceholder", {
                  defaultValue: "Mô tả thêm về vấn đề của bạn...",
                })}
                multiline
                numberOfLines={4}
                value={description}
                onChangeText={setDescription}
                textAlignVertical="top"
              />

              <View style={styles.locationNotice}>
                <Ionicons name="location" size={18} color="#9A3412" />
                <Text style={styles.locationText}>
                  {t("sos.requestModal.locationNotice", {
                    defaultValue:
                      "Đã đính kèm vị trí hiện tại để hỗ trợ viên tìm thấy bạn dễ dàng hơn.",
                  })}
                </Text>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(SPACING.md, insets.bottom + 4) },
              ]}
            >
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
                <Text style={styles.cancelText}>
                  {t("sos.requestModal.close", { defaultValue: "Đóng" })}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.submitBtn,
                  (!selectedCategory || submitting) && styles.disabledBtn,
                ]}
                onPress={handleSubmit}
                disabled={!selectedCategory || submitting}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="send"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                    <Text style={styles.submitText}>
                      {t("sos.requestModal.submit", {
                        defaultValue: "Gửi yêu cầu",
                      })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </SafeAreaView>
      </KeyboardAvoidingView>
      <Toast config={toastConfig} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    padding: SPACING.lg,
  },
  safeArea: {
    width: "100%",
  },
  content: {
    backgroundColor: "#fff",
    borderRadius: 24,
    ...SHADOWS.medium,
    maxHeight: "90%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  iconCircle: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "#FFF7ED",
    justifyContent: "center",
    alignItems: "center",
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.md,
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    color: "#1F2937",
  },
  subtitle: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
    lineHeight: 18,
  },
  bold: {
    fontWeight: "700",
    color: "#374151",
  },
  closeBtn: {
    padding: 4,
  },
  body: {
    paddingHorizontal: SPACING.lg,
    flexGrow: 0,
  },
  bodyContent: {
    paddingBottom: SPACING.sm,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#374151",
    marginTop: SPACING.md,
    marginBottom: 10,
  },
  categoryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  categoryBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: "#FED7AA",
    backgroundColor: "#FFF7ED",
    gap: 6,
  },
  selectedCategory: {
    backgroundColor: "#9A3412",
    borderColor: "#9A3412",
  },
  categoryLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9A3412",
  },
  selectedCategoryText: {
    color: "#fff",
  },
  input: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 14,
    height: 100,
    fontSize: 15,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  locationNotice: {
    flexDirection: "row",
    backgroundColor: "#FFF7ED",
    padding: 12,
    borderRadius: 12,
    marginTop: SPACING.lg,
    alignItems: "center",
    gap: 8,
  },
  locationText: {
    flex: 1,
    fontSize: 12,
    color: "#C2410C",
    lineHeight: 16,
  },
  footer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
  },
  submitBtn: {
    flex: 2,
    flexDirection: "row",
    height: 52,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#C2410C",
    borderRadius: 16,
    ...SHADOWS.small,
  },
  disabledBtn: {
    backgroundColor: "#D1D5DB",
  },
  submitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
  },
});
