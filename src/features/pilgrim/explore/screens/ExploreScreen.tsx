import { Ionicons } from '@expo/vector-icons';
import { useScrollToTop } from '@react-navigation/native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    ActivityIndicator,
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
import { GuestLoginModal } from '../../../../components/ui/GuestLoginModal';
import { COLORS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useFavorites } from '../../../../hooks/useFavorites';
import { useNotifications } from '../../../../hooks/useNotifications';
import { useSites } from '../../../../hooks/useSites';
import { useI18n } from '../../../../hooks/useI18n';
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
    const [showGuestLogin, setShowGuestLogin] = useState(false);
    const [showRegionFilter, setShowRegionFilter] = useState(false);
    const [filterHasEvents, setFilterHasEvents] = useState(false);

    // Auth context
    const { isAuthenticated, isGuest } = useAuth();
    const { t } = useI18n();

    // Notification logic
    const { unreadCount, fetchNotifications } = useNotifications();

    useEffect(() => {
        const initNotifications = async () => {
            if (isAuthenticated && !isGuest) {
                await notificationService.registerForPushNotifications();
                fetchNotifications(true);
            }
        };
        initNotifications();
    }, [isAuthenticated, isGuest, fetchNotifications]);

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
            region: selectedRegion,
            query: searchQuery,
            has_events: filterHasEvents ? 'true' : undefined,
            page: 1,
            limit: 10
        },
        autoFetch: true
    });

    // Fetch a larger pool of sites to determine the featured top 5 locally
    const {
        sites: featuredCandidateSites,
    } = useSites({
        filters: {
            page: 1,
            limit: 50
        },
        autoFetch: true
    });

    // Dynamic Featured Sites: Top 5 by weighted score (Rating & Review Count)
    const featuredSites = useMemo(() => {
        if (!featuredCandidateSites || featuredCandidateSites.length === 0) return [];
        return [...featuredCandidateSites]
            .sort((a, b) => {
                // Weighted score: balances rating value and number of reviews
                const scoreA = (a.rating || 0) * Math.log10((a.reviewCount || 0) + 1);
                const scoreB = (b.rating || 0) * Math.log10((b.reviewCount || 0) + 1);
                
                return scoreB - scoreA;
            })
            .slice(0, 5);
    }, [featuredCandidateSites]);

    // Centralized favorites
    const { isFavorite, toggleFavorite } = useFavorites();

    // Animation Values
    const scrollY = useRef(new Animated.Value(0)).current;

    // Scroll to top logic
    const scrollRef = useRef(null);
    useScrollToTop(scrollRef);

    const handleRegionChange = (regionId: string) => {
        setSelectedRegionId(regionId);
        const region = REGIONS.find(r => r.id === regionId)?.value;
        fetchSites({ region, query: searchQuery, has_events: filterHasEvents ? 'true' : undefined });
    };

    const toggleHasEvents = () => {
        const newValue = !filterHasEvents;
        setFilterHasEvents(newValue);
        fetchSites({ region: selectedRegion, query: searchQuery, has_events: newValue ? 'true' : undefined });
    };

    const handleSearch = () => {
        setSearchQuery(searchText);
        fetchSites({ region: selectedRegion, query: searchText });
    };

    const handleFavoriteToggle = (siteId: string) => {
        if (!isAuthenticated || isGuest) {
            setShowGuestLogin(true);
            return;
        }
        toggleFavorite(siteId);
    };

    // Derived Animations
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

    // Sticky Filter removed as requested

    // Derived Animations
    // Header Search Bar + Title Opacity
    // Trigger much later, when Large Header is mostly scrolled out
    // ... animation definitions ...

    // Renderers
    // Banner renderer removed (extracted to component)



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
                                    placeholder={t('explore.searchPlaceholder', { defaultValue: "Tìm thánh đường, địa phận..." })}
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
                            <TouchableOpacity 
                                style={styles.headerFilterBtn} 
                                onPress={() => setShowRegionFilter(true)}
                            >
                                <Ionicons name="options-outline" size={24} color={selectedRegionId !== 'all' ? COLORS.primary : COLORS.textSecondary} />
                                {selectedRegionId !== 'all' && <View style={styles.filterActiveDot} />}
                            </TouchableOpacity>
                            <TouchableOpacity onPress={() => {
                                setIsSearching(false);
                                setSearchText('');
                                if (searchQuery) {
                                    setSearchQuery('');
                                    fetchSites({ region: selectedRegion, query: '' });
                                }
                            }}>
                                <Text style={styles.cancelText}>{t('explore.cancel', { defaultValue: 'Hủy' })}</Text>
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
                                    <Text style={styles.dummySearchText}>{t('explore.dummySearchPlaceholder', { defaultValue: 'Tìm thánh đường...' })}</Text>
                                </TouchableOpacity>
                            </Animated.View>

                            <View style={styles.headerRight}>
                                {/* Note: Search Icon removed here as it's replaced by Dummy Search Bar on left */}

                                <TouchableOpacity
                                    style={styles.iconButton}
                                    onPress={() => {
                                        if (!isAuthenticated || isGuest) {
                                            setShowGuestLogin(true);
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


            </Animated.View>

            <NotificationModal
                visible={showNotifications}
                onClose={() => setShowNotifications(false)}
            />

            <GuestLoginModal
                visible={showGuestLogin}
                onClose={() => setShowGuestLogin(false)}
            />

            {showRegionFilter && (
                <View style={styles.modalOverlay}>
                    <TouchableOpacity style={styles.overlayDismiss} onPress={() => setShowRegionFilter(false)} />
                    <View style={styles.modalContent}>
                        <View style={styles.modalHeader}>
                            <Text style={styles.modalTitle}>Bộ lọc tìm kiếm</Text>
                            <TouchableOpacity onPress={() => setShowRegionFilter(false)}>
                                <Ionicons name="close-circle" size={26} color="#D1D5DB" />
                            </TouchableOpacity>
                        </View>
                        
                        <View style={styles.filterSection}>
                             <Text style={styles.filterSectionLabel}>Khu vực</Text>
                             <View style={styles.regionGrid}>
                                {REGIONS.map(region => {
                                    const isActive = region.id === selectedRegionId;
                                    return (
                                        <TouchableOpacity
                                            key={region.id}
                                            style={[styles.regionChip, isActive && styles.regionChipActive]}
                                            onPress={() => handleRegionChange(region.id)}
                                        >
                                            <Text style={[styles.regionChipText, isActive && styles.regionChipTextActive]}>
                                                {region.id === 'all' ? 'Tất cả' :
                                                 region.id === 'bac' ? 'Miền Bắc' :
                                                 region.id === 'trung' ? 'Miền Trung' : 'Miền Nam'}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                             </View>
                        </View>

                        <View style={styles.filterSection}>
                            <Text style={styles.filterSectionLabel}>Tính năng</Text>
                            <TouchableOpacity 
                                style={[styles.optionRow, filterHasEvents && styles.optionRowActive]}
                                onPress={toggleHasEvents}
                            >
                                <View style={styles.optionRowLeft}>
                                    <View style={[styles.optionIconBox, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}>
                                        <Ionicons name="calendar" size={20} color="#EF4444" />
                                    </View>
                                    <View>
                                        <Text style={styles.optionRowTitle}>Có sự kiện</Text>
                                        <Text style={styles.optionRowSub}>Hiện các địa điểm đang có lễ hội/sự kiện</Text>
                                    </View>
                                </View>
                                <View style={[styles.toggleBase, filterHasEvents && styles.toggleBaseActive]}>
                                    <View style={[styles.toggleCircle, filterHasEvents && styles.toggleCircleActive]} />
                                </View>
                            </TouchableOpacity>
                        </View>

                        <TouchableOpacity 
                            style={styles.applyBtn}
                            onPress={() => setShowRegionFilter(false)}
                        >
                            <Text style={styles.applyBtnText}>Áp dụng</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            )}

            {/* --- MAIN SCROLLVIEW --- */}
            <Animated.ScrollView
                ref={scrollRef}
                style={styles.scrollView}
                contentContainerStyle={{
                    paddingTop: HEADER_HEIGHT + 5, // Moved up slightly
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
                        <Text style={styles.largeHeaderTitle}>{t('explore.title', { defaultValue: 'Khám Phá' })}</Text>
                        <Text style={styles.largeHeaderSubtitle}>{t('explore.subtitle', { defaultValue: 'Hành trình đức tin của bạn' })}</Text>

                        <View style={styles.pillContainer}>
                            <TouchableOpacity
                                style={styles.pillSearchSection}
                                onPress={() => setIsSearching(true)}
                                activeOpacity={0.9}
                            >
                                <Ionicons name="search" size={20} color={COLORS.primary} />
                                <Text style={styles.pillSearchText} numberOfLines={1}>
                                    {t('explore.searchPlaceholder', { defaultValue: 'Tìm thánh đường, địa phận...' })}
                                </Text>
                            </TouchableOpacity>
                            
                            <View style={styles.pillDivider} />
                            
                            <TouchableOpacity 
                                style={styles.pillFilterSection}
                                onPress={() => setShowRegionFilter(true)}
                            >
                                <Ionicons name="options-outline" size={22} color={selectedRegionId !== 'all' ? COLORS.primary : COLORS.textSecondary} />
                                {selectedRegionId !== 'all' && <View style={styles.filterActiveDot} />}
                            </TouchableOpacity>
                        </View>
                    </View>
                )}

                {/* --- BANNER --- */}
                {/* Extracted to FeaturedCarousel */}
                {featuredSites && featuredSites.length > 0 && (
                    <FeaturedCarousel
                        sites={featuredSites}
                        onSitePress={(siteId) => navigation.navigate('SiteDetail', { siteId })}
                    />
                )}



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
                            <Text style={styles.emptyText}>{t('explore.empty', { defaultValue: 'Chưa có địa điểm nào' })}</Text>
                        </View>
                    ) : (
                        <>
                            <View style={styles.sectionHeaderRow}>
                                <Text style={styles.sectionTitle}>{t('explore.sacredDestinations', { defaultValue: 'Điểm đến linh thiêng' })}</Text>
                                <TouchableOpacity
                                    onPress={() => navigation.navigate('AllSites')}
                                    style={styles.seeMoreBtn}
                                >
                                    <Text style={styles.seeMoreText}>{t('explore.seeMore', { defaultValue: 'Xem thêm' })}</Text>
                                    <Ionicons name="chevron-forward" size={16} color={COLORS.primary} />
                                </TouchableOpacity>
                            </View>

                            {sites.slice(0, 10).map(site => (
                                <SiteListCard
                                    key={site.id}
                                    id={site.id}
                                    name={site.name}
                                    address={site.address}
                                    siteType={site.type}
                                    region={site.region}
                                    coverImage={site.coverImage}
                                    reviewCount={site.reviewCount}
                                    isFavorite={isFavorite(site.id)}
                                    onPress={() => navigation.navigate('SiteDetail', { siteId: site.id })}
                                    onFavoritePress={() => handleFavoriteToggle(site.id)}
                                />
                            ))}
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
        marginBottom: 2,
    },
    largeHeaderSubtitle: {
        fontSize: 15,
        color: COLORS.textSecondary,
        fontStyle: 'italic',
        marginBottom: 10, // Reduced closer to search bar
    },

    sectionHeaderRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1A1A1A',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    seeMoreBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 2,
    },
    seeMoreText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.primary,
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
    headerFilterBtn: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#F3F4F6',
        justifyContent: 'center',
        alignItems: 'center',
        marginHorizontal: 8,
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    pillContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 28, // Pill shape
        height: 56,
        // Soft Shadow
        shadowColor: "rgba(0, 0, 0, 0.1)",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 1,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.6)',
        paddingHorizontal: 6,
    },
    pillSearchSection: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        gap: 12,
        height: '100%',
    },
    pillSearchText: {
        color: '#9CA3AF',
        fontSize: 15,
        flex: 1,
    },
    pillDivider: {
        width: 1,
        height: 24,
        backgroundColor: '#E5E7EB',
        marginHorizontal: 4,
    },
    pillFilterSection: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: 22,
    },
    filterActiveDot: {
        position: 'absolute',
        top: 8,
        right: 8,
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#EF4444',
        borderWidth: 1.5,
        borderColor: '#fff',
    },
    modalOverlay: {
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.5)',
        zIndex: 1000,
        justifyContent: 'flex-end',
    },
    overlayDismiss: {
        flex: 1,
    },
    modalContent: {
        backgroundColor: '#FFFFFF',
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        padding: 24,
        paddingBottom: 40,
        // Premium shadow
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -10 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 20,
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 28,
    },
    modalTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: '#1A1A1A',
        fontFamily: Platform.OS === 'ios' ? 'Georgia' : 'serif',
    },
    filterSection: {
        marginBottom: 32,
    },
    filterSectionLabel: {
        fontSize: 16,
        fontWeight: '700',
        color: '#4B5563',
        marginBottom: 16,
    },
    regionGrid: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
    },
    regionChip: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    regionChipActive: {
        backgroundColor: COLORS.primary,
        borderColor: COLORS.primary,
    },
    regionChipText: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '600',
    },
    regionChipTextActive: {
        color: '#FFFFFF',
    },
    optionRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#F3F4F6',
    },
    optionRowActive: {
        borderColor: COLORS.primary,
        backgroundColor: 'rgba(189, 157, 88, 0.05)',
    },
    optionRowLeft: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
        flex: 1,
    },
    optionIconBox: {
        width: 44,
        height: 44,
        borderRadius: 12,
        justifyContent: 'center',
        alignItems: 'center',
    },
    optionRowTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#1F2937',
    },
    optionRowSub: {
        fontSize: 12,
        color: '#6B7280',
        marginTop: 2,
    },
    toggleBase: {
        width: 48,
        height: 26,
        borderRadius: 13,
        backgroundColor: '#E5E7EB',
        padding: 2,
    },
    toggleBaseActive: {
        backgroundColor: COLORS.primary,
    },
    toggleCircle: {
        width: 22,
        height: 22,
        borderRadius: 11,
        backgroundColor: '#FFFFFF',
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 2,
        elevation: 2,
    },
    toggleCircleActive: {
        alignSelf: 'flex-end',
    },
    applyBtn: {
        backgroundColor: COLORS.primary,
        height: 56,
        borderRadius: 16,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: 8,
    },
    applyBtnText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700',
    },
    regionOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F3F4F6',
    },
    regionOptionActive: {
        backgroundColor: 'rgba(189, 157, 88, 0.05)',
        borderRadius: 12,
        paddingHorizontal: 12,
        borderBottomWidth: 0,
    },
    regionOptionText: {
        fontSize: 16,
        color: '#4B5563',
        fontWeight: '500',
    },
    regionOptionTextActive: {
        color: COLORS.primary,
        fontWeight: '700',
    },
});
