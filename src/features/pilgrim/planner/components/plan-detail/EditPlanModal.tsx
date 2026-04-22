import { Ionicons } from "@expo/vector-icons";
import DateTimePicker, {
  DateTimePickerAndroid,
} from "@react-native-community/datetimepicker";
import React from "react";
import {
  ActivityIndicator,
  InteractionManager,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

interface EditPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  /** Lỗi lưu — hiển thị trong modal (Toast nằm dưới layer Modal RN). */
  saveError?: string | null;
  onClearSaveError?: () => void;
  t: (key: string, options?: any) => string;
  editPlanName: string;
  setEditPlanName: (v: string) => void;
  editPlanStartDate: string;
  setEditPlanStartDate: (v: string) => void;
  editPlanEndDate: string;
  setEditPlanEndDate: (v: string) => void;
  editPlanPeople: number;
  setEditPlanPeople: (v: number) => void;
  editPlanMinPeople: number;
  setEditPlanMinPeople: (v: number) => void;
  editPlanTransportation: string;
  setEditPlanTransportation: (v: string) => void;
  editPlanDepositInput: string;
  setEditPlanDepositInput: (v: string) => void;
  editPlanPenaltyInput: string;
  setEditPlanPenaltyInput: (v: string) => void;
  showEditStartDatePicker: boolean;
  setShowEditStartDatePicker: (v: boolean) => void;
  showEditEndDatePicker: boolean;
  setShowEditEndDatePicker: (v: boolean) => void;
  /** Thời gian edit lock hiện tại (ISO string hoặc null). */
  editLockAt?: string | null;
  setEditLockAt?: (v: string | null) => void;
  /** Thời điểm sớm nhất nên chọn (gợi ý, BE vẫn xác thực khi lưu) */
  editLockAvailableAt?: string | null;
  /** Planner lock at (tự động, 12h trước ngày đi) */
  plannerLockAt?: string | null;
  /** Có đang khoá edit hay không */
  isLocked?: boolean;
}

export default function EditPlanModal(props: EditPlanModalProps) {
  const {
    visible,
    onClose,
    onSave,
    saving,
    saveError,
    onClearSaveError,
    t,
    editPlanName,
    setEditPlanName,
    editPlanStartDate,
    setEditPlanStartDate,
    editPlanEndDate,
    setEditPlanEndDate,
    editPlanPeople,
    setEditPlanPeople,
    editPlanMinPeople,
    setEditPlanMinPeople,
    editPlanTransportation,
    setEditPlanTransportation,
    editPlanDepositInput,
    setEditPlanDepositInput,
    editPlanPenaltyInput,
    setEditPlanPenaltyInput,
    showEditStartDatePicker,
    setShowEditStartDatePicker,
    showEditEndDatePicker,
    setShowEditEndDatePicker,
    editLockAt,
    setEditLockAt,
    editLockAvailableAt,
    plannerLockAt,
    isLocked,
  } = props;

  const insets = useSafeAreaInsets();

  const [showMinPeopleInfo, setShowMinPeopleInfo] = React.useState(false);
  const [showEditLockInfo, setShowEditLockInfo] = React.useState(false);
  const [showDepositInfoEdit, setShowDepositInfoEdit] = React.useState(false);
  const [showPenaltyInfoEdit, setShowPenaltyInfoEdit] = React.useState(false);
  const isGroup = editPlanPeople > 1;

  /** Tránh min > max (Android DateTimePicker lỗi) và tách picker khỏi ScrollView */
  const editLockPickerBounds = React.useMemo(() => {
    const min = editLockAvailableAt
      ? new Date(editLockAvailableAt)
      : new Date();
    let max: Date | undefined;
    if (plannerLockAt) {
      max = new Date(plannerLockAt);
    } else if (editPlanStartDate) {
      max = new Date(editPlanStartDate);
    }
    if (max && !Number.isNaN(max.getTime()) && min.getTime() > max.getTime()) {
      return { min, max: undefined as Date | undefined };
    }
    return { min, max };
  }, [editLockAvailableAt, plannerLockAt, editPlanStartDate]);

  const editLockPickerValue = React.useMemo(() => {
    const { min, max } = editLockPickerBounds;
    const base =
      editLockAt != null
        ? new Date(editLockAt)
        : editLockAvailableAt
          ? new Date(editLockAvailableAt)
          : new Date();
    let ts = base.getTime();
    const tMin = min.getTime();
    if (ts < tMin) ts = tMin;
    if (max) {
      const tMax = max.getTime();
      if (!Number.isNaN(tMax) && ts > tMax) ts = tMax;
    }
    return new Date(ts);
  }, [editLockAt, editLockAvailableAt, editLockPickerBounds]);

  /** Chỉ Android: không dùng mode=datetime (lỗi dismiss). Mở date rồi time. iOS: không bật chọn từ app (theo cấu hình sản phẩm). */
  const openEditLockOnAndroid = React.useCallback(() => {
    if (Platform.OS !== "android" || !setEditLockAt) return;
    onClearSaveError?.();
    const { min, max } = editLockPickerBounds;
    const base = editLockPickerValue;
    const applyBounds = (d: Date) => {
      let t = d.getTime();
      const t0 = min.getTime();
      if (t < t0) t = t0;
      if (max) {
        const t1 = max.getTime();
        if (!Number.isNaN(t1) && t > t1) t = t1;
      }
      return new Date(t);
    };
    const pickTime = (dateOnly: Date) => {
      const withTime = new Date(dateOnly);
      withTime.setHours(base.getHours(), base.getMinutes(), 0, 0);
      InteractionManager.runAfterInteractions(() => {
        DateTimePickerAndroid.open({
          value: withTime,
          mode: "time",
          is24Hour: true,
          onChange: (ev, t) => {
            if (ev.type === "dismissed" || !t) return;
            const merged = new Date(dateOnly);
            merged.setHours(t.getHours(), t.getMinutes(), 0, 0);
            setEditLockAt(applyBounds(merged).toISOString());
          },
        });
      });
    };
    DateTimePickerAndroid.open({
      value: base,
      mode: "date",
      minimumDate: min,
      maximumDate: max,
      onChange: (ev, date) => {
        if (ev.type === "dismissed" || !date) return;
        pickTime(date);
      },
    });
  }, [setEditLockAt, editLockPickerBounds, editLockPickerValue, onClearSaveError]);

  return (
    <>
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.5)",
          justifyContent: "flex-end",
        }}
      >
        <View
          style={{
            backgroundColor: "#fff",
            borderTopLeftRadius: 24,
            borderTopRightRadius: 24,
            maxHeight: "90%",
            overflow: "hidden",
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 20,
              }}
            >
              <Text
                style={{
                  fontSize: 18,
                  fontWeight: "700",
                  color: COLORS.textPrimary,
                }}
              >
                {t("planner.editPlan")}
              </Text>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={24} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            <Text
              style={{
                fontSize: 13,
                fontWeight: "600",
                color: COLORS.textSecondary,
                marginBottom: 6,
              }}
            >
              {t("planner.planName")}
            </Text>
            <TextInput
              style={{
                borderWidth: 1,
                borderColor: COLORS.border,
                borderRadius: 12,
                paddingHorizontal: 14,
                paddingVertical: 12,
                fontSize: 15,
                color: COLORS.textPrimary,
                marginBottom: 16,
                backgroundColor: "#FAFAFA",
              }}
              value={editPlanName}
              onChangeText={(v) => {
                onClearSaveError?.();
                setEditPlanName(v);
              }}
              placeholder={t("planner.planNamePlaceholder")}
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
                  {t("planner.startDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onClearSaveError?.();
                    setShowEditStartDatePicker(true);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: "#FAFAFA",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                  <Text style={{ fontSize: 14, color: editPlanStartDate ? COLORS.textPrimary : COLORS.textSecondary }}>
                    {editPlanStartDate
                      ? new Date(editPlanStartDate).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Chọn ngày"}
                  </Text>
                </TouchableOpacity>
                {showEditStartDatePicker && (
                  <DateTimePicker
                    value={editPlanStartDate ? new Date(editPlanStartDate) : new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={(_, selectedDate) => {
                      setShowEditStartDatePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        const iso = selectedDate.toISOString().split("T")[0];
                        setEditPlanStartDate(iso);
                        if (editPlanEndDate && editPlanEndDate < iso) {
                          setEditPlanEndDate(iso);
                        }
                      }
                    }}
                    minimumDate={new Date()}
                    locale="vi"
                  />
                )}
              </View>

              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
                  {t("planner.endDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    onClearSaveError?.();
                    setShowEditEndDatePicker(true);
                  }}
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    backgroundColor: "#FAFAFA",
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  <Ionicons name="calendar-outline" size={16} color={COLORS.primary} />
                  <Text style={{ fontSize: 14, color: editPlanEndDate ? COLORS.textPrimary : COLORS.textSecondary }}>
                    {editPlanEndDate
                      ? new Date(editPlanEndDate).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })
                      : "Chọn ngày"}
                  </Text>
                </TouchableOpacity>
                {showEditEndDatePicker && (
                  <DateTimePicker
                    value={editPlanEndDate ? new Date(editPlanEndDate) : new Date()}
                    mode="date"
                    display={Platform.OS === "ios" ? "inline" : "default"}
                    onChange={(_, selectedDate) => {
                      setShowEditEndDatePicker(Platform.OS === "ios");
                      if (selectedDate) {
                        setEditPlanEndDate(selectedDate.toISOString().split("T")[0]);
                      }
                    }}
                    minimumDate={editPlanStartDate ? new Date(editPlanStartDate) : new Date()}
                    locale="vi"
                  />
                )}
              </View>
            </View>

            <View
              style={{
                backgroundColor: "#F5F5F5",
                borderRadius: 12,
                padding: 12,
                marginBottom: 20,
              }}
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "600",
                    color: COLORS.textPrimary,
                    flex: 1,
                    paddingRight: 8,
                  }}
                >
                  {t("planner.numberOfPeople")}
                </Text>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 12,
                  }}
                >
                  <TouchableOpacity
                    onPress={() => {
                      onClearSaveError?.();
                      setEditPlanPeople(Math.max(1, editPlanPeople - 1));
                    }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, minWidth: 32, textAlign: "center" }}>
                    {editPlanPeople}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      onClearSaveError?.();
                      setEditPlanPeople(Math.min(50, editPlanPeople + 1));
                    }}
                    style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
                  >
                    <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
              {isGroup ? (
                <View
                  style={{
                    marginTop: 12,
                    paddingTop: 12,
                    borderTopWidth: 1,
                    borderTopColor: COLORS.border,
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "space-between",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      flex: 1,
                      minWidth: 0,
                      marginRight: 8,
                      gap: 6,
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 16,
                        fontWeight: "600",
                        color: COLORS.textPrimary,
                        flex: 1,
                        flexShrink: 1,
                      }}
                    >
                      {t("planner.minPeopleRequiredLabel", {
                        defaultValue: "Minimum people to finalize",
                      })}
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowMinPeopleInfo(true)}
                      style={{ padding: 2 }}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      accessibilityRole="button"
                    >
                      <Ionicons name="information-circle-outline" size={20} color={COLORS.textSecondary} />
                    </TouchableOpacity>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                    <TouchableOpacity
                      onPress={() => {
                        onClearSaveError?.();
                        setEditPlanMinPeople(Math.max(1, editPlanMinPeople - 1));
                      }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
                    >
                      <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, minWidth: 32, textAlign: "center" }}>
                      {editPlanMinPeople}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        onClearSaveError?.();
                        setEditPlanMinPeople(
                          Math.min(editPlanPeople, editPlanMinPeople + 1),
                        );
                      }}
                      style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
                    >
                      <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                  </View>
                </View>
              ) : null}
            </View>

            {editPlanPeople > 1 ? (
              <View style={{ marginBottom: 20 }}>
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, flex: 1 }}>
                    {t("planner.depositAmountLabel")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowDepositInfoEdit(true)}
                    style={{ padding: 2 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: COLORS.textPrimary,
                    marginBottom: 12,
                    backgroundColor: "#FAFAFA",
                  }}
                  value={editPlanDepositInput}
                  onChangeText={(v) => {
                    onClearSaveError?.();
                    setEditPlanDepositInput(v);
                  }}
                  placeholder={t("planner.depositPlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                    gap: 6,
                  }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, flex: 1 }}>
                    {t("planner.penaltyPercentageLabel")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowPenaltyInfoEdit(true)}
                    style={{ padding: 2 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                  >
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                <TextInput
                  style={{
                    borderWidth: 1,
                    borderColor: COLORS.border,
                    borderRadius: 12,
                    paddingHorizontal: 14,
                    paddingVertical: 12,
                    fontSize: 15,
                    color: COLORS.textPrimary,
                    marginBottom: 6,
                    backgroundColor: "#FAFAFA",
                  }}
                  value={editPlanPenaltyInput}
                  onChangeText={(v) => {
                    onClearSaveError?.();
                    setEditPlanPenaltyInput(v);
                  }}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />
              </View>
            ) : null}

            {/* Lock Schedule — Nhóm only */}
            {isGroup && (
              <View style={{ marginBottom: 20 }}>
                {isLocked ? (
                  <View
                    style={{
                      backgroundColor: "#F0FDF4",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#BBF7D0",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 13,
                        color: "#166534",
                        fontWeight: "600",
                      }}
                    >
                      ✓ Chỉnh sửa đã được khoá
                    </Text>
                  </View>
                ) : setEditLockAt ? (
                  <View>
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        marginBottom: 8,
                        gap: 6,
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 13,
                          fontWeight: "600",
                          color: COLORS.textSecondary,
                          flex: 1,
                        }}
                      >
                        ⏱ {t("planner.editLockSectionTitle", { defaultValue: "Edit lock schedule" })}
                      </Text>
                      <TouchableOpacity
                        onPress={() => setShowEditLockInfo(true)}
                        style={{ padding: 2 }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                        accessibilityRole="button"
                      >
                        <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
                      </TouchableOpacity>
                    </View>
                    <TouchableOpacity
                      onPress={openEditLockOnAndroid}
                      disabled={Platform.OS !== "android"}
                      style={{
                        borderWidth: 1,
                        borderColor: COLORS.border,
                        borderRadius: 12,
                        paddingHorizontal: 14,
                        paddingVertical: 12,
                        backgroundColor: "#FAFAFA",
                        flexDirection: "row",
                        alignItems: "center",
                        gap: 8,
                        opacity: Platform.OS === "android" ? 1 : 0.75,
                      }}
                    >
                      <Ionicons
                        name="lock-closed-outline"
                        size={16}
                        color="#2563EB"
                      />
                      <Text
                        style={{
                          fontSize: 14,
                          color: editLockAt
                            ? COLORS.textPrimary
                            : COLORS.textSecondary,
                          flex: 1,
                        }}
                      >
                        {editLockAt
                          ? new Date(editLockAt).toLocaleString("vi-VN", {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })
                          : t("planner.editLockChooseTime", {
                              defaultValue: "Choose lock time",
                            })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : null}
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 }}>
              {t("planner.transportation")}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              {[
                { value: "bus", label: t("planner.transport.bus", { defaultValue: "Xe buýt" }), icon: "bus" as const },
                { value: "car", label: t("planner.transport.car", { defaultValue: "Ô tô" }), icon: "car" as const },
                { value: "motorbike", label: t("planner.transport.motorbike", { defaultValue: "Xe máy" }), icon: "bicycle" as const },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => {
                    onClearSaveError?.();
                    setEditPlanTransportation(item.value);
                  }}
                  style={{
                    flex: 1,
                    paddingVertical: 10,
                    borderRadius: 12,
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: editPlanTransportation === item.value ? COLORS.accent : "#F5F5F5",
                    borderWidth: editPlanTransportation === item.value ? 0 : 1,
                    borderColor: COLORS.border,
                    gap: 4,
                  }}
                >
                  <Ionicons
                    name={item.icon}
                    size={20}
                    color={editPlanTransportation === item.value ? COLORS.textPrimary : COLORS.textSecondary}
                  />
                  <Text
                    style={{
                      fontSize: 11,
                      fontWeight: "600",
                      color: editPlanTransportation === item.value ? COLORS.textPrimary : COLORS.textSecondary,
                    }}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <View
            style={{
              borderTopWidth: 1,
              borderTopColor: COLORS.border,
              backgroundColor: COLORS.white,
              paddingHorizontal: 24,
              paddingTop: 12,
              paddingBottom: Math.max(insets.bottom, 14) + 10,
            }}
          >
            {!!saveError && (
              <Text
                style={{
                  fontSize: 13,
                  color: "#B91C1C",
                  marginBottom: 10,
                  lineHeight: 19,
                }}
              >
                {saveError}
              </Text>
            )}
            <TouchableOpacity
              onPress={onSave}
              disabled={saving}
              style={{
                backgroundColor: COLORS.accent,
                borderRadius: 14,
                paddingVertical: 15,
                alignItems: "center",
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary }}>
                  {t("planner.saveChanges")}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>

    <Modal
      visible={showMinPeopleInfo}
      transparent
      animationType="fade"
      onRequestClose={() => setShowMinPeopleInfo(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.lg,
            ...SHADOWS.medium,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.textPrimary,
              marginBottom: 10,
            }}
          >
            {t("planner.minPeopleRequiredLabel", {
              defaultValue: "Minimum people to finalize",
            })}
          </Text>
          <Text
            style={{
              fontSize: 14,
              lineHeight: 22,
              color: COLORS.textSecondary,
            }}
          >
            {t("planner.minPeopleRequiredHint", {
              defaultValue:
                "The plan can only be finalized when this many people have joined (at most your planned group size).",
            })}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: SPACING.md,
              alignSelf: "flex-end",
              backgroundColor: COLORS.accent,
              borderRadius: BORDER_RADIUS.full,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
            onPress={() => setShowMinPeopleInfo(false)}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: "700" }}>
              {t("planner.understood", { defaultValue: "OK" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal
      visible={showEditLockInfo}
      transparent
      animationType="fade"
      onRequestClose={() => setShowEditLockInfo(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.lg,
            ...SHADOWS.medium,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.textPrimary,
              marginBottom: 10,
            }}
          >
            {t("planner.editLockSectionTitle", { defaultValue: "Edit lock schedule" })}
          </Text>
          <Text
            style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 10 }}
          >
            {t("planner.editLockScheduleFormIntro", {
              defaultValue:
                "Set when editing will be locked. If the time is not allowed, you will see an error when saving.",
            })}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary }}>
            {t("planner.editLockAutoIfUnset", {
              defaultValue:
                "If not set, the system will lock 24 hours before the start day.",
            })}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: SPACING.md,
              alignSelf: "flex-end",
              backgroundColor: COLORS.accent,
              borderRadius: BORDER_RADIUS.full,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
            onPress={() => setShowEditLockInfo(false)}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: "700" }}>
              {t("planner.understood", { defaultValue: "OK" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal
      visible={showDepositInfoEdit}
      transparent
      animationType="fade"
      onRequestClose={() => setShowDepositInfoEdit(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.lg,
            ...SHADOWS.medium,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.textPrimary,
              marginBottom: 10,
            }}
          >
            {t("planner.depositAmountLabel")}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary, marginBottom: 8 }}>
            {t("planner.groupDepositSectionHint")}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary }}>
            {t("planner.depositAmountHint")}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: SPACING.md,
              alignSelf: "flex-end",
              backgroundColor: COLORS.accent,
              borderRadius: BORDER_RADIUS.full,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
            onPress={() => setShowDepositInfoEdit(false)}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: "700" }}>
              {t("planner.understood", { defaultValue: "OK" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>

    <Modal
      visible={showPenaltyInfoEdit}
      transparent
      animationType="fade"
      onRequestClose={() => setShowPenaltyInfoEdit(false)}
    >
      <View
        style={{
          flex: 1,
          backgroundColor: "rgba(0,0,0,0.35)",
          justifyContent: "center",
          alignItems: "center",
          paddingHorizontal: SPACING.lg,
        }}
      >
        <View
          style={{
            width: "100%",
            backgroundColor: COLORS.white,
            borderRadius: BORDER_RADIUS.xl,
            padding: SPACING.lg,
            ...SHADOWS.medium,
          }}
        >
          <Text
            style={{
              fontSize: 16,
              fontWeight: "700",
              color: COLORS.textPrimary,
              marginBottom: 10,
            }}
          >
            {t("planner.penaltyPercentageLabel")}
          </Text>
          <Text style={{ fontSize: 14, lineHeight: 22, color: COLORS.textSecondary }}>
            {t("planner.penaltyPercentageHint")}
          </Text>
          <TouchableOpacity
            style={{
              marginTop: SPACING.md,
              alignSelf: "flex-end",
              backgroundColor: COLORS.accent,
              borderRadius: BORDER_RADIUS.full,
              paddingHorizontal: 14,
              paddingVertical: 8,
            }}
            onPress={() => setShowPenaltyInfoEdit(false)}
          >
            <Text style={{ color: COLORS.textPrimary, fontSize: 13, fontWeight: "700" }}>
              {t("planner.understood", { defaultValue: "OK" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
    </>
  );
}

