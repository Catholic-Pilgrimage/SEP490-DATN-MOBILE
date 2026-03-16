/**
 * OfflineDownloadModal - Modal for downloading offline data
 */
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useRef, useState } from "react";
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
  const [modalVisible, setModalVisible] = useState(false);
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;
  const iconPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const cardFloatLoop = useRef<Animated.CompositeAnimation | null>(null);
  const isAnimatingOut = useRef(false);

  const mode = downloading
    ? "downloading"
    : success
      ? "success"
      : error
        ? "error"
        : "idle";

  useEffect(() => {
    const stopLoops = () => {
      iconPulseLoop.current?.stop();
      cardFloatLoop.current?.stop();
      iconPulseLoop.current = null;
      cardFloatLoop.current = null;
    };

    const animateIn = () => {
      isAnimatingOut.current = false;
      stopLoops();
      setModalVisible(true);
      overlayOpacity.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(80);
      iconPulse.setValue(1);
      cardFloat.setValue(0);

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 4,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        iconPulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(iconPulse, {
              toValue: 1.1,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(iconPulse, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        );
        iconPulseLoop.current.start();

        cardFloatLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(cardFloat, {
              toValue: -4,
              duration: 1400,
              useNativeDriver: true,
            }),
            Animated.timing(cardFloat, {
              toValue: 4,
              duration: 1400,
              useNativeDriver: true,
            }),
          ]),
        );
        cardFloatLoop.current.start();
      });
    };

    const animateOut = (afterClose?: () => void) => {
      if (isAnimatingOut.current) {
        return;
      }

      isAnimatingOut.current = true;
      stopLoops();

      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardScale, {
          toValue: 0.3,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(cardTranslateY, {
          toValue: 80,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setModalVisible(false);
        iconPulse.setValue(1);
        cardFloat.setValue(0);
        isAnimatingOut.current = false;
        afterClose?.();
      });
    };

    if (visible && !modalVisible && !isAnimatingOut.current) {
      animateIn();
    } else if (!visible && modalVisible) {
      animateOut();
    }

    return () => {
      stopLoops();
    };
  }, [
    cardFloat,
    cardOpacity,
    cardScale,
    cardTranslateY,
    iconPulse,
    modalVisible,
    overlayOpacity,
    visible,
  ]);

  useEffect(() => {
    if (!visible || !progress) {
      progressAnim.setValue(0);
      return;
    }

    const percentage = (progress.downloaded / progress.total) * 100;
    Animated.timing(progressAnim, {
      toValue: percentage,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [progress, progressAnim, visible]);

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 100],
    outputRange: ["0%", "100%"],
  });

  const handleClose = () => {
    if (downloading) {
      return;
    }

    if (!modalVisible) {
      onClose();
      return;
    }

    isAnimatingOut.current = true;
    iconPulseLoop.current?.stop();
    cardFloatLoop.current?.stop();
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setModalVisible(false);
      iconPulse.setValue(1);
      cardFloat.setValue(0);
      isAnimatingOut.current = false;
      onClose();
    });
  };

  return (
    <Modal
      visible={modalVisible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
        <Animated.View
          style={[
            styles.modal,
            {
              opacity: cardOpacity,
              transform: [
                { scale: cardScale },
                { translateY: Animated.add(cardTranslateY, cardFloat) },
              ],
            },
          ]}
        >
          <LinearGradient
            colors={["#FFFFFF", "#F9FAFB"]}
            style={styles.gradient}
          >
            <Animated.View
              style={[styles.iconContainer, { transform: [{ scale: iconPulse }] }]}
            >
              {mode === "downloading" && (
                <Ionicons name="cloud-download" size={48} color="#3B82F6" />
              )}
              {mode === "success" && (
                <Ionicons name="checkmark-circle" size={48} color="#10B981" />
              )}
              {mode === "error" && (
                <Ionicons name="close-circle" size={48} color="#EF4444" />
              )}
            </Animated.View>

            <Text style={styles.title}>
              {mode === "downloading" &&
                t("offline.downloading", {
                  defaultValue: "Downloading offline data",
                })}
              {mode === "success" &&
                t("offline.downloadSuccess", {
                  defaultValue: "Download successful!",
                })}
              {mode === "error" &&
                t("offline.downloadError", { defaultValue: "Download failed" })}
            </Text>

            {mode === "downloading" && progress && (
              <>
                <Text style={styles.step}>{progress.currentStep}</Text>
                <View style={styles.progressBar}>
                  <Animated.View
                    style={[styles.progressFill, { width: progressWidth }]}
                  />
                </View>
                <Text style={styles.progressText}>
                  {t("common.step", { defaultValue: "Step" })}{" "}
                  {progress.downloaded} / {progress.total}
                </Text>
              </>
            )}

            {mode === "success" && (
              <Text style={styles.message}>
                {t("offline.downloadSuccessMsg", {
                  defaultValue:
                    "You can view this plan when offline",
                })}
              </Text>
            )}

            {mode === "error" && <Text style={styles.errorMessage}>{error}</Text>}

            {mode !== "downloading" && (
              <TouchableOpacity
                style={styles.button}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.buttonText}>
                  {t("common.close", { defaultValue: "Close" })}
                </Text>
              </TouchableOpacity>
            )}
          </LinearGradient>
        </Animated.View>
      </Animated.View>
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
