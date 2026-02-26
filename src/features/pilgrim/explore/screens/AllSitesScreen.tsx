import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    ImageBackground,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useSites } from '../../../../hooks/useSites';
import { VerticalSiteCard } from '../components/VerticalSiteCard';

type Props = NativeStackScreenProps<any, 'AllSites'>;

export const AllSitesScreen: React.FC<Props> = ({ navigation }) => {
    const { isAuthenticated, isGuest } = useAuth();

    // Reusing the same hook without limiting page size to 10
    const {
        sites,
        isLoading,
        error,
        fetchSites,
        fetchMore,
        hasMore,
        isFetchingMore,
        toggleFavorite,
    } = useSites({
        filters: {
            page: 1,
            limit: 20, // Load more per page since it's a dedicated list
        },
        autoFetch: true,
    });

    const handleFavoriteToggle = async (siteId: string) => {
        if (!isAuthenticated || isGuest) {
            Alert.alert(
                'Yêu cầu đăng nhập',
                'Vui lòng đăng nhập để lưu địa điểm yêu thích.',
                [
                    { text: 'Để sau', style: 'cancel' },
                    {
                        text: 'Đăng nhập',
                        onPress: () =>
                            navigation.dispatch(
                                CommonActions.reset({
                                    index: 0,
                                    routes: [{ name: 'Auth' }],
                                })
                            ),
                    },
                ]
            );
            return;
        }

        const site = sites.find((s) => s.id === siteId);
        if (site) {
            // Optimistic update handled by hook
            toggleFavorite(siteId, site.isFavorite);
        }
    };

    const renderFooter = () => {
        if (!isFetchingMore) return <View style={{ height: 40 }} />;
        return (
            <View style={styles.loadingMore}>
                <ActivityIndicator size="small" color={COLORS.primary} />
            </View>
        );
    };

    return (
        <ImageBackground
            source={require('../../../../../assets/images/bg1.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <SafeAreaView style={styles.safeArea}>
                <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />
                <View style={styles.header}>
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Ionicons name="arrow-back" size={24} color={COLORS.primary} />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Tất cả điểm đến</Text>
                    <View style={{ width: 40 }} />
                </View>

                {isLoading && sites.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <ActivityIndicator size="large" color={COLORS.primary} />
                    </View>
                ) : error && sites.length === 0 ? (
                    <View style={styles.centerContainer}>
                        <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
                        <Text style={styles.errorText}>{error}</Text>
                        <TouchableOpacity
                            style={styles.retryButton}
                            onPress={() => fetchSites({})}
                        >
                            <Text style={styles.retryButtonText}>Thử lại</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <FlatList
                        data={sites}
                        keyExtractor={(item) => item.id}
                        contentContainerStyle={styles.listContainer}
                        showsVerticalScrollIndicator={false}
                        renderItem={({ item }) => (
                            <VerticalSiteCard
                                id={item.id}
                                name={item.name}
                                address={item.address}
                                siteType={item.type}
                                region={item.region}
                                coverImage={item.coverImage}
                                reviewCount={item.reviewCount}
                                isFavorite={item.isFavorite}
                                onPress={() => navigation.navigate('SiteDetail', { siteId: item.id })}
                                onFavoritePress={() => handleFavoriteToggle(item.id)}
                            />
                        )}
                        onEndReached={() => {
                            if (hasMore && !isFetchingMore && !isLoading) {
                                fetchMore();
                            }
                        }}
                        onEndReachedThreshold={0.5}
                        ListFooterComponent={renderFooter}
                        ListEmptyComponent={
                            !isLoading ? (
                                <View style={styles.emptyContainer}>
                                    <Ionicons name="map-outline" size={60} color="#D1D1D6" />
                                    <Text style={styles.emptyText}>Chưa có địa điểm nào</Text>
                                </View>
                            ) : null
                        }
                    />
                )}
            </SafeAreaView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    safeArea: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingVertical: 12,
        backgroundColor: 'transparent',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    backButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    listContainer: {
        padding: SPACING.lg,
    },
    centerContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: SPACING.xl,
    },
    errorText: {
        color: '#FF3B30',
        textAlign: 'center',
        marginTop: 12,
        marginBottom: 12,
    },
    retryButton: {
        backgroundColor: COLORS.primary,
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    retryButtonText: {
        color: '#fff',
        fontWeight: '600',
    },
    emptyContainer: {
        padding: 40,
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 40,
    },
    emptyText: {
        marginTop: 16,
        color: COLORS.textSecondary,
        fontSize: 16,
    },
    loadingMore: {
        paddingVertical: 20,
        alignItems: 'center',
    },
});
