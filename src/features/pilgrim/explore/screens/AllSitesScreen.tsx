import { Ionicons } from '@expo/vector-icons';
import { CommonActions } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    ImageBackground,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useFavorites } from '../../../../hooks/useFavorites';
import { useI18n } from '../../../../hooks/useI18n';
import { useSites } from '../../../../hooks/useSites';
import { VerticalSiteCard } from '../components/VerticalSiteCard';

type Props = NativeStackScreenProps<any, 'AllSites'>;

const FILTERS = ['Tất cả', 'Gần tôi nhất', 'Đang mở cửa', 'Nhà thờ lớn'];

export const AllSitesScreen: React.FC<Props> = ({ navigation }) => {
    const { isAuthenticated, isGuest } = useAuth();
    const { t } = useI18n();
    const [activeFilter, setActiveFilter] = useState('Tất cả');
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const searchAnim = useRef(new Animated.Value(0)).current;
    const searchInputRef = useRef<TextInput>(null);

    // Reusing the same hook without limiting page size to 10
    const {
        sites,
        isLoading,
        error,
        fetchSites,
        fetchMore,
        hasMore,
        isFetchingMore,
    } = useSites({
        filters: {
            page: 1,
            limit: 20,
        },
        autoFetch: true,
    });

    // Centralized favorites
    const { isFavorite, toggleFavorite } = useFavorites();

    const handleFavoriteToggle = (siteId: string) => {
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
        toggleFavorite(siteId);
    };

    const handleSearch = () => {
        setSearchQuery(searchText);
        fetchSites({ query: searchText });
    };

    const handleClearSearch = () => {
        setSearchText('');
        setSearchQuery('');
        fetchSites({});
    };

    const toggleSearch = () => {
        if (isSearchOpen) {
            // Close search
            Animated.timing(searchAnim, {
                toValue: 0,
                duration: 250,
                useNativeDriver: false,
            }).start(() => setIsSearchOpen(false));
            handleClearSearch();
        } else {
            // Open search
            setIsSearchOpen(true);
            Animated.timing(searchAnim, {
                toValue: 1,
                duration: 250,
                useNativeDriver: false,
            }).start(() => {
                searchInputRef.current?.focus();
            });
        }
    };

    const searchBarHeight = searchAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0, 52],
    });

    const searchBarOpacity = searchAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0, 0, 1],
    });

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
                    <Text style={styles.headerTitle}>{t('allSites.title', { defaultValue: 'Tất cả điểm đến' })}</Text>
                    <TouchableOpacity
                        onPress={toggleSearch}
                        style={styles.searchButton}
                    >
                        <Ionicons
                            name={isSearchOpen ? 'close' : 'search'}
                            size={22}
                            color={COLORS.primary}
                        />
                    </TouchableOpacity>
                </View>

                {/* Animated Search Bar */}
                <Animated.View style={[
                    styles.searchBarAnimated,
                    { height: searchBarHeight, opacity: searchBarOpacity }
                ]}>
                    <View style={styles.searchInputWrapper}>
                        <Ionicons name="search" size={18} color={COLORS.textTertiary} />
                        <TextInput
                            ref={searchInputRef}
                            style={styles.searchInput}
                            placeholder={t('allSites.searchPlaceholder', { defaultValue: "Tìm kiếm địa điểm..." })}
                            placeholderTextColor={COLORS.textTertiary}
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity onPress={handleClearSearch}>
                                <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </Animated.View>

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
                            <Text style={styles.retryButtonText}>{t('allSites.retry', { defaultValue: 'Thử lại' })}</Text>
                        </TouchableOpacity>
                    </View>
                ) : (
                    <>
                        {/* Filter Chips */}
                        <View style={styles.filtersContainer}>
                            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filtersScroll}>
                                {FILTERS.map((filter) => (
                                    <TouchableOpacity
                                        key={filter}
                                        style={[styles.filterChip, activeFilter === filter && styles.filterChipActive]}
                                        onPress={() => setActiveFilter(filter)}
                                    >
                                        <Text style={[styles.filterText, activeFilter === filter && styles.filterTextActive]}>
                                            {filter === 'Tất cả' ? t('allSites.filterAll', { defaultValue: 'Tất cả' }) :
                                             filter === 'Gần tôi nhất' ? t('allSites.filterNearest', { defaultValue: 'Gần tôi nhất' }) :
                                             filter === 'Đang mở cửa' ? t('allSites.filterOpen', { defaultValue: 'Đang mở cửa' }) :
                                             filter === 'Nhà thờ lớn' ? t('allSites.filterBigChurch', { defaultValue: 'Nhà thờ lớn' }) :
                                             filter}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                            </ScrollView>
                        </View>

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
                                    isFavorite={isFavorite(item.id)}
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
                                        <Text style={styles.emptyText}>
                                            {searchQuery ? t('allSites.emptySearch', { query: searchQuery, defaultValue: `Không tìm thấy "${searchQuery}"` }) : t('allSites.empty', { defaultValue: 'Chưa có địa điểm nào' })}
                                        </Text>
                                    </View>
                                ) : null
                            }
                        />
                    </>
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
    filtersContainer: {
        marginVertical: 4,
    },
    filtersScroll: {
        paddingHorizontal: SPACING.md,
        paddingBottom: 8,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: '#FFFFFF',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.1)',
        marginRight: 8,
    },
    filterChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    filterText: {
        fontSize: 14,
        color: '#4A5568',
        fontWeight: '500',
    },
    filterTextActive: {
        color: '#FFFFFF',
    },
    searchButton: {
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    searchBarAnimated: {
        overflow: 'hidden',
        paddingHorizontal: SPACING.md,
    },
    searchInputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: Platform.OS === 'ios' ? 10 : 4,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        gap: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
    },
});
