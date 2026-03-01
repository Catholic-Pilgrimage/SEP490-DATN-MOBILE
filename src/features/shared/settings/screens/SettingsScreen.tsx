import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import React, { useState } from 'react';
import {
    Alert,
    ScrollView,
    Share,
    StyleSheet,
    Switch,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SHADOWS } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';

// Theme Colors
const SETTINGS_COLORS = {
    primary: '#cfaa3a',
    primaryLight: 'rgba(207, 170, 58, 0.1)',
    cream: '#FDF8F0',
    charcoal: '#1A1A1A',
    warmGray: '#F7F5F2',
    textMuted: '#6C8CA3',
    borderLight: '#e4e0d3',
    white: '#FFFFFF',
    danger: '#DC4C4C',
};

// Toggle Switch Component
const SettingToggle = ({
    icon,
    label,
    value,
    onValueChange,
    description
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: boolean;
    onValueChange: (val: boolean) => void;
    description?: string;
}) => (
    <View style={styles.settingItem}>
        <View style={styles.settingLeft}>
            <View style={styles.iconContainer}>
                <Ionicons name={icon} size={20} color={SETTINGS_COLORS.primary} />
            </View>
            <View style={styles.textContainer}>
                <Text style={styles.settingLabel}>{label}</Text>
                {description && <Text style={styles.settingDescription}>{description}</Text>}
            </View>
        </View>
        <Switch
            trackColor={{ false: '#e0e0e0', true: SETTINGS_COLORS.primary }}
            thumbColor={SETTINGS_COLORS.white}
            ios_backgroundColor="#e0e0e0"
            onValueChange={onValueChange}
            value={value}
        />
    </View>
);

// Menu Item Component
const SettingItem = ({
    icon,
    label,
    onPress,
    value,
    danger = false,
    isLast = false
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    onPress: () => void;
    value?: string;
    danger?: boolean;
    isLast?: boolean;
}) => (
    <TouchableOpacity
        style={[styles.settingItem, isLast && styles.settingItemLast]}
        onPress={onPress}
        activeOpacity={0.7}
    >
        <View style={styles.settingLeft}>
            <View style={[styles.iconContainer, danger && styles.iconDanger]}>
                <Ionicons
                    name={icon}
                    size={20}
                    color={danger ? SETTINGS_COLORS.danger : SETTINGS_COLORS.primary}
                />
            </View>
            <Text style={[styles.settingLabel, danger && styles.labelDanger]}>{label}</Text>
        </View>
        <View style={styles.settingRight}>
            {value && <Text style={styles.settingValue}>{value}</Text>}
            <Ionicons name="chevron-forward" size={20} color={SETTINGS_COLORS.textMuted} opacity={0.5} />
        </View>
    </TouchableOpacity>
);

// Section Header
const SectionHeader = ({ title }: { title: string }) => (
    <Text style={styles.sectionHeader}>{title}</Text>
);

const SettingsScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<any>();
    const { logout, user } = useAuth();

    // State for toggles
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);
    const [biometricsEnabled, setBiometricsEnabled] = useState(false);
    const [darkModeEnabled, setDarkModeEnabled] = useState(false);

    const handleShareApp = async () => {
        try {
            await Share.share({
                message: 'Tải ngay Nazareth Guild - Ứng dụng đồng hành cùng người hành hương Công giáo!',
                // url: 'https://nazareth-guild.com', // Uncomment when real URL is available
            });
        } catch (error: any) {
            Alert.alert(error.message);
        }
    };

    const handleDeleteAccount = () => {
        Alert.alert(
            "Xoá tài khoản?",
            "Hành động này không thể hoàn tác. Mọi dữ liệu của bạn sẽ bị xoá vĩnh viễn.",
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Xoá vĩnh viễn",
                    style: "destructive",
                    onPress: () => Alert.alert("Yêu cầu đã gửi", "Chúng tôi sẽ xử lý yêu cầu của bạn trong vòng 30 ngày.")
                }
            ]
        );
    };

    const handleLogout = () => {
        Alert.alert(
            "Đăng xuất",
            "Bạn có chắc chắn muốn đăng xuất?",
            [
                { text: "Huỷ", style: "cancel" },
                {
                    text: "Đăng xuất",
                    style: "destructive",
                    onPress: async () => {
                        await logout();
                        navigation.reset({
                            index: 0,
                            routes: [{ name: 'Auth' }],
                        });
                    }
                }
            ]
        );
    };

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={SETTINGS_COLORS.charcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Cài đặt & Quyền riêng tư</Text>
                <View style={styles.headerSpacer} />
            </View>

            <ScrollView
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                {/* Account Section */}
                <SectionHeader title="TÀI KHOẢN" />
                <View style={styles.sectionContainer}>
                    <SettingItem
                        icon="person-outline"
                        label="Thông tin cá nhân"
                        onPress={() => {
                            if (user?.role === 'local_guide') {
                                navigation.navigate('PersonalInfo');
                            } else {
                                navigation.navigate('EditProfile');
                            }
                        }}
                    />
                    <SettingItem
                        icon="briefcase-outline"
                        label="Trở thành Local Guide"
                        onPress={() => navigation.navigate('VerificationRequest')}
                    />
                    <SettingItem
                        icon="key-outline"
                        label="Đổi mật khẩu"
                        onPress={() => navigation.navigate('ChangePassword')}
                        isLast
                    />
                </View>

                {/* General Settings */}
                <SectionHeader title="CÀI ĐẶT CHUNG" />
                <View style={styles.sectionContainer}>
                    <SettingToggle
                        icon="notifications-outline"
                        label="Thông báo đẩy"
                        description="Nhận thông báo về lịch trình và tin tức"
                        value={notificationsEnabled}
                        onValueChange={setNotificationsEnabled}
                    />
                    <View style={styles.divider} />
                    <SettingToggle
                        icon="finger-print-outline"
                        label="Đăng nhập sinh trắc học"
                        value={biometricsEnabled}
                        onValueChange={setBiometricsEnabled}
                    />
                    <View style={styles.divider} />
                    <SettingItem
                        icon="language-outline"
                        label="Ngôn ngữ"
                        value="Tiếng Việt"
                        onPress={() => Alert.alert("Thông báo", "Tính năng đang phát triển")}
                        isLast
                    />
                </View>

                {/* Support & About */}
                <SectionHeader title="HỖ TRỢ & GIỚI THIỆU" />
                <View style={styles.sectionContainer}>
                    <SettingItem
                        icon="help-circle-outline"
                        label="Trung tâm trợ giúp"
                        onPress={() => Alert.alert("Thông báo", "Tính năng đang phát triển")}
                    />
                    <SettingItem
                        icon="share-social-outline"
                        label="Chia sẻ ứng dụng"
                        onPress={handleShareApp}
                    />
                    <SettingItem
                        icon="star-outline"
                        label="Đánh giá ứng dụng"
                        onPress={() => Alert.alert("Cảm ơn", "Cảm ơn bạn đã quan tâm đến ứng dụng!")}
                    />
                    <SettingItem
                        icon="document-text-outline"
                        label="Điều khoản sử dụng"
                        onPress={() => Alert.alert("Thông báo", "Hiển thị điều khoản dịch vụ")}
                    />
                    <SettingItem
                        icon="shield-checkmark-outline"
                        label="Chính sách quyền riêng tư"
                        onPress={() => Alert.alert("Thông báo", "Hiển thị chính sách bảo mật")}
                        isLast
                    />
                </View>

                {/* Logout Button */}
                <TouchableOpacity
                    style={styles.logoutButton}
                    onPress={handleLogout}
                    activeOpacity={0.8}
                >
                    <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
                    <Text style={styles.logoutText}>Đăng xuất</Text>
                </TouchableOpacity>

                <Text style={styles.versionText}>Nazareth Guild v1.0.0</Text>
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SETTINGS_COLORS.cream,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: SETTINGS_COLORS.cream,
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.borderLight,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: SETTINGS_COLORS.charcoal,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerSpacer: {
        width: 40,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingBottom: 40,
    },
    sectionHeader: {
        fontSize: 12,
        fontWeight: '600',
        color: SETTINGS_COLORS.textMuted,
        marginTop: 24,
        marginBottom: 8,
        marginLeft: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    sectionContainer: {
        backgroundColor: SETTINGS_COLORS.white,
        borderRadius: 16,
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: SETTINGS_COLORS.borderLight,
        ...SHADOWS.small,
    },
    settingItem: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: SETTINGS_COLORS.borderLight,
    },
    settingItemLast: {
        borderBottomWidth: 0,
    },
    settingLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: 12,
    },
    iconContainer: {
        width: 32,
        height: 32,
        borderRadius: 8,
        backgroundColor: SETTINGS_COLORS.primaryLight,
        justifyContent: 'center',
        alignItems: 'center',
    },
    iconDanger: {
        backgroundColor: 'rgba(220, 76, 76, 0.1)',
    },
    textContainer: {
        flex: 1,
    },
    settingLabel: {
        fontSize: 15,
        fontWeight: '500',
        color: SETTINGS_COLORS.charcoal,
    },
    labelDanger: {
        color: SETTINGS_COLORS.danger,
    },
    settingDescription: {
        fontSize: 12,
        color: SETTINGS_COLORS.textMuted,
        marginTop: 2,
    },
    settingRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    settingValue: {
        fontSize: 14,
        color: SETTINGS_COLORS.textMuted,
    },
    divider: {
        height: 1,
        backgroundColor: SETTINGS_COLORS.borderLight,
        marginLeft: 60, // Align with text start
    },
    dangerSection: {
        borderColor: 'rgba(220, 76, 76, 0.3)',
    },
    logoutButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 30,
        paddingVertical: 16,
        backgroundColor: SETTINGS_COLORS.primary,
        borderRadius: 16,
        ...SHADOWS.medium,
        // Custom shadow color
        shadowColor: SETTINGS_COLORS.primary,
        shadowOpacity: 0.2,
    },
    logoutText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
    versionText: {
        textAlign: 'center',
        fontSize: 12,
        color: SETTINGS_COLORS.textMuted,
        opacity: 0.6,
        marginTop: 8,
    },
});

export default SettingsScreen;
