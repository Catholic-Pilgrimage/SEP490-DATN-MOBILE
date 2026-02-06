import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { PlanStatus, PlanSummary, TransportationType } from '../../../../types/pilgrim/planner.types';

// Extend PlanSummary for UI purposes if needed (Mocking data structures that might not be in API yet)
export interface PlanUI extends PlanSummary {
    isShared?: boolean;
    transportation?: TransportationType[];
}

interface PlanCardProps {
    plan: PlanUI;
    onPress: () => void;
}

const getStatusColor = (status: PlanStatus) => {
    switch (status) {
        case 'draft':
            return { bg: COLORS.background, text: COLORS.textSecondary };
        case 'planned':
            return { bg: 'rgba(82, 196, 26, 0.1)', text: COLORS.success }; // Green
        case 'completed':
            return { bg: 'rgba(24, 144, 255, 0.1)', text: COLORS.info }; // Blue
        default:
            return { bg: COLORS.background, text: COLORS.textSecondary };
    }
};

const getTransportIcon = (type: TransportationType): keyof typeof Ionicons.glyphMap => {
    switch (type) {
        case 'plane': return 'airplane-outline';
        case 'car': return 'car-outline';
        case 'bus': return 'bus-outline';
        case 'train': return 'train-outline';
        case 'walk': return 'walk-outline';
        default: return 'help-outline';
    }
};

export const PlanCard: React.FC<PlanCardProps> = ({ plan, onPress }) => {
    const { t } = useTranslation();
    // Calculate duration
    const start = new Date(plan.startDate);
    const end = new Date(plan.endDate);
    const durationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    const dateStr = start.toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' });

    // Status Badge Logic
    let statusBadge = null;
    if (plan.isShared) {
        statusBadge = (
            <View style={[styles.badge, styles.badgeShared]}>
                <View style={styles.sharedDot} />
                <Text style={styles.badgeSharedText}>{t('planner.shared')}</Text>
            </View>
        );
    } else if (plan.status === 'draft') {
        statusBadge = (
            <View style={[styles.badge, styles.badgeDraft]}>
                <Text style={styles.badgeDraftText}>{t('planner.draft')}</Text>
            </View>
        );
    }

    // Transportation Icons (Mocking list if singular)
    const transports = plan.transportation || [];

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            <View style={styles.badgeContainer}>
                {statusBadge}
            </View>

            <View style={styles.imageContainer}>
                <Image
                    source={{ uri: plan.coverImage || 'https://images.unsplash.com/photo-1548625361-e88c60eb83fe' }}
                    style={styles.image}
                />
                <View style={styles.imageOverlay} />
            </View>

            <View style={styles.content}>
                <View>
                    <Text style={styles.title} numberOfLines={1}>{plan.title}</Text>
                    <View style={styles.dateRow}>
                        <Ionicons name="calendar-outline" size={16} color={COLORS.textSecondary} />
                        <Text style={styles.dateText}>{dateStr}</Text>
                    </View>
                </View>

                <View style={styles.footer}>
                    <View style={styles.durationBadge}>
                        <Text style={styles.durationText}>{durationDays} {t('planner.days')}</Text>
                    </View>

                    <View style={styles.transportRow}>
                        {transports.map((t, idx) => (
                            <Ionicons
                                key={idx}
                                name={getTransportIcon(t)}
                                size={18}
                                color={COLORS.textTertiary}
                            />
                        ))}
                        {transports.length === 0 && (
                            <Ionicons name="walk-outline" size={18} color={COLORS.textTertiary} />
                        )}
                    </View>
                </View>
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        flexDirection: 'row',
        marginBottom: SPACING.md,
        ...SHADOWS.medium,
        height: 140, // Fixed height for consistency
    },
    badgeContainer: {
        position: 'absolute',
        top: SPACING.md,
        right: SPACING.md,
        zIndex: 10,
    },
    badge: {
        paddingHorizontal: SPACING.sm,
        paddingVertical: 4,
        borderRadius: BORDER_RADIUS.full,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    badgeShared: {
        backgroundColor: '#fff8e1', // Light yellow/gold
    },
    badgeSharedText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: '#b48805', // Darker gold
        textTransform: 'uppercase',
    },
    sharedDot: {
        width: 6,
        height: 6,
        borderRadius: 3,
        backgroundColor: '#b48805',
    },
    badgeDraft: {
        backgroundColor: COLORS.background,
    },
    badgeDraftText: {
        fontSize: 10,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
    },
    imageContainer: {
        width: 100,
        height: '100%',
        borderRadius: BORDER_RADIUS.md,
        overflow: 'hidden',
        backgroundColor: COLORS.background,
        marginRight: SPACING.md,
    },
    image: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    imageOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.05)',
    },
    content: {
        flex: 1,
        justifyContent: 'space-between',
        paddingVertical: 2,
    },
    title: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontFamily: TYPOGRAPHY.fontFamily.display, // Serif if available
        fontWeight: 'bold',
        color: COLORS.textPrimary,
        marginBottom: SPACING.xs,
        paddingRight: 40, // Space for badge
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: SPACING.xs,
    },
    dateText: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 'auto',
    },
    durationBadge: {
        backgroundColor: COLORS.background,
        paddingHorizontal: SPACING.sm,
        paddingVertical: 6,
        borderRadius: BORDER_RADIUS.sm,
    },
    durationText: {
        fontSize: 11,
        fontWeight: 'bold',
        color: COLORS.textSecondary,
    },
    transportRow: {
        flexDirection: 'row',
        gap: SPACING.sm,
    },
});

export default PlanCard;
