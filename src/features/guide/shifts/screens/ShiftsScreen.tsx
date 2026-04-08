
import { MaterialIcons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { GUIDE_COLORS, GUIDE_SHADOWS, GUIDE_SPACING, GUIDE_TYPOGRAPHY } from '../../../../constants/guide.constants';
import { useNotificationContext } from '../../../../contexts/NotificationContext';
import { useNotifications } from '../../../../hooks/useNotifications';
import { AvailableShiftsTab } from '../components/AvailableShiftsTab';
import { MyShiftsTab } from '../components/MyShiftsTab';

const PREMIUM_COLORS = {
    cream: '#FDF8F0',
};

export const ShiftsScreen: React.FC = () => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<'find' | 'my'>('find');
    const { openModal } = useNotificationContext();
    const { unreadCount } = useNotifications();

    return (
        <View style={styles.container}>
            <View style={[styles.headerWrapper, { paddingTop: insets.top }]}>
                <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.cream} />

                {/* Header */}
                <View style={styles.header}>
                    <View style={styles.headerTop}>
                        <View>
                            <Text style={styles.headerTitle}>{t('shifts.title')}</Text>
                            <Text style={styles.headerSubtitle}>{t('shifts.subtitle')}</Text>
                        </View>
                        <View style={styles.headerActions}>
                            <TouchableOpacity style={styles.notificationButton} onPress={openModal} activeOpacity={0.85}>
                                <MaterialIcons name="notifications-none" size={22} color={GUIDE_COLORS.primary} />
                                {unreadCount > 0 && (
                                    <View style={styles.notificationBadge}>
                                        <Text style={styles.notificationBadgeText}>
                                            {unreadCount > 99 ? '99+' : unreadCount}
                                        </Text>
                                    </View>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>

                {/* Segmented Control */}
                <View style={styles.segmentContainer}>
                    <View style={styles.segmentWrapper}>
                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'find' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('find')}
                            activeOpacity={0.9}
                        >
                            <MaterialIcons
                                name="date-range"
                                size={16}
                                color={activeTab === 'find' ? GUIDE_COLORS.textPrimary : GUIDE_COLORS.textSecondary}
                            />
                            <Text style={[styles.segmentText, activeTab === 'find' && styles.segmentTextActive]}>
                                {t('shifts.tab_available')}
                            </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.segmentBtn, activeTab === 'my' && styles.segmentBtnActive]}
                            onPress={() => setActiveTab('my')}
                            activeOpacity={0.9}
                        >
                            <MaterialIcons
                                name="assignment"
                                size={16}
                                color={activeTab === 'my' ? GUIDE_COLORS.textPrimary : GUIDE_COLORS.textSecondary}
                            />
                            <Text style={[styles.segmentText, activeTab === 'my' && styles.segmentTextActive]}>
                                {t('shifts.tab_my')}
                            </Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>

            {/* Content */}
            <View style={styles.content}>
                {activeTab === 'find' ? <AvailableShiftsTab /> : <MyShiftsTab />}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cream,
    },
    headerWrapper: {
        backgroundColor: PREMIUM_COLORS.cream,
        paddingBottom: GUIDE_SPACING.md,
        zIndex: 10,
    },
    header: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.sm,
        paddingTop: GUIDE_SPACING.sm,
    },
    headerTop: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: GUIDE_SPACING.sm,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: GUIDE_COLORS.textPrimary,
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        color: GUIDE_COLORS.textSecondary,
        marginTop: 2,
    },
    notificationButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: GUIDE_COLORS.surface,
        alignItems: 'center',
        justifyContent: 'center',
        ...GUIDE_SHADOWS.sm,
    },
    notificationBadge: {
        position: 'absolute',
        top: -3,
        right: -3,
        minWidth: 18,
        height: 18,
        borderRadius: 9,
        paddingHorizontal: 4,
        backgroundColor: GUIDE_COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
        borderWidth: 1.5,
        borderColor: PREMIUM_COLORS.cream,
    },
    notificationBadgeText: {
        fontSize: 10,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    segmentContainer: {
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingTop: 4,
    },
    segmentWrapper: {
        flexDirection: 'row',
        backgroundColor: GUIDE_COLORS.gray100,
        borderRadius: 14,
        padding: 4,
    },
    segmentBtn: {
        flex: 1,
        flexDirection: 'row',
        gap: 6,
        paddingVertical: 10,
        borderRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    segmentBtnActive: {
        backgroundColor: GUIDE_COLORS.surface,
        ...GUIDE_SHADOWS.sm,
        shadowColor: GUIDE_COLORS.primary, // subtle color pop for the active shadow
        shadowOpacity: 0.1,
        elevation: 2,
    },
    segmentText: {
        fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
        fontWeight: '600',
        color: GUIDE_COLORS.textSecondary,
    },
    segmentTextActive: {
        color: GUIDE_COLORS.textPrimary,
        fontWeight: '700',
    },
    content: {
        flex: 1,
    }
});
