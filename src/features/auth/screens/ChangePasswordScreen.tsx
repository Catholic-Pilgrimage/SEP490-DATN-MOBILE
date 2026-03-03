import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ActivityIndicator,
  ImageBackground,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SHADOWS } from "../../../constants/theme.constants";
import { useI18n } from "../../../hooks/useI18n";
import authApi from "../../../services/api/shared/authApi";
import { ChangePasswordRequest } from "../../../types/auth.types";

// Screen colors matching the design system
const SCREEN_COLORS = {
  primary: "#cfaa3a",
  primaryHover: "#b89530",
  primaryLight: "rgba(207, 170, 58, 0.1)",
  backgroundLight: "#fdfdfc",
  surfaceLight: "#ffffff",
  textMain: "#191710",
  textMuted: "#6C8CA3",
  borderLight: "#e4e0d3",
  buttonTextDark: "#0f1829",
  success: "#52C41A",
  error: "#FF4D4F",
};

const ChangePasswordScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleChangePassword = async () => {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("changePassword.errors.allRequired"),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("changePassword.errors.passwordMismatch"),
      });
      return;
    }

    if (newPassword.length < 8) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("changePassword.errors.passwordTooShort"),
      });
      return;
    }

    if (currentPassword === newPassword) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("changePassword.errors.samePassword"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      const request: ChangePasswordRequest = {
        currentPassword,
        newPassword,
        confirmPassword,
      };

      await authApi.changePassword(request);

      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("changePassword.success"),
      });
      navigation.goBack();
    } catch (error: any) {
      const errorMessage =
        error.message || t("changePassword.errors.changeFailed");
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <ImageBackground
      source={require("../../../../assets/images/profile-bg.jpg")}
      style={styles.container}
      resizeMode="cover"
      fadeDuration={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={SCREEN_COLORS.textMain}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("changePassword.title")}</Text>
          <View style={{ width: 44 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          <View style={styles.iconContainer}>
            <LinearGradient
              colors={[SCREEN_COLORS.primary, SCREEN_COLORS.primaryHover]}
              style={styles.iconGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialIcons name="lock-reset" size={32} color="#fff" />
            </LinearGradient>
          </View>

          <Text style={styles.description}>
            {t("changePassword.description")}
          </Text>

          {/* Current Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("changePassword.currentPassword")}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "current" && styles.inputWrapperFocused,
              ]}
            >
              <MaterialIcons
                name="lock-outline"
                size={22}
                color={
                  focusedField === "current"
                    ? SCREEN_COLORS.primary
                    : SCREEN_COLORS.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("changePassword.currentPasswordPlaceholder")}
                placeholderTextColor={`${SCREEN_COLORS.textMuted}99`}
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={!showCurrentPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField("current")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowCurrentPassword(!showCurrentPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showCurrentPassword ? "visibility" : "visibility-off"}
                  size={22}
                  color={SCREEN_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* New Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>{t("changePassword.newPassword")}</Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "new" && styles.inputWrapperFocused,
              ]}
            >
              <MaterialIcons
                name="vpn-key"
                size={22}
                color={
                  focusedField === "new"
                    ? SCREEN_COLORS.primary
                    : SCREEN_COLORS.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("changePassword.newPasswordPlaceholder")}
                placeholderTextColor={`${SCREEN_COLORS.textMuted}99`}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showNewPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField("new")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowNewPassword(!showNewPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showNewPassword ? "visibility" : "visibility-off"}
                  size={22}
                  color={SCREEN_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Confirm Password */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {t("changePassword.confirmPassword")}
            </Text>
            <View
              style={[
                styles.inputWrapper,
                focusedField === "confirm" && styles.inputWrapperFocused,
              ]}
            >
              <MaterialIcons
                name="check-circle-outline"
                size={22}
                color={
                  focusedField === "confirm"
                    ? SCREEN_COLORS.primary
                    : SCREEN_COLORS.textMuted
                }
                style={styles.inputIcon}
              />
              <TextInput
                style={styles.input}
                placeholder={t("changePassword.confirmPasswordPlaceholder")}
                placeholderTextColor={`${SCREEN_COLORS.textMuted}99`}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                autoCapitalize="none"
                onFocus={() => setFocusedField("confirm")}
                onBlur={() => setFocusedField(null)}
              />
              <TouchableOpacity
                onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                style={styles.eyeButton}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={showConfirmPassword ? "visibility" : "visibility-off"}
                  size={22}
                  color={SCREEN_COLORS.textMuted}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.requirementsContainer}>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  newPassword.length >= 8
                    ? "check-circle"
                    : "radio-button-unchecked"
                }
                size={16}
                color={
                  newPassword.length >= 8
                    ? SCREEN_COLORS.success
                    : SCREEN_COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  newPassword.length >= 8 && styles.requirementMet,
                ]}
              >
                {t("changePassword.requirements.minLength")}
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[A-Z]/.test(newPassword)
                    ? "check-circle"
                    : "radio-button-unchecked"
                }
                size={16}
                color={
                  /[A-Z]/.test(newPassword)
                    ? SCREEN_COLORS.success
                    : SCREEN_COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  /[A-Z]/.test(newPassword) && styles.requirementMet,
                ]}
              >
                {t("changePassword.requirements.uppercase")}
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <MaterialIcons
                name={
                  /[0-9]/.test(newPassword)
                    ? "check-circle"
                    : "radio-button-unchecked"
                }
                size={16}
                color={
                  /[0-9]/.test(newPassword)
                    ? SCREEN_COLORS.success
                    : SCREEN_COLORS.textMuted
                }
              />
              <Text
                style={[
                  styles.requirementText,
                  /[0-9]/.test(newPassword) && styles.requirementMet,
                ]}
              >
                {t("changePassword.requirements.number")}
              </Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
            onPress={handleChangePassword}
            activeOpacity={0.9}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <ActivityIndicator
                size="small"
                color={SCREEN_COLORS.buttonTextDark}
              />
            ) : (
              <Text style={styles.primaryButtonText}>
                {t("changePassword.submit")}
              </Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 300,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
    backgroundColor: "transparent",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#3D2B1F",
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  scrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
    paddingTop: 10,
  },
  iconContainer: {
    alignItems: "center",
    marginVertical: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  description: {
    fontSize: 14,
    color: "#3D2B1F",
    textAlign: "center",
    marginBottom: 30,
    lineHeight: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#3D2B1F",
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.35)",
    height: 54,
    paddingHorizontal: 16,
    ...SHADOWS.subtle,
  },
  inputWrapperFocused: {
    borderColor: SCREEN_COLORS.primary,
    borderWidth: 1.5,
    shadowColor: SCREEN_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    color: SCREEN_COLORS.textMain,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  requirementsContainer: {
    backgroundColor: "rgba(253, 248, 240, 0.85)",
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
    color: SCREEN_COLORS.textMuted,
  },
  requirementMet: {
    color: SCREEN_COLORS.success,
    fontWeight: "500",
  },
  primaryButton: {
    flexDirection: "row",
    backgroundColor: SCREEN_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: SCREEN_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    marginBottom: 20,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: SCREEN_COLORS.buttonTextDark,
  },
});

export default ChangePasswordScreen;
