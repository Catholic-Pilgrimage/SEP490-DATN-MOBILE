import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import pilgrimSOSApi from '../../../../services/api/pilgrim/sosApi';
import { SOSEntity } from '../../../../types/pilgrim';

// Terracotta Theme Colors
const THEME = {
    primary: '#C05621', // Terracotta
    primaryLight: '#FDF1E6', // Light Terracotta bg
    pending: '#C05621',
    processing: '#2B6CB0',
    resolved: '#38A169',
    cancelled: '#718096',
    white: '#FFFFFF',
    textMain: '#2D3748',
    textMuted: '#718096',
    border: '#E2E8F0',
};

const StatusBadge = ({ status }: { status: string }) => {
    let color = THEME.pending;
    let label = 'Đang chờ';
    let icon = 'time-outline';

    switch (status) {
        case 'processing':
            color = THEME.processing;
            label = 'Đang xử lý';
            icon = 'sync-outline';
            break;
        case 'resolved':
            color = THEME.resolved;
            label = 'Đã xong';
            icon = 'checkmark-done-circle-outline';
            break;
        case 'cancelled':
            color = THEME.cancelled;
            label = 'Đã hủy';
            icon = 'close-circle-outline';
            break;
    }

    return (
        <View style={[styles.badge, { backgroundColor: `${color}15` }]}>
            <Ionicons name={icon as any} size={14} color={color} />
            <Text style={[styles.badgeText, { color }]}>{label}</Text>
        </View>
    );
};

export const SOSHistoryScreen = () => {
    const navigation = useNavigation();
    const [sosList, setSOSList] = useState<SOSEntity[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const insets = useSafeAreaInsets();

    const fetchSOSList = async () => {
        try {
            const response = await pilgrimSOSApi.getSOSList({ limit: 20 });
            if (response.data && response.data.sosRequests) {
                setSOSList(response.data.sosRequests);
            }
        } catch (error) {
            console.error('Failed to fetch SOS list', error);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        fetchSOSList();
    }, []);

    const onRefresh = () => {
        setIsRefreshing(true);
        fetchSOSList();
    };

    const renderItem = ({ item }: { item: SOSEntity }) => (
        <TouchableOpacity
            style={styles.card}
            activeOpacity={0.7}
            onPress={() => (navigation as any).navigate('SOSDetail', { sosId: item.id })}
        >
            <View style={styles.cardHeader}>
                <View style={styles.siteInfo}>
                    <Ionicons name="location" size={16} color={THEME.primary} />
                    <Text style={styles.siteName} numberOfLines={1}>
                        {item.site?.name || 'Vị trí không xác định'}
                    </Text>
                </View>
                <StatusBadge status={item.status} />
            </View>

            <Text style={styles.message} numberOfLines={2}>
                {item.message}
            </Text>

            <View style={styles.cardFooter}>
                <Text style={styles.timeText}>
                    {dayjs(item.created_at).locale('vi').format('HH:mm - DD/MM/YYYY')}
                </Text>
                <Ionicons name="chevron-forward" size={16} color={THEME.textMuted} />
            </View>

            {/* Accent Line */}
            <View style={[
                styles.accentLine,
                { backgroundColor: item.status === 'pending' ? THEME.pending : 'transparent' }
            ]} />
        </TouchableOpacity>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={THEME.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Lịch sử Hỗ trợ</Text>
                <View style={{ width: 40 }} />
            </View>

            {/* Content */}
            {isLoading && !isRefreshing ? (
                <View style={styles.centerContainer}>
                    <ActivityIndicator size="small" color={THEME.primary} />
                </View>
            ) : sosList.length === 0 ? (
                <View style={styles.emptyContainer}>
                    <View style={styles.emptyIconBg}>
                        <Ionicons name="shield-checkmark-outline" size={48} color={THEME.primary} />
                    </View>
                    <Text style={styles.emptyTitle}>Chưa có yêu cầu nào</Text>
                    <Text style={styles.emptyText}>
                        Lịch sử các yêu cầu hỗ trợ của bạn sẽ xuất hiện tại đây.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={sosList}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} colors={[THEME.primary]} />
                    }
                    showsVerticalScrollIndicator={false}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F3EB',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: SPACING.md,
        backgroundColor: '#F6F3EB',
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
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
    // Card Styles
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
        alignItems: 'flex-start',
        marginBottom: SPACING.sm,
    },
    siteInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        flex: 1,
        marginRight: SPACING.sm,
    },
    siteName: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMain,
    },
    message: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: THEME.textMain,
        marginBottom: SPACING.md,
        lineHeight: 22,
    },
    cardFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: 1,
        borderTopColor: '#F7FAFC',
        paddingTop: SPACING.sm,
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
    // Empty State
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
    },
});

export default SOSHistoryScreen;
