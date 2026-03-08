import { QueryClientProvider } from "@tanstack/react-query";
import * as NativeSplashScreen from "expo-splash-screen";
import React, { useCallback, useState } from "react";
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
import "./i18n";
import { RootNavigator } from "./navigation/RootNavigator";

// Keep the native splash screen visible until we explicitly hide it
NativeSplashScreen.preventAutoHideAsync().catch(() => {});

// Renders the global NotificationModal driven by NotificationContext
const GlobalNotificationModal: React.FC = () => {
  const { showModal, closeModal } = useNotificationContext();
  return <NotificationModal visible={showModal} onClose={closeModal} />;
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
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <NotificationProvider>
            <RootNavigator />
            <GlobalNotificationModal />
            <Toast config={toastConfig} />
          </NotificationProvider>
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
