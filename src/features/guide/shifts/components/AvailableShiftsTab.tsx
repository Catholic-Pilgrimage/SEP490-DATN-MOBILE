
import { MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useQuery } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import { dashboardApi, getShiftSubmissions } from '../../../../services/api/guide';
import { SiteScheduleShift } from '../../../../types/guide/dashboard-home.types';
import { formatDateToISO, getWeekStartDate } from '../../../../utils/dateUtils';
import { ShiftRegistrationModal } from './ShiftRegistrationModal';

export const AvailableShiftsTab: React.FC = () => {
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isRegisterModalVisible, setRegisterModalVisible] = useState(false);

    // Calculate week start based on the currently selected date
    // weekStart is already YYYY-MM-DD
    const weekStart = useMemo(() => getWeekStartDate(selectedDate), [selectedDate]);

    // Query 1: Site Schedule (Everyone)
    const { data: scheduleResponse, isLoading, refetch: refetchSchedule, isRefetching: isRefetchingSchedule } = useQuery({
        queryKey: GUIDE_KEYS.dashboard.activeShift(weekStart),
        queryFn: () => dashboardApi.getSiteSchedule(weekStart),
        refetchInterval: 10000,
    });

    // Query 2: My Approved Submissions (Backup to ensure my shifts are visible)
    const { data: mySubmissionsResponse, refetch: refetchSubmissions, isRefetching: isRefetchingSubmissions } = useQuery({
        queryKey: GUIDE_KEYS.shiftSubmissions.list({ week_start_date: weekStart }),
        queryFn: () => getShiftSubmissions({ week_start_date: weekStart }),
        refetchInterval: 10000,
    });

    const isRefetching = isRefetchingSchedule || isRefetchingSubmissions;

    const refetchAll = () => {
        refetchSchedule();
        refetchSubmissions();
    };

    useFocusEffect(
        useCallback(() => {
            refetchAll();
        }, [refetchSchedule, refetchSubmissions])
    );

    // Helper to change week
    const changeWeek = (offset: number) => {
        const newDate = new Date(selectedDate);
        newDate.setDate(newDate.getDate() + (offset * 7));
        setSelectedDate(newDate);
    };

    // Generate days of the week
    const weekDays = useMemo(() => {
        const start = new Date(weekStart);
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(start);
            d.setDate(start.getDate() + i);
            days.push(d);
        }
        return days;
    }, [weekStart]);

    // Format week range for header
    const weekRangeText = useMemo(() => {
        if (weekDays.length === 0) return '';
        const start = weekDays[0];
        const end = weekDays[6];
        return `Tháng ${start.getMonth() + 1}, ${start.getFullYear()}`;
    }, [weekDays]);

    const getDayNameShort = (date: Date) => {
        const days = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
        return days[date.getDay()];
    };

    const isSameDay = (d1: Date, d2: Date) => {
        return d1.getFullYear() === d2.getFullYear() &&
            d1.getMonth() === d2.getMonth() &&
            d1.getDate() === d2.getDate();
    };

    // MERGE LOGIC: Combine Site Schedule with My Approved Shifts
    const allShifts = useMemo(() => {
        const selectedDateKey = formatDateToISO(selectedDate);
        // Start with server schedule
        const serverShifts = scheduleResponse?.data?.schedule?.[selectedDateKey] || [];
        const combined = [...serverShifts];

        // Find my APPROVED submission for this week
        const myApprovedSubmission = mySubmissionsResponse?.data?.find(
            s => s.status === 'approved' && s.week_start_date === weekStart
        );

        if (myApprovedSubmission && myApprovedSubmission.shifts) {
            // Filter shifts for the CURRENT selected day (0-6)
            const currentDayOfWeek = selectedDate.getDay();
            const myDailyShifts = myApprovedSubmission.shifts.filter(s => s.day_of_week === currentDayOfWeek);

            myDailyShifts.forEach(myShift => {
                // Check if this shift is ALREADY in the server list (avoid duplicates)
                // We match by start time (roughly) and ownership
                const alreadyExists = combined.some(existing =>
                    existing.is_mine &&
                    existing.start_time.substring(0, 5) === myShift.start_time.substring(0, 5)
                );

                if (!alreadyExists) {
                    // Start time formatting
                    combined.push({
                        id: myShift.id,
                        start_time: myShift.start_time,
                        end_time: myShift.end_time,
                        guide_name: "Bạn", // Fallback name
                        is_mine: true,
                        status: "active",
                        guide_avatar: undefined // Optional
                    });
                }
            });
        }

        // Sort by start time
        return combined.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [selectedDate, scheduleResponse, mySubmissionsResponse, weekStart]);

    const renderShiftItem = (shift: SiteScheduleShift, index: number) => {
        const isMine = shift.is_mine;
        return (
            <View key={`${shift.id}-${index}`} style={[styles.shiftCard, isMine ? styles.myShiftCard : styles.otherShiftCard]}>
                <View style={styles.shiftTimeContainer}>
                    <View style={[styles.timeDot, isMine ? { backgroundColor: '#B45309' } : { backgroundColor: GUIDE_COLORS.textSecondary }]} />
                    <Text style={[styles.shiftTimeText, isMine && styles.myShiftText]}>
                        {shift.start_time.substring(0, 5)} - {shift.end_time.substring(0, 5)}
                    </Text>
                </View>
                <View style={styles.dividerVertical} />
                <View style={styles.guideInfo}>
                    <Text style={[styles.guideName, isMine && styles.myShiftText]}>
                        {isMine ? 'Bạn' : shift.guide_name}
                    </Text>
                    <View style={[styles.roleTag, isMine && styles.myRoleTag]}>
                        <Text style={[styles.roleTagText, isMine && styles.myRoleTagText]}>
                            {isMine ? 'Guide (Bạn)' : 'Guide'}
                        </Text>
                    </View>
                </View>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Header with Month/Year and Week Nav */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => changeWeek(-1)} style={styles.navButton}>
                    <MaterialIcons name="chevron-left" size={28} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.weekTitle}>{weekRangeText}</Text>
                <TouchableOpacity onPress={() => changeWeek(1)} style={styles.navButton}>
                    <MaterialIcons name="chevron-right" size={28} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Horizontal Day Strip */}
            <View style={styles.dateStripContainer}>
                {weekDays.map((date, index) => {
                    const isSelected = isSameDay(date, selectedDate);
                    const isToday = isSameDay(date, new Date());

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dateStripItem,
                                isSelected && styles.dateStripItemActive,
                                isToday && !isSelected && styles.dateStripItemToday
                            ]}
                            onPress={() => setSelectedDate(date)}
                        >
                            <Text style={[styles.dateStripDay, isSelected && styles.dateStripTextActive]}>
                                {getDayNameShort(date)}
                            </Text>
                            <View style={[styles.dateNumberContainer, isSelected && styles.dateNumberContainerActive]}>
                                <Text style={[styles.dateStripDate, isSelected && styles.dateStripTextActive]}>
                                    {date.getDate()}
                                </Text>
                            </View>
                            {isToday && <View style={styles.todayIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {isLoading ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
                </View>
            ) : (
                <ScrollView
                    style={styles.scrollContainer}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={isRefetching} onRefresh={refetchAll} colors={[GUIDE_COLORS.primary]} />
                    }
                >
                    <Text style={styles.sectionTitle}>
                        Lịch trực ngày {selectedDate.getDate()}/{selectedDate.getMonth() + 1}
                    </Text>

                    {allShifts.length > 0 ? (
                        allShifts.map((shift, idx) => renderShiftItem(shift, idx))
                    ) : (
                        <View style={styles.emptyState}>
                            <View style={styles.emptyIconBg}>
                                <MaterialIcons name="event-busy" size={40} color={GUIDE_COLORS.textNote} />
                            </View>
                            <Text style={styles.emptyText}>Chưa có lịch trực nào trong ngày này</Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                onPress={() => setRegisterModalVisible(true)}
                activeOpacity={0.9}
            >
                <MaterialIcons name="add" size={24} color={GUIDE_COLORS.textDark} />
                <Text style={styles.fabText}>Đăng ký ca tuần</Text>
            </TouchableOpacity>

            <ShiftRegistrationModal
                visible={isRegisterModalVisible}
                onClose={() => setRegisterModalVisible(false)}
                weekStartDate={weekStart}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA', // Lighter background
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: GUIDE_SPACING.md,
        paddingVertical: 12,
        backgroundColor: GUIDE_COLORS.surface,
    },
    navButton: {
        padding: 4,
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 8,
    },
    weekTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    // Date Strip
    dateStripContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        backgroundColor: GUIDE_COLORS.surface,
        paddingBottom: 16,
        paddingTop: 4,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        ...GUIDE_SHADOWS.sm,
        zIndex: 1,
    },
    dateStripItem: {
        alignItems: 'center',
        paddingVertical: 6,
        width: 44,
        borderRadius: 22,
    },
    dateStripItemActive: {
        // backgroundColor: GUIDE_COLORS.primary, // Using primary color for selection
    },
    dateStripItemToday: {
        backgroundColor: GUIDE_COLORS.gray100,
    },
    dateStripDay: {
        fontSize: 12,
        color: GUIDE_COLORS.textSecondary,
        marginBottom: 4,
        fontWeight: '600',
    },
    dateNumberContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'transparent',
    },
    dateNumberContainerActive: {
        backgroundColor: GUIDE_COLORS.primary,
        ...GUIDE_SHADOWS.sm,
    },
    dateStripDate: {
        fontSize: 14,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
    },
    dateStripTextActive: {
        color: GUIDE_COLORS.textDark, // Contrast text for active state
    },
    todayIndicator: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: GUIDE_COLORS.primary,
        marginTop: 4,
    },
    // Content
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    scrollContainer: {
        flex: 1,
        marginTop: 12,
    },
    scrollContent: {
        padding: GUIDE_SPACING.md,
        paddingBottom: 100,
    },
    sectionTitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textSecondary,
        marginBottom: 12,
        marginLeft: 4,
    },
    // Shift Card
    shiftCard: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 16,
        borderRadius: 16,
        backgroundColor: GUIDE_COLORS.surface,
        marginBottom: 12,
        ...GUIDE_SHADOWS.sm,
    },
    myShiftCard: {
        backgroundColor: '#FFFBEB',
        borderWidth: 1,
        borderColor: GUIDE_COLORS.primary,
    },
    otherShiftCard: {
        backgroundColor: GUIDE_COLORS.surface,
    },
    shiftTimeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        width: 100,
        gap: 8,
    },
    timeDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    shiftTimeText: {
        fontSize: 15,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
    },
    dividerVertical: {
        width: 1,
        height: '80%',
        backgroundColor: GUIDE_COLORS.borderLight,
        marginHorizontal: 12,
    },
    guideInfo: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    guideName: {
        fontSize: 15,
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    roleTag: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 4,
    },
    roleTagText: {
        fontSize: 10,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '600',
    },
    myRoleTag: {
        backgroundColor: 'rgba(245, 158, 11, 0.2)',
    },
    myRoleTagText: {
        color: '#B45309',
    },
    myShiftText: {
        color: '#92400E',
    },
    // Empty State
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingTop: 40,
        opacity: 0.7,
    },
    emptyIconBg: {
        width: 60,
        height: 60,
        borderRadius: 30,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    emptyText: {
        fontSize: 15,
        color: GUIDE_COLORS.textSecondary,
    },
    // FAB
    fab: {
        position: 'absolute',
        bottom: 24,
        right: 24,
        backgroundColor: GUIDE_COLORS.primary,
        borderRadius: 24,
        height: 48,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        ...GUIDE_SHADOWS.md,
        gap: 8,
        elevation: 6,
    },
    fabText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: GUIDE_COLORS.textDark,
    }
});
