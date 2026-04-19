import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import { styles } from "./ConfigurationStep.styles";
import { MonthCalendar } from "./MonthCalendar";

interface AIRouteConfig {
  startDate: string;
  maxDays: number;
  transportMode: "car" | "motorbike" | "bus";
  priority: "time" | "distance" | "balanced" | "spiritual";
  numberOfPeople: number;
}

interface ConfigurationStepProps {
  config: AIRouteConfig;
  onChange: (config: Partial<AIRouteConfig>) => void;
}

const TRANSPORT_OPTIONS = [
  { value: "car", icon: "car", label: "Ô tô" },
  { value: "motorbike", icon: "bicycle", label: "Xe máy" },
  { value: "bus", icon: "bus", label: "Xe buýt" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "time", icon: "time", label: "Tiết kiệm thời gian", desc: "Ưu tiên lộ trình nhanh nhất" },
  { value: "distance", icon: "navigate", label: "Tiết kiệm quãng đường", desc: "Ưu tiên lộ trình ngắn nhất" },
  { value: "balanced", icon: "scale", label: "Cân bằng", desc: "Cân bằng thời gian và quãng đường" },
  { value: "spiritual", icon: "heart", label: "Tâm linh", desc: "Ưu tiên ý nghĩa tâm linh" },
] as const;

export const ConfigurationStep = ({ config, onChange }: ConfigurationStepProps) => {
  const { t } = useTranslation();
  const [showDatePicker, setShowDatePicker] = useState(false);

  const transportOptions = [
    { value: "car" as const, icon: "car", label: t("aiRoute.configuration.transportCar") },
    { value: "motorbike" as const, icon: "bicycle", label: t("aiRoute.configuration.transportMotorbike") },
    { value: "bus" as const, icon: "bus", label: t("aiRoute.configuration.transportBus") },
  ];

  const priorityOptions = [
    { value: "time" as const, icon: "time", label: t("aiRoute.configuration.priorityTime"), desc: t("aiRoute.configuration.priorityTimeDesc") },
    { value: "distance" as const, icon: "navigate", label: t("aiRoute.configuration.priorityDistance"), desc: t("aiRoute.configuration.priorityDistanceDesc") },
    { value: "balanced" as const, icon: "scale", label: t("aiRoute.configuration.priorityBalanced"), desc: t("aiRoute.configuration.priorityBalancedDesc") },
    { value: "spiritual" as const, icon: "heart", label: t("aiRoute.configuration.prioritySpiritual"), desc: t("aiRoute.configuration.prioritySpiritualDesc") },
  ];

  const handleDateChange = (date: string) => {
    onChange({ startDate: date });
    setShowDatePicker(false);
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Start Date */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="calendar" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {t("aiRoute.configuration.startDate", { defaultValue: "Ngày bắt đầu" })}
          </Text>
        </View>
        <TouchableOpacity 
          style={styles.dateButton} 
          onPress={() => setShowDatePicker(!showDatePicker)}
        >
          <Text style={styles.dateButtonText}>
            {new Date(config.startDate).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })}
          </Text>
          <Ionicons 
            name={showDatePicker ? "chevron-up" : "chevron-down"} 
            size={20} 
            color={COLORS.textSecondary} 
          />
        </TouchableOpacity>

        {/* Calendar Picker - Show right after date button */}
        {showDatePicker && (
          <View style={{ marginTop: 12 }}>
            <MonthCalendar
              selectedDate={config.startDate}
              onDateSelect={handleDateChange}
              minDate={new Date()}
            />
          </View>
        )}
      </View>

      {/* Max Days */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="time" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {t("aiRoute.configuration.maxDays", { defaultValue: "Số ngày tối đa" })}
          </Text>
        </View>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => onChange({ maxDays: Math.max(1, config.maxDays - 1) })}
          >
            <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>
            {config.maxDays} {t("aiRoute.configuration.days")}
          </Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => onChange({ maxDays: Math.min(7, config.maxDays + 1) })}
          >
            <Ionicons name="add" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Transport Mode */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="car" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {t("aiRoute.configuration.transport", { defaultValue: "Phương tiện" })}
          </Text>
        </View>
        <View style={styles.transportRow}>
          {transportOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.transportBox,
                config.transportMode === option.value && styles.transportBoxActive,
              ]}
              onPress={() => onChange({ transportMode: option.value })}
            >
              <Ionicons
                name={option.icon as any}
                size={28}
                color={config.transportMode === option.value ? COLORS.white : COLORS.textTertiary}
              />
              <Text
                style={[
                  styles.transportLabel,
                  config.transportMode === option.value && styles.transportLabelActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Priority */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="flag" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {t("aiRoute.configuration.priority", { defaultValue: "Ưu tiên" })}
          </Text>
        </View>
        {priorityOptions.map((option) => (
          <TouchableOpacity
            key={option.value}
            style={[
              styles.priorityCard,
              config.priority === option.value && styles.priorityCardActive,
            ]}
            onPress={() => onChange({ priority: option.value })}
          >
            <View style={styles.priorityIcon}>
              <Ionicons
                name={option.icon as any}
                size={20}
                color={config.priority === option.value ? "#D4AF37" : COLORS.textSecondary}
              />
            </View>
            <View style={styles.priorityInfo}>
              <Text
                style={[
                  styles.priorityLabel,
                  config.priority === option.value && styles.priorityLabelActive,
                ]}
              >
                {option.label}
              </Text>
              <Text style={styles.priorityDesc}>{option.desc}</Text>
            </View>
            {config.priority === option.value && (
              <Ionicons name="checkmark-circle" size={24} color="#D4AF37" />
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Number of People */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Ionicons name="people" size={20} color="#D4AF37" />
          <Text style={styles.sectionTitle}>
            {t("aiRoute.configuration.people", { defaultValue: "Số người tham gia" })}
          </Text>
        </View>
        <View style={styles.counterRow}>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => onChange({ numberOfPeople: Math.max(1, config.numberOfPeople - 1) })}
          >
            <Ionicons name="remove" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.counterValue}>
            {config.numberOfPeople} {t("aiRoute.configuration.people")}
          </Text>
          <TouchableOpacity
            style={styles.counterButton}
            onPress={() => onChange({ numberOfPeople: Math.min(50, config.numberOfPeople + 1) })}
          >
            <Ionicons name="add" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
};

// Helper functions
function getTomorrowDate(): string {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split("T")[0];
}
