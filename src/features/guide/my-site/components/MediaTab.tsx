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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { getMedia } from "../../../../services/api/guide";
import { MediaItem, MediaStatus, MediaType } from "../../../../types/guide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const GRID_GAP = 10;
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

type TypeFilterItem = { key: TypeFilter; label: string; icon: keyof typeof MaterialIcons.glyphMap };
type StatusFilterItem = { key: StatusFilter; label: string; color: string; bgColor: string; icon?: keyof typeof MaterialIcons.glyphMap; description?: string };

const getTypeFilters = (t: (key: string) => string): TypeFilterItem[] => [
  { key: "all", label: t("mediaTab.typeAll"), icon: "apps" },
  { key: "image", label: t("mediaTab.typeImage"), icon: "photo" },
  { key: "video", label: t("mediaTab.typeVideo"), icon: "videocam" },
  { key: "panorama", label: t("mediaTab.typePanorama"), icon: "panorama-fish-eye" },
];

const getStatusFilters = (t: (key: string) => string): StatusFilterItem[] => [
  { key: "all", label: t("mediaTab.statusAll"), color: PREMIUM_COLORS.brown, bgColor: PREMIUM_COLORS.brownLight, description: t("mediaTab.statusAllDesc") },
  { key: "pending", label: t("mediaTab.statusPending"), color: GUIDE_COLORS.warning, bgColor: "#FFF8E1", icon: "schedule", description: t("mediaTab.statusPendingDesc") },
  { key: "approved", label: t("mediaTab.statusApproved"), color: GUIDE_COLORS.success, bgColor: "#E8F5E9", icon: "check-circle", description: t("mediaTab.statusApprovedDesc") },
  { key: "rejected", label: t("mediaTab.statusRejected"), color: GUIDE_COLORS.error, bgColor: "#FFEBEE", icon: "cancel", description: t("mediaTab.statusRejectedDesc") },
];



// ============================================
// FILTER BOTTOM SHEET (Gold Standard)
// ============================================

interface FilterBottomSheetProps {
  visible: boolean;
  activeStatusFilter: StatusFilter;
  activeTypeFilter: TypeFilter;
  onFilterChange: (status: StatusFilter, type: TypeFilter) => void;
  onClose: () => void;
  typeFilters: TypeFilterItem[];
  statusFilters: StatusFilterItem[];
}

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  activeStatusFilter,
  activeTypeFilter,
  onFilterChange,
  onClose,
  typeFilters,
  statusFilters,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedStatus, setSelectedStatus] = useState<StatusFilter>(activeStatusFilter);
  const [selectedType, setSelectedType] = useState<TypeFilter>(activeTypeFilter);

  React.useEffect(() => {
    if (visible) {
      setSelectedStatus(activeStatusFilter);
      setSelectedType(activeTypeFilter);
    }
  }, [visible, activeStatusFilter, activeTypeFilter]);

  const handleApply = () => {
    onFilterChange(selectedStatus, selectedType);
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
            <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) }]}>
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>{t("mediaTab.filterTitle")}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Type Options */}
              <View style={styles.filterSectionContainer}>
                <Text style={styles.filterSectionTitle}>{t("mediaTab.typeSection")}</Text>
                <View style={styles.typeGridContainer}>
                  {typeFilters.map((type) => {
                    const isSelected = selectedType === type.key;
                    return (
                      <TouchableOpacity
                        key={type.key}
                        style={[
                          styles.typeGridItem,
                          isSelected && styles.typeGridItemActive,
                        ]}
                        onPress={() => setSelectedType(type.key)}
                        activeOpacity={0.7}
                      >
                        <MaterialIcons
                          name={type.icon}
                          size={20}
                          color={isSelected ? PREMIUM_COLORS.gold : GUIDE_COLORS.textSecondary}
                        />
                        <Text style={[
                          styles.typeGridItemText,
                          isSelected && styles.typeGridItemTextActive
                        ]}>
                          {type.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* Status Options */}
              <View style={styles.filterSectionContainer}>
                <Text style={styles.filterSectionTitle}>{t("mediaTab.statusSection")}</Text>
                <View style={styles.filterOptionsContainer}>
                  {statusFilters.map((filter) => {
                    const isSelected = selectedStatus === filter.key;
                    return (
                      <TouchableOpacity
                        key={filter.key}
                        style={[
                          styles.filterOption,
                          isSelected && { backgroundColor: filter.bgColor, borderColor: filter.color },
                        ]}
                        onPress={() => setSelectedStatus(filter.key)}
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
              </View>

              {/* Apply Button */}
              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>{t("mediaTab.apply")}</Text>
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
  hasFilters: boolean;
  onPress: () => void;
}

const FilterTrigger: React.FC<FilterTriggerProps> = ({ hasFilters, onPress }) => {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={[
        styles.filterTriggerButton,
        hasFilters && { backgroundColor: PREMIUM_COLORS.brownLight, borderColor: PREMIUM_COLORS.brown },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="filter"
        size={14}
        color={hasFilters ? PREMIUM_COLORS.brown : GUIDE_COLORS.textSecondary}
      />
      <Text style={[
        styles.filterTriggerText,
        hasFilters && { color: PREMIUM_COLORS.brown },
      ]}>
        {hasFilters ? t("mediaTab.filterActive") : t("mediaTab.filter")}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={hasFilters ? PREMIUM_COLORS.brown : GUIDE_COLORS.textSecondary}
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
  const { t } = useTranslation();
  const getBadgeConfig = () => {
    switch (status) {
      case "pending":
        return { backgroundColor: "rgba(255, 193, 7, 0.8)", color: "#FFF", label: t("mediaTab.statusPending") };
      case "approved":
        return { backgroundColor: "rgba(76, 175, 80, 0.8)", color: "#FFF", label: t("mediaTab.statusApproved") };
      case "rejected":
        return { backgroundColor: "rgba(244, 67, 54, 0.8)", color: "#FFF", label: t("mediaTab.statusRejected") };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
      <Text style={[styles.statusBadgeText, { color: config.color }]}>{config.label}</Text>
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
        <MaterialIcons name="photo-camera" size={48} color={GUIDE_COLORS.gray300} />
      </View>
      <Text style={styles.emptyTitle}>{t("mediaTab.empty")}</Text>
      <Text style={styles.emptyDescription}>{t("mediaTab.emptyDesc")}</Text>
      <TouchableOpacity style={styles.emptyButton} onPress={onUploadPress} activeOpacity={0.8}>
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
  const { t } = useTranslation();
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const typeFilters = useMemo(() => getTypeFilters(t), [t]);
  const statusFilters = useMemo(() => getStatusFilters(t), [t]);

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
          dateKey = t("mediaTab.dateFormatWithYear", { dayName, day, month, year });
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
  }, [t]);

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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitleMain}>{t("mediaTab.libraryTitle")}</Text>
        <FilterTrigger
          hasFilters={statusFilter !== "all" || typeFilter !== "all"}
          onPress={() => setShowFilterSheet(true)}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeStatusFilter={statusFilter}
        activeTypeFilter={typeFilter}
        onFilterChange={(status, type) => {
          setStatusFilter(status);
          setTypeFilter(type);
        }}
        onClose={() => setShowFilterSheet(false)}
        typeFilters={typeFilters}
        statusFilters={statusFilters}
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  sectionTitleMain: {
    fontSize: 16,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },

  // Filter Trigger Button
  filterTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
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
  filterSectionContainer: {
    marginBottom: GUIDE_SPACING.lg,
  },
  filterSectionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.gray400,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: GUIDE_SPACING.md,
    paddingHorizontal: GUIDE_SPACING.lg,
  },
  typeGridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
  },
  typeGridItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: 10,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: GUIDE_COLORS.gray100,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray100,
  },
  typeGridItemActive: {
    backgroundColor: PREMIUM_COLORS.goldLight + '20',
    borderColor: PREMIUM_COLORS.gold,
  },
  typeGridItemText: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
  typeGridItemTextActive: {
    color: PREMIUM_COLORS.goldDark,
  },
  filterOptionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
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
    paddingBottom: GUIDE_SPACING.md,
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
    paddingVertical: 3,
    paddingHorizontal: 6,
    borderRadius: 6,
    ...Platform.select({
      ios: { shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.15, shadowRadius: 2 },
      android: { elevation: 2 },
    }),
  },
  statusBadgeText: {
    fontSize: 9,
    fontWeight: "700",
  },

  // Media Type Icon
  videoIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
  },
  videoDuration: {
    color: "#FFF",
    fontSize: 9,
    fontWeight: "600",
  },
  panaromaIndicator: {
    position: "absolute",
    bottom: 6,
    right: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 2,
    paddingHorizontal: 4,
    borderRadius: 4,
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
