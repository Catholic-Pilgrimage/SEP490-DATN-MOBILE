
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
    TouchableWithoutFeedback,
    View,
} from "react-native";

export type ConfirmModalType = "danger" | "warning" | "info" | "success";
export type ConfirmModalIconName = keyof typeof Ionicons.glyphMap;

interface ConfirmModalProps {
  visible: boolean;
  type?: ConfirmModalType;
  iconName?: ConfirmModalIconName;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  secondaryText?: string;
  showCancel?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  onSecondary?: () => void;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  visible,
  type = "warning",
  iconName,
  title,
  message,
  confirmText,
  cancelText,
  secondaryText,
  showCancel = true,
  onConfirm,
  onCancel,
  onSecondary,
}) => {
  const { t } = useTranslation();
  
  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible) {
      // Reset first
      overlayOpacity.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(80);
      iconPulse.setValue(1);

      // Animate IN: overlay fades, card springs up with bounce
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
        // After entry: pulse icon
        Animated.loop(
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
        ).start();
      });
    }
  }, [visible, overlayOpacity, cardScale, cardOpacity, cardTranslateY, iconPulse]);

  const handleClose = () => {
    // Animate OUT then close
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
    ]).start(() => onCancel());
  };

  const handleConfirm = () => {
    // Animate OUT then confirm
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
    ]).start(() => onConfirm());
  };

  const handleSecondary = () => {
    if (!onSecondary) return;

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
    ]).start(() => onSecondary());
  };

  const getIconConfig = () => {
    if (iconName) {
      return {
        name: iconName,
        color: getButtonColor(),
      };
    }

    switch (type) {
      case "danger":
        return { name: "trash-outline" as const, color: "#EF4444" };
      case "warning":
        return { name: "warning-outline" as const, color: "#F59E0B" };
      case "success":
        return { name: "checkmark-circle-outline" as const, color: "#10B981" };
      case "info":
        return {
          name: "information-circle-outline" as const,
          color: "#3B82F6",
        };
      default:
        return { name: "help-circle-outline" as const, color: "#6B7280" };
    }
  };

  const getButtonColor = () => {
    switch (type) {
      case "danger":
        return "#EF4444";
      case "warning":
        return "#F59E0B";
      case "success":
        return "#10B981";
      case "info":
        return "#3B82F6";
      default:
        return "#6B7280";
    }
  };

  const iconConfig = getIconConfig();
  const buttonColor = getButtonColor();
  const resolvedConfirmText =
    confirmText ?? t("common.confirm", { defaultValue: "Confirm" });
  const resolvedCancelText =
    cancelText ?? t("common.cancel", { defaultValue: "Cancel" });
  const hasSecondaryAction = Boolean(secondaryText && onSecondary);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.modal,
                {
                  opacity: cardOpacity,
                  transform: [
                    { scale: cardScale },
                    { translateY: cardTranslateY },
                  ],
                },
              ]}
            >
              <LinearGradient
                colors={["#FFFFFF", "#F9FAFB"]}
                style={styles.gradient}
              >
                <Animated.View
                  style={[
                    styles.iconContainer,
                    { transform: [{ scale: iconPulse }] },
                  ]}
                >
                  <Ionicons
                    name={iconConfig.name}
                    size={48}
                    color={iconConfig.color}
                  />
                </Animated.View>

                <Text style={styles.title}>{title}</Text>
                <Text style={styles.message}>{message}</Text>

                <View
                  style={[
                    styles.buttonContainer,
                    hasSecondaryAction && styles.buttonContainerStacked,
                  ]}
                >
                  {showCancel && (
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.cancelButton,
                        hasSecondaryAction && styles.fullWidthButton,
                      ]}
                      onPress={handleClose}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.cancelButtonText}>
                        {resolvedCancelText}
                      </Text>
                    </TouchableOpacity>
                  )}

                  {hasSecondaryAction && (
                    <TouchableOpacity
                      style={[
                        styles.button,
                        styles.secondaryButton,
                        styles.fullWidthButton,
                      ]}
                      onPress={handleSecondary}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.secondaryButtonText}>
                        {secondaryText}
                      </Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    style={[
                      styles.button,
                      (!showCancel || hasSecondaryAction) &&
                        styles.fullWidthButton,
                      !showCancel && !hasSecondaryAction && styles.singleButton,
                      { backgroundColor: buttonColor },
                    ]}
                    onPress={handleConfirm}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.confirmButtonText}>
                      {resolvedConfirmText}
                    </Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
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
  message: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 20,
    lineHeight: 20,
  },
  buttonContainer: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  buttonContainerStacked: {
    flexDirection: "column",
  },
  button: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  cancelButton: {
    backgroundColor: "#F3F4F6",
  },
  singleButton: {
    flex: 0,
    width: "100%",
  },
  fullWidthButton: {
    flex: 0,
    width: "100%",
  },
  cancelButtonText: {
    color: "#6B7280",
    fontSize: 16,
    fontWeight: "600",
  },
  secondaryButton: {
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.24)",
  },
  secondaryButtonText: {
    color: "#D97706",
    fontSize: 16,
    fontWeight: "600",
  },
  confirmButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
});
