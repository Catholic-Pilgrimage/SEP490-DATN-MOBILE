/**
 * ProfileScreen - Guide Settings Menu
 * Professional settings screen with menu items
 * Similar to Pilgrim profile but tailored for Local Guides
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
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
import { useAuth } from "../../../../hooks/useAuth";
import { useConfirm } from "../../../../hooks/useConfirm";
import useI18n from "../../../../hooks/useI18n";
import { useNotifications } from "../../../../hooks/useNotifications";
import { NotificationModal } from "../../../pilgrim/explore/components/NotificationModal";
import { useGuideProfile } from "../hooks/useGuideProfile";

// Premium color palette
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  emerald: "#10B981",
};

// ============================================
// MENU ITEM COMPONENT
// ============================================

interface MenuItemProps {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
  showLock?: boolean;
  showBadge?: string;
  danger?: boolean;
  isLast?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({
  icon,
  label,
  onPress,
  showLock = false,
  showBadge,
  danger = false,
  isLast = false,
}) => (
  <TouchableOpacity
    style={[styles.menuItem, isLast && styles.menuItemLast]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View style={styles.menuItemLeft}>
      <View style={[styles.menuIconContainer, danger && styles.menuIconDanger]}>
        <Ionicons
          name={icon}
          size={20}
          color={danger ? GUIDE_COLORS.error : PREMIUM_COLORS.gold}
        />
      </View>
      <Text
        style={[styles.menuItemLabel, danger && styles.menuItemLabelDanger]}
      >
        {label}
      </Text>
    </View>
    <View style={styles.menuItemRight}>
      {showBadge && (
        <View style={styles.menuBadge}>
          <Text style={styles.menuBadgeText}>{showBadge}</Text>
        </View>
      )}
      {showLock && (
        <View style={styles.lockIcon}>
          <Ionicons name="lock-closed" size={14} color={PREMIUM_COLORS.gold} />
        </View>
      )}
      <Ionicons name="chevron-forward" size={20} color={GUIDE_COLORS.gray400} />
    </View>
  </TouchableOpacity>
);

// ============================================
// STATS CARD COMPONENT
// ============================================

interface StatsCardProps {
  events: number;
  media: number;
  reviews: number;
  labels: { events: string; media: string; reviews: string };
}

const StatsCard: React.FC<StatsCardProps> = ({
  events,
  media,
  reviews,
  labels,
}) => (
  <View style={styles.statsCard}>
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{events}</Text>
      <Text style={styles.statLabel}>{labels.events}</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{media}</Text>
      <Text style={styles.statLabel}>{labels.media}</Text>
    </View>
    <View style={styles.statDivider} />
    <View style={styles.statItem}>
      <Text style={styles.statNumber}>{reviews}</Text>
      <Text style={styles.statLabel}>{labels.reviews}</Text>
    </View>
  </View>
);

// ============================================
// SECTION HEADER
// ============================================

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <Text style={styles.sectionHeader}>{title}</Text>
);

// ============================================
// MAIN PROFILE SCREEN
// ============================================

const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const { t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);

  const { unreadCount } = useNotifications();

  // Use API hook for profile, site and stats data
  const { profile, site, stats, loading, refetch, isVerified } =
    useGuideProfile();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // Navigation handlers
  const handleEditProfile = useCallback(() => {
    // Navigate to Personal Info screen
    (navigation as any).navigate("PersonalInfo");
  }, [navigation]);

  const handleNotifications = useCallback(() => {
    setShowNotifications(true);
  }, []);

  const handleMySite = useCallback(() => {
    // Navigate to SiteManagement screen to display full info with edit option
    (navigation as any).navigate("SiteManagement");
  }, [navigation]);

  const handleSchedule = useCallback(() => {
    // Navigate to the Shifts tab in the bottom tab navigator
    (navigation as any).navigate("Shifts");
  }, [navigation]);

  const handleSOSList = useCallback(() => {
    (navigation as any).navigate("SOSList");
  }, [navigation]);

  const handleSettings = useCallback(() => {
    (navigation as any).navigate("Settings");
  }, [navigation]);

  const handleSignOut = useCallback(async () => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "log-out-outline",
      title: t("profile.logoutConfirmTitle"),
      message: t("profile.logoutConfirmMessage"),
      confirmText: t("profile.logout"),
      cancelText: t("common.cancel"),
    });

    if (!confirmed) {
      return;
    }

    try {
      setIsLoggingOut(true);
      await logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        }),
      );
    } catch (error) {
      console.error("Logout error:", error);
      Alert.alert(t("common.error"), t("profile.logoutError"));
      setIsLoggingOut(false);
    }
  }, [confirm, logout, navigation, t]);

  // Default avatar
  const getAvatarUrl = () => {
    if (profile?.avatar_url) return profile.avatar_url;
    if (profile?.full_name) {
      const encodedName = encodeURIComponent(profile.full_name);
      return `https://ui-avatars.com/api/?name=${encodedName}&background=D4AF37&color=fff&size=200&font-size=0.35`;
    }
    return "https://ui-avatars.com/api/?name=Guide&background=D4AF37&color=fff&size=200";
  };

  const displayName = profile?.full_name || t("profile.defaultGuide");
  const displayRole = isVerified
    ? t("profile.verifiedGuide")
    : t("profile.localGuide");
  const siteName = site?.name || t("profile.notAssignedSite");

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons
            name="arrow-back-ios"
            size={20}
            color={GUIDE_COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("profile.title")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={PREMIUM_COLORS.gold}
            colors={[PREMIUM_COLORS.gold]}
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* Avatar */}
          <View style={styles.avatarContainer}>
            <LinearGradient
              colors={[PREMIUM_COLORS.gold, PREMIUM_COLORS.goldDark]}
              style={styles.avatarBorder}
            >
              <View style={styles.avatarInner}>
                <Image
                  source={{ uri: getAvatarUrl() }}
                  style={styles.avatarImage}
                />
              </View>
            </LinearGradient>
            {isVerified && (
              <View style={styles.verifiedBadge}>
                <MaterialIcons
                  name="verified"
                  size={18}
                  color={PREMIUM_COLORS.gold}
                />
              </View>
            )}
          </View>

          {/* Name & Role */}
          <Text style={styles.profileName}>{displayName}</Text>
          <Text style={styles.profileRole}>{displayRole}</Text>

          {/* Assigned Site */}
          <View style={styles.siteTag}>
            <MaterialIcons
              name="church"
              size={14}
              color={PREMIUM_COLORS.gold}
            />
            <Text style={styles.siteTagText}>{siteName}</Text>
          </View>
        </View>

        {/* Stats Card */}
        <StatsCard
          events={stats.eventsCount}
          media={stats.mediaCount}
          reviews={stats.reviewsCount}
          labels={{
            events: t("profile.stats.events"),
            media: t("profile.stats.media"),
            reviews: t("profile.stats.reviews"),
          }}
        />

        {/* Account Section */}
        <SectionHeader title={t("profile.sections.account")} />
        <View style={styles.menuSection}>
          <MenuItem
            icon="person-outline"
            label={t("profile.menu.personalInfo")}
            onPress={handleEditProfile}
          />
          <MenuItem
            icon="notifications-outline"
            label={t("profile.menu.notifications")}
            onPress={handleNotifications}
            showBadge={
              unreadCount > 0
                ? unreadCount > 99
                  ? "99+"
                  : unreadCount.toString()
                : undefined
            }
          />
          <MenuItem
            icon="business-outline"
            label={t("profile.menu.mySite")}
            onPress={handleMySite}
          />
          <MenuItem
            icon="calendar-outline"
            label={t("profile.menu.schedule")}
            onPress={handleSchedule}
          />
          <MenuItem
            icon="alert-circle-outline"
            label={t("profile.menu.sos")}
            onPress={handleSOSList}
            showBadge={
              stats.sosPendingCount > 0
                ? stats.sosPendingCount.toString()
                : undefined
            }
            isLast
          />
        </View>

        {/* Settings Section */}
        <SectionHeader title={t("profile.sections.settings")} />
        <View style={styles.menuSection}>
          <MenuItem
            icon="settings-outline"
            label={t("profile.menu.settings")}
            onPress={handleSettings}
            isLast
          />
        </View>

        {/* Sign Out Button */}
        <TouchableOpacity
          style={[
            styles.signOutButton,
            isLoggingOut && styles.signOutButtonDisabled,
          ]}
          onPress={handleSignOut}
          disabled={isLoggingOut}
          activeOpacity={0.8}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color="#FFFFFF" />
          ) : (
            <Ionicons name="log-out-outline" size={20} color="#FFFFFF" />
          )}
          <Text style={styles.signOutText}>
            {isLoggingOut ? t("profile.loggingOut") : t("profile.logout")}
          </Text>
        </TouchableOpacity>

        {/* Version */}
        <Text style={styles.versionText}>{t("profile.version")}</Text>
      </ScrollView>

      <NotificationModal
        visible={showNotifications}
        onClose={() => setShowNotifications(false)}
      />

      <ConfirmModal />
    </ImageBackground>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
  },
  headerSpacer: {
    width: 40,
  },

  // Scroll
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },

  // Profile Header
  profileHeader: {
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.lg,
  },
  avatarContainer: {
    position: "relative",
    marginBottom: GUIDE_SPACING.md,
  },
  avatarBorder: {
    width: 88,
    height: 88,
    borderRadius: 44,
    padding: 3,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 42,
    overflow: "hidden",
    backgroundColor: PREMIUM_COLORS.cream,
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...GUIDE_SHADOWS.md,
  },
  profileName: {
    fontSize: 22,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.3,
  },
  profileRole: {
    fontSize: 14,
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },
  siteTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: GUIDE_SPACING.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: `${PREMIUM_COLORS.gold}15`,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  siteTagText: {
    fontSize: 12,
    fontWeight: "600",
    color: PREMIUM_COLORS.goldDark,
  },

  // Stats Card
  statsCard: {
    flexDirection: "row",
    marginHorizontal: GUIDE_SPACING.lg,
    marginTop: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.gold,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
  },
  statLabel: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: PREMIUM_COLORS.goldLight,
  },

  // Section Header
  sectionHeader: {
    fontSize: 12,
    fontWeight: "600",
    color: GUIDE_COLORS.textMuted,
    letterSpacing: 1,
    marginTop: GUIDE_SPACING.xl,
    marginBottom: GUIDE_SPACING.sm,
    marginHorizontal: GUIDE_SPACING.lg,
  },

  // Menu Section
  menuSection: {
    marginHorizontal: GUIDE_SPACING.lg,
    backgroundColor: "rgba(255, 251, 240, 0.92)",
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.3)",
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: `${PREMIUM_COLORS.goldLight}80`,
  },
  menuItemLast: {
    borderBottomWidth: 0,
  },
  menuItemLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${PREMIUM_COLORS.gold}15`,
    alignItems: "center",
    justifyContent: "center",
  },
  menuIconDanger: {
    backgroundColor: `${GUIDE_COLORS.error}15`,
  },
  menuItemLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: PREMIUM_COLORS.charcoal,
  },
  menuItemLabelDanger: {
    color: GUIDE_COLORS.error,
  },
  menuItemRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
  },
  menuBadge: {
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: GUIDE_COLORS.error,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
  },
  menuBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  lockIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: `${PREMIUM_COLORS.gold}20`,
    alignItems: "center",
    justifyContent: "center",
  },

  // Sign Out Button
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    marginHorizontal: GUIDE_SPACING.lg,
    marginTop: GUIDE_SPACING.xl,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    ...GUIDE_SHADOWS.md,
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },

  // Version
  versionText: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    marginTop: GUIDE_SPACING.lg,
    opacity: 0.6,
  },
});

export default ProfileScreen;
