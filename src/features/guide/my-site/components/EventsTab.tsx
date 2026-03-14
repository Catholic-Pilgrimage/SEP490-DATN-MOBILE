/**
 * EventsTab Component
 * Displays events list with status filter, CRUD operations
 * Calls real API: GET /api/local-guide/events
 * Premium UI Design with Bottom Sheet Filter (Gold Standard)
 */
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Image,
    RefreshControl,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { deleteEvent, getEvents } from "../../../../services/api/guide";
import { EventItem, EventStatus } from "../../../../types/guide";
import { PREMIUM_COLORS } from "../constants";
import { styles } from "./EventsTab.styles";
import type { FilterItem } from "./FilterBottomSheet";
import { FilterBottomSheet, FilterTrigger } from "./FilterBottomSheet";
import { StatusBadge } from "./StatusBadge";

// ============================================
// TYPES
// ============================================

type StatusFilter = "all" | EventStatus;

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
    const [showMenu, setShowMenu] = useState(false);
    const canEdit = event.status === "pending" || event.status === "rejected";

    // Format date display
    const formatDate = (dateStr: string) => {
      const date = new Date(dateStr);
      return {
        day: date.getDate().toString().padStart(2, "0"),
        month: date
          .toLocaleDateString("vi-VN", { month: "short" })
          .toUpperCase(),
        year: date.getFullYear().toString(),
      };
    };

    // Format time display
    const formatTime = (timeStr: string) => {
      if (!timeStr) return "";
      return timeStr.substring(0, 5); // HH:MM
    };

    const dateInfo = formatDate(event.start_date);

    const handleMenuPress = () => {
      if (!canEdit) return;
      Alert.alert(event.name, t("eventsTab.chooseAction"), [
        { text: t("eventsTab.edit"), onPress: () => onPress() },
        {
          text: t("eventsTab.delete"),
          style: "destructive",
          onPress: () => onDelete(),
        },
        { text: t("eventsTab.cancel"), style: "cancel" },
      ]);
    };

    return (
      <TouchableOpacity
        style={styles.eventCard}
        onPress={onPress}
        activeOpacity={0.95}
      >
        {/* Date Column - Rounded corners */}
        <View style={styles.dateColumn}>
          <Text style={styles.dateDay}>{dateInfo.day}</Text>
          <Text style={styles.dateMonth}>{dateInfo.month}</Text>
        </View>

        {/* Perforated Line Effect */}
        <View style={styles.perforatedLine} />

        {/* Content Column */}
        <View style={styles.contentColumn}>
          {/* Header with title */}
          <View style={styles.cardHeader}>
            <Text style={styles.eventName} numberOfLines={1}>
              {event.name}
            </Text>
            {canEdit && (
              <TouchableOpacity
                style={styles.menuButton}
                onPress={handleMenuPress}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons
                  name="ellipsis-vertical"
                  size={18}
                  color={GUIDE_COLORS.gray400}
                />
              </TouchableOpacity>
            )}
          </View>

          {/* Status Badge - Below title */}
          <View style={styles.badgeRow}>
            <StatusBadge status={event.status} label={getStatusLabel(event.status, t)} />
          </View>

          {/* Description */}
          {event.description ? (
            <Text style={styles.eventDescription} numberOfLines={1}>
              {event.description}
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

        {/* Thumbnail */}
        {event.banner_url ? (
          <Image
            source={{ uri: event.banner_url }}
            style={styles.thumbnail}
            resizeMode="cover"
          />
        ) : null}
      </TouchableOpacity>
    );
  },
);

// ============================================
// EMPTY STATE COMPONENT - Premium Design
// ============================================

interface EmptyStateProps {
  onCreatePress: () => void;
  statusFilter: StatusFilter;
}

const EmptyState: React.FC<
  EmptyStateProps & { filters: FilterItem[] }
> = ({ onCreatePress, statusFilter, filters }) => {
  const { t } = useTranslation();
  const filterInfo = filters.find((f) => f.key === statusFilter);
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons
          name="calendar-outline"
          size={48}
          color={PREMIUM_COLORS.gold}
        />
      </View>
      <Text style={styles.emptyTitle}>
        {statusFilter === "all"
          ? t("eventsTab.empty")
          : t("eventsTab.emptyFiltered", {
              status: filterInfo?.label.toLowerCase(),
            })}
      </Text>
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
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const queryClient = useQueryClient();
  const statusFilters = useMemo(() => getStatusFilters(t), [t]);

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
      Alert.alert(t("common.success"), t("eventsTab.deleteSuccess"));
    },
    onError: (error: any) => {
      Alert.alert(
        t("common.error"),
        error.message || t("eventsTab.deleteError"),
      );
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback(
    (event: EventItem) => {
      if (event.status === "approved") {
        Alert.alert(t("common.error"), t("eventsTab.deleteApprovedError"));
        return;
      }

      Alert.alert(
        t("eventsTab.deleteTitle"),
        t("eventsTab.deleteMessage", { name: event.name }),
        [
          { text: t("eventsTab.cancel"), style: "cancel" },
          {
            text: t("eventsTab.delete"),
            style: "destructive",
            onPress: () => deleteMutation.mutate(event.id),
          },
        ],
      );
    },
    [deleteMutation, t],
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
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
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
      />

      {/* Events List */}
      <FlatList
        data={events}
        renderItem={renderEventItem}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
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
            filters={statusFilters}
          />
        }
        ItemSeparatorComponent={() => (
          <View style={{ height: GUIDE_SPACING.md }} />
        )}
      />
    </View>
  );
};

export default EventsTab;
