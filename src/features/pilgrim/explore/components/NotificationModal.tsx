import { Ionicons } from '@expo/vector-icons';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import isToday from 'dayjs/plugin/isToday';
import relativeTime from 'dayjs/plugin/relativeTime';
import updateLocale from 'dayjs/plugin/updateLocale';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Modal,
    PanResponder,
    Platform,
    SectionList,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import { GestureHandlerRootView, Swipeable } from 'react-native-gesture-handler';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../../constants/theme.constants';
import { useNotifications } from '../../../../hooks/useNotifications';
import notificationApi, { Notification, NotificationType } from '../../../../services/api/shared/notificationApi';

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.extend(updateLocale);

dayjs.updateLocale('vi', {
    relativeTime: {
        future: 'trong %s',
        past: '%s trước',
        s: 'vài giây',
        m: '1 phút',
        mm: '%d phút',
        h: '1 giờ',
        hh: '%d giờ',
        d: '1 ngày',
        dd: '%d ngày',
        M: '1 tháng',
        MM: '%d tháng',
        y: '1 năm',
        yy: '%d năm',
    },
});
dayjs.locale('vi');

interface Props {
    visible: boolean;
    onClose: () => void;
}

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

type FilterTab = 'all' | 'schedule' | 'system';

export const NotificationModal: React.FC<Props> = ({ visible, onClose }) => {
    const insets = useSafeAreaInsets();
    const [activeTab, setActiveTab] = useState<FilterTab>('all');
    // Animation refs
    const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const {
        notifications,
        unreadCount,
        loading,
        loadingMore,
        hasMore,
        fetchNotifications,
        loadMoreNotifications,
        markAsRead,
        markAllAsRead,
        deleteNotification,
        deleteAllNotifications,
        error,
    } = useNotifications();

    useEffect(() => {
        if (visible) {
            // Animate In: Slide Up + Fade In Background
            Animated.parallel([
                Animated.spring(slideAnim, {
                    toValue: 0,
                    useNativeDriver: true,
                    damping: 20,
                    mass: 0.8,
                    stiffness: 100,
                }),
                Animated.timing(fadeAnim, {
                    toValue: 1,
                    duration: 300,
                    useNativeDriver: true,
                }),
            ]).start();

            fetchNotifications();
        } else {
            // Reset for next open
            slideAnim.setValue(SCREEN_HEIGHT);
            fadeAnim.setValue(0);
        }
    }, [visible]);

    const handleClose = () => {
        // Animate Out
        Animated.parallel([
            Animated.timing(slideAnim, {
                toValue: SCREEN_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }),
            Animated.timing(fadeAnim, {
                toValue: 0,
                duration: 200,
                useNativeDriver: true,
            }),
        ]).start(() => onClose());
    };

    // Pan Responder for Drag to Dismiss
    const panResponder = useRef(
        PanResponder.create({
            onStartShouldSetPanResponder: () => true,
            onMoveShouldSetPanResponder: (_, gestureState) => {
                // Only allow vertical detailed drag, and only if moving down
                return gestureState.dy > 5;
            },
            onPanResponderMove: (_, gestureState) => {
                if (gestureState.dy > 0) {
                    slideAnim.setValue(gestureState.dy);
                }
            },
            onPanResponderRelease: (_, gestureState) => {
                if (gestureState.dy > 150) {
                    handleClose();
                } else {
                    Animated.spring(slideAnim, {
                        toValue: 0,
                        useNativeDriver: true,
                    }).start();
                }
            },
        })
    ).current;

    const checkPermission = async () => {
        // Permission check logic
    };

    // Filter Notifications
    const filteredNotifications = useMemo(() => {
        if (activeTab === 'all') return notifications;
        return notifications.filter(n => {
            const category = notificationApi.getNotificationCategory(n.type);
            if (activeTab === 'schedule') return category === 'shift' || category === 'planner';
            if (activeTab === 'system') return category === 'account' || category === 'content' || category === 'sos';
            return true;
        });
    }, [notifications, activeTab]);

    // Group Notifications
    const sections = useMemo(() => {
        const now = dayjs();
        const newitems: Notification[] = [];
        const todayItems: Notification[] = [];
        const earlierItems: Notification[] = [];

        filteredNotifications.forEach(item => {
            const itemTime = dayjs(item.createdAt);
            const diffHours = now.diff(itemTime, 'hour');
            if (!item.isRead && diffHours < 24) {
                newitems.push(item);
            } else if (itemTime.isToday()) {
                todayItems.push(item);
            } else {
                earlierItems.push(item);
            }
        });

        const result = [];
        if (newitems.length > 0) result.push({ title: 'Mới nhất', data: newitems });
        if (todayItems.length > 0) result.push({ title: 'Hôm nay', data: todayItems });
        if (earlierItems.length > 0) result.push({ title: 'Trước đó', data: earlierItems });
        return result;
    }, [filteredNotifications]);

    const getIconInfo = (type: NotificationType) => {
        const category = notificationApi.getNotificationCategory(type);
        let name = "notifications";
        let color = COLORS.primary;
        let bg = `${COLORS.primary}15`;

        switch (category) {
            case 'shift':
            case 'planner':
                name = "calendar";
                color = "#B8860B"; // Dark Goldenrod
                bg = "rgba(184, 134, 11, 0.12)"; // Soft gold
                break;
            case 'sos':
                name = "alert-circle";
                color = "#D32F2F";
                bg = "rgba(211, 47, 47, 0.12)"; // Soft red
                break;
            case 'content':
                if (type.includes('approved')) {
                    name = "checkmark-circle";
                    color = "#388E3C";
                    bg = "rgba(56, 142, 60, 0.12)"; // Soft green
                } else {
                    name = "close-circle";
                    color = "#D32F2F";
                    bg = "rgba(211, 47, 47, 0.12)";
                }
                break;
            case 'account':
                name = "person";
                color = COLORS.primary;
                bg = "rgba(26, 40, 69, 0.12)"; // Soft primary
                break;
        }
        return { name, color, bg };
    };

    const renderRightActions = (id: string) => {
        return (
            <TouchableOpacity
                style={styles.deleteAction}
                onPress={() => deleteNotification(id)}
            >
                <Ionicons name="trash-outline" size={24} color="#FFF" />
            </TouchableOpacity>
        );
    };

    const renderItem = ({ item, index }: { item: Notification, index: number }) => {
        const { name, color, bg } = getIconInfo(item.type);

        // Staggered Animation for Items
        // We use a simple fade-in for now, can be complexified if needed
        // For cleaner code, we just render directly. 
        // Can add Animated.View here if strict staggered load is needed, but SectionList handles lazy load.

        return (
            <Swipeable renderRightActions={() => renderRightActions(item.id)}>
                <TouchableOpacity
                    style={[
                        styles.itemContainer,
                        !item.isRead ? styles.itemUnread : styles.itemRead
                    ]}
                    onPress={() => markAsRead(item.id)}
                    activeOpacity={0.7}
                >
                    <View style={[styles.iconContainer, { backgroundColor: bg }]}>
                        <Ionicons name={name as any} size={24} color={color} />
                    </View>
                    <View style={styles.itemContent}>
                        <View style={styles.itemHeader}>
                            <Text
                                style={[
                                    styles.itemTitle,
                                    item.isRead ? styles.textRead : styles.textUnread
                                ]}
                                numberOfLines={1}
                            >
                                {item.title}
                            </Text>
                            <View style={styles.metaContainer}>
                                <Text style={styles.itemTime}>{dayjs(item.createdAt).fromNow()}</Text>
                                {!item.isRead && <View style={styles.unreadDot} />}
                            </View>
                        </View>
                        <Text
                            style={[
                                styles.itemMessage,
                                item.isRead && { color: COLORS.textTertiary }
                            ]}
                            numberOfLines={2}
                        >
                            {item.message}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Swipeable>
        );
    };

    const renderHeader = () => (
        <View style={styles.tabsWrapper}>
            <View style={styles.tabContainer}>
                {(['all', 'schedule', 'system'] as FilterTab[]).map((tab) => (
                    <TouchableOpacity
                        key={tab}
                        style={[styles.tab, activeTab === tab && styles.activeTab]}
                        onPress={() => setActiveTab(tab)}
                    >
                        <Text style={[styles.tabText, activeTab === tab && styles.activeTabText]}>
                            {tab === 'all' ? 'Tất cả' : tab === 'schedule' ? 'Lịch trình' : 'Hệ thống'}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>
        </View>
    );

    const renderSectionHeader = ({ section: { title } }: any) => (
        <View style={styles.sectionHeader}>
            <Text style={styles.sectionHeaderText}>{title}</Text>
        </View>
    );

    return (
        <Modal
            visible={visible}
            animationType="none" // Controlled by Animated API manually
            transparent={true}
            onRequestClose={handleClose}
            statusBarTranslucent
        >
            <GestureHandlerRootView style={{ flex: 1 }}>
                <View style={styles.overlayWrapper}>
                    {/* Dark Background Fade */}
                    <TouchableWithoutFeedback onPress={handleClose}>
                        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]} />
                    </TouchableWithoutFeedback>

                    {/* Floating Modal Sheet */}
                    <Animated.View
                        style={[
                            styles.floatingSheet,
                            {
                                transform: [{ translateY: slideAnim }],
                                paddingTop: 20,
                                // Apply safe area to margin to lift the sheet above nav bar
                                marginBottom: insets.bottom + 20,
                                // Standard internal padding
                                paddingBottom: 20
                            }
                        ]}
                    >
                        {/* Drag Handle */}
                        <View style={styles.dragHandleArea} {...panResponder.panHandlers}>
                            <View style={styles.dragIndicator} />
                        </View>

                        {/* Header */}
                        <View style={styles.header}>
                            <Text style={styles.headerTitle}>Thông báo</Text>
                            <View style={styles.headerActions}>
                                {unreadCount > 0 && (
                                    <TouchableOpacity onPress={markAllAsRead} style={styles.actionButton}>
                                        <Ionicons name="checkmark-done-circle-outline" size={26} color={COLORS.primary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                        </View>

                        {/* Content */}
                        {loading && notifications.length === 0 ? (
                            <View style={styles.centerContainer}>
                                <ActivityIndicator size="large" color={COLORS.primary} />
                            </View>
                        ) : filteredNotifications.length === 0 ? (
                            <View style={styles.emptyContainer}>
                                <View style={styles.emptyIconBg}>
                                    <Ionicons name="notifications-off-outline" size={40} color={COLORS.textSecondary} />
                                </View>
                                <Text style={styles.emptyTitle}>Thật yên bình!</Text>
                                <Text style={styles.emptyText}>Bạn chưa có thông báo mới nào.</Text>
                                <TouchableOpacity onPress={handleClose} style={styles.backButton}>
                                    <Text style={styles.backButtonText}>Quay về</Text>
                                </TouchableOpacity>
                            </View>
                        ) : (
                            <SectionList
                                sections={sections}
                                keyExtractor={(item) => item.id}
                                renderItem={renderItem}
                                renderSectionHeader={renderSectionHeader}
                                ListHeaderComponent={renderHeader}
                                stickySectionHeadersEnabled={false}
                                contentContainerStyle={styles.listContent}
                                refreshing={loading}
                                onRefresh={fetchNotifications}
                                showsVerticalScrollIndicator={false}
                                extraData={[loadingMore, error]} // Ensure footer updates when state changes
                                onEndReached={() => {
                                    if (hasMore && !loadingMore && !loading) {
                                        loadMoreNotifications();
                                    }
                                }}
                                onEndReachedThreshold={0.2} // Increase slightly to ensure trigger before absolute bottom
                                ListFooterComponent={
                                    loadingMore ? (
                                        <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                                            <ActivityIndicator size="small" color={COLORS.primary} />
                                        </View>
                                    ) : (
                                        error ? (
                                            <TouchableOpacity
                                                onPress={loadMoreNotifications}
                                                style={{ paddingVertical: 30, alignItems: 'center', justifyContent: 'center' }}
                                            >
                                                <Text style={{ color: '#FF3B30', fontSize: 13, marginBottom: 4 }}>Không thể tải thêm thông báo</Text>
                                                <Text style={{ color: COLORS.primary, fontSize: 13, fontWeight: '600' }}>Nhấn để thử lại</Text>
                                            </TouchableOpacity>
                                        ) : (
                                            !hasMore && notifications.length > 0 ? (
                                                <View style={{ paddingVertical: 40, alignItems: 'center', justifyContent: 'center' }}>
                                                    <Text style={{ color: '#9E9E9E', fontSize: 13, fontStyle: 'italic' }}>Bạn đã xem hết thông báo</Text>
                                                </View>
                                            ) : <View style={{ height: 40 }} /> // Increased spacer for better scrolling experience
                                        )
                                    )
                                }
                            />
                        )}
                    </Animated.View>
                </View>
            </GestureHandlerRootView >
        </Modal >
    );
};

const styles = StyleSheet.create({
    overlayWrapper: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    floatingSheet: {
        backgroundColor: '#FCFCFC',
        marginHorizontal: 16,
        // marginBottom removed here, handled dynamically with insets
        borderRadius: 24, // Strong rounded corners
        maxHeight: SCREEN_HEIGHT * 0.85,
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 10,
        },
        shadowOpacity: 0.25,
        shadowRadius: 20,
        elevation: 10,
        overflow: 'hidden',
    },
    dragHandleArea: {
        width: '100%',
        height: 30,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 8,
    },
    dragIndicator: {
        width: 40,
        height: 5,
        borderRadius: 3,
        backgroundColor: '#E0E0E0',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.md,
    },
    headerTitle: {
        fontSize: 28,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    headerActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionButton: {
        padding: 4,
    },
    tabsWrapper: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: SPACING.sm,
    },
    tabContainer: {
        flexDirection: 'row',
        gap: 12,
    },
    tab: {
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        backgroundColor: '#F0F0F0',
    },
    activeTab: {
        backgroundColor: COLORS.primary,
    },
    tabText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        fontWeight: '600',
    },
    activeTabText: {
        color: '#FFFFFF',
    },
    listContent: {
        paddingBottom: 20,
    },
    sectionHeader: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: 12,
        backgroundColor: '#FCFCFC', // Sticky header bg if needed, but we disabled sticky
    },
    sectionHeaderText: {
        fontSize: 13,
        fontWeight: '700',
        color: '#9E9E9E',
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    itemContainer: {
        flexDirection: 'row',
        paddingVertical: 16,
        paddingHorizontal: SPACING.lg,
        alignItems: 'center',
    },
    itemUnread: {
        backgroundColor: '#FEFCE8',
    },
    itemRead: {
        backgroundColor: 'transparent',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D4AF37',
        marginLeft: 6,
    },
    metaContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 16,
    },
    itemContent: {
        flex: 1,
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 4,
    },
    itemTitle: {
        fontSize: 15,
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    textUnread: {
        fontWeight: '700',
    },
    textRead: {
        fontWeight: '400',
        color: '#424242',
    },
    itemTime: {
        fontSize: 12,
        color: '#9E9E9E',
        fontWeight: '500',
    },
    itemMessage: {
        fontSize: 13,
        color: '#757575',
        lineHeight: 18,
    },
    deleteAction: {
        backgroundColor: '#FF3B30',
        justifyContent: 'center',
        alignItems: 'center',
        width: 80,
    },
    centerContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        height: 300,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 40,
        marginTop: 60,
    },
    emptyIconBg: {
        width: 100,
        height: 100,
        borderRadius: 50,
        backgroundColor: '#F5F5F5',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 24,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 8,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    emptyText: {
        fontSize: 15,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    backButton: {
        paddingVertical: 12,
        paddingHorizontal: 32,
        backgroundColor: COLORS.surface1,
        borderRadius: 24,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    backButtonText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
});
