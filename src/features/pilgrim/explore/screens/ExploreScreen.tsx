import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useRef, useState } from 'react';
import {
  Animated,
  Dimensions,
  Image,
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
  Keyboard,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { getSpacing, moderateScale, responsive } from '../../../../utils/responsive';
import { SiteListCard } from '../components/SiteListCard';

// Mock data
const BANNER_DATA = [
  {
    id: '1',
    title: 'HÀNH TRÌNH THÁNH',
    subtitle: 'Mùa Chay',
    badge: 'THÁNH THẦN',
    image: { uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800' },
  },
  {
    id: '2',
    title: 'HÀNH TRÌNH PHỤC SINH',
    subtitle: 'Phục Sinh 2024',
    badge: 'THÁNH LỄ',
    image: { uri: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=800' },
  },
  {
    id: '3',
    title: 'CON ĐƯỜNG THÁNH GIÁ',
    subtitle: 'Đức Mẹ La Vang',
    badge: 'LINH ĐỊA',
    image: { uri: 'https://images.unsplash.com/photo-1478436127897-769e1b3f0f36?w=800' },
  },
];

const ALL_SITES = [
  {
    id: '1',
    name: 'Notre Dame Cathedral',
    location: 'Notre Dame',
    distance: '2km',
    image: { uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400' },
    isFavorite: false,
  },
  {
    id: '2',
    name: 'Notre Dame Cathedral',
    location: 'Notre Dame',
    distance: '15km',
    image: { uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400' },
    isFavorite: false,
  },
  {
    id: '3',
    name: 'Thánh Địa Mỹ Xạnh',
    location: 'Notre Dame',
    distance: '5km',
    image: { uri: 'https://images.unsplash.com/photo-1549144511-f099e773c147?w=400' },
    isFavorite: false,
  },
  {
    id: '4',
    name: 'Notre Nail Chrirrh',
    location: 'Notre Dame',
    distance: '120km',
    image: { uri: 'https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400' },
    isFavorite: false,
  },
];

const FILTER_CATEGORIES = [
  { id: 'filter-story', label: 'Filter Story' },
  { id: 'tap-write', label: 'Tập for Write' },
  { id: 'meditation', label: 'Thiền, K-Day narr' },
];


const HEADER_HEIGHT = 80;

// Calculate banner width based on screen - leave small peek for next card
const HORIZONTAL_PADDING = SPACING.lg; // Padding from screen edge
const PEEK_WIDTH = 24; // How much of next card should show
const BANNER_GAP = SPACING.md; // Gap between banners

const getBannerWidth = (screenWidth: number) => {
  // Banner width = screen width - left padding - peek - gap/2
  return screenWidth - getSpacing(HORIZONTAL_PADDING) - PEEK_WIDTH - getSpacing(BANNER_GAP) / 2;
};

const getBannerHeight = (bannerWidth: number) => {
  // Maintain aspect ratio ~1.7:1 (width:height)
  return Math.min(bannerWidth * 0.6, 260);
};

export const ExploreScreen = ({ navigation }: any) => {
  const { width: screenWidth } = useWindowDimensions();
  const [selectedFilter, setSelectedFilter] = useState<string>('filter-story');
  const [allSites, setAllSites] = useState(ALL_SITES);
  const [activeBannerIndex, setActiveBannerIndex] = useState(0);
  
  // Responsive banner dimensions
  const bannerWidth = getBannerWidth(screenWidth);
  const bannerHeight = getBannerHeight(bannerWidth);
  const snapInterval = bannerWidth + getSpacing(BANNER_GAP);
  
  // Header animation
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const lastScrollY = useRef(0);
  const headerTranslateY = useRef(new Animated.Value(0)).current;
  const headerBgOpacity = useRef(new Animated.Value(0)).current;
  const isHeaderVisible = useRef(true);
  
  // Search bar animation
  const [isSearchExpanded, setIsSearchExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const searchWidth = useRef(new Animated.Value(40)).current;
  const searchInputOpacity = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  const handleFavoriteToggle = (id: string) => {
    setAllSites(prevSites =>
      prevSites.map(site =>
        site.id === id ? { ...site, isFavorite: !site.isFavorite } : site
      )
    );
  };

  // Toggle search bar
  const toggleSearch = () => {
    if (isSearchExpanded) {
      // Collapse search
      Keyboard.dismiss();
      Animated.parallel([
        Animated.spring(searchWidth, {
          toValue: 40,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }),
        Animated.timing(searchInputOpacity, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsSearchExpanded(false);
        setSearchText('');
      });
    } else {
      // Expand search
      setIsSearchExpanded(true);
      Animated.parallel([
        Animated.spring(searchWidth, {
          toValue: 220,
          useNativeDriver: false,
          tension: 100,
          friction: 12,
        }),
        Animated.timing(searchInputOpacity, {
          toValue: 1,
          duration: 200,
          delay: 100,
          useNativeDriver: true,
        }),
      ]).start(() => {
        searchInputRef.current?.focus();
      });
    }
  };

  const handleBannerScroll = (event: any) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / snapInterval);
    setActiveBannerIndex(index);
  };

  // Handle main scroll for header animation
  const handleMainScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const currentScrollY = event.nativeEvent.contentOffset.y;
    const scrollDiff = currentScrollY - lastScrollY.current;
    
    // Animate header background opacity based on scroll
    const newOpacity = Math.min(currentScrollY / 100, 1);
    Animated.timing(headerBgOpacity, {
      toValue: newOpacity,
      duration: 0,
      useNativeDriver: true,
    }).start();
    
    // Only trigger hide/show after scrolling past header height
    if (currentScrollY > HEADER_HEIGHT) {
      if (scrollDiff > 5 && isHeaderVisible.current) {
        // Scrolling DOWN - Hide header
        isHeaderVisible.current = false;
        Animated.spring(headerTranslateY, {
          toValue: -(HEADER_HEIGHT + insets.top),
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      } else if (scrollDiff < -5 && !isHeaderVisible.current) {
        // Scrolling UP - Show header
        isHeaderVisible.current = true;
        Animated.spring(headerTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 80,
          friction: 12,
        }).start();
      }
    } else if (currentScrollY <= 10 && !isHeaderVisible.current) {
      // At top - Always show header
      isHeaderVisible.current = true;
      Animated.spring(headerTranslateY, {
        toValue: 0,
        useNativeDriver: true,
        tension: 80,
        friction: 12,
      }).start();
    }
    
    lastScrollY.current = currentScrollY;
  };

  return (
    <ImageBackground
      source={require('../../../../../assets/images/bg1.png')}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor="transparent"
        translucent
        animated
      />
      
      {/* Animated Header - Transparent → Solid on scroll */}
      <Animated.View 
        style={[
          styles.headerWrapper,
          { 
            paddingTop: insets.top,
            transform: [{ translateY: headerTranslateY }] 
          }
        ]}
      >
        {/* Animated Background - Fades in on scroll */}
        <Animated.View 
          style={[
            styles.headerBackground,
            { opacity: headerBgOpacity }
          ]} 
        />
        
        {/* Header Content - Always visible */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.logoContainer}>
              <Text style={styles.logoIcon}>✟</Text>
            </View>
            <View>
              <Text style={styles.headerTitle}>Trang chủ</Text>
              <Text style={styles.headerSubtitle}>Khám phá hành trình</Text>
            </View>
          </View>
          
          <View style={styles.headerActions}>
            {/* Animated Search Bar */}
            <Animated.View style={[styles.searchBarContainer, { width: searchWidth }]}>
              <Animated.View style={[styles.searchInputWrapper, { opacity: searchInputOpacity }]}>
                <TextInput
                  ref={searchInputRef}
                  style={styles.searchInput}
                  placeholder="Tìm kiếm..."
                  placeholderTextColor={COLORS.textTertiary}
                  value={searchText}
                  onChangeText={setSearchText}
                  returnKeyType="search"
                />
              </Animated.View>
              <TouchableOpacity 
                style={styles.searchIconButton} 
                activeOpacity={0.7}
                onPress={toggleSearch}
              >
                <Ionicons 
                  name={isSearchExpanded ? "close" : "search-outline"} 
                  size={20} 
                  color={COLORS.primary} 
                />
              </TouchableOpacity>
            </Animated.View>
            
            {/* Notification Button */}
            {!isSearchExpanded && (
              <TouchableOpacity 
                style={styles.headerIconButton} 
                activeOpacity={0.7}
              >
                <Ionicons name="notifications-outline" size={20} color={COLORS.primary} />
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>3</Text>
                </View>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </Animated.View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top }
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={handleMainScroll}
        scrollEventThrottle={16}
      >
        {/* Banner Carousel with Peek */}
        <View style={styles.bannerCarouselContainer}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={snapInterval}
            decelerationRate="fast"
            contentContainerStyle={styles.bannerScrollContent}
            onScroll={handleBannerScroll}
            scrollEventThrottle={16}
          >
            {BANNER_DATA.map((banner, index) => (
              <TouchableOpacity 
                key={banner.id}
                style={[
                  styles.heroBanner,
                  { width: bannerWidth, height: bannerHeight }
                ]} 
                activeOpacity={0.9}
              >
                <ImageBackground
                  source={require('../../../../../assets/images/bg1.png')}
                  style={styles.bannerBackground}
                  resizeMode="cover"
                >
                  {/* Banner Image Overlay */}
                  <View style={styles.bannerImageContainer}>
                    <Image
                      source={banner.image}
                      style={styles.notreDameImage}
                      resizeMode="cover"
                    />
                    <LinearGradient
                      colors={['rgba(0, 0, 0, 0)', 'rgba(0, 0, 0, 0.3)', 'rgba(44, 62, 80, 0.85)']}
                      style={styles.imageGradient}
                    />
                  </View>
                  
                  {/* Banner Content */}
                  <View style={styles.bannerContent}>
                    <View style={styles.bannerBadge}>
                      <Text style={styles.bannerBadgeIcon}>✝</Text>
                      <Text style={styles.bannerBadgeText}>{banner.badge}</Text>
                    </View>
                    
                    <Text style={styles.bannerMainTitle}>{banner.title}</Text>
                    <Text style={styles.bannerSubTitle}>{banner.subtitle}</Text>
                    
                    <TouchableOpacity style={styles.bannerButton} activeOpacity={0.8}>
                      <LinearGradient
                        colors={[COLORS.accent, COLORS.accentDark]}
                        style={styles.bannerButtonGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                      >
                        <Text style={styles.bannerButtonText}>Bắt đầu hành trình</Text>
                        <Ionicons name="arrow-forward" size={18} color={COLORS.white} />
                      </LinearGradient>
                    </TouchableOpacity>
                  </View>
                </ImageBackground>
              </TouchableOpacity>
            ))}
          </ScrollView>
          
          {/* Pagination Dots */}
          <View style={styles.paginationContainer}>
            {BANNER_DATA.map((_, index) => (
              <View
                key={index}
                style={[
                  styles.paginationDot,
                  index === activeBannerIndex && styles.paginationDotActive
                ]}
              />
            ))}
          </View>
        </View>

        {/* Enhanced Filter Chips */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {FILTER_CATEGORIES.map(filter => {
            const isActive = selectedFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive
                ]}
                onPress={() => setSelectedFilter(filter.id)}
                activeOpacity={0.7}
              >
                {isActive && (
                  <LinearGradient
                    colors={[COLORS.accent, COLORS.accentDark]}
                    style={styles.filterChipGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                )}
                <Text style={[
                  styles.filterChipText,
                  isActive && styles.filterChipTextActive
                ]}>
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Site List Section */}
        <View style={styles.siteListSection}>
          <Text style={styles.sectionTitle}>Site list</Text>
          
          {allSites.map(site => (
            <SiteListCard
              key={site.id}
              {...site}
              onPress={() => navigation.navigate('SiteDetail', { siteId: site.id })}
              onFavoritePress={() => handleFavoriteToggle(site.id)}
            />
          ))}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  
  // Animated Header Wrapper
  headerWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  headerBackground: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#FAF8F3',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(201, 165, 114, 0.15)',
    ...SHADOWS.medium,
  },
  
  // Professional Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: getSpacing(SPACING.lg),
    paddingVertical: getSpacing(SPACING.md),
    height: HEADER_HEIGHT,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(SPACING.md),
  },
  logoContainer: {
    width: moderateScale(42),
    height: moderateScale(42),
    borderRadius: moderateScale(21),
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  logoIcon: {
    fontSize: 22,
    color: COLORS.white,
  },
  headerTitle: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.xl,
      medium: TYPOGRAPHY.fontSize.xxl,
      default: TYPOGRAPHY.fontSize.xxl,
    }),
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    letterSpacing: -0.5,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    letterSpacing: 0.3,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: getSpacing(SPACING.sm),
  },
  headerIconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: 'rgba(26, 40, 69, 0.08)',
  },
  
  // Animated Search Bar
  searchBarContainer: {
    height: moderateScale(40),
    borderRadius: moderateScale(20),
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: 'rgba(26, 40, 69, 0.08)',
    overflow: 'hidden',
  },
  searchInputWrapper: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    paddingLeft: getSpacing(SPACING.md),
  },
  searchInput: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  searchIconButton: {
    width: moderateScale(40),
    height: moderateScale(40),
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  notificationBadge: {
    position: 'absolute',
    top: moderateScale(4),
    right: moderateScale(4),
    minWidth: moderateScale(16),
    height: moderateScale(16),
    borderRadius: moderateScale(8),
    backgroundColor: '#FF4757',
    borderWidth: 2,
    borderColor: COLORS.white,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 3,
  },
  notificationBadgeText: {
    fontSize: 8,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Scroll Content
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  scrollContent: {
    paddingBottom: getSpacing(SPACING.xl),
  },

  // Banner Carousel with Peek
  bannerCarouselContainer: {
    marginTop: getSpacing(SPACING.lg),
    marginBottom: getSpacing(SPACING.xl),
  },
  bannerScrollContent: {
    paddingLeft: getSpacing(SPACING.lg),
    paddingRight: getSpacing(SPACING.lg),
  },
  heroBanner: {
    // width and height are now set dynamically in component
    marginRight: getSpacing(SPACING.md),
    borderRadius: moderateScale(BORDER_RADIUS.xl),
    overflow: 'hidden',
    ...SHADOWS.large,
    elevation: 8,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: getSpacing(SPACING.md),
    gap: getSpacing(SPACING.sm),
  },
  paginationDot: {
    width: moderateScale(8),
    height: moderateScale(8),
    borderRadius: moderateScale(4),
    backgroundColor: COLORS.border,
  },
  paginationDotActive: {
    width: moderateScale(24),
    backgroundColor: COLORS.accent,
  },
  bannerBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  bannerImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  notreDameImage: {
    width: '100%',
    height: '100%',
    opacity: 0.85,
  },
  imageGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  bannerContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: getSpacing(SPACING.xl),
    justifyContent: 'space-between',
  },
  bannerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    paddingHorizontal: getSpacing(SPACING.md),
    paddingVertical: getSpacing(SPACING.xs),
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
    ...SHADOWS.small,
  },
  bannerBadgeIcon: {
    fontSize: 14,
    color: COLORS.accent,
  },
  bannerBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 1.5,
  },
  bannerMainTitle: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.md,
      medium: TYPOGRAPHY.fontSize.lg,
      default: TYPOGRAPHY.fontSize.lg,
    }),
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 2,
    textTransform: 'uppercase',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    opacity: 0.95,
  },
  bannerSubTitle: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.xxxl,
      medium: TYPOGRAPHY.fontSize.huge,
      default: TYPOGRAPHY.fontSize.huge,
    }),
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    marginTop: getSpacing(SPACING.xs),
    marginBottom: getSpacing(SPACING.md),
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
    letterSpacing: -0.5,
  },
  bannerButton: {
    alignSelf: 'flex-start',
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
    ...SHADOWS.medium,
    elevation: 4,
  },
  bannerButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: getSpacing(SPACING.lg) + 4,
    paddingVertical: getSpacing(SPACING.md),
    gap: getSpacing(SPACING.sm),
  },
  bannerButtonText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    letterSpacing: 0.3,
  },

  // Enhanced Filter Chips
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: getSpacing(SPACING.lg),
    marginBottom: getSpacing(SPACING.xl),
    gap: getSpacing(SPACING.md),
  },
  filterChip: {
    paddingHorizontal: getSpacing(SPACING.lg) + 4,
    paddingVertical: getSpacing(SPACING.md),
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
    position: 'relative',
    overflow: 'hidden',
  },
  filterChipGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  filterChipActive: {
    borderColor: COLORS.accent,
    ...SHADOWS.small,
    elevation: 2,
  },
  filterChipText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
    letterSpacing: 0.2,
  },
  filterChipTextActive: {
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Enhanced Site List Section
  siteListSection: {
    paddingHorizontal: getSpacing(SPACING.lg),
  },
  sectionTitle: {
    fontSize: responsive({
      small: TYPOGRAPHY.fontSize.xl,
      medium: TYPOGRAPHY.fontSize.xxl,
      default: TYPOGRAPHY.fontSize.xxl,
    }),
    color: COLORS.primary,
    fontWeight: TYPOGRAPHY.fontWeight.black,
    marginBottom: getSpacing(SPACING.lg),
    letterSpacing: -0.5,
  },
});

export default ExploreScreen;

