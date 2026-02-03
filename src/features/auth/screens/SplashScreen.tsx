import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useEffect, useState } from 'react';
import {
    Dimensions,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    Easing,
    interpolate,
    SharedValue,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { useAuth } from '../../../contexts/AuthContext';
import { navigateToAppropriateScreen } from '../../../navigation/navigationHelpers';

const { width, height } = Dimensions.get('window');

const SPLASH_COLORS = {
  primary: '#cfaa3a',
  primaryLight: '#e6c85a',
  textLight: '#fff8e7',
  textDark: '#1a1a1a',
  overlay: 'rgba(0, 0, 0, 0.1)',
};

const SplashScreen = () => {
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { isLoading, isAuthenticated, isGuest, user } = useAuth();
  const [isReady, setIsReady] = useState(false);
  const [animationsComplete, setAnimationsComplete] = useState(false);

  // Animation values - start with small values to avoid 0 multiplication issues
  const logoScale = useSharedValue(0.01);
  const logoOpacity = useSharedValue(0);
  const logoRotate = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const glowScale = useSharedValue(1);
  const ringRotate = useSharedValue(0);
  const ringOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(30);
  const subtitleOpacity = useSharedValue(0);
  const shimmerPosition = useSharedValue(-1);
  const pulseScale = useSharedValue(1);
  const particlesOpacity = useSharedValue(0);
  const dotsOpacity = useSharedValue(0);

  // Navigate based on auth state and user role
  const navigateToScreen = useCallback(() => {
    navigateToAppropriateScreen(
      navigation,
      isAuthenticated,
      isGuest,
      user?.role
    );
  }, [navigation, isAuthenticated, isGuest, user?.role]);

  // Start animations when ready
  useEffect(() => {
    // Small delay to ensure component is mounted
    const mountTimer = setTimeout(() => {
      setIsReady(true);
    }, 100);

    return () => clearTimeout(mountTimer);
  }, []);

  // Handle navigation when both animations and auth check are complete
  useEffect(() => {
    if (animationsComplete && !isLoading) {
      navigateToScreen();
    }
  }, [animationsComplete, isLoading, navigateToScreen]);

  useEffect(() => {
    if (!isReady) return;

    // Logo entrance animation
    logoOpacity.value = withTiming(1, { duration: 800 });
    logoScale.value = withSequence(
      withSpring(1.15, { damping: 8, stiffness: 100 }),
      withSpring(1, { damping: 12, stiffness: 100 })
    );

    // Dots fade in
    dotsOpacity.value = withDelay(500, withTiming(1, { duration: 500 }));

    // Subtle rotation for elegance
    logoRotate.value = withSequence(
      withTiming(-3, { duration: 400 }),
      withTiming(3, { duration: 400 }),
      withTiming(0, { duration: 300 })
    );

    // Glow effect
    glowOpacity.value = withDelay(
      400,
      withSequence(
        withTiming(0.8, { duration: 600 }),
        withRepeat(
          withSequence(
            withTiming(0.4, { duration: 1500 }),
            withTiming(0.8, { duration: 1500 })
          ),
          -1,
          true
        )
      )
    );

    glowScale.value = withDelay(
      400,
      withRepeat(
        withSequence(
          withTiming(1.3, { duration: 1500 }),
          withTiming(1, { duration: 1500 })
        ),
        -1,
        true
      )
    );

    // Pulse effect for logo
    pulseScale.value = withDelay(
      1000,
      withRepeat(
        withSequence(
          withTiming(1.05, { duration: 1000, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 1000, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    // Shimmer effect
    shimmerPosition.value = withDelay(
      800,
      withRepeat(
        withTiming(1, { duration: 2000, easing: Easing.linear }),
        -1,
        false
      )
    );

    // Ring rotation
    ringOpacity.value = withDelay(300, withTiming(1, { duration: 600 }));
    ringRotate.value = withDelay(
      300,
      withRepeat(
        withTiming(360, { duration: 20000, easing: Easing.linear }),
        -1,
        false
      )
    );

    // Particles fade in
    particlesOpacity.value = withDelay(600, withTiming(1, { duration: 800 }));

    // Title animation
    titleOpacity.value = withDelay(800, withTiming(1, { duration: 600 }));
    titleTranslateY.value = withDelay(
      800,
      withSpring(0, { damping: 12, stiffness: 100 })
    );

    // Subtitle animation
    subtitleOpacity.value = withDelay(1200, withTiming(1, { duration: 600 }));

    // Mark animations as complete after minimum display time
    // Reduced from 2500ms to 1500ms for faster app startup
    const timer = setTimeout(() => {
      setAnimationsComplete(true);
    }, 1500);

    return () => clearTimeout(timer);
  }, [isReady]);

  // Animated styles
  const logoAnimatedStyle = useAnimatedStyle(() => {
    // Ensure scale is never 0 to avoid invisible logo
    const scale = Math.max(0.01, logoScale.value) * pulseScale.value;
    return {
      opacity: logoOpacity.value,
      transform: [
        { scale },
        { rotate: `${logoRotate.value}deg` },
      ],
    };
  });

  const glowAnimatedStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
    transform: [{ scale: glowScale.value }],
  }));

  const ringAnimatedStyle = useAnimatedStyle(() => ({
    opacity: ringOpacity.value,
    transform: [{ rotate: `${ringRotate.value}deg` }],
  }));

  const titleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
  }));

  const shimmerAnimatedStyle = useAnimatedStyle(() => {
    const translateX = interpolate(
      shimmerPosition.value,
      [-1, 1],
      [-200, 200]
    );
    return {
      transform: [{ translateX }],
    };
  });

  const particlesAnimatedStyle = useAnimatedStyle(() => ({
    opacity: particlesOpacity.value,
  }));

  // Floating particles
  const renderParticles = () => {
    const particles = [];
    for (let i = 0; i < 12; i++) {
      const size = 4 + Math.random() * 6;
      const left = Math.random() * width;
      const top = Math.random() * height;
      const delay = Math.random() * 2000;
      const duration = 3000 + Math.random() * 2000;

      particles.push(
        <FloatingParticle
          key={i}
          size={size}
          left={left}
          top={top}
          delay={delay}
          duration={duration}
        />
      );
    }
    return particles;
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      {/* Background Image */}
      <ImageBackground
        source={require('../../../../assets/images/bglogo.png')}
        style={styles.backgroundImage}
        resizeMode="cover"
      >
        {/* Overlay for better contrast */}
        <View style={styles.overlay} />

        {/* Floating Particles */}
        <Animated.View style={[styles.particlesContainer, particlesAnimatedStyle]}>
          {renderParticles()}
        </Animated.View>

        {/* Main Content */}
        <View style={styles.content}>
          {/* Logo Container */}
          <View style={styles.logoContainer}>
            {/* Rotating Ring */}
            <Animated.View style={[styles.outerRing, ringAnimatedStyle]} />
            
            {/* Glow Effect Behind Logo */}
            <Animated.View style={[styles.glowEffect, glowAnimatedStyle]} />
            <Animated.View style={[styles.glowEffectInner, glowAnimatedStyle]} />

            {/* Logo Image */}
            <Animated.View style={[styles.logoWrapper, logoAnimatedStyle]}>
              <Animated.Image
                source={require('../../../../assets/images/logo.png')}
                style={styles.logo}
                resizeMode="contain"
              />

              {/* Shimmer Effect */}
              <View style={styles.shimmerContainer}>
                <Animated.View style={[styles.shimmer, shimmerAnimatedStyle]} />
              </View>
            </Animated.View>
          </View>

          {/* App Title */}
          <Animated.View style={[styles.titleContainer, titleAnimatedStyle]}>
            <Text style={styles.title}>Hành Trình Đức Tin</Text>
          </Animated.View>

          {/* Subtitle */}
          <Animated.Text style={[styles.subtitle, subtitleAnimatedStyle]}>
            Đồng hành cùng bạn trên mỗi nẻo đường
          </Animated.Text>
        </View>

        {/* Loading Indicator */}
        <Animated.View style={[styles.loadingContainer, { opacity: dotsOpacity }]}>
          <LoadingDots />
        </Animated.View>
      </ImageBackground>
    </View>
  );
};

// Floating Particle Component
const FloatingParticle = ({
  size,
  left,
  top,
  delay,
  duration,
}: {
  size: number;
  left: number;
  top: number;
  delay: number;
  duration: number;
}) => {
  const translateY = useSharedValue(0);
  const opacity = useSharedValue(0);

  useEffect(() => {
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-50, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: duration / 2, easing: Easing.inOut(Easing.ease) })
        ),
        -1,
        true
      )
    );

    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(0.8, { duration: duration / 2 }),
          withTiming(0.2, { duration: duration / 2 })
        ),
        -1,
        true
      )
    );
  }, []);

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.particle,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          left,
          top,
        },
        animatedStyle,
      ]}
    />
  );
};

// Loading Dots Component
const LoadingDots = () => {
  const dot1Scale = useSharedValue(1);
  const dot2Scale = useSharedValue(1);
  const dot3Scale = useSharedValue(1);

  useEffect(() => {
    const animateDot = (dotScale: SharedValue<number>, delay: number) => {
      dotScale.value = withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1.4, { duration: 400 }),
            withTiming(1, { duration: 400 })
          ),
          -1,
          true
        )
      );
    };

    animateDot(dot1Scale, 0);
    animateDot(dot2Scale, 150);
    animateDot(dot3Scale, 300);
  }, []);

  const dot1Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot1Scale.value }],
  }));

  const dot2Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot2Scale.value }],
  }));

  const dot3Style = useAnimatedStyle(() => ({
    transform: [{ scale: dot3Scale.value }],
  }));

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, dot1Style]} />
      <Animated.View style={[styles.dot, dot2Style]} />
      <Animated.View style={[styles.dot, dot3Style]} />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  backgroundImage: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: SPLASH_COLORS.overlay,
  },
  particlesContainer: {
    ...StyleSheet.absoluteFillObject,
  },
  particle: {
    position: 'absolute',
    backgroundColor: 'rgba(255, 255, 255, 0.6)',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  logoContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 40,
  },
  outerRing: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    borderWidth: 1.5,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    borderStyle: 'dashed',
  },
  glowEffect: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: 120,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  glowEffectInner: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
  },
  logoWrapper: {
    width: 160,
    height: 160,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 80,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 10,
  },
  logo: {
    width: 120,
    height: 120,
    tintColor: '#8B6914',
  },
  shimmerContainer: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
  },
  shimmer: {
    width: 60,
    height: '150%',
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    transform: [{ skewX: '-20deg' }],
    position: 'absolute',
    top: -20,
  },
  titleContainer: {
    marginBottom: 12,
  },
  title: {
    fontSize: 32,
    fontWeight: '700',
    color: SPLASH_COLORS.textLight,
    textAlign: 'center',
    letterSpacing: 1,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    fontSize: 16,
    color: SPLASH_COLORS.textLight,
    textAlign: 'center',
    opacity: 0.9,
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  loadingContainer: {
    position: 'absolute',
    bottom: 80,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  dotsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: SPLASH_COLORS.textLight,
  },
});

export default SplashScreen;
