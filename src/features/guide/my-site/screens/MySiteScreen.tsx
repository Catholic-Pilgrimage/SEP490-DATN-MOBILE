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
import { MediaItem } from "../../../../types/guide";
import { MediaTab } from "../components/MediaTab";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Navigation type
type MySiteNavigationProp = NativeStackNavigationProp<MySiteStackParamList, 'MySiteHome'>;

// Types - Updated with 4 tabs
type TabType = "Events" | "Media" | "Schedules" | "Shifts";

interface Event {
  id: string;
  title: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconBgColor: string;
  schedule: string;
  location: string;
  status: "published" | "draft";
}

// Mock data
const MOCK_SITE = {
  name: "Basilica of St. Francis",
  location: "Assisi, Italy",
};

const MOCK_EVENTS: Event[] = [
  {
    id: "1",
    title: "Feast of the Assumption",
    icon: "church",
    iconBgColor: GUIDE_COLORS.primaryMuted,
    schedule: "Aug 15, 2024 • 10:00 AM",
    location: "Main Sanctuary",
    status: "published",
  },
  {
    id: "2",
    title: "Daily Confessions",
    icon: "volunteer-activism",
    iconBgColor: GUIDE_COLORS.primaryMuted,
    schedule: "Mon-Fri • 4:00 PM - 6:00 PM",
    location: "West Confessional",
    status: "published",
  },
  {
    id: "3",
    title: "Choir Practice",
    icon: "music-note",
    iconBgColor: GUIDE_COLORS.gray100,
    schedule: "Every Wednesday • 7:00 PM",
    location: "",
    status: "draft",
  },
];

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

// Event Card Component
interface EventCardProps {
  event: Event;
  onEdit: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onEdit, onDelete }) => {
  const isDraft = event.status === "draft";

  return (
    <View style={[styles.eventCard, isDraft && styles.eventCardDraft]}>
      <View style={styles.eventCardContent}>
        <View style={styles.eventCardLeft}>
          <View
            style={[styles.eventIcon, { backgroundColor: event.iconBgColor }]}
          >
            <MaterialIcons
              name={event.icon}
              size={24}
              color={isDraft ? GUIDE_COLORS.gray500 : GUIDE_COLORS.primary}
            />
          </View>
          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle}>{event.title}</Text>
            <View style={styles.eventMeta}>
              <MaterialIcons
                name={event.location ? "calendar-today" : "event"}
                size={14}
                color={GUIDE_COLORS.textMuted}
              />
              <Text style={styles.eventMetaText}>{event.schedule}</Text>
            </View>
            {event.location ? (
              <View style={styles.eventMeta}>
                <MaterialIcons
                  name="location-on"
                  size={14}
                  color={GUIDE_COLORS.textMuted}
                />
                <Text style={styles.eventMetaText}>{event.location}</Text>
              </View>
            ) : null}
          </View>
        </View>
        <TouchableOpacity style={styles.editButton} onPress={onEdit}>
          <MaterialIcons name="edit" size={20} color={GUIDE_COLORS.textMuted} />
        </TouchableOpacity>
      </View>

      {/* Footer with actions */}
      <View style={styles.eventCardFooter}>
        <View
          style={[
            styles.statusBadge,
            isDraft ? styles.statusBadgeDraft : styles.statusBadgePublished,
          ]}
        >
          <Text
            style={[
              styles.statusBadgeText,
              isDraft
                ? styles.statusBadgeTextDraft
                : styles.statusBadgeTextPublished,
            ]}
          >
            {isDraft ? "Draft" : "Published"}
          </Text>
        </View>
        <TouchableOpacity style={styles.deleteIconButton} onPress={onDelete}>
          <MaterialIcons name="delete-outline" size={18} color={GUIDE_COLORS.gray400} />
        </TouchableOpacity>
      </View>
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

  const handleEditEvent = useCallback((eventId: string) => {
    navigation.navigate('EventDetail', { eventId });
  }, [navigation]);

  const handleDeleteEvent = (eventId: string) => {
    console.log("Delete event:", eventId);
  };

  const handleAddNew = useCallback(() => {
    if (activeTab === "Media") {
      navigation.navigate('MediaUpload');
    } else {
      navigation.navigate('EventDetail', { eventId: undefined });
    }
  }, [navigation, activeTab]);

  const handleMediaPress = useCallback((media: MediaItem) => {
    navigation.navigate('MediaDetail', { media });
  }, [navigation]);

  const handleUploadPress = useCallback(() => {
    navigation.navigate('MediaUpload');
  }, [navigation]);

  const activeEventsCount = MOCK_EVENTS.filter(
    (e) => e.status === "published",
  ).length;

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

      {/* Other tabs use ScrollView */}
      {activeTab !== "Media" && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Events Section */}
          {activeTab === "Events" && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Scheduled Events</Text>
                <View style={styles.activeCountBadge}>
                  <Text style={styles.activeCountText}>
                    {activeEventsCount} Active
                  </Text>
                </View>
              </View>

              <View style={styles.eventsList}>
                {MOCK_EVENTS.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    onEdit={() => handleEditEvent(event.id)}
                    onDelete={() => handleDeleteEvent(event.id)}
                  />
                ))}
              </View>

              {/* Quote */}
              <View style={styles.quoteContainer}>
                <Text style={styles.quoteText}>
                  "For where two or three are gathered in my name..."
                </Text>
              </View>
            </View>
          )}

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
  siteHeader: {
    marginBottom: GUIDE_SPACING.xl,
    marginTop: GUIDE_SPACING.sm,
  },
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
  segmentedWrapper: {
    marginBottom: GUIDE_SPACING.xxl,
  },
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

  // Section
  section: {
    gap: GUIDE_SPACING.lg,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.xs,
  },
  sectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textPrimary,
  },
  activeCountBadge: {
    backgroundColor: GUIDE_COLORS.primaryMuted,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  activeCountText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.primary,
  },

  // Events List
  eventsList: {
    gap: GUIDE_SPACING.lg,
  },

  // Event Card
  eventCard: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    padding: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.md, // Increased shadow for better depth
  },
  eventCardDraft: {
    opacity: 0.75,
  },
  eventCardContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  eventCardLeft: {
    flexDirection: "row",
    flex: 1,
    gap: GUIDE_SPACING.lg,
  },
  eventIcon: {
    width: 48,
    height: 48,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    justifyContent: "center",
    alignItems: "center",
  },
  eventInfo: {
    flex: 1,
    gap: 4,
  },
  eventTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  eventMetaText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
  },
  editButton: {
    padding: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },

  // Event Card Footer
  eventCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between", // Status left, delete right
    alignItems: "center",
    marginTop: GUIDE_SPACING.md,
    paddingTop: GUIDE_SPACING.md,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.gray100,
  },
  deleteIconButton: {
    padding: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.error,
  },
  statusBadge: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full, // Pill shape
  },
  statusBadgePublished: {
    backgroundColor: "#E8F5E9", // Soft pastel green
  },
  statusBadgeDraft: {
    backgroundColor: GUIDE_COLORS.gray100,
  },
  statusBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },
  statusBadgeTextPublished: {
    color: "#2E7D32", // Darker green for contrast on pastel
  },
  statusBadgeTextDraft: {
    color: GUIDE_COLORS.gray500,
    fontStyle: "italic",
  },

  // Quote
  quoteContainer: {
    paddingVertical: GUIDE_SPACING.xl,
    alignItems: "center",
  },
  quoteText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontStyle: "italic",
    color: GUIDE_COLORS.textMuted,
    opacity: 0.6,
    textAlign: "center",
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
