import React from "react";
import { View, Text, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { COLORS } from "../../../../../constants/theme.constants";

interface MemberHistoryListProps {
  allItems: any[];
  history: Array<{
    planner_item_id: string;
    status: string;
    checkin_date?: string;
  }>;
}

export default function MemberHistoryList({ allItems, history }: MemberHistoryListProps) {
  return (
    <>
      {allItems.map((item) => {
        const hist = history.find(
          (h) => String(h.planner_item_id) === String(item.id)
        );

        let statusText = "Chưa check-in";
        let color = COLORS.textSecondary;
        let icon: keyof typeof Ionicons.glyphMap = "ellipse-outline";

        if (hist) {
          if (hist.status === "checked_in") {
            statusText = "Đã check-in";
            color = COLORS.success;
            icon = "checkmark-circle";
          } else if (
            hist.status === "skipped_by_planner" ||
            hist.status === "skipped"
          ) {
            statusText = "Đã bỏ qua";
            color = COLORS.warning;
            icon = "play-skip-forward-circle";
          } else if (hist.status === "missed") {
            statusText = "Bỏ lỡ";
            color = COLORS.danger;
            icon = "close-circle";
          } else {
            statusText = hist.status;
          }
        }

        const imgUri = item.site?.cover_image || "https://via.placeholder.com/100";

        return (
          <View key={item.id} style={styles.historyItem}>
            <Image source={{ uri: imgUri }} style={styles.historyImg} />
            <View style={styles.historyBody}>
              <Text style={styles.historySiteName} numberOfLines={1}>
                {item.site?.name || "Tên địa điểm"}
              </Text>
              <View style={styles.historyStatusRow}>
                <Ionicons name={icon} size={14} color={color} />
                <Text style={[styles.historyStatusText, { color }]}>
                  {statusText}
                </Text>
              </View>
            </View>
          </View>
        );
      })}
    </>
  );
}

const styles = StyleSheet.create({
  historyItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8F9FA",
    padding: 8,
    borderRadius: 8,
  },
  historyImg: {
    width: 44,
    height: 44,
    borderRadius: 6,
    backgroundColor: "#E0E0E0",
  },
  historyBody: {
    flex: 1,
    marginLeft: 10,
  },
  historySiteName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  historyStatusRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  historyStatusText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
