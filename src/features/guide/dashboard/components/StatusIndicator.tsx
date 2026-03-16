/**
 * StatusIndicator Component
 * Animated pulse indicator showing active/inactive status
 */

import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
} from "../../../../constants/guide.constants";
import { moderateScale } from "../../../../utils/responsive";
import { PREMIUM_COLORS } from "../constants";

interface StatusIndicatorProps {
  isActive: boolean;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({
  isActive,
}) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.8,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    }
  }, [isActive, pulseAnim, glowAnim]);

  return (
    <View style={styles.container}>
      {isActive && (
        <Animated.View
          style={[
            styles.pulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.dot,
          {
            backgroundColor: isActive
              ? PREMIUM_COLORS.emerald
              : GUIDE_COLORS.gray400,
          },
        ]}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    width: moderateScale(12, 0.3),
    height: moderateScale(12, 0.3),
    justifyContent: "center",
    alignItems: "center",
  },
  pulse: {
    position: "absolute",
    width: moderateScale(12, 0.3),
    height: moderateScale(12, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.emerald,
  },
  dot: {
    width: moderateScale(10, 0.3),
    height: moderateScale(10, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
});
