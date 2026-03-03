import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
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

// Background image
const BG_IMAGE = require("../../../../assets/images/bg2.jpg");

// Forgot Password screen colors matching the design system
const FORGOT_COLORS = {
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
  successLight: "#F6FFED",
  info: "#1890FF",
  infoLight: "#E6F7FF",
};

type Step = "email" | "otp" | "newPassword" | "success";

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const [currentStep, setCurrentStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState(["", "", "", "", "", ""]);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpError, setOtpError] = useState("");
  const otpRefs = useRef<Array<TextInput | null>>([
    null,
    null,
    null,
    null,
    null,
    null,
  ]);
  const shakeAnimation = useRef(new Animated.Value(0)).current;

  const triggerShake = () => {
    shakeAnimation.setValue(0);
    Animated.sequence([
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: -10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 10,
        duration: 50,
        useNativeDriver: true,
      }),
      Animated.timing(shakeAnimation, {
        toValue: 0,
        duration: 50,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const handleSendOTP = async () => {
    if (!email) {
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: t("forgotPassword.errors.emailRequired"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.forgotPassword({ email });
      setCurrentStep("otp");
      startResendTimer();
    } catch (error: any) {
      let errorMessage =
        error.message || t("forgotPassword.errors.cannotSendOtp");
      if (errorMessage.includes("Không tìm thấy tài nguyên")) {
        errorMessage = t("forgotPassword.errors.emailNotFound");
      } else if (
        errorMessage.includes("không hợp lệ") ||
        errorMessage.includes("tài khoản")
      ) {
        errorMessage = t("forgotPassword.errors.emailInvalid");
      }
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (autoSubmitOtp?: string) => {
    const otpCode = autoSubmitOtp || otp.join("");
    if (otpCode.length < 6) {
      setOtpError(t("forgotPassword.errors.otpInvalid"));
      triggerShake();
      return;
    }

    setOtpError("");
    setIsSubmitting(true);
    try {
      await authApi.verifyOtp({ email, otp: otpCode });
      setCurrentStep("newPassword");
    } catch (error: any) {
      let errorMessage = error.message || t("forgotPassword.errors.otpExpired");
      if (
        errorMessage.toLowerCase().includes("otp") ||
        errorMessage.toLowerCase().includes("mã") ||
        errorMessage.toLowerCase().includes("hết hạn") ||
        errorMessage.toLowerCase().includes("không hợp lệ")
      ) {
        errorMessage = t("forgotPassword.errors.otpExpired");
      }
      setOtpError(errorMessage);
      triggerShake();
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.verifyFailed"),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetPassword = async () => {
    if (!newPassword || !confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: t("forgotPassword.errors.allRequired"),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: t("forgotPassword.errors.passwordMismatch"),
      });
      return;
    }

    // Basic validation
    if (newPassword.length < 8) {
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: t("forgotPassword.errors.passwordTooShort"),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({
        email,
        otp: otp.join(""),
        newPassword,
        confirmPassword,
      });
      setCurrentStep("success");
    } catch (error: any) {
      let errorMessage =
        error.message || t("forgotPassword.errors.resetFailed");

      // Check if error is related to OTP or is a validation error from BE (400, 401, 403)
      const isOtpError =
        errorMessage.toLowerCase().includes("otp") ||
        errorMessage.toLowerCase().includes("mã xác thực") ||
        errorMessage.toLowerCase().includes("yêu cầu không hợp lệ") ||
        errorMessage.includes("không hợp lệ") ||
        errorMessage.includes("tài khoản");

      if (isOtpError) {
        errorMessage = t("forgotPassword.errors.otpExpired");
        setOtpError(t("forgotPassword.errors.otpExpired"));
        setCurrentStep("otp");
        setTimeout(() => triggerShake(), 100);
      }
      Toast.show({
        type: "error",
        text1: t("forgotPassword.errors.title"),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOTP = async () => {
    if (resendTimer === 0) {
      setIsSubmitting(true);
      try {
        await authApi.forgotPassword({ email });
        startResendTimer();
        Toast.show({
          type: "success",
          text1: t("forgotPassword.errors.otpResent"),
          text2: t("forgotPassword.errors.otpResent"),
        });
      } catch (error: any) {
        let errorMessage =
          error.message || t("forgotPassword.errors.cannotResendOtp");
        if (errorMessage.includes("Không tìm thấy tài nguyên")) {
          errorMessage = t("forgotPassword.errors.emailNotFound");
        } else if (
          errorMessage.includes("không hợp lệ") ||
          errorMessage.includes("tài khoản")
        ) {
          errorMessage = t("forgotPassword.errors.invalidAction");
        }
        Toast.show({
          type: "error",
          text1: t("forgotPassword.errors.title"),
          text2: errorMessage,
        });
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const startResendTimer = () => {
    setResendTimer(60);
    const timer = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleOTPChange = (value: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (otpError) setOtpError("");

    // Auto-focus next input
    if (value.length > 0 && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }

    // Auto-submit if 6th digit
    if (value.length > 0 && index === 5 && newOtp.join("").length === 6) {
      setTimeout(() => handleVerifyOTP(newOtp.join("")), 100);
    }
  };

  const handleOTPKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === "Backspace") {
      if (otpError) setOtpError("");
      if (!otp[index] && index > 0) {
        otpRefs.current[index - 1]?.focus();
        const newOtp = [...otp];
        newOtp[index - 1] = "";
        setOtp(newOtp);
      }
    }
  };

  const handleBackToLogin = () => {
    // Navigate to login
    navigation.goBack();
  };

  const handleBack = () => {
    if (currentStep === "otp") {
      setCurrentStep("email");
    } else if (currentStep === "newPassword") {
      setCurrentStep("otp");
    }
  };

  const renderStepIndicator = () => {
    const steps = ["email", "otp", "newPassword", "success"];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.slice(0, 3).map((step, index) => (
          <React.Fragment key={step}>
            <View
              style={[
                styles.stepDot,
                index <= currentIndex && styles.stepDotActive,
                currentStep === "success" && styles.stepDotActive,
              ]}
            >
              {index < currentIndex || currentStep === "success" ? (
                <MaterialIcons name="check" size={14} color="#fff" />
              ) : (
                <Text
                  style={[
                    styles.stepNumber,
                    index <= currentIndex && styles.stepNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View
                style={[
                  styles.stepLine,
                  index < currentIndex && styles.stepLineActive,
                  currentStep === "success" && styles.stepLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>
    );
  };

  const renderEmailStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[FORGOT_COLORS.primary, FORGOT_COLORS.primaryHover]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="mail-outline" size={32} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.stepTitle}>{t("forgotPassword.email.title")}</Text>
      <Text style={styles.stepDescription}>
        {t("forgotPassword.email.description")}
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>{t("forgotPassword.email.label")}</Text>
        <View
          style={[
            styles.inputWrapper,
            focusedField === "email" && styles.inputWrapperFocused,
          ]}
        >
          <MaterialIcons
            name="mail-outline"
            size={22}
            color={
              focusedField === "email"
                ? FORGOT_COLORS.primary
                : FORGOT_COLORS.textMuted
            }
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t("forgotPassword.email.placeholder")}
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedField("email")}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
        onPress={handleSendOTP}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator
            size="small"
            color={FORGOT_COLORS.buttonTextDark}
          />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>
              {t("forgotPassword.email.sendOtp")}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={FORGOT_COLORS.buttonTextDark}
            />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderOTPStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[FORGOT_COLORS.primary, FORGOT_COLORS.primaryHover]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="mark-email-read" size={32} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.stepTitle}>{t("forgotPassword.otp.title")}</Text>
      <Text style={styles.stepDescription}>
        {t("forgotPassword.otp.description")}
        {"\n"}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {/* OTP Input */}
      <Animated.View
        style={[
          styles.otpContainer,
          { transform: [{ translateX: shakeAnimation }] },
        ]}
      >
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => {
              otpRefs.current[index] = ref;
            }}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
              otpError ? styles.otpInputError : null,
            ]}
            value={digit}
            onChangeText={(value) => handleOTPChange(value.slice(-1), index)}
            onKeyPress={(e) => handleOTPKeyPress(e, index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </Animated.View>

      {otpError ? <Text style={styles.otpErrorText}>{otpError}</Text> : null}

      {/* Resend OTP */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>{t("forgotPassword.otp.noCode")} </Text>
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={resendTimer > 0}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.resendLink,
              resendTimer > 0 && styles.resendLinkDisabled,
            ]}
          >
            {resendTimer > 0
              ? t("forgotPassword.otp.resendAfter", { count: resendTimer })
              : t("forgotPassword.otp.resend")}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
        onPress={() => handleVerifyOTP()}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator
            size="small"
            color={FORGOT_COLORS.buttonTextDark}
          />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>
              {t("forgotPassword.otp.confirm")}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={FORGOT_COLORS.buttonTextDark}
            />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderNewPasswordStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <LinearGradient
          colors={[FORGOT_COLORS.primary, FORGOT_COLORS.primaryHover]}
          style={styles.iconGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialIcons name="lock-reset" size={32} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.stepTitle}>
        {t("forgotPassword.newPassword.title")}
      </Text>
      <Text style={styles.stepDescription}>
        {t("forgotPassword.newPassword.description")}
      </Text>

      {/* New Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {t("forgotPassword.newPassword.newPasswordLabel")}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            focusedField === "newPassword" && styles.inputWrapperFocused,
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={22}
            color={
              focusedField === "newPassword"
                ? FORGOT_COLORS.primary
                : FORGOT_COLORS.textMuted
            }
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t("forgotPassword.newPassword.newPasswordPlaceholder")}
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            onFocus={() => setFocusedField("newPassword")}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={showPassword ? "visibility" : "visibility-off"}
              size={22}
              color={FORGOT_COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>
          {t("forgotPassword.newPassword.confirmLabel")}
        </Text>
        <View
          style={[
            styles.inputWrapper,
            focusedField === "confirmPassword" && styles.inputWrapperFocused,
          ]}
        >
          <MaterialIcons
            name="lock-outline"
            size={22}
            color={
              focusedField === "confirmPassword"
                ? FORGOT_COLORS.primary
                : FORGOT_COLORS.textMuted
            }
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={t("forgotPassword.newPassword.confirmPlaceholder")}
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            onFocus={() => setFocusedField("confirmPassword")}
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
              color={FORGOT_COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Password Requirements */}
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
                ? FORGOT_COLORS.success
                : FORGOT_COLORS.textMuted
            }
          />
          <Text
            style={[
              styles.requirementText,
              newPassword.length >= 8 && styles.requirementMet,
            ]}
          >
            {t("forgotPassword.newPassword.requirements.minLength")}
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
                ? FORGOT_COLORS.success
                : FORGOT_COLORS.textMuted
            }
          />
          <Text
            style={[
              styles.requirementText,
              /[A-Z]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {t("forgotPassword.newPassword.requirements.uppercase")}
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
                ? FORGOT_COLORS.success
                : FORGOT_COLORS.textMuted
            }
          />
          <Text
            style={[
              styles.requirementText,
              /[0-9]/.test(newPassword) && styles.requirementMet,
            ]}
          >
            {t("forgotPassword.newPassword.requirements.number")}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[styles.primaryButton, isSubmitting && { opacity: 0.7 }]}
        onPress={handleResetPassword}
        activeOpacity={0.9}
        disabled={isSubmitting}
      >
        {isSubmitting ? (
          <ActivityIndicator
            size="small"
            color={FORGOT_COLORS.buttonTextDark}
          />
        ) : (
          <>
            <Text style={styles.primaryButtonText}>
              {t("forgotPassword.newPassword.submit")}
            </Text>
            <MaterialIcons
              name="arrow-forward"
              size={20}
              color={FORGOT_COLORS.buttonTextDark}
            />
          </>
        )}
      </TouchableOpacity>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <View style={styles.successIconWrapper}>
          <MaterialIcons
            name="check-circle"
            size={80}
            color={FORGOT_COLORS.success}
          />
        </View>
      </View>

      <Text style={styles.stepTitle}>{t("forgotPassword.success.title")}</Text>
      <Text style={styles.stepDescription}>
        {t("forgotPassword.success.description")}
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleBackToLogin}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>
          {t("forgotPassword.success.loginNow")}
        </Text>
        <MaterialIcons
          name="login"
          size={20}
          color={FORGOT_COLORS.buttonTextDark}
        />
      </TouchableOpacity>
    </View>
  );

  return (
    <ImageBackground
      source={BG_IMAGE}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Background Gradient */}
      <LinearGradient
        colors={[
          "rgba(253, 248, 240, 0.2)",
          "rgba(253, 248, 240, 0.75)",
          "rgba(253, 248, 240, 0.95)",
        ]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.6 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 8 },
          ]}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header: Back Button + Step Indicator */}
          {currentStep !== "success" && (
            <View style={styles.headerRow}>
              {currentStep !== "email" ? (
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={handleBack}
                  activeOpacity={0.7}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={24}
                    color={FORGOT_COLORS.textMain}
                  />
                </TouchableOpacity>
              ) : (
                <View style={styles.backButtonPlaceholder} />
              )}
              <View style={styles.stepIndicatorInline}>
                {renderStepIndicator()}
              </View>
              <View style={styles.backButtonPlaceholder} />
            </View>
          )}

          {/* Step Content */}
          {currentStep === "email" && renderEmailStep()}
          {currentStep === "otp" && renderOTPStep()}
          {currentStep === "newPassword" && renderNewPasswordStep()}
          {currentStep === "success" && renderSuccessStep()}

          {/* Footer - Back to Login */}
          {currentStep !== "success" && (
            <View style={styles.footerContainer}>
              <TouchableOpacity
                onPress={handleBackToLogin}
                activeOpacity={0.7}
                style={styles.backToLoginButton}
              >
                <MaterialIcons
                  name="arrow-back"
                  size={18}
                  color={FORGOT_COLORS.textMuted}
                />
                <Text style={styles.backToLoginText}>
                  {t("forgotPassword.backToLogin")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FORGOT_COLORS.backgroundLight,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 400,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 40,
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  stepIndicatorInline: {
    flex: 1,
  },
  backButtonPlaceholder: {
    width: 44,
    height: 44,
  },

  // Back Button
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: FORGOT_COLORS.surfaceLight,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.small,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 8,
    marginBottom: 0,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FORGOT_COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  stepDotActive: {
    backgroundColor: FORGOT_COLORS.primary,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: "600",
    color: FORGOT_COLORS.textMuted,
  },
  stepNumberActive: {
    color: "#fff",
  },
  stepLine: {
    flex: 1,
    height: 2,
    backgroundColor: FORGOT_COLORS.borderLight,
    marginHorizontal: 8,
  },
  stepLineActive: {
    backgroundColor: FORGOT_COLORS.primary,
  },

  // Step Content
  stepContent: {
    paddingHorizontal: 24,
    paddingTop: 24,
  },
  iconContainer: {
    alignItems: "center",
    marginBottom: 24,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  successIconWrapper: {
    backgroundColor: FORGOT_COLORS.successLight,
    borderRadius: 50,
    padding: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: "700",
    color: FORGOT_COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: "center",
  },
  stepDescription: {
    fontSize: 15,
    color: FORGOT_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: FORGOT_COLORS.primary,
    fontWeight: "600",
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: "600",
    color: FORGOT_COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: FORGOT_COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: FORGOT_COLORS.borderLight,
    height: 54,
    paddingHorizontal: 16,
    ...SHADOWS.subtle,
  },
  inputWrapperFocused: {
    borderColor: FORGOT_COLORS.primary,
    borderWidth: 1,
    shadowColor: FORGOT_COLORS.primary,
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
    color: FORGOT_COLORS.textMain,
    height: "100%",
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },

  // OTP Input
  otpContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 24,
  },
  otpInput: {
    width: 48,
    height: 56,
    borderRadius: 12,
    backgroundColor: FORGOT_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: FORGOT_COLORS.borderLight,
    fontSize: 22,
    fontWeight: "700",
    color: FORGOT_COLORS.textMain,
    textAlign: "center",
    ...SHADOWS.subtle,
  },
  otpInputFilled: {
    borderColor: FORGOT_COLORS.primary,
    backgroundColor: FORGOT_COLORS.primaryLight,
  },
  otpInputError: {
    borderColor: "#FF4D4F",
    backgroundColor: "#FFF1F0",
    color: "#FF4D4F",
  },
  otpErrorText: {
    color: "#FF4D4F",
    fontSize: 13,
    textAlign: "center",
    marginBottom: 24,
    marginTop: -16,
    fontWeight: "500",
  },

  // Resend OTP
  resendContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: FORGOT_COLORS.textMuted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: "600",
    color: FORGOT_COLORS.primary,
  },
  resendLinkDisabled: {
    color: FORGOT_COLORS.textMuted,
  },

  // Password Requirements
  requirementsContainer: {
    backgroundColor: FORGOT_COLORS.infoLight,
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 10,
  },
  requirementItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
    color: FORGOT_COLORS.textMuted,
  },
  requirementMet: {
    color: FORGOT_COLORS.success,
    fontWeight: "500",
  },

  // Primary Button
  primaryButton: {
    flexDirection: "row",
    backgroundColor: FORGOT_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: FORGOT_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: "700",
    color: FORGOT_COLORS.buttonTextDark,
  },

  // Footer
  footerContainer: {
    alignItems: "center",
    marginTop: 40,
    paddingHorizontal: 24,
  },
  backToLoginButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: "600",
    color: FORGOT_COLORS.textMuted,
  },
});

export default ForgotPasswordScreen;
