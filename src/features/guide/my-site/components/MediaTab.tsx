/**
 * MediaTab Component
 * Displays media gallery with Bottom Sheet filter (Gold Standard), badges, and empty state
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useQuery } from "@tanstack/react-query";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  Platform,
  RefreshControl,
  SectionList,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
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

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  goldDark: "#B8960C",
  cream: "#FDF8F0",
  brown: "#8B7355",
  brownLight: "#E8E0D5",
};

const TYPE_FILTERS: { key: TypeFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "all", label: "Tất cả", icon: "apps" },
  { key: "image", label: "Ảnh", icon: "photo" },
  { key: "video", label: "Video", icon: "videocam" },
  { key: "panorama", label: "360°", icon: "panorama-fish-eye" },
];

const STATUS_FILTERS: { key: StatusFilter; label: string; color: string; bgColor: string; icon?: keyof typeof MaterialIcons.glyphMap; description?: string }[] = [
  { key: "all", label: "Tất cả", color: PREMIUM_COLORS.brown, bgColor: PREMIUM_COLORS.brownLight, description: "Hiển thị tất cả media" },
  { key: "pending", label: "Chờ duyệt", color: GUIDE_COLORS.warning, bgColor: "#FFF8E1", icon: "schedule", description: "Media đang chờ phê duyệt" },
  { key: "approved", label: "Đã duyệt", color: GUIDE_COLORS.success, bgColor: "#E8F5E9", icon: "check-circle", description: "Media đã được phê duyệt" },
  { key: "rejected", label: "Từ chối", color: GUIDE_COLORS.error, bgColor: "#FFEBEE", icon: "cancel", description: "Media bị từ chối" },
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

// ============================================
// FILTER BOTTOM SHEET (Gold Standard)
// ============================================

interface FilterBottomSheetProps {
  visible: boolean;
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onClose: () => void;
}

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  activeFilter,
  onFilterChange,
  onClose,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<StatusFilter>(activeFilter);

  React.useEffect(() => {
    if (visible) {
      setSelectedFilter(activeFilter);
    }
  }, [visible, activeFilter]);

  const handleApply = () => {
    onFilterChange(selectedFilter);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback>
            <View style={styles.bottomSheetContainer}>
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>Lọc media</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <View style={styles.filterOptionsContainer}>
                {STATUS_FILTERS.map((filter) => {
                  const isSelected = selectedFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterOption,
                        isSelected && { backgroundColor: filter.bgColor, borderColor: filter.color },
                      ]}
                      onPress={() => setSelectedFilter(filter.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.filterOptionLeft}>
                        <View style={[styles.filterIconContainer, { backgroundColor: filter.bgColor }]}>
                          {filter.icon ? (
                            <MaterialIcons name={filter.icon} size={20} color={filter.color} />
                          ) : (
                            <MaterialIcons name="apps" size={20} color={filter.color} />
                          )}
                        </View>
                        <View style={styles.filterOptionText}>
                          <Text style={[styles.filterOptionLabel, { color: isSelected ? filter.color : GUIDE_COLORS.textPrimary }]}>
                            {filter.label}
                          </Text>
                          {filter.description && (
                            <Text style={styles.filterOptionDescription}>{filter.description}</Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: filter.color }]}>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Apply Button */}
              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Filter Trigger Button
interface FilterTriggerProps {
  activeFilter: StatusFilter;
  onPress: () => void;
}

const FilterTrigger: React.FC<FilterTriggerProps> = ({ activeFilter, onPress }) => {
  const activeFilterInfo = STATUS_FILTERS.find(f => f.key === activeFilter);
  const isFiltered = activeFilter !== "all";

  return (
    <TouchableOpacity
      style={[
        styles.filterTriggerButton,
        isFiltered && { backgroundColor: activeFilterInfo?.bgColor, borderColor: activeFilterInfo?.color },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="filter"
        size={18}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
      <Text style={[
        styles.filterTriggerText,
        isFiltered && { color: activeFilterInfo?.color },
      ]}>
        {isFiltered ? activeFilterInfo?.label : "Lọc"}
      </Text>
      <Ionicons
        name="chevron-down"
        size={16}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
};

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
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);

  const {
    data: mediaList = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: GUIDE_KEYS.media({ type: typeFilter, status: statusFilter, is_active: true }),
    queryFn: async () => {
      const params: any = { is_active: true };
      if (typeFilter !== "all") params.type = typeFilter;
      if (statusFilter !== "all") params.status = statusFilter;

      const response = await getMedia(params);
      if (!response?.success) throw new Error(response?.message || 'Failed to fetch media');
      return response.data?.data || [];
    },
    staleTime: 1000 * 30,
  });

  // Refresh data when screen comes into focus
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const renderItem = useCallback(
    ({ item }: { item: MediaItem }) => (
      <MediaGridItem item={item} onPress={() => onMediaPress(item)} />
    ),
    [onMediaPress]
  );

  const keyExtractor = useCallback((item: MediaItem) => item.id, []);

  // Group media by date (like Photos app)
  const groupMediaByDate = useCallback((items: MediaItem[]) => {
    const groups: Record<string, MediaItem[]> = {};

    items.forEach((item) => {
      const date = new Date(item.created_at);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let dateKey: string;

      if (date.toDateString() === today.toDateString()) {
        dateKey = "Hôm nay";
      } else if (date.toDateString() === yesterday.toDateString()) {
        dateKey = "Hôm qua";
      } else {
        // Format: "Thứ X, DD tháng MM, YYYY" for this year, add year if different
        const dayNames = ["Chủ nhật", "Thứ 2", "Thứ 3", "Thứ 4", "Thứ 5", "Thứ 6", "Thứ 7"];
        const dayName = dayNames[date.getDay()];
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();

        if (year === today.getFullYear()) {
          dateKey = `${dayName}, ${day} tháng ${month}`;
        } else {
          dateKey = `${dayName}, ${day} tháng ${month}, ${year}`;
        }
      }

      if (!groups[dateKey]) {
        groups[dateKey] = [];
      }
      groups[dateKey].push(item);
    });

    // Convert to SectionList format, sorted by most recent first
    return Object.entries(groups)
      .map(([title, data]) => ({ title, data }))
      .sort((a, b) => {
        // Sort by the first item's created_at in each group
        const dateA = new Date(a.data[0]?.created_at || 0);
        const dateB = new Date(b.data[0]?.created_at || 0);
        return dateB.getTime() - dateA.getTime();
      });
  }, []);

  const sections = groupMediaByDate(mediaList);

  // Render a row of grid items (3 per row)
  const renderGridRow = (items: MediaItem[], startIndex: number) => (
    <View style={styles.gridRow} key={`row-${startIndex}`}>
      {items.map((item) => (
        <MediaGridItem key={item.id} item={item} onPress={() => onMediaPress(item)} />
      ))}
      {/* Fill empty spots if less than 3 items */}
      {items.length < NUM_COLUMNS &&
        Array(NUM_COLUMNS - items.length)
          .fill(null)
          .map((_, i) => <View key={`empty-${i}`} style={styles.gridItemEmpty} />)}
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
      {/* Filter Row: Type Filters + Status Filter Trigger */}
      <View style={styles.filterRow}>
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

        {/* Status Filter Trigger */}
        <FilterTrigger
          activeFilter={statusFilter}
          onPress={() => setShowFilterSheet(true)}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onClose={() => setShowFilterSheet(false)}
      />

      {/* Content */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải media...</Text>
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

  // Filter Row
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: GUIDE_SPACING.sm,
  },

  // Filter Trigger Button
  filterTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
  },
  filterTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },

  // Bottom Sheet
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : GUIDE_SPACING.lg,
  },
  handleBarContainer: {
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUIDE_COLORS.gray300,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  closeButton: {
    padding: GUIDE_SPACING.xs,
  },
  filterOptionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: "#FFF",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  filterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionText: {
    gap: 2,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  filterOptionDescription: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetFooter: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
  },
  applyButton: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: "center",
    ...GUIDE_SHADOWS.md,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },

  // Section Headers (grouped by date)
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.xs,
    marginBottom: GUIDE_SPACING.xs,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  sectionCount: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
  },
  sectionListContent: {
    paddingBottom: GUIDE_SPACING.xxl,
  },
  sectionGrid: {
    marginBottom: GUIDE_SPACING.md,
  },
  gridRow: {
    flexDirection: "row",
    gap: GRID_GAP,
    marginBottom: GRID_GAP,
  },
  gridItemEmpty: {
    width: ITEM_SIZE,
    height: ITEM_SIZE,
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
