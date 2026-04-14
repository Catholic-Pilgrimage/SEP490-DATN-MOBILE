import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Image,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../../services/api/pilgrim/plannerApi";
import { TransportationType } from "../../../../../types/pilgrim/planner.types";
import { PlanUI } from "./PlanCard";

export interface InvitedPlanUI extends PlanUI {
  ownerName?: string;
  ownerAvatar?: string;
  ownerEmail?: string;
  inviteStatus?: string;
  inviteToken?: string;
  depositAmount?: number;
  penaltyPercentage?: number;
  /** 'friend' = no deposit needed; 'external' = deposit required */
  inviteType?: "friend" | "external";
}

interface InvitedPlanCardProps {
  plan: InvitedPlanUI;
  onPress: () => void;
  onJoin?: () => void;
  onChat?: () => void;
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

/** Màu nền trơn (pill) — planning nâu như mockup ảnh. */
const getStatusDisplay = (status: string | undefined, t: any) => {
  const s = (status || "planning").toLowerCase();
  if (s === "ongoing") {
    return {
      text: t("planner.statusOngoing", "ĐANG THỰC HIỆN"),
      color: "#FFFFFF",
      bg: "#5C6B52",
      icon: "rocket-outline",
    };
  }
  if (s === "completed") {
    return {
      text: t("planner.statusCompleted", "HOÀN THÀNH"),
      color: "#FFFFFF",
      bg: "#4A6B58",
      icon: "checkmark-circle-outline",
    };
  }
  if (s === "cancelled") {
    return {
      text: t("planner.statusCancelled", "ĐÃ HỦY"),
      color: "#FFFFFF",
      bg: "#8B5344",
      icon: "close-circle-outline",
    };
  }
  return {
    text: t("planner.statusPlanning", "ĐANG LÊN KẾ HOẠCH"),
    color: "#FFFFFF",
    bg: "#9E7B55",
    icon: "create-outline",
  };
};

export const InvitedPlanCard: React.FC<InvitedPlanCardProps> = ({
  plan,
  onPress,
  onJoin,
  onChat,
}) => {
  const { t, i18n } = useTranslation();

  // N+1 fallback: nếu API list không có số lượng, ta tự fetch detail để đếm.
  const [realStopCount, setRealStopCount] = React.useState<number>(
    plan.stopCount,
  );

  React.useEffect(() => {
    if (plan.stopCount === 0 && plan.id && plan.status !== "planning") {
      let isMounted = true;
      pilgrimPlannerApi
        .getPlanDetail(plan.id)
        .then((res) => {
          if (isMounted && res.success && res.data) {
            const detail = res.data as any;
            let count = 0;
            if (detail.items_by_day) {
              count = Object.values(detail.items_by_day).flat().length;
            } else if (detail.items) {
              count = detail.items.length;
            }
            if (count > 0) setRealStopCount(count);
          }
        })
        .catch(() => {});
      return () => {
        isMounted = false;
      };
    } else {
      setRealStopCount(plan.stopCount);
    }
  }, [plan.id, plan.stopCount, plan.status]);

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

  const statusDisplay = getStatusDisplay(plan.status, t);
  const locale = (i18n.language || "vi").startsWith("en") ? "en-US" : "vi-VN";

  const start = plan.startDate ? new Date(plan.startDate) : null;
  const end = plan.endDate ? new Date(plan.endDate) : null;
  const durationDays =
    start && end
      ? Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1
      : null;
  const dateStr =
    start && end
      ? `${start.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
        })} - ${end.toLocaleDateString(locale, {
          day: "2-digit",
          month: "2-digit",
        })}`
      : "";

  const primaryTransport =
    plan.transportation && plan.transportation.length > 0
      ? plan.transportation[0]
      : "car";

  const inviteStatusNormalized = (plan.inviteStatus || "").toLowerCase();
  const canJoin =
    !!plan.inviteToken &&
    (inviteStatusNormalized === "pending" ||
      inviteStatusNormalized === "awaiting_payment");

  /** Badge trái: không lặp với dòng Nội dung — trạng thái mời/tham gia chỉ ở đây. */
  const leftInviteBadge = (() => {
    if (inviteStatusNormalized === "accepted") {
      return {
        icon: "checkmark-circle" as const,
        label: t("planner.joinedBadgeUpper", "ĐÃ THAM GIA"),
        bg: "#D4EDE5",
        fg: "#1F5C4A",
      };
    }
    if (inviteStatusNormalized === "awaiting_payment") {
      return {
        icon: "wallet-outline" as const,
        label: t("planner.awaitingPaymentBadgeUpper", "CHỜ THANH TOÁN"),
        bg: "#E8F0F4",
        fg: "#2C5F73",
      };
    }
    return {
      icon: "mail-outline" as const,
      label: t("planner.invitedBadgeUpper", "ĐƯỢC MỜI"),
      bg: "#E3EDF2",
      fg: "#2C5F73",
    };
  })();

  const renderAvatars = () => {
    if ((plan.participantCount || 0) <= 0) return null;
    const count = Math.min(plan.participantCount, 3);
    const extraCount = plan.participantCount - count;
    const arr = Array.from({ length: count });

    return (
      <View style={styles.avatarStack}>
        {arr.map((_, i) => (
          <View
            key={i}
            style={[
              styles.miniAvatar,
              { marginLeft: i > 0 ? -8 : 0, zIndex: 10 - i },
            ]}
          >
            <Ionicons name="person" size={12} color="#2C5F73" />
          </View>
        ))}
        {extraCount > 0 && (
          <View style={[styles.miniAvatarExtra, { marginLeft: -8 }]}>
            <Text style={styles.miniAvatarExtraText}>+{extraCount}</Text>
          </View>
        )}
        <Text style={styles.avatarCountText}>
          {plan.participantCount} {t("planner.people", "người")}
        </Text>
      </View>
    );
  };

  const handleSecondaryOutline = () => {
    if (canJoin && (onJoin || onPress)) {
      (onJoin || onPress)();
      return;
    }
    if (onChat) onChat();
  };

  const showSecondaryOutline = canJoin || !!onChat;
  /** Giống PlanCard: CTA chính luôn « Tiếp tục », không trùng với outline « Tham gia ». */
  const handlePrimaryGradient = () => {
    onPress();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
    >
      <Animated.View
        style={[styles.card, { transform: [{ scale: scaleValue }] }]}
      >
        <View style={styles.tornEdgeTop} />

        <View style={styles.headerArea}>
          <View style={styles.cornerTL} />
          <View style={styles.cornerTR} />

          <View style={styles.badgesRow}>
            <View
              style={[
                styles.inviteBadgePill,
                { backgroundColor: leftInviteBadge.bg },
              ]}
            >
              <Ionicons
                name={leftInviteBadge.icon}
                size={13}
                color={leftInviteBadge.fg}
              />
              <Text
                style={[
                  styles.inviteBadgePillText,
                  { color: leftInviteBadge.fg },
                ]}
                numberOfLines={1}
              >
                {leftInviteBadge.label}
              </Text>
            </View>
            <View
              style={[
                styles.journeyStatusPill,
                { backgroundColor: statusDisplay.bg },
              ]}
            >
              <Ionicons
                name={statusDisplay.icon as any}
                size={13}
                color={statusDisplay.color}
              />
              <Text
                style={[
                  styles.journeyStatusPillText,
                  { color: statusDisplay.color },
                ]}
                numberOfLines={1}
              >
                {statusDisplay.text}
              </Text>
            </View>
          </View>

          <Text style={styles.planTitle} numberOfLines={2}>
            {plan.title}
          </Text>

          {plan.ownerName && (
            <View style={styles.ownerRow}>
              {plan.ownerAvatar ? (
                <Image
                  source={{ uri: plan.ownerAvatar }}
                  style={styles.ownerAvatar}
                />
              ) : (
                <View style={styles.ownerAvatarPlaceholder}>
                  <Ionicons name="person" size={12} color="#4A7A95" />
                </View>
              )}
              <Text style={styles.ownerLabel}>
                {t("planner.by", { defaultValue: "bởi" })}{" "}
                <Text style={styles.ownerName}>{plan.ownerName}</Text>
              </Text>
            </View>
          )}
        </View>

        <View style={styles.ornamentDivider}>
          <View style={styles.ornamentLine} />
          <Ionicons name="leaf-outline" size={16} color="#4A7A95" />
          <View style={styles.ornamentLine} />
        </View>

        <View style={styles.bodyArea}>
          {durationDays != null && dateStr ? (
            <View style={styles.infoSection}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionLine} />
                <Text style={styles.sectionTitle}>
                  {t("planner.timeSection", { defaultValue: "Thời gian" })}
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="calendar" size={16} color="#4A7A95" />
                <Text style={styles.infoText}>
                  <Text style={styles.infoTextBold}>
                    {durationDays}{" "}
                    {t("planner.daysUpper", { defaultValue: "NGÀY" })}{" "}
                  </Text>
                  <Text style={styles.infoTextMuted}>({dateStr})</Text>
                </Text>
              </View>
            </View>
          ) : null}

          <View style={styles.infoSection}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionLine} />
              <Text style={styles.sectionTitle}>
                {t("planner.contentSection", { defaultValue: "Nội dung" })}
              </Text>
            </View>

            <View style={styles.infoRowDetails}>
              <View style={styles.infoItem}>
                <Ionicons name="location" size={16} color="#8B3A1A" />
                <Text style={styles.infoTextVal}>
                  {realStopCount || 0} {t("planner.sites", "địa điểm")}
                </Text>
              </View>
              <View style={styles.infoItem}>
                <Ionicons
                  name={getTransportIcon(primaryTransport)}
                  size={16}
                  color="#2C5F73"
                />
                <Text style={styles.infoTextVal}>
                  {getTransportLabel(primaryTransport, t)}
                </Text>
              </View>
            </View>

            {(plan.participantCount || 0) > 0 ? (
              <View style={styles.infoRowDetails}>{renderAvatars()}</View>
            ) : null}

            {typeof plan.depositAmount === "number" &&
            plan.depositAmount > 0 ? (
              <View style={styles.depositHint}>
                <Ionicons name="wallet-outline" size={14} color="#4A7A95" />
                <Text style={styles.depositHintText}>
                  {t("planner.depositHintInvite", {
                    defaultValue: "Có cọc nhóm",
                  })}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        <View style={styles.actionContainer}>
          {showSecondaryOutline ? (
            <View style={styles.actionRowTop}>
              <Pressable style={styles.actionBtnOutline} onPress={onPress}>
                <Ionicons name="document-text" size={16} color="#2C5F73" />
                <Text style={styles.actionTextOutline}>
                  {t("planner.viewDetail", { defaultValue: "Xem chi tiết" })}
                </Text>
              </Pressable>
              <Pressable
                style={styles.actionBtnOutline}
                onPress={handleSecondaryOutline}
              >
                <Ionicons
                  name={canJoin ? "person-add-outline" : "chatbubbles-outline"}
                  size={16}
                  color="#2C5F73"
                />
                <Text style={styles.actionTextOutline}>
                  {canJoin
                    ? t("planner.joinPlan", { defaultValue: "Tham gia" })
                    : t("planner.chat", { defaultValue: "Chat" })}
                </Text>
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={[styles.actionBtnOutline, styles.actionBtnOutlineFull]}
              onPress={onPress}
            >
              <Ionicons name="document-text" size={16} color="#2C5F73" />
              <Text style={styles.actionTextOutline}>
                {t("planner.viewDetail", { defaultValue: "Xem chi tiết" })}
              </Text>
            </Pressable>
          )}

          <Pressable
            style={styles.actionBtnPrimary}
            onPress={handlePrimaryGradient}
          >
            <LinearGradient
              colors={["#6B8CA3", "#4A7A95"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.actionBtnPrimaryGradient}
            >
              <Text style={styles.actionMainText}>
                {t("planner.continue", "Tiếp tục")} →
              </Text>
            </LinearGradient>
          </Pressable>
        </View>

        <View style={styles.cornerBL} />
        <View style={styles.cornerBR} />
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#EDF4F7",
    borderRadius: 14,
    ...SHADOWS.medium,
    elevation: 4,
    overflow: "hidden",
    borderWidth: 1.5,
    borderColor: "#A3C4D5",
    marginBottom: SPACING.sm,
    marginHorizontal: 2,
  },
  tornEdgeTop: {
    height: 3,
    backgroundColor: "#C5D9E5",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(74, 122, 149, 0.2)",
    borderStyle: "dashed" as any,
  },
  headerArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
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
    borderColor: "#8BB0C4",
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
    borderColor: "#8BB0C4",
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
    borderColor: "#8BB0C4",
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
    borderColor: "#8BB0C4",
    borderBottomRightRadius: 4,
    opacity: 0.5,
  },
  /** Hai pill rộng theo chữ; mép trái / mép phải, khoảng giữa co giãn tự nhiên. */
  badgesRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 6,
  },
  inviteBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 0,
  },
  inviteBadgePillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  journeyStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    flexShrink: 1,
    minWidth: 0,
  },
  journeyStatusPillText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    flexShrink: 1,
  },
  planTitle: {
    fontSize: 19,
    fontFamily: TYPOGRAPHY.fontFamily.display,
    fontWeight: "800",
    color: "#1E2D3A",
    lineHeight: 24,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 6,
  },
  ownerAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: "#A3C4D5",
  },
  ownerAvatarPlaceholder: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#B8D0DC",
    justifyContent: "center",
    alignItems: "center",
  },
  ownerLabel: {
    fontSize: 12,
    color: "#6B8CA3",
  },
  ownerName: {
    fontWeight: "700",
    color: "#2C5F73",
  },
  ornamentDivider: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 4,
    backgroundColor: "#E3EEF3",
  },
  ornamentLine: {
    flex: 1,
    height: 1,
    backgroundColor: "#A3C4D5",
    marginHorizontal: 8,
    opacity: 0.6,
  },
  bodyArea: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 8,
    backgroundColor: "#EDF4F7",
  },
  infoSection: {
    marginBottom: 10,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  sectionLine: {
    width: 12,
    height: 1.5,
    backgroundColor: "#7A9EAE",
    marginRight: 6,
  },
  sectionTitle: {
    fontSize: 11,
    color: "#5A7D8A",
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
    flexWrap: "wrap",
    marginBottom: 4,
    gap: 10,
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  infoText: {
    fontSize: 13,
  },
  infoTextBold: {
    fontWeight: "700",
    color: "#2C5F73",
  },
  infoTextMuted: {
    color: "#6B8CA3",
  },
  infoTextVal: {
    fontSize: 13,
    color: "#2C3E50",
    fontWeight: "600",
  },
  avatarStack: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: 4,
  },
  miniAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#D4E8EF",
    borderWidth: 1.5,
    borderColor: "#EDF4F7",
    justifyContent: "center",
    alignItems: "center",
  },
  miniAvatarExtra: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#B8D0DC",
    borderWidth: 1.5,
    borderColor: "#EDF4F7",
    justifyContent: "center",
    alignItems: "center",
  },
  miniAvatarExtraText: {
    fontSize: 8,
    fontWeight: "700",
    color: "#2C5F73",
  },
  avatarCountText: {
    fontSize: 13,
    color: "#2C5F73",
    fontWeight: "600",
    marginLeft: 6,
  },
  depositHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  depositHintText: {
    fontSize: 11,
    color: "#5A7D8A",
    fontStyle: "italic",
  },
  actionContainer: {
    paddingHorizontal: 12,
    paddingBottom: 10,
    paddingTop: 6,
    backgroundColor: "#EDF4F7",
    gap: 8,
  },
  actionRowTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  actionBtnOutline: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 5,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255, 255, 255, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(74, 122, 149, 0.35)",
  },
  actionBtnOutlineFull: {
    width: "100%",
  },
  actionTextOutline: {
    fontSize: 13,
    color: "#2C5F73",
    fontWeight: "600",
  },
  actionBtnPrimary: {
    width: "100%",
    borderRadius: 10,
    overflow: "hidden",
  },
  actionBtnPrimaryGradient: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
  },
  actionMainText: {
    fontSize: 14,
    color: "#FFF8E1",
    fontWeight: "800",
    textShadowColor: "rgba(0,0,0,0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
});

export default InvitedPlanCard;
