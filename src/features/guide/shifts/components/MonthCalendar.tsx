
import { MaterialIcons } from '@expo/vector-icons';
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING } from '../../../../constants/guide.constants';
import { CALENDAR_LAYOUT } from '../../../../utils/calendarLayout';
import { formatDateToISO } from '../../../../utils/dateUtils';

// ============================================
// TYPES
// ============================================

export interface DayData {
    /** Number of shifts on this day */
    shiftCount: number;
    /** Whether the current user has a shift */
    hasMyShift: boolean;
    /** Event names for this day (max 2 shown) */
    eventNames: string[];
}

interface MonthCalendarProps {
    /** Currently viewed month */
    currentMonth: Date;
    /** Currently selected date */
    selectedDate: Date;
    /** Map of date string (YYYY-MM-DD) -> DayData */
    dayDataMap: Record<string, DayData>;
    /** Callback when a date is tapped */
    onSelectDate: (date: Date) => void;
    /** Callback to navigate months */
    onChangeMonth: (offset: number) => void;
}

// ============================================
// RESPONSIVE VALUES FROM CALENDAR LAYOUT
// ============================================

const {
    cellHeight: CELL_HEIGHT,
    dateCircleSize: DATE_SIZE,
    fonts: FONTS,
    showEventPills: SHOW_EVENT_PILLS,
    showMoreText: SHOW_MORE_TEXT,
} = CALENDAR_LAYOUT;

const DATE_RADIUS = DATE_SIZE / 2;

// ============================================
// HELPERS
// ============================================

const getWeekdayLabels = (t: any) => [
    t('common.days.mon'),
    t('common.days.tue'),
    t('common.days.wed'),
    t('common.days.thu'),
    t('common.days.fri'),
    t('common.days.sat'),
    t('common.days.sun')
];

const isSameDay = (d1: Date, d2: Date) =>
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate();

const getMonthName = (month: number, t: any) => `${t('shifts.calendar_month')} ${month + 1}`;

// ============================================
// COMPONENT
// ============================================

export const MonthCalendar: React.FC<MonthCalendarProps> = ({
    currentMonth,
    selectedDate,
    dayDataMap,
    onSelectDate,
    onChangeMonth,
}) => {
    const { t } = useTranslation();
    const today = useMemo(() => new Date(), []);
    const weekdayLabels = getWeekdayLabels(t);

    // Generate calendar grid
    const calendarWeeks = useMemo(() => {
        const year = currentMonth.getFullYear();
        const month = currentMonth.getMonth();

        const firstDay = new Date(year, month, 1);
        const lastDay = new Date(year, month + 1, 0);

        // Monday-based: (getDay() + 6) % 7
        const startOffset = (firstDay.getDay() + 6) % 7;

        const weeks: (Date | null)[][] = [];
        let currentWeek: (Date | null)[] = [];

        // Fill leading cells with prev month dates
        for (let i = 0; i < startOffset; i++) {
            const prevDate = new Date(year, month, -(startOffset - 1 - i));
            currentWeek.push(prevDate);
        }

        // Fill actual month days
        for (let day = 1; day <= lastDay.getDate(); day++) {
            const date = new Date(year, month, day);
            currentWeek.push(date);
            if (currentWeek.length === 7) {
                weeks.push(currentWeek);
                currentWeek = [];
            }
        }

        // Fill trailing cells with next month dates
        if (currentWeek.length > 0) {
            let nextDay = 1;
            while (currentWeek.length < 7) {
                const nextDate = new Date(year, month + 1, nextDay++);
                currentWeek.push(nextDate);
            }
            weeks.push(currentWeek);
        }

        return weeks;
    }, [currentMonth]);

    const currentYear = currentMonth.getFullYear();
    const currentMonthIdx = currentMonth.getMonth();
    const monthLabel = `${getMonthName(currentMonthIdx, t)}, ${currentYear}`;

    const renderDayCell = (date: Date | null, index: number) => {
        if (!date) {
            return <View key={index} style={styles.dayCell} />;
        }

        const dateKey = formatDateToISO(date);
        const dayData = dayDataMap[dateKey];
        const isCurrentMonth = date.getMonth() === currentMonthIdx;
        const isToday_ = isSameDay(date, today);
        const isSelected = isSameDay(date, selectedDate);
        const shiftCount = dayData?.shiftCount || 0;
        const hasMyShift = dayData?.hasMyShift || false;
        const eventNames = dayData?.eventNames || [];

        const hasContent = shiftCount > 0 || eventNames.length > 0;

        return (
            <TouchableOpacity
                key={index}
                style={[
                    styles.dayCell,
                    isSelected && styles.dayCellSelected,
                ]}
                onPress={() => onSelectDate(date)}
                activeOpacity={0.6}
            >
                {/* Date number */}
                <View style={styles.dateRow}>
                    <View style={[
                        styles.dateNumberWrapper,
                        isToday_ && !isSelected && styles.todayWrapper,
                        isSelected && styles.selectedWrapper,
                    ]}>
                        <Text style={[
                            styles.dateNumber,
                            !isCurrentMonth && styles.dateNumberOutside,
                            isToday_ && !isSelected && styles.todayNumber,
                            isSelected && styles.selectedNumber,
                        ]}>
                            {date.getDate()}
                        </Text>
                    </View>
                </View>

                {/* Content area - shifts & events */}
                {hasContent && isCurrentMonth && (
                    <View style={styles.cellContent}>
                        {/* Shift badge */}
                        {shiftCount > 0 && (
                            <View style={[
                                styles.shiftBadge,
                                hasMyShift ? styles.shiftBadgeMine : styles.shiftBadgeOther,
                            ]}>
                                <Text style={[
                                    styles.shiftBadgeText,
                                    hasMyShift ? styles.shiftBadgeTextMine : styles.shiftBadgeTextOther,
                                ]}>
                                    {shiftCount} {t('shifts.calendar_shift_count')}
                                </Text>
                            </View>
                        )}

                        {/* Event names (only if screen has space) */}
                        {SHOW_EVENT_PILLS && eventNames.slice(0, 1).map((name, i) => (
                            <View key={i} style={styles.eventPill}>
                                <Text style={styles.eventPillText} numberOfLines={1}>
                                    {name}
                                </Text>
                            </View>
                        ))}

                        {/* More indicator (only if screen has space) */}
                        {SHOW_MORE_TEXT && (eventNames.length > 1 || (eventNames.length >= 1 && shiftCount > 0)) && (
                            <Text style={styles.moreText}>
                                +{eventNames.length > 1 ? eventNames.length - 1 : 0} {t('shifts.calendar_more')}
                            </Text>
                        )}

                        {/* Fallback for compact screens: just show dots */}
                        {!SHOW_EVENT_PILLS && eventNames.length > 0 && (
                            <View style={styles.indicatorRow}>
                                <View style={styles.eventDot} />
                                {eventNames.length > 1 && (
                                    <Text style={styles.eventCountText}>{eventNames.length}</Text>
                                )}
                            </View>
                        )}
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Month Header */}
            <View style={styles.monthHeader}>
                <TouchableOpacity
                    onPress={() => onChangeMonth(-1)}
                    style={styles.navBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="chevron-left" size={26} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => {
                        const now = new Date();
                        const diffMonths =
                            (now.getFullYear() - currentMonth.getFullYear()) * 12 +
                            (now.getMonth() - currentMonth.getMonth());
                        if (diffMonths !== 0) onChangeMonth(diffMonths);
                        onSelectDate(now);
                    }}
                    style={styles.monthLabelBtn}
                >
                    <Text style={styles.monthLabel}>{monthLabel}</Text>
                    {!isSameDay(today, selectedDate) && (
                        <View style={styles.todayBtn}>
                            <Text style={styles.todayBtnText}>{t('common.today')}</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <TouchableOpacity
                    onPress={() => onChangeMonth(1)}
                    style={styles.navBtn}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                    <MaterialIcons name="chevron-right" size={26} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>
            </View>

            {/* Weekday Headers */}
            <View style={styles.weekdayRow}>
                {weekdayLabels.map((label, i) => (
                    <View key={i} style={styles.weekdayCell}>
                        <Text style={[
                            styles.weekdayText,
                            i === 6 && styles.weekdaySunday,
                        ]}>
                            {label}
                        </Text>
                    </View>
                ))}
            </View>

            {/* Calendar Grid */}
            <View style={styles.gridContainer}>
                {calendarWeeks.map((week, weekIdx) => (
                    <View key={weekIdx} style={styles.weekRow}>
                        {week.map((date, dayIdx) => renderDayCell(date, dayIdx))}
                    </View>
                ))}
            </View>

            {/* Legend */}
            <View style={styles.legendRow}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: GUIDE_COLORS.primary }]} />
                    <Text style={styles.legendText}>{t('shifts.calendar_legend_my_shift')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: GUIDE_COLORS.info }]} />
                    <Text style={styles.legendText}>{t('shifts.calendar_legend_other_shift')}</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDotRect, { backgroundColor: '#10B981' }]} />
                    <Text style={styles.legendText}>{t('shifts.calendar_legend_event')}</Text>
                </View>
            </View>
        </View>
    );
};

// ============================================
// STYLES (using responsive CALENDAR_LAYOUT values)
// ============================================

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GUIDE_COLORS.surface,
        borderTopLeftRadius: 16,
        borderTopRightRadius: 16,
        marginHorizontal: CALENDAR_LAYOUT.cardMarginH,
        marginTop: 4,
        ...GUIDE_SHADOWS.md,
    },

    // Month Header
    monthHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: GUIDE_SPACING.md,
        paddingTop: 10,
        paddingBottom: 4,
    },
    navBtn: {
        width: 34,
        height: 34,
        borderRadius: 17,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    monthLabelBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    monthLabel: {
        fontSize: FONTS.monthLabel,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        letterSpacing: -0.3,
    },
    todayBtn: {
        backgroundColor: GUIDE_COLORS.primaryMuted,
        borderRadius: 8,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.primaryBorder,
    },
    todayBtnText: {
        fontSize: FONTS.todayBtn,
        fontWeight: '700',
        color: GUIDE_COLORS.primaryDark,
    },

    // Weekday Headers
    weekdayRow: {
        flexDirection: 'row',
        paddingHorizontal: CALENDAR_LAYOUT.cardPaddingH,
        paddingTop: 2,
        paddingBottom: 4,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.gray100,
    },
    weekdayCell: {
        flex: 1,
        alignItems: 'center',
    },
    weekdayText: {
        fontSize: FONTS.weekday,
        fontWeight: '700',
        color: GUIDE_COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    weekdaySunday: {
        color: '#E74C3C',
    },

    // Calendar Grid
    gridContainer: {
        flex: 1,
        paddingHorizontal: CALENDAR_LAYOUT.cardPaddingH,
        paddingTop: 1,
    },
    weekRow: {
        flexDirection: 'row',
        flex: 1,
        borderBottomWidth: StyleSheet.hairlineWidth,
        borderBottomColor: GUIDE_COLORS.gray100,
    },

    // Day Cell
    dayCell: {
        flex: 1,
        minHeight: CELL_HEIGHT,
        paddingTop: 2,
        paddingHorizontal: 1,
        borderRightWidth: StyleSheet.hairlineWidth,
        borderRightColor: GUIDE_COLORS.gray100,
    },
    dayCellSelected: {
        backgroundColor: 'rgba(236, 182, 19, 0.08)',
    },

    // Date number
    dateRow: {
        alignItems: 'center',
        marginBottom: 1,
    },
    dateNumberWrapper: {
        width: DATE_SIZE,
        height: DATE_SIZE,
        borderRadius: DATE_RADIUS,
        alignItems: 'center',
        justifyContent: 'center',
    },
    todayWrapper: {
        backgroundColor: GUIDE_COLORS.primary,
    },
    selectedWrapper: {
        backgroundColor: GUIDE_COLORS.primaryDark,
    },
    dateNumber: {
        fontSize: FONTS.dateNumber,
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    dateNumberOutside: {
        color: GUIDE_COLORS.gray300,
    },
    todayNumber: {
        color: '#FFFFFF',
        fontWeight: '800',
    },
    selectedNumber: {
        color: '#FFFFFF',
        fontWeight: '800',
    },

    // Cell content area
    cellContent: {
        flex: 1,
        gap: 1,
        overflow: 'hidden',
    },

    // Shift badge
    shiftBadge: {
        borderRadius: 3,
        paddingHorizontal: 2,
        paddingVertical: 1,
        alignSelf: 'stretch',
    },
    shiftBadgeMine: {
        backgroundColor: GUIDE_COLORS.primary,
    },
    shiftBadgeOther: {
        backgroundColor: GUIDE_COLORS.info,
    },
    shiftBadgeText: {
        fontSize: FONTS.shiftBadge,
        fontWeight: '800',
        textAlign: 'center',
    },
    shiftBadgeTextMine: {
        color: '#FFFFFF',
    },
    shiftBadgeTextOther: {
        color: '#FFFFFF',
    },

    // Event pill
    eventPill: {
        backgroundColor: '#D1FAE5',
        borderRadius: 3,
        paddingHorizontal: 2,
        paddingVertical: 0,
        alignSelf: 'stretch',
    },
    eventPillText: {
        fontSize: FONTS.eventPill,
        fontWeight: '700',
        color: '#065F46',
        lineHeight: 10,
    },

    // More indicator
    moreText: {
        fontSize: FONTS.moreText,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '600',
        textAlign: 'center',
    },

    // Compact fallback: indicator dots
    indicatorRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 2,
    },
    eventDot: {
        width: 5,
        height: 5,
        borderRadius: 2.5,
        backgroundColor: '#10B981',
    },
    eventCountText: {
        fontSize: 8,
        fontWeight: '800',
        color: '#059669',
    },

    // Legend
    legendRow: {
        flexDirection: 'row',
        justifyContent: 'center',
        gap: 14,
        paddingTop: 4,
        paddingBottom: 4,
    },
    legendItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    legendDot: {
        width: 7,
        height: 7,
        borderRadius: 3.5,
    },
    legendDotRect: {
        width: 10,
        height: 7,
        borderRadius: 2,
    },
    legendText: {
        fontSize: FONTS.legend,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '500',
    },
});
