import { QueryClientProvider } from "@tanstack/react-query";
import * as NativeSplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { queryClient } from "./config/query-client";
import { toastConfig } from "./config/toast.config";
import { AuthProvider } from "./contexts/AuthContext";
import {
  NotificationProvider,
  useNotificationContext,
} from "./contexts/NotificationContext";
import { NotificationModal } from "./features/pilgrim/explore/components/NotificationModal";
import { ConfirmProvider } from "./hooks/useConfirm";
import "./i18n";
import { RootNavigator } from "./navigation/RootNavigator";
import offlineSyncServiceInstance from "./services/offline/offlineSyncService";

// Keep the native splash screen visible until we explicitly hide it
NativeSplashScreen.preventAutoHideAsync().catch(() => { });

// Renders the global NotificationModal driven by NotificationContext
const GlobalNotificationModal: React.FC = () => {
  const { showModal, closeModal } = useNotificationContext();
  return <NotificationModal visible={showModal} onClose={closeModal} />;
};

const OfflineSyncToastBridge: React.FC = () => {
  useEffect(() => {
    return offlineSyncServiceInstance.subscribeToSyncResults((result) => {
      if (result.source !== "auto") {
        return;
      }

      const syncedCount = result.synced ?? 0;
      const failedCount = result.failed ?? 0;

      if (syncedCount === 0 && failedCount === 0) {
        return;
      }

      if (result.success && failedCount === 0) {
        Toast.show({
          type: "success",
          text1: "Đã tự động đồng bộ",
          text2: result.message,
          visibilityTime: 4500,
          topOffset: 56,
        });
        return;
      }

      if (syncedCount > 0) {
        Toast.show({
          type: "info",
          text1: "Đồng bộ một phần",
          text2: result.message,
          visibilityTime: 4500,
          topOffset: 56,
        });
        return;
      }

      Toast.show({
        type: "error",
        text1: "Tự động đồng bộ thất bại",
        text2: result.message,
        visibilityTime: 4500,
        topOffset: 56,
      });
    });
  }, []);

  return null;
};

export default function App() {
  const [appIsReady] = useState(true);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide native splash immediately — custom SplashScreen takes over
      await NativeSplashScreen.hideAsync();
    }
  }, [appIsReady]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider onLayout={onLayoutRootView}>
        <QueryClientProvider client={queryClient}>
          <AuthProvider>
            <NotificationProvider>
              <ConfirmProvider>
                <OfflineSyncToastBridge />
                <RootNavigator />
                <GlobalNotificationModal />
                <Toast config={toastConfig} />
              </ConfirmProvider>
            </NotificationProvider>
          </AuthProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
