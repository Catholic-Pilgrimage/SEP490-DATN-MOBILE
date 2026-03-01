/**
 * NotificationHandler Component
 * 
 * Handles all notification tap scenarios:
 * 1. Foreground: App is open → tap notification banner → open Notifications screen
 * 2. Background: App in background → tap notification → open Notifications screen
 * 3. Cold start: App was killed → tap notification → open app → open Notifications screen
 * 
 * Always navigates to the Notifications screen so user can see their full notification list.
 */

import * as Notifications from 'expo-notifications';
import React, { useEffect, useRef } from 'react';
import { navigate } from '../navigation/navigationRef';

/**
 * Navigate to Notifications screen
 */
function handleNotificationTap(_response: Notifications.NotificationResponse) {
    console.log('🔔 Notification tapped → opening Notifications screen');
    navigate('Notifications');
}

export const NotificationHandler: React.FC = () => {
    const responseListener = useRef<Notifications.Subscription | null>(null);
    const lastProcessedId = useRef<string | null>(null);

    useEffect(() => {
        // === Handle Background & Foreground tap ===
        responseListener.current = Notifications.addNotificationResponseReceivedListener(
            (response) => {
                const notifId = response.notification.request.identifier;
                if (lastProcessedId.current === notifId) return;
                lastProcessedId.current = notifId;
                handleNotificationTap(response);
            }
        );

        // === Handle Cold Start ===
        Notifications.getLastNotificationResponseAsync().then((response) => {
            if (response) {
                const notifId = response.notification.request.identifier;
                if (lastProcessedId.current === notifId) return;
                lastProcessedId.current = notifId;
                // Delay to ensure navigation is ready after app cold start
                setTimeout(() => {
                    handleNotificationTap(response);
                }, 1000);
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
