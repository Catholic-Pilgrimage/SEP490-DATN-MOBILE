import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHADOWS } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotifications } from '../../../../hooks/useNotifications';
import { useUserQuery } from '../../../../hooks/useUserQuery';
import { NotificationModal } from '../../explore/components/NotificationModal';

// Premium color palette (Adapted from Local Guide Profile)
const PREMIUM_COLORS = {
    gold: '#D4AF37',
    goldLight: '#F4E4BA',
    goldDark: '#B8860B',
    cream: '#FDF8F0',
    charcoal: '#1A1A1A',
    warmGray: '#F7F5F2',
    emerald: '#10B981',
    error: '#DC4C4C',
    textMuted: '#6C8CA3',
};

// Reusable Menu Item Component
const MenuItem = ({
    icon,
    label,
    onPress,
    showLock = false,
    showBadge,
    danger = false,
    isLast = false
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    showLock?: boolean;
    showBadge?: string;
    danger?: boolean;
    isLast?: boolean;
}) => (
    <TouchableOpacity
        style={[styles.menuItem, isLast && styles.menuItemLast]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.menuItemLeft}>
            <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? PREMIUM_COLORS.error : PREMIUM_COLORS.goldDark}
                />
            </View>
            <Text style={[styles.menuItemLabel, danger && styles.menuItemLabelDanger]}>
                {label}
            </Text>
        </View>
        <View style={styles.menuItemRight}>
            {showBadge && (
                <View style={styles.menuBadge}>
                    <Text style={styles.menuBadgeText}>{showBadge}</Text>
                </View>
            )}
            {showLock && (
                <View style={styles.lockIcon}>
                    <Ionicons name="lock-closed" size={14} color={PREMIUM_COLORS.gold} />
                </View>
            )}
            <Ionicons name="chevron-forward" size={20} color={PREMIUM_COLORS.textMuted} opacity={0.5} />
        </View>
    </TouchableOpacity>
);

const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

const ProfileScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { user: contextUser, isGuest, isAuthenticated, logout, exitGuestMode } = useAuth();
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // React Query for real-time profile updates
    const { data: queryUser, refetch, isRefetching } = useUserQuery();
    // Prefer query data over context data for display
    const user = queryUser || contextUser;

    // Refetch on focus (when returning to this screen)
    useFocusEffect(
        useCallback(() => {
            if (isAuthenticated) {
                refetch();
            }
        }, [isAuthenticated, refetch])
    );

    const scrollRef = useRef(null);
    useScrollToTop(scrollRef);

    const { unreadCount } = useNotifications();

    const handleLogin = async () => {
        if (isGuest) {
            await exitGuestMode();
        }
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            })
        );
    };

    const handleLogout = async () => {
        Alert.alert(
            'Đăng xuất',
            'Bạn có chắc chắn muốn đăng xuất?',
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Đăng xuất',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            setIsLoggingOut(true);
                            await logout();
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Auth' }],
                                })
                            );
                        } catch (error) {
                            console.error('Logout error:', error);
                            setIsLoggingOut(false);
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Auth' }],
                                })
                            );
                        }
                    },
                },
            ]
        );
    };

    const menuItems = [
        { icon: 'person-outline', label: 'Thông tin cá nhân', requireAuth: true, route: 'EditProfile' },
        {
            icon: 'notifications-outline',
            label: 'Thông báo',
            requireAuth: true,
            route: 'Notifications',
            showBadge: unreadCount > 0 ? (unreadCount > 99 ? '99+' : unreadCount.toString()) : undefined
        },
        { icon: 'bookmark', label: 'Đã lưu', requireAuth: true, route: 'FavoriteSites' },
        { icon: 'hand-left-outline', label: 'Lịch sử Hỗ trợ', requireAuth: true, route: 'SOSHistory' },
        { icon: 'time-outline', label: 'Lịch sử hành hương', requireAuth: true, route: 'History' },
        { icon: 'settings-outline', label: 'Cài đặt', requireAuth: false, route: 'Settings' },
    ];

    const handleMenuPress = (item: typeof menuItems[0]) => {
        if (item.requireAuth && isGuest) {
            Alert.alert(
                'Yêu cầu đăng nhập',
                'Vui lòng đăng nhập để sử dụng tính năng này.',
                [
                    { text: 'Để sau', style: 'cancel' },
                    { text: 'Đăng nhập', onPress: () => handleLogin() },
                ]
            );
            return;
        }

        if (item.route === 'Notifications') {
            setShowNotifications(true);
            return;
        }

        if (item.route === 'FavoriteSites' || item.route === 'EditProfile' || item.route === 'SOSHistory' || item.route === 'Settings') {
            navigation.navigate(item.route);
        } else {
            Alert.alert("Thông báo", "Tính năng đang phát triển");
        }
    };

    // Group menu items
    const accountItems = menuItems.slice(0, 4);
    const settingsItems = menuItems.slice(4);

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.cream} />

            {/* Header */}
            <View style={styles.header}>
                <View style={styles.headerSpacer} />
                <Text style={styles.headerTitle}>Hồ sơ</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                ref={scrollRef}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={
                    <RefreshControl refreshing={isRefetching} onRefresh={refetch} colors={[PREMIUM_COLORS.goldDark]} />
                }
            >
                <View style={styles.profileHeader}>
                    {/* Avatar */}
                    {/* Avatar - Clickable to Edit */}
                    <TouchableOpacity
                        style={styles.avatarContainer}
                        activeOpacity={0.9}
                        onPress={() => navigation.navigate('EditProfile')}
                        disabled={!isAuthenticated}
                    >
                        <LinearGradient
                            colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
                            style={styles.avatarBorder}
                        >
                            <View style={styles.avatarInner}>
                                {isAuthenticated ? (
                                    user?.avatar ? (
                                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[styles.avatarImage, { backgroundColor: PREMIUM_COLORS.gold, justifyContent: 'center', alignItems: 'center' }]}>
                                            <Text style={{ fontSize: 32, fontWeight: 'bold', color: PREMIUM_COLORS.cream }}>
                                                {(() => {
                                                    const name = user?.fullName || (user?.email ? user.email.split('@')[0] : 'Pilgrim');
                                                    const parts = name.trim().split(' ');
                                                    if (parts.length === 1 && parts[0].length > 1) return parts[0].substring(0, 2).toUpperCase();
                                                    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                                                    return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                                })()}
                                            </Text>
                                        </View>
                                    )
                                ) : (
                                    <View style={[styles.avatarImage, { backgroundColor: PREMIUM_COLORS.goldLight, justifyContent: 'center', alignItems: 'center' }]}>
                                        <MaterialIcons name="person" size={40} color={PREMIUM_COLORS.goldDark} />
                                    </View>
                                )}
                            </View>
                        </LinearGradient>
                    </TouchableOpacity>

                    <Text style={styles.profileName}>
                        {isGuest ? 'Khách hành hương' : user?.fullName || 'Người hành hương'}
                    </Text>
                    <Text style={styles.profileRole}>
                        {isGuest ? 'Chưa đăng nhập' : user?.email || 'Pilgrim'}
                    </Text>
                </View>

                {/* Guest Login Banner */}


                {/* Stats Card */}
                <View style={styles.statsCard}>
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Hành hương</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Đã lưu</Text>
                    </View>
                    <View style={styles.statDivider} />
                    <View style={styles.statItem}>
                        <Text style={styles.statNumber}>0</Text>
                        <Text style={styles.statLabel}>Đánh giá</Text>
                    </View>
                </View>

                {/* Account Section */}
                <SectionHeader title="TÀI KHOẢN" />
                <View style={styles.menuSection}>
                    {accountItems.map((item, index) => (
                        <MenuItem
                            key={index}
                            {...item}
                            icon={item.icon as any}
                            onPress={() => handleMenuPress(item)}
                            isLast={index === accountItems.length - 1}
                            showLock={isGuest && item.requireAuth}
                        />
                    ))}
                </View>

                {/* Settings Section */}
                <SectionHeader title="CÀI ĐẶT" />
                <View style={styles.menuSection}>
                    {settingsItems.map((item, index) => (
                        <MenuItem
                            key={index}
                            {...item}
                            icon={item.icon as any}
                            onPress={() => handleMenuPress(item)}
                            isLast={index === settingsItems.length - 1}
                        />
                    ))}
                </View>

                {/* Login or Logout Button */}
                {/* Login or Logout Button */}
                <TouchableOpacity
                    style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]}
                    onPress={isGuest ? handleLogin : handleLogout}
                    disabled={isLoggingOut}
                    activeOpacity={0.8}
                >
                    {isLoggingOut ? (
                        <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                        <Ionicons
                            name={isGuest ? "log-in-outline" : "log-out-outline"}
                            size={20}
                            color="#FFFFFF"
                        />
                    )}
                    <Text style={styles.signOutText}>
                        {isGuest ? "Đăng nhập / Đăng ký" : (isLoggingOut ? "Đang đăng xuất..." : "Đăng xuất")}
                    </Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Phiên bản 1.0.0</Text>
            </ScrollView>

            <NotificationModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: PREMIUM_COLORS.cream,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PREMIUM_COLORS.charcoal,
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingBottom: 40,
    },

    // Profile Header
    profileHeader: {
        alignItems: 'center',
        paddingVertical: 24,
    },
    avatarContainer: {
        position: 'relative',
        marginBottom: 16,
    },
    avatarBorder: {
        width: 88,
        height: 88,
        borderRadius: 44,
        padding: 3,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 42,
        overflow: 'hidden',
        backgroundColor: PREMIUM_COLORS.cream,
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    profileName: {
        fontSize: 22,
        fontWeight: '700',
        color: PREMIUM_COLORS.charcoal,
        marginBottom: 4,
    },
    profileRole: {
        fontSize: 14,
        color: PREMIUM_COLORS.textMuted,
    },

    // Login Banner
    loginBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        marginHorizontal: 24,
        marginBottom: 20,
        padding: 16,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.goldLight,
        ...Platform.select({
            ios: { shadowColor: PREMIUM_COLORS.gold, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 }
        })
    },
    loginIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: `${PREMIUM_COLORS.gold}15`,
        justifyContent: 'center',
        alignItems: 'center',
        marginRight: 12,
    },
    loginBannerContent: {
        flex: 1,
    },
    loginBannerTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: PREMIUM_COLORS.charcoal,
    },
    loginBannerSubtitle: {
        fontSize: 13,
        color: PREMIUM_COLORS.textMuted,
        marginTop: 2,
    },

    // Stats Card
    statsCard: {
        flexDirection: 'row',
        marginHorizontal: 24,
        marginTop: 8,
        paddingVertical: 16,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.goldLight,
        ...Platform.select({
            ios: { shadowColor: PREMIUM_COLORS.gold, shadowOpacity: 0.1, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
            android: { elevation: 2 }
        })
    },
    statItem: {
        flex: 1,
        alignItems: 'center',
    },
    statNumber: {
        fontSize: 24,
        fontWeight: '700',
        color: PREMIUM_COLORS.gold,
    },
    statLabel: {
        fontSize: 12,
        color: PREMIUM_COLORS.textMuted,
        marginTop: 2,
    },
    statDivider: {
        width: 1,
        height: 36,
        backgroundColor: PREMIUM_COLORS.goldLight,
    },

    // Section Header
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: PREMIUM_COLORS.textMuted,
        letterSpacing: 1,
        marginTop: 32,
        marginBottom: 8,
        marginHorizontal: 24,
        textTransform: 'uppercase',
    },

    // Menu Section
    menuSection: {
        marginHorizontal: 24,
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.goldLight,
    },
    menuItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: `${PREMIUM_COLORS.goldLight}80`,
    },
    menuItemLast: {
        borderBottomWidth: 0,
    },
    menuItemLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    menuIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 10,
        backgroundColor: PREMIUM_COLORS.goldLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    menuIconDanger: {
        backgroundColor: `${PREMIUM_COLORS.error}15`,
    },
    menuItemLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: PREMIUM_COLORS.charcoal,
    },
    menuItemLabelDanger: {
        color: PREMIUM_COLORS.error,
    },
    menuItemRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    menuBadge: {
        minWidth: 20,
        height: 20,
        borderRadius: 10,
        backgroundColor: PREMIUM_COLORS.error,
        alignItems: 'center',
        justifyContent: 'center',
        paddingHorizontal: 6,
    },
    menuBadgeText: {
        fontSize: 11,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    lockIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: `${PREMIUM_COLORS.gold}20`,
        alignItems: 'center',
        justifyContent: 'center',
    },

    // Sign out
    signOutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginHorizontal: 24,
        marginTop: 32,
        paddingVertical: 16,
        backgroundColor: PREMIUM_COLORS.gold,
        borderRadius: 20,
        ...SHADOWS.medium,
    },
    signOutButtonDisabled: {
        opacity: 0.7,
    },
    signOutText: {
        fontSize: 16,
        fontWeight: '600',
        color: '#FFFFFF',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: PREMIUM_COLORS.textMuted,
        marginTop: 24,
        opacity: 0.6,
    },
});

export default ProfileScreen;
