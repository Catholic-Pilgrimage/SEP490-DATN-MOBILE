import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import {
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
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useI18n } from "../../../../hooks/useI18n";
import { useNotifications } from "../../../../hooks/useNotifications";
import { guideReviewApi } from "../../../../services/api/guide";
import { RecentActivityItem } from "../../../../types/guide";
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
} from "../components";
import { getGreetingKey, getHeroHeight, PREMIUM_COLORS } from "../constants";
import { useDashboardHome } from "../hooks/useDashboardHome";
import {
  getActivityDisplayConfig,
  getActivityStatusConfig,
} from "../utils/activityUtils";
import { styles } from "./DashboardScreen.styles";

// Main Dashboard Screen
const DashboardScreen: React.FC = () => {
  // ── Hooks ──────────────────────────────────────────────────
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { user } = useAuth();
  const { t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
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

  const recentReviewsQuery = useQuery({
    queryKey: GUIDE_KEYS.reviews.list({ page: 1, limit: 5 }),
    queryFn: async () => {
      const response = await guideReviewApi.getReviews({ page: 1, limit: 5 });

      if (!response?.success) {
        throw new Error(response?.message || "Không thể tải đánh giá gần đây.");
      }

      return response.data?.data ?? [];
    },
  });

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

  const { siteInfo, todayOverview, recentActivity, overview } = data;
  const recentReviews = recentReviewsQuery.data ?? [];
  const siteLoading = loading.siteInfo;
  const checkinsToday = overview?.site_overview?.checkins_today ?? 0;
  const pendingSos = overview?.site_overview?.pending_sos ?? 0;
  const openingTime = siteInfo?.openingHours?.open?.slice(0, 5) || null;
  const closingTime = siteInfo?.openingHours?.close?.slice(0, 5) || null;
  const hasOpeningHours = Boolean(openingTime && closingTime);
  const showStatusBadge = siteLoading || hasOpeningHours;

  const displayName = useMemo(() => {
    if (user?.fullName?.trim()) return user.fullName;
    if (user?.email) return user.email.split("@")[0];
    return "Local Guide";
  }, [user?.fullName, user?.email]);

  const greeting = t(getGreetingKey());
  const compactAppBarTitle = useMemo(() => {
    const rawTitle = t("dashboard.cathedralGuide", {
      defaultValue: "Hướng dẫn nhà thờ",
    });
    const normalizedTitle = rawTitle.toLocaleLowerCase();
    return normalizedTitle.charAt(0).toLocaleUpperCase() + normalizedTitle.slice(1);
  }, [t]);
  const statusLabel = siteLoading
    ? t("common.loading", { defaultValue: "Đang tải..." })
    : isOpen
      ? t("dashboard.statusLine.open", { defaultValue: "Đang mở" })
      : t("dashboard.statusLine.closed", { defaultValue: "Đóng cửa" });
  const statusDetail = useMemo(() => {
    if (siteLoading) return "";
    if (!hasOpeningHours) {
      return t("dashboard.statusLine.hoursUnavailable", {
        defaultValue: "Chưa cập nhật giờ",
      });
    }
    if (isOpen) {
      return `${openingTime} - ${closingTime}`;
    }
    // Closed — compute a smart "reopen" label with date context
    const now = new Date();
    const [openH, openM] = (openingTime || "05:00").split(":").map(Number);
    const reopenToday = new Date(now);
    reopenToday.setHours(openH, openM, 0, 0);
    const reopenIsToday = reopenToday > now;
    const reopenDate = reopenIsToday ? reopenToday : new Date(now.getTime() + 86400000);
    if (!reopenIsToday) {
      reopenDate.setHours(openH, openM, 0, 0);
    }
    const dd = String(reopenDate.getDate()).padStart(2, "0");
    const mm = String(reopenDate.getMonth() + 1).padStart(2, "0");
    const dayLabel = reopenIsToday
      ? t("dashboard.statusLine.today", { defaultValue: "hôm nay" })
      : t("dashboard.statusLine.tomorrow", { defaultValue: "ngày mai" });

    return t("dashboard.statusLine.reopenAtFull", {
      defaultValue: "Mở lại {{time}} {{dayLabel}}, {{date}}",
      time: openingTime,
      dayLabel,
      date: `${dd}/${mm}`,
    });
  }, [siteLoading, hasOpeningHours, isOpen, openingTime, closingTime, t]);

  // ── Callbacks ──────────────────────────────────────────────
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refresh();
    setRefreshing(false);
  }, [refresh]);

  const showInfoDialog = useCallback(
    async (title: string, message: string) => {
      await confirm({
        type: "info",
        iconName: "information-circle-outline",
        title,
        message,
        confirmText: t("common.ok"),
        showCancel: false,
      });
    },
    [confirm, t],
  );

  const navigateToMySite = useCallback(
    (screen: string, params?: Record<string, unknown>) => {
      navigation.navigate("MySite", { screen, params });
    },
    [navigation],
  );

  const handleQuickAction = useCallback(
    (actionId: string) => {
      if (!siteInfo?.id) {
        void showInfoDialog(
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
        case "manage-site":
          navigateToMySite("MySiteHome");
          break;
        default:
          console.warn(`Unhandled quick action: ${actionId}`);
      }
    },
    [navigateToMySite, navigation, showInfoDialog, siteInfo?.id, t],
  );

  const handleRecentActivityPress = useCallback(
    (activity: RecentActivityItem) => {
      switch (activity.type) {
        case "event":
          navigateToMySite("EventDetail", {
            event: activity.originalData,
          });
          break;
        case "media":
          navigateToMySite("MediaDetail", {
            media: activity.originalData,
          });
          break;
        case "nearby_place":
          navigateToMySite("MySiteHome", { initialTab: "locations" });
          break;
        default:
          navigateToMySite("MySiteHome");
      }
    },
    [navigateToMySite],
  );

  const handleViewAllRecentActivity = useCallback(() => {
    navigateToMySite("MySiteHome");
  }, [navigateToMySite]);

  const handleViewAllReviews = useCallback(() => {
    navigateToMySite("MySiteHome", { initialTab: "reviews" });
  }, [navigateToMySite]);

  const handleReplyReview = useCallback(
    (reviewId: string) => {
      navigateToMySite("MySiteHome", {
        initialTab: "reviews",
        reviewId,
        autoOpenReply: true,
      });
    },
    [navigateToMySite],
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
                    {compactAppBarTitle}
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

                {siteInfo?.patronSaint && (
                  <View style={styles.heroPatronRow}>
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
                  </View>
                )}

                <View style={styles.heroMeta}>
                  {showStatusBadge ? (
                    <View
                      style={[
                        styles.statusBadge,
                        siteLoading
                          ? styles.statusBadgeLoading
                          : isOpen
                            ? styles.statusBadgeOpen
                            : styles.statusBadgeClosed,
                      ]}
                    >
                      <View
                        style={[
                          styles.statusDot,
                          siteLoading
                            ? styles.statusDotLoading
                            : isOpen
                              ? styles.statusDotOpen
                              : styles.statusDotClosed,
                        ]}
                      />
                      <Text
                        style={[
                          styles.statusText,
                          siteLoading
                            ? styles.statusTextLoading
                            : isOpen
                              ? styles.statusTextOpen
                              : styles.statusTextClosed,
                        ]}
                      >
                        {statusLabel}
                      </Text>
                      {!!statusDetail && (
                        <>
                          <Text style={styles.statusSeparator}>{"\u2022"}</Text>
                          <Text style={styles.statusDetailText}>
                            {statusDetail}
                          </Text>
                        </>
                      )}
                    </View>
                  ) : (
                    <View style={styles.statusFallbackBadge}>
                      <Ionicons
                        name="time-outline"
                        size={14}
                        color={GUIDE_COLORS.textSecondary}
                      />
                      <Text style={styles.statusFallbackText}>
                        {statusDetail}
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
            sectionLabel={t("dashboard.overview.sectionLabel", {
              defaultValue: "DASHBOARD",
            })}
            title={t("dashboard.overview.title", {
              defaultValue: "Tổng quan site",
            })}
            primaryCount={checkinsToday}
            secondaryCount={pendingSos}
            primaryLabel={t("dashboard.overview.checkinsToday", {
              defaultValue: "Check-in hôm nay",
            })}
            secondaryLabel={t("dashboard.overview.pendingSos", {
              defaultValue: "SOS chờ xử lý",
            })}
            primaryIcon="footsteps-outline"
            secondaryIcon="alert-circle-outline"
            primaryBackgroundIcon="people-outline"
            secondaryBackgroundIcon="warning-outline"
            showPrimaryDot={checkinsToday > 0}
            onViewAll={() => navigateToMySite("MySiteHome")}
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
                style={[styles.sectionLabel, { fontSize: getFontSize(12) }]}
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
            <TouchableOpacity
              style={styles.viewAllButton}
              onPress={handleViewAllRecentActivity}
              activeOpacity={0.75}
            >
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
                const statusConfig = getActivityStatusConfig(
                  activity.statusTone,
                );

                return (
                  <TouchableOpacity
                    key={activity.id}
                    style={styles.activityItem}
                    onPress={() => handleRecentActivityPress(activity)}
                    activeOpacity={0.78}
                  >
                    <View style={styles.activityImageContainer}>
                      {activity.thumbnail ? (
                        <Image
                          source={{ uri: activity.thumbnail }}
                          style={styles.activityImage}
                        />
                      ) : (
                        <View
                          style={[
                            styles.activityImage,
                            styles.activityImagePlaceholder,
                            {
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
                    </View>
                    <View style={styles.activityContent}>
                      <View style={styles.activityHeaderRow}>
                        <Text style={styles.activityTitle} numberOfLines={2}>
                          {activity.title}
                        </Text>
                        {statusConfig && activity.statusLabel && (
                          <View
                            style={[
                              styles.activityStatusBadge,
                              {
                                backgroundColor: statusConfig.backgroundColor,
                                borderColor: statusConfig.borderColor,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.activityStatusText,
                                { color: statusConfig.color },
                              ]}
                            >
                              {activity.statusLabel}
                            </Text>
                          </View>
                        )}
                      </View>
                      <Text style={styles.activityMetaLabel}>
                        {activity.metaLabel}
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
            reviews={
              recentReviews.length >= 0
                ? recentReviews.map((review) => ({
                    id: review.id,
                    pilgrimName: review.pilgrimName,
                    pilgrimAvatar: review.pilgrimAvatar,
                    rating: review.rating,
                    content: review.content,
                    createdAt: review.createdAt,
                    isReplied: Boolean(review.response?.trim()),
                  }))
                : [/*
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
            */]}
            onReply={handleReplyReview}
            onViewAll={handleViewAllReviews}
          />
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />
      <ConfirmModal />
    </View>
  );
};

export default DashboardScreen;
