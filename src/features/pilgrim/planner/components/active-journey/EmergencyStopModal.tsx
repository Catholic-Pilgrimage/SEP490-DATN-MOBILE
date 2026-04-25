import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { COLORS, SHADOWS } from "../../../../../constants/theme.constants";

interface Props {
  visible: boolean;
  planName?: string;
  onClose: () => void;
  /** Gọi khi người dùng xác nhận dừng; trả về sau khi API hoàn tất */
  onConfirm: (cancelledReason: string) => Promise<void>;
  isLoading: boolean;
}

export default function EmergencyStopModal({
  visible,
  planName,
  onClose,
  onConfirm,
  isLoading,
}: Props) {
  const [reason, setReason] = useState("");
  const [inputError, setInputError] = useState("");

  useEffect(() => {
    if (!visible) {
      setReason("");
      setInputError("");
    }
  }, [visible]);

  const handleClose = () => {
    if (isLoading) return;
    onClose();
  };

  const handleConfirm = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setInputError("Vui lòng nhập lý do dừng khẩn cấp.");
      return;
    }
    if (trimmed.length < 10) {
      setInputError("Lý do cần ít nhất 10 ký tự.");
      return;
    }
    setInputError("");
    await onConfirm(trimmed);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.root}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <Pressable style={styles.overlay} onPress={handleClose} />
        <SafeAreaView
          edges={["bottom"]}
          style={styles.safeArea}
          pointerEvents="box-none"
        >
          <Pressable
            style={styles.card}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={styles.header}>
              <View style={styles.iconCircle}>
                <Ionicons name="stop-circle" size={30} color="#fff" />
              </View>
              <View style={styles.headerText}>
                <Text style={styles.title}>Dừng khẩn cấp hành trình</Text>
                {!!planName && (
                  <Text style={styles.planName} numberOfLines={1}>
                    {planName}
                  </Text>
                )}
              </View>
            </View>

            {/* Warning banner */}
            <View style={styles.warningBanner}>
              <Ionicons name="warning-outline" size={16} color="#92400E" />
              <Text style={styles.warningText}>
                Hành trình sẽ bị hủy ngay lập tức. Các điểm chưa viếng sẽ được
                bỏ qua và toàn bộ thành viên sẽ nhận thông báo.
              </Text>
            </View>

            {/* Reason input */}
            <Text style={styles.label}>
              Lý do dừng khẩn cấp{" "}
              <Text style={styles.required}>*</Text>
            </Text>
            <TextInput
              style={[
                styles.input,
                !!inputError && styles.inputError,
              ]}
              value={reason}
              onChangeText={(t) => {
                setReason(t);
                if (inputError) setInputError("");
              }}
              placeholder="Mô tả rõ lý do (thời tiết, sức khỏe, sự cố...)&#10;Tối thiểu 10 ký tự"
              placeholderTextColor={COLORS.textTertiary}
              multiline
              textAlignVertical="top"
              editable={!isLoading}
              maxLength={500}
            />
            <View style={styles.inputFooter}>
              {!!inputError ? (
                <Text style={styles.errorText}>{inputError}</Text>
              ) : (
                <View />
              )}
              <Text style={styles.charCount}>{reason.length}/500</Text>
            </View>

            {/* Action buttons */}
            <View style={styles.actions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={handleClose}
                disabled={isLoading}
                activeOpacity={0.75}
              >
                <Text style={styles.cancelText}>Hủy bỏ</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.confirmBtn,
                  isLoading && styles.confirmBtnDisabled,
                ]}
                onPress={() => void handleConfirm()}
                disabled={isLoading}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="stop-circle" size={17} color="#fff" />
                    <Text style={styles.confirmText}>Xác nhận dừng</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </SafeAreaView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.62)",
  },
  safeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 18,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    ...SHADOWS.large,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 14,
  },
  iconCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    elevation: 5,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1F1F1F",
    letterSpacing: 0.2,
  },
  planName: {
    marginTop: 2,
    fontSize: 13,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },

  // Warning banner
  warningBanner: {
    flexDirection: "row",
    gap: 8,
    backgroundColor: "#FEF3C7",
    borderRadius: 10,
    borderLeftWidth: 3,
    borderLeftColor: "#D97706",
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 16,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: "#78350F",
    fontWeight: "500",
  },

  // Input
  label: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  required: {
    color: "#DC2626",
  },
  input: {
    minHeight: 96,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface0,
  },
  inputError: {
    borderColor: "#DC2626",
    backgroundColor: "#FFF5F5",
  },
  inputFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
    marginBottom: 16,
    minHeight: 18,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "600",
    flex: 1,
  },
  charCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 8,
  },

  // Actions
  actions: {
    flexDirection: "row",
    gap: 10,
  },
  cancelBtn: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 1.5,
    height: 46,
    borderRadius: 12,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    gap: 7,
    shadowColor: "#DC2626",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.35,
    shadowRadius: 6,
    elevation: 4,
  },
  confirmBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowColor: "#9CA3AF",
    shadowOpacity: 0.15,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
