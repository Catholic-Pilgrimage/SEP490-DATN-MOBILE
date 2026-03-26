/**
 * Nút mở khu vực mô hình 3D — pill vàng, không animation lặp.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { Platform, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { PREMIUM_COLORS } from "../constants";

export type SiteModels3dEntryVariant = "toolbar" | "hero";

export interface SiteModels3dEntryButtonProps {
  onPress: () => void;
  /** Nhãn hiển thị (vd. "Mô hình 3D" / "Toàn màn 3D") */
  label: string;
  accessibilityHint?: string;
  variant?: SiteModels3dEntryVariant;
}

export const SiteModels3dEntryButton: React.FC<SiteModels3dEntryButtonProps> = ({
  onPress,
  label,
  accessibilityHint,
  variant = "toolbar",
}) => {
  const isHero = variant === "hero";

  return (
    <View style={[styles.wrap, isHero && styles.wrapHero]}>
      <TouchableOpacity
        style={[styles.btn, isHero && styles.btnHero]}
        onPress={onPress}
        activeOpacity={0.88}
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint={accessibilityHint}
      >
        <MaterialIcons
          name="view-in-ar"
          size={isHero ? 24 : 22}
          color="#fff"
        />
        <Text style={[styles.label, isHero && styles.labelHero]} numberOfLines={1}>
          {label}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center",
    minWidth: 44,
    minHeight: 44,
  },
  wrapHero: {
    minHeight: 48,
  },
  btn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    backgroundColor: PREMIUM_COLORS.gold,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.28,
        shadowRadius: 6,
      },
      android: { elevation: 8 },
    }),
  },
  btnHero: {
    height: 48,
    paddingHorizontal: 18,
    borderRadius: 24,
    gap: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.22)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  labelHero: {
    fontSize: 14,
    maxWidth: 220,
  },
});
