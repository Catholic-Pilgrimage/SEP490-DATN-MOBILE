import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  ActivityIndicator,
  ImageBackground,
  Keyboard,
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
import { toastConfig } from "../../../../../config/toast.config";
import { COLORS } from "../../../../../constants/theme.constants";
import type {
  DayEvent,
  ScheduleInsight,
  SuggestedArrival,
} from "../../utils/siteScheduleHelper";
import {
  formatDurationLocalized,
  getEventPastHalfWindowWarning,
} from "../../utils/siteScheduleHelper";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeInputModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: string, options?: any) => string;
  styles: any;
  modalTitle?: string;
  confirmButtonLabel?: string;
  selectedDay: number;
  selectedDayDateLabel?: string;
  originalSelectedDay?: number;
  calculatingRoute: boolean;
  crossDayWarning: string | null;
  crossDaysAdded?: number;
  estimatedTime: string;
  onApplySuggestedTime?: (
    time: string,
    source?: {
      priority: "event" | "mass" | "opening" | "default";
      eventId?: string;
    },
  ) => void;
  restDuration: number;
  setRestDuration: (v: number) => void;
  note: string;
  setNote: (v: string) => void;
  openTimePicker: () => void;
  formatDuration: (v: number) => string;
  addingItem: boolean;
  selectedSiteId: string;
  onConfirmAdd: () => void;

  // ── Travel context ──
  previousSiteName?: string;
  previousSiteId?: string;
  departureTimeFromPrev?: string;
  travelMinutes?: number;
  travelDistanceKm?: number;
  fastestArrival?: string;
  fastestArrivalDayOffset?: number;
  sourceDayNumber?: number;
  newSiteName?: string;
  newSiteAddress?: string;
  newSitePatronSaint?: string;
  newSiteCoverImage?: string;

  // ── Schedule context ──
  openTime?: string;
  closeTime?: string;
  massTimesForDay?: string[];
  eventsForDay?: DayEvent[];
  eventStartTime?: string;
  eventName?: string;
  eventEndTime?: string;

  // ── Smart insight (pre-computed) ──
  insight?: ScheduleInsight | null;
  suggestedTime?: SuggestedArrival | null;
  onMoveToPreviousDay?: (dayNumber: number) => void;
  onMoveToNextDay?: (dayNumber: number) => void;
  onMoveBackToOriginalDay?: (dayNumber: number) => void;

  // ── Cross-day flag ──
  isCrossDayTravel?: boolean;

  // ── Event-locking ──
  /** true when item is bound to a specific event → time picker disabled */
  isEventLocked?: boolean;
  /** Pre-event buffer minutes (15/30/45/60) */
  bufferMinutes?: number;
  /** Duration of the selected event (minutes) — used as rest_duration floor */
  eventDurationMinutes?: number | null;
  setBufferMinutes?: (minutes: number) => void;
  /** Remove event binding → switch to normal site mode */
  onUnlockEvent?: () => void;

  /** Selected transportation mode for accurate icon display */
  transportationMode?: string;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TimeInputModal(props: TimeInputModalProps) {
  const {
    visible,
    onClose,
    t,
    styles,
    modalTitle,
    confirmButtonLabel,
    selectedDay,
    selectedDayDateLabel,
    originalSelectedDay,
    calculatingRoute,
    crossDayWarning,
    crossDaysAdded = 0,
    estimatedTime,
    onApplySuggestedTime,
    restDuration,
    setRestDuration,
    note,
    setNote,
    openTimePicker,
    formatDuration,
    addingItem,
    selectedSiteId,
    onConfirmAdd,
    previousSiteName,
    previousSiteId,
    departureTimeFromPrev,
    travelMinutes,
    travelDistanceKm,
    fastestArrival,
    fastestArrivalDayOffset,
    sourceDayNumber,
    isCrossDayTravel,
    newSiteName,
    newSiteAddress,
    newSitePatronSaint,
    newSiteCoverImage,
    openTime,
    closeTime,
    massTimesForDay = [],
    eventsForDay = [],
    eventStartTime,
    eventName,
    eventEndTime,
    insight,
    suggestedTime,
    onMoveToPreviousDay,
    onMoveToNextDay,
    onMoveBackToOriginalDay,
    isEventLocked,
    bufferMinutes = 30,
    eventDurationMinutes,
    setBufferMinutes,
    onUnlockEvent,
    transportationMode,
  } = props;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const travelCardYRef = useRef(0);
  const previousEstimatedRef = useRef(estimatedTime);
  const previousBufferRef = useRef(bufferMinutes);
  const previousVisibleRef = useRef(visible);
  const [pastHalfEventModal, setPastHalfEventModal] = useState(false);
  const [pastHalfRemainMins, setPastHalfRemainMins] = useState(0);

  const transportIconName = useMemo(() => {
    switch (transportationMode) {
      case "bus":
        return "bus";
      case "motorbike":
        return "bicycle";
      case "walking":
        return "walk";
      case "car":
      default:
        return "car";
    }
  }, [transportationMode]);

  const tryConfirmAdd = useCallback(() => {
    if (!eventStartTime || !eventEndTime) {
      onConfirmAdd();
      return;
    }
    const warn = getEventPastHalfWindowWarning(
      estimatedTime,
      eventStartTime,
      eventEndTime,
    );
    if (warn) {
      setPastHalfRemainMins(warn.remainingMinutes);
      setPastHalfEventModal(true);
      return;
    }
    onConfirmAdd();
  }, [estimatedTime, eventStartTime, eventEndTime, onConfirmAdd]);

  const confirmAfterPastHalfWarning = useCallback(() => {
    setPastHalfEventModal(false);
    onConfirmAdd();
  }, [onConfirmAdd]);

  const parseTimeToMinutes = (time: string | undefined): number | null => {
    if (!time) return null;
    const normalized = time.trim();
    const parts = normalized.split(":");
    if (parts.length < 2) return null;
    const hh = Number(parts[0]);
    const mm = Number(parts[1]);
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
    return hh * 60 + mm;
  };

  const hasTravelInfo = !!(
    departureTimeFromPrev &&
    travelMinutes &&
    travelMinutes > 0
  );
  const isPreviousStopSameDay =
    typeof sourceDayNumber === "number"
      ? sourceDayNumber === selectedDay
      : true;
  const isSameAsPreviousSite =
    !!selectedSiteId &&
    !!previousSiteId &&
    isPreviousStopSameDay &&
    String(previousSiteId) === String(selectedSiteId);
  const earliestArrivalDisplay = useMemo(() => {
    if (isCrossDayTravel && fastestArrival === "00:00") {
      return t("planner.arrivedFromPreviousDay", {
        defaultValue: "Đã có thể đến từ ngày trước",
      });
    }

    if (!fastestArrival) return "—";

    if ((fastestArrivalDayOffset || 0) <= 0) {
      return fastestArrival;
    }

    if (fastestArrivalDayOffset === 1) {
      return t("planner.fastestArrivalNextDay", {
        defaultValue: "{{time}} (ngày sau)",
        time: fastestArrival,
      });
    }

    return t("planner.fastestArrivalOffsetDays", {
      defaultValue: "{{time}} (+{{days}} ngày)",
      time: fastestArrival,
      days: fastestArrivalDayOffset,
    });
  }, [fastestArrival, fastestArrivalDayOffset, isCrossDayTravel, t]);
  const canMoveToPreviousDay =
    !!onMoveToPreviousDay &&
    !!isCrossDayTravel &&
    typeof sourceDayNumber === "number" &&
    sourceDayNumber >= 1 &&
    sourceDayNumber < selectedDay;

  const canReachSourceDayWithoutOverflow = useMemo(() => {
    if (!canMoveToPreviousDay) return false;
    const departureMin = parseTimeToMinutes(departureTimeFromPrev);
    if (departureMin === null || !travelMinutes) return true;
    return departureMin + travelMinutes < 24 * 60;
  }, [canMoveToPreviousDay, departureTimeFromPrev, travelMinutes]);

  const showMoveToPreviousDayButton =
    canMoveToPreviousDay && canReachSourceDayWithoutOverflow;
  const canMoveBackToOriginalDay =
    !!onMoveBackToOriginalDay &&
    typeof originalSelectedDay === "number" &&
    originalSelectedDay > selectedDay;
  const canMoveToNextDay =
    !!onMoveToNextDay &&
    (crossDaysAdded > 0 || (fastestArrivalDayOffset || 0) > 0);
  const nextSuggestedDay =
    selectedDay + Math.max(crossDaysAdded, fastestArrivalDayOffset || 0, 1);

  const applyWindowConstraints = useMemo(() => {
    const hasEventOnSelectedDay =
      !!eventStartTime ||
      eventsForDay.some((eventItem) => !!eventItem.startTime);

    return (candidateMin: number): number | null => {
      let normalized = candidateMin;
      const minArrival = parseTimeToMinutes(fastestArrival) ?? 0;
      normalized = Math.max(normalized, minArrival);

      if (hasEventOnSelectedDay) {
        return normalized;
      }

      const openMin = parseTimeToMinutes(openTime);
      const closeMin = parseTimeToMinutes(closeTime);
      if (openMin === null || closeMin === null) {
        return normalized;
      }

      if (closeMin >= openMin) {
        if (normalized < openMin) normalized = openMin;
        if (normalized > closeMin) return null;
        return normalized;
      }

      // Overnight window (e.g. 18:00 -> 02:00)
      if (normalized >= openMin || normalized <= closeMin) {
        return normalized;
      }

      return normalized < openMin ? openMin : null;
    };
  }, [closeTime, eventStartTime, eventsForDay, fastestArrival, openTime]);

  const showArriveFromPreviousDayNotice =
    !!isCrossDayTravel &&
    fastestArrival === "00:00" &&
    Number(fastestArrivalDayOffset || 0) <= 0;

  /** Sàn 0: không giới hạn trên; gợi ý mặc định từ `suggestRestDurationForPlannedStop` (parent/hook) khi mới chọn. */
  const minRestDuration = 0;
  const REST_MAX_SOFT = 1_000_000;

  /** Tăng/giảm 15 phút; chạm giữa để mở modal nhập giờ/phút. */
  const REST_QUICK_STEP = 15;
  const [restHmModalVisible, setRestHmModalVisible] = useState(false);
  const [restDraftH, setRestDraftH] = useState("0");
  const [restDraftM, setRestDraftM] = useState("0");

  const openRestHmModal = useCallback(() => {
    Keyboard.dismiss();
    setRestDraftH(String(Math.floor(restDuration / 60)));
    setRestDraftM(String(Math.min(59, restDuration % 60)));
    setRestHmModalVisible(true);
  }, [restDuration]);

  const applyRestFromHmModal = useCallback(() => {
    const rawH = restDraftH.replace(/[^\d]/g, "");
    const rawM = restDraftM.replace(/[^\d]/g, "");
    let h = Math.max(0, parseInt(rawH || "0", 10) || 0);
    let m = Math.max(0, parseInt(rawM || "0", 10) || 0);
    if (m > 59) {
      h += Math.floor(m / 60);
      m = m % 60;
    }
    const total = h * 60 + m;
    setRestDuration(Math.max(minRestDuration, Math.min(REST_MAX_SOFT, total)));
    setRestHmModalVisible(false);
  }, [minRestDuration, restDraftH, restDraftM, setRestDuration]);

  useEffect(() => {
    if (!visible) {
      setRestHmModalVisible(false);
      setPastHalfEventModal(false);
    }
  }, [visible]);

  const nudgeRest = (delta: number) => {
    Keyboard.dismiss();
    setRestDuration(
      Math.max(minRestDuration, Math.min(REST_MAX_SOFT, restDuration + delta)),
    );
  };

  const smartSuggestions = useMemo(() => {
    const options: {
      key: string;
      priority: "event" | "mass" | "opening";
      time: string;
      sourceText: string;
      eventId?: string;
      eventTitle?: string;
      eventStartTime?: string;
      eventEndTime?: string;
      baseTime?: string;
    }[] = [];

    const eventCandidates: {
      id: string;
      name?: string;
      start: string;
      end?: string;
    }[] = [
      ...eventsForDay
        .filter((eventItem) => !!eventItem.startTime)
        .map((eventItem) => ({
          id: String(
            eventItem.id ||
              `${eventItem.name || "event"}-${eventItem.startTime}`,
          ),
          name: eventItem.name,
          start: eventItem.startTime!,
          end: eventItem.endTime,
        })),
      ...(eventStartTime
        ? [
            {
              id: `selected-${eventName || "event"}-${eventStartTime}`,
              name: eventName,
              start: eventStartTime,
              end: undefined,
            },
          ]
        : []),
    ];

    const uniqueEventCandidates = eventCandidates.filter(
      (candidate, index, arr) =>
        arr.findIndex(
          (item) =>
            item.id === candidate.id ||
            (item.start === candidate.start && item.name === candidate.name),
        ) === index,
    );

    const eventArrivals = uniqueEventCandidates
      .map((candidate) => {
        const eventMin = parseTimeToMinutes(candidate.start);
        if (eventMin === null) return null;
        const arrivalMin = applyWindowConstraints(eventMin - 30);
        if (arrivalMin === null) return null;
        return {
          ...candidate,
          arrivalMin,
        };
      })
      .filter(
        (
          candidate,
        ): candidate is {
          id: string;
          name?: string;
          start: string;
          end?: string;
          arrivalMin: number;
        } => candidate !== null,
      )
      .sort((a, b) => a.arrivalMin - b.arrivalMin);

    eventArrivals.forEach((eventArrival, index) => {
      const eventArrivalTime =
        String(Math.floor(eventArrival.arrivalMin / 60)).padStart(2, "0") +
        ":" +
        String(eventArrival.arrivalMin % 60).padStart(2, "0");

      if (options.some((option) => option.time === eventArrivalTime)) {
        return;
      }

      options.push({
        key: `event-${eventArrival.id}-${index}`,
        priority: "event",
        time: eventArrivalTime,
        sourceText: t("planner.suggestionSourceEventDetailed", {
          defaultValue: "Theo sự kiện {{name}} lúc {{time}} tại địa điểm.",
          name:
            eventArrival.name ||
            t("planner.event", { defaultValue: "Sự kiện" }),
          time: eventArrival.start,
        }),
        eventId: eventArrival.id,
        eventTitle:
          eventArrival.name || t("planner.event", { defaultValue: "Sự kiện" }),
        eventStartTime: eventArrival.start,
        eventEndTime: eventArrival.end,
        baseTime: eventArrival.start,
      });
    });

    const massCandidates = Array.from(new Set(massTimesForDay))
      .map((massTime) => {
        const massMin = parseTimeToMinutes(massTime);
        if (massMin === null) return null;
        const arrivalMin = applyWindowConstraints(massMin - 30);
        if (arrivalMin === null) return null;
        return { massTime, arrivalMin };
      })
      .filter(
        (candidate): candidate is { massTime: string; arrivalMin: number } =>
          !!candidate,
      )
      .sort((a, b) => a.arrivalMin - b.arrivalMin);

    massCandidates.forEach((massCandidate, index) => {
      const massTime =
        String(Math.floor(massCandidate.arrivalMin / 60)).padStart(2, "0") +
        ":" +
        String(massCandidate.arrivalMin % 60).padStart(2, "0");

      if (!options.some((option) => option.time === massTime)) {
        options.push({
          key: `mass-${massCandidate.massTime}-${index}`,
          priority: "mass",
          time: massTime,
          sourceText: t("planner.suggestionSourceMassDetailed", {
            defaultValue: "Theo giờ lễ thường ngày lúc {{time}} tại địa điểm.",
            time: massCandidate.massTime,
          }),
          baseTime: massCandidate.massTime,
        });
      }
    });

    if (openTime) {
      const openMin = parseTimeToMinutes(openTime);
      if (openMin !== null) {
        const openingCandidate = applyWindowConstraints(openMin + 15);
        if (openingCandidate !== null) {
          const openingTime =
            String(Math.floor(openingCandidate / 60)).padStart(2, "0") +
            ":" +
            String(openingCandidate % 60).padStart(2, "0");

          if (!options.some((option) => option.time === openingTime)) {
            options.push({
              key: `opening-${openTime}`,
              priority: "opening",
              time: openingTime,
              sourceText: t("planner.suggestionSourceOpeningDetailed", {
                defaultValue: "Theo giờ mở cửa của địa điểm từ {{time}}.",
                time: openTime,
              }),
              baseTime: openTime,
            });
          }
        }
      }
    }

    return options;
  }, [
    applyWindowConstraints,
    eventName,
    eventStartTime,
    eventsForDay,
    massTimesForDay,
    openTime,
    t,
  ]);

  const applySuggestedTime = (
    time: string,
    source?: {
      priority: "event" | "mass" | "opening" | "default";
      eventId?: string;
    },
  ) => {
    onApplySuggestedTime?.(time, source);
    Toast.show({
      type: "success",
      text1: t("planner.suggestedTimeAppliedTitle", {
        defaultValue: "Đã áp dụng giờ gợi ý",
      }),
      text2: t("planner.suggestedTimeAppliedMessage", {
        defaultValue: "Giờ dự kiến đã được đặt thành {{time}}.",
        time,
      }),
      position: "top",
      topOffset: 48,
    });
  };

  const showSuggestButton = useMemo(() => {
    if (isEventLocked) return false;
    if (smartSuggestions.length > 0) return true;
    if (!suggestedTime) return false;
    return (
      suggestedTime.time !== estimatedTime &&
      suggestedTime.priority !== "default"
    );
  }, [estimatedTime, isEventLocked, smartSuggestions, suggestedTime]);

  const groupedSuggestions = useMemo(() => {
    return {
      event: smartSuggestions.filter((item) => item.priority === "event"),
      mass: smartSuggestions.filter((item) => item.priority === "mass"),
      opening: smartSuggestions.filter((item) => item.priority === "opening"),
    };
  }, [smartSuggestions]);

  const suggestionDayLabel = useMemo(() => {
    if (selectedDayDateLabel && selectedDayDateLabel.trim()) {
      return selectedDayDateLabel;
    }

    return t("planner.dayNumberOnly", {
      defaultValue: "Ngày {{day}}",
      day: selectedDay,
    });
  }, [selectedDay, selectedDayDateLabel, t]);

  const heroDayLabel = useMemo(() => {
    if (selectedDayDateLabel && selectedDayDateLabel.trim()) {
      return t("planner.addLocationDayDate", {
        defaultValue: "Thêm ngày {{day}} - {{date}}",
        day: selectedDay,
        date: selectedDayDateLabel,
      });
    }

    return t("planner.addLocationDay", { day: selectedDay });
  }, [selectedDay, selectedDayDateLabel, t]);

  const openingHoursLine = useMemo(() => {
    if (!openTime && !closeTime) {
      return t("planner.openingHoursUnknown", {
        defaultValue: "Chưa có giờ mở cửa",
      });
    }

    return t("planner.openingHoursInline", {
      defaultValue: "{{open}} - {{close}}",
      open: openTime || "—",
      close: closeTime || "—",
    });
  }, [closeTime, openTime, t]);

  // Only block on hard constraints; cross-day is treated as a soft warning.
  const isConfirmBlocked =
    insight?.isBlocking === true || crossDaysAdded > 0 || isSameAsPreviousSite;

  /** Chỉ dùng buffer "Đến trước" khi giờ đến sớm hơn lúc bắt đầu sự kiện (như ảnh 3) */
  const showEventBufferChips = useMemo(() => {
    if (!isEventLocked || !eventStartTime) return false;
    const a = parseTimeToMinutes(estimatedTime);
    const s = parseTimeToMinutes(eventStartTime);
    if (a == null || s == null) return true;
    return a < s;
  }, [isEventLocked, eventStartTime, estimatedTime]);

  /** Khi user đang chọn "Đến trước" theo sự kiện — ẩn gợi chuyển ngày để tập trung, tránh mâu thuẫn với lịch sự kiện. */
  const hideCrossDayPromoForEventBuffer = isEventLocked && showEventBufferChips;

  const shouldRenderInsight = useMemo(() => {
    if (!insight) return false;
    if (isEventLocked && !insight.isBlocking) {
      return false;
    }

    const hasEventSuggestion = smartSuggestions.some(
      (suggestion) => suggestion.priority === "event",
    );
    if (
      (insight.type === "event_ok" || insight.type === "event_within") &&
      hasEventSuggestion
    ) {
      return false;
    }

    const positiveInsightTypes = new Set([
      "ideal",
      "buffer",
      "first_stop",
      "event_ok",
      "event_within",
    ]);
    if (crossDayWarning && positiveInsightTypes.has(insight.type)) {
      return false;
    }
    return true;
  }, [crossDayWarning, insight, isEventLocked, smartSuggestions]);

  const insightMessageColor = useMemo(() => {
    if (!insight) return "#6B4E2E";

    if (
      insight.type === "error" ||
      insight.type === "error_closed" ||
      insight.type === "event_unreachable" ||
      insight.type === "early"
    ) {
      return "#7F1D1D";
    }

    if (insight.type === "event_late" && insight.isBlocking) {
      return "#7F1D1D";
    }
    if (insight.type === "event_late" && !insight.isBlocking) {
      return "#7C2D12";
    }

    if (insight.type === "late") {
      return "#7C2D12";
    }

    return "#6B4E2E";
  }, [insight]);

  const insightAppearance = useMemo(() => {
    if (!insight) {
      return {
        backgroundColor: "#FFF3DF",
        borderColor: "#E2C79E",
        titleColor: "#8A5A2B",
      };
    }

    if (
      insight.type === "event_ok" ||
      insight.type === "event_within" ||
      insight.type === "buffer" ||
      insight.type === "first_stop" ||
      insight.type === "ideal"
    ) {
      return {
        backgroundColor: "#FFF6E8",
        borderColor: "#E5C892",
        titleColor: "#8A5A2B",
      };
    }

    if (insight.type === "early") {
      return {
        backgroundColor: "#FEF2F2",
        borderColor: "#EF4444",
        titleColor: "#991B1B",
      };
    }

    return {
      backgroundColor: insight.bgColor,
      borderColor: insight.color,
      titleColor: insight.color,
    };
  }, [insight]);

  // Mỗi lần mở lại modal: reset ref (chỉ khi visible vừa bật) để không gọi scroll ngay lượt sau.
  useEffect(() => {
    if (visible && !previousVisibleRef.current) {
      previousEstimatedRef.current = estimatedTime;
      previousBufferRef.current = bufferMinutes;
    }
    previousVisibleRef.current = visible;
  }, [bufferMinutes, estimatedTime, visible]);

  // Tự cuộn tới thẻ “Di chuyển & lịch trình” khi *giờ dự kiến* thay đổi theo cách hợp lý.
  // Tuyệt đối không tự scroll khi đang chỉnh buffer 15/30/45/60 ở bảng xanh (tránh cảm giác “nhảy”/màn hắn).
  useEffect(() => {
    if (!visible) return;
    if (isEventLocked && showEventBufferChips) {
      previousEstimatedRef.current = estimatedTime;
      previousBufferRef.current = bufferMinutes;
      return;
    }

    const estimatedChanged = previousEstimatedRef.current !== estimatedTime;
    const bufferChanged = previousBufferRef.current !== bufferMinutes;
    const skipScrollForEventBufferRecalc =
      isEventLocked &&
      showEventBufferChips &&
      bufferChanged &&
      estimatedChanged;

    previousEstimatedRef.current = estimatedTime;
    previousBufferRef.current = bufferMinutes;

    if (!estimatedChanged) return;
    if (skipScrollForEventBufferRecalc) return;
    if (!hasTravelInfo && !insight) return;

    const targetY = Math.max(0, travelCardYRef.current - 18);
    if (!targetY) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [
    bufferMinutes,
    estimatedTime,
    hasTravelInfo,
    insight,
    isEventLocked,
    showEventBufferChips,
    visible,
  ]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.modalContainer,
          { paddingTop: Math.max(insets.top, 20), flex: 1 },
        ]}
      >
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>
            {modalTitle || t("planner.setTime")}
          </Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          enabled={Platform.OS === "ios"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            ref={scrollRef}
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            removeClippedSubviews={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode={
              Platform.OS === "ios" ? "interactive" : "on-drag"
            }
          >
            <SiteHeroCard
              dayLabel={heroDayLabel}
              siteName={newSiteName}
              patronSaint={newSitePatronSaint}
              address={newSiteAddress}
              openingHoursLine={openingHoursLine}
              coverImage={newSiteCoverImage}
              t={t}
            />

            <View style={localStyles.timeSetupCard}>
              {/* Khoá theo sự kiện: đặt trên cùng để người dùng thấy cách điều chỉnh (buffer) trước phần còn lại */}
              {isEventLocked && eventStartTime && (
                <View style={localStyles.eventLockedBanner}>
                  <View style={localStyles.eventLockedHeader}>
                    <Ionicons name="lock-closed" size={16} color="#1D4ED8" />
                    <Text style={localStyles.eventLockedTitle}>
                      {t("planner.eventLockedTitle", {
                        defaultValue: "Giờ khoá theo sự kiện",
                      })}
                    </Text>
                  </View>
                  <View style={localStyles.eventTimeRangeRow}>
                    <View style={localStyles.eventTimeBlock}>
                      <Text style={localStyles.eventTimeLabel}>
                        {t("planner.eventWindowStart", {
                          defaultValue: "Bắt đầu",
                        })}
                      </Text>
                      <Text style={localStyles.eventTimeValue}>
                        {eventStartTime}
                      </Text>
                    </View>
                    <View style={localStyles.eventTimeBlock}>
                      <Text style={localStyles.eventTimeLabel}>
                        {t("planner.eventWindowEnd", {
                          defaultValue: "Kết thúc sự kiện",
                        })}
                      </Text>
                      <Text style={localStyles.eventTimeValue}>
                        {eventEndTime || "—"}
                      </Text>
                    </View>
                  </View>
                  <Text style={localStyles.eventLockedDesc}>
                    {showEventBufferChips
                      ? t("planner.eventLockedDesc", {
                          defaultValue:
                            '"{{name}}" — giờ đến được tự động tính từ thời gian sự kiện.',
                          name: eventName || t("planner.term.event"),
                        })
                      : t("planner.eventLockedDescInProgress", {
                          defaultValue:
                            'Bạn đã gắn lịch với sự kiện "{{name}}". Giờ dự kiến đang nằm trong hoặc sau lúc bắt đầu; có thể bỏ qua sự kiện để tự chọn giờ.',
                          name: eventName || t("planner.term.event"),
                        })}
                  </Text>
                  {setBufferMinutes && showEventBufferChips && (
                    <>
                      <View style={localStyles.bufferPickerRow}>
                        <Text style={localStyles.bufferLabel}>
                          {t("planner.bufferLabel", {
                            defaultValue: "Đến trước:",
                          })}
                        </Text>
                        <View style={localStyles.bufferChipRow}>
                          {[15, 30, 45, 60].map((min) => (
                            <TouchableOpacity
                              key={min}
                              style={[
                                localStyles.bufferChip,
                                bufferMinutes === min &&
                                  localStyles.bufferChipActive,
                              ]}
                              onPress={() => setBufferMinutes(min)}
                            >
                              <Text
                                style={[
                                  localStyles.bufferChipText,
                                  bufferMinutes === min &&
                                    localStyles.bufferChipTextActive,
                                ]}
                              >
                                {min}p
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>
                      <Text style={localStyles.bufferSummaryText}>
                        {t("planner.bufferArrivalSummary", {
                          defaultValue:
                            "→ Giờ đến dự kiến: {{arrival}} (đến sớm {{buffer}} phút trước lúc bắt đầu sự kiện {{start}}).",
                          arrival: estimatedTime,
                          buffer: bufferMinutes,
                          start: eventStartTime,
                        })}
                      </Text>
                    </>
                  )}
                  {onUnlockEvent && (
                    <TouchableOpacity
                      style={localStyles.unlockEventBtn}
                      onPress={onUnlockEvent}
                      activeOpacity={0.8}
                    >
                      <Ionicons
                        name="lock-open-outline"
                        size={16}
                        color="#1D4ED8"
                      />
                      <Text style={localStyles.unlockEventBtnText}>
                        {t("planner.unlockEventCta", {
                          defaultValue: "Bỏ qua sự kiện",
                        })}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <Text
                style={[
                  localStyles.timeSetupTitle,
                  isEventLocked && eventStartTime ? { marginTop: 4 } : null,
                ]}
              >
                {t("planner.timeSetupSection", {
                  defaultValue: "Thiết lập thời gian tại địa điểm",
                })}
              </Text>

              {/* ── TIME PICKER ── */}
              <View style={localStyles.fieldRow}>
                <Text style={[styles.timeInputFieldLabel, { marginBottom: 0 }]}>
                  {t("planner.estimatedTimeLabel")}
                </Text>
                <TouchableOpacity
                  style={[
                    localStyles.compactTimePickerBtn,
                    isEventLocked && localStyles.compactTimePickerBtnLocked,
                  ]}
                  onPress={openTimePicker}
                  disabled={!!isEventLocked}
                >
                  <Ionicons
                    name={isEventLocked ? "lock-closed" : "time-outline"}
                    size={18}
                    color={isEventLocked ? "#9CA3AF" : COLORS.primary}
                  />
                  <Text
                    style={[
                      localStyles.compactTimeText,
                      isEventLocked && { color: "#6B7280" },
                    ]}
                  >
                    {estimatedTime}
                  </Text>
                  {!isEventLocked && (
                    <Ionicons
                      name="chevron-down"
                      size={16}
                      color={COLORS.textSecondary}
                    />
                  )}
                </TouchableOpacity>
              </View>

              {/* ── REST DURATION: ±15p; chạm giữa để nhập giờ/phút ── */}
              <View style={[styles.timeInputContainer, { marginBottom: 20 }]}>
                <Text
                  style={[
                    styles.timeInputFieldLabel,
                    localStyles.restSectionLabel,
                  ]}
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  minimumFontScale={0.88}
                >
                  {t("planner.restDurationLabel")}
                </Text>
                <View style={localStyles.restStepperRow}>
                  <TouchableOpacity
                    onPress={() => nudgeRest(-REST_QUICK_STEP)}
                    disabled={restDuration <= minRestDuration}
                    style={[
                      localStyles.stepperBtn,
                      restDuration <= minRestDuration && { opacity: 0.4 },
                    ]}
                    accessibilityLabel={t("planner.decreaseRest", {
                      defaultValue: "Giảm 15 phút thời gian nghỉ",
                    })}
                  >
                    <Ionicons name="remove" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.restValueTap}
                    onPress={openRestHmModal}
                    activeOpacity={0.8}
                    accessibilityLabel={t("planner.restEditHoursMinutesA11y", {
                      defaultValue: "Chỉnh thời gian nghỉ (giờ và phút)",
                    })}
                    accessibilityRole="button"
                  >
                    <Text
                      style={localStyles.restValueTapText}
                      numberOfLines={1}
                    >
                      {formatDuration(restDuration)}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => nudgeRest(REST_QUICK_STEP)}
                    disabled={restDuration >= REST_MAX_SOFT - REST_QUICK_STEP}
                    style={[
                      localStyles.stepperBtn,
                      restDuration >= REST_MAX_SOFT - REST_QUICK_STEP && {
                        opacity: 0.4,
                      },
                    ]}
                    accessibilityLabel={t("planner.increaseRest", {
                      defaultValue: "Tăng 15 phút thời gian nghỉ",
                    })}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
              </View>

              {/* ── NOTE ── */}
              <View style={styles.noteInputContainer}>
                <Text style={styles.timeInputFieldLabel}>
                  {t("planner.noteOptional")}
                </Text>
                <TextInput
                  style={[styles.noteInput, { minHeight: 60 }]}
                  placeholder={t("planner.notePlaceholder")}
                  placeholderTextColor={COLORS.textTertiary}
                  value={note}
                  onChangeText={setNote}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
            </View>

            {/* ── TRAVEL TIMELINE + INSIGHT ── */}
            {!calculatingRoute && (hasTravelInfo || insight) && (
              <View
                style={localStyles.travelCard}
                onLayout={(event) => {
                  travelCardYRef.current = event.nativeEvent.layout.y;
                }}
              >
                <Text style={localStyles.travelCardTitle}>
                  <Ionicons name="map-outline" size={14} color="#A8793D" />{" "}
                  {t("planner.travelAndSchedule")}
                </Text>

                {hasTravelInfo && (
                  <>
                    <TimelineRow
                      label={t("planner.leaveFrom", {
                        name:
                          previousSiteName ||
                          t("planner.previousStop", {
                            defaultValue: "điểm trước",
                          }),
                      })}
                      time={departureTimeFromPrev!}
                      dotColor="#6B7280"
                      t={t}
                    />
                    <View style={localStyles.travelLine}>
                      <Text style={localStyles.travelLineText}>
                        <Ionicons name={transportIconName as any} size={14} color="#6B7280" />{" "}
                        {t("planner.travelTime", {
                          time: formatDurationLocalized(travelMinutes!, t),
                        })}
                        {travelDistanceKm
                          ? ` • ${travelDistanceKm < 1 ? `${Math.round(travelDistanceKm * 1000)} m` : `${travelDistanceKm.toFixed(1)} km`}`
                          : ""}
                      </Text>
                    </View>
                    <TimelineRow
                      label={t("planner.earliestArrival")}
                      time={earliestArrivalDisplay}
                      dotColor="#D97706"
                      dotBorderColor="rgba(217, 119, 6, 0.3)"
                      t={t}
                    />

                    {showMoveToPreviousDayButton &&
                      !hideCrossDayPromoForEventBuffer && (
                      <View style={localStyles.crossDayActionRow}>
                        <TouchableOpacity
                          style={localStyles.movePrevDayButton}
                          onPress={() =>
                            onMoveToPreviousDay?.(sourceDayNumber!)
                          }
                          activeOpacity={0.9}
                        >
                          <Ionicons
                            name="arrow-undo-outline"
                            size={16}
                            color="#5B3E1F"
                          />
                          <Text style={localStyles.movePrevDayButtonText}>
                            {t("planner.moveToPreviousDayCta", {
                              defaultValue: "Chuyển sang ngày trước",
                            })}
                          </Text>
                        </TouchableOpacity>
                        <Text style={localStyles.crossDayActionHint}>
                          {t("planner.keepCurrentDayHint", {
                            defaultValue:
                              "Nếu vẫn giữ ngày hiện tại, hãy kiểm tra lại giờ dự kiến đến trước khi thêm.",
                          })}
                        </Text>
                      </View>
                    )}

                    {canMoveToNextDay && (
                      <View style={localStyles.nextDayInlineWrap}>
                        <TouchableOpacity
                          style={localStyles.moveNextDayButton}
                          onPress={() => onMoveToNextDay?.(nextSuggestedDay)}
                          activeOpacity={0.9}
                        >
                          <Ionicons
                            name="arrow-forward-outline"
                            size={16}
                            color="#5B3E1F"
                          />
                          <Text style={localStyles.moveNextDayButtonText}>
                            {t("planner.moveToNextDayCta", {
                              defaultValue: "Chuyển sang ngày tiếp theo",
                            })}
                          </Text>
                        </TouchableOpacity>
                        {fastestArrival &&
                          (fastestArrivalDayOffset || 0) > 0 && (
                            <Text style={localStyles.nextDayInlineHint}>
                              {(fastestArrivalDayOffset || 0) === 1
                                ? t("planner.earliestArrivalTomorrowHint", {
                                    defaultValue:
                                      "Giờ nhanh nhất: {{time}} (ngày mai)",
                                    time: fastestArrival,
                                  })
                                : t("planner.earliestArrivalOffsetHint", {
                                    defaultValue:
                                      "Giờ nhanh nhất: {{time}} (+{{days}} ngày)",
                                    time: fastestArrival,
                                    days: fastestArrivalDayOffset,
                                  })}
                            </Text>
                          )}
                      </View>
                    )}
                  </>
                )}

                {showArriveFromPreviousDayNotice &&
                  !hideCrossDayPromoForEventBuffer && (
                  <View style={localStyles.arrivePrevDayNotice}>
                    <View style={localStyles.insightHeader}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#A8793D"
                      />
                      <Text
                        style={[localStyles.insightTitle, { color: "#8A5A2B" }]}
                      >
                        {t("planner.arrivePrevDayTitle", {
                          defaultValue: "Có thể đến từ ngày hôm trước",
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[localStyles.insightMessage, { color: "#6B4E2E" }]}
                    >
                      {t("planner.arrivePrevDayMessage", {
                        defaultValue:
                          "Bạn đã có thể đến địa điểm này từ ngày trước. Nếu vẫn thêm ở ngày hiện tại, hãy chọn giờ phù hợp với tiến trình trong ngày.",
                      })}
                    </Text>
                  </View>
                )}

                {/* ── INSIGHT BOX ── */}
                {shouldRenderInsight && insight && (
                  <View
                    style={[
                      localStyles.insightBox,
                      {
                        backgroundColor: insightAppearance.backgroundColor,
                        borderColor: insightAppearance.borderColor,
                        marginTop: hasTravelInfo ? 12 : 6,
                      },
                    ]}
                  >
                    <View style={localStyles.insightHeader}>
                      <Ionicons
                        name={insight.iconName as any}
                        size={16}
                        color={insightAppearance.titleColor}
                      />
                      <Text
                        style={[
                          localStyles.insightTitle,
                          { color: insightAppearance.titleColor },
                        ]}
                      >
                        {insight.title}
                      </Text>
                    </View>
                    <Text
                      style={[
                        localStyles.insightMessage,
                        { color: insightMessageColor },
                      ]}
                    >
                      {insight.message}
                    </Text>
                    {/* suggested card is rendered below */}
                  </View>
                )}

                {/* ── CROSS-DAY WARNING BOX ── */}
                {crossDayWarning && (
                  <View
                    style={[
                      localStyles.insightBox,
                      {
                        backgroundColor: "#FEF2F2",
                        borderColor: "#FECACA",
                        marginTop: hasTravelInfo || insight ? 12 : 6,
                      },
                    ]}
                  >
                    <View style={localStyles.insightHeader}>
                      <Ionicons
                        name="warning-outline"
                        size={16}
                        color="#991B1B"
                      />
                      <Text
                        style={[localStyles.insightTitle, { color: "#991B1B" }]}
                      >
                        {t("planner.journeyWarning")}
                      </Text>
                    </View>
                    <Text
                      style={[localStyles.insightMessage, { color: "#991B1B" }]}
                    >
                      {crossDayWarning}
                    </Text>
                  </View>
                )}

                {isSameAsPreviousSite && (
                  <View
                    style={[
                      localStyles.insightBox,
                      {
                        backgroundColor: "#FEF2F2",
                        borderColor: "#FECACA",
                        marginTop:
                          hasTravelInfo || insight || crossDayWarning ? 12 : 6,
                      },
                    ]}
                  >
                    <View style={localStyles.insightHeader}>
                      <Ionicons
                        name="warning-outline"
                        size={16}
                        color="#B91C1C"
                      />
                      <Text
                        style={[localStyles.insightTitle, { color: "#B91C1C" }]}
                      >
                        {t("planner.sameSiteConsecutiveTitle", {
                          defaultValue: "Không thể thêm trùng địa điểm",
                        })}
                      </Text>
                    </View>
                    <Text
                      style={[localStyles.insightMessage, { color: "#991B1B" }]}
                    >
                      {t("planner.sameSiteConsecutiveMessage", {
                        defaultValue:
                          "Địa điểm này trùng với điểm ngay trước đó nên backend sẽ từ chối. Hãy chọn địa điểm khác hoặc đổi thứ tự trước khi thêm.",
                      })}
                    </Text>
                  </View>
                )}

                {canMoveBackToOriginalDay && (
                  <View style={localStyles.crossDayActionRow}>
                    <TouchableOpacity
                      style={localStyles.moveBackDayButton}
                      onPress={() =>
                        onMoveBackToOriginalDay?.(originalSelectedDay!)
                      }
                      activeOpacity={0.85}
                    >
                      <Ionicons
                        name="arrow-redo-outline"
                        size={15}
                        color="#92400E"
                      />
                      <Text style={localStyles.moveBackDayButtonText}>
                        {t("planner.moveBackToOriginalDayCta", {
                          defaultValue: "Quay lại ngày {{day}}",
                          day: originalSelectedDay,
                        })}
                      </Text>
                    </TouchableOpacity>
                    {isConfirmBlocked && (
                      <Text style={localStyles.crossDayActionWarningText}>
                        {t("planner.invalidTimeGoBackHint", {
                          defaultValue:
                            "Giờ hiện tại chưa hợp lệ. Bạn nên quay lại ngày ban đầu hoặc chỉnh lại giờ dự kiến.",
                        })}
                      </Text>
                    )}
                  </View>
                )}

                {/* ── SUGGEST TIME CARD ── */}
                {showSuggestButton && (
                  <>
                    {groupedSuggestions.event.length > 0 && (
                      <View style={localStyles.suggestButton}>
                        <View style={localStyles.suggestButtonHeaderLeft}>
                          <Ionicons name="calendar" size={16} color="#A8793D" />
                          <View style={{ flex: 1 }}>
                            <Text style={localStyles.suggestButtonText}>
                              {t("planner.suggestedEventTimeLabel", {
                                defaultValue: "Gợi ý theo sự kiện",
                              })}
                            </Text>
                            <Text style={localStyles.suggestButtonReason}>
                              {t("planner.suggestedEventSectionHint", {
                                defaultValue:
                                  "{{dayLabel}}: Đang có các sự kiện, vui lòng chọn sự kiện phù hợp để áp dụng giờ đến.",
                                dayLabel: suggestionDayLabel,
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={localStyles.suggestButtonDetailBox}>
                          {groupedSuggestions.event.map((suggestion) => (
                            <View
                              key={suggestion.key}
                              style={localStyles.suggestOptionBlock}
                            >
                              <View style={localStyles.suggestItemHeader}>
                                <Text
                                  style={localStyles.suggestEventNameOneLine}
                                  numberOfLines={1}
                                >
                                  {suggestion.eventTitle ||
                                    t("planner.event", {
                                      defaultValue: "Sự kiện",
                                    })}
                                </Text>
                                <Text style={localStyles.suggestItemMetaText}>
                                  {suggestion.eventStartTime
                                    ? suggestion.eventEndTime
                                      ? `${suggestion.eventStartTime} - ${suggestion.eventEndTime}`
                                      : suggestion.eventStartTime
                                    : suggestion.baseTime || "--:--"}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={localStyles.applySuggestionBtn}
                                activeOpacity={0.85}
                                onPress={() =>
                                  applySuggestedTime(suggestion.time, {
                                    priority: suggestion.priority,
                                    eventId: suggestion.eventId,
                                  })
                                }
                              >
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={16}
                                  color="#92400E"
                                />
                                <Text
                                  style={localStyles.applySuggestionBtnText}
                                >
                                  {t("planner.applySuggestedTimeCta", {
                                    defaultValue: "Áp dụng {{time}}",
                                    time: suggestion.time,
                                  })}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {groupedSuggestions.mass.length > 0 && (
                      <View style={localStyles.suggestButton}>
                        <View style={localStyles.suggestButtonHeaderLeft}>
                          <Ionicons
                            name="book-outline"
                            size={16}
                            color="#A8793D"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={localStyles.suggestButtonText}>
                              {t("planner.suggestedMassTimeLabel", {
                                defaultValue: "Gợi ý theo giờ lễ thường",
                              })}
                            </Text>
                            <Text style={localStyles.suggestButtonReason}>
                              {t("planner.suggestedMassSectionHint", {
                                defaultValue:
                                  "{{dayLabel}}: áp dụng khung giờ lễ thường phù hợp với kế hoạch di chuyển.",
                                dayLabel: suggestionDayLabel,
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={localStyles.suggestButtonDetailBox}>
                          <View style={localStyles.suggestOptionBlock}>
                            <Text
                              style={localStyles.suggestItemTitleOneLine}
                              numberOfLines={1}
                            >
                              {t("planner.regularMassDaily", {
                                defaultValue: "Giờ lễ thường ngày",
                              })}
                            </Text>
                            <View style={localStyles.massApplyList}>
                              {groupedSuggestions.mass.map((suggestion) => (
                                <TouchableOpacity
                                  key={suggestion.key}
                                  style={localStyles.applySuggestionBtn}
                                  activeOpacity={0.85}
                                  onPress={() =>
                                    applySuggestedTime(suggestion.time, {
                                      priority: suggestion.priority,
                                    })
                                  }
                                >
                                  <Ionicons
                                    name="checkmark-circle-outline"
                                    size={16}
                                    color="#92400E"
                                  />
                                  <Text
                                    style={localStyles.applySuggestionBtnText}
                                  >
                                    {t("planner.applySuggestedTimeCta", {
                                      defaultValue: "Áp dụng {{time}}",
                                      time: suggestion.time,
                                    })}
                                  </Text>
                                </TouchableOpacity>
                              ))}
                            </View>
                          </View>
                        </View>
                      </View>
                    )}

                    {groupedSuggestions.opening.length > 0 && (
                      <View style={localStyles.suggestButton}>
                        <View style={localStyles.suggestButtonHeaderLeft}>
                          <Ionicons
                            name="time-outline"
                            size={16}
                            color="#A8793D"
                          />
                          <View style={{ flex: 1 }}>
                            <Text style={localStyles.suggestButtonText}>
                              {t("planner.suggestedOpeningTimeLabel", {
                                defaultValue: "Gợi ý theo giờ mở cửa",
                              })}
                            </Text>
                            <Text style={localStyles.suggestButtonReason}>
                              {t("planner.suggestedOpeningSectionHint", {
                                defaultValue:
                                  "{{dayLabel}}: tham chiếu giờ mở cửa để chọn thời điểm đến hợp lý.",
                                dayLabel: suggestionDayLabel,
                              })}
                            </Text>
                          </View>
                        </View>
                        <View style={localStyles.suggestButtonDetailBox}>
                          {groupedSuggestions.opening.map((suggestion) => (
                            <View
                              key={suggestion.key}
                              style={localStyles.suggestOptionBlock}
                            >
                              <View style={localStyles.suggestItemHeader}>
                                <Text
                                  style={localStyles.suggestItemTitleOneLine}
                                  numberOfLines={1}
                                >
                                  {t("planner.openingHours", {
                                    defaultValue: "Giờ mở cửa",
                                  })}
                                </Text>
                                <Text style={localStyles.suggestItemMetaText}>
                                  {suggestion.baseTime || "--:--"}
                                </Text>
                              </View>
                              <TouchableOpacity
                                style={localStyles.applySuggestionBtn}
                                activeOpacity={0.85}
                                onPress={() =>
                                  applySuggestedTime(suggestion.time, {
                                    priority: suggestion.priority,
                                  })
                                }
                              >
                                <Ionicons
                                  name="checkmark-circle-outline"
                                  size={16}
                                  color="#92400E"
                                />
                                <Text
                                  style={localStyles.applySuggestionBtnText}
                                >
                                  {t("planner.applySuggestedTimeCta", {
                                    defaultValue: "Áp dụng {{time}}",
                                    time: suggestion.time,
                                  })}
                                </Text>
                              </TouchableOpacity>
                            </View>
                          ))}
                        </View>
                      </View>
                    )}

                    {smartSuggestions.length === 0 && suggestedTime ? (
                      <View style={localStyles.suggestButton}>
                        <View style={localStyles.suggestButtonHeaderLeft}>
                          <Ionicons name="sparkles" size={16} color="#A8793D" />
                          <View style={{ flex: 1 }}>
                            <Text style={localStyles.suggestButtonText}>
                              {t("planner.suggestedTimeLabel", {
                                defaultValue: "Gợi ý giờ nên đến",
                              })}
                            </Text>
                          </View>
                        </View>
                        <TouchableOpacity
                          style={localStyles.applySuggestionBtn}
                          activeOpacity={0.85}
                          onPress={() =>
                            applySuggestedTime(suggestedTime.time, {
                              priority: suggestedTime.priority,
                            })
                          }
                        >
                          <Ionicons
                            name="checkmark-circle-outline"
                            size={16}
                            color="#92400E"
                          />
                          <Text style={localStyles.applySuggestionBtnText}>
                            {t("planner.applySuggestedTimeCta", {
                              defaultValue: "Áp dụng {{time}}",
                              time: suggestedTime.time,
                            })}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : null}
                  </>
                )}
              </View>
            )}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── CONFIRM BUTTON (STICKY BOTTOM) ── */}
        <View
          style={[
            localStyles.stickyFooter,
            { paddingBottom: Math.max(insets.bottom, 16) + 16 },
          ]}
        >
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (addingItem || isConfirmBlocked) && styles.saveTimeButtonDisabled,
              isConfirmBlocked && { opacity: 0.5 },
              { marginTop: 0 },
            ]}
            onPress={tryConfirmAdd}
            disabled={addingItem || !selectedSiteId || isConfirmBlocked}
          >
            {addingItem ? (
              <ActivityIndicator color={COLORS.white} />
            ) : isConfirmBlocked ? (
              <Text style={[styles.confirmButtonText, { color: "#8A6F40" }]}>
                {crossDaysAdded > 0
                  ? t("planner.selectAnotherDay", {
                      defaultValue: "Cần chọn ngày khác",
                    })
                  : insight?.type === "event_unreachable"
                    ? t("planner.eventUnreachableShort", {
                        defaultValue: "Không thể đến kịp sự kiện",
                      })
                    : insight?.type === "event_late" && insight?.isBlocking
                      ? t("planner.eventMissedShort", {
                          defaultValue: "Đã qua khung sự kiện",
                        })
                      : insight?.type === "early"
                        ? t("planner.arrivalOutsideOperatingHoursShort", {
                            defaultValue:
                              "Không thể thêm: giờ đến ngoài khung giờ hoạt động",
                          })
                        : t("planner.selectAnotherTime")}
              </Text>
            ) : (
              <Text style={[styles.confirmButtonText, { color: COLORS.white }]}>
                {confirmButtonLabel || t("planner.addToItinerary")}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        {visible ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              zIndex: 9999,
              elevation: 9999,
            }}
            pointerEvents="box-none"
          >
            <Toast config={toastConfig} />
          </View>
        ) : null}

        <Modal
          visible={pastHalfEventModal}
          transparent
          animationType="fade"
          onRequestClose={() => setPastHalfEventModal(false)}
        >
          <View style={localStyles.halfEventOverlay}>
            <View style={localStyles.halfEventCard}>
              <Text style={localStyles.halfEventTitle}>
                {t("planner.halfEventWarningTitle", {
                  defaultValue: "Sự kiện đã diễn ra quá nửa thời lượng",
                })}
              </Text>
              <Text style={localStyles.halfEventBody}>
                {t("planner.halfEventWarningBody", {
                  defaultValue:
                    "Giờ đến dự kiến của bạn nằm sau hơn một nửa thời lượng sự kiện. Còn khoảng {{remain}} nữa là kết thúc. Bạn vẫn muốn thêm điểm này vào lịch?",
                  remain: formatDurationLocalized(pastHalfRemainMins, t),
                })}
              </Text>
              <View style={localStyles.halfEventActions}>
                <TouchableOpacity
                  style={localStyles.halfEventCancelBtn}
                  onPress={() => setPastHalfEventModal(false)}
                  activeOpacity={0.85}
                >
                  <Text style={localStyles.halfEventCancelText}>
                    {t("planner.halfEventWarningBack", {
                      defaultValue: "Xem lại",
                    })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={localStyles.halfEventConfirmBtn}
                  onPress={confirmAfterPastHalfWarning}
                  activeOpacity={0.9}
                >
                  <Text style={localStyles.halfEventConfirmText}>
                    {t("planner.halfEventWarningConfirm", {
                      defaultValue: "Vẫn thêm",
                    })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        <Modal
          visible={restHmModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setRestHmModalVisible(false)}
        >
          <View style={localStyles.halfEventOverlay}>
            <KeyboardAvoidingView
              behavior={Platform.OS === "ios" ? "padding" : undefined}
              style={localStyles.restHmKb}
            >
              <View style={localStyles.halfEventCard}>
                <Text style={localStyles.halfEventTitle}>
                  {t("planner.restHmModalTitle", {
                    defaultValue: "Thời gian nghỉ tại điểm",
                  })}
                </Text>
                <Text style={localStyles.restHmModalHint}>
                  {t("planner.restHmModalHint", {
                    defaultValue:
                      "Có thể nghỉ nhiều ngày nếu có lưu trú, ăn uống hoặc nhu cầu y tế tại nơi. Bạn tự chọn tổng thời gian.",
                  })}
                </Text>
                <View style={localStyles.restHmInputsRow}>
                  <View style={localStyles.restHmFieldCol}>
                    <Text style={localStyles.restHmFieldLabel}>
                      {t("planner.restHoursShort", { defaultValue: "Giờ" })}
                    </Text>
                    <TextInput
                      value={restDraftH}
                      onChangeText={(txt) => {
                        const d = txt.replace(/[^\d]/g, "");
                        if (d.length > 4) {
                          setRestDraftH(d.slice(0, 4));
                        } else {
                          setRestDraftH(d);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={4}
                      returnKeyType="next"
                      style={localStyles.restHmFieldInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                  <View style={localStyles.restHmFieldCol}>
                    <Text style={localStyles.restHmFieldLabel}>
                      {t("planner.restMinutesShort", { defaultValue: "Phút" })}
                    </Text>
                    <TextInput
                      value={restDraftM}
                      onChangeText={(txt) => {
                        const d = txt.replace(/[^\d]/g, "");
                        if (d === "") {
                          setRestDraftM("");
                          return;
                        }
                        const n = parseInt(d, 10);
                        if (Number.isFinite(n) && n > 59) {
                          setRestDraftM("59");
                        } else {
                          setRestDraftM(d);
                        }
                      }}
                      keyboardType="number-pad"
                      maxLength={2}
                      returnKeyType="done"
                      onSubmitEditing={applyRestFromHmModal}
                      style={localStyles.restHmFieldInput}
                      placeholder="0"
                      placeholderTextColor={COLORS.textTertiary}
                    />
                  </View>
                </View>
                <View style={localStyles.halfEventActions}>
                  <TouchableOpacity
                    style={localStyles.halfEventCancelBtn}
                    onPress={() => setRestHmModalVisible(false)}
                    activeOpacity={0.85}
                  >
                    <Text style={localStyles.halfEventCancelText}>
                      {t("planner.restHmModalCancel", {
                        defaultValue: "Hủy",
                      })}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={localStyles.halfEventConfirmBtn}
                    onPress={applyRestFromHmModal}
                    activeOpacity={0.9}
                  >
                    <Text style={localStyles.halfEventConfirmText}>
                      {t("planner.restHmModalApply", {
                        defaultValue: "Áp dụng",
                      })}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </View>
        </Modal>
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SiteHeroCard(props: {
  dayLabel: string;
  siteName?: string;
  patronSaint?: string;
  address?: string;
  openingHoursLine: string;
  coverImage?: string;
  t: (key: string, options?: any) => string;
}) {
  const {
    dayLabel,
    siteName,
    patronSaint,
    address,
    openingHoursLine,
    coverImage,
    t,
  } = props;

  const content = (
    <>
      <View style={localStyles.heroOverlay} />
      <View style={localStyles.heroContent}>
        <Text style={localStyles.heroDayLabel}>{dayLabel}</Text>
        <Text
          style={localStyles.heroSiteName}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {siteName || t("planner.typeLocation")}
        </Text>

        {patronSaint ? (
          <View style={localStyles.heroChip}>
            <Ionicons name="sparkles-outline" size={12} color="#FDE68A" />
            <Text style={localStyles.heroChipText} numberOfLines={1}>
              {t("planner.patronSaintInline", {
                defaultValue: "Bổn mạng: {{value}}",
                value: patronSaint,
              })}
            </Text>
          </View>
        ) : null}

        <View style={localStyles.heroMetaRow}>
          <Ionicons name="location-outline" size={14} color="#E5E7EB" />
          <Text
            style={localStyles.heroMetaText}
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            {address ||
              t("planner.addressUnavailable", {
                defaultValue: "Chưa có địa chỉ",
              })}
          </Text>
        </View>

        <View style={localStyles.heroMetaRow}>
          <Ionicons name="time-outline" size={14} color="#E5E7EB" />
          <Text style={localStyles.heroMetaText}>
            {t("planner.openingHours")}: {openingHoursLine}
          </Text>
        </View>
      </View>
    </>
  );

  return (
    <View style={localStyles.heroWrap}>
      {coverImage ? (
        <ImageBackground
          source={{ uri: coverImage }}
          imageStyle={localStyles.heroImage}
          style={localStyles.heroImageContainer}
        >
          {content}
        </ImageBackground>
      ) : (
        <View
          style={[localStyles.heroImageContainer, localStyles.heroFallback]}
        >
          {content}
        </View>
      )}
    </View>
  );
}

/** A single row in the travel timeline */
function TimelineRow(props: {
  label: string;
  time: string;
  dotColor: string;
  dotBorderColor?: string;
  t: (key: string, options?: any) => string;
}) {
  return (
    <View style={localStyles.travelRow}>
      <View
        style={[
          localStyles.travelDot,
          {
            backgroundColor: props.dotColor,
            borderColor: props.dotBorderColor || "#fff",
          },
        ]}
      />
      <View style={localStyles.travelRowContent}>
        <Text style={localStyles.travelRowLabel}>{props.label}</Text>
        <Text style={localStyles.travelRowTime}>{props.time}</Text>
      </View>
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const localStyles = StyleSheet.create({
  // ── Hero ──
  heroWrap: {
    marginBottom: 14,
  },
  heroImageContainer: {
    height: 220,
    borderRadius: 16,
    overflow: "hidden",
    justifyContent: "flex-end",
    backgroundColor: "#CBAA7D",
  },
  heroImage: {
    borderRadius: 16,
  },
  heroFallback: {
    backgroundColor: "#D8BE96",
  },
  heroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(74, 44, 17, 0.38)",
  },
  heroContent: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 6,
  },
  heroDayLabel: {
    color: "#DBEAFE",
    fontSize: 12,
    fontWeight: "700",
  },
  heroSiteName: {
    color: "#FFFFFF",
    fontSize: 22,
    lineHeight: 28,
    fontWeight: "800",
  },
  heroChip: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(139, 92, 48, 0.58)",
    borderWidth: 1,
    borderColor: "rgba(255, 234, 191, 0.7)",
  },
  heroChipText: {
    color: "#FEF3C7",
    fontSize: 11,
    fontWeight: "700",
  },
  heroMetaRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
  },
  heroMetaText: {
    flex: 1,
    color: "#E5E7EB",
    fontSize: 12,
    lineHeight: 17,
    fontWeight: "500",
  },

  // ── Sections ──
  sectionTitle: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginBottom: 8,
  },
  timeSetupCard: {
    backgroundColor: "#FFFCF6",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E9DFC9",
    padding: 12,
    marginBottom: 10,
  },
  timeSetupTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 12,
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },

  // ── Travel Card ──
  travelCard: {
    backgroundColor: "#FFF7EB",
    borderRadius: 16,
    padding: 12,
    marginTop: 6,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "#E2C9A4",
    gap: 6,
  },
  travelCardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#5E4325",
    marginBottom: 4,
  },

  // Timeline rows
  travelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  travelDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
    elevation: 2,
  },
  travelRowContent: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  travelRowLabel: {
    fontSize: 13,
    color: "#4E3620",
    fontWeight: "600",
    flex: 1,
  },
  travelRowTime: {
    fontSize: 14,
    fontWeight: "800",
    color: "#8A5A2B",
    marginLeft: 8,
  },

  // Connecting line
  travelLine: {
    marginLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: "#D6B384",
    paddingLeft: 16,
    paddingVertical: 4,
  },
  travelLineText: {
    fontSize: 12,
    color: "#6A4A2A",
    fontWeight: "500",
  },
  // Insight Box
  insightBox: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#FECACA",
    padding: 10,
    marginTop: 8,
  },
  insightHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  insightTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
    flex: 1,
    flexShrink: 1,
  },
  insightMessage: {
    fontSize: 13,
    color: "#374151",
    lineHeight: 18,
  },

  // Suggest Button
  suggestButton: {
    backgroundColor: "#F8ECD8",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "#D2A36A",
  },
  suggestButtonHeaderLeft: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    flex: 1,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#6D3F19",
  },
  suggestButtonReason: {
    marginTop: 2,
    fontSize: 12,
    color: "#6F5233",
    lineHeight: 17,
  },
  eventHighlightRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 8,
    flexWrap: "wrap",
  },
  eventHighlightPill: {
    maxWidth: "78%",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FDECC8",
    borderWidth: 1,
    borderColor: "#D9A868",
  },
  eventHighlightPillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C2D12",
  },
  eventTimePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "#FFF7EC",
    borderWidth: 1,
    borderColor: "#D9A868",
  },
  eventTimePillText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#7C2D12",
  },
  suggestButtonDetailBox: {
    marginTop: 12,
    gap: 10,
  },
  suggestOptionBlock: {
    backgroundColor: "#FFF7EC",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#DEB887",
    padding: 10,
    gap: 4,
  },
  suggestItemHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 4,
  },
  suggestEventNameOneLine: {
    flex: 1,
    fontSize: 12,
    fontWeight: "800",
    color: "#7C2D12",
  },
  suggestItemTitleOneLine: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#7C2D12",
  },
  suggestItemMetaText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#92400E",
  },
  massApplyList: {
    marginTop: 6,
    gap: 8,
  },
  applySuggestionBtn: {
    marginTop: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "stretch",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "#FDECC8",
    borderWidth: 1,
    borderColor: "#D9A868",
  },
  applySuggestionBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#7C2D12",
  },

  // ── New Styles ──
  compactTimePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: "#C8B08A",
    borderRadius: 8,
    gap: 8,
  },
  compactTimeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#3D2E1E",
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F4EDE1",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#D7C3A2",
  },
  restSectionLabel: {
    marginBottom: 8,
    width: "100%",
  },
  restStepperRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  restValueTap: {
    minWidth: 120,
    maxWidth: "56%",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: "#D7C3A2",
  },
  restValueTapText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
    textAlign: "center",
  },
  restHmKb: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
  },
  restHmModalHint: {
    fontSize: 12,
    lineHeight: 16,
    color: "#6B5A45",
    marginBottom: 14,
  },
  restHmInputsRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    gap: 16,
    marginBottom: 6,
  },
  restHmFieldCol: {
    flex: 1,
    minWidth: 0,
  },
  restHmFieldLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B4E2E",
    marginBottom: 4,
  },
  restHmFieldInput: {
    fontSize: 20,
    fontWeight: "700",
    textAlign: "center",
    color: "#3D2E1E",
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "#FFFBF5",
    borderWidth: 1,
    borderColor: "#D7C3A2",
  },
  stickyFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
  crossDayActionRow: {
    marginTop: 10,
    gap: 6,
  },
  nextDayInlineWrap: {
    marginTop: 10,
    gap: 6,
  },
  nextDayInlineHint: {
    fontSize: 12,
    lineHeight: 16,
    color: "#6F5233",
    fontWeight: "600",
  },
  arrivePrevDayNotice: {
    marginTop: 10,
    backgroundColor: "#FFF3DD",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E6CA9A",
    padding: 10,
  },
  movePrevDayButton: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3C04E",
    borderWidth: 1,
    borderColor: "#E7BC6E",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  movePrevDayButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3E1F",
  },
  crossDayActionHint: {
    fontSize: 12,
    color: "#6E5133",
    lineHeight: 16,
  },
  moveBackDayButton: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(146, 64, 14, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(146, 64, 14, 0.24)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  moveBackDayButtonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#92400E",
  },
  crossDayActionWarningText: {
    fontSize: 12,
    lineHeight: 16,
    color: "#A04B22",
  },
  moveNextDayButton: {
    alignSelf: "stretch",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: "#F3C04E",
    borderWidth: 1,
    borderColor: "#E7BC6E",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 9,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.18,
    shadowRadius: 4,
    elevation: 3,
  },
  moveNextDayButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#5B3E1F",
  },
  // ── Event-locked styles ──
  eventLockedBanner: {
    backgroundColor: "rgba(29, 78, 216, 0.06)",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
    borderRadius: 12,
    padding: 14,
    marginBottom: 16,
    gap: 8,
  },
  eventLockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  eventLockedTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  eventTimeRangeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
    marginTop: 2,
  },
  eventTimeBlock: {
    flex: 1,
  },
  eventTimeLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(30, 64, 175, 0.75)",
    marginBottom: 2,
  },
  eventTimeValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  eventLockedDesc: {
    fontSize: 13,
    lineHeight: 18,
    color: "#1E40AF",
  },
  bufferPickerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 4,
  },
  bufferLabel: {
    fontSize: 13,
    color: "#1E40AF",
    fontWeight: "600",
  },
  bufferChipRow: {
    flexDirection: "row",
    gap: 6,
  },
  bufferChip: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 999,
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.15)",
  },
  bufferChipActive: {
    backgroundColor: "#1D4ED8",
    borderColor: "#1D4ED8",
  },
  bufferChipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1E40AF",
  },
  bufferChipTextActive: {
    color: "#FFFFFF",
  },
  bufferSummaryText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#1E3A8A",
    marginTop: 6,
  },
  unlockEventBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    alignSelf: "stretch",
    marginTop: 4,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(29, 78, 216, 0.35)",
  },
  unlockEventBtnText: {
    fontSize: 14,
    color: "#1D4ED8",
    fontWeight: "700",
  },
  compactTimePickerBtnLocked: {
    opacity: 0.65,
    backgroundColor: "rgba(0, 0, 0, 0.03)",
  },
  restFloorWarning: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#D97706",
  },
  halfEventOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  halfEventCard: {
    width: "100%",
    maxWidth: 360,
    backgroundColor: "#FFFCF6",
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: "#E8D4B4",
  },
  halfEventTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#5B3E1F",
    marginBottom: 10,
  },
  halfEventBody: {
    fontSize: 14,
    lineHeight: 21,
    color: "#4B3623",
    marginBottom: 18,
  },
  halfEventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 12,
  },
  halfEventCancelBtn: {
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  halfEventCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#6B5A45",
  },
  halfEventConfirmBtn: {
    backgroundColor: "#F3C04E",
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#E7BC6E",
  },
  halfEventConfirmText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#4A3419",
  },
});
