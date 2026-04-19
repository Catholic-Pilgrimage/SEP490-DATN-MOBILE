import { Ionicons } from '@expo/vector-icons';
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    ImageBackground,
    StyleSheet as RNStyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import reportApi from '../../../../services/api/shared/reportApi';
import { ReportEntity, ReportReason } from '../../../../types/report.types';

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
    warning: '#D69E2E',
    gray: '#A0AEC0',
    gold: '#D4AF37',
};

type ParamList = {
    ReportDetail: {
        reportId: string;
    };
};

const getReasonLabel = (reason: ReportReason | string, t: any) => {
    const normalizedReason = reason === 'nudity' ? 'inappropriate' : reason;
    const reasons: Record<ReportReason, string> = {
        spam: t('reports.reasons.spam'),
        harassment: t('reports.reasons.harassment'),
        hate_speech: t('reports.reasons.hate_speech'),
        violence: t('reports.reasons.violence'),
        inappropriate: t('reports.reasons.inappropriate'),
        false_information: t('reports.reasons.false_information'),
        scam: t('reports.reasons.scam'),
        other: t('reports.reasons.other'),
    };
    return reasons[normalizedReason as ReportReason] || t('reports.reasons.fallback');
};

const getTargetTypeLabel = (type: string, t: any) => {
    switch(type) {
        case 'post': return t('reports.targets.post');
        case 'comment': return t('reports.targets.comment');
        case 'user': return t('reports.targets.user');
        default: return t('reports.targets.other');
    }
};

export const ReportDetailScreen = () => {
    const { t, i18n } = useTranslation();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const route = useRoute<RouteProp<ParamList, 'ReportDetail'>>();
    const { reportId } = route.params;
    const insets = useSafeAreaInsets();

    const [reportData, setReportData] = useState<ReportEntity | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isDeleting, setIsDeleting] = useState(false);

    const fetchReportDetail = async () => {
        try {
            const response = await reportApi.getReportDetail(reportId);
            if (response.data) {
                setReportData(response.data);
            }
        } catch (error) {
            console.error('Failed to fetch report detail', error);
            Alert.alert(t('common.error'), t('reports.fetchError'));
            navigation.goBack();
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        if (reportId) {
            fetchReportDetail();
        }
    }, [reportId]);

    const handleCancel = () => {
        Alert.alert(
            t('reports.cancelConfirmTitle'),
            t('reports.cancelConfirmMsg'),
            [
                { text: t('common.no'), style: 'cancel' },
                {
                    text: t('reports.cancelBtn'),
                    style: 'destructive',
                    onPress: async () => {
                        setIsDeleting(true);
                        try {
                            await reportApi.deleteReport(reportId);
                            Alert.alert(t('common.success'), t('reports.cancelSuccess'));
                            navigation.goBack();
                        } catch (error) {
                            console.error('Failed to cancel report', error);
                            Alert.alert(t('common.error'), t('reports.cancelError'));
                        } finally {
                            setIsDeleting(false);
                        }
                    },
                },
            ]
        );
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={THEME.primary} />
            </View>
        );
    }

    if (!reportData) return null;

    const canCancelReport =
        reportData.is_active !== false &&
        !['resolved', 'rejected', 'cancelled'].includes(reportData.status);

    const getStatusInfo = (status: string) => {
        switch (status) {
            case 'pending': return { label: t('reports.statuses.pending'), color: THEME.warning, icon: 'time' };
            case 'reviewed': return { label: t('reports.statuses.reviewed'), color: THEME.info, icon: 'eye' };
            case 'resolved': return { label: t('reports.statuses.resolved'), color: THEME.success, icon: 'checkmark-circle' };
            case 'rejected': return { label: t('reports.statuses.rejected'), color: THEME.gray, icon: 'close-circle' };
            case 'cancelled': return { label: t('reports.statuses.cancelled'), color: THEME.gray, icon: 'ban' };
            default: return { label: t('reports.statuses.unknown'), color: THEME.gray, icon: 'help-circle' };
        }
    };

    const statusInfo = getStatusInfo(reportData.status);

    return (
        <ImageBackground
            source={require('../../../../../assets/images/profile-bg.jpg')}
            style={[styles.container, { paddingTop: insets.top }]}
            resizeMode="cover"
            fadeDuration={0}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color={THEME.textMain} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>{t('reports.detailTitle')}</Text>
                <View style={{ width: 40 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                <View style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}>
                    <View style={[styles.statusIcon, { backgroundColor: `${statusInfo.color}15` }]}>
                        <Ionicons name={statusInfo.icon as any} size={24} color={statusInfo.color} />
                    </View>
                    <View>
                        <Text style={styles.statusLabel}>{t('reports.statusLabel')}</Text>
                        <Text style={[styles.statusValue, { color: statusInfo.color }]}>
                            {statusInfo.label}
                        </Text>
                    </View>
                </View>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>{t('reports.requestInfo')}</Text>

                    <View style={styles.infoRow}>
                        <Ionicons name="information-circle-outline" size={20} color="#3B82F6" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t('reports.targetType')}</Text>
                            <Text style={styles.infoValue}>{getTargetTypeLabel(reportData.target_type, t)}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="warning-outline" size={20} color="#F59E0B" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t('reports.reason')}</Text>
                            <Text style={styles.infoValue}>{getReasonLabel(reportData.reason, t)}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="document-text-outline" size={20} color="#8B5CF6" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t('reports.description')}</Text>
                            <Text style={styles.infoValue}>{reportData.description || t('reports.noDescription')}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.infoRow}>
                        <Ionicons name="calendar-outline" size={20} color="#10B981" />
                        <View style={styles.infoContent}>
                            <Text style={styles.infoLabel}>{t('reports.timeLabel')}</Text>
                            <Text style={styles.infoValue}>
                                {dayjs(reportData.created_at).locale(i18n.language).format('HH:mm - DD/MM/YYYY')}
                            </Text>
                        </View>
                    </View>
                </View>

                {canCancelReport && (
                    <TouchableOpacity 
                        style={styles.deleteButton} 
                        onPress={handleCancel}
                        disabled={isDeleting}
                    >
                        {isDeleting ? (
                            <ActivityIndicator color={THEME.danger} />
                        ) : (
                            <>
                                <Ionicons name="close-circle-outline" size={20} color={THEME.danger} />
                                <Text style={styles.deleteButtonText}>{t('reports.cancelBtn')}</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}
            </ScrollView>
        </ImageBackground>
    );
};

const styles = RNStyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
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
        marginBottom: 4,
    },
    infoValue: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: THEME.textMain,
        fontWeight: TYPOGRAPHY.fontWeight.medium,
        lineHeight: 22,
    },
    divider: {
        height: 1,
        backgroundColor: THEME.border,
        marginVertical: SPACING.md,
        marginLeft: 36,
    },
    deleteButton: {
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
    deleteButtonText: {
        color: THEME.danger,
        fontWeight: TYPOGRAPHY.fontWeight.bold,
        fontSize: TYPOGRAPHY.fontSize.md,
    },
});

export default ReportDetailScreen;
