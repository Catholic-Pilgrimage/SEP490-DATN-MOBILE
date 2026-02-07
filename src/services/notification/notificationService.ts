/**
 * Push Notification Service
 * Handles Expo push notifications registration and management
 */

import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { Platform } from "react-native";
import notificationApi from "../api/shared/notificationApi";

// Configure notification behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Get Expo Push Token without registering it to backend
 */
export const getExpoPushToken = async (): Promise<string | null> => {
  try {
    // Only works on physical devices
    if (!Device.isDevice) {
      console.warn("Push notifications only work on physical devices");
      return null;
    }

    // Request permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      console.warn("Permission for push notifications denied");
      return null;
    }

    // Get Expo Push Token
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    const tokenData = await Notifications.getExpoPushTokenAsync({
      projectId,
    });

    return tokenData.data;
  } catch (error) {
    console.error("Error getting expo push token:", error);
    return null;
  }
};

/**
 * Register for push notifications
 * - Request permissions
 * - Get Expo Push Token
 * - Send token to backend
 */
export const registerForPushNotifications = async (): Promise<
  string | null
> => {
  try {
    const token = await getExpoPushToken();
    if (!token) return null;

    console.log(" Expo Push Token:", token);

    // Send token to backend with platform info
    await notificationApi.registerPushToken({
      expo_token: token,
      platform: Platform.OS as "android" | "ios",
      device_id: Constants.sessionId || Device.modelId,
    });
    console.log(" Token registered with backend successfully");

    return token;
  } catch (error) {
    console.error("Error registering for push notifications:", error);
    return null;
  }
};

/**
 * Add notification received listener
 */
export const addNotificationReceivedListener = (
  callback: (notification: Notifications.Notification) => void,
) => {
  return Notifications.addNotificationReceivedListener(callback);
};

/**
 * Add notification response listener (when user taps notification)
 */
export const addNotificationResponseListener = (
  callback: (response: Notifications.NotificationResponse) => void,
) => {
  return Notifications.addNotificationResponseReceivedListener(callback);
};

/**
 * Get badge count
 */
export const getBadgeCount = async (): Promise<number> => {
  return await Notifications.getBadgeCountAsync();
};

/**
 * Set badge count
 */
export const setBadgeCount = async (count: number): Promise<void> => {
  await Notifications.setBadgeCountAsync(count);
};

/**
 * Clear all notifications
 */
export const clearAllNotifications = async (): Promise<void> => {
  await Notifications.dismissAllNotificationsAsync();
};

/**
 * Unregister push token (call on logout)
 */
export const unregisterPushToken = async (token: string): Promise<void> => {
  try {
    await notificationApi.revokePushToken({ expo_token: token });
    console.log("Token unregistered successfully");
  } catch (error) {
    console.error("Error unregistering push token:", error);
  }
};

const notificationService = {
  registerForPushNotifications,
  getExpoPushToken,
  unregisterPushToken,
  addNotificationReceivedListener,
  addNotificationResponseListener,
  getBadgeCount,
  setBadgeCount,
  clearAllNotifications,
};

export default notificationService;
