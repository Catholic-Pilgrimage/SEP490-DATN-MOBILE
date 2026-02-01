import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
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
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { EventItem, MediaItem } from "../../../../types/guide";
import { EventsTab } from "../components/EventsTab";
import { MediaTab } from "../components/MediaTab";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Navigation type
type MySiteNavigationProp = NativeStackNavigationProp<MySiteStackParamList, 'MySiteHome'>;

// Types - Updated with 4 tabs
type TabType = "Events" | "Media" | "Schedules" | "Shifts";

// Mock data
const MOCK_SITE = {
  name: "Basilica of St. Francis",
  location: "Assisi, Italy",
};

// Segmented Control Component
interface SegmentedControlProps {
  tabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
}

const SegmentedControl: React.FC<SegmentedControlProps> = ({
  tabs,
  activeTab,
  onTabChange,
}) => {
  const activeIndex = tabs.indexOf(activeTab);

  return (
    <View style={styles.segmentedControl}>
      <View
        style={[
          styles.segmentedIndicator,
          {
            left: `${(activeIndex / tabs.length) * 100}%` as any,
            width: `${100 / tabs.length}%` as any,
          },
        ]}
      />
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab}
          style={styles.segmentedTab}
          onPress={() => onTabChange(tab)}
          activeOpacity={0.7}
        >
          <Text
            style={[
              styles.segmentedTabText,
              activeTab === tab && styles.segmentedTabTextActive,
            ]}
          >
            {tab}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

// Main MySite Screen
const MySiteScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MySiteNavigationProp>();
  const [activeTab, setActiveTab] = useState<TabType>("Events");

  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

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
    } else if (activeTab === "Events") {
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
        <View style={styles.headerSpacer} />
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

      {/* Segmented Control - Always visible */}
      <View style={styles.segmentedWrapperFixed}>
        <SegmentedControl
          tabs={["Events", "Media", "Schedules", "Shifts"]}
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
      {activeTab === "Events" && (
        <View style={styles.mediaTabContainer}>
          <EventsTab
            onEventPress={handleEventPress}
            onCreatePress={handleCreateEvent}
          />
        </View>
      )}

      {/* Other tabs use ScrollView */}
      {activeTab !== "Media" && activeTab !== "Events" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Schedules Section Placeholder */}
          {activeTab === "Schedules" && (
            <View style={styles.placeholderSection}>
              <MaterialIcons
                name="calendar-today"
                size={64}
                color={GUIDE_COLORS.gray300}
              />
              <Text style={styles.placeholderText}>
                Lịch lễ - Coming Soon
              </Text>
              <Text style={styles.placeholderSubtext}>
                Quản lý lịch trình các buổi lễ và sự kiện
              </Text>
            </View>
          )}

          {/* Shifts Section Placeholder */}
          {activeTab === "Shifts" && (
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

      {/* Floating Action Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={handleAddNew}
        activeOpacity={0.9}
      >
        <MaterialIcons name="add" size={28} color={GUIDE_COLORS.surface} />
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  backgroundDecoration: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 256,
    height: 256,
    opacity: 0.05,
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
    backgroundColor: GUIDE_COLORS.background,
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
    color: GUIDE_COLORS.textPrimary,
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 40,
  },

  // Site Header
  siteHeaderFixed: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.md,
  },
  siteTitle: {
    fontSize: 28,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
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
    color: GUIDE_COLORS.textMuted,
    fontStyle: "italic",
  },

  // Segmented Control
  segmentedWrapperFixed: {
    paddingHorizontal: GUIDE_SPACING.lg,
    marginBottom: GUIDE_SPACING.md,
  },
  segmentedControl: {
    flexDirection: "row",
    height: 48,
    backgroundColor: "rgba(0, 0, 0, 0.05)",
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: 4,
    position: "relative",
  },
  segmentedIndicator: {
    position: "absolute",
    top: 4,
    bottom: 4,
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    ...GUIDE_SHADOWS.sm,
  },
  segmentedTab: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1,
  },
  segmentedTabText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textMuted,
  },
  segmentedTabTextActive: {
    color: GUIDE_COLORS.textPrimary,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
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

  // FAB
  fab: {
    position: "absolute",
    bottom: 96,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    ...GUIDE_SHADOWS.lg,
    shadowColor: GUIDE_COLORS.primary,
    shadowOpacity: 0.4,
    zIndex: 20,
  },
});

export default MySiteScreen;
