import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
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
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { CreatePlanRequest } from "../../../../types/pilgrim/planner.types";

// Helper functions for calendar
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};

const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};

const generateCalendarDays = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];

  // Add empty cells for days before the first day of month
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Add actual days
  for (let i = 1; i <= daysInMonth; i++) {
    days.push(i);
  }

  return days;
};

const CreatePlanScreen = ({ navigation }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Form State
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState<string>(() => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1); // Start from tomorrow
    return tomorrow.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    const end = new Date();
    end.setDate(end.getDate() + 4); // Tomorrow + 3 days
    return end.toISOString().split("T")[0];
  });

  // Date picker modal states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  // Calendar navigation states
  const [startCalendarDate, setStartCalendarDate] = useState(
    () => new Date(startDate),
  );
  const [endCalendarDate, setEndCalendarDate] = useState(
    () => new Date(endDate),
  );

  // Extra fields to satisfy API
  const [peopleCount, setPeopleCount] = useState(1);
  const [transportation, setTransportation] = useState("bus"); // Default bus

  const [loading, setLoading] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert(
        t("common.error"),
        t("planner.nameRequired", {
          defaultValue: "Please enter a name for your plan",
        }),
      );
      return;
    }

    try {
      setLoading(true);
      if (new Date(startDate) >= new Date(endDate)) {
        Alert.alert(t("common.error"), t("planner.dateError", { defaultValue: "Ngày kết thúc phải sau ngày bắt đầu" }));
        setLoading(false);
        return;
      }

      // Payload construction
      const payload: CreatePlanRequest = {
        name,
        start_date: startDate,
        end_date: endDate,
        number_of_people: peopleCount,
        transportation,
      };

      const response = await pilgrimPlannerApi.createPlan(payload);

      if (response.success) {
        // Success
        Alert.alert(
          t("common.success"),
          t("planner.createSuccess", {
            defaultValue: "Plan created successfully!",
          }),
        );
        navigation.goBack();
      } else {
        throw new Error(response.message || t("planner.createFailed", { defaultValue: "Tạo kế hoạch thất bại" }));
      }
    } catch (error: any) {
      console.error("Create plan error:", error);
      Alert.alert(
        t("common.error"),
        error.message ||
        t("planner.createError", {
          defaultValue: "Không thể tạo kế hoạch. Vui lòng thử lại.",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" />

        {/* Background Pattern */}
        <View style={styles.backgroundPattern} pointerEvents="none" />

        {/* Header */}
        <View style={[styles.header, { marginTop: insets.top }]}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.cancelText}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{t("planner.newPilgrimage", { defaultValue: "Lên kế hoạch Hành Hương" })}</Text>
          <View style={{ width: 60 }} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Name */}
          <View style={styles.section}>
            <Text style={styles.label}>{t("planner.nameJourney", { defaultValue: "Tên chuyến đi" })}</Text>
            <TextInput
              style={styles.input}
              placeholder={t("planner.namePlaceholder", { defaultValue: "Ví dụ: Hành hương Đức Mẹ La Vang 2024" })}
              placeholderTextColor={COLORS.textSecondary}
              value={name}
              onChangeText={setName}
            />
          </View>

          {/* Section 2: Start Date Picker */}
          <View style={styles.section}>
            <Text style={styles.label}>{t("planner.startDate", { defaultValue: "Ngày bắt đầu" })}</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowStartPicker(!showStartPicker)}
            >
              <View style={styles.dateDisplayRow}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={COLORS.accent}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.dateDisplayLabel}>{t("planner.selectedDate", { defaultValue: "Ngày chọn" })}</Text>
                  <Text style={styles.dateDisplayValue}>
                    {new Date(startDate).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={showStartPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.textSecondary}
                  style={{ marginLeft: "auto" }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <View style={[styles.section, styles.calendarContainer]}>
              <View style={styles.calendarCard}>
                {/* Month Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(startCalendarDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setStartCalendarDate(newDate);
                    }}
                    style={styles.calendarNavButton}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={COLORS.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthText}>
                    {startCalendarDate.toLocaleDateString("vi-VN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(startCalendarDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setStartCalendarDate(newDate);
                    }}
                    style={styles.calendarNavButton}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={COLORS.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Day Headers */}
                <View style={styles.calendarDaysHeader}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <Text key={i} style={styles.calendarDayHeaderText}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {generateCalendarDays(
                    startCalendarDate.getFullYear(),
                    startCalendarDate.getMonth(),
                  ).map((day, index) => {
                    if (day === null) {
                      return null;
                    }

                    const dateStr = `${startCalendarDate.getFullYear()}-${String(
                      startCalendarDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = dateStr === startDate;
                    const today = new Date().toISOString().split("T")[0];
                    const isToday = dateStr === today;
                    const isPast = new Date(dateStr) <= new Date(today);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isPast && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            setStartDate(dateStr);
                            setShowStartPicker(false);
                          }
                        }}
                        disabled={isPast}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday &&
                            !isSelected &&
                            styles.calendarDayTextToday,
                            isPast && styles.calendarDayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Section 3: End Date Picker */}
          <View style={styles.section}>
            <Text style={styles.label}>{t("planner.endDate", { defaultValue: "Ngày kết thúc" })}</Text>
            <TouchableOpacity
              style={styles.card}
              onPress={() => setShowEndPicker(!showEndPicker)}
            >
              <View style={styles.dateDisplayRow}>
                <Ionicons
                  name="calendar-outline"
                  size={24}
                  color={COLORS.accent}
                />
                <View style={{ marginLeft: 12 }}>
                  <Text style={styles.dateDisplayLabel}>{t("planner.selectedDate", { defaultValue: "Ngày chọn" })}</Text>
                  <Text style={styles.dateDisplayValue}>
                    {new Date(endDate).toLocaleDateString("vi-VN", {
                      weekday: "short",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </Text>
                </View>
                <Ionicons
                  name={showEndPicker ? "chevron-up" : "chevron-down"}
                  size={20}
                  color={COLORS.textSecondary}
                  style={{ marginLeft: "auto" }}
                />
              </View>
            </TouchableOpacity>
          </View>

          {showEndPicker && (
            <View style={[styles.section, styles.calendarContainer]}>
              <View style={styles.calendarCard}>
                {/* Month Navigation */}
                <View style={styles.calendarHeader}>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(endCalendarDate);
                      newDate.setMonth(newDate.getMonth() - 1);
                      setEndCalendarDate(newDate);
                    }}
                    style={styles.calendarNavButton}
                  >
                    <Ionicons
                      name="chevron-back"
                      size={24}
                      color={COLORS.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.calendarMonthText}>
                    {endCalendarDate.toLocaleDateString("vi-VN", {
                      month: "long",
                      year: "numeric",
                    })}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      const newDate = new Date(endCalendarDate);
                      newDate.setMonth(newDate.getMonth() + 1);
                      setEndCalendarDate(newDate);
                    }}
                    style={styles.calendarNavButton}
                  >
                    <Ionicons
                      name="chevron-forward"
                      size={24}
                      color={COLORS.textPrimary}
                    />
                  </TouchableOpacity>
                </View>

                {/* Day Headers */}
                <View style={styles.calendarDaysHeader}>
                  {["S", "M", "T", "W", "T", "F", "S"].map((day, i) => (
                    <Text key={i} style={styles.calendarDayHeaderText}>
                      {day}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.calendarGrid}>
                  {generateCalendarDays(
                    endCalendarDate.getFullYear(),
                    endCalendarDate.getMonth(),
                  ).map((day, index) => {
                    if (day === null) {
                      return null;
                    }

                    const dateStr = `${endCalendarDate.getFullYear()}-${String(
                      endCalendarDate.getMonth() + 1,
                    ).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                    const isSelected = dateStr === endDate;
                    const today = new Date().toISOString().split("T")[0];
                    const isToday = dateStr === today;
                    const isPast = new Date(dateStr) <= new Date(today);

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isPast && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          if (!isPast) {
                            setEndDate(dateStr);
                            setShowEndPicker(false);
                          }
                        }}
                        disabled={isPast}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday &&
                            !isSelected &&
                            styles.calendarDayTextToday,
                            isPast && styles.calendarDayTextDisabled,
                          ]}
                        >
                          {day}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>
          )}

          {/* Section 4: Participants & Transport (API Requirement) */}
          <View style={[styles.section, { flexDirection: "row", gap: 12 }]}>
            {/* People Counter */}
            <View style={[styles.card, { flex: 1, padding: 12 }]}>
              <Text style={styles.labelSmall}>{t("planner.pilgrimsLabel", { defaultValue: "Số người" })}</Text>
              <View style={styles.counterRow}>
                <TouchableOpacity
                  onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons
                    name="remove"
                    size={16}
                    color={COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <Text style={styles.counterValue}>{peopleCount}</Text>
                <TouchableOpacity
                  onPress={() => setPeopleCount(Math.min(50, peopleCount + 1))}
                  style={styles.counterBtn}
                >
                  <Ionicons name="add" size={16} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Transport Selector (Simplified) */}
            <View style={[styles.card, { flex: 1, padding: 12 }]}>
              <Text style={styles.labelSmall}>{t("planner.transportLabel", { defaultValue: "Phương tiện" })}</Text>
              <View style={styles.transportRow}>
                {(["bus", "car", "walk"] as const).map((t) => (
                  <TouchableOpacity
                    key={t}
                    style={[
                      styles.transportIcon,
                      transportation === t && styles.transportIconSelected,
                    ]}
                    onPress={() => setTransportation(t)}
                  >
                    <Ionicons
                      name={t === "bus" ? "bus" : t === "car" ? "car" : "walk"}
                      size={20}
                      color={
                        transportation === t
                          ? COLORS.white
                          : COLORS.textSecondary
                      }
                    />
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

          <View style={{ height: 100 }} />
        </ScrollView>

        {/* Footer */}
        <View
          style={[
            styles.footer,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.createButton, loading && { opacity: 0.7 }]}
            onPress={handleCreate}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.createButtonText}>{t("planner.createPlanBtn", { defaultValue: "Tạo và Lên lịch trình" })}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  backgroundPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
    backgroundColor: "transparent",
    // Add pattern styling/image here if available
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  cancelButton: {
    padding: 8,
    marginLeft: -8,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  content: {
    padding: SPACING.lg,
  },
  section: {
    marginBottom: SPACING.lg,
  },
  label: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  labelSmall: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 56,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    ...SHADOWS.subtle,
  },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.md,
    ...SHADOWS.subtle,
  },
  // Date Display Styling
  dateDisplayRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.xs,
  },
  dateDisplayLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  dateDisplayValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  // Calendar Styling
  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  monthText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  iconButtonSmall: {
    padding: 4,
  },
  daysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
    paddingHorizontal: 12, // Align roughly with day buttons
  },
  dayHeader: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textTertiary,
    width: 36,
    textAlign: "center",
  },
  dayButton: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: 3, // Spacing
  },
  dayButtonSelected: {
    backgroundColor: COLORS.accent,
    shadowColor: COLORS.accent,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  dayDate: {
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  dayDateSelected: {
    color: COLORS.white, // Or contrast color
    fontWeight: "bold",
  },

  // Slider Styling
  sliderHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  durationValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.accent,
  },
  durationUnit: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabelMin: { fontSize: 12, color: COLORS.textTertiary },
  sliderLabelMax: { fontSize: 12, color: COLORS.textTertiary },

  // Budget Styling
  budgetContainer: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.03)", // Light gray bg
    padding: 4,
    borderRadius: BORDER_RADIUS.lg,
  },
  budgetOption: {
    flex: 1,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: BORDER_RADIUS.md,
  },
  budgetOptionSelected: {
    backgroundColor: COLORS.white,
    shadowColor: "black",
    shadowOpacity: 0.05,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 2,
    elevation: 1,
  },
  budgetOptionText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  budgetOptionTextSelected: {
    color: COLORS.textPrimary,
    fontWeight: "600",
  },

  // Counter & Transport
  counterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    padding: 4,
  },
  counterBtn: {
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.sm,
    ...SHADOWS.subtle,
  },
  counterValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  transportRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  transportIcon: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.background,
  },
  transportIconSelected: {
    backgroundColor: COLORS.accent,
  },

  // Full Calendar Styles
  calendarContainer: {
    marginTop: -SPACING.sm,
  },
  calendarCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: COLORS.border,
    padding: SPACING.lg,
    ...SHADOWS.subtle,
  },
  calendarHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  calendarNavButton: {
    padding: SPACING.xs,
  },
  calendarMonthText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  calendarDaysHeader: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginBottom: SPACING.sm,
  },
  calendarDayHeaderText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    width: 40,
    textAlign: "center",
  },
  calendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  calendarDay: {
    width: "14.28%", // 7 days in a week
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.xs,
  },
  calendarDaySelected: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
  },
  calendarDayToday: {
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
  },
  calendarDayText: {
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  calendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  calendarDayTextToday: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  calendarDayDisabled: {
    opacity: 0.3,
  },
  calendarDayTextDisabled: {
    color: COLORS.textTertiary,
  },

  // Privacy
  privacyCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  helperText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    gap: SPACING.md,
  },
  createButton: {
    backgroundColor: COLORS.accent,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.medium,
  },
  createButtonText: {
    color: COLORS.textPrimary, // Mockup has dark text on yellow
    fontSize: 16,
    fontWeight: "bold",
  },
  draftButton: {
    backgroundColor: "transparent",
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  draftButtonText: {
    color: COLORS.textSecondary,
    fontSize: 16,
    fontWeight: "600",
  },
});

export default CreatePlanScreen;
