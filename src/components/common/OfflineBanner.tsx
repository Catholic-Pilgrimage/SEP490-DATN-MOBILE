/**
 * OfflineBanner - Shows offline status at the top of the screen
 */
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, View } from "react-native";
import { useOffline } from "../../hooks/useOffline";

export const OfflineBanner: React.FC = () => {
  const { t } = useTranslation();
  const { isOffline, offlineQueueCount } = useOffline();

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>
        📡 {t("offline.banner", { defaultValue: "Chế độ ngoại tuyến" })}
        {offlineQueueCount > 0 &&
          ` • ${offlineQueueCount} ${t("offline.pendingActions", { defaultValue: "hành động chờ đồng bộ" })}`}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    backgroundColor: "#F59E0B",
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  text: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
});
