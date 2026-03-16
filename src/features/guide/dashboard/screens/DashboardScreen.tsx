import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
  Alert,
  Image,
  ImageBackground,
  RefreshControl,
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useI18n } from "../../../../hooks/useI18n";
import { useNotifications } from "../../../../hooks/useNotifications";
import {
  getFontSize,
  getSpacing,
  moderateScale,
  responsive,
} from "../../../../utils/responsive";
import { NotificationModal } from "../../../pilgrim/explore/components/NotificationModal";
import {
  PilgrimInsights,
  QuickActionsBar,
  RecentReviews,
  StatusIndicator,
} from "../components";
import { getGreetingKey, getHeroHeight, PREMIUM_COLORS } from "../constants";
import { useDashboardHome } from "../hooks/useDashboardHome";
import { getActivityDisplayConfig } from "../utils/activityUtils";
import { styles } from "./DashboardScreen.styles";

// Main Dashboard Screen
const DashboardScreen: React.FC = () => {
  // ── Hooks ──────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { unreadCount } = useNotifications();
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const {
    data,
    pendingBadges,
    loading,
    refresh,
    isOpen,
    activeShiftDisplay,
  } = useDashboardHome();

  // ── Derived state ──────────────────────────────────────────
  const heroHeight = getHeroHeight();

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

  const { siteInfo, todayOverview, recentActivity } = data;
  const siteLoading = loading.siteInfo;

  const displayName = useMemo(() => {
    if (user?.fullName?.trim()) return user.fullName;
    if (user?.email) return user.email.split("@")[0];
    return "Local Guide";
  }, [user?.fullName, user?.email]);

  const greeting = t(getGreetingKey());

  // ── Callbacks ──────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const navigateToMySite = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate("MySite", { screen, params });
    },
    [navigation],
  );

  const handleQuickAction = useCallback(
    (actionId: string) => {
      if (!siteInfo?.id) {
        Alert.alert(
          t("common.notice", { defaultValue: "Thông báo" }),
          t("dashboard.notAssignedSite", {
            defaultValue: "Bạn chưa được phân công địa điểm.",
          }),
        );
        return;
      }

      switch (actionId) {
        case "sos-log":
          navigation.navigate("SOSList");
          break;
        case "post-news":
          navigateToMySite("EventDetail", { event: undefined });
          break;
        case "add-schedule":
          navigateToMySite("MySiteHome", { initialTab: "schedules" });
          break;
        case "upload-media":
          navigateToMySite("MediaUpload");
          break;
        default:
          console.warn(`Unhandled quick action: ${actionId}`);
      }
    },
    [navigateToMySite, navigation, siteInfo?.id, t],
  );

  // ── Render ─────────────────────────────────────────────────
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
                    {greeting}, {displayName}
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
              recentActivity.slice(0, 5).map((activity) => {
                const config = getActivityDisplayConfig(
                  activity.type,
                  activity.originalData?.category,
                );

                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.activityItem}
                  >
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
                              backgroundColor: config.backgroundColor,
                            },
                          ]}
                        >
                          <Ionicons
                            name={config.icon as keyof typeof Ionicons.glyphMap}
                            size={moderateScale(24, 0.3)}
                            color={config.color}
                          />
                        </View>
                      )}
                      <View
                        style={[
                          styles.activityImageOverlay,
                          { backgroundColor: config.color },
                        ]}
                      >
                        <Ionicons
                          name={config.icon as keyof typeof Ionicons.glyphMap}
                          size={moderateScale(12, 0.3)}
                          color="#FFFFFF"
                        />
                      </View>
                    </View>
                    <View style={styles.activityContent}>
                      <Text style={styles.activityTitle}>
                        {activity.title}
                      </Text>
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
                          {new Date(activity.created_at).toLocaleString(
                            "vi-VN",
                            {
                              hour: "2-digit",
                              minute: "2-digit",
                              day: "2-digit",
                              month: "2-digit",
                            },
                          )}
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
                );
              })
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
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
    </View>
  );
};

export default DashboardScreen;
