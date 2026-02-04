import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Platform,
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
import { useResponsive } from "../../../../hooks/useResponsive";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { EventItem, MediaItem } from "../../../../types/guide";
import { EventsTab, LocationsTab, SchedulesTab } from "../components";
import MediaTab from "../components/MediaTab";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Premium color palette
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  brown: "#8B7355",
};

// Navigation type
type MySiteNavigationProp = NativeStackNavigationProp<MySiteStackParamList, 'MySiteHome'>;

// Types - Updated with 5 tabs (using Vietnamese for shorter labels)
type TabType = "Sự kiện" | "Media" | "Lịch lễ" | "Ca trực" | "Địa điểm";

// Tab icons mapping
const TAB_ICONS: Record<TabType, keyof typeof MaterialIcons.glyphMap> = {
  "Sự kiện": "event",
  "Media": "photo-library",
  "Lịch lễ": "church",
  "Ca trực": "schedule",
  "Địa điểm": "place",
};

// Mock data
const MOCK_SITE = {
  name: "Basilica of St. Francis",
  location: "Assisi, Italy",
};

// Premium Underline Tab Component
interface UnderlineTabsProps {
  tabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const { fontSize, spacing, iconSize } = useResponsive();

  return (
    <View style={styles.segmentedControl}>
      {tabs.map((tab, index) => {
        const isActive = activeTab === tab;
        const isFirst = index === 0;
        const isLast = index === tabs.length - 1;
        return (
          <TouchableOpacity
            key={tab}
            style={[
              styles.segmentedTab,
              isActive && styles.segmentedTabActive,
              isFirst && styles.segmentedTabFirst,
              isLast && styles.segmentedTabLast,
            ]}
            onPress={() => onTabChange(tab)}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name={TAB_ICONS[tab]}
              size={iconSize(20)}
              color={isActive ? "#FFF" : PREMIUM_COLORS.brown}
            />
            <Text
              style={[
                styles.segmentedTabText,
                { fontSize: fontSize(12) },
                isActive && styles.segmentedTabTextActive,
              ]}
              numberOfLines={1}
            >
              {tab}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main MySite Screen
const MySiteScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MySiteNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>("Sự kiện");
  const { spacing, fontSize, iconSize } = useResponsive();
  const fabScale = useRef(new Animated.Value(1)).current;
  const [showMoreMenu, setShowMoreMenu] = useState(false);

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  // FAB animation
  const handleFabPressIn = () => {
    Animated.spring(fabScale, {
      toValue: 0.9,
      useNativeDriver: true,
    }).start();
  };

  const handleFabPressOut = () => {
    Animated.spring(fabScale, {
      toValue: 1,
      friction: 3,
      useNativeDriver: true,
    }).start();
  };

  // Event handlers
  const handleEventPress = useCallback((event: EventItem) => {
    navigation.navigate('EventDetail', { event });
  }, [navigation]);

  const handleCreateEvent = useCallback(() => {
    navigation.navigate('EventDetail', { event: undefined });
  }, [navigation]);

  // Media handlers
  const handleMediaPress = useCallback((media: MediaItem) => {
    navigation.navigate('MediaDetail', { media });
  }, [navigation]);

  const handleUploadPress = useCallback(() => {
    navigation.navigate('MediaUpload');
  }, [navigation]);

  // FAB handler
  const handleAddNew = useCallback(() => {
    if (activeTab === "Media") {
      navigation.navigate('MediaUpload');
    } else if (activeTab === "Sự kiện") {
      navigation.navigate('EventDetail', { event: undefined });
    }
  }, [navigation, activeTab]);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GUIDE_COLORS.background}
      />

      {/* Sacred Pattern Background Decoration */}
      <View style={styles.backgroundDecoration}>
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
        <Text style={styles.headerTitle}>Site Management</Text>
        <TouchableOpacity
          style={styles.moreButton}
          onPress={() => setShowMoreMenu(!showMoreMenu)}
        >
          <Ionicons
            name="ellipsis-horizontal"
            size={22}
            color={GUIDE_COLORS.gray500}
          />
        </TouchableOpacity>
      </View>

      {/* Site Title - Always visible */}
      <View style={styles.siteHeaderFixed}>
        <Text style={styles.siteTitle}>{MOCK_SITE.name}</Text>
        <View style={styles.siteLocation}>
          <MaterialIcons
            name="location-on"
            size={16}
            color={GUIDE_COLORS.primary}
          />
          <Text style={styles.siteLocationText}>{MOCK_SITE.location}</Text>
        </View>
      </View>

      {/* Pill Tabs - Premium Design */}
      <View style={styles.tabsWrapper}>
        <UnderlineTabs
          tabs={["Sự kiện", "Media", "Lịch lễ", "Ca trực", "Địa điểm"]}
          activeTab={activeTab}
          onTabChange={setActiveTab}
        />
      </View>

      {/* Media Tab - Rendered outside ScrollView to avoid nesting VirtualizedList */}
      {activeTab === "Media" && (
        <View style={styles.mediaTabContainer}>
          <MediaTab
            onMediaPress={handleMediaPress}
            onUploadPress={handleUploadPress}
          />
        </View>
      )}

      {/* Events Tab - Also uses FlatList, render outside ScrollView */}
      {activeTab === "Sự kiện" && (
        <View style={styles.mediaTabContainer}>
          <EventsTab
            onEventPress={handleEventPress}
            onCreatePress={handleCreateEvent}
          />
        </View>
      )}

      {/* Locations Tab - Map with pin points */}
      {activeTab === "Địa điểm" && (
        <View style={styles.mediaTabContainer}>
          <LocationsTab />
        </View>
      )}

      {/* Schedules Tab - Mass Schedule management */}
      {activeTab === "Lịch lễ" && (
        <View style={styles.mediaTabContainer}>
          <SchedulesTab />
        </View>
      )}

      {/* Other tabs use ScrollView */}
      {activeTab !== "Media" && activeTab !== "Sự kiện" && activeTab !== "Địa điểm" && activeTab !== "Lịch lễ" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >

          {/* Shifts Section Placeholder */}
          {activeTab === "Ca trực" && (
            <View style={styles.placeholderSection}>
              <MaterialIcons
                name="schedule"
                size={64}
                color={GUIDE_COLORS.gray300}
              />
              <Text style={styles.placeholderText}>
                Ca trực - Coming Soon
              </Text>
              <Text style={styles.placeholderSubtext}>
                Quản lý lịch ca trực của bạn
              </Text>
            </View>
          )}

          {/* Bottom Spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

      {/* Floating Action Button - Premium with better shadow */}
      {/* Only show for tabs that don't have their own FAB */}
      {activeTab !== "Lịch lễ" && activeTab !== "Địa điểm" && (
        <Animated.View style={[styles.fabContainer, { transform: [{ scale: fabScale }] }]}>
          <TouchableOpacity
            style={styles.fab}
            onPress={handleAddNew}
            onPressIn={handleFabPressIn}
            onPressOut={handleFabPressOut}
            activeOpacity={1}
          >
            <MaterialIcons name="add" size={iconSize(28)} color="#FFFFFF" />
          </TouchableOpacity>
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  backgroundDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    opacity: 0.03,
    zIndex: 0,
  },
  backgroundIcon: {
    transform: [{ rotate: "12deg" }, { translateX: 48 }, { translateY: -48 }],
  },
  scrollView: {
    flex: 1,
    zIndex: 1,
  },
  scrollContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
  },
  mediaTabContainer: {
    flex: 1,
    paddingHorizontal: GUIDE_SPACING.lg,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    backgroundColor: PREMIUM_COLORS.cream,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: PREMIUM_COLORS.charcoal,
    flex: 1,
    textAlign: "center",
    letterSpacing: 0.5,
  },
  headerSpacer: {
    width: 40,
  },

  // Site Header
  siteHeaderFixed: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.lg,
  },
  siteTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: PREMIUM_COLORS.charcoal,
    letterSpacing: -0.5,
    marginBottom: GUIDE_SPACING.xs,
  },
  siteLocation: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
  },
  siteLocationText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: PREMIUM_COLORS.gold,
    fontStyle: "italic",
  },

  // Pill Tabs - Premium Soft Pill Design
  tabsWrapper: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.md,
  },
  underlineTabs: {
    flexDirection: "row",
    flex: 1,
    gap: GUIDE_SPACING.xs,
  },
  underlineTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    backgroundColor: "transparent",
    flexDirection: "row",
    gap: 4,
  },
  underlineTabActive: {
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  underlineTabText: {
    fontWeight: "500",
    color: GUIDE_COLORS.gray400,
  },
  underlineTabTextActive: {
    color: PREMIUM_COLORS.goldDark,
    fontWeight: "700",
  },

  // Segmented Control - Premium Design
  segmentedControl: {
    flexDirection: "row",
    flex: 1,
    backgroundColor: PREMIUM_COLORS.warmGray,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: 3,
    ...GUIDE_SHADOWS.sm,
  },
  segmentedTab: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.sm + 2,
    paddingHorizontal: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: "transparent",
    flexDirection: "column",
    gap: 2,
  },
  segmentedTabActive: {
    backgroundColor: PREMIUM_COLORS.gold,
    ...Platform.select({
      ios: {
        shadowColor: PREMIUM_COLORS.goldDark,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  segmentedTabFirst: {
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.md,
    borderBottomLeftRadius: GUIDE_BORDER_RADIUS.md,
  },
  segmentedTabLast: {
    borderTopRightRadius: GUIDE_BORDER_RADIUS.md,
    borderBottomRightRadius: GUIDE_BORDER_RADIUS.md,
  },
  segmentedTabText: {
    fontWeight: "600",
    color: PREMIUM_COLORS.brown,
  },
  segmentedTabTextActive: {
    color: "#FFF",
    fontWeight: "700",
  },
  moreButton: {
    width: 40,
    height: 40,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: PREMIUM_COLORS.warmGray,
  },

  // Placeholder Section
  placeholderSection: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
    gap: GUIDE_SPACING.lg,
  },
  placeholderText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    color: GUIDE_COLORS.textMuted,
    marginBottom: GUIDE_SPACING.xs,
  },
  placeholderSubtext: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },

  // FAB - Premium with soft floating shadow
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    zIndex: 20,
  },
  fab: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
      },
      android: {
        elevation: 8,
      },
    }),
  },
});

export default MySiteScreen;
