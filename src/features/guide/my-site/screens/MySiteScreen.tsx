import { MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ScrollView,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { GUIDE_COLORS } from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useNotificationContext } from "../../../../contexts/NotificationContext";
import { useNotifications } from "../../../../hooks/useNotifications";
import { useResponsive } from "../../../../hooks/useResponsive";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { getAssignedSite } from "../../../../services/api/guide/siteApi";
import { EventItem, MediaItem } from "../../../../types/guide";
import { EventsTab, LocationsTab, ReviewsTab, SchedulesTab } from "../components";
import GuideMediaTab from "../components/MediaTab";
import { PREMIUM_COLORS } from "../constants";
import { styles } from "./MySiteScreen.styles";

// Navigation — toàn bộ stack (MediaDetail, SiteModels3d, …)
type MySiteNavigationProp = NativeStackNavigationProp<MySiteStackParamList>;

type TabType = "events" | "media" | "schedules" | "locations" | "reviews";

const TAB_ICONS: Record<TabType, keyof typeof MaterialIcons.glyphMap> = {
  events: "event",
  media: "photo-library",
  schedules: "church",
  locations: "place",
  reviews: "rate-review",
};

const ALL_TABS: TabType[] = [
  "events",
  "media",
  "schedules",
  "locations",
  "reviews",
];

interface UnderlineTabsProps {
  tabs: TabType[];
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  labels: Record<TabType, string>;
}

const UnderlineTabs: React.FC<UnderlineTabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  labels,
}) => {
  const { fontSize, iconSize } = useResponsive();

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
              {labels[tab]}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

// Main MySite Screen
type MySiteHomeRouteProp = RouteProp<MySiteStackParamList, "MySiteHome">;

const TAB_MAP: Record<string, TabType> = {
  events: "events",
  media: "media",
  schedules: "schedules",
  locations: "locations",
  reviews: "reviews",
};

const MySiteScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<MySiteNavigationProp>();
  const route = useRoute<MySiteHomeRouteProp>();
  const initialTab = route.params?.initialTab;
  const focusReviewId = route.params?.reviewId;
  const autoOpenReply = route.params?.autoOpenReply;
  const { t } = useTranslation();
  const { openModal } = useNotificationContext();
  const { unreadCount } = useNotifications();
  const [activeTab, setActiveTab] = useState<TabType>(
    (initialTab && TAB_MAP[initialTab]) || "events",
  );

  useEffect(() => {
    if (initialTab && TAB_MAP[initialTab]) {
      setActiveTab(TAB_MAP[initialTab]);
    }
  }, [initialTab]);

  // Fetch assigned site info from API
  const { data: siteData } = useQuery({
    queryKey: GUIDE_KEYS.dashboard.siteInfo(),
    queryFn: async () => {
      const response = await getAssignedSite();
      if (!response?.success) throw new Error(response?.message || "Failed");
      return response.data;
    },
  });

  const tabLabels = useMemo<Record<TabType, string>>(
    () => ({
      events: t("mySiteScreen.tabs.events"),
      media: t("mySiteScreen.tabs.media"),
      schedules: t("mySiteScreen.tabs.schedules"),
      locations: t("mySiteScreen.tabs.locations"),
      reviews: t("mySiteScreen.tabs.reviews"),
    }),
    [t],
  );

  const siteName = siteData?.name || t("mySiteScreen.loading");
  const siteAddress = siteData?.address
    ? `${siteData.district ? siteData.district + ", " : ""}${siteData.province || siteData.address}`
    : t("mySiteScreen.noAddress");

  // Event handlers
  const handleEventPress = useCallback(
    (event: EventItem) => {
      navigation.navigate("EventDetail", { event });
    },
    [navigation],
  );

  const handleCreateEvent = useCallback(() => {
    navigation.navigate("EventDetail", { event: undefined });
  }, [navigation]);

  // Media handlers
  const handleMediaPress = useCallback(
    (media: MediaItem) => {
      navigation.navigate("MediaDetail", { media });
    },
    [navigation],
  );

  const handleUploadPress = useCallback(() => {
    navigation.navigate("MediaUpload");
  }, [navigation]);

  const handleOpenSiteModels3d = useCallback(() => {
    navigation.navigate("SiteModels3d");
  }, [navigation]);

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

      {/* Site Title - Always visible */}
      <View style={styles.siteHeaderFixed}>
        <View style={styles.siteHeaderTop}>
          <View style={styles.siteHeaderText}>
            <Text style={styles.siteTitle}>{siteName}</Text>
            <View style={styles.siteLocation}>
              <MaterialIcons
                name="location-on"
                size={16}
                color={GUIDE_COLORS.primary}
              />
              <Text style={styles.siteLocationText}>{siteAddress}</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.notificationButton}
            onPress={openModal}
            activeOpacity={0.85}
          >
            <MaterialIcons
              name="notifications-none"
              size={22}
              color={GUIDE_COLORS.primary}
            />
            {unreadCount > 0 && (
              <View style={styles.notificationBadge}>
                <Text style={styles.notificationBadgeText}>
                  {unreadCount > 99 ? "99+" : unreadCount}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Pill Tabs - Premium Design */}
      <View style={styles.tabsWrapper}>
        <UnderlineTabs
          tabs={ALL_TABS}
          activeTab={activeTab}
          onTabChange={setActiveTab}
          labels={tabLabels}
        />
      </View>

      {/* Media Tab - Rendered outside ScrollView to avoid nesting VirtualizedList */}
      {activeTab === "media" && (
        <View style={styles.mediaTabContainer}>
          <GuideMediaTab
            onMediaPress={handleMediaPress}
            onUploadPress={handleUploadPress}
            onOpenSiteModels3d={handleOpenSiteModels3d}
          />
        </View>
      )}

      {/* Events Tab - Also uses FlatList, render outside ScrollView */}
      {activeTab === "events" && (
        <View style={styles.mediaTabContainer}>
          <EventsTab
            onEventPress={handleEventPress}
            onCreatePress={handleCreateEvent}
          />
        </View>
      )}

      {/* Locations Tab - Map with pin points */}
      {activeTab === "locations" && (
        <View style={styles.mediaTabContainer}>
          <LocationsTab
            siteLocation={
              siteData?.latitude && siteData?.longitude
                ? {
                    latitude: siteData.latitude,
                    longitude: siteData.longitude,
                    name: siteData.name,
                    address: siteData.address,
                  }
                : undefined
            }
          />
        </View>
      )}

      {/* Schedules Tab - Mass Schedule management */}
      {activeTab === "schedules" && (
        <View style={styles.mediaTabContainer}>
          <SchedulesTab />
        </View>
      )}

      {activeTab === "reviews" && (
        <View style={styles.mediaTabContainer}>
          <ReviewsTab
            focusReviewId={focusReviewId}
            autoOpenReply={autoOpenReply}
          />
        </View>
      )}

      {/* Other tabs use ScrollView */}
      {!ALL_TABS.includes(activeTab) && (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Shifts Section - REMOVED (Moved to Bottom Tab) */}

          {/* Bottom Spacing */}
          <View style={{ height: 120 }} />
        </ScrollView>
      )}

    </View>
  );
};

export default MySiteScreen;
