import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import {
    ActivityIndicator,
  ImageBackground,
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
import { formatDurationLocalized } from "../../utils/siteScheduleHelper";

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

  // ── Smart insight (pre-computed) ──
  insight?: ScheduleInsight | null;
  suggestedTime?: SuggestedArrival | null;
  onMoveToPreviousDay?: (dayNumber: number) => void;
  onMoveToNextDay?: (dayNumber: number) => void;
  onMoveBackToOriginalDay?: (dayNumber: number) => void;

  // ── Cross-day flag ──
  isCrossDayTravel?: boolean;
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
    insight,
    suggestedTime,
    onMoveToPreviousDay,
    onMoveToNextDay,
    onMoveBackToOriginalDay,
  } = props;
  const insets = useSafeAreaInsets();
  const scrollRef = useRef<ScrollView | null>(null);
  const travelCardYRef = useRef(0);
  const previousEstimatedRef = useRef(estimatedTime);
  const previousRestRef = useRef(restDuration);

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
    typeof sourceDayNumber === "number" ? sourceDayNumber === selectedDay : true;
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

  const suggestedArrivalMin = parseTimeToMinutes(suggestedTime?.time);
  const sortedSiteEventTimes = useMemo(() => {
    return eventsForDay
      .map((eventItem) => eventItem.startTime)
      .filter((time): time is string => !!time)
      .sort((a, b) => {
        const aMin = parseTimeToMinutes(a);
        const bMin = parseTimeToMinutes(b);
        if (aMin === null || bMin === null) return 0;
        return aMin - bMin;
      });
  }, [eventsForDay]);

  const derivedMassTime = useMemo(() => {
    const candidates = [
      ...massTimesForDay,
      ...sortedSiteEventTimes,
      ...(eventStartTime ? [eventStartTime] : []),
    ];
    if (candidates.length === 0) return null;

    const uniqueCandidates = Array.from(new Set(candidates));
    const sortedCandidates = uniqueCandidates.sort((a, b) => {
      const aMin = parseTimeToMinutes(a);
      const bMin = parseTimeToMinutes(b);
      if (aMin === null || bMin === null) return 0;
      return aMin - bMin;
    });

    if (suggestedArrivalMin !== null) {
      const candidate = sortedCandidates.find((mass) => {
        const massMin = parseTimeToMinutes(mass);
        return massMin !== null && massMin >= suggestedArrivalMin;
      });
      if (candidate) return candidate;
    }

    return sortedCandidates[0] || null;
  }, [eventStartTime, massTimesForDay, sortedSiteEventTimes, suggestedArrivalMin]);

  const showArriveFromPreviousDayNotice =
    !!isCrossDayTravel &&
    fastestArrival === "00:00" &&
    Number(fastestArrivalDayOffset || 0) <= 0;

  const estimatedMinutes = parseTimeToMinutes(estimatedTime) ?? 0;
  const remainingInDayMinutes = Math.max(0, 1440 - estimatedMinutes);
  const minRestDuration = 60;
  const maxRestDuration = Math.max(minRestDuration, remainingInDayMinutes);
  const isRestOverflowDay = restDuration > remainingInDayMinutes;
  // Show suggested time card only if suggestion differs from current
  const showSuggestButton = useMemo(() => {
    if (!suggestedTime) return false;
    return (
      suggestedTime.time !== estimatedTime &&
      suggestedTime.priority !== "default"
    );
  }, [suggestedTime, estimatedTime]);

  const suggestionSourceText = useMemo(() => {
    if (!suggestedTime) return "";

    if (suggestedTime.priority === "event") {
      return t("planner.suggestionSourceEventDetailed", {
        defaultValue: "Theo sự kiện {{name}} lúc {{time}} tại địa điểm.",
        name: eventName || t("planner.event", { defaultValue: "Sự kiện" }),
        time: eventStartTime || suggestedTime.time,
      });
    }

    if (suggestedTime.priority === "mass") {
      return t("planner.suggestionSourceMassDetailed", {
        defaultValue: "Theo giờ lễ thường ngày lúc {{time}} tại địa điểm.",
        time: derivedMassTime || suggestedTime.time,
      });
    }

    if (suggestedTime.priority === "opening") {
      return t("planner.suggestionSourceOpeningDetailed", {
        defaultValue: "Theo giờ mở cửa của địa điểm từ {{time}}.",
        time: openTime || "—",
      });
    }

    return t("planner.suggestionSourceDefaultDetailed", {
      defaultValue: "Theo điều kiện lịch trình hiện tại.",
    });
  }, [
    derivedMassTime,
    eventName,
    eventStartTime,
    openTime,
    suggestedTime,
    t,
  ]);

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
    insight?.isBlocking === true ||
    crossDaysAdded > 0 ||
    isRestOverflowDay ||
    isSameAsPreviousSite;

  const shouldRenderInsight = useMemo(() => {
    if (!insight) return false;

    const positiveInsightTypes = new Set(["ideal", "buffer", "first_stop", "event_ok"]);
    if (crossDayWarning && positiveInsightTypes.has(insight.type)) {
      return false;
    }
    return true;
  }, [crossDayWarning, insight]);

  const insightMessageColor = useMemo(() => {
    if (!insight) return "#6B4E2E";

    if (
      insight.type === "error" ||
      insight.type === "error_closed" ||
      insight.type === "event_late" ||
      insight.type === "early"
    ) {
      return "#7F1D1D";
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

  useEffect(() => {
    if (!visible) return;

    const estimatedChanged = previousEstimatedRef.current !== estimatedTime;
    const restChanged = previousRestRef.current !== restDuration;
    previousEstimatedRef.current = estimatedTime;
    previousRestRef.current = restDuration;

    if (!(estimatedChanged || restChanged)) return;
    if (!hasTravelInfo && !insight) return;

    const targetY = Math.max(0, travelCardYRef.current - 18);
    if (!targetY) return;

    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ y: targetY, animated: true });
    });
  }, [estimatedTime, hasTravelInfo, insight, restDuration, visible]);

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
            keyboardShouldPersistTaps="handled"
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
              <Text style={localStyles.timeSetupTitle}>
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
                  style={localStyles.compactTimePickerBtn}
                  onPress={openTimePicker}
                >
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.primary}
                  />
                  <Text style={localStyles.compactTimeText}>{estimatedTime}</Text>
                  <Ionicons
                    name="chevron-down"
                    size={16}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* ── REST DURATION ── */}
              <View style={[styles.timeInputContainer, { marginBottom: 20 }]}> 
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <Text
                    style={[
                      styles.timeInputFieldLabel,
                      { marginBottom: 0, flex: 1, marginRight: 8 },
                    ]}
                    numberOfLines={2}
                  >
                    {t("planner.restDurationLabel")}
                  </Text>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 12,
                    }}
                  >
                    <TouchableOpacity
                      onPress={() =>
                        setRestDuration(
                          Math.max(minRestDuration, restDuration - 15),
                        )
                      }
                      disabled={restDuration <= minRestDuration}
                      style={[
                        localStyles.stepperBtn,
                        restDuration <= minRestDuration && { opacity: 0.4 },
                      ]}
                    >
                      <Ionicons name="remove" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "700",
                        color: COLORS.primary,
                        minWidth: 65,
                        textAlign: "center",
                      }}
                    >
                      {formatDuration(restDuration)}
                    </Text>
                    <TouchableOpacity
                      onPress={() =>
                        setRestDuration(
                          Math.min(maxRestDuration, restDuration + 15),
                        )
                      }
                      disabled={restDuration >= maxRestDuration}
                      style={[
                        localStyles.stepperBtn,
                        restDuration >= maxRestDuration && { opacity: 0.4 },
                      ]}
                    >
                      <Ionicons name="add" size={20} color={COLORS.primary} />
                    </TouchableOpacity>
                  </View>
                </View>
                <Text style={localStyles.restLimitText}>
                  {t("planner.restLimitByDay", {
                    defaultValue: "Tối đa hôm nay: {{value}}",
                    value: formatDuration(maxRestDuration),
                  })}
                </Text>
                {isRestOverflowDay && (
                  <Text style={localStyles.restLimitWarning}>
                    {t("planner.restLimitWarning", {
                      defaultValue:
                        "Thời gian nghỉ đang vượt quá cuối ngày. Hãy giảm thời gian nghỉ hoặc chọn giờ dự kiến sớm hơn.",
                    })}
                  </Text>
                )}
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
                        🚗{" "}
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
                        {fastestArrival && (fastestArrivalDayOffset || 0) > 0 && (
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

                {showArriveFromPreviousDayNotice && (
                  <View style={localStyles.arrivePrevDayNotice}>
                    <View style={localStyles.insightHeader}>
                      <Ionicons
                        name="information-circle-outline"
                        size={16}
                        color="#A8793D"
                      />
                      <Text style={[localStyles.insightTitle, { color: "#8A5A2B" }]}>
                        {t("planner.arrivePrevDayTitle", {
                          defaultValue: "Có thể đến từ ngày hôm trước",
                        })}
                      </Text>
                    </View>
                    <Text style={[localStyles.insightMessage, { color: "#6B4E2E" }]}>
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

                {showMoveToPreviousDayButton && (
                  <View style={localStyles.crossDayActionRow}>
                    <TouchableOpacity
                      style={localStyles.movePrevDayButton}
                      onPress={() => onMoveToPreviousDay?.(sourceDayNumber!)}
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
                {showSuggestButton && suggestedTime && (
                  <View style={localStyles.suggestButton}>
                    <View style={localStyles.suggestButtonHeaderLeft}>
                      <Ionicons name="sparkles" size={16} color="#A8793D" />
                      <View style={{ flex: 1 }}>
                        <Text style={localStyles.suggestButtonText}>
                          {t("planner.suggestedTimeLabel", {
                            defaultValue: "Gợi ý giờ nên đến",
                          })}
                        </Text>
                        <Text style={localStyles.suggestButtonReason}>
                          {t("planner.suggestedArrivalOnlyDetailed", {
                            defaultValue:
                              "{{dayLabel}}: nên đến lúc {{time}}. {{source}}",
                            dayLabel: suggestionDayLabel,
                            time: suggestedTime.time,
                            source: suggestionSourceText,
                          })}
                        </Text>
                      </View>
                    </View>

                    <View style={localStyles.suggestButtonDetailBox}>
                      <View style={localStyles.suggestOptionBlock}>
                        <Text style={localStyles.suggestOptionText}>
                          {t("planner.suggestedArrivalSummary", {
                            defaultValue:
                              "Giờ gợi ý đã được tính theo lịch địa điểm và điều kiện hành trình hiện tại.",
                          })}
                        </Text>
                      </View>
                    </View>
                  </View>
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
            onPress={onConfirmAdd}
            disabled={addingItem || !selectedSiteId || isConfirmBlocked}
          >
            {addingItem ? (
              <ActivityIndicator color={COLORS.white} />
            ) : isConfirmBlocked ? (
              <Text
                style={[
                  styles.confirmButtonText,
                  { color: "#8A6F40" },
                ]}
              >
                {crossDaysAdded > 0
                  ? t("planner.selectAnotherDay", {
                      defaultValue: "Cần chọn ngày khác",
                    })
                  : insight?.type === "early"
                    ? t("planner.arrivalOutsideOperatingHoursShort", {
                        defaultValue:
                          "Không thể thêm: giờ đến ngoài khung giờ hoạt động",
                      })
                  : isRestOverflowDay
                    ? t("planner.adjustRestOrTime", {
                        defaultValue: "Cần chỉnh giờ nghỉ/đến",
                      })
                    : t("planner.selectAnotherTime")}
              </Text>
            ) : (
              <Text
                style={[styles.confirmButtonText, { color: COLORS.white }]}
              >
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
        <View style={[localStyles.heroImageContainer, localStyles.heroFallback]}>
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
    fontSize: 12,
    color: "#5B3416",
    lineHeight: 17,
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
  suggestOptionText: {
    fontSize: 12,
    lineHeight: 17,
    color: "#5B3416",
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
  restLimitText: {
    marginTop: 8,
    fontSize: 12,
    color: "#6B7280",
  },
  restLimitWarning: {
    marginTop: 4,
    fontSize: 12,
    lineHeight: 17,
    color: "#B45309",
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
});
