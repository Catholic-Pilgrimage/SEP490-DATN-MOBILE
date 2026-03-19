import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Platform,
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
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import guideSiteApi from "../../../../services/api/guide/siteApi";
import { getOpeningHoursForDay } from "../../../../utils/dateUtils";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const HERO_HEIGHT = Dimensions.get("window").height * 0.45;

// Premium color palette (matching Guide theme)
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  brown: "#8B7355",
};

export const SiteManagementScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  const { data: site, isLoading, refetch, isRefetching } = useQuery({
    queryKey: GUIDE_KEYS.dashboard.siteInfo(),
    queryFn: async () => {
      const response = await guideSiteApi.getAssignedSite();
      if (!response?.success) throw new Error(response?.message || "Failed");
      return response.data;
    },
  });

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  if (isLoading && !site) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
      </View>
    );
  }

  if (!site) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Không tìm thấy thông tin địa điểm.</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => refetch()}>
          <Text style={styles.retryButtonText}>Thử lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const locationText = [
    site.address,
    site.district,
    site.province,
  ]
    .filter(Boolean)
    .join(", ");
  const todayOpeningHours = getOpeningHoursForDay(site.opening_hours);

  const displayImages = site.cover_image
    ? [site.cover_image]
    : ["https://images.unsplash.com/photo-1548625361-e88c60eb83fe?q=80&w=1000&auto=format&fit=crop"];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

      <ScrollView
        style={styles.scrollView}
        bounces={false}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor="#FFF"
            colors={[PREMIUM_COLORS.gold]}
          />
        }
      >
        {/* Hero Section */}
        <View style={[styles.heroContainer, { height: HERO_HEIGHT }]}>
          <Image
            source={{ uri: displayImages[activeImageIndex] || displayImages[0] }}
            style={StyleSheet.absoluteFillObject}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["rgba(0,0,0,0.1)", "rgba(0,0,0,0.4)", "rgba(0,0,0,0.9)"]}
            style={StyleSheet.absoluteFillObject}
          />

          {/* Header Buttons */}
          <View style={[styles.headerButtons, { paddingTop: insets.top + GUIDE_SPACING.sm }]}>
            <TouchableOpacity style={styles.iconButton} onPress={handleBack}>
              <Ionicons name="arrow-back" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>

          {/* Hero Content */}
          <View style={styles.heroContent}>
            <View style={styles.badgeRow}>
              <View style={styles.typeBadge}>
                <Ionicons name="business" size={12} color={PREMIUM_COLORS.charcoal} />
                <Text style={styles.typeBadgeText}>
                  {site.type === "church" ? "Nhà thờ" : site.type}
                </Text>
              </View>
              {site.is_active && (
                <View style={[styles.typeBadge, { backgroundColor: GUIDE_COLORS.success }]}>
                  <Text style={[styles.typeBadgeText, { color: "#FFF" }]}>Hoạt động</Text>
                </View>
              )}
            </View>

            <Text style={styles.heroTitle} numberOfLines={2}>
              {site.name}
            </Text>

            {site.patron_saint && (
              <View style={styles.patronRow}>
                <Ionicons name="star" size={14} color={PREMIUM_COLORS.goldLight} />
                <Text style={styles.patronText}>Bổn mạng: {site.patron_saint}</Text>
              </View>
            )}

            <View style={styles.locationRow}>
              <Ionicons name="location" size={16} color={PREMIUM_COLORS.gold} />
              <Text style={styles.locationText} numberOfLines={2}>
                {locationText}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.contentContainer}>
          {/* Key Information Card */}
          {(todayOpeningHours || site.contact_info?.phone) && (
            <View style={styles.infoCard}>
              {/* Opening Hours */}
              <View style={[styles.infoRow, { borderBottomWidth: 1, borderBottomColor: GUIDE_COLORS.borderLight }]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="time-outline" size={20} color={PREMIUM_COLORS.goldDark} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Giờ mở cửa</Text>
                  <Text style={styles.infoValue}>
                    {todayOpeningHours
                      ? `${todayOpeningHours.open.substring(0, 5)} - ${todayOpeningHours.close.substring(0, 5)}`
                      : "Chưa cập nhật"}
                  </Text>
                </View>
              </View>

              {/* Contact Phone */}
              <View style={[styles.infoRow, { paddingTop: GUIDE_SPACING.sm }]}>
                <View style={styles.infoIconContainer}>
                  <Ionicons name="call-outline" size={20} color={PREMIUM_COLORS.goldDark} />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>Điện thoại</Text>
                  <Text style={styles.infoValue}>
                    {site.contact_info?.phone || "Chưa cập nhật"}
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
                  color={PREMIUM_COLORS.goldDark}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* History Section */}
          {site.history && site.history !== site.description && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Lịch sử hình thành</Text>
              <Text style={styles.descriptionText}>{site.history}</Text>
            </View>
          )}

          {/* Regional Info (Minor details) */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Thông tin bổ sung</Text>
            <View style={styles.detailCard}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Mã địa điểm:</Text>
                <Text style={styles.detailValue}>{site.code}</Text>
              </View>
              <View style={[styles.detailRow, styles.detailRowNoBorder]}>
                <Text style={styles.detailLabel}>Vùng miền:</Text>
                <Text style={styles.detailValue}>{site.region}</Text>
              </View>
            </View>
          </View>

          <View style={{ height: 60 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.warmGray,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
    padding: GUIDE_SPACING.xl,
  },
  errorText: {
    fontSize: 16,
    color: GUIDE_COLORS.error,
    marginBottom: GUIDE_SPACING.sm,
  },
  retryButton: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  retryButtonText: {
    color: "#FFF",
    fontWeight: "600",
  },
  scrollView: {
    flex: 1,
  },
  
  // Hero Section
  heroContainer: {
    position: "relative",
    width: "100%",
  },
  headerButtons: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: GUIDE_SPACING.lg,
    paddingBottom: 40,
  },
  badgeRow: {
    flexDirection: "row",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.xs,
  },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.9)", // Gold with opacity
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
    gap: 4,
  },
  typeBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    textTransform: "uppercase",
  },
  heroTitle: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  patronRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  patronText: {
    fontSize: 14,
    color: PREMIUM_COLORS.goldLight,
    fontWeight: "700",
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
    flex: 1,
  },

  // Content Container
  contentContainer: {
    marginTop: -20,
    paddingHorizontal: GUIDE_SPACING.lg,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: GUIDE_SPACING.lg,
  },

  // Info Card
  infoCard: {
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: GUIDE_SPACING.sm,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: GUIDE_SPACING.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
    marginBottom: 2,
    fontWeight: "500",
  },
  infoValue: {
    fontSize: 15,
    fontWeight: "600",
    color: PREMIUM_COLORS.charcoal,
  },

  // Section
  section: {
    marginBottom: GUIDE_SPACING.xl,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
    marginBottom: GUIDE_SPACING.md,
  },
  descriptionText: {
    fontSize: 15,
    color: GUIDE_COLORS.textPrimary,
    lineHeight: 24,
  },
  readMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: GUIDE_SPACING.sm,
    gap: 4,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },

  // Detail Card
  detailCard: {
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingHorizontal: GUIDE_SPACING.md,
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.goldDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 5,
      },
      android: { elevation: 2 },
    }),
  },
  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  detailRowNoBorder: {
    borderBottomWidth: 0,
  },
  detailLabel: {
    fontSize: 14,
    color: GUIDE_COLORS.textMuted,
    fontWeight: "500",
  },
  detailValue: {
    fontSize: 14,
    color: PREMIUM_COLORS.charcoal,
    fontWeight: "700",
  },
});

export default SiteManagementScreen;
