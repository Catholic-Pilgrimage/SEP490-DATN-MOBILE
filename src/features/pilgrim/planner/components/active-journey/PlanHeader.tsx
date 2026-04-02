import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import { PlanEntity, PlanItem } from "../../../../../types/pilgrim/planner.types";

type Props = {
  plan: PlanEntity;
  firstItem: PlanItem | null;
};

export default function PlanHeader({ plan, firstItem }: Props) {
  return (
    <View style={styles.container}>
      <Image
        source={{
          uri:
            firstItem?.site?.cover_image ||
            firstItem?.site?.image ||
            "https://via.placeholder.com/1200x500?text=Pilgrim+Journey",
        }}
        style={styles.banner}
      />
      <View style={styles.content}>
        <Text style={styles.title}>{plan.name}</Text>
        <Text style={styles.subtitle}>
          {firstItem?.site?.name || "Điểm đến kế tiếp sẽ hiển thị tại đây"}
        </Text>
        {!!firstItem?.site?.address && (
          <Text style={styles.address}>{firstItem.site.address}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundCard,
  },
  banner: { width: "100%", height: 180 },
  content: { padding: SPACING.md },
  title: { fontSize: 20, fontWeight: "700", color: COLORS.textPrimary },
  subtitle: {
    marginTop: 6,
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  address: { marginTop: 4, fontSize: 13, color: COLORS.textSecondary },
});
