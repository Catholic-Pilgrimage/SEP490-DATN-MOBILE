
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    Linking,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDE_COLORS, GUIDE_SPACING } from "../../../../constants/guide.constants";
import { SACRED_COLORS } from "../../../../constants/sacred-theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { SOSEntity, SOSStatus } from "../../../../types/guide/sos.types";
import { getFontSize } from "../../../../utils/responsive";
import { useGuideSOSList } from "../hooks/useGuideSOS";

// Navigation Types
type RootStackParamList = {
    SOSDetail: { id: string };
};

type SOSListScreenNavigationProp = NativeStackNavigationProp<RootStackParamList>;

// Filter Tab Component
const FilterTab = ({
    label,
    active,
    onPress,
    count
}: {
    label: string;
    active: boolean;
    onPress: () => void;
    count?: number;
}) => (
    <TouchableOpacity
        style={[styles.filterTab, active && styles.filterTabActive]}
        onPress={onPress}
    >
        <Text style={[styles.filterLabel, active && styles.filterLabelActive]}>
            {label}
        </Text>
        {count !== undefined && count > 0 && (
            <View style={[styles.filterBadge, active && styles.filterBadgeActive]}>
                <Text style={[styles.filterBadgeText, active && styles.filterBadgeTextActive]}>
                    {count}
                </Text>
            </View>
        )}
    </TouchableOpacity>
);

const SOSItem = ({
    item,
    onPress,
    onMissingPhone,
    onMapPress,
}: {
    item: SOSEntity;
    onPress: () => void;
    onMissingPhone: () => void;
    onMapPress: () => void;
}) => {
    const getStatusColor = (status: SOSStatus) => {
        switch (status) {
            case "pending": return "#E74C3C"; // Alarming Red
            case "accepted": return "#F1C40F"; // Gold
            case "resolved": return "#2ECC71"; // Green
            case "cancelled": return "#95A5A6"; // Gray
            default: return GUIDE_COLORS.gray500;
        }
    };

    const getStatusLabel = (status: SOSStatus) => {
        switch (status) {
            case "pending": return "Cần hỗ trợ gấp";
            case "accepted": return "Đang xử lý";
            case "resolved": return "Đã xong";
            case "cancelled": return "Đã hủy";
            default: return status;
        }
    };

    const handleCall = () => {
        const phone = item.pilgrim?.phone || item.contact_phone;
        if (phone) {
            Linking.openURL(`tel:${phone}`);
        } else {
            onMissingPhone();
        }
    };

    return (
        <View style={styles.itemContainer}>
            <View style={styles.itemHeader}>
                <View style={styles.itemHeaderLeft}>
                    <View style={styles.avatarContainer}>
                        <Image
                            source={{ uri: item.pilgrim?.avatar_url || "https://ui-avatars.com/api/?name=" + (item.pilgrim?.full_name || "User") }}
                            style={styles.avatar}
                        />
                    </View>
                    <TouchableOpacity onPress={onPress}>
                        <Text style={styles.pilgrimName}>{item.pilgrim?.full_name || "Người hành hương"}</Text>
                        <View style={styles.distanceBadge}>
                            <Ionicons name="location" size={10} color={GUIDE_COLORS.primary} />
                            <Text style={styles.distanceText}>Xem chi tiết</Text>
                        </View>
                    </TouchableOpacity>
                </View>
                {/* Quick Actions */}
                <View style={styles.quickActionsRow}>
                    {/* Quick Call Button */}
                    {(item.pilgrim?.phone || item.contact_phone) && (
                        <TouchableOpacity style={styles.quickCallButton} onPress={handleCall}>
                            <Ionicons name="call" size={16} color="#FFF" />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            <TouchableOpacity style={styles.messageContainer} onPress={onPress}>
                <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status) }]} />
                <View style={styles.messageContent}>
                    <Text style={styles.itemMessage} numberOfLines={2}>
                        {item.message || "Yêu cầu hỗ trợ khẩn cấp"}
                    </Text>
                    <View style={styles.timeTag}>
                        <Ionicons name="time-outline" size={12} color={GUIDE_COLORS.textMuted} />
                        <Text style={styles.timeText}>
                            {new Date(item.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })} • {new Date(item.created_at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })}
                        </Text>
                    </View>
                </View>
            </TouchableOpacity>

            <View style={styles.itemFooter}>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20', borderColor: getStatusColor(item.status) }]}>
                    <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                        {getStatusLabel(item.status)}
                    </Text>
                </View>
                <View style={styles.locationInfo}>
                    <Text style={styles.locationText} numberOfLines={1}>
                        Tại: {item.site?.name || "Khu vực hành lễ"}
                    </Text>
                    <TouchableOpacity style={styles.quickMapButton} onPress={onMapPress}>
                        <Ionicons name="navigate" size={14} color={GUIDE_COLORS.primary} />
                        <Text style={styles.quickMapText}>Dẫn đường</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

export const SOSListScreen = () => {
    const navigation = useNavigation<SOSListScreenNavigationProp>();
    const insets = useSafeAreaInsets();
    const { confirm, ConfirmModal } = useConfirm();

    const [activeTab, setActiveTab] = useState<SOSStatus | 'all'>('pending');

    // Prepare params for hook
    const queryParams = activeTab === 'all' ? {} : { status: activeTab };
    const { data: responseData, isLoading, refetch, isRefetching } = useGuideSOSList(queryParams);

    // Extract data
    const data = responseData?.sosRequests || [];

    const onRefresh = () => {
        refetch();
    };

    const showMissingPhoneDialog = async () => {
        await confirm({
            type: "info",
            iconName: "call-outline",
            title: "Thông báo",
            message: "Không có số điện thoại liên hệ",
            confirmText: "OK",
            showCancel: false,
        });
    };

    const handlePressItem = (id: string) => {
        navigation.navigate("SOSDetail", { id });
    };

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
                <Text style={styles.headerTitle}>Hỗ trợ khẩn cấp</Text>
                <View style={styles.headerRight} />
            </View>

            {/* Filter Tabs */}
            <View style={styles.tabsContainer}>
                <FilterTab
                    label="Chờ xử lý"
                    active={activeTab === 'pending'}
                    onPress={() => setActiveTab('pending')}
                />
                <FilterTab
                    label="Đang xử lý"
                    active={activeTab === 'accepted'}
                    onPress={() => setActiveTab('accepted')}
                />
                <FilterTab
                    label="Lịch sử"
                    active={activeTab === 'resolved'}
                    onPress={() => setActiveTab('resolved')}
                />
            </View>

            {/* List */}
            {isLoading && !isRefetching ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={SACRED_COLORS.gold} />
                </View>
            ) : (
                <FlatList
                    data={data}
                    keyExtractor={(item) => item.id}
                    renderItem={({ item }) => (
                        <SOSItem
                            item={item}
                            onPress={() => handlePressItem(item.id)}
                            onMissingPhone={() => void showMissingPhoneDialog()}
                            onMapPress={() => navigation.navigate("SOSDetail", { id: item.id, autoOpenMap: true })}
                        />
                    )}
                    contentContainerStyle={styles.listContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={isRefetching}
                            onRefresh={onRefresh}
                            colors={[SACRED_COLORS.gold]}
                        />
                    }
                    ListEmptyComponent={
                        <View style={styles.emptyContainer}>
                            <MaterialIcons name="support-agent" size={64} color={GUIDE_COLORS.gray300} />
                            <Text style={styles.emptyText}>Không có yêu cầu hỗ trợ nào</Text>
                        </View>
                    }
                />
            )}
            <ConfirmModal />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: GUIDE_COLORS.background,
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
    tabsContainer: {
        flexDirection: 'row',
        padding: GUIDE_SPACING.md,
        gap: GUIDE_SPACING.sm,
    },
    filterTab: {
        paddingVertical: GUIDE_SPACING.xs,
        paddingHorizontal: GUIDE_SPACING.md,
        borderRadius: 20,
        backgroundColor: GUIDE_COLORS.surface,
        borderWidth: 1,
        borderColor: GUIDE_COLORS.borderLight,
        flexDirection: 'row',
        alignItems: 'center',
    },
    filterTabActive: {
        backgroundColor: SACRED_COLORS.gold,
        borderColor: SACRED_COLORS.gold,
    },
    filterLabel: {
        fontSize: getFontSize(13),
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '500',
    },
    filterLabelActive: {
        color: '#FFFFFF',
        fontWeight: '600',
    },
    filterBadge: {
        marginLeft: 6,
        backgroundColor: GUIDE_COLORS.gray200,
        borderRadius: 10,
        paddingHorizontal: 6,
        height: 20,
        justifyContent: 'center',
    },
    filterBadgeActive: {
        backgroundColor: 'rgba(255,255,255,0.3)',
    },
    filterBadgeText: {
        fontSize: 10,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: 'bold',
    },
    filterBadgeTextActive: {
        color: '#FFFFFF',
    },
    listContent: {
        padding: GUIDE_SPACING.md,
        paddingBottom: GUIDE_SPACING.xxl,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingTop: 100,
    },
    emptyText: {
        marginTop: GUIDE_SPACING.md,
        color: GUIDE_COLORS.textMuted,
        fontSize: getFontSize(16),
    },
    itemContainer: {
        backgroundColor: '#FFFFFF',
        padding: GUIDE_SPACING.md,
        borderRadius: 16,
        marginBottom: GUIDE_SPACING.md,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 3,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    itemHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: GUIDE_SPACING.sm,
    },
    itemHeaderLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        flex: 1,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: GUIDE_COLORS.gray100,
        overflow: 'hidden',
    },
    avatar: {
        width: '100%',
        height: '100%',
    },
    pilgrimName: {
        fontSize: getFontSize(15),
        fontWeight: '700',
        color: GUIDE_COLORS.textPrimary,
        marginBottom: 2,
    },
    distanceBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 6,
        paddingVertical: 2,
        backgroundColor: '#E8F5E9',
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    distanceText: {
        fontSize: 11,
        color: GUIDE_COLORS.primary,
        fontWeight: '600',
    },
    quickCallButton: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#2ECC71',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#2ECC71",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 2,
    },
    messageContainer: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: GUIDE_SPACING.md,
    },
    statusLine: {
        width: 4,
        borderRadius: 2,
        backgroundColor: GUIDE_COLORS.gray300,
    },
    messageContent: {
        flex: 1,
        paddingVertical: 2,
    },
    itemMessage: {
        fontSize: getFontSize(14),
        color: GUIDE_COLORS.textPrimary,
        lineHeight: 20,
        marginBottom: 4,
    },
    timeTag: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    timeText: {
        fontSize: 11,
        color: GUIDE_COLORS.textMuted,
    },
    itemFooter: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: GUIDE_COLORS.borderLight,
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
        borderWidth: 1,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '700',
    },
    locationInfo: {
        flex: 1,
        alignItems: 'flex-end',
        gap: 6,
    },
    locationText: {
        fontSize: 12,
        color: GUIDE_COLORS.textSecondary,
        fontWeight: '500',
    },
    quickActionsRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    quickMapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: GUIDE_COLORS.primary + '15',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    quickMapText: {
        fontSize: 12,
        color: GUIDE_COLORS.primary,
        fontWeight: '600',
    },
});

export default SOSListScreen;
