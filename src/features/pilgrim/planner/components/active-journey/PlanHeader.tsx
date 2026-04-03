import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import { PlanEntity, PlanItem } from "../../../../../types/pilgrim/planner.types";

type Props = {
  plan: PlanEntity;
  firstItem: PlanItem | null;
  compact?: boolean;
};

export default function PlanHeader({ plan, firstItem, compact }: Props) {
  return (
    <View style={[styles.container, compact && { borderRadius: 0 }]}>
      <Image
        source={{
          uri:
            firstItem?.site?.cover_image ||
            firstItem?.site?.image ||
            "https://via.placeholder.com/1200x500?text=Pilgrim+Journey",
        }}
        style={styles.banner}
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.8)"]}
        style={styles.gradientOverlay}
      >
        <Text style={styles.subtitle}>
          {firstItem?.site?.name || "Điểm đến kế tiếp sẽ hiển thị tại đây"}
        </Text>
        {!!firstItem?.site?.address && (
          <Text style={styles.address} numberOfLines={1}>
            {firstItem.site.address}
          </Text>
        )}
      </LinearGradient>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundCard,
    position: "relative",
  },
  banner: { width: "100%", height: 190 },
  gradientOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
    paddingTop: 32,
  },
  subtitle: { 
    fontSize: 18, 
    fontWeight: "700", 
    color: "#FFFFFF" 
  },
  address: { 
    marginTop: 4, 
    fontSize: 13, 
    color: "rgba(255, 255, 255, 0.85)" 
  },
});
