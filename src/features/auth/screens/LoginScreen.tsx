import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
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
} from 'react-native';
import { SHADOWS } from '../../../constants/theme.constants';

// Login screen colors matching the design
const LOGIN_COLORS = {
  primary: '#cfaa3a',
  primaryHover: '#b89530',
  backgroundLight: '#fdfdfc',
  surfaceLight: '#ffffff',
  textMain: '#191710',
  textMuted: '#6C8CA3',
  borderLight: '#e4e0d3',
  buttonTextDark: '#0f1829',
};

const LoginScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

  const handleLogin = () => {
    // Handle login logic
    console.log('Login with:', email, password);
    // Navigate to Main after successful login
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  const handleForgotPassword = () => {
    // Navigate to forgot password
    navigation.navigate('ForgotPassword');
  };

  const handleRegister = () => {
    // Navigate to register
    navigation.navigate('Register');
  };

  const handleGuestContinue = () => {
    // Continue as guest - Navigate to Main
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: 'Main' }],
      })
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={LOGIN_COLORS.backgroundLight} />
      
      {/* Background Gradient */}
      <LinearGradient
        colors={[`${LOGIN_COLORS.primary}1A`, LOGIN_COLORS.backgroundLight, LOGIN_COLORS.backgroundLight]}
        style={styles.backgroundGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
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
          {/* Header Image Section */}
          <View style={styles.imageSection}>
            <View style={styles.imageContainer}>
              <ImageBackground
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuB0Ux7Y_tnjFjgCO6Xd7NfDc2O8g9Wz55CYrhc_dBIk0WhAPoubqHgHpO1Xgvdwik8PldEi4YhnpEp2ry-7WdPYDPmcDNL7Znj6_jPH9OTnaX6FACxAz957pMYsH_pgNwh_lQX6QHgY3hsVqHqpx22d2-ENubTq2XkBN746u9Z4EQwV2rOvSziLJnFuETg9Lu7ek4MEGzg_4qGgR2otj9EWAqpNowVtTqCRverIBtFEWZ0N_Io-M7a6nGbqg4wz4Nlx3ya9-GTGXDxv' }}
                style={styles.headerImage}
                imageStyle={styles.headerImageStyle}
                resizeMode="cover"
              >
                {/* Image Overlay */}
                <View style={styles.imageOverlay} />
                
                {/* Logo Icon Overlay */}
                <View style={styles.logoContainer}>
                  <View style={styles.logoBox}>
                    <MaterialIcons name="church" size={24} color={LOGIN_COLORS.primary} />
                  </View>
                </View>
              </ImageBackground>
            </View>
          </View>

          {/* Title Section */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>Chào mừng trở lại</Text>
            <Text style={styles.subtitle}>Tiếp tục hành trình đức tin của bạn</Text>
          </View>

          {/* Form Section */}
          <View style={styles.formContainer}>
            {/* Email Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Email</Text>
              <View style={[
                styles.inputWrapper,
                emailFocused && styles.inputWrapperFocused
              ]}>
                <MaterialIcons 
                  name="mail-outline" 
                  size={22} 
                  color={emailFocused ? LOGIN_COLORS.primary : LOGIN_COLORS.textMuted} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="nhap_email_cua_ban@example.com"
                  placeholderTextColor={`${LOGIN_COLORS.textMuted}99`}
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  onFocus={() => setEmailFocused(true)}
                  onBlur={() => setEmailFocused(false)}
                />
              </View>
            </View>

            {/* Password Input */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Mật khẩu</Text>
              <View style={[
                styles.inputWrapper,
                passwordFocused && styles.inputWrapperFocused
              ]}>
                <MaterialIcons 
                  name="lock-outline" 
                  size={22} 
                  color={passwordFocused ? LOGIN_COLORS.primary : LOGIN_COLORS.textMuted} 
                  style={styles.inputIcon}
                />
                <TextInput
                  style={styles.input}
                  placeholder="••••••••"
                  placeholderTextColor={`${LOGIN_COLORS.textMuted}99`}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoComplete="password"
                  onFocus={() => setPasswordFocused(true)}
                  onBlur={() => setPasswordFocused(false)}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeButton}
                  activeOpacity={0.7}
                >
                  <MaterialIcons 
                    name={showPassword ? 'visibility' : 'visibility-off'} 
                    size={22} 
                    color={LOGIN_COLORS.textMuted} 
                  />
                </TouchableOpacity>
              </View>
              
              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={handleForgotPassword}
                style={styles.forgotPasswordContainer}
                activeOpacity={0.7}
              >
                <Text style={styles.forgotPasswordText}>Quên mật khẩu?</Text>
              </TouchableOpacity>
            </View>

            {/* Login Button */}
            <TouchableOpacity 
              style={styles.loginButton} 
              onPress={handleLogin}
              activeOpacity={0.9}
            >
              <Text style={styles.loginButtonText}>Đăng nhập</Text>
              <MaterialIcons name="arrow-forward" size={20} color={LOGIN_COLORS.buttonTextDark} />
            </TouchableOpacity>

            {/* Divider */}
            <View style={styles.dividerContainer}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Hoặc</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest Button */}
            <TouchableOpacity
              style={styles.guestButton}
              onPress={handleGuestContinue}
              activeOpacity={0.8}
            >
              <MaterialIcons name="person-outline" size={22} color={LOGIN_COLORS.buttonTextDark} />
              <Text style={styles.guestButtonText}>Tiếp tục với tư cách Khách</Text>
            </TouchableOpacity>
          </View>

          {/* Footer - Register Link */}
          <View style={styles.footerContainer}>
            <Text style={styles.footerText}>Chưa có tài khoản? </Text>
            <TouchableOpacity onPress={handleRegister} activeOpacity={0.7}>
              <Text style={styles.registerLink}>Đăng ký ngay</Text>
            </TouchableOpacity>
          </View>

          {/* Bottom Decorative Pattern */}
          <View style={styles.bottomDecoration}>
            <View style={styles.trianglePattern}>
              {[...Array(8)].map((_, i) => (
                <View key={i} style={styles.triangle} />
              ))}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LOGIN_COLORS.backgroundLight,
  },
  backgroundGradient: {
    position: 'absolute',
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
    paddingBottom: 40,
  },

  // Header Image Section
  imageSection: {
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  imageContainer: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: 16,
    overflow: 'hidden',
    ...SHADOWS.medium,
  },
  headerImage: {
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
  },
  headerImageStyle: {
    borderRadius: 16,
  },
  imageOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  logoContainer: {
    position: 'absolute',
    bottom: 16,
    left: 16,
  },
  logoBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 8,
    borderRadius: 8,
    ...SHADOWS.small,
  },

  // Title Section
  titleContainer: {
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 32,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: LOGIN_COLORS.textMain,
    letterSpacing: -0.5,
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    color: LOGIN_COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  // Form Section
  formContainer: {
    paddingHorizontal: 24,
    flex: 1,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    color: LOGIN_COLORS.textMain,
    marginBottom: 8,
    marginLeft: 4,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: LOGIN_COLORS.surfaceLight,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: LOGIN_COLORS.borderLight,
    height: 56,
    paddingHorizontal: 16,
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
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: LOGIN_COLORS.textMain,
    height: '100%',
  },
  eyeButton: {
    padding: 4,
    marginLeft: 8,
  },
  forgotPasswordContainer: {
    alignSelf: 'flex-end',
    marginTop: 8,
  },
  forgotPasswordText: {
    fontSize: 14,
    fontWeight: '600',
    color: LOGIN_COLORS.primary,
  },

  // Login Button
  loginButton: {
    flexDirection: 'row',
    backgroundColor: LOGIN_COLORS.primary,
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: LOGIN_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 14,
    elevation: 4,
    gap: 8,
  },
  loginButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: LOGIN_COLORS.buttonTextDark,
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
    backgroundColor: LOGIN_COLORS.borderLight,
  },
  dividerText: {
    fontSize: 14,
    fontWeight: '500',
    color: LOGIN_COLORS.textMuted,
    marginHorizontal: 16,
  },

  // Guest Button
  guestButton: {
    flexDirection: 'row',
    backgroundColor: 'transparent',
    height: 56,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: LOGIN_COLORS.buttonTextDark,
    gap: 8,
  },
  guestButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: LOGIN_COLORS.buttonTextDark,
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
    color: LOGIN_COLORS.textMain,
  },
  registerLink: {
    fontSize: 14,
    fontWeight: '700',
    color: LOGIN_COLORS.primary,
    marginLeft: 4,
  },

  // Bottom Decoration
  bottomDecoration: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    overflow: 'hidden',
    opacity: 0.05,
    pointerEvents: 'none',
  },
  trianglePattern: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: '100%',
  },
  triangle: {
    width: 0,
    height: 0,
    borderLeftWidth: 20,
    borderRightWidth: 20,
    borderBottomWidth: 40,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderBottomColor: LOGIN_COLORS.textMain,
  },
});

export default LoginScreen;
