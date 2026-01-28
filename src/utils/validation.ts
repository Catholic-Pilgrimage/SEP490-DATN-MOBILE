// Centralized validation utilities
// Use this module for all form validations across the app

// ============================================
// VALIDATION RESULT TYPE
// ============================================
export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

// ============================================
// VALIDATION RULES - Configurable constants
// ============================================
export const VALIDATION_RULES = {
  PASSWORD: {
    MIN_LENGTH: 6,
    REQUIRE_UPPERCASE: true,
    REQUIRE_LOWERCASE: true,
    REQUIRE_NUMBER: true,
    REQUIRE_SPECIAL: true,
  },
  PHONE: {
    MIN_LENGTH: 10,
    MAX_LENGTH: 11,
    COUNTRY_CODE: '84',
  },
  NAME: {
    MIN_LENGTH: 2,
    MAX_LENGTH: 100,
  },
  EMAIL: {
    MAX_LENGTH: 255,
  },
  AGE: {
    MIN_AGE: 13,
  },
} as const;

// ============================================
// VALIDATION MESSAGES - Vietnamese
// ============================================
export const VALIDATION_MESSAGES = {
  REQUIRED: 'Trường này là bắt buộc',
  
  // Email
  EMAIL_REQUIRED: 'Vui lòng nhập email',
  EMAIL_INVALID: 'Email không hợp lệ',
  EMAIL_TOO_LONG: `Email không được vượt quá ${VALIDATION_RULES.EMAIL.MAX_LENGTH} ký tự`,
  
  // Password
  PASSWORD_REQUIRED: 'Vui lòng nhập mật khẩu',
  PASSWORD_MIN_LENGTH: `Mật khẩu phải có ít nhất ${VALIDATION_RULES.PASSWORD.MIN_LENGTH} ký tự`,
  PASSWORD_UPPERCASE: 'Mật khẩu phải có ít nhất 1 chữ hoa',
  PASSWORD_LOWERCASE: 'Mật khẩu phải có ít nhất 1 chữ thường',
  PASSWORD_NUMBER: 'Mật khẩu phải có ít nhất 1 số',
  PASSWORD_SPECIAL: 'Mật khẩu phải có ít nhất 1 ký tự đặc biệt',
  PASSWORD_CONFIRM_REQUIRED: 'Vui lòng xác nhận mật khẩu',
  PASSWORD_MISMATCH: 'Mật khẩu xác nhận không khớp',
  
  // Phone
  PHONE_REQUIRED: 'Vui lòng nhập số điện thoại',
  PHONE_INVALID: 'Số điện thoại không hợp lệ',
  PHONE_LENGTH: `Số điện thoại phải có ${VALIDATION_RULES.PHONE.MIN_LENGTH}-${VALIDATION_RULES.PHONE.MAX_LENGTH} số`,
  
  // Name
  NAME_REQUIRED: 'Vui lòng nhập họ và tên',
  NAME_MIN_LENGTH: `Họ và tên phải có ít nhất ${VALIDATION_RULES.NAME.MIN_LENGTH} ký tự`,
  NAME_MAX_LENGTH: `Họ và tên không được vượt quá ${VALIDATION_RULES.NAME.MAX_LENGTH} ký tự`,
  
  // Date of birth
  DOB_REQUIRED: 'Vui lòng chọn ngày sinh',
  DOB_MIN_AGE: `Bạn phải từ ${VALIDATION_RULES.AGE.MIN_AGE} tuổi trở lên`,
  DOB_INVALID: 'Ngày sinh không hợp lệ',
  
  // Terms
  TERMS_REQUIRED: 'Bạn phải đồng ý với điều khoản dịch vụ',
} as const;

// ============================================
// REGEX PATTERNS
// ============================================
const PATTERNS = {
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  PHONE_VN: /^(0|84|\+84)?([3|5|7|8|9])[0-9]{8}$/,
  UPPERCASE: /[A-Z]/,
  LOWERCASE: /[a-z]/,
  NUMBER: /[0-9]/,
  SPECIAL_CHAR: /[!@#$%^&*(),.?":{}|<>_\-+=\[\]\\;'`~\/]/,
  VIETNAMESE_NAME: /^[a-zA-ZÀÁÂÃÈÉÊÌÍÒÓÔÕÙÚĂĐĨŨƠàáâãèéêìíòóôõùúăđĩũơƯĂẠẢẤẦẨẪẬẮẰẲẴẶẸẺẼỀỀỂưăạảấầẩẫậắằẳẵặẹẻẽềềểỄỆỈỊỌỎỐỒỔỖỘỚỜỞỠỢỤỦỨỪễệỉịọỏốồổỗộớờởỡợụủứừỬỮỰỲỴÝỶỸửữựỳỵỷỹ\s]+$/,
} as const;

// ============================================
// INDIVIDUAL VALIDATORS
// ============================================

/**
 * Validate email address
 */
export function validateEmail(email: string): ValidationResult {
  const trimmed = email.trim();
  
  if (!trimmed) {
    return { isValid: false, message: VALIDATION_MESSAGES.EMAIL_REQUIRED };
  }
  
  if (trimmed.length > VALIDATION_RULES.EMAIL.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_MESSAGES.EMAIL_TOO_LONG };
  }
  
  if (!PATTERNS.EMAIL.test(trimmed)) {
    return { isValid: false, message: VALIDATION_MESSAGES.EMAIL_INVALID };
  }
  
  return { isValid: true };
}

/**
 * Validate password with configurable rules
 */
export function validatePassword(password: string): ValidationResult {
  if (!password) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_REQUIRED };
  }
  
  if (password.length < VALIDATION_RULES.PASSWORD.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_MIN_LENGTH };
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_UPPERCASE && !PATTERNS.UPPERCASE.test(password)) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_UPPERCASE };
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_LOWERCASE && !PATTERNS.LOWERCASE.test(password)) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_LOWERCASE };
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_NUMBER && !PATTERNS.NUMBER.test(password)) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_NUMBER };
  }
  
  if (VALIDATION_RULES.PASSWORD.REQUIRE_SPECIAL && !PATTERNS.SPECIAL_CHAR.test(password)) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_SPECIAL };
  }
  
  return { isValid: true };
}

/**
 * Validate password confirmation
 */
export function validateConfirmPassword(password: string, confirmPassword: string): ValidationResult {
  if (!confirmPassword) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_CONFIRM_REQUIRED };
  }
  
  if (password !== confirmPassword) {
    return { isValid: false, message: VALIDATION_MESSAGES.PASSWORD_MISMATCH };
  }
  
  return { isValid: true };
}

/**
 * Validate Vietnamese phone number
 */
export function validatePhone(phone: string): ValidationResult {
  // Remove spaces and special characters
  const cleaned = phone.replace(/[\s\-().]/g, '');
  
  if (!cleaned) {
    return { isValid: false, message: VALIDATION_MESSAGES.PHONE_REQUIRED };
  }
  
  if (!PATTERNS.PHONE_VN.test(cleaned)) {
    return { isValid: false, message: VALIDATION_MESSAGES.PHONE_INVALID };
  }
  
  return { isValid: true };
}

/**
 * Validate full name
 */
export function validateFullName(name: string): ValidationResult {
  const trimmed = name.trim();
  
  if (!trimmed) {
    return { isValid: false, message: VALIDATION_MESSAGES.NAME_REQUIRED };
  }
  
  if (trimmed.length < VALIDATION_RULES.NAME.MIN_LENGTH) {
    return { isValid: false, message: VALIDATION_MESSAGES.NAME_MIN_LENGTH };
  }
  
  if (trimmed.length > VALIDATION_RULES.NAME.MAX_LENGTH) {
    return { isValid: false, message: VALIDATION_MESSAGES.NAME_MAX_LENGTH };
  }
  
  return { isValid: true };
}

/**
 * Validate date of birth (minimum age check)
 */
export function validateDateOfBirth(date: Date | null): ValidationResult {
  if (!date) {
    return { isValid: false, message: VALIDATION_MESSAGES.DOB_REQUIRED };
  }
  
  if (isNaN(date.getTime())) {
    return { isValid: false, message: VALIDATION_MESSAGES.DOB_INVALID };
  }
  
  const today = new Date();
  const birthDate = new Date(date);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  if (age < VALIDATION_RULES.AGE.MIN_AGE) {
    return { isValid: false, message: VALIDATION_MESSAGES.DOB_MIN_AGE };
  }
  
  return { isValid: true };
}

/**
 * Validate terms acceptance
 */
export function validateTerms(accepted: boolean): ValidationResult {
  if (!accepted) {
    return { isValid: false, message: VALIDATION_MESSAGES.TERMS_REQUIRED };
  }
  
  return { isValid: true };
}

/**
 * Generic required field validation
 */
export function validateRequired(value: string, fieldName?: string): ValidationResult {
  if (!value || !value.trim()) {
    return { 
      isValid: false, 
      message: fieldName ? `Vui lòng nhập ${fieldName}` : VALIDATION_MESSAGES.REQUIRED 
    };
  }
  
  return { isValid: true };
}

// ============================================
// FORM VALIDATORS - Validate entire forms
// ============================================

export interface RegisterFormData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
  dateOfBirth: Date | null;
  agreeTerms: boolean;
}

export interface RegisterFormErrors {
  [key: string]: string | undefined;
  fullName?: string;
  email?: string;
  phone?: string;
  password?: string;
  confirmPassword?: string;
  dateOfBirth?: string;
  terms?: string;
}

/**
 * Validate entire registration form
 * Returns object with field errors (empty object = valid)
 */
export function validateRegisterForm(data: RegisterFormData): RegisterFormErrors {
  const errors: RegisterFormErrors = {};
  
  // Full name
  const nameResult = validateFullName(data.fullName);
  if (!nameResult.isValid) {
    errors.fullName = nameResult.message;
  }
  
  // Email
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.message;
  }
  
  // Phone
  const phoneResult = validatePhone(data.phone);
  if (!phoneResult.isValid) {
    errors.phone = phoneResult.message;
  }
  
  // Date of birth
  const dobResult = validateDateOfBirth(data.dateOfBirth);
  if (!dobResult.isValid) {
    errors.dateOfBirth = dobResult.message;
  }
  
  // Password
  const passwordResult = validatePassword(data.password);
  if (!passwordResult.isValid) {
    errors.password = passwordResult.message;
  }
  
  // Confirm password
  const confirmResult = validateConfirmPassword(data.password, data.confirmPassword);
  if (!confirmResult.isValid) {
    errors.confirmPassword = confirmResult.message;
  }
  
  // Terms
  const termsResult = validateTerms(data.agreeTerms);
  if (!termsResult.isValid) {
    errors.terms = termsResult.message;
  }
  
  return errors;
}

export interface LoginFormData {
  email: string;
  password: string;
}

export interface LoginFormErrors {
  [key: string]: string | undefined;
  email?: string;
  password?: string;
}

/**
 * Validate login form
 */
export function validateLoginForm(data: LoginFormData): LoginFormErrors {
  const errors: LoginFormErrors = {};
  
  // Email
  const emailResult = validateEmail(data.email);
  if (!emailResult.isValid) {
    errors.email = emailResult.message;
  }
  
  // Password - only check required for login
  if (!data.password) {
    errors.password = VALIDATION_MESSAGES.PASSWORD_REQUIRED;
  }
  
  return errors;
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Check if form has any errors
 */
export function hasErrors(errors: Record<string, string | undefined>): boolean {
  return Object.values(errors).some(error => !!error);
}

/**
 * Get first error message from errors object
 */
export function getFirstError(errors: Record<string, string | undefined>): string | undefined {
  return Object.values(errors).find(error => !!error);
}

/**
 * Format phone number for API (remove spaces, ensure correct format)
 */
export function formatPhoneForApi(phone: string): string {
  return phone.replace(/[\s\-().]/g, '');
}

/**
 * Format date for API (YYYY-MM-DD)
 */
export function formatDateForApi(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Format date for display (DD/MM/YYYY)
 */
export function formatDateForDisplay(date: Date): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

/**
 * Get password strength (0-4)
 * 0: Very weak, 1: Weak, 2: Fair, 3: Strong, 4: Very strong
 */
export function getPasswordStrength(password: string): number {
  let strength = 0;
  
  if (password.length >= 6) strength++;
  if (password.length >= 10) strength++;
  if (PATTERNS.UPPERCASE.test(password) && PATTERNS.LOWERCASE.test(password)) strength++;
  if (PATTERNS.NUMBER.test(password)) strength++;
  if (PATTERNS.SPECIAL_CHAR.test(password)) strength++;
  
  return Math.min(strength, 4);
}

/**
 * Get password strength label
 */
export function getPasswordStrengthLabel(strength: number): string {
  const labels = ['Rất yếu', 'Yếu', 'Trung bình', 'Mạnh', 'Rất mạnh'];
  return labels[strength] || labels[0];
}
