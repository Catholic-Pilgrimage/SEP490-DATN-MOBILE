/**
 * EventsTab Component
 * Displays events list with status filter, CRUD operations
 * Calls real API: GET /api/local-guide/events
 * Premium UI Design with Bottom Sheet Filter (Gold Standard)
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Swipeable } from "react-native-gesture-handler";
import {
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import { deleteEvent, getEvents } from "../../../../services/api/guide";
import { EventItem, EventStatus } from "../../../../types/guide";
import { PREMIUM_COLORS } from "../constants";
import { styles } from "./EventsTab.styles";
import type { FilterItem } from "./FilterBottomSheet";
import { FilterBottomSheet, FilterTrigger } from "./FilterBottomSheet";
import {
  getFabScrollBottomInset,
  GUIDE_FAB_SIZE,
  GuideFabButton,
} from "./GuideFabButton";
import { StatusBadge } from "./StatusBadge";
import {
  CATEGORY_GROUP_GRADIENTS,
  CategoryGroup,
  CategoryItem,
  getCategoryGradientForList,
  getEventCategoryGroups,
  getEventCategoryLabel,
  resolveEventCategorySlug,
  stripLegacyCategoryTag,
} from "../utils/eventCategoryUi";

// ============================================
// TYPES
// ============================================

type StatusFilter = "all" | EventStatus;

const getCategoryFilterItems = (t: any): FilterItem[] => {
  const all: FilterItem = {
    key: "all",
    label: t("eventsTab.categoryAll"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    icon: "category",
    description: t("eventsTab.categoryAllDesc"),
  };
  
  const groups = getEventCategoryGroups(t);
  const items: FilterItem[] = groups.flatMap((g: CategoryGroup) => g.items).map(
    (item: CategoryItem) => {
      const th = CATEGORY_GROUP_GRADIENTS[item.value];
      return {
        key: item.value,
        label: t(item.labelKey),
        color: th?.colors[1] ?? PREMIUM_COLORS.gold,
        bgColor: "#FFF9F5",
        icon: (th?.icon ?? "event") as string,
      };
    },
  );
  return [all, ...items];
};

interface EventsTabProps {
  onEventPress: (event: EventItem) => void;
  onCreatePress: () => void;
}

// ============================================
// STATUS FILTER DEFINITIONS
// ============================================

const getStatusFilters = (t: (key: string) => string): FilterItem[] => [
  {
    key: "all",
    label: t("eventsTab.statusAll"),
    color: PREMIUM_COLORS.brown,
    bgColor: PREMIUM_COLORS.brownLight,
    description: t("eventsTab.statusAllDesc"),
  },
  {
    key: "pending",
    label: t("eventsTab.statusPending"),
    color: "#E67E22",
    bgColor: "#FFF8E1",
    icon: "schedule",
    description: t("eventsTab.statusPendingDesc"),
  },
  {
    key: "approved",
    label: t("eventsTab.statusApproved"),
    color: "#27AE60",
    bgColor: "#E8F5E9",
    icon: "check-circle",
    description: t("eventsTab.statusApprovedDesc"),
  },
  {
    key: "rejected",
    label: t("eventsTab.statusRejected"),
    color: "#E74C3C",
    bgColor: "#FFEBEE",
    icon: "cancel",
    description: t("eventsTab.statusRejectedDesc"),
  },
];

const getStatusLabel = (
  status: EventStatus,
  t: (key: string) => string,
): string => {
  return t(
    `eventsTab.status${status.charAt(0).toUpperCase() + status.slice(1)}`,
  );
};

const parseDateOnly = (dateStr: string): Date => {
  const [year, month, day] = String(dateStr).split("-").map(Number);
  if (!year || !month || !day) {
    return new Date(dateStr);
  }
  return new Date(year, month - 1, day);
};

const buildDateRangeLabel = (
  startDateStr?: string,
  endDateStr?: string,
) => {
  const start = startDateStr ? parseDateOnly(startDateStr) : null;
  const end = endDateStr ? parseDateOnly(endDateStr) : start;

  if (!start || Number.isNaN(start.getTime())) {
    return {
      isRange: false,
      startDayText: "--",
      startMonthText: "",
      endDayText: "",
      endMonthText: "",
    };
  }

  const safeEnd = end && !Number.isNaN(end.getTime()) ? end : start;
  const locale = "vi-VN";
  const startDay = String(start.getDate()).padStart(2, "0");
  const endDay = String(safeEnd.getDate()).padStart(2, "0");
  const startMonth = start
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "")
    .trim();
  const endMonth = safeEnd
    .toLocaleDateString(locale, { month: "short" })
    .replace(".", "")
    .trim();
  const sameDay =
    start.getFullYear() === safeEnd.getFullYear() &&
    start.getMonth() === safeEnd.getMonth() &&
    start.getDate() === safeEnd.getDate();

  if (sameDay) {
    return {
      isRange: false,
      startDayText: startDay,
      startMonthText: startMonth.charAt(0).toUpperCase() + startMonth.slice(1),
      endDayText: "",
      endMonthText: "",
    };
  }

  return {
    isRange: true,
    startDayText: startDay,
    startMonthText: startMonth.charAt(0).toUpperCase() + startMonth.slice(1),
    endDayText: endDay,
    endMonthText: endMonth.charAt(0).toUpperCase() + endMonth.slice(1),
  };
};

// ============================================
// EVENT CARD COMPONENT - Premium Design
// Date column on left, content on right, 3-dot menu
// ============================================

interface EventCardProps {
  event: EventItem;
  onPress: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = React.memo(
  ({ event, onPress, onDelete }) => {
    const { t } = useTranslation();
    const { confirm, ConfirmModal } = useConfirm();
    const canEdit = event.status === "pending" || event.status === "rejected";

    // Format time display with overnight detection
    const formatTime = (timeStr: string) => {
      if (!timeStr) return "";
      return timeStr.substring(0, 5); // HH:MM
    };

    const toMin = (t: string) => {
      if (!t) return 0;
      const [h, m] = t.split(":").map(Number);
      return h * 60 + (m || 0);
    };

    const isOvernight =
      event.start_time &&
      event.end_time &&
      toMin(event.end_time) < toMin(event.start_time);

    const dateInfo = buildDateRangeLabel(event.start_date, event.end_date);

    const displayDescription = event.description
      ? stripLegacyCategoryTag(event.description)
      : "";

    const gradientTheme = getCategoryGradientForList(
      event.description,
      event.category,
    );

    const categoryLabel = getEventCategoryLabel(event);

    const handleMenuPress = async () => {
      const confirmed = await confirm({
        type: "info",
        iconName: canEdit ? "create-outline" : "eye-outline",
        title: event.name,
        message: t("eventsTab.chooseAction"),
        confirmText: canEdit
          ? t("eventsTab.edit")
          : t("common.viewDetails", { defaultValue: "Xem chi tiết" }),
        cancelText: t("eventsTab.cancel"),
      });
      if (confirmed) {
        onPress();
        return;
        /*
        buttons.unshift({ text: "Xem chi tiết", onPress: () => onPress() });
        */
      }

    };

    const renderRightActions = () => {
      if (!canEdit) return null;
      return (
        <TouchableOpacity
          style={styles.deleteSwipeAction}
          onPress={onDelete}
          activeOpacity={0.8}
        >
          <Ionicons name="trash-outline" size={24} color="#FFF" />
          <Text style={styles.deleteSwipeText}>{t("eventsTab.delete")}</Text>
        </TouchableOpacity>
      );
    };

    return (
      <>
        <Swipeable
          renderRightActions={renderRightActions}
          containerStyle={styles.swipeableContainer}
          overshootRight={false}
        >
          <TouchableOpacity
            style={styles.eventCard}
            onPress={onPress}
            activeOpacity={0.7}
          >
          {/* Date Column */}
          <View style={styles.dateColumn}>
            {!dateInfo.isRange ? (
              <>
                <Text style={styles.dateDay}>{dateInfo.startDayText}</Text>
                <Text style={styles.dateMonth}>{dateInfo.startMonthText}</Text>
              </>
            ) : (
              <View style={styles.dateRangeStack}>
                <Text style={[styles.dateDay, styles.dateDayRangeStart]}>
                  {dateInfo.startDayText}
                </Text>
                <Text style={styles.dateMonth}>{dateInfo.startMonthText}</Text>
                <Text style={styles.dateRangeConnector}>↓</Text>
                <Text style={[styles.dateDay, styles.dateDayRangeEnd]}>
                  {dateInfo.endDayText}
                </Text>
                <Text style={styles.dateMonth}>{dateInfo.endMonthText}</Text>
              </View>
            )}
          </View>

          {/* Content Column */}
          <View style={styles.contentColumn}>
            {/* Header with title and menu */}
            <View style={styles.cardHeader}>
              <Text style={styles.eventName} numberOfLines={2}>
                {event.name}
              </Text>
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleMenuPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={GUIDE_COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Status Badge */}
            <View style={styles.badgeRow}>
              <StatusBadge
                status={event.status}
                label={getStatusLabel(event.status, t)}
              />
              {categoryLabel ? (
                <Text style={styles.categoryChip} numberOfLines={1}>
                  {categoryLabel}
                </Text>
              ) : null}
            </View>

            {/* Description — strip [Category] tag */}
            {displayDescription ? (
              <Text style={styles.eventDescription} numberOfLines={1}>
                {displayDescription}
              </Text>
            ) : null}

            {/* Meta info row */}
            <View style={styles.metaRow}>
              {(event.start_time || event.end_time) && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="time-outline"
                    size={14}
                    color={PREMIUM_COLORS.gold}
                  />
                  <Text style={styles.metaText}>
                    {formatTime(event.start_time)}
                    {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
                  </Text>
                  {isOvernight && (
                    <View style={styles.overnightBadge}>
                      <Text style={styles.overnightText}>+1</Text>
                    </View>
                  )}
                </View>
              )}
              {event.location && (
                <View style={styles.metaItem}>
                  <Ionicons
                    name="location-outline"
                    size={14}
                    color={PREMIUM_COLORS.gold}
                  />
                  <Text style={styles.metaText} numberOfLines={1}>
                    {event.location}
                  </Text>
                </View>
              )}
            </View>

            {/* Rejection Reason */}
            {event.status === "rejected" && event.rejection_reason && (
              <View style={styles.rejectionBox}>
                <Ionicons name="alert-circle" size={14} color="#E74C3C" />
                <Text style={styles.rejectionText} numberOfLines={1}>
                  {event.rejection_reason}
                </Text>
              </View>
            )}

          </View>

          {/* Thumbnail Column with Container */}
          <View style={styles.thumbnailContainer}>
            <View style={styles.thumbnailWrapper}>
              {event.banner_url ? (
                <Image
                  source={{ uri: event.banner_url }}
                  style={styles.thumbnail}
                  resizeMode="cover"
                />
              ) : (
                <LinearGradient
                  colors={gradientTheme.colors}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={[styles.thumbnail, styles.thumbnailGradient]}
                >
                  <MaterialIcons
                    name={gradientTheme.icon}
                    size={24}
                    color="rgba(255,255,255,0.7)"
                  />
                </LinearGradient>
              )}
            </View>
          </View>
          </TouchableOpacity>
        </Swipeable>
        <ConfirmModal />
      </>
    );
  },
);

EventCard.displayName = "EventCard";

// ============================================
// EMPTY STATE COMPONENT - Premium Design
// ============================================

interface EmptyStateProps {
  onCreatePress: () => void;
  statusFilter: StatusFilter;
  categoryFilter: string;
  statusFilters: FilterItem[];
  categoryFilters: FilterItem[];
}

const EmptyState: React.FC<EmptyStateProps> = ({
  onCreatePress,
  statusFilter,
  categoryFilter,
  statusFilters,
  categoryFilters,
}) => {
  const { t } = useTranslation();
  const statusInfo = statusFilters.find((f) => f.key === statusFilter);
  const catInfo = categoryFilters.find((f) => f.key === categoryFilter);
  const noStatusFilter = statusFilter === "all";
  const noCategoryFilter = categoryFilter === "all";

  const title = (() => {
    if (noStatusFilter && noCategoryFilter) return t("eventsTab.empty");
    if (!noStatusFilter && !noCategoryFilter) {
      return t("eventsTab.emptyFilteredBoth", {
        status: (statusInfo?.label ?? "").toLowerCase(),
        category: catInfo?.label ?? "",
      });
    }
    if (!noCategoryFilter) {
      return t("eventsTab.emptyFilteredCategory", {
        category: catInfo?.label ?? "",
      });
    }
    return t("eventsTab.emptyFiltered", {
      status: (statusInfo?.label ?? "").toLowerCase(),
    });
  })();

  const showCreateCta = noStatusFilter && noCategoryFilter;

  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="calendar-outline"
          size={48}
          color={PREMIUM_COLORS.gold}
        />
      </View>
      <Text style={styles.emptyTitle}>{title}</Text>
      {showCreateCta && (
        <TouchableOpacity
          style={styles.emptyButton}
          onPress={onCreatePress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color="#FFF" />
          <Text style={styles.emptyButtonText}>{t("eventsTab.createFirst")}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EventsTab: React.FC<EventsTabProps> = ({
  onEventPress,
  onCreatePress,
}) => {
  const { t } = useTranslation();
  const { confirm, ConfirmModal } = useConfirm();
  const insets = useSafeAreaInsets();
  const listContentStyle = useMemo(
    () => [
      styles.listContent,
      {
        paddingBottom: getFabScrollBottomInset(
          GUIDE_FAB_SIZE,
          insets.bottom,
        ),
      },
    ],
    [insets.bottom],
  );
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const queryClient = useQueryClient();
  const statusFilters = useMemo(() => getStatusFilters(t), [t]);
  const categoryFilters = useMemo(() => getCategoryFilterItems(t), [t]);

  const showInfoDialog = useCallback(
    async (
      title: string,
      message: string,
      type: "danger" | "warning" | "info" = "info",
    ) => {
      await confirm({
        type,
        title,
        message,
        confirmText: t("common.ok", { defaultValue: "OK" }),
        showCancel: false,
      });
    },
    [confirm, t],
  );

  const {
    data: events = [],
    isLoading: loading,
    isRefetching: refreshing,
    refetch,
  } = useQuery({
    queryKey: GUIDE_KEYS.events({ status: statusFilter, is_active: true }),
    queryFn: async () => {
      const params: any = { is_active: true };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await getEvents(params);
      if (!response?.success)
        throw new Error(response?.message || "Failed to fetch events");
      return response.data?.data || [];
    },
    staleTime: 1000 * 30, // 30 seconds stale
  });

  const filteredEvents = useMemo(() => {
    if (categoryFilter === "all") return events;
    return events.filter(
      (e) => resolveEventCategorySlug(e) === categoryFilter,
    );
  }, [events, categoryFilter]);

  // Refetch on focus to ensure data is fresh
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch]),
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEvent(id);
      if (!result?.success)
        throw new Error(result?.message || "Failed to delete");
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
      void showInfoDialog(t("common.success"), t("eventsTab.deleteSuccess"));
    },
    onError: (error: any) => {
      void showInfoDialog(
        t("common.error"),
        error.message || t("eventsTab.deleteError"),
        "warning",
      );
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(
    async (event: EventItem) => {
      if (event.status === "approved") {
        await showInfoDialog(
          t("common.error"),
          t("eventsTab.deleteApprovedError"),
          "warning",
        );
        return;
      }

      const confirmed = await confirm({
        type: "danger",
        title: t("eventsTab.deleteTitle"),
        message: t("eventsTab.deleteMessage", { name: event.name }),
        confirmText: t("eventsTab.delete"),
        cancelText: t("eventsTab.cancel"),
      });

      if (confirmed) {
        deleteMutation.mutate(event.id);
      }
    },
    [confirm, deleteMutation, showInfoDialog, t],
  );

  const renderEventItem = useCallback(
    ({ item }: { item: EventItem }) => (
      <EventCard
        event={item}
        onPress={() => onEventPress(item)}
        onDelete={() => handleDelete(item)}
      />
    ),
    [onEventPress, handleDelete],
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
        </View>
        <GuideFabButton
          onPress={onCreatePress}
          accessibilityLabel={t("mySiteScreen.fabAddEvent")}
          hideOnKeyboard
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t("eventsTab.listTitle")}</Text>
        <FilterTrigger
          activeFilter={statusFilter}
          onPress={() => setShowFilterSheet(true)}
          filters={statusFilters}
          defaultLabel={t("eventsTab.filter")}
          secondaryActiveFilter={categoryFilter}
          secondaryFilters={categoryFilters}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={(filter) => setStatusFilter(filter as StatusFilter)}
        onClose={() => setShowFilterSheet(false)}
        filters={statusFilters}
        title={t("eventsTab.filterTitle")}
        primarySectionTitle={t("eventsTab.filterSectionStatus")}
        secondarySectionTitle={t("eventsTab.filterSectionCategory")}
        secondaryFilters={categoryFilters}
        activeSecondaryFilter={categoryFilter}
        onSecondaryFilterChange={setCategoryFilter}
      />

      {/* Events List */}
      <FlatList
        data={filteredEvents}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={listContentStyle}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={handleRefresh}
            colors={[GUIDE_COLORS.primary]}
            tintColor={GUIDE_COLORS.primary}
          />
        }
        ListEmptyComponent={
          <EmptyState
            onCreatePress={onCreatePress}
            statusFilter={statusFilter}
            categoryFilter={categoryFilter}
            statusFilters={statusFilters}
            categoryFilters={categoryFilters}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: GUIDE_SPACING.md }} />
        )}
      />

      <GuideFabButton
        onPress={onCreatePress}
        accessibilityLabel={t("mySiteScreen.fabAddEvent")}
        hideOnKeyboard
      />
      <ConfirmModal />
    </View>
  );
};

export default EventsTab;
