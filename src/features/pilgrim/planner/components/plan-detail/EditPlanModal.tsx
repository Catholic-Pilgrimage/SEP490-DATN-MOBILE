import { Ionicons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { BORDER_RADIUS, COLORS, SPACING } from "../../../../../constants/theme.constants";

interface EditPlanModalProps {
  visible: boolean;
  onClose: () => void;
  onSave: () => void;
  saving: boolean;
  t: (key: string, options?: any) => string;
  editPlanName: string;
  setEditPlanName: (v: string) => void;
  editPlanStartDate: string;
  setEditPlanStartDate: (v: string) => void;
  editPlanEndDate: string;
  setEditPlanEndDate: (v: string) => void;
  editPlanPeople: number;
  setEditPlanPeople: (v: number) => void;
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
  /** Backend đã tính: có thể set edit_lock_at hay không */
  canSetEditLockAt?: boolean;
  /** Thời điểm sớm nhất có thể set edit lock (12h sau first invite) */
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
    t,
    editPlanName,
    setEditPlanName,
    editPlanStartDate,
    setEditPlanStartDate,
    editPlanEndDate,
    setEditPlanEndDate,
    editPlanPeople,
    setEditPlanPeople,
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
    canSetEditLockAt,
    editLockAvailableAt,
    plannerLockAt,
    isLocked,
  } = props;

  const [showEditLockPicker, setShowEditLockPicker] = React.useState(false);
  const isGroup = editPlanPeople > 1;

  return (
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
          }}
        >
          <ScrollView
            contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
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
              onChangeText={setEditPlanName}
              placeholder={t("planner.planNamePlaceholder")}
              placeholderTextColor={COLORS.textSecondary}
            />

            <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
                  {t("planner.startDate")}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowEditStartDatePicker(true)}
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
                  onPress={() => setShowEditEndDatePicker(true)}
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

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
              {t("planner.numberOfPeople")}
            </Text>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 16,
                marginBottom: 24,
                backgroundColor: "#F5F5F5",
                borderRadius: 12,
                padding: 8,
                alignSelf: "flex-start",
              }}
            >
              <TouchableOpacity
                onPress={() => setEditPlanPeople(Math.max(1, editPlanPeople - 1))}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
              >
                <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: "700", color: COLORS.textPrimary, minWidth: 28, textAlign: "center" }}>
                {editPlanPeople}
              </Text>
              <TouchableOpacity
                onPress={() => setEditPlanPeople(Math.min(50, editPlanPeople + 1))}
                style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: "#fff", justifyContent: "center", alignItems: "center" }}
              >
                <Ionicons name="add" size={18} color={COLORS.textPrimary} />
              </TouchableOpacity>
            </View>

            {editPlanPeople > 1 ? (
              <View style={{ marginBottom: 20 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
                  {t("planner.depositAmountLabel")}
                </Text>
                <Text style={{ fontSize: 12, color: COLORS.textSecondary, marginBottom: 8, lineHeight: 17 }}>
                  {t("planner.groupDepositSectionHint")}
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
                    marginBottom: 8,
                    backgroundColor: "#FAFAFA",
                  }}
                  value={editPlanDepositInput}
                  onChangeText={setEditPlanDepositInput}
                  placeholder={t("planner.depositPlaceholder")}
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />
                <Text style={{ fontSize: 11, color: COLORS.textSecondary, marginBottom: 14 }}>
                  {t("planner.depositAmountHint")}
                </Text>
                <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 6 }}>
                  {t("planner.penaltyPercentageLabel")}
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
                    marginBottom: 6,
                    backgroundColor: "#FAFAFA",
                  }}
                  value={editPlanPenaltyInput}
                  onChangeText={setEditPlanPenaltyInput}
                  placeholder="0"
                  placeholderTextColor={COLORS.textSecondary}
                  keyboardType="number-pad"
                />
                <Text style={{ fontSize: 11, color: COLORS.textSecondary }}>
                  {t("planner.penaltyPercentageHint")}
                </Text>
              </View>
            ) : null}

            {/* Lock Schedule — Nhóm only */}
            {isGroup && (
              <View style={{ marginBottom: 20 }}>
                <Text
                  style={{
                    fontSize: 13,
                    fontWeight: "600",
                    color: COLORS.textSecondary,
                    marginBottom: 6,
                  }}
                >
                  ⏱ Lịch khoá chỉnh sửa
                </Text>

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
                ) : canSetEditLockAt && setEditLockAt ? (
                  <View>
                    <Text
                      style={{
                        fontSize: 12,
                        color: COLORS.textSecondary,
                        marginBottom: 8,
                        lineHeight: 17,
                      }}
                    >
                      Đặt thời gian khoá chỉnh sửa. Sau thời điểm này, không ai
                      có thể thêm/xoá/sửa điểm viếng.
                    </Text>
                    <TouchableOpacity
                      onPress={() => setShowEditLockPicker(true)}
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
                          : "Chọn thời gian khoá"}
                      </Text>
                      {editLockAt && (
                        <TouchableOpacity
                          onPress={() => setEditLockAt(null)}
                          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        >
                          <Ionicons
                            name="close-circle"
                            size={18}
                            color="#EF4444"
                          />
                        </TouchableOpacity>
                      )}
                    </TouchableOpacity>

                    {showEditLockPicker && (
                      <DateTimePicker
                        value={
                          editLockAt
                            ? new Date(editLockAt)
                            : editLockAvailableAt
                              ? new Date(editLockAvailableAt)
                              : new Date()
                        }
                        mode="datetime"
                        display={
                          Platform.OS === "ios" ? "spinner" : "default"
                        }
                        onChange={(_, selectedDate) => {
                          setShowEditLockPicker(Platform.OS === "ios");
                          if (selectedDate) {
                            setEditLockAt(selectedDate.toISOString());
                          }
                        }}
                        minimumDate={
                          editLockAvailableAt
                            ? new Date(editLockAvailableAt)
                            : new Date()
                        }
                        maximumDate={
                          plannerLockAt
                            ? new Date(plannerLockAt)
                            : editPlanStartDate
                              ? new Date(editPlanStartDate)
                              : undefined
                        }
                        locale="vi"
                      />
                    )}

                    <Text
                      style={{
                        fontSize: 11,
                        color: COLORS.textSecondary,
                        marginTop: 6,
                      }}
                    >
                      Nếu không đặt, hệ thống sẽ tự khoá 24h trước ngày đi.
                    </Text>
                  </View>
                ) : (
                  <View
                    style={{
                      backgroundColor: "#FFFBEB",
                      padding: 12,
                      borderRadius: 12,
                      borderWidth: 1,
                      borderColor: "#FDE68A",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        color: "#92400E",
                        lineHeight: 17,
                      }}
                    >
                      Cần mời ít nhất 1 thành viên và đợi 12h thảo luận trước
                      khi có thể đặt lịch khoá chỉnh sửa.
                    </Text>
                  </View>
                )}
              </View>
            )}

            <Text style={{ fontSize: 13, fontWeight: "600", color: COLORS.textSecondary, marginBottom: 8, marginTop: 4 }}>
              {t("planner.transportation")}
            </Text>
            <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
              {[
                { value: "bus", label: t("planner.bus"), icon: "bus" as const },
                { value: "car", label: t("planner.car"), icon: "car" as const },
                { value: "other", label: t("planner.motorcycle"), icon: null },
              ].map((item) => (
                <TouchableOpacity
                  key={item.value}
                  onPress={() => setEditPlanTransportation(item.value)}
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
                  {item.icon ? (
                    <Ionicons
                      name={item.icon}
                      size={20}
                      color={editPlanTransportation === item.value ? COLORS.textPrimary : COLORS.textSecondary}
                    />
                  ) : (
                    <Text style={{ fontSize: 18 }}>🏍️</Text>
                  )}
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
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

