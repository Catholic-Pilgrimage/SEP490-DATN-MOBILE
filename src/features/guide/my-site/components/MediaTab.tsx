/**
 * MediaTab Component
 * Displays media gallery with status filter, badges, and empty state
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { getMedia } from "../../../../services/api/guide/mediaApi";
import { MediaItem, MediaStatus, MediaType } from "../../../../types/guide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = GUIDE_SPACING.sm;
const NUM_COLUMNS = 3;
const ITEM_SIZE = (SCREEN_WIDTH - GUIDE_SPACING.lg * 2 - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS;

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
// FILTER COMPONENTS
// ============================================

const TYPE_FILTERS: { key: TypeFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "all", label: "All", icon: "apps" },
  { key: "image", label: "Photos", icon: "photo" },
  { key: "video", label: "Videos", icon: "videocam" },
  { key: "panorama", label: "360°", icon: "panorama-fish-eye" },
];

const STATUS_FILTERS: { key: StatusFilter; label: string; color: string; icon?: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "all", label: "All", color: GUIDE_COLORS.textMuted },
  { key: "pending", label: "Pending", color: GUIDE_COLORS.warning, icon: "schedule" },
  { key: "approved", label: "Approved", color: GUIDE_COLORS.success, icon: "check-circle" },
  { key: "rejected", label: "Rejected", color: GUIDE_COLORS.error, icon: "cancel" },
];

interface TypeFilterChipProps {
  filter: typeof TYPE_FILTERS[0];
  isActive: boolean;
  onPress: () => void;
}

const TypeFilterChip: React.FC<TypeFilterChipProps> = ({ filter, isActive, onPress }) => (
  <TouchableOpacity
    style={[styles.typeChip, isActive && styles.typeChipActive]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <MaterialIcons
      name={filter.icon}
      size={16}
      color={isActive ? GUIDE_COLORS.surface : GUIDE_COLORS.textMuted}
    />
    <Text style={[styles.typeChipText, isActive && styles.typeChipTextActive]}>
      {filter.label}
    </Text>
  </TouchableOpacity>
);

interface StatusFilterChipProps {
  filter: typeof STATUS_FILTERS[0];
  isActive: boolean;
  onPress: () => void;
}

const StatusFilterChip: React.FC<StatusFilterChipProps> = ({ filter, isActive, onPress }) => (
  <TouchableOpacity
    style={[
      styles.statusChip,
      isActive && { backgroundColor: filter.color, borderColor: filter.color },
    ]}
    onPress={onPress}
    activeOpacity={0.7}
  >
    {filter.icon && (
      <MaterialIcons
        name={filter.icon}
        size={14}
        color={isActive ? GUIDE_COLORS.surface : filter.color}
      />
    )}
    <Text
      style={[
        styles.statusChipText,
        { color: isActive ? GUIDE_COLORS.surface : filter.color },
      ]}
    >
      {filter.label}
    </Text>
  </TouchableOpacity>
);

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: MediaStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: GUIDE_COLORS.warningLight,
          color: GUIDE_COLORS.warning,
          icon: "schedule" as keyof typeof MaterialIcons.glyphMap,
        };
      case "approved":
        return {
          backgroundColor: GUIDE_COLORS.successLight,
          color: GUIDE_COLORS.success,
          icon: "check-circle" as keyof typeof MaterialIcons.glyphMap,
        };
      case "rejected":
        return {
          backgroundColor: GUIDE_COLORS.errorLight,
          color: GUIDE_COLORS.error,
          icon: "error" as keyof typeof MaterialIcons.glyphMap,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
      <MaterialIcons name={config.icon} size={12} color={config.color} />
    </View>
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

  const icon = type === "video" ? "play-circle-filled" : "360";

  return (
    <View style={styles.mediaTypeIcon}>
      <MaterialIcons name={icon} size={20} color={GUIDE_COLORS.surface} />
    </View>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  onUploadPress: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onUploadPress }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons name="photo-camera" size={48} color={GUIDE_COLORS.gray300} />
    </View>
    <Text style={styles.emptyTitle}>Chưa có media nào</Text>
    <Text style={styles.emptyDescription}>
      Hãy upload ảnh, video hoặc{"\n"}panorama 360° cho site của bạn
    </Text>
    <TouchableOpacity style={styles.emptyButton} onPress={onUploadPress} activeOpacity={0.8}>
      <MaterialIcons name="add" size={20} color={GUIDE_COLORS.surface} />
      <Text style={styles.emptyButtonText}>Upload Media</Text>
    </TouchableOpacity>
  </View>
);

// ============================================
// MEDIA ITEM COMPONENT
// ============================================

interface MediaGridItemProps {
  item: MediaItem;
  onPress: () => void;
}

const MediaGridItem: React.FC<MediaGridItemProps> = ({ item, onPress }) => {
  // For YouTube videos, extract thumbnail
  const getVideoThumbnail = (url: string) => {
    const videoId = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/)?.[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/mqdefault.jpg` : null;
  };

  const thumbnailUrl = item.type === "video" && item.url.includes("youtube")
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
      <StatusBadge status={item.status} />
      <MediaTypeIcon type={item.type} />
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MediaTab: React.FC<MediaTabProps> = ({ onMediaPress, onUploadPress }) => {
  const [mediaList, setMediaList] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchMedia = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        is_active: true, // Only fetch active (non-deleted) media
      };
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await getMedia(params);
      if (response.success && response.data) {
        setMediaList(response.data.data);
      }
    } catch (error) {
      console.error("Error fetching media:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [typeFilter, statusFilter]);

  // Initial fetch when filter changes
  useEffect(() => {
    fetchMedia();
  }, [fetchMedia]);

  // Refresh data when screen comes into focus (after edit/delete)
  useFocusEffect(
    useCallback(() => {
      fetchMedia(true);
    }, [fetchMedia])
  );

  const handleRefresh = useCallback(() => {
    fetchMedia(true);
  }, [fetchMedia]);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <MediaGridItem item={item} onPress={() => onMediaPress(item)} />
    ),
    [onMediaPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  // Count media by status
  const pendingCount = mediaList.filter((m) => m.status === "pending").length;
  const approvedCount = mediaList.filter((m) => m.status === "approved").length;
  const rejectedCount = mediaList.filter((m) => m.status === "rejected").length;

  return (
    <View style={styles.container}>
      {/* Type Filters */}
      <View style={styles.filterSection}>
        <View style={styles.typeFilters}>
          {TYPE_FILTERS.map((filter) => (
            <TypeFilterChip
              key={filter.key}
              filter={filter}
              isActive={typeFilter === filter.key}
              onPress={() => setTypeFilter(filter.key)}
            />
          ))}
        </View>
      </View>

      {/* Status Filters */}
      <View style={styles.statusFilters}>
        {STATUS_FILTERS.map((filter) => (
          <StatusFilterChip
            key={filter.key}
            filter={filter}
            isActive={statusFilter === filter.key}
            onPress={() => setStatusFilter(filter.key)}
          />
        ))}
      </View>

      {/* Stats Summary */}
      {!loading && mediaList.length > 0 && (
        <View style={styles.statsSummary}>
          <Text style={styles.statsText}>
            <Text style={{ color: GUIDE_COLORS.warning }}>{pendingCount}</Text> pending •{" "}
            <Text style={{ color: GUIDE_COLORS.success }}>{approvedCount}</Text> approved •{" "}
            <Text style={{ color: GUIDE_COLORS.error }}>{rejectedCount}</Text> rejected
          </Text>
        </View>
      )}

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
          <Text style={styles.loadingText}>Loading media...</Text>
        </View>
      ) : mediaList.length === 0 ? (
        <EmptyState onUploadPress={onUploadPress} />
      ) : (
        <FlatList
          data={mediaList}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={NUM_COLUMNS}
          contentContainerStyle={styles.gridContainer}
          columnWrapperStyle={styles.gridRow}
          showsVerticalScrollIndicator={false}
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Filter Section
  filterSection: {
    marginBottom: GUIDE_SPACING.sm,
  },
  typeFilters: {
    flexDirection: "row",
    gap: GUIDE_SPACING.sm,
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.gray100,
  },
  typeChipActive: {
    backgroundColor: GUIDE_COLORS.primary,
  },
  typeChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textMuted,
  },
  typeChipTextActive: {
    color: GUIDE_COLORS.surface,
  },

  // Status Filters
  statusFilters: {
    flexDirection: "row",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.md,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: GUIDE_COLORS.surface,
  },
  statusChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },

  // Stats Summary
  statsSummary: {
    marginBottom: GUIDE_SPACING.md,
  },
  statsText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    color: GUIDE_COLORS.textMuted,
  },

  // Loading
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
  },
  loadingText: {
    marginTop: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
  },

  // Grid
  gridContainer: {
    paddingBottom: GUIDE_SPACING.xxl,
  },
  gridRow: {
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItem: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    overflow: "hidden",
    backgroundColor: GUIDE_COLORS.gray100,
  },
  gridItemImage: {
    width: "100%",
    height: "100%",
  },

  // Status Badge
  statusBadge: {
    position: "absolute",
    top: 6,
    left: 6,
    width: 22,
    height: 22,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    justifyContent: "center",
    alignItems: "center",
    ...GUIDE_SHADOWS.sm,
  },

  // Media Type Icon
  mediaTypeIcon: {
    position: "absolute",
    bottom: 6,
    right: 6,
    width: 28,
    height: 28,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxxl,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: GUIDE_BORDER_RADIUS.xl,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 2,
    borderColor: GUIDE_COLORS.gray200,
    borderStyle: "dashed",
  },
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },
  emptyDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: GUIDE_SPACING.xl,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.xl,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    ...GUIDE_SHADOWS.md,
  },
  emptyButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },
});

export default MediaTab;
