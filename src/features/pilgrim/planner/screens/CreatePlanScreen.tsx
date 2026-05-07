import { Ionicons } from "@expo/vector-icons";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";
import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
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
import Toast from "react-native-toast-message";
import type { PlannerStackParamList } from "../../../../navigation/pilgrimNavigation.types";
import { CreatePlanRequest } from "../../../../types/pilgrim/planner.types";
import {
  isValidGroupDepositVnd,
  isValidGroupPenaltyPercent,
  MAX_DEPOSIT_VND,
  MAX_GROUP_PENALTY_PERCENT,
  MIN_DEPOSIT_VND,
  MIN_GROUP_PENALTY_PERCENT,
  parsePenaltyPercent,
  parseVndInteger,
} from "../utils/depositInput.utils";
import { MIN_GROUP_MIN_PEOPLE_REQUIRED } from "../utils/groupMinPeople.utils";

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

/** Ngày local YYYY-MM-DD — trùng cách BE validate DATEONLY */
function toLocalYMD(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function parseYMDLocal(ymd: string): Date {
  const [y, mo, da] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, da);
}

function addDaysToYMD(ymd: string, days: number): string {
  const d = parseYMDLocal(ymd);
  d.setDate(d.getDate() + days);
  return toLocalYMD(d);
}

function tomorrowYMD(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalYMD(d);
}

function inclusiveTripDays(startYMD: string, endYMD: string): number {
  const a = parseYMDLocal(startYMD).getTime();
  const b = parseYMDLocal(endYMD).getTime();
  if (b < a) return 0;
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24)) + 1;
}

type CreatePlanProps = NativeStackScreenProps<PlannerStackParamList, "CreatePlanScreen">;

const CreatePlanScreen = ({ navigation, route }: CreatePlanProps) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  useEffect(() => {
    // Attempt to hide bottom tab
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "flex" },
      });
    };
  }, [navigation]);

  const [name, setName] = useState("");

  const [startDate, setStartDate] = useState(() => tomorrowYMD());
  const [endDate, setEndDate] = useState(() =>
    addDaysToYMD(tomorrowYMD(), 3),
  );

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);

  const [startCalendarDate, setStartCalendarDate] = useState(() => {
    const t0 = parseYMDLocal(tomorrowYMD());
    return new Date(t0.getFullYear(), t0.getMonth(), 1);
  });
  const [endCalendarDate, setEndCalendarDate] = useState(() => {
    const t0 = parseYMDLocal(addDaysToYMD(tomorrowYMD(), 3));
    return new Date(t0.getFullYear(), t0.getMonth(), 1);
  });

  const [peopleCount, setPeopleCount] = useState(1);
  /** Nhóm: số người tối thiểu cần có (2 … number_of_people) */
  const [minPeopleRequired, setMinPeopleRequired] = useState(2);
  const [showGroupFlowInfo, setShowGroupFlowInfo] = useState(false);
  const [showDepositInfo, setShowDepositInfo] = useState(false);
  const [showMinPeopleInfo, setShowMinPeopleInfo] = useState(false);
  /** BE: motorbike | car | bus */
  const [transportation, setTransportation] = useState<"bus" | "car" | "motorbike">(
    "bus",
  );

  const [depositAmountInput, setDepositAmountInput] = useState("");
  const [penaltyPercentInput, setPenaltyPercentInput] = useState("10");
  const [formErrors, setFormErrors] = useState<{
    name?: string;
    deposit?: string;
    penalty?: string;
    minPeople?: string;
  }>({});

  const [loading, setLoading] = useState(false);

  /** Clone từ bài cộng đồng: điền form giống flow modal cũ. */
  useEffect(() => {
    const p = route.params;
    if (!p?.cloneSourcePlanId) return;

    setName(p.prefillName);
    setStartDate(p.prefillStartDate);
    setEndDate(p.prefillEndDate);
    setPeopleCount(Math.max(1, p.prefillPeople));
    const tr = p.prefillTransportation;
    if (tr === "bus" || tr === "car" || tr === "motorbike") {
      setTransportation(tr);
    }
    if (p.prefillPeople > 1) {
      setDepositAmountInput(String(Math.max(0, Math.round(p.prefillDeposit))));
      setPenaltyPercentInput(String(Math.max(0, Math.round(p.prefillPenalty))));
    } else {
      setDepositAmountInput("");
      setPenaltyPercentInput("10");
    }
    setMinPeopleRequired((m) =>
      p.prefillPeople > 1
        ? Math.min(
            p.prefillPeople,
            Math.max(MIN_GROUP_MIN_PEOPLE_REQUIRED, m),
          )
        : m,
    );

    const ds = parseYMDLocal(p.prefillStartDate);
    setStartCalendarDate(new Date(ds.getFullYear(), ds.getMonth(), 1));
    const de = parseYMDLocal(p.prefillEndDate);
    setEndCalendarDate(new Date(de.getFullYear(), de.getMonth(), 1));
  }, [route.params]);

  const showErrorToast = (message: string) => {
    Toast.show({
      type: "error",
      text1: t("common.error"),
      text2: message,
    });
  };

  const showSuccessToast = (message: string) => {
    Toast.show({
      type: "success",
      text1: t("common.success"),
      text2: message,
    });
  };

  useEffect(() => {
    if (endDate < startDate) {
      setEndDate(startDate);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    if (peopleCount <= 1) {
      setFormErrors((prev) => ({
        ...prev,
        deposit: undefined,
        penalty: undefined,
        minPeople: undefined,
      }));
    } else {
      setMinPeopleRequired((m) =>
        Math.min(peopleCount, Math.max(MIN_GROUP_MIN_PEOPLE_REQUIRED, m)),
      );
    }
  }, [peopleCount]);

  const handleCreate = async () => {
    setFormErrors({});

    if (!name.trim()) {
      setFormErrors((prev) => ({
        ...prev,
        name: t("planner.nameRequired", {
          defaultValue: "Vui lòng nhập tên cho kế hoạch",
        }),
      }));
      return;
    }

    const minStart = tomorrowYMD();
    if (startDate < minStart) {
      showErrorToast(
        t("planner.startDateTomorrowRule", {
          defaultValue: "Ngày bắt đầu phải từ ngày mai trở đi (theo quy định hệ thống).",
        }),
      );
      return;
    }

    if (endDate < startDate) {
      showErrorToast(
        t("planner.endDateMustAfterStart", {
          defaultValue: "Ngày kết thúc phải sau hoặc trùng ngày bắt đầu.",
        }),
      );
      return;
    }

    const tripDays = inclusiveTripDays(startDate, endDate);
    if (tripDays > 30) {
      showErrorToast(
        t("planner.maxTripDays", {
          defaultValue: "Chuyến không được quá 30 ngày (tính cả ngày đi và ngày về).",
        }),
      );
      return;
    }

    let depositVnd: number | undefined;
    let penaltyPct: number | undefined;
    if (peopleCount > 1) {
      const dep = parseVndInteger(depositAmountInput);
      if (!isValidGroupDepositVnd(dep)) {
        setFormErrors((prev) => ({
          ...prev,
          deposit: t("planner.depositOutOfRange", {
            min: MIN_DEPOSIT_VND,
            max: MAX_DEPOSIT_VND,
            defaultValue:
              "Cọc từ {{min}} đến {{max}} VNĐ (bội số 1.000, theo quy định).",
          }),
        }));
        return;
      }
      const pen = parsePenaltyPercent(penaltyPercentInput);
      if (!isValidGroupPenaltyPercent(pen)) {
        setFormErrors((prev) => ({
          ...prev,
          penalty: t("planner.penaltyOutOfGroupRange", {
            min: MIN_GROUP_PENALTY_PERCENT,
            max: MAX_GROUP_PENALTY_PERCENT,
            defaultValue: "Tỷ lệ phạt từ {{min}}% đến {{max}}%.",
          }),
        }));
        return;
      }
      if (
        !Number.isInteger(minPeopleRequired) ||
        minPeopleRequired < MIN_GROUP_MIN_PEOPLE_REQUIRED ||
        minPeopleRequired > peopleCount
      ) {
        setFormErrors((prev) => ({
          ...prev,
          minPeople: t("planner.minPeopleInvalid", {
            min: MIN_GROUP_MIN_PEOPLE_REQUIRED,
            defaultValue: "Minimum must be at least 2 and at most the group size.",
          }),
        }));
        return;
      }
      depositVnd = dep;
      penaltyPct = pen;
    }

    try {
      setLoading(true);

      const payload: CreatePlanRequest = {
        name: name.trim(),
        number_of_people: peopleCount,
        transportation,
        start_date: startDate,
        end_date: endDate,
        ...(peopleCount > 1 && depositVnd !== undefined && penaltyPct !== undefined
          ? {
              deposit_amount: depositVnd,
              penalty_percentage: penaltyPct,
              min_people_required: minPeopleRequired,
            }
          : {}),
      };

      const cloneId = route.params?.cloneSourcePlanId;
      const response = cloneId
        ? await pilgrimPlannerApi.clonePlanner(cloneId, payload)
        : await pilgrimPlannerApi.createPlan(payload);

      if (response && response.success) {
        if (cloneId) {
          showSuccessToast(
            t("planner.cloneSuccess", { defaultValue: "Đã tạo bản sao hành trình!" }),
          );
          // Navigate đến tab Lịch trình sau khi clone — hoạt động đúng dù
          // CreatePlanScreen được mở từ PlannerStack hay CommunityStack.
          navigation.navigate("Lich trinh" as never, { screen: "PlannerMain" } as never);
        } else {
          showSuccessToast(
            t("planner.createSuccess", {
              defaultValue: "Đã tạo kế hoạch thành công!",
            }),
          );
          navigation.goBack();
        }
      } else {
        showErrorToast(
          response?.message ||
            (cloneId
              ? t("planner.cloneError", { defaultValue: "Không thể sao chép hành trình." })
              : t("planner.createFailed", {
                  defaultValue: "Tạo kế hoạch thất bại",
                })),
        );
        return;
      }
    } catch (error: any) {
      showErrorToast(
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
        <View style={styles.backgroundPattern} pointerEvents="none">
          <Ionicons
            name="compass-outline"
            size={300}
            color={COLORS.textTertiary}
            style={{ opacity: 0.1, position: "absolute", top: -50, right: -50 }}
          />
        </View>

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
          <Text style={styles.headerTitle}>{t("planner.newJourney")}</Text>
          <View style={styles.headerRightSpacer} />
        </View>

        <ScrollView
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* Section 1: Name */}
          <View style={styles.section}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Ionicons name="trail-sign" size={20} color="#D97706" />
              <Text style={[styles.label, { marginBottom: 0 }]}>
                {t("planner.journeyName")}
              </Text>
            </View>
            <TextInput
              style={[styles.input, !!formErrors.name && styles.inputError]}
              placeholder="Ví dụ: Hành hương Đức Mẹ La Vang..."
              placeholderTextColor={COLORS.textTertiary}
              value={name}
              onChangeText={(v) => {
                setName(v);
                if (formErrors.name) {
                  setFormErrors((prev) => ({ ...prev, name: undefined }));
                }
              }}
            />
            {!!formErrors.name && <Text style={styles.fieldErrorText}>{formErrors.name}</Text>}
          </View>

          {/* Time Calculation */}
          {(() => {
            const diffTime = Math.abs(
              new Date(endDate).getTime() - new Date(startDate).getTime(),
            );
            const diffNights = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            const diffDays = diffNights + 1;

            return (
              <>
                {/* Section 2: Time block */}
                <View style={styles.section}>
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: SPACING.sm,
                      justifyContent: "space-between",
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      <Ionicons name="calendar" size={20} color="#D97706" />
                      <Text style={[styles.label, { marginBottom: 0 }]}>
                        Thời gian hành hương
                      </Text>
                    </View>
                    <View style={styles.durationBadge}>
                      <Text style={styles.durationBadgeText}>
                        {diffDays} Ngày {diffNights} Đêm
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.card,
                      { flexDirection: "row", padding: 0, overflow: "hidden" },
                    ]}
                  >
                    {/* Start Date */}
                    <TouchableOpacity
                      style={{
                        flex: 1,
                        padding: SPACING.md,
                        borderRightWidth: 1,
                        borderRightColor: COLORS.border,
                      }}
                      onPress={() => {
                        setShowStartPicker(!showStartPicker);
                        setShowEndPicker(false);
                      }}
                    >
                      <Text style={styles.dateDisplayLabel}>Ngày đi</Text>
                      <Text style={styles.dateDisplayValue}>
                        {new Date(startDate).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={styles.dateDisplaySub}>
                        (
                        {new Date(startDate).toLocaleDateString("vi-VN", {
                          weekday: "short",
                        })}
                        )
                      </Text>
                    </TouchableOpacity>

                    {/* Arrow */}
                    <View
                      style={{
                        justifyContent: "center",
                        alignItems: "center",
                        width: 40,
                        backgroundColor: "#F9FAFB",
                      }}
                    >
                      <Ionicons
                        name="arrow-forward"
                        size={20}
                        color={COLORS.textTertiary}
                      />
                    </View>

                    {/* End Date */}
                    <TouchableOpacity
                      style={{ flex: 1, padding: SPACING.md }}
                      onPress={() => {
                        setShowEndPicker(!showEndPicker);
                        setShowStartPicker(false);
                      }}
                    >
                      <Text style={styles.dateDisplayLabel}>Ngày về</Text>
                      <Text style={styles.dateDisplayValue}>
                        {new Date(endDate).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </Text>
                      <Text style={styles.dateDisplaySub}>
                        (
                        {new Date(endDate).toLocaleDateString("vi-VN", {
                          weekday: "short",
                        })}
                        )
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            );
          })()}

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
                    const today = toLocalYMD(new Date());
                    const isToday = dateStr === today;
                    const minSelectable = tomorrowYMD();
                    const isBeforeRule = dateStr < minSelectable;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isBeforeRule && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          if (!isBeforeRule) {
                            setStartDate(dateStr);
                            setShowStartPicker(false);
                          }
                        }}
                        disabled={isBeforeRule}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday &&
                              !isSelected &&
                              styles.calendarDayTextToday,
                            isBeforeRule && styles.calendarDayTextDisabled,
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
                    const today = toLocalYMD(new Date());
                    const isToday = dateStr === today;
                    const isBeforeStart = dateStr < startDate;

                    return (
                      <TouchableOpacity
                        key={index}
                        style={[
                          styles.calendarDay,
                          isSelected && styles.calendarDaySelected,
                          isToday && !isSelected && styles.calendarDayToday,
                          isBeforeStart && styles.calendarDayDisabled,
                        ]}
                        onPress={() => {
                          if (!isBeforeStart) {
                            setEndDate(dateStr);
                            setShowEndPicker(false);
                          }
                        }}
                        disabled={isBeforeStart}
                      >
                        <Text
                          style={[
                            styles.calendarDayText,
                            isSelected && styles.calendarDayTextSelected,
                            isToday &&
                              !isSelected &&
                              styles.calendarDayTextToday,
                            isBeforeStart && styles.calendarDayTextDisabled,
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

          {/* Section 4: Participants */}
          <View style={styles.section}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Ionicons name="people" size={20} color="#D97706" />
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Số lượng người tham gia
              </Text>
              <TouchableOpacity
                onPress={() => setShowGroupFlowInfo(true)}
                style={styles.infoIconButton}
              >
                <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <View style={[styles.card, { padding: SPACING.md }]}>
              <View
                style={[
                  styles.counterRow,
                  { backgroundColor: "transparent", padding: 0 },
                ]}
              >
                <Text
                  style={{
                    fontSize: 16,
                    color: COLORS.textPrimary,
                    fontWeight: "600",
                  }}
                >
                  Số người đi
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 16,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}
                    style={styles.counterBtnOutline}
                  >
                    <Ionicons
                      name="remove"
                      size={18}
                      color={COLORS.textPrimary}
                    />
                  </TouchableOpacity>
                  <Text style={styles.counterValueBig}>{peopleCount}</Text>
                  <TouchableOpacity
                    onPress={() =>
                      setPeopleCount(Math.min(50, peopleCount + 1))
                    }
                    style={styles.counterBtnOutline}
                  >
                    <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              {peopleCount > 1 ? (
                <View
                  style={{
                    marginTop: SPACING.md,
                    paddingTop: SPACING.md,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                  }}
                >
                  <View
                    style={[
                      styles.counterRow,
                      { backgroundColor: "transparent", padding: 0 },
                    ]}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        flex: 1,
                        minWidth: 0,
                        paddingRight: 8,
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          flex: 1,
                          flexShrink: 1,
                          fontSize: 16,
                          color: COLORS.textPrimary,
                          fontWeight: "600",
                        }}
                      >
                        {t("planner.minPeopleRequiredLabel", {
                          defaultValue: "Minimum people to finalize",
                        })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowMinPeopleInfo(true)}
                        style={styles.infoIconButton}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                      >
                        <Ionicons
                          name="information-circle-outline"
                          size={20}
                          color={COLORS.textSecondary}
                        />
                      </TouchableOpacity>
                    </View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 16,
                      }}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setMinPeopleRequired((m) =>
                            Math.max(MIN_GROUP_MIN_PEOPLE_REQUIRED, m - 1),
                          );
                          if (formErrors.minPeople) {
                            setFormErrors((prev) => ({
                              ...prev,
                              minPeople: undefined,
                            }));
                          }
                        }}
                        style={styles.counterBtnOutline}
                      >
                        <Ionicons
                          name="remove"
                          size={18}
                          color={COLORS.textPrimary}
                        />
                      </TouchableOpacity>
                      <Text style={styles.counterValueBig}>{minPeopleRequired}</Text>
                      <TouchableOpacity
                        onPress={() => {
                          setMinPeopleRequired((m) =>
                            Math.min(peopleCount, m + 1),
                          );
                          if (formErrors.minPeople) {
                            setFormErrors((prev) => ({
                              ...prev,
                              minPeople: undefined,
                            }));
                          }
                        }}
                        style={styles.counterBtnOutline}
                      >
                        <Ionicons
                          name="add"
                          size={18}
                          color={COLORS.textPrimary}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  {!!formErrors.minPeople && (
                    <Text style={[styles.fieldErrorText, { marginTop: 6 }]}>
                      {formErrors.minPeople}
                    </Text>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          {peopleCount > 1 ? (
            <View style={styles.section}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 6,
                  marginBottom: 8,
                }}
              >
                <Ionicons name="alert-circle-outline" size={20} color="#D97706" />
                <Text style={[styles.label, { marginBottom: 0 }]}>
                  Tiền cọc thành viên
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDepositInfo(true)}
                  style={styles.infoIconButton}
                >
                  <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>
              <View style={[styles.card, { padding: SPACING.md }]}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {t("planner.depositAmountLabel")}
                </Text>
                <Text
                  style={{
                    fontSize: 12,
                    color: COLORS.textTertiary,
                    marginBottom: 6,
                  }}
                >
                  {t("planner.depositAndPenaltyRuleHint", {
                    minVnd: MIN_DEPOSIT_VND,
                    minPen: MIN_GROUP_PENALTY_PERCENT,
                    maxPen: MAX_GROUP_PENALTY_PERCENT,
                    defaultValue:
                      "Cọc tối thiểu {{minVnd}} VNĐ. Phạt: {{minPen}}%–{{maxPen}}%.",
                  })}
                </Text>
                <TextInput
                  style={[styles.input, !!formErrors.deposit && styles.inputError]}
                  value={depositAmountInput}
                  onChangeText={(v) => {
                    setDepositAmountInput(v);
                    if (formErrors.deposit) {
                      setFormErrors((prev) => ({ ...prev, deposit: undefined }));
                    }
                  }}
                  placeholder={t("planner.depositPlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />
                {!!formErrors.deposit && (
                  <Text style={styles.fieldErrorText}>{formErrors.deposit}</Text>
                )}
                <View style={{ marginBottom: 16 }} />
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  {t("planner.penaltyPercentageLabel")}
                </Text>
                <View style={[styles.penaltyInputRow, !!formErrors.penalty && styles.inputError]}>
                  <TextInput
                    style={styles.penaltyInputField}
                    value={penaltyPercentInput}
                    onChangeText={(raw) => {
                      const digits = raw.replace(/[^0-9]/g, "");
                      if (!digits) {
                        setPenaltyPercentInput("");
                        return;
                      }
                      const num = Math.min(
                        MAX_GROUP_PENALTY_PERCENT,
                        Math.max(0, parseInt(digits, 10) || 0),
                      );
                      setPenaltyPercentInput(String(num));
                      if (formErrors.penalty) {
                        setFormErrors((prev) => ({ ...prev, penalty: undefined }));
                      }
                    }}
                    placeholder="0"
                    placeholderTextColor={COLORS.textSecondary}
                    keyboardType="number-pad"
                    maxLength={3}
                  />
                  <Text style={styles.percentSuffix}>%</Text>
                </View>
                {!!formErrors.penalty && (
                  <Text style={styles.fieldErrorText}>{formErrors.penalty}</Text>
                )}
                <Text style={styles.penaltyPreviewText}>
                  {t("planner.penaltyPreview", {
                    percent: Math.max(
                      MIN_GROUP_PENALTY_PERCENT,
                      Math.min(
                        MAX_GROUP_PENALTY_PERCENT,
                        parseInt(penaltyPercentInput || "0", 10) || 0,
                      ),
                    ),
                    defaultValue: "Mức phạt hiện tại: {{percent}}% tiền cọc",
                  })}
                </Text>
              </View>
            </View>
          ) : null}

          {/* Section 5: Transport */}
          <View style={styles.section}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 6,
                marginBottom: 8,
              }}
            >
              <Ionicons name="car" size={20} color="#D97706" />
              <Text style={[styles.label, { marginBottom: 0 }]}>
                Phương tiện di chuyển chính
              </Text>
            </View>
            <View style={[styles.card, { padding: SPACING.md }]}>
              <View style={styles.transportRow}>
                {(
                  [
                    {
                      value: "bus" as const,
                      icon: "bus" as const,
                      label: "Xe buýt",
                    },
                    {
                      value: "car" as const,
                      icon: "car" as const,
                      label: "Ô tô",
                    },
                    {
                      value: "motorbike" as const,
                      icon: "bicycle" as const,
                      label: "Xe máy",
                    },
                  ] as const
                ).map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.transportIconBox,
                      transportation === item.value
                        ? styles.transportIconBoxSelected
                        : {},
                    ]}
                    onPress={() => setTransportation(item.value)}
                  >
                    <Ionicons
                      name={item.icon}
                      size={28}
                      color={
                        transportation === item.value
                          ? COLORS.white
                          : COLORS.textTertiary
                      }
                    />
                    <Text
                      style={[
                        { fontSize: 12, marginTop: 8, fontWeight: "600" },
                        transportation === item.value
                          ? { color: COLORS.white }
                          : { color: COLORS.textTertiary },
                      ]}
                    >
                      {item.label}
                    </Text>
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
            { paddingBottom: Math.max(insets.bottom + 12, 24) },
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
              <Text style={styles.createButtonText}>
                Tiếp tục chọn địa điểm ➔
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <Modal
          visible={showGroupFlowInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowGroupFlowInfo(false)}
        >
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalCard}>
              <Text style={styles.infoModalTitle}>Quy trình đi nhóm</Text>
              <Text style={styles.infoModalText}>
                ① <Text style={{ fontWeight: "700" }}>Hoàn thiện lịch & điểm</Text> trong chi tiết kế hoạch{"\n"}
                ② <Text style={{ fontWeight: "700" }}>Mời email / QR & chat</Text>{"\n"}
                ③ <Text style={{ fontWeight: "700" }}>Thành viên đồng ý & đóng cọc</Text>{"\n"}
                ④ <Text style={{ fontWeight: "700" }}>Trưởng đoàn khóa hành trình</Text>
              </Text>
              <TouchableOpacity
                style={styles.infoModalBtn}
                onPress={() => setShowGroupFlowInfo(false)}
              >
                <Text style={styles.infoModalBtnText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showDepositInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowDepositInfo(false)}
        >
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalCard}>
              <Text style={styles.infoModalTitle}>Tiền cọc thành viên</Text>
              <Text style={styles.infoModalText}>{t("planner.groupDepositSectionHint")}</Text>
              <TouchableOpacity
                style={styles.infoModalBtn}
                onPress={() => setShowDepositInfo(false)}
              >
                <Text style={styles.infoModalBtnText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        <Modal
          visible={showMinPeopleInfo}
          transparent
          animationType="fade"
          onRequestClose={() => setShowMinPeopleInfo(false)}
        >
          <View style={styles.infoModalOverlay}>
            <View style={styles.infoModalCard}>
              <Text style={styles.infoModalTitle}>
                {t("planner.minPeopleRequiredLabel", {
                  defaultValue: "Minimum people to finalize",
                })}
              </Text>
              <Text style={styles.infoModalText}>
                {t("planner.minPeopleRequiredHint", {
                  min: MIN_GROUP_MIN_PEOPLE_REQUIRED,
                  defaultValue:
                    "For group trips: at least {{min}} people (not just the owner). Up to your planned size.",
                })}
              </Text>
              <TouchableOpacity
                style={styles.infoModalBtn}
                onPress={() => setShowMinPeopleInfo(false)}
              >
                <Text style={styles.infoModalBtnText}>Đã hiểu</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.8)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    flex: 2,
    textAlign: "center",
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  cancelButton: {
    flex: 1,
    alignItems: "flex-start",
    padding: 8,
    marginLeft: -8,
  },
  headerRightSpacer: {
    flex: 1,
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
    backgroundColor: "#F9F7F1",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 56,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
    ...SHADOWS.subtle,
  },
  inputError: {
    borderWidth: 1,
    borderColor: "#EF4444",
  },
  fieldErrorText: {
    marginTop: 6,
    fontSize: 12,
    color: "#DC2626",
    fontWeight: "500",
  },
  durationBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  durationBadgeText: {
    color: "#D97706",
    fontSize: 12,
    fontWeight: "bold",
  },
  dateDisplaySub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },
  counterBtnOutline: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.borderMedium || "#D1D5DB",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.white,
  },
  penaltyInputRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F7F1",
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    height: 56,
    ...SHADOWS.subtle,
  },
  penaltyInputField: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  percentSuffix: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "700",
    marginLeft: 8,
  },
  penaltyPreviewText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  infoIconButton: {
    padding: 2,
  },
  infoModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  infoModalCard: {
    width: "100%",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    ...SHADOWS.medium,
  },
  infoModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 10,
  },
  infoModalText: {
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.textSecondary,
  },
  infoModalBtn: {
    marginTop: SPACING.md,
    alignSelf: "flex-end",
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  infoModalBtnText: {
    color: COLORS.textPrimary,
    fontSize: 13,
    fontWeight: "700",
  },
  counterValueBig: {
    fontSize: 20,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    minWidth: 30,
    textAlign: "center",
  },
  transportIconBox: {
    flex: 1,
    height: 80,
    borderRadius: BORDER_RADIUS.lg,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: "transparent",
  },
  transportIconBoxSelected: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
    ...SHADOWS.medium,
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
