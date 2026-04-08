
import { useFocusEffect } from '@react-navigation/native';
import { useQueries, useQuery } from '@tanstack/react-query';
import React, { useCallback, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import { dashboardApi, getShiftSubmissions, guideEventApi } from '../../../../services/api/guide';
import { SiteScheduleShift } from '../../../../types/guide/dashboard-home.types';
import { EventItem } from '../../../../types/guide/event.types';
import { formatDateToISO, getWeekStartDate } from '../../../../utils/dateUtils';
import { DayDetailSheet } from './DayDetailSheet';
import { DayData, MonthCalendar } from './MonthCalendar';
import { ShiftRegistrationModal } from './ShiftRegistrationModal';

export const AvailableShiftsTab: React.FC = () => {
    const { t } = useTranslation();
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState(new Date());
    const [isDetailVisible, setDetailVisible] = useState(false);
    const [isRegisterModalVisible, setRegisterModalVisible] = useState(false);

    // Calculate week start based on the currently selected date
    const weekStart = useMemo(() => getWeekStartDate(selectedDate), [selectedDate]);

    // All week starts for the visible month (covers all days shown in calendar)
    const monthWeekStarts = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();
        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        const starts = new Set<string>();
        let d = new Date(firstDay);
        const dayOfWeek = d.getDay();
        const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
        d.setDate(d.getDate() + offset);

        while (d <= lastDay || d <= new Date(year, month + 1, 6)) {
            starts.add(getWeekStartDate(d));
            d.setDate(d.getDate() + 7);
        }

        return Array.from(starts);
    }, [currentMonth]);

    // ============================================
    // QUERIES
    // ============================================

    // Query 1: Site Schedules — fetch ALL weeks in the visible month
    const scheduleQueries = useQueries({
        queries: monthWeekStarts.map(ws => ({
            queryKey: GUIDE_KEYS.dashboard.activeShift(ws),
            queryFn: () => dashboardApi.getSiteSchedule(ws),
            staleTime: 5 * 60 * 1000, // Cache 5 mins to avoid redundant calls
        })),
    });

    const isScheduleLoading = scheduleQueries.some(q => q.isLoading);

    // Query 2: My Submissions — fetch ALL (no week filter)
    const { data: mySubmissionsResponse, refetch: refetchSubmissions } = useQuery({
        queryKey: GUIDE_KEYS.shiftSubmissions.list({ scope: 'all_weeks' }),
        queryFn: async () => {
            const res = await getShiftSubmissions();
            // Ensure we never return undefined (React Query requirement)
            return res ?? { success: true, data: [] };
        },
    });

    // Query 3: Events (approved & active)
    const { data: eventsResponse, refetch: refetchEvents } = useQuery({
        queryKey: GUIDE_KEYS.events({ status: 'approved', is_active: true }),
        queryFn: () => guideEventApi.getEvents({ status: 'approved', is_active: true, limit: 50 }),
    });

    useFocusEffect(
        useCallback(() => {
            scheduleQueries.forEach(q => q.refetch());
            refetchSubmissions();
            refetchEvents();
        }, [refetchSubmissions, refetchEvents])
    );

    // ============================================
    // MERGE ALL SCHEDULE DATA INTO A SINGLE MAP
    // ============================================

    const mergedScheduleMap = useMemo<Record<string, SiteScheduleShift[]>>(() => {
        const merged: Record<string, SiteScheduleShift[]> = {};

        scheduleQueries.forEach(q => {
            const scheduleMap = q.data?.data?.schedule;
            if (scheduleMap) {
                Object.entries(scheduleMap).forEach(([dateKey, shifts]) => {
                    if (Array.isArray(shifts)) {
                        if (!merged[dateKey]) {
                            merged[dateKey] = [];
                        }
                        // Merge shifts, avoiding duplicates by shift_id
                        shifts.forEach(shift => {
                            const exists = merged[dateKey].some(
                                s => s.shift_id === shift.shift_id
                            );
                            if (!exists) {
                                merged[dateKey].push(shift);
                            }
                        });
                    }
                });
            }
        });

        return merged;
    }, [scheduleQueries.map(q => q.data)]);

    // ============================================
    // BUILD DAY DATA MAP FOR CALENDAR
    // ============================================

    const dayDataMap = useMemo<Record<string, DayData>>(() => {
        const map: Record<string, DayData> = {};

        // --- Process ALL shifts from merged schedule ---
        Object.entries(mergedScheduleMap).forEach(([dateKey, shifts]) => {
            if (shifts.length > 0) {
                map[dateKey] = {
                    shiftCount: shifts.length,
                    hasMyShift: shifts.some(s => s.is_mine),
                    eventNames: [],
                };
            }
        });

        // --- Process my approved submissions ---
        const submissions = mySubmissionsResponse?.data || [];
        submissions.forEach(sub => {
            if (sub.status === 'approved' && sub.shifts) {
                sub.shifts.forEach(shift => {
                    const ws = new Date(sub.week_start_date);
                    const currentDay = ws.getDay();
                    let diff = shift.day_of_week - currentDay;
                    if (diff < 0) diff += 7;
                    const shiftDate = new Date(ws);
                    shiftDate.setDate(ws.getDate() + diff);
                    const dateKey = formatDateToISO(shiftDate);

                    if (!map[dateKey]) {
                        map[dateKey] = { shiftCount: 1, hasMyShift: true, eventNames: [] };
                    } else {
                        map[dateKey].hasMyShift = true;
                    }
                });
            }
        });

        // --- Process events ---
        const events: EventItem[] = eventsResponse?.data?.data || [];
        events.forEach(event => {
            if (!event.start_date) return;

            const startDate = event.start_date;
            const endDate = event.end_date || startDate;

            const start = new Date(startDate);
            const end = new Date(endDate);

            for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
                const dateKey = formatDateToISO(d);
                if (!map[dateKey]) {
                    map[dateKey] = { shiftCount: 0, hasMyShift: false, eventNames: [] };
                }
                if (!map[dateKey].eventNames.includes(event.name)) {
                    map[dateKey].eventNames.push(event.name);
                }
            }
        });

        return map;
    }, [mergedScheduleMap, mySubmissionsResponse, eventsResponse]);

    // ============================================
    // GET SHIFTS FOR SELECTED DAY (for detail sheet)
    // ============================================

    const selectedDayShifts = useMemo<SiteScheduleShift[]>(() => {
        const dateKey = formatDateToISO(selectedDate);
        const serverShifts = mergedScheduleMap[dateKey] || [];
        const combined = [...serverShifts];

        // Merge approved submissions not already in server data
        const submissions = mySubmissionsResponse?.data || [];
        const ws = getWeekStartDate(selectedDate);
        const approvedSub = submissions.find(s => s.status === 'approved' && s.week_start_date === ws);

        if (approvedSub?.shifts) {
            const dow = selectedDate.getDay();
            const myDailyShifts = approvedSub.shifts.filter(s => s.day_of_week === dow);

            myDailyShifts.forEach(myShift => {
                const alreadyExists = combined.some(
                    existing =>
                        existing.is_mine &&
                        existing.start_time.substring(0, 5) === myShift.start_time.substring(0, 5)
                );

                if (!alreadyExists) {
                    combined.push({
                        shift_id: myShift.id,
                        submission_id: myShift.submission_id,
                        start_time: myShift.start_time,
                        end_time: myShift.end_time,
                        guide_name: t('common.you'),
                        is_mine: true,
                        status: 'approved',
                        guide_avatar: undefined,
                    });
                }
            });
        }

        return combined.sort((a, b) => a.start_time.localeCompare(b.start_time));
    }, [selectedDate, mergedScheduleMap, mySubmissionsResponse]);

    // Get events for selected day (for detail sheet)
    const selectedDayEvents = useMemo<EventItem[]>(() => {
        const dateKey = formatDateToISO(selectedDate);
        const events: EventItem[] = eventsResponse?.data?.data || [];
        return events.filter(e => {
            const start = e.start_date;
            const end = e.end_date || start;
            return dateKey >= start && dateKey <= end;
        });
    }, [selectedDate, eventsResponse]);

    // ============================================
    // HANDLERS
    // ============================================

    const handleChangeMonth = (offset: number) => {
        setCurrentMonth(prev => {
            const newMonth = new Date(prev);
            newMonth.setMonth(newMonth.getMonth() + offset);
            return newMonth;
        });
    };

    const handleSelectDate = (date: Date) => {
        setSelectedDate(date);
        setDetailVisible(true);
    };

    return (
        <View style={styles.container}>
            <MonthCalendar
                currentMonth={currentMonth}
                selectedDate={selectedDate}
                dayDataMap={dayDataMap}
                onSelectDate={handleSelectDate}
                onChangeMonth={handleChangeMonth}
            />

            {/* Day Detail Bottom Sheet */}
            <DayDetailSheet
                visible={isDetailVisible}
                date={selectedDate}
                shifts={selectedDayShifts}
                events={selectedDayEvents}
                isLoading={isScheduleLoading}
                onClose={() => setDetailVisible(false)}
                onRegister={() => {
                    setDetailVisible(false);
                    setRegisterModalVisible(true);
                }}
            />

            {/* Registration Modal */}
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
        backgroundColor: 'transparent',
    },
});
