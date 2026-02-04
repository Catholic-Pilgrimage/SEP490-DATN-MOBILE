/**
 * AISparkles Component
 * Animated sparkles effect for AI-related features
 * Creates magical dust particles around content
 * 
 * Usage:
 * <AISparkles isActive={isGenerating}>
 *   <TextInput />
 * </AISparkles>
 */
import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Easing,
  Dimensions,
} from 'react-native';
import { SACRED_COLORS } from '../../constants/sacred-theme.constants';

interface Sparkle {
  id: number;
  x: number;
  y: number;
  size: number;
  delay: number;
  duration: number;
}

interface AISparklesProps {
  children: React.ReactNode;
  isActive?: boolean;
  intensity?: 'low' | 'medium' | 'high';
  color?: string;
}

const generateSparkles = (count: number, containerWidth: number, containerHeight: number): Sparkle[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: Math.random() * containerWidth,
    y: Math.random() * containerHeight,
    size: 2 + Math.random() * 4,
    delay: Math.random() * 1000,
    duration: 1000 + Math.random() * 1000,
  }));
};

const SparkleParticle: React.FC<{ sparkle: Sparkle; color: string }> = ({
  sparkle,
  color,
}) => {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const startAnimation = () => {
      opacity.setValue(0);
      scale.setValue(0);
      translateY.setValue(0);

      Animated.loop(
        Animated.sequence([
          Animated.delay(sparkle.delay),
          Animated.parallel([
            Animated.timing(opacity, {
              toValue: 1,
              duration: sparkle.duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 1,
              duration: sparkle.duration * 0.3,
              easing: Easing.out(Easing.back(2)),
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(translateY, {
              toValue: -20,
              duration: sparkle.duration * 0.5,
              useNativeDriver: true,
            }),
            Animated.timing(opacity, {
              toValue: 0,
              duration: sparkle.duration * 0.4,
              delay: sparkle.duration * 0.3,
              useNativeDriver: true,
            }),
            Animated.timing(scale, {
              toValue: 0.3,
              duration: sparkle.duration * 0.4,
              delay: sparkle.duration * 0.3,
              useNativeDriver: true,
            }),
          ]),
          Animated.delay(sparkle.duration * 0.2),
        ])
      ).start();
    };

    startAnimation();
  }, [opacity, scale, translateY, sparkle]);

  return (
    <Animated.View
      style={[
        styles.sparkle,
        {
          left: sparkle.x,
          top: sparkle.y,
          width: sparkle.size,
          height: sparkle.size,
          borderRadius: sparkle.size / 2,
          backgroundColor: color,
          opacity,
          transform: [{ scale }, { translateY }],
        },
      ]}
    />
  );
};

export const AISparkles: React.FC<AISparklesProps> = ({
  children,
  isActive = false,
  intensity = 'medium',
  color = SACRED_COLORS.gold,
}) => {
  const [sparkles, setSparkles] = useState<Sparkle[]>([]);
  const [containerSize, setContainerSize] = useState({ width: 200, height: 100 });

  const sparkleCount = {
    low: 6,
    medium: 12,
    high: 20,
  }[intensity];

  useEffect(() => {
    if (isActive) {
      setSparkles(generateSparkles(sparkleCount, containerSize.width, containerSize.height));
    } else {
      setSparkles([]);
    }
  }, [isActive, sparkleCount, containerSize]);

  const handleLayout = (event: any) => {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize({ width, height });
  };

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {children}
      {isActive && (
        <View style={styles.sparklesContainer} pointerEvents="none">
          {sparkles.map((sparkle) => (
            <SparkleParticle key={sparkle.id} sparkle={sparkle} color={color} />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
  sparklesContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  sparkle: {
    position: 'absolute',
    shadowColor: SACRED_COLORS.gold,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 4,
  },
});

export default AISparkles;
