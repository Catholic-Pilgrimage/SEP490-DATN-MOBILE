/**
 * EventsTab Component
 * Displays events list with status filter, CRUD operations
 * Calls real API: GET /api/local-guide/events
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import { deleteEvent, getEvents } from "../../../../services/api/guide/eventApi";
import { EventItem, EventStatus } from "../../../../types/guide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// ============================================
// TYPES
// ============================================

type StatusFilter = "all" | EventStatus;

interface EventsTabProps {
  onEventPress: (event: EventItem) => void;
  onCreatePress: () => void;
}

// ============================================
// STATUS FILTER COMPONENT
// ============================================

const STATUS_FILTERS: { key: StatusFilter; label: string; color: string; icon?: keyof typeof MaterialIcons.glyphMap }[] = [
  { key: "all", label: "Tất cả", color: GUIDE_COLORS.textMuted },
  { key: "pending", label: "Chờ duyệt", color: GUIDE_COLORS.warning, icon: "schedule" },
  { key: "approved", label: "Đã duyệt", color: GUIDE_COLORS.success, icon: "check-circle" },
  { key: "rejected", label: "Từ chối", color: GUIDE_COLORS.error, icon: "cancel" },
];

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
  status: EventStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getConfig = () => {
    switch (status) {
      case "pending":
        return { bg: "#FFF3E0", color: GUIDE_COLORS.warning, label: "Chờ duyệt" };
      case "approved":
        return { bg: "#E8F5E9", color: GUIDE_COLORS.success, label: "Đã duyệt" };
      case "rejected":
        return { bg: "#FFEBEE", color: GUIDE_COLORS.error, label: "Từ chối" };
    }
  };

  const config = getConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.bg }]}>
      <Text style={[styles.statusBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ============================================
// EVENT CARD COMPONENT
// ============================================

interface EventCardProps {
  event: EventItem;
  onPress: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = ({ event, onPress, onDelete }) => {
  const canEdit = event.status === "pending" || event.status === "rejected";
  
  // Format date display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  // Format time display
  const formatTime = (timeStr: string) => {
    if (!timeStr) return "";
    return timeStr.substring(0, 5); // HH:MM
  };

  return (
    <TouchableOpacity
      style={styles.eventCard}
      onPress={onPress}
      activeOpacity={0.9}
    >
      {/* Banner Image */}
      {event.banner_url ? (
        <Image
          source={{ uri: event.banner_url }}
          style={styles.eventBanner}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.eventBannerPlaceholder}>
          <MaterialIcons name="event" size={40} color={GUIDE_COLORS.gray300} />
        </View>
      )}

      {/* Status Badge */}
      <View style={styles.statusBadgeContainer}>
        <StatusBadge status={event.status} />
      </View>

      {/* Content */}
      <View style={styles.eventContent}>
        <Text style={styles.eventName} numberOfLines={2}>
          {event.name}
        </Text>

        {event.description ? (
          <Text style={styles.eventDescription} numberOfLines={2}>
            {event.description}
          </Text>
        ) : null}

        {/* Date & Time */}
        <View style={styles.eventMeta}>
          <MaterialIcons name="calendar-today" size={14} color={GUIDE_COLORS.primary} />
          <Text style={styles.eventMetaText}>
            {formatDate(event.start_date)}
            {event.end_date && event.end_date !== event.start_date 
              ? ` - ${formatDate(event.end_date)}` 
              : ""}
          </Text>
        </View>

        {(event.start_time || event.end_time) && (
          <View style={styles.eventMeta}>
            <MaterialIcons name="access-time" size={14} color={GUIDE_COLORS.primary} />
            <Text style={styles.eventMetaText}>
              {formatTime(event.start_time)}
              {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
            </Text>
          </View>
        )}

        {event.location && (
          <View style={styles.eventMeta}>
            <MaterialIcons name="location-on" size={14} color={GUIDE_COLORS.primary} />
            <Text style={styles.eventMetaText}>{event.location}</Text>
          </View>
        )}

        {/* Rejection Reason */}
        {event.status === "rejected" && event.rejection_reason && (
          <View style={styles.rejectionBox}>
            <MaterialIcons name="info" size={14} color={GUIDE_COLORS.error} />
            <Text style={styles.rejectionText} numberOfLines={2}>
              {event.rejection_reason}
            </Text>
          </View>
        )}
      </View>

      {/* Actions */}
      {canEdit && (
        <View style={styles.eventActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={onPress}
          >
            <MaterialIcons name="edit" size={18} color={GUIDE_COLORS.primary} />
            <Text style={styles.actionButtonText}>Sửa</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.actionButtonDelete}
            onPress={onDelete}
          >
            <MaterialIcons name="delete-outline" size={18} color={GUIDE_COLORS.error} />
          </TouchableOpacity>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

interface EmptyStateProps {
  onCreatePress: () => void;
  statusFilter: StatusFilter;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreatePress, statusFilter }) => (
  <View style={styles.emptyState}>
    <View style={styles.emptyIconContainer}>
      <MaterialIcons name="event-note" size={48} color={GUIDE_COLORS.gray300} />
    </View>
    <Text style={styles.emptyTitle}>
      {statusFilter === "all" ? "Chưa có sự kiện nào" : `Không có sự kiện ${STATUS_FILTERS.find(f => f.key === statusFilter)?.label.toLowerCase()}`}
    </Text>
    <Text style={styles.emptyDescription}>
      Hãy tạo sự kiện mới cho điểm hành hương của bạn
    </Text>
    {statusFilter === "all" && (
      <TouchableOpacity style={styles.emptyButton} onPress={onCreatePress} activeOpacity={0.8}>
        <MaterialIcons name="add" size={20} color={GUIDE_COLORS.surface} />
        <Text style={styles.emptyButtonText}>Tạo sự kiện</Text>
      </TouchableOpacity>
    )}
  </View>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const EventsTab: React.FC<EventsTabProps> = ({ onEventPress, onCreatePress }) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const fetchEvents = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const params: any = {
        is_active: true,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await getEvents(params);
      
      // Safe check for response structure
      if (response?.success && response?.data) {
        const eventData = response.data.data;
        if (Array.isArray(eventData)) {
          setEvents(eventData);
        } else {
          console.warn("Invalid event data format:", eventData);
          setEvents([]);
        }
      } else {
        console.warn("API response unsuccessful or missing data:", response);
        setEvents([]);
      }
    } catch (error) {
      console.error("Error fetching events:", error);
      // Keep existing events on error during refresh, clear on initial load
      if (!isRefresh) {
        setEvents([]);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter]);

  // Fetch when filter changes
  React.useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  // Refresh on focus
  useFocusEffect(
    useCallback(() => {
      fetchEvents(true);
    }, [fetchEvents])
  );

  const handleRefresh = useCallback(() => {
    fetchEvents(true);
  }, [fetchEvents]);

  const handleDelete = useCallback((event: EventItem) => {
    if (event.status === "approved") {
      Alert.alert("Không thể xóa", "Không thể xóa sự kiện đã được duyệt");
      return;
    }

    Alert.alert(
      "Xóa sự kiện",
      `Bạn có chắc muốn xóa "${event.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              const result = await deleteEvent(event.id);
              if (result?.success) {
                Alert.alert("Thành công", "Đã xóa sự kiện");
                fetchEvents(true);
              } else {
                Alert.alert("Lỗi", result?.message || "Không thể xóa sự kiện");
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.message || "Không thể xóa sự kiện");
            }
          },
        },
      ]
    );
  }, [fetchEvents]);

  const renderEventItem = useCallback(({ item }: { item: EventItem }) => (
    <EventCard
      event={item}
      onPress={() => onEventPress(item)}
      onDelete={() => handleDelete(item)}
    />
  ), [onEventPress, handleDelete]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={GUIDE_COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Status Filter */}
      <View style={styles.filterContainer}>
        {STATUS_FILTERS.map((filter) => (
          <StatusFilterChip
            key={filter.key}
            filter={filter}
            isActive={statusFilter === filter.key}
            onPress={() => setStatusFilter(filter.key)}
          />
        ))}
      </View>

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
          <EmptyState onCreatePress={onCreatePress} statusFilter={statusFilter} />
        }
        ItemSeparatorComponent={() => <View style={{ height: GUIDE_SPACING.md }} />}
      />
    </View>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Filter
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    gap: GUIDE_SPACING.xs,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.xs,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
    backgroundColor: GUIDE_COLORS.surface,
  },
  statusChipText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
  },

  // List
  listContent: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: 120,
  },

  // Event Card
  eventCard: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    ...GUIDE_SHADOWS.md,
  },
  eventBanner: {
    width: "100%",
    height: 140,
  },
  eventBannerPlaceholder: {
    width: "100%",
    height: 100,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
  },
  statusBadgeContainer: {
    position: "absolute",
    top: GUIDE_SPACING.sm,
    right: GUIDE_SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: GUIDE_SPACING.sm,
    paddingVertical: 4,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  statusBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },
  eventContent: {
    padding: GUIDE_SPACING.md,
  },
  eventName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
  },
  eventDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textSecondary,
    marginBottom: GUIDE_SPACING.sm,
  },
  eventMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 4,
  },
  eventMetaText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    flex: 1,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: GUIDE_SPACING.sm,
    padding: GUIDE_SPACING.sm,
    backgroundColor: "#FFEBEE",
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  rejectionText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.error,
    flex: 1,
  },
  eventActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.xs,
    backgroundColor: GUIDE_COLORS.primaryMuted,
    borderRadius: GUIDE_BORDER_RADIUS.sm,
  },
  actionButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.primary,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },
  actionButtonDelete: {
    padding: GUIDE_SPACING.xs,
  },

  // Empty State
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.xxl * 2,
    paddingHorizontal: GUIDE_SPACING.xl,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: GUIDE_COLORS.gray100,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.xs,
    textAlign: "center",
  },
  emptyDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textMuted,
    textAlign: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  emptyButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.surface,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },
});

export default EventsTab;
