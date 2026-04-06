import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ImageBackground,
    RefreshControl,
    TouchableOpacity,
    View,
    Text,
    StyleSheet as RNStyleSheet
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import reportApi from '../../../../services/api/shared/reportApi';
import { ReportEntity, ReportReason } from '../../../../types/report.types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

// Terracotta Theme Colors - similar to SOS for consistency
const THEME = {
    primary: '#C05621', // Terracotta
    primaryLight: '#FDF1E6', // Light Terracotta bg
    pending: '#D69E2E', // Yellow
    reviewed: '#3182CE', // Blue
    resolved: '#38A169', // Green
    rejected: '#718096', // Gray
    gray: '#A0AEC0',
    white: '#FFFFFF',
    textMain: '#2D3748',
    textMuted: '#718096',
    border: '#E2E8F0',
    danger: '#E53E3E',
};

const getReasonLabel = (reason: ReportReason, t: any) => {
    const reasons: Record<ReportReason, string> = {
        spam: t('reports.reasons.spam'),
        harassment: t('reports.reasons.harassment'),
        hate_speech: t('reports.reasons.hate_speech'),
        violence: t('reports.reasons.violence'),
        nudity: t('reports.reasons.nudity'),
        false_information: t('reports.reasons.false_information'),
        scam: t('reports.reasons.scam'),
        other: t('reports.reasons.other'),
    };
    return reasons[reason] || t('reports.reasons.fallback');
};

const getTargetTypeLabel = (type: string, t: any) => {
    switch(type) {
        case 'post': return t('reports.targets.post');
        case 'comment': return t('reports.targets.comment');
        case 'user': return t('reports.targets.user');
        default: return t('reports.targets.other');
    }
};

const StatusBadge = ({ status }: { status: string }) => {
    const { t } = useTranslation();
    let color = THEME.pending;
    let label = t('reports.statuses.pending');
    let icon = 'time-outline';

    switch (status) {
        case 'reviewed':
            color = THEME.reviewed;
            label = t('reports.statuses.reviewed');
            icon = 'eye-outline';
            break;
        case 'resolved':
            color = THEME.resolved;
            label = t('reports.statuses.resolved');
            icon = 'checkmark-circle-outline';
            break;
        case 'rejected':
            color = THEME.rejected;
            label = t('reports.statuses.rejected');
            icon = 'close-circle-outline';
            break;
        case 'cancelled':
            color = THEME.gray;
            label = t('reports.statuses.cancelled');
            icon = 'ban-outline';
            break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={12} color={color} />
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
};

export const MyReportsScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const [reports, setReports] = useState<ReportEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    const fetchReports = async () => {
        try {
            const response = await reportApi.getMyReports({ is_active: 'all', limit: 50 });
            if (response.data && response.data.reports) {
                setReports(response.data.reports);
            }
        } catch (error) {
            console.error('Failed to fetch reports', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
            fetchReports();
        });
        return unsubscribe;
    }, [navigation]);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchReports();
    };

    const handleCancel = async (id: string, e: any) => {
        e.stopPropagation();
        Alert.alert(
            t('reports.cancelConfirmTitle'),
            t('reports.cancelConfirmMsg'),
            [
                { text: t('common.cancel'), style: "cancel" },
                { 
                    text: t('reports.cancelBtn'), 
                    style: "destructive",
                    onPress: async () => {
                        try {
                            await reportApi.deleteReport(id);
                            fetchReports();
                        } catch (error) {
                            Alert.alert(t('common.error'), t('reports.cancelError'));
                        }
                    }
                }
            ]
        );
    };

    const renderItem = ({ item }: { item: ReportEntity }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.targetInfo}>
                    <Ionicons 
                        name={item.target_type === 'user' ? 'person' : 'document-text'} 
                        size={16} 
                        color={THEME.textMuted} 
                    />
                    <Text style={styles.targetType}>
                        {getTargetTypeLabel(item.target_type, t)}
                    </Text>
                </View>
                <View style={styles.cardActions}>
                    <StatusBadge status={item.status} />
                    {item.is_active !== false && item.status !== 'cancelled' && (
                        <TouchableOpacity 
                            style={styles.deleteButton} 
                            onPress={(e) => handleCancel(item.id, e)}
                        >
                            <Ionicons name="close-circle-outline" size={18} color={THEME.danger} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <Text style={styles.reasonLabel}>
                {t('reports.violationLabel')}<Text style={styles.reasonText}>{getReasonLabel(item.reason, t)}</Text>
            </Text>
            
            {item.description ? (
                <Text style={styles.description} numberOfLines={2}>
                    {item.description}
                </Text>
            ) : null}

            <View style={styles.cardFooter}>
                <Text style={styles.timeText}>
                    {dayjs(item.created_at).locale(i18n.language).format('HH:mm - DD/MM/YYYY')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
            </View>
            
            <View style={[
                styles.accentLine,
                { backgroundColor: item.status === 'pending' ? THEME.pending : (item.status === 'resolved' ? THEME.resolved : 'transparent') }
            ]} />
        </TouchableOpacity>
    );

    return (
        <ImageBackground
            source={require('../../../../../assets/images/profile-bg.jpg')}
            style={[styles.container, { paddingTop: insets.top }]}
            resizeMode="cover"
            fadeDuration={0}
        >
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={THEME.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('reports.title')}</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            {isLoading && !isRefreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="small" color={THEME.primary} />
                </View>
            ) : reports.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="flag-outline" size={48} color={THEME.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>{t('reports.emptyTitle')}</Text>
                    <Text style={styles.emptyText}>
                        {t('reports.emptyText')}
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={reports}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </ImageBackground>
    );
};

const styles = RNStyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(240, 240, 240, 0.5)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.full,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMain,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: SPACING.md,
    },
    card: {
        backgroundColor: THEME.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.md,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
        position: 'relative',
        overflow: 'hidden',
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: SPACING.sm,
    },
    targetInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    targetType: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMuted,
        textTransform: 'uppercase',
    },
    cardActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    deleteButton: {
        padding: 4,
    },
    reasonLabel: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: THEME.textMain,
        marginBottom: SPACING.xs,
    },
    reasonText: {
        fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    description: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: THEME.textMain,
        marginBottom: SPACING.md,
        lineHeight: 20,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F7FAFC',
        paddingTop: SPACING.sm,
        marginTop: SPACING.xs,
    },
    timeText: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: THEME.textMuted,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        borderRadius: BORDER_RADIUS.md,
    },
    badgeText: {
        fontSize: 10,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        textTransform: 'uppercase',
    },
    accentLine: {
        position: 'absolute',
        left: 0,
        top: 0,
        bottom: 0,
        width: 4,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.xl,
    },
    emptyIconBg: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: THEME.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: SPACING.md,
    },
    emptyTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMain,
        marginBottom: SPACING.xs,
    },
    emptyText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: THEME.textMuted,
        textAlign: 'center',
        lineHeight: 22,
    },
});

export default MyReportsScreen;
