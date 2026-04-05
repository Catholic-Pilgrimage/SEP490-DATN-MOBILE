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
import * as Haptics from "expo-haptics";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  NativeSyntheticEvent,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TextInputContentSizeChangeEventData,
  TouchableOpacity,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import { AISparkles } from "../../../../components/ui/AISparkles";
import ReviewTrackingInfo from "../../components/ReviewTrackingInfo";
import { GUIDE_COLORS, GUIDE_SPACING } from "../../../../constants/guide.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useI18n } from "../../../../hooks/useI18n";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import {
  EventSuggestion,
  SuggestEventsResponse,
  suggestEvents,
} from "../../../../services/ai";
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
  findCategoryByValue,
  getEventCategoryGroups,
  parseEventCategoryAndDescription,
} from "../utils/eventCategoryUi";
import { styles } from "./EventDetailScreenNew.styles";

type EventDetailRouteProp = RouteProp<MySiteStackParamList, "EventDetail">;

const getStatusLabels = (t: (key: string) => string): Record<EventStatus, string> => ({
  pending: t("eventDetail.statusPending"),
  approved: t("eventDetail.statusApproved"),
  rejected: t("eventDetail.statusRejected"),
});

// ============================================
// CONSTANTS
// ============================================

/** Form step definitions for multi-step form */
const getFormSteps = (t: (key: string) => string) => [
  { key: "basic", label: t("eventDetail.step1Label"), icon: "info" as const },
  { key: "datetime", label: t("eventDetail.step2Label"), icon: "schedule" as const },
  { key: "location", label: t("eventDetail.step3Label"), icon: "place" as const },
];

const AI_EVENT_CATEGORY_MAP: Record<string, string> = {
  mass: "sacrament_mass",
  feast: "solemn_feast",
  procession: "procession",
  adoration: "adoration",
  retreat: "retreat",
  pilgrimage: "pilgrimage",
  charity: "charity",
  cultural: "festival",
  other: "",
};

const parseLocalDate = (dateString: string): Date => {
  const [year, month, day] = dateString.split("-").map(Number);
  return new Date(year, month - 1, day);
};

const formatSuggestionTime = (time?: string) => time?.slice(0, 5) || "";
const AI_SUGGESTION_SLOW_THRESHOLD_MS = 10000;

const normalizeSuggestionCategory = (category?: string) => {
  if (!category) return "";
  const normalized = category.trim();
  return AI_EVENT_CATEGORY_MAP[normalized] ?? normalized;
};

const buildSuggestionDescription = (suggestion: EventSuggestion) => {
  const baseDescription = suggestion.description?.trim() || "";
  const relevance = suggestion.relevance?.trim() || "";

  if (!baseDescription) return relevance;
  if (!relevance || baseDescription.includes(relevance)) {
    return baseDescription;
  }

  return `${baseDescription}\n\nTheo mùa phụng vụ: ${relevance}`;
};

// ============================================
// STEP INDICATOR
// ============================================

interface StepIndicatorProps {
  currentStep: number;
  totalSteps: number;
  steps: ReturnType<typeof getFormSteps>;
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
}) => {
  const multilineMinHeight = 120;
  const [multilineHeight, setMultilineHeight] = useState(multilineMinHeight);

  const handleContentSizeChange = (
    event: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    if (!multiline) return;

    const nextHeight = Math.max(
      multilineMinHeight,
      Math.ceil(event.nativeEvent.contentSize.height) + GUIDE_SPACING.sm,
    );

    setMultilineHeight((prev) =>
      Math.abs(prev - nextHeight) > 4 ? nextHeight : prev,
    );
  };

  return (
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
            multiline && { height: multilineHeight },
            icon && !multiline && styles.inputWithIcon,
          ]}
          value={value}
          onChangeText={onChangeText}
          onContentSizeChange={handleContentSizeChange}
          placeholder={placeholder}
          placeholderTextColor={GUIDE_COLORS.gray400}
          multiline={multiline}
          numberOfLines={numberOfLines}
          textAlignVertical={multiline ? "top" : "center"}
          editable={editable}
          maxLength={maxLength}
          scrollEnabled={false}
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
};

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
  const { t } = useI18n();
  const [showOptions, setShowOptions] = useState(false);

  // Resolve display label from grouped data
  const found = value ? findCategoryByValue(value, t) : null;
  const selectedLabel = found ? found.label : t("eventDetail.categoryPlaceholder");
  const EVENT_CATEGORY_GROUPS = useMemo(() => getEventCategoryGroups(t), [t]);

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
          {value ? selectedLabel : t("eventDetail.categoryPlaceholder")}
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
            <View key={group.groupLabelKey}>
              {/* Group Header — non-clickable */}
              <View style={styles.dropdownGroupHeader}>
                <MaterialIcons
                  name={group.icon}
                  size={16}
                  color={GUIDE_COLORS.textSecondary}
                />
                <Text style={styles.dropdownGroupLabel}>
                  {t(group.groupLabelKey)}
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
                    {t(item.labelKey)}
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
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { confirm, ConfirmModal } = useConfirm();
  const route = useRoute<EventDetailRouteProp>();
  const { event: passedEvent } = route.params || {};

  // Memoize translated constants
  const FORM_STEPS = useMemo(() => getFormSteps(t), [t]);
  const STATUS_LABELS = useMemo(() => getStatusLabels(t), [t]);

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
  const [isAISuggesting, setIsAISuggesting] = useState(false);
  const [isAISuggestionSlow, setIsAISuggestionSlow] = useState(false);
  const [aiSuggestionRetryMessage, setAiSuggestionRetryMessage] =
    useState<string | null>(null);
  const [aiSuggestionData, setAiSuggestionData] =
    useState<SuggestEventsResponse["data"] | null>(null);
  const [isAISuggestionModalVisible, setIsAISuggestionModalVisible] =
    useState(false);
  const aiSuggestionSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

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
          endDate: t("eventDetail.errorEndDateBeforeStart"),
        }));
      } else {
        clearFieldError("endDate");
      }
    },
    [startDate, clearFieldError, t],
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
            endTime: t("eventDetail.errorEndTimeBeforeStart"),
          }));
        } else {
          clearFieldError("endTime");
        }
      }
    },
    [startTime, startDate, endDate, clearFieldError, t],
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

  const showToast = useCallback(
    (
      type: "success" | "error" | "info",
      title: string,
      message: string,
    ) => {
      Toast.show({
        type,
        text1: title,
        text2: message,
      });
    },
    [],
  );

  const clearAISuggestionSlowTimer = useCallback(() => {
    if (aiSuggestionSlowTimerRef.current) {
      clearTimeout(aiSuggestionSlowTimerRef.current);
      aiSuggestionSlowTimerRef.current = null;
    }
  }, []);

  useEffect(() => () => clearAISuggestionSlowTimer(), [clearAISuggestionSlowTimer]);

  const applySuggestionToForm = useCallback(
    async (suggestion: EventSuggestion) => {
      const hasExistingFormData = Boolean(
        name.trim() ||
          description.trim() ||
          category.trim() ||
          location.trim() ||
          startDate ||
          endDate ||
          startTime ||
          endTime,
      );

      if (hasExistingFormData) {
        const shouldApply = await confirm({
          type: "warning",
          iconName: "sparkles-outline",
          title: t("eventDetail.aiApplyConfirmTitle"),
          message: t("eventDetail.aiApplyConfirmMessage"),
          confirmText: t("eventDetail.aiApplyConfirm"),
          cancelText: t("eventDetail.aiApplyCancel"),
        });

        if (!shouldApply) {
          return;
        }
      }

      const nextCategory = normalizeSuggestionCategory(suggestion.category);

      setName(suggestion.name?.trim() || "");
      setDescription(buildSuggestionDescription(suggestion));
      setCategory(nextCategory);
      setStartDate(parseLocalDate(suggestion.start_date));
      setEndDate(parseLocalDate(suggestion.end_date || suggestion.start_date));
      setStartTime(
        suggestion.start_time ? parseTime(suggestion.start_time) : null,
      );
      setEndTime(suggestion.end_time ? parseTime(suggestion.end_time) : null);
      setLocation(suggestion.location?.trim() || "");
      setFieldErrors({});
      setIsAISuggestionModalVisible(false);

      showToast(
        "success",
        t("eventDetail.aiAppliedSuccess"),
        t("eventDetail.aiAppliedMessage"),
      );
    },
    [
      category,
      confirm,
      description,
      endDate,
      endTime,
      location,
      name,
      showToast,
      startDate,
      startTime,
      t,
    ],
  );

  const handleSuggestEvents = useCallback(async () => {
    if (!isEditing || isAISuggesting) return;

    clearAISuggestionSlowTimer();
    setAiSuggestionRetryMessage(null);
    setIsAISuggestionSlow(false);
    setIsAISuggesting(true);

    aiSuggestionSlowTimerRef.current = setTimeout(() => {
      setIsAISuggestionSlow(true);
      showToast(
        "info",
        t("eventDetail.aiAssistTitle"),
        t("eventDetail.aiSlowResponseMessage", {
          defaultValue:
            "AI đang mất nhiều thời gian hơn bình thường. Bạn vẫn có thể tiếp tục điền form trong lúc chờ.",
        }),
      );
    }, AI_SUGGESTION_SLOW_THRESHOLD_MS);

    try {
      const response = await suggestEvents({
        current_date: startDate ? formatDateForApi(startDate) : undefined,
        count: 5,
      });

      if (!response.success || !response.data) {
        throw new Error(
          response.message || t("eventDetail.aiError"),
        );
      }

      if (!response.data.suggestions?.length) {
        showToast(
          "info",
          t("eventDetail.aiAssistTitle"),
          t("eventDetail.aiNoSuggestions"),
        );
        return;
      }

      setAiSuggestionRetryMessage(null);
      setAiSuggestionData(response.data);
      setIsAISuggestionModalVisible(true);
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message ||
        error?.message ||
        t("eventDetail.aiError");

      setAiSuggestionRetryMessage(errorMessage);
      showToast(
        "error",
        t("eventDetail.aiAssistTitle"),
        errorMessage,
      );
    } finally {
      clearAISuggestionSlowTimer();
      setIsAISuggesting(false);
    }
  }, [
    clearAISuggestionSlowTimer,
    isEditing,
    isAISuggesting,
    showToast,
    startDate,
    t,
  ]);

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
        showToast(
          "success",
          t("eventDetail.saveSuccess"),
          !isCreateMode ? t("eventDetail.updateSuccess") : t("eventDetail.createSuccess"),
        );
        navigation.goBack();
      } else {
        console.log("[EventSave] result.success is false:", result?.message);
        showToast(
          "error",
          t("eventDetail.saveError"),
          result?.message || t("eventDetail.saveErrorMessage"),
        );
      }
    } catch (error: any) {
      console.log("[EventSave] CATCH error:", error?.message, error?.response?.data);
      showToast(
        "error",
        t("eventDetail.saveError"),
        error?.response?.data?.message || error.message || t("eventDetail.saveErrorMessage"),
      );
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
    showToast,
    t,
  ]);

  const handleDelete = useCallback(async () => {
    if (!passedEvent) return;

    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("eventDetail.deleteConfirmTitle"),
      message: t("eventDetail.deleteConfirmMessage", { name: passedEvent.name }),
      confirmText: t("eventDetail.deleteConfirm"),
      cancelText: t("eventDetail.deleteCancel"),
    });

    if (!confirmed) {
      return;
    }

    setDeleting(true);
    try {
      const result = await deleteEvent(passedEvent.id);
      if (result?.success) {
        showToast("success", t("eventDetail.saveSuccess"), t("eventDetail.deleteSuccess"));
        navigation.goBack();
      } else {
        showToast(
          "error",
          t("eventDetail.saveError"),
          result?.message || t("eventDetail.deleteError"),
        );
      }
    } catch (error: any) {
      showToast(
        "error",
        t("eventDetail.saveError"),
        error.message || t("eventDetail.deleteError"),
      );
    } finally {
      setDeleting(false);
    }
  }, [confirm, passedEvent, navigation, showToast, t]);

  // ============================================
  // RENDER STEP CONTENT (CREATE MODE)
  // ============================================

  const renderStepContent = useMemo(() => {
    switch (currentStep) {
      case 0:
        return (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("eventDetail.basicInfoTitle")}</Text>

            <InputField
              label={t("eventDetail.eventNameLabel")}
              value={name}
              onChangeText={(text) => {
                setName(text);
                clearFieldError("name");
              }}
              placeholder={t("eventDetail.eventNamePlaceholder")}
              icon="event"
              required
              editable={isEditing}
              maxLength={255}
              error={fieldErrors.name}
            />

            <CategoryPicker
              label={t("eventDetail.categoryLabel")}
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
              label={t("eventDetail.descriptionLabel")}
              value={description}
              onChangeText={(text) => {
                setDescription(text);
                clearFieldError("description");
              }}
              placeholder={t("eventDetail.descriptionPlaceholder")}
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
            <Text style={styles.sectionTitle}>{t("eventDetail.dateTimeTitle")}</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <DateTimeField
                  label={t("eventDetail.startDateLabel")}
                  value={startDate}
                  onChange={handleStartDateChange}
                  mode="date"
                  placeholder={t("eventDetail.selectDatePlaceholder")}
                  required
                  editable={isEditing}
                  error={fieldErrors.startDate}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label={t("eventDetail.endDateLabel")}
                  value={endDate}
                  onChange={handleEndDateChange}
                  mode="date"
                  placeholder={t("eventDetail.selectDatePlaceholder")}
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
                  label={t("eventDetail.startTimeLabel")}
                  value={startTime}
                  onChange={handleStartTimeChange}
                  mode="time"
                  placeholder={t("eventDetail.selectTimePlaceholder")}
                  required
                  editable={isEditing}
                  error={fieldErrors.startTime}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label={t("eventDetail.endTimeLabel")}
                  value={endTime}
                  onChange={handleEndTimeChange}
                  mode="time"
                  placeholder={t("eventDetail.selectTimePlaceholder")}
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
              <Text style={styles.sectionTitle}>{t("eventDetail.locationTitle")}</Text>
              <InputField
                label={t("eventDetail.locationLabel")}
                value={location}
                onChangeText={(text) => {
                  setLocation(text);
                  clearFieldError("location");
                }}
                placeholder={t("eventDetail.locationPlaceholder")}
                icon="location-on"
                editable={isEditing}
                maxLength={255}
                error={fieldErrors.location}
              />
            </View>

            {/* Banner Image */}
            <View style={styles.bannerSection}>
              <Text style={styles.sectionTitle}>{t("eventDetail.bannerTitle")}</Text>
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
                      {isEditing ? t("eventDetail.bannerAddText") : t("eventDetail.bannerEmptyText")}
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
                {t("eventDetail.bannerHint")}
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

  const renderAIAssistCard = () => (
    <View style={styles.aiAssistCard}>
      <View style={styles.aiAssistContent}>
        <View style={styles.aiAssistIconBadge}>
          <AISparkles size={20} color={GUIDE_COLORS.primary} isAnimating={!isAISuggesting} />
        </View>
        <View style={styles.aiAssistTextWrap}>
          <Text style={styles.aiAssistTitle}>{t("eventDetail.aiAssistTitle")}</Text>
          <Text style={styles.aiAssistSubtitle}>
            {isAISuggesting
              ? t("eventDetail.aiAssistLoadingHint", {
                  defaultValue: "AI đang chuẩn bị đề xuất phù hợp cho form hiện tại.",
                })
              : t("eventDetail.aiAssistSubtitle")}
          </Text>
        </View>
      </View>

      {isAISuggesting && (
        <View style={styles.aiAssistLoadingBox}>
          <View style={styles.aiAssistLoadingRow}>
            <ActivityIndicator size="small" color={GUIDE_COLORS.primaryDark} />
            <Text style={styles.aiAssistLoadingTitle}>
              {t("eventDetail.aiAssistLoadingLabel", {
                defaultValue: "Đang tạo gợi ý sự kiện...",
              })}
            </Text>
          </View>
          <Text style={styles.aiAssistLoadingDescription}>
            {isAISuggestionSlow
              ? t("eventDetail.aiAssistSlowInlineMessage", {
                  defaultValue:
                    "Phản hồi đang chậm hơn bình thường. Bạn vẫn có thể tiếp tục điền form trong lúc chờ.",
                })
              : t("eventDetail.aiAssistLoadingDescription", {
                  defaultValue:
                    "AI đang phân tích mùa phụng vụ, thời gian và bối cảnh phù hợp cho sự kiện của bạn.",
                })}
          </Text>
        </View>
      )}

      {!!aiSuggestionRetryMessage && !isAISuggesting && (
        <View style={styles.aiAssistRetryBox}>
          <View style={styles.aiAssistRetryContent}>
            <MaterialIcons
              name="refresh"
              size={18}
              color={GUIDE_COLORS.warning}
            />
            <Text style={styles.aiAssistRetryText}>
              {t("eventDetail.aiAssistRetryDescription", {
                defaultValue: "Chưa lấy được gợi ý. Bạn có thể thử lại ngay.",
              })}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.aiAssistRetryButton}
            onPress={() => {
              void handleSuggestEvents();
            }}
            activeOpacity={0.85}
          >
            <Text style={styles.aiAssistRetryButtonText}>
              {t("common.retry", { defaultValue: "Thử lại" })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={[styles.aiAssistButton, isAISuggesting && styles.buttonDisabled]}
        onPress={async () => {
          if (Platform.OS === 'ios') {
            await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }
          handleSuggestEvents();
        }}
        disabled={isAISuggesting || saving || deleting}
        activeOpacity={0.85}
      >
        <LinearGradient
          colors={["#F4E4BA", "#D4AF37"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.aiAssistButtonGradient,
            isAISuggesting && styles.aiAssistButtonGradientDisabled,
          ]}
        >
          <MaterialIcons
            name={isAISuggesting ? "hourglass-top" : "auto-awesome"}
            size={18}
            color="#3D2000"
          />
          <Text style={styles.aiAssistButtonText}>
            {isAISuggesting
              ? t("common.pleaseWait", {
                  defaultValue: "Vui lòng chờ",
                })
              : t("eventDetail.aiAssistButton")}
          </Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );

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
            <Text style={styles.rejectionTitle}>{t("eventDetail.rejectionReasonTitle")}</Text>
            <Text style={styles.rejectionText}>
              {passedEvent.rejection_reason}
            </Text>
          </View>
        </View>
      )}

      <ReviewTrackingInfo
        reviewer={passedEvent?.eventReviewer}
        reviewedBy={passedEvent?.reviewed_by}
        reviewedAt={passedEvent?.reviewed_at}
        showEmail
      />

      {/* Banner Image */}
      <View style={styles.bannerSection}>
        <Text style={styles.sectionTitle}>{t("eventDetail.bannerTitle")}</Text>
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
                {isEditing ? t("eventDetail.bannerAddText") : t("eventDetail.bannerEmptyText")}
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
          {t("eventDetail.bannerHintUpload")}
        </Text>
      </View>

      {/* Basic Info */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("eventDetail.basicInfoTitle")}</Text>

        <InputField
          label={t("eventDetail.eventNameLabel")}
          value={name}
          onChangeText={(text) => {
            setName(text);
            clearFieldError("name");
          }}
          placeholder={t("eventDetail.eventNamePlaceholder")}
          icon="event"
          required
          editable={isEditing}
          maxLength={255}
          error={fieldErrors.name}
        />

        <CategoryPicker
          label={t("eventDetail.categoryLabel")}
          value={category}
          onChange={(val) => {
            setCategory(val);
            clearFieldError("category");
          }}
          editable={isEditing}
          error={fieldErrors.category}
        />

        <InputField
          label={t("eventDetail.descriptionLabel")}
          value={description}
          onChangeText={(text) => {
            setDescription(text);
            clearFieldError("description");
          }}
          placeholder={t("eventDetail.descriptionPlaceholder")}
          multiline
          editable={isEditing}
          maxLength={2000}
          error={fieldErrors.description}
        />
      </View>

      {/* Date & Time */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("eventDetail.dateTimeTitle")}</Text>

        <View style={styles.row}>
          <View style={styles.halfField}>
            <DateTimeField
              label={t("eventDetail.startDateLabel")}
              value={startDate}
              onChange={handleStartDateChange}
              mode="date"
              placeholder={t("eventDetail.selectDatePlaceholder")}
              required
              editable={isEditing}
              error={fieldErrors.startDate}
            />
          </View>
          <View style={styles.halfField}>
            <DateTimeField
              label={t("eventDetail.endDateLabel")}
              value={endDate}
              onChange={handleEndDateChange}
              mode="date"
              placeholder={t("eventDetail.selectDatePlaceholder")}
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
              label={t("eventDetail.startTimeLabel")}
              value={startTime}
              onChange={handleStartTimeChange}
              mode="time"
              placeholder={t("eventDetail.selectTimePlaceholder")}
              editable={isEditing}
              error={fieldErrors.startTime}
            />
          </View>
          <View style={styles.halfField}>
            <DateTimeField
              label={t("eventDetail.endTimeLabel")}
              value={endTime}
              onChange={handleEndTimeChange}
              mode="time"
              placeholder={t("eventDetail.selectTimePlaceholder")}
              editable={isEditing}
              error={fieldErrors.endTime}
            />
          </View>
        </View>
      </View>

      {/* Location */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t("eventDetail.locationTitle")}</Text>
        <InputField
          label={t("eventDetail.locationLabel")}
          value={location}
          onChangeText={(text) => {
            setLocation(text);
            clearFieldError("location");
          }}
          placeholder={t("eventDetail.locationPlaceholder")}
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
            {t("eventDetail.approvedLockInfo")}
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
            <Text style={styles.editButtonText}>{t("eventDetail.editButton")}</Text>
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
                <Text style={styles.saveButtonText}>{t("eventDetail.saveButton")}</Text>
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
            <Text style={styles.cancelButtonText}>{t("eventDetail.cancelButton")}</Text>
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
                <Text style={styles.deleteButtonText}>{t("eventDetail.deleteButton")}</Text>
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
            ? t("eventDetail.createTitle")
            : isEditing
              ? t("eventDetail.editTitle")
              : t("eventDetail.viewTitle")}
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
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          nestedScrollEnabled
          bounces
        >
          {(isCreateMode || isEditing) && renderAIAssistCard()}
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
                  <Text style={styles.stepNavButtonSecondaryText}>{t("eventDetail.backButton")}</Text>
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
                      {isLastStep ? t("eventDetail.createButton") : t("eventDetail.nextButton")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal
        visible={isAISuggestionModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsAISuggestionModalVisible(false)}
      >
        <View style={styles.aiModalOverlay}>
          <SafeAreaView style={styles.aiModalSafeArea} edges={["bottom"]}>
            <View style={styles.aiModalSheet}>
              <View style={styles.aiModalHandle} />
              <View style={styles.aiModalHeader}>
                <View style={styles.aiModalHeaderIcon}>
                  <AISparkles size={20} color={GUIDE_COLORS.primary} isAnimating={true} />
                </View>
                <View style={styles.aiModalHeaderTextWrap}>
                  <Text style={styles.aiModalTitle}>{t("eventDetail.aiModalTitle")}</Text>
                  <Text style={styles.aiModalSubtitle}>
                    {aiSuggestionData
                      ? `${aiSuggestionData.site_name} • ${aiSuggestionData.liturgical_season}`
                      : t("eventDetail.aiModalSubtitle")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.aiModalCloseButton}
                  onPress={() => setIsAISuggestionModalVisible(false)}
                  activeOpacity={0.8}
                >
                  <MaterialIcons
                    name="close"
                    size={20}
                    color={GUIDE_COLORS.creamLabel}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView
                style={styles.aiSuggestionList}
                contentContainerStyle={styles.aiSuggestionListContent}
                showsVerticalScrollIndicator={false}
              >
              {(aiSuggestionData?.suggestions || []).map((suggestion, index) => {
                const resolvedCategory = normalizeSuggestionCategory(
                  suggestion.category,
                );
                const categoryInfo = resolvedCategory
                  ? findCategoryByValue(resolvedCategory, t)
                  : null;

                // Get gradient colors for category
                const categoryGradient = resolvedCategory && CATEGORY_GROUP_GRADIENTS[resolvedCategory]
                  ? CATEGORY_GROUP_GRADIENTS[resolvedCategory]
                  : DEFAULT_GRADIENT;

                // Build date/time chip text
                const dateText = parseLocalDate(suggestion.start_date).toLocaleDateString(
                  "vi-VN",
                  { day: "2-digit", month: "2-digit" }
                );
                const timeText = suggestion.start_time
                  ? formatSuggestionTime(suggestion.start_time)
                  : null;

                return (
                  <TouchableOpacity
                    key={`${suggestion.name}-${index}`}
                    style={styles.aiSuggestionCard}
                    onPress={() => {
                      void applySuggestionToForm(suggestion);
                    }}
                    activeOpacity={0.9}
                  >
                    {/* Gradient top border */}
                    <LinearGradient
                      colors={categoryGradient.colors}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.aiSuggestionGradientBorder}
                    />

                    {/* Header: Index + Name + Category Badge */}
                    <View style={styles.aiSuggestionHeader}>
                      <View style={styles.aiSuggestionHeaderLeft}>
                        <View style={styles.aiSuggestionIndexBadge}>
                          <Text style={styles.aiSuggestionIndexText}>
                            {index + 1}
                          </Text>
                        </View>
                        <Text style={styles.aiSuggestionName} numberOfLines={1}>
                          {suggestion.name}
                        </Text>
                      </View>
                      <View style={styles.aiSuggestionCategoryBadge}>
                        <Text style={styles.aiSuggestionCategoryText} numberOfLines={1}>
                          {categoryInfo?.label || t("eventDetail.aiSuggestionDefault")}
                        </Text>
                      </View>
                    </View>

                    {/* Compact chips for date/time/location */}
                    <View style={styles.aiSuggestionChipsRow}>
                      <View style={styles.aiSuggestionChip}>
                        <MaterialIcons
                          name="calendar-today"
                          size={12}
                          color={GUIDE_COLORS.primary}
                        />
                        <Text style={styles.aiSuggestionChipText}>
                          {dateText}
                        </Text>
                      </View>
                      {timeText && (
                        <View style={styles.aiSuggestionChip}>
                          <MaterialIcons
                            name="schedule"
                            size={12}
                            color={GUIDE_COLORS.primary}
                          />
                          <Text style={styles.aiSuggestionChipText}>
                            {timeText}
                          </Text>
                        </View>
                      )}
                      {!!suggestion.location?.trim() && (
                        <View style={styles.aiSuggestionChip}>
                          <MaterialIcons
                            name="place"
                            size={12}
                            color={GUIDE_COLORS.primary}
                          />
                          <Text style={styles.aiSuggestionChipText} numberOfLines={1}>
                            {suggestion.location.trim()}
                          </Text>
                        </View>
                      )}
                    </View>

                    {/* Description - truncated to 2 lines */}
                    <Text style={styles.aiSuggestionDescription} numberOfLines={2}>
                      {buildSuggestionDescription(suggestion)}
                    </Text>

                    {/* Apply button */}
                    <View style={styles.aiSuggestionApplyRow}>
                      <Text style={styles.aiSuggestionApplyText}>
                        {t("eventDetail.aiSuggestionApplyText")}
                      </Text>
                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color={GUIDE_COLORS.primary}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
          </SafeAreaView>
        </View>
      </Modal>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={"images"}
        allowsEditing={true}
        aspect={[16, 9]}
        quality={1}
        title={t("eventDetail.mediaPickerTitle")}
      />
      <ConfirmModal />
    </View>
  );
};

export default EventDetailScreen;
