import { Ionicons } from "@expo/vector-icons";
import Slider from "@react-native-community/slider";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS } from "../../../../../constants/theme.constants";
import { PlanItem } from "../../../../../types/pilgrim/planner.types";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";

export interface EditItemModalProps {
  visible: boolean;
  onClose: () => void;
  t: (key: string, options?: any) => string;
  styles: any;
  editingItem: PlanItem | null;
  calculatingEditRoute: boolean;
  editRouteInfo: string;
  openEditTimePicker: () => void;
  editEstimatedTime: string;
  editRestDuration: number;
  setEditRestDuration: (v: number) => void;
  formatDuration: (v: number) => string;
  editNote: string;
  setEditNote: (v: string) => void;
  handleSaveEditItem: () => void;
  savingEdit: boolean;
  /** Lưu tiện ích lân cận vào điểm — mở modal chọn (không thuộc màn hành hương). */
  onOpenNearbyPlaces?: () => void;
}

export default function EditItemModal(props: EditItemModalProps) {
  const {
    visible,
    onClose,
    t,
    styles,
    editingItem,
    calculatingEditRoute,
    editRouteInfo,
    openEditTimePicker,
    editEstimatedTime,
    editRestDuration,
    setEditRestDuration,
    formatDuration,
    editNote,
    setEditNote,
    handleSaveEditItem,
    savingEdit,
    onOpenNearbyPlaces,
  } = props;
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.modalContainer, { paddingTop: Math.max(insets.top, 20) }]}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>Chỉnh sửa địa điểm</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>Hủy</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 16) + 20 }}>
          {editingItem && (
            <Text style={[styles.timeInputLabel, { marginBottom: 16 }]}>
              {editingItem.site.name}
            </Text>
          )}

          {calculatingEditRoute ? (
            <View style={styles.routeInfoContainer}>
              <ActivityIndicator size="small" color={COLORS.textPrimary} />
              <Text style={styles.routeInfoText}>Đang tính toán lộ trình...</Text>
            </View>
          ) : editRouteInfo ? (
            <View style={styles.routeInfoContainer}>
              <Ionicons name="car-outline" size={20} color={COLORS.textPrimary} />
              <Text style={styles.routeInfoText}>{editRouteInfo}</Text>
            </View>
          ) : null}

          <View style={styles.timeInputContainer}>
            <Text style={styles.timeInputFieldLabel}>{t("planner.estimatedTime")}</Text>
            <TouchableOpacity style={styles.timePickerButton} onPress={openEditTimePicker}>
              <Ionicons name="time-outline" size={24} color={COLORS.primary} />
              <Text style={styles.timePickerButtonText}>{editEstimatedTime}</Text>
              <Ionicons name="chevron-down" size={20} color={COLORS.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.timeInputContainer}>
            <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
            <Text style={styles.durationValueText}>{formatDuration(editRestDuration)}</Text>
            <Slider
              style={styles.slider}
              minimumValue={60}
              maximumValue={240}
              step={15}
              value={editRestDuration}
              onValueChange={setEditRestDuration}
              minimumTrackTintColor={COLORS.primary}
              maximumTrackTintColor={COLORS.border}
              thumbTintColor={COLORS.accent}
            />
            <View style={styles.sliderLabels}>
              <Text style={styles.sliderLabelText}>1 {t("planner.hour")}</Text>
              <Text style={styles.sliderLabelText}>4 {t("planner.hours")}</Text>
            </View>
          </View>

          <View style={styles.noteInputContainer}>
            <Text style={styles.timeInputFieldLabel}>{t("planner.noteOptional")}</Text>
            <TextInput
              style={styles.noteInput}
              placeholder={t("planner.notePlaceholder")}
              placeholderTextColor={COLORS.textTertiary}
              value={editNote}
              onChangeText={setEditNote}
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
          </View>

          {onOpenNearbyPlaces ? (
            <TouchableOpacity
              style={styles.itemDetailActionBtn}
              onPress={onOpenNearbyPlaces}
              activeOpacity={0.85}
            >
              <Ionicons name="map-outline" size={22} color={COLORS.accent} />
              <Text style={styles.itemDetailActionText}>
                {t("planner.savedNearbyCta", {
                  defaultValue: "Chọn tiện ích lân cận lưu vào điểm",
                })}
              </Text>
            </TouchableOpacity>
          ) : null}

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleSaveEditItem}
            disabled={savingEdit}
          >
            {savingEdit ? (
              <ActivityIndicator color={COLORS.textPrimary} />
            ) : (
              <Text style={styles.confirmButtonText}>Lưu thay đổi</Text>
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
