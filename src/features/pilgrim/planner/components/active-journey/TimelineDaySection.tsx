import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import { PlanItem } from "../../../../../types/pilgrim/planner.types";
import StopCard from "./StopCard";

type Props = {
  dayKey: string;
  items: PlanItem[];
  onPressItem?: (item: PlanItem) => void;
};

export default function TimelineDaySection({ dayKey, items, onPressItem }: Props) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Ngày {dayKey}</Text>
      {items.length === 0 ? (
        <View style={styles.emptyBox}>
          <Text style={styles.emptyText}>Chưa có điểm đến trong ngày này</Text>
        </View>
      ) : (
        items.map((item) => (
          <StopCard key={item.id} item={item} onPress={() => onPressItem?.(item)} />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginTop: SPACING.md },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  emptyBox: {
    borderRadius: 12,
    backgroundColor: COLORS.backgroundSoft,
    padding: 14,
  },
  emptyText: { fontSize: 13, color: COLORS.textSecondary },
});
