import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect, useScrollToTop } from '@react-navigation/native';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import { PlanEntity, TransportationType } from '../../../../types/pilgrim/planner.types';
import PlanCard, { PlanUI } from '../components/PlanCard';

import { useTranslation } from 'react-i18next';

// Animated guest card with floating + icon pulse
const GuestCardAnimated = ({ handleLogin, t }: { handleLogin: () => void; t: any }) => {
    const cardFloat = useRef(new Animated.Value(0)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(cardFloat, { toValue: -6, duration: 1500, useNativeDriver: true }),
                Animated.timing(cardFloat, { toValue: 6, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(iconPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(iconPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.lg, marginTop: SPACING.xl }}>
            <Animated.View style={[styles.guestCard, { transform: [{ translateY: cardFloat }] }]}>
                <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
                    <MaterialIcons name="lock-outline" size={48} color="#D4AF37" />
                </Animated.View>
                <Text style={styles.guestTitle}>{t('profile.loginRequired')}</Text>
                <Text style={styles.guestSubtitle}>{t('profile.loginRequiredMessage')}</Text>
                <TouchableOpacity style={styles.guestLoginBtn} onPress={handleLogin} activeOpacity={0.8}>
                    <View style={styles.guestLoginInner}>
                        <MaterialIcons name="login" size={20} color="#FFFFFF" />
                        <Text style={styles.guestLoginText}>{t('profile.loginRegister', { defaultValue: 'Đăng nhập / Đăng ký' })}</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};
const { width } = Dimensions.get('window');

export const PlannerScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const { isGuest, exitGuestMode } = useAuth();
    const [plans, setPlans] = useState<PlanUI[]>([]);
    const [loading, setLoading] = useState(!isGuest);

    // Fetch Plans
    const fetchPlans = useCallback(async () => {
        try {
            // setLoading(true); // Maybe don't set loading on refocus to avoid flicker? 
            // Or only initial loading. Let's keep it simple for now or use a refreshing state.
            const response = await pilgrimPlannerApi.getPlans({ page: 1, limit: 10 });
            if (response.success && response.data?.planners) {
                // Map API Entity to UI Model
                const mappedPlans: PlanUI[] = response.data.planners.map((entity: PlanEntity) => {
                    return {
                        id: entity.id,
                        title: entity.name,
                        startDate: entity.start_date,
                        endDate: entity.end_date || entity.start_date, // Fallback if end_date missing
                        status: (entity.status as any) || 'planned',
                        stopCount: 0,
                        participantCount: entity.number_of_people,
                        coverImage: 'https://images.unsplash.com/photo-1548625361-e88c60eb83fe',
                        isShared: !!entity.share_token, // Check share_token for shared status
                        transportation: [entity.transportation as TransportationType],
                    };
                });
                setPlans(mappedPlans);
            }
        } catch (error) {
            console.error('Failed to fetch plans:', error);
            // Optional: Alert.alert('Error', 'Failed to load plans');
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            if (!isGuest) {
                fetchPlans();
            }
        }, [fetchPlans, isGuest])
    );

    const handleLogin = async () => {
        if (isGuest) {
            await exitGuestMode();
        }
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            })
        );
    };

    // Animation Values
    const scrollY = useRef(new Animated.Value(0)).current;

    const scrollRef = useRef(null);
    useScrollToTop(scrollRef);

    // Header Animations
    const headerHeight = 60 + insets.top; // Compact header height

    const compactHeaderOpacity = scrollY.interpolate({
        inputRange: [50, 100],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const largeHeaderOpacity = scrollY.interpolate({
        inputRange: [0, 80],
        outputRange: [1, 0],
        extrapolate: 'clamp',
    });

    const largeHeaderScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.2, 1],
        extrapolate: 'clamp',
    });

    const largeHeaderTranslateY = scrollY.interpolate({
        inputRange: [0, 100],
        outputRange: [0, -50],
        extrapolate: 'clamp',
    });

    return (
        <ImageBackground
            source={require('../../../../../assets/images/bg3.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Compact Header (Collapsing) */}
            <Animated.View style={[
                styles.compactHeader,
                {
                    height: headerHeight,
                    paddingTop: insets.top,
                    opacity: compactHeaderOpacity,
                }
            ]}>
                <View style={styles.compactHeaderContent}>
                    <Text style={styles.compactHeaderTitle}>{t('planner.myPlans', { defaultValue: 'Kế hoạch của tôi' })}</Text>
                </View>
                {/* Border Bottom Line */}
                <View style={styles.compactHeaderBorder} />
            </Animated.View>

            {/* Main Content */}
            <Animated.ScrollView
                ref={scrollRef}
                contentContainerStyle={[styles.content, { paddingTop: insets.top + 20, paddingBottom: 100 }]}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                scrollEventThrottle={16}
            >
                {/* Large Header Area */}
                <Animated.View style={[
                    styles.largeHeaderContainer,
                    {
                        opacity: largeHeaderOpacity,
                        transform: [
                            { scale: largeHeaderScale },
                            { translateY: largeHeaderTranslateY }
                        ]
                    }
                ]}>
                    <View>
                        <Text style={styles.headerSubtitle}>{t('planner.myPlans', { defaultValue: 'KẾ HOẠCH CỦA TÔI' })}</Text>
                        <Text style={styles.headerTitle}>
                            {t('planner.dashboardTitle')}
                        </Text>
                        <View style={styles.headerDecoration} />

                        {/* Dove Pattern Overlay */}
                        <View style={styles.dovePattern}>
                            <MaterialCommunityIcons name="bird" size={24} color={COLORS.textTertiary} style={{ opacity: 0.1, position: 'absolute', top: -10, left: 100 }} />
                            <MaterialCommunityIcons name="bird" size={18} color={COLORS.textTertiary} style={{ opacity: 0.08, position: 'absolute', top: -25, left: 130 }} />
                            <MaterialCommunityIcons name="bird" size={14} color={COLORS.textTertiary} style={{ opacity: 0.05, position: 'absolute', top: -35, left: 155 }} />
                        </View>
                    </View>

                    {/* Scallop Shell / Compass Watermark */}
                    <View style={styles.shellContainer}>
                        <Ionicons
                            name="compass-outline"
                            size={120}
                            color={COLORS.textTertiary}
                            style={styles.shellIcon}
                        />
                    </View>
                </Animated.View>

                {/* Plans List */}
                {isGuest ? (
                    <GuestCardAnimated handleLogin={handleLogin} t={t} />
                ) : (
                    <>
                        <View style={{ marginTop: 10 }}>
                            {plans.map((plan) => (
                                <PlanCard
                                    key={plan.id}
                                    plan={plan}
                                    onPress={() => navigation.navigate('PlanDetailScreen', { planId: plan.id })}
                                />
                            ))}
                        </View>

                        {/* Empty State / CTA - Only shown when no plans exist */}
                        {plans.length === 0 && (
                            <TouchableOpacity style={styles.emptyStateCard} activeOpacity={0.8} onPress={() => navigation.navigate('CreatePlanScreen')}>
                                <View style={styles.emptyIllustration}>
                                    <Ionicons name="map-outline" size={48} color={COLORS.textTertiary} style={{ opacity: 0.5 }} />
                                    <Ionicons name="add-circle-outline" size={32} color={COLORS.accent} style={{ position: 'absolute', bottom: -5, right: -5 }} />
                                </View>
                                <View style={styles.emptyTextContainer}>
                                    <Text style={styles.emptyTitle}>{t('planner.planNewJourney', { defaultValue: 'Lên Kế Hoạch Chuyến Đi Mới' })}</Text>
                                    <Text style={styles.emptySubtitle}>{t('planner.startJourney', { defaultValue: 'Bắt đầu hành trình tâm linh tiếp theo của bạn.' })}</Text>
                                </View>
                            </TouchableOpacity>
                        )}
                    </>
                )}
            </Animated.ScrollView>

            {/* FAB - Hidden for guests */}
            {!isGuest && (
                <TouchableOpacity
                    style={styles.fab}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('CreatePlanScreen')}
                >
                    <Ionicons name="add" size={32} color={COLORS.textPrimary} />
                </TouchableOpacity>
            )}
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSoft,
    },
    // Compact Header
    compactHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(255,255,255,0.95)',
        zIndex: 100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    compactHeaderContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    compactHeaderTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    compactHeaderBorder: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 1,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    // Large Header
    largeHeaderContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 10,
        paddingBottom: SPACING.md,
        paddingVertical: 4,
        position: 'relative',
    },
    headerSubtitle: {
        fontSize: 14,
        fontWeight: '700', // SemiBold/Bold
        color: COLORS.accent,
        letterSpacing: 2, // Increased letter spacing
        textTransform: 'uppercase',
        marginBottom: 6,
    },
    headerTitle: {
        fontSize: 42, // Larger
        fontFamily: Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' }),
        fontWeight: '700', // Bold but not ExtraBold
        color: COLORS.textPrimary,
        lineHeight: 48,
        letterSpacing: -0.5,
    },
    headerDecoration: {
        width: 60,
        height: 4,
        backgroundColor: COLORS.accent,
        borderRadius: 2,
        marginTop: 16,
    },
    dovePattern: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    // Shell Watermark
    shellContainer: {
        position: 'absolute',
        right: -20,
        top: -30,
        opacity: 0.15, // 15% opacity
        transform: [{ rotate: '-15deg' }],
    },
    shellIcon: {
        // Additional styling if needed
    },
    content: {
        paddingHorizontal: SPACING.lg,
    },
    // Empty State
    emptyStateCard: {
        marginTop: SPACING.md,
        backgroundColor: 'rgba(255, 255, 255, 0.5)',
        borderWidth: 2,
        borderColor: COLORS.borderMedium,
        borderStyle: 'dashed',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        justifyContent: 'center',
        gap: SPACING.md,
    },
    emptyIllustration: {
        width: 80,
        height: 80,
        justifyContent: 'center',
        alignItems: 'center',
        position: 'relative',
    },
    emptyTextContainer: {
        alignItems: 'center',
        gap: 4,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: 'bold',
        color: COLORS.textPrimary,
    },
    emptySubtitle: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.textSecondary,
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: SPACING.xl,
        right: SPACING.lg,
        width: 64,
        height: 64,
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.large,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    guestCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        width: '100%',
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    guestSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    guestLoginBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    guestLoginInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 20,
        backgroundColor: '#D4AF37',
        gap: 8,
    },
    guestLoginText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
});

export default PlannerScreen;
