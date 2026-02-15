
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_BORDER_RADIUS, GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { ShiftSubmission } from '../../../../types/guide/shiftSubmission.types';

interface MyShiftCardProps {
    submission: ShiftSubmission;
    onCancel: (id: string) => void;
    onPress?: (submission: ShiftSubmission) => void;
}

const getStatusConfig = (status: string) => {
    switch (status) {
        case 'pending':
            return {
                color: '#E67E22', // Orange
                bg: '#FEF3C7',
                label: 'Chờ duyệt',
                icon: 'access-time' as const
            };
        case 'approved':
            return {
                color: '#27AE60', // Green
                bg: '#D1FAE5',
                label: 'Đã duyệt',
                icon: 'check-circle' as const
            };
        case 'rejected':
            return {
                color: '#E74C3C', // Red
                bg: '#FEE2E2',
                label: 'Từ chối',
                icon: 'cancel' as const
            };
        case 'completed':
            return {
                color: '#2980B9', // Blue
                bg: '#D6EAF8',
                label: 'Hoàn thành',
                icon: 'task-alt' as const
            };
        default:
            return {
                color: GUIDE_COLORS.textMuted,
                bg: GUIDE_COLORS.gray100,
                label: status,
                icon: 'info' as const
            };
    }
};

const getDayLabel = (day: number) => {
    const map = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    return map[day] || `T${day}`;
};

export const MyShiftCard: React.FC<MyShiftCardProps> = ({ submission, onCancel, onPress }) => {
    const statusConfig = getStatusConfig(submission.status);
    const canCancel = submission.status === 'pending';

    // Format Week Date
    const weekStart = new Date(submission.week_start_date);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const weekString = `Tuần ${weekStart.getDate()}/${weekStart.getMonth() + 1} - ${weekEnd.getDate()}/${weekEnd.getMonth() + 1}/${weekStart.getFullYear()}`;

    // Calculate actual date for each shift (helper)
    const getShiftDateStr = (dayOfWeek: number) => {
        const d = new Date(weekStart);
        const currentDay = d.getDay(); // 0-6
        let diff = dayOfWeek - currentDay;
        if (diff < 0) diff += 7; // Adjust if week wrapping or standard differences
        // Note: This logic assumes week_start_date is accurate to the start of the week logic used by day_of_week

        d.setDate(d.getDate() + diff);
        return `${d.getDate()}/${d.getMonth() + 1}`;
    };

    return (
        <TouchableOpacity
            style={styles.container}
            activeOpacity={0.7}
            onPress={() => onPress && onPress(submission)}
        >
            <View style={[styles.leftStrip, { backgroundColor: statusConfig.color }]} />

            <View style={styles.content}>
                {/* Header: Code + Status */}
                <View style={styles.header}>
                    <Text style={styles.codeText}>
                        📋 {submission.code || submission.id.substring(0, 8).toUpperCase()}
                    </Text>
                    <View style={[styles.statusBadge, { backgroundColor: statusConfig.bg }]}>
                        <MaterialIcons name={statusConfig.icon} size={12} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                            {statusConfig.label}
                        </Text>
                    </View>
                </View>

                {/* Week Info */}
                <Text style={styles.weekText}>{weekString}</Text>

                <View style={styles.divider} />

                {/* Shifts List */}
                <View style={styles.shiftsContainer}>
                    {submission.shifts && submission.shifts.length > 0 ? (
                        submission.shifts.map((shift, index) => (
                            <View key={index} style={styles.shiftRow}>
                                <Text style={styles.bullet}>•</Text>
                                <Text style={styles.shiftText}>
                                    <Text style={styles.boldText}>{getDayLabel(shift.day_of_week)}</Text>
                                    {` (${getShiftDateStr(shift.day_of_week)}): `}
                                    {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                                </Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.noShiftText}>Không có thông tin ca</Text>
                    )}

                    <Text style={styles.totalText}>
                        Tổng: {submission.shifts?.length || 0} ca
                    </Text>
                </View>

                {/* Actions */}
                {canCancel && (
                    <View style={styles.footer}>
                        <TouchableOpacity
                            style={styles.cancelButton}
                            onPress={() => onCancel(submission.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={styles.cancelText}>Hủy yêu cầu</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </View>
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        backgroundColor: GUIDE_COLORS.surface,
        borderRadius: GUIDE_BORDER_RADIUS.lg,
        marginBottom: GUIDE_SPACING.md,
        ...GUIDE_SHADOWS.sm,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
        overflow: 'hidden',
    },
    leftStrip: {
        width: 6,
        height: '100%',
    },
    content: {
        flex: 1,
        padding: GUIDE_SPACING.md,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    codeText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    statusText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        fontWeight: '700',
    },
    weekText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        marginBottom: 8,
    },
    divider: {
        height: 1,
        backgroundColor: GUIDE_COLORS.borderLight,
        marginBottom: 8,
    },
    shiftsContainer: {
        gap: 4,
    },
    shiftRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        gap: 6,
    },
    bullet: {
        color: GUIDE_COLORS.textSecondary,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    },
    shiftText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textPrimary,
        flex: 1,
    },
    boldText: {
        fontWeight: 'bold',
        color: GUIDE_COLORS.textDark,
    },
    noShiftText: {
        fontStyle: 'italic',
        color: GUIDE_COLORS.textMuted,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    },
    totalText: {
        marginTop: 4,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        fontWeight: '600',
        color: GUIDE_COLORS.textSecondary,
        textAlign: 'right',
    },
    footer: {
        marginTop: GUIDE_SPACING.md,
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.borderLight,
        paddingTop: GUIDE_SPACING.sm,
    },
    cancelButton: {
        paddingVertical: 6,
        paddingHorizontal: 12,
        backgroundColor: '#FEE2E2',
        borderRadius: 8,
    },
    cancelText: {
        color: GUIDE_COLORS.error,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        fontWeight: '600',
    },
});
