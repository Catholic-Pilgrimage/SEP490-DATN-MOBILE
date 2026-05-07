import { Ionicons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import { SuggestRouteResponse } from "../../../../../services/ai/aiService";
import { styles } from "./ResultStep.styles";

interface ResultStepProps {
  result: SuggestRouteResponse;
}

export const ResultStep = ({ result }: ResultStepProps) => {
  const { t } = useTranslation();
  const [expandedDays, setExpandedDays] = useState<number[]>([1]);

  const toggleDay = (dayNumber: number) => {
    setExpandedDays((prev) =>
      prev.includes(dayNumber)
        ? prev.filter((d) => d !== dayNumber)
        : [...prev, dayNumber]
    );
  };

  // Helper function to get transport label
  const getTransportLabel = (mode: string) => {
    const labels: Record<string, string> = {
      car: t("aiRoute.configuration.transportCar", { defaultValue: "Ô tô" }),
      motorbike: t("aiRoute.configuration.transportMotorbike", { defaultValue: "Xe máy" }),
      bus: t("aiRoute.configuration.transportBus", { defaultValue: "Xe buýt" }),
    };
    return labels[mode] || mode;
  };

  // Helper function to get priority label
  const getPriorityLabel = (priority: string) => {
    const labels: Record<string, string> = {
      shortest_distance: t("aiRoute.configuration.priorityShortestDistance", { defaultValue: "Tối ưu di chuyển" }),
      balanced: t("aiRoute.configuration.priorityBalanced", { defaultValue: "Cân bằng" }),
      most_spiritual: t("aiRoute.configuration.prioritySpiritual", { defaultValue: "Tâm linh" }),
    };
    return labels[priority] || priority;
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Route Summary */}
      <View style={styles.summaryCard}>
        <View style={styles.summaryHeader}>
          <Ionicons name="map" size={32} color={COLORS.accent} />
          <View style={styles.summaryHeaderText}>
            <Text style={styles.routeName}>{result.data.planner.name}</Text>
            <View style={styles.summaryMeta}>
              <View style={styles.metaItem}>
                <Ionicons name="calendar" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>
                  {result.data.planner.estimated_days} {t("aiRoute.configuration.days")}
                </Text>
              </View>
              <View style={styles.metaItem}>
                <Ionicons name="navigate" size={16} color={COLORS.textSecondary} />
                <Text style={styles.metaText}>{result.data.total_estimated_km} km</Text>
              </View>
            </View>
          </View>
        </View>

        {/* AI Summary */}
        {result.data.summary && (
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>
              {t("aiRoute.result.summary", { defaultValue: "Tổng quan" })}
            </Text>
            <Text style={styles.summaryText}>{result.data.summary}</Text>
          </View>
        )}

        {/* Tips */}
        {result.data.tips && result.data.tips.length > 0 && (
          <View style={styles.tipsSection}>
            <Text style={styles.tipsTitle}>
              {t("aiRoute.result.tips", { defaultValue: "Gợi ý từ AI" })}
            </Text>
            {result.data.tips.map((tip, index) => (
              <View key={index} style={styles.tipItem}>
                <Ionicons name="bulb" size={16} color={COLORS.warning} />
                <Text style={styles.tipText}>{tip}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Daily Itinerary */}
      <View style={styles.itinerarySection}>
        <Text style={styles.sectionTitle}>
          {t("aiRoute.result.itinerary", { defaultValue: "Lịch trình chi tiết" })}
        </Text>
        {result.data.daily_itinerary.map((day) => (
          <View key={day.day_number} style={styles.dayCard}>
            <TouchableOpacity
              style={styles.dayHeader}
              onPress={() => toggleDay(day.day_number)}
            >
              <View style={styles.dayHeaderLeft}>
                <View style={styles.dayBadge}>
                  <Text style={styles.dayBadgeText}>
                    {t("aiRoute.result.day")} {day.day_number}
                  </Text>
                </View>
                <Text style={styles.dayTheme}>{day.theme}</Text>
              </View>
              <Ionicons
                name={expandedDays.includes(day.day_number) ? "chevron-up" : "chevron-down"}
                size={24}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>

            {expandedDays.includes(day.day_number) && (
              <View style={styles.dayContent}>
                {day.items.map((item, index) => (
                  <View key={index} style={styles.itemCard}>
                    <View style={styles.itemHeader}>
                      <View style={styles.itemOrderBadge}>
                        <Text style={styles.itemOrderText}>{item.order_index}</Text>
                      </View>
                      <Text style={styles.itemSiteName}>{item.site_name}</Text>
                    </View>

                    <View style={styles.itemDetails}>
                      <View style={styles.itemDetailRow}>
                        <Ionicons name="time" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.itemDetailText}>
                          {t("aiRoute.result.time")}: {item.estimated_time}
                        </Text>
                      </View>
                      {item.rest_duration && (
                        <View style={styles.itemDetailRow}>
                          <Ionicons name="cafe" size={16} color={COLORS.textSecondary} />
                          <Text style={styles.itemDetailText}>
                            {t("aiRoute.result.rest")}: {item.rest_duration}
                          </Text>
                        </View>
                      )}
                      {item.travel_time_minutes > 0 && index < day.items.length - 1 && (
                        <View style={styles.travelTimeRow}>
                          <Ionicons name="arrow-forward" size={16} color={COLORS.accent} />
                          <Text style={styles.travelTimeText}>
                            {t("aiRoute.result.travel")}: {item.travel_time_minutes} {t("aiRoute.result.minutes")}
                          </Text>
                        </View>
                      )}
                    </View>

                    {item.note && (
                      <View style={styles.itemNote}>
                        <Ionicons name="information-circle" size={16} color={COLORS.info} />
                        <Text style={styles.itemNoteText}>{item.note}</Text>
                      </View>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>
        ))}
      </View>

      {/* Metadata */}
      <View style={styles.metadataCard}>
        <Text style={styles.metadataTitle}>{t("aiRoute.result.metadataTitle")}</Text>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("aiRoute.result.transport")}:</Text>
          <Text style={styles.metadataValue}>{getTransportLabel(result.data.metadata.transport_mode)}</Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("aiRoute.result.priority")}:</Text>
          <Text style={styles.metadataValue}>{getPriorityLabel(result.data.metadata.priority)}</Text>
        </View>
        <View style={styles.metadataRow}>
          <Text style={styles.metadataLabel}>{t("aiRoute.result.sitesCount")}:</Text>
          <Text style={styles.metadataValue}>{result.data.metadata.sites_count}</Text>
        </View>
      </View>
    </ScrollView>
  );
};
