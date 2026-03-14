import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { STATUS_COLORS } from "../constants";

type BadgeStatus = "pending" | "approved" | "rejected";

interface StatusBadgeProps {
  status: BadgeStatus;
  label: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({ status, label }) => {
  const config = STATUS_COLORS[status];
  return (
    <View style={[styles.badge, { backgroundColor: config.bg }]}>
      <Text style={[styles.text, { color: config.color }]}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  text: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },
});
