import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Platform,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useI18n } from "../../../../hooks/useI18n";
import { useNotifications } from "../../../../hooks/useNotifications";
import {
  getFontSize,
  getSpacing,
  isSmallScreen,
  isTablet,
  moderateScale,
  responsive,
} from "../../../../utils/responsive";
import { NotificationModal } from "../../../pilgrim/explore/components/NotificationModal";
import { PilgrimInsights, QuickActionsBar, RecentReviews } from "../components";
import { useDashboardHome } from "../hooks/useDashboardHome";

// Premium color palette
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  warmWhite: "#FFFEF9",
  charcoal: "#1A1A1A",
  slate: "#64748B",
  emerald: "#10B981",
  ruby: "#E11D48",
  sapphire: "#2563EB",
  amber: "#F59E0B",
  gradientGold: ["#D4AF37", "#F4E4BA", "#D4AF37"],
  gradientPremium: ["#1A1A1A", "#2D2D2D", "#1A1A1A"],
};

// Use dynamic dimensions that update on rotation/resize
const getScreenWidth = () => Dimensions.get("window").width;
const getScreenHeight = () => Dimensions.get("window").height;

// Responsive helper functions for this component
const getHeroHeight = () => {
  const width = getScreenWidth();
  if (width < 375) return width * 0.85; // Small screens
  if (width < 414) return width * 0.9; // Medium screens
  if (width >= 768) return width * 0.5; // Tablets
  return width * 0.95; // Large phones
};

const getQuickActionWidth = () => {
  const screenWidth = getScreenWidth();
  const horizontalPadding = getSpacing(GUIDE_SPACING.lg) * 2;
  const gap = getSpacing(GUIDE_SPACING.md);
  return (screenWidth - horizontalPadding - gap) / 2;
};

const getQuickActionMinHeight = () => {
  return responsive({
    small: 95,
    medium: 105,
    large: 115,
    tablet: 130,
    default: 110,
  });
};

// Types - using TodayOverviewItem from hook

// Get greeting key based on time of day
const getGreetingKey = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "dashboard.greetings.morning";
  if (hour < 18) return "dashboard.greetings.afternoon";
  return "dashboard.greetings.evening";
};

// No mock data - using real data from useDashboardHome hook

// Quick Action Button Component - Premium Design with Pattern
interface QuickActionProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: "default" | "danger";
  badgeCount?: number;
}

const QuickActionButton: React.FC<QuickActionProps> = ({
  icon,
  label,
  onPress,
  variant = "default",
  badgeCount,
}) => {
  const isDanger = variant === "danger";
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.spring(scaleAnim, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Unified gold gradient for all cards, ruby for danger
  const gradientColors: [string, string] = isDanger
    ? ["#DC2626", "#B91C1C"]
    : [PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark];

  // Responsive sizes
  const iconSize = moderateScale(24, 0.3);
  const patternSize = moderateScale(70, 0.3);
  const iconContainerSize = moderateScale(44, 0.3);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={[
          styles.quickActionButton,
          {
            width: getQuickActionWidth(),
          },
        ]}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.quickActionGradient,
            { minHeight: getQuickActionMinHeight() },
          ]}
        >
          {/* Decorative Pattern - Cross motif */}
          <View style={styles.quickActionPattern}>
            <MaterialIcons
              name="add"
              size={patternSize}
              color="rgba(255, 255, 255, 0.1)"
            />
          </View>

          {/* Icon */}
          <View
            style={[
              styles.quickActionIconContainer,
              {
                width: iconContainerSize,
                height: iconContainerSize,
                borderRadius: iconContainerSize * 0.3,
              },
            ]}
          >
            <MaterialIcons name={icon} size={iconSize} color="#FFFFFF" />
          </View>

          {/* Label */}
          <Text style={styles.quickActionLabel}>{label}</Text>

          {/* Badge */}
          {badgeCount !== undefined && badgeCount > 0 && (
            <View style={styles.quickActionBadge}>
              <Text style={styles.quickActionBadgeText}>{badgeCount}</Text>
            </View>
          )}
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

// Status Indicator Component - Premium Animated
const StatusIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulseAnim, {
              toValue: 1.8,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(pulseAnim, {
              toValue: 1,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
          Animated.sequence([
            Animated.timing(glowAnim, {
              toValue: 0,
              duration: 1200,
              useNativeDriver: true,
            }),
            Animated.timing(glowAnim, {
              toValue: 0.3,
              duration: 1200,
              useNativeDriver: true,
            }),
          ]),
        ]),
      ).start();
    }
  }, [isActive, pulseAnim, glowAnim]);

  return (
    <View style={styles.statusIndicatorContainer}>
      {isActive && (
        <Animated.View
          style={[
            styles.statusIndicatorPulse,
            {
              transform: [{ scale: pulseAnim }],
              opacity: glowAnim,
            },
          ]}
        />
      )}
      <View
        style={[
          styles.statusIndicatorDot,
          {
            backgroundColor: isActive
              ? PREMIUM_COLORS.emerald
              : GUIDE_COLORS.gray400,
          },
        ]}
      />
    </View>
  );
};

// Main Dashboard Screen
const DashboardScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  // Use dynamic dimensions for responsive updates
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();

  // Fetch all dashboard data using comprehensive hook
  const {
    data,
    pendingBadges,
    loading,
    isLoading,
    refresh,
    isOpen,
    isOnDuty,
    hasPendingSOS,
    pendingSOSCount,
    siteStatusDisplay,
    activeShiftDisplay,
  } = useDashboardHome();

  // Responsive values that update with screen size
  const heroHeight = getHeroHeight();
  const isSmall = isSmallScreen();
  const tablet = isTablet();

  // Responsive font sizes
  const siteNameFontSize = responsive({
    small: 24,
    medium: 28,
    large: 30,
    tablet: 36,
    default: 28,
  });

  const sectionTitleFontSize = responsive({
    small: 18,
    medium: 20,
    large: 22,
    tablet: 26,
    default: 22,
  });

  // Extract data for convenience
  const siteInfo = data.siteInfo;
  const todayOverview = data.todayOverview;
  const recentActivity = data.recentActivity;
  const siteLoading = loading.siteInfo;

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const handleClockOut = () => {
    // TODO: Implement clock out functionality
  };

  const handleQuickAction = (actionId: string) => {
    switch (actionId) {
      case "sos-log":
        navigation.navigate("SOSList");
        break;
      case "post-news":
        navigation.navigate("MySite", {
          screen: "MySiteHome",
          params: { initialTab: "events" },
        } as any);
        break;
      case "add-schedule":
        navigation.navigate("MySite", {
          screen: "MySiteHome",
          params: { initialTab: "schedules" },
        } as any);
        break;
      case "upload-media":
        navigation.navigate("MySite", {
          screen: "MySiteHome",
          params: { initialTab: "media" },
        } as any);
        break;
      default:
        console.warn(`Unhandled quick action: ${actionId}`);
    }
  };

  const handleTaskPress = (taskId: string) => {
    // TODO: Navigate to task detail
  };

  const handleViewAllTasks = () => {
    // TODO: Navigate to all tasks screen
  };

  // Get display name - prefer fullName, fallback to email username, then default
  const getDisplayName = () => {
    if (user?.fullName && user.fullName.trim()) {
      return user.fullName;
    }
    if (user?.email) {
      return user.email.split("@")[0]; // Use email username as fallback
    }
    return "Local Guide";
  };
  const guideName = getDisplayName();
  const firstName = guideName.split(" ")[0];
  const { t } = useI18n();
  const greeting = t(getGreetingKey());

  return (
    <View style={[styles.container, { paddingTop: 0 }]}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={GUIDE_COLORS.primary}
            colors={[GUIDE_COLORS.primary]}
          />
        }
      >
        {/* Hero Header Section - Premium Design */}
        <View style={[styles.heroSection, { height: heroHeight }]}>
          <ImageBackground
            source={{
              uri:
                siteInfo?.coverImage ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAqbVTkMCTc_WQ6WIfqhD4WF94ki7WRByjY6o_AgODRQ_-GDjd_SDG0wjUx5TXKIfxnBRZMJPJazyKoWgNpQQmK5lXUCPX-IHBuX5DhMyoPJHQLTWOTVMQVUEAl58b-kDY__kqar5td32hyFggIDO0c35L3t7blEUJ2WlXerbZRhnIxeWVqhw198dgBne0LHIP8AWjvPGUrXMgm3pbi9PU5KoNo6RXoo8rLmmrBsgDGJo2BszZ2kLxSsih-Kp0kybCXLq-dA3LlpdY",
            }}
            style={styles.heroBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={[
                "rgba(0, 0, 0, 0.7)",
                "rgba(0, 0, 0, 0.6)",
                "rgba(0, 0, 0, 0.5)",
                "rgba(0, 0, 0, 0.55)",
                "rgba(253, 248, 240, 0.95)",
                PREMIUM_COLORS.cream,
              ]}
              locations={[0, 0.2, 0.4, 0.55, 0.8, 1]}
              style={styles.heroGradient}
            >
              {/* Top App Bar - Glassmorphism */}
              <View
                style={[
                  styles.topAppBar,
                  { paddingTop: insets.top + getSpacing(GUIDE_SPACING.sm) },
                ]}
              >
                <View style={styles.appBarTitleContainer}>
                  <Text style={styles.appBarTitle}>
                    {t("dashboard.cathedralGuide")}
                  </Text>
                  <View style={styles.appBarTitleUnderline} />
                </View>

                <TouchableOpacity
                  style={styles.appBarButton}
                  onPress={() => setShowNotifications(true)}
                >
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                    style={styles.appBarButtonGradient}
                  >
                    <Ionicons name="notifications" size={20} color="#FFFFFF" />
                    {unreadCount > 0 && (
                      <View style={styles.notificationBadge}>
                        <Text style={styles.notificationBadgeText}>
                          {unreadCount > 99 ? "99+" : unreadCount}
                        </Text>
                      </View>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Hero Content - Premium Typography */}
              <View style={styles.heroContent}>
                <View style={styles.greetingContainer}>
                  <View style={styles.greetingLine} />
                  <Text style={styles.heroGreeting}>
                    {greeting}, {guideName}
                  </Text>
                  <View style={styles.greetingLine} />
                </View>

                <Text
                  style={[
                    styles.heroSiteName,
                    {
                      fontSize: siteNameFontSize,
                      lineHeight: siteNameFontSize * 1.2,
                    },
                  ]}
                >
                  {siteLoading
                    ? t("common.loading")
                    : siteInfo?.name || t("dashboard.notAssignedSite")}
                </Text>

                <View style={styles.heroMeta}>
                  {/* Open/Closed Status - Premium Badge */}
                  <View
                    style={[
                      styles.statusBadge,
                      isOpen
                        ? styles.statusBadgeOpen
                        : styles.statusBadgeClosed,
                    ]}
                  >
                    <StatusIndicator isActive={isOpen} />
                    <Text style={styles.statusText}>
                      {isOpen
                        ? t("dashboard.status.open")
                        : t("dashboard.status.closed")}
                    </Text>
                  </View>
                  {/* Patron Saint - Elegant Italic with ellipsis */}
                  {siteInfo?.patronSaint && (
                    <View style={styles.heroPatronContainer}>
                      <Text
                        style={[
                          styles.heroPatron,
                          { fontSize: getFontSize(13) },
                        ]}
                        numberOfLines={1}
                        ellipsizeMode="tail"
                      >
                        <Text style={styles.heroPatronLabel}>
                          {t("dashboard.patron")}:{" "}
                        </Text>
                        {siteInfo.patronSaint}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Compact Quick Actions Bar - Horizontal Scroll */}
        <View
          style={[
            styles.quickActionsOverlay,
            { paddingHorizontal: getSpacing(GUIDE_SPACING.md) },
          ]}
        >
          <QuickActionsBar
            onActionPress={(actionId) => handleQuickAction(actionId)}
            badges={{
              "post-news": pendingBadges.events,
              "add-schedule": pendingBadges.schedules,
              "upload-media": pendingBadges.media,
              "sos-log": pendingBadges.sos,
            }}
          />
        </View>

        {/* Pilgrim Insights Section - Live Data */}
        <View
          style={[
            styles.pilgrimSection,
            { paddingHorizontal: getSpacing(GUIDE_SPACING.md) },
          ]}
        >
          <PilgrimInsights
            liveCheckInCount={12} // TODO: Connect to real API
            todayVisitors={48} // TODO: Connect to real API
            onViewAll={() => {
              /* TODO: Navigate to pilgrim stats */
            }}
          />
        </View>

        {/* Today's Overview Section - Premium Design */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: getSpacing(GUIDE_SPACING.md) },
          ]}
        >
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text
                style={[styles.sectionLabel, { fontSize: getFontSize(10) }]}
              >
                {t("todayOverview.sectionLabel")}
              </Text>
              <Text
                style={[
                  styles.sectionTitleSerif,
                  { fontSize: sectionTitleFontSize },
                ]}
              >
                {t("todayOverview.title")}
              </Text>
            </View>
            {activeShiftDisplay.shouldShow && (
              <LinearGradient
                colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shiftBadge}
              >
                <Text style={styles.shiftBadgeLabel}>
                  {t("todayOverview.activeShift")}
                </Text>
                <Text style={styles.shiftBadgeTime}>
                  {activeShiftDisplay.timeRange}
                </Text>
              </LinearGradient>
            )}
          </View>

          {/* Premium Timeline */}
          <View style={styles.timeline}>
            {todayOverview.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons
                  name="event-available"
                  size={moderateScale(48, 0.3)}
                  color={GUIDE_COLORS.gray300}
                />
                <Text
                  style={[styles.emptyStateText, { fontSize: getFontSize(14) }]}
                >
                  {t("todayOverview.noSchedule")}
                </Text>
              </View>
            ) : (
              todayOverview.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.timelineItem,
                    item.isNow && styles.timelineItemActive,
                  ]}
                  activeOpacity={0.7}
                >
                  <View style={styles.timelineLeft}>
                    <LinearGradient
                      colors={
                        item.isNow
                          ? [PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]
                          : ["#E5E7EB", "#D1D5DB"]
                      }
                      style={styles.timelineDot}
                    >
                      <MaterialIcons
                        name={item.type === "schedule" ? "church" : "event"}
                        size={14}
                        color={item.isNow ? "#FFFFFF" : "#6B7280"}
                      />
                    </LinearGradient>
                    {index < todayOverview.length - 1 && (
                      <LinearGradient
                        colors={[
                          PREMIUM_COLORS.gold,
                          "rgba(212, 175, 55, 0.2)",
                        ]}
                        style={styles.timelineLine}
                      />
                    )}
                  </View>

                  <View style={styles.timelineContent}>
                    <Text
                      style={[
                        styles.timelineTime,
                        item.isNow && styles.timelineTimeActive,
                      ]}
                    >
                      {item.displayTime}
                    </Text>
                    <Text
                      style={[
                        styles.timelineTitle,
                        !item.isNow && styles.timelineTitleMuted,
                      ]}
                    >
                      {item.title}
                    </Text>
                    <View style={styles.timelineLocationRow}>
                      <Ionicons
                        name="location-outline"
                        size={moderateScale(12, 0.3)}
                        color={GUIDE_COLORS.gray400}
                      />
                      <Text
                        style={[
                          styles.timelineLocation,
                          { fontSize: getFontSize(12) },
                        ]}
                      >
                        {item.location || t("todayOverview.mainArea")}
                      </Text>
                    </View>
                  </View>

                  {item.isNow && (
                    <View style={styles.timelineActiveIndicator}>
                      <Text style={styles.timelineActiveText}>
                        {t("todayOverview.now")}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Recent Activity Section - Premium Cards */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: getSpacing(GUIDE_SPACING.xl) },
          ]}
        >
          <View style={styles.sectionHeaderWithAction}>
            <Text
              style={[
                styles.sectionTitleSerif,
                { fontSize: sectionTitleFontSize },
              ]}
            >
              {t("recentActivity.title")}
            </Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={[styles.viewAllText, { fontSize: getFontSize(13) }]}>
                {t("common.viewAll")}
              </Text>
              <Ionicons
                name="chevron-forward"
                size={moderateScale(14, 0.3)}
                color={PREMIUM_COLORS.gold}
              />
            </TouchableOpacity>
          </View>

          <View style={styles.activityList}>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons
                  name="history"
                  size={moderateScale(48, 0.3)}
                  color={GUIDE_COLORS.gray300}
                />
                <Text
                  style={[styles.emptyStateText, { fontSize: getFontSize(14) }]}
                >
                  {t("recentActivity.noActivity")}
                </Text>
              </View>
            ) : (
              recentActivity.slice(0, 5).map((activity) => (
                <TouchableOpacity key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityImageContainer}>
                    {activity.thumbnail ? (
                      <Image
                        source={{ uri: activity.thumbnail }}
                        style={[
                          styles.activityImage,
                          {
                            width: moderateScale(56, 0.3),
                            height: moderateScale(56, 0.3),
                          },
                        ]}
                      />
                    ) : (
                      <View
                        style={[
                          styles.activityImage,
                          styles.activityImagePlaceholder,
                          {
                            width: moderateScale(56, 0.3),
                            height: moderateScale(56, 0.3),
                            backgroundColor:
                              activity.type === "nearby_place"
                                ? activity.originalData?.category === "accommodation"
                                  ? "#DBEAFE"
                                  : activity.originalData?.category === "medical"
                                    ? "#FEE2E2"
                                    : "#D1FAE5"
                                : activity.type === "media"
                                  ? "#FEF3C7"
                                  : "#DBEAFE",
                          },
                        ]}
                      >
                        <Ionicons
                          name={
                            activity.type === "nearby_place"
                              ? activity.originalData?.category === "accommodation"
                                ? "bed"
                                : activity.originalData?.category === "medical"
                                  ? "medkit"
                                  : "restaurant"
                              : activity.type === "media"
                                ? "image"
                                : "calendar"
                          }
                          size={moderateScale(24, 0.3)}
                          color={
                            activity.type === "nearby_place"
                              ? activity.originalData?.category === "accommodation"
                                ? "#3B82F6"
                                : activity.originalData?.category === "medical"
                                  ? "#EF4444"
                                  : "#10B981"
                              : activity.type === "media"
                                ? PREMIUM_COLORS.gold
                                : PREMIUM_COLORS.sapphire
                          }
                        />
                      </View>
                    )}
                    <View
                      style={[
                        styles.activityImageOverlay,
                        {
                          backgroundColor:
                            activity.type === "media"
                              ? PREMIUM_COLORS.gold
                              : activity.type === "nearby_place"
                                ? activity.originalData?.category === "accommodation"
                                  ? "#3B82F6"
                                  : activity.originalData?.category === "medical"
                                    ? "#EF4444"
                                    : "#10B981"
                                : PREMIUM_COLORS.sapphire,
                        },
                      ]}
                    >
                      <Ionicons
                        name={
                          activity.type === "media"
                            ? "image"
                            : activity.type === "nearby_place"
                              ? activity.originalData?.category === "accommodation"
                                ? "bed"
                                : activity.originalData?.category === "medical"
                                  ? "medkit"
                                  : "restaurant"
                              : "calendar"
                        }
                        size={moderateScale(12, 0.3)}
                        color="#FFFFFF"
                      />
                    </View>
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{activity.title}</Text>
                    <Text style={styles.activitySubtitle}>
                      {activity.subtitle}
                    </Text>
                    <View style={styles.activityTimeRow}>
                      <Ionicons
                        name="time-outline"
                        size={10}
                        color={GUIDE_COLORS.gray400}
                      />
                      <Text style={styles.activityTime}>
                        {new Date(activity.created_at).toLocaleString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          day: "2-digit",
                          month: "2-digit",
                        })}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.activityArrow}>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color={PREMIUM_COLORS.goldDark}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Recent Reviews Section - Pilgrim Feedback */}
        <View
          style={[
            styles.section,
            { paddingHorizontal: getSpacing(GUIDE_SPACING.lg) },
          ]}
        >
          <RecentReviews
            reviews={[
              {
                id: "1",
                pilgrimName: "Maria Nguyễn",
                pilgrimAvatar:
                  "https://randomuser.me/api/portraits/women/44.jpg",
                rating: 5,
                content:
                  "Buổi hành hương rất ý nghĩa! Hướng dẫn viên nhiệt tình và am hiểu lịch sử.",
                createdAt: new Date(
                  Date.now() - 2 * 60 * 60 * 1000,
                ).toISOString(),
                isReplied: false,
              },
              {
                id: "2",
                pilgrimName: "Joseph Trần",
                pilgrimAvatar: "https://randomuser.me/api/portraits/men/32.jpg",
                rating: 4,
                content:
                  "Nhà thờ rất đẹp, không gian tĩnh lặng phù hợp cầu nguyện.",
                createdAt: new Date(
                  Date.now() - 5 * 60 * 60 * 1000,
                ).toISOString(),
                isReplied: true,
              },
              {
                id: "3",
                pilgrimName: "Teresa Lê",
                pilgrimAvatar:
                  "https://randomuser.me/api/portraits/women/68.jpg",
                rating: 5,
                content: "Tuyệt vời! Sẽ quay lại lần sau.",
                createdAt: new Date(
                  Date.now() - 24 * 60 * 60 * 1000,
                ).toISOString(),
                isReplied: false,
              },
            ]}
            onReply={(reviewId) => {
              /* TODO: Navigate to reply screen */
            }}
            onViewAll={() => {
              /* TODO: Navigate to all reviews */
            }}
            onAISummary={() => {
              /* TODO: Generate AI summary */
            }}
          />
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Notification Modal */}
      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // Hero Section - Premium Design
  heroSection: {
    // Height is now set dynamically in the component
    width: "100%",
  },
  heroBackground: {
    flex: 1,
    width: "100%",
  },
  heroGradient: {
    flex: 1,
    justifyContent: "space-between",
  },

  // Top App Bar - Glassmorphism
  topAppBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: getSpacing(GUIDE_SPACING.lg),
    paddingBottom: getSpacing(GUIDE_SPACING.sm),
  },
  appBarButton: {
    width: moderateScale(44, 0.3),
    height: moderateScale(44, 0.3),
    borderRadius: moderateScale(22, 0.3),
    overflow: "visible", // Allow badge to overflow
  },
  appBarButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: moderateScale(22, 0.3),
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
    overflow: "visible", // Allow badge to overflow
  },
  appBarTitleContainer: {
    alignItems: "center",
  },
  appBarTitle: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  appBarTitleUnderline: {
    width: moderateScale(30, 0.3),
    height: 2,
    backgroundColor: PREMIUM_COLORS.gold,
    marginTop: 4,
    borderRadius: 1,
  },
  notificationBadge: {
    position: "absolute",
    top: -2,
    right: -2,
    backgroundColor: PREMIUM_COLORS.ruby,
    width: moderateScale(18, 0.3),
    height: moderateScale(18, 0.3),
    borderRadius: moderateScale(9, 0.3),
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    fontSize: getFontSize(10),
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Hero Content - Premium Typography
  heroContent: {
    paddingHorizontal: getSpacing(GUIDE_SPACING.xl),
    paddingBottom: getSpacing(GUIDE_SPACING.xxl) * 2.5,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.sm),
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  greetingLine: {
    width: moderateScale(20, 0.3),
    height: 1,
    backgroundColor: PREMIUM_COLORS.gold,
  },
  heroGreeting: {
    fontSize: getFontSize(11),
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2.5,
    textTransform: "uppercase",
    textShadowColor: "rgba(0, 0, 0, 0.7)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  heroSiteName: {
    // fontSize is now set dynamically in the component
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: getSpacing(GUIDE_SPACING.md),
    textShadowColor: "rgba(0, 0, 0, 0.6)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 8,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "nowrap",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.xs),
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: moderateScale(6, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(16, 185, 129, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 1)",
  },
  statusBadgeClosed: {
    backgroundColor: "rgba(185, 28, 28, 0.9)",
    borderWidth: 1.5,
    borderColor: "rgba(185, 28, 28, 1)",
  },
  statusText: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    letterSpacing: 1,
    color: "#FFF",
  },
  heroPatronContainer: {
    flex: 1,
    minWidth: 0, // Allow shrinking below content size
  },
  heroPatron: {
    // fontSize is now set dynamically in the component
    color: "#FFF",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: moderateScale(6, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    overflow: "hidden",
  },
  heroPatronLabel: {
    fontWeight: "400",
    fontStyle: "italic",
    color: PREMIUM_COLORS.goldLight,
  },

  // Quick Actions - Premium Cards
  quickActionsOverlay: {
    // paddingHorizontal is now set dynamically in the component
    marginTop: -getSpacing(GUIDE_SPACING.xl),
    zIndex: 10,
  },
  pilgrimSection: {
    marginTop: getSpacing(GUIDE_SPACING.md),
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    // gap is now set dynamically in the component
  },
  quickActionButton: {
    // width is now set dynamically in the component
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.goldDark,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
      },
      android: {
        elevation: 6,
      },
    }),
  },
  quickActionGradient: {
    padding: getSpacing(GUIDE_SPACING.lg),
    paddingTop: getSpacing(GUIDE_SPACING.xl),
    paddingBottom: getSpacing(GUIDE_SPACING.lg),
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
    // minHeight is now set dynamically in the component
  },
  quickActionPattern: {
    position: "absolute",
    top: moderateScale(-20, 0.3),
    right: moderateScale(-20, 0.3),
    opacity: 1,
  },
  quickActionIconContainer: {
    // width, height, borderRadius are now set dynamically in the component
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quickActionLabel: {
    fontSize: getFontSize(14),
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: getSpacing(GUIDE_SPACING.sm),
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionBadge: {
    position: "absolute",
    top: getSpacing(GUIDE_SPACING.sm),
    right: getSpacing(GUIDE_SPACING.sm),
    backgroundColor: "#FFFFFF",
    paddingHorizontal: moderateScale(8, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: moderateScale(12, 0.3),
    minWidth: moderateScale(24, 0.3),
    alignItems: "center",
  },
  quickActionBadgeText: {
    fontSize: getFontSize(11),
    fontWeight: "800",
    color: PREMIUM_COLORS.gold,
  },

  // Sections - Premium Layout
  section: {
    // paddingHorizontal is now set dynamically in the component
    paddingTop: getSpacing(GUIDE_SPACING.lg),
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: getSpacing(GUIDE_SPACING.md),
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.lg),
  },
  sectionLabel: {
    // fontSize is now set dynamically in the component
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2,
    marginBottom: getSpacing(GUIDE_SPACING.xs),
  },
  sectionTitleSerif: {
    // fontSize is now set dynamically in the component
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
  },
  viewAllText: {
    // fontSize is now set dynamically in the component
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },

  // Shift Badge - Premium Gradient
  shiftBadge: {
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: getSpacing(GUIDE_SPACING.sm),
    alignItems: "flex-end",
  },
  shiftBadgeLabel: {
    fontSize: getFontSize(9),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    opacity: 0.9,
  },
  shiftBadgeTime: {
    fontSize: getFontSize(13),
    fontWeight: "700",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },

  // Timeline - Premium Design
  timeline: {
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: getSpacing(GUIDE_SPACING.md),
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  timelineItemActive: {
    borderColor: PREMIUM_COLORS.gold,
    borderWidth: 1.5,
    backgroundColor: "#FFFEF9",
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.gold,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  timelineLeft: {
    alignItems: "center",
    marginRight: getSpacing(GUIDE_SPACING.md),
  },
  timelineDot: {
    width: moderateScale(32, 0.3),
    height: moderateScale(32, 0.3),
    borderRadius: moderateScale(16, 0.3),
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    height: moderateScale(40, 0.3),
    marginTop: getSpacing(GUIDE_SPACING.xs),
    borderRadius: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: moderateScale(4, 0.3),
  },
  timelineTime: {
    fontSize: getFontSize(11),
    fontWeight: "700",
    color: GUIDE_COLORS.gray400,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  timelineTimeActive: {
    color: PREMIUM_COLORS.gold,
  },
  timelineTitle: {
    fontSize: getFontSize(16),
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginTop: 2,
    lineHeight: getFontSize(22),
  },
  timelineTitleMuted: {
    color: GUIDE_COLORS.gray500,
    fontWeight: "600",
  },
  timelineLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
    marginTop: moderateScale(4, 0.3),
  },
  timelineLocation: {
    // fontSize is now set dynamically in the component
    color: GUIDE_COLORS.gray400,
  },
  timelineActiveIndicator: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingHorizontal: moderateScale(10, 0.3),
    paddingVertical: moderateScale(4, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    alignSelf: "flex-start",
  },
  timelineActiveText: {
    fontSize: getFontSize(10),
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // Activity List - Premium Cards
  activityList: {
    gap: getSpacing(GUIDE_SPACING.md),
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: getSpacing(GUIDE_SPACING.md),
    backgroundColor: "#FFFFFF",
    padding: getSpacing(GUIDE_SPACING.md),
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.04)",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.04,
        shadowRadius: 8,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  activityImageContainer: {
    position: "relative",
  },
  activityImage: {
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  activityImagePlaceholder: {
    justifyContent: "center",
    alignItems: "center",
  },
  activityImageOverlay: {
    position: "absolute",
    bottom: moderateScale(-4, 0.3),
    right: moderateScale(-4, 0.3),
    width: moderateScale(24, 0.3),
    height: moderateScale(24, 0.3),
    borderRadius: moderateScale(12, 0.3),
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: getFontSize(14),
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
  },
  activitySubtitle: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.gray500,
    marginTop: 2,
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: moderateScale(4, 0.3),
    marginTop: moderateScale(4, 0.3),
  },
  activityTime: {
    fontSize: getFontSize(11),
    color: GUIDE_COLORS.gray400,
  },
  activityArrow: {
    width: moderateScale(36, 0.3),
    height: moderateScale(36, 0.3),
    borderRadius: moderateScale(18, 0.3),
    backgroundColor: "rgba(212, 175, 55, 0.18)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },

  // Empty State
  emptyStateContainer: {
    padding: getSpacing(GUIDE_SPACING.xl),
    alignItems: "center",
    justifyContent: "center",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  emptyStateText: {
    // fontSize is now set dynamically in the component
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },

  // Status Indicator (used by StatusIndicator component)
  statusIndicatorContainer: {
    position: "relative",
    width: moderateScale(12, 0.3),
    height: moderateScale(12, 0.3),
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicatorPulse: {
    position: "absolute",
    width: moderateScale(12, 0.3),
    height: moderateScale(12, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.emerald,
  },
  statusIndicatorDot: {
    width: moderateScale(10, 0.3),
    height: moderateScale(10, 0.3),
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
});

export default DashboardScreen;
