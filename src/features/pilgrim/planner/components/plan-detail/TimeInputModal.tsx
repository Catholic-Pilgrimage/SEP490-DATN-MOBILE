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

  // ────── NEW: Smart travel info props ──────
  /** Name of the previous site in the itinerary (for context) */
  previousSiteName?: string;
  /** Estimated departure time from previous site: estimated_time + rest_duration (format HH:MM) */
  departureTimeFromPrev?: string;
  /** Travel time from previous site in minutes (from VietMap API) */
  travelMinutes?: number;
  /** Distance from previous site in km */
  travelDistanceKm?: number;
  /** Name of the new site being added */
  newSiteName?: string;
  /** If the new site has an event, its start_time (format HH:MM) */
  eventStartTime?: string;
  /** Event name (if applicable) */
  eventName?: string;
}

/** Add minutes to HH:MM and return new HH:MM + days overflow */
const addMinutesToTime = (
  timeStr: string,
  minutes: number
): { time: string; daysAdded: number } => {
  const [h, m] = timeStr.split(":").map(Number);
  const total = h * 60 + m + minutes;
  const daysAdded = Math.floor(total / (24 * 60));
  const newH = Math.floor(total / 60) % 24;
  const newM = total % 60;
  return {
    time: `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`,
    daysAdded,
  };
};

/** Compare two HH:MM strings. Returns negative if a < b */
const compareTime = (a: string, b: string): number => {
  const [ah, am] = a.split(":").map(Number);
  const [bh, bm] = b.split(":").map(Number);
  return ah * 60 + am - (bh * 60 + bm);
};

/** Format minutes to Vietnamese duration */
const fmtMinutes = (min: number): string => {
  if (min < 60) return `${min} phút`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
};

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
    // New props
    previousSiteName,
    departureTimeFromPrev,
    travelMinutes,
    travelDistanceKm,
    newSiteName,
    eventStartTime,
    eventName,
  } = props;
  const insets = useSafeAreaInsets();

  // ────── SMART TRAVEL SUMMARY ──────
  const travelSummary = useMemo(() => {
    if (!departureTimeFromPrev || !travelMinutes || travelMinutes <= 0)
      return null;

    // Thời gian dự kiến đến (không buffer)
    const arrivalRaw = addMinutesToTime(departureTimeFromPrev, travelMinutes);
    // Thời gian dự kiến đến + 30 phút buffer
    const BUFFER_MINUTES = 30;
    const arrivalWithBuffer = addMinutesToTime(
      departureTimeFromPrev,
      travelMinutes + BUFFER_MINUTES
    );
    // Thời gian dự kiến rời khỏi điểm mới = đến + restDuration
    const departNewSite = addMinutesToTime(
      arrivalWithBuffer.time,
      restDuration
    );

    // Check trễ lễ / sự kiện
    let lateWarning: string | null = null;
    if (eventStartTime) {
      const diff = compareTime(arrivalWithBuffer.time, eventStartTime);
      if (diff > 0) {
        lateWarning = `⚠️ Bạn sẽ đến muộn ${fmtMinutes(diff)} so với giờ lễ/sự kiện (${eventStartTime}). Hãy xuất phát sớm hơn hoặc giảm thời gian nghỉ tại điểm trước.`;
      } else if (diff > -15) {
        // Arrive less than 15 minutes before event
        lateWarning = `⏰ Bạn sẽ đến chỉ trước giờ lễ ${Math.abs(diff)} phút. Nên chuẩn bị sớm hơn để tìm chỗ ngồi.`;
      }
    }

    return {
      departureTime: departureTimeFromPrev,
      arrivalTime: arrivalRaw.time,
      arrivalTimeWithBuffer: arrivalWithBuffer.time,
      bufferMinutes: BUFFER_MINUTES,
      departNewSiteTime: departNewSite.time,
      crossDay: arrivalWithBuffer.daysAdded > 0,
      lateWarning,
    };
  }, [departureTimeFromPrev, travelMinutes, restDuration, eventStartTime]);

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

          {/* ── ROUTE INFO (DISTANCE/TIME) ── */}
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

          {/* ── SMART TRAVEL BREAKDOWN ── */}
          {travelSummary && !calculatingRoute && (
            <View style={localStyles.travelCard}>
              <Text style={localStyles.travelCardTitle}>
                <Ionicons name="time-outline" size={14} color="#8B7355" /> Lịch trình di chuyển
              </Text>

              {/* Previous site → Departure */}
              <View style={localStyles.travelRow}>
                <View style={[localStyles.travelDot, { backgroundColor: "#6B7280" }]} />
                <View style={localStyles.travelRowContent}>
                  <Text style={localStyles.travelRowLabel}>
                    Rời {previousSiteName || "điểm trước"}
                  </Text>
                  <Text style={localStyles.travelRowTime}>
                    {travelSummary.departureTime}
                  </Text>
                </View>
              </View>

              {/* Travel line */}
              <View style={localStyles.travelLine}>
                <Text style={localStyles.travelLineText}>
                  🚗 Di chuyển {fmtMinutes(travelMinutes!)}
                  {travelDistanceKm
                    ? ` • ${travelDistanceKm < 1 ? `${Math.round(travelDistanceKm * 1000)} m` : `${travelDistanceKm.toFixed(1)} km`}`
                    : ""}
                </Text>
              </View>

              {/* Arrival (raw) */}
              <View style={localStyles.travelRow}>
                <View style={[localStyles.travelDot, { backgroundColor: "#D97706" }]} />
                <View style={localStyles.travelRowContent}>
                  <Text style={localStyles.travelRowLabel}>
                    Dự kiến đến {newSiteName || "điểm mới"}
                  </Text>
                  <Text style={localStyles.travelRowTime}>
                    {travelSummary.arrivalTime}
                  </Text>
                </View>
              </View>

              {/* Buffer info */}
              <View style={localStyles.bufferBadge}>
                <Ionicons name="shield-checkmark-outline" size={14} color="#059669" />
                <Text style={localStyles.bufferText}>
                  + {travelSummary.bufferMinutes} phút dự phòng → Nên đến trước{" "}
                  <Text style={localStyles.bufferTime}>
                    {travelSummary.arrivalTimeWithBuffer}
                  </Text>
                </Text>
              </View>

              {/* Cross-day warning */}
              {travelSummary.crossDay && (
                <View style={localStyles.warningBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={localStyles.warningText}>
                    Thời gian di chuyển vượt qua ngày hiện tại!
                  </Text>
                </View>
              )}

              {/* Event late warning */}
              {travelSummary.lateWarning && (
                <View style={localStyles.warningBox}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={localStyles.warningText}>
                    {travelSummary.lateWarning}
                  </Text>
                </View>
              )}

              {/* Event time info */}
              {eventStartTime && !travelSummary.lateWarning && (
                <View style={localStyles.eventInfoBox}>
                  <Ionicons name="calendar-outline" size={14} color="#1D4ED8" />
                  <Text style={localStyles.eventInfoText}>
                    {eventName ? `${eventName}: ` : "Giờ lễ/sự kiện: "}
                    {eventStartTime} — Bạn sẽ đến đúng giờ ✓
                  </Text>
                </View>
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

          <View style={styles.timeInputContainer}>
            <Text style={styles.timeInputFieldLabel}>Giờ dự kiến</Text>
            <TouchableOpacity style={styles.timePickerButton} onPress={openTimePicker}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.timePickerButtonText}>{estimatedTime}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

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

          <TouchableOpacity
            style={[styles.confirmButton, addingItem && styles.saveTimeButtonDisabled]}
            onPress={onConfirmAdd}
            disabled={addingItem || !selectedSiteId}
          >
            {addingItem ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.confirmButtonText}>{t("planner.addToItinerary")}</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
        <View style={{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: 9999, elevation: 9999 }} pointerEvents="box-none">
          <Toast config={toastConfig} />
        </View>
      </View>
    </Modal>
  );
}

const localStyles = StyleSheet.create({
  // ── SMART TRAVEL CARD ──
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

  // Buffer badge
  bufferBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(5, 150, 105, 0.08)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    marginTop: 4,
  },
  bufferText: {
    fontSize: 12,
    color: "#065F46",
    fontWeight: "500",
    flex: 1,
  },
  bufferTime: {
    fontWeight: "800",
    color: "#059669",
  },

  // Warnings
  warningBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    backgroundColor: "#FEF2F2",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  warningText: {
    fontSize: 12,
    color: "#991B1B",
    fontWeight: "600",
    flex: 1,
    lineHeight: 18,
  },

  // Event on-time info
  eventInfoBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(29, 78, 216, 0.06)",
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  eventInfoText: {
    fontSize: 12,
    color: "#1D4ED8",
    fontWeight: "500",
    flex: 1,
  },
});
