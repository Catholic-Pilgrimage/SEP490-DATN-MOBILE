import { Ionicons } from '@expo/vector-icons';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import React, { useRef, useState } from 'react';
import {
    ActivityIndicator,
    Animated,
    ImageBackground,
    NativeScrollEvent,
    NativeSyntheticEvent,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SPACING } from '../../../../constants/theme.constants';
import { useSites } from '../../../../hooks/useSites';
import { SiteRegion } from '../../../../types/pilgrim';
import { getSpacing, moderateScale } from '../../../../utils/responsive';
import { SiteListCard } from '../components/SiteListCard';

type Props = NativeStackScreenProps<any, 'ExploreMain'>;

const REGIONS = [
    { id: 'all', label: 'Tất cả', value: undefined },
    { id: 'bac', label: 'Miền Bắc', value: 'Bac' as SiteRegion },
    { id: 'trung', label: 'Miền Trung', value: 'Trung' as SiteRegion },
    { id: 'nam', label: 'Miền Nam', value: 'Nam' as SiteRegion },
];

export const ExploreScreen: React.FC<Props> = ({ navigation }) => {
    const insets = useSafeAreaInsets();
    const [selectedRegionId, setSelectedRegionId] = useState('all');
    const selectedRegion = REGIONS.find(r => r.id === selectedRegionId)?.value;
    const [searchText, setSearchText] = useState('');
    const [searchQuery, setSearchQuery] = useState('');

    const {
        sites,
        isLoading,
        error,
        fetchSites,
        fetchMore,
        hasMore,
        isFetchingMore
    } = useSites({
        filters: {
            region: selectedRegion,
            query: searchQuery,
            page: 1,
            limit: 10
        },
        autoFetch: true
    });

    const headerTranslateY = useRef(new Animated.Value(0)).current;
    const headerBgOpacity = useRef(new Animated.Value(0)).current;
    const headerHeight = useRef(new Animated.Value(56)).current;
    const contentPaddingTop = useRef(new Animated.Value(140)).current;
    const lastScrollY = useRef(0);

    const handleRegionChange = (regionId: string) => {
        setSelectedRegionId(regionId);
        const region = REGIONS.find(r => r.id === regionId)?.value;
        fetchSites({ region, query: searchQuery });
    };

    const handleSearch = () => {
        setSearchQuery(searchText);
        fetchSites({ region: selectedRegion, query: searchText });
    };

    const handleMainScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        const scrollDiff = currentScrollY - lastScrollY.current;

        const newOpacity = Math.min(currentScrollY / 100, 1);
        Animated.timing(headerBgOpacity, {
            toValue: newOpacity,
            duration: 0,
            useNativeDriver: false, // Changed to false for height animation compatibility
        }).start();

        // Animate header height - collapse when scrolled
        const newHeaderHeight = currentScrollY > 30 ? 0 : 56;
        Animated.timing(headerHeight, {
            toValue: newHeaderHeight,
            duration: 150,
            useNativeDriver: false,
        }).start();

        // Animate paddingTop separately without native driver
        const newPaddingTop = currentScrollY > 50 ? 85 : 140;
        Animated.timing(contentPaddingTop, {
            toValue: newPaddingTop,
            duration: 200,
            useNativeDriver: false,
        }).start();

        if (scrollDiff > 5 && currentScrollY > 50) {
            Animated.spring(headerTranslateY, {
                toValue: -100,
                useNativeDriver: true,
                tension: 100,
                friction: 12,
            }).start();
        } else if (scrollDiff < -5) {
            Animated.spring(headerTranslateY, {
                toValue: 0,
                useNativeDriver: true,
                tension: 100,
                friction: 12,
            }).start();
        }

        lastScrollY.current = currentScrollY;
    };

    const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        handleMainScroll(event);

        const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
        const paddingToBottom = 100;
        const isCloseToBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - paddingToBottom;

        if (isCloseToBottom && hasMore && !isFetchingMore) {
            fetchMore();
        }
    };

    const handleFavoriteToggle = async (siteId: string) => {
        console.log('Toggle favorite for:', siteId);
    };

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
                animated
            />

            <Animated.View
                style={[
                    styles.headerWrapper,
                    {
                        paddingTop: insets.top,
                        backgroundColor: headerBgOpacity.interpolate({
                            inputRange: [0, 0.3, 1],
                            outputRange: ['rgba(248, 248, 246, 0)', 'rgba(248, 248, 246, 0.95)', 'rgba(248, 248, 246, 1)']
                        }),
                        borderBottomWidth: 1,
                        borderBottomColor: headerBgOpacity.interpolate({
                            inputRange: [0, 0.5, 1],
                            outputRange: ['rgba(230, 228, 220, 0)', 'rgba(230, 228, 220, 0.5)', 'rgba(230, 228, 220, 1)']
                        }),
                    }
                ]}
            >

                {/* Header with Menu, Title, Profile - Collapses on scroll */}
                <Animated.View
                    style={[
                        styles.header,
                        {
                            opacity: headerBgOpacity.interpolate({
                                inputRange: [0, 0.3, 0.6],
                                outputRange: [1, 0.5, 0]
                            }),
                            height: headerHeight,
                            overflow: 'hidden',
                        }
                    ]}
                >
                    <TouchableOpacity
                        style={styles.menuButton}
                        onPress={() => {
                            console.log('Open menu');
                        }}
                    >
                        <Ionicons name="menu" size={28} color="#ecb613" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <Text style={styles.headerTitle}>Khám Phá Thánh Địa</Text>
                    </View>

                    <TouchableOpacity
                        style={styles.profileButton}
                        onPress={() => {
                            console.log('Open profile');
                        }}
                    >
                        <Ionicons name="person-circle-outline" size={30} color="#ecb613" />
                    </TouchableOpacity>
                </Animated.View>

                {/* Search Bar - stays visible but moves up */}
                <View style={styles.searchSection}>
                    <View style={styles.searchBarContainer}>
                        <Ionicons
                            name="search"
                            size={20}
                            color="#ecb613"
                            style={styles.searchIcon}
                        />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Tìm kiếm thánh địa..."
                            placeholderTextColor="#897f61"
                            value={searchText}
                            onChangeText={setSearchText}
                            onSubmitEditing={handleSearch}
                            returnKeyType="search"
                        />
                        {searchText.length > 0 && (
                            <TouchableOpacity
                                onPress={() => {
                                    setSearchText('');
                                    fetchSites({ region: selectedRegion, query: '' });
                                }}
                            >
                                <Ionicons name="close-circle" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            </Animated.View>

            <Animated.ScrollView
                style={styles.scrollView}
                contentContainerStyle={[
                    styles.scrollContent,
                    {
                        paddingTop: Animated.add(insets.top, contentPaddingTop)
                    }
                ]}
                showsVerticalScrollIndicator={false}
                onScroll={handleScroll}
                scrollEventThrottle={16}
            >
                {/* Region Filters */}
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.filterChipsContainer}
                >
                    {REGIONS.map(region => {
                        const isActive = region.id === selectedRegionId;
                        return (
                            <TouchableOpacity
                                key={region.id}
                                style={[
                                    styles.filterChip,
                                    isActive && styles.filterChipActive
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

                <View style={styles.siteListSection}>

                    {isLoading && (!sites || sites.length === 0) ? (
                        <View style={styles.loadingContainer}>
                            <ActivityIndicator size="large" color={COLORS.primary} />
                            <Text style={styles.loadingText}>Đang tải...</Text>
                        </View>
                    ) : error ? (
                        <View style={styles.errorContainer}>
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
                            <Ionicons name="search-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>Không tìm thấy thánh địa</Text>
                        </View>
                    ) : (
                        <>
                            {sites?.map(site => (
                                <SiteListCard
                                    key={site.id}
                                    id={site.id}
                                    name={site.name}
                                    address={site.address}
                                    siteType={site.type}
                                    region={site.region}
                                    coverImage={site.coverImage}
                                    reviewCount={site.reviewCount}
                                    isFavorite={site.isFavorite}
                                    onPress={() => navigation.navigate('SiteDetail', { siteId: site.id })}
                                    onFavoritePress={() => handleFavoriteToggle(site.id)}
                                />
                            ))}
                            {isFetchingMore && (
                                <View style={styles.loadingMoreContainer}>
                                    <ActivityIndicator size="small" color={COLORS.primary} />
                                    <Text style={styles.loadingMoreText}>Đang tải thêm...</Text>
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
        backgroundColor: COLORS.background,
    },

    headerWrapper: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 1000,
    },

    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: getSpacing(SPACING.lg),
        paddingVertical: getSpacing(SPACING.sm),
    },

    menuButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.full,
    },

    headerCenter: {
        flex: 1,
        alignItems: 'center',
    },

    headerTitle: {
        fontSize: moderateScale(24),
        fontWeight: '700',
        color: '#181611',
        letterSpacing: -0.3,
    },

    profileButton: {
        width: 48,
        height: 48,
        justifyContent: 'center',
        alignItems: 'center',
        borderRadius: BORDER_RADIUS.full,
    },

    searchSection: {
        paddingHorizontal: getSpacing(SPACING.lg),
        paddingVertical: moderateScale(16),
    },

    searchBarContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ffffff',
        borderRadius: BORDER_RADIUS.full,
        paddingHorizontal: moderateScale(16),
        height: moderateScale(56),
        gap: getSpacing(SPACING.sm),
        borderWidth: 1,
        borderColor: '#e6e4dc',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },

    searchIcon: {
        marginRight: 0,
    },

    searchInput: {
        flex: 1,
        fontSize: moderateScale(16),
        color: '#181611',
        fontWeight: '400',
        paddingVertical: 0,
    },

    scrollView: {
        flex: 1,
    },

    scrollContent: {
        paddingBottom: getSpacing(SPACING.xl),
    },

    filterChipsContainer: {
        paddingHorizontal: getSpacing(SPACING.lg),
        paddingTop: moderateScale(18),
        paddingBottom: moderateScale(16),
        gap: moderateScale(12),
    },

    filterChip: {
        paddingHorizontal: moderateScale(24),
        height: moderateScale(40),
        justifyContent: 'center',
        borderRadius: BORDER_RADIUS.full,
        backgroundColor: '#ffffff',
        marginRight: moderateScale(12),
        borderWidth: 1,
        borderColor: '#e6e4dc',
    },

    filterChipActive: {
        backgroundColor: '#ecb613',
        borderColor: '#ecb613',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 3,
    },

    filterChipText: {
        fontSize: moderateScale(14),
        fontWeight: '500',
        color: '#897f61',
    },

    filterChipTextActive: {
        color: '#181611',
        fontWeight: '600',
    },

    siteListSection: {
        paddingHorizontal: getSpacing(SPACING.lg),
        gap: moderateScale(16),
    },

    sectionTitle: {
        fontSize: moderateScale(18),
        fontWeight: '700',
        color: '#181611',
        marginBottom: moderateScale(12),
    },

    loadingContainer: {
        paddingVertical: getSpacing(SPACING.xxl),
        alignItems: 'center',
        gap: getSpacing(SPACING.md),
    },

    loadingText: {
        fontSize: moderateScale(15),
        color: '#8E8E93',
    },

    errorContainer: {
        paddingVertical: getSpacing(SPACING.xxl),
        alignItems: 'center',
        gap: getSpacing(SPACING.md),
    },

    errorText: {
        fontSize: moderateScale(15),
        color: '#FF3B30',
        textAlign: 'center',
    },

    retryButton: {
        paddingHorizontal: getSpacing(SPACING.lg),
        paddingVertical: getSpacing(SPACING.sm),
        backgroundColor: COLORS.primary,
        borderRadius: BORDER_RADIUS.md,
        marginTop: getSpacing(SPACING.sm),
    },

    retryButtonText: {
        fontSize: moderateScale(15),
        fontWeight: '600',
        color: '#FFFFFF',
    },

    emptyContainer: {
        paddingVertical: getSpacing(SPACING.xxl),
        alignItems: 'center',
        gap: getSpacing(SPACING.md),
    },

    emptyText: {
        fontSize: moderateScale(15),
        color: '#8E8E93',
    },

    loadingMoreContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: getSpacing(SPACING.md),
        gap: getSpacing(SPACING.sm),
    },

    loadingMoreText: {
        fontSize: moderateScale(13),
        color: '#8E8E93',
    },
});
