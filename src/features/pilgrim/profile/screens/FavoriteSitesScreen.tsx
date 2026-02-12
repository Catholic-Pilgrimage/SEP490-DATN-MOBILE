import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { useFocusEffect, useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import React, { useCallback, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Dimensions,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Animated, { FadeInDown, Layout } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { COLORS, SHADOWS } from '../../../../constants/theme.constants';
import { useQuery } from '../../../../hooks/useApi';
import pilgrimSiteApi from '../../../../services/api/pilgrim/siteApi';
import { FavoriteSite } from '../../../../types/pilgrim/site.types';

const { width } = Dimensions.get('window');
const COLUMN_WIDTH = (width - 48) / 2;

const FavoriteSitesScreen = () => {
    const navigation = useNavigation<NativeStackNavigationProp<any>>();
    const insets = useSafeAreaInsets();
    const [favorites, setFavorites] = useState<FavoriteSite[]>([]);

    const {
        data: responseData,
        isLoading,
        error,
        execute: fetchFavorites,
        refetch,
    } = useQuery(
        () => pilgrimSiteApi.getFavorites({ page: 1, limit: 100 }), // Fetching/Pagination simplified for now
        {
            autoFetch: false,
            onSuccess: (res) => {
                if (res.success && res.data?.sites) {
                    setFavorites(res.data.sites);
                }
            },
        }
    );

    useFocusEffect(
        useCallback(() => {
            fetchFavorites();
        }, [fetchFavorites])
    );

    const handleRemoveFavorite = async (siteId: string, siteName: string) => {
        Alert.alert(
            'Xóa khỏi yêu thích',
            `Bạn có chắc muốn xóa "${siteName}" khỏi danh sách yêu thích?`,
            [
                { text: 'Hủy', style: 'cancel' },
                {
                    text: 'Xóa',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            // Optimistic update
                            setFavorites((prev) => prev.filter((item) => item.id !== siteId));
                            await pilgrimSiteApi.removeFavorite(siteId);
                        } catch (error) {
                            console.error('Failed to remove favorite:', error);
                            // Revert if failed (could be better handled with robust state management)
                            refetch();
                        }
                    },
                },
            ]
        );
    };

    const renderItem = ({ item, index }: { item: FavoriteSite; index: number }) => {
        return (
            <Animated.View
                entering={FadeInDown.delay(index * 100).springify()}
                layout={Layout.springify()}
                style={styles.cardContainer}
            >
                <TouchableOpacity
                    style={styles.card}
                    activeOpacity={0.9}
                    onPress={() => navigation.navigate('SiteDetail', { siteId: item.id })}
                >
                    <View style={styles.imageContainer}>
                        <Image
                            source={{ uri: item.cover_image || 'https://via.placeholder.com/300' }}
                            style={styles.image}
                            resizeMode="cover"
                        />
                        <TouchableOpacity
                            style={styles.favoriteButton}
                            onPress={() => handleRemoveFavorite(item.id, item.name)}
                        >
                            <MaterialIcons name="favorite" size={20} color={COLORS.danger} />
                        </TouchableOpacity>

                        <View style={styles.ratingBadge}>
                            <MaterialIcons name="star" size={12} color={COLORS.warning} />
                            <Text style={styles.ratingText}>4.5</Text>
                        </View>
                    </View>

                    <View style={styles.cardContent}>
                        <Text style={styles.siteName} numberOfLines={2}>
                            {item.name}
                        </Text>

                        <View style={styles.locationContainer}>
                            <Ionicons name="location-sharp" size={14} color={COLORS.textTertiary} />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {item.province}
                            </Text>
                        </View>

                        <View style={styles.categoryTag}>
                            <Text style={styles.categoryText}>
                                {item.type === 'church' ? 'Nhà thờ' :
                                    item.type === 'shrine' ? 'Đền thánh' :
                                        item.type === 'monastery' ? 'Tu viện' : 'Địa điểm'}
                            </Text>
                        </View>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        );
    };

    const renderEmptyState = () => (
        <View style={styles.emptyContainer}>
            <Image
                source={{ uri: 'https://cdn-icons-png.flaticon.com/512/4076/4076549.png' }}
                style={styles.emptyImage}
            />
            <Text style={styles.emptyTitle}>Chưa có địa điểm yêu thích</Text>
            <Text style={styles.emptySubtitle}>
                Lưu lại các địa điểm hành hương bạn quan tâm để dễ dàng truy cập sau này.
            </Text>
            <TouchableOpacity
                style={styles.exploreButton}
                onPress={() => navigation.navigate('Hanh huong')}
            >
                <Text style={styles.exploreButtonText}>Khám phá ngay</Text>
            </TouchableOpacity>
        </View>
    );

    return (
        <View style={[styles.container, { paddingTop: insets.top }]}>
            <View style={styles.header}>
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => navigation.goBack()}
                >
                    <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Địa điểm đã lưu</Text>
                <View style={styles.placeholderButton} />
            </View>

            {isLoading && favorites.length === 0 ? (
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : (
                <FlatList
                    data={favorites}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    numColumns={2}
                    contentContainerStyle={[
                        styles.listContent,
                        favorites.length === 0 && styles.listContentEmpty,
                    ]}
                    columnWrapperStyle={favorites.length > 0 ? styles.columnWrapper : undefined}
                    showsVerticalScrollIndicator={false}
                    ListEmptyComponent={renderEmptyState}
                    refreshControl={
                        <RefreshControl refreshing={isLoading} onRefresh={refetch} tintColor={COLORS.primary} />
                    }
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: COLORS.background,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: COLORS.backgroundCard,
        ...SHADOWS.small,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    placeholderButton: {
        width: 40,
        height: 40,
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    listContent: {
        padding: 16,
        paddingBottom: 40,
    },
    listContentEmpty: {
        flexGrow: 1,
    },
    columnWrapper: {
        justifyContent: 'space-between',
    },
    cardContainer: {
        width: COLUMN_WIDTH,
        marginBottom: 16,
    },
    card: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: 16,
        overflow: 'hidden',
        ...SHADOWS.medium,
        height: 240,
    },
    imageContainer: {
        height: 140,
        position: 'relative',
    },
    image: {
        width: '100%',
        height: '100%',
    },
    favoriteButton: {
        position: 'absolute',
        top: 8,
        right: 8,
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        padding: 6,
        borderRadius: 20,
        ...SHADOWS.small,
    },
    ratingBadge: {
        position: 'absolute',
        bottom: 8,
        left: 8,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 12,
        gap: 4,
    },
    ratingText: {
        color: '#fff',
        fontSize: 10,
        fontWeight: '700',
    },
    cardContent: {
        padding: 12,
        flex: 1,
        justifyContent: 'space-between',
    },
    siteName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 4,
    },
    locationContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 8,
    },
    locationText: {
        fontSize: 12,
        color: COLORS.textTertiary,
        flex: 1,
    },
    categoryTag: {
        alignSelf: 'flex-start',
        backgroundColor: 'rgba(207, 170, 58, 0.1)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    categoryText: {
        fontSize: 10,
        color: COLORS.primary,
        fontWeight: '600',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 32,
        paddingTop: 60,
    },
    emptyImage: {
        width: 120,
        height: 120,
        marginBottom: 24,
        opacity: 0.8,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 12,
        textAlign: 'center',
    },
    emptySubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        marginBottom: 32,
        lineHeight: 22,
    },
    exploreButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 24,
        paddingVertical: 14,
        borderRadius: 24,
        ...SHADOWS.medium,
    },
    exploreButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
});

export default FavoriteSitesScreen;
