import { Ionicons } from "@expo/vector-icons";
import React, { useMemo } from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import type { DayEvent, ScheduleInsight, SuggestedArrival } from "../../utils/siteScheduleHelper";
import { formatDurationLocalized } from "../../utils/siteScheduleHelper";

// ─── Types ────────────────────────────────────────────────────────────────────

interface TimeInputModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: string, options?: any) => string;
  styles: any;
  selectedDay: number;
  calculatingRoute: boolean;
  routeInfo: string;
  crossDayWarning: string | null;
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
  departureTimeFromPrev?: string;
  travelMinutes?: number;
  travelDistanceKm?: number;
  fastestArrival?: string;
  newSiteName?: string;

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
  onApplySuggestedTime?: () => void;

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
    selectedDay,
    calculatingRoute,
    routeInfo,
    crossDayWarning,
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
    departureTimeFromPrev,
    travelMinutes,
    travelDistanceKm,
    fastestArrival,
    newSiteName,
    openTime,
    closeTime,
    massTimesForDay = [],
    eventsForDay = [],
    eventStartTime,
    eventName,
    insight,
    suggestedTime,
    onApplySuggestedTime,
    isCrossDayTravel,
  } = props;
  const insets = useSafeAreaInsets();

  const hasTravelInfo = !!(departureTimeFromPrev && travelMinutes && travelMinutes > 0);

  // Show suggested time button only if suggestion differs from current
  const showSuggestButton = useMemo(() => {
    if (!suggestedTime || !onApplySuggestedTime) return false;
    return suggestedTime.time !== estimatedTime && suggestedTime.priority !== 'default';
  }, [suggestedTime, estimatedTime, onApplySuggestedTime]);

  // ── Confirm blocked when insight says time is physically impossible or cross-day travel ──
  const isConfirmBlocked = insight?.isBlocking === true || !!crossDayWarning;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20), flex: 1 }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("planner.setTime")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView 
          style={{ flex: 1 }} 
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.timeInputLabel}>
              {t("planner.addLocationDay")} {selectedDay}
            </Text>
            <Text style={styles.timeInputDescription}>
              {t("planner.setTimeDescription")}
            </Text>

            {/* ── ROUTE INFO ── */}
            {calculatingRoute ? (
              <View style={styles.routeInfoContainer}>
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>{t("planner.calculatingRoute")}</Text>
              </View>
            ) : routeInfo ? (
              <View style={styles.routeInfoContainer}>
                <Ionicons name="car-outline" size={20} color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>{routeInfo}</Text>
              </View>
            ) : null}

            {/* ── SITE SCHEDULE INFO ── */}
            {!calculatingRoute && (openTime || closeTime || massTimesForDay.length > 0 || eventsForDay.length > 0) && (
              <SiteScheduleCard
                openTime={openTime}
                closeTime={closeTime}
                massTimesForDay={massTimesForDay}
                eventsForDay={eventsForDay}
                eventStartTime={eventStartTime}
                eventName={eventName}
                t={t}
              />
            )}

            {/* ── TRAVEL TIMELINE + INSIGHT ── */}
            {!calculatingRoute && (hasTravelInfo || insight) && (
              <View style={localStyles.travelCard}>
                <Text style={localStyles.travelCardTitle}>
                  <Ionicons name="map-outline" size={14} color="#8B7355" /> {t("planner.travelAndSchedule")}
                </Text>

                {hasTravelInfo && (
                  <>
                    <TimelineRow
                      label={t("planner.leaveFrom", { name: previousSiteName || t("planner.previousStop", { defaultValue: "điểm trước" }) })}
                      time={departureTimeFromPrev!}
                      dotColor="#6B7280"
                      t={t}
                    />
                    <View style={localStyles.travelLine}>
                      <Text style={localStyles.travelLineText}>
                        🚗 {t("planner.travelTime", { time: formatDurationLocalized(travelMinutes!, t) })}
                        {travelDistanceKm
                          ? ` • ${travelDistanceKm < 1 ? `${Math.round(travelDistanceKm * 1000)} m` : `${travelDistanceKm.toFixed(1)} km`}`
                          : ""}
                      </Text>
                    </View>
                    <TimelineRow
                      label={t("planner.earliestArrival")}
                      time={fastestArrival || "—"}
                      dotColor="#D97706"
                      dotBorderColor="rgba(217, 119, 6, 0.3)"
                      t={t}
                    />
                  </>
                )}

                {/* ── INSIGHT BOX ── */}
                {insight && (
                  <View
                    style={[
                      localStyles.insightBox,
                      {
                        backgroundColor: insight.bgColor,
                        borderColor: insight.color,
                        marginTop: hasTravelInfo ? 12 : 6,
                      },
                    ]}
                  >
                    <View style={localStyles.insightHeader}>
                      <Ionicons name={insight.iconName as any} size={16} color={insight.color} />
                      <Text style={[localStyles.insightTitle, { color: insight.color }]}>
                        {insight.title}
                      </Text>
                    </View>
                    <Text
                      style={[
                        localStyles.insightMessage,
                        {
                          color:
                            insight.type === "error" ||
                            insight.type === "event_late"
                              ? "#991B1B"
                              : "#374151",
                        },
                      ]}
                    >
                      {insight.message}
                    </Text>
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

                {/* ── SUGGEST TIME BUTTON ── */}
                {showSuggestButton && suggestedTime && (
                  <TouchableOpacity
                    style={localStyles.suggestButton}
                    onPress={onApplySuggestedTime}
                    activeOpacity={0.8}
                  >
                    <Ionicons name="sparkles" size={16} color="#1D4ED8" />
                    <View style={localStyles.suggestButtonContent}>
                      <Text style={localStyles.suggestButtonText}>
                        {t("planner.suggestedTimeCta", { time: suggestedTime.time })}
                      </Text>
                      <Text style={localStyles.suggestButtonReason} numberOfLines={1}>
                        {suggestedTime.reason}
                      </Text>
                    </View>
                    <Ionicons name="chevron-forward" size={16} color="#1D4ED8" />
                  </TouchableOpacity>
                )}
              </View>
            )}

            {/* ── TIME PICKER ── */}
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: 20,
              }}
            >
              <Text style={[styles.timeInputFieldLabel, { marginBottom: 0 }]}>
                {t("planner.estimatedTimeLabel")}
              </Text>
              <TouchableOpacity
                style={localStyles.compactTimePickerBtn}
                onPress={openTimePicker}
              >
                <Ionicons name="time-outline" size={18} color={COLORS.primary} />
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
                  style={[styles.timeInputFieldLabel, { marginBottom: 0, flex: 1, marginRight: 8 }]}
                  numberOfLines={2}
                >
                  {t("planner.restDurationLabel")}
                </Text>
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
                >
                  <TouchableOpacity
                    onPress={() =>
                      setRestDuration(Math.max(60, restDuration - 15))
                    }
                    disabled={restDuration <= 60}
                    style={[
                      localStyles.stepperBtn,
                      restDuration <= 60 && { opacity: 0.4 },
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
                      setRestDuration(Math.min(240, restDuration + 15))
                    }
                    disabled={restDuration >= 240}
                    style={[
                      localStyles.stepperBtn,
                      restDuration >= 240 && { opacity: 0.4 },
                    ]}
                  >
                    <Ionicons name="add" size={20} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>
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
          </ScrollView>

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
                { marginTop: 0 }
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
                    { color: "rgba(255,255,255,0.7)" },
                  ]}
                >
                  {t("planner.selectAnotherTime")}
                </Text>
              ) : (
                <Text style={[styles.confirmButtonText, { color: COLORS.white }]}>
                  {t("planner.addToItinerary")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
        <View
          style={{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999 }}
          pointerEvents="box-none"
        >
          <Toast config={toastConfig} />
        </View>
      </View>
    </Modal>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

/** Compact card showing site opening hours, mass times, events */
function SiteScheduleCard(props: {
  openTime?: string;
  closeTime?: string;
  massTimesForDay: string[];
  eventsForDay?: DayEvent[];
  eventStartTime?: string;
  eventName?: string;
  t: (key: string, options?: any) => string;
}) {
  const { openTime, closeTime, massTimesForDay, eventsForDay = [], eventStartTime, eventName, t } = props;

  return (
    <View style={localStyles.scheduleCard}>
      <View style={localStyles.scheduleCardHeader}>
        <Ionicons name="information-circle" size={16} color="#1D4ED8" />
        <Text style={localStyles.scheduleCardTitle}>{t("planner.locationInfo")}</Text>
      </View>

      {(openTime || closeTime) && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={localStyles.scheduleRowText}>
            {t("planner.openingHours")}: {openTime || "—"} – {closeTime || "—"}
          </Text>
        </View>
      )}

      {massTimesForDay.length > 0 && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="calendar-outline" size={14} color="#8B5CF6" />
          <Text style={localStyles.scheduleRowText}>
            {t("planner.massToday", { times: massTimesForDay.join(", ") })}
          </Text>
        </View>
      )}

      {/* Show fetched events for the day */}
      {eventsForDay.length > 0 && eventsForDay.map((evt) => (
        <View key={evt.id} style={localStyles.scheduleRow}>
          <Ionicons name="star" size={14} color="#D97706" />
          <Text style={[localStyles.scheduleRowText, { fontWeight: "700", color: "#92400E" }]}>
            {t("planner.eventRange", { name: evt.name, start: evt.startTime || "—", end: evt.endTime || "—" })}
          </Text>
        </View>
      ))}

      {/* Fallback: show single event if explicitly selected but not in eventsForDay */}
      {eventStartTime && eventsForDay.length === 0 && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="star" size={14} color="#D97706" />
          <Text style={[localStyles.scheduleRowText, { fontWeight: "700", color: "#92400E" }]}>
            {t("planner.eventAt", { name: eventName || t("planner.event", { defaultValue: "Sự kiện" }), time: eventStartTime })}
          </Text>
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
          { backgroundColor: props.dotColor, borderColor: props.dotBorderColor || "#fff" },
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
  // ── Schedule Card ──
  scheduleCard: {
    backgroundColor: "rgba(29, 78, 216, 0.05)",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.15)",
    gap: 6,
  },
  scheduleCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  scheduleCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  scheduleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingLeft: 2,
  },
  scheduleRowText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
    flexShrink: 1,
  },

  // ── Travel Card ──
  travelCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 12,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.2)",
    gap: 6,
  },
  travelCardTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#8B7355",
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
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },
  travelRowTime: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1F2937",
    marginLeft: 8,
  },

  // Connecting line
  travelLine: {
    marginLeft: 4,
    borderLeftWidth: 2,
    borderLeftColor: "rgba(217, 119, 6, 0.3)",
    paddingLeft: 16,
    paddingVertical: 4,
  },
  travelLineText: {
    fontSize: 12,
    color: "#6B7280",
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
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    borderRadius: 12,
    padding: 12,
    marginTop: 10,
    gap: 10,
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
  },
  suggestButtonContent: {
    flex: 1,
  },
  suggestButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1D4ED8",
  },
  suggestButtonReason: {
    fontSize: 11,
    color: "#6B7280",
    marginTop: 2,
  },
  
  // ── New Styles ──
  compactTimePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.primary,
    borderRadius: 8,
    gap: 8,
  },
  compactTimeText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.primary,
  },
  stepperBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(29, 78, 216, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(29, 78, 216, 0.2)",
  },
  stickyFooter: {
    paddingHorizontal: 16,
    paddingTop: 12,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
  },
});
