
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_BORDER_RADIUS, GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { Shift, ShiftSubmission } from '../../../../types/guide/shiftSubmission.types';

interface ShiftSubmissionDetailModalProps {
    visible: boolean;
    submission: ShiftSubmission | null;
    onClose: () => void;
    onCancel: (id: string) => void;
}

export const ShiftSubmissionDetailModal: React.FC<ShiftSubmissionDetailModalProps> = ({
    visible,
    submission,
    onClose,
    onCancel
}) => {
    if (!submission) return null;

    const canCancel = submission.status === 'pending';

    const getStatusColor = (status: string) => {
        switch (status) {
            case 'pending': return '#E67E22';
            case 'approved': return '#27AE60';
            case 'rejected': return '#E74C3C';
            case 'completed': return '#2980B9';
            default: return GUIDE_COLORS.textSecondary;
        }
    };

    const getStatusLabel = (status: string) => {
        switch (status) {
            case 'pending': return 'Chờ duyệt';
            case 'approved': return 'Đã duyệt';
            case 'rejected': return 'Từ chối';
            case 'completed': return 'Hoàn thành';
            default: return status;
        }
    };

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('vi-VN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getDayName = (day: number) => {
        const map = ['CN', 'Thứ 2', 'Thứ 3', 'Thứ 4', 'Thứ 5', 'Thứ 6', 'Thứ 7'];
        return map[day] || `Thứ ${day}`;
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.modalOverlay}>
                <TouchableOpacity style={styles.outsideTouch} onPress={onClose} />
                <View style={styles.modalContent}>
                    <View style={styles.dragIndicator} />

                    <View style={styles.header}>
                        <Text style={styles.title}>Chi tiết đăng ký</Text>
                        <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                            <MaterialIcons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                        {/* Status Section */}
                        <View style={styles.statusSection}>
                            <View style={[styles.statusIconBg, { backgroundColor: getStatusColor(submission.status) + '15' }]}>
                                <MaterialIcons
                                    name={
                                        submission.status === 'approved' ? 'check-circle' :
                                            submission.status === 'rejected' ? 'cancel' :
                                                submission.status === 'completed' ? 'task-alt' : 'access-time'
                                    }
                                    size={32}
                                    color={getStatusColor(submission.status)}
                                />
                            </View>
                            <Text style={[styles.statusLabel, { color: getStatusColor(submission.status) }]}>
                                {getStatusLabel(submission.status)}
                            </Text>
                            <Text style={styles.submissionDate}>
                                Đăng ký ngày {formatDate(submission.created_at)}
                            </Text>
                        </View>

                        {/* Shifts List Card */}
                        <View style={styles.card}>
                            <Text style={styles.cardTitle}>Danh sách ca làm việc</Text>
                            <Text style={styles.weekInfo}>
                                Tuần bắt đầu: {submission.week_start_date}
                            </Text>

                            <View style={styles.divider} />

                            {submission.shifts && submission.shifts.length > 0 ? (
                                submission.shifts.map((shift: Shift, index: number) => (
                                    <View key={index} style={styles.shiftItem}>
                                        <View style={styles.iconContainer}>
                                            <MaterialIcons name="schedule" size={20} color={GUIDE_COLORS.primary} />
                                        </View>
                                        <View style={styles.shiftDetails}>
                                            <Text style={styles.shiftDay}>{getDayName(shift.day_of_week)}</Text>
                                            <Text style={styles.shiftTime}>
                                                {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                            </Text>
                                        </View>
                                    </View>
                                ))
                            ) : (
                                <Text style={styles.emptyText}>Không có ca làm việc nào.</Text>
                            )}
                        </View>

                        {/* Additional Info Card */}
                        {(submission.change_reason || submission.rejection_reason || submission.approved_by) && (
                            <View style={styles.card}>
                                <Text style={styles.cardTitle}>Chi tiết xét duyệt</Text>
                                {submission.approved_by && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Người duyệt:</Text>
                                        <Text style={styles.detailValue}>{submission.approved_by}</Text>
                                    </View>
                                )}
                                {submission.approved_at && (
                                    <View style={styles.detailRow}>
                                        <Text style={styles.detailLabel}>Thời gian:</Text>
                                        <Text style={styles.detailValue}>{formatDate(submission.approved_at)}</Text>
                                    </View>
                                )}
                                {submission.change_reason && (
                                    <View style={styles.noteBox}>
                                        <Text style={styles.noteTitle}>Ghi chú thay đổi:</Text>
                                        <Text style={styles.noteContent}>{submission.change_reason}</Text>
                                    </View>
                                )}
                                {submission.rejection_reason && (
                                    <View style={[styles.noteBox, styles.errorBox]}>
                                        <Text style={[styles.noteTitle, { color: GUIDE_COLORS.error }]}>Lý do từ chối:</Text>
                                        <Text style={styles.noteContent}>{submission.rejection_reason}</Text>
                                    </View>
                                )}
                            </View>
                        )}

                        <View style={styles.metaInfo}>
                            <Text style={styles.metaText}>Mã đăng ký: {submission.code || submission.id.substring(0, 8)}</Text>
                        </View>
                    </ScrollView>

                    {/* Footer Actions */}
                    {canCancel && (
                        <View style={styles.footer}>
                            <TouchableOpacity
                                style={styles.cancelButton}
                                onPress={() => {
                                    onCancel(submission.id);
                                    onClose();
                                }}
                                activeOpacity={0.8}
                            >
                                <Text style={styles.cancelButtonText}>Hủy đăng ký</Text>
                            </TouchableOpacity>
                        </View>
                    )}
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'flex-end',
    },
    outsideTouch: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: GUIDE_COLORS.background,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        maxHeight: '85%',
        minHeight: '50%',
        paddingBottom: 20,
        ...GUIDE_SHADOWS.xl,
    },
    dragIndicator: {
        width: 40,
        height: 5,
        backgroundColor: GUIDE_COLORS.gray300,
        borderRadius: 3,
        alignSelf: 'center',
        marginTop: 12,
        marginBottom: 8,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.borderLight,
    },
    title: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    closeButton: {
        padding: 8,
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 20,
    },
    scrollContent: {
        padding: GUIDE_SPACING.lg,
        paddingBottom: 40,
    },
    statusSection: {
        alignItems: 'center',
        marginBottom: GUIDE_SPACING.xl,
    },
    statusIconBg: {
        width: 64,
        height: 64,
        borderRadius: 32,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: GUIDE_SPACING.sm,
    },
    statusLabel: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
        fontWeight: 'bold',
        textTransform: 'uppercase',
        marginBottom: 4,
    },
    submissionDate: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
    },
    card: {
        backgroundColor: GUIDE_COLORS.surface,
        borderRadius: GUIDE_BORDER_RADIUS.lg,
        padding: GUIDE_SPACING.lg,
        marginBottom: GUIDE_SPACING.lg,
        ...GUIDE_SHADOWS.sm,
    },
    cardTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        marginBottom: 4,
    },
    weekInfo: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        marginBottom: GUIDE_SPACING.md,
    },
    divider: {
        height: 1,
        backgroundColor: GUIDE_COLORS.gray100,
        marginBottom: GUIDE_SPACING.md,
    },
    shiftItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
        padding: 8,
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 8,
    },
    iconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: GUIDE_COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    shiftDetails: {
        flex: 1,
    },
    shiftDay: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
    },
    shiftTime: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        color: GUIDE_COLORS.textSecondary,
    },
    emptyText: {
        fontStyle: 'italic',
        color: GUIDE_COLORS.textMuted,
        textAlign: 'center',
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
    },
    detailValue: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textPrimary,
        fontWeight: '500',
    },
    noteBox: {
        backgroundColor: GUIDE_COLORS.gray100,
        padding: GUIDE_SPACING.md,
        borderRadius: 8,
        marginTop: 8,
    },
    errorBox: {
        backgroundColor: '#FEE2E2',
    },
    noteTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        fontWeight: '700',
        marginBottom: 4,
        color: GUIDE_COLORS.textSecondary,
    },
    noteContent: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textPrimary,
        lineHeight: 20,
    },
    metaInfo: {
        alignItems: 'center',
        marginTop: GUIDE_SPACING.sm,
    },
    metaText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        color: GUIDE_COLORS.textMuted,
    },
    footer: {
        padding: GUIDE_SPACING.lg,
        paddingTop: GUIDE_SPACING.md,
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.borderLight,
        backgroundColor: GUIDE_COLORS.surface,
    },
    cancelButton: {
        backgroundColor: '#FEE2E2',
        paddingVertical: 14,
        borderRadius: GUIDE_BORDER_RADIUS.lg,
        alignItems: 'center',
    },
    cancelButtonText: {
        color: GUIDE_COLORS.error,
        fontWeight: 'bold',
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    },
});
