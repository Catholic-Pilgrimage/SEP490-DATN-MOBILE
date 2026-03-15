/**
 * OfflineDownloadModal - Modal for downloading offline data
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";

interface OfflineDownloadModalProps {
  visible: boolean;
  onClose: () => void;
  downloading: boolean;
  progress?: {
    total: number;
    downloaded: number;
    currentStep: string;
  };
  success?: boolean;
  error?: string;
}

export const OfflineDownloadModal: React.FC<OfflineDownloadModalProps> = ({
  visible,
  onClose,
  downloading,
  progress,
  success,
  error,
}) => {
  const { t } = useTranslation();
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      scaleAnim.setValue(0);
    }
  }, [scaleAnim, visible]);

  useEffect(() => {
    if (progress) {
      const percentage = (progress.downloaded / progress.total) * 100;
      Animated.timing(progressAnim, {
        toValue: percentage,
        duration: 300,
        useNativeDriver: false,
      }).start();
    }
  }, [progress, progressAnim]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[styles.modal, { transform: [{ scale: scaleAnim }] }]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F9FAFB"]}
            style={styles.gradient}
          >
            {/* Icon */}
            <View style={styles.iconContainer}>
              {downloading && (
                <Ionicons name="cloud-download" size={48} color="#3B82F6" />
              )}
              {success && (
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              )}
              {error && (
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              )}
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {downloading &&
                t("offline.downloading", {
                  defaultValue: "Đang tải dữ liệu ngoại tuyến",
                })}
              {success &&
                t("offline.downloadSuccess", {
                  defaultValue: "Tải thành công!",
                })}
              {error &&
                t("offline.downloadError", { defaultValue: "Tải thất bại" })}
            </Text>

            {/* Progress */}
            {downloading && progress && (
              <>
                <Text style={styles.step}>{progress.currentStep}</Text>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: progressWidth },
                    ]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {progress.downloaded} / {progress.total}
                </Text>
              </>
            )}

            {/* Success Message */}
            {success && (
              <Text style={styles.message}>
                {t("offline.downloadSuccessMsg", {
                  defaultValue:
                    "Bạn có thể xem kế hoạch này khi không có kết nối mạng",
                })}
              </Text>
            )}

            {/* Error Message */}
            {error && <Text style={styles.errorMessage}>{error}</Text>}

            {/* Close Button */}
            {!downloading && (
              <TouchableOpacity style={styles.button} onPress={onClose}>
                <Text style={styles.buttonText}>
                  {t("common.close", { defaultValue: "Đóng" })}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modal: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 20,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 10,
  },
  gradient: {
    padding: 24,
    alignItems: "center",
  },
  iconContainer: {
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
    marginBottom: 12,
    textAlign: "center",
  },
  step: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    textAlign: "center",
  },
  progressBar: {
    width: "100%",
    height: 8,
    backgroundColor: "#E5E7EB",
    borderRadius: 4,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#3B82F6",
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 16,
  },
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  errorMessage: {
    fontSize: 14,
    color: "#EF4444",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  button: {
    backgroundColor: "#3B82F6",
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 12,
    minWidth: 120,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
  },
});
