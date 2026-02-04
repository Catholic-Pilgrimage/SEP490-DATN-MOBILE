/**
 * SuccessGlow Component
 * Animated success feedback with "God Rays" glow effect
 * Uses sacred gold color for the glow
 * 
 * Usage:
 * const { triggerSuccess, isAnimating } = useSuccessAnimation();
 * <SuccessGlow ref={successRef} />
 * successRef.current?.trigger();
 */
import React, { forwardRef, useImperativeHandle, useState, useCallback, useRef } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { SACRED_COLORS, SACRED_RADIUS } from '../../constants/sacred-theme.constants';

export interface SuccessGlowRef {
  trigger: () => void;
  reset: () => void;
}

interface SuccessGlowProps {
  size?: 'small' | 'medium' | 'large';
  onComplete?: () => void;
  withHaptic?: boolean;
}

const getSizeConfig = (size: 'small' | 'medium' | 'large') => {
  switch (size) {
    case 'small':
      return { container: 48, glow: 80, icon: 24 };
    case 'medium':
      return { container: 64, glow: 120, icon: 32 };
    case 'large':
      return { container: 80, glow: 160, icon: 40 };
    default:
      return { container: 64, glow: 120, icon: 32 };
  }
};

export const SuccessGlow = forwardRef<SuccessGlowRef, SuccessGlowProps>(
  ({ size = 'medium', onComplete, withHaptic = true }, ref) => {
    const sizeConfig = getSizeConfig(size);
    const [isVisible, setIsVisible] = useState(false);

    // Animation values
    const glowScale = useRef(new Animated.Value(0)).current;
    const glowOpacity = useRef(new Animated.Value(0)).current;
    const checkScale = useRef(new Animated.Value(0)).current;
    const checkOpacity = useRef(new Animated.Value(0)).current;
    const ringScale = useRef(new Animated.Value(0.8)).current;
    const ringOpacity = useRef(new Animated.Value(0)).current;

    const reset = useCallback(() => {
      glowScale.setValue(0);
      glowOpacity.setValue(0);
      checkScale.setValue(0);
      checkOpacity.setValue(0);
      ringScale.setValue(0.8);
      ringOpacity.setValue(0);
      setIsVisible(false);
    }, [glowScale, glowOpacity, checkScale, checkOpacity, ringScale, ringOpacity]);

    const trigger = useCallback(() => {
      reset();
      setIsVisible(true);

      // Haptic feedback
      if (withHaptic && Platform.OS !== 'web') {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      // Animation sequence
      Animated.sequence([
        // 1. Glow expands with ring
        Animated.parallel([
          Animated.timing(glowScale, {
            toValue: 1,
            duration: 300,
            easing: Easing.out(Easing.back(1.5)),
            useNativeDriver: true,
          }),
          Animated.timing(glowOpacity, {
            toValue: 0.8,
            duration: 200,
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1.2,
            duration: 400,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0.6,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),

        // 2. Checkmark appears with bounce
        Animated.parallel([
          Animated.spring(checkScale, {
            toValue: 1,
            friction: 4,
            tension: 100,
            useNativeDriver: true,
          }),
          Animated.timing(checkOpacity, {
            toValue: 1,
            duration: 200,
            useNativeDriver: true,
          }),
        ]),

        // 3. Hold for a moment
        Animated.delay(400),

        // 4. Fade out everything
        Animated.parallel([
          Animated.timing(glowOpacity, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
          }),
          Animated.timing(checkOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(ringOpacity, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(ringScale, {
            toValue: 1.5,
            duration: 400,
            useNativeDriver: true,
          }),
        ]),
      ]).start(() => {
        setIsVisible(false);
        onComplete?.();
      });
    }, [
      reset,
      withHaptic,
      glowScale,
      glowOpacity,
      checkScale,
      checkOpacity,
      ringScale,
      ringOpacity,
      onComplete,
    ]);

    useImperativeHandle(ref, () => ({
      trigger,
      reset,
    }));

    if (!isVisible) return null;

    return (
      <View style={styles.container} pointerEvents="none">
        {/* Outer glow ring */}
        <Animated.View
          style={[
            styles.ring,
            {
              width: sizeConfig.glow,
              height: sizeConfig.glow,
              borderRadius: sizeConfig.glow / 2,
              transform: [{ scale: ringScale }],
              opacity: ringOpacity,
            },
          ]}
        />

        {/* Main glow */}
        <Animated.View
          style={[
            styles.glow,
            {
              width: sizeConfig.glow,
              height: sizeConfig.glow,
              borderRadius: sizeConfig.glow / 2,
              transform: [{ scale: glowScale }],
              opacity: glowOpacity,
            },
          ]}
        />

        {/* Checkmark container */}
        <Animated.View
          style={[
            styles.checkContainer,
            {
              width: sizeConfig.container,
              height: sizeConfig.container,
              borderRadius: sizeConfig.container / 2,
              transform: [{ scale: checkScale }],
              opacity: checkOpacity,
            },
          ]}
        >
          <Ionicons
            name="checkmark"
            size={sizeConfig.icon}
            color={SACRED_COLORS.cream}
          />
        </Animated.View>
      </View>
    );
  }
);

SuccessGlow.displayName = 'SuccessGlow';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  ring: {
    position: 'absolute',
    borderWidth: 2,
    borderColor: SACRED_COLORS.goldLight,
  },
  glow: {
    position: 'absolute',
    backgroundColor: SACRED_COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: SACRED_COLORS.gold,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 30,
      },
      android: {
        elevation: 20,
      },
    }),
  },
  checkContainer: {
    backgroundColor: SACRED_COLORS.gold,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      ios: {
        shadowColor: SACRED_COLORS.goldDark,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default SuccessGlow;
