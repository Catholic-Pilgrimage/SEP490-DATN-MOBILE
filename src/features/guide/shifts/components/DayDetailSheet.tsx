
import { MaterialIcons } from '@expo/vector-icons';
import React from 'react';
import {
    ActivityIndicator,
    Dimensions,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_BORDER_RADIUS, GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { SiteScheduleShift } from '../../../../types/guide/dashboard-home.types';
import { EventItem } from '../../../../types/guide/event.types';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');
const SHEET_MAX_HEIGHT = SCREEN_HEIGHT * 0.65;

// ============================================
// TYPES
// ============================================

interface DayDetailSheetProps {
    visible: boolean;
    date: Date;
    shifts: SiteScheduleShift[];
    events?: EventItem[];
    isLoading: boolean;
    onClose: () => void;
    onRegister: () => void;
}

// ============================================
// HELPERS
// ============================================

const getDayOfWeekFull = (date: Date): string => {
    const days = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];
    return days[date.getDay()];
};

const getMonthName = (month: number) => `Tháng ${month + 1}`;

const getShiftPeriod = (startTime: string): { label: string; icon: string; color: string; bg: string } => {
    const hour = parseInt(startTime.split(':')[0], 10);
    if (hour < 12) {
        return { label: 'Ca sáng', icon: 'wb-sunny', color: '#F59E0B', bg: '#FFFBEB' };
    } else if (hour < 17) {
        return { label: 'Ca chiều', icon: 'wb-twilight', color: '#3B82F6', bg: '#EFF6FF' };
    } else {
        return { label: 'Ca tối', icon: 'nightlight', color: '#6366F1', bg: '#EEF2FF' };
    }
};

const formatTime = (timeStr: string) => timeStr?.substring(0, 5) || '--:--';

// ============================================
// MAIN COMPONENT
// ============================================

export const DayDetailSheet: React.FC<DayDetailSheetProps> = ({
    visible,
    date,
    shifts,
    events = [],
    isLoading,
    onClose,
    onRegister,
}) => {
    const insets = useSafeAreaInsets();
    const bottomSafe = Math.max(insets.bottom, Platform.OS === 'android' ? 20 : 16);
    const formattedDate = `${getDayOfWeekFull(date)}, ${date.getDate()} ${getMonthName(date.getMonth())}`;
    const myShifts = shifts.filter(s => s.is_mine);
    const otherShifts = shifts.filter(s => !s.is_mine);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const selectedDay = new Date(date);
    selectedDay.setHours(0, 0, 0, 0);
    const isPast = selectedDay < today;
    const isToday = selectedDay.getTime() === today.getTime();

    const totalItems = shifts.length + events.length;

    // Build summary chips
    const summaryChips: { label: string; color: string; bg: string; icon: string }[] = [];
    if (myShifts.length > 0) {
        summaryChips.push({ label: `${myShifts.length} ca của bạn`, color: '#92400E', bg: '#FEF3C7', icon: 'person' });
    }
    if (otherShifts.length > 0) {
        summaryChips.push({ label: `${otherShifts.length} ca khác`, color: '#1E40AF', bg: '#DBEAFE', icon: 'group' });
    }
    if (events.length > 0) {
        summaryChips.push({ label: `${events.length} sự kiện`, color: '#065F46', bg: '#D1FAE5', icon: 'event' });
    }

    return (
        <Modal
            visible={visible}
            transparent
            animationType="slide"
            onRequestClose={onClose}
            statusBarTranslucent
        >
            <View style={styles.overlay}>
                <TouchableOpacity style={styles.outsideTouch} onPress={onClose} activeOpacity={1} />
                <View style={[styles.sheet, { maxHeight: SHEET_MAX_HEIGHT }]}>
                    {/* Drag handle */}
                    <View style={styles.dragHandleBar}>
                        <View style={styles.dragHandle} />
                    </View>

                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.headerLeft}>
                            <View style={[
                                styles.dateIconBg,
                                isToday && styles.dateIconBgToday,
                            ]}>
                                <Text style={[
                                    styles.dateIconText,
                                    isToday && styles.dateIconTextToday,
                                ]}>{date.getDate()}</Text>
                            </View>
                            <View style={styles.headerTextArea}>
                                <Text style={styles.headerTitle}>{formattedDate}</Text>
                                {/* Summary chips */}
                                {summaryChips.length > 0 ? (
                                    <View style={styles.summaryChipsRow}>
                                        {summaryChips.map((chip, i) => (
                                            <View key={i} style={[styles.summaryChip, { backgroundColor: chip.bg }]}>
                                                <MaterialIcons name={chip.icon as any} size={10} color={chip.color} />
                                                <Text style={[styles.summaryChipText, { color: chip.color }]}>{chip.label}</Text>
                                            </View>
                                        ))}
                                    </View>
                                ) : (
                                    <Text style={styles.headerSubtitle}>Không có lịch</Text>
                                )}
                            </View>
                        </View>
                        <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
                            <MaterialIcons name="close" size={20} color={GUIDE_COLORS.textSecondary} />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <ScrollView
                        style={styles.content}
                        contentContainerStyle={styles.contentInner}
                        showsVerticalScrollIndicator={false}
                        bounces={false}
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
                                <Text style={styles.loadingText}>Đang tải dữ liệu...</Text>
                            </View>
                        ) : totalItems === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBg}>
                                    <MaterialIcons name="event-available" size={32} color={GUIDE_COLORS.gray400} />
                                </View>
                                <Text style={styles.emptyTitle}>Chưa có lịch</Text>
                                <Text style={styles.emptySubtitle}>
                                    {isPast
                                        ? 'Ngày này không có ca trực hay sự kiện nào.'
                                        : 'Bạn có thể đăng ký ca trực cho ngày này.'}
                                </Text>
                            </View>
                        ) : (
                            <>
                                {/* ═══ EVENTS SECTION ═══ */}
                                {events.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <View style={styles.sectionHeaderLeft}>
                                                <View style={[styles.sectionDot, { backgroundColor: '#10B981' }]} />
                                                <Text style={styles.sectionTitle}>Sự kiện</Text>
                                            </View>
                                            <View style={[styles.sectionBadge, { backgroundColor: '#D1FAE5' }]}>
                                                <Text style={[styles.sectionBadgeText, { color: '#065F46' }]}>{events.length}</Text>
                                            </View>
                                        </View>
                                        {events.map((event, idx) => (
                                            <EventCard key={`event-${idx}`} event={event} />
                                        ))}
                                    </View>
                                )}

                                {/* ═══ MY SHIFTS SECTION ═══ */}
                                {myShifts.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <View style={styles.sectionHeaderLeft}>
                                                <View style={[styles.sectionDot, { backgroundColor: GUIDE_COLORS.primary }]} />
                                                <Text style={styles.sectionTitle}>Ca trực của bạn</Text>
                                            </View>
                                            <View style={styles.sectionBadge}>
                                                <Text style={styles.sectionBadgeText}>{myShifts.length}</Text>
                                            </View>
                                        </View>
                                        {myShifts.map((shift, idx) => (
                                            <ShiftCard key={`my-${idx}`} shift={shift} isMine={true} />
                                        ))}
                                    </View>
                                )}

                                {/* ═══ OTHER SHIFTS SECTION ═══ */}
                                {otherShifts.length > 0 && (
                                    <View style={styles.section}>
                                        <View style={styles.sectionHeader}>
                                            <View style={styles.sectionHeaderLeft}>
                                                <View style={[styles.sectionDot, { backgroundColor: GUIDE_COLORS.info }]} />
                                                <Text style={styles.sectionTitle}>Ca trực khác</Text>
                                            </View>
                                            <View style={[styles.sectionBadge, { backgroundColor: GUIDE_COLORS.infoLight }]}>
                                                <Text style={[styles.sectionBadgeText, { color: GUIDE_COLORS.info }]}>{otherShifts.length}</Text>
                                            </View>
                                        </View>
                                        {otherShifts.map((shift, idx) => (
                                            <ShiftCard key={`other-${idx}`} shift={shift} isMine={false} />
                                        ))}
                                    </View>
                                )}
                            </>
                        )}
                    </ScrollView>

                    {/* Footer Action */}
                    {!isPast && (
                        <View style={[styles.footer, { paddingBottom: bottomSafe + 8 }]}>
                            <TouchableOpacity
                                style={styles.registerBtn}
                                onPress={onRegister}
                                activeOpacity={0.85}
                            >
                                <MaterialIcons name="add-circle-outline" size={20} color={GUIDE_COLORS.textDark} />
                                <Text style={styles.registerBtnText}>Đăng ký ca tuần</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    {/* Safe area spacer when no footer */}
                    {isPast && <View style={{ height: bottomSafe }} />}
                </View>
            </View>
        </Modal>
    );
};

// ============================================
// EVENT CARD SUB-COMPONENT
// ============================================

const EventCard: React.FC<{ event: EventItem }> = ({ event }) => {
    const hasTime = event.start_time && event.start_time !== '00:00:00';

    return (
        <View style={styles.eventCard}>
            <View style={styles.eventColorBar} />
            <View style={styles.eventContent}>
                <Text style={styles.eventName} numberOfLines={2}>{event.name}</Text>
                <View style={styles.eventMetaRow}>
                    {hasTime && (
                        <View style={styles.eventMetaItem}>
                            <MaterialIcons name="schedule" size={12} color="#059669" />
                            <Text style={styles.eventMetaText}>
                                {formatTime(event.start_time)}
                                {event.end_time ? ` — ${formatTime(event.end_time)}` : ''}
                            </Text>
                        </View>
                    )}
                    {event.location ? (
                        <View style={styles.eventMetaItem}>
                            <MaterialIcons name="place" size={12} color="#059669" />
                            <Text style={styles.eventMetaText} numberOfLines={1}>{event.location}</Text>
                        </View>
                    ) : null}
                </View>
            </View>
        </View>
    );
};

// ============================================
// SHIFT CARD SUB-COMPONENT
// ============================================

const ShiftCard: React.FC<{ shift: SiteScheduleShift; isMine: boolean }> = ({ shift, isMine }) => {
    const period = getShiftPeriod(shift.start_time);

    return (
        <View style={[
            styles.shiftCard,
            isMine ? styles.shiftCardMine : styles.shiftCardOther,
        ]}>
            <View style={[
                styles.shiftColorBar,
                { backgroundColor: isMine ? GUIDE_COLORS.primary : GUIDE_COLORS.info },
            ]} />

            <View style={styles.shiftContent}>
                <View style={styles.shiftTimeRow}>
                    <MaterialIcons name="schedule" size={14} color={period.color} />
                    <Text style={styles.shiftTimeText}>
                        {formatTime(shift.start_time)} — {formatTime(shift.end_time)}
                    </Text>
                    <View style={[styles.periodBadge, { backgroundColor: period.bg }]}>
                        <MaterialIcons name={period.icon as any} size={11} color={period.color} />
                        <Text style={[styles.periodText, { color: period.color }]}>{period.label}</Text>
                    </View>
                </View>

                <View style={styles.shiftGuideRow}>
                    <View style={[styles.guideAvatar, isMine && styles.guideAvatarMine]}>
                        <MaterialIcons
                            name="person"
                            size={14}
                            color={isMine ? GUIDE_COLORS.primary : GUIDE_COLORS.gray400}
                        />
                    </View>
                    <Text style={[styles.guideName, isMine && styles.guideNameMine]} numberOfLines={1}>
                        {shift.guide_name || 'Hướng dẫn viên'}
                    </Text>
                    {shift.status === 'approved' && (
                        <View style={styles.approvedTag}>
                            <MaterialIcons name="check-circle" size={10} color={GUIDE_COLORS.successDark} />
                            <Text style={styles.approvedTagText}>Duyệt</Text>
                        </View>
                    )}
                    {shift.status === 'pending' && (
                        <View style={[styles.approvedTag, { backgroundColor: GUIDE_COLORS.warningLight }]}>
                            <MaterialIcons name="hourglass-empty" size={10} color="#92400E" />
                            <Text style={[styles.approvedTagText, { color: '#92400E' }]}>Chờ duyệt</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>
    );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.4)',
        justifyContent: 'flex-end',
    },
    outsideTouch: {
        flex: 1,
    },
    sheet: {
        backgroundColor: GUIDE_COLORS.surface,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        ...GUIDE_SHADOWS.lg,
    },

    // Drag Handle
    dragHandleBar: {
        alignItems: 'center',
        paddingTop: 10,
        paddingBottom: 4,
    },
    dragHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: GUIDE_COLORS.gray300,
    },

    // Header
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingTop: 8,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.gray100,
    },
    headerLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    headerTextArea: {
        flex: 1,
    },
    dateIconBg: {
        width: 44,
        height: 44,
        borderRadius: 14,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    dateIconBgToday: {
        backgroundColor: GUIDE_COLORS.primary,
    },
    dateIconText: {
        fontSize: 20,
        fontWeight: '800',
        color: GUIDE_COLORS.textPrimary,
    },
    dateIconTextToday: {
        color: '#FFFFFF',
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        letterSpacing: -0.2,
    },
    headerSubtitle: {
        fontSize: 12,
        color: GUIDE_COLORS.textSecondary,
        marginTop: 2,
    },

    // Summary chips
    summaryChipsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 4,
        marginTop: 4,
    },
    summaryChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    summaryChipText: {
        fontSize: 10,
        fontWeight: '700',
    },

    closeBtn: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Content
    content: {
        maxHeight: SHEET_MAX_HEIGHT - 150,
    },
    contentInner: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingTop: GUIDE_SPACING.sm,
        paddingBottom: GUIDE_SPACING.md,
    },

    // Loading & Empty states
    loadingContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    loadingText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
    },
    emptyContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 32,
        gap: 8,
    },
    emptyIconBg: {
        width: 56,
        height: 56,
        borderRadius: 28,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    emptyTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
    },
    emptySubtitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        textAlign: 'center',
        paddingHorizontal: 20,
        lineHeight: 18,
    },

    // Section
    section: {
        marginBottom: GUIDE_SPACING.md,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    sectionHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    sectionDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionBadge: {
        backgroundColor: GUIDE_COLORS.warningLight,
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 10,
    },
    sectionBadgeText: {
        fontSize: 11,
        fontWeight: '800',
        color: '#92400E',
    },

    // Event Card
    eventCard: {
        flexDirection: 'row',
        backgroundColor: '#F0FDF4',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 6,
        ...GUIDE_SHADOWS.sm,
    },
    eventColorBar: {
        width: 4,
        backgroundColor: '#10B981',
    },
    eventContent: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
    },
    eventName: {
        fontSize: 13,
        fontWeight: '700',
        color: '#065F46',
        lineHeight: 18,
    },
    eventMetaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    eventMetaItem: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
    },
    eventMetaText: {
        fontSize: 11,
        color: '#059669',
        fontWeight: '500',
    },

    // Shift Card
    shiftCard: {
        flexDirection: 'row',
        borderRadius: 12,
        overflow: 'hidden',
        marginBottom: 6,
        ...GUIDE_SHADOWS.sm,
    },
    shiftCardMine: {
        backgroundColor: '#FFFBEB',
    },
    shiftCardOther: {
        backgroundColor: '#F8FAFC',
    },
    shiftColorBar: {
        width: 4,
    },
    shiftContent: {
        flex: 1,
        paddingVertical: 10,
        paddingHorizontal: 12,
        gap: 6,
    },
    shiftTimeRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    shiftTimeText: {
        fontSize: 14,
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        flex: 1,
    },
    periodBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    periodText: {
        fontSize: 10,
        fontWeight: '700',
    },
    shiftGuideRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    guideAvatar: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: GUIDE_COLORS.gray100,
        alignItems: 'center',
        justifyContent: 'center',
    },
    guideAvatarMine: {
        backgroundColor: GUIDE_COLORS.primaryMuted,
    },
    guideName: {
        fontSize: 12,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '500',
        flex: 1,
    },
    guideNameMine: {
        color: '#92400E',
        fontWeight: '600',
    },
    approvedTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: GUIDE_COLORS.successLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    approvedTagText: {
        fontSize: 9,
        fontWeight: '700',
        color: GUIDE_COLORS.successDark,
    },

    // Footer
    footer: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingTop: GUIDE_SPACING.md,
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.gray100,
        backgroundColor: GUIDE_COLORS.surface,
    },
    registerBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: GUIDE_COLORS.primary,
        paddingVertical: 14,
        borderRadius: GUIDE_BORDER_RADIUS.lg,
        gap: 8,
        ...GUIDE_SHADOWS.md,
    },
    registerBtnText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
        fontWeight: '700',
        color: GUIDE_COLORS.textDark,
    },
});
