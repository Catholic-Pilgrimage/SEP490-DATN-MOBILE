import { MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  createShiftSubmission,
  dashboardApi,
  getShiftSubmissions,
  updateShiftSubmission,
} from "../../../../services/api/guide";
import {
  CreateShiftRequest,
  ShiftSubmission,
} from "../../../../types/guide/shiftSubmission.types";
import { getApiErrorMessage } from "../../../../utils/apiError";

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

const formatShortDate = (date: Date | string | null | undefined, t: any) => {
  if (!date) return null;
  const parsed = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString(
    t("common.languageCode", { defaultValue: "vi-VN" }),
    {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    },
  );
};

const formatTime = (time: string) => time.slice(0, 5);

const hoursOf = (shift: { start_time: string; end_time: string }) => {
  const start = new Date(`2000-01-01T${shift.start_time}`);
  const end = new Date(`2000-01-01T${shift.end_time}`);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
};
const normalizeDateOnly = (date: Date) => {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
};
const getShiftDateForWeek = (weekStartDate: Date, dayOfWeek: number) => {
  const target = normalizeDateOnly(weekStartDate);
  const offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
  target.setDate(target.getDate() + offset);
  return target;
};
const toCreateShiftRequest = (shift: {
  day_of_week: number;
  start_time: string;
  end_time: string;
}): CreateShiftRequest => ({
  day_of_week: shift.day_of_week,
  start_time: shift.start_time,
  end_time: shift.end_time,
});

const groupByDay = <T extends { day_of_week: number }>(items: T[]) =>
  items.reduce<Record<number, T[]>>((acc, item) => {
    if (!acc[item.day_of_week]) acc[item.day_of_week] = [];
    acc[item.day_of_week].push(item);
    return acc;
  }, {});

type DailyWindow = { open: string; close: string };
type MinuteWindow = { start: number; end: number };
const MIN_SHIFT_MINUTES = 120;

const toMinutes = (time: string): number | null => {
  const [h, m] = time.split(":").map(Number);
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  if (h < 0 || h > 23 || m < 0 || m > 59) return null;
  return h * 60 + m;
};

const toMinuteWindowsForOwnDay = (windows: DailyWindow[]): MinuteWindow[] =>
  windows
    .map((window) => {
      const open = toMinutes(window.open);
      const close = toMinutes(window.close);
      if (open === null || close === null) return null;
      if (open < close) return { start: open, end: close };
      if (open > close) return { start: open, end: 24 * 60 };
      return null;
    })
    .filter((item): item is MinuteWindow => !!item);

const toSpillMinuteWindowsFromPrevDay = (
  windows: DailyWindow[],
): MinuteWindow[] =>
  windows
    .map((window) => {
      const open = toMinutes(window.open);
      const close = toMinutes(window.close);
      if (open === null || close === null) return null;
      if (open > close) return { start: 0, end: close };
      return null;
    })
    .filter((item): item is MinuteWindow => !!item);

const getWindowDurationMinutes = (window: DailyWindow): number => {
  const open = toMinutes(window.open);
  const close = toMinutes(window.close);
  if (open === null || close === null) return 0;
  if (close > open) return close - open;
  if (close < open) return 24 * 60 - open + close;
  return 0;
};

const toTimeString = (minutes: number): string => {
  const safe = Math.max(0, Math.min(minutes, 24 * 60 - 1));
  const hours = Math.floor(safe / 60)
    .toString()
    .padStart(2, "0");
  const mins = (safe % 60).toString().padStart(2, "0");
  return `${hours}:${mins}:00`;
};

const extractBackendValidationMessage = (error: unknown): string | null => {
  if (!error || typeof error !== "object") return null;

  const responseData = (error as { response?: { data?: unknown } }).response
    ?.data;
  if (!responseData || typeof responseData !== "object") return null;

  const errors = (responseData as { errors?: unknown }).errors;
  if (!Array.isArray(errors)) return null;

  const messages = errors
    .map((item) => {
      if (!item || typeof item !== "object") return "";
      const field = (item as { field?: unknown }).field;
      const message = (item as { message?: unknown }).message;
      const msg = typeof message === "string" ? message.trim() : "";
      if (!msg) return "";
      return typeof field === "string" && field.trim()
        ? `${field}: ${msg}`
        : msg;
    })
    .filter(Boolean);

  return messages.length ? messages.join("\n") : null;
};

export const ShiftRegistrationModal: React.FC<ShiftRegistrationModalProps> = ({
  visible,
  onClose,
  weekStartDate: initialWeekStart,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confirm, ConfirmModal } = useConfirm();
  const queryClient = useQueryClient();
  const [weekStart, setWeekStart] = useState(new Date(initialWeekStart));
  const [shifts, setShifts] = useState<CreateShiftRequest[]>([]);
  const [changeReason, setChangeReason] = useState("");
  const [showDayPicker, setShowDayPicker] = useState(false);
  const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(
    null,
  );
  const [editingTimeType, setEditingTimeType] = useState<
    "start" | "end" | null
  >(null);
  const [tempTime, setTempTime] = useState(new Date());
  const [autoAdjustHint, setAutoAdjustHint] = useState<string | null>(null);
  const [validationHint, setValidationHint] = useState<string | null>(null);

  const DAYS = useMemo(
    () => [
      { value: 1, label: t("common.days.mon") },
      { value: 2, label: t("common.days.tue") },
      { value: 3, label: t("common.days.wed") },
      { value: 4, label: t("common.days.thu") },
      { value: 5, label: t("common.days.fri") },
      { value: 6, label: t("common.days.sat") },
      { value: 0, label: t("common.days.sun") },
    ],
    [t],
  );

  const PRESETS: TimePreset[] = useMemo(
    () => [
      {
        key: "morning",
        label: t("shifts.reg_morning"),
        start: "08:00:00",
        end: "12:00:00",
      },
      {
        key: "afternoon",
        label: t("shifts.reg_afternoon"),
        start: "13:00:00",
        end: "17:00:00",
      },
      {
        key: "full",
        label: t("shifts.reg_long"),
        start: "08:00:00",
        end: "17:00:00",
      },
    ],
    [t],
  );

  const getDayLabel = (day: number) =>
    DAYS.find((item) => item.value === day)?.label ??
    `${t("shifts.summary_week_label")} ${day}`;

  const statusUi = (status?: ShiftSubmission["status"]) => {
    switch (status) {
      case "pending":
        return {
          title: t("shifts.status_pending"),
          color: "#B45309",
          bg: "#FFF7E8",
          border: "#F5C97B",
          icon: "schedule" as const,
        };
      case "approved":
        return {
          title: t("shifts.status_approved"),
          color: "#166534",
          bg: "#ECFDF3",
          border: "#A7F3D0",
          icon: "check-circle" as const,
        };
      case "rejected":
        return {
          title: t("shifts.status_rejected"),
          color: "#B91C1C",
          bg: "#FEF2F2",
          border: "#FECACA",
          icon: "cancel" as const,
        };
      default:
        return {
          title: t("shifts.empty_no_registrations"),
          color: GUIDE_COLORS.textSecondary,
          bg: "#F8F7F4",
          border: GUIDE_COLORS.borderLight,
          icon: "info-outline" as const,
        };
    }
  };

  useEffect(() => {
    if (visible) setWeekStart(new Date(initialWeekStart));
  }, [initialWeekStart, visible]);

  const weekStartStr = weekStart.toISOString().split("T")[0];
  const { data: existingResponse, isLoading: isExistingLoading } = useQuery({
    queryKey: GUIDE_KEYS.shiftSubmissions.list({
      week_start_date: weekStartStr,
    }),
    queryFn: () => getShiftSubmissions({ week_start_date: weekStartStr }),
    enabled: visible,
  });

  const { data: siteScheduleResponse } = useQuery({
    queryKey: GUIDE_KEYS.dashboard.activeShift(weekStartStr),
    queryFn: () => dashboardApi.getSiteSchedule(weekStartStr),
    enabled: visible,
    staleTime: 60 * 1000,
  });

  const existingSubmissions = existingResponse?.data ?? [];
  const pendingSubmission = existingSubmissions.find(
    (item) => item.status === "pending",
  );
  const approvedSubmission = existingSubmissions.find(
    (item) => item.status === "approved",
  );
  const rejectedSubmission = existingSubmissions.find(
    (item) => item.status === "rejected",
  );
  const editableSubmission = pendingSubmission ?? rejectedSubmission ?? null;
  const referenceSubmission = editableSubmission ?? approvedSubmission ?? null;
  const isEditingExistingSubmission = !!editableSubmission;
  const isChangeRequestMode = !editableSubmission && !!approvedSubmission;
  const todayStart = useMemo(() => normalizeDateOnly(new Date()), []);

  useEffect(() => {
    if (!visible) return;
    const seed = editableSubmission?.shifts ?? approvedSubmission?.shifts ?? [];
    const editableSeed = seed.filter(
      (shift) =>
        getShiftDateForWeek(weekStart, shift.day_of_week).getTime() >=
        todayStart.getTime(),
    );
    setShifts(
      editableSeed.map((shift) => ({
        day_of_week: shift.day_of_week,
        start_time: shift.start_time,
        end_time: shift.end_time,
      })),
    );
    setChangeReason("");
  }, [
    editableSubmission,
    approvedSubmission,
    visible,
    weekStart,
    weekStartStr,
    todayStart,
  ]);

  useEffect(() => {
    if (!autoAdjustHint) return;
    const timer = setTimeout(() => setAutoAdjustHint(null), 2500);
    return () => clearTimeout(timer);
  }, [autoAdjustHint]);

  const submitMutation = useMutation({
    mutationFn: async (payload: {
      week_start_date: string;
      shifts: CreateShiftRequest[];
      editable_submission_id?: string;
      previous_submission_id?: string;
      change_reason?: string;
    }) => {
      if (payload.editable_submission_id) {
        return updateShiftSubmission(payload.editable_submission_id, {
          shifts: payload.shifts,
        });
      }

      return createShiftSubmission({
        week_start_date: payload.week_start_date,
        shifts: payload.shifts,
        previous_submission_id: payload.previous_submission_id,
        change_reason: payload.change_reason,
      });
    },
    onSuccess: () => {
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: isEditingExistingSubmission
          ? t("shifts.registration.toasts.success_update")
          : isChangeRequestMode
            ? t("shifts.reg_toast_success_change_request")
            : t("shifts.reg_toast_success_submit"),
      });
      onClose();
      setShifts([]);
      setChangeReason("");
      queryClient.invalidateQueries({
        queryKey: GUIDE_KEYS.shiftSubmissions.all,
      });
      queryClient.invalidateQueries({
        queryKey: GUIDE_KEYS.dashboard.activeShift(weekStartStr),
      });
    },
    onError: (error: any) => {
      const submitErrorMessage =
        extractBackendValidationMessage(error) ||
        getApiErrorMessage(error, t("common.error"));
      void showBlockingMessage(
        submitErrorMessage || error?.message || t("common.error"),
        t("shifts.reg_error_submit_failed"),
        "warning",
      );
    },
  });

  const weekRangeText = useMemo(() => {
    const start = new Date(weekStart);
    const end = new Date(weekStart);
    end.setDate(end.getDate() + 6);
    return t("shifts.summary_week_range", {
      start: `${start.getDate()}/${start.getMonth() + 1}`,
      end: `${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`,
    });
  }, [weekStart, t]);

  const shiftsByDay = useMemo(() => groupByDay(shifts), [shifts]);
  const existingByDay = useMemo(
    () => groupByDay(referenceSubmission?.shifts ?? []),
    [referenceSubmission],
  );
  const totalHours = useMemo(
    () => shifts.reduce((sum, shift) => sum + hoursOf(shift), 0),
    [shifts],
  );
  const statusConfig = statusUi(referenceSubmission?.status);

  const dailyBounds = useMemo(
    () => siteScheduleResponse?.data?.daily_bounds ?? {},
    [siteScheduleResponse],
  );

  const resolveDayKeys = (dayOfWeek: number): string[] => {
    // UI uses JS day (0=Sun..6=Sat)
    const jsDay = dayOfWeek;
    // ISO day (1=Mon..7=Sun)
    const isoDay = dayOfWeek === 0 ? 7 : dayOfWeek;
    // Monday-based zero index (0=Mon..6=Sun)
    const mondayBasedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1;

    return Array.from(
      // Ưu tiên Monday-based vì API /local-guide/site-schedule hiện trả daily_bounds
      // theo tuần bắt đầu Thứ 2 (0=Mon..6=Sun).
      new Set([String(mondayBasedDay), String(jsDay), String(isoDay)]),
    );
  };

  const getWindowsForDay = (dayOfWeek: number): DailyWindow[] => {
    const keys = resolveDayKeys(dayOfWeek);
    let bestWindows: DailyWindow[] = [];
    let bestScore = -1;

    for (const key of keys) {
      const bounds = dailyBounds[key];
      if (!bounds?.windows || !Array.isArray(bounds.windows)) continue;

      const windows = bounds.windows.filter(
        (window) => !!window?.open && !!window?.close,
      ) as DailyWindow[];

      if (!windows.length) continue;

      const score = windows.reduce(
        (sum, window) => sum + getWindowDurationMinutes(window),
        0,
      );

      if (score > bestScore) {
        bestScore = score;
        bestWindows = windows;
      }
    }

    return bestWindows;
  };

  const getEffectiveMinuteWindowsForDay = (
    dayOfWeek: number,
  ): MinuteWindow[] => {
    const ownDayWindows = toMinuteWindowsForOwnDay(getWindowsForDay(dayOfWeek));
    const previousDay = (dayOfWeek + 6) % 7;
    const spillFromPreviousDay = toSpillMinuteWindowsFromPrevDay(
      getWindowsForDay(previousDay),
    );

    return [...ownDayWindows, ...spillFromPreviousDay].sort(
      (a, b) => a.start - b.start || a.end - b.end,
    );
  };

  const getFormattedDate = (dayOfWeek: number) => {
    const target = getShiftDateForWeek(weekStart, dayOfWeek);
    return `${target.getDate().toString().padStart(2, "0")}/${(target.getMonth() + 1).toString().padStart(2, "0")}`;
  };
  const sortShifts = (items: CreateShiftRequest[]) =>
    [...items].sort((a, b) =>
      a.day_of_week === b.day_of_week
        ? a.start_time.localeCompare(b.start_time)
        : a.day_of_week - b.day_of_week,
    );

  const isPastDay = (dayOfWeek: number) =>
    getShiftDateForWeek(weekStart, dayOfWeek).getTime() < todayStart.getTime();
  const lockedPastShifts = useMemo(
    () =>
      (referenceSubmission?.shifts ?? [])
        .filter(
          (shift) =>
            getShiftDateForWeek(weekStart, shift.day_of_week).getTime() <
            todayStart.getTime(),
        )
        .map(toCreateShiftRequest),
    [referenceSubmission, todayStart, weekStart],
  );
  const submissionShifts = useMemo(
    () => sortShifts([...lockedPastShifts, ...shifts]),
    [lockedPastShifts, shifts],
  );
  const submittedTotalHours = useMemo(
    () => submissionShifts.reduce((sum, shift) => sum + hoursOf(shift), 0),
    [submissionShifts],
  );

  const validateShift = (
    candidate: CreateShiftRequest,
    ignoreIndex?: number,
    options?: { silent?: boolean },
  ) => {
    const showValidationToast = (payload: {
      type: "success" | "error" | "info";
      text1: string;
      text2?: string;
    }) => {
      const hint = payload.text2?.trim() || payload.text1?.trim();
      setValidationHint(hint || null);
      if (!options?.silent) {
        Toast.show(payload);
      }
    };

    if (isPastDay(candidate.day_of_week)) {
      showValidationToast({
        type: "info",
        text1: t("shifts.reg_error_past_day"),
        text2: t("shifts.reg_error_past_day_desc", {
          defaultValue: t("shifts.reg_error_past_day"),
        }),
      });
      return false;
    }

    const start = new Date(`2000-01-01T${candidate.start_time}`);
    const end = new Date(`2000-01-01T${candidate.end_time}`);
    if (end <= start) {
      showValidationToast({
        type: "error",
        text1: t("shifts.reg_error_invalid_time"),
        text2: t("shifts.reg_error_invalid_time"),
      });
      return false;
    }
    if (hoursOf(candidate) > 12) {
      showValidationToast({
        type: "error",
        text1: t("shifts.reg_error_too_long"),
        text2: t("shifts.reg_error_too_long"),
      });
      return false;
    }
    if (hoursOf(candidate) < 2) {
      showValidationToast({
        type: "error",
        text1: t("common.error"),
        text2: t("shifts.reg_error_too_short", {
          defaultValue: "Mỗi ca phải ít nhất 2 giờ.",
        }),
      });
      return false;
    }

    const minuteWindows = getEffectiveMinuteWindowsForDay(
      candidate.day_of_week,
    );
    if (!minuteWindows.length) {
      showValidationToast({
        type: "error",
        text1: t("common.error"),
        text2: t("shifts.reg_error_day_unavailable", {
          defaultValue:
            "Ngày này không có khung giờ mở cửa hợp lệ để đăng ký ca.",
        }),
      });
      return false;
    }

    const startMin = toMinutes(candidate.start_time);
    const endMin = toMinutes(candidate.end_time);
    const withinAnyWindow =
      startMin !== null &&
      endMin !== null &&
      minuteWindows.some(
        (window) => startMin >= window.start && endMin <= window.end,
      );

    if (!withinAnyWindow) {
      showValidationToast({
        type: "error",
        text1: t("common.error"),
        text2: t("shifts.reg_error_outside_opening_window", {
          defaultValue:
            "Ca trực phải nằm trọn trong một khung giờ mở cửa hợp lệ.",
        }),
      });
      return false;
    }

    const overlap = shifts.some((shift, index) => {
      if (index === ignoreIndex) return false;
      if (shift.day_of_week !== candidate.day_of_week) return false;
      return (
        candidate.start_time < shift.end_time &&
        candidate.end_time > shift.start_time
      );
    });
    if (overlap) {
      showValidationToast({
        type: "error",
        text1: t("shifts.reg_error_overlap"),
        text2: t("shifts.reg_error_overlap"),
      });
      return false;
    }

    setValidationHint(null);
    return true;
  };

  const buildDefaultShiftForDay = (
    dayOfWeek: number,
  ): CreateShiftRequest | null => {
    const minuteWindows = getEffectiveMinuteWindowsForDay(dayOfWeek);
    if (!minuteWindows.length) return null;

    for (const preset of PRESETS) {
      const presetStart = toMinutes(preset.start);
      const presetEnd = toMinutes(preset.end);
      if (presetStart === null || presetEnd === null) continue;

      const fitWindow = minuteWindows.find(
        (window) => presetStart >= window.start && presetEnd <= window.end,
      );

      if (fitWindow) {
        return {
          day_of_week: dayOfWeek,
          start_time: preset.start,
          end_time: preset.end,
        };
      }
    }

    const firstWindow = minuteWindows[0];
    const defaultDuration = 4 * 60;
    const end = Math.min(firstWindow.end, firstWindow.start + defaultDuration);

    if (end <= firstWindow.start) return null;

    return {
      day_of_week: dayOfWeek,
      start_time: toTimeString(firstWindow.start),
      end_time: toTimeString(end),
    };
  };

  const addShift = (dayOfWeek: number, preset: TimePreset = PRESETS[0]) => {
    const candidate = {
      day_of_week: dayOfWeek,
      start_time: preset.start,
      end_time: preset.end,
    };
    if (!validateShift(candidate)) return;
    setShifts((prev) => sortShifts([...prev, candidate]));
  };

  const addDefaultShiftForDay = (dayOfWeek: number) => {
    const candidate = buildDefaultShiftForDay(dayOfWeek);
    if (!candidate) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("shifts.reg_error_day_unavailable", {
          defaultValue:
            "Ngày này không có khung giờ mở cửa hợp lệ để đăng ký ca.",
        }),
      });
      return;
    }

    if (!validateShift(candidate)) return;
    setShifts((prev) => sortShifts([...prev, candidate]));
  };

  const toggleDaySelection = (dayOfWeek: number, isSelected: boolean) => {
    if (isSelected) {
      setShifts((prev) =>
        prev.filter((shift) => shift.day_of_week !== dayOfWeek),
      );
      return;
    }

    addDefaultShiftForDay(dayOfWeek);
  };

  const removeShift = (index: number) => {
    setShifts((prev) => prev.filter((_, itemIndex) => itemIndex !== index));
  };

  const openTimePicker = (shiftIndex: number, type: "start" | "end") => {
    const value =
      type === "start"
        ? shifts[shiftIndex].start_time
        : shifts[shiftIndex].end_time;
    const [hours, minutes] = value.split(":").map(Number);
    const date = new Date();
    date.setHours(hours, minutes, 0, 0);
    setTempTime(date);
    setEditingShiftIndex(shiftIndex);
    setEditingTimeType(type);
  };

  const onTimeChange = (_event: any, selectedDate?: Date) => {
    if (!visible) return;
    if (Platform.OS === "android" && _event?.type === "dismissed") {
      setEditingTimeType(null);
      return;
    }
    if (Platform.OS === "android") setEditingTimeType(null);
    if (!selectedDate || editingShiftIndex === null || !editingTimeType) return;

    const nextTime = `${selectedDate.toLocaleTimeString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    })}:00`;
    const nextShift = { ...shifts[editingShiftIndex] };
    if (editingTimeType === "start") {
      nextShift.start_time = nextTime;

      const newStartMin = toMinutes(nextTime);
      const currentStartMin = toMinutes(shifts[editingShiftIndex].start_time);
      const currentEndMin = toMinutes(shifts[editingShiftIndex].end_time);
      const currentDuration =
        currentStartMin !== null &&
        currentEndMin !== null &&
        currentEndMin > currentStartMin
          ? currentEndMin - currentStartMin
          : MIN_SHIFT_MINUTES;

      if (newStartMin !== null) {
        const dayWindows = getEffectiveMinuteWindowsForDay(
          nextShift.day_of_week,
        );
        const currentWindow = dayWindows.find(
          (window) => newStartMin >= window.start && newStartMin < window.end,
        );

        if (currentWindow) {
          const desiredEnd = newStartMin + currentDuration;
          const minEnd = newStartMin + MIN_SHIFT_MINUTES;
          const adjustedEnd = Math.min(
            currentWindow.end,
            Math.max(minEnd, desiredEnd),
          );

          if (adjustedEnd > newStartMin) {
            const adjustedEndTime = toTimeString(adjustedEnd);
            if (adjustedEndTime !== nextShift.end_time) {
              setAutoAdjustHint(
                t("shifts.reg_auto_adjust_end_hint", {
                  defaultValue:
                    "Đã tự điều chỉnh giờ kết thúc để phù hợp khung giờ mở cửa.",
                }),
              );
            }
            nextShift.end_time = adjustedEndTime;
          }
        }
      }
    } else {
      nextShift.end_time = nextTime;
      setAutoAdjustHint(null);
    }

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
    setAutoAdjustHint(null);
    setValidationHint(null);
  };

  const showBlockingMessage = async (
    message: string,
    title?: string,
    type: "info" | "warning" | "danger" = "info",
  ) => {
    await confirm({
      type,
      title: title || t("common.error"),
      message,
      confirmText: t("common.done"),
      showCancel: false,
    });
  };

  const handleSubmit = async () => {
    if (!shifts.length) {
      await showBlockingMessage(
        t("shifts.registration.labels.draft_empty_desc"),
      );
      return;
    }
    if (submissionShifts.length < 3 || submissionShifts.length > 21) {
      await showBlockingMessage(t("shifts.reg_error_min_shifts"));
      return;
    }
    if (shifts.some((shift) => isPastDay(shift.day_of_week))) {
      await showBlockingMessage(
        t("shifts.reg_error_past_day_desc", {
          defaultValue: t("shifts.reg_error_past_day"),
        }),
      );
      return;
    }
    if (isChangeRequestMode && !changeReason.trim()) {
      await showBlockingMessage(t("shifts.reg_error_reason_required"));
      return;
    }

    const payload: {
      week_start_date: string;
      shifts: CreateShiftRequest[];
      editable_submission_id?: string;
      previous_submission_id?: string;
      change_reason?: string;
    } = { week_start_date: weekStartStr, shifts: submissionShifts };

    if (editableSubmission) {
      payload.editable_submission_id = editableSubmission.id;
    } else if (approvedSubmission) {
      payload.previous_submission_id = approvedSubmission.id;
      payload.change_reason = changeReason.trim();
    }

    const confirmed = await confirm({
      type: "warning",
      title: t("shifts.reg_title"),
      message: t("shifts.reg_toast_confirm_msg", {
        defaultValue: `Bạn sẽ gửi ${submissionShifts.length} ca (${submittedTotalHours.toFixed(1)} giờ) cho ${weekRangeText.toLowerCase()}.`,
        count: submissionShifts.length,
        hours: submittedTotalHours.toFixed(1),
        week: weekRangeText.toLowerCase(),
        weekStart: formatShortDate(weekStart, t),
      }),
      confirmText: isEditingExistingSubmission
        ? t("common.save")
        : isChangeRequestMode
          ? t("shifts.reg_toast_success_change_request")
          : t("common.confirm"),
      cancelText: t("common.cancel"),
    });

    if (confirmed) {
      submitMutation.mutate(payload);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.safeArea} edges={["top", "left", "right"]}>
        <KeyboardAvoidingView
          style={styles.container}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <View style={styles.header}>
            <TouchableOpacity onPress={onClose} style={styles.iconButton}>
              <MaterialIcons
                name="close"
                size={24}
                color={GUIDE_COLORS.textPrimary}
              />
            </TouchableOpacity>
            <Text style={styles.title}>
              {isEditingExistingSubmission
                ? t("shifts.registration.update_title")
                : isChangeRequestMode
                  ? t("shifts.reg_adjust_title")
                  : t("shifts.reg_title")}
            </Text>
            <View style={styles.iconButton} />
          </View>

          <View style={styles.weekSelector}>
            <TouchableOpacity
              onPress={() => changeWeek(-1)}
              style={styles.weekNavButton}
            >
              <MaterialIcons
                name="chevron-left"
                size={24}
                color={GUIDE_COLORS.textSecondary}
              />
            </TouchableOpacity>
            <View style={styles.weekInfo}>
              <Text style={styles.weekEyebrow}>{t("common.sortBy")}</Text>
              <Text style={styles.weekText}>{weekRangeText}</Text>
            </View>
            <TouchableOpacity
              onPress={() => changeWeek(1)}
              style={styles.weekNavButton}
            >
              <MaterialIcons
                name="chevron-right"
                size={24}
                color={GUIDE_COLORS.textSecondary}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.content}
            contentContainerStyle={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.summaryCard}>
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryValue}>
                  {Object.keys(shiftsByDay).length}
                </Text>
                <Text style={styles.summaryLabel}>
                  {t("shifts.reg_label_days_selected")}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryValue}>{shifts.length}</Text>
                <Text style={styles.summaryLabel}>
                  {t("shifts.reg_label_editing")}
                </Text>
              </View>
              <View style={styles.summaryDivider} />
              <View style={styles.summaryBlock}>
                <Text style={styles.summaryValue}>{totalHours.toFixed(1)}</Text>
                <Text style={styles.summaryLabel}>
                  {t("shifts.summary_total_hours")}
                </Text>
              </View>
            </View>

            {isExistingLoading ? (
              <View style={styles.noticeCard}>
                <ActivityIndicator color={GUIDE_COLORS.primary} />
                <Text style={styles.noticeText}>{t("common.loading")}</Text>
              </View>
            ) : referenceSubmission ? (
              <View
                style={[
                  styles.referenceCard,
                  {
                    backgroundColor: statusConfig.bg,
                    borderColor: statusConfig.border,
                  },
                ]}
              >
                <View style={styles.referenceHeader}>
                  <View style={styles.referenceTitleRow}>
                    <MaterialIcons
                      name={statusConfig.icon}
                      size={18}
                      color={statusConfig.color}
                    />
                    <Text
                      style={[
                        styles.referenceTitle,
                        { color: statusConfig.color },
                      ]}
                    >
                      {statusConfig.title}
                    </Text>
                  </View>
                  <Text
                    style={[
                      styles.referenceMeta,
                      { color: statusConfig.color },
                    ]}
                  >
                    {referenceSubmission.shifts?.length || 0}{" "}
                    {t("shifts.calendar_shift_count")}
                  </Text>
                </View>

                {referenceSubmission.rejection_reason ? (
                  <Text
                    style={[
                      styles.referenceReason,
                      { color: statusConfig.color },
                    ]}
                  >
                    {t("shifts.reg_label_reason")}:{" "}
                    {referenceSubmission.rejection_reason}
                  </Text>
                ) : null}

                {(referenceSubmission.shifts ?? []).map((shift) => (
                  <View key={shift.id} style={styles.referenceRow}>
                    <Text style={styles.referenceRowDay}>
                      {getDayLabel(shift.day_of_week)}
                    </Text>
                    <Text style={styles.referenceRowTime}>
                      {formatTime(shift.start_time)} -{" "}
                      {formatTime(shift.end_time)}
                    </Text>
                  </View>
                ))}

                {editableSubmission?.status === "pending" ? (
                  <Text style={styles.referenceHint}>
                    {t("shifts.reg_label_pending_notice")}
                  </Text>
                ) : editableSubmission?.status === "rejected" ? (
                  <Text style={styles.referenceHint}>
                    {t("shifts.reg_label_rejected_notice")}
                  </Text>
                ) : null}
              </View>
            ) : (
              <View style={styles.noticeCard}>
                <MaterialIcons
                  name="info-outline"
                  size={18}
                  color={GUIDE_COLORS.textSecondary}
                />
                <Text style={styles.noticeText}>
                  {t("shifts.reg_label_existing_notice")}
                </Text>
              </View>
            )}

            {shifts.length === 0 ? (
              <View style={styles.emptyState}>
                <View style={styles.emptyIcon}>
                  <MaterialIcons
                    name="event-note"
                    size={34}
                    color={GUIDE_COLORS.primary}
                  />
                </View>
                <Text style={styles.emptyTitle}>
                  {t("shifts.reg_label_draft_empty")}
                </Text>
                <Text style={styles.emptyDescription}>
                  {t("shifts.reg_label_draft_empty_desc")}
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
                        {t("shifts.reg_label_draft_items", {
                          count: dayShifts.length,
                        })}
                        {referenceShifts.length
                          ? ` • ${t("shifts.summary_total", { count: referenceShifts.length })}`
                          : ""}
                      </Text>
                    </View>

                    {referenceShifts.length ? (
                      <View style={styles.inlineReferenceWrap}>
                        {referenceShifts.map((shift) => (
                          <View
                            key={shift.id}
                            style={styles.inlineReferenceChip}
                          >
                            <Text style={styles.inlineReferenceText}>
                              {formatTime(shift.start_time)} -{" "}
                              {formatTime(shift.end_time)}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : null}

                    {dayShifts.map((shift, localIndex) => {
                      const globalIndex = shifts.findIndex(
                        (item, itemIndex) => {
                          if (itemIndex < localIndex) return false;
                          return (
                            item.day_of_week === shift.day_of_week &&
                            item.start_time === shift.start_time &&
                            item.end_time === shift.end_time
                          );
                        },
                      );

                      return (
                        <View
                          key={`${day}-${shift.start_time}-${shift.end_time}-${localIndex}`}
                          style={styles.shiftCard}
                        >
                          <View style={styles.shiftCardHeader}>
                            <Text style={styles.shiftCardLabel}>
                              {t("shifts.reg_label_shift_label", {
                                index: localIndex + 1,
                              })}
                            </Text>
                            <Text style={styles.shiftCardHours}>
                              {t("shifts.summary_hours_count", {
                                count: Number(hoursOf(shift).toFixed(1)),
                              })}
                            </Text>
                          </View>

                          <View style={styles.timeRow}>
                            <TouchableOpacity
                              style={styles.timeButton}
                              onPress={() =>
                                openTimePicker(globalIndex, "start")
                              }
                            >
                              <MaterialIcons
                                name="access-time"
                                size={16}
                                color={GUIDE_COLORS.textSecondary}
                              />
                              <Text style={styles.timeValue}>
                                {formatTime(shift.start_time)}
                              </Text>
                            </TouchableOpacity>
                            <MaterialIcons
                              name="arrow-forward"
                              size={18}
                              color={GUIDE_COLORS.gray400}
                            />
                            <TouchableOpacity
                              style={styles.timeButton}
                              onPress={() => openTimePicker(globalIndex, "end")}
                            >
                              <MaterialIcons
                                name="access-time"
                                size={16}
                                color={GUIDE_COLORS.textSecondary}
                              />
                              <Text style={styles.timeValue}>
                                {formatTime(shift.end_time)}
                              </Text>
                            </TouchableOpacity>
                          </View>

                          <TouchableOpacity
                            style={styles.deleteButton}
                            onPress={() => removeShift(globalIndex)}
                          >
                            <MaterialIcons
                              name="delete-outline"
                              size={22}
                              color={GUIDE_COLORS.error}
                            />
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
                            {formatTime(preset.start)} -{" "}
                            {formatTime(preset.end)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                );
              })}

            <TouchableOpacity
              style={styles.addDayButton}
              onPress={() => setShowDayPicker(true)}
            >
              <MaterialIcons
                name="add-circle-outline"
                size={22}
                color={GUIDE_COLORS.primary}
              />
              <Text style={styles.addDayText}>
                {t("shifts.reg_label_add_day")}
              </Text>
            </TouchableOpacity>

            {isChangeRequestMode ? (
              <View style={styles.reasonCard}>
                <Text style={styles.reasonTitle}>
                  {t("shifts.reg_label_reason")}
                </Text>
                <TextInput
                  style={styles.reasonInput}
                  placeholder={t("shifts.reg_placeholder_change_reason")}
                  placeholderTextColor={GUIDE_COLORS.textMuted}
                  multiline
                  value={changeReason}
                  onChangeText={setChangeReason}
                />
              </View>
            ) : null}
          </ScrollView>

          <View
            style={[
              styles.footer,
              { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) + 8 },
            ]}
          >
            <Text style={styles.footerText}>
              {`${shifts.length} ${t("shifts.calendar_shift_count")} • ${t("shifts.summary_hours_count", { count: Number(totalHours.toFixed(1)) })}`}
            </Text>
            {autoAdjustHint ? (
              <Text style={styles.autoAdjustHintText}>{autoAdjustHint}</Text>
            ) : null}
            {validationHint ? (
              <Text style={styles.validationHintText}>{validationHint}</Text>
            ) : null}
            <TouchableOpacity
              style={[
                styles.submitButton,
                shifts.length === 0 && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={shifts.length === 0 || submitMutation.isPending}
            >
              {submitMutation.isPending ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={styles.submitButtonText}>
                  {isEditingExistingSubmission
                    ? t("common.save")
                    : isChangeRequestMode
                      ? t("shifts.reg_toast_success_change_request")
                      : t("common.confirm")}
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
                <Text style={styles.dayPickerTitle}>
                  {t("shifts.reg_label_add_day")}
                </Text>
                <Text style={styles.dayPickerSubtitle}>
                  {t("shifts.reg_label_draft_empty_desc")}
                </Text>
                <View style={styles.dayGrid}>
                  {DAYS.map((day) => {
                    const isUnavailableByWindows =
                      getEffectiveMinuteWindowsForDay(day.value).length === 0;
                    const isDisabled =
                      isPastDay(day.value) || isUnavailableByWindows;
                    const isSelected =
                      !isDisabled && (shiftsByDay[day.value]?.length ?? 0) > 0;
                    return (
                      <TouchableOpacity
                        key={day.value}
                        style={[
                          styles.dayGridItem,
                          isSelected && styles.dayGridItemSelected,
                          isDisabled && styles.dayGridItemDisabled,
                        ]}
                        onPress={() =>
                          toggleDaySelection(day.value, isSelected)
                        }
                        disabled={isDisabled}
                      >
                        <Text
                          style={[
                            styles.dayGridTitle,
                            isSelected && styles.dayGridTextSelected,
                            isDisabled && styles.dayGridTextDisabled,
                          ]}
                        >
                          {day.label}
                        </Text>
                        <Text
                          style={[
                            styles.dayGridDate,
                            isSelected && styles.dayGridTextSelected,
                            isDisabled && styles.dayGridTextDisabled,
                          ]}
                        >
                          {getFormattedDate(day.value)}
                        </Text>
                        <Text
                          style={[
                            styles.dayGridMeta,
                            isSelected && styles.dayGridMetaSelected,
                            isDisabled && styles.dayGridTextDisabled,
                          ]}
                        >
                          {isPastDay(day.value)
                            ? t("shifts.reg_error_past_day")
                            : isUnavailableByWindows
                              ? t("shifts.reg_error_day_unavailable", {
                                  defaultValue: "Không có khung giờ hợp lệ",
                                })
                              : `${t("shifts.reg_label_editing")}: ${shiftsByDay[day.value]?.length ?? 0}`}
                        </Text>
                        {isUnavailableByWindows && !isPastDay(day.value) ? (
                          <Text
                            style={[
                              styles.dayGridMeta,
                              styles.dayGridTextDisabled,
                            ]}
                          >
                            {t("shifts.reg_error_day_unavailable", {
                              defaultValue: "Không có khung giờ hợp lệ",
                            })}
                          </Text>
                        ) : null}
                        <Text
                          style={[
                            styles.dayGridMeta,
                            isSelected && styles.dayGridMetaSelected,
                            isDisabled && styles.dayGridTextDisabled,
                          ]}
                        >
                          {t("shifts.status_approved")}:{" "}
                          {existingByDay[day.value]?.length ?? 0}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.dayPickerClose}
                  onPress={() => setShowDayPicker(false)}
                >
                  <Text style={styles.dayPickerCloseText}>
                    {t("common.close")}
                  </Text>
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
                <Text style={styles.iosToolbarText}>{t("common.done")}</Text>
              </TouchableOpacity>
            </View>
          ) : null}
          <ConfirmModal />
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: GUIDE_COLORS.creamBg },
  container: { flex: 1, backgroundColor: GUIDE_COLORS.creamBg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.lg,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.creamBorder,
  },
  iconButton: { width: 32, alignItems: "center", justifyContent: "center" },
  title: {
    flex: 1,
    textAlign: "center",
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
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
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    ...GUIDE_SHADOWS.sm,
  },
  weekNavButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  weekInfo: { flex: 1, alignItems: "center" },
  weekEyebrow: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  weekText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
    marginTop: 2,
  },
  content: { flex: 1 },
  contentContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.md,
  },
  summaryCard: {
    flexDirection: "row",
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  summaryBlock: { flex: 1, alignItems: "center" },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: GUIDE_COLORS.creamInk,
  },
  summaryLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
  },
  summaryDivider: { width: 1, backgroundColor: GUIDE_COLORS.creamBorder },
  noticeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
  },
  noticeText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    lineHeight: 20,
  },
  referenceCard: {
    borderWidth: 1,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  referenceHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: GUIDE_SPACING.sm,
  },
  referenceTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    flex: 1,
  },
  referenceTitle: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
  },
  referenceMeta: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, fontWeight: "700" },
  referenceReason: { fontSize: GUIDE_TYPOGRAPHY.fontSizeSM, lineHeight: 20 },
  referenceRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
  },
  referenceRowDay: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  referenceRowTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
  },
  referenceHint: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
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
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
    marginBottom: GUIDE_SPACING.xs,
  },
  emptyDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    lineHeight: 20,
    textAlign: "center",
  },
  dayCard: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
    ...GUIDE_SHADOWS.sm,
  },
  dayHeader: { gap: 4 },
  dayTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  daySubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
  },
  inlineReferenceWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.xs,
  },
  inlineReferenceChip: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.creamElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
  },
  inlineReferenceText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    fontWeight: "600",
  },
  shiftCard: {
    position: "relative",
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    padding: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.creamElevated,
    gap: GUIDE_SPACING.sm,
  },
  shiftCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingRight: 28,
  },
  shiftCardLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  shiftCardHours: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  timeButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    paddingVertical: 10,
  },
  timeValue: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  deleteButton: {
    position: "absolute",
    top: GUIDE_SPACING.sm,
    right: GUIDE_SPACING.sm,
    padding: 2,
  },
  presetRow: { flexDirection: "row", flexWrap: "wrap", gap: GUIDE_SPACING.xs },
  presetChip: {
    minWidth: "31%",
    flexGrow: 1,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryLight,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
  },
  presetTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  presetTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    marginTop: 2,
  },
  addDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.primary,
    borderStyle: "dashed",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.creamPanel,
  },
  addDayText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.primary,
  },
  reasonCard: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  reasonTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
    marginBottom: GUIDE_SPACING.xs,
  },
  reasonInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: GUIDE_COLORS.creamElevated,
    padding: GUIDE_SPACING.md,
    textAlignVertical: "top",
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamInk,
  },
  footer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.creamBorder,
    ...GUIDE_SHADOWS.md,
  },
  footerText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
    marginBottom: GUIDE_SPACING.md,
  },
  autoAdjustHintText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textSecondary,
    marginBottom: GUIDE_SPACING.sm,
  },
  validationHintText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: "600",
    color: GUIDE_COLORS.error,
    marginBottom: GUIDE_SPACING.sm,
  },
  submitButton: {
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: 16,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: "center",
  },
  submitButtonDisabled: { backgroundColor: GUIDE_COLORS.gray300 },
  submitButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: "#FFF",
  },
  overlay: {
    flex: 1,
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.48)",
    padding: GUIDE_SPACING.lg,
  },
  dayPickerCard: {
    backgroundColor: GUIDE_COLORS.creamPanel,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
  },
  dayPickerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
    textAlign: "center",
  },
  dayPickerSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.creamLabel,
    lineHeight: 20,
    textAlign: "center",
    marginTop: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.md,
  },
  dayGrid: { flexDirection: "row", flexWrap: "wrap", gap: GUIDE_SPACING.sm },
  dayGridItem: {
    width: "48%",
    borderWidth: 1,
    borderColor: GUIDE_COLORS.creamBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: GUIDE_COLORS.creamElevated,
    padding: GUIDE_SPACING.md,
  },
  dayGridItemSelected: {
    backgroundColor: "#FFF9E8",
    borderColor: GUIDE_COLORS.primary,
    borderWidth: 1.5,
  },
  dayGridItemDisabled: {
    backgroundColor: GUIDE_COLORS.gray100,
    borderColor: GUIDE_COLORS.gray300,
    opacity: 0.7,
  },
  dayGridTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.creamInk,
  },
  dayGridDate: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    marginTop: 2,
  },
  dayGridMeta: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.creamLabel,
    marginTop: 4,
  },
  dayGridTextSelected: { color: GUIDE_COLORS.creamInk },
  dayGridMetaSelected: { color: GUIDE_COLORS.creamInk, fontWeight: "600" },
  dayGridTextDisabled: { color: GUIDE_COLORS.creamMuted },
  dayPickerClose: { alignItems: "center", paddingTop: GUIDE_SPACING.md },
  dayPickerCloseText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "600",
    color: GUIDE_COLORS.creamLabel,
  },
  iosToolbar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "flex-end",
    backgroundColor: GUIDE_COLORS.surface,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
    padding: GUIDE_SPACING.sm,
  },
  iosToolbarText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: GUIDE_COLORS.primary,
  },
});

export default ShiftRegistrationModal;
