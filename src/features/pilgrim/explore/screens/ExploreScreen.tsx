import { Ionicons } from '@expo/vector-icons';
import { CommonActions, useScrollToTop } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useRef, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Animated,
    Dimensions,
    ImageBackground,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useNotifications } from '../../../../hooks/useNotifications';
import { useSites } from '../../../../hooks/useSites';
import notificationService from '../../../../services/notification/notificationService';
import { SiteRegion } from '../../../../types/pilgrim';
import { moderateScale } from '../../../../utils/responsive';
import { FeaturedCarousel } from '../components/FeaturedCarousel';
import { NotificationModal } from '../components/NotificationModal';
import { SiteListCard } from '../components/SiteListCard';

type Props = NativeStackScreenProps<any, 'ExploreMain'>;

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const BANNER_HEIGHT = moderateScale(220);
const HEADER_HEIGHT_Base = 60;

const REGIONS = [
    { id: 'all', label: 'Tất cả', value: undefined },
    { id: 'bac', label: 'Miền Bắc', value: 'Bac' as SiteRegion },
    { id: 'trung', label: 'Miền Trung', value: 'Trung' as SiteRegion },
    { id: 'nam', label: 'Miền Nam', value: 'Nam' as SiteRegion },
];

export const ExploreScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const HEADER_HEIGHT = HEADER_HEIGHT_Base + insets.top;

    const [selectedRegionId, setSelectedRegionId] = useState('all');
    const selectedRegion = REGIONS.find(r => r.id === selectedRegionId)?.value;
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [showNotifications, setShowNotifications] = useState(false);

    // Auth context
    const { isAuthenticated, isGuest } = useAuth();

    // Notification logic
    const { unreadCount, fetchNotifications } = useNotifications();

    useEffect(() => {
        const initNotifications = async () => {
            if (isAuthenticated && !isGuest) {
                await notificationService.registerForPushNotifications();
                fetchNotifications();
            }
        };
        initNotifications();
    }, [isAuthenticated, isGuest]);

    const {
        sites,
        isLoading,
        error,
        fetchSites,
        fetchMore,
        hasMore,
        isFetchingMore,
        toggleFavorite
    } = useSites({
        filters: {
            region: selectedRegion,
            query: searchQuery,
            page: 1,
            limit: 10
        },
        autoFetch: true
    });

    // Animation Values
    const scrollY = useRef(new Animated.Value(0)).current;

    // Scroll to top logic
    const scrollRef = useRef(null);
    useScrollToTop(scrollRef);

    const handleRegionChange = (regionId: string) => {
        setSelectedRegionId(regionId);
        const region = REGIONS.find(r => r.id === regionId)?.value;
        fetchSites({ region, query: searchQuery });
    };

    const handleSearch = () => {
        setSearchQuery(searchText);
        fetchSites({ region: selectedRegion, query: searchText });
    };

    const handleFavoriteToggle = async (siteId: string) => {
        if (!isAuthenticated || isGuest) {
            Alert.alert(
                'Yêu cầu đăng nhập',
                'Vui lòng đăng nhập để lưu địa điểm yêu thích.',
                [
                    { text: 'Để sau', style: 'cancel' },
                    {
                        text: 'Đăng nhập',
                        onPress: () => navigation.dispatch(
                            CommonActions.reset({
                                index: 0,
                                routes: [{ name: 'Auth' }],
                            })
                        )
                    },
                ]
            );
            return;
        }

        const site = sites.find(s => s.id === siteId);
        if (site) {
            // Optimistic update handled by hook
            toggleFavorite(siteId, site.isFavorite);
        }
    };

    // Derived Animations
    // Header Search Bar + Title Opacity
    // Trigger much later, when Large Header is mostly scrolled out
    const headerContentOpacity = scrollY.interpolate({
        inputRange: [120, 160], // Adjust this range based on Large Header Height
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const headerBgOpacity = scrollY.interpolate({
        inputRange: [0, 100], // Fade background earlier for readability
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    // Sticky Filter - Trigger when Normal Filters (below banner) are about to hit top
    // Large Header (~150) + Banner (~250 + 32) -> ~432 total offset roughly
    // Trigger around 400-420.
    const STICKY_TRIGGER_VAL = 410;

    const stickyFilterOpacity = scrollY.interpolate({
        inputRange: [STICKY_TRIGGER_VAL - 20, STICKY_TRIGGER_VAL],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const stickyFilterTranslateY = scrollY.interpolate({
        inputRange: [STICKY_TRIGGER_VAL - 20, STICKY_TRIGGER_VAL],
        outputRange: [20, 0],
        extrapolate: 'clamp',
    });

    // Derived Animations
    // Header Search Bar + Title Opacity
    // Trigger much later, when Large Header is mostly scrolled out
    // ... animation definitions ...

    // Renderers
    // Banner renderer removed (extracted to component)

    const renderFilters = (isSticky = false) => (
        <View style={[
            styles.filterContainer,
            isSticky && styles.stickyFilterContent
        ]}>
            <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.filterScrollContent}
            >
                {REGIONS.map(region => {
                    const isActive = region.id === selectedRegionId;
                    return (
                        <TouchableOpacity
                            key={region.id}
                            style={[
                                styles.filterChip,
                                isActive && styles.filterChipActive,
                                isSticky && styles.filterChipSticky // Smaller styling for sticky
                            ]}
                            onPress={() => handleRegionChange(region.id)}
                            activeOpacity={0.7}
                        >
                            <Text style={[
                                styles.filterChipText,
                                isActive && styles.filterChipTextActive
                            ]}>
                                {region.label}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </ScrollView>
        </View>
    );

    return (
        <ImageBackground
            source={require('../../../../../assets/images/bg1.jpg')}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar
                barStyle="dark-content"
                backgroundColor="transparent"
                translucent
            />

            {/* --- CUSTOM HEADER --- */}
            <Animated.View
                style={[
                    styles.headerWrapper,
                    {
                        height: HEADER_HEIGHT,
                        paddingTop: insets.top,
                        backgroundColor: headerBgOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['rgba(255,255,255,0)', '#FFFFFF']
                        }),
                        borderBottomWidth: 1,
                        borderBottomColor: headerBgOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: ['transparent', 'rgba(0,0,0,0.05)']
                        }),
                        shadowColor: "#000",
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: headerBgOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 0.05]
                        }),
                        shadowRadius: 10,
                        elevation: headerBgOpacity.interpolate({
                            inputRange: [0, 1],
                            outputRange: [0, 4]
                        })
                    }
                ]}
            >
                <View style={styles.headerContent}>
                    {isSearching ? (
                        /* --- HERO SEARCH BAR (Expanded) --- */
                        <View style={styles.searchContainer}>
                            <View style={[styles.searchInputWrapper, styles.heroSearchBar]}>
                                <Ionicons name="search" size={20} color={COLORS.primary} />
                                <TextInput
                                    style={styles.searchInput}
                                    placeholder="Tìm thánh đường, địa phận..."
                                    placeholderTextColor="#9CA3AF"
                                    autoFocus
                                    value={searchText}
                                    onChangeText={setSearchText}
                                    onSubmitEditing={handleSearch}
                                />
                                {searchText.length > 0 && (
                                    <TouchableOpacity onPress={() => setSearchText('')}>
                                        <Ionicons name="close-circle" size={18} color={COLORS.textTertiary} />
                                    </TouchableOpacity>
                                )}
                            </View>
                            <TouchableOpacity onPress={() => {
                                setIsSearching(false);
                                setSearchText('');
                                if (searchQuery) {
                                    setSearchQuery('');
                                    fetchSites({ region: selectedRegion, query: '' });
                                }
                            }}>
                                <Text style={styles.cancelText}>Hủy</Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        /* --- NORMAL HEADER (Collapsed) --- */
                        <>
                            <Animated.View style={[styles.headerLeft, { opacity: headerContentOpacity }]}>
                                {/* Dummy Search Bar for Header when scrolled */}
                                <TouchableOpacity
                                    style={styles.dummySearchBar}
                                    onPress={() => setIsSearching(true)}
                                    activeOpacity={0.9}
                                >
                                    <Ionicons name="search" size={16} color={COLORS.textSecondary} />
                                    <Text style={styles.dummySearchText}>Tìm thánh đường...</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={styles.headerRight}>
                                {/* Note: Search Icon removed here as it's replaced by Dummy Search Bar on left */}

                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => {
                                        if (!isAuthenticated || isGuest) {
                                            alert('Vui lòng đăng nhập để xem thông báo');
                                            return;
                                        }
                                        setShowNotifications(true);
                                    }}
                                >
                                    <Ionicons name="notifications-outline" size={26} color={COLORS.primary} />
                                    {unreadCount > 0 && (
                                        <View style={styles.badge}>
                                            <Text style={styles.badgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
                                        </View>
                                    )}
                                </TouchableOpacity>
                            </View>
                        </>
                    )}
                </View>

                {/* --- STICKY FILTERS --- */}
                <Animated.View
                    style={[
                        styles.stickyFilterContainer,
                        {
                            opacity: stickyFilterOpacity,
                            transform: [{ translateY: stickyFilterTranslateY }],
                            top: HEADER_HEIGHT,
                        }
                    ]}
                >
                    {renderFilters(true)}
                </Animated.View>
            </Animated.View>

            <NotificationModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            {/* --- MAIN SCROLLVIEW --- */}
            <Animated.ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 20, // More breathing room
                    paddingBottom: 100
                }}
                showsVerticalScrollIndicator={false}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    {
                        useNativeDriver: false,
                        listener: (e: NativeSyntheticEvent<NativeScrollEvent>) => {
                            const { layoutMeasurement, contentOffset, contentSize } = e.nativeEvent;
                            const paddingToBottom = 200;
                            if (layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom) {
                                if (hasMore && !isFetchingMore && !isLoading) {
                                    fetchMore();
                                }
                            }
                        }
                    }
                )}
                scrollEventThrottle={16}
            >
                {/* --- HERO TITLE & SEARCH TRIGGER (Visible initially) --- */}
                {!isSearching && (
                    <View style={styles.largeHeaderContainer}>
                        <Text style={styles.largeHeaderTitle}>Khám Phá</Text>
                        <Text style={styles.largeHeaderSubtitle}>Hành trình đức tin của bạn</Text>

                        {/* Large Dummy Search Bar for initial view */}
                        <TouchableOpacity
                            style={styles.largesearchTrigger}
                            onPress={() => setIsSearching(true)}
                            activeOpacity={0.9}
                        >
                            <Ionicons name="search" size={20} color={COLORS.primary} />
                            <Text style={styles.largeSearchPlaceHolder}>Tìm tên thánh đường, địa phận...</Text>
                        </TouchableOpacity>
                    </View>
                )}

                {/* --- BANNER --- */}
                {/* Extracted to FeaturedCarousel */}
                {sites && sites.length > 0 && (
                    <FeaturedCarousel
                        sites={sites}
                        onSitePress={(siteId) => navigation.navigate('SiteDetail', { siteId })}
                    />
                )}

                {/* --- NORMAL FILTERS --- */}
                <View style={styles.normalFilterSection}>
                    {renderFilters(false)}
                </View>

                {/* --- LIST --- */}
                <View style={styles.listContainer}>
                    {isLoading && (!sites || sites.length === 0) ? (
                        <View style={styles.centerContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                        </View>
                    ) : error ? (
                        <View style={styles.centerContainer}>
                            <Ionicons name="alert-circle-outline" size={48} color="#FF3B30" />
                            <Text style={styles.errorText}>{error}</Text>
                            <TouchableOpacity
                                style={styles.retryButton}
                                onPress={() => fetchSites({ region: selectedRegion, query: searchQuery })}
                            >
                                <Text style={styles.retryButtonText}>Thử lại</Text>
                            </TouchableOpacity>
                        </View>
                    ) : !sites || sites.length === 0 ? (
                        <View style={styles.emptyContainer}>
                            <Ionicons name="map-outline" size={60} color="#D1D1D6" />
                            <Text style={styles.emptyText}>Chưa có địa điểm nào</Text>
                        </View>
                    ) : (
                        <>
                            {sites.map(site => (
                                <SiteListCard
                                    key={site.id}
                                    id={site.id}
                                    name={site.name}
                                    address={site.address}
                                    siteType={site.type}
                                    region={site.region}
                                    coverImage={site.coverImage}
                                    reviewCount={site.reviewCount}
                                    isFavorite={site.isFavorite} // Assuming API returns this
                                    onPress={() => navigation.navigate('SiteDetail', { siteId: site.id })}
                                    onFavoritePress={() => handleFavoriteToggle(site.id)}
                                />
                            ))}
                            {isFetchingMore && (
                                <View style={styles.loadingMore}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                </View>
                            )}
                        </>
                    )}
                </View>
            </Animated.ScrollView>
        </ImageBackground>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8F9FA',
    },
    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
    },
    headerContent: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.lg,
    },
    headerLeft: {
        flex: 1,
        marginRight: 12,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    dummySearchBar: {
        backgroundColor: '#F3F4F6',
        borderRadius: 20,
        paddingHorizontal: 12,
        height: 36,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dummySearchText: {
        color: '#9CA3AF',
        fontSize: 14,
    },
    headerRight: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    iconButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.8)',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    searchContainer: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    searchInputWrapper: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 24,
        paddingHorizontal: 14,
        height: 44,
        gap: 10,
        // Shadow for Hero Search
        shadowColor: "rgba(189, 157, 88, 0.2)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 10,
        elevation: 4,
    },
    heroSearchBar: {
        borderWidth: 1,
        borderColor: "rgba(189, 157, 88, 0.3)",
    },
    searchInput: {
        flex: 1,
        fontSize: 15,
        color: COLORS.textPrimary,
        padding: 0,
    },
    cancelText: {
        fontSize: 15,
        color: COLORS.primary,
        fontWeight: '600',
    },
    largeHeaderContainer: {
        paddingHorizontal: SPACING.lg,
        paddingBottom: 24,
        // paddingTop: 10, // Handled by container padding
    },
    largeHeaderTitle: {
        fontSize: 34,
        fontWeight: '800',
        color: COLORS.primary,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
        marginBottom: 4,
    },
    largeHeaderSubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginBottom: 16, // Reduced closer to search bar
    },
    largesearchTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        paddingVertical: 14,
        paddingHorizontal: 16,
        borderRadius: 16,
        gap: 12,
        // Soft Gold Shadow
        shadowColor: "rgba(189, 157, 88, 0.2)",
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 1,
        shadowRadius: 20,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
    },
    largeSearchPlaceHolder: {
        color: '#6B7280',
        fontSize: 15,
    },
    sectionHeader: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1A1A1A',
        marginLeft: SPACING.lg,
        marginBottom: 16,
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    // Banner styles moved to FeaturedCarousel.tsx
    normalFilterSection: {
        marginBottom: 20,
    },
    stickyFilterContainer: {
        position: 'absolute',
        left: 0,
        right: 0,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
        paddingVertical: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 4,
    },
    stickyFilterContent: {
        // Additional styling for sticky state if needed
    },
    filterContainer: {
        // Wrapper styles
    },
    filterScrollContent: {
        paddingHorizontal: SPACING.lg,
        gap: 12,
    },
    filterChip: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 24,
        backgroundColor: 'rgba(255, 255, 255, 0.8)', // Semi-transparent
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        // borderless look preferred for luxury, but border helps visibility on pattern
    },
    filterChipSticky: {
        paddingVertical: 8,
        backgroundColor: '#F3F4F6',
        borderWidth: 0,
    },
    filterChipActive: {
        backgroundColor: '#B45309', // Deep Gold/Amber
        borderColor: '#B45309',
    },
    filterChipText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#6B7280',
    },
    filterChipTextActive: {
        color: '#fff',
    },
    listContainer: {
        paddingHorizontal: SPACING.lg,
    },
    centerContainer: {
        padding: 40,
        alignItems: 'center',
    },
    scrollView: {
        flex: 1,
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
        backgroundColor: 'rgba(255,255,255,0.5)',
        borderRadius: 20,
        marginTop: 20,
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
    badge: {
        position: 'absolute',
        top: -4,
        right: -4,
        backgroundColor: '#EF4444',
        borderRadius: 10,
        minWidth: 18,
        height: 18,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    badgeText: {
        color: '#fff',
        fontSize: 9,
        fontWeight: 'bold',
    },
});
