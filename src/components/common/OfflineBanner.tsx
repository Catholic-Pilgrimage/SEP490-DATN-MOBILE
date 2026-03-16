/**
 * OfflineBanner - Shows offline status in a compact inline pill
 */
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleProp, StyleSheet, Text, View, ViewStyle } from "react-native";
import { useOffline } from "../../hooks/useOffline";
import { COLORS } from "../../constants/theme.constants";

interface OfflineBannerProps {
  style?: StyleProp<ViewStyle>;
}

export const OfflineBanner: React.FC<OfflineBannerProps> = ({ style }) => {
  const { t } = useTranslation();
  const { isOffline, offlineQueueCount } = useOffline();

  if (!isOffline) {
    return null;
  }

  const label = `${t("offline.banner", {
    defaultValue: "Offline mode",
  })}${
    offlineQueueCount > 0
      ? ` • ${offlineQueueCount} ${t("offline.pendingActions", {
          defaultValue: "pending actions",
        })}`
      : ""
  }`;

  return (
    <View style={[styles.banner, style]}>
      <Ionicons
        name="cloud-offline-outline"
        size={16}
        color="#FFFFFF"
        style={styles.icon}
      />
      <Text style={styles.text}>{label}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    maxWidth: "100%",
    backgroundColor: COLORS.danger,
    borderWidth: 1,
    borderColor: "#B53A3A",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    elevation: 4,
    shadowColor: COLORS.danger,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.22,
    shadowRadius: 8,
  },
  icon: {
    marginRight: 8,
  },
  text: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    flexShrink: 1,
  },
});
