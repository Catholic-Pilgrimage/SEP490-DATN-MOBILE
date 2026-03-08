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

const translateStatus = (status?: string): string => {
    switch (status?.toLowerCase()) {
        case 'planning': return 'Đang lên kế hoạch';
        case 'planned': return 'Đã lên kế hoạch';
        case 'ongoing': return 'Đang thực hiện';
        case 'completed': return 'Hoàn thành';
        case 'cancelled': return 'Đã hủy';
        case 'draft': return 'Nháp';
        default: return status || 'Đang lên kế hoạch';
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
        const statusColors: Record<string, { bg: string; border: string; text: string; icon: keyof typeof Ionicons.glyphMap }> = {
            planning: { bg: '#FFF7E6', border: '#FFD591', text: '#FA8C16', icon: 'time-outline' },
            planned: { bg: '#F6FFED', border: '#B7EB8F', text: '#52C41A', icon: 'checkmark-circle-outline' },
            ongoing: { bg: '#E6F7FF', border: '#91D5FF', text: '#1890FF', icon: 'navigate-outline' },
            completed: { bg: '#F9F0FF', border: '#D3ADF7', text: '#722ED1', icon: 'trophy-outline' },
            cancelled: { bg: '#FFF1F0', border: '#FFA39E', text: '#FF4D4F', icon: 'close-circle-outline' },
            draft: { bg: '#F5F5F5', border: '#D9D9D9', text: '#8C8C8C', icon: 'document-outline' },
        };

        const key = (plan.status || 'planning').toLowerCase();
        const colors = statusColors[key] || statusColors['planning'];

        return (
            <View style={{ flexDirection: 'row', gap: 6, alignItems: 'center' }}>
                {plan.isShared && (
                    <View style={[styles.statusTag, { backgroundColor: '#FFF7E6', borderColor: '#FFD591', borderWidth: 1 }]}>
                        <Ionicons name="people-outline" size={12} color="#FA8C16" style={{ marginRight: 4 }} />
                        <Text style={[styles.statusText, { color: '#FA8C16' }]}>Chia sẻ</Text>
                    </View>
                )}
                <View style={[styles.statusTag, { backgroundColor: colors.bg, borderColor: colors.border, borderWidth: 1 }]}>
                    <Ionicons name={colors.icon} size={12} color={colors.text} style={{ marginRight: 4 }} />
                    <Text style={[styles.statusText, { color: colors.text }]} numberOfLines={1}>
                        {translateStatus(plan.status)}
                    </Text>
                </View>
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
                    {(plan.transportation || []).length > 0 && (
                        <View style={styles.transportContainer}>
                            {(plan.transportation || []).slice(0, 3).map((type, idx) => (
                                <View key={idx} style={styles.transportIcon}>
                                    <Ionicons name={getTransportIcon(type)} size={12} color={COLORS.textTertiary} />
                                </View>
                            ))}
                        </View>
                    )}
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
        height: 165,
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
        paddingRight: 16,
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
