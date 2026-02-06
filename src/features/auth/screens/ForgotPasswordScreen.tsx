import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { SHADOWS } from '../../../constants/theme.constants';

// Forgot Password screen colors matching the design system
const FORGOT_COLORS = {
  primary: '#cfaa3a',
  primaryHover: '#b89530',
  primaryLight: 'rgba(207, 170, 58, 0.1)',
  backgroundLight: '#fdfdfc',
  surfaceLight: '#ffffff',
  textMain: '#191710',
  textMuted: '#6C8CA3',
  borderLight: '#e4e0d3',
  buttonTextDark: '#0f1829',
  success: '#52C41A',
  successLight: '#F6FFED',
  info: '#1890FF',
  infoLight: '#E6F7FF',
};

type Step = 'email' | 'otp' | 'newPassword' | 'success';

const ForgotPasswordScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [currentStep, setCurrentStep] = useState<Step>('email');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [resendTimer, setResendTimer] = useState(0);

  const handleSendOTP = () => {
    // TODO: Send OTP logic
    setCurrentStep('otp');
    startResendTimer();
  };

  const handleVerifyOTP = () => {
    // TODO: Verify OTP logic
    const otpCode = otp.join('');
    setCurrentStep('newPassword');
  };

  const handleResetPassword = () => {
    // TODO: Reset password logic
    setCurrentStep('success');
  };

  const handleResendOTP = () => {
    if (resendTimer === 0) {
      // TODO: Resend OTP logic
      startResendTimer();
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
  };

  const handleBackToLogin = () => {
    // Navigate to login
    navigation.goBack();
  };

  const handleBack = () => {
    if (currentStep === 'otp') {
      setCurrentStep('email');
    } else if (currentStep === 'newPassword') {
      setCurrentStep('otp');
    }
  };

  const renderStepIndicator = () => {
    const steps = ['email', 'otp', 'newPassword', 'success'];
    const currentIndex = steps.indexOf(currentStep);

    return (
      <View style={styles.stepIndicator}>
        {steps.slice(0, 3).map((step, index) => (
          <React.Fragment key={step}>
            <View style={[
              styles.stepDot,
              index <= currentIndex && styles.stepDotActive,
              currentStep === 'success' && styles.stepDotActive,
            ]}>
              {index < currentIndex || currentStep === 'success' ? (
                <MaterialIcons name="check" size={14} color="#fff" />
              ) : (
                <Text style={[
                  styles.stepNumber,
                  index <= currentIndex && styles.stepNumberActive,
                ]}>
                  {index + 1}
                </Text>
              )}
            </View>
            {index < 2 && (
              <View style={[
                styles.stepLine,
                index < currentIndex && styles.stepLineActive,
                currentStep === 'success' && styles.stepLineActive,
              ]} />
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

      <Text style={styles.stepTitle}>Quên mật khẩu?</Text>
      <Text style={styles.stepDescription}>
        Đừng lo lắng! Nhập email đã đăng ký và chúng tôi sẽ gửi mã xác thực để đặt lại mật khẩu.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.label}>Email</Text>
        <View style={[
          styles.inputWrapper,
          focusedField === 'email' && styles.inputWrapperFocused
        ]}>
          <MaterialIcons
            name="mail-outline"
            size={22}
            color={focusedField === 'email' ? FORGOT_COLORS.primary : FORGOT_COLORS.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="nhap_email@example.com"
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            onFocus={() => setFocusedField('email')}
            onBlur={() => setFocusedField(null)}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleSendOTP}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Gửi mã xác thực</Text>
        <MaterialIcons name="arrow-forward" size={20} color={FORGOT_COLORS.buttonTextDark} />
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
          <MaterialIcons name="pin" size={32} color="#fff" />
        </LinearGradient>
      </View>

      <Text style={styles.stepTitle}>Nhập mã xác thực</Text>
      <Text style={styles.stepDescription}>
        Chúng tôi đã gửi mã 6 số đến{'\n'}
        <Text style={styles.emailHighlight}>{email}</Text>
      </Text>

      {/* OTP Input */}
      <View style={styles.otpContainer}>
        {otp.map((digit, index) => (
          <TextInput
            key={index}
            style={[
              styles.otpInput,
              digit && styles.otpInputFilled,
            ]}
            value={digit}
            onChangeText={(value) => handleOTPChange(value.slice(-1), index)}
            keyboardType="number-pad"
            maxLength={1}
            selectTextOnFocus
          />
        ))}
      </View>

      {/* Resend OTP */}
      <View style={styles.resendContainer}>
        <Text style={styles.resendText}>Không nhận được mã? </Text>
        <TouchableOpacity
          onPress={handleResendOTP}
          disabled={resendTimer > 0}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.resendLink,
            resendTimer > 0 && styles.resendLinkDisabled,
          ]}>
            {resendTimer > 0 ? `Gửi lại sau ${resendTimer}s` : 'Gửi lại'}
          </Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleVerifyOTP}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Xác nhận</Text>
        <MaterialIcons name="arrow-forward" size={20} color={FORGOT_COLORS.buttonTextDark} />
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

      <Text style={styles.stepTitle}>Tạo mật khẩu mới</Text>
      <Text style={styles.stepDescription}>
        Mật khẩu mới phải khác với mật khẩu đã sử dụng trước đó.
      </Text>

      {/* New Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Mật khẩu mới</Text>
        <View style={[
          styles.inputWrapper,
          focusedField === 'newPassword' && styles.inputWrapperFocused
        ]}>
          <MaterialIcons
            name="lock-outline"
            size={22}
            color={focusedField === 'newPassword' ? FORGOT_COLORS.primary : FORGOT_COLORS.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Tối thiểu 8 ký tự"
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={newPassword}
            onChangeText={setNewPassword}
            secureTextEntry={!showPassword}
            autoCapitalize="none"
            onFocus={() => setFocusedField('newPassword')}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity
            onPress={() => setShowPassword(!showPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={showPassword ? 'visibility' : 'visibility-off'}
              size={22}
              color={FORGOT_COLORS.textMuted}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Confirm Password Input */}
      <View style={styles.inputGroup}>
        <Text style={styles.label}>Xác nhận mật khẩu</Text>
        <View style={[
          styles.inputWrapper,
          focusedField === 'confirmPassword' && styles.inputWrapperFocused
        ]}>
          <MaterialIcons
            name="lock-outline"
            size={22}
            color={focusedField === 'confirmPassword' ? FORGOT_COLORS.primary : FORGOT_COLORS.textMuted}
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder="Nhập lại mật khẩu mới"
            placeholderTextColor={`${FORGOT_COLORS.textMuted}99`}
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry={!showConfirmPassword}
            autoCapitalize="none"
            onFocus={() => setFocusedField('confirmPassword')}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity
            onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={showConfirmPassword ? 'visibility' : 'visibility-off'}
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
            name={newPassword.length >= 8 ? 'check-circle' : 'radio-button-unchecked'}
            size={16}
            color={newPassword.length >= 8 ? FORGOT_COLORS.success : FORGOT_COLORS.textMuted}
          />
          <Text style={[
            styles.requirementText,
            newPassword.length >= 8 && styles.requirementMet,
          ]}>Ít nhất 8 ký tự</Text>
        </View>
        <View style={styles.requirementItem}>
          <MaterialIcons
            name={/[A-Z]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
            size={16}
            color={/[A-Z]/.test(newPassword) ? FORGOT_COLORS.success : FORGOT_COLORS.textMuted}
          />
          <Text style={[
            styles.requirementText,
            /[A-Z]/.test(newPassword) && styles.requirementMet,
          ]}>Ít nhất 1 chữ hoa</Text>
        </View>
        <View style={styles.requirementItem}>
          <MaterialIcons
            name={/[0-9]/.test(newPassword) ? 'check-circle' : 'radio-button-unchecked'}
            size={16}
            color={/[0-9]/.test(newPassword) ? FORGOT_COLORS.success : FORGOT_COLORS.textMuted}
          />
          <Text style={[
            styles.requirementText,
            /[0-9]/.test(newPassword) && styles.requirementMet,
          ]}>Ít nhất 1 số</Text>
        </View>
      </View>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleResetPassword}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Đặt lại mật khẩu</Text>
        <MaterialIcons name="arrow-forward" size={20} color={FORGOT_COLORS.buttonTextDark} />
      </TouchableOpacity>
    </View>
  );

  const renderSuccessStep = () => (
    <View style={styles.stepContent}>
      <View style={styles.iconContainer}>
        <View style={styles.successIconWrapper}>
          <MaterialIcons name="check-circle" size={80} color={FORGOT_COLORS.success} />
        </View>
      </View>

      <Text style={styles.stepTitle}>Thành công!</Text>
      <Text style={styles.stepDescription}>
        Mật khẩu của bạn đã được đặt lại thành công. Bạn có thể đăng nhập với mật khẩu mới.
      </Text>

      <TouchableOpacity
        style={styles.primaryButton}
        onPress={handleBackToLogin}
        activeOpacity={0.9}
      >
        <Text style={styles.primaryButtonText}>Đăng nhập ngay</Text>
        <MaterialIcons name="login" size={20} color={FORGOT_COLORS.buttonTextDark} />
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={FORGOT_COLORS.backgroundLight} />

      {/* Background Gradient */}
      <LinearGradient
        colors={[FORGOT_COLORS.primaryLight, FORGOT_COLORS.backgroundLight, FORGOT_COLORS.backgroundLight]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 0.5 }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header with Back Button */}
          {currentStep !== 'success' && currentStep !== 'email' && (
            <TouchableOpacity
              style={styles.backButton}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <MaterialIcons name="arrow-back" size={24} color={FORGOT_COLORS.textMain} />
            </TouchableOpacity>
          )}

          {/* Step Indicator */}
          {currentStep !== 'success' && renderStepIndicator()}

          {/* Step Content */}
          {currentStep === 'email' && renderEmailStep()}
          {currentStep === 'otp' && renderOTPStep()}
          {currentStep === 'newPassword' && renderNewPasswordStep()}
          {currentStep === 'success' && renderSuccessStep()}

          {/* Footer - Back to Login */}
          {currentStep !== 'success' && (
            <View style={styles.footerContainer}>
              <TouchableOpacity
                onPress={handleBackToLogin}
                activeOpacity={0.7}
                style={styles.backToLoginButton}
              >
                <MaterialIcons name="arrow-back" size={18} color={FORGOT_COLORS.textMuted} />
                <Text style={styles.backToLoginText}>Quay lại đăng nhập</Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: FORGOT_COLORS.backgroundLight,
  },
  backgroundGradient: {
    position: 'absolute',
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

  // Back Button
  backButton: {
    position: 'absolute',
    top: 16,
    left: 16,
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: FORGOT_COLORS.surfaceLight,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...SHADOWS.small,
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    paddingHorizontal: 48,
    marginBottom: 16,
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: FORGOT_COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepDotActive: {
    backgroundColor: FORGOT_COLORS.primary,
  },
  stepNumber: {
    fontSize: 13,
    fontWeight: '600',
    color: FORGOT_COLORS.textMuted,
  },
  stepNumberActive: {
    color: '#fff',
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
    alignItems: 'center',
    marginBottom: 24,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  successIconWrapper: {
    backgroundColor: FORGOT_COLORS.successLight,
    borderRadius: 50,
    padding: 10,
  },
  stepTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: FORGOT_COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 12,
    textAlign: 'center',
  },
  stepDescription: {
    fontSize: 15,
    color: FORGOT_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  emailHighlight: {
    color: FORGOT_COLORS.primary,
    fontWeight: '600',
  },

  // Input Group
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: FORGOT_COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
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
    height: '100%',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },

  // OTP Input
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
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
    fontWeight: '700',
    color: FORGOT_COLORS.textMain,
    textAlign: 'center',
    ...SHADOWS.subtle,
  },
  otpInputFilled: {
    borderColor: FORGOT_COLORS.primary,
    backgroundColor: FORGOT_COLORS.primaryLight,
  },

  // Resend OTP
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 32,
  },
  resendText: {
    fontSize: 14,
    color: FORGOT_COLORS.textMuted,
  },
  resendLink: {
    fontSize: 14,
    fontWeight: '600',
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
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  requirementText: {
    fontSize: 13,
    color: FORGOT_COLORS.textMuted,
  },
  requirementMet: {
    color: FORGOT_COLORS.success,
    fontWeight: '500',
  },

  // Primary Button
  primaryButton: {
    flexDirection: 'row',
    backgroundColor: FORGOT_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: FORGOT_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 17,
    fontWeight: '700',
    color: FORGOT_COLORS.buttonTextDark,
  },

  // Footer
  footerContainer: {
    alignItems: 'center',
    marginTop: 40,
    paddingHorizontal: 24,
  },
  backToLoginButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  backToLoginText: {
    fontSize: 14,
    fontWeight: '600',
    color: FORGOT_COLORS.textMuted,
  },
});

export default ForgotPasswordScreen;
