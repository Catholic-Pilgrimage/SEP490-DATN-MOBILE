
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Dimensions,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GUIDE_SPACING } from "../../../../constants/guide.constants";
import { SACRED_COLORS, SACRED_RADIUS, SACRED_SPACING } from "../../../../constants/sacred-theme.constants";
import { usePressAnimation } from "../../../../hooks/useAnimations";
import { useI18n } from "../../../../hooks/useI18n";
import { getFontSize, getSpacing, moderateScale } from "../../../../utils/responsive";

interface QuickAction {
  id: string;
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  badgeCount?: number;
  isDanger?: boolean; // For SOS-like actions
}

// Action IDs - labels will be translated
const ACTION_IDS = {
  postNews: "post-news",
  schedule: "add-schedule",
  upload: "upload-media",
  manage: "manage-site",
  sosLog: "sos-log",
} as const;

const { width: SCREEN_WIDTH } = Dimensions.get("window");
// Calculate width for 4 items with padding and gap
// Padding: GUIDE_SPACING.md * 2 (left/right)
// Gap: SACRED_SPACING.md * 3 (between 4 items)
const TOTAL_PADDING = (getSpacing(GUIDE_SPACING.md) * 2) + (SACRED_SPACING.md * 3);
const ITEM_WIDTH = (SCREEN_WIDTH - TOTAL_PADDING) / 4;

// Regular actions (without SOS)
const getRegularActions = (t: (key: string, opts?: any) => string): QuickAction[] => [
  { id: ACTION_IDS.postNews, icon: "newspaper", label: t("quickActions.postNews") },
  { id: ACTION_IDS.schedule, icon: "calendar", label: t("quickActions.schedule") },
  { id: ACTION_IDS.upload, icon: "cloud-upload", label: t("quickActions.upload") },
  { id: ACTION_IDS.manage, icon: "settings-outline", label: t("quickActions.manage", { defaultValue: "Quản lý" }) },
];

// SOS action - separate emergency action
const getSOSAction = (t: (key: string, opts?: any) => string): QuickAction => ({
  id: ACTION_IDS.sosLog,
  icon: "alert-circle",
  label: t("quickActions.sosLog"),
  isDanger: true,
});

interface QuickActionsBarProps {
  actions?: QuickAction[];
  onActionPress: (actionId: string) => void;
  badges?: Record<string, number>;
}

// Single Action Button - Neumorphism style
const ActionButton: React.FC<{
  action: QuickAction;
  onPress: () => void;
  badgeCount?: number;
}> = ({ action, onPress, badgeCount }) => {
  const { scaleValue, handlePressIn, handlePressOut } = usePressAnimation({
    scale: 0.92,
  });

  const iconColor = action.isDanger ? SACRED_COLORS.danger : SACRED_COLORS.gold;
  const hasBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <Animated.View style={{ transform: [{ scale: scaleValue }] }}>
      <TouchableOpacity
        style={[styles.actionButton, { width: ITEM_WIDTH }]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        {/* Neumorphic Icon Container */}
        <View style={[
          styles.iconContainer,
          action.isDanger && styles.iconContainerDanger,
        ]}>
          <Ionicons
            name={action.icon}
            size={22}
            color={iconColor}
          />

          {/* Badge */}
          {hasBadge && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </Text>
            </View>
          )}
        </View>

        <Text
          style={[
            styles.actionLabel,
            action.isDanger && styles.actionLabelDanger,
          ]}
          numberOfLines={1}
        >
          {action.label}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

// SOS Emergency Button - horizontal banner style
const SOSBanner: React.FC<{
  action: QuickAction;
  onPress: () => void;
  badgeCount?: number;
}> = ({ action, onPress, badgeCount }) => {
  const { scaleValue, handlePressIn, handlePressOut } = usePressAnimation({
    scale: 0.97,
  });

  const hasBadge = badgeCount !== undefined && badgeCount > 0;

  return (
    <Animated.View style={[
      styles.sosBannerWrapper,
      { transform: [{ scale: scaleValue }] },
    ]}>
      <TouchableOpacity
        style={styles.sosBanner}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={0.85}
      >
        {/* Left: Pulsing icon */}
        <View style={styles.sosIconWrapper}>
          <View style={styles.sosIconPulseRing} />
          <View style={styles.sosIconCircle}>
            <Ionicons name="alert-circle" size={20} color="#FFFFFF" />
          </View>
        </View>

        {/* Center: Label & description */}
        <View style={styles.sosTextContainer}>
          <Text style={styles.sosTitle}>{action.label}</Text>
          <Text style={styles.sosSubtitle}>Nhấn để xem danh sách SOS</Text>
        </View>

        {/* Right: Badge + Arrow */}
        <View style={styles.sosRightSection}>
          {hasBadge && (
            <View style={styles.sosBadge}>
              <Text style={styles.sosBadgeText}>
                {badgeCount > 99 ? "99+" : badgeCount}
              </Text>
            </View>
          )}
          <View style={styles.sosArrow}>
            <Ionicons name="chevron-forward" size={16} color="#8B3A3A" />
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  actions,
  onActionPress,
  badges = {},
}) => {
  const { t } = useI18n();
  const regularActions = getRegularActions(t);
  const sosAction = getSOSAction(t);

  // If custom actions provided, separate SOS from regular
  const displayRegularActions = actions
    ? actions.filter((a) => !a.isDanger)
    : regularActions;

  const displaySosAction = actions
    ? actions.find((a) => a.isDanger) || sosAction
    : sosAction;

  return (
    <View style={styles.container}>
      {/* Regular Quick Actions - 4 item grid */}
      <View style={styles.actionsContainer}>
        {displayRegularActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            onPress={() => onActionPress(action.id)}
            badgeCount={badges[action.id]}
          />
        ))}
      </View>

      {/* SOS Emergency Banner - separated, distinct visual */}
      <SOSBanner
        action={displaySosAction}
        onPress={() => onActionPress(displaySosAction.id)}
        badgeCount={badges[displaySosAction.id]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: -getSpacing(GUIDE_SPACING.xxl) * 1.5,
    zIndex: 10,
  },
  actionsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    gap: SACRED_SPACING.md,
  },
  actionButton: {
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: SACRED_RADIUS.lg,
    backgroundColor: SACRED_COLORS.cream,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible",
    ...Platform.select({
      ios: {
        shadowColor: SACRED_COLORS.charcoal,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 4,
      },
    }),
    borderWidth: 1,
    borderColor: SACRED_COLORS.borderLight,
  },
  iconContainerDanger: {
    borderColor: SACRED_COLORS.dangerLight,
    backgroundColor: SACRED_COLORS.dangerBg,
  },
  actionLabel: {
    fontSize: getFontSize(10),
    fontWeight: "600",
    color: SACRED_COLORS.charcoal,
    marginTop: 6,
    textAlign: "center",
  },
  actionLabelDanger: {
    color: SACRED_COLORS.danger,
  },
  badge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: SACRED_COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
    borderWidth: 2,
    borderColor: SACRED_COLORS.cream,
    zIndex: 10,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "800",
    color: SACRED_COLORS.cream,
    lineHeight: 11,
  },

  // ── SOS Emergency Banner ───────────────────────────────────
  sosBannerWrapper: {
    marginTop: getSpacing(GUIDE_SPACING.md),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
  },
  sosBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FEF2F2",           // very light red background
    borderWidth: 1,
    borderColor: "rgba(139, 58, 58, 0.15)",
    borderRadius: SACRED_RADIUS.xl,
    paddingVertical: moderateScale(10, 0.3),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    gap: moderateScale(10, 0.3),
    ...Platform.select({
      ios: {
        shadowColor: "#8B3A3A",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  sosIconWrapper: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    justifyContent: "center",
    alignItems: "center",
  },
  sosIconPulseRing: {
    position: "absolute",
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: "rgba(139, 58, 58, 0.08)",
  },
  sosIconCircle: {
    width: moderateScale(30, 0.3),
    height: moderateScale(30, 0.3),
    borderRadius: moderateScale(15, 0.3),
    backgroundColor: SACRED_COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
  },
  sosTextContainer: {
    flex: 1,
    justifyContent: "center",
  },
  sosTitle: {
    fontSize: getFontSize(13),
    fontWeight: "700",
    color: "#7F1D1D",
    letterSpacing: 0.2,
  },
  sosSubtitle: {
    fontSize: getFontSize(10),
    fontWeight: "500",
    color: "#991B1B",
    opacity: 0.7,
    marginTop: 1,
  },
  sosRightSection: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(6, 0.3),
  },
  sosBadge: {
    minWidth: moderateScale(22, 0.3),
    height: moderateScale(22, 0.3),
    borderRadius: moderateScale(11, 0.3),
    backgroundColor: SACRED_COLORS.danger,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: moderateScale(5, 0.3),
  },
  sosBadgeText: {
    fontSize: getFontSize(10),
    fontWeight: "800",
    color: "#FFFFFF",
    lineHeight: moderateScale(13, 0.3),
  },
  sosArrow: {
    width: moderateScale(28, 0.3),
    height: moderateScale(28, 0.3),
    borderRadius: moderateScale(14, 0.3),
    backgroundColor: "rgba(139, 58, 58, 0.08)",
    justifyContent: "center",
    alignItems: "center",
  },
});

export default QuickActionsBar;
