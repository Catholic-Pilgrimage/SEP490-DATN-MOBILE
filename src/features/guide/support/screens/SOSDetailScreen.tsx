
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    Linking,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from 'react-native-toast-message';
import { GUIDE_COLORS, GUIDE_SPACING } from "../../../../constants/guide.constants";
import { SACRED_COLORS } from "../../../../constants/sacred-theme.constants";
import { getFontSize } from "../../../../utils/responsive";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useGuideSOSActions, useGuideSOSDetail } from "../hooks/useGuideSOS";
import { FullMapModal } from "../../../../components/map/FullMapModal";
import { MapPin } from "../../../../components/map/VietmapView";
import vietmapService from "../../../../services/map/vietmapService";
import locationService from "../../../../services/location/locationService";

// Navigation Types
type RootStackParamList = {
    SOSList: undefined;
};

type SOSDetailScreenRouteProp = RouteProp<{ params: { id: string; autoOpenMap?: boolean } }, 'params'>;
type SOSDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SOSDetailScreen = () => {
    const navigation = useNavigation<SOSDetailNavigationProp>();
    const route = useRoute<SOSDetailScreenRouteProp>();
    const insets = useSafeAreaInsets();
    const { id, autoOpenMap } = route.params;

    const { data: sos, isLoading } = useGuideSOSDetail(id);
    const { assignSOS, resolveSOS, isAssigning, isResolving } = useGuideSOSActions();
    const { confirm } = useConfirm();
    const processing = isAssigning || isResolving;

    // Map States
    const [mapVisible, setMapVisible] = useState(false);
    const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>([]);
    const [routeSummary, setRouteSummary] = useState<string>('');
    const [routeLoading, setRouteLoading] = useState(false);
    const [guideLocation, setGuideLocation] = useState<{latitude: number; longitude: number} | null>(null);

    // Auto open map effect
    React.useEffect(() => {
        if (autoOpenMap && sos?.latitude && sos?.longitude) {
            openMap();
        }
    }, [autoOpenMap, sos?.latitude, sos?.longitude]);

    const handleAssign = async () => {
        try {
            await assignSOS(id);
            Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã nhận xử lý yêu cầu' });
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Lỗi', text2: error?.message || 'Không thể nhận yêu cầu' });
        }
    };

    const handleResolve = async () => {
        const isConfirmed = await confirm({
            title: 'Xác nhận hoàn tất',
            message: 'Bạn chắc chắn đã hoàn tất quá trình cứu trợ/hỗ trợ người dùng này? Yêu cầu sẽ được chuyển sang trạng thái đã xử lý.',
            confirmText: 'Hoàn tất',
            cancelText: 'Huỷ',
            type: 'success',
            iconName: 'checkmark-circle'
        });

        if (!isConfirmed) return;

        try {
            await resolveSOS({ id, data: { notes: "Đã xử lý xong" } });
            Toast.show({ type: 'success', text1: 'Thành công', text2: 'Đã giải quyết yêu cầu' });
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Lỗi', text2: error?.message || 'Không thể giải quyết yêu cầu' });
        }
    };

    const openMap = async () => {
        if (!sos?.latitude || !sos?.longitude) return;
        setMapVisible(true);
        setRouteLoading(true);

        try {
            // Get guide's current location to draw route
            const userLoc = await locationService.getCurrentLocation();
            setGuideLocation(userLoc);

            // Calculate Vietmap route
            const route = await vietmapService.calculateRouteWithGeometry(
                { latitude: userLoc.latitude, longitude: userLoc.longitude },
                { latitude: Number(sos.latitude), longitude: Number(sos.longitude) }
            );

            setRouteCoordinates(route.coordinates);
            setRouteSummary(`${route.distanceKm.toFixed(2)} km • ${route.durationText}`);
        } catch (error: any) {
            Toast.show({ type: 'error', text1: 'Lỗi', text2: 'Không thể tính toán dẫn đường trên Vietmap' });
            // Even if route fails, map is visible with pins
        } finally {
            setRouteLoading(false);
        }
    };

    const callPhone = () => {
        const phone = sos?.pilgrim?.phone || sos?.contact_phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        }
    };

    const getMapPins = (): MapPin[] => {
        const pins: MapPin[] = [];
        if (sos?.latitude && sos?.longitude) {
            pins.push({
                id: 'sos_location',
                latitude: Number(sos.latitude),
                longitude: Number(sos.longitude),
                title: 'Người gặp nạn',
                subtitle: sos.message || 'Cần hỗ trợ tại đây',
                color: SACRED_COLORS.danger,
                icon: '🆘',
                markerType: 'sos',
                chipMarkerType: 'sos',
                chipPlainIcon: true,
                chipUseDefaultPin: false,
                chipIconColor: SACRED_COLORS.danger,
            });
        }
        if (guideLocation) {
            pins.push({
                id: 'guide_location',
                latitude: guideLocation.latitude,
                longitude: guideLocation.longitude,
                title: 'Vị trí của bạn',
                subtitle: 'Gần nhất thu thập được',
                color: GUIDE_COLORS.primary,
                icon: '📍',
                chipPlainIcon: true,
                chipUseDefaultPin: true,
                chipIconColor: '#2563EB',
            });
        }
        return pins;
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

            <ScrollView contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 120 }]}>
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

                {/* Location Box */}
                {sos.latitude && sos.longitude && (
                    <View style={styles.locationCard}>
                        <View style={[styles.sectionHeader, { justifyContent: 'space-between', marginBottom: 12 }]}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <MaterialIcons name="my-location" size={20} color={GUIDE_COLORS.primary} />
                                <Text style={styles.sectionTitle}>Vị trí cứu trợ</Text>
                            </View>
                            <TouchableOpacity 
                                style={styles.compactMapButton} 
                                onPress={openMap}
                                activeOpacity={0.8}
                            >
                                <Ionicons name="map" size={14} color="#FFF" />
                                <Text style={styles.compactMapText}>Mở bản đồ</Text>
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.coordinatesWrapper}>
                            <View style={styles.coordinateItem}>
                                <Text style={styles.coordinateLabel}>Vĩ độ (Lat)</Text>
                                <Text style={styles.coordinateValue}>{Number(sos.latitude).toFixed(6)}</Text>
                            </View>
                            <View style={styles.coordinateDivider} />
                            <View style={styles.coordinateItem}>
                                <Text style={styles.coordinateLabel}>Kinh độ (Lng)</Text>
                                <Text style={styles.coordinateValue}>{Number(sos.longitude).toFixed(6)}</Text>
                            </View>
                        </View>
                    </View>
                )}
            <View style={{ height: 100 }} />
            </ScrollView>

            {/* Action Buttons Floating Footer */}
            <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>
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
                                <MaterialIcons name="assignment-turned-in" size={24} color="#FFF" />
                                <Text style={styles.buttonText}>Nhận xử lý ngay</Text>
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
                                <MaterialIcons name="check-circle" size={24} color="#FFF" />
                                <Text style={styles.buttonText}>Hoàn tất hỗ trợ</Text>
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

            {/* Map Modal */}
            <FullMapModal
                visible={mapVisible}
                onClose={() => setMapVisible(false)}
                pins={getMapPins()}
                title="Dẫn đường cứu trợ (Vietmap)"
                routeCoordinates={routeCoordinates}
                routeSummary={routeSummary}
                routeLoading={routeLoading}
                showUserLocation={true}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: SACRED_COLORS.parchment,
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
    locationCard: {
        backgroundColor: GUIDE_COLORS.surface,
        padding: GUIDE_SPACING.lg,
        borderRadius: 12,
        marginBottom: GUIDE_SPACING.lg,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.primary + '30', // Soft primary border
        shadowColor: GUIDE_COLORS.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    coordinatesWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GUIDE_COLORS.background,
        borderRadius: 8,
        padding: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
    },
    coordinateItem: {
        flex: 1,
        alignItems: 'center',
    },
    coordinateLabel: {
        fontSize: getFontSize(12),
        color: GUIDE_COLORS.textSecondary,
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    coordinateValue: {
        fontSize: getFontSize(16),
        fontWeight: 'bold',
        color: GUIDE_COLORS.textPrimary,
        fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    },
    coordinateDivider: {
        width: 1,
        height: '80%',
        backgroundColor: GUIDE_COLORS.borderLight,
        marginHorizontal: 12,
    },
    compactMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: GUIDE_COLORS.primary,
        paddingVertical: 6,
        paddingHorizontal: 10,
        borderRadius: 20,
        gap: 4,
        shadowColor: GUIDE_COLORS.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
        elevation: 3,
    },
    compactMapText: {
        fontSize: getFontSize(12),
        fontWeight: 'bold',
        color: '#FFF',
    },

    footer: {
        position: 'absolute',
        left: GUIDE_SPACING.lg,
        right: GUIDE_SPACING.lg,
        bottom: 20,
        borderRadius: 100,
        backgroundColor: 'transparent',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 18,
        borderRadius: 100,
        gap: 8,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 8,
        elevation: 8,
    },
    buttonPrimary: {
        backgroundColor: SACRED_COLORS.gold,
    },
    buttonSuccess: {
        backgroundColor: SACRED_COLORS.success,
    },
    buttonText: {
        fontSize: getFontSize(16),
        fontWeight: 'bold',
        color: '#FFF',
        textTransform: 'uppercase',
    },
    completedMessage: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        backgroundColor: SACRED_COLORS.success + '15',
        padding: GUIDE_SPACING.md,
        borderRadius: 100,
        borderWidth: 1,
        borderColor: SACRED_COLORS.success,
    },
    completedText: {
        fontSize: getFontSize(16),
        fontWeight: '600',
        color: SACRED_COLORS.success,
        fontSize: getFontSize(16),
        fontWeight: '600',
    },
});

export default SOSDetailScreen;
