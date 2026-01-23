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
    View,
} from 'react-native';
import { SHADOWS } from '../../../constants/theme.constants';

// Register screen colors matching the design system
const REGISTER_COLORS = {
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
  error: '#DC4C4C',
};

const RegisterScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const handleRegister = () => {
    // Handle registration logic
    console.log('Register:', { fullName, email, phone, password, confirmPassword });
    // After successful registration, go back to login
    navigation.goBack();
  };

  const handleLogin = () => {
    // Navigate to login
    navigation.goBack();
  };

  const handleTermsPress = () => {
    // Show terms and conditions
    console.log('Show terms');
  };

  const handlePrivacyPress = () => {
    // Show privacy policy
    console.log('Show privacy');
  };

  const renderInput = (
    icon: string,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldName: string,
    options?: {
      keyboardType?: 'default' | 'email-address' | 'phone-pad';
      autoCapitalize?: 'none' | 'sentences' | 'words';
      secureTextEntry?: boolean;
      showToggle?: boolean;
      onToggle?: () => void;
      showValue?: boolean;
    }
  ) => {
    const isFocused = focusedField === fieldName;
    
    return (
      <View style={[
        styles.inputWrapper,
        isFocused && styles.inputWrapperFocused
      ]}>
        <MaterialIcons 
          name={icon as any} 
          size={22} 
          color={isFocused ? REGISTER_COLORS.primary : REGISTER_COLORS.textMuted} 
          style={styles.inputIcon}
        />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor={`${REGISTER_COLORS.textMuted}99`}
          value={value}
          onChangeText={onChangeText}
          keyboardType={options?.keyboardType || 'default'}
          autoCapitalize={options?.autoCapitalize || 'sentences'}
          secureTextEntry={options?.secureTextEntry && !options?.showValue}
          onFocus={() => setFocusedField(fieldName)}
          onBlur={() => setFocusedField(null)}
        />
        {options?.showToggle && (
          <TouchableOpacity
            onPress={options.onToggle}
            style={styles.eyeButton}
            activeOpacity={0.7}
          >
            <MaterialIcons 
              name={options.showValue ? 'visibility' : 'visibility-off'} 
              size={22} 
              color={REGISTER_COLORS.textMuted} 
            />
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={REGISTER_COLORS.backgroundLight} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[REGISTER_COLORS.primaryLight, REGISTER_COLORS.backgroundLight, REGISTER_COLORS.backgroundLight]}
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
          {/* Header Section */}
          <View style={styles.headerSection}>
            {/* Decorative Icon */}
            <View style={styles.iconContainer}>
              <LinearGradient
                colors={[REGISTER_COLORS.primary, REGISTER_COLORS.primaryHover]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialIcons name="person-add" size={32} color="#fff" />
              </LinearGradient>
            </View>

            {/* Title */}
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>
              Bắt đầu hành trình đức tin của bạn cùng chúng tôi
            </Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Full Name Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên</Text>
              {renderInput(
                'person-outline',
                'Nhập họ và tên của bạn',
                fullName,
                setFullName,
                'fullName',
                { autoCapitalize: 'words' }
              )}
            </View>

            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              {renderInput(
                'mail-outline',
                'nhap_email@example.com',
                email,
                setEmail,
                'email',
                { keyboardType: 'email-address', autoCapitalize: 'none' }
              )}
            </View>

            {/* Phone Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại</Text>
              {renderInput(
                'phone',
                '0912 345 678',
                phone,
                setPhone,
                'phone',
                { keyboardType: 'phone-pad' }
              )}
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              {renderInput(
                'lock-outline',
                'Tối thiểu 8 ký tự',
                password,
                setPassword,
                'password',
                {
                  autoCapitalize: 'none',
                  secureTextEntry: true,
                  showToggle: true,
                  onToggle: () => setShowPassword(!showPassword),
                  showValue: showPassword,
                }
              )}
            </View>

            {/* Confirm Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu</Text>
              {renderInput(
                'lock-outline',
                'Nhập lại mật khẩu',
                confirmPassword,
                setConfirmPassword,
                'confirmPassword',
                {
                  autoCapitalize: 'none',
                  secureTextEntry: true,
                  showToggle: true,
                  onToggle: () => setShowConfirmPassword(!showConfirmPassword),
                  showValue: showConfirmPassword,
                }
              )}
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => setAgreeTerms(!agreeTerms)}
              activeOpacity={0.8}
            >
              <View style={[
                styles.checkbox,
                agreeTerms && styles.checkboxChecked
              ]}>
                {agreeTerms && (
                  <MaterialIcons name="check" size={16} color="#fff" />
                )}
              </View>
              <Text style={styles.termsText}>
                Tôi đồng ý với{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>
                  Điều khoản dịch vụ
                </Text>
                {' '}và{' '}
                <Text style={styles.termsLink} onPress={handlePrivacyPress}>
                  Chính sách bảo mật
                </Text>
              </Text>
            </TouchableOpacity>

            {/* Register Button */}
            <TouchableOpacity 
              style={[
                styles.registerButton,
                !agreeTerms && styles.registerButtonDisabled
              ]} 
              onPress={handleRegister}
              activeOpacity={0.9}
              disabled={!agreeTerms}
            >
              <Text style={styles.registerButtonText}>Đăng ký</Text>
              <MaterialIcons name="arrow-forward" size={20} color={REGISTER_COLORS.buttonTextDark} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc đăng ký với</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Login Buttons */}
            <View style={styles.socialContainer}>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <MaterialIcons name="g-translate" size={24} color="#DB4437" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <MaterialIcons name="facebook" size={24} color="#4267B2" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialButton} activeOpacity={0.8}>
                <MaterialIcons name="apple" size={24} color="#000" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Footer - Login Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: REGISTER_COLORS.backgroundLight,
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

  // Header Section
  headerSection: {
    alignItems: 'center',
    paddingTop: 48,
    paddingBottom: 24,
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 20,
  },
  iconGradient: {
    width: 72,
    height: 72,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: REGISTER_COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 15,
    color: REGISTER_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },

  // Form Section
  formContainer: {
    paddingHorizontal: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: REGISTER_COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: REGISTER_COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: REGISTER_COLORS.borderLight,
    height: 54,
    paddingHorizontal: 16,
    ...SHADOWS.subtle,
  },
  inputWrapperFocused: {
    borderColor: REGISTER_COLORS.primary,
    borderWidth: 1,
    shadowColor: REGISTER_COLORS.primary,
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
    color: REGISTER_COLORS.textMain,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },

  // Terms Checkbox
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: REGISTER_COLORS.borderLight,
    marginRight: 12,
    marginTop: 2,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: REGISTER_COLORS.surfaceLight,
  },
  checkboxChecked: {
    backgroundColor: REGISTER_COLORS.primary,
    borderColor: REGISTER_COLORS.primary,
  },
  termsText: {
    flex: 1,
    fontSize: 13,
    color: REGISTER_COLORS.textMuted,
    lineHeight: 20,
  },
  termsLink: {
    color: REGISTER_COLORS.primary,
    fontWeight: '600',
  },

  // Register Button
  registerButton: {
    flexDirection: 'row',
    backgroundColor: REGISTER_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: REGISTER_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.6,
    shadowOpacity: 0.2,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: REGISTER_COLORS.buttonTextDark,
  },

  // Divider
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: REGISTER_COLORS.borderLight,
  },
  dividerText: {
    fontSize: 13,
    fontWeight: '500',
    color: REGISTER_COLORS.textMuted,
    marginHorizontal: 12,
  },

  // Social Buttons
  socialContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
  },
  socialButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: REGISTER_COLORS.surfaceLight,
    borderWidth: 1,
    borderColor: REGISTER_COLORS.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.subtle,
  },

  // Footer
  footerContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 32,
    paddingHorizontal: 24,
  },
  footerText: {
    fontSize: 14,
    color: REGISTER_COLORS.textMain,
  },
  loginLink: {
    fontSize: 14,
    fontWeight: '700',
    color: REGISTER_COLORS.primary,
    marginLeft: 4,
  },
});

export default RegisterScreen;
