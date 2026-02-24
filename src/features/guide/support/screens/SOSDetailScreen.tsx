
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import {
    ActivityIndicator,
    Alert,
    Image,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDE_COLORS, GUIDE_SPACING } from "../../../../constants/guide.constants";
import { SACRED_COLORS } from "../../../../constants/sacred-theme.constants";
import { getFontSize } from "../../../../utils/responsive";
import { useGuideSOSActions, useGuideSOSDetail } from "../hooks/useGuideSOS";

// Navigation Types
type RootStackParamList = {
    SOSList: undefined;
};

type SOSDetailScreenRouteProp = RouteProp<{ params: { id: string } }, 'params'>;
type SOSDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SOSDetailScreen = () => {
    const navigation = useNavigation<SOSDetailNavigationProp>();
    const route = useRoute<SOSDetailScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { id } = route.params;

    const { data: sos, isLoading } = useGuideSOSDetail(id);
    const { assignSOS, resolveSOS, isAssigning, isResolving } = useGuideSOSActions();
    const processing = isAssigning || isResolving;

    const handleAssign = async () => {
        try {
            await assignSOS(id);
            Alert.alert("Thành công", "Đã nhận xử lý yêu cầu");
        } catch (error: any) {
            Alert.alert("Lỗi", error?.message || "Không thể nhận yêu cầu");
        }
    };

    const handleResolve = async () => {
        try {
            await resolveSOS({ id, data: { notes: "Đã xử lý xong" } });
            Alert.alert("Thành công", "Đã giải quyết yêu cầu");
        } catch (error: any) {
            Alert.alert("Lỗi", error?.message || "Không thể giải quyết yêu cầu");
        }
    };

    const openMap = () => {
        if (sos?.latitude && sos?.longitude) {
            const scheme = Platform.select({ ios: 'maps:0,0?q=', android: 'geo:0,0?q=' });
            const latLng = `${sos.latitude},${sos.longitude}`;
            const label = 'Vị trí người cần hỗ trợ';
            const url = Platform.select({
                ios: `${scheme}${label}@${latLng}`,
                android: `${scheme}${latLng}(${label})`
            });
            if (url) Linking.openURL(url);
        }
    };

    const callPhone = () => {
        const phone = sos?.pilgrim?.phone || sos?.contact_phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={SACRED_COLORS.gold} />
            </View>
        );
    }

    if (!sos) return null;

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <StatusBar barStyle="dark-content" />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={GUIDE_COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Chi tiết hỗ trợ</Text>
                <View style={styles.headerRight} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Status Card */}
                <View style={styles.statusCard}>
                    <Text style={styles.statusLabel}>Trạng thái hiện tại</Text>
                    <View style={[
                        styles.statusBadge,
                        sos.status === 'pending' && styles.statusPending,
                        sos.status === 'accepted' && styles.statusProgress,
                        sos.status === 'resolved' && styles.statusResolved,
                    ]}>
                        <Text style={[
                            styles.statusText,
                            sos.status === 'pending' && styles.textPending,
                            sos.status === 'accepted' && styles.textProgress,
                            sos.status === 'resolved' && styles.textResolved,
                        ]}>
                            {sos.status === 'pending' ? 'Đang chờ xử lý' :
                                sos.status === 'accepted' ? 'Đang xử lý' :
                                    sos.status === 'resolved' ? 'Đã giải quyết' : 'Đã hủy'}
                        </Text>
                    </View>
                </View>

                {/* Message Card */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="message" size={20} color={SACRED_COLORS.gold} />
                        <Text style={styles.sectionTitle}>Nội dung yêu cầu</Text>
                    </View>
                    <Text style={styles.messageText}>{sos.message || "Không có nội dung chi tiết"}</Text>
                    <View style={styles.metaRow}>
                        <Text style={styles.timestamp}>
                            Gửi lúc: {new Date(sos.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                        </Text>
                        <Text style={styles.slaTimer}>
                            ⏳ Đã chờ: {Math.floor((new Date().getTime() - new Date(sos.created_at).getTime()) / 60000)} phút
                        </Text>
                    </View>
                </View>

                {/* Pilgrim Info */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <MaterialIcons name="person" size={20} color={SACRED_COLORS.gold} />
                        <Text style={styles.sectionTitle}>Thông tin người gửi</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Họ tên:</Text>
                        <Text style={styles.infoValue}>{sos.pilgrim?.full_name || "N/A"}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Số điện thoại:</Text>
                        <TouchableOpacity
                            style={styles.phoneWrapper}
                            onPress={callPhone}
                            disabled={!sos.pilgrim?.phone && !sos.contact_phone}
                        >
                            <Text style={[styles.infoValue, (sos.pilgrim?.phone || sos.contact_phone) && { color: GUIDE_COLORS.primary, textDecorationLine: 'underline' }]}>
                                {sos.pilgrim?.phone || sos.contact_phone || "Không có số điện thoại"}
                            </Text>
                            {(sos.pilgrim?.phone || sos.contact_phone) && (
                                <View style={styles.miniCallIcon}>
                                    <Ionicons name="call" size={14} color="#FFF" />
                                </View>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Location Map with Mini Map Visual */}
                {sos.latitude && sos.longitude && (
                    <View style={styles.mapContainer}>
                        <View style={styles.sectionHeader}>
                            <MaterialIcons name="location-on" size={20} color={SACRED_COLORS.gold} />
                            <Text style={styles.sectionTitle}>Vị trí</Text>
                        </View>

                        {/* Mini Map Visual Placeholder */}
                        <View style={styles.miniMapVisual}>
                            {/* In a real app, use MapView here. For now, simulate map look */}
                            <View style={styles.mapGridHorizontal} />
                            <View style={styles.mapGridVertical} />
                            <View style={styles.mapPin}>
                                <Image
                                    source={{ uri: sos.pilgrim?.avatar_url || "https://ui-avatars.com/api/?name=User" }}
                                    style={styles.mapPinAvatar}
                                />
                                <View style={styles.mapPinTriangle} />
                            </View>
                        </View>

                        <TouchableOpacity style={styles.floatingMapButton} onPress={openMap}>
                            <Ionicons name="map" size={20} color={SACRED_COLORS.charcoal} />
                            <Text style={styles.floatingMapText}>Mở bản đồ chỉ đường</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </ScrollView>

            {/* Action Buttons */}
            <View style={[styles.footer, { paddingBottom: Math.max(GUIDE_SPACING.lg, insets.bottom) }]}>
                {sos.status === 'pending' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.buttonPrimary]}
                        onPress={handleAssign}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialIcons name="assignment-turned-in" size={20} color="#FFF" />
                                <Text style={styles.buttonText}>Nhận xử lý</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {sos.status === 'accepted' && (
                    <TouchableOpacity
                        style={[styles.actionButton, styles.buttonSuccess]}
                        onPress={handleResolve}
                        disabled={processing}
                    >
                        {processing ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <>
                                <MaterialIcons name="check-circle" size={20} color="#FFF" />
                                <Text style={styles.buttonText}>Hoàn tất xử lý</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {sos.status === 'resolved' && (
                    <View style={styles.completedMessage}>
                        <MaterialIcons name="verified" size={24} color={SACRED_COLORS.success} />
                        <Text style={styles.completedText}>Yêu cầu đã được giải quyết</Text>
                    </View>
                )}
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GUIDE_COLORS.background,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: GUIDE_SPACING.lg,
        paddingBottom: GUIDE_SPACING.md,
        backgroundColor: GUIDE_COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: GUIDE_COLORS.borderLight,
    },
    backButton: {
        padding: GUIDE_SPACING.sm,
        marginLeft: -GUIDE_SPACING.sm,
    },
    headerTitle: {
        fontSize: getFontSize(18),
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    headerRight: {
        width: 40,
    },
    content: {
        padding: GUIDE_SPACING.lg,
        paddingBottom: 100,
    },
    statusCard: {
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.lg,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: GUIDE_SPACING.lg,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
    },
    statusLabel: {
        fontSize: getFontSize(13),
        color: GUIDE_COLORS.textSecondary,
        marginBottom: 8,
    },
    statusBadge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: GUIDE_COLORS.gray200,
    },
    statusPending: { backgroundColor: SACRED_COLORS.danger + '20' },
    statusProgress: { backgroundColor: SACRED_COLORS.gold + '20' },
    statusResolved: { backgroundColor: SACRED_COLORS.success + '20' },
    statusText: {
        fontSize: getFontSize(14),
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
    },
    textPending: { color: SACRED_COLORS.danger },
    textProgress: { color: SACRED_COLORS.gold },
    textResolved: { color: SACRED_COLORS.success },

    sectionCard: {
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.lg,
        borderRadius: 12,
        marginBottom: GUIDE_SPACING.lg,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: GUIDE_SPACING.md,
        gap: 8,
    },
    sectionTitle: {
        fontSize: getFontSize(16),
        fontWeight: '600',
        color: GUIDE_COLORS.textPrimary,
    },
    messageText: {
        fontSize: getFontSize(15),
        color: GUIDE_COLORS.textPrimary,
        lineHeight: 22,
        marginBottom: GUIDE_SPACING.sm,
    },
    timestamp: {
        fontSize: getFontSize(12),
        color: GUIDE_COLORS.textMuted,
        fontStyle: 'italic',
    },
    infoRow: {
        flexDirection: 'row',
        marginBottom: 8,
        justifyContent: 'space-between',
    },
    infoLabel: {
        fontSize: getFontSize(14),
        color: GUIDE_COLORS.textSecondary,
        width: '35%',
    },
    infoValue: {
        fontSize: getFontSize(14),
        color: GUIDE_COLORS.textPrimary,
        fontWeight: '500',
        width: '65%',
        textAlign: 'right',
    },

    metaRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        marginTop: 4,
    },
    slaTimer: {
        fontSize: getFontSize(12),
        color: '#E74C3C', // Red for urgency
        fontWeight: '600',
    },
    phoneWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        flex: 1,
        justifyContent: 'flex-end',
    },
    miniCallIcon: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: GUIDE_COLORS.success,
        justifyContent: 'center',
        alignItems: 'center',
    },
    mapContainer: {
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.lg,
        borderRadius: 12,
        marginBottom: GUIDE_SPACING.lg,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
        overflow: 'hidden',
    },
    miniMapVisual: {
        height: 180,
        backgroundColor: '#E5E9F2',
        borderRadius: 8,
        marginBottom: 12,
        position: 'relative',
        overflow: 'hidden',
        borderWidth: 1,
        borderColor: '#D1D5DB',
    },
    mapGridHorizontal: {
        position: 'absolute',
        top: '50%',
        left: 0,
        right: 0,
        height: 8,
        backgroundColor: '#FFFFFF',
        opacity: 0.7,
    },
    mapGridVertical: {
        position: 'absolute',
        left: '50%',
        top: 0,
        bottom: 0,
        width: 8,
        backgroundColor: '#FFFFFF',
        opacity: 0.7,
    },
    mapPin: {
        position: 'absolute',
        top: '35%',
        left: '45%',
        alignItems: 'center',
    },
    mapPinAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: '#FFF',
    },
    mapPinTriangle: {
        width: 0,
        height: 0,
        backgroundColor: 'transparent',
        borderStyle: 'solid',
        borderLeftWidth: 6,
        borderRightWidth: 6,
        borderBottomWidth: 8,
        borderLeftColor: 'transparent',
        borderRightColor: 'transparent',
        borderBottomColor: '#FFF',
        transform: [{ rotate: '180deg' }],
        marginTop: -2,
    },
    floatingMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: SACRED_COLORS.gold,
        paddingVertical: 12,
        borderRadius: 8,
        gap: 8,
        shadowColor: SACRED_COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    floatingMapText: {
        color: SACRED_COLORS.charcoal,
        fontWeight: 'bold',
        fontSize: 14,
    },

    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.lg,
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.borderLight,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 5,
    },
    actionButton: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 14,
        borderRadius: 8,
        gap: 8,
    },
    buttonPrimary: {
        backgroundColor: GUIDE_COLORS.primary,
    },
    buttonSuccess: {
        backgroundColor: SACRED_COLORS.success,
    },
    buttonText: {
        color: '#FFF',
        fontSize: getFontSize(16),
        fontWeight: 'bold',
    },
    completedMessage: {
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        paddingVertical: 10,
        gap: 8,
    },
    completedText: {
        color: SACRED_COLORS.success,
        fontSize: getFontSize(16),
        fontWeight: '600',
    },
});

export default SOSDetailScreen;
