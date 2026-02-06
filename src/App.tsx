import React from "react";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthProvider } from "./contexts/AuthContext";
import { useNotifications } from "./hooks/useNotifications";
import "./i18n"; // Initialize i18n
import { RootNavigator } from "./navigation/RootNavigator";

export default function App() {
  // Initialize notification listeners
  useNotifications();

  return (
    <SafeAreaProvider>
      <AuthProvider>
        <RootNavigator />
      </AuthProvider>
    </SafeAreaProvider>
  );
}
