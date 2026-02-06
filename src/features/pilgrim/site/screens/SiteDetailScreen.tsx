import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { EventCard, NearbyPlaceCard, QuickActionButton } from '../components';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const HERO_HEIGHT = Dimensions.get('window').height * 0.45;

// Mock data matching the HTML template
const MOCK_SITE_DETAIL = {
  id: '1',
  name: 'Vương Cung Thánh Đường Đức Bà',
  type: 'Nhà thờ',
  location: 'TP. Hồ Chí Minh, Việt Nam',
  images: [
    'https://sakos.vn/wp-content/uploads/2024/04/nha-tho-duc-ba-2_1624854355.jpg',
    'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg/1200px-Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg',
    'https://ik.imagekit.io/tvlk/blog/2023/02/nha-tho-duc-ba-1.jpg?tr=dpr-2,w-675',
  ],
  description: `Vương Cung Thánh Đường Đức Bà Sài Gòn là nhà thờ chính tòa của Tổng giáo phận Thành phố Hồ Chí Minh. Đây là công trình kiến trúc độc đáo của thành phố, được xây dựng từ năm 1863 đến năm 1880 theo phong cách kiến trúc Roman và Gothic. Nhà thờ nằm ở trung tâm thành phố, tại Công trường Công xã Paris, Quận 1.`,
  massSchedule: [
    { day: 'Ngày thường', times: ['07:00 (Tiếng Việt)', '18:00 (Chầu Thánh Thể)'] },
    { day: 'Thứ Bảy', times: ['07:00 (Tiếng Việt)', '18:00 (Lễ Vọng)'] },
    { day: 'Chúa Nhật', times: ['08:00 (Trọng thể)', '10:30 (Tiếng Anh)', '17:00 (Rước kiệu)'] },
  ],
  gallery: [
    { type: 'image', url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg/1200px-Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg' },
    { type: 'video', url: 'https://ik.imagekit.io/tvlk/blog/2023/02/nha-tho-duc-ba-1.jpg?tr=dpr-2,w-675', thumbnail: 'https://ik.imagekit.io/tvlk/blog/2023/02/nha-tho-duc-ba-1.jpg?tr=dpr-2,w-675' },
    { type: 'image', url: 'https://sakos.vn/wp-content/uploads/2024/04/nha-tho-duc-ba-2_1624854355.jpg' },
  ],
  events: [
    {
      id: '1',
      date: 'Tháng 10, 4',
      title: 'Rước Kiệu Đức Mẹ',
      description: 'Tham gia cùng hàng ngàn giáo dân.',
      image: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/c5/Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg/1200px-Saigon_Notre-Dame_Basilica_%28Front_view%29.jpg',
    },
    {
      id: '2',
      date: 'Tháng 11, 1',
      title: 'Lễ Các Thánh',
      description: 'Cầu nguyện và chầu Thánh Thể.',
      image: 'https://ik.imagekit.io/tvlk/blog/2023/02/nha-tho-duc-ba-1.jpg?tr=dpr-2,w-675',
    },
  ],
  nearbyPlaces: [
    { name: 'Khách Sạn Hành Hương', distance: '0.2 km', type: 'hotel' as const },
    { name: 'Nhà Hàng Công Giáo', distance: '0.4 km', type: 'restaurant' as const },
    { name: 'Nhà Thờ Tân Định', distance: '1.2 km', type: 'church' as const },
  ],
};

export const SiteDetailScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const scrollY = React.useRef(new Animated.Value(0)).current;

  const handleBack = () => navigation.goBack();
  const handleShare = () => { };
  const handleBookmark = () => setIsBookmarked(!isBookmarked);

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        {/* Hero Section */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {/* Background Image */}
          <Image
            source={{ uri: MOCK_SITE_DETAIL.images[activeImageIndex] }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={['rgba(0,0,0,0.1)', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.9)']}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Header */}
          <View style={[styles.heroHeader, { paddingTop: insets.top + SPACING.sm }]}>
            <TouchableOpacity style={styles.heroButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroHeaderRight}>
              <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity style={styles.heroButton} onPress={handleBookmark}>
                <Ionicons
                  name={isBookmarked ? "bookmark" : "bookmark-outline"}
                  size={22}
                  color="#fff"
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.typeBadge}>
              <Ionicons name="business" size={12} color={COLORS.textPrimary} />
              <Text style={styles.typeBadgeText}>{MOCK_SITE_DETAIL.type}</Text>
            </View>
            <Text style={styles.heroTitle}>{MOCK_SITE_DETAIL.name}</Text>
            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.accent} />
              <Text style={styles.locationText}>{MOCK_SITE_DETAIL.location}</Text>
            </View>

            {/* Pagination Dots */}
            <View style={styles.paginationDots}>
              {MOCK_SITE_DETAIL.images.map((_, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => setActiveImageIndex(index)}
                >
                  <View
                    style={[
                      styles.dot,
                      index === activeImageIndex ? styles.activeDot : styles.inactiveDot,
                    ]}
                  />
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Quick Actions Card */}
          <View style={styles.quickActionsCard}>
            <QuickActionButton icon="navigate" label="Dẫn đường" />
            <QuickActionButton icon="call" label="Gọi điện" />
            <QuickActionButton icon="globe-outline" label="Website" />
            <QuickActionButton icon="heart-outline" label="Ủng hộ" />
          </View>

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giới thiệu</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={isDescriptionExpanded ? undefined : 4}
            >
              {MOCK_SITE_DETAIL.description}
            </Text>
            <TouchableOpacity
              style={styles.readMoreButton}
              onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
            >
              <Text style={styles.readMoreText}>
                {isDescriptionExpanded ? 'Thu gọn' : 'Đọc thêm'}
              </Text>
              <Ionicons
                name={isDescriptionExpanded ? "chevron-up" : "chevron-down"}
                size={14}
                color={COLORS.accent}
              />
            </TouchableOpacity>
          </View>

          {/* Photos & Videos Gallery */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Hình ảnh & Video</Text>
              <TouchableOpacity>
                <Text style={styles.seeAllText}>Xem tất cả</Text>
              </TouchableOpacity>
            </View>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScroll}
            >
              {MOCK_SITE_DETAIL.gallery.map((item, index) => (
                <TouchableOpacity key={index} style={styles.galleryItem}>
                  <Image
                    source={{ uri: item.type === 'video' ? item.thumbnail : item.url }}
                    style={styles.galleryImage}
                    resizeMode="cover"
                  />
                  {item.type === 'video' && (
                    <View style={styles.playButtonOverlay}>
                      <View style={styles.playButton}>
                        <Ionicons name="play" size={20} color="#fff" />
                      </View>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>

          {/* Mass Schedule */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Lịch Thánh Lễ</Text>
            <View style={styles.scheduleCard}>
              {MOCK_SITE_DETAIL.massSchedule.map((schedule, index) => (
                <View
                  key={index}
                  style={[
                    styles.scheduleRow,
                    index % 2 === 1 && styles.scheduleRowAlt,
                    index === MOCK_SITE_DETAIL.massSchedule.length - 1 && styles.scheduleRowLast,
                  ]}
                >
                  <Text style={[
                    styles.scheduleDay,
                    schedule.day === 'Chúa Nhật' && styles.scheduleDayHighlight,
                  ]}>
                    {schedule.day}
                  </Text>
                  <View style={styles.scheduleTimes}>
                    {schedule.times.map((time, timeIndex) => (
                      <Text
                        key={timeIndex}
                        style={[
                          styles.scheduleTime,
                          timeIndex === 0 && schedule.day === 'Chúa Nhật' && styles.scheduleTimeHighlight,
                        ]}
                      >
                        {time}
                      </Text>
                    ))}
                  </View>
                </View>
              ))}
              <TouchableOpacity style={styles.viewFullScheduleButton}>
                <Text style={styles.viewFullScheduleText}>XEM LỊCH ĐẦY ĐỦ</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Upcoming Events */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Sự kiện sắp tới</Text>
            <View style={styles.eventsContainer}>
              {MOCK_SITE_DETAIL.events.map((event) => (
                <EventCard
                  key={event.id}
                  image={event.image}
                  date={event.date}
                  title={event.title}
                  description={event.description}
                />
              ))}
            </View>
          </View>

          {/* Around the Sanctuary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Xung quanh nhà thờ</Text>
            <View style={styles.mapCard}>
              {/* Map Placeholder */}
              <View style={styles.mapPlaceholder}>
                <Image
                  source={{ uri: 'https://maps.googleapis.com/maps/api/staticmap?center=10.7769,106.6958&zoom=15&size=400x200&maptype=roadmap&key=placeholder' }}
                  style={styles.mapImage}
                  resizeMode="cover"
                />
                <View style={styles.mapOverlay}>
                  <TouchableOpacity style={styles.viewMapButton}>
                    <Ionicons name="map" size={18} color={COLORS.accent} />
                    <Text style={styles.viewMapText}>Xem bản đồ</Text>
                  </TouchableOpacity>
                </View>
                {/* Location Pin */}
                <View style={styles.mapPin}>
                  <Ionicons name="location" size={32} color={COLORS.accent} />
                </View>
              </View>

              {/* Nearby Places List */}
              {MOCK_SITE_DETAIL.nearbyPlaces.map((place, index) => (
                <NearbyPlaceCard
                  key={index}
                  name={place.name}
                  distance={place.distance}
                  type={place.type}
                />
              ))}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroContainer: {
    position: 'relative',
    width: '100%',
  },
  heroHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  heroHeaderRight: {
    flexDirection: 'row',
    gap: SPACING.sm,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroContent: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  typeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(201, 165, 114, 0.9)',
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.sm,
    gap: 4,
    marginBottom: SPACING.xs,
  },
  typeBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: '#fff',
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: 'rgba(255,255,255,0.9)',
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  paginationDots: {
    flexDirection: 'row',
    gap: 8,
    marginTop: SPACING.lg,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 24,
    backgroundColor: COLORS.accent,
  },
  inactiveDot: {
    width: 6,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },

  // Content Container
  contentContainer: {
    marginTop: -SPACING.xl,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.background,
    paddingTop: SPACING.md,
  },

  // Quick Actions Card
  quickActionsCard: {
    flexDirection: 'row',
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: -SPACING.lg,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },

  // Section
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  seeAllText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accent,
  },

  // Description
  descriptionText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    lineHeight: 24,
  },
  readMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: SPACING.sm,
    gap: 2,
  },
  readMoreText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accent,
  },

  // Gallery
  galleryScroll: {
    gap: SPACING.md,
  },
  galleryItem: {
    width: 240,
    height: 144,
    borderRadius: BORDER_RADIUS.md,
    overflow: 'hidden',
    position: 'relative',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.5)',
  },

  // Schedule
  scheduleCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  scheduleRow: {
    flexDirection: 'row',
    padding: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  scheduleRowAlt: {
    backgroundColor: COLORS.background,
  },
  scheduleRowLast: {
    borderBottomWidth: 0,
  },
  scheduleDay: {
    width: 100,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  scheduleDayHighlight: {
    color: COLORS.accent,
  },
  scheduleTimes: {
    flex: 1,
    gap: 4,
  },
  scheduleTime: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },
  scheduleTimeHighlight: {
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },
  viewFullScheduleButton: {
    backgroundColor: 'rgba(201, 165, 114, 0.1)',
    padding: SPACING.sm,
    alignItems: 'center',
  },
  viewFullScheduleText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.accent,
    letterSpacing: 0.5,
  },

  // Events
  eventsContainer: {
    gap: SPACING.sm,
  },

  // Map
  mapCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  mapPlaceholder: {
    height: 160,
    backgroundColor: COLORS.backgroundDark,
    position: 'relative',
  },
  mapImage: {
    width: '100%',
    height: '100%',
    opacity: 0.8,
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewMapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.white,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.medium,
    gap: SPACING.sm,
  },
  viewMapText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  mapPin: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    marginTop: -32,
    marginLeft: -16,
  },
});

export default SiteDetailScreen;
