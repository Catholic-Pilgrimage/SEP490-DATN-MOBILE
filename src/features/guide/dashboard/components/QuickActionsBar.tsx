/**
 * QuickActionsBar Component
 * Horizontal scrollable quick actions - Sacred Premium design
 * Features:
 * - Monochrome gold color palette
 * - Neumorphism style on cream background
 * - Clean icons without colorful backgrounds
 * - Subtle press animations
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Animated,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { GUIDE_SPACING } from "../../../../constants/guide.constants";
import { SACRED_COLORS, SACRED_RADIUS, SACRED_SPACING } from "../../../../constants/sacred-theme.constants";
import { usePressAnimation } from "../../../../hooks/useAnimations";
import { useI18n } from "../../../../hooks/useI18n";
import { getFontSize, getSpacing } from "../../../../utils/responsive";

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
  goLive: "go-live",
  sosLog: "sos-log",
} as const;

const getDefaultActions = (t: (key: string) => string): QuickAction[] => [
  { id: ACTION_IDS.postNews, icon: "newspaper", label: t("quickActions.postNews") },
  { id: ACTION_IDS.schedule, icon: "calendar", label: t("quickActions.schedule") },
  { id: ACTION_IDS.upload, icon: "cloud-upload", label: t("quickActions.upload") },
  { id: ACTION_IDS.goLive, icon: "videocam", label: t("quickActions.goLive") },
  { id: ACTION_IDS.sosLog, icon: "alert-circle", label: t("quickActions.sosLog"), isDanger: true },
];

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
        style={styles.actionButton}
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
            size={26}
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

export const QuickActionsBar: React.FC<QuickActionsBarProps> = ({
  actions,
  onActionPress,
  badges = {},
}) => {
  const { t } = useI18n();
  const defaultActions = getDefaultActions(t);
  const displayActions = actions || defaultActions;
  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        decelerationRate="fast"
      >
        {displayActions.map((action) => (
          <ActionButton
            key={action.id}
            action={action}
            onPress={() => onActionPress(action.id)}
            badgeCount={badges[action.id]}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: -getSpacing(GUIDE_SPACING.xxl) * 1.5,
    zIndex: 10,
  },
  scrollContent: {
    paddingLeft: getSpacing(GUIDE_SPACING.lg),
    paddingRight: getSpacing(GUIDE_SPACING.sm), // Less padding on right to hint more content
    gap: SACRED_SPACING.lg,
  },
  actionButton: {
    alignItems: "center",
    width: 72,
  },
  // Neumorphic style icon container
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: SACRED_RADIUS.lg,
    backgroundColor: SACRED_COLORS.cream,
    justifyContent: "center",
    alignItems: "center",
    overflow: "visible", // Allow badge to overflow
    // Neumorphism shadow
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
    fontSize: getFontSize(11),
    fontWeight: "600",
    color: SACRED_COLORS.charcoal,
    marginTop: 8,
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
});

export default QuickActionsBar;
