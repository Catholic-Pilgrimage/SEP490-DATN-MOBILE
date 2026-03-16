import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import {
  createShiftSubmission,
  getShiftSubmissions,
} from "../../../../services/api/guide";
import {
  CreateShiftRequest,
  ShiftSubmission,
} from "../../../../types/guide/shiftSubmission.types";

interface ShiftRegistrationModalProps {
  visible: boolean;
  onClose: () => void;
  weekStartDate: string;
}

type TimePreset = {
  key: string;
  label: string;
  start: string;
  end: string;
};

const DAYS = [
  { value: 1, label: "Thu 2" },
  { value: 2, label: "Thu 3" },
  { value: 3, label: "Thu 4" },
  { value: 4, label: "Thu 5" },
  { value: 5, label: "Thu 6" },
  { value: 6, label: "Thu 7" },
  { value: 0, label: "Chu nhat" },
];

const PRESETS: TimePreset[] = [
  { key: "morning", label: "Sang", start: "08:00:00", end: "12:00:00" },
  { key: "afternoon", label: "Chieu", start: "13:00:00", end: "17:00:00" },
  { key: "full", label: "Ca dai", start: "08:00:00", end: "17:00:00" },
];

const formatTime = (time: string) => time.slice(0, 5);
const getDayLabel = (day: number) => DAYS.find((item) => item.value === day)?.label ?? `Ngay ${day}`;
const hoursOf = (shift: { start_time: string; end_time: string }) => {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  const end = new Date(`2000-01-01T${shift.end_time}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};

const groupByDay = <T extends { day_of_week: number }>(items: T[]) =>
  items.reduce<Record<number, T[]>>((acc, item) => {
    if (!acc[item.day_of_week]) acc[item.day_of_week] = [];
    acc[item.day_of_week].push(item);
    return acc;
  }, {});

const statusUi = (status?: ShiftSubmission["status"]) => {
  switch (status) {
    case "pending":
      return { title: "Da gui cho duyet", color: "#B45309", bg: "#FFF7E8", border: "#F5C97B", icon: "schedule" as const };
    case "approved":
      return { title: "Da duoc duyet", color: "#166534", bg: "#ECFDF3", border: "#A7F3D0", icon: "check-circle" as const };
    case "rejected":
      return { title: "Bi tu choi", color: "#B91C1C", bg: "#FEF2F2", border: "#FECACA", icon: "cancel" as const };
    default:
      return { title: "Chua co dang ky", color: GUIDE_COLORS.textSecondary, bg: "#F8F7F4", border: GUIDE_COLORS.borderLight, icon: "info-outline" as const };
  }
};

export const ShiftRegistrationModal: React.FC<ShiftRegistrationModalProps> = ({
  visible,
  onClose,
  weekStartDate: initialWeekStart,
}) => {
  const insets = useSafeAreaInsets();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(new Date(initialWeekStart));
  const [shifts, setShifts] = useState<CreateShiftRequest[]>([]);
  const [changeReason, setChangeReason] = useState("");
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
  const [editingTimeType, setEditingTimeType] = useState<"start" | "end" | null>(null);
  const [tempTime, setTempTime] = useState(new Date());

  useEffect(() => {
    if (visible) setWeekStart(new Date(initialWeekStart));
  }, [initialWeekStart, visible]);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const { data: existingResponse, isLoading: isExistingLoading } = useQuery({
    queryKey: GUIDE_KEYS.shiftSubmissions.list({ week_start_date: weekStartStr }),
    queryFn: () => getShiftSubmissions({ week_start_date: weekStartStr }),
    enabled: visible,
  });

  const existingSubmissions = existingResponse?.data ?? [];
  const pendingSubmission = existingSubmissions.find((item) => item.status === "pending");
  const approvedSubmission = existingSubmissions.find((item) => item.status === "approved");
  const rejectedSubmission = existingSubmissions.find((item) => item.status === "rejected");
  const referenceSubmission = pendingSubmission ?? approvedSubmission ?? rejectedSubmission;
  const isBlockedByPending = !!pendingSubmission;
  const isUpdateMode = !!approvedSubmission;

  useEffect(() => {
    if (!visible) return;
    if (isBlockedByPending) {
      setShifts([]);
      setChangeReason("");
      return;
    }
    const seed = approvedSubmission?.shifts ?? rejectedSubmission?.shifts ?? [];
    setShifts(seed.map((shift) => ({
      day_of_week: shift.day_of_week,
      start_time: shift.start_time,
      end_time: shift.end_time,
    })));
    setChangeReason("");
  }, [approvedSubmission, rejectedSubmission, isBlockedByPending, visible, weekStartStr]);

  const submitMutation = useMutation({
    mutationFn: (payload: {
      week_start_date: string;
      shifts: CreateShiftRequest[];
      previous_submission_id?: string;
      change_reason?: string;
    }) => createShiftSubmission(payload),
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: "Thanh cong",
        text2: isUpdateMode ? "Da gui yeu cau thay doi lich." : "Da gui dang ky lich lam viec.",
      });
      onClose();
      setShifts([]);
      setChangeReason("");
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.shiftSubmissions.all });
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.activeShift(weekStartStr) });
    },
    onError: (error: any) => {
      Toast.show({
        type: "error",
        text1: "Khong gui duoc",
        text2: error?.message || "Vui long thu lai.",
      });
    },
  });

  const weekRangeText = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return `Tuan ${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
  }, [weekStart]);

  const shiftsByDay = useMemo(() => groupByDay(shifts), [shifts]);
  const existingByDay = useMemo(() => groupByDay(referenceSubmission?.shifts ?? []), [referenceSubmission]);
  const totalHours = useMemo(() => shifts.reduce((sum, shift) => sum + hoursOf(shift), 0), [shifts]);
  const statusConfig = statusUi(referenceSubmission?.status);

  const getFormattedDate = (dayOfWeek: number) => {
    const start = new Date(weekStart);
    const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
    const target = new Date(start);
    target.setDate(start.getDate() + offset);
    return `${target.getDate().toString().padStart(2, "0")}/${(target.getMonth() + 1).toString().padStart(2, "0")}`;
  };

  const validateShift = (candidate: CreateShiftRequest, ignoreIndex?: number) => {
    const start = new Date(`2000-01-01T${candidate.start_time}`);
    const end = new Date(`2000-01-01T${candidate.end_time}`);
    if (end <= start) {
      Toast.show({ type: "error", text1: "Gio chua hop le", text2: "Gio ket thuc phai sau gio bat dau." });
      return false;
    }
    if (hoursOf(candidate) > 12) {
      Toast.show({ type: "error", text1: "Ca lam qua dai", text2: "Moi ca toi da 12 gio." });
      return false;
    }
    const overlap = shifts.some((shift, index) => {
      if (index === ignoreIndex) return false;
      if (shift.day_of_week !== candidate.day_of_week) return false;
      return candidate.start_time < shift.end_time && candidate.end_time > shift.start_time;
    });
    if (overlap) {
      Toast.show({ type: "error", text1: "Bi trung gio", text2: "Ca nay dang bi chong len voi ca khac trong cung ngay." });
      return false;
    }
    return true;
  };

  const sortShifts = (items: CreateShiftRequest[]) =>
    [...items].sort((a, b) =>
      a.day_of_week === b.day_of_week
        ? a.start_time.localeCompare(b.start_time)
        : a.day_of_week - b.day_of_week,
    );

  const addShift = (dayOfWeek: number, preset: TimePreset = PRESETS[0]) => {
    const candidate = { day_of_week: dayOfWeek, start_time: preset.start, end_time: preset.end };
    if (!validateShift(candidate)) return;
    setShifts((prev) => sortShifts([...prev, candidate]));
    setShowDayPicker(false);
  };

  const removeShift = (index: number) => {
    setShifts((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const openTimePicker = (shiftIndex: number, type: "start" | "end") => {
    const value = type === "start" ? shifts[shiftIndex].start_time : shifts[shiftIndex].end_time;
    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempTime(date);
    setEditingShiftIndex(shiftIndex);
    setEditingTimeType(type);
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setEditingTimeType(null);
    if (!selectedDate || editingShiftIndex === null || !editingTimeType) return;

    const nextTime = `${selectedDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}:00`;
    const nextShift = { ...shifts[editingShiftIndex] };
    if (editingTimeType === "start") nextShift.start_time = nextTime;
    else nextShift.end_time = nextTime;

    if (!validateShift(nextShift, editingShiftIndex)) {
      if (Platform.OS === "ios") setEditingTimeType(null);
      return;
    }

    setShifts((prev) => {
      const updated = [...prev];
      updated[editingShiftIndex] = nextShift;
      return sortShifts(updated);
    });
  };

  const changeWeek = (offset: number) => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + offset * 7);
    setWeekStart(next);
    setShowDayPicker(false);
    setEditingTimeType(null);
  };

  const handleSubmit = () => {
    if (isBlockedByPending) return;
    if (!shifts.length) {
      Toast.show({ type: "info", text1: "Chua co ca lam", text2: "Hay them it nhat 1 ca truoc khi gui." });
      return;
    }
    if (isUpdateMode && !changeReason.trim()) {
      Toast.show({ type: "info", text1: "Can ly do thay doi", text2: "Hay ghi ly do de manager de duyet." });
      return;
    }

    const payload: {
      week_start_date: string;
      shifts: CreateShiftRequest[];
      previous_submission_id?: string;
      change_reason?: string;
    } = { week_start_date: weekStartStr, shifts };

    if (approvedSubmission) {
      payload.previous_submission_id = approvedSubmission.id;
      payload.change_reason = changeReason.trim();
    }

    Alert.alert(
      "Xac nhan gui lich",
      `Ban se gui ${shifts.length} ca (${totalHours.toFixed(1)} gio) cho ${weekRangeText.toLowerCase()}.`,
      [
        { text: "Huy", style: "cancel" },
        { text: isUpdateMode ? "Gui thay doi" : "Gui yeu cau", onPress: () => submitMutation.mutate(payload) },
      ],
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose} style={styles.iconButton}>
            <MaterialIcons name="close" size={24} color={GUIDE_COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>
            {isUpdateMode ? "Dieu chinh lich lam viec" : "Dang ky lich lam viec"}
          </Text>
          <View style={styles.iconButton} />
        </View>

        <View style={styles.weekSelector}>
          <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.weekNavButton}>
            <MaterialIcons name="chevron-left" size={24} color={GUIDE_COLORS.textSecondary} />
          </TouchableOpacity>
          <View style={styles.weekInfo}>
            <Text style={styles.weekEyebrow}>Dang chon</Text>
            <Text style={styles.weekText}>{weekRangeText}</Text>
          </View>
          <TouchableOpacity onPress={() => changeWeek(1)} style={styles.weekNavButton}>
            <MaterialIcons name="chevron-right" size={24} color={GUIDE_COLORS.textSecondary} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.summaryCard}>
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{Object.keys(shiftsByDay).length}</Text>
              <Text style={styles.summaryLabel}>Ngay da chon</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{shifts.length}</Text>
              <Text style={styles.summaryLabel}>Ca dang sua</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryBlock}>
              <Text style={styles.summaryValue}>{totalHours.toFixed(1)}</Text>
              <Text style={styles.summaryLabel}>Tong gio</Text>
            </View>
          </View>

          {isExistingLoading ? (
            <View style={styles.noticeCard}>
              <ActivityIndicator color={GUIDE_COLORS.primary} />
              <Text style={styles.noticeText}>Dang tai dang ky cua tuan nay...</Text>
            </View>
          ) : referenceSubmission ? (
            <View
              style={[
                styles.referenceCard,
                { backgroundColor: statusConfig.bg, borderColor: statusConfig.border },
              ]}
            >
              <View style={styles.referenceHeader}>
                <View style={styles.referenceTitleRow}>
                  <MaterialIcons name={statusConfig.icon} size={18} color={statusConfig.color} />
                  <Text style={[styles.referenceTitle, { color: statusConfig.color }]}>
                    {statusConfig.title}
                  </Text>
                </View>
                <Text style={[styles.referenceMeta, { color: statusConfig.color }]}>
                  {referenceSubmission.shifts?.length || 0} ca
                </Text>
              </View>

              {referenceSubmission.rejection_reason ? (
                <Text style={[styles.referenceReason, { color: statusConfig.color }]}>
                  Ly do: {referenceSubmission.rejection_reason}
                </Text>
              ) : null}

              {(referenceSubmission.shifts ?? []).map((shift) => (
                <View key={shift.id} style={styles.referenceRow}>
                  <Text style={styles.referenceRowDay}>{getDayLabel(shift.day_of_week)}</Text>
                  <Text style={styles.referenceRowTime}>
                    {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                  </Text>
                </View>
              ))}

              {isBlockedByPending ? (
                <Text style={styles.referenceHint}>
                  Tuan nay da co yeu cau dang cho duyet. Ban chua the gui them cho den khi yeu cau hien tai duoc xu ly.
                </Text>
              ) : null}
            </View>
          ) : (
            <View style={styles.noticeCard}>
              <MaterialIcons name="info-outline" size={18} color={GUIDE_COLORS.textSecondary} />
              <Text style={styles.noticeText}>
                Tuan nay chua co dang ky cu. Ban co the them ngay va ca lam ngay ben duoi.
              </Text>
            </View>
          )}

          {shifts.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIcon}>
                <MaterialIcons name="event-note" size={34} color={GUIDE_COLORS.primary} />
              </View>
              <Text style={styles.emptyTitle}>Chua co ca nao trong ban nhap</Text>
              <Text style={styles.emptyDescription}>
                Chon ngay truoc, sau do them nhanh ca sang, chieu hoac ca dai.
              </Text>
            </View>
          ) : null}

          {Object.keys(shiftsByDay)
            .map(Number)
            .sort((a, b) => a - b)
            .map((day) => {
              const dayShifts = shiftsByDay[day];
              const referenceShifts = existingByDay[day] ?? [];
              return (
                <View key={day} style={styles.dayCard}>
                  <View style={styles.dayHeader}>
                    <Text style={styles.dayTitle}>
                      {getDayLabel(day)} ({getFormattedDate(day)})
                    </Text>
                    <Text style={styles.daySubtitle}>
                      {dayShifts.length} ca trong ban nhap
                      {referenceShifts.length ? ` • da co ${referenceShifts.length} ca` : ""}
                    </Text>
                  </View>

                  {referenceShifts.length ? (
                    <View style={styles.inlineReferenceWrap}>
                      {referenceShifts.map((shift) => (
                        <View key={shift.id} style={styles.inlineReferenceChip}>
                          <Text style={styles.inlineReferenceText}>
                            {formatTime(shift.start_time)} - {formatTime(shift.end_time)}
                          </Text>
                        </View>
                      ))}
                    </View>
                  ) : null}

                  {dayShifts.map((shift, localIndex) => {
                    const globalIndex = shifts.findIndex((item, itemIndex) => {
                      if (itemIndex < localIndex) return false;
                      return (
                        item.day_of_week === shift.day_of_week &&
                        item.start_time === shift.start_time &&
                        item.end_time === shift.end_time
                      );
                    });

                    return (
                      <View
                        key={`${day}-${shift.start_time}-${shift.end_time}-${localIndex}`}
                        style={styles.shiftCard}
                      >
                        <View style={styles.shiftCardHeader}>
                          <Text style={styles.shiftCardLabel}>Ca {localIndex + 1}</Text>
                          <Text style={styles.shiftCardHours}>
                            {hoursOf(shift).toFixed(1)} gio
                          </Text>
                        </View>

                        <View style={styles.timeRow}>
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => openTimePicker(globalIndex, "start")}
                          >
                            <MaterialIcons name="access-time" size={16} color={GUIDE_COLORS.textSecondary} />
                            <Text style={styles.timeValue}>{formatTime(shift.start_time)}</Text>
                          </TouchableOpacity>
                          <MaterialIcons name="arrow-forward" size={18} color={GUIDE_COLORS.gray400} />
                          <TouchableOpacity
                            style={styles.timeButton}
                            onPress={() => openTimePicker(globalIndex, "end")}
                          >
                            <MaterialIcons name="access-time" size={16} color={GUIDE_COLORS.textSecondary} />
                            <Text style={styles.timeValue}>{formatTime(shift.end_time)}</Text>
                          </TouchableOpacity>
                        </View>

                        <TouchableOpacity
                          style={styles.deleteButton}
                          onPress={() => removeShift(globalIndex)}
                        >
                          <MaterialIcons name="delete-outline" size={22} color={GUIDE_COLORS.error} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}

                  <View style={styles.presetRow}>
                    {PRESETS.map((preset) => (
                      <TouchableOpacity
                        key={`${day}-${preset.key}`}
                        style={styles.presetChip}
                        onPress={() => addShift(day, preset)}
                      >
                        <Text style={styles.presetTitle}>{preset.label}</Text>
                        <Text style={styles.presetTime}>
                          {formatTime(preset.start)} - {formatTime(preset.end)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              );
            })}

          <TouchableOpacity style={styles.addDayButton} onPress={() => setShowDayPicker(true)}>
            <MaterialIcons name="add-circle-outline" size={22} color={GUIDE_COLORS.primary} />
            <Text style={styles.addDayText}>Them ngay de dang ky</Text>
          </TouchableOpacity>

          {isUpdateMode ? (
            <View style={styles.reasonCard}>
              <Text style={styles.reasonTitle}>Ly do thay doi lich</Text>
              <TextInput
                style={styles.reasonInput}
                placeholder="Vi du: Doi sang ca sang de phu hop lich site..."
                placeholderTextColor={GUIDE_COLORS.textMuted}
                multiline
                value={changeReason}
                onChangeText={setChangeReason}
              />
            </View>
          ) : null}
        </ScrollView>

        <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) + 8 }]}>
          <Text style={styles.footerText}>
            {isBlockedByPending
              ? "Tuan nay dang cho duyet"
              : `${shifts.length} ca • ${totalHours.toFixed(1)} gio`}
          </Text>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (isBlockedByPending || shifts.length === 0) && styles.submitButtonDisabled,
            ]}
            onPress={handleSubmit}
            disabled={isBlockedByPending || shifts.length === 0 || submitMutation.isPending}
          >
            {submitMutation.isPending ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.submitButtonText}>
                {isBlockedByPending
                  ? "Da co yeu cau cho tuan nay"
                  : isUpdateMode
                  ? "Gui yeu cau thay doi"
                  : "Gui yeu cau dang ky"}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showDayPicker}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDayPicker(false)}
        >
          <View style={styles.overlay}>
            <View style={styles.dayPickerCard}>
              <Text style={styles.dayPickerTitle}>Chon ngay can dang ky</Text>
              <Text style={styles.dayPickerSubtitle}>
                Moi ngay se duoc tao san 1 ca sang, ban co the doi gio sau.
              </Text>
              <View style={styles.dayGrid}>
                {DAYS.map((day) => (
                  <TouchableOpacity
                    key={day.value}
                    style={styles.dayGridItem}
                    onPress={() => addShift(day.value)}
                  >
                    <Text style={styles.dayGridTitle}>{day.label}</Text>
                    <Text style={styles.dayGridDate}>{getFormattedDate(day.value)}</Text>
                    <Text style={styles.dayGridMeta}>Nhap: {shiftsByDay[day.value]?.length ?? 0}</Text>
                    <Text style={styles.dayGridMeta}>Da co: {existingByDay[day.value]?.length ?? 0}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity style={styles.dayPickerClose} onPress={() => setShowDayPicker(false)}>
                <Text style={styles.dayPickerCloseText}>Dong</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {editingTimeType ? (
          <DateTimePicker
            value={tempTime}
            mode="time"
            is24Hour
            display={Platform.OS === "ios" ? "spinner" : "default"}
            onChange={onTimeChange}
          />
        ) : null}

        {Platform.OS === "ios" && editingTimeType ? (
          <View style={styles.iosToolbar}>
            <TouchableOpacity onPress={() => setEditingTimeType(null)}>
              <Text style={styles.iosToolbarText}>Xong</Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: GUIDE_COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.lg,
    backgroundColor: GUIDE_COLORS.surface,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  iconButton: { width: 32, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  weekSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: GUIDE_SPACING.lg,
    marginTop: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    ...GUIDE_SHADOWS.sm,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_COLORS.gray100,
  },
  weekInfo: { flex: 1, alignItems: "center" },
  weekEyebrow: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  weekText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    marginTop: 2,
  },
  content: { flex: 1 },
  contentContainer: { paddingHorizontal: GUIDE_SPACING.lg, paddingBottom: GUIDE_SPACING.lg, gap: GUIDE_SPACING.md },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  summaryBlock: { flex: 1, alignItems: "center" },
  summaryValue: { fontSize: 22, fontWeight: "800", color: GUIDE_COLORS.textPrimary },
  summaryLabel: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textMuted },
  summaryDivider: { width: 1, backgroundColor: GUIDE_COLORS.borderLight },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
  },
  noticeText: { flex: 1, fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, color: GUIDE_COLORS.textSecondary, lineHeight: 20 },
  referenceCard: { borderWidth: 1, borderRadius: GUIDE_BORDER_RADIUS.lg, padding: GUIDE_SPACING.md, gap: GUIDE_SPACING.sm },
  referenceHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: GUIDE_SPACING.sm },
  referenceTitleRow: { flexDirection: "row", alignItems: "center", gap: GUIDE_SPACING.xs, flex: 1 },
  referenceTitle: { flex: 1, fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700" },
  referenceMeta: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, fontWeight: "700" },
  referenceReason: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, lineHeight: 20 },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "rgba(255,255,255,0.55)",
    borderRadius: GUIDE_BORDER_RADIUS.md,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
  },
  referenceRowDay: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  referenceRowTime: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, color: GUIDE_COLORS.textSecondary },
  referenceHint: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textSecondary, lineHeight: 18 },
  emptyState: {
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.xl,
    paddingHorizontal: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  emptyIcon: {
    width: 68,
    height: 68,
    borderRadius: 34,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_COLORS.primaryMuted,
    marginBottom: GUIDE_SPACING.md,
  },
  emptyTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeLG, fontWeight: "700", color: GUIDE_COLORS.textPrimary, marginBottom: GUIDE_SPACING.xs },
  emptyDescription: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, color: GUIDE_COLORS.textSecondary, lineHeight: 20, textAlign: "center" },
  dayCard: { backgroundColor: GUIDE_COLORS.surface, borderRadius: GUIDE_BORDER_RADIUS.lg, padding: GUIDE_SPACING.md, gap: GUIDE_SPACING.sm, ...GUIDE_SHADOWS.sm },
  dayHeader: { gap: 4 },
  dayTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  daySubtitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textSecondary },
  inlineReferenceWrap: { flexDirection: "row", flexWrap: "wrap", gap: GUIDE_SPACING.xs },
  inlineReferenceChip: { paddingHorizontal: GUIDE_SPACING.sm, paddingVertical: 6, borderRadius: GUIDE_BORDER_RADIUS.full, backgroundColor: "#F4F1EA" },
  inlineReferenceText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textSecondary, fontWeight: "600" },
  shiftCard: { position: "relative", borderWidth: 1, borderColor: GUIDE_COLORS.borderLight, borderRadius: GUIDE_BORDER_RADIUS.md, padding: GUIDE_SPACING.sm, backgroundColor: GUIDE_COLORS.background, gap: GUIDE_SPACING.sm },
  shiftCardHeader: { flexDirection: "row", justifyContent: "space-between", paddingRight: 28 },
  shiftCardLabel: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  shiftCardHours: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textMuted },
  timeRow: { flexDirection: "row", alignItems: "center", gap: GUIDE_SPACING.sm },
  timeButton: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: GUIDE_SPACING.xs, backgroundColor: GUIDE_COLORS.gray100, borderRadius: GUIDE_BORDER_RADIUS.md, paddingVertical: 10 },
  timeValue: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  deleteButton: { position: "absolute", top: GUIDE_SPACING.sm, right: GUIDE_SPACING.sm, padding: 2 },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: GUIDE_SPACING.xs },
  presetChip: { minWidth: "31%", flexGrow: 1, borderWidth: 1, borderColor: GUIDE_COLORS.primaryLight, borderRadius: GUIDE_BORDER_RADIUS.md, backgroundColor: GUIDE_COLORS.primaryMuted, paddingHorizontal: GUIDE_SPACING.sm, paddingVertical: GUIDE_SPACING.sm },
  presetTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  presetTime: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textSecondary, marginTop: 2 },
  addDayButton: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: GUIDE_SPACING.sm, borderWidth: 1.5, borderColor: GUIDE_COLORS.primary, borderStyle: "dashed", borderRadius: GUIDE_BORDER_RADIUS.lg, paddingVertical: GUIDE_SPACING.md, backgroundColor: GUIDE_COLORS.surface },
  addDayText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.primary },
  reasonCard: { backgroundColor: GUIDE_COLORS.surface, borderRadius: GUIDE_BORDER_RADIUS.lg, padding: GUIDE_SPACING.md, ...GUIDE_SHADOWS.sm },
  reasonTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, fontWeight: "700", color: GUIDE_COLORS.textPrimary, marginBottom: GUIDE_SPACING.xs },
  reasonInput: { minHeight: 96, borderWidth: 1, borderColor: GUIDE_COLORS.borderLight, borderRadius: GUIDE_BORDER_RADIUS.md, backgroundColor: GUIDE_COLORS.background, padding: GUIDE_SPACING.md, textAlignVertical: "top", fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, color: GUIDE_COLORS.textPrimary },
  footer: { paddingHorizontal: GUIDE_SPACING.lg, paddingTop: GUIDE_SPACING.md, backgroundColor: GUIDE_COLORS.surface, borderTopWidth: 1, borderTopColor: GUIDE_COLORS.borderLight, ...GUIDE_SHADOWS.md },
  footerText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.textPrimary, marginBottom: GUIDE_SPACING.md },
  submitButton: { backgroundColor: GUIDE_COLORS.primary, paddingVertical: 16, borderRadius: GUIDE_BORDER_RADIUS.lg, alignItems: "center" },
  submitButtonDisabled: { backgroundColor: GUIDE_COLORS.gray300 },
  submitButtonText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: "#FFF" },
  overlay: { flex: 1, justifyContent: "center", backgroundColor: "rgba(0,0,0,0.48)", padding: GUIDE_SPACING.lg },
  dayPickerCard: { backgroundColor: GUIDE_COLORS.surface, borderRadius: GUIDE_BORDER_RADIUS.xl, padding: GUIDE_SPACING.lg },
  dayPickerTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeLG, fontWeight: "700", color: GUIDE_COLORS.textPrimary, textAlign: "center" },
  dayPickerSubtitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, color: GUIDE_COLORS.textSecondary, lineHeight: 20, textAlign: "center", marginTop: GUIDE_SPACING.xs, marginBottom: GUIDE_SPACING.md },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: GUIDE_SPACING.sm },
  dayGridItem: { width: "48%", borderWidth: 1, borderColor: GUIDE_COLORS.borderLight, borderRadius: GUIDE_BORDER_RADIUS.lg, backgroundColor: GUIDE_COLORS.background, padding: GUIDE_SPACING.md },
  dayGridTitle: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.textPrimary },
  dayGridDate: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textMuted, marginTop: 2 },
  dayGridMeta: { fontSize: GUIDE_TYPOGRAPHY.fontSizeXS, color: GUIDE_COLORS.textSecondary, marginTop: 4 },
  dayPickerClose: { alignItems: "center", paddingTop: GUIDE_SPACING.md },
  dayPickerCloseText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "600", color: GUIDE_COLORS.textSecondary },
  iosToolbar: { position: "absolute", bottom: 0, left: 0, right: 0, alignItems: "flex-end", backgroundColor: GUIDE_COLORS.surface, borderTopWidth: 1, borderTopColor: GUIDE_COLORS.borderLight, padding: GUIDE_SPACING.sm },
  iosToolbarText: { fontSize: GUIDE_TYPOGRAPHY.fontSizeMD, fontWeight: "700", color: GUIDE_COLORS.primary },
});

export default ShiftRegistrationModal;
