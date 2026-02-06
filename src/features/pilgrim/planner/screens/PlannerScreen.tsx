import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useRef, useState } from 'react';
import {
    Animated,
    Dimensions,
    ImageBackground,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { TransportationType } from '../../../../types/pilgrim/planner.types';
import PlanCard, { PlanUI } from '../components/PlanCard';

const { width } = Dimensions.get('window');

// Mock Data
const MOCK_PLANS: PlanUI[] = [
    {
        id: '1',
        title: 'Fatima & Lourdes',
        startDate: '2024-05-15',
        endDate: '2024-05-24', // 10 days
        status: 'planned',
        stopCount: 5,
        participantCount: 3,
        coverImage: 'https://images.unsplash.com/photo-1548625361-e88c60eb83fe',
        isShared: true,
        transportation: ['plane', 'bus'] as TransportationType[],
    },
    {
        id: '2',
        title: 'Rome Jubilee',
        startDate: '2024-12-01',
        endDate: '2024-12-07', // 7 days
        status: 'draft',
        stopCount: 3,
        participantCount: 1,
        coverImage: 'https://images.unsplash.com/photo-1552832230-c0197dd311b5',
        isShared: false,
        transportation: ['plane', 'walk'] as TransportationType[],
    },
    {
        id: '3',
        title: 'Camino de Santiago',
        startDate: '2025-08-20',
        endDate: '2025-09-23', // 35 days
        status: 'draft',
        stopCount: 30,
        participantCount: 2,
        coverImage: 'https://images.unsplash.com/photo-1563820612-40f900609b2e',
        isShared: false,
        transportation: ['walk'] as TransportationType[],
    },
];

import { useTranslation } from 'react-i18next';

export const PlannerScreen = ({ navigation }: any) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [plans, setPlans] = useState<PlanUI[]>(MOCK_PLANS);

    // Animation Values
    const scrollY = useRef(new Animated.Value(0)).current;

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
                    <Text style={styles.compactHeaderTitle}>{t('planner.myPlans', { defaultValue: 'My Pilgrimage' })}</Text>
                </View>
                {/* Border Bottom Line */}
                <View style={styles.compactHeaderBorder} />
            </Animated.View>

            {/* Main Content */}
            <Animated.ScrollView
                contentContainerStyle={[styles.content, { paddingTop: headerHeight + 20, paddingBottom: 100 }]}
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
                        <Text style={styles.headerSubtitle}>{t('planner.myPlans', { defaultValue: 'MY PILGRIMAGE' })}</Text>
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
                <View style={{ marginTop: 20 }}>
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
                            <Text style={styles.emptyTitle}>{t('planner.planNewJourney')}</Text>
                            <Text style={styles.emptySubtitle}>{t('planner.startJourney')}</Text>
                        </View>
                    </TouchableOpacity>
                )}
            </Animated.ScrollView>

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CreatePlanScreen')}
            >
                <Ionicons name="add" size={32} color={COLORS.textPrimary} />
            </TouchableOpacity>
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
        marginBottom: SPACING.md,
        paddingHorizontal: SPACING.sm, // reduced padding as main scrollview has padding
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
        fontFamily: TYPOGRAPHY.fontFamily.display,
        fontWeight: '800',
        color: COLORS.textPrimary,
        lineHeight: 48,
        letterSpacing: -1,
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
});

export default PlannerScreen;
