/**
 * GuestLoginModal - Reusable login prompt modal for guest users.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
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

import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../constants/theme.constants";
import { useAuth } from "../../contexts/AuthContext";

interface GuestLoginModalProps {
  visible: boolean;
  onClose: () => void;
  message?: string;
  onBeforeLogin?: () => Promise<void>;
}

export const GuestLoginModal: React.FC<GuestLoginModalProps> = ({
  visible,
  onClose,
  message,
  onBeforeLogin,
}) => {
  const { t } = useTranslation();
  const { exitGuestMode } = useAuth();
  const navigation = useNavigation<any>();

  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!visible) {
      return;
    }

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
      Animated.loop(
        Animated.sequence([
          Animated.timing(iconPulse, {
            toValue: 1.15,
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

      Animated.loop(
        Animated.sequence([
          Animated.timing(cardFloat, {
            toValue: -6,
            duration: 1500,
            useNativeDriver: true,
          }),
          Animated.timing(cardFloat, {
            toValue: 6,
            duration: 1500,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    });
  }, [
    visible,
    overlayOpacity,
    cardScale,
    cardOpacity,
    cardTranslateY,
    iconPulse,
    cardFloat,
  ]);

  const closeWithAnimation = (callback: () => void) => {
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
    ]).start(callback);
  };

  const handleLogin = async () => {
    closeWithAnimation(onClose);

    setTimeout(async () => {
      if (onBeforeLogin) {
        await onBeforeLogin();
      }

      await exitGuestMode();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        }),
      );
    }, 250);
  };

  const handleDismiss = () => {
    closeWithAnimation(onClose);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleDismiss}
    >
      <TouchableWithoutFeedback onPress={handleDismiss}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [
                    { scale: cardScale },
                    { translateY: Animated.add(cardTranslateY, cardFloat) },
                  ],
                },
              ]}
            >
              <Animated.View
                style={[styles.iconCircle, { transform: [{ scale: iconPulse }] }]}
              >
                <MaterialIcons
                  name="lock-outline"
                  size={32}
                  color={COLORS.accent}
                />
              </Animated.View>

              <Text style={styles.title}>{t("profile.loginRequired")}</Text>

              <Text style={styles.subtitle}>
                {message || t("profile.loginRequiredMessage")}
              </Text>

              <TouchableOpacity
                style={styles.loginBtn}
                onPress={handleLogin}
                activeOpacity={0.85}
              >
                <View style={styles.loginBtnContent}>
                  <MaterialIcons name="login" size={20} color={COLORS.white} />
                  <Text style={styles.loginBtnText}>
                    {t("profile.loginRegister", {
                      defaultValue: "Dang nhap / Dang ky",
                    })}
                  </Text>
                </View>
              </TouchableOpacity>
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
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.large,
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: `${COLORS.accentLight}40`,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 2,
    borderColor: `${COLORS.accent}30`,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.xs,
  },
  subtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  loginBtn: {
    width: "100%",
    backgroundColor: "#D4AF37",
    borderRadius: BORDER_RADIUS.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    ...SHADOWS.medium,
  },
  loginBtnContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
  },
  loginBtnText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
});

export default GuestLoginModal;
