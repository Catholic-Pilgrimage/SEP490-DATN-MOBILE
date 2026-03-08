/**
 * EventsTab Component
 * Displays events list with status filter, CRUD operations
 * Calls real API: GET /api/local-guide/events
 * Premium UI Design with Bottom Sheet Filter (Gold Standard)
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
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
import { deleteEvent, getEvents } from "../../../../services/api/guide";
import { EventItem, EventStatus } from "../../../../types/guide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  goldDark: "#B8960C",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  brown: "#8B7355",
  brownLight: "#E8E0D5",
};

// ============================================
// TYPES
// ============================================

type StatusFilter = "all" | EventStatus;

interface EventsTabProps {
  onEventPress: (event: EventItem) => void;
  onCreatePress: () => void;
}

// ============================================
// STATUS FILTER - Bottom Sheet Design (Gold Standard)
// ============================================

type StatusFilterItem = { key: StatusFilter; label: string; color: string; bgColor: string; icon?: keyof typeof MaterialIcons.glyphMap; description?: string };

const getStatusFilters = (t: (key: string) => string): StatusFilterItem[] => [
  { key: "all", label: t("eventsTab.statusAll"), color: PREMIUM_COLORS.brown, bgColor: PREMIUM_COLORS.brownLight, description: t("eventsTab.statusAllDesc") },
  { key: "pending", label: t("eventsTab.statusPending"), color: "#E67E22", bgColor: "#FFF8E1", icon: "schedule", description: t("eventsTab.statusPendingDesc") },
  { key: "approved", label: t("eventsTab.statusApproved"), color: "#27AE60", bgColor: "#E8F5E9", icon: "check-circle", description: t("eventsTab.statusApprovedDesc") },
  { key: "rejected", label: t("eventsTab.statusRejected"), color: "#E74C3C", bgColor: "#FFEBEE", icon: "cancel", description: t("eventsTab.statusRejectedDesc") },
];

interface FilterBottomSheetProps {
  visible: boolean;
  activeFilter: StatusFilter;
  onFilterChange: (filter: StatusFilter) => void;
  onClose: () => void;
  filters: StatusFilterItem[];
}

const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  activeFilter,
  onFilterChange,
  onClose,
  filters,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
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
            <View style={[styles.bottomSheetContainer, { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) }]}>
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>{t("eventsTab.filterTitle")}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <View style={styles.filterOptionsContainer}>
                {filters.map((filter) => {
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
                  <Text style={styles.applyButtonText}>{t("eventsTab.apply")}</Text>
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
  filters: StatusFilterItem[];
}

const FilterTrigger: React.FC<FilterTriggerProps> = ({ activeFilter, onPress, filters }) => {
  const { t } = useTranslation();
  const activeFilterInfo = filters.find(f => f.key === activeFilter);
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
        size={14}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
      <Text style={[
        styles.filterTriggerText,
        isFiltered && { color: activeFilterInfo?.color },
      ]}>
        {isFiltered ? activeFilterInfo?.label : t("eventsTab.filter")}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary}
      />
    </TouchableOpacity>
  );
};

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: EventStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const { t } = useTranslation();
  const getConfig = () => {
    switch (status) {
      case "pending":
        return { bg: "#FFF8E1", color: "#E67E22", label: t("eventsTab.statusPending") };
      case "approved":
        return { bg: "#E8F5E9", color: "#27AE60", label: t("eventsTab.statusApproved") };
      case "rejected":
        return { bg: "#FFEBEE", color: "#E74C3C", label: t("eventsTab.statusRejected") };
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
// EVENT CARD COMPONENT - Premium Design
// Date column on left, content on right, 3-dot menu
// ============================================

interface EventCardProps {
  event: EventItem;
  onPress: () => void;
  onDelete: () => void;
}

const EventCard: React.FC<EventCardProps> = React.memo(({ event, onPress, onDelete }) => {
  const { t } = useTranslation();
  const [showMenu, setShowMenu] = useState(false);
  const canEdit = event.status === "pending" || event.status === "rejected";

  // Format date display
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return {
      day: date.getDate().toString().padStart(2, '0'),
      month: date.toLocaleDateString("vi-VN", { month: "short" }).toUpperCase(),
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
    Alert.alert(
      event.name,
      t("eventsTab.chooseAction"),
      [
        { text: t("eventsTab.edit"), onPress: () => onPress() },
        { text: t("eventsTab.delete"), style: "destructive", onPress: () => onDelete() },
        { text: t("eventsTab.cancel"), style: "cancel" },
      ]
    );
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
              <Ionicons name="ellipsis-vertical" size={18} color={GUIDE_COLORS.gray400} />
            </TouchableOpacity>
          )}
        </View>

        {/* Status Badge - Below title */}
        <View style={styles.badgeRow}>
          <StatusBadge status={event.status} />
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
              <Ionicons name="time-outline" size={14} color={PREMIUM_COLORS.gold} />
              <Text style={styles.metaText}>
                {formatTime(event.start_time)}
                {event.end_time ? ` - ${formatTime(event.end_time)}` : ""}
              </Text>
            </View>
          )}
          {event.location && (
            <View style={styles.metaItem}>
              <Ionicons name="location-outline" size={14} color={PREMIUM_COLORS.gold} />
              <Text style={styles.metaText} numberOfLines={1}>{event.location}</Text>
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
});

// ============================================
// EMPTY STATE COMPONENT - Premium Design
// ============================================

interface EmptyStateProps {
  onCreatePress: () => void;
  statusFilter: StatusFilter;
}

const EmptyState: React.FC<EmptyStateProps & { filters: StatusFilterItem[] }> = ({ onCreatePress, statusFilter, filters }) => {
  const { t } = useTranslation();
  const filterInfo = filters.find(f => f.key === statusFilter);
  return (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconContainer}>
        <Ionicons name="calendar-outline" size={48} color={PREMIUM_COLORS.gold} />
      </View>
      <Text style={styles.emptyTitle}>
        {statusFilter === "all"
          ? t("eventsTab.empty")
          : t("eventsTab.emptyFiltered", { status: filterInfo?.label.toLowerCase() })}
      </Text>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

export const EventsTab: React.FC<EventsTabProps> = ({ onEventPress, onCreatePress }) => {
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
      if (!response?.success) throw new Error(response?.message || 'Failed to fetch events');
      return response.data?.data || [];
    },
    staleTime: 1000 * 30, // 30 seconds stale
  });

  // Refetch on focus to ensure data is fresh
  useFocusEffect(
    useCallback(() => {
      refetch();
    }, [refetch])
  );

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteEvent(id);
      if (!result?.success) throw new Error(result?.message || 'Failed to delete');
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
      Alert.alert(t("common.success"), t("eventsTab.deleteSuccess"));
    },
    onError: (error: any) => {
      Alert.alert(t("common.error"), error.message || t("eventsTab.deleteError"));
    },
  });

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const handleDelete = useCallback((event: EventItem) => {
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
      ]
    );
  }, [deleteMutation, t]);

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
      {/* Header Row */}
      <View style={styles.headerRow}>
        <Text style={styles.sectionTitle}>{t("eventsTab.listTitle")}</Text>
        <FilterTrigger
          activeFilter={statusFilter}
          onPress={() => setShowFilterSheet(true)}
          filters={statusFilters}
        />
      </View>

      {/* Filter Bottom Sheet */}
      <FilterBottomSheet
        visible={showFilterSheet}
        activeFilter={statusFilter}
        onFilterChange={setStatusFilter}
        onClose={() => setShowFilterSheet(false)}
        filters={statusFilters}
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
          <EmptyState onCreatePress={onCreatePress} statusFilter={statusFilter} filters={statusFilters} />
        }
        ItemSeparatorComponent={() => <View style={{ height: GUIDE_SPACING.md }} />}
      />
    </View>
  );
};

// ============================================
// STYLES - Premium Design
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header Row
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
  },
  sectionTitle: {
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

  // List
  listContent: {
    paddingHorizontal: GUIDE_SPACING.md,
    paddingBottom: 120,
  },

  // Event Card - Ticket style with rounded date column
  eventCard: {
    flexDirection: "row",
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    overflow: "hidden",
    minHeight: 110,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.06,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  dateColumn: {
    width: 64,
    backgroundColor: PREMIUM_COLORS.gold,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.lg,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.lg,
    borderBottomLeftRadius: GUIDE_BORDER_RADIUS.lg,
  },
  perforatedLine: {
    width: 2,
    backgroundColor: PREMIUM_COLORS.cream,
    marginVertical: GUIDE_SPACING.sm,
    borderRadius: 1,
  },
  dateDay: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: -0.5,
  },
  dateMonth: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.9)",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  contentColumn: {
    flex: 1,
    padding: GUIDE_SPACING.md,
    paddingLeft: GUIDE_SPACING.sm,
    justifyContent: "center",
    gap: 6,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  menuButton: {
    padding: 6,
    marginRight: -4,
  },
  thumbnail: {
    width: 70,
    height: "100%",
    minHeight: 110,
  },

  // Status Badge
  statusBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  statusBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.3,
  },

  // Event Info
  eventName: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
    flex: 1,
    letterSpacing: -0.3,
  },
  eventDescription: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 18,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GUIDE_SPACING.md,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    color: GUIDE_COLORS.textSecondary,
  },
  rejectionBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: GUIDE_SPACING.xs,
    padding: 6,
    backgroundColor: "#FFEBEE",
    borderRadius: 4,
  },
  rejectionText: {
    fontSize: 11,
    color: "#E74C3C",
    flex: 1,
  },

  // Empty State - Premium
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
    backgroundColor: PREMIUM_COLORS.goldLight,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
  },
  emptyTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeLG,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
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
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: GUIDE_BORDER_RADIUS.md,
  },
  emptyButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: "#FFF",
    fontWeight: "600",
  },
});

export default EventsTab;
