/**
 * EventDetailScreen
 * View, Create, Edit events with real API
 * 
 * Modes:
 * - Create: No eventId passed
 * - View/Edit: eventId passed, fetch event data
 * 
 * Features:
 * - Banner image upload with compression
 * - Date/Time pickers
 * - Form validation
 * - Status display for existing events
 */
import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import {
  createEvent,
  deleteEvent,
  updateEvent,
} from "../../../../services/api/guide/eventApi";
import { EventItem, EventStatus } from "../../../../types/guide";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type EventDetailRouteProp = RouteProp<MySiteStackParamList, "EventDetail">;

// ============================================
// STATUS BADGE
// ============================================

const StatusBadge: React.FC<{ status: EventStatus }> = ({ status }) => {
  const config = {
    pending: { bg: "#FFF3E0", color: GUIDE_COLORS.warning, label: "Chờ duyệt", icon: "schedule" },
    approved: { bg: "#E8F5E9", color: GUIDE_COLORS.success, label: "Đã duyệt", icon: "check-circle" },
    rejected: { bg: "#FFEBEE", color: GUIDE_COLORS.error, label: "Từ chối", icon: "cancel" },
  }[status];

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <MaterialIcons name={config.icon as any} size={16} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ============================================
// INPUT FIELD
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
}) => (
  <View style={styles.fieldContainer}>
    <View style={styles.labelRow}>
      <Text style={styles.label}>{label}</Text>
      {required && <Text style={styles.required}>*</Text>}
    </View>
    <View style={[styles.inputContainer, !editable && styles.inputDisabled]}>
      {icon && (
        <MaterialIcons
          name={icon}
          size={20}
          color={editable ? GUIDE_COLORS.primary : GUIDE_COLORS.gray400}
          style={styles.inputIcon}
        />
      )}
      <TextInput
        style={[
          styles.input,
          multiline && styles.inputMultiline,
          icon && styles.inputWithIcon,
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
      />
    </View>
    {maxLength && (
      <Text style={styles.charCount}>{value.length}/{maxLength}</Text>
    )}
  </View>
);

// ============================================
// DATE/TIME PICKER FIELD
// ============================================

interface DateTimeFieldProps {
  label: string;
  value: Date | null;
  onChange: (date: Date) => void;
  mode: "date" | "time";
  placeholder: string;
  required?: boolean;
  editable?: boolean;
}

const DateTimeField: React.FC<DateTimeFieldProps> = ({
  label,
  value,
  onChange,
  mode,
  placeholder,
  required = false,
  editable = true,
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
        {required && <Text style={styles.required}>*</Text>}
      </View>
      <TouchableOpacity
        style={[styles.inputContainer, !editable && styles.inputDisabled]}
        onPress={() => editable && setShow(true)}
        disabled={!editable}
      >
        <MaterialIcons
          name={mode === "date" ? "calendar-today" : "access-time"}
          size={20}
          color={editable ? GUIDE_COLORS.primary : GUIDE_COLORS.gray400}
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

      {show && (
        <DateTimePicker
          value={value || new Date()}
          mode={mode}
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
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

  const isEditMode = !!passedEvent;
  const canEdit = !passedEvent || passedEvent.status === "pending" || passedEvent.status === "rejected";

  // Form state
  const [name, setName] = useState(passedEvent?.name || "");
  const [description, setDescription] = useState(passedEvent?.description || "");
  const [startDate, setStartDate] = useState<Date | null>(
    passedEvent?.start_date ? new Date(passedEvent.start_date) : null
  );
  const [endDate, setEndDate] = useState<Date | null>(
    passedEvent?.end_date ? new Date(passedEvent.end_date) : null
  );
  const [startTime, setStartTime] = useState<Date | null>(
    passedEvent?.start_time ? parseTime(passedEvent.start_time) : null
  );
  const [endTime, setEndTime] = useState<Date | null>(
    passedEvent?.end_time ? parseTime(passedEvent.end_time) : null
  );
  const [location, setLocation] = useState(passedEvent?.location || "");
  const [bannerUri, setBannerUri] = useState<string | null>(passedEvent?.banner_url || null);
  const [newBannerFile, setNewBannerFile] = useState<{ uri: string; name: string; type: string } | null>(null);

  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Helper to parse time string (HH:MM:SS)
  function parseTime(timeStr: string): Date {
    const [hours, minutes] = timeStr.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    return date;
  }

  // Format date for API (YYYY-MM-DD)
  const formatDateForApi = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  // Format time for API (HH:MM)
  const formatTimeForApi = (date: Date): string => {
    return date.toTimeString().substring(0, 5);
  };

  // Pick banner image
  const handlePickBanner = useCallback(async () => {
    if (!canEdit) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [16, 9],
      quality: 1,
    });

    if (!result.canceled && result.assets[0]) {
      const asset = result.assets[0];

      // Compress image
      try {
        const compressed = await ImageManipulator.manipulateAsync(
          asset.uri,
          [{ resize: { width: 1200 } }],
          { compress: 0.8, format: ImageManipulator.SaveFormat.JPEG }
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
  }, [canEdit]);

  // Validate form
  const validateForm = (): boolean => {
    if (!name.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên sự kiện");
      return false;
    }
    if (!startDate) {
      Alert.alert("Lỗi", "Vui lòng chọn ngày bắt đầu");
      return false;
    }
    return true;
  };

  // Handle save
  const handleSave = useCallback(async () => {
    if (!validateForm()) return;

    setSaving(true);
    try {
      const eventData: any = {
        name: name.trim(),
        start_date: formatDateForApi(startDate!),
      };

      if (description.trim()) {
        eventData.description = description.trim();
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

      let result;
      if (isEditMode && passedEvent) {
        result = await updateEvent(passedEvent.id, eventData);
      } else {
        result = await createEvent(eventData);
      }

      if (result?.success) {
        Alert.alert(
          "Thành công",
          isEditMode ? "Đã cập nhật sự kiện" : "Đã tạo sự kiện mới",
          [{ text: "OK", onPress: () => navigation.goBack() }]
        );
      } else {
        Alert.alert("Lỗi", result?.message || "Không thể lưu sự kiện");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể lưu sự kiện");
    } finally {
      setSaving(false);
    }
  }, [name, description, startDate, endDate, startTime, endTime, location, newBannerFile, isEditMode, passedEvent, navigation]);

  // Handle delete
  const handleDelete = useCallback(() => {
    if (!passedEvent) return;

    Alert.alert(
      "Xóa sự kiện",
      `Bạn có chắc muốn xóa "${passedEvent.name}"?`,
      [
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
      ]
    );
  }, [passedEvent, navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" backgroundColor={GUIDE_COLORS.background} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <MaterialIcons name="arrow-back-ios" size={20} color={GUIDE_COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditMode ? "Chi tiết sự kiện" : "Tạo sự kiện mới"}
        </Text>
        {isEditMode && passedEvent && (
          <StatusBadge status={passedEvent.status} />
        )}
        {!isEditMode && <View style={{ width: 80 }} />}
      </View>

      <KeyboardAvoidingView
        style={styles.content}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rejection Reason */}
          {passedEvent?.status === "rejected" && passedEvent.rejection_reason && (
            <View style={styles.rejectionBox}>
              <MaterialIcons name="error" size={20} color={GUIDE_COLORS.error} />
              <View style={styles.rejectionContent}>
                <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
                <Text style={styles.rejectionText}>{passedEvent.rejection_reason}</Text>
              </View>
            </View>
          )}

          {/* Banner Image */}
          <View style={styles.bannerSection}>
            <Text style={styles.sectionTitle}>Ảnh bìa</Text>
            <TouchableOpacity
              style={styles.bannerContainer}
              onPress={handlePickBanner}
              disabled={!canEdit}
              activeOpacity={0.8}
            >
              {bannerUri ? (
                <Image source={{ uri: bannerUri }} style={styles.bannerImage} />
              ) : (
                <View style={styles.bannerPlaceholder}>
                  <MaterialIcons name="add-photo-alternate" size={48} color={GUIDE_COLORS.gray300} />
                  <Text style={styles.bannerPlaceholderText}>Thêm ảnh bìa</Text>
                </View>
              )}
              {canEdit && bannerUri && (
                <View style={styles.bannerEditOverlay}>
                  <MaterialIcons name="edit" size={24} color={GUIDE_COLORS.surface} />
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Basic Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin cơ bản</Text>

            <InputField
              label="Tên sự kiện"
              value={name}
              onChangeText={setName}
              placeholder="VD: Lễ Giáng Sinh 2026"
              icon="event"
              required
              editable={canEdit}
              maxLength={255}
            />

            <InputField
              label="Mô tả"
              value={description}
              onChangeText={setDescription}
              placeholder="Mô tả chi tiết về sự kiện..."
              multiline
              numberOfLines={4}
              icon="description"
              editable={canEdit}
              maxLength={2000}
            />
          </View>

          {/* Date & Time */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thời gian</Text>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Ngày bắt đầu"
                  value={startDate}
                  onChange={setStartDate}
                  mode="date"
                  placeholder="Chọn ngày"
                  required
                  editable={canEdit}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Ngày kết thúc"
                  value={endDate}
                  onChange={setEndDate}
                  mode="date"
                  placeholder="Chọn ngày"
                  editable={canEdit}
                />
              </View>
            </View>

            <View style={styles.row}>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Giờ bắt đầu"
                  value={startTime}
                  onChange={setStartTime}
                  mode="time"
                  placeholder="Chọn giờ"
                  editable={canEdit}
                />
              </View>
              <View style={styles.halfField}>
                <DateTimeField
                  label="Giờ kết thúc"
                  value={endTime}
                  onChange={setEndTime}
                  mode="time"
                  placeholder="Chọn giờ"
                  editable={canEdit}
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
              onChangeText={setLocation}
              placeholder="VD: Sân nhà thờ chính"
              icon="location-on"
              editable={canEdit}
              maxLength={255}
            />
          </View>

          {/* Info for approved events */}
          {passedEvent?.status === "approved" && (
            <View style={styles.infoBox}>
              <MaterialIcons name="lock" size={20} color={GUIDE_COLORS.textMuted} />
              <Text style={styles.infoText}>
                Sự kiện đã được duyệt không thể chỉnh sửa
              </Text>
            </View>
          )}

          {/* Action Buttons */}
          {canEdit && (
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.saveButton, saving && styles.buttonDisabled]}
                onPress={handleSave}
                disabled={saving || deleting}
                activeOpacity={0.8}
              >
                {saving ? (
                  <ActivityIndicator color={GUIDE_COLORS.surface} />
                ) : (
                  <>
                    <MaterialIcons
                      name={isEditMode ? "save" : "add"}
                      size={22}
                      color={GUIDE_COLORS.surface}
                    />
                    <Text style={styles.saveButtonText}>
                      {isEditMode ? "Lưu thay đổi" : "Tạo sự kiện"}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              {isEditMode && (
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
                      <MaterialIcons name="delete-outline" size={22} color={GUIDE_COLORS.error} />
                      <Text style={styles.deleteButtonText}>Xóa sự kiện</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={{ height: 40 }} />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.gray100,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },

  // Content
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
  },

  // Sections
  section: {
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textSecondary,
    marginBottom: GUIDE_SPACING.sm,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },

  // Banner
  bannerSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  bannerContainer: {
    width: "100%",
    height: 180,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.gray100,
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerPlaceholder: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  bannerPlaceholderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.gray400,
    marginTop: GUIDE_SPACING.xs,
  },
  bannerEditOverlay: {
    position: "absolute",
    bottom: GUIDE_SPACING.sm,
    right: GUIDE_SPACING.sm,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Input Field
  fieldContainer: {
    marginBottom: GUIDE_SPACING.md,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: GUIDE_SPACING.xs,
  },
  label: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textPrimary,
  },
  required: {
    color: GUIDE_COLORS.error,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    paddingHorizontal: GUIDE_SPACING.sm,
    minHeight: 48,
  },
  inputDisabled: {
    backgroundColor: GUIDE_COLORS.gray100,
  },
  inputIcon: {
    marginRight: GUIDE_SPACING.xs,
  },
  input: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    paddingVertical: GUIDE_SPACING.sm,
  },
  inputWithIcon: {
    paddingLeft: 0,
  },
  inputMultiline: {
    minHeight: 100,
    textAlignVertical: "top",
  },
  placeholder: {
    color: GUIDE_COLORS.gray400,
  },
  charCount: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    textAlign: "right",
    marginTop: 4,
  },

  // Row layout
  row: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  halfField: {
    flex: 1,
  },

  // Rejection Box
  rejectionBox: {
    flexDirection: "row",
    backgroundColor: "#FFEBEE",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    marginBottom: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.sm,
  },
  rejectionContent: {
    flex: 1,
  },
  rejectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.error,
    marginBottom: 4,
  },
  rejectionText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.error,
  },

  // Info Box
  infoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.gray100,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    marginBottom: GUIDE_SPACING.lg,
  },
  infoText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textMuted,
    flex: 1,
  },

  // Action Buttons
  actionButtons: {
    gap: GUIDE_SPACING.md,
    marginTop: GUIDE_SPACING.lg,
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    ...GUIDE_SHADOWS.md,
  },
  saveButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.surface,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.error,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.error,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});

export default EventDetailScreen;
