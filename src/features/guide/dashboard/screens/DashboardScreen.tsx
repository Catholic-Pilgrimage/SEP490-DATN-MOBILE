import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
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
import { useGuideSite } from "../hooks/useGuideSite";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
interface Task {
  id: string;
  title: string;
  location: string;
  time: string;
  period: "AM" | "PM";
  status: "done" | "active" | "pending";
}

interface ShiftInfo {
  isActive: boolean;
  startTime: string;
  endTime: string;
  siteName: string;
}

// Get greeting based on time of day
const getGreeting = (): string => {
  const hour = new Date().getHours();
  if (hour < 12) return "Good Morning";
  if (hour < 18) return "Good Afternoon";
  return "Good Evening";
};

// Mock data
const MOCK_SHIFT: ShiftInfo = {
  isActive: true,
  startTime: "08:00",
  endTime: "16:00",
  siteName: "Sanctuary of Our\nLady of Lourdes",
};

const MOCK_TASKS: Task[] = [
  {
    id: "1",
    title: "Welcome Spanish Delegation",
    location: "South Gate Entrance",
    time: "09:00",
    period: "AM",
    status: "done",
  },
  {
    id: "2",
    title: "Rosary Procession Lead",
    location: "Main Grotto",
    time: "11:00",
    period: "AM",
    status: "active",
  },
  {
    id: "3",
    title: "Confession Coordination",
    location: "Basilica East Wing",
    time: "02:00",
    period: "PM",
    status: "pending",
  },
];

// Quick Action Button Component
interface QuickActionProps {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  onPress: () => void;
  variant?: "default" | "danger";
}

const QuickActionButton: React.FC<QuickActionProps> = ({
  icon,
  label,
  onPress,
  variant = "default",
}) => {
  const isDanger = variant === "danger";

  return (
    <TouchableOpacity
      style={[
        styles.quickActionButton,
        isDanger && styles.quickActionButtonDanger,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
    >
      <View
        style={[
          styles.quickActionIconContainer,
          isDanger && styles.quickActionIconContainerDanger,
        ]}
      >
        <MaterialIcons
          name={icon}
          size={22}
          color={isDanger ? GUIDE_COLORS.error : GUIDE_COLORS.primary}
        />
      </View>
      <Text
        style={[
          styles.quickActionLabel,
          isDanger && styles.quickActionLabelDanger,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
};

// Task Item Component
interface TaskItemProps {
  task: Task;
  onPress: () => void;
}

const TaskItem: React.FC<TaskItemProps> = ({ task, onPress }) => {
  const isDone = task.status === "done";
  const isActive = task.status === "active";

  const getStatusIcon = () => {
    switch (task.status) {
      case "done":
        return (
          <View style={styles.taskStatusDone}>
            <MaterialIcons
              name="check"
              size={14}
              color={GUIDE_COLORS.success}
            />
          </View>
        );
      case "active":
        return (
          <Animated.View style={styles.taskStatusActive}>
            <MaterialIcons
              name="play-arrow"
              size={14}
              color={GUIDE_COLORS.primary}
            />
          </Animated.View>
        );
      default:
        return (
          <View style={styles.taskStatusPending}>
            <MaterialIcons
              name="schedule"
              size={14}
              color={GUIDE_COLORS.gray400}
            />
          </View>
        );
    }
  };

  return (
    <TouchableOpacity
      style={[
        styles.taskItem,
        isDone && styles.taskItemDone,
        isActive && styles.taskItemActive,
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Time Column */}
      <View style={styles.taskTimeContainer}>
        <Text style={[styles.taskTime, isActive && styles.taskTimeActive]}>
          {task.time}
        </Text>
        <Text style={[styles.taskPeriod, isActive && styles.taskPeriodActive]}>
          {task.period}
        </Text>
      </View>

      {/* Divider */}
      <View style={styles.taskDivider} />

      {/* Content */}
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, isDone && styles.taskTitleDone]}>
          {task.title}
        </Text>
        <Text style={styles.taskLocation}>{task.location}</Text>
      </View>

      {/* Status Icon */}
      {getStatusIcon()}
    </TouchableOpacity>
  );
};

// Status Indicator Component
const StatusIndicator: React.FC<{ isActive: boolean }> = ({ isActive }) => {
  const pulseAnim = React.useRef(new Animated.Value(1)).current;

  React.useEffect(() => {
    if (isActive) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.5,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [isActive, pulseAnim]);

  return (
    <View style={styles.statusIndicatorContainer}>
      {isActive && (
        <Animated.View
          style={[
            styles.statusIndicatorPulse,
            { transform: [{ scale: pulseAnim }] },
          ]}
        />
      )}
      <View
        style={[
          styles.statusIndicatorDot,
          {
            backgroundColor: isActive
              ? GUIDE_COLORS.success
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

  // Fetch assigned site info using custom hook
  const {
    site: siteInfo,
    loading: siteLoading,
    error: siteError,
    refetch: refetchSite,
    isOpen,
  } = useGuideSite();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchSite();
    setRefreshing(false);
  }, [refetchSite]);

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

  // Fallback shift info from site opening hours
  const shiftInfo: ShiftInfo = {
    isActive: isOpen,
    startTime: siteInfo?.opening_hours?.open || "08:00",
    endTime: siteInfo?.opening_hours?.close || "16:00",
    siteName: siteInfo?.name || "Loading...",
  };

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
        {/* Hero Header Section */}
        <View style={styles.heroSection}>
          <ImageBackground
            source={{
              uri:
                siteInfo?.cover_image ||
                "https://lh3.googleusercontent.com/aida-public/AB6AXuAqbVTkMCTc_WQ6WIfqhD4WF94ki7WRByjY6o_AgODRQ_-GDjd_SDG0wjUx5TXKIfxnBRZMJPJazyKoWgNpQQmK5lXUCPX-IHBuX5DhMyoPJHQLTWOTVMQVUEAl58b-kDY__kqar5td32hyFggIDO0c35L3t7blEUJ2WlXerbZRhnIxeWVqhw198dgBne0LHIP8AWjvPGUrXMgm3pbi9PU5KoNo6RXoo8rLmmrBsgDGJo2BszZ2kLxSsih-Kp0kybCXLq-dA3LlpdY",
            }}
            style={styles.heroBackground}
            resizeMode="cover"
          >
            <LinearGradient
              colors={["rgba(18, 24, 38, 0.3)", "rgba(248, 248, 246, 0.95)", GUIDE_COLORS.background]}
              locations={[0, 0.7, 1]}
              style={styles.heroGradient}
            >
              {/* Top App Bar */}
              <View
                style={[
                  styles.topAppBar,
                  { paddingTop: insets.top + GUIDE_SPACING.md },
                ]}
              >
                <TouchableOpacity style={styles.appBarButton}>
                  <MaterialIcons
                    name="account-circle"
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
                <Text style={styles.appBarTitle}>Cathedral Guide</Text>
                <TouchableOpacity style={styles.appBarButton}>
                  <MaterialIcons
                    name="notifications"
                    size={24}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              </View>

              {/* Hero Content */}
              <View style={styles.heroContent}>
                <Text style={styles.heroGreeting}>{greeting}, Guide</Text>
                <Text style={styles.heroSiteName}>
                  {siteLoading
                    ? "Đang tải..."
                    : siteInfo?.name || "Chưa được gán site"}
                </Text>
                <View style={styles.heroMeta}>
                  {/* Open/Closed Status */}
                  <View
                    style={[
                      styles.statusBadge,
                      isOpen
                        ? styles.statusBadgeOpen
                        : styles.statusBadgeClosed,
                    ]}
                  >
                    <View
                      style={[
                        styles.statusDot,
                        { backgroundColor: isOpen ? "#22C55E" : "#EF4444" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.statusText,
                        { color: isOpen ? "#4ADE80" : "#F87171" },
                      ]}
                    >
                      {isOpen ? "Open" : "Closed"}
                    </Text>
                  </View>
                  {/* Patron Saint */}
                  {siteInfo?.patron_saint && (
                    <Text style={styles.heroPatron}>
                      Patron: {siteInfo.patron_saint}
                    </Text>
                  )}
                </View>
              </View>
            </LinearGradient>
          </ImageBackground>
        </View>

        {/* Floating Quick Action Grid */}
        <View style={styles.quickActionsOverlay}>
          <View style={styles.quickActionsGrid}>
            <QuickActionButton
              icon="event"
              label="Create Event"
              onPress={() => handleQuickAction("create-event")}
            />
            <QuickActionButton
              icon="cloud-upload"
              label="Upload Media"
              onPress={() => handleQuickAction("upload-media")}
            />
            <QuickActionButton
              icon="schedule"
              label="Mass Schedule"
              onPress={() => handleQuickAction("mass-schedule")}
            />
            <QuickActionButton
              icon="warning"
              label="SOS"
              onPress={() => handleQuickAction("report-sos")}
              variant="danger"
            />
          </View>
        </View>

        {/* Today's Overview Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeaderRow}>
            <View>
              <Text style={styles.sectionLabel}>Schedule</Text>
              <Text style={styles.sectionTitleSerif}>Today's Overview</Text>
            </View>
            <View style={styles.shiftBadge}>
              <Text style={styles.shiftBadgeLabel}>Active Shift</Text>
              <Text style={styles.shiftBadgeTime}>
                {shiftInfo.startTime} - {shiftInfo.endTime}
              </Text>
            </View>
          </View>

          {/* Timeline */}
          <View style={styles.timeline}>
            {MOCK_TASKS.map((task, index) => (
              <View key={task.id} style={styles.timelineItem}>
                <View
                  style={[
                    styles.timelineDot,
                    task.status === "active"
                      ? styles.timelineDotActive
                      : styles.timelineDotInactive,
                  ]}
                >
                  <MaterialIcons
                    name={task.status === "active" ? "church" : "engineering"}
                    size={12}
                    color={
                      task.status === "active"
                        ? GUIDE_COLORS.backgroundDark
                        : "#FFFFFF"
                    }
                  />
                </View>
                {index < MOCK_TASKS.length - 1 && (
                  <View style={styles.timelineLine} />
                )}
                <View style={styles.timelineContent}>
                  <Text
                    style={[
                      styles.timelineTime,
                      task.status === "active" && styles.timelineTimeActive,
                    ]}
                  >
                    {task.time} {task.period}
                  </Text>
                  <Text
                    style={[
                      styles.timelineTitle,
                      task.status !== "active" && styles.timelineTitleMuted,
                    ]}
                  >
                    {task.title}
                  </Text>
                  <Text style={styles.timelineLocation}>{task.location}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Recent Activity Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitleSerif}>Recent Activity</Text>
          <View style={styles.activityList}>
            <TouchableOpacity style={styles.activityItem}>
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuDekADLmdGNGv1W5yyCmBcIW8ciliByFipfkFI9fGnbKQhlPQGXKoyOuHtl3OO0kofeo01MeTQ-fPNakawVKTElmWxS6v1TJoLTDTfE8J6--4NDcv79t2_ncIahwc0DlzJ5YQeLpSpqFLoqGQ-ssjNrRnpv6cR9zZdzxmwxoAjh7OXgE9f_aYdsQ3ns7pLIFvmrhAlnac22WhKU8n3PNyzOjMLnlJdTcpA-xkswJXayGPskPdzPKbfZ4ZFHjFHLQlN7-eDgNuym8S8",
                }}
                style={styles.activityImage}
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>Media Uploaded</Text>
                <Text style={styles.activitySubtitle}>
                  Interior lighting gallery • 2m ago
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={GUIDE_COLORS.gray400}
              />
            </TouchableOpacity>

            <TouchableOpacity style={styles.activityItem}>
              <Image
                source={{
                  uri: "https://lh3.googleusercontent.com/aida-public/AB6AXuBWzi4aM_KLdraRyPeTpAqas9S_5dkr6I7klxpi7V-os9tz9-Q0Y-PiXyK9Nb0eIb-s6qq_PeFap-ZcWL7Q_WZ5UaH0vWYFsEyIo-Z-yPvsCdaF_qAeNefbpafQpBL_16N3kxdtECRLo-7JnYfyQIn9EzMKAUSrvm26R1si9l7Md2QE9pM1Q57lnHoDpB5Jz5CZ20HrrDNkvHrDO6ZMFMNsDvcbBMiAPsA8rZO_bfO2Y_IT-1h8UyYvkfnITfOe8aXca9tgTmnb1X0",
                }}
                style={styles.activityImage}
              />
              <View style={styles.activityContent}>
                <Text style={styles.activityTitle}>New Event Created</Text>
                <Text style={styles.activitySubtitle}>
                  Sunday Youth Choir • 1h ago
                </Text>
              </View>
              <MaterialIcons
                name="chevron-right"
                size={20}
                color={GUIDE_COLORS.gray400}
              />
            </TouchableOpacity>
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
    backgroundColor: GUIDE_COLORS.background, // Light cream background
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // Hero Section
  heroSection: {
    height: SCREEN_WIDTH * 1.0,
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
  topAppBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.sm,
  },
  appBarButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(0, 0, 0, 0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  appBarTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: "#FFFFFF",
    opacity: 0.9,
    letterSpacing: 1.5,
    textTransform: "uppercase",
  },
  heroContent: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingBottom: GUIDE_SPACING.xxl * 2,
  },
  heroGreeting: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.primary,
    letterSpacing: 3,
    textTransform: "uppercase",
    marginBottom: GUIDE_SPACING.xs,
  },
  heroSiteName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeHero,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: "#FFFFFF",
    lineHeight: GUIDE_TYPOGRAPHY.fontSizeHero * 1.2,
    marginBottom: GUIDE_SPACING.md,
  },
  heroMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusBadgeOpen: {
    backgroundColor: "rgba(34, 197, 94, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(34, 197, 94, 0.3)",
  },
  statusBadgeClosed: {
    backgroundColor: "rgba(239, 68, 68, 0.2)",
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.3)",
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  heroPatron: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    fontStyle: "italic",
    color: "rgba(236, 182, 19, 0.9)",
  },

  // Quick Actions Overlay
  quickActionsOverlay: {
    paddingHorizontal: GUIDE_SPACING.lg,
    marginTop: -GUIDE_SPACING.xxl * 1.5,
    zIndex: 10,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.md,
  },
  quickActionButton: {
    width: (SCREEN_WIDTH - GUIDE_SPACING.lg * 2 - GUIDE_SPACING.md) / 2,
    backgroundColor: GUIDE_COLORS.surface, // White background
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.md,
    ...GUIDE_SHADOWS.md,
  },
  quickActionButtonDanger: {
    backgroundColor: GUIDE_COLORS.surface,
    borderColor: "rgba(220, 38, 38, 0.2)",
  },
  quickActionIconContainer: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  quickActionIconContainerDanger: {
    backgroundColor: GUIDE_COLORS.errorLight,
  },
  quickActionLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary, // Dark text on light bg
  },
  quickActionLabelDanger: {
    color: GUIDE_COLORS.error,
  },

  // Sections
  section: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingTop: GUIDE_SPACING.xl,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-end",
    marginBottom: GUIDE_SPACING.xl,
  },
  sectionLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: GUIDE_SPACING.xs,
  },
  sectionTitleSerif: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary, // Dark text for light theme
  },
  shiftBadge: {
    backgroundColor: GUIDE_COLORS.primaryMuted,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryBorder,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
  },
  shiftBadgeLabel: {
    fontSize: 10,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.primary,
    textTransform: "uppercase",
  },
  shiftBadgeTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textPrimary, // Dark text
    fontVariant: ["tabular-nums"],
  },

  // Timeline
  timeline: {
    paddingLeft: GUIDE_SPACING.xs,
  },
  timelineItem: {
    flexDirection: "row",
    paddingBottom: GUIDE_SPACING.xl,
    position: "relative",
  },
  timelineDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2,
  },
  timelineDotActive: {
    backgroundColor: GUIDE_COLORS.primary,
    borderWidth: 4,
    borderColor: GUIDE_COLORS.background,
  },
  timelineDotInactive: {
    backgroundColor: GUIDE_COLORS.gray300,
    borderWidth: 4,
    borderColor: GUIDE_COLORS.background,
  },
  timelineLine: {
    position: "absolute",
    left: 11,
    top: 24,
    bottom: 0,
    width: 2,
    backgroundColor: GUIDE_COLORS.primary, // Gold vertical line
    opacity: 0.3,
    zIndex: 1,
  },
  timelineContent: {
    flex: 1,
    marginLeft: GUIDE_SPACING.lg,
    paddingTop: 2,
  },
  timelineTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.gray400,
    fontVariant: ["tabular-nums"],
  },
  timelineTimeActive: {
    color: GUIDE_COLORS.primary,
  },
  timelineTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary, // Dark text
    marginTop: 2,
  },
  timelineTitleMuted: {
    color: GUIDE_COLORS.textMuted,
  },
  timelineLocation: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },

  // Activity List
  activityList: {
    gap: GUIDE_SPACING.md,
    marginTop: GUIDE_SPACING.md,
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.surface,
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.sm,
  },
  activityImage: {
    width: 48,
    height: 48,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  activityContent: {
    flex: 1,
  },
  activityTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary, // Dark text
  },
  activitySubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontStyle: "italic",
    color: GUIDE_COLORS.gray400,
    marginTop: 2,
  },

  // Legacy styles (kept for TaskItem component if still used)
  backgroundGradient: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 384,
    zIndex: 0,
  },
  header: {
    paddingHorizontal: GUIDE_SPACING.xl,
    paddingTop: GUIDE_SPACING.xxl,
    paddingBottom: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.xl,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  headerTextContainer: {
    flex: 1,
    marginRight: GUIDE_SPACING.lg,
  },
  greeting: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    fontStyle: "italic",
    letterSpacing: 0.5,
    marginBottom: GUIDE_SPACING.xs,
  },
  siteName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeHeading,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    lineHeight:
      GUIDE_TYPOGRAPHY.fontSizeHeading * GUIDE_TYPOGRAPHY.lineHeightTight,
  },
  avatarContainer: {
    width: 48,
    height: 48,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.primaryBorder,
    padding: 2,
    backgroundColor: GUIDE_COLORS.surface,
  },
  avatar: {
    width: "100%",
    height: "100%",
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusWidget: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: GUIDE_COLORS.surfaceElevated,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryBorder,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    paddingVertical: GUIDE_SPACING.lg,
    paddingHorizontal: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
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
    backgroundColor: GUIDE_COLORS.success,
    opacity: 0.4,
  },
  statusIndicatorDot: {
    width: 12,
    height: 12,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusTextContainer: {
    gap: 2,
  },
  statusTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textPrimary,
  },
  statusSubtitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
  },
  clockOutButton: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryBorder,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  clockOutButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.primary,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXL,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.lg,
  },
  viewAllText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.primary,
  },
  tasksList: {
    gap: GUIDE_SPACING.md,
    marginTop: -GUIDE_SPACING.sm,
  },
  taskItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primaryBorderLight,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
    gap: GUIDE_SPACING.lg,
    ...GUIDE_SHADOWS.sm,
  },
  taskItemDone: {
    opacity: 0.6,
  },
  taskItemActive: {
    borderLeftWidth: 4,
    borderLeftColor: GUIDE_COLORS.primary,
    ...GUIDE_SHADOWS.md,
  },
  taskTimeContainer: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 48,
  },
  taskTime: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textMuted,
  },
  taskTimeActive: {
    color: GUIDE_COLORS.primary,
  },
  taskPeriod: {
    fontSize: 10,
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
  },
  taskPeriodActive: {
    color: GUIDE_COLORS.primary,
  },
  taskDivider: {
    width: 1,
    height: 32,
    backgroundColor: GUIDE_COLORS.primaryBorder,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textPrimary,
  },
  taskTitleDone: {
    textDecorationLine: "line-through",
    textDecorationColor: GUIDE_COLORS.primaryBorder,
  },
  taskLocation: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },
  taskStatusDone: {
    width: 24,
    height: 24,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.successLight,
    justifyContent: "center",
    alignItems: "center",
  },
  taskStatusActive: {
    width: 24,
    height: 24,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    justifyContent: "center",
    alignItems: "center",
  },
  taskStatusPending: {
    width: 24,
    height: 24,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
});

export default DashboardScreen;
