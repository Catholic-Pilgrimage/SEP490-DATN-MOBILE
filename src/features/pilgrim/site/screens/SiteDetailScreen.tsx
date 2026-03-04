import { Ionicons } from "@expo/vector-icons";
import { CommonActions } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  MapPin,
  VietmapView,
  VietmapViewRef,
} from "../../../../components/map/VietmapView";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useFavorites } from "../../../../hooks/useFavorites";
import {
  useSiteDetail,
  useSiteEvents,
  useSiteMassSchedules,
  useSiteMedia,
  useSiteNearbyPlaces,
} from "../../../../hooks/useSites";
import { DayOfWeek } from "../../../../types";
import { NearbyPlaceCard, QuickActionButton, SOSModal } from "../components";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Dimensions.get("window").height * 0.45;

export const SiteDetailScreen = ({ navigation, route }: any) => {
  const { siteId } = route.params || {};
  const insets = useSafeAreaInsets();
  const { isAuthenticated, isGuest } = useAuth();
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isSOSModalVisible, setSOSModalVisible] = useState(false);
  const mapRef = useRef<VietmapViewRef>(null);

  // -- Fetch Data Hooks --
  const {
    site,
    isLoading: isLoadingDetail,
    refetch: refetchDetail,
  } = useSiteDetail(siteId, { autoFetch: true });

  // Centralized favorites
  const { isFavorite, toggleFavorite: toggleFav } = useFavorites();

  const {
    media,
    isLoading: isLoadingMedia,
    refetch: refetchMedia,
  } = useSiteMedia(siteId, {
    autoFetch: true,
    params: { limit: 10, type: "image" },
  });

  const {
    schedules,
    isLoading: isLoadingSchedules,
    refetch: refetchSchedules,
  } = useSiteMassSchedules(siteId, { autoFetch: true });

  const {
    events,
    isLoading: isLoadingEvents,
    refetch: refetchEvents,
  } = useSiteEvents(siteId, {
    autoFetch: true,
    params: { upcoming: "true", limit: 5 },
  });

  const {
    places,
    isLoading: isLoadingPlaces,
    refetch: refetchPlaces,
  } = useSiteNearbyPlaces(siteId, { autoFetch: true, params: { limit: 3 } });

  const isLoading =
    isLoadingDetail ||
    isLoadingMedia ||
    isLoadingSchedules ||
    isLoadingEvents ||
    isLoadingPlaces;

  const handleRefresh = () => {
    refetchDetail();
    refetchMedia();
    refetchSchedules();
    refetchEvents();
    refetchPlaces();
  };

  const handleBack = () => navigation.goBack();
  const handleShare = () => {};
  const handleBookmark = () => {
    if (!isAuthenticated || isGuest) {
      Alert.alert(
        "Yêu cầu đăng nhập",
        "Vui lòng đăng nhập để lưu địa điểm yêu thích.",
        [
          { text: "Để sau", style: "cancel" },
          {
            text: "Đăng nhập",
            onPress: () =>
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: "Auth" }],
                }),
              ),
          },
        ],
      );
      return;
    }
    toggleFav(siteId);
  };

  // -- Data Processing --

  // Format mass schedules for display
  const formattedSchedules = useMemo(() => {
    if (!schedules || schedules.length === 0)
      return { sunday: undefined, others: [] };

    // Helper to format days (e.g., [0] -> "Chúa Nhật", [1,2,3,4,5,6] -> "Ngày thường")
    const formatDays = (days: DayOfWeek[]) => {
      if (days.includes(0) && days.length === 1) return "Chúa Nhật";
      if (days.length === 6 && !days.includes(0)) return "Ngày thường";
      if (days.includes(6) && days.length === 1) return "Thứ Bảy";

      return days
        .map((d) => {
          if (d === 0) return "CN";
          return `T${d + 1}`;
        })
        .join(", ");
    };

    // Group by days
    const grouped = new Map<string, string[]>();

    schedules.forEach((schedule) => {
      const daysKey = formatDays(schedule.days_of_week);
      const timeStr = schedule.time.substring(0, 5); // HH:MM
      const noteStr = schedule.note ? ` (${schedule.note})` : "";
      const fullTimeStr = `${timeStr}${noteStr}`;

      if (grouped.has(daysKey)) {
        grouped.get(daysKey)?.push(fullTimeStr);
      } else {
        grouped.set(daysKey, [fullTimeStr]);
      }
    });

    // Convert to array
    const result = Array.from(grouped.entries()).map(([day, times]) => ({
      day,
      times: times.sort(),
    }));

    return {
      sunday: result.find((s) => s.day === "Chúa Nhật" || s.day === "CN"),
      others: result.filter((s) => s.day !== "Chúa Nhật" && s.day !== "CN"),
    };
  }, [schedules]);

  // Combine site images and media gallery for hero section slider
  const heroImages = useMemo(() => {
    const images = site?.images || [];
    const mediaImages = media
      .filter((m) => m.type === "image")
      .map((m) => m.url);

    // Add cover image if exists
    const allImages = site?.coverImage
      ? [site.coverImage, ...images, ...mediaImages]
      : [...images, ...mediaImages];

    // Remove duplicates and limit to 5
    return [...new Set(allImages)].slice(0, 5);
  }, [site, media]);

  // Fallback if no images
  const displayImages =
    heroImages.length > 0
      ? heroImages
      : [
          "https://images.unsplash.com/photo-1548625361-e88c60eb83fe?q=80&w=1000&auto=format&fit=crop",
        ];

  if (isLoading && !site) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={[styles.container, styles.errorContainer]}>
        <Text style={styles.errorText}>Không tìm thấy thông tin địa điểm</Text>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={handleRefresh}
            tintColor={COLORS.white}
          />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          {/* Background Image */}
          <Image
            source={{
              uri: displayImages[activeImageIndex] || displayImages[0],
            }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />

          {/* Gradient Overlay */}
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.9)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Top Header */}
          <View
            style={[styles.heroHeader, { paddingTop: insets.top + SPACING.sm }]}
          >
            <TouchableOpacity style={styles.heroButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={22} color="#fff" />
            </TouchableOpacity>
            <View style={styles.heroHeaderRight}>
              <TouchableOpacity style={styles.heroButton} onPress={handleShare}>
                <Ionicons name="share-outline" size={22} color="#fff" />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.heroButton}
                onPress={handleBookmark}
              >
                <Ionicons
                  name={isFavorite(siteId) ? "heart" : "heart-outline"}
                  size={22}
                  color={isFavorite(siteId) ? COLORS.danger : "#fff"}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.typeBadge}>
              <Ionicons name="business" size={12} color={COLORS.textPrimary} />
              <Text style={styles.typeBadgeText}>
                {site.type === "church" ? "Nhà thờ" : site.type}
              </Text>
            </View>
            <Text style={styles.heroTitle}>{site.name}</Text>

            {/* Patron Saint in Hero */}
            {site.patronSaint && (
              <View style={styles.patronSaintBadge}>
                <Ionicons name="star" size={14} color={COLORS.accent} />
                <Text style={styles.patronSaintText}>{site.patronSaint}</Text>
              </View>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={COLORS.accent} />
              <Text style={styles.locationText} numberOfLines={1}>
                {site.address}
                {(site.province || site.district) &&
                  `, ${site.district || ""} ${site.province || ""}`}
              </Text>
            </View>

            {/* Pagination Dots */}
            {displayImages.length > 1 && (
              <View style={styles.paginationDots}>
                {displayImages.map((_, index) => (
                  <TouchableOpacity
                    key={index}
                    onPress={() => setActiveImageIndex(index)}
                  >
                    <View
                      style={[
                        styles.dot,
                        index === activeImageIndex
                          ? styles.activeDot
                          : styles.inactiveDot,
                      ]}
                    />
                  </TouchableOpacity>
                ))}
              </View>
            )}
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Quick Actions Card */}
          <View style={styles.quickActionsCard}>
            <QuickActionButton icon="navigate" label="Dẫn đường" />
            {site.contactInfo?.phone && (
              <QuickActionButton icon="call" label="Gọi điện" />
            )}
            {site.contactInfo?.website && (
              <QuickActionButton icon="globe-outline" label="Website" />
            )}
            <QuickActionButton icon="gift-outline" label="Ủng hộ" />
            <QuickActionButton
              icon="alert-circle-outline"
              label="Hỗ trợ"
              onPress={() => setSOSModalVisible(true)}
            />
          </View>

          {/* Key Information Card - Only show provided info */}
          {/* We only show this card if there's information to show. 
              Currently minimal info is Opening Hours as Patron Saint moved to Hero 
              and Contact Info is redundant. */}
          {(site.openingHours?.open || site.openingHours?.close) && (
            <View style={styles.infoCard}>
              {/* Opening Hours */}
              <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons
                    name="time-outline"
                    size={20}
                    color={COLORS.accent}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Giờ mở cửa</Text>
                  <Text style={styles.infoValue}>
                    {site.openingHours?.open
                      ? site.openingHours.open.slice(0, 5)
                      : "--"}{" "}
                    -{" "}
                    {site.openingHours?.close
                      ? site.openingHours.close.slice(0, 5)
                      : "--"}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* About Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Giới thiệu</Text>
            <Text
              style={styles.descriptionText}
              numberOfLines={isDescriptionExpanded ? undefined : 4}
            >
              {site.description || "Chưa có thông tin mô tả."}
            </Text>

            {site.description && site.description.length > 150 && (
              <TouchableOpacity
                style={styles.readMoreButton}
                onPress={() => setIsDescriptionExpanded(!isDescriptionExpanded)}
              >
                <Text style={styles.readMoreText}>
                  {isDescriptionExpanded ? "Thu gọn" : "Đọc thêm"}
                </Text>
                <Ionicons
                  name={isDescriptionExpanded ? "chevron-up" : "chevron-down"}
                  size={14}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* History Section - Only if distinct from description */}
          {site.history && site.history !== site.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lịch sử hình thành</Text>
              <Text style={styles.descriptionText}>{site.history}</Text>
            </View>
          )}

          {/* Photos & Videos Gallery - Only show if we have media */}
          {media && media.length > 0 && (
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
                {media.map((item, index) => (
                  <TouchableOpacity
                    key={item.id || index}
                    style={styles.galleryItem}
                  >
                    <Image
                      source={{ uri: item.url }}
                      style={styles.galleryImage}
                      resizeMode="cover"
                    />
                    {item.type === "video" && (
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
          )}

          {/* Mass Schedule */}
          {/* Mass Schedule - Premium Redesign */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View style={styles.sectionIconContainer}>
                <Ionicons name="calendar" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.sectionTitlePremium}>Lịch Phụng Vụ</Text>
            </View>

            {formattedSchedules.sunday ||
            formattedSchedules.others.length > 0 ? (
              <View style={styles.premiumScheduleWrapper}>
                {/* Sunday Special Card */}
                {formattedSchedules.sunday && (
                  <View style={styles.sundayCard}>
                    <LinearGradient
                      colors={[COLORS.accent, "#f5d35a"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.sundayHeader}
                    >
                      <Ionicons name="sunny" size={20} color={COLORS.primary} />
                      <Text style={styles.sundayTitle}>
                        Chúa Nhật / Lễ Trọng
                      </Text>
                    </LinearGradient>
                    <View style={styles.sundayTimesContainer}>
                      {formattedSchedules.sunday.times.map((time, index) => (
                        <View key={index} style={styles.sundayTimeChip}>
                          <Text style={styles.sundayTimeText}>{time}</Text>
                        </View>
                      ))}
                    </View>
                  </View>
                )}

                {/* Weekdays Grid */}
                {formattedSchedules.others.length > 0 && (
                  <View style={styles.weekdayContainer}>
                    {formattedSchedules.others.map(
                      (schedule: any, index: number) => (
                        <View key={index} style={styles.weekdayRow}>
                          <View style={styles.weekdayLabelContainer}>
                            <Text style={styles.weekdayLabel}>
                              {schedule.day}
                            </Text>
                          </View>
                          <View style={styles.weekdayTimesScroll}>
                            {schedule.times.map(
                              (time: string, tIndex: number) => (
                                <View
                                  key={tIndex}
                                  style={styles.weekdayTimeChip}
                                >
                                  <Text style={styles.weekdayTimeText}>
                                    {time}
                                  </Text>
                                </View>
                              ),
                            )}
                          </View>
                        </View>
                      ),
                    )}
                  </View>
                )}

                <TouchableOpacity style={styles.viewFullScheduleButton}>
                  <Text style={styles.viewFullScheduleText}>
                    XEM CHI TIẾT LỊCH LỄ
                  </Text>
                  <Ionicons
                    name="arrow-forward"
                    size={16}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Đang cập nhật lịch lễ...</Text>
              </View>
            )}
          </View>

          {/* Upcoming Events - Premium Carousel Redesign */}
          <View style={styles.section}>
            <View style={styles.sectionHeaderRow}>
              <View
                style={[
                  styles.sectionIconContainer,
                  { backgroundColor: COLORS.accent },
                ]}
              >
                <Ionicons name="ticket" size={24} color={COLORS.white} />
              </View>
              <Text style={styles.sectionTitlePremium}>Sự kiện sắp tới</Text>
            </View>

            {events && events.length > 0 ? (
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.eventsScrollContent}
                decelerationRate="fast"
                snapToInterval={280 + SPACING.md}
              >
                {events.map((event) => {
                  // Clean date parsing for display
                  const eventDate = new Date(event.start_date);
                  const day = eventDate.getDate();
                  const month = eventDate.getMonth() + 1;

                  return (
                    <TouchableOpacity
                      key={event.id}
                      style={styles.largeEventCard}
                      activeOpacity={0.9}
                    >
                      <Image
                        source={{ uri: event.banner_url || site.coverImage }}
                        style={styles.eventCardImage}
                        resizeMode="cover"
                      />
                      <LinearGradient
                        colors={["transparent", "rgba(0,0,0,0.8)"]}
                        style={styles.eventCardOverlay}
                      />

                      {/* Date Badge */}
                      <View style={styles.eventDateBadge}>
                        <Text style={styles.eventDateDay}>{day}</Text>
                        <Text style={styles.eventDateMonth}>THG {month}</Text>
                      </View>

                      {/* Content */}
                      <View style={styles.eventCardContent}>
                        <Text style={styles.eventCardTitle} numberOfLines={2}>
                          {event.name}
                        </Text>
                        <View style={styles.eventCardFooter}>
                          <Ionicons
                            name="location-outline"
                            size={14}
                            color={COLORS.accent}
                          />
                          <Text
                            style={styles.eventCardLocation}
                            numberOfLines={1}
                          >
                            {site.name}
                          </Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>Chưa có sự kiện sắp tới.</Text>
              </View>
            )}
          </View>

          {/* Around the Sanctuary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Xung quanh nhà thờ</Text>
            <View style={styles.mapCard}>
              {/* Vietmap */}
              {site.latitude && site.longitude ? (
                <View style={styles.mapPlaceholder}>
                  <VietmapView
                    ref={mapRef}
                    initialRegion={{
                      latitude: site.latitude,
                      longitude: site.longitude,
                      zoom: 15,
                    }}
                    pins={[
                      {
                        id: site.id,
                        latitude: site.latitude,
                        longitude: site.longitude,
                        title: site.name,
                        color: "#D4AF37",
                        icon: "⛪",
                      } as MapPin,
                    ]}
                    showUserLocation
                    style={styles.mapImage}
                  />
                </View>
              ) : (
                <View style={[styles.mapPlaceholder, styles.mapNoLocation]}>
                  <Ionicons
                    name="map-outline"
                    size={36}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.mapNoLocationText}>
                    Chưa có dữ liệu vị trí
                  </Text>
                </View>
              )}

              {/* Nearby Places List */}
              {places && places.length > 0 ? (
                places.map((place, index) => (
                  <NearbyPlaceCard
                    key={place.id || index}
                    name={place.name}
                    address={place.address}
                    distance={`${Math.round(place.distance_meters / 100) / 10} km`}
                    type={place.category as any}
                  />
                ))
              ) : (
                <View style={{ padding: SPACING.md }}>
                  <Text style={{ color: COLORS.textSecondary }}>
                    Không có địa điểm lân cận nào.
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Bottom Spacing */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>

      {/* SOS Modal */}
      {site && (
        <SOSModal
          visible={isSOSModalVisible}
          onClose={() => setSOSModalVisible(false)}
          siteId={site.id}
          siteName={site.name}
          siteLocation={
            site.latitude && site.longitude
              ? { latitude: site.latitude, longitude: site.longitude }
              : undefined
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
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontFamily: TYPOGRAPHY.fontFamily.body,
    color: COLORS.danger,
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
  },
  backButtonText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },

  // Hero Section
  heroContainer: {
    position: "relative",
    width: "100%",
  },
  heroHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    zIndex: 10,
  },
  heroHeaderRight: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  heroButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.lg,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    backgroundColor: "rgba(201, 165, 114, 0.9)",
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
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
    marginBottom: SPACING.xs,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: "rgba(255,255,255,0.9)",
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    flex: 1,
  },
  patronSaintBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: SPACING.xs,
  },
  patronSaintText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  paginationDots: {
    flexDirection: "row",
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
    backgroundColor: "rgba(255,255,255,0.5)",
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
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginTop: -SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "space-around",
  },

  // Info Card
  infoCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    ...SHADOWS.small,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(201, 165, 114, 0.1)", // Light accent
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
  },

  // Empty State
  emptyContainer: {
    padding: SPACING.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
  },
  emptyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },

  // Section
  section: {
    marginTop: SPACING.xl,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
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
    flexDirection: "row",
    alignItems: "center",
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
    overflow: "hidden",
    position: "relative",
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  playButtonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.5)",
  },

  // Premium Section styles
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
    gap: SPACING.sm,
  },
  sectionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitlePremium: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "800", // Extra bold
    color: COLORS.primary,
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },

  // Premium Schedule Styles
  premiumScheduleWrapper: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  sundayCard: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.3)", // Light accent border
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sundayHeader: {
    flexDirection: "row",
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  sundayTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    color: COLORS.primary,
    textTransform: "uppercase",
  },
  sundayTimesContainer: {
    padding: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "center",
  },
  sundayTimeChip: {
    backgroundColor: COLORS.primary, // Contrast with white bg
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  sundayTimeText: {
    color: COLORS.accent, // Gold text on Navy bg
    fontWeight: "bold",
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  // Weekday styles
  weekdayContainer: {
    gap: 12,
  },
  weekdayRow: {
    flexDirection: "column",
    gap: 8,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  weekdayLabelContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  weekdayLabel: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "700",
    color: COLORS.primary,
  },
  weekdayTimesScroll: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  weekdayTimeChip: {
    backgroundColor: COLORS.surface1, // Slightly off-white
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: BORDER_RADIUS.sm,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  weekdayTimeText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },

  viewFullScheduleButton: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.sm,
    gap: 8,
  },
  viewFullScheduleText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "bold",
    color: COLORS.accent,
    letterSpacing: 1,
  },

  // Premium Events Styles
  eventsScrollContent: {
    paddingRight: SPACING.lg,
    gap: SPACING.md,
  },
  largeEventCard: {
    width: 280,
    height: 180,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.primary, // Fallback
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.medium,
    marginRight: 4, // for shadow
  },
  eventCardImage: {
    width: "100%",
    height: "100%",
  },
  eventCardOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  eventDateBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    padding: 6,
    alignItems: "center",
    minWidth: 50,
    ...SHADOWS.small,
  },
  eventDateDay: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "900",
    color: COLORS.primary,
    lineHeight: 24,
  },
  eventDateMonth: {
    fontSize: 10,
    fontWeight: "bold",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  eventCardContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: SPACING.md,
  },
  eventCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.white,
    marginBottom: 4,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  eventCardFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  eventCardLocation: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.accent,
    fontWeight: "600",
    flex: 1,
  },

  // Map
  mapCard: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  mapPlaceholder: {
    height: 200,
    backgroundColor: COLORS.backgroundDark,
    position: "relative",
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  mapNoLocation: {
    justifyContent: "center",
    alignItems: "center",
    gap: SPACING.sm,
  },
  mapNoLocationText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textTertiary,
  },
  mapImage: {
    width: "100%",
    height: "100%",
  },
  mapOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
  },
  viewMapButton: {
    flexDirection: "row",
    alignItems: "center",
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
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -32,
    marginLeft: -16,
  },
});

export default SiteDetailScreen;
