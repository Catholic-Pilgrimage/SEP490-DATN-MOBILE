import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Linking,
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
import { useAuth } from "../../../../hooks/useAuth";
import { LocalGuideSite } from "../../../../types/guide";
import { useGuideProfile } from "../hooks/useGuideProfile";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

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
};

// Types
interface Shift {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending";
}

// Region mapping for display
const REGION_DISPLAY: Record<string, string> = {
  Bac: "Miền Bắc",
  Trung: "Miền Trung",
  Nam: "Miền Nam",
};

// Site type mapping for display
const SITE_TYPE_DISPLAY: Record<string, string> = {
  church: "Nhà thờ",
  shrine: "Đền thánh",
  monastery: "Tu viện",
  center: "Trung tâm",
  other: "Khác",
};

// Mock shifts (TODO: Replace with API)
const MOCK_SHIFTS: Shift[] = [
  {
    id: "1",
    title: "Morning Liturgy",
    date: new Date(2026, 1, 5),
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    status: "confirmed",
  },
  {
    id: "2",
    title: "Afternoon Tour",
    date: new Date(2026, 1, 7),
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    status: "pending",
  },
];

// Helper function to format date
const formatMonth = (date: Date): string => {
  return date.toLocaleDateString("en-US", { month: "short" });
};

const formatDay = (date: Date): string => {
  return date.getDate().toString();
};

// Avatar Component with Golden Ring
const ProfileAvatar: React.FC<{ imageUrl: string; isVerified: boolean }> = ({
  imageUrl,
  isVerified,
}) => {
  return (
    <View style={styles.avatarContainer}>
      {/* Outer glow ring */}
      <View style={styles.avatarGlowRing} />
      
      {/* Main avatar container */}
      <View style={styles.avatarBorder}>
        <View style={styles.avatarInner}>
          <Image
            source={{ uri: imageUrl }}
            style={styles.avatarImage}
            resizeMode="cover"
          />
        </View>
      </View>

      {/* Verified badge */}
      {isVerified && (
        <View style={styles.verifiedBadge}>
          <MaterialIcons
            name="verified"
            size={20}
            color={GUIDE_COLORS.primary}
          />
        </View>
      )}
    </View>
  );
};

// Shift Item Component
const ShiftItem: React.FC<{ shift: Shift }> = ({ shift }) => {
  const isConfirmed = shift.status === "confirmed";

  return (
    <View style={styles.shiftItem}>
      {/* Date Circle */}
      <View style={styles.dateCircle}>
        <Text style={styles.dateMonth}>{formatMonth(shift.date)}</Text>
        <Text style={styles.dateDay}>{formatDay(shift.date)}</Text>
      </View>

      {/* Shift Info */}
      <View style={styles.shiftInfo}>
        <Text style={styles.shiftTitle}>{shift.title}</Text>
        <View style={styles.shiftTimeRow}>
          <MaterialIcons
            name="schedule"
            size={14}
            color={GUIDE_COLORS.textMuted}
          />
          <Text style={styles.shiftTime}>
            {shift.startTime} - {shift.endTime}
          </Text>
        </View>
      </View>

      {/* Status Badge */}
      <View
        style={[
          styles.statusBadge,
          isConfirmed ? styles.statusConfirmed : styles.statusPending,
        ]}
      >
        <MaterialIcons
          name={isConfirmed ? "check-circle" : "hourglass-empty"}
          size={14}
          color={isConfirmed ? "#15803d" : "#c2410c"}
        />
        <Text
          style={[
            styles.statusText,
            isConfirmed ? styles.statusTextConfirmed : styles.statusTextPending,
          ]}
        >
          {isConfirmed ? "Confirmed" : "Pending"}
        </Text>
      </View>
    </View>
  );
};

// Enhanced Assigned Site Card Component with Full Details
const AssignedSiteCard: React.FC<{
  site: LocalGuideSite;
  onCallPress?: () => void;
  onEmailPress?: () => void;
}> = ({ site, onCallPress, onEmailPress }) => {
  const handleCall = () => {
    if (site.contact_info?.phone) {
      Linking.openURL(`tel:${site.contact_info.phone}`);
    }
    onCallPress?.();
  };

  const handleEmail = () => {
    if (site.contact_info?.email) {
      Linking.openURL(`mailto:${site.contact_info.email}`);
    }
    onEmailPress?.();
  };

  return (
    <View style={styles.siteCardEnhanced}>
      {/* Site Image */}
      <View style={styles.siteImageContainer}>
        <Image
          source={{
            uri:
              site.cover_image ||
              "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&h=400&fit=crop",
          }}
          style={styles.siteImage}
          resizeMode="cover"
        />

        {/* Gradient Overlay */}
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.8)"]}
          style={styles.siteGradient}
        />

        {/* Assigned Badge */}
        <View style={styles.assignedBadge}>
          <Text style={styles.assignedBadgeText}>ASSIGNED</Text>
        </View>

        {/* Site Type Badge */}
        <View style={styles.siteTypeBadge}>
          <MaterialIcons name="church" size={12} color="#FFFFFF" />
          <Text style={styles.siteTypeBadgeText}>
            {SITE_TYPE_DISPLAY[site.type] || site.type}
          </Text>
        </View>

        {/* Site Content */}
        <View style={styles.siteContent}>
          <Text style={styles.siteName}>{site.name}</Text>
          <View style={styles.siteLocationRow}>
            <MaterialIcons
              name="location-on"
              size={16}
              color="rgba(255,255,255,0.9)"
            />
            <Text style={styles.siteLocation} numberOfLines={1}>
              {site.address}
            </Text>
          </View>
        </View>
      </View>

      {/* Site Details Section */}
      <View style={styles.siteDetails}>
        {/* Region & Province */}
        <View style={styles.siteDetailRow}>
          <View style={styles.siteDetailItem}>
            <Ionicons name="map-outline" size={16} color={PREMIUM_COLORS.gold} />
            <Text style={styles.siteDetailLabel}>Vùng</Text>
            <Text style={styles.siteDetailValue}>
              {REGION_DISPLAY[site.region] || site.region}
            </Text>
          </View>
          <View style={styles.siteDetailDivider} />
          <View style={styles.siteDetailItem}>
            <Ionicons name="location-outline" size={16} color={PREMIUM_COLORS.gold} />
            <Text style={styles.siteDetailLabel}>Tỉnh/TP</Text>
            <Text style={styles.siteDetailValue}>{site.province}</Text>
          </View>
        </View>

        {/* Patron Saint */}
        {site.patron_saint && (
          <View style={styles.patronContainer}>
            <MaterialIcons name="auto-awesome" size={16} color={PREMIUM_COLORS.gold} />
            <View style={styles.patronContent}>
              <Text style={styles.patronLabel}>Bổn mạng</Text>
              <Text style={styles.patronValue}>{site.patron_saint}</Text>
            </View>
          </View>
        )}

        {/* Opening Hours */}
        {site.opening_hours && (
          <View style={styles.hoursContainer}>
            <MaterialIcons name="schedule" size={16} color={PREMIUM_COLORS.gold} />
            <View style={styles.hoursContent}>
              <Text style={styles.hoursLabel}>Giờ mở cửa</Text>
              <Text style={styles.hoursValue}>
                {site.opening_hours.open} - {site.opening_hours.close}
              </Text>
            </View>
          </View>
        )}

        {/* Contact Info */}
        {(site.contact_info?.phone || site.contact_info?.email) && (
          <View style={styles.contactRow}>
            {site.contact_info?.phone && (
              <TouchableOpacity style={styles.contactButton} onPress={handleCall}>
                <LinearGradient
                  colors={[PREMIUM_COLORS.emerald, "#059669"]}
                  style={styles.contactButtonGradient}
                >
                  <Ionicons name="call" size={16} color="#FFFFFF" />
                  <Text style={styles.contactButtonText}>Gọi điện</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
            {site.contact_info?.email && (
              <TouchableOpacity style={styles.contactButton} onPress={handleEmail}>
                <LinearGradient
                  colors={[PREMIUM_COLORS.sapphire, "#1d4ed8"]}
                  style={styles.contactButtonGradient}
                >
                  <Ionicons name="mail" size={16} color="#FFFFFF" />
                  <Text style={styles.contactButtonText}>Email</Text>
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    </View>
  );
};

// Loading Skeleton for Profile
const ProfileSkeleton: React.FC = () => (
  <View style={styles.skeletonContainer}>
    <View style={styles.skeletonAvatar} />
    <View style={styles.skeletonName} />
    <View style={styles.skeletonRole} />
    <View style={styles.skeletonCard} />
  </View>
);

// Main Profile Screen
const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Use API hook for profile and site data
  const { profile, site, loading, error, refetch, isVerified } = useGuideProfile();

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleViewAllShifts = useCallback(() => {
    console.log("View all shifts");
  }, []);

  const handleSignOut = useCallback(() => {
    Alert.alert(
      "Sign Out",
      "Are you sure you want to sign out?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Sign Out",
          style: "destructive",
          onPress: async () => {
            try {
              setIsLoggingOut(true);
              await logout();
              // Navigate to Auth screen after successful logout
              navigation.dispatch(
                CommonActions.reset({
                  index: 0,
                  routes: [{ name: 'Auth' }],
                })
              );
            } catch (error) {
              console.error("Logout error:", error);
              Alert.alert("Error", "Failed to sign out. Please try again.");
              setIsLoggingOut(false);
            }
          },
        },
      ],
      { cancelable: true }
    );
  }, [logout, navigation]);

  // Default avatar - simple user icon placeholder
  const DEFAULT_AVATAR = "https://ui-avatars.com/api/?name=User&background=D4AF37&color=fff&size=200&font-size=0.4";
  
  // Get display values from profile
  const displayName = profile?.full_name || (loading ? "" : "Chưa cập nhật");
  const displayRole = profile?.role === "local_guide" ? "Local Guide" : "Pilgrim";
  const displayRegion = site ? REGION_DISPLAY[site.region] || site.region : "";
  
  // Generate avatar URL - use API or generate from name
  const getAvatarUrl = () => {
    if (profile?.avatar_url) {
      return profile.avatar_url;
    }
    // Generate avatar from name if no avatar_url
    if (profile?.full_name) {
      const encodedName = encodeURIComponent(profile.full_name);
      return `https://ui-avatars.com/api/?name=${encodedName}&background=D4AF37&color=fff&size=200&font-size=0.35`;
    }
    return DEFAULT_AVATAR;
  };
  
  const avatarUrl = getAvatarUrl();

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GUIDE_COLORS.background}
      />

      {/* Background Pattern */}
      <View style={styles.backgroundPattern}>
        <MaterialIcons
          name="add"
          size={200}
          color={GUIDE_COLORS.primary}
          style={styles.backgroundIcon}
        />
      </View>

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons
            name="arrow-back-ios"
            size={20}
            color={GUIDE_COLORS.textPrimary}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Profile</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Main Content */}
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
        {/* Loading State */}
        {loading && !profile && <ProfileSkeleton />}

        {/* Error State */}
        {error && !profile && (
          <View style={styles.errorContainer}>
            <MaterialIcons name="error-outline" size={48} color={PREMIUM_COLORS.ruby} />
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={refetch}>
              <Text style={styles.retryButtonText}>Thử lại</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Profile Content */}
        {profile && (
          <>
            {/* Profile Header Section */}
            <View style={styles.profileSection}>
              <ProfileAvatar imageUrl={avatarUrl} isVerified={isVerified} />

              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{displayName}</Text>
                <Text style={styles.profileRole}>
                  {displayRole}
                  {displayRegion ? ` • ${displayRegion}` : ""}
                </Text>
                {isVerified && (
                  <View style={styles.verifiedTag}>
                    <Text style={styles.verifiedTagText}>VERIFIED GUIDE</Text>
                  </View>
                )}
              </View>

              {/* Email & Phone Info */}
              <View style={styles.contactInfoSection}>
                {profile.email && (
                  <View style={styles.contactInfoItem}>
                    <Ionicons name="mail-outline" size={16} color={GUIDE_COLORS.textMuted} />
                    <Text style={styles.contactInfoText}>{profile.email}</Text>
                  </View>
                )}
                {profile.phone && (
                  <View style={styles.contactInfoItem}>
                    <Ionicons name="call-outline" size={16} color={GUIDE_COLORS.textMuted} />
                    <Text style={styles.contactInfoText}>{profile.phone}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Assigned Site Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="church"
                  size={20}
                  color={GUIDE_COLORS.primary}
                />
                <Text style={styles.sectionTitle}>Your Sanctuary</Text>
              </View>
              {site ? (
                <AssignedSiteCard site={site} />
              ) : (
                <View style={styles.noSiteCard}>
                  <MaterialIcons
                    name="church"
                    size={48}
                    color={GUIDE_COLORS.gray300}
                  />
                  <Text style={styles.noSiteText}>
                    Chưa được gán địa điểm
                  </Text>
                  <Text style={styles.noSiteSubtext}>
                    Liên hệ quản trị viên để được gán địa điểm
                  </Text>
                </View>
              )}
            </View>

            {/* Upcoming Shifts Section */}
            <View style={styles.section}>
              <View style={styles.sectionHeaderRow}>
                <View style={styles.sectionHeader}>
                  <MaterialIcons
                    name="calendar-today"
                    size={20}
                    color={GUIDE_COLORS.primary}
                  />
                  <Text style={styles.sectionTitle}>Upcoming Liturgy Shifts</Text>
                </View>
                <TouchableOpacity onPress={handleViewAllShifts}>
                  <Text style={styles.viewAllText}>View All</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.shiftsList}>
                {MOCK_SHIFTS.map((shift) => (
                  <ShiftItem key={shift.id} shift={shift} />
                ))}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Footer */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + 16 }]}>
        <TouchableOpacity
          style={[styles.signOutButton, isLoggingOut && styles.signOutButtonDisabled]} 
          onPress={handleSignOut}
          disabled={isLoggingOut}
        >
          {isLoggingOut ? (
            <ActivityIndicator size="small" color={GUIDE_COLORS.primary} />
          ) : (
            <MaterialIcons
              name="logout"
              size={20}
              color={GUIDE_COLORS.primary}
            />
          )}
          <Text style={styles.signOutText}>
            {isLoggingOut ? "SIGNING OUT..." : "SIGN OUT"}
          </Text>
        </TouchableOpacity>
        <Text style={styles.versionText}>Version 1.4.2 • Nazareth Guild</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  backgroundPattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    opacity: 0.03,
    overflow: "hidden",
  },
  backgroundIcon: {
    position: "absolute",
    top: 100,
    right: -50,
    opacity: 0.5,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: `${GUIDE_COLORS.background}E6`,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    letterSpacing: -0.3,
  },
  headerSpacer: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: GUIDE_SPACING.xl,
  },

  // Profile Section
  profileSection: {
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.xl,
  },
  avatarContainer: {
    position: "relative",
    width: 132,
    height: 132,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarGlowRing: {
    position: "absolute",
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: GUIDE_COLORS.primary,
    opacity: 0.2,
  },
  avatarBorder: {
    width: 128,
    height: 128,
    borderRadius: 64,
    borderWidth: 3,
    borderColor: GUIDE_COLORS.primary,
    padding: 4,
    backgroundColor: GUIDE_COLORS.surface,
  },
  avatarInner: {
    flex: 1,
    borderRadius: 60,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  verifiedBadge: {
    position: "absolute",
    bottom: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: GUIDE_COLORS.surface,
    alignItems: "center",
    justifyContent: "center",
    ...GUIDE_SHADOWS.md,
  },
  profileInfo: {
    alignItems: "center",
    marginTop: GUIDE_SPACING.md,
    gap: 4,
  },
  profileName: {
    fontSize: 24,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    letterSpacing: -0.5,
  },
  profileRole: {
    fontSize: 14,
    fontWeight: "500",
    fontStyle: "italic",
    color: GUIDE_COLORS.textMuted,
  },
  verifiedTag: {
    marginTop: GUIDE_SPACING.xs,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: `${GUIDE_COLORS.primary}15`,
  },
  verifiedTagText: {
    fontSize: 10,
    fontWeight: "700",
    color: GUIDE_COLORS.primaryDark,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  // Section
  section: {
    paddingHorizontal: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: GUIDE_SPACING.sm,
    paddingHorizontal: 4,
  },
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: GUIDE_SPACING.sm,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  viewAllText: {
    fontSize: 12,
    fontWeight: "700",
    color: GUIDE_COLORS.primary,
  },

  // Site Card
  siteCard: {
    position: "relative",
    height: 192,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.sm,
  },
  siteImage: {
    width: "100%",
    height: "100%",
  },
  siteGradient: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: "70%",
  },
  assignedBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  assignedBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "rgba(255,255,255,0.9)",
    letterSpacing: 1.5,
  },
  siteContent: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: GUIDE_SPACING.md,
  },
  siteName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: -0.3,
  },
  siteLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  siteLocation: {
    fontSize: 14,
    fontWeight: "500",
    color: "rgba(255,255,255,0.9)",
  },

  // Shift Items
  shiftsList: {
    gap: GUIDE_SPACING.sm,
  },
  shiftItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.sm,
  },
  dateCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: GUIDE_COLORS.background,
    borderWidth: 1,
    borderColor: `${GUIDE_COLORS.primary}33`,
    alignItems: "center",
    justifyContent: "center",
  },
  dateMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
  },
  dateDay: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.primary,
    lineHeight: 20,
  },
  shiftInfo: {
    flex: 1,
    marginLeft: GUIDE_SPACING.md,
  },
  shiftTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  shiftTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 2,
  },
  shiftTime: {
    fontSize: 13,
    color: GUIDE_COLORS.textMuted,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  statusConfirmed: {
    backgroundColor: "#dcfce7",
  },
  statusPending: {
    backgroundColor: "#ffedd5",
  },
  statusText: {
    fontSize: 11,
    fontWeight: "700",
  },
  statusTextConfirmed: {
    color: "#15803d",
  },
  statusTextPending: {
    color: "#c2410c",
  },

  // Enhanced Site Card
  siteCardEnhanced: {
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.md,
  },
  siteImageContainer: {
    position: "relative",
    height: 180,
  },
  siteTypeBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "rgba(212, 175, 55, 0.9)",
  },
  siteTypeBadgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  siteDetails: {
    padding: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.md,
  },
  siteDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.background,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  siteDetailItem: {
    alignItems: "center",
    gap: 4,
    flex: 1,
  },
  siteDetailDivider: {
    width: 1,
    height: 40,
    backgroundColor: GUIDE_COLORS.borderLight,
  },
  siteDetailLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  siteDetailValue: {
    fontSize: 13,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  patronContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.sm,
    backgroundColor: `${PREMIUM_COLORS.gold}10`,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: `${PREMIUM_COLORS.gold}30`,
  },
  patronContent: {
    flex: 1,
  },
  patronLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: PREMIUM_COLORS.gold,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  patronValue: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
    marginTop: 2,
  },
  hoursContainer: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.background,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  hoursContent: {
    flex: 1,
  },
  hoursLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  hoursValue: {
    fontSize: 14,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    marginTop: 2,
  },
  contactRow: {
    flexDirection: "row",
    gap: GUIDE_SPACING.sm,
  },
  contactButton: {
    flex: 1,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
  },
  contactButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
  },
  contactButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // No Site Card
  noSiteCard: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xxl,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    borderStyle: "dashed",
  },
  noSiteText: {
    fontSize: 16,
    fontWeight: "600",
    color: GUIDE_COLORS.textMuted,
    marginTop: GUIDE_SPACING.md,
  },
  noSiteSubtext: {
    fontSize: 13,
    color: GUIDE_COLORS.gray400,
    marginTop: GUIDE_SPACING.xs,
    textAlign: "center",
  },

  // Contact Info Section in Profile
  contactInfoSection: {
    marginTop: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.xs,
  },
  contactInfoItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  contactInfoText: {
    fontSize: 13,
    color: GUIDE_COLORS.textMuted,
  },

  // Loading Skeleton
  skeletonContainer: {
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.xl,
  },
  skeletonAvatar: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: GUIDE_COLORS.gray200,
  },
  skeletonName: {
    width: 180,
    height: 24,
    borderRadius: 8,
    backgroundColor: GUIDE_COLORS.gray200,
    marginTop: GUIDE_SPACING.md,
  },
  skeletonRole: {
    width: 140,
    height: 16,
    borderRadius: 6,
    backgroundColor: GUIDE_COLORS.gray200,
    marginTop: GUIDE_SPACING.sm,
  },
  skeletonCard: {
    width: "100%",
    height: 200,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.gray200,
    marginTop: GUIDE_SPACING.xl,
  },

  // Error State
  errorContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xxl,
    paddingHorizontal: GUIDE_SPACING.lg,
  },
  errorText: {
    fontSize: 16,
    color: PREMIUM_COLORS.ruby,
    marginTop: GUIDE_SPACING.md,
    textAlign: "center",
  },
  retryButton: {
    marginTop: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: GUIDE_COLORS.primary,
  },
  retryButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Footer
  footer: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingTop: GUIDE_SPACING.lg,
  },
  signOutButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: `${GUIDE_COLORS.primary}66`,
    ...GUIDE_SHADOWS.sm,
  },
  signOutButtonDisabled: {
    opacity: 0.7,
  },
  signOutText: {
    fontSize: 14,
    fontWeight: "700",
    color: GUIDE_COLORS.primary,
    letterSpacing: 0.5,
  },
  versionText: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    marginTop: GUIDE_SPACING.md,
    opacity: 0.6,
  },
});

export default ProfileScreen;
