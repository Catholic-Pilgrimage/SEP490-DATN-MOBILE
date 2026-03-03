/**
 * NotificationHandler Component
 *
 * Handles all notification tap scenarios:
 * 1. Foreground: App is open → tap notification banner → open NotificationModal
 * 2. Background: App in background → tap notification → open NotificationModal
 * 3. Cold start: App was killed → tap notification → open app → open NotificationModal
 */

import * as Notifications from "expo-notifications";
import React, { useEffect, useRef } from "react";
import { useNotificationContext } from "../contexts/NotificationContext";

export const NotificationHandler: React.FC = () => {
  const { openModal } = useNotificationContext();
  const openModalRef = useRef(openModal);
  const responseListener = useRef<Notifications.Subscription | null>(null);
  const lastProcessedId = useRef<string | null>(null);

  // Keep ref up to date so cold start setTimeout always calls latest version
  useEffect(() => {
    openModalRef.current = openModal;
  });

  useEffect(() => {
    // === Handle Background & Foreground tap ===
    responseListener.current =
      Notifications.addNotificationResponseReceivedListener((response) => {
        const notifId = response.notification.request.identifier;
        if (lastProcessedId.current === notifId) return;
        lastProcessedId.current = notifId;
        console.log("🔔 Notification tapped → opening NotificationModal");
        openModalRef.current();
      });

    // === Handle Cold Start ===
    // App was killed → user taps notification → app boots → open modal after ready
    Notifications.getLastNotificationResponseAsync().then((response) => {
      if (response) {
        const notifId = response.notification.request.identifier;
        if (lastProcessedId.current === notifId) return;
        lastProcessedId.current = notifId;
        // Delay to ensure app/context/navigation is fully ready after cold start
        setTimeout(() => {
          openModalRef.current();
        }, 1500);
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
    };
  }, []);

  return null;
};
