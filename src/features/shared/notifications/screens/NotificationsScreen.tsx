/**
 * Notifications Screen
 * Full-screen version of the notification list
 * Used when navigating from push notification taps
 */

import { Ionicons } from "@expo/vector-icons";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import isToday from "dayjs/plugin/isToday";
import relativeTime from "dayjs/plugin/relativeTime";
import React, { useMemo } from "react";
import {
    ActivityIndicator,
    Platform,
    SectionList,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import {
    GestureHandlerRootView,
    Swipeable,
} from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { COLORS, SPACING } from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useI18n } from "../../../../hooks/useI18n";
import { useNotifications } from "../../../../hooks/useNotifications";
import {
    getNotificationCategory,
    getNotificationColor,
    getNotificationIcon,
    Notification,
    NotificationType,
} from "../../../../services/api/shared/notificationApi";

dayjs.extend(relativeTime);
dayjs.extend(isToday);
dayjs.locale("vi");

const NotificationsScreen = ({ navigation }: any) => {
  const insets = useSafeAreaInsets();
  const { t } = useI18n();
  const { confirmChoice } = useConfirm();
  const {
    notifications,
    unreadCount,
    loading,
    loadingMore,
    hasMore,
    fetchNotifications,
    loadMoreNotifications,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteReadNotifications,
    deleteAllNotifications,
    error,
  } = useNotifications();

  // Fetch on mount
  React.useEffect(() => {
    fetchNotifications(true);
  }, [fetchNotifications]);

  // Group notifications
  const sections = useMemo(() => {
    const now = dayjs();
    const newItems: Notification[] = [];
    const todayItems: Notification[] = [];
    const earlierItems: Notification[] = [];

    notifications.forEach((item) => {
      const itemTime = dayjs(item.createdAt);
      const diffHours = now.diff(itemTime, "hour");
      if (!item.isRead && diffHours < 24) {
        newItems.push(item);
      } else if (itemTime.isToday()) {
        todayItems.push(item);
      } else {
        earlierItems.push(item);
      }
    });

    const result = [];
    if (newItems.length > 0)
      result.push({
        title: t("notificationScreen.sections.newest"),
        data: newItems,
      });
    if (todayItems.length > 0)
      result.push({
        title: t("notificationScreen.sections.today"),
        data: todayItems,
      });
    if (earlierItems.length > 0)
      result.push({
        title: t("notificationScreen.sections.earlier"),
        data: earlierItems,
      });
    return result;
  }, [notifications, t]);

  const getIconInfo = (type: NotificationType) => {
    const category = getNotificationCategory(type);
    let name = getNotificationIcon(type);
    let color = getNotificationColor(type);
    let bg = `${color}15`;

    switch (category) {
      case "shift":
      case "planner":
        name = "calendar";
        color = "#B8860B";
        bg = "rgba(184, 134, 11, 0.12)";
        break;
      case "social":
        bg = `${color}1F`;
        break;
      case "sos":
        name = "alert-circle";
        color = "#D32F2F";
        bg = "rgba(211, 47, 47, 0.12)";
        break;
      case "content":
        if (type.includes("approved")) {
          name = "checkmark-circle";
          color = "#388E3C";
          bg = "rgba(56, 142, 60, 0.12)";
        } else if (
          type.includes("rejected") ||
          ["site_hidden", "content_deleted", "content_warning"].includes(type)
        ) {
          name = "close-circle";
          color = "#D32F2F";
          bg = "rgba(211, 47, 47, 0.12)";
        } else if (
          type.endsWith("_submitted") ||
          type === "site_update_submitted"
        ) {
          name = "document-text";
          color = "#1976D2";
          bg = "rgba(25, 118, 210, 0.12)";
        } else {
          bg = `${color}15`;
        }
        break;
      case "account":
        name = "person";
        color = COLORS.primary;
        bg = "rgba(26, 40, 69, 0.12)";
        break;
      case "review":
        name = "star";
        color = "#D4AF37";
        bg = "rgba(212, 175, 55, 0.14)";
        break;
      case "general":
        name = "notifications";
        color = COLORS.primary;
        bg = `${COLORS.primary}15`;
        break;
    }
    return { name, color, bg };
  };

  const renderRightActions = (id: string) => (
    <TouchableOpacity
      style={styles.deleteAction}
      onPress={() => deleteNotification(id)}
    >
      <Ionicons name="trash-outline" size={24} color="#FFF" />
    </TouchableOpacity>
  );

  const renderItem = ({ item }: { item: Notification }) => {
    const { name, color, bg } = getIconInfo(item.type);

    return (
      <Swipeable renderRightActions={() => renderRightActions(item.id)}>
        <TouchableOpacity
          style={[
            styles.itemContainer,
            !item.isRead ? styles.itemUnread : styles.itemRead,
          ]}
          onPress={() => markAsRead(item.id)}
          activeOpacity={0.7}
        >
          <View style={[styles.iconContainer, { backgroundColor: bg }]}>
            <Ionicons name={name as any} size={24} color={color} />
          </View>
          <View style={styles.itemContent}>
            <View style={styles.itemHeader}>
              <Text
                style={[
                  styles.itemTitle,
                  item.isRead ? styles.textRead : styles.textUnread,
                ]}
                numberOfLines={1}
              >
                {item.title}
              </Text>
              <View style={styles.metaContainer}>
                <Text style={styles.itemTime}>
                  {dayjs(item.createdAt).fromNow()}
                </Text>
                {!item.isRead && <View style={styles.unreadDot} />}
              </View>
            </View>
            <Text
              style={[
                styles.itemMessage,
                item.isRead && { color: COLORS.textTertiary },
              ]}
              numberOfLines={2}
            >
              {item.message}
            </Text>
          </View>
        </TouchableOpacity>
      </Swipeable>
    );
  };

  const renderSectionHeader = ({ section: { title } }: any) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  const handleOpenDeleteConfirm = async () => {
    const action = await confirmChoice({
      type: "danger",
      iconName: "trash-bin-outline",
      title: t("notificationScreen.deleteConfirmTitle"),
      message: t("notificationScreen.deleteConfirmMessage"),
      cancelText: t("common.cancel"),
      secondaryText: t("notificationScreen.deleteRead"),
      confirmText: t("notificationScreen.deleteAll"),
    });

    if (action === "secondary") {
      deleteReadNotifications();
    } else if (action === "confirm") {
      deleteAllNotifications();
    }
  };

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#FFFBF0" }}>
      <View
        style={[
          styles.container,
          { paddingTop: insets.top, paddingBottom: insets.bottom },
        ]}
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="#FFFBF0"
          translucent={false}
        />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("notificationScreen.title")}
          </Text>
          <View style={styles.headerActions}>
            {unreadCount > 0 && (
              <TouchableOpacity
                onPress={markAllAsRead}
                style={styles.actionButton}
              >
                <Ionicons
                  name="checkmark-done-circle-outline"
                  size={26}
                  color={COLORS.primary}
                />
              </TouchableOpacity>
            )}
            {notifications.length > 0 && (
              <TouchableOpacity
                onPress={handleOpenDeleteConfirm}
                style={styles.actionButton}
              >
                <Ionicons
                  name="trash-bin-outline"
                  size={24}
                  color={COLORS.danger || "#f44336"}
                />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Content */}
        {loading && notifications.length === 0 ? (
          <View style={styles.centerContainer}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : notifications.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconBg}>
              <Ionicons
                name="notifications-off-outline"
                size={48}
                color="#D4AF37"
              />
            </View>
            <Text style={styles.emptyTitle}>
              {t("notificationScreen.emptyTitle")}
            </Text>
            <Text style={styles.emptyText}>
              {t("notificationScreen.emptyText")}
            </Text>
          </View>
        ) : (
          <SectionList
            sections={sections}
            keyExtractor={(item) => item.id}
            renderItem={renderItem}
            renderSectionHeader={renderSectionHeader}
            stickySectionHeadersEnabled={false}
            contentContainerStyle={styles.listContent}
            refreshing={loading}
            onRefresh={fetchNotifications}
            showsVerticalScrollIndicator={false}
            onEndReached={() => {
              if (hasMore && !loadingMore && !loading) {
                loadMoreNotifications();
              }
            }}
            onEndReachedThreshold={0.2}
            ListFooterComponent={
              loadingMore ? (
                <View style={styles.footerLoading}>
                  <ActivityIndicator size="small" color={COLORS.primary} />
                </View>
              ) : !hasMore && notifications.length > 0 ? (
                <View style={styles.footerEnd}>
                  <Text style={styles.footerEndText}>
                    {t("notificationScreen.endOfList")}
                  </Text>
                </View>
              ) : (
                <View style={{ height: 40 }} />
              )
            }
          />
        )}
      </View>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFBF0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(212, 175, 55, 0.25)",
    backgroundColor: "#FFFBF0",
  },
  backButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.primary,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 16,
  },
  actionButton: {
    padding: 4,
  },
  listContent: {
    paddingBottom: 40,
  },
  sectionHeader: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: 12,
    backgroundColor: "rgba(255, 248, 225, 0.8)",
  },
  sectionHeaderText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9E9E9E",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  itemContainer: {
    flexDirection: "row",
    paddingVertical: 16,
    paddingHorizontal: SPACING.lg,
    alignItems: "center",
  },
  itemUnread: {
    backgroundColor: "#FEFCE8",
  },
  itemRead: {
    backgroundColor: "transparent",
  },
  unreadDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#D4AF37",
    marginLeft: 6,
  },
  metaContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  itemContent: {
    flex: 1,
  },
  itemHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  itemTitle: {
    fontSize: 15,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: 8,
  },
  textUnread: {
    fontWeight: "700",
  },
  textRead: {
    fontWeight: "400",
    color: "#424242",
  },
  itemTime: {
    fontSize: 12,
    color: "#9E9E9E",
    fontWeight: "500",
  },
  itemMessage: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
  deleteAction: {
    backgroundColor: "#FF3B30",
    justifyContent: "center",
    alignItems: "center",
    width: 80,
  },
  centerContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 40,
  },
  emptyIconBg: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    borderWidth: 1.5,
    borderColor: "rgba(212, 175, 55, 0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
    fontFamily: Platform.OS === "ios" ? "Georgia" : "serif",
  },
  emptyText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
  },
  footerLoading: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  footerEnd: {
    paddingVertical: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  footerEndText: {
    color: "#9E9E9E",
    fontSize: 13,
    fontStyle: "italic",
  },
});

export default NotificationsScreen;
