import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import { PlanItem } from "../../../../../types/pilgrim/planner.types";
import { calculateEndTime, formatTimeValue } from "../../utils/time";

type Props = {
  item: PlanItem;
  onPress?: () => void;
};

export default function StopCard({ item, onPress }: Props) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.85}>
      <Image
        source={{ uri: item.site.cover_image || item.site.image || "https://via.placeholder.com/80" }}
        style={styles.image}
      />
      <View style={styles.content}>
        <Text style={styles.name}>{item.site.name}</Text>
        {!!item.site.address && (
          <Text style={styles.address} numberOfLines={1}>
            {item.site.address}
          </Text>
        )}
        <View style={styles.timeRow}>
          <Ionicons name="time-outline" size={14} color={COLORS.accent} />
          <Text style={styles.timeText}>
            {formatTimeValue(item.estimated_time || item.arrival_time)}
            {item.rest_duration
              ? ` - ${calculateEndTime(item.estimated_time || item.arrival_time, item.rest_duration)}`
              : ""}
          </Text>
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: 14,
    padding: 10,
    marginBottom: 8,
  },
  image: { width: 56, height: 56, borderRadius: 10, marginRight: 10 },
  content: { flex: 1 },
  name: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  address: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },
  timeRow: { marginTop: 6, flexDirection: "row", alignItems: "center" },
  timeText: { marginLeft: 5, fontSize: 12, color: COLORS.textSecondary, fontWeight: "600" },
});
