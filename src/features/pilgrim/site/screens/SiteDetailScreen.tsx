import React, { useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';

const { width } = Dimensions.get('window');
const HEADER_MAX_HEIGHT = 260;
const HEADER_MIN_HEIGHT = 80;
const HEADER_SCROLL_DISTANCE = HEADER_MAX_HEIGHT - HEADER_MIN_HEIGHT;

interface MassSchedule {
  day: string;
  times: string;
}

const MOCK_SITE_DETAIL = {
  id: '1',
  name: 'Đức Mẹ La Vang',
  coordinates: '16.7366° N, 107.1842° E',
  image: { uri: 'https://sakos.vn/wp-content/uploads/2024/04/nha-tho-duc-ba-2_1624854355.jpg' },
  isFavorite: true,
  massSchedule: [
    { day: 'Chúa Nhật', times: '05:00, 08:00, 10:00, 17:00' },
    { day: 'Thứ Bảy', times: '05:30, 17:00 (Thánh lễ Chúa Nhật)' },
    { day: 'Ngày thường', times: '05:00, 17:00' },
    { day: 'Chầu Thánh Thể', times: 'Hằng ngày: 15:00 - 16:00' },
  ],
  history: `Vào năm 1798, dưới thời vua Cảnh Thịnh nhà Tây Sơn, giáo án xảy ra khắp nơi. Giáo dân Công giáo bị truy lùng và bắt bớ. Nhiều tín hữu đã phải chạy trốn vào rừng sâu để tránh sự khủng bố.

Tại vùng đất La Vang hoang vu, một nhóm giáo dân đã tìm đến nơi này để ẩn náu. Họ sống trong điều kiện vô cùng khó khăn, thiếu thốn mọi thứ, đói rét và bệnh tật. 

Trong hoàn cảnh đó, vào một đêm tháng 8 năm 1798, khi đang cầu nguyện, Đức Mẹ Maria đã hiện ra giữa hai thiên thần, tay bồng Chúa Giêsu. Đức Mẹ an ủi và hứa sẽ giúp đỡ những ai kêu cầu Người tại nơi này.`,
  facilities: [
    { name: 'Nhà hàng', distance: '500m', type: 'restaurant' },
    { name: 'Khách sạn', distance: '1km', type: 'hotel' },
    { name: 'Trạm xá', distance: '2km', type: 'medical' },
  ],
};

export const SiteDetailScreen = ({ navigation }: any) => {
  const [isFavorite, setIsFavorite] = useState(MOCK_SITE_DETAIL.isFavorite);
  const [activeTab, setActiveTab] = useState<'history' | 'facilities'>('history');
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE * 0.8, HEADER_SCROLL_DISTANCE],
    outputRange: [0, 0, 1],
    extrapolate: 'clamp',
  });

  const imageTranslateY = scrollY.interpolate({
    inputRange: [0, HEADER_SCROLL_DISTANCE, HEADER_SCROLL_DISTANCE * 2],
    outputRange: [0, -HEADER_SCROLL_DISTANCE * 0.3, -HEADER_SCROLL_DISTANCE * 0.5],
    extrapolate: 'extend',
  });


  return (
    <View style={styles.container}>
      <StatusBar 
        barStyle="dark-content" 
        backgroundColor={COLORS.background}
        animated 
      />

      {/* Hero Image with Parallax */}
      <Animated.View 
        style={[
          styles.heroImageContainer,
          {
            transform: [
              { translateY: imageTranslateY },
            ],
          },
        ]}
      >
        <Image 
          source={MOCK_SITE_DETAIL.image} 
          style={styles.heroImage} 
          resizeMode="cover" 
        />
        
        {/* Divine Gradient Overlay */}
        <LinearGradient
          colors={['rgba(0, 0, 0, 0)', 'rgba(44, 62, 80, 0.7)']}
          style={styles.heroGradient}
        />
        
        {/* Cross Pattern */}
        <View style={styles.heroPattern} />
      </Animated.View>

      {/* Floating Header */}
      <Animated.View style={[styles.floatingHeader, { opacity: headerOpacity }]}>
        <LinearGradient
          colors={[COLORS.primary, COLORS.primaryLight]}
          style={styles.headerGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <SafeAreaView edges={['top']}>
            <View style={styles.headerContent}>
              <TouchableOpacity
                style={styles.headerBackButton}
                onPress={() => navigation.goBack()}
                activeOpacity={0.7}
              >
                <Text style={styles.headerBackIcon}>←</Text>
              </TouchableOpacity>
              <Text style={styles.headerTitle} numberOfLines={1}>
                {MOCK_SITE_DETAIL.name}
              </Text>
              <View style={styles.headerBackButton} />
            </View>
          </SafeAreaView>
        </LinearGradient>
      </Animated.View>

      {/* Transparent Back Button (Always Visible) */}
      <SafeAreaView edges={['top']} style={styles.topButtons}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
        >
          <Text style={styles.backIcon}>←</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.favoriteButton}
          onPress={() => setIsFavorite(!isFavorite)}
          activeOpacity={0.8}
        >
          <Text style={styles.favoriteIcon}>{isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </SafeAreaView>

      <Animated.ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true }
        )}
      >

        {/* Site Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.siteName}>{MOCK_SITE_DETAIL.name}</Text>
          <View style={styles.coordinatesContainer}>
            <Text style={styles.locationIcon}>📍</Text>
            <Text style={styles.coordinates}>{MOCK_SITE_DETAIL.coordinates}</Text>
          </View>

          {/* Navigate Button */}
          <TouchableOpacity style={styles.navigateButton} activeOpacity={0.8}>
            <Text style={styles.navigateButtonText}>Dẫn đường</Text>
            <Text style={styles.navigateIcon}>✈️</Text>
          </TouchableOpacity>

          {/* Mass Schedule */}
          <View style={styles.scheduleSection}>
            <Text style={styles.sectionTitle}>Lịch Thánh Lễ</Text>
            <View style={styles.scheduleTable}>
              {MOCK_SITE_DETAIL.massSchedule.map((schedule, index) => (
                <View
                  key={index}
                  style={[
                    styles.scheduleRow,
                    index % 2 === 0 && styles.scheduleRowEven,
                  ]}
                >
                  <Text style={styles.scheduleDay}>{schedule.day}</Text>
                  <Text style={styles.scheduleTimes}>{schedule.times}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Check-in Button */}
          <TouchableOpacity style={styles.checkinButton} activeOpacity={0.8}>
            <Text style={styles.checkinButtonText}>Check-in đã đến</Text>
          </TouchableOpacity>

          {/* Tabs */}
          <View style={styles.tabsContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'history' && styles.tabActive]}
              onPress={() => setActiveTab('history')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'history' && styles.tabTextActive,
                ]}
              >
                Lịch sử
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'facilities' && styles.tabActive]}
              onPress={() => setActiveTab('facilities')}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === 'facilities' && styles.tabTextActive,
                ]}
              >
                Tiện ích quanh đây
              </Text>
            </TouchableOpacity>
          </View>

          {/* Tab Content */}
          {activeTab === 'history' ? (
            <View style={styles.tabContent}>
              <Text style={styles.historyText}>{MOCK_SITE_DETAIL.history}</Text>
            </View>
          ) : (
            <View style={styles.tabContent}>
              {MOCK_SITE_DETAIL.facilities.map((facility, index) => (
                <View key={index} style={styles.facilityItem}>
                  <View style={styles.facilityIcon}>
                    <Text style={styles.facilityEmoji}>
                      {facility.type === 'restaurant'
                        ? '🍴'
                        : facility.type === 'hotel'
                        ? '🏨'
                        : '⚕️'}
                    </Text>
                  </View>
                  <View style={styles.facilityInfo}>
                    <Text style={styles.facilityName}>{facility.name}</Text>
                    <Text style={styles.facilityDistance}>
                      📍 {facility.distance}
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Bottom Spacing */}
        <View style={{ height: 100 }} />
      </Animated.ScrollView>

      {/* Floating Action Button */}
      <TouchableOpacity style={styles.fab} activeOpacity={0.8}>
        <Text style={styles.fabIcon}>+</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  // Hero Image with Parallax
  heroImageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: HEADER_MAX_HEIGHT,
    zIndex: 0,
    overflow: 'hidden',
  },
  heroImage: {
    width: '100%',
    height: '100%',
    backgroundColor: COLORS.backgroundDark,
  },
  heroGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  heroPattern: {
    ...StyleSheet.absoluteFillObject,
    opacity: 0.05,
  },

  // Floating Header
  floatingHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  headerGradient: {
    ...SHADOWS.medium,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    height: 56,
  },
  headerBackButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerBackIcon: {
    fontSize: 24,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  headerTitle: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    textAlign: 'center',
    paddingHorizontal: SPACING.md,
  },

  // Top Buttons (Always Visible)
  topButtons: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    zIndex: 99,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  backIcon: {
    fontSize: 24,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  favoriteButton: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.medium,
  },
  favoriteIcon: {
    fontSize: 22,
  },

  // Content
  scrollView: {
    flex: 1,
    backgroundColor: 'transparent',
    zIndex: 1,
  },
  scrollContent: {
    paddingTop: HEADER_MAX_HEIGHT - 20,
  },

  // Site Info
  infoContainer: {
    backgroundColor: COLORS.background,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    padding: SPACING.lg,
    marginTop: -20,
    ...SHADOWS.large,
    zIndex: 1,
  },
  siteName: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
    letterSpacing: 0.3,
  },
  coordinatesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: SPACING.lg,
  },
  locationIcon: {
    fontSize: 16,
    marginRight: SPACING.xs,
  },
  coordinates: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },

  // Navigate Button
  navigateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    marginBottom: SPACING.xl,
    ...SHADOWS.medium,
  },
  navigateButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginRight: SPACING.sm,
  },
  navigateIcon: {
    fontSize: 20,
  },

  // Schedule Section
  scheduleSection: {
    marginBottom: SPACING.xl,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.md,
    letterSpacing: 0.3,
  },
  scheduleTable: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    ...SHADOWS.subtle,
  },
  scheduleRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  scheduleRowEven: {
    backgroundColor: COLORS.parchment,
  },
  scheduleDay: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  scheduleTimes: {
    flex: 2,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },

  // Check-in Button  
  checkinButton: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.full,
    paddingVertical: SPACING.md,
    alignItems: 'center',
    marginBottom: SPACING.xl,
    borderWidth: 2,
    borderColor: COLORS.accent,
    ...SHADOWS.small,
  },
  checkinButtonText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Tabs
  tabsContainer: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  tab: {
    flex: 1,
    paddingVertical: SPACING.md,
    alignItems: 'center',
  },
  tabActive: {
    borderBottomWidth: 3,
    borderBottomColor: COLORS.accent,
  },
  tabText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  tabTextActive: {
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },

  // Tab Content
  tabContent: {
    marginBottom: SPACING.lg,
  },
  historyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },

  // Facilities
  facilityItem: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  facilityIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: SPACING.md,
  },
  facilityEmoji: {
    fontSize: 24,
  },
  facilityInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  facilityName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: SPACING.xs,
  },
  facilityDistance: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },

  // FAB
  fab: {
    position: 'absolute',
    bottom: SPACING.xxl,
    right: SPACING.lg,
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...SHADOWS.large,
    borderWidth: 3,
    borderColor: COLORS.white,
  },
  fabIcon: {
    fontSize: 28,
    color: COLORS.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
});

export default SiteDetailScreen;
