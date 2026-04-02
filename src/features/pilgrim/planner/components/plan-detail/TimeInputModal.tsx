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
import { COLORS } from "../../../../../constants/theme.constants";

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
}

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
  } = props;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={styles.modalHeader}>
          <Text style={styles.modalTitle}>{t("planner.setTime")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.modalClose}>{t("common.cancel")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={{ padding: 16 }}>
          <Text style={styles.timeInputLabel}>
            {t("planner.addLocationDay")} {selectedDay}
          </Text>
          <Text style={styles.timeInputDescription}>
            Vui lòng chọn giờ dự kiến và thời gian nghỉ (tối thiểu 1 giờ).
          </Text>

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
      </View>
    </Modal>
  );
}
