import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { useTranslation } from 'react-i18next';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
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
    const dateStr = `${start.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })} – ${end.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })}`;

    // Status Badge Logic
    const renderStatus = () => {
        if (plan.status === 'draft') {
            return (
                <View style={[styles.statusTag, { backgroundColor: '#F0F0F0' }]}>
                    <Text style={[styles.statusText, { color: '#888' }]}>{t('planner.draft', 'Bản nháp')}</Text>
                </View>
            );
        }
        if (plan.isShared) {
            return (
                <View style={[styles.statusTag, { backgroundColor: '#FFF7E6', borderColor: '#FFD591', borderWidth: 1 }]}>
                    <Ionicons name="people-outline" size={12} color="#FA8C16" style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: '#FA8C16' }]}>{t('planner.shared', 'Chia sẻ')}</Text>
                </View>
            );
        }
        return (
            <View style={[styles.statusTag, { backgroundColor: '#E6FFFB', borderColor: '#87E8DE', borderWidth: 1 }]}>
                <Ionicons name="checkmark-circle-outline" size={12} color="#13C2C2" style={{ marginRight: 4 }} />
                <Text style={[styles.statusText, { color: '#13C2C2' }]}>{plan.status === 'planned' ? t('planner.statusPlanned', { defaultValue: 'Đã lên lịch' }) : plan.status || 'Đã lên lịch'}</Text>
            </View>
        );
    };

    const hasImage = plan.coverImage && plan.coverImage.length > 5;

    return (
        <TouchableOpacity
            style={styles.card}
            onPress={onPress}
            activeOpacity={0.9}
        >
            {/* Left Side: Image or Placeholder pattern */}
            <View style={styles.leftColumn}>
                {hasImage ? (
                    <Image
                        source={{ uri: plan.coverImage }}
                        style={styles.coverImage}
                    />
                ) : (
                    <View style={styles.placeholderContainer}>
                        <View style={styles.placeholderPattern}>
                            <Ionicons name="map-outline" size={32} color="rgba(255,255,255,0.8)" />
                        </View>
                        <View style={styles.placeholderOverlay} />
                    </View>
                )}
                <View style={styles.dayBadge}>
                    <Text style={styles.dayBadgeNumber}>{durationDays}</Text>
                    <Text style={styles.dayBadgeText}>{t('days', 'Ngày')}</Text>
                </View>
            </View>

            {/* Right Side: Content */}
            <View style={styles.rightColumn}>
                <View style={styles.headerRow}>
                    <Text style={styles.title} numberOfLines={2}>{plan.title}</Text>
                </View>

                <View style={styles.metaContainer}>
                    <View style={styles.metaRow}>
                        <Ionicons name="calendar-clear-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.metaText}>{dateStr}</Text>
                    </View>

                    {plan.participantCount && plan.participantCount > 0 && (
                        <View style={styles.metaRow}>
                            <Ionicons name="person-outline" size={14} color={COLORS.textSecondary} />
                            <Text style={styles.metaText}>{plan.participantCount} người</Text>
                        </View>
                    )}
                </View>

                <View style={styles.divider} />

                <View style={styles.footerRow}>
                    <View style={styles.transportContainer}>
                        {(plan.transportation || []).slice(0, 3).map((type, idx) => (
                            <View key={idx} style={styles.transportIcon}>
                                <Ionicons name={getTransportIcon(type)} size={12} color={COLORS.textTertiary} />
                            </View>
                        ))}
                    </View>
                    {renderStatus()}
                </View>

                {/* Decorative corner accent */}
                <View style={styles.decorativeCorner} />
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    card: {
        backgroundColor: COLORS.white,
        borderRadius: 16,
        marginBottom: SPACING.md,
        flexDirection: 'row',
        height: 150,
        ...SHADOWS.medium,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
    },
    leftColumn: {
        width: 110,
        height: '100%',
        position: 'relative',
    },
    coverImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    placeholderContainer: {
        width: '100%',
        height: '100%',
        backgroundColor: COLORS.primary, // Deep blue/primary
        justifyContent: 'center',
        alignItems: 'center',
    },
    placeholderPattern: {
        opacity: 0.5,
        transform: [{ rotate: '-10deg' }]
    },
    placeholderOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'linear-gradient(180deg, rgba(255,255,255,0.1) 0%, rgba(0,0,0,0.1) 100%)', // Simulated
    },
    dayBadge: {
        position: 'absolute',
        top: 8,
        left: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 4,
        alignItems: 'center',
        justifyContent: 'center',
        ...SHADOWS.small,
    },
    dayBadgeNumber: {
        fontSize: 14,
        fontWeight: '800',
        color: COLORS.primary,
        lineHeight: 16,
    },
    dayBadgeText: {
        fontSize: 9,
        color: COLORS.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    rightColumn: {
        flex: 1,
        padding: 12,
        paddingLeft: 16,
        justifyContent: 'space-between',
    },
    headerRow: {
        marginBottom: 4,
    },
    title: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        fontFamily: TYPOGRAPHY.fontFamily.display,
        lineHeight: 24,
    },
    metaContainer: {
        gap: 6,
        marginBottom: 8,
    },
    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    metaText: {
        fontSize: 13,
        color: COLORS.textSecondary,
        fontWeight: '500',
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 8,
    },
    footerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    transportContainer: {
        flexDirection: 'row',
        gap: 4,
    },
    transportIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
    },
    statusTag: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '600',
    },
    decorativeCorner: {
        position: 'absolute',
        bottom: -20,
        right: -20,
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: COLORS.accent, // Simple accent color
        opacity: 0.1,
        transform: [{ rotate: '45deg' }],
        zIndex: -1,
    }
});

export default PlanCard;
