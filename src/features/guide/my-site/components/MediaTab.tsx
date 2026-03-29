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
    LayoutChangeEvent,
    RefreshControl,
    SectionList,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import { deleteMedia, getMedia } from "../../../../services/api/guide";
import { MediaItem, MediaStatus, MediaType } from "../../../../types/guide";
import {
  getVideoThumbnail,
  isYoutubeVideoMedia,
  sortMediaByDate,
} from "../../../../utils/mediaUtils";
import { PREMIUM_COLORS } from "../constants";
import {
  GuideFilterIconButton,
  type FilterItem,
} from "./FilterBottomSheet";
import {
    getFabBottomOffset,
    getFabScrollBottomInset,
    GUIDE_FAB_SIZE,
    GuideFabButton,
} from "./GuideFabButton";
import { LocalVideoThumbnail } from "./LocalVideoThumbnail";
import { MediaFilterSheet } from "./MediaFilterSheet";
import { SiteModels3dEntryButton } from "./SiteModels3dEntryButton";
import { GRID_GAP, NUM_COLUMNS, styles } from "./MediaTab.styles";
import { StatusBadge } from "./StatusBadge";

// ============================================
// TYPES
// ============================================

/** Thư viện list: chỉ ảnh + video — mô hình 3D xem ở màn SiteModels3d */
type TypeFilter = "all" | "image" | "video";
type StatusFilter = "all" | MediaStatus;

interface MediaTabProps {
  onMediaPress: (media: MediaItem) => void;
  onUploadPress: () => void;
  /** Nút mô hình 3D (site-media) — full màn, không có trong lưới */
  onOpenSiteModels3d: () => void;
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
    key: "model_3d",
    label: t("mediaTab.typeModel3d"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "view-in-ar",
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
  duration?: number;
}

const MediaTypeIcon: React.FC<MediaTypeIconProps> = ({ type, duration }) => {
  if (type === "image") return null;

  if (type === "model_3d") {
    return (
      <View style={styles.model3dBadge}>
        <MaterialIcons name="view-in-ar" size={12} color="#FFF" />
        <Text style={styles.model3dBadgeText}>3D</Text>
      </View>
    );
  }

  if (type === "video") {
    const formatDuration = (secs: number) => {
      const m = Math.floor(secs / 60);
      const s = Math.floor(secs % 60);
      return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    };

    return (
      <View style={styles.videoIndicator}>
        <Ionicons name="play" size={10} color="#FFF" />
        {duration ? (
          <Text style={styles.videoDuration}>{formatDuration(duration)}</Text>
        ) : null}
      </View>
    );
  }

  return null;
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState: React.FC = () => {
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
    </View>
  );
};

// ============================================
// MEDIA ITEM COMPONENT
// ============================================

interface MediaGridItemProps {
  item: MediaItem;
  itemSize: number;
  onPress: () => void;
  statusFilter: StatusFilter;
  isSelectMode: boolean;
  isSelected: boolean;
  onLongPress: () => void;
}

const MediaGridItem: React.FC<MediaGridItemProps> = ({
  item,
  itemSize,
  onPress,
  statusFilter,
  isSelectMode,
  isSelected,
  onLongPress,
}) => {
  const { t } = useTranslation();

  const isYouTubeVideo = isYoutubeVideoMedia(item);
  const youtubeThumb = isYouTubeVideo
    ? getVideoThumbnail(item.url, "mqdefault")
    : null;

  const imageStyle = [
    styles.gridItemImage,
    isSelectMode && isSelected && styles.gridItemImageSelected,
  ];

  return (
    <TouchableOpacity
      style={[styles.gridItem, { width: itemSize, height: itemSize }]}
      onPress={onPress}
      onLongPress={onLongPress}
      delayLongPress={300}
      activeOpacity={0.85}
    >
      {item.type === "model_3d" ? (
        <View
          style={[
            styles.gridItemImage,
            styles.model3dGridCell,
            isSelectMode && isSelected && styles.gridItemImageSelected,
          ]}
        />
      ) : item.type === "video" && !isYouTubeVideo ? (
        <LocalVideoThumbnail style={imageStyle} />
      ) : (
        <Image
          source={{ uri: youtubeThumb || item.url }}
          style={imageStyle}
          resizeMode="cover"
        />
      )}
      {statusFilter === "all" &&
        item.status !== "approved" &&
        !isSelectMode && (
          <View style={styles.statusBadgeContainer}>
            <StatusBadge
              status={item.status}
              label={getStatusLabel(item.status, t)}
            />
          </View>
        )}
      {!isSelectMode && (
        <MediaTypeIcon type={item.type} duration={item.duration} />
      )}

      {isSelectMode && item.status === "approved" && (
        <View style={styles.approvedLockOverlay}>
          <MaterialIcons name="lock" size={22} color="rgba(255,255,255,0.85)" />
        </View>
      )}
      {isSelectMode && item.status !== "approved" && (
        <View style={styles.selectCheckboxContainer}>
          <MaterialIcons
            name={isSelected ? "check-circle" : "radio-button-unchecked"}
            size={24}
            color={isSelected ? GUIDE_COLORS.primary : "rgba(255,255,255,0.8)"}
          />
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const MediaTab: React.FC<MediaTabProps> = ({
  onMediaPress,
  onUploadPress,
  onOpenSiteModels3d,
}) => {
  const { t } = useTranslation();
  const { confirm, ConfirmModal } = useConfirm();
  const insets = useSafeAreaInsets();
  /** Chiều rộng thực của vùng lưới (sau padding parent) — tránh lệch Dimensions vs layout bị clip cột phải */
  const [gridLayoutWidth, setGridLayoutWidth] = useState(() => {
    const w = Dimensions.get("window").width;
    return Math.max(0, w - GUIDE_SPACING.lg * 2);
  });

  const onGridLayout = useCallback((e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w > 0) setGridLayoutWidth(w);
  }, []);

  const itemSize = useMemo(
    () =>
      Math.max(
        48,
        Math.floor(
          (gridLayoutWidth - GRID_GAP * (NUM_COLUMNS - 1)) / NUM_COLUMNS,
        ),
      ),
    [gridLayoutWidth],
  );

  const sectionListContentStyle = useMemo(
    () => [
      styles.sectionListContent,
      {
        paddingBottom: getFabScrollBottomInset(GUIDE_FAB_SIZE, insets.bottom),
      },
    ],
    [insets.bottom],
  );
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [deletingBatch, setDeletingBatch] = useState(false);

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
      const list: MediaItem[] = [...(response.data?.data || [])];

      return sortMediaByDate(list, "desc");
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

  const handleMediaPress = useCallback(
    (item: MediaItem) => {
      if (isSelectMode) {
        // Approved items cannot be selected for deletion
        if (item.status === "approved") return;
        setSelectedIds((prev) => {
          const next = new Set(prev);
          if (next.has(item.id)) {
            next.delete(item.id);
          } else {
            next.add(item.id);
          }
          return next;
        });
      } else {
        onMediaPress(item);
      }
    },
    [isSelectMode, onMediaPress],
  );

  const handleLongPress = useCallback(
    (item: MediaItem) => {
      // Cannot start select mode from an approved item
      if (item.status === "approved") return;
      if (!isSelectMode) {
        setIsSelectMode(true);
        setSelectedIds(new Set([item.id]));
      }
    },
    [isSelectMode],
  );

  const handleDeleteBatch = useCallback(async () => {
    const confirmed = await confirm({
      type: "danger",
      title: "Xóa ảnh",
      message: `Bạn có chắc chắn muốn xóa ${selectedIds.size} ảnh đã chọn?`,
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (!confirmed) {
      return;
    }

    setDeletingBatch(true);
    try {
      const results = await Promise.allSettled(
        Array.from(selectedIds).map((id) => deleteMedia(id)),
      );
      const failed = results.filter(
        (r) =>
          r.status === "rejected" ||
          (r.status === "fulfilled" && !r.value?.success),
      ).length;
      const succeeded = selectedIds.size - failed;

      if (failed === 0) {
        Toast.show({
          type: "success",
          text1: "Thành công",
          text2: `Đã xóa ${succeeded} ảnh được chọn`,
        });
      } else if (succeeded === 0) {
        Toast.show({
          type: "error",
          text1: "Lỗi",
          text2: "Không thể xóa ảnh nào. Vui lòng thử lại sau.",
        });
      } else {
        Toast.show({
          type: "info",
          text1: "Hoàn tất một phần",
          text2: `Đã xóa ${succeeded} ảnh, ${failed} ảnh thất bại`,
          visibilityTime: 4000,
        });
      }

      setSelectedIds(new Set());
      setIsSelectMode(false);
      refetch();
    } catch {
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Hệ thống xảy ra lỗi không xác định",
      });
    } finally {
      setDeletingBatch(false);
    }

    /*
      "Xóa ảnh",
      `Bạn có chắc chắn muốn xóa ${selectedIds.size} ảnh đã chọn?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            setDeletingBatch(true);
            try {
              const results = await Promise.allSettled(
                Array.from(selectedIds).map((id) => deleteMedia(id)),
              );
              const failed = results.filter(
                (r) =>
                  r.status === "rejected" ||
                  (r.status === "fulfilled" && !r.value?.success),
              ).length;
              const succeeded = selectedIds.size - failed;

              if (failed === 0) {
                Toast.show({
                  type: "success",
                  text1: "Thành công",
                  text2: `Đã xóa ${succeeded} ảnh được chọn`,
                });
              } else if (succeeded === 0) {
                Toast.show({
                  type: "error",
                  text1: "Lỗi",
                  text2: "Không thể xóa ảnh nào. Vui lòng thử lại sau.",
                });
              } else {
                Toast.show({
                  type: "info",
                  text1: "Hoàn tất một phần",
                  text2: `Đã xóa ${succeeded} ảnh, ${failed} ảnh thất bại`,
                  visibilityTime: 4000,
                });
              }

              setSelectedIds(new Set());
              setIsSelectMode(false);
              refetch();
            } catch (e: any) {
              Toast.show({
                type: "error",
                text1: "Lỗi",
                text2: "Hệ thống xảy ra lỗi không xác định",
              });
            } finally {
              setDeletingBatch(false);
            }
          },
        },
      ],
    );
    */
  }, [confirm, refetch, selectedIds]);

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

          dateKey = t("mediaTab.dateFormatWithYear", {
            dayName,
            day,
            month,
            year,
          });
        }

        if (!groups[dateKey]) {
          groups[dateKey] = [];
        }
        groups[dateKey].push(item);
      });

      return Object.entries(groups)
        .map(([title, data]) => {
          // Sort items within group (newest first) to ensure absolute newest item is at index [0]
          data.sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
          const rows = [];
          for (let i = 0; i < data.length; i += NUM_COLUMNS) {
            rows.push(data.slice(i, i + NUM_COLUMNS));
          }
          return { title, data: rows, count: data.length };
        })
        .sort((a, b) => {
          const dateA = new Date(a.data[0]?.[0]?.created_at || 0);
          const dateB = new Date(b.data[0]?.[0]?.created_at || 0);
          return dateB.getTime() - dateA.getTime();
        });
    },
    [t],
  );

  const sections = groupMediaByDate(mediaList);

  const renderGridRow = useCallback(
    (items: MediaItem[], startIndex: number) => (
      <View style={styles.gridRow} key={`row-${startIndex}`}>
        {items.map((item) => (
          <MediaGridItem
            key={item.id}
            item={item}
            itemSize={itemSize}
            onPress={() => handleMediaPress(item)}
            onLongPress={() => handleLongPress(item)}
            statusFilter={statusFilter}
            isSelectMode={isSelectMode}
            isSelected={selectedIds.has(item.id)}
          />
        ))}
        {items.length < NUM_COLUMNS &&
          Array(NUM_COLUMNS - items.length)
            .fill(null)
            .map((_, i) => (
              <View
                key={`empty-${i}`}
                style={[
                  styles.gridItemEmpty,
                  { width: itemSize, height: itemSize },
                ]}
              />
            ))}
      </View>
    ),
    [
      itemSize,
      statusFilter,
      isSelectMode,
      selectedIds,
      handleMediaPress,
      handleLongPress,
    ],
  );

  return (
    <View style={styles.container}>
      {/* Header Container */}
      <View style={styles.headerContainer}>
        <Text
          style={styles.sectionTitleMain}
          numberOfLines={1}
          ellipsizeMode="tail"
          accessibilityRole="header"
        >
          {t("mediaTab.libraryTitleShort", t("mediaTab.libraryTitle"))}
        </Text>

        <View style={styles.headerActions}>
          {/*
            Chỉ icon — tiết kiệm chỗ; nhãn đầy đủ qua accessibility (Material / iOS VoiceOver).
          */}
          <SiteModels3dEntryButton
            variant="toolbar"
            onPress={onOpenSiteModels3d}
            label={t("mediaTab.openSite3d")}
            accessibilityHint={t("mediaTab.openSite3dHint")}
          />

          <GuideFilterIconButton
            filtered={typeFilter !== "all" || statusFilter !== "all"}
            accentColor={GUIDE_COLORS.primary}
            onPress={() => setShowFilterSheet(true)}
            accessibilityLabel={t("mediaTab.filter")}
          />
        </View>
      </View>

      {/* Unified Filter Bottom Sheet */}
      <MediaFilterSheet
        visible={showFilterSheet}
        activeType={typeFilter}
        activeStatus={statusFilter}
        onApply={(type, status) => {
          setTypeFilter(type as TypeFilter);
          setStatusFilter(status as StatusFilter);
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
        <EmptyState />
      ) : (
        <View style={{ flex: 1 }} onLayout={onGridLayout}>
          <SectionList
            sections={sections}
            keyExtractor={(item, index) =>
              (item[0]?.id || "empty") + "-row-" + index
            }
            renderItem={({ item, index }) => renderGridRow(item, index)}
            renderSectionHeader={({ section: { title, count } }) => (
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{title}</Text>
                <Text style={styles.sectionCount}>{count}</Text>
              </View>
            )}
            renderSectionFooter={() => <View style={styles.sectionGrid} />}
            contentContainerStyle={sectionListContentStyle}
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

          {/* Floating Action Bar for Batch Mode */}
          {isSelectMode && (
            <View
              style={[
                styles.actionBar,
                { bottom: getFabBottomOffset(insets.bottom) },
              ]}
            >
              <Text style={styles.actionBarText}>
                Đã chọn {selectedIds.size}
              </Text>
              <View style={styles.actionBarButtons}>
                <TouchableOpacity
                  style={styles.cancelSelectButton}
                  onPress={() => {
                    setIsSelectMode(false);
                    setSelectedIds(new Set());
                  }}
                >
                  <Text style={styles.cancelSelectText}>Hủy</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.deleteBatchButton,
                    selectedIds.size === 0 && styles.disabledButton,
                  ]}
                  onPress={handleDeleteBatch}
                  disabled={selectedIds.size === 0 || deletingBatch}
                >
                  {deletingBatch ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <>
                      <MaterialIcons name="delete" size={18} color="#fff" />
                      <Text style={styles.deleteBatchText}>
                        Xóa ({selectedIds.size})
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      )}

      <GuideFabButton
        onPress={onUploadPress}
        accessibilityLabel={t("mySiteScreen.fabAddMedia")}
        hideOnKeyboard
        style={[
          isSelectMode && {
            opacity: 0,
            pointerEvents: "none",
          },
        ]}
      />
      <ConfirmModal />
    </View>
  );
};

export default MediaTab;
