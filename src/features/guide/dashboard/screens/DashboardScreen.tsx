import { MaterialIcons, Ionicons, Feather } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState, useRef, useEffect } from "react";
import {
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
    Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SHADOWS,
    GUIDE_SPACING,
    GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { useAuth } from "../../../../contexts/AuthContext";
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types - using TodayOverviewItem from hook
import type { TodayOverviewItem } from "../../../../types/guide";

// Get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
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

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.quickActionButton}
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
      >
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.quickActionGradient}
        >
          {/* Decorative Pattern - Cross motif */}
          <View style={styles.quickActionPattern}>
            <MaterialIcons
              name="add"
              size={80}
              color="rgba(255, 255, 255, 0.1)"
            />
          </View>
          
          {/* Icon */}
          <View style={styles.quickActionIconContainer}>
            <MaterialIcons
              name={icon}
              size={26}
              color="#FFFFFF"
            />
          </View>
          
          {/* Label */}
          <Text style={styles.quickActionLabel}>
            {label}
          </Text>
          
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
        ])
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
  const [refreshing, setRefreshing] = useState(false);

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
    console.log("Clock out pressed");
  };

  const handleQuickAction = (actionId: string) => {
    console.log("Quick action:", actionId);
    // TODO: Navigate to respective screens
  };

  const handleTaskPress = (taskId: string) => {
    console.log("Task pressed:", taskId);
  };

  const handleViewAllTasks = () => {
    console.log("View all tasks");
  };

  const guideName = user?.fullName || "Guide Mateo";
  const firstName = guideName.split(" ")[0];
  const greeting = getGreeting();

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
        <View style={styles.heroSection}>
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
                "rgba(0, 0, 0, 0.1)", 
                "rgba(0, 0, 0, 0.3)",
                "rgba(253, 248, 240, 0.85)", 
                PREMIUM_COLORS.cream
              ]}
              locations={[0, 0.3, 0.7, 1]}
              style={styles.heroGradient}
            >
              {/* Top App Bar - Glassmorphism */}
              <View
                style={[
                  styles.topAppBar,
                  { paddingTop: insets.top + GUIDE_SPACING.sm },
                ]}
              >
                <TouchableOpacity style={styles.appBarButton}>
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                    style={styles.appBarButtonGradient}
                  >
                    <Ionicons
                      name="person"
                      size={20}
                      color="#FFFFFF"
                    />
                  </LinearGradient>
                </TouchableOpacity>
                
                <View style={styles.appBarTitleContainer}>
                  <Text style={styles.appBarTitle}>CATHEDRAL GUIDE</Text>
                  <View style={styles.appBarTitleUnderline} />
                </View>
                
                <TouchableOpacity style={styles.appBarButton}>
                  <LinearGradient
                    colors={["rgba(255,255,255,0.25)", "rgba(255,255,255,0.1)"]}
                    style={styles.appBarButtonGradient}
                  >
                    <Ionicons
                      name="notifications"
                      size={20}
                      color="#FFFFFF"
                    />
                    <View style={styles.notificationBadge}>
                      <Text style={styles.notificationBadgeText}>3</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Hero Content - Premium Typography */}
              <View style={styles.heroContent}>
                <View style={styles.greetingContainer}>
                  <View style={styles.greetingLine} />
                  <Text style={styles.heroGreeting}>{greeting}, Guide</Text>
                  <View style={styles.greetingLine} />
                </View>
                
                <Text style={styles.heroSiteName}>
                  {siteLoading
                    ? "Đang tải..."
                    : siteInfo?.name || "Chưa được gán site"}
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
                    <Text
                      style={[
                        styles.statusText,
                        { color: isOpen ? PREMIUM_COLORS.emerald : PREMIUM_COLORS.ruby },
                      ]}
                    >
                      {isOpen ? "OPEN" : "CLOSED"}
                    </Text>
                  </View>
                  {/* Patron Saint - Elegant Italic */}
                  {siteInfo?.patronSaint && (
                    <Text style={styles.heroPatron}>
                      <Text style={styles.heroPatronLabel}>Patron: </Text>
                      {siteInfo.patronSaint}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Premium Quick Action Grid */}
        <View style={styles.quickActionsOverlay}>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="event"
              label="Create Event"
              onPress={() => handleQuickAction("create-event")}
              badgeCount={pendingBadges.events}
            />
            <QuickActionButton
              icon="cloud-upload"
              label="Upload Media"
              onPress={() => handleQuickAction("upload-media")}
              badgeCount={pendingBadges.media}
            />
            <QuickActionButton
              icon="schedule"
              label="Mass Schedule"
              onPress={() => handleQuickAction("mass-schedule")}
              badgeCount={pendingBadges.schedules}
            />
            <QuickActionButton
              icon="support-agent"
              label="SOS Support"
              onPress={() => handleQuickAction("sos-support")}
              variant="danger"
              badgeCount={pendingBadges.sos}
            />
          </View>
        </View>

        {/* Today's Overview Section - Premium Design */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionLabel}>SCHEDULE</Text>
              <Text style={styles.sectionTitleSerif}>Today's Overview</Text>
            </View>
            {activeShiftDisplay.shouldShow && (
              <LinearGradient
                colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.shiftBadge}
              >
                <Text style={styles.shiftBadgeLabel}>ACTIVE SHIFT</Text>
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
                <MaterialIcons name="event-available" size={48} color={GUIDE_COLORS.gray300} />
                <Text style={styles.emptyStateText}>Không có lịch trình hôm nay</Text>
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
                        name={item.type === 'schedule' ? "church" : "event"}
                        size={14}
                        color={item.isNow ? "#FFFFFF" : "#6B7280"}
                      />
                    </LinearGradient>
                    {index < todayOverview.length - 1 && (
                      <LinearGradient
                        colors={[PREMIUM_COLORS.gold, "rgba(212, 175, 55, 0.2)"]}
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
                      <Ionicons name="location-outline" size={12} color={GUIDE_COLORS.gray400} />
                      <Text style={styles.timelineLocation}>{item.location || 'Main Area'}</Text>
                    </View>
                  </View>
                  
                  {item.isNow && (
                    <View style={styles.timelineActiveIndicator}>
                      <Text style={styles.timelineActiveText}>NOW</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Recent Activity Section - Premium Cards */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderWithAction}>
            <Text style={styles.sectionTitleSerif}>Recent Activity</Text>
            <TouchableOpacity style={styles.viewAllButton}>
              <Text style={styles.viewAllText}>View All</Text>
              <Ionicons name="chevron-forward" size={14} color={PREMIUM_COLORS.gold} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.activityList}>
            {recentActivity.length === 0 ? (
              <View style={styles.emptyStateContainer}>
                <MaterialIcons name="history" size={48} color={GUIDE_COLORS.gray300} />
                <Text style={styles.emptyStateText}>Chưa có hoạt động gần đây</Text>
              </View>
            ) : (
              recentActivity.slice(0, 5).map((activity) => (
                <TouchableOpacity key={activity.id} style={styles.activityItem}>
                  <View style={styles.activityImageContainer}>
                    <Image
                      source={{
                        uri: activity.thumbnail || "https://via.placeholder.com/50",
                      }}
                      style={styles.activityImage}
                    />
                    <View style={[
                      styles.activityImageOverlay, 
                      { backgroundColor: activity.type === 'media' ? PREMIUM_COLORS.gold : PREMIUM_COLORS.sapphire }
                    ]}>
                      <Ionicons 
                        name={activity.type === 'media' ? "image" : "calendar"} 
                        size={12} 
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
                      <Ionicons name="time-outline" size={10} color={GUIDE_COLORS.gray400} />
                      <Text style={styles.activityTime}>{new Date(activity.created_at).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</Text>
                    </View>
                  </View>
                  <View style={styles.activityArrow}>
                    <Ionicons
                      name="chevron-forward"
                      size={18}
                      color={PREMIUM_COLORS.gold}
                    />
                  </View>
                </TouchableOpacity>
              ))
            )}
          </View>
        </View>

        {/* Bottom Spacing for Tab Bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
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
    height: SCREEN_WIDTH * 0.95,
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
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.sm,
  },
  appBarButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    overflow: "hidden",
  },
  appBarButtonGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  appBarTitleContainer: {
    alignItems: "center",
  },
  appBarTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 3,
    textShadowColor: "rgba(0, 0, 0, 0.3)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
  },
  appBarTitleUnderline: {
    width: 30,
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
    width: 18,
    height: 18,
    borderRadius: 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#FFFFFF",
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  
  // Hero Content - Premium Typography
  heroContent: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingBottom: GUIDE_SPACING.xxl * 2.5,
  },
  greetingContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.sm,
  },
  greetingLine: {
    width: 20,
    height: 1,
    backgroundColor: PREMIUM_COLORS.gold,
  },
  heroGreeting: {
    fontSize: 11,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2.5,
    textTransform: "uppercase",
  },
  heroSiteName: {
    fontSize: 30,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
    lineHeight: 36,
    marginBottom: GUIDE_SPACING.md,
    textShadowColor: "rgba(255, 255, 255, 0.8)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  statusBadgeClosed: {
    backgroundColor: "rgba(225, 29, 72, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(225, 29, 72, 0.3)",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 1,
  },
  heroPatron: {
    fontSize: 13,
    color: PREMIUM_COLORS.gold,
  },
  heroPatronLabel: {
    fontWeight: "400",
    fontStyle: "italic",
  },

  // Quick Actions - Premium Cards
  quickActionsOverlay: {
    paddingHorizontal: GUIDE_SPACING.lg,
    marginTop: -GUIDE_SPACING.xxl * 2,
    zIndex: 10,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.md,
  },
  quickActionButton: {
    width: (SCREEN_WIDTH - GUIDE_SPACING.lg * 2 - GUIDE_SPACING.md) / 2,
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
    padding: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.xl,
    paddingBottom: GUIDE_SPACING.lg,
    alignItems: "flex-start",
    position: "relative",
    overflow: "hidden",
    minHeight: 110,
  },
  quickActionPattern: {
    position: "absolute",
    top: -20,
    right: -20,
    opacity: 1,
  },
  quickActionIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.3)",
  },
  quickActionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: GUIDE_SPACING.sm,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0, 0, 0, 0.2)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  quickActionBadge: {
    position: "absolute",
    top: GUIDE_SPACING.sm,
    right: GUIDE_SPACING.sm,
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    minWidth: 24,
    alignItems: "center",
  },
  quickActionBadgeText: {
    fontSize: 11,
    fontWeight: "800",
    color: PREMIUM_COLORS.gold,
  },

  // Sections - Premium Layout
  section: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingTop: GUIDE_SPACING.xxl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: GUIDE_SPACING.xl,
  },
  sectionHeaderWithAction: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    letterSpacing: 2,
    marginBottom: GUIDE_SPACING.xs,
  },
  sectionTitleSerif: {
    fontSize: 22,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.5,
  },
  viewAllButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  viewAllText: {
    fontSize: 13,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
  },
  
  // Shift Badge - Premium Gradient
  shiftBadge: {
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    alignItems: "flex-end",
  },
  shiftBadgeLabel: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
    opacity: 0.9,
  },
  shiftBadgeTime: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
    marginTop: 2,
  },

  // Timeline - Premium Design
  timeline: {
    gap: GUIDE_SPACING.sm,
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "#FFFFFF",
    padding: GUIDE_SPACING.md,
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
    marginRight: GUIDE_SPACING.md,
  },
  timelineDot: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  timelineLine: {
    width: 2,
    height: 40,
    marginTop: GUIDE_SPACING.xs,
    borderRadius: 1,
  },
  timelineContent: {
    flex: 1,
    paddingTop: 4,
  },
  timelineTime: {
    fontSize: 11,
    fontWeight: "700",
    color: GUIDE_COLORS.gray400,
    fontVariant: ["tabular-nums"],
    letterSpacing: 0.5,
  },
  timelineTimeActive: {
    color: PREMIUM_COLORS.gold,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    marginTop: 2,
    lineHeight: 22,
  },
  timelineTitleMuted: {
    color: GUIDE_COLORS.gray500,
    fontWeight: "600",
  },
  timelineLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  timelineLocation: {
    fontSize: 12,
    color: GUIDE_COLORS.gray400,
  },
  timelineActiveIndicator: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    alignSelf: "flex-start",
  },
  timelineActiveText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 1,
  },

  // Activity List - Premium Cards
  activityList: {
    gap: GUIDE_SPACING.md,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
    backgroundColor: "#FFFFFF",
    padding: GUIDE_SPACING.md,
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
    width: 56,
    height: 56,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  activityImageOverlay: {
    position: "absolute",
    bottom: -4,
    right: -4,
    width: 24,
    height: 24,
    borderRadius: 12,
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
    fontSize: 14,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
  },
  activitySubtitle: {
    fontSize: 12,
    color: GUIDE_COLORS.gray500,
    marginTop: 2,
  },
  activityTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  activityTime: {
    fontSize: 11,
    color: GUIDE_COLORS.gray400,
  },
  activityArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty State
  emptyStateContainer: {
    padding: GUIDE_SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
  },
  emptyStateText: {
    fontSize: 14,
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },

  // Status Indicator (used by StatusIndicator component)
  statusIndicatorContainer: {
    position: "relative",
    width: 12,
    height: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  statusIndicatorPulse: {
    position: "absolute",
    width: 12,
    height: 12,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: PREMIUM_COLORS.emerald,
  },
  statusIndicatorDot: {
    width: 10,
    height: 10,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
});

export default DashboardScreen;
