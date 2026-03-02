/**
 * SchedulesTab Component (Lịch lễ)
 * Premium UI for Mass Schedule management
 * 
 * Features:
 * - Beautiful schedule cards with days chips
 * - Status badges with proper colors
 * - Smart Hybrid Filter (2 chips + dropdown)
 * - Create/Edit/Delete with modal form
 * - Rejection reason warning box
 * - Pull to refresh
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { DayOfWeek, MassSchedule, MassScheduleStatus } from "../../../../types/guide";
import { useMassSchedule } from "../hooks/useMassSchedule";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// CONSTANTS
// ============================================

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  goldDark: "#B8960C",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  brown: "#8B7355",
  brownLight: "#E8E0D5",
};

// Status config
const STATUS_CONFIG: Record<MassScheduleStatus, {
  label: string;
  bgColor: string;
  textColor: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}> = {
  pending: {
    label: "Chờ duyệt",
    bgColor: "#FEF3C7",
    textColor: "#D97706",
    icon: "schedule",
  },
  approved: {
    label: "Đã duyệt",
    bgColor: "#D1FAE5",
    textColor: "#059669",
    icon: "check-circle",
  },
  rejected: {
    label: "Từ chối",
    bgColor: "#FEE2E2",
    textColor: "#DC2626",
    icon: "cancel",
  },
};

// Days mapping - 0=CN (Sunday) is red, 6=T7 (Saturday) is blue
const DAYS_MAP: { value: DayOfWeek; label: string; color: string }[] = [
  { value: 0, label: "CN", color: "#DC2626" }, // Chủ Nhật - Red
  { value: 1, label: "T2", color: GUIDE_COLORS.textPrimary },
  { value: 2, label: "T3", color: GUIDE_COLORS.textPrimary },
  { value: 3, label: "T4", color: GUIDE_COLORS.textPrimary },
  { value: 4, label: "T5", color: GUIDE_COLORS.textPrimary },
  { value: 5, label: "T6", color: GUIDE_COLORS.textPrimary },
  { value: 6, label: "T7", color: "#2563EB" }, // Thứ 7 - Blue
];

// Filter options
type StatusFilter = "all" | MassScheduleStatus;

const STATUS_FILTERS: { key: StatusFilter; label: string; color: string; bgColor: string; icon?: keyof typeof MaterialIcons.glyphMap; description?: string }[] = [
  { key: "all", label: "Tất cả", color: PREMIUM_COLORS.brown, bgColor: PREMIUM_COLORS.brownLight, description: "Hiển thị tất cả lịch lễ" },
  { key: "pending", label: "Chờ duyệt", color: "#D97706", bgColor: "#FEF3C7", icon: "schedule", description: "Lịch lễ đang chờ phê duyệt" },
  { key: "approved", label: "Đã duyệt", color: "#059669", bgColor: "#D1FAE5", icon: "check-circle", description: "Lịch lễ đã được phê duyệt" },
  { key: "rejected", label: "Từ chối", color: "#DC2626", bgColor: "#FEE2E2", icon: "cancel", description: "Lịch lễ bị từ chối" },
];

// ============================================
// FILTER BOTTOM SHEET COMPONENT (Gold Standard)
// ============================================

interface FilterBottomSheetProps {
  visible: boolean;
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onClose: () => void;
}

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  activeFilter,
  onFilterChange,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>(activeFilter);

  React.useEffect(() => {
    if (visible) {
      setSelectedFilter(activeFilter);
    }
  }, [visible, activeFilter]);

  const handleApply = () => {
    onFilterChange(selectedFilter);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) }]}>
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Lọc lịch lễ</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <View style={styles.filterOptionsContainer}>
                {STATUS_FILTERS.map((filter) => {
                  const isSelected = selectedFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterOption,
                        isSelected && { backgroundColor: filter.bgColor, borderColor: filter.color },
                      ]}
                      onPress={() => setSelectedFilter(filter.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.filterOptionLeft}>
                        <View style={[styles.filterIconContainer, { backgroundColor: filter.bgColor }]}>
                          {filter.icon ? (
                            <MaterialIcons name={filter.icon} size={20} color={filter.color} />
                          ) : (
                            <MaterialIcons name="apps" size={20} color={filter.color} />
                          )}
                        </View>
                        <View style={styles.filterOptionText}>
                          <Text style={[styles.filterOptionLabel, { color: isSelected ? filter.color : GUIDE_COLORS.textPrimary }]}>
                            {filter.label}
                          </Text>
                          {filter.description && (
                            <Text style={styles.filterOptionDescription}>{filter.description}</Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: filter.color }]}>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Apply Button */}
              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Filter Trigger Button
interface FilterTriggerProps {
  activeFilter: StatusFilter;
  onPress: () => void;
}

const FilterTrigger: React.FC<FilterTriggerProps> = ({ activeFilter, onPress }) => {
  const activeFilterInfo = STATUS_FILTERS.find(f => f.key === activeFilter);
  const isFiltered = activeFilter !== "all";

  return (
    <TouchableOpacity
      style={[
        styles.filterTriggerButton,
        isFiltered && { backgroundColor: activeFilterInfo?.bgColor, borderColor: activeFilterInfo?.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="filter"
        size={14}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
      <Text style={[
        styles.filterTriggerText,
        isFiltered && { color: activeFilterInfo?.color },
      ]}>
        {isFiltered ? activeFilterInfo?.label : "Lọc"}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: MassScheduleStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const config = STATUS_CONFIG[status];
  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bgColor }]}>
      <View style={[styles.statusDot, { backgroundColor: config.textColor }]} />
      <Text style={[styles.statusBadgeText, { color: config.textColor }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ============================================
// DAY CHIP COMPONENT
// ============================================

interface DayChipProps {
  day: DayOfWeek;
  size?: "small" | "normal";
  selected?: boolean;
  onPress?: () => void;
}

const DayChip: React.FC<DayChipProps> = ({ day, size = "normal", selected, onPress }) => {
  const dayInfo = DAYS_MAP.find(d => d.value === day) || DAYS_MAP[0];
  const isSmall = size === "small";

  const chipStyle = [
    styles.dayChip,
    isSmall && styles.dayChipSmall,
    selected && { backgroundColor: PREMIUM_COLORS.goldLight, borderColor: PREMIUM_COLORS.gold },
  ];

  const textStyle = [
    styles.dayChipText,
    isSmall && styles.dayChipTextSmall,
    { color: selected ? PREMIUM_COLORS.goldDark : dayInfo.color },
  ];

  if (onPress) {
    return (
      <TouchableOpacity style={chipStyle} onPress={onPress} activeOpacity={0.7}>
        <Text style={textStyle}>{dayInfo.label}</Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={chipStyle}>
      <Text style={textStyle}>{dayInfo.label}</Text>
    </View>
  );
};

// ============================================
// SCHEDULE CARD COMPONENT
// ============================================

interface ScheduleCardProps {
  schedule: MassSchedule;
  onEdit: () => void;
  onDelete: () => void;
}

const ScheduleCard: React.FC<ScheduleCardProps> = ({ schedule, onEdit, onDelete }) => {
  const [showMenu, setShowMenu] = useState(false);
  const canEdit = schedule.status !== "approved";
  const isRejected = schedule.status === "rejected";

  // Format time HH:MM:SS → HH:MM
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    const parts = timeStr.split(":");
    return `${parts[0]}:${parts[1]}`;
  };

  // Format date
  const formatDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const handleMenuPress = () => {
    if (canEdit) {
      setShowMenu(true);
    }
  };

  const handleEdit = () => {
    setShowMenu(false);
    onEdit();
  };

  const handleDelete = () => {
    setShowMenu(false);
    Alert.alert(
      "Xoá lịch lễ",
      "Bạn có chắc chắn muốn xoá lịch lễ này?",
      [
        { text: "Huỷ", style: "cancel" },
        { text: "Xoá", style: "destructive", onPress: onDelete },
      ]
    );
  };

  return (
    <View style={styles.scheduleCard}>
      {/* Decorative left border */}
      <View style={[styles.cardLeftBorder, { backgroundColor: STATUS_CONFIG[schedule.status].textColor }]} />

      <View style={styles.cardContent}>
        {/* Header: Time + Status */}
        <View style={styles.cardHeader}>
          <View style={styles.timeContainer}>
            <Ionicons name="time-outline" size={18} color={PREMIUM_COLORS.gold} />
            <Text style={styles.timeText}>{formatTime(schedule.time)}</Text>
          </View>
          <StatusBadge status={schedule.status} />
        </View>

        {/* Days chips row */}
        <View style={styles.daysRow}>
          {schedule.days_of_week
            .sort((a, b) => a - b)
            .map((day) => (
              <DayChip key={day} day={day} size="small" />
            ))}
        </View>

        {/* Note (if exists) */}
        {schedule.note && (
          <View style={styles.noteRow}>
            <Ionicons name="document-text-outline" size={14} color={GUIDE_COLORS.gray400} />
            <Text style={styles.noteText} numberOfLines={2}>
              {schedule.note}
            </Text>
          </View>
        )}

        {/* Rejection reason (if rejected) */}
        {isRejected && schedule.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="warning" size={16} color="#DC2626" />
            <Text style={styles.rejectionText}>
              Lý do: {schedule.rejection_reason}
            </Text>
          </View>
        )}

        {/* Footer: Code + Date + Actions */}
        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <View style={styles.codeContainer}>
              <Ionicons name="document-outline" size={12} color={GUIDE_COLORS.gray400} />
              <Text style={styles.codeText}>{schedule.code}</Text>
            </View>
            <View style={styles.dateContainer}>
              <Ionicons name="calendar-outline" size={12} color={GUIDE_COLORS.gray400} />
              <Text style={styles.dateText}>{formatDate(schedule.created_at)}</Text>
            </View>
          </View>

          {/* Actions (only for pending/rejected) */}
          {canEdit && (
            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.actionButton} onPress={handleEdit}>
                <Ionicons name="create-outline" size={16} color={PREMIUM_COLORS.gold} />
                <Text style={styles.actionText}>Sửa</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButton} onPress={handleDelete}>
                <Ionicons name="trash-outline" size={16} color="#DC2626" />
                <Text style={[styles.actionText, { color: "#DC2626" }]}>Xoá</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ============================================
// CREATE/EDIT MODAL COMPONENT
// ============================================

interface ScheduleFormData {
  days_of_week: DayOfWeek[];
  time: string;
  note: string;
}

interface ScheduleModalProps {
  visible: boolean;
  schedule?: MassSchedule | null;
  onClose: () => void;
  onSubmit: (data: ScheduleFormData) => void;
  loading?: boolean;
}

const ScheduleModal: React.FC<ScheduleModalProps> = ({
  visible,
  schedule,
  onClose,
  onSubmit,
  loading = false,
}) => {
  const isEdit = !!schedule;
  const insets = useSafeAreaInsets();
  const [formData, setFormData] = useState<ScheduleFormData>({
    days_of_week: [],
    time: "",
    note: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Initialize form data when modal opens
  React.useEffect(() => {
    if (visible) {
      if (schedule) {
        setFormData({
          days_of_week: schedule.days_of_week || [],
          time: schedule.time?.substring(0, 5) || "", // HH:MM
          note: schedule.note || "",
        });
      } else {
        setFormData({
          days_of_week: [],
          time: "",
          note: "",
        });
      }
      setErrors({});
    }
  }, [visible, schedule]);

  const toggleDay = (day: DayOfWeek) => {
    setFormData(prev => ({
      ...prev,
      days_of_week: prev.days_of_week.includes(day)
        ? prev.days_of_week.filter(d => d !== day)
        : [...prev.days_of_week, day].sort((a, b) => a - b),
    }));
    if (errors.days_of_week) {
      setErrors(prev => ({ ...prev, days_of_week: "" }));
    }
  };

  const handleTimeChange = (text: string) => {
    // Auto-format time input (HH:MM)
    let formatted = text.replace(/[^0-9]/g, "");
    if (formatted.length > 2) {
      formatted = formatted.substring(0, 2) + ":" + formatted.substring(2, 4);
    }
    setFormData(prev => ({ ...prev, time: formatted }));
    if (errors.time) {
      setErrors(prev => ({ ...prev, time: "" }));
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (formData.days_of_week.length === 0) {
      newErrors.days_of_week = "Vui lòng chọn ít nhất 1 ngày";
    }

    if (!formData.time) {
      newErrors.time = "Vui lòng nhập giờ";
    } else if (!/^\d{2}:\d{2}$/.test(formData.time)) {
      newErrors.time = "Giờ không hợp lệ (HH:MM)";
    } else {
      const [hours, minutes] = formData.time.split(":").map(Number);
      if (hours > 23 || minutes > 59) {
        newErrors.time = "Giờ không hợp lệ";
      }
    }

    if (formData.note && formData.note.length > 500) {
      newErrors.note = "Ghi chú tối đa 500 ký tự";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = () => {
    if (validate()) {
      onSubmit(formData);
    }
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.modalContent}>
              {/* Header */}
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEdit ? "Sửa lịch lễ" : "Thêm lịch lễ mới"}
                </Text>
                <TouchableOpacity onPress={onClose} style={styles.modalCloseButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Rejection notice for editing rejected schedule */}
              {isEdit && schedule?.status === "rejected" && (
                <View style={styles.rejectionNotice}>
                  <Ionicons name="information-circle" size={18} color="#D97706" />
                  <Text style={styles.rejectionNoticeText}>
                    Sau khi sửa, trạng thái sẽ chuyển về "Chờ duyệt"
                  </Text>
                </View>
              )}

              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                {/* Days of week selection */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Ngày trong tuần <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={styles.daysGrid}>
                    {DAYS_MAP.map((day) => (
                      <DayChip
                        key={day.value}
                        day={day.value}
                        selected={formData.days_of_week.includes(day.value)}
                        onPress={() => toggleDay(day.value)}
                      />
                    ))}
                  </View>
                  {errors.days_of_week && (
                    <Text style={styles.errorText}>{errors.days_of_week}</Text>
                  )}
                </View>

                {/* Time input */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    Giờ lễ <Text style={styles.required}>*</Text>
                  </Text>
                  <View style={[styles.inputContainer, errors.time && styles.inputError]}>
                    <Ionicons name="time-outline" size={20} color={PREMIUM_COLORS.gold} />
                    <TextInput
                      style={styles.textInput}
                      value={formData.time}
                      onChangeText={handleTimeChange}
                      placeholder="HH:MM (vd: 06:00)"
                      placeholderTextColor={GUIDE_COLORS.gray400}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                  {errors.time && (
                    <Text style={styles.errorText}>{errors.time}</Text>
                  )}
                </View>

                {/* Note input */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Ghi chú</Text>
                  <View style={[styles.inputContainer, styles.textAreaContainer]}>
                    <TextInput
                      style={[styles.textInput, styles.textArea]}
                      value={formData.note}
                      onChangeText={(text) => setFormData(prev => ({ ...prev, note: text }))}
                      placeholder="Vd: Lễ sáng trong tuần..."
                      placeholderTextColor={GUIDE_COLORS.gray400}
                      multiline
                      numberOfLines={3}
                      maxLength={500}
                    />
                  </View>
                  <Text style={styles.charCount}>{formData.note.length}/500</Text>
                  {errors.note && (
                    <Text style={styles.errorText}>{errors.note}</Text>
                  )}
                </View>
              </ScrollView>

              {/* Footer buttons */}
              <View style={[styles.modalFooter, { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.md) }]}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={onClose}
                  disabled={loading}
                >
                  <Text style={styles.cancelButtonText}>Huỷ</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitButton, loading && styles.submitButtonDisabled]}
                  onPress={handleSubmit}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <>
                      <Ionicons name="checkmark" size={20} color="#FFF" />
                      <Text style={styles.submitButtonText}>
                        {isEdit ? "Cập nhật" : "Tạo mới"}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  filter: StatusFilter;
  onCreatePress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ filter, onCreatePress }) => {
  const getMessage = () => {
    switch (filter) {
      case "pending":
        return "Không có lịch lễ chờ duyệt";
      case "approved":
        return "Không có lịch lễ đã duyệt";
      case "rejected":
        return "Không có lịch lễ bị từ chối";
      default:
        return "Chưa có lịch lễ nào";
    }
  };

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons name="church" size={48} color={PREMIUM_COLORS.goldLight} />
      </View>
      <Text style={styles.emptyTitle}>{getMessage()}</Text>
      <Text style={styles.emptySubtitle}>
        Thêm lịch lễ mới để quản lý thời gian cử hành thánh lễ
      </Text>
      {filter === "all" && (
        <TouchableOpacity style={styles.emptyButton} onPress={onCreatePress}>
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>Thêm lịch lễ</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// MAIN SCHEDULES TAB COMPONENT
// ============================================

interface SchedulesTabProps {
  onCreatePress?: () => void;
}

const SchedulesTab: React.FC<SchedulesTabProps> = () => {
  const {
    filteredSchedules,
    loading,
    refreshing,
    creating,
    updating,
    statusFilter,
    setStatusFilter,
    refetch,
    create,
    update,
    remove,
  } = useMassSchedule();

  const [modalVisible, setModalVisible] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<MassSchedule | null>(null);
  // IMPORTANT: All hooks must be called BEFORE any conditional returns
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  // Refetch on focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleCreatePress = () => {
    setEditingSchedule(null);
    setModalVisible(true);
  };

  const handleEditPress = (schedule: MassSchedule) => {
    setEditingSchedule(schedule);
    setModalVisible(true);
  };

  const handleDeletePress = async (schedule: MassSchedule) => {
    const success = await remove(schedule.id);
    if (success) {
      Alert.alert("Thành công", "Đã xoá lịch lễ");
    }
  };

  const handleModalSubmit = async (data: ScheduleFormData) => {
    if (editingSchedule) {
      // Update
      const result = await update(editingSchedule.id, {
        days_of_week: data.days_of_week,
        time: data.time,
        note: data.note || undefined,
      });
      if (result) {
        setModalVisible(false);
        Alert.alert("Thành công", "Đã cập nhật lịch lễ");
      }
    } else {
      // Create
      const result = await create({
        days_of_week: data.days_of_week,
        time: data.time,
        note: data.note || undefined,
      });
      if (result) {
        setModalVisible(false);
        Alert.alert("Thành công", "Đã tạo lịch lễ mới");
      }
    }
  };

  const renderScheduleCard = ({ item }: { item: MassSchedule }) => (
    <ScheduleCard
      schedule={item}
      onEdit={() => handleEditPress(item)}
      onDelete={() => handleDeletePress(item)}
    />
  );

  // Loading state
  if (loading && filteredSchedules.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        <Text style={styles.loadingText}>Đang tải lịch lễ...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>Danh sách lịch lễ</Text>
        {/* Filter Trigger Button */}
        <FilterTrigger
          activeFilter={statusFilter}
          onPress={() => setShowFilterSheet(true)}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onClose={() => setShowFilterSheet(false)}
      />

      {/* Schedule list */}
      <FlatList
        data={filteredSchedules}
        keyExtractor={(item) => item.id}
        renderItem={renderScheduleCard}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={refetch}
            tintColor={PREMIUM_COLORS.gold}
            colors={[PREMIUM_COLORS.gold]}
          />
        }
        ListEmptyComponent={
          <EmptyState filter={statusFilter} onCreatePress={handleCreatePress} />
        }
        ItemSeparatorComponent={() => <View style={{ height: GUIDE_SPACING.sm }} />}
      />

      {/* FAB - Create button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleCreatePress}
        activeOpacity={0.8}
      >
        <Ionicons name="add" size={28} color="#FFF" />
      </TouchableOpacity>

      {/* Create/Edit Modal */}
      <ScheduleModal
        visible={modalVisible}
        schedule={editingSchedule}
        onClose={() => setModalVisible(false)}
        onSubmit={handleModalSubmit}
        loading={creating || updating}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PREMIUM_COLORS.cream,
  },
  loadingText: {
    marginTop: GUIDE_SPACING.md,
    fontSize: 14,
    color: GUIDE_COLORS.textSecondary,
  },

  // Filter chips - Legacy (keep for compatibility)
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    gap: GUIDE_SPACING.xs,
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  filterChipText: {
    fontSize: 12,
    fontWeight: "600",
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },

  // Filter Trigger Button
  filterTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  filterTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },

  // Bottom Sheet
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleBarContainer: {
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUIDE_COLORS.gray300,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  closeButton: {
    padding: GUIDE_SPACING.xs,
  },
  filterOptionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: "#FFF",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  filterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionText: {
    gap: 2,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  filterOptionDescription: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetFooter: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.md,
  },
  applyButton: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: "center",
    ...GUIDE_SHADOWS.md,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },

  // List
  listContent: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: 100,
  },

  // Schedule Card
  scheduleCard: {
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    flexDirection: "row",
    overflow: "hidden",
    ...GUIDE_SHADOWS.sm,
  },
  cardLeftBorder: {
    width: 4,
  },
  cardContent: {
    flex: 1,
    padding: GUIDE_SPACING.md,
  },
  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.sm,
  },
  timeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  timeText: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },

  // Status badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "600",
  },

  // Days row
  daysRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: PREMIUM_COLORS.warmGray,
  },
  dayChipSmall: {
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dayChipText: {
    fontSize: 13,
    fontWeight: "600",
  },
  dayChipTextSmall: {
    fontSize: 11,
  },

  // Note row
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  noteText: {
    flex: 1,
    fontSize: 13,
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 18,
  },

  // Rejection box
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.xs,
    padding: GUIDE_SPACING.sm,
    backgroundColor: "#FEE2E2",
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: "#FECACA",
    marginBottom: GUIDE_SPACING.sm,
  },
  rejectionText: {
    flex: 1,
    fontSize: 12,
    color: "#DC2626",
    lineHeight: 16,
  },

  // Card footer
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: GUIDE_SPACING.xs,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  footerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  codeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  codeText: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
    fontFamily: "monospace",
  },
  dateContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  dateText: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
  },
  actionsRow: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },

  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xl * 2,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#FFF",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.sm,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
  },
  emptySubtitle: {
    fontSize: 13,
    color: GUIDE_COLORS.textSecondary,
    textAlign: "center",
    marginBottom: GUIDE_SPACING.md,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    backgroundColor: PREMIUM_COLORS.gold,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    ...GUIDE_SHADOWS.md,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },

  // FAB - Soft floating shadow
  fab: {
    position: "absolute",
    bottom: GUIDE_SPACING.lg,
    right: GUIDE_SPACING.md,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: PREMIUM_COLORS.gold,
    alignItems: "center",
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xl,
    maxHeight: "85%",
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  modalCloseButton: {
    padding: GUIDE_SPACING.xs,
  },
  modalBody: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
  },
  rejectionNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    marginHorizontal: GUIDE_SPACING.lg,
    marginTop: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.sm,
    backgroundColor: "#FEF3C7",
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  rejectionNoticeText: {
    flex: 1,
    fontSize: 12,
    color: "#D97706",
  },

  // Form
  formGroup: {
    marginBottom: GUIDE_SPACING.lg,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },
  required: {
    color: "#DC2626",
  },
  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.sm,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  inputError: {
    borderColor: "#DC2626",
  },
  textAreaContainer: {
    alignItems: "flex-start",
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: GUIDE_COLORS.textPrimary,
    padding: 0,
  },
  textArea: {
    height: 80,
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
    textAlign: "right",
    marginTop: 4,
  },
  errorText: {
    fontSize: 12,
    color: "#DC2626",
    marginTop: 4,
  },

  // Modal footer
  modalFooter: {
    flexDirection: "row",
    gap: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    alignItems: "center",
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  submitButton: {
    flex: 2,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: PREMIUM_COLORS.gold,
    ...GUIDE_SHADOWS.sm,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FFF",
  },
});

export default SchedulesTab;
