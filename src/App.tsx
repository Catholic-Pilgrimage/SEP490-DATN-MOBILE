import { QueryClientProvider } from "@tanstack/react-query";
import * as NativeSplashScreen from "expo-splash-screen";
import React, { useCallback, useEffect, useState } from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "./config/query-client";
import { AuthProvider } from "./contexts/AuthContext";
import { useNotifications } from "./hooks/useNotifications";
import "./i18n"; // Initialize i18n
import { RootNavigator } from "./navigation/RootNavigator";

// Keep the native splash screen visible until we explicitly hide it
// This prevents the white flash before JS loads
NativeSplashScreen.preventAutoHideAsync().catch(() => {
  // Already hidden or not available in dev mode - safe to ignore
});

export default function App() {
  // Initialize notification listeners
  useNotifications();
  const [appIsReady, setAppIsReady] = useState(false);

  useEffect(() => {
    // App is ready once React tree is mounted
    setAppIsReady(true);
  }, []);

  const onLayoutRootView = useCallback(async () => {
    if (appIsReady) {
      // Hide the native splash screen once our custom SplashScreen is visible
      await NativeSplashScreen.hideAsync();
    }
  }, [appIsReady]);

  return (
    <SafeAreaProvider onLayout={onLayoutRootView}>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
