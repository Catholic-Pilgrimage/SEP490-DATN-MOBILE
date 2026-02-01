import { MaterialIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Types
interface Shift {
  id: string;
  title: string;
  date: Date;
  startTime: string;
  endTime: string;
  status: "confirmed" | "pending";
}

interface AssignedSite {
  id: string;
  name: string;
  location: string;
  imageUrl: string;
}

interface GuideProfile {
  id: string;
  name: string;
  role: string;
  region: string;
  isVerified: boolean;
  avatarUrl: string;
  assignedSite: AssignedSite;
}

// Mock data
const MOCK_PROFILE: GuideProfile = {
  id: "1",
  name: "Matteo Ricci",
  role: "Official Guide",
  region: "Nazareth Region",
  isVerified: true,
  avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&h=200&fit=crop",
  assignedSite: {
    id: "1",
    name: "Church of the Holy Sepulchre",
    location: "Old City, Jerusalem",
    imageUrl: "https://images.unsplash.com/photo-1544967082-d9d25d867d66?w=800&h=400&fit=crop",
  },
};

const MOCK_SHIFTS: Shift[] = [
  {
    id: "1",
    title: "Morning Liturgy",
    date: new Date(2024, 9, 12), // Oct 12
    startTime: "09:00 AM",
    endTime: "12:00 PM",
    status: "confirmed",
  },
  {
    id: "2",
    title: "Afternoon Tour",
    date: new Date(2024, 9, 14), // Oct 14
    startTime: "02:00 PM",
    endTime: "05:00 PM",
    status: "pending",
  },
  {
    id: "3",
    title: "High Mass Support",
    date: new Date(2024, 9, 18), // Oct 18
    startTime: "10:00 AM",
    endTime: "01:00 PM",
    status: "confirmed",
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

// Assigned Site Card Component
const AssignedSiteCard: React.FC<{ site: AssignedSite }> = ({ site }) => {
  return (
    <View style={styles.siteCard}>
      {/* Site Image */}
      <Image
        source={{ uri: site.imageUrl }}
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

      {/* Site Content */}
      <View style={styles.siteContent}>
        <Text style={styles.siteName}>{site.name}</Text>
        <View style={styles.siteLocationRow}>
          <MaterialIcons name="location-on" size={16} color="rgba(255,255,255,0.9)" />
          <Text style={styles.siteLocation}>{site.location}</Text>
        </View>
      </View>
    </View>
  );
};

// Main Profile Screen
const ProfileScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { logout } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

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
      >
        {/* Profile Header Section */}
        <View style={styles.profileSection}>
          <ProfileAvatar
            imageUrl={MOCK_PROFILE.avatarUrl}
            isVerified={MOCK_PROFILE.isVerified}
          />

          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{MOCK_PROFILE.name}</Text>
            <Text style={styles.profileRole}>
              {MOCK_PROFILE.role} • {MOCK_PROFILE.region}
            </Text>
            {MOCK_PROFILE.isVerified && (
              <View style={styles.verifiedTag}>
                <Text style={styles.verifiedTagText}>VERIFIED GUIDE</Text>
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
          <AssignedSiteCard site={MOCK_PROFILE.assignedSite} />
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
