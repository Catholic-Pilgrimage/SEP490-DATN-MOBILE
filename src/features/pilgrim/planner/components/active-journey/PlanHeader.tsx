import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, View } from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import { PlanEntity, PlanItem } from "../../../../../types/pilgrim/planner.types";

type Props = {
  plan: PlanEntity;
  firstItem: PlanItem | null;
  compact?: boolean;
};

export default function PlanHeader({ plan, firstItem, compact }: Props) {
  const { t } = useTranslation();
  const heroTitle =
    firstItem?.site?.name ||
    t("planner.active.nextStopPlaceholder", {
      defaultValue: "Điểm đến kế tiếp sẽ hiển thị tại đây",
    });
  const normalizedHeroTitle = heroTitle.trim();
  const titleLength = normalizedHeroTitle.length;
  const heroTitleStyle =
    titleLength > 34
      ? styles.subtitleLong
      : titleLength > 22
        ? styles.subtitleMedium
        : styles.subtitleShort;

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
        colors={["rgba(12, 8, 4, 0.16)", "rgba(12, 8, 4, 0.48)", "rgba(12, 8, 4, 0.9)"]}
        locations={[0, 0.5, 1]}
        style={styles.topGlowOverlay}
      />
      <View style={styles.pilgrimBadge}>
        <Ionicons name="sparkles-outline" size={13} color="#FDE68A" />
        <Text style={styles.pilgrimBadgeText}>
          {t("planner.active.pilgrimageLive", { defaultValue: "Đang hành hương" })}
        </Text>
      </View>
      <View style={styles.heroContentWrap}>
        <View style={styles.heroContentCard}>
          <Text style={styles.heroEyebrow}>
            {t("planner.active.nextStop", { defaultValue: "Điểm kế tiếp" })}
          </Text>
          <Text
            style={[styles.subtitleBase, heroTitleStyle]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {normalizedHeroTitle}
          </Text>
          {!!firstItem?.site?.address && (
            <View style={styles.addressRow}>
              <Ionicons name="location-outline" size={14} color="rgba(255,255,255,0.82)" />
              <Text style={styles.address} numberOfLines={1}>
                {firstItem.site.address}
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundCard,
    position: "relative",
  },
  banner: { width: "100%", height: 244 },
  topGlowOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  heroContentWrap: {
    position: "absolute",
    left: 14,
    right: 14,
    bottom: 12,
  },
  heroContentCard: {
    maxWidth: "90%",
    paddingHorizontal: SPACING.sm,
    paddingVertical: 8,
  },
  pilgrimBadge: {
    position: "absolute",
    top: 96,
    left: 12,
    zIndex: 2,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(14, 11, 7, 0.82)",
    borderWidth: 1,
    borderColor: "rgba(253, 230, 138, 0.55)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.28,
    shadowRadius: 4,
    elevation: 3,
  },
  pilgrimBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FCE7A8",
    letterSpacing: 0.25,
  },
  heroEyebrow: {
    fontSize: 12,
    fontWeight: "700",
    color: "rgba(255,255,255,0.85)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  subtitleBase: {
    fontWeight: "800", 
    color: "#FFFFFF",
    letterSpacing: 0.2,
    textShadowColor: "rgba(0,0,0,0.45)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 6,
  },
  subtitleShort: {
    fontSize: 36,
    lineHeight: 40,
  },
  subtitleMedium: {
    fontSize: 31,
    lineHeight: 35,
  },
  subtitleLong: {
    fontSize: 27,
    lineHeight: 31,
  },
  addressRow: {
    marginTop: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  address: { 
    fontSize: 13,
    color: "rgba(255, 255, 255, 0.85)" 
  },
});
