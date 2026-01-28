import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Alert,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SHADOWS } from '../../../constants/theme.constants';
import { useAuth } from '../../../contexts/AuthContext';
import {
  validateRegisterForm,
  RegisterFormErrors,
  formatDateForApi,
  formatDateForDisplay,
  formatPhoneForApi,
} from '../../../utils/validation';

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
  errorLight: 'rgba(220, 76, 76, 0.1)',
};

const RegisterScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { register, isLoading, error, clearError } = useAuth();
  
  // Form states
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);

  // Focus states
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Validation states
  const [validationErrors, setValidationErrors] = useState<RegisterFormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Animation
  const shakeAnimation = useRef(new Animated.Value(0)).current;
  const errorBannerAnimation = useRef(new Animated.Value(0)).current;

  // Clear auth error when form changes
  useEffect(() => {
    if (error) {
      clearError();
    }
  }, [fullName, email, phone, password, confirmPassword, dateOfBirth]);

  // Show error banner animation
  useEffect(() => {
    if (error) {
      Animated.timing(errorBannerAnimation, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
      
      // Shake animation
      Animated.sequence([
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: -10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 10, duration: 50, useNativeDriver: true }),
        Animated.timing(shakeAnimation, { toValue: 0, duration: 50, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.timing(errorBannerAnimation, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [error]);

  // Validate form using centralized validation
  const validateForm = (): boolean => {
    const errors = validateRegisterForm({
      fullName,
      email,
      phone,
      password,
      confirmPassword,
      dateOfBirth,
      agreeTerms,
    });

    setValidationErrors(errors);
    return Object.values(errors).every(error => !error);
  };

  const handleRegister = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await register({
        email: email.trim().toLowerCase(),
        password,
        full_name: fullName.trim(),
        phone: formatPhoneForApi(phone),
        date_of_birth: formatDateForApi(dateOfBirth!),
      });

      Alert.alert(
        'Đăng ký thành công!',
        'Tài khoản của bạn đã được tạo. Vui lòng đăng nhập để tiếp tục.',
        [{ text: 'Đăng nhập', onPress: () => navigation.goBack() }]
      );
    } catch {
      // Error is handled by AuthContext and displayed in error banner
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogin = () => navigation.goBack();

  const handleTermsPress = () => {
    Alert.alert('Điều khoản dịch vụ', 'Nội dung điều khoản dịch vụ sẽ được hiển thị ở đây.');
  };

  const handlePrivacyPress = () => {
    Alert.alert('Chính sách bảo mật', 'Nội dung chính sách bảo mật sẽ được hiển thị ở đây.');
  };

  const handleDateChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDateOfBirth(selectedDate);
      setValidationErrors(prev => ({ ...prev, dateOfBirth: undefined }));
    }
  };

  // Clear field error when user starts typing
  const clearFieldError = (fieldName: string) => {
    if (validationErrors[fieldName]) {
      setValidationErrors(prev => ({ ...prev, [fieldName]: undefined }));
    }
  };

  type FieldName = 'fullName' | 'email' | 'phone' | 'password' | 'confirmPassword' | 'dateOfBirth' | 'terms';
  
  const renderInput = (
    icon: string,
    placeholder: string,
    value: string,
    onChangeText: (text: string) => void,
    fieldName: FieldName,
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
    const errorMessage = validationErrors[fieldName];
    const hasError = !!errorMessage;
    
    return (
      <View>
        <View style={[
          styles.inputWrapper,
          isFocused && styles.inputWrapperFocused,
          hasError && styles.inputWrapperError,
        ]}>
          <MaterialIcons 
            name={icon as any} 
            size={22} 
            color={hasError ? REGISTER_COLORS.error : (isFocused ? REGISTER_COLORS.primary : REGISTER_COLORS.textMuted)} 
            style={styles.inputIcon}
          />
          <TextInput
            style={styles.input}
            placeholder={placeholder}
            placeholderTextColor={`${REGISTER_COLORS.textMuted}99`}
            value={value}
            onChangeText={(text) => {
              onChangeText(text);
              clearFieldError(fieldName);
            }}
            keyboardType={options?.keyboardType || 'default'}
            autoCapitalize={options?.autoCapitalize || 'sentences'}
            secureTextEntry={options?.secureTextEntry && !options?.showValue}
            onFocus={() => setFocusedField(fieldName)}
            onBlur={() => setFocusedField(null)}
            editable={!isLoading && !isSubmitting}
          />
          {options?.showToggle && (
            <TouchableOpacity
              onPress={options.onToggle}
              style={styles.eyeButton}
              activeOpacity={0.7}
              disabled={isLoading || isSubmitting}
            >
              <MaterialIcons 
                name={options.showValue ? 'visibility' : 'visibility-off'} 
                size={22} 
                color={REGISTER_COLORS.textMuted} 
              />
            </TouchableOpacity>
          )}
        </View>
        {hasError && <Text style={styles.fieldError}>{errorMessage}</Text>}
      </View>
    );
  };

  const renderDateInput = () => {
    const errorMessage = validationErrors.dateOfBirth;
    const hasError = !!errorMessage;
    
    return (
      <View>
        <TouchableOpacity
          onPress={() => setShowDatePicker(true)}
          disabled={isLoading || isSubmitting}
          activeOpacity={0.7}
        >
          <View style={[
            styles.inputWrapper,
            hasError && styles.inputWrapperError,
          ]}>
            <MaterialIcons 
              name="calendar-today" 
              size={22} 
              color={hasError ? REGISTER_COLORS.error : REGISTER_COLORS.textMuted} 
              style={styles.inputIcon}
            />
            <Text style={[styles.dateText, !dateOfBirth && styles.datePlaceholder]}>
              {dateOfBirth ? formatDateForDisplay(dateOfBirth) : 'Chọn ngày sinh'}
            </Text>
            <MaterialIcons name="arrow-drop-down" size={24} color={REGISTER_COLORS.textMuted} />
          </View>
        </TouchableOpacity>
        {hasError && <Text style={styles.fieldError}>{errorMessage}</Text>}
        
        {showDatePicker && Platform.OS === 'android' && (
          <DateTimePicker
            value={dateOfBirth || new Date(2000, 0, 1)}
            mode="date"
            display="default"
            onChange={handleDateChange}
            maximumDate={new Date()}
            minimumDate={new Date(1900, 0, 1)}
          />
        )}
      </View>
    );
  };

  const isDisabled = isLoading || isSubmitting;

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={REGISTER_COLORS.backgroundLight} />
      
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
          {/* Header */}
          <View style={styles.headerSection}>
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
            <Text style={styles.title}>Tạo tài khoản mới</Text>
            <Text style={styles.subtitle}>
              Bắt đầu hành trình đức tin của bạn cùng chúng tôi
            </Text>
          </View>

          {/* Error Banner */}
          {error && (
            <Animated.View
              style={[
                styles.errorBanner,
                {
                  opacity: errorBannerAnimation,
                  transform: [
                    { translateX: shakeAnimation },
                    {
                      translateY: errorBannerAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [-20, 0],
                      }),
                    },
                  ],
                },
              ]}
            >
              <MaterialIcons name="error-outline" size={20} color={REGISTER_COLORS.error} />
              <Text style={styles.errorBannerText}>{error}</Text>
            </Animated.View>
          )}

          {/* Form */}
          <View style={styles.formContainer}>
            {/* Full Name */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Họ và tên <Text style={styles.required}>*</Text></Text>
              {renderInput('person-outline', 'Nhập họ và tên của bạn', fullName, setFullName, 'fullName', { autoCapitalize: 'words' })}
            </View>

            {/* Email */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email <Text style={styles.required}>*</Text></Text>
              {renderInput('mail-outline', 'nhap_email@example.com', email, setEmail, 'email', { keyboardType: 'email-address', autoCapitalize: 'none' })}
            </View>

            {/* Phone */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Số điện thoại <Text style={styles.required}>*</Text></Text>
              {renderInput('phone', '0912 345 678', phone, setPhone, 'phone', { keyboardType: 'phone-pad' })}
            </View>

            {/* Date of Birth */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ngày sinh <Text style={styles.required}>*</Text></Text>
              {renderDateInput()}
            </View>

            {/* Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu <Text style={styles.required}>*</Text></Text>
              {renderInput('lock-outline', 'Nhập mật khẩu', password, setPassword, 'password', {
                autoCapitalize: 'none',
                secureTextEntry: true,
                showToggle: true,
                onToggle: () => setShowPassword(!showPassword),
                showValue: showPassword,
              })}
              <Text style={styles.passwordHint}>
                Ít nhất 6 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt
              </Text>
            </View>

            {/* Confirm Password */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Xác nhận mật khẩu <Text style={styles.required}>*</Text></Text>
              {renderInput('lock-outline', 'Nhập lại mật khẩu', confirmPassword, setConfirmPassword, 'confirmPassword', {
                autoCapitalize: 'none',
                secureTextEntry: true,
                showToggle: true,
                onToggle: () => setShowConfirmPassword(!showConfirmPassword),
                showValue: showConfirmPassword,
              })}
            </View>

            {/* Terms Checkbox */}
            <TouchableOpacity 
              style={styles.termsContainer}
              onPress={() => {
                setAgreeTerms(!agreeTerms);
                clearFieldError('terms');
              }}
              activeOpacity={0.8}
              disabled={isDisabled}
            >
              <View style={[
                styles.checkbox,
                agreeTerms && styles.checkboxChecked,
                validationErrors.terms && styles.checkboxError,
              ]}>
                {agreeTerms && <MaterialIcons name="check" size={16} color="#fff" />}
              </View>
              <Text style={styles.termsText}>
                Tôi đồng ý với{' '}
                <Text style={styles.termsLink} onPress={handleTermsPress}>Điều khoản dịch vụ</Text>
                {' '}và{' '}
                <Text style={styles.termsLink} onPress={handlePrivacyPress}>Chính sách bảo mật</Text>
              </Text>
            </TouchableOpacity>
            {validationErrors.terms && (
              <Text style={[styles.fieldError, styles.termsError]}>{validationErrors.terms}</Text>
            )}

            {/* Register Button */}
            <TouchableOpacity 
              style={[styles.registerButton, isDisabled && styles.registerButtonDisabled]} 
              onPress={handleRegister}
              activeOpacity={0.9}
              disabled={isDisabled}
            >
              {isDisabled ? (
                <ActivityIndicator size="small" color={REGISTER_COLORS.buttonTextDark} />
              ) : (
                <>
                  <Text style={styles.registerButtonText}>Đăng ký</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={REGISTER_COLORS.buttonTextDark} />
                </>
              )}
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc đăng ký với</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Social Buttons */}
            <View style={styles.socialContainer}>
              {['g-translate', 'facebook', 'apple'].map((icon, index) => (
                <TouchableOpacity 
                  key={icon}
                  style={styles.socialButton} 
                  activeOpacity={0.8}
                  disabled={isDisabled}
                >
                  <MaterialIcons 
                    name={icon as any} 
                    size={24} 
                    color={index === 0 ? '#DB4437' : index === 1 ? '#4267B2' : '#000'} 
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Đã có tài khoản? </Text>
            <TouchableOpacity onPress={handleLogin} activeOpacity={0.7} disabled={isDisabled}>
              <Text style={styles.loginLink}>Đăng nhập ngay</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* iOS Date Picker Modal */}
      {Platform.OS === 'ios' && showDatePicker && (
        <View style={styles.iosDatePickerOverlay}>
          <View style={styles.iosDatePickerContainer}>
            <View style={styles.iosDatePickerHeader}>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.iosDatePickerCancel}>Hủy</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setShowDatePicker(false)}>
                <Text style={styles.iosDatePickerDone}>Xong</Text>
              </TouchableOpacity>
            </View>
            <DateTimePicker
              value={dateOfBirth || new Date(2000, 0, 1)}
              mode="date"
              display="spinner"
              onChange={handleDateChange}
              maximumDate={new Date()}
              minimumDate={new Date(1900, 0, 1)}
              style={styles.iosDatePicker}
            />
          </View>
        </View>
      )}
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
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: REGISTER_COLORS.errorLight,
    marginHorizontal: 24,
    marginBottom: 16,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: `${REGISTER_COLORS.error}30`,
    gap: 12,
  },
  errorBannerText: {
    flex: 1,
    fontSize: 14,
    color: REGISTER_COLORS.error,
    fontWeight: '500',
  },
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
  required: {
    color: REGISTER_COLORS.error,
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
    shadowColor: REGISTER_COLORS.primary,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 2,
  },
  inputWrapperError: {
    borderColor: REGISTER_COLORS.error,
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
  fieldError: {
    fontSize: 12,
    color: REGISTER_COLORS.error,
    marginTop: 6,
    marginLeft: 4,
  },
  passwordHint: {
    fontSize: 12,
    color: REGISTER_COLORS.textMuted,
    marginTop: 6,
    marginLeft: 4,
    fontStyle: 'italic',
  },
  dateText: {
    flex: 1,
    fontSize: 15,
    color: REGISTER_COLORS.textMain,
  },
  datePlaceholder: {
    color: `${REGISTER_COLORS.textMuted}99`,
  },
  termsContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
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
  checkboxError: {
    borderColor: REGISTER_COLORS.error,
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
  termsError: {
    marginTop: 0,
    marginBottom: 16,
  },
  registerButton: {
    flexDirection: 'row',
    backgroundColor: REGISTER_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    shadowColor: REGISTER_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  registerButtonDisabled: {
    opacity: 0.7,
    shadowOpacity: 0.2,
  },
  registerButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: REGISTER_COLORS.buttonTextDark,
  },
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
  iosDatePickerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  iosDatePickerContainer: {
    backgroundColor: REGISTER_COLORS.surfaceLight,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
  },
  iosDatePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: REGISTER_COLORS.borderLight,
  },
  iosDatePickerCancel: {
    fontSize: 16,
    color: REGISTER_COLORS.textMuted,
  },
  iosDatePickerDone: {
    fontSize: 16,
    fontWeight: '600',
    color: REGISTER_COLORS.primary,
  },
  iosDatePicker: {
    height: 200,
  },
});

export default RegisterScreen;
