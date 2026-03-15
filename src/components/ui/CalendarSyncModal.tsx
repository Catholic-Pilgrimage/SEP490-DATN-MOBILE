/**
 * CalendarSyncModal - Beautiful modal for calendar sync results
 * Shows success/error state with animations
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
    Animated,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../constants/theme.constants";
import { CalendarSyncError } from "../../hooks/useCalendarSync";
import { PlannerCalendarSyncResult } from "../../services/calendar/calendarService";

interface CalendarSyncModalProps {
  visible: boolean;
  onClose: () => void;
  success?: boolean;
  result?: PlannerCalendarSyncResult;
  error?: CalendarSyncError;
}

export const CalendarSyncModal: React.FC<CalendarSyncModalProps> = ({
  visible,
  onClose,
  success,
  result,
  error,
}) => {
  const { t } = useTranslation();

  // Animation values
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const cardScale = useRef(new Animated.Value(0.3)).current;
  const cardOpacity = useRef(new Animated.Value(0)).current;
  const cardTranslateY = useRef(new Animated.Value(80)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;
  const cardFloat = useRef(new Animated.Value(0)).current;
  const iconPulseLoop = useRef<Animated.CompositeAnimation | null>(null);
  const cardFloatLoop = useRef<Animated.CompositeAnimation | null>(null);

  useEffect(() => {
    if (visible) {
      iconPulseLoop.current?.stop();
      cardFloatLoop.current?.stop();

      // Reset
      overlayOpacity.setValue(0);
      cardScale.setValue(0.3);
      cardOpacity.setValue(0);
      cardTranslateY.setValue(80);
      iconPulse.setValue(1);
      cardFloat.setValue(0);

      // Animate IN
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(cardScale, {
          toValue: 1,
          friction: 4,
          tension: 65,
          useNativeDriver: true,
        }),
        Animated.timing(cardOpacity, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.spring(cardTranslateY, {
          toValue: 0,
          friction: 5,
          tension: 60,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Pulse icon
        iconPulseLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(iconPulse, {
              toValue: 1.15,
              duration: 800,
              useNativeDriver: true,
            }),
            Animated.timing(iconPulse, {
              toValue: 1,
              duration: 800,
              useNativeDriver: true,
            }),
          ]),
        );
        iconPulseLoop.current.start();

        // Float card
        cardFloatLoop.current = Animated.loop(
          Animated.sequence([
            Animated.timing(cardFloat, {
              toValue: -6,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(cardFloat, {
              toValue: 6,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        );
        cardFloatLoop.current.start();
      });
    } else {
      iconPulseLoop.current?.stop();
      cardFloatLoop.current?.stop();
    }
    return () => {
      iconPulseLoop.current?.stop();
      cardFloatLoop.current?.stop();
    };
  }, [
    cardFloat,
    cardOpacity,
    cardScale,
    cardTranslateY,
    iconPulse,
    overlayOpacity,
    visible,
  ]);

  const handleClose = () => {
    // Animate OUT
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardScale, {
        toValue: 0.3,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(cardOpacity, {
        toValue: 0,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(cardTranslateY, {
        toValue: 80,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(() => onClose());
  };

  const iconName = success ? "check-circle" : "error-outline";
  const iconColor = success ? "#10B981" : "#EF4444";
  const title = success ? t("planner.syncSuccess") : t("planner.syncError");

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <TouchableWithoutFeedback onPress={handleClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]}>
          <TouchableWithoutFeedback>
            <Animated.View
              style={[
                styles.card,
                {
                  opacity: cardOpacity,
                  transform: [
                    { scale: cardScale },
                    { translateY: Animated.add(cardTranslateY, cardFloat) },
                  ],
                },
              ]}
            >
              {/* Close button */}
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={handleClose}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <MaterialIcons name="close" size={20} color="#9CA3AF" />
              </TouchableOpacity>

              {/* Icon - pulsing */}
              <Animated.View
                style={[
                  styles.iconCircle,
                  {
                    backgroundColor: `${iconColor}20`,
                    borderColor: `${iconColor}30`,
                    transform: [{ scale: iconPulse }],
                  },
                ]}
              >
                <MaterialIcons name={iconName} size={32} color={iconColor} />
              </Animated.View>

              {/* Title */}
              <Text style={styles.title}>{title}</Text>

              {/* Success details */}
              {success && result && (
                <View style={styles.detailsContainer}>
                  <Text style={styles.calendarName}>
                    📅 {result.calendarName}
                  </Text>
                  <View style={styles.statsContainer}>
                    <View style={styles.statItem}>
                      <Text style={styles.statNumber}>{result.total}</Text>
                      <Text style={styles.statLabel}>
                        {t("planner.totalEvents", { defaultValue: "Sự kiện" })}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: "#10B981" }]}>
                        {result.created}
                      </Text>
                      <Text style={styles.statLabel}>
                        {t("planner.created", { defaultValue: "Tạo mới" })}
                      </Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statNumber, { color: "#3B82F6" }]}>
                        {result.updated}
                      </Text>
                      <Text style={styles.statLabel}>
                        {t("planner.updated", { defaultValue: "Cập nhật" })}
                      </Text>
                    </View>
                    {result.deleted > 0 && (
                      <View style={styles.statItem}>
                        <Text style={[styles.statNumber, { color: "#EF4444" }]}>
                          {result.deleted}
                        </Text>
                        <Text style={styles.statLabel}>
                          {t("planner.deleted", { defaultValue: "Xóa" })}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}

              {/* Error message */}
              {!success && error && (
                <Text style={styles.errorMessage}>{error.message}</Text>
              )}

              {/* Close button */}
              <TouchableOpacity
                style={[
                  styles.actionBtn,
                  { backgroundColor: success ? "#10B981" : "#EF4444" },
                ]}
                onPress={handleClose}
                activeOpacity={0.8}
              >
                <Text style={styles.actionBtnText}>
                  {t("common.ok", { defaultValue: "Đồng ý" })}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </TouchableWithoutFeedback>
        </Animated.View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  card: {
    width: "100%",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.xl,
    paddingBottom: SPACING.lg,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
    ...SHADOWS.large,
  },
  closeBtn: {
    position: "absolute",
    top: 12,
    right: 12,
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  iconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
    borderWidth: 2,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  detailsContainer: {
    width: "100%",
    marginBottom: SPACING.lg,
  },
  calendarName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: SPACING.md,
  },
  statsContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    paddingVertical: SPACING.md,
    backgroundColor: "#F9FAFB",
    borderRadius: BORDER_RADIUS.lg,
  },
  statItem: {
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  statLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 4,
  },
  errorMessage: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.sm,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.lg,
    width: "100%",
    ...SHADOWS.medium,
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.lg,
  },
});

export default CalendarSyncModal;
