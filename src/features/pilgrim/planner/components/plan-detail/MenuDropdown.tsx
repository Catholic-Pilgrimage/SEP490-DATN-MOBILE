import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { COLORS, SHADOWS } from "../../../../../constants/theme.constants";

interface MenuDropdownProps {
  insets: { top: number };
  isPlanOwner: boolean;
  isOffline: boolean;
  isGroupPlan: boolean;
  syncingCalendar: boolean;
  syncingOfflineActions: boolean;
  downloadingOffline: boolean;
  offlineQueueCount: number;
  isAvailableOffline: boolean;
  setShowMenuDropdown: (val: boolean) => void;
  handleOpenEditPlan: () => void;
  handleReloadEta: () => void;
  reloadingEta: boolean;
  showEtaSyncAction?: boolean;
  handleSyncCalendar: () => void;
  handleSyncOfflineActions: () => void;
  handleClearOfflineActions: () => void;
  handleDownloadOffline: () => void;
  handleOpenOfflineDownloads: () => void;
  setShowTransactionsModal: (val: boolean) => void;
  handleDeletePlan: () => void;
  t: (key: string, opts?: any) => string;
}

export const MenuDropdown: React.FC<MenuDropdownProps> = ({
  insets,
  isPlanOwner,
  isOffline,
  isGroupPlan,
  syncingCalendar,
  syncingOfflineActions,
  downloadingOffline,
  offlineQueueCount,
  isAvailableOffline,
  setShowMenuDropdown,
  handleOpenEditPlan,
  handleReloadEta,
  reloadingEta,
  showEtaSyncAction = false,
  handleSyncCalendar,
  handleSyncOfflineActions,
  handleClearOfflineActions,
  handleDownloadOffline,
  handleOpenOfflineDownloads,
  setShowTransactionsModal,
  handleDeletePlan,
  t,
}) => {
  return (
    <TouchableOpacity
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 100,
      }}
      activeOpacity={1}
      onPress={() => setShowMenuDropdown(false)}
    >
      <View
        style={{
          position: "absolute",
          top: insets.top + 45,
          right: 16,
          backgroundColor: "#fff",
          borderRadius: 12,
          padding: 8,
          ...SHADOWS.medium,
          minWidth: 160,
        }}
      >
        {isPlanOwner && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              opacity: isOffline ? 0.5 : 1,
            }}
            onPress={() => {
              setShowMenuDropdown(false);
              handleOpenEditPlan();
            }}
            disabled={isOffline}
          >
            <Ionicons
              name="create-outline"
              size={20}
              color={isOffline ? COLORS.textTertiary : "#C08A2E"}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                color: isOffline ? COLORS.textTertiary : "#C08A2E",
                fontWeight: "500",
              }}
            >
              {t("planner.editPlanMenu")}
            </Text>
          </TouchableOpacity>
        )}
        {isPlanOwner && showEtaSyncAction && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              opacity: isOffline || reloadingEta ? 0.5 : 1,
            }}
            onPress={handleReloadEta}
            disabled={isOffline || reloadingEta}
          >
            <Ionicons
              name="warning-outline"
              size={20}
              color={isOffline || reloadingEta ? COLORS.textTertiary : "#B45309"}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                color: isOffline || reloadingEta ? COLORS.textTertiary : "#B45309",
                fontWeight: "500",
              }}
            >
              {reloadingEta
                ? t("planner.syncingEta", {
                    defaultValue: "Đang đồng bộ lịch trình",
                  })
                : t("planner.syncEtaMenu", {
                    defaultValue: "Đồng bộ lịch trình",
                  })}
            </Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
            opacity: isOffline || syncingCalendar ? 0.5 : 1,
          }}
          onPress={handleSyncCalendar}
          disabled={isOffline || syncingCalendar}
        >
          <Ionicons
            name="calendar-outline"
            size={20}
            color={isOffline || syncingCalendar ? COLORS.textTertiary : "#2563EB"}
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              fontSize: 16,
              color: isOffline || syncingCalendar ? COLORS.textTertiary : "#2563EB",
              fontWeight: "500",
            }}
          >
            {syncingCalendar ? t("planner.syncing") : t("planner.syncCalendar")}
          </Text>
        </TouchableOpacity>

        {offlineQueueCount > 0 && (
          <>
            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
                opacity: isOffline || syncingOfflineActions ? 0.5 : 1,
              }}
              onPress={handleSyncOfflineActions}
              disabled={isOffline || syncingOfflineActions}
            >
              <Ionicons
                name={isOffline ? "cloud-offline-outline" : "sync-outline"}
                size={20}
                color={
                  isOffline || syncingOfflineActions
                    ? COLORS.textTertiary
                    : "#2563EB"
                }
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color:
                    isOffline || syncingOfflineActions
                      ? COLORS.textTertiary
                      : "#2563EB",
                  fontWeight: "500",
                }}
              >
                {syncingOfflineActions
                  ? t("planner.syncing")
                  : `${t("offline.syncOfflineActions")} (${offlineQueueCount})`}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flexDirection: "row",
                alignItems: "center",
                padding: 12,
                borderBottomWidth: 1,
                borderBottomColor: "#F3F4F6",
              }}
              onPress={handleClearOfflineActions}
            >
              <Ionicons
                name="trash-outline"
                size={20}
                color="#DC2626"
                style={{ marginRight: 12 }}
              />
              <Text
                style={{
                  flex: 1,
                  fontSize: 16,
                  color: "#DC2626",
                  fontWeight: "500",
                }}
              >
                {t("offline.clearPendingActions", {
                  defaultValue: "Xóa hàng chờ đồng bộ",
                })}
              </Text>
            </TouchableOpacity>
          </>
        )}

        {/* Offline Download/Delete Button */}
        {!isAvailableOffline ? (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
              opacity: isOffline || downloadingOffline ? 0.5 : 1,
            }}
            onPress={handleDownloadOffline}
            disabled={isOffline || downloadingOffline}
          >
            <Ionicons
              name="cloud-download-outline"
              size={20}
              color={
                isOffline || downloadingOffline ? COLORS.textTertiary : "#10B981"
              }
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                color:
                  isOffline || downloadingOffline ? COLORS.textTertiary : "#10B981",
                fontWeight: "500",
              }}
            >
              {t("offline.downloadForOffline")}
            </Text>
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              borderBottomWidth: 1,
              borderBottomColor: "#F3F4F6",
            }}
            onPress={handleOpenOfflineDownloads}
          >
            <Ionicons
              name="cloud-done-outline"
              size={20}
              color="#F59E0B"
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                color: "#F59E0B",
                fontWeight: "500",
              }}
            >
              {t("offline.manageOfflineData", {
                defaultValue: "Quản lý dữ liệu offline",
              })}
            </Text>
          </TouchableOpacity>
        )}

        {/* Fund Statement — only for group plans */}
        {isGroupPlan && (
        <TouchableOpacity
          style={{
            flexDirection: "row",
            alignItems: "center",
            padding: 12,
            borderBottomWidth: 1,
            borderBottomColor: "#F3F4F6",
            opacity: isOffline ? 0.5 : 1,
          }}
          onPress={() => {
            setShowMenuDropdown(false);
            setShowTransactionsModal(true);
          }}
          disabled={isOffline}
        >
          <Ionicons
            name="wallet-outline"
            size={20}
            color={isOffline ? COLORS.textTertiary : "#8B5CF6"}
            style={{ marginRight: 12 }}
          />
          <Text
            style={{
              fontSize: 16,
              color: isOffline ? COLORS.textTertiary : "#8B5CF6",
              fontWeight: "500",
            }}
          >
            {t("planner.fundStatement", {
              defaultValue: "Sao kê quỹ nhóm",
            })}
          </Text>
        </TouchableOpacity>
        )}

        {isPlanOwner && (
          <TouchableOpacity
            style={{
              flexDirection: "row",
              alignItems: "center",
              padding: 12,
              opacity: isOffline ? 0.5 : 1,
            }}
            onPress={handleDeletePlan}
            disabled={isOffline}
          >
            <Ionicons
              name="trash-outline"
              size={20}
              color={isOffline ? COLORS.textTertiary : "#EF4444"}
              style={{ marginRight: 12 }}
            />
            <Text
              style={{
                fontSize: 16,
                color: isOffline ? COLORS.textTertiary : "#EF4444",
                fontWeight: "500",
              }}
            >
              {t("planner.deletePlanMenu")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </TouchableOpacity>
  );
};
