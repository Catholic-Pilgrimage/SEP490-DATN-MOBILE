import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import { Animated, ImageBackground, Pressable, StyleSheet, Text, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import {
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../../constants/theme.constants";
import {
    PlanStatus,
    PlanSummary,
    TransportationType,
} from "../../../../../types/pilgrim/planner.types";

export interface PlanUI extends PlanSummary {
  isShared?: boolean;
  transportation?: TransportationType[];
}

interface PlanCardProps {
  plan: PlanUI;
  onPress: () => void;
  onShare?: () => void;
  onEdit?: () => void;
}

const getTransportIcon = (
  type: TransportationType,
): keyof typeof Ionicons.glyphMap => {
  switch (type) {
    case "plane":
      return "airplane";
    case "car":
      return "car";
    case "bus":
      return "bus";
    case "train":
      return "train";
    case "walk":
      return "walk";
    case "motorbike":
      return "bicycle";
    default:
      return "navigate";
  }
};

const getTransportLabel = (type: TransportationType, t: any): string => {
  switch (type) {
    case "plane":
      return t("transport.plane", "Máy bay");
    case "car":
      return t("transport.car", "Ô tô");
    case "bus":
      return t("transport.bus", "Xe buýt");
    case "train":
      return t("transport.train", "Tàu hỏa");
    case "walk":
      return t("transport.walk", "Đi bộ");
    case "motorbike":
      return t("transport.motorbike", "Xe máy");
    default:
      return t("transport.other", "Khác");
  }
};

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onPress, onShare, onEdit }) => {
  const { t } = useTranslation();
  
  // Animation value for scale effect on press
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.96,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  // Status computation
  const getStatusDisplay = (status?: string) => {
    const s = (status || "planning").toLowerCase();
    if (s === "ongoing") {
      return { text: t("planner.statusOngoing", "ĐANG THỰC HIỆN"), color: "#FFF8E1", bg: "rgba(90, 60, 20, 0.75)", icon: "rocket-outline" };
    }
    if (s === "completed") {
      return { text: t("planner.statusCompleted", "HOÀN THÀNH"), color: "#FFF8E1", bg: "rgba(60, 90, 40, 0.75)", icon: "checkmark-circle-outline" };
    }
    if (s === "cancelled") {
      return { text: t("planner.statusCancelled", "ĐÃ HỦY"), color: "#FFF8E1", bg: "rgba(120, 50, 30, 0.75)", icon: "close-circle-outline" };
    }
    // Default to planning/draft
    return { text: t("planner.statusPlanning", "CHUẨN BỊ"), color: "#FFF8E1", bg: "rgba(90, 60, 20, 0.75)", icon: "create-outline" };
  };

  const statusDisplay = getStatusDisplay(plan.status);

  // Duration computation
  const start = new Date(plan.startDate);
  const end = new Date(plan.endDate);
  const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
  const dateStr = `${start.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })} - ${end.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}`;

  // Transport details
  const primaryTransport = (plan.transportation && plan.transportation?.length > 0) ? plan.transportation[0] : "car";

  const renderAvatars = () => {
    if ((plan.participantCount || 0) <= 0) return null;
    
    // Fake avatars for UI demo
    const count = Math.min(plan.participantCount, 3);
    const extraCount = plan.participantCount - count;
    const arr = Array.from({length: count});

    return (
      <View style={{ flexDirection: "row", alignItems: "center", marginLeft: 8 }}>
        {arr.map((_, i) => (
          <View key={i} style={[styles.miniAvatar, { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i }]}>
            <Ionicons name="person" size={12} color="#5C3D0E" />
          </View>
        ))}
        {extraCount > 0 && (
          <View style={[styles.miniAvatarExtra, { marginLeft: -8 }]}>
            <Text style={styles.miniAvatarExtraText}>+{extraCount}</Text>
          </View>
        )}
        <Text style={{ fontSize: 13, color: "#5C3D0E", fontWeight: "600", marginLeft: 6 }}>
          {plan.participantCount} {t("planner.people", "người")}
        </Text>
      </View>
    );
  };

  // Swipe actions
  const renderLeftActions = () => {
    return (
      <View style={styles.swipeActionLeft}>
        <Ionicons name="share-social" size={28} color="#FFFFFF" />
        <Text style={styles.swipeActionText}>{t("planner.share", "Chia sẻ")}</Text>
      </View>
    );
  };

  const renderRightActions = () => {
    return (
      <View style={styles.swipeActionRight}>
        <Ionicons name="create" size={28} color="#FFFFFF" />
        <Text style={styles.swipeActionText}>{t("planner.edit", "Sửa")}</Text>
      </View>
    );
  };

  return (
    <Swipeable
      renderLeftActions={renderLeftActions}
      renderRightActions={renderRightActions}
      onSwipeableLeftOpen={() => {
        if (onShare) onShare();
      }}
      onSwipeableRightOpen={() => {
        if (onEdit) onEdit();
      }}
      containerStyle={styles.swipeContainer}
    >
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
      >
        <Animated.View style={[styles.card, { transform: [{ scale: scaleValue }] }]}>
          
          {/* Torn edge top decoration */}
          <View style={styles.tornEdgeTop} />

          {/* Header - Old Paper Style */}
          <View style={styles.headerArea}>
            {/* Corner decorations */}
            <View style={styles.cornerTL} />
            <View style={styles.cornerTR} />

            <View style={styles.headerTopRow}>
              <Text style={styles.planTitle} numberOfLines={2}>{plan.title}</Text>
              <View style={[styles.statusBadge, { backgroundColor: statusDisplay.bg }]}>
                <Ionicons name={statusDisplay.icon as any} size={14} color={statusDisplay.color} style={{ marginRight: 4 }} />
                <Text style={[styles.statusBadgeText, { color: statusDisplay.color }]}>
                  {statusDisplay.text}
                </Text>
              </View>
            </View>
          </View>

          {/* Divider ornament */}
          <View style={styles.ornamentDivider}>
            <View style={styles.ornamentLine} />
            <Ionicons name="leaf-outline" size={16} color="#7A5C30" />
            <View style={styles.ornamentLine} />
          </View>

          {/* Card Body content */}
          <View style={styles.bodyArea}>
            
            <View style={styles.infoSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>Thời gian</Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={18} color="#6B4E0A" />
                <Text style={styles.infoText}>
                  <Text style={{ fontWeight: "700", color: "#5C3D0E" }}>{durationDays} NGÀY </Text>
                  <Text style={{ color: "#8B7355" }}>({dateStr})</Text>
                </Text>
              </View>
            </View>

            <View style={styles.infoSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>Nội dung</Text>
              </View>
              
              <View style={styles.infoRowDetails}>
                <View style={styles.infoItem}>
                  <Ionicons name="location" size={18} color="#8B3A1A" />
                  <Text style={styles.infoTextVal}>{plan.stopCount || 0} địa điểm</Text>
                </View>
                <View style={styles.infoItem}>
                  <Ionicons name={getTransportIcon(primaryTransport)} size={18} color="#5A3D0E" />
                  <Text style={styles.infoTextVal}>{getTransportLabel(primaryTransport, t)}</Text>
                </View>
              </View>

              {((plan.participantCount || 0) > 0 || plan.isShared) ? (
                <View style={styles.infoRowDetails}>
                  {renderAvatars()}
                  {plan.isShared && (
                    <View style={[styles.infoItem, styles.sharedTag]}>
                      <Ionicons name="people" size={14} color="#6B4E0A" />
                      <Text style={styles.sharedTagText}>{t("planner.shared", "Đã chia sẻ")}</Text>
                    </View>
                  )}
                </View>
              ) : null}
            </View>
          </View>

          {/* Action Bar Bottom */}
          <View style={styles.actionContainer}>
            <View style={styles.actionRowTop}>
              <Pressable style={styles.actionBtnOutline} onPress={onPress}>
                <Ionicons name="document-text" size={18} color="#4A3110" />
                <Text style={styles.actionTextOutline}>{t("planner.viewDetail", "Xem chi tiết")}</Text>
              </Pressable>
              
              <Pressable style={styles.actionBtnOutline} onPress={() => onShare && onShare()}>
                <Ionicons name="share-social" size={18} color="#4A3110" />
                <Text style={styles.actionTextOutline}>{t("planner.share", "Chia sẻ")}</Text>
              </Pressable>
            </View>
            
            <Pressable style={styles.actionBtnPrimary} onPress={onPress}>
              <LinearGradient
                colors={["#A0845E", "#7A5C30"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.actionBtnPrimaryGradient}
              >
                <Text style={styles.actionMainText}>{t("planner.continue", "Tiếp tục")} →</Text>
              </LinearGradient>
            </Pressable>
          </View>

          {/* Corner decorations bottom */}
          <View style={styles.cornerBL} />
          <View style={styles.cornerBR} />

        </Animated.View>
      </Pressable>
    </Swipeable>
  );
};

const styles = StyleSheet.create({
  swipeContainer: {
    marginBottom: SPACING.md,
    borderRadius: 14,
    marginHorizontal: 2,
  },
  card: {
    backgroundColor: "#F5E6C8", // Base old paper color
    borderRadius: 14,
    ...SHADOWS.medium,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#C9A96E",
  },
  tornEdgeTop: {
    height: 4,
    backgroundColor: "#E8D5B0",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 105, 20, 0.15)",
    borderStyle: "dashed" as any,
  },
  headerArea: {
    padding: SPACING.md,
    paddingTop: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: "#EDD9A3",
    borderBottomWidth: 0,
  },
  cornerTL: {
    position: "absolute",
    top: 4,
    left: 4,
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#B8935A",
    borderTopLeftRadius: 4,
    opacity: 0.5,
  },
  cornerTR: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 16,
    height: 16,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: "#B8935A",
    borderTopRightRadius: 4,
    opacity: 0.5,
  },
  cornerBL: {
    position: "absolute",
    bottom: 4,
    left: 4,
    width: 16,
    height: 16,
    borderBottomWidth: 2,
    borderLeftWidth: 2,
    borderColor: "#B8935A",
    borderBottomLeftRadius: 4,
    opacity: 0.5,
  },
  cornerBR: {
    position: "absolute",
    bottom: 4,
    right: 4,
    width: 16,
    height: 16,
    borderBottomWidth: 2,
    borderRightWidth: 2,
    borderColor: "#B8935A",
    borderBottomRightRadius: 4,
    opacity: 0.5,
  },
  ornamentDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
    backgroundColor: "#F0DDB8",
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#C9A96E",
    marginHorizontal: 10,
    opacity: 0.6,
  },
  headerTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  planTitle: {
    flex: 1,
    fontSize: 22,
    fontFamily: TYPOGRAPHY.fontFamily.display,
    fontWeight: "800",
    color: "#4A3110",
    lineHeight: 28,
    marginRight: 10,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    backgroundColor: "rgba(90, 60, 20, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(139, 105, 20, 0.3)",
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  bodyArea: {
    padding: SPACING.lg,
    paddingBottom: SPACING.md,
    backgroundColor: "#F5E6C8",
  },
  infoSection: {
    marginBottom: SPACING.md,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  sectionLine: {
    width: 12,
    height: 1.5,
    backgroundColor: "#B8935A",
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#8B7355",
    textTransform: "uppercase",
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  infoRowDetails: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 16,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 14,
  },
  infoTextVal: {
    fontSize: 14,
    color: "#4A3110",
    fontWeight: "600",
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#EDD9A3",
    borderWidth: 1.5,
    borderColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
  },
  miniAvatarExtra: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4C4A0",
    borderWidth: 1.5,
    borderColor: "#F5E6C8",
    justifyContent: "center",
    alignItems: "center",
  },
  miniAvatarExtraText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#5C3D0E",
  },
  sharedTag: {
    backgroundColor: "rgba(139, 105, 20, 0.15)",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(139, 105, 20, 0.2)",
  },
  sharedTagText: {
    fontSize: 11,
    color: "#8B6914",
    fontWeight: "700",
  },
  actionContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.lg,
    backgroundColor: "#F5E6C8",
    gap: 10,
  },
  actionRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    backgroundColor: "rgba(232, 213, 176, 0.7)",
    borderWidth: 1,
    borderColor: "#C9A96E",
  },
  actionTextOutline: {
    fontSize: 13,
    color: "#6B5330",
    fontWeight: "600",
  },
  actionBtnPrimary: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  actionBtnPrimaryGradient: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
  },
  actionMainText: {
    fontSize: 15,
    color: "#FFF8E1",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: {width: 0, height: 1},
    textShadowRadius: 2,
  },
  swipeActionLeft: {
    backgroundColor: "#8B6914",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopLeftRadius: 14,
    borderBottomLeftRadius: 14,
    marginBottom: SPACING.md,
  },
  swipeActionRight: {
    backgroundColor: "#A0845E",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
    borderTopRightRadius: 14,
    borderBottomRightRadius: 14,
    marginBottom: SPACING.md,
  },
  swipeActionText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
  },
});

export default PlanCard;
