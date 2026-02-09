import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Image,
    KeyboardAvoidingView,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SHADOWS } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { UserProfile } from '../../../../types/user.types';

// Premium color palette (Consistent with ProfileScreen)
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
    borderLight: '#e4e0d3',
};

// Info Row Component
interface InfoRowProps {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    editable?: boolean;
    onChangeText?: (text: string) => void;
    isEditing?: boolean;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'phone-pad';
    multiline?: boolean;
}

const InfoRow = ({
    icon,
    label,
    value,
    editable = false,
    onChangeText,
    isEditing = false,
    placeholder,
    keyboardType = 'default',
    multiline = false,
}: InfoRowProps) => (
    <View style={styles.infoRow}>
        <View style={styles.infoRowLeft}>
            <View style={styles.infoIconContainer}>
                <Ionicons name={icon} size={20} color={PREMIUM_COLORS.gold} />
            </View>
            <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>{label}</Text>
                {isEditing && editable ? (
                    <TextInput
                        style={[styles.infoInput, multiline && styles.infoInputMultiline]}
                        value={value}
                        onChangeText={onChangeText}
                        placeholder={placeholder}
                        placeholderTextColor={PREMIUM_COLORS.textMuted}
                        keyboardType={keyboardType}
                        multiline={multiline}
                        textAlignVertical={multiline ? 'top' : 'center'}
                    />
                ) : (
                    <Text style={styles.infoValue}>{value || "Chưa cập nhật"}</Text>
                )}
            </View>
        </View>
        {editable && !isEditing && (
            <Ionicons name="create-outline" size={18} color={PREMIUM_COLORS.textMuted} />
        )}
    </View>
);

// Section Component
const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <View style={styles.sectionContent}>{children}</View>
    </View>
);

const EditProfileScreen = () => {
    const insets = useSafeAreaInsets();
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const { user, updateProfile, getProfile, isLoading: isAuthLoading } = useAuth();

    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    // Cast user to UserProfile to access optional fields if they exist in runtime
    const userProfile = user as UserProfile;

    // Form state
    const [formData, setFormData] = useState({
        fullName: '',
        phone: '',
        dateOfBirth: '',
    });

    // Refresh profile on mount to ensure we have latest data (and mapped correctly)
    useEffect(() => {
        getProfile();
    }, []);

    // Initialize form with profile data
    useEffect(() => {
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                dateOfBirth: userProfile.dateOfBirth || '',
            });
        }
    }, [userProfile]);

    const [refreshing, setRefreshing] = useState(false);

    const onRefresh = useCallback(async () => {
        setRefreshing(true);
        await getProfile();
        setRefreshing(false);
    }, [getProfile]);

    const handleBack = useCallback(() => {
        if (isEditing) {
            Alert.alert(
                "Huỷ thay đổi?",
                "Các thay đổi chưa lưu sẽ bị mất.",
                [
                    { text: "Tiếp tục chỉnh sửa", style: "cancel" },
                    {
                        text: "Huỷ",
                        style: "destructive",
                        onPress: () => {
                            setIsEditing(false);
                            // Reset form
                            if (userProfile) {
                                setFormData({
                                    fullName: userProfile.fullName || '',
                                    phone: userProfile.phone || '',
                                    dateOfBirth: userProfile.dateOfBirth || '',
                                });
                            }
                            navigation.goBack();
                        },
                    },
                ]
            );
        } else {
            navigation.goBack();
        }
    }, [isEditing, navigation, userProfile]);

    const handleEdit = useCallback(() => {
        setIsEditing(true);
    }, []);

    const handleCancel = useCallback(() => {
        setIsEditing(false);
        // Reset form
        if (userProfile) {
            setFormData({
                fullName: userProfile.fullName || '',
                phone: userProfile.phone || '',
                dateOfBirth: userProfile.dateOfBirth || '',
            });
        }
    }, [userProfile]);

    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true);
            await updateProfile(formData);

            Alert.alert("Thành công", "Thông tin đã được cập nhật");
            setIsEditing(false);
            // Refresh profile data
            await getProfile();
        } catch (error: any) {
            Alert.alert("Lỗi", error.message || "Không thể cập nhật thông tin. Vui lòng thử lại.");
        } finally {
            setIsSaving(false);
        }
    }, [formData, updateProfile, getProfile]);

    const updateFormField = useCallback(
        (field: keyof typeof formData) => (value: string) => {
            setFormData((prev) => ({ ...prev, [field]: value }));
        },
        []
    );

    // Format date for display
    const formatDate = (dateString: string) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            // Check if valid date
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
            });
        } catch {
            return dateString;
        }
    };

    // Format datetime for display
    const formatDateTime = (dateString: string) => {
        if (!dateString) return "";
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
            });
        } catch {
            return dateString;
        }
    };

    if (isAuthLoading && !user) {
        return (
            <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
                <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
                <Text style={styles.loadingText}>Đang tải thông tin...</Text>
            </View>
        );
    }

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" backgroundColor={PREMIUM_COLORS.cream} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                    <MaterialIcons name="arrow-back-ios" size={20} color={PREMIUM_COLORS.charcoal} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Thông tin cá nhân</Text>
                {isEditing ? (
                    <TouchableOpacity style={styles.headerButton} onPress={handleCancel}>
                        <Text style={styles.cancelButtonText}>Huỷ</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity style={styles.headerButton} onPress={handleEdit}>
                        <Text style={styles.editButtonText}>Sửa</Text>
                    </TouchableOpacity>
                )}
            </View>

            <KeyboardAvoidingView
                style={styles.flex}
                behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
                <ScrollView
                    style={styles.scrollView}
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                    refreshControl={
                        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[PREMIUM_COLORS.gold]} tintColor={PREMIUM_COLORS.gold} />
                    }
                >
                    {/* Avatar Section */}
                    <View style={styles.avatarSection}>
                        <View style={styles.avatarWrapper}>
                            <LinearGradient
                                colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
                                style={styles.avatarBorder}
                            >
                                <View style={styles.avatarInner}>
                                    {user?.avatar ? (
                                        <Image source={{ uri: user.avatar }} style={styles.avatarImage} />
                                    ) : (
                                        <View style={[styles.avatarImage, { backgroundColor: PREMIUM_COLORS.goldLight, justifyContent: 'center', alignItems: 'center' }]}>
                                            <MaterialIcons name="person" size={40} color={PREMIUM_COLORS.goldDark} />
                                        </View>
                                    )}
                                </View>
                            </LinearGradient>
                            {user?.isVerified && (
                                <View style={styles.verifiedBadge}>
                                    <MaterialIcons name="verified" size={22} color={PREMIUM_COLORS.gold} />
                                </View>
                            )}
                        </View>
                        {isEditing && (
                            <TouchableOpacity style={styles.changeAvatarButton}>
                                <Ionicons name="camera-outline" size={16} color={PREMIUM_COLORS.gold} />
                                <Text style={styles.changeAvatarText}>Đổi ảnh</Text>
                            </TouchableOpacity>
                        )}
                        <Text style={styles.avatarName}>{user?.fullName || "Người hành hương"}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleBadgeText}>
                                {user?.isVerified ? "Hành hương viên (Đã xác minh)" : "Hành hương viên"}
                            </Text>
                        </View>
                    </View>

                    {/* Basic Information */}
                    <Section title="THÔNG TIN CƠ BẢN">
                        <InfoRow
                            icon="person-outline"
                            label="Họ và tên"
                            value={isEditing ? formData.fullName : userProfile?.fullName || ""}
                            editable
                            isEditing={isEditing}
                            onChangeText={updateFormField("fullName")}
                            placeholder="Nhập họ và tên"
                        />
                        <InfoRow
                            icon="mail-outline"
                            label="Email"
                            value={userProfile?.email || ""}
                            editable={false}
                        />
                        <InfoRow
                            icon="call-outline"
                            label="Số điện thoại"
                            value={isEditing ? formData.phone : userProfile?.phone || ""}
                            editable
                            isEditing={isEditing}
                            onChangeText={updateFormField("phone")}
                            placeholder="Nhập số điện thoại"
                            keyboardType="phone-pad"
                        />
                        <InfoRow
                            icon="calendar-outline"
                            label="Ngày sinh"
                            value={
                                isEditing
                                    ? formData.dateOfBirth
                                    : formatDate(userProfile?.dateOfBirth || "")
                            }
                            editable
                            isEditing={isEditing}
                            onChangeText={updateFormField("dateOfBirth")}
                            placeholder="YYYY-MM-DD"
                        />
                    </Section>

                    {/* Account Information */}
                    <Section title="THÔNG TIN TÀI KHOẢN">
                        <InfoRow
                            icon="shield-checkmark-outline"
                            label="Trạng thái xác minh"
                            value={user?.isVerified ? "Đã xác minh" : "Chưa xác minh"}
                        />
                        <InfoRow
                            icon="time-outline"
                            label="Ngày tham gia"
                            value={formatDateTime(user?.createdAt || "")}
                        />
                    </Section>

                    {/* Save Button */}
                    {isEditing && (
                        <TouchableOpacity
                            style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                            onPress={handleSave}
                            disabled={isSaving}
                            activeOpacity={0.8}
                        >
                            {isSaving ? (
                                <ActivityIndicator size="small" color="#FFFFFF" />
                            ) : (
                                <>
                                    <Ionicons name="checkmark-outline" size={20} color="#FFFFFF" />
                                    <Text style={styles.saveButtonText}>Lưu thay đổi</Text>
                                </>
                            )}
                        </TouchableOpacity>
                    )}

                    <View style={{ height: 40 }} />
                </ScrollView>
            </KeyboardAvoidingView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: PREMIUM_COLORS.cream,
    },
    flex: {
        flex: 1,
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        marginTop: 16,
        fontSize: 14,
        color: PREMIUM_COLORS.textMuted,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: PREMIUM_COLORS.cream,
        borderBottomWidth: 1,
        borderBottomColor: PREMIUM_COLORS.borderLight,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: PREMIUM_COLORS.charcoal,
    },
    headerButton: {
        paddingHorizontal: 8,
        paddingVertical: 4,
    },
    editButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: PREMIUM_COLORS.gold,
    },
    cancelButtonText: {
        fontSize: 15,
        fontWeight: '600',
        color: PREMIUM_COLORS.error,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 24,
        paddingTop: 24,
    },

    // Avatar Section
    avatarSection: {
        alignItems: 'center',
        marginBottom: 32,
    },
    avatarWrapper: {
        position: 'relative',
        marginBottom: 8,
    },
    avatarBorder: {
        width: 100,
        height: 100,
        borderRadius: 50,
        padding: 3,
    },
    avatarInner: {
        flex: 1,
        borderRadius: 47,
        backgroundColor: PREMIUM_COLORS.cream,
        overflow: 'hidden',
    },
    avatarImage: {
        width: '100%',
        height: '100%',
    },
    verifiedBadge: {
        position: 'absolute',
        bottom: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 2,
        ...SHADOWS.small,
    },
    changeAvatarButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingVertical: 4,
        paddingHorizontal: 8,
        marginTop: 4,
    },
    changeAvatarText: {
        fontSize: 13,
        fontWeight: '600',
        color: PREMIUM_COLORS.gold,
    },
    avatarName: {
        fontSize: 20,
        fontWeight: '700',
        color: PREMIUM_COLORS.charcoal,
        marginTop: 8,
    },
    roleBadge: {
        backgroundColor: PREMIUM_COLORS.goldLight,
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 100,
        marginTop: 8,
    },
    roleBadgeText: {
        fontSize: 12,
        fontWeight: '600',
        color: PREMIUM_COLORS.goldDark,
    },

    // Section
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 12,
        fontWeight: '600',
        color: PREMIUM_COLORS.textMuted,
        letterSpacing: 0.5,
        marginBottom: 12,
        textTransform: 'uppercase',
    },
    sectionContent: {
        backgroundColor: '#FFFFFF',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: PREMIUM_COLORS.goldLight,
        overflow: 'hidden',
        ...SHADOWS.small,
    },

    // Info Row
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingVertical: 16,
        paddingHorizontal: 16,
        borderBottomWidth: 1,
        borderBottomColor: PREMIUM_COLORS.borderLight,
    },
    infoRowLeft: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    infoIconContainer: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: PREMIUM_COLORS.goldLight,
        alignItems: 'center',
        justifyContent: 'center',
    },
    infoContent: {
        flex: 1,
    },
    infoLabel: {
        fontSize: 12,
        fontWeight: '500',
        color: PREMIUM_COLORS.textMuted,
        marginBottom: 2,
    },
    infoValue: {
        fontSize: 15,
        fontWeight: '500',
        color: PREMIUM_COLORS.charcoal,
    },
    infoInput: {
        fontSize: 15,
        fontWeight: '500',
        color: PREMIUM_COLORS.charcoal,
        padding: 0,
        borderBottomWidth: 1,
        borderBottomColor: PREMIUM_COLORS.gold,
        paddingBottom: 4,
        height: 30, // Fixed height for single line
    },
    infoInputMultiline: {
        height: 80,
        borderBottomWidth: 1,
        borderBottomColor: PREMIUM_COLORS.gold,
    },

    // Save Button
    saveButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: PREMIUM_COLORS.gold,
        paddingVertical: 16,
        borderRadius: 20,
        marginTop: 8,
        ...SHADOWS.medium,
    },
    saveButtonDisabled: {
        opacity: 0.7,
    },
    saveButtonText: {
        fontSize: 16,
        fontWeight: '700',
        color: '#FFFFFF',
    },
});

export default EditProfileScreen;
