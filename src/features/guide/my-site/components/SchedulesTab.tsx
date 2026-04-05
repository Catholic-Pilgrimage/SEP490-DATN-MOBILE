/**
 * SchedulesTab Component (Lịch lễ)
 * Premium UI for Mass Schedule management
 *
 * Features:
 * - Beautiful schedule cards with days chips
 * - Status badges with proper colors
 * - Smart Hybrid Filter (2 chips + dropdown)
 * - Create/Edit/Delete with modal form
 * - Rejection reason warning box
 * - Pull to refresh
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
    DayOfWeek,
    MassSchedule,
    MassScheduleStatus,
} from "../../../../types/guide";
import { PREMIUM_COLORS, STATUS_COLORS } from "../constants";
import { useMassSchedule } from "../hooks/useMassSchedule";
import type { FilterItem } from "./FilterBottomSheet";
import { FilterBottomSheet, FilterTrigger } from "./FilterBottomSheet";
import {
    getFabScrollBottomInset,
    GUIDE_FAB_SIZE,
    GuideFabButton,
} from "./GuideFabButton";
import { styles } from "./SchedulesTab.styles";
import { StatusBadge } from "./StatusBadge";

// ============================================
// CONSTANTS
// ============================================

type DayMapItem = { value: DayOfWeek; label: string; color: string };

const getStatusLabel = (
  status: MassScheduleStatus,
  t: (key: string) => string,
): string => {
  return t(
    `schedulesTab.status${status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
};

const getDaysMap = (t: (key: string) => string): DayMapItem[] => [
  { value: 0, label: t("schedulesTab.day0"), color: "#DC2626" },
  { value: 1, label: t("schedulesTab.day1"), color: GUIDE_COLORS.textPrimary },
  { value: 2, label: t("schedulesTab.day2"), color: GUIDE_COLORS.textPrimary },
  { value: 3, label: t("schedulesTab.day3"), color: GUIDE_COLORS.textPrimary },
  { value: 4, label: t("schedulesTab.day4"), color: GUIDE_COLORS.textPrimary },
  { value: 5, label: t("schedulesTab.day5"), color: GUIDE_COLORS.textPrimary },
  { value: 6, label: t("schedulesTab.day6"), color: "#2563EB" },
];

type StatusFilter = "all" | MassScheduleStatus;

/** Parse HH:MM → Date (today) for native time picker; invalid/empty → 06:00 */
function timeStringToDateForPicker(timeStr: string): Date {
  const d = new Date();
  if (/^\d{2}:\d{2}$/.test(timeStr)) {
    const h = Number(timeStr.slice(0, 2));
    const m = Number(timeStr.slice(3, 5));
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      d.setHours(h, m, 0, 0);
      return d;
    }
  }
  d.setHours(6, 0, 0, 0);
  return d;
}

/** Format picker Date → HH:MM */
function dateToHHMM(d: Date): string {
  const h = d.getHours().toString().padStart(2, "0");
  const m = d.getMinutes().toString().padStart(2, "0");
  return `${h}:${m}`;
}

type WeekDayStat = { count: number };

/** Gom theo 7 ngày: chỉ số lịch (không hiển thị giờ trong ô lọc) */
function buildWeekOverview(schedules: MassSchedule[]): WeekDayStat[] {
  const days: WeekDayStat[] = Array.from({ length: 7 }, () => ({ count: 0 }));
  for (const s of schedules) {
    for (const d of s.days_of_week) {
      if (d < 0 || d > 6) continue;
      days[d].count += 1;
    }
  }
  return days;
}

/** Giờ gợi ý — lịch lễ thường gặp */
const QUICK_MASS_TIMES = [
  "05:00",
  "06:00",
  "07:00",
  "17:30",
  "18:00",
  "19:00",
] as const;

const getStatusFilters = (t: (key: string) => string): FilterItem[] => [
  {
    key: "all",
    label: t("schedulesTab.statusAll"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    description: t("schedulesTab.statusAllDesc"),
  },
  {
    key: "pending",
    label: t("schedulesTab.statusPending"),
    color: "#D97706",
    bgColor: "#FEF3C7",
    icon: "schedule",
    description: t("schedulesTab.statusPendingDesc"),
  },
  {
    key: "approved",
    label: t("schedulesTab.statusApproved"),
    color: "#059669",
    bgColor: "#D1FAE5",
    icon: "check-circle",
    description: t("schedulesTab.statusApprovedDesc"),
  },
  {
    key: "rejected",
    label: t("schedulesTab.statusRejected"),
    color: "#DC2626",
    bgColor: "#FEE2E2",
    icon: "cancel",
    description: t("schedulesTab.statusRejectedDesc"),
  },
];

// ============================================
// DAY CHIP COMPONENT
// ============================================

interface DayChipProps {
  day: DayOfWeek;
  size?: "small" | "normal";
  selected?: boolean;
  onPress?: () => void;
  daysMap: DayMapItem[];
}

const DayChip: React.FC<DayChipProps> = ({
  day,
  size = "normal",
  selected,
  onPress,
  daysMap,
}) => {
  const dayInfo = daysMap.find((d) => d.value === day) || daysMap[0];
  const isSmall = size === "small";

  const chipStyle = [
    styles.dayChip,
    isSmall && styles.dayChipSmall,
    selected && {
      backgroundColor: PREMIUM_COLORS.goldLight,
      borderColor: PREMIUM_COLORS.gold,
    },
  ];

  /** CN / T7: giữ màu đỏ/xanh khi chọn (convention lịch VN); các ngày khác vàng đậm khi chọn */
  const selectedTextColor =
    selected && (day === 0 || day === 6)
      ? dayInfo.color
      : selected
        ? PREMIUM_COLORS.goldDark
        : dayInfo.color;

  const textStyle = [
    styles.dayChipText,
    isSmall && styles.dayChipTextSmall,
    { color: selectedTextColor },
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={onPress} activeOpacity={0.7}>
        <Text style={textStyle}>{dayInfo.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={chipStyle}>
      <Text style={textStyle}>{dayInfo.label}</Text>
    </View>
  );
};

// ============================================
// SCHEDULE CARD COMPONENT
// ============================================

interface ScheduleCardProps {
  schedule: MassSchedule;
  onEdit: () => void;
  onDelete: () => void;
  daysMap: DayMapItem[];
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({
  schedule,
  onEdit,
  onDelete,
  daysMap,
}) => {
  const { t } = useTranslation();
  const { confirm, ConfirmModal } = useConfirm();
  /** Chỉ pending/rejected được sửa — không dùng negation implicit (approved-only lock) */
  const canEdit =
    schedule.status === "pending" || schedule.status === "rejected";
  const isRejected = schedule.status === "rejected";

  // Format time HH:MM:SS → HH:MM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleEdit = () => {
    onEdit();
  };

  const handleDelete = async () => {
    const confirmed = await confirm({
      type: "danger",
      title: t("schedulesTab.deleteTitle"),
      message: t("schedulesTab.deleteMessage"),
      confirmText: t("schedulesTab.delete"),
      cancelText: t("schedulesTab.cancel"),
    });

    if (confirmed) {
      onDelete();
    }
  };

  return (
    <>
      <View style={styles.scheduleCard}>
        {/* Decorative left border */}
        <View
          style={[
            styles.cardLeftBorder,
            { backgroundColor: STATUS_COLORS[schedule.status].color },
          ]}
        />

      <View style={styles.cardContent}>
        {/* Header: Time + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.timeContainer}>
            <Ionicons
              name="time-outline"
              size={18}
              color={PREMIUM_COLORS.gold}
            />
            <Text style={styles.timeText}>{formatTime(schedule.time)}</Text>
          </View>
          <StatusBadge status={schedule.status} label={getStatusLabel(schedule.status, t)} />
        </View>

        {/* Days chips row */}
        <View style={styles.daysRow}>
          {schedule.days_of_week
            .sort((a, b) => a - b)
            .map((day) => (
              <DayChip key={day} day={day} size="small" daysMap={daysMap} />
            ))}
        </View>

        {/* Note (if exists) */}
        {schedule.note && (
          <View style={styles.noteRow}>
            <Ionicons
              name="document-text-outline"
              size={14}
              color={GUIDE_COLORS.gray400}
            />
            <Text style={styles.noteText} numberOfLines={2}>
              {schedule.note}
            </Text>
          </View>
        )}

        {/* Rejection reason (if rejected) */}
        {isRejected && schedule.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="warning" size={16} color="#DC2626" />
            <Text style={styles.rejectionText}>
              {t("schedulesTab.reason", { reason: schedule.rejection_reason })}
            </Text>
          </View>
        )}

        {/* Footer: Code + Date + Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.codeContainer}>
              <Ionicons
                name="document-outline"
                size={12}
                color={GUIDE_COLORS.gray400}
              />
              <Text style={styles.codeText}>{schedule.code}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons
                name="calendar-outline"
                size={12}
                color={GUIDE_COLORS.gray400}
              />
              <Text style={styles.dateText}>
                {formatDate(schedule.created_at)}
              </Text>
            </View>
          </View>

          {/* Actions (only for pending/rejected) */}
        {canEdit && (
            <View style={styles.actionsRow}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleEdit}
              >
                <Ionicons
                  name="create-outline"
                  size={16}
                  color={PREMIUM_COLORS.gold}
                />
                <Text style={styles.actionText}>{t("schedulesTab.edit")}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDelete}
              >
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>
                  {t("schedulesTab.delete")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
      </View>
      <ConfirmModal />
    </>
  );
};

// ============================================
// CREATE/EDIT MODAL COMPONENT
// ============================================

interface ScheduleFormData {
  days_of_week: DayOfWeek[];
  time: string;
  note: string;
}

interface ScheduleModalProps {
  visible: boolean;
  schedule?: MassSchedule | null;
  onClose: () => void;
  onSubmit: (data: ScheduleFormData) => void;
  loading?: boolean;
  daysMap: DayMapItem[];
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  schedule,
  onClose,
  onSubmit,
  loading = false,
  daysMap,
}) => {
  const { t } = useTranslation();
  const isEdit = !!schedule;
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<ScheduleFormData>({
    days_of_week: [],
    time: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showTimePicker, setShowTimePicker] = useState(false);

  // Initialize form data when modal opens
  React.useEffect(() => {
    if (visible) {
      setShowTimePicker(false);
      if (schedule) {
        setFormData({
          days_of_week: schedule.days_of_week || [],
          time: schedule.time?.substring(0, 5) || "", // HH:MM
          note: schedule.note || "",
        });
      } else {
        setFormData({
          days_of_week: [],
          time: "",
          note: "",
        });
      }
      setErrors({});
    }
  }, [visible, schedule]);

  const toggleDay = (day: DayOfWeek) => {
    setFormData((prev) => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter((d) => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b),
    }));
    if (errors.days_of_week) {
      setErrors((prev) => ({ ...prev, days_of_week: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.days_of_week.length === 0) {
      newErrors.days_of_week = t("schedulesTab.errorDaysRequired");
    }

    if (!formData.time) {
      newErrors.time = t("schedulesTab.errorTimeRequired");
    } else if (!/^\d{2}:\d{2}$/.test(formData.time)) {
      newErrors.time = t("schedulesTab.errorTimeInvalid");
    } else {
      const [hours, minutes] = formData.time.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.time = t("schedulesTab.errorTimeRange");
      }
    }

    if (!formData.note || !formData.note.trim()) {
      newErrors.note = t("schedulesTab.errorNoteRequired");
    } else if (formData.note.length > 500) {
      newErrors.note = t("schedulesTab.errorNoteMax");
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <KeyboardAvoidingView
          style={styles.modalOverlay}
          behavior={Platform.OS === "ios" ? "padding" : "height"}
        >
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEdit
                    ? t("schedulesTab.modalTitleEdit")
                    : t("schedulesTab.modalTitleCreate")}
                </Text>
                <TouchableOpacity
                  onPress={onClose}
                  style={styles.modalCloseButton}
                >
                  <Ionicons
                    name="close"
                    size={24}
                    color={GUIDE_COLORS.textPrimary}
                  />
                </TouchableOpacity>
              </View>

              {/* Rejection notice for editing rejected schedule */}
              {isEdit && schedule?.status === "rejected" && (
                <View style={styles.rejectionNotice}>
                  <Ionicons
                    name="information-circle"
                    size={18}
                    color="#D97706"
                  />
                  <Text style={styles.rejectionNoticeText}>
                    {t("schedulesTab.rejectionNotice")}
                  </Text>
                </View>
              )}

              <ScrollView
                style={styles.modalBody}
                contentContainerStyle={styles.modalScrollContent}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
              >
                {/* Days of week selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {t("schedulesTab.formDaysLabel")}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.daysGrid}>
                    {daysMap.map((day) => (
                      <DayChip
                        key={day.value}
                        day={day.value}
                        selected={formData.days_of_week.includes(day.value)}
                        onPress={() => toggleDay(day.value)}
                        daysMap={daysMap}
                      />
                    ))}
                  </View>
                  {errors.days_of_week && (
                    <Text style={styles.errorText}>{errors.days_of_week}</Text>
                  )}
                </View>

                {/* Giờ lễ — chỉ DateTimePicker qua pill vàng */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {t("schedulesTab.formTimeLabel")}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.timePillRow}>
                    <TouchableOpacity
                      style={styles.timePillTouchable}
                      onPress={() => setShowTimePicker(true)}
                      activeOpacity={0.85}
                      accessibilityRole="button"
                      accessibilityLabel={t("schedulesTab.timePickerA11y")}
                    >
                      <View style={styles.timePill}>
                        <Ionicons
                          name="time"
                          size={20}
                          color={PREMIUM_COLORS.goldDark}
                        />
                        <Text style={styles.timePillText}>
                          {formData.time ||
                            t("schedulesTab.timeTapToSelect")}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                  {/* Chip + pill cùng đọc formData.time — setState một lần, pill re-render ngay */}
                  <View style={styles.quickTimeRow}>
                    {QUICK_MASS_TIMES.map((qt) => {
                      const active = formData.time === qt;
                      return (
                        <TouchableOpacity
                          key={qt}
                          style={[
                            styles.quickTimeChip,
                            active && styles.quickTimeChipActive,
                          ]}
                          onPress={() => {
                            setFormData((prev) => ({ ...prev, time: qt }));
                            setErrors((prev) => ({ ...prev, time: "" }));
                          }}
                          activeOpacity={0.85}
                        >
                          <Text
                            style={[
                              styles.quickTimeChipText,
                              active && styles.quickTimeChipTextActive,
                            ]}
                          >
                            {qt}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                  {showTimePicker && (
                    <DateTimePicker
                      value={timeStringToDateForPicker(formData.time)}
                      mode="time"
                      is24Hour
                      display={Platform.OS === "ios" ? "spinner" : "default"}
                      onChange={(event, date) => {
                        if (Platform.OS === "android") {
                          setShowTimePicker(false);
                        }
                        if (event.type === "dismissed") {
                          setShowTimePicker(false);
                          return;
                        }
                        if (date) {
                          setFormData((prev) => ({
                            ...prev,
                            time: dateToHHMM(date),
                          }));
                          setErrors((prev) => ({ ...prev, time: "" }));
                        }
                      }}
                    />
                  )}
                  {Platform.OS === "ios" && showTimePicker && (
                    <View style={styles.iosTimeToolbar}>
                      <TouchableOpacity
                        style={styles.iosTimeToolbarBtn}
                        onPress={() => setShowTimePicker(false)}
                        accessibilityRole="button"
                      >
                        <Text style={styles.iosTimeToolbarText}>
                          {t("schedulesTab.timePickerDone")}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {errors.time && (
                    <Text style={styles.errorText}>{errors.time}</Text>
                  )}
                </View>

                {/* Note input — sát footer hơn (formGroupLast) */}
                <View style={[styles.formGroup, styles.formGroupLast]}>
                  <Text style={styles.formLabel}>
                    {t("schedulesTab.formNoteLabel")}{" "}
                    <Text style={styles.required}>*</Text>
                  </Text>
                  <View
                    style={[styles.inputContainer, styles.textAreaContainer]}
                  >
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.note}
                      onChangeText={(text) =>
                        setFormData((prev) => ({ ...prev, note: text }))
                      }
                      placeholder={t("schedulesTab.formNotePlaceholder")}
                      placeholderTextColor={GUIDE_COLORS.gray400}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                    />
                  </View>
                  <Text style={styles.charCount}>
                    {formData.note.length}/500
                  </Text>
                  {errors.note && (
                    <Text style={styles.errorText}>{errors.note}</Text>
                  )}
                </View>
              </ScrollView>

              {/* Footer buttons */}
              <View
                style={[
                  styles.modalFooter,
                  {
                    paddingBottom:
                      insets.bottom + GUIDE_SPACING.sm,
                  },
                ]}
              >
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>
                    {t("schedulesTab.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.submitButton,
                    loading && styles.submitButtonDisabled,
                  ]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.submitButtonText}>
                        {isEdit
                          ? t("schedulesTab.update")
                          : t("schedulesTab.create")}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </KeyboardAvoidingView>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  filter: StatusFilter;
  onCreatePress: () => void;
  /** Đang lọc theo ngày trong tuần nhưng không có lịch */
  filteredDayLabel?: string | null;
}

const EmptyState: React.FC<EmptyStateProps> = ({
  filter,
  onCreatePress,
  filteredDayLabel,
}) => {
  const { t } = useTranslation();
  const getMessage = () => {
    if (filteredDayLabel) {
      return t("schedulesTab.emptyForDay", { day: filteredDayLabel });
    }
    switch (filter) {
      case "pending":
        return t("schedulesTab.emptyPending");
      case "approved":
        return t("schedulesTab.emptyApproved");
      case "rejected":
        return t("schedulesTab.emptyRejected");
      default:
        return t("schedulesTab.empty");
    }
  };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons
          name="church"
          size={48}
          color={PREMIUM_COLORS.goldLight}
        />
      </View>
      <Text style={styles.emptyTitle}>{getMessage()}</Text>
      {!filteredDayLabel && (
        <Text style={styles.emptySubtitle}>{t("schedulesTab.emptyDesc")}</Text>
      )}
      {filter === "all" && !filteredDayLabel && (
        <TouchableOpacity style={styles.emptyButton} onPress={onCreatePress}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>
            {t("schedulesTab.addSchedule")}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// MAIN SCHEDULES TAB COMPONENT
// ============================================

interface SchedulesTabProps {
  onCreatePress?: () => void;
}

const SchedulesTab: React.FC<SchedulesTabProps> = () => {
  const { t } = useTranslation();
  const { confirm, ConfirmModal } = useConfirm();
  const insets = useSafeAreaInsets();
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingBottom: getFabScrollBottomInset(
          GUIDE_FAB_SIZE,
          insets.bottom,
        ),
      },
    ],
    [insets.bottom],
  );
  const daysMap = useMemo(() => getDaysMap(t), [t]);
  const statusFilters = useMemo(() => getStatusFilters(t), [t]);
  const {
    filteredSchedules,
    loading,
    refreshing,
    creating,
    updating,
    statusFilter,
    setStatusFilter,
    refetch,
    create,
    update,
    remove,
  } = useMassSchedule();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MassSchedule | null>(
    null,
  );
  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  /** Lọc danh sách theo 1 ngày (từ lưới tuần); null = tất cả */
  const [dayFilter, setDayFilter] = useState<DayOfWeek | null>(null);
  const [weekOverviewExpanded, setWeekOverviewExpanded] = useState(true);

  const showInfoDialog = useCallback(
    async (title: string, message: string) => {
      await confirm({
        type: "info",
        title,
        message,
        confirmText: t("common.ok", { defaultValue: "OK" }),
        showCancel: false,
      });
    },
    [confirm, t],
  );

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleCreatePress = () => {
    setEditingSchedule(null);
    setModalVisible(true);
  };

  const handleEditPress = (schedule: MassSchedule) => {
    setEditingSchedule(schedule);
    setModalVisible(true);
  };

  const handleDeletePress = async (schedule: MassSchedule) => {
    const success = await remove(schedule.id);
    if (success) {
      await showInfoDialog(t("common.success"), t("schedulesTab.deleteSuccess"));
    }
  };

  const weekStats = useMemo(
    () => buildWeekOverview(filteredSchedules),
    [filteredSchedules],
  );

  /** Bỏ lọc ngày nếu sau refetch không còn lịch nào cho ngày đang chọn */
  React.useEffect(() => {
    if (dayFilter === null) return;
    if (weekStats[dayFilter]?.count === 0) {
      setDayFilter(null);
    }
  }, [dayFilter, weekStats]);

  const listData = useMemo(() => {
    if (dayFilter === null) return filteredSchedules;
    return filteredSchedules.filter((s) => s.days_of_week.includes(dayFilter));
  }, [filteredSchedules, dayFilter]);

  const filteredDayLabel = useMemo(() => {
    if (dayFilter === null) return null;
    return daysMap.find((d) => d.value === dayFilter)?.label ?? null;
  }, [dayFilter, daysMap]);

  const handleWeekDayPress = useCallback((day: DayOfWeek, count: number) => {
    if (count === 0) return;
    setDayFilter((prev) => (prev === day ? null : day));
  }, []);

  const renderWeekHeader = useCallback(() => {
    return (
      <View style={styles.weekOverviewSection}>
        <TouchableOpacity
          style={styles.weekOverviewToggleRow}
          onPress={() => setWeekOverviewExpanded((v) => !v)}
          activeOpacity={0.75}
          accessibilityRole="button"
          accessibilityLabel={t("schedulesTab.weekOverviewA11yToggle")}
        >
          <MaterialIcons
            name="date-range"
            size={22}
            color={PREMIUM_COLORS.gold}
          />
          <Text style={styles.weekOverviewTitleText}>
            {t("schedulesTab.weekOverviewTitle")}
          </Text>
          <Ionicons
            name={weekOverviewExpanded ? "chevron-up" : "chevron-down"}
            size={22}
            color={GUIDE_COLORS.textSecondary}
          />
        </TouchableOpacity>
        {weekOverviewExpanded && (
          <View style={styles.weekGridRow}>
            {daysMap.map((dm) => {
              const stat = weekStats[dm.value];
              const hasMass = stat.count > 0;
              const selected = dayFilter === dm.value && hasMass;
              return (
                <TouchableOpacity
                  key={dm.value}
                  disabled={!hasMass}
                  style={[
                    styles.weekCell,
                    !hasMass && styles.weekCellEmpty,
                    selected && styles.weekCellSelected,
                  ]}
                  onPress={() => handleWeekDayPress(dm.value, stat.count)}
                  activeOpacity={hasMass ? 0.85 : 1}
                  accessibilityLabel={
                    hasMass
                      ? t("schedulesTab.weekCellA11yHasMass", {
                          day: dm.label,
                          count: stat.count,
                        })
                      : t("schedulesTab.weekCellA11yNoMass", { day: dm.label })
                  }
                  accessibilityState={{ disabled: !hasMass }}
                >
                  <Text
                    style={[styles.weekCellDay, { color: dm.color }]}
                    numberOfLines={1}
                  >
                    {dm.label}
                  </Text>
                  <Text
                    style={[
                      styles.weekCellCount,
                      !hasMass && styles.weekCellCountMuted,
                    ]}
                  >
                    {hasMass ? stat.count : "–"}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}
        {dayFilter !== null && (
          <TouchableOpacity
            style={styles.clearDayFilterBtn}
            onPress={() => setDayFilter(null)}
            activeOpacity={0.8}
          >
            <Ionicons
              name="close-circle-outline"
              size={18}
              color={PREMIUM_COLORS.goldDark}
            />
            <Text style={styles.clearDayFilterText}>
              {t("schedulesTab.clearDayFilter")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [
    weekOverviewExpanded,
    weekStats,
    dayFilter,
    daysMap,
    handleWeekDayPress,
    t,
  ]);

  const renderListFooter = useCallback(() => {
    if (listData.length === 0) return null;
    return (
      <View style={styles.listFooter}>
        <View style={styles.listFooterLine} />
        <Text style={styles.listFooterText}>
          {t("schedulesTab.footerTotalSchedules", {
            count: listData.length,
          })}
        </Text>
      </View>
    );
  }, [listData.length, t]);

  const handleModalSubmit = async (data: ScheduleFormData) => {
    if (editingSchedule) {
      // Update
      const result = await update(editingSchedule.id, {
        days_of_week: data.days_of_week,
        time: data.time,
        note: data.note || undefined,
      });
      if (result) {
        setModalVisible(false);
        await showInfoDialog(t("common.success"), t("schedulesTab.updateSuccess"));
      }
    } else {
      const result = await create({
        days_of_week: data.days_of_week,
        time: data.time,
        note: data.note || undefined,
      });
      if (result) {
        setModalVisible(false);
        await showInfoDialog(t("common.success"), t("schedulesTab.createSuccess"));
      }
    }
  };

  const renderScheduleCard = ({ item }: { item: MassSchedule }) => (
    <ScheduleCard
      schedule={item}
      onEdit={() => handleEditPress(item)}
      onDelete={() => handleDeletePress(item)}
      daysMap={daysMap}
    />
  );

  // Loading state
  if (loading && filteredSchedules.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        <Text style={styles.loadingText}>{t("schedulesTab.loading")}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t("schedulesTab.listTitle")}</Text>
        <FilterTrigger
          activeFilter={statusFilter}
          onPress={() => setShowFilterSheet(true)}
          filters={statusFilters}
          defaultLabel={t("schedulesTab.filter")}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as StatusFilter)}
        onClose={() => setShowFilterSheet(false)}
        filters={statusFilters}
        title={t("schedulesTab.filterTitle")}
      />

      {/* Schedule list */}
      <FlatList
        data={listData}
        keyExtractor={(item) => item.id}
        renderItem={renderScheduleCard}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor={PREMIUM_COLORS.gold}
            colors={[PREMIUM_COLORS.gold]}
          />
        }
        ListHeaderComponent={renderWeekHeader}
        ListEmptyComponent={
          <EmptyState
            filter={statusFilter}
            onCreatePress={handleCreatePress}
            filteredDayLabel={filteredDayLabel}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: GUIDE_SPACING.sm }} />
        )}
        ListFooterComponent={renderListFooter}
      />

      <GuideFabButton
        onPress={handleCreatePress}
        accessibilityLabel={t("schedulesTab.addSchedule")}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </GuideFabButton>

      {/* Create/Edit Modal */}
      <ScheduleModal
        visible={modalVisible}
        schedule={editingSchedule}
        onClose={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        loading={creating || updating}
        daysMap={daysMap}
      />
      <ConfirmModal />
    </View>
  );
};

export default SchedulesTab;
