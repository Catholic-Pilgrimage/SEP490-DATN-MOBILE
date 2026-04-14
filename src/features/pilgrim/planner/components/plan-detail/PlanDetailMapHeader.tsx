import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import type { TFunction } from "i18next";
import {
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  MapPin,
  VietmapView,
  VietmapViewRef,
} from "../../../../../components/map/VietmapView";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../../constants/theme.constants";
import type { PlanEntity } from "../../../../../types/pilgrim/planner.types";
import { getInitialsFromFullName } from "../../../../../utils/initials";
import { getPlannerRosterCount } from "../../utils/planDetailMap.utils";

export type PlanDetailMapHeaderProps = {
  mapRef: React.RefObject<VietmapViewRef | null>;
  mapCenter: { latitude: number; longitude: number; zoom?: number };
  mapPins: MapPin[];
  /** Offline mode — affects menu actions (sync calendar, etc.) */
  isOffline: boolean;
  offlineTileUrlTemplate?: string;
  insetsTop: number;
  navigation: { goBack: () => void };
  plan: PlanEntity;
  translateStatus: (status?: string) => string;
  showMenuDropdown: boolean;
  setShowMenuDropdown: (v: boolean) => void;
  isOnlineOnlyActionDisabled: boolean;
  handleOpenChat: () => void;
  handleOpenShareModal: () => void;
  setShowFullMap: (v: boolean) => void;
  handleOpenEditPlan: () => void;
  handleSyncCalendar: () => void;
  syncingCalendar: boolean;
  offlineQueueCount: number;
  syncingOfflineActions: boolean;
  handleSyncOfflineActions: () => void;
  handleClearOfflineActions: () => void;
  isAvailableOffline: boolean;
  downloadingOffline: boolean;
  handleDownloadOffline: () => void;
  handleOpenOfflineDownloads: () => void;
  setShowTransactionsModal: (v: boolean) => void;
  handleDeletePlan: () => void;
  t: TFunction;
  showShareButton?: boolean;
  showMenuButton?: boolean;
};

export default function PlanDetailMapHeader({
  mapRef,
  mapCenter,
  mapPins,
  isOffline,
  offlineTileUrlTemplate,
  insetsTop,
  navigation,
  plan,
  translateStatus,
  showMenuDropdown,
  setShowMenuDropdown,
  isOnlineOnlyActionDisabled,
  handleOpenChat,
  handleOpenShareModal,
  setShowFullMap,
  handleOpenEditPlan,
  handleSyncCalendar,
  syncingCalendar,
  offlineQueueCount,
  syncingOfflineActions,
  handleSyncOfflineActions,
  handleClearOfflineActions,
  isAvailableOffline,
  downloadingOffline,
  handleDownloadOffline,
  handleOpenOfflineDownloads,
  setShowTransactionsModal,
  handleDeletePlan,
  t,
  showShareButton = true,
  showMenuButton = true,
}: PlanDetailMapHeaderProps) {
  const normalizedPlanName = String(plan.name || "")
    .replace(/\s+/g, " ")
    .trim();
  const titleStyle =
    normalizedPlanName.length > 28
      ? styles.titleSmall
      : normalizedPlanName.length > 20
        ? styles.titleMedium
        : styles.title;

  const rosterCount = getPlannerRosterCount(plan);
  const othersJoined = Math.max(0, rosterCount - 1);

  return (
    <View style={styles.headerImageContainer}>
      <VietmapView
        ref={mapRef}
        initialRegion={mapCenter}
        pins={mapPins}
        scrollEnabled
        showInfoCards
        tileUrlTemplate={isOffline ? offlineTileUrlTemplate : undefined}
        cardBottomOffset={180}
        style={styles.headerImage}
      />
      <LinearGradient
        colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.15)", "transparent"]}
        style={[StyleSheet.absoluteFill, { zIndex: 1, height: "35%" }]}
        pointerEvents="none"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.3)", "rgba(0,0,0,0.75)"]}
        style={[StyleSheet.absoluteFill, { zIndex: 1, top: "55%" }]}
        pointerEvents="none"
      />

      <View style={[styles.navbar, { marginTop: insetsTop, zIndex: 10 }]}>
        <TouchableOpacity
          style={styles.navButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={styles.navActions}>
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => setShowFullMap(true)}
          >
            <Ionicons name="expand-outline" size={22} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.navButton,
              isOnlineOnlyActionDisabled && styles.disabledAction,
            ]}
            onPress={handleOpenChat}
            disabled={isOnlineOnlyActionDisabled}
          >
            <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
          </TouchableOpacity>
          {showShareButton && (
            <TouchableOpacity
              style={[
                styles.navButton,
                isOnlineOnlyActionDisabled && styles.disabledAction,
              ]}
              onPress={handleOpenShareModal}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
            </TouchableOpacity>
          )}
          {showMenuButton && (
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setShowMenuDropdown(true)}
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {showMenuDropdown && (
        <TouchableOpacity
          style={styles.menuBackdrop}
          activeOpacity={1}
          onPress={() => setShowMenuDropdown(false)}
        >
          <View
            style={[
              styles.menuPanel,
              { top: insetsTop + 45 },
            ]}
          >
            {showMenuButton && (
            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenuDropdown(false);
                handleOpenEditPlan();
              }}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons
                name="create-outline"
                size={20}
                color={
                  isOnlineOnlyActionDisabled ? COLORS.textTertiary : "#C08A2E"
                }
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isOnlineOnlyActionDisabled
                      ? COLORS.textTertiary
                      : "#C08A2E",
                  },
                ]}
              >
                {t("planner.editPlanMenu")}
              </Text>
            </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.menuRow}
              onPress={handleSyncCalendar}
              disabled={isOffline || syncingCalendar}
            >
              <Ionicons
                name="calendar-outline"
                size={20}
                color={
                  isOffline || syncingCalendar
                    ? COLORS.textTertiary
                    : "#2563EB"
                }
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color:
                      isOffline || syncingCalendar
                        ? COLORS.textTertiary
                        : "#2563EB",
                  },
                ]}
              >
                {syncingCalendar
                  ? t("planner.syncing")
                  : t("planner.syncCalendar")}
              </Text>
            </TouchableOpacity>

            {offlineQueueCount > 0 && (
              <>
                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={handleSyncOfflineActions}
                  disabled={isOffline || syncingOfflineActions}
                >
                  <Ionicons
                    name={
                      isOffline ? "cloud-offline-outline" : "sync-outline"
                    }
                    size={20}
                    color={
                      isOffline || syncingOfflineActions
                        ? COLORS.textTertiary
                        : "#2563EB"
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={[
                      styles.menuText,
                      styles.menuTextFlex,
                      {
                        color:
                          isOffline || syncingOfflineActions
                            ? COLORS.textTertiary
                            : "#2563EB",
                      },
                    ]}
                  >
                    {syncingOfflineActions
                      ? t("planner.syncing")
                      : `${t("offline.syncOfflineActions")} (${offlineQueueCount})`}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.menuRow}
                  onPress={handleClearOfflineActions}
                >
                  <Ionicons
                    name="trash-outline"
                    size={20}
                    color="#DC2626"
                    style={{ marginRight: 12 }}
                  />
                  <Text style={[styles.menuText, styles.menuTextFlex, { color: "#DC2626" }]}>
                    {t("offline.clearPendingActions", {
                      defaultValue: "Xóa hàng chờ đồng bộ",
                    })}
                  </Text>
                </TouchableOpacity>
              </>
            )}

            {!isAvailableOffline ? (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleDownloadOffline}
                disabled={isOffline || downloadingOffline}
              >
                <Ionicons
                  name="cloud-download-outline"
                  size={20}
                  color={
                    isOffline || downloadingOffline
                      ? COLORS.textTertiary
                      : "#10B981"
                  }
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={[
                    styles.menuText,
                    {
                      color:
                        isOffline || downloadingOffline
                          ? COLORS.textTertiary
                          : "#10B981",
                    },
                  ]}
                >
                  {t("offline.downloadForOffline")}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.menuRow}
                onPress={handleOpenOfflineDownloads}
              >
                <Ionicons
                  name="cloud-done-outline"
                  size={20}
                  color="#F59E0B"
                  style={{ marginRight: 12 }}
                />
                <Text style={[styles.menuText, { color: "#F59E0B" }]}>
                  {t("offline.manageOfflineData", {
                    defaultValue: "Manage offline data",
                  })}
                </Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.menuRow}
              onPress={() => {
                setShowMenuDropdown(false);
                setShowTransactionsModal(true);
              }}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons
                name="wallet-outline"
                size={20}
                color={
                  isOnlineOnlyActionDisabled ? COLORS.textTertiary : "#8B5CF6"
                }
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isOnlineOnlyActionDisabled
                      ? COLORS.textTertiary
                      : "#8B5CF6",
                  },
                ]}
              >
                {t("planner.fundStatement", {
                  defaultValue: "Sao kê quỹ nhóm",
                })}
              </Text>
            </TouchableOpacity>

            {showMenuButton && (
            <TouchableOpacity
              style={[styles.menuRow, { borderBottomWidth: 0 }]}
              onPress={handleDeletePlan}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color={
                  isOnlineOnlyActionDisabled ? COLORS.textTertiary : "#EF4444"
                }
                style={{ marginRight: 12 }}
              />
              <Text
                style={[
                  styles.menuText,
                  {
                    color: isOnlineOnlyActionDisabled
                      ? COLORS.textTertiary
                      : "#EF4444",
                  },
                ]}
              >
                {t("planner.deletePlanMenu")}
              </Text>
            </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      )}

      <View style={[styles.headerContent, { zIndex: 10 }]} pointerEvents="box-none">
        <View style={styles.badgeContainer}>
          <View style={styles.statusBadge}>
            <Text style={styles.statusText}>
              {translateStatus(plan.status)}
            </Text>
          </View>
          {plan.is_public && (
            <View
              style={[
                styles.statusBadge,
                { backgroundColor: "rgba(255,255,255,0.2)" },
              ]}
            >
              <Ionicons
                name="globe-outline"
                size={12}
                color="#fff"
                style={{ marginRight: 4 }}
              />
              <Text style={styles.statusText}>{t("planner.public", { defaultValue: "Công khai" })}</Text>
            </View>
          )}
        </View>
        <Text
          style={titleStyle}
          numberOfLines={2}
          ellipsizeMode="tail"
        >
          {normalizedPlanName || plan.name}
        </Text>
        <View
          style={[
            styles.metaRow,
            {
              justifyContent: "space-between",
              width: "100%",
              alignItems: "center",
            },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <View style={styles.metaItem}>
              <Ionicons
                name="calendar-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.metaText}>
                {plan.start_date
                  ? new Date(plan.start_date).toLocaleDateString("vi-VN")
                  : "—"}
              </Text>
            </View>
            <View style={styles.metaDivider} />
            <View style={styles.metaItem}>
              <Ionicons
                name="time-outline"
                size={16}
                color="rgba(255,255,255,0.9)"
              />
              <Text style={styles.metaText}>{plan.number_of_days} {t("planner.dayLabelMeta")}</Text>
            </View>
          </View>

          <View style={{ flexDirection: "row", alignItems: "center" }}>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                opacity: isOnlineOnlyActionDisabled ? 0.5 : 1,
              }}
              onPress={handleOpenShareModal}
              disabled={isOnlineOnlyActionDisabled}
            >
              <View style={{ flexDirection: "row" }}>
                {plan.owner?.avatar_url ? (
                  <Image
                    source={{ uri: plan.owner.avatar_url }}
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: "#fff",
                    }}
                  />
                ) : (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      borderWidth: 1.5,
                      borderColor: "#fff",
                      backgroundColor: "rgba(201,162,39,0.9)",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: "800",
                      }}
                    >
                      {getInitialsFromFullName(plan.owner?.full_name || "—")}
                    </Text>
                  </View>
                )}
                {othersJoined > 0 && (
                  <View
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 14,
                      backgroundColor: COLORS.accent,
                      justifyContent: "center",
                      alignItems: "center",
                      marginLeft: -10,
                      borderWidth: 1.5,
                      borderColor: "#fff",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 10,
                        color: "#fff",
                        fontWeight: "bold",
                      }}
                    >
                      +{othersJoined}
                    </Text>
                  </View>
                )}
              </View>
              <View
                style={{
                  marginLeft: 8,
                  paddingHorizontal: 12,
                  paddingVertical: 6,
                  borderRadius: 14,
                  backgroundColor: "rgba(255,255,255,0.25)",
                }}
              >
                <Text
                  style={{ color: "#fff", fontSize: 13, fontWeight: "bold" }}
                >
                  {t("planner.inviteCta")}
                </Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  headerImageContainer: {
    width: "100%",
    height: 260,
    position: "relative",
    overflow: "visible",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  navbar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    zIndex: 10,
  },
  navButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    ...SHADOWS.small,
  },
  disabledAction: {
    opacity: 0.5,
  },
  navActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  headerContent: {
    position: "absolute",
    bottom: SPACING.xl,
    left: SPACING.lg,
    right: SPACING.lg,
  },
  badgeContainer: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
  },
  statusText: {
    fontSize: 12,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#fff",
    fontFamily: TYPOGRAPHY.fontFamily.display,
    marginBottom: SPACING.sm,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleMedium: {
    fontSize: 24,
    fontWeight: "800",
    color: "#fff",
    fontFamily: TYPOGRAPHY.fontFamily.display,
    marginBottom: SPACING.sm,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  titleSmall: {
    fontSize: 22,
    fontWeight: "800",
    color: "#fff",
    fontFamily: TYPOGRAPHY.fontFamily.display,
    marginBottom: SPACING.sm,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    color: "rgba(255,255,255,0.9)",
    fontSize: 14,
    fontWeight: "500",
  },
  metaDivider: {
    width: 1,
    height: 14,
    backgroundColor: "rgba(255,255,255,0.4)",
    marginHorizontal: SPACING.md,
  },
  menuBackdrop: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 100,
  },
  menuPanel: {
    position: "absolute",
    right: 16,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 8,
    ...SHADOWS.medium,
    minWidth: 160,
  },
  menuRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  menuText: {
    fontSize: 16,
    fontWeight: "500",
  },
  menuTextFlex: {
    flex: 1,
  },
});
