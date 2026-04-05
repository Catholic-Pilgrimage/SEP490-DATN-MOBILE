import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
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
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import type { ScheduleInsight, SuggestedArrival } from "../../utils/siteScheduleHelper";
import { formatMinutesVi } from "../../utils/siteScheduleHelper";

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

  // ── Confirm blocked when insight says time is physically impossible ──
  const isConfirmBlocked = insight?.isBlocking === true;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("planner.setTime")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 20 }}>
          <Text style={styles.timeInputLabel}>
            {t("planner.addLocationDay")} {selectedDay}
          </Text>
          <Text style={styles.timeInputDescription}>
            Vui lòng chọn giờ dự kiến và thời gian nghỉ (tối thiểu 1 giờ).
          </Text>

          {/* ── ROUTE INFO ── */}
          {calculatingRoute ? (
            <View style={styles.routeInfoContainer}>
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
              <Text style={styles.routeInfoText}>Đang tính toán lộ trình...</Text>
            </View>
          ) : routeInfo ? (
            <View style={styles.routeInfoContainer}>
              <Ionicons name="car-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.routeInfoText}>{routeInfo}</Text>
            </View>
          ) : null}

          {/* ── SITE SCHEDULE INFO ── */}
          {!calculatingRoute && (openTime || closeTime || massTimesForDay.length > 0) && (
            <SiteScheduleCard
              openTime={openTime}
              closeTime={closeTime}
              massTimesForDay={massTimesForDay}
              eventStartTime={eventStartTime}
              eventName={eventName}
            />
          )}

          {/* ── TRAVEL TIMELINE + INSIGHT ── */}
          {!calculatingRoute && (hasTravelInfo || insight) && (
            <View style={localStyles.travelCard}>
              <Text style={localStyles.travelCardTitle}>
                <Ionicons name="map-outline" size={14} color="#8B7355" /> Di chuyển & Lịch trình
              </Text>

              {hasTravelInfo && (
                <>
                  <TimelineRow
                    label={`Rời ${previousSiteName || "điểm trước"}`}
                    time={departureTimeFromPrev!}
                    dotColor="#6B7280"
                  />
                  <View style={localStyles.travelLine}>
                    <Text style={localStyles.travelLineText}>
                      🚗 Di chuyển {formatMinutesVi(travelMinutes!)}
                      {travelDistanceKm
                        ? ` • ${travelDistanceKm < 1 ? `${Math.round(travelDistanceKm * 1000)} m` : `${travelDistanceKm.toFixed(1)} km`}`
                        : ""}
                    </Text>
                  </View>
                  <TimelineRow
                    label="Nhanh nhất có thể đến"
                    time={fastestArrival || "—"}
                    dotColor="#D97706"
                    dotBorderColor="rgba(217, 119, 6, 0.3)"
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
                      { color: insight.type === "error" || insight.type === "event_late" ? "#991B1B" : "#374151" },
                    ]}
                  >
                    {insight.message}
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
                      Đặt giờ gợi ý: {suggestedTime.time}
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

          {crossDayWarning ? (
            <View style={[styles.routeInfoContainer, { backgroundColor: "#E8F5E9" }]}>
              <Ionicons name="information-circle-outline" size={20} color="#4CAF50" />
              <Text style={[styles.routeInfoText, { color: "#4CAF50" }]}>
                {crossDayWarning}
              </Text>
            </View>
          ) : null}

          {/* ── TIME PICKER ── */}
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeInputFieldLabel}>Giờ dự kiến</Text>
            <TouchableOpacity style={styles.timePickerButton} onPress={openTimePicker}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.timePickerButtonText}>{estimatedTime}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          {/* ── REST DURATION ── */}
          <View style={styles.timeInputContainer}>
            <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
            <Text style={styles.durationValueText}>{formatDuration(restDuration)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={60}
              maximumValue={240}
              step={15}
              value={restDuration}
              onValueChange={setRestDuration}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.accent}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>1 giờ</Text>
              <Text style={styles.sliderLabelText}>4 giờ</Text>
            </View>
          </View>

          {/* ── NOTE ── */}
          <View style={styles.noteInputContainer}>
            <Text style={styles.timeInputFieldLabel}>{t("planner.noteOptional")}</Text>
            <TextInput
              style={styles.noteInput}
              placeholder={t("planner.notePlaceholder")}
              placeholderTextColor={COLORS.textTertiary}
              value={note}
              onChangeText={setNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {/* ── CONFIRM BUTTON ── */}
          <TouchableOpacity
            style={[
              styles.confirmButton,
              (addingItem || isConfirmBlocked) && styles.saveTimeButtonDisabled,
              isConfirmBlocked && { opacity: 0.5 },
            ]}
            onPress={onConfirmAdd}
            disabled={addingItem || !selectedSiteId || isConfirmBlocked}
          >
            {addingItem ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : isConfirmBlocked ? (
              <Text style={[styles.confirmButtonText, { color: COLORS.textTertiary }]}>
                Chọn giờ khác để tiếp tục
              </Text>
            ) : (
              <Text style={styles.confirmButtonText}>{t("planner.addToItinerary")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
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
  eventStartTime?: string;
  eventName?: string;
}) {
  const { openTime, closeTime, massTimesForDay, eventStartTime, eventName } = props;

  return (
    <View style={localStyles.scheduleCard}>
      <View style={localStyles.scheduleCardHeader}>
        <Ionicons name="information-circle" size={16} color="#1D4ED8" />
        <Text style={localStyles.scheduleCardTitle}>Thông tin địa điểm</Text>
      </View>

      {(openTime || closeTime) && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.textSecondary} />
          <Text style={localStyles.scheduleRowText}>
            Giờ mở cửa: {openTime || "—"} – {closeTime || "—"}
          </Text>
        </View>
      )}

      {massTimesForDay.length > 0 && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="calendar-outline" size={14} color="#8B5CF6" />
          <Text style={localStyles.scheduleRowText}>
            Thánh Lễ hôm nay: {massTimesForDay.join(", ")}
          </Text>
        </View>
      )}

      {eventStartTime && (
        <View style={localStyles.scheduleRow}>
          <Ionicons name="star" size={14} color="#D97706" />
          <Text style={[localStyles.scheduleRowText, { fontWeight: "700", color: "#92400E" }]}>
            {eventName || "Sự kiện"} lúc {eventStartTime}
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
    alignItems: "center",
    gap: 8,
    paddingLeft: 2,
  },
  scheduleRowText: {
    fontSize: 13,
    color: "#374151",
    fontWeight: "500",
    flex: 1,
  },

  // ── Travel Card ──
  travelCard: {
    backgroundColor: "#FFFBEB",
    borderRadius: 16,
    padding: 14,
    marginTop: 12,
    marginBottom: 4,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.2)",
    gap: 8,
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
    gap: 10,
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
    padding: 12,
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
});
