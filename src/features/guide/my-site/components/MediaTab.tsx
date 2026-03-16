/**
 * MediaTab Component
 * Displays media gallery with Bottom Sheet filter (Gold Standard), badges, and empty state
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Image,
    RefreshControl,
    SectionList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { GUIDE_COLORS } from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { getMedia } from "../../../../services/api/guide";
import { MediaItem, MediaStatus, MediaType } from "../../../../types/guide";
import { PREMIUM_COLORS } from "../constants";
import type { FilterItem } from "./FilterBottomSheet";
import { FilterBottomSheet, FilterTrigger } from "./FilterBottomSheet";
import { NUM_COLUMNS, styles } from "./MediaTab.styles";
import { StatusBadge } from "./StatusBadge";

// ============================================
// TYPES
// ============================================

type TypeFilter = "all" | MediaType;
type StatusFilter = "all" | MediaStatus;

interface MediaTabProps {
  onMediaPress: (media: MediaItem) => void;
  onUploadPress: () => void;
}

// ============================================
// FILTER DEFINITIONS
// ============================================

const getTypeFilters = (t: (key: string) => string): FilterItem[] => [
  {
    key: "all",
    label: t("mediaTab.typeAll"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "apps",
  },
  {
    key: "image",
    label: t("mediaTab.typeImage"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "photo",
  },
  {
    key: "video",
    label: t("mediaTab.typeVideo"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "videocam",
  },
  {
    key: "panorama",
    label: t("mediaTab.typePanorama"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "panorama-fish-eye",
  },
];

const getStatusFilters = (t: (key: string) => string): FilterItem[] => [
  {
    key: "all",
    label: t("mediaTab.statusAll"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    description: t("mediaTab.statusAllDesc"),
  },
  {
    key: "pending",
    label: t("mediaTab.statusPending"),
    color: GUIDE_COLORS.warning,
    bgColor: "#FFF8E1",
    icon: "schedule",
    description: t("mediaTab.statusPendingDesc"),
  },
  {
    key: "approved",
    label: t("mediaTab.statusApproved"),
    color: GUIDE_COLORS.success,
    bgColor: "#E8F5E9",
    icon: "check-circle",
    description: t("mediaTab.statusApprovedDesc"),
  },
  {
    key: "rejected",
    label: t("mediaTab.statusRejected"),
    color: GUIDE_COLORS.error,
    bgColor: "#FFEBEE",
    icon: "cancel",
    description: t("mediaTab.statusRejectedDesc"),
  },
];

const getStatusLabel = (
  status: MediaStatus,
  t: (key: string) => string,
): string => {
  return t(
    `mediaTab.status${status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
};

// ============================================
// MEDIA TYPE ICON
// ============================================

interface MediaTypeIconProps {
  type: MediaType;
}

const MediaTypeIcon: React.FC<MediaTypeIconProps> = ({ type }) => {
  if (type === "image") return null;

  if (type === "video") {
    return (
      <View style={styles.videoIndicator}>
        <Ionicons name="play" size={10} color="#FFF" />
        <Text style={styles.videoDuration}>00:15</Text>
      </View>
    );
  }

  return (
    <View style={styles.panaromaIndicator}>
      <MaterialIcons name="360" size={12} color="#FFF" />
    </View>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  onUploadPress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUploadPress }) => {
  const { t } = useTranslation();
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <MaterialIcons
          name="photo-camera"
          size={48}
          color={GUIDE_COLORS.gray300}
        />
      </View>
      <Text style={styles.emptyTitle}>{t("mediaTab.empty")}</Text>
      <Text style={styles.emptyDescription}>{t("mediaTab.emptyDesc")}</Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={onUploadPress}
        activeOpacity={0.8}
      >
        <MaterialIcons name="add" size={20} color={GUIDE_COLORS.surface} />
        <Text style={styles.emptyButtonText}>{t("mediaTab.uploadMedia")}</Text>
      </TouchableOpacity>
    </View>
  );
};

// ============================================
// MEDIA ITEM COMPONENT
// ============================================

interface MediaGridItemProps {
  item: MediaItem;
  onPress: () => void;
}

const MediaGridItem: React.FC<MediaGridItemProps> = ({ item, onPress }) => {
  const { t } = useTranslation();

  // For YouTube videos, extract thumbnail
  const getVideoThumbnail = (url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    )?.[1];
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`
      : null;
  };

  const thumbnailUrl =
    item.type === "video" && item.url.includes("youtube")
      ? getVideoThumbnail(item.url)
      : item.url;

  return (
    <TouchableOpacity
      style={styles.gridItem}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <Image
        source={{ uri: thumbnailUrl || item.url }}
        style={styles.gridItemImage}
        resizeMode="cover"
      />
      <View style={styles.statusBadgeContainer}>
        <StatusBadge status={item.status} label={getStatusLabel(item.status, t)} />
      </View>
      <MediaTypeIcon type={item.type} />
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MediaTab: React.FC<MediaTabProps> = ({
  onMediaPress,
  onUploadPress,
}) => {
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showStatusFilterSheet, setShowStatusFilterSheet] = useState(false);
  const [showTypeFilterSheet, setShowTypeFilterSheet] = useState(false);
  const typeFilters = useMemo(() => getTypeFilters(t), [t]);
  const statusFilters = useMemo(() => getStatusFilters(t), [t]);

  const {
    data: mediaList = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: GUIDE_KEYS.media({
      type: typeFilter,
      status: statusFilter,
      is_active: true,
    }),
    queryFn: async () => {
      const params: any = { is_active: true };
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await getMedia(params);
      if (!response?.success)
        throw new Error(response?.message || "Failed to fetch media");
      return response.data?.data || [];
    },
    staleTime: 1000 * 30,
  });

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  // Group media by date (like Photos app)
  const groupMediaByDate = useCallback(
    (items: MediaItem[]) => {
      const groups: Record<string, MediaItem[]> = {};

      items.forEach((item) => {
        const date = new Date(item.created_at);
        const today = new Date();
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);

        let dateKey: string;

        if (date.toDateString() === today.toDateString()) {
          dateKey = t("mediaTab.today");
        } else if (date.toDateString() === yesterday.toDateString()) {
          dateKey = t("mediaTab.yesterday");
        } else {
          const dayName = t(`mediaTab.dayName${date.getDay()}`);
          const day = date.getDate();
          const month = date.getMonth() + 1;
          const year = date.getFullYear();

          if (year === today.getFullYear()) {
            dateKey = t("mediaTab.dateFormat", { dayName, day, month });
          } else {
            dateKey = t("mediaTab.dateFormatWithYear", {
              dayName,
              day,
              month,
              year,
            });
          }
        }

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(item);
      });

      return Object.entries(groups)
        .map(([title, data]) => ({ title, data }))
        .sort((a, b) => {
          const dateA = new Date(a.data[0]?.created_at || 0);
          const dateB = new Date(b.data[0]?.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
    },
    [t],
  );

  const sections = groupMediaByDate(mediaList);

  // Render a row of grid items (3 per row)
  const renderGridRow = (items: MediaItem[], startIndex: number) => (
    <View style={styles.gridRow} key={`row-${startIndex}`}>
      {items.map((item) => (
        <MediaGridItem
          key={item.id}
          item={item}
          onPress={() => onMediaPress(item)}
        />
      ))}
      {/* Fill empty spots if less than 3 items */}
      {items.length < NUM_COLUMNS &&
        Array(NUM_COLUMNS - items.length)
          .fill(null)
          .map((_, i) => (
            <View key={`empty-${i}`} style={styles.gridItemEmpty} />
          ))}
    </View>
  );

  // Render section with grid layout
  const renderSectionContent = (data: MediaItem[]) => {
    const rows = [];
    for (let i = 0; i < data.length; i += NUM_COLUMNS) {
      const rowItems = data.slice(i, i + NUM_COLUMNS);
      rows.push(renderGridRow(rowItems, i));
    }
    return <View style={styles.sectionGrid}>{rows}</View>;
  };

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitleMain}>
          {t("mediaTab.libraryTitle")}
        </Text>
        <View style={styles.filterRow}>
          <FilterTrigger
            activeFilter={typeFilter}
            onPress={() => setShowTypeFilterSheet(true)}
            filters={typeFilters}
            defaultLabel={t("mediaTab.typeSection")}
          />
          <FilterTrigger
            activeFilter={statusFilter}
            onPress={() => setShowStatusFilterSheet(true)}
            filters={statusFilters}
            defaultLabel={t("mediaTab.filter")}
          />
        </View>
      </View>

      {/* Filter Bottom Sheets */}
      <FilterBottomSheet
        visible={showTypeFilterSheet}
        activeFilter={typeFilter}
        onFilterChange={(filter) => setTypeFilter(filter as TypeFilter)}
        onClose={() => setShowTypeFilterSheet(false)}
        filters={typeFilters}
        title={t("mediaTab.typeSection")}
      />
      <FilterBottomSheet
        visible={showStatusFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as StatusFilter)}
        onClose={() => setShowStatusFilterSheet(false)}
        filters={statusFilters}
        title={t("mediaTab.statusSection")}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
          <Text style={styles.loadingText}>{t("mediaTab.loading")}</Text>
        </View>
      ) : mediaList.length === 0 ? (
        <EmptyState onUploadPress={onUploadPress} />
      ) : (
        <SectionList
          sections={sections}
          keyExtractor={(item, index) => item.id + index}
          renderItem={() => null}
          renderSectionHeader={({ section: { title, data } }) => (
            <View>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionCount}>{data.length}</Text>
              </View>
              {renderSectionContent(data)}
            </View>
          )}
          contentContainerStyle={styles.sectionListContent}
          showsVerticalScrollIndicator={false}
          stickySectionHeadersEnabled={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={[GUIDE_COLORS.primary]}
              tintColor={GUIDE_COLORS.primary}
            />
          }
        />
      )}
    </View>
  );
};

export default MediaTab;
