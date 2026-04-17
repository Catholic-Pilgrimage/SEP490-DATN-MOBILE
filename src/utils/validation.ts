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
  /** Đăng ký quản lý điểm (verification request) */
  VERIFICATION_SITE: {
    SITE_NAME_MIN: 2,
    SITE_NAME_MAX: 200,
    PROVINCE_MIN: 2,
    PROVINCE_MAX: 120,
    ADDRESS_MIN_IF_PRESENT: 5,
    ADDRESS_MAX: 500,
    SITE_TYPE_OTHER_MIN: 2,
    SITE_TYPE_OTHER_MAX: 100,
    INTRODUCTION_MAX: 2000,
    TRANSITION_REASON_MIN: 10,
    TRANSITION_REASON_MAX: 2000,
  },
  /** Form thêm/sửa địa điểm lân cận (guide) */
  NEARBY_PLACE: {
    NAME_MIN: 2,
    NAME_MAX: 200,
    ADDRESS_MIN: 5,
    ADDRESS_MAX: 500,
    DESCRIPTION_MAX: 2000,
  },
} as const;

/** Giá trị dropdown "Khác" — khi chọn cần nhập `siteTypeOther` */
export const VERIFICATION_SITE_TYPE_OTHER = "other" as const;

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
  /** Di động VN: 0[35789] + 8 chữ số (sau khi chuẩn hoá +84 → 0). */
  PHONE_VN_MOBILE: /^0[35789][0-9]{8}$/,
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
 * Chuẩn hoá SĐT VN để kiểm tra: bỏ khoảng trắng/dấu, +84 / 84 → dạng 0xxxxxxxxx.
 */
function normalizeVietnamPhoneInput(phone: string): string {
  let c = phone.replace(/[\s\-().]/g, "");
  if (!c) return "";
  if (c.startsWith("+84")) {
    return `0${c.slice(3)}`;
  }
  if (c.startsWith("84") && c.length >= 10) {
    return `0${c.slice(2)}`;
  }
  return c;
}

/**
 * Validate Vietnamese mobile number (di động 10 số: 0[35789] + 8 chữ số).
 */
export function validatePhone(phone: string): ValidationResult {
  const cleaned = normalizeVietnamPhoneInput(phone);

  if (!cleaned) {
    return { isValid: false, message: VALIDATION_MESSAGES.PHONE_REQUIRED };
  }

  if (!PATTERNS.PHONE_VN_MOBILE.test(cleaned)) {
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

// ============================================
// EVENT FORM VALIDATORS
// ============================================

export interface EventFormData {
  name: string;
  category: string;
  startDate: Date | null;
  endDate: Date | null;
  startTime: Date | null;
  endTime: Date | null;
}

export interface EventFormErrors {
  [key: string]: string | undefined;
  name?: string;
  category?: string;
  startDate?: string;
  endDate?: string;
  startTime?: string;
  endTime?: string;
}

/**
 * Validate a specific step of the Event Form
 */
export function validateEventStep(step: number, data: EventFormData): EventFormErrors {
  const errors: EventFormErrors = {};

  if (step === 0) {
    if (!data.name.trim()) {
      errors.name = "Vui lòng nhập tên sự kiện";
    }
    if (!data.category) {
      errors.category = "Vui lòng chọn loại sự kiện";
    }
  }

  if (step === 1) {
    if (!data.startDate) {
      errors.startDate = "Vui lòng chọn ngày bắt đầu";
    }
    if (!data.endDate) {
      errors.endDate = "Vui lòng chọn ngày kết thúc";
    }
    if (!data.startTime) {
      errors.startTime = "Vui lòng chọn giờ bắt đầu";
    }
    if (!data.endTime) {
      errors.endTime = "Vui lòng chọn giờ kết thúc";
    }

    if (data.startDate && data.endDate && data.endDate < data.startDate) {
      errors.endDate = "Ngày kết thúc phải sau ngày bắt đầu";
    }
    if (data.startTime && data.endTime && data.startDate && data.endDate) {
      const sameDay = formatDateForApi(data.startDate) === formatDateForApi(data.endDate);
      if (sameDay && data.endTime <= data.startTime) {
        errors.endTime = "Giờ kết thúc phải sau giờ bắt đầu";
      }
    }
  }

  return errors;
}

/**
 * Validate the entire Event form
 */
export function validateEventFullForm(data: EventFormData): EventFormErrors {
  const step0Errors = validateEventStep(0, data);
  const step1Errors = validateEventStep(1, data);
  
  return {
    ...step0Errors,
    ...step1Errors,
  };
}

/**
 * Format time for API (HH:MM)
 */
export function formatTimeForApi(date: Date): string {
  return date.toTimeString().substring(0, 5);
}

/**
 * Helper to parse time string (HH:MM:SS) returning a new Date object
 */
export function parseTime(timeStr: string): Date {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// ============================================
// SITE MANAGER / VERIFICATION REQUEST FORM
// ============================================

export interface VerificationRequestFormInput {
  formType: "new" | "transition";
  isGuest: boolean;
  applicantName: string;
  applicantEmail: string;
  applicantPhone: string;
  siteName: string;
  siteProvince: string;
  siteAddress: string;
  siteType: string;
  /** Bắt buộc khi siteType === VERIFICATION_SITE_TYPE_OTHER */
  siteTypeOther: string;
  siteRegion: string;
  existingSiteId: string;
  transitionReason: string;
  introduction: string;
  /** Claim type of selected site (for transition form) */
  selectedSiteClaimType?: "transition" | "unassigned" | null;
}

export interface VerificationRequestFormErrors {
  [key: string]: string | undefined;
  applicantName?: string;
  applicantEmail?: string;
  applicantPhone?: string;
  siteName?: string;
  siteProvince?: string;
  siteAddress?: string;
  siteType?: string;
  siteTypeOther?: string;
  siteRegion?: string;
  existingSiteId?: string;
  transitionReason?: string;
  introduction?: string;
}

/** Values are i18n keys under verification.errors.* */
export function validateVerificationRequestForm(
  data: VerificationRequestFormInput,
): VerificationRequestFormErrors {
  const R = VALIDATION_RULES.VERIFICATION_SITE;
  const errors: VerificationRequestFormErrors = {};

  if (data.isGuest) {
    const nameRes = validateFullName(data.applicantName);
    if (!nameRes.isValid) {
      if (nameRes.message === VALIDATION_MESSAGES.NAME_REQUIRED) {
        errors.applicantName = "verification.errors.nameRequired";
      } else if (nameRes.message === VALIDATION_MESSAGES.NAME_MIN_LENGTH) {
        errors.applicantName = "verification.errors.nameTooShort";
      } else if (nameRes.message === VALIDATION_MESSAGES.NAME_MAX_LENGTH) {
        errors.applicantName = "verification.errors.nameTooLong";
      } else {
        errors.applicantName = "verification.errors.generic";
      }
    }

    const emailRes = validateEmail(data.applicantEmail);
    if (!emailRes.isValid) {
      if (emailRes.message === VALIDATION_MESSAGES.EMAIL_REQUIRED) {
        errors.applicantEmail = "verification.errors.emailRequired";
      } else if (emailRes.message === VALIDATION_MESSAGES.EMAIL_INVALID) {
        errors.applicantEmail = "verification.errors.emailInvalid";
      } else if (emailRes.message === VALIDATION_MESSAGES.EMAIL_TOO_LONG) {
        errors.applicantEmail = "verification.errors.emailTooLong";
      } else {
        errors.applicantEmail = "verification.errors.generic";
      }
    }

    if (data.applicantPhone.trim()) {
      const phoneRes = validatePhone(data.applicantPhone);
      if (!phoneRes.isValid) {
        if (phoneRes.message === VALIDATION_MESSAGES.PHONE_REQUIRED) {
          errors.applicantPhone = "verification.errors.phoneRequired";
        } else {
          errors.applicantPhone = "verification.errors.phoneInvalid";
        }
      }
    }
  }

  if (data.formType === "new") {
    const nameTrim = data.siteName.trim();
    if (!nameTrim) {
      errors.siteName = "verification.errors.siteNameRequired";
    } else if (nameTrim.length < R.SITE_NAME_MIN) {
      errors.siteName = "verification.errors.siteNameTooShort";
    } else if (nameTrim.length > R.SITE_NAME_MAX) {
      errors.siteName = "verification.errors.siteNameTooLong";
    }

    const provTrim = data.siteProvince.trim();
    if (!provTrim) {
      errors.siteProvince = "verification.errors.provinceRequired";
    } else if (provTrim.length < R.PROVINCE_MIN) {
      errors.siteProvince = "verification.errors.provinceTooShort";
    } else if (provTrim.length > R.PROVINCE_MAX) {
      errors.siteProvince = "verification.errors.provinceTooLong";
    }

    const addrTrim = data.siteAddress.trim();
    if (!addrTrim) {
      errors.siteAddress = "verification.errors.addressRequired";
    } else if (addrTrim.length < R.ADDRESS_MIN_IF_PRESENT) {
      errors.siteAddress = "verification.errors.addressTooShort";
    } else if (addrTrim.length > R.ADDRESS_MAX) {
      errors.siteAddress = "verification.errors.addressTooLong";
    }

    if (!data.siteType) {
      errors.siteType = "verification.errors.siteTypeRequired";
    } else if (data.siteType === VERIFICATION_SITE_TYPE_OTHER) {
      const other = data.siteTypeOther.trim();
      if (!other) {
        errors.siteTypeOther = "verification.errors.siteTypeOtherRequired";
      } else if (other.length < R.SITE_TYPE_OTHER_MIN) {
        errors.siteTypeOther = "verification.errors.siteTypeOtherTooShort";
      } else if (other.length > R.SITE_TYPE_OTHER_MAX) {
        errors.siteTypeOther = "verification.errors.siteTypeOtherTooLong";
      }
    }

    if (!data.siteRegion) {
      errors.siteRegion = "verification.errors.regionRequired";
    }
  } else {
    if (!data.existingSiteId) {
      errors.existingSiteId = "verification.errors.siteNotSelected";
    }

    // Only validate transition reason for "transition" claim type
    // For "unassigned" sites, transition reason is not required
    if (data.selectedSiteClaimType === "transition") {
      const reasonTrim = data.transitionReason.trim();
      if (!reasonTrim) {
        errors.transitionReason = "verification.errors.transitionReasonRequired";
      } else if (reasonTrim.length < R.TRANSITION_REASON_MIN) {
        errors.transitionReason = "verification.errors.transitionReasonTooShort";
      } else if (reasonTrim.length > R.TRANSITION_REASON_MAX) {
        errors.transitionReason = "verification.errors.transitionReasonTooLong";
      }
    }
  }

  const introTrim = data.introduction.trim();
  if (introTrim.length > R.INTRODUCTION_MAX) {
    errors.introduction = "verification.errors.introductionTooLong";
  }

  return errors;
}

export function getFirstVerificationErrorI18nKey(
  errors: VerificationRequestFormErrors,
): string | undefined {
  const order: (keyof VerificationRequestFormErrors)[] = [
    "applicantName",
    "applicantEmail",
    "applicantPhone",
    "siteName",
    "siteProvince",
    "siteAddress",
    "siteType",
    "siteTypeOther",
    "siteRegion",
    "existingSiteId",
    "transitionReason",
    "introduction",
  ];
  for (const k of order) {
    const v = errors[k];
    if (v) return v;
  }
  return undefined;
}

/**
 * Giá trị gửi API cho `site_type`: enum có sẵn hoặc `other:<mô tả>` khi chọn Khác.
 */
export function resolveVerificationSiteTypeForApi(
  siteType: string,
  siteTypeOther: string,
): string {
  if (siteType === VERIFICATION_SITE_TYPE_OTHER) {
    return `${VERIFICATION_SITE_TYPE_OTHER}:${siteTypeOther.trim()}`;
  }
  return siteType;
}

// ============================================
// NEARBY PLACE (GUIDE — ĐỊA ĐIỂM LÂN CẬN)
// ============================================

const NEARBY_PLACE_CATEGORIES = ["food", "lodging", "medical"] as const;

export interface NearbyPlaceFormInput {
  name: string;
  address: string;
  phone: string;
  description: string;
  category: string;
  latitude: number;
  longitude: number;
}

export interface NearbyPlaceFormErrors {
  [key: string]: string | undefined;
  name?: string;
  address?: string;
  phone?: string;
  description?: string;
  category?: string;
  coordinates?: string;
}

/** Giá trị lỗi là khóa i18n locationsTab.validation.* */
export function validateNearbyPlaceForm(
  data: NearbyPlaceFormInput,
): NearbyPlaceFormErrors {
  const R = VALIDATION_RULES.NEARBY_PLACE;
  const errors: NearbyPlaceFormErrors = {};

  const nameTrim = data.name.trim();
  if (!nameTrim) {
    errors.name = "locationsTab.validation.nameRequired";
  } else if (nameTrim.length < R.NAME_MIN) {
    errors.name = "locationsTab.validation.nameTooShort";
  } else if (nameTrim.length > R.NAME_MAX) {
    errors.name = "locationsTab.validation.nameTooLong";
  }

  const addrTrim = data.address.trim();
  if (!addrTrim) {
    errors.address = "locationsTab.validation.addressRequired";
  } else if (addrTrim.length < R.ADDRESS_MIN) {
    errors.address = "locationsTab.validation.addressTooShort";
  } else if (addrTrim.length > R.ADDRESS_MAX) {
    errors.address = "locationsTab.validation.addressTooLong";
  }

  if (data.phone.trim()) {
    const phoneRes = validatePhone(data.phone);
    if (!phoneRes.isValid) {
      errors.phone = "locationsTab.validation.phoneInvalid";
    }
  }

  if (data.description.trim().length > R.DESCRIPTION_MAX) {
    errors.description = "locationsTab.validation.descriptionTooLong";
  }

  if (
    !NEARBY_PLACE_CATEGORIES.includes(
      data.category as (typeof NEARBY_PLACE_CATEGORIES)[number],
    )
  ) {
    errors.category = "locationsTab.validation.categoryInvalid";
  }

  const lat = Number(data.latitude);
  const lng = Number(data.longitude);
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    errors.coordinates = "locationsTab.validation.coordinatesInvalid";
  } else if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
    errors.coordinates = "locationsTab.validation.coordinatesInvalid";
  }

  return errors;
}

export function getFirstNearbyPlaceErrorKey(
  errors: NearbyPlaceFormErrors,
): string | undefined {
  const order: (keyof NearbyPlaceFormErrors)[] = [
    "name",
    "address",
    "phone",
    "coordinates",
    "category",
    "description",
  ];
  for (const k of order) {
    const v = errors[k];
    if (v) return v;
  }
  return undefined;
}
