import { FontAwesome, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  isErrorWithCode,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import {
  CommonActions,
  RouteProp,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { SHADOWS } from "../../../constants/theme.constants";
import { useAuth } from "../../../contexts/AuthContext";
import { useI18n } from "../../../hooks/useI18n";
import { AuthStackParamList } from "../../../navigation/AuthNavigator";
import { navigateToAppropriateScreen } from "../../../navigation/navigationHelpers";

// Background image
const BG_IMAGE = require("../../../../assets/images/bg2.jpg");
const LOGO_IMAGE = require("../../../../assets/images/logo.png");

// Login screen colors matching the design
const LOGIN_COLORS = {
  primary: "#cfaa3a",
  primaryHover: "#b89530",
  backgroundLight: "#fdfdfc",
  surfaceLight: "#ffffff",
  textMain: "#191710",
  textMuted: "#6C8CA3",
  borderLight: "#e4e0d3",
  buttonTextDark: "#0f1829",
  error: "#dc3545",
  errorBg: "#f8d7da",
  success: "#28a745",
};

// Email validation regex
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Password minimum length
const MIN_PASSWORD_LENGTH = 6;

interface FormErrors {
  email?: string;
  password?: string;
}

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const route = useRoute<RouteProp<AuthStackParamList, "Login">>();
  const {
    login,
    loginWithGoogle,
    continueAsGuest,
    isLoading,
    error,
    clearError,
    isAuthenticated,
    isGuest,
    user,
  } = useAuth();

  // Prefill email when coming back from registration.
  const [email, setEmail] = useState(route.params?.email ?? "");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [formErrors, setFormErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);

  // i18n
  const { t } = useI18n();

  // Animation values
  const shakeAnimation = useSharedValue(0);
  const buttonScale = useSharedValue(1);

  // Clear auth error when component mounts or when inputs change
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [clearError, email, error, password]);

  // Navigate based on user role when authenticated or guest mode
  // If user came from an invite link (pending_invite_token saved), navigate there after login
  useEffect(() => {
    if (isAuthenticated || isGuest) {
      AsyncStorage.getItem("pending_invite_token")
        .then((pendingToken) => {
          if (pendingToken && isAuthenticated) {
            // Clear the pending token first
            AsyncStorage.removeItem("pending_invite_token");
            // Navigate to main app, then push the invite screen on top
            navigation.dispatch(
              CommonActions.reset({
                index: 1,
                routes: [
                  { name: "Main" },
                  {
                    name: "PlanInvitePreview",
                    params: { token: pendingToken },
                  },
                ],
              }),
            );
          } else {
            navigateToAppropriateScreen(
              navigation,
              isAuthenticated,
              isGuest,
              user?.role,
            );
          }
        })
        .catch(() => {
          navigateToAppropriateScreen(
            navigation,
            isAuthenticated,
            isGuest,
            user?.role,
          );
        });
    }
  }, [isAuthenticated, isGuest, user?.role, navigation]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    const errors: FormErrors = {};

    // Validate email
    if (!email.trim()) {
      errors.email = t("auth.validation.emailRequired");
    } else if (!EMAIL_REGEX.test(email.trim())) {
      errors.email = t("auth.validation.emailInvalid");
    }

    // Validate password
    if (!password) {
      errors.password = t("auth.validation.passwordRequired");
    } else if (password.length < MIN_PASSWORD_LENGTH) {
      errors.password = t("auth.validation.passwordMinLength", {
        count: MIN_PASSWORD_LENGTH,
      });
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  }, [email, password, t]);

  // Shake animation for error
  const triggerShakeAnimation = useCallback(() => {
    shakeAnimation.value = withSequence(
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(-10, { duration: 50 }),
      withTiming(10, { duration: 50 }),
      withTiming(0, { duration: 50 }),
    );
  }, [shakeAnimation]);

  // Button press animation
  const handleButtonPressIn = useCallback(() => {
    buttonScale.value = withSpring(0.95);
  }, [buttonScale]);

  const handleButtonPressOut = useCallback(() => {
    buttonScale.value = withSpring(1);
  }, [buttonScale]);

  // Animated styles
  const shakeStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shakeAnimation.value }],
  }));

  const buttonAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: buttonScale.value }],
  }));

  // Handle login
  const handleLogin = useCallback(async () => {
    Keyboard.dismiss();

    // Clear previous errors
    setFormErrors({});

    // Validate form
    if (!validateForm()) {
      triggerShakeAnimation();
      return;
    }

    setIsSubmitting(true);

    try {
      await login({
        email: email.trim().toLowerCase(),
        password: password,
      });

      Toast.show({
        type: "success",
        text1: t("auth.loginSuccess"),
      });
      // Navigation is handled by useEffect when isAuthenticated changes
    } catch (err: any) {
      triggerShakeAnimation();

      // Clear global auth error
      setTimeout(() => clearError(), 0);

      // Extract error message tá»« API
      let errorMessage =
        err.message ||
        t("auth.checkCredentials") ||
        "Thông tin đăng nhập không chính xác";
      if (errorMessage.includes("401") || errorMessage.includes("404")) {
        errorMessage =
          t("auth.errors.invalidCredentials") ||
          "Tài khoản hoặc mật khẩu không chính xác.";
      }

      // Lỗi từ API → hiện Toast (không dùng inline error)
      Toast.show({
        type: "error",
        text1: t("auth.loginFailed"),
        text2: errorMessage,
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [
    email,
    password,
    login,
    validateForm,
    triggerShakeAnimation,
    clearError,
    t,
  ]);

  const handleGoogleLogin = useCallback(async () => {
    Keyboard.dismiss();
    setFormErrors({});
    setIsGoogleSubmitting(true);

    try {
      await loginWithGoogle();
      Toast.show({
        type: "success",
        text1: t("auth.loginSuccess"),
      });
    } catch (err: any) {
      if (isErrorWithCode(err) && err.code === statusCodes.SIGN_IN_CANCELLED) {
        return;
      }

      let errorMessage =
        err.message || "Google sign-in failed. Please try again.";

      if (
        isErrorWithCode(err) &&
        err.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
      ) {
        errorMessage = "Google Play Services is not available on this device.";
      }

      Toast.show({
        type: "error",
        text1: t("auth.loginFailed"),
        text2: errorMessage,
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  }, [loginWithGoogle, t]);

  const handleForgotPassword = useCallback(() => {
    navigation.navigate("ForgotPassword");
  }, [navigation]);

  const handleRegister = useCallback(() => {
    navigation.navigate("Register");
  }, [navigation]);

  const handleGuestContinue = useCallback(async () => {
    try {
      await continueAsGuest();
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("auth.guestSuccess"),
      });
      // Navigation is handled by useEffect when isGuest changes
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("auth.errors.guestError"),
      });
    }
  }, [continueAsGuest, t]);

  // Clear specific field error when user types
  const handleEmailChange = useCallback(
    (text: string) => {
      setEmail(text);
      if (formErrors.email) {
        setFormErrors((prev) => ({ ...prev, email: undefined }));
      }
    },
    [formErrors.email],
  );

  const handlePasswordChange = useCallback(
    (text: string) => {
      setPassword(text);
      if (formErrors.password) {
        setFormErrors((prev) => ({ ...prev, password: undefined }));
      }
    },
    [formErrors.password],
  );

  const isNativeGoogleSignInAvailable = Platform.OS !== "web";
  const isButtonDisabled = isLoading || isSubmitting || isGoogleSubmitting;
  const isPasswordSubmitting =
    isSubmitting || (isLoading && !isGoogleSubmitting);
  const insets = useSafeAreaInsets();

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
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

        {/* Overlay gradient for better readability */}
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
              {
                paddingTop: insets.top + 10,
                paddingBottom: Math.max(insets.bottom + 20, 40),
              },
            ]}
            showsVerticalScrollIndicator={false}
            bounces={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Logo Section */}
            <View style={styles.logoSection}>
              <View style={styles.logoBadge}>
                <Image
                  source={LOGO_IMAGE}
                  style={styles.logoImage}
                  resizeMode="contain"
                />
              </View>
              <Text style={styles.appName}>{t("appName")}</Text>
            </View>

            {/* Title Section */}
            <View style={styles.titleContainer}>
              <Text style={styles.title}>{t("auth.welcomeBack")}</Text>
              <Text style={styles.subtitle}>{t("auth.continueJourney")}</Text>
            </View>

            {/* Form Section */}
            <Animated.View style={[styles.formContainer, shakeStyle]}>
              {/* Global Error Message Removed in favor of Inline Error */}

              {/* Email Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.email")}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    emailFocused && styles.inputWrapperFocused,
                    formErrors.email && styles.inputWrapperError,
                  ]}
                >
                  <MaterialIcons
                    name="mail-outline"
                    size={22}
                    color={
                      formErrors.email
                        ? LOGIN_COLORS.error
                        : emailFocused
                          ? LOGIN_COLORS.primary
                          : LOGIN_COLORS.textMuted
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder={t("register.fields.emailPlaceholder")}
                    placeholderTextColor={`${LOGIN_COLORS.textMuted}99`}
                    value={email}
                    onChangeText={handleEmailChange}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect={false}
                    onFocus={() => setEmailFocused(true)}
                    onBlur={() => setEmailFocused(false)}
                    editable={!isButtonDisabled}
                    returnKeyType="next"
                  />
                  {email.length > 0 && (
                    <TouchableOpacity
                      onPress={() => setEmail("")}
                      style={styles.clearButton}
                      activeOpacity={0.7}
                    >
                      <MaterialIcons
                        name="close"
                        size={18}
                        color={LOGIN_COLORS.textMuted}
                      />
                    </TouchableOpacity>
                  )}
                </View>
                {formErrors.email && (
                  <Text style={styles.errorText}>{formErrors.email}</Text>
                )}
              </View>

              {/* Password Input */}
              <View style={styles.inputGroup}>
                <Text style={styles.label}>{t("auth.password")}</Text>
                <View
                  style={[
                    styles.inputWrapper,
                    passwordFocused && styles.inputWrapperFocused,
                    formErrors.password && styles.inputWrapperError,
                  ]}
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={22}
                    color={
                      formErrors.password
                        ? LOGIN_COLORS.error
                        : passwordFocused
                          ? LOGIN_COLORS.primary
                          : LOGIN_COLORS.textMuted
                    }
                    style={styles.inputIcon}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor={`${LOGIN_COLORS.textMuted}99`}
                    value={password}
                    onChangeText={handlePasswordChange}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoComplete="password"
                    autoCorrect={false}
                    onFocus={() => setPasswordFocused(true)}
                    onBlur={() => setPasswordFocused(false)}
                    editable={!isButtonDisabled}
                    returnKeyType="done"
                    onSubmitEditing={handleLogin}
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeButton}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={showPassword ? "visibility" : "visibility-off"}
                      size={22}
                      color={LOGIN_COLORS.textMuted}
                    />
                  </TouchableOpacity>
                </View>
                {formErrors.password && (
                  <Text style={styles.errorText}>{formErrors.password}</Text>
                )}

                {/* Forgot Password Link */}
                <TouchableOpacity
                  onPress={handleForgotPassword}
                  style={styles.forgotPasswordContainer}
                  activeOpacity={0.7}
                  disabled={isButtonDisabled}
                >
                  <Text style={styles.forgotPasswordText}>
                    {t("auth.forgotPassword")}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Login Button */}
              <Animated.View style={buttonAnimatedStyle}>
                <TouchableOpacity
                  style={[
                    styles.loginButton,
                    isButtonDisabled && styles.loginButtonDisabled,
                  ]}
                  onPress={handleLogin}
                  onPressIn={handleButtonPressIn}
                  onPressOut={handleButtonPressOut}
                  activeOpacity={0.9}
                  disabled={isButtonDisabled}
                >
                  {isPasswordSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color={LOGIN_COLORS.buttonTextDark}
                    />
                  ) : (
                    <>
                      <Text style={styles.loginButtonText}>
                        {t("auth.login")}
                      </Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={20}
                        color={LOGIN_COLORS.buttonTextDark}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </Animated.View>

              {/* Divider */}
              <View style={styles.dividerContainer}>
                <View style={styles.dividerLine} />
                <Text style={styles.dividerText}>{t("common.or")}</Text>
                <View style={styles.dividerLine} />
              </View>

              {isNativeGoogleSignInAvailable && (
                <TouchableOpacity
                  style={[
                    styles.googleButton,
                    isButtonDisabled && styles.googleButtonDisabled,
                  ]}
                  onPress={handleGoogleLogin}
                  activeOpacity={0.85}
                  disabled={isButtonDisabled}
                >
                  {isGoogleSubmitting ? (
                    <ActivityIndicator
                      size="small"
                      color={LOGIN_COLORS.buttonTextDark}
                    />
                  ) : (
                    <>
                      <View style={styles.googleIconBadge}>
                        <FontAwesome name="google" size={16} color="#DB4437" />
                      </View>
                      <Text style={styles.googleButtonText}>
                        Continue with Google
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              )}

              {/* Guest Button */}
              <TouchableOpacity
                style={[
                  styles.guestButton,
                  isButtonDisabled && styles.guestButtonDisabled,
                ]}
                onPress={handleGuestContinue}
                activeOpacity={0.8}
                disabled={isButtonDisabled}
              >
                <MaterialIcons
                  name="person-outline"
                  size={22}
                  color={LOGIN_COLORS.buttonTextDark}
                />
                <Text style={styles.guestButtonText}>
                  {t("auth.continueAsGuest")}
                </Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Footer - Register Link */}
            <View style={styles.footerContainer}>
              <Text style={styles.footerText}>{t("auth.noAccount")} </Text>
              <TouchableOpacity
                onPress={handleRegister}
                activeOpacity={0.7}
                disabled={isButtonDisabled}
              >
                <Text style={styles.registerLink}>{t("auth.registerNow")}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </ImageBackground>
    </TouchableWithoutFeedback>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LOGIN_COLORS.backgroundLight,
  },
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 500,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingBottom: 20,
  },

  // Logo Section (New - for bg2.jpg background)
  logoSection: {
    alignItems: "center",
    paddingTop: 40,
    paddingBottom: 8,
  },
  logoBadge: {
    width: 60,
    height: 60,
    borderRadius: 32,
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.large,
    marginBottom: 8,
    borderWidth: 2,
    borderColor: LOGIN_COLORS.primary,
  },
  logoImage: {
    width: 64,
    height: 64,
    tintColor: LOGIN_COLORS.primary,
  },
  appName: {
    fontSize: 22,
    fontWeight: "700",
    color: LOGIN_COLORS.primary,
    letterSpacing: 1,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },

  // Header Image Section
  imageSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageContainer: {
    width: "100%",
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  headerImage: {
    width: "100%",
    height: "100%",
    justifyContent: "flex-end",
  },
  headerImageStyle: {
    borderRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
  },
  logoContainer: {
    position: "absolute",
    bottom: 16,
    left: 16,
  },
  logoBox: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    padding: 8,
    borderRadius: 8,
    ...SHADOWS.small,
  },

  // Title Section
  titleContainer: {
    alignItems: "center",
    marginTop: 12,
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: "700",
    color: LOGIN_COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 4,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: LOGIN_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 20,
  },

  // Error Banner
  errorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LOGIN_COLORS.errorBg,
    borderRadius: 12,
    padding: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: `${LOGIN_COLORS.error}30`,
  },
  errorBannerText: {
    flex: 1,
    marginLeft: 8,
    fontSize: 14,
    color: LOGIN_COLORS.error,
    fontWeight: "500",
  },

  // Form Section
  formContainer: {
    paddingHorizontal: 20,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: "600",
    color: LOGIN_COLORS.textMain,
    marginBottom: 6,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: LOGIN_COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOGIN_COLORS.borderLight,
    height: 50,
    paddingHorizontal: 14,
    ...SHADOWS.subtle,
  },
  inputWrapperFocused: {
    borderColor: LOGIN_COLORS.primary,
    borderWidth: 1,
    shadowColor: LOGIN_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: LOGIN_COLORS.error,
    borderWidth: 1,
    shadowColor: LOGIN_COLORS.error,
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
    fontSize: 16,
    color: LOGIN_COLORS.textMain,
    height: "100%",
  },
  clearButton: {
    padding: 4,
    marginLeft: 4,
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  errorText: {
    fontSize: 12,
    color: LOGIN_COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  forgotPasswordContainer: {
    alignSelf: "flex-end",
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: "600",
    color: LOGIN_COLORS.primary,
  },

  // Login Button
  loginButton: {
    flexDirection: "row",
    backgroundColor: LOGIN_COLORS.primary,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 4,
    shadowColor: LOGIN_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  loginButtonDisabled: {
    opacity: 0.7,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: "700",
    color: LOGIN_COLORS.buttonTextDark,
  },

  // Divider
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: LOGIN_COLORS.borderLight,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: "500",
    color: LOGIN_COLORS.textMuted,
    marginHorizontal: 16,
  },

  googleButton: {
    flexDirection: "row",
    backgroundColor: LOGIN_COLORS.surfaceLight,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: LOGIN_COLORS.borderLight,
    gap: 10,
    ...SHADOWS.subtle,
  },
  googleButtonDisabled: {
    opacity: 0.6,
  },
  googleIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "#fff7f5",
    justifyContent: "center",
    alignItems: "center",
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: LOGIN_COLORS.buttonTextDark,
  },

  // Guest Button
  guestButton: {
    flexDirection: "row",
    backgroundColor: "transparent",
    height: 48,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: LOGIN_COLORS.buttonTextDark,
    gap: 8,
  },
  guestButtonDisabled: {
    opacity: 0.5,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: LOGIN_COLORS.buttonTextDark,
  },

  // Footer
  footerContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 16,
    paddingBottom: 20,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 14,
    color: LOGIN_COLORS.textMain,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: "700",
    color: LOGIN_COLORS.primary,
    marginLeft: 4,
  },
});

export default LoginScreen;
