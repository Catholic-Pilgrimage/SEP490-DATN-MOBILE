/**
 * NotificationItem Component
 * Renders a single notification with appropriate styling based on type
 */

import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import type {
    Notification
} from "../../services/api/shared/notificationApi";
import {
    getNotificationColor,
    getNotificationIcon,
    isNegativeNotification,
    isPositiveNotification,
} from "../../services/api/shared/notificationApi";

interface NotificationItemProps {
  notification: Notification;
  onPress?: () => void;
  onMarkRead?: () => void;
  onDelete?: () => void;
}

export const NotificationItem: React.FC<NotificationItemProps> = ({
  notification,
  onPress,
  onMarkRead,
  onDelete,
}) => {
  const iconName = getNotificationIcon(notification.type);
  const color = getNotificationColor(notification.type);
  const isPositive = isPositiveNotification(notification.type);
  const isNegative = isNegativeNotification(notification.type);

  return (
    <TouchableOpacity
      style={[styles.container, !notification.isRead && styles.unread]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      {/* Left border indicator */}
      <View style={[styles.leftBorder, { backgroundColor: color }]} />

      {/* Icon */}
      <View style={[styles.iconContainer, { backgroundColor: color + "20" }]}>
        <Ionicons name={iconName as any} size={24} color={color} />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <Text style={styles.title} numberOfLines={1}>
          {notification.title}
        </Text>
        <Text style={styles.body} numberOfLines={2}>
          {notification.body}
        </Text>
        <Text style={styles.time}>
          {formatNotificationTime(notification.createdAt)}
        </Text>
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        {!notification.isRead && (
          <TouchableOpacity
            style={styles.actionButton}
            onPress={(e) => {
              e.stopPropagation();
              onMarkRead?.();
            }}
          >
            <Ionicons name="checkmark-circle-outline" size={20} color="#666" />
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            onDelete?.();
          }}
        >
          <Ionicons name="trash-outline" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {/* Unread indicator dot */}
      {!notification.isRead && <View style={styles.unreadDot} />}
    </TouchableOpacity>
  );
};

/**
 * Format notification time (e.g., "5 phút trước", "2 giờ trước")
 */
const formatNotificationTime = (dateString: string): string => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 7) return `${diffDays} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#fff",
    marginHorizontal: 16,
    marginVertical: 6,
    borderRadius: 12,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  unread: {
    backgroundColor: "#f0f8ff",
  },
  leftBorder: {
    width: 4,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    margin: 12,
  },
  content: {
    flex: 1,
    paddingVertical: 12,
    paddingRight: 8,
  },
  title: {
    fontSize: 15,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: "#666",
    lineHeight: 20,
    marginBottom: 4,
  },
  time: {
    fontSize: 12,
    color: "#999",
  },
  actions: {
    flexDirection: "column",
    justifyContent: "center",
    paddingRight: 8,
    gap: 8,
  },
  actionButton: {
    padding: 4,
  },
  unreadDot: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#2196F3",
  },
});

export default NotificationItem;
