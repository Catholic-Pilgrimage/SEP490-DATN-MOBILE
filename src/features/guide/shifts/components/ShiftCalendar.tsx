
import React, { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';

interface ShiftCalendarProps {
    selectedDate: Date;
    onSelectDate: (date: Date) => void;
    shiftData?: Record<string, boolean>; // date string (YYYY-MM-DD) -> has shifts
}

export const ShiftCalendar: React.FC<ShiftCalendarProps> = ({
    selectedDate,
    onSelectDate,
    shiftData = {},
}) => {
    const { t } = useTranslation();
    
    // Generate next 14 days
    const days = useMemo(() => {
        const result = [];
        const today = new Date();

        for (let i = 0; i < 14; i++) {
            const date = new Date(today);
            date.setDate(today.getDate() + i);
            result.push(date);
        }
        return result;
    }, []);

    const formatDateKey = (date: Date) => date.toISOString().split('T')[0];

    const getDayName = (date: Date) => {
        const dayIndex = date.getDay();
        const days = [
            t('common.days.sun'),
            t('common.days.mon'),
            t('common.days.tue'),
            t('common.days.wed'),
            t('common.days.thu'),
            t('common.days.fri'),
            t('common.days.sat')
        ];
        return days[dayIndex];
    };

    return (
        <View style={styles.container}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {days.map((date, index) => {
                    const isSelected = formatDateKey(date) === formatDateKey(selectedDate);
                    const hasShift = shiftData[formatDateKey(date)];
                    const isToday = formatDateKey(date) === formatDateKey(new Date());

                    return (
                        <TouchableOpacity
                            key={index}
                            style={[
                                styles.dayCard,
                                isSelected && styles.dayCardSelected,
                                isToday && !isSelected && styles.dayCardToday
                            ]}
                            onPress={() => onSelectDate(date)}
                            activeOpacity={0.7}
                        >
                            <Text style={[styles.dayName, isSelected && styles.textSelected]}>
                                {getDayName(date)}
                            </Text>
                            <Text style={[styles.dayNumber, isSelected && styles.textSelected]}>
                                {date.getDate()}
                            </Text>

                            {/* Dot indicator for shifts */}
                            <View style={[
                                styles.dot,
                                hasShift ? styles.dotActive : null,
                                isSelected && hasShift ? styles.dotSelected : null
                            ]} />
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: GUIDE_COLORS.background,
        paddingVertical: GUIDE_SPACING.md,
    },
    scrollContent: {
        paddingHorizontal: GUIDE_SPACING.lg,
        gap: GUIDE_SPACING.sm,
    },
    dayCard: {
        width: 54,
        height: 76,
        borderRadius: 16,
        backgroundColor: GUIDE_COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        gap: 6,
        borderWidth: 1,
        borderColor: 'transparent',
        ...GUIDE_SHADOWS.sm,
    },
    dayCardSelected: {
        backgroundColor: GUIDE_COLORS.primary,
        transform: [{ scale: 1.05 }],
        ...GUIDE_SHADOWS.md,
    },
    dayCardToday: {
        borderColor: GUIDE_COLORS.primary,
        borderWidth: 1.5,
    },
    dayName: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '600',
        textTransform: 'uppercase',
    },
    dayNumber: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
    },
    textSelected: {
        color: GUIDE_COLORS.surface,
    },
    dot: {
        width: 4,
        height: 4,
        borderRadius: 2,
        backgroundColor: 'transparent',
    },
    dotActive: {
        backgroundColor: GUIDE_COLORS.success,
    },
    dotSelected: {
        backgroundColor: GUIDE_COLORS.surface,
    },
});
