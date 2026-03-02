import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Linking,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import pilgrimSOSApi from '../../../../services/api/pilgrim/sosApi';
import { SOSEntity } from '../../../../types/pilgrim';

// Colors Theme (Terracotta)
const THEME = {
    primary: '#C05621',
    primaryLight: '#FDF1E6',
    white: '#FFFFFF',
    textMain: '#2D3748',
    textMuted: '#718096',
    border: '#E2E8F0',
    danger: '#E53E3E',
    success: '#38A169',
    info: '#3182CE',
    warning: '#DD6B20',
    gray: '#A0AEC0',
};

type ParamList = {
    SOSDetail: {
        sosId: string;
    };
};

export const SOSDetailScreen = () => {
    const navigation = useNavigation();
    const route = useRoute<RouteProp<ParamList, 'SOSDetail'>>();
    const { sosId } = route.params;
    const insets = useSafeAreaInsets();

    const [sosData, setSosData] = useState<SOSEntity | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isCancelling, setIsCancelling] = useState(false);

    const fetchSOSDetail = async () => {
        try {
            const response = await pilgrimSOSApi.getSOSDetail(sosId);
            if (response.data) {
                setSosData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch SOS detail', error);
            Alert.alert('Lỗi', 'Không thể tải thông tin chi tiết.');
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (sosId) {
            fetchSOSDetail();
        }
    }, [sosId]);

    const handleCancelSOS = () => {
        Alert.alert(
            'Xác nhận hủy',
            'Bạn có chắc chắn muốn hủy yêu cầu hỗ trợ này không?',
            [
                { text: 'Không', style: 'cancel' },
                {
                    text: 'Hủy yêu cầu',
                    style: 'destructive',
                    onPress: async () => {
                        setIsCancelling(true);
                        try {
                            await pilgrimSOSApi.cancelSOS(sosId);
                            Alert.alert('Thành công', 'Đã hủy yêu cầu hỗ trợ.');
                            setSosData(prev => prev ? { ...prev, status: 'cancelled' } : null);
                        } catch (error) {
                            console.error('Failed to cancel SOS', error);
                            Alert.alert('Lỗi', 'Không thể hủy yêu cầu. Vui lòng thử lại.');
                        } finally {
                            setIsCancelling(false);
                        }
                    },
                },
            ]
        );
    };

    const handleCallGuide = () => {
        if (sosData?.assignedGuide?.phone) {
            Linking.openURL(`tel:${sosData.assignedGuide.phone}`);
        } else {
            Alert.alert('Thông báo', 'Chưa có thông tin liên hệ của người hỗ trợ.');
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
            </View>
        );
    }

    if (!sosData) return null;

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: 'Đang chờ xử lý', color: THEME.warning, icon: 'time' };
            case 'processing': return { label: 'Đang xử lý', color: THEME.info, icon: 'sync' };
            case 'resolved': return { label: 'Đã hoàn thành', color: THEME.success, icon: 'checkmark-circle' };
            case 'cancelled': return { label: 'Đã hủy', color: THEME.gray, icon: 'close-circle' };
            default: return { label: 'Không xác định', color: THEME.gray, icon: 'help-circle' };
        }
    };

    const statusInfo = getStatusInfo(sosData.status);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={THEME.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết hỗ trợ</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Status Card */}
                <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
                    <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}15` }]}>
                        <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                    </View>
                    <View>
                        <Text style={styles.statusLabel}>Trạng thái</Text>
                        <Text style={[styles.statusValue, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                {/* Main Info */}
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Thông tin yêu cầu</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="location-outline" size={20} color={THEME.textMuted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Địa điểm</Text>
                            <Text style={styles.infoValue}>{sosData.site?.name}</Text>
                            <Text style={styles.infoSub}>{sosData.site?.address}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color={THEME.textMuted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Nội dung</Text>
                            <Text style={styles.infoValue}>{sosData.message}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color={THEME.textMuted} />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>Thời gian gửi</Text>
                            <Text style={styles.infoValue}>
                                {dayjs(sosData.created_at).locale('vi').format('HH:mm - DD/MM/YYYY')}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Guide Info (if assigned) */}
                {sosData.assignedGuide && (
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Người hỗ trợ</Text>
                        <View style={styles.guideCard}>
                            <View style={styles.guideAvatar}>
                                <Ionicons name="person" size={24} color={THEME.primary} />
                            </View>
                            <View style={styles.guideInfo}>
                                <Text style={styles.guideName}>{sosData.assignedGuide.full_name}</Text>
                                <Text style={styles.guideRole}>Hỗ trợ viên</Text>
                            </View>
                            <TouchableOpacity style={styles.callButton} onPress={handleCallGuide}>
                                <Ionicons name="call" size={20} color={THEME.white} />
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* Actions */}
                {sosData.status === 'pending' && (
                    <TouchableOpacity
                        style={styles.cancelButton}
                        onPress={handleCancelSOS}
                        disabled={isCancelling}
                    >
                        {isCancelling ? (
                            <ActivityIndicator color={THEME.danger} />
                        ) : (
                            <>
                                <Ionicons name="close-circle-outline" size={20} color={THEME.danger} />
                                <Text style={styles.cancelButtonText}>Hủy yêu cầu</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F6F3EB',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        borderRadius: 20,
    },
    headerTitle: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMain,
    },
    content: {
        padding: SPACING.md,
    },
    statusCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.white,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.lg,
        borderLeftWidth: 4,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    statusIcon: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    statusLabel: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: THEME.textMuted,
        textTransform: 'uppercase',
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        marginBottom: 4,
    },
    statusValue: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
    },
    section: {
        backgroundColor: THEME.white,
        borderRadius: BORDER_RADIUS.lg,
        padding: SPACING.lg,
        marginBottom: SPACING.md,
        ...SHADOWS.small,
    },
    sectionTitle: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.textMain,
        marginBottom: SPACING.md,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: SPACING.md,
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: TYPOGRAPHY.fontSize.xs,
        color: THEME.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: THEME.textMain,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
    },
    infoSub: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: THEME.textMuted,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: THEME.border,
        marginVertical: SPACING.md,
        marginLeft: 36, // align with content
    },
    guideCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: THEME.primaryLight,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.md,
    },
    guideAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: `${THEME.primary}20`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: SPACING.md,
    },
    guideInfo: {
        flex: 1,
    },
    guideName: {
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        color: THEME.primary,
    },
    guideRole: {
        fontSize: TYPOGRAPHY.fontSize.sm,
        color: THEME.textMuted,
    },
    callButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: THEME.success,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.small,
    },
    cancelButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
        padding: SPACING.lg,
        backgroundColor: THEME.white,
        borderRadius: BORDER_RADIUS.lg,
        borderWidth: 1,
        borderColor: THEME.danger,
        marginTop: SPACING.sm,
    },
    cancelButtonText: {
        color: THEME.danger,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
});

export default SOSDetailScreen;
