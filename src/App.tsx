import { QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { queryClient } from "./config/query-client";
import { AuthProvider } from "./contexts/AuthContext";
import { useNotifications } from "./hooks/useNotifications";
import "./i18n"; // Initialize i18n
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  // Initialize notification listeners
  useNotifications();

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RootNavigator />
        </AuthProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
