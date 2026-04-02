/**
 * EventDetailScreen
 * View, Create, Edit events with real API
 *
 * Modes:
 * - Create: No eventId passed → multi-step form with progress indicator
 * - View/Edit: eventId passed, fetch event data
 *
 * Features:
 * - Multi-step form (3 steps) with progress indicator
 * - Inline validation feedback with error messages
 * - Date validation (end date >= start date, auto-suggest)
 * - Event category dropdown
 * - Banner image upload with compression
 * - Accessible button contrast (WCAG AA)
 */
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import { GUIDE_COLORS } from "../../../../constants/guide.constants";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "../../../../services/api/guide";
import { EventStatus } from "../../../../types/guide";
import {
  formatDateForApi,
  formatTimeForApi,
  parseTime,
  validateEventFullForm,
  validateEventStep,
} from "../../../../utils/validation";
import { StatusBadge } from "../components/StatusBadge";
import {
  CATEGORY_GROUP_GRADIENTS,
  DEFAULT_EVENT_GRADIENT as DEFAULT_GRADIENT,
  EVENT_CATEGORY_GROUPS,
  findCategoryByValue,
  parseEventCategoryAndDescription,
} from "../utils/eventCategoryUi";
import { styles } from "./EventDetailScreenNew.styles";

type EventDetailRouteProp = RouteProp<MySiteStackParamList, "EventDetail">;

const STATUS_LABELS: Record<EventStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Từ chối",
};

// ============================================
// CONSTANTS
// ============================================

/** Form step definitions for multi-step form */
const FORM_STEPS = [
  { key: "basic", label: "Thông tin cơ bản", icon: "info" as const },
  { key: "datetime", label: "Thời gian", icon: "schedule" as const },
  { key: "location", label: "Địa điểm & Ảnh bìa", icon: "place" as const },
];

// ============================================
// STEP INDICATOR
// ============================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: typeof FORM_STEPS;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  currentStep,
  totalSteps,
  steps,
}) => {
  const progress = ((currentStep + 1) / totalSteps) * 100;

  return (
    <View style={styles.stepIndicatorContainer}>
      {/* Progress bar */}
      <View style={styles.progressBarBg}>
        <View
          style={[styles.progressBarFill, { width: `${progress}%` }]}
        />
      </View>
      {/* Step label */}
      <View style={styles.stepLabelRow}>
        <View style={styles.stepBadge}>
          <Text style={styles.stepBadgeText}>
            {currentStep + 1}/{totalSteps}
          </Text>
        </View>
        <Text style={styles.stepLabelText}>{steps[currentStep].label}</Text>
      </View>
      {/* Step dots */}
      <View style={styles.stepDotsRow}>
        {steps.map((step, index) => (
          <View key={step.key} style={styles.stepDotItem}>
            <View
              style={[
                styles.stepDot,
                index < currentStep && styles.stepDotCompleted,
                index === currentStep && styles.stepDotActive,
                index > currentStep && styles.stepDotInactive,
              ]}
            >
              {index < currentStep ? (
                <MaterialIcons
                  name="check"
                  size={12}
                  color={GUIDE_COLORS.surface}
                />
              ) : (
                <Text
                  style={[
                    styles.stepDotNumber,
                    index === currentStep && styles.stepDotNumberActive,
                  ]}
                >
                  {index + 1}
                </Text>
              )}
            </View>
            {index < steps.length - 1 && (
              <View
                style={[
                  styles.stepConnector,
                  index < currentStep && styles.stepConnectorCompleted,
                ]}
              />
            )}
          </View>
        ))}
      </View>
    </View>
  );
};

// ============================================
// INPUT FIELD WITH INLINE VALIDATION
// ============================================

interface InputFieldProps {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  placeholder: string;
  multiline?: boolean;
  numberOfLines?: number;
  icon?: keyof typeof MaterialIcons.glyphMap;
  required?: boolean;
  editable?: boolean;
  maxLength?: number;
  error?: string;
}

const InputField: React.FC<InputFieldProps> = ({
  label,
  value,
  onChangeText,
  placeholder,
  multiline = false,
  numberOfLines = 1,
  icon,
  required = false,
  editable = true,
  maxLength,
  error,
}) => (
  <View style={styles.fieldContainer}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}> *</Text>}
    </View>
    <View
      style={[
        styles.inputContainer,
        multiline && styles.inputContainerMultiline,
        !editable && styles.inputDisabled,
        !!error && styles.inputError,
      ]}
    >
      {/* Icon only for single-line inputs (not textarea) */}
      {icon && !multiline && (
        <MaterialIcons
          name={icon}
          size={20}
          color={
            error
              ? GUIDE_COLORS.error
              : editable
                ? GUIDE_COLORS.primary
                : GUIDE_COLORS.gray400
          }
          style={styles.inputIcon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          icon && !multiline && styles.inputWithIcon,
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={GUIDE_COLORS.gray400}
        multiline={multiline}
        numberOfLines={numberOfLines}
        textAlignVertical={multiline ? "top" : "center"}
        editable={editable}
        maxLength={maxLength}
        scrollEnabled={multiline}
      />
    </View>
    {/* Inline error message */}
    {error ? (
      <View style={styles.errorRow}>
        <MaterialIcons name="error-outline" size={14} color={GUIDE_COLORS.error} />
        <Text style={styles.errorText}>{error}</Text>
      </View>
    ) : (
      maxLength && (
        <Text style={styles.charCount}>
          {value.length}/{maxLength}
        </Text>
      )
    )}
  </View>
);

// ============================================
// CATEGORY PICKER (DROPDOWN)
// ============================================

interface CategoryPickerProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  editable?: boolean;
  error?: string;
}

const CategoryPicker: React.FC<CategoryPickerProps> = ({
  label,
  value,
  onChange,
  required = false,
  editable = true,
  error,
}) => {
  const [showOptions, setShowOptions] = useState(false);

  // Resolve display label from grouped data
  const found = value ? findCategoryByValue(value) : null;
  const selectedLabel = found ? found.item.label : "Chọn loại sự kiện";

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}> *</Text>}
      </View>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          !editable && styles.inputDisabled,
          !!error && styles.inputError,
        ]}
        onPress={() => editable && setShowOptions(!showOptions)}
        disabled={!editable}
        activeOpacity={0.7}
      >
        <MaterialIcons
          name="category"
          size={20}
          color={
            error
              ? GUIDE_COLORS.error
              : editable
                ? GUIDE_COLORS.primary
                : GUIDE_COLORS.gray400
          }
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.input,
            styles.inputWithIcon,
            !value && styles.placeholder,
          ]}
        >
          {value ? selectedLabel : "Chọn loại sự kiện"}
        </Text>
        <MaterialIcons
          name={showOptions ? "keyboard-arrow-up" : "keyboard-arrow-down"}
          size={20}
          color={GUIDE_COLORS.gray400}
        />
      </TouchableOpacity>
      {/* Inline error */}
      {error && (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={14} color={GUIDE_COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}
      {/* Grouped Dropdown */}
      {showOptions && (
        <ScrollView
          style={styles.dropdownContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={true}
        >
          {EVENT_CATEGORY_GROUPS.map((group) => (
            <View key={group.groupLabel}>
              {/* Group Header — non-clickable */}
              <View style={styles.dropdownGroupHeader}>
                <MaterialIcons
                  name={group.icon}
                  size={16}
                  color={GUIDE_COLORS.textSecondary}
                />
                <Text style={styles.dropdownGroupLabel}>
                  {group.groupLabel}
                </Text>
              </View>
              {/* Group Items */}
              {group.items.map((item) => (
                <TouchableOpacity
                  key={item.value}
                  style={[
                    styles.dropdownItem,
                    value === item.value && styles.dropdownItemActive,
                  ]}
                  onPress={() => {
                    onChange(item.value);
                    setShowOptions(false);
                  }}
                  activeOpacity={0.7}
                >
                  <Text
                    style={[
                      styles.dropdownItemText,
                      value === item.value && styles.dropdownItemTextActive,
                    ]}
                  >
                    {item.label}
                  </Text>
                  {value === item.value && (
                    <MaterialIcons
                      name="check"
                      size={18}
                      color={GUIDE_COLORS.primary}
                    />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
};

// ============================================
// DATE/TIME PICKER FIELD WITH VALIDATION
// ============================================

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  placeholder: string;
  required?: boolean;
  editable?: boolean;
  error?: string;
  minimumDate?: Date;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  mode,
  placeholder,
  required = false,
  editable = true,
  error,
  minimumDate,
}) => {
  const [show, setShow] = useState(false);

  const formatDisplay = () => {
    if (!value) return "";
    if (mode === "date") {
      return value.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      });
    }
    return value.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <View style={styles.fieldContainer}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {required && <Text style={styles.required}> *</Text>}
      </View>
      <TouchableOpacity
        style={[
          styles.inputContainer,
          !editable && styles.inputDisabled,
          !!error && styles.inputError,
        ]}
        onPress={() => editable && setShow(true)}
        disabled={!editable}
      >
        <MaterialIcons
          name={mode === "date" ? "calendar-today" : "access-time"}
          size={20}
          color={
            error
              ? GUIDE_COLORS.error
              : editable
                ? GUIDE_COLORS.primary
                : GUIDE_COLORS.gray400
          }
          style={styles.inputIcon}
        />
        <Text
          style={[
            styles.input,
            styles.inputWithIcon,
            !value && styles.placeholder,
          ]}
        >
          {value ? formatDisplay() : placeholder}
        </Text>
        <MaterialIcons
          name="keyboard-arrow-down"
          size={20}
          color={GUIDE_COLORS.gray400}
        />
      </TouchableOpacity>
      {/* Inline error */}
      {error && (
        <View style={styles.errorRow}>
          <MaterialIcons name="error-outline" size={14} color={GUIDE_COLORS.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          minimumDate={minimumDate}
          onChange={(event, selectedDate) => {
            setShow(Platform.OS === "ios");
            if (selectedDate) {
              onChange(selectedDate);
            }
          }}
        />
      )}
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EventDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<EventDetailRouteProp>();
  const { event: passedEvent } = route.params || {};

  // Mode management
  const isCreateMode = !passedEvent;
  const canBeEdited =
    passedEvent?.status === "pending" || passedEvent?.status === "rejected";

  // isEditing: true when creating new OR when user clicked Edit button
  const [isEditing, setIsEditing] = useState(isCreateMode);

  // Multi-step form state (only for create mode)
  const [currentStep, setCurrentStep] = useState(0);

  // Form state
  const [name, setName] = useState(passedEvent?.name || "");

  // Prefer API `category`; fallback: legacy "[Nhãn]" prefix in description
  const parsedInitial = parseEventCategoryAndDescription({
    description: passedEvent?.description,
    category: passedEvent?.category,
  });

  const [description, setDescription] = useState(parsedInitial.description);
  const [category, setCategory] = useState(parsedInitial.category);
  const [startDate, setStartDate] = useState<Date | null>(
    passedEvent?.start_date ? new Date(passedEvent.start_date) : null,
  );
  const [endDate, setEndDate] = useState<Date | null>(
    passedEvent?.end_date ? new Date(passedEvent.end_date) : null,
  );
  const [startTime, setStartTime] = useState<Date | null>(
    passedEvent?.start_time ? parseTime(passedEvent.start_time) : null,
  );
  const [endTime, setEndTime] = useState<Date | null>(
    passedEvent?.end_time ? parseTime(passedEvent.end_time) : null,
  );
  const [location, setLocation] = useState(passedEvent?.location || "");
  const [bannerUri, setBannerUri] = useState<string | null>(
    passedEvent?.banner_url || null,
  );
  const [newBannerFile, setNewBannerFile] = useState<{
    uri: string;
    name: string;
    type: string;
  } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Validation state — tracks which fields have been touched / have errors
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // ============================================
  // VALIDATION HELPERS
  // ============================================

  /** Clear a single field error when user starts fixing it */
  const clearFieldError = useCallback((field: string) => {
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
  }, []);

  // ============================================
  // DATE AUTO-SUGGEST LOGIC
  // ============================================

  /** When startDate changes, auto-suggest endDate if not set yet */
  const handleStartDateChange = useCallback(
    (date: Date) => {
      setStartDate(date);
      clearFieldError("startDate");
      // Auto-suggest: if endDate is null or endDate < new startDate, set endDate = startDate
      if (!endDate || endDate < date) {
        setEndDate(date);
        clearFieldError("endDate");
      }
    },
    [endDate, clearFieldError],
  );

  const handleEndDateChange = useCallback(
    (date: Date) => {
      setEndDate(date);
      // Realtime validation
      if (startDate && date < startDate) {
        setFieldErrors((prev) => ({
          ...prev,
          endDate: "Ngày kết thúc phải sau ngày bắt đầu",
        }));
      } else {
        clearFieldError("endDate");
      }
    },
    [startDate, clearFieldError],
  );

  const handleStartTimeChange = useCallback(
    (date: Date) => {
      setStartTime(date);
      clearFieldError("startTime");
    },
    [clearFieldError],
  );

  const handleEndTimeChange = useCallback(
    (date: Date) => {
      setEndTime(date);
      if (startTime && startDate && endDate) {
        const sameDay = formatDateForApi(startDate) === formatDateForApi(endDate);
        if (sameDay && date <= startTime) {
          setFieldErrors((prev) => ({
            ...prev,
            endTime: "Giờ kết thúc phải sau giờ bắt đầu",
          }));
        } else {
          clearFieldError("endTime");
        }
      }
    },
    [startTime, startDate, endDate, clearFieldError],
  );

  // ============================================
  // STEP NAVIGATION
  // ============================================

  const handleNextStep = useCallback(() => {
    const errors = validateEventStep(currentStep, { name, category, startDate, endDate, startTime, endTime });
    if (Object.keys(errors).length === 0) {
      setCurrentStep((prev) => Math.min(prev + 1, FORM_STEPS.length - 1));
    } else {
      setFieldErrors(errors as Record<string, string>);
    }
  }, [currentStep, name, category, startDate, endDate, startTime, endTime]);

  const handlePrevStep = useCallback(() => {
    setFieldErrors({});
    setCurrentStep((prev) => Math.max(prev - 1, 0));
  }, []);

  const isLastStep = currentStep === FORM_STEPS.length - 1;
  const isFirstStep = currentStep === 0;

  // ============================================
  // EDIT MODE HANDLERS
  // ============================================

  const handleEnableEdit = useCallback(() => {
    if (canBeEdited) {
      setIsEditing(true);
    }
  }, [canBeEdited]);

  const handleCancelEdit = useCallback(() => {
    if (!isCreateMode && passedEvent) {
      setName(passedEvent.name || "");
      const parsed = parseEventCategoryAndDescription({
        description: passedEvent.description,
        category: passedEvent.category,
      });
      setDescription(parsed.description);
      setCategory(parsed.category);
      setStartDate(
        passedEvent.start_date ? new Date(passedEvent.start_date) : null,
      );
      setEndDate(passedEvent.end_date ? new Date(passedEvent.end_date) : null);
      setStartTime(
        passedEvent.start_time ? parseTime(passedEvent.start_time) : null,
      );
      setEndTime(passedEvent.end_time ? parseTime(passedEvent.end_time) : null);
      setLocation(passedEvent.location || "");
      setBannerUri(passedEvent.banner_url || null);
      setNewBannerFile(null);
      setFieldErrors({});
      setIsEditing(false);
    }
  }, [isCreateMode, passedEvent]);

  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);

  // Pick banner image
  const handlePickBanner = useCallback(() => {
    if (!isEditing) return;
    setIsMediaPickerVisible(true);
  }, [isEditing]);

  const handleMediaPicked = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        try {
          const compressed = await ImageManipulator.manipulateAsync(
            asset.uri,
            [{ resize: { width: 1200 } }],
            { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG },
          );
          setBannerUri(compressed.uri);
          setNewBannerFile({
            uri: compressed.uri,
            name: `event_banner_${Date.now()}.jpg`,
            type: "image/jpeg",
          });
        } catch {
          setBannerUri(asset.uri);
          setNewBannerFile({
            uri: asset.uri,
            name: `event_banner_${Date.now()}.jpg`,
            type: "image/jpeg",
          });
        }
      }
    },
    [],
  );

  // ============================================
  // SAVE & DELETE
  // ============================================

  const handleSave = useCallback(async () => {
    console.log("[EventSave] handleSave called, isCreateMode:", isCreateMode);

    // Validate full form
    const errors = validateEventFullForm({ name, category, startDate, endDate, startTime, endTime });
    const isValid = Object.keys(errors).length === 0;
    
    console.log("[EventSave] validation result:", isValid);
    if (!isValid) {
      console.log("[EventSave] validation failed, fieldErrors:", errors);
      setFieldErrors(errors as Record<string, string>);
      return;
    }

    setSaving(true);
    try {
      const eventData: any = {
        name: name.trim(),
        start_date: formatDateForApi(startDate!),
      };

      // Description: plain text only. Category is sent as its own field (backend column).
      if (description.trim()) {
        eventData.description = description.trim();
      }
      const catTrim = category.trim();
      if (!isCreateMode) {
        eventData.category = catTrim;
      } else if (catTrim) {
        eventData.category = catTrim;
      }
      if (endDate) {
        eventData.end_date = formatDateForApi(endDate);
      }
      if (startTime) {
        eventData.start_time = formatTimeForApi(startTime);
      }
      if (endTime) {
        eventData.end_time = formatTimeForApi(endTime);
      }
      if (location.trim()) {
        eventData.location = location.trim();
      }
      if (newBannerFile) {
        eventData.banner = newBannerFile;
      }

      console.log("[EventSave] eventData:", JSON.stringify(eventData, null, 2));

      let result;
      if (!isCreateMode && passedEvent) {
        console.log("[EventSave] calling updateEvent...");
        result = await updateEvent(passedEvent.id, eventData);
      } else {
        console.log("[EventSave] calling createEvent...");
        result = await createEvent(eventData);
      }

      console.log("[EventSave] API result:", JSON.stringify(result));

      if (result?.success) {
        Alert.alert(
          "Thành công",
          !isCreateMode ? "Đã cập nhật sự kiện" : "Đã tạo sự kiện mới",
          [{ text: "OK", onPress: () => navigation.goBack() }],
        );
      } else {
        console.log("[EventSave] result.success is false:", result?.message);
        Alert.alert("Lỗi", result?.message || "Không thể lưu sự kiện");
      }
    } catch (error: any) {
      console.log("[EventSave] CATCH error:", error?.message, error?.response?.data);
      Alert.alert("Lỗi", error?.response?.data?.message || error.message || "Không thể lưu sự kiện");
    } finally {
      setSaving(false);
    }
  }, [
    name,
    description,
    category,
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    newBannerFile,
    isCreateMode,
    passedEvent,
    navigation,
  ]);

  const handleDelete = useCallback(() => {
    if (!passedEvent) return;

    Alert.alert("Xóa sự kiện", `Bạn có chắc muốn xóa "${passedEvent.name}"?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setDeleting(true);
          try {
            const result = await deleteEvent(passedEvent.id);
            if (result?.success) {
              Alert.alert("Thành công", "Đã xóa sự kiện", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Lỗi", result?.message || "Không thể xóa");
            }
          } catch (error: any) {
            Alert.alert("Lỗi", error.message || "Không thể xóa");
          } finally {
            setDeleting(false);
          }
        },
      },
    ]);
  }, [passedEvent, navigation]);

  // ============================================
  // RENDER STEP CONTENT (CREATE MODE)
  // ============================================

  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <InputField
              label="Tên sự kiện"
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearFieldError("name");
              }}
              placeholder="VD: Lễ Giáng Sinh 2026"
              icon="event"
              required
              editable={isEditing}
              maxLength={255}
              error={fieldErrors.name}
            />

            <CategoryPicker
              label="Loại sự kiện"
              value={category}
              onChange={(val) => {
                setCategory(val);
                clearFieldError("category");
              }}
              required
              editable={isEditing}
              error={fieldErrors.category}
            />

            <InputField
              label="Mô tả"
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                clearFieldError("description");
              }}
              placeholder="Mô tả chi tiết về sự kiện..."
              multiline
              editable={isEditing}
              maxLength={2000}
              error={fieldErrors.description}
            />
          </View>
        );

      case 1:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thời gian diễn ra</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Ngày bắt đầu"
                  value={startDate}
                  onChange={handleStartDateChange}
                  mode="date"
                  placeholder="Chọn ngày"
                  required
                  editable={isEditing}
                  error={fieldErrors.startDate}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Ngày kết thúc"
                  value={endDate}
                  onChange={handleEndDateChange}
                  mode="date"
                  placeholder="Chọn ngày"
                  required
                  editable={isEditing}
                  error={fieldErrors.endDate}
                  minimumDate={startDate || undefined}
                />
              </View>
            </View>

            {/* Visual connection between start and end date */}
            {startDate && endDate && !fieldErrors.endDate && (
              <View style={styles.dateRangeHint}>
                <MaterialIcons
                  name="date-range"
                  size={16}
                  color={GUIDE_COLORS.success}
                />
                <Text style={styles.dateRangeHintText}>
                  {startDate.toLocaleDateString("vi-VN")} →{" "}
                  {endDate.toLocaleDateString("vi-VN")}
                </Text>
              </View>
            )}

            <View style={styles.row}>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Giờ bắt đầu"
                  value={startTime}
                  onChange={handleStartTimeChange}
                  mode="time"
                  placeholder="Chọn giờ"
                  required
                  editable={isEditing}
                  error={fieldErrors.startTime}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Giờ kết thúc"
                  value={endTime}
                  onChange={handleEndTimeChange}
                  mode="time"
                  placeholder="Chọn giờ"
                  required
                  editable={isEditing}
                  error={fieldErrors.endTime}
                />
              </View>
            </View>
          </View>
        );

      case 2:
        return (
          <>
            {/* Location */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Địa điểm</Text>
              <InputField
                label="Vị trí"
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  clearFieldError("location");
                }}
                placeholder="VD: Sân nhà thờ chính"
                icon="location-on"
                editable={isEditing}
                maxLength={255}
                error={fieldErrors.location}
              />
            </View>

            {/* Banner Image */}
            <View style={styles.bannerSection}>
              <Text style={styles.sectionTitle}>Ảnh bìa</Text>
              <TouchableOpacity
                style={styles.bannerContainer}
                onPress={handlePickBanner}
                disabled={!isEditing}
                activeOpacity={0.8}
              >
                {bannerUri ? (
                  <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
                ) : (
                  <LinearGradient
                    colors={(CATEGORY_GROUP_GRADIENTS[category] || DEFAULT_GRADIENT).colors}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.bannerPlaceholder}
                  >
                    <MaterialIcons
                      name={(CATEGORY_GROUP_GRADIENTS[category] || DEFAULT_GRADIENT).icon}
                      size={40}
                      color="rgba(255,255,255,0.25)"
                    />
                    <Text style={[styles.bannerPlaceholderText, { color: "rgba(255,255,255,0.7)" }]}>
                      {isEditing ? "Nhấn để thêm ảnh bìa" : "Chưa có ảnh bìa"}
                    </Text>
                  </LinearGradient>
                )}
                {isEditing && bannerUri && (
                  <View style={styles.bannerEditOverlay}>
                    <MaterialIcons
                      name="edit"
                      size={20}
                      color={GUIDE_COLORS.surface}
                    />
                  </View>
                )}
              </TouchableOpacity>
              <Text style={styles.bannerHint}>
                Tỉ lệ 16:9 · Định dạng JPG, PNG · Tối đa 5MB
              </Text>
            </View>
          </>
        );

      default:
        return null;
    }
  }, [
    currentStep,
    name,
    description,
    category,
    startDate,
    endDate,
    startTime,
    endTime,
    location,
    bannerUri,
    isEditing,
    fieldErrors,
    clearFieldError,
    handleStartDateChange,
    handleEndDateChange,
    handleStartTimeChange,
    handleEndTimeChange,
    handlePickBanner,
  ]);

  // ============================================
  // RENDER FULL FORM (EDIT MODE / VIEW MODE)
  // ============================================

  const renderFullForm = () => (
    <>
      {/* Rejection Reason */}
      {passedEvent?.status === "rejected" && passedEvent.rejection_reason && (
        <View style={styles.rejectionBox}>
          <MaterialIcons name="error" size={20} color={GUIDE_COLORS.error} />
          <View style={styles.rejectionContent}>
            <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
            <Text style={styles.rejectionText}>
              {passedEvent.rejection_reason}
            </Text>
          </View>
        </View>
      )}

      {/* Banner Image */}
      <View style={styles.bannerSection}>
        <Text style={styles.sectionTitle}>Ảnh bìa</Text>
        <TouchableOpacity
          style={styles.bannerContainer}
          onPress={handlePickBanner}
          disabled={!isEditing}
          activeOpacity={0.8}
        >
          {bannerUri ? (
            <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
          ) : (
            <LinearGradient
              colors={(CATEGORY_GROUP_GRADIENTS[category] || DEFAULT_GRADIENT).colors}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bannerPlaceholder}
            >
              <MaterialIcons
                name={(CATEGORY_GROUP_GRADIENTS[category] || DEFAULT_GRADIENT).icon}
                size={40}
                color="rgba(255,255,255,0.25)"
              />
              <Text style={[styles.bannerPlaceholderText, { color: "rgba(255,255,255,0.7)" }]}>
                {isEditing ? "Nhấn để thêm ảnh bìa" : "Chưa có ảnh bìa"}
              </Text>
            </LinearGradient>
          )}
          {isEditing && bannerUri && (
            <View style={styles.bannerEditOverlay}>
              <MaterialIcons
                name="edit"
                size={20}
                color={GUIDE_COLORS.surface}
              />
            </View>
          )}
        </TouchableOpacity>
        <Text style={styles.bannerHint}>
          Tỉ lệ 16:9 · Định dạng JPG, PNG · Tối đa 5MB
          {"\n"}* Vui lòng upload ảnh liên quan đến sự kiện
        </Text>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

        <InputField
          label="Tên sự kiện"
          value={name}
          onChangeText={(text) => {
            setName(text);
            clearFieldError("name");
          }}
          placeholder="VD: Lễ Giáng Sinh 2026"
          icon="event"
          required
          editable={isEditing}
          maxLength={255}
          error={fieldErrors.name}
        />

        <CategoryPicker
          label="Loại sự kiện"
          value={category}
          onChange={(val) => {
            setCategory(val);
            clearFieldError("category");
          }}
          editable={isEditing}
          error={fieldErrors.category}
        />

        <InputField
          label="Mô tả"
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            clearFieldError("description");
          }}
          placeholder="Mô tả chi tiết về sự kiện..."
          multiline
          editable={isEditing}
          maxLength={2000}
          error={fieldErrors.description}
        />
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Thời gian diễn ra</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <DateTimeField
              label="Ngày bắt đầu"
              value={startDate}
              onChange={handleStartDateChange}
              mode="date"
              placeholder="Chọn ngày"
              required
              editable={isEditing}
              error={fieldErrors.startDate}
            />
          </View>
          <View style={styles.halfField}>
            <DateTimeField
              label="Ngày kết thúc"
              value={endDate}
              onChange={handleEndDateChange}
              mode="date"
              placeholder="Chọn ngày"
              editable={isEditing}
              error={fieldErrors.endDate}
              minimumDate={startDate || undefined}
            />
          </View>
        </View>

        {startDate && endDate && !fieldErrors.endDate && (
          <View style={styles.dateRangeHint}>
            <MaterialIcons
              name="date-range"
              size={16}
              color={GUIDE_COLORS.success}
            />
            <Text style={styles.dateRangeHintText}>
              {startDate.toLocaleDateString("vi-VN")} →{" "}
              {endDate.toLocaleDateString("vi-VN")}
            </Text>
          </View>
        )}

        <View style={styles.row}>
          <View style={styles.halfField}>
            <DateTimeField
              label="Giờ bắt đầu"
              value={startTime}
              onChange={handleStartTimeChange}
              mode="time"
              placeholder="Chọn giờ"
              editable={isEditing}
              error={fieldErrors.startTime}
            />
          </View>
          <View style={styles.halfField}>
            <DateTimeField
              label="Giờ kết thúc"
              value={endTime}
              onChange={handleEndTimeChange}
              mode="time"
              placeholder="Chọn giờ"
              editable={isEditing}
              error={fieldErrors.endTime}
            />
          </View>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Địa điểm</Text>
        <InputField
          label="Vị trí"
          value={location}
          onChangeText={(text) => {
            setLocation(text);
            clearFieldError("location");
          }}
          placeholder="VD: Sân nhà thờ chính"
          icon="location-on"
          editable={isEditing}
          maxLength={255}
          error={fieldErrors.location}
        />
      </View>

      {/* Info for approved events */}
      {passedEvent?.status === "approved" && (
        <View style={styles.infoBox}>
          <MaterialIcons name="lock" size={20} color={GUIDE_COLORS.creamMuted} />
          <Text style={styles.infoText}>
            Sự kiện đã được duyệt không thể chỉnh sửa
          </Text>
        </View>
      )}

      {/* Edit Button for View Mode */}
      {!isCreateMode && canBeEdited && !isEditing && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEnableEdit}
            activeOpacity={0.8}
          >
            <MaterialIcons name="edit" size={22} color={GUIDE_COLORS.surface} />
            <Text style={styles.editButtonText}>Chỉnh sửa sự kiện</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Action Buttons for Edit Mode (non-create) */}
      {isEditing && !isCreateMode && (
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator color="#3D2000" />
            ) : (
              <>
                <MaterialIcons name="save" size={22} color="#3D2000" />
                <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelEdit}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            <MaterialIcons
              name="close"
              size={22}
              color={GUIDE_COLORS.textSecondary}
            />
            <Text style={styles.cancelButtonText}>Hủy chỉnh sửa</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.deleteButton, deleting && styles.buttonDisabled]}
            onPress={handleDelete}
            disabled={saving || deleting}
            activeOpacity={0.8}
          >
            {deleting ? (
              <ActivityIndicator color={GUIDE_COLORS.error} />
            ) : (
              <>
                <MaterialIcons
                  name="delete-outline"
                  size={22}
                  color={GUIDE_COLORS.error}
                />
                <Text style={styles.deleteButtonText}>Xóa sự kiện</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </>
  );

  // ============================================
  // RENDER
  // ============================================

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GUIDE_COLORS.creamBg}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            if (isCreateMode && currentStep > 0) {
              handlePrevStep();
            } else {
              navigation.goBack();
            }
          }}
        >
          <MaterialIcons
            name="arrow-back-ios"
            size={20}
            color={GUIDE_COLORS.creamInk}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isCreateMode
            ? "Tạo sự kiện mới"
            : isEditing
              ? "Chỉnh sửa"
              : "Chi tiết sự kiện"}
        </Text>
        <View style={styles.headerRight}>
          {!isCreateMode && passedEvent && (
            <StatusBadge
              status={passedEvent.status}
              label={STATUS_LABELS[passedEvent.status]}
            />
          )}
          {!isCreateMode && canBeEdited && !isEditing && (
            <TouchableOpacity
              style={styles.editHeaderButton}
              onPress={handleEnableEdit}
            >
              <MaterialIcons
                name="edit"
                size={20}
                color={GUIDE_COLORS.primary}
              />
            </TouchableOpacity>
          )}
        </View>
        {isCreateMode && <View style={{ width: 80 }} />}
      </View>

      {/* Step Indicator (only in create mode) */}
      {isCreateMode && (
        <StepIndicator
          currentStep={currentStep}
          totalSteps={FORM_STEPS.length}
          steps={FORM_STEPS}
        />
      )}

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces
        >
          {isCreateMode ? renderStepContent : renderFullForm()}

          {/* Step Navigation Buttons (create mode) */}
          {isCreateMode && (
            <View style={styles.stepNavigation}>
              {!isFirstStep && (
                <TouchableOpacity
                  style={styles.stepNavButtonSecondary}
                  onPress={handlePrevStep}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={20}
                    color={GUIDE_COLORS.textSecondary}
                  />
                  <Text style={styles.stepNavButtonSecondaryText}>Quay lại</Text>
                </TouchableOpacity>
              )}
              <TouchableOpacity
                style={[
                  styles.stepNavButtonPrimary,
                  isFirstStep && styles.stepNavButtonFull,
                  saving && styles.buttonDisabled,
                ]}
                onPress={isLastStep ? handleSave : handleNextStep}
                disabled={saving}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color="#3D2000" />
                ) : (
                  <>
                    <MaterialIcons
                      name={isLastStep ? "check" : "arrow-forward"}
                      size={20}
                      color="#3D2000"
                    />
                    <Text style={styles.stepNavButtonPrimaryText}>
                      {isLastStep ? "Tạo sự kiện" : "Tiếp theo"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={"images"}
        allowsEditing={true}
        aspect={[16, 9]}
        quality={1}
        title="Thêm ảnh bìa sự kiện"
      />
    </View>
  );
};

export default EventDetailScreen;
