/**
 * Animation Utilities & Custom Hooks
 * Reusable animation logic for Sacred Premium UI
 * 
 * Includes:
 * - useShimmer: Gold shimmer effect
 * - usePulse: Pulsing animation for live indicators
 * - useBreathing: Gentle breathing animation
 * - useParallax: Parallax scrolling effect
 * - useSpring: Spring-based press animations
 * - useFadeIn: Fade in on mount
 * - useTypewriter: Typewriter text effect for AI
 */

import { useRef, useEffect, useCallback, useState } from 'react';
import {
  Animated,
  Easing,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from 'react-native';
import { SACRED_ANIMATION } from '../constants/sacred-theme.constants';

// ===== SHIMMER ANIMATION =====
interface UseShimmerOptions {
  width?: number;
  duration?: number;
  delay?: number;
  autoStart?: boolean;
}

export const useShimmer = (options: UseShimmerOptions = {}) => {
  const {
    width = 200,
    duration = 1500,
    delay = SACRED_ANIMATION.shimmerInterval,
    autoStart = true,
  } = options;
  
  const shimmerValue = useRef(new Animated.Value(-width)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startShimmer = useCallback(() => {
    shimmerValue.setValue(-width);
    
    const shimmerAnimation = Animated.timing(shimmerValue, {
      toValue: width * 2,
      duration,
      easing: Easing.linear,
      useNativeDriver: true,
    });

    const loopAnimation = Animated.loop(
      Animated.sequence([
        shimmerAnimation,
        Animated.delay(delay),
      ])
    );

    loopRef.current = loopAnimation;
    loopAnimation.start();
  }, [shimmerValue, width, duration, delay]);

  const stopShimmer = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startShimmer();
    }
    return () => stopShimmer();
  }, [autoStart, startShimmer, stopShimmer]);

  return {
    shimmerValue,
    startShimmer,
    stopShimmer,
  };
};

// ===== PULSE ANIMATION (for live indicators) =====
interface UsePulseOptions {
  minScale?: number;
  maxScale?: number;
  duration?: number;
  autoStart?: boolean;
}

export const usePulse = (options: UsePulseOptions = {}) => {
  const {
    minScale = SACRED_ANIMATION.pulseScale.min,
    maxScale = SACRED_ANIMATION.pulseScale.max,
    duration = SACRED_ANIMATION.pulseDuration,
    autoStart = true,
  } = options;
  
  const pulseValue = useRef(new Animated.Value(minScale)).current;
  const opacityValue = useRef(new Animated.Value(1)).current;
  const loopRef = useRef<Animated.CompositeAnimation | null>(null);

  const startPulse = useCallback(() => {
    const pulseAnimation = Animated.loop(
      Animated.parallel([
        Animated.sequence([
          Animated.timing(pulseValue, {
            toValue: maxScale,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseValue, {
            toValue: minScale,
            duration,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
        Animated.sequence([
          Animated.timing(opacityValue, {
            toValue: 0.3,
            duration,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(opacityValue, {
            toValue: 1,
            duration,
            easing: Easing.in(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      ])
    );

    loopRef.current = pulseAnimation;
    pulseAnimation.start();
  }, [pulseValue, opacityValue, minScale, maxScale, duration]);

  const stopPulse = useCallback(() => {
    if (loopRef.current) {
      loopRef.current.stop();
    }
  }, []);

  useEffect(() => {
    if (autoStart) {
      startPulse();
    }
    return () => stopPulse();
  }, [autoStart, startPulse, stopPulse]);

  return {
    pulseValue,
    opacityValue,
    startPulse,
    stopPulse,
  };
};

// ===== BREATHING ANIMATION (for skeleton loading) =====
interface UseBreathingOptions {
  minOpacity?: number;
  maxOpacity?: number;
  duration?: number;
}

export const useBreathing = (options: UseBreathingOptions = {}) => {
  const {
    minOpacity = 0.4,
    maxOpacity = 0.8,
    duration = SACRED_ANIMATION.duration.breathing,
  } = options;
  
  const breathValue = useRef(new Animated.Value(minOpacity)).current;

  useEffect(() => {
    const breathAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(breathValue, {
          toValue: maxOpacity,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
        Animated.timing(breathValue, {
          toValue: minOpacity,
          duration: duration / 2,
          easing: Easing.inOut(Easing.sin),
          useNativeDriver: true,
        }),
      ])
    );

    breathAnimation.start();
    return () => breathAnimation.stop();
  }, [breathValue, minOpacity, maxOpacity, duration]);

  return breathValue;
};

// ===== PARALLAX SCROLL HOOK =====
interface UseParallaxOptions {
  imageHeight: number;
  parallaxRatio?: number;
  fadeDistance?: number;
}

interface ParallaxValues {
  scrollY: Animated.Value;
  imageTranslateY: Animated.AnimatedInterpolation<number>;
  headerOpacity: Animated.AnimatedInterpolation<number>;
  textOpacity: Animated.AnimatedInterpolation<number>;
  overlayOpacity: Animated.AnimatedInterpolation<number>;
  headerBackgroundOpacity: Animated.AnimatedInterpolation<number>;
  onScroll: (event: NativeSyntheticEvent<NativeScrollEvent>) => void;
}

export const useParallax = (options: UseParallaxOptions): ParallaxValues => {
  const {
    imageHeight,
    parallaxRatio = 0.5,
    fadeDistance = imageHeight * 0.6,
  } = options;
  
  const scrollY = useRef(new Animated.Value(0)).current;

  // Image moves slower (parallax effect)
  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, imageHeight],
    outputRange: [0, imageHeight * parallaxRatio],
    extrapolate: 'clamp',
  });

  // Header fades out when scrolling up
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, fadeDistance],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Text on image fades out
  const textOpacity = scrollY.interpolate({
    inputRange: [0, fadeDistance * 0.5],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

  // Dark overlay increases when scrolling
  const overlayOpacity = scrollY.interpolate({
    inputRange: [0, fadeDistance],
    outputRange: [0.3, 0.6],
    extrapolate: 'clamp',
  });

  // Sticky header background fades in
  const headerBackgroundOpacity = scrollY.interpolate({
    inputRange: [fadeDistance - 50, fadeDistance],
    outputRange: [0, 1],
    extrapolate: 'clamp',
  });

  const onScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { useNativeDriver: false }
  );

  return {
    scrollY,
    imageTranslateY,
    headerOpacity,
    textOpacity,
    overlayOpacity,
    headerBackgroundOpacity,
    onScroll,
  };
};

// ===== SPRING PRESS ANIMATION =====
interface UsePressAnimationOptions {
  scale?: number;
  friction?: number;
  tension?: number;
}

export const usePressAnimation = (options: UsePressAnimationOptions = {}) => {
  const {
    scale = 0.95,
    friction = 5,
    tension = 100,
  } = options;
  
  const scaleValue = useRef(new Animated.Value(1)).current;

  const handlePressIn = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: scale,
      friction,
      tension,
      useNativeDriver: true,
    }).start();
  }, [scaleValue, scale, friction, tension]);

  const handlePressOut = useCallback(() => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction,
      tension,
      useNativeDriver: true,
    }).start();
  }, [scaleValue, friction, tension]);

  return {
    scaleValue,
    handlePressIn,
    handlePressOut,
  };
};

// ===== FADE IN ANIMATION =====
interface UseFadeInOptions {
  duration?: number;
  delay?: number;
  initialValue?: number;
}

export const useFadeIn = (options: UseFadeInOptions = {}) => {
  const {
    duration = SACRED_ANIMATION.duration.normal,
    delay = 0,
    initialValue = 0,
  } = options;
  
  const fadeValue = useRef(new Animated.Value(initialValue)).current;
  const translateY = useRef(new Animated.Value(10)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeValue, {
        toValue: 1,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration,
        delay,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]);

    animation.start();
  }, [fadeValue, translateY, duration, delay]);

  return {
    fadeValue,
    translateY,
    style: {
      opacity: fadeValue,
      transform: [{ translateY }],
    },
  };
};

// ===== TYPEWRITER EFFECT (for AI responses) =====
interface UseTypewriterOptions {
  speed?: number;
  delayBetweenWords?: number;
}

export const useTypewriter = (
  fullText: string,
  options: UseTypewriterOptions = {}
) => {
  const { speed = 30, delayBetweenWords = 0 } = options;
  const [displayedText, setDisplayedText] = useState('');
  const [isComplete, setIsComplete] = useState(false);

  useEffect(() => {
    if (!fullText) {
      setDisplayedText('');
      setIsComplete(false);
      return;
    }

    setDisplayedText('');
    setIsComplete(false);
    let currentIndex = 0;

    const interval = setInterval(() => {
      if (currentIndex < fullText.length) {
        setDisplayedText(fullText.slice(0, currentIndex + 1));
        currentIndex++;
      } else {
        setIsComplete(true);
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [fullText, speed]);

  return { displayedText, isComplete };
};

// ===== SUCCESS GLOW ANIMATION =====
export const useSuccessGlow = () => {
  const glowValue = useRef(new Animated.Value(0)).current;
  const checkmarkProgress = useRef(new Animated.Value(0)).current;

  const triggerSuccess = useCallback(() => {
    // Reset values
    glowValue.setValue(0);
    checkmarkProgress.setValue(0);

    Animated.sequence([
      // Glow effect
      Animated.timing(glowValue, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      // Checkmark draws
      Animated.timing(checkmarkProgress, {
        toValue: 1,
        duration: 300,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
      // Fade out glow
      Animated.delay(500),
      Animated.timing(glowValue, {
        toValue: 0,
        duration: 600,
        easing: Easing.in(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [glowValue, checkmarkProgress]);

  return {
    glowValue,
    checkmarkProgress,
    triggerSuccess,
    glowScale: glowValue.interpolate({
      inputRange: [0, 0.5, 1],
      outputRange: [0.8, 1.1, 1],
    }),
    glowOpacity: glowValue.interpolate({
      inputRange: [0, 0.3, 1],
      outputRange: [0, 1, 0.7],
    }),
  };
};

// ===== STAGGERED ANIMATION (for list items) =====
export const useStaggeredAnimation = (
  itemCount: number,
  staggerDelay: number = 50
) => {
  const animatedValues = useRef(
    Array.from({ length: itemCount }, () => ({
      opacity: new Animated.Value(0),
      translateY: new Animated.Value(20),
    }))
  ).current;

  const startAnimation = useCallback(() => {
    const animations = animatedValues.map((value, index) =>
      Animated.parallel([
        Animated.timing(value.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * staggerDelay,
          useNativeDriver: true,
        }),
        Animated.timing(value.translateY, {
          toValue: 0,
          duration: 300,
          delay: index * staggerDelay,
          easing: Easing.out(Easing.back(1.5)),
          useNativeDriver: true,
        }),
      ])
    );

    Animated.parallel(animations).start();
  }, [animatedValues, staggerDelay]);

  useEffect(() => {
    startAnimation();
  }, [startAnimation]);

  return animatedValues;
};

// ===== RIPPLE ANIMATION (for touch feedback) =====
export const useRipple = () => {
  const rippleScale = useRef(new Animated.Value(0)).current;
  const rippleOpacity = useRef(new Animated.Value(0.5)).current;

  const triggerRipple = useCallback(() => {
    rippleScale.setValue(0);
    rippleOpacity.setValue(0.5);

    Animated.parallel([
      Animated.timing(rippleScale, {
        toValue: 1,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
      Animated.timing(rippleOpacity, {
        toValue: 0,
        duration: 400,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, [rippleScale, rippleOpacity]);

  return {
    rippleScale,
    rippleOpacity,
    triggerRipple,
  };
};

export default {
  useShimmer,
  usePulse,
  useBreathing,
  useParallax,
  usePressAnimation,
  useFadeIn,
  useTypewriter,
  useSuccessGlow,
  useStaggeredAnimation,
  useRipple,
};
