
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import Toast from 'react-native-toast-message';
import { GUIDE_BORDER_RADIUS, GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import { createShiftSubmission, getShiftSubmissions } from '../../../../services/api/guide';
import { CreateShiftRequest } from '../../../../types/guide/shiftSubmission.types';

interface ShiftRegistrationModalProps {
    visible: boolean;
    onClose: () => void;
    weekStartDate: string; // YYYY-MM-DD
}

const DAYS = [
    { value: 1, label: 'Thứ 2' },
    { value: 2, label: 'Thứ 3' },
    { value: 3, label: 'Thứ 4' },
    { value: 4, label: 'Thứ 5' },
    { value: 5, label: 'Thứ 6' },
    { value: 6, label: 'Thứ 7' },
    { value: 0, label: 'Chủ Nhật' },
];

export const ShiftRegistrationModal: React.FC<ShiftRegistrationModalProps> = ({
    visible,
    onClose,
    weekStartDate: initialWeekStart
}) => {
    const queryClient = useQueryClient();
    const [shifts, setShifts] = useState<CreateShiftRequest[]>([]);
    const [weekStart, setWeekStart] = useState(new Date(initialWeekStart));
    const [showDayPicker, setShowDayPicker] = useState(false);

    // Time picker state - transient, for the currently editing shift
    const [editingShiftIndex, setEditingShiftIndex] = useState<number | null>(null);
    const [editingTimeType, setEditingTimeType] = useState<'start' | 'end' | null>(null);
    const [tempTime, setTempTime] = useState(new Date());

    // Reason for change state
    const [changeReason, setChangeReason] = useState('');
    const [showReasonInput, setShowReasonInput] = useState(false);

    // Fetch existing submissions to check for updates
    const weekStartStr = weekStart.toISOString().split('T')[0];
    const { data: existingSubmissionsResponse } = useQuery({
        queryKey: GUIDE_KEYS.shiftSubmissions.list({ week_start_date: weekStartStr }),
        queryFn: () => getShiftSubmissions({ week_start_date: weekStartStr }),
        enabled: visible,
    });

    const approvedSubmission = useMemo(() => {
        return existingSubmissionsResponse?.data?.find(s => s.status === 'approved');
    }, [existingSubmissionsResponse]);

    const isUpdateMode = !!approvedSubmission;

    const createMutation = useMutation({
        mutationFn: (data: {
            week_start_date: string,
            shifts: CreateShiftRequest[],
            previous_submission_id?: string,
            change_reason?: string
        }) => createShiftSubmission(data),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: isUpdateMode ? 'Đã gửi yêu cầu thay đổi lịch!' : 'Đã gửi đăng ký lịch tuần!'
            });
            onClose();
            setShifts([]);
            setChangeReason('');
            setShowReasonInput(false);
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.shiftSubmissions.all });
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.activeShift(initialWeekStart) });
        },
        onError: (error: any) => {
            Toast.show({
                type: 'error',
                text1: 'Lỗi',
                text2: error?.message || 'Không thể gửi đăng ký.'
            });
        }
    });

    // Helper: Format Date string for display
    const getFormattedDate = (dayOfWeek: number) => {
        const start = new Date(weekStart);
        let offset = dayOfWeek === 0 ? 6 : dayOfWeek - 1;
        const target = new Date(start);
        target.setDate(start.getDate() + offset);
        return `${target.getDate().toString().padStart(2, '0')}/${(target.getMonth() + 1).toString().padStart(2, '0')}`;
    };

    const formatTime = (timeStr: string) => {
        return timeStr.substring(0, 5);
    };

    // Group shifts by day
    const shiftsByDay = useMemo(() => {
        const grouped: { [key: number]: CreateShiftRequest[] } = {};
        shifts.forEach(s => {
            if (!grouped[s.day_of_week]) grouped[s.day_of_week] = [];
            grouped[s.day_of_week].push(s);
        });
        return grouped;
    }, [shifts]);

    const handleAddDay = (dayValue: number) => {
        const newShift: CreateShiftRequest = {
            day_of_week: dayValue,
            start_time: "08:00:00",
            end_time: "12:00:00"
        };
        setShifts([...shifts, newShift]);
        setShowDayPicker(false);
    };

    const handleAddShiftToDay = (dayValue: number) => {
        const newShift: CreateShiftRequest = {
            day_of_week: dayValue,
            start_time: "13:00:00", // Default afternoon
            end_time: "17:00:00"
        };
        setShifts([...shifts, newShift]);
    };

    const handleRemoveShift = (shiftToRemove: CreateShiftRequest) => {
        setShifts(shifts.filter(s => s !== shiftToRemove));
    };

    const handleTimeEdit = (shiftIndex: number, type: 'start' | 'end') => {
        const shift = shifts[shiftIndex];
        const timeStr = type === 'start' ? shift.start_time : shift.end_time;
        const [hours, minutes] = timeStr.split(':').map(Number);

        const date = new Date();
        date.setHours(hours, minutes, 0, 0);

        setTempTime(date);
        setEditingShiftIndex(shiftIndex);
        setEditingTimeType(type);
    };

    const onTimeChange = (event: any, selectedDate?: Date) => {
        if (Platform.OS === 'android') {
            setEditingTimeType(null);
        }

        if (selectedDate && editingShiftIndex !== null && editingTimeType) {
            const timeStr = selectedDate.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', hour12: false }) + ":00";

            const updatedShifts = [...shifts];
            const shift = { ...updatedShifts[editingShiftIndex] };

            if (editingTimeType === 'start') {
                shift.start_time = timeStr;
            } else {
                shift.end_time = timeStr;
            }

            const start = new Date(`2000-01-01T${shift.start_time}`);
            const end = new Date(`2000-01-01T${shift.end_time}`);

            if (end <= start) {
                if (Platform.OS === 'ios') setEditingTimeType(null);
                Toast.show({ type: 'error', text1: 'Lỗi thời gian', text2: 'Giờ kết thúc phải sau giờ bắt đầu' });
                return;
            }

            const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
            if (duration > 12) {
                if (Platform.OS === 'ios') setEditingTimeType(null);
                Toast.show({ type: 'error', text1: 'Lỗi thời gian', text2: 'Ca làm việc không được quá 12 tiếng' });
                return;
            }

            const isOverlap = updatedShifts.some((s, idx) => {
                if (idx === editingShiftIndex) return false;
                if (s.day_of_week !== shift.day_of_week) return false;
                return (shift.start_time < s.end_time && shift.end_time > s.start_time);
            });

            if (isOverlap) {
                if (Platform.OS === 'ios') setEditingTimeType(null);
                Toast.show({ type: 'error', text1: 'Lỗi trùng lặp', text2: 'Ca làm việc bị trùng với ca khác trong ngày' });
                return;
            }

            updatedShifts[editingShiftIndex] = shift;
            setShifts(updatedShifts);
        }

        if (Platform.OS === 'ios' && event.type !== 'set') {
            // Dismissed
        }
    };

    const totalHours = useMemo(() => {
        return shifts.reduce((acc, shift) => {
            const start = new Date(`2000-01-01T${shift.start_time}`);
            const end = new Date(`2000-01-01T${shift.end_time}`);
            return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        }, 0);
    }, [shifts]);

    const handleSubmit = () => {
        if (shifts.length === 0) {
            Toast.show({ type: 'info', text1: 'Thông báo', text2: 'Vui lòng thêm ít nhất 1 ca làm việc.' });
            return;
        }

        // Check if update mode and reason is provided
        if (isUpdateMode && !showReasonInput) {
            setShowReasonInput(true);
            return;
        }

        if (isUpdateMode && !changeReason.trim()) {
            Toast.show({ type: 'info', text1: 'Yêu cầu', text2: 'Vui lòng nhập lý do thay đổi lịch trực.' });
            return;
        }

        const dateStr = weekStart.toISOString().split('T')[0];
        const payload: any = {
            week_start_date: dateStr,
            shifts: shifts
        };

        if (isUpdateMode && approvedSubmission) {
            payload.previous_submission_id = approvedSubmission.id;
            payload.change_reason = changeReason;
        }

        Alert.alert(
            "Xác nhận",
            `Bạn có chắc chắn muốn ${isUpdateMode ? 'gửi yêu cầu thay đổi' : 'đăng ký'} ${shifts.length} ca (${totalHours.toFixed(1)} giờ) cho tuần này?`,
            [
                { text: "Hủy", style: "cancel" },
                {
                    text: isUpdateMode ? "Gửi thay đổi" : "Gửi yêu cầu",
                    onPress: () => createMutation.mutate(payload)
                }
            ]
        );
    };

    // Week navigation
    const changeWeek = (offset: number) => {
        const newDate = new Date(weekStart);
        newDate.setDate(newDate.getDate() + (offset * 7));
        setWeekStart(newDate);
        setShifts([]);
        setShowReasonInput(false);
        setChangeReason('');
    };

    const weekRangeText = useMemo(() => {
        const start = new Date(weekStart);
        const end = new Date(weekStart);
        end.setDate(end.getDate() + 6);
        return `Tuần ${start.getDate()}/${start.getMonth() + 1} - ${end.getDate()}/${end.getMonth() + 1}/${end.getFullYear()}`;
    }, [weekStart]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            onRequestClose={onClose}
            presentationStyle="pageSheet"
        >
            <KeyboardAvoidingView
                style={styles.container}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                {/* Header */}
                <View style={styles.header}>
                    <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                        <MaterialIcons name="close" size={24} color={GUIDE_COLORS.textPrimary} />
                    </TouchableOpacity>
                    <Text style={styles.title}>
                        {isUpdateMode ? "Điều chỉnh lịch làm việc" : "Đăng ký ca làm việc"}
                    </Text>
                    <View style={{ width: 40 }} />
                </View>

                {/* Week Selector */}
                <View style={styles.weekSelector}>
                    <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
                        <MaterialIcons name="chevron-left" size={28} color={GUIDE_COLORS.textSecondary} />
                    </TouchableOpacity>
                    <View style={styles.weekInfo}>
                        <MaterialIcons name="date-range" size={20} color={GUIDE_COLORS.primary} />
                        <Text style={styles.weekText}>{weekRangeText}</Text>
                    </View>
                    <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
                        <MaterialIcons name="chevron-right" size={28} color={GUIDE_COLORS.textSecondary} />
                    </TouchableOpacity>
                </View>

                {/* Warning for Update Mode */}
                {isUpdateMode && !showReasonInput && (
                    <View style={styles.updateWarning}>
                        <MaterialIcons name="info-outline" size={20} color="#B45309" />
                        <Text style={styles.updateWarningText}>
                            Bạn đã có lịch được duyệt cho tuần này. Bạn có thể điều chỉnh và gửi yêu cầu thay đổi mới.
                        </Text>
                    </View>
                )}

                {/* Main Content */}
                <ScrollView
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 200 }}
                    keyboardShouldPersistTaps="handled"
                >
                    {/* Render Shifts By Day */}
                    {Object.keys(shiftsByDay).length === 0 ? (
                        <View style={styles.emptyState}>
                            <Text style={styles.emptyText}>Chưa có ca làm việc nào.</Text>
                            <Text style={styles.emptySubText}>Bấm "Thêm ngày làm việc" để bắt đầu.</Text>
                        </View>
                    ) : (
                        Object.entries(shiftsByDay).sort((a, b) => Number(a[0]) - Number(b[0])).map(([dayStr, dayShifts]) => {
                            const dayVal = Number(dayStr);
                            const dayLabel = DAYS.find(d => d.value === dayVal)?.label;

                            return (
                                <View key={dayVal} style={styles.dayBlock}>
                                    <View style={styles.dayHeader}>
                                        <Text style={styles.dayTitle}>{dayLabel} ({getFormattedDate(dayVal)})</Text>
                                    </View>

                                    {dayShifts.map((shift, idx) => {
                                        const globalIndex = shifts.indexOf(shift);
                                        return (
                                            <View key={idx} style={styles.shiftRow}>
                                                <View style={styles.timeInputs}>
                                                    <TouchableOpacity
                                                        style={styles.timeBtn}
                                                        onPress={() => handleTimeEdit(globalIndex, 'start')}
                                                    >
                                                        <MaterialIcons name="access-time" size={16} color={GUIDE_COLORS.textSecondary} />
                                                        <Text style={styles.timeText}>{formatTime(shift.start_time)}</Text>
                                                    </TouchableOpacity>
                                                    <MaterialIcons name="arrow-forward" size={16} color={GUIDE_COLORS.gray400} />
                                                    <TouchableOpacity
                                                        style={styles.timeBtn}
                                                        onPress={() => handleTimeEdit(globalIndex, 'end')}
                                                    >
                                                        <MaterialIcons name="access-time" size={16} color={GUIDE_COLORS.textSecondary} />
                                                        <Text style={styles.timeText}>{formatTime(shift.end_time)}</Text>
                                                    </TouchableOpacity>
                                                </View>

                                                <TouchableOpacity
                                                    style={styles.deleteBtn}
                                                    onPress={() => handleRemoveShift(shift)}
                                                >
                                                    <MaterialIcons name="delete-outline" size={24} color={GUIDE_COLORS.error} />
                                                </TouchableOpacity>
                                            </View>
                                        );
                                    })}

                                    <TouchableOpacity
                                        style={styles.addShiftBtn}
                                        onPress={() => handleAddShiftToDay(dayVal)}
                                    >
                                        <Text style={styles.addShiftText}>+ Thêm ca khác trong ngày</Text>
                                    </TouchableOpacity>
                                </View>
                            );
                        })
                    )}

                    {/* Add Day Button */}
                    <TouchableOpacity
                        style={styles.addDayButton}
                        onPress={() => setShowDayPicker(true)}
                    >
                        <MaterialIcons name="add-circle-outline" size={24} color={GUIDE_COLORS.primary} />
                        <Text style={styles.addDayText}>THÊM NGÀY LÀM VIỆC</Text>
                    </TouchableOpacity>

                    {/* Reason Input (Visible only when in Update Mode and submitting) */}
                    {showReasonInput && (
                        <View style={styles.reasonContainer}>
                            <Text style={styles.reasonLabel}>Lý do thay đổi lịch (*)</Text>
                            <TextInput
                                style={styles.reasonInput}
                                placeholder="VD: Tôi có việc đột xuất vào chiều thứ 4..."
                                multiline
                                numberOfLines={3}
                                value={changeReason}
                                onChangeText={setChangeReason}
                                autoFocus
                            />
                        </View>
                    )}

                </ScrollView>

                {/* Footer */}
                <View style={styles.footer}>
                    <View style={styles.summaryContainer}>
                        <Text style={styles.summaryText}>
                            Tổng cộng: <Text style={styles.summaryBold}>{shifts.length} ca</Text> ({totalHours.toFixed(1)} giờ)
                        </Text>
                    </View>
                    <TouchableOpacity
                        style={[styles.submitButton, shifts.length === 0 && styles.submitButtonDisabled]}
                        onPress={handleSubmit}
                        disabled={shifts.length === 0 || createMutation.isPending}
                    >
                        {createMutation.isPending ? (
                            <ActivityIndicator color="#fff" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isUpdateMode ? (showReasonInput ? "XÁC NHẬN THAY ĐỔI" : "TIẾP TỤC") : "GỬI YÊU CẦU DUYỆT"}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>

                {/* Day Picker Modal (Simple Overlay) */}
                <Modal visible={showDayPicker} transparent animationType="fade" onRequestClose={() => setShowDayPicker(false)}>
                    <View style={styles.modalOverlay}>
                        <View style={styles.pickerContainer}>
                            <Text style={styles.pickerTitle}>Chọn ngày làm việc</Text>
                            <View style={styles.pickerGrid}>
                                {DAYS.map((day) => (
                                    <TouchableOpacity
                                        key={day.value}
                                        style={styles.pickerItem}
                                        onPress={() => handleAddDay(day.value)}
                                    >
                                        <Text style={styles.pickerItemText}>{day.label}</Text>
                                    </TouchableOpacity>
                                ))}
                            </View>
                            <TouchableOpacity style={styles.pickerClose} onPress={() => setShowDayPicker(false)}>
                                <Text style={styles.pickerCloseText}>Đóng</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </Modal>

                {/* Date Time Picker */}
                {editingTimeType && (
                    <DateTimePicker
                        value={tempTime}
                        mode="time"
                        is24Hour={true}
                        display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                        onChange={onTimeChange}
                    />
                )}

                {/* iOS Picker Bar */}
                {Platform.OS === 'ios' && editingTimeType && (
                    <View style={styles.iosPickerToolbar}>
                        <TouchableOpacity style={styles.iosPickerDone} onPress={() => setEditingTimeType(null)}>
                            <Text style={styles.iosPickerDoneText}>Xong</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </KeyboardAvoidingView>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GUIDE_COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: GUIDE_SPACING.lg,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.borderLight,
        backgroundColor: GUIDE_COLORS.surface,
    },
    closeBtn: { padding: 4 },
    title: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    weekSelector: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: GUIDE_SPACING.md,
        backgroundColor: GUIDE_COLORS.surface,
        marginBottom: GUIDE_SPACING.sm,
        ...GUIDE_SHADOWS.sm,
    },
    navButton: { padding: 8 },
    weekInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: GUIDE_SPACING.md,
    },
    weekText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    updateWarning: {
        flexDirection: 'row',
        backgroundColor: '#FFFBEB',
        padding: GUIDE_SPACING.md,
        marginHorizontal: GUIDE_SPACING.md,
        borderRadius: 8,
        gap: 8,
        marginBottom: 8,
        borderWidth: 1,
        borderColor: '#FEF3C7'
    },
    updateWarningText: {
        flex: 1,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        color: '#92400E',
        lineHeight: 18,
    },
    content: {
        flex: 1,
        paddingHorizontal: GUIDE_SPACING.lg,
    },
    emptyState: {
        alignItems: 'center',
        marginTop: 40,
        opacity: 0.6,
    },
    emptyText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textSecondary,
    },
    emptySubText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        marginTop: 4,
    },
    dayBlock: {
        marginBottom: GUIDE_SPACING.xl,
        backgroundColor: GUIDE_COLORS.surface,
        borderRadius: GUIDE_BORDER_RADIUS.md,
        padding: GUIDE_SPACING.md,
        ...GUIDE_SHADOWS.sm,
    },
    dayHeader: {
        marginBottom: GUIDE_SPACING.md,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.borderLight,
        paddingBottom: 8,
    },
    dayTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    shiftRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
        backgroundColor: GUIDE_COLORS.background,
        padding: 8,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
    },
    timeInputs: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    timeBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: GUIDE_COLORS.gray100,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 6,
    },
    timeText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    deleteBtn: {
        padding: 8,
    },
    addShiftBtn: {
        marginTop: 8,
        alignItems: 'center',
        paddingVertical: 8,
    },
    addShiftText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.primary,
        fontWeight: '600',
    },
    addDayButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.primary,
        borderStyle: 'dashed',
        borderRadius: GUIDE_BORDER_RADIUS.md,
        marginBottom: 20,
        gap: 8,
    },
    addDayText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.primary,
        textTransform: 'uppercase',
    },
    reasonContainer: {
        marginBottom: 20,
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.md,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.primary,
    },
    reasonLabel: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
        marginBottom: 8,
    },
    reasonInput: {
        backgroundColor: GUIDE_COLORS.gray100,
        padding: 12,
        borderRadius: 8,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    footer: {
        padding: GUIDE_SPACING.lg,
        backgroundColor: GUIDE_COLORS.surface,
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.borderLight,
        ...GUIDE_SHADOWS.md,
    },
    summaryContainer: {
        marginBottom: GUIDE_SPACING.md,
        alignItems: 'center',
    },
    summaryText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        color: GUIDE_COLORS.textSecondary,
    },
    summaryBold: {
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    submitButton: {
        backgroundColor: GUIDE_COLORS.primary,
        paddingVertical: 16,
        borderRadius: GUIDE_BORDER_RADIUS.lg,
        alignItems: 'center',
    },
    submitButtonDisabled: {
        backgroundColor: GUIDE_COLORS.gray300,
    },
    submitButtonText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textDark,
        textTransform: 'uppercase',
    },
    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20,
    },
    pickerContainer: {
        backgroundColor: GUIDE_COLORS.surface,
        borderRadius: 16,
        padding: 20,
    },
    pickerTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
        fontWeight: 'bold',
        marginBottom: 20,
        textAlign: 'center',
    },
    pickerGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        justifyContent: 'center',
    },
    pickerItem: {
        width: '30%',
        paddingVertical: 12,
        borderRadius: 8,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
    },
    pickerItemText: {
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    pickerClose: {
        marginTop: 20,
        alignItems: 'center',
    },
    pickerCloseText: {
        color: GUIDE_COLORS.textSecondary,
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    },
    // iOS Toolbar
    iosPickerToolbar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: '#f0f0f0',
        padding: 10,
        alignItems: 'flex-end',
        borderTopWidth: 1,
        borderTopColor: '#ccc'
    },
    iosPickerDone: {
        paddingHorizontal: 15,
        paddingVertical: 5
    },
    iosPickerDoneText: {
        color: '#007AFF',
        fontWeight: 'bold',
        fontSize: 16
    }
});
