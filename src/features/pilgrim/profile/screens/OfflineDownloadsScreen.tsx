import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";

import { OfflineBanner } from "../../../../components/common/OfflineBanner";
import { OfflineDownloadModal } from "../../../../components/ui/OfflineDownloadModal";
import { SHADOWS } from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import useI18n from "../../../../hooks/useI18n";
import { useOfflineDownload } from "../../../../hooks/useOfflineDownload";
import offlinePlannerService, {
  OfflinePlannerSummary,
} from "../../../../services/offline/offlinePlannerService";
import { getRelativeTime } from "../../../../utils/dateUtils";

const THEME = {
  background: "#F7F3EB",
  surface: "rgba(255, 251, 240, 0.92)",
  surfaceSoft: "rgba(255, 248, 236, 0.9)",
  border: "rgba(212, 175, 55, 0.3)",
  borderSoft: "#E4E0D3",
  primary: "#C08A2E",
  primarySoft: "rgba(212, 175, 55, 0.12)",
  secondary: "#2563EB",
  secondarySoft: "#EFF6FF",
  danger: "#DC4C4C",
  dangerSoft: "#FFF1F1",
  success: "#059669",
  successSoft: "#ECFDF5",
  textMain: "#1F2937",
  textMuted: "#6B7280",
  white: "#FFFFFF",
};

const formatBytes = (value: number) => {
  if (value <= 0) {
    return "0 B";
  }

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

const OfflineDownloadsScreen = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const parentNavigation = navigation.getParent();
  const { t, currentLanguage } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
  const {
    downloading,
    progress,
    error,
    success,
    downloadPlanner,
    deleteOfflineData,
    clearAllOfflineData,
    reset,
  } = useOfflineDownload();

  const [plans, setPlans] = useState<OfflinePlannerSummary[]>([]);
  const [stats, setStats] = useState<{
    totalPlanners: number;
    totalSize: number;
    oldestSync: Date | null;
    newestSync: Date | null;
  }>({
    totalPlanners: 0,
    totalSize: 0,
    oldestSync: null,
    newestSync: null,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDownloadModal, setShowDownloadModal] = useState(false);

  const loadOfflineData = useCallback(
    async (showLoader = true) => {
      try {
        if (showLoader) {
          setLoading(true);
        }

        const [offlinePlans, offlineStats] = await Promise.all([
          offlinePlannerService.getAllOfflinePlanners(),
          offlinePlannerService.getOfflineStats(),
        ]);

        setPlans(offlinePlans);
        setStats(offlineStats);
      } catch (error) {
        console.error("Failed to load offline downloads:", error);
        setPlans([]);
        setStats({
          totalPlanners: 0,
          totalSize: 0,
          oldestSync: null,
          newestSync: null,
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      void loadOfflineData();
    }, [loadOfflineData]),
  );

  const openPlannerTab = useCallback(
    (plannerId?: string) => {
      if (plannerId) {
        (parentNavigation as any)?.navigate("Lich trinh", {
          screen: "PlanDetailScreen",
          params: { planId: plannerId },
        });
        return;
      }

      (parentNavigation as any)?.navigate("Lich trinh", {
        screen: "PlannerMain",
      });
    },
    [parentNavigation],
  );

  const handleRefresh = () => {
    setRefreshing(true);
    void loadOfflineData(false);
  };

  const handleUpdatePlan = async (planner: OfflinePlannerSummary) => {
    setShowDownloadModal(true);
    reset();

    const result = await downloadPlanner(planner.id);
    if (result.success) {
      await loadOfflineData(false);
    }
  };

  const handleDeletePlan = async (planner: OfflinePlannerSummary) => {
    const confirmed = await confirm({
      type: "danger",
      title: t("offline.deleteOfflineData", {
        defaultValue: "Delete offline data",
      }),
      message: t("offline.deleteSingleConfirm", {
        defaultValue:
          "Delete offline data for \"{{name}}\" from this device?",
        name: planner.name,
      }),
      confirmText: t("common.delete", { defaultValue: "Delete" }),
      cancelText: t("common.cancel", { defaultValue: "Cancel" }),
    });

    if (!confirmed) {
      return;
    }

    const result = await deleteOfflineData(planner.id);
    if (!result.success) {
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Error" }),
        text2:
          result.message ||
          t("offline.downloadError", {
            defaultValue: "Unable to update offline data",
          }),
      });
      return;
    }

    await loadOfflineData(false);

    Toast.show({
      type: "success",
      text1: t("offline.deleteSuccess", {
        defaultValue: "Deleted offline data",
      }),
      text2: t("offline.deleteSingleSuccess", {
        defaultValue: "\"{{name}}\" has been removed from this device",
        name: planner.name,
      }),
    });
  };

  const handleDeleteAll = async () => {
    const confirmed = await confirm({
      type: "danger",
      title: t("offline.deleteAllTitle", {
        defaultValue: "Delete all offline data",
      }),
      message: t("offline.deleteAllConfirm", {
        defaultValue:
          "Delete all downloaded plans from this device? You can download them again later.",
      }),
      confirmText: t("common.delete", { defaultValue: "Delete" }),
      cancelText: t("common.cancel", { defaultValue: "Cancel" }),
    });

    if (!confirmed) {
      return;
    }

    const result = await clearAllOfflineData();
    if (!result.success) {
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Error" }),
        text2:
          result.message ||
          t("offline.downloadError", {
            defaultValue: "Unable to update offline data",
          }),
      });
      return;
    }

    await loadOfflineData(false);

    Toast.show({
      type: "success",
      text1: t("offline.deleteAllSuccess", {
        defaultValue: "All offline data deleted",
      }),
      text2: t("offline.deleteAllSuccessMsg", {
        defaultValue: "All downloaded plans have been removed",
      }),
    });
  };

  const closeDownloadModal = () => {
    setShowDownloadModal(false);
    reset();
  };

  const renderHeader = () => (
    <View>
      <View style={styles.summaryCard}>
        <View style={styles.summaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{stats.totalPlanners}</Text>
            <Text style={styles.summaryLabel}>
              {t("offline.totalPlans", { defaultValue: "Plans" })}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{formatBytes(stats.totalSize)}</Text>
            <Text style={styles.summaryLabel}>
              {t("offline.storageUsed", { defaultValue: "Storage" })}
            </Text>
          </View>
        </View>

        <View style={styles.summaryMeta}>
          <Ionicons name="time-outline" size={16} color={THEME.textMuted} />
          <Text style={styles.summaryMetaText}>
            {stats.newestSync
              ? t("offline.updatedAt", {
                  defaultValue: "Updated {{time}}",
                  time: getRelativeTime(
                    stats.newestSync.toISOString(),
                    currentLanguage === "en" ? "en" : "vi",
                  ),
                })
              : t("offline.noOfflineData", {
                  defaultValue: "No offline data yet",
                })}
          </Text>
        </View>

        {plans.length > 0 && (
          <TouchableOpacity
            style={styles.deleteAllButton}
            onPress={handleDeleteAll}
            activeOpacity={0.85}
            disabled={downloading}
          >
            <Ionicons name="trash-outline" size={16} color={THEME.danger} />
            <Text style={styles.deleteAllText}>
              {t("offline.deleteAllTitle", {
                defaultValue: "Delete all offline data",
              })}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>
          {t("offline.downloadedPlans", { defaultValue: "Downloaded plans" })}
        </Text>
        {plans.length > 0 && (
          <Text style={styles.sectionSubtitle}>
            {t("offline.planCountSummary", {
              defaultValue: "{{count}} plans",
              count: plans.length,
            })}
          </Text>
        )}
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyState}>
      <View style={styles.emptyIconWrap}>
        <Ionicons name="cloud-offline-outline" size={38} color={THEME.primary} />
      </View>
      <Text style={styles.emptyTitle}>
        {t("offline.emptyTitle", {
          defaultValue: "No offline plans yet",
        })}
      </Text>
      <Text style={styles.emptyMessage}>
        {t("offline.emptyMessage", {
          defaultValue:
            "Download a plan from its detail screen, then manage it here anytime.",
        })}
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={() => openPlannerTab()}
        activeOpacity={0.85}
      >
        <Text style={styles.emptyButtonText}>
          {t("offline.openPlanner", { defaultValue: "Open planner" })}
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderPlannerCard = ({ item }: { item: OfflinePlannerSummary }) => (
    <View style={styles.planCard}>
      <View style={styles.planTopRow}>
        <View style={styles.planImageWrap}>
          {item.coverImage ? (
            <Image
              source={{ uri: item.coverImage }}
              style={styles.planImage}
              resizeMode="cover"
            />
          ) : (
            <View style={styles.planImagePlaceholder}>
              <Ionicons name="map-outline" size={24} color={THEME.primary} />
            </View>
          )}
        </View>

        <View style={styles.planContent}>
          <Text style={styles.planName} numberOfLines={2}>
            {item.name}
          </Text>
          <Text style={styles.planMeta}>
            {t("offline.daysAndSites", {
              defaultValue: "{{days}} days • {{sites}} places",
              days: item.totalDays,
              sites: item.siteCount,
            })}
          </Text>
          <Text style={styles.planMeta}>
            {formatBytes(item.sizeBytes)} •{" "}
            {getRelativeTime(
              item.downloadedAt,
              currentLanguage === "en" ? "en" : "vi",
            )}
          </Text>
        </View>
      </View>

      <View style={styles.planActions}>
        <TouchableOpacity
          style={[styles.secondaryAction, styles.actionButton]}
          onPress={() => openPlannerTab(item.id)}
          activeOpacity={0.85}
        >
          <Ionicons name="eye-outline" size={16} color={THEME.secondary} />
          <Text style={styles.secondaryActionText}>
            {t("offline.viewPlan", { defaultValue: "View" })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.secondaryAction, styles.actionButton]}
          onPress={() => handleUpdatePlan(item)}
          activeOpacity={0.85}
          disabled={downloading}
        >
          <Ionicons
            name="refresh-outline"
            size={16}
            color={downloading ? THEME.textMuted : THEME.success}
          />
          <Text
            style={[
              styles.secondaryActionText,
              { color: downloading ? THEME.textMuted : THEME.success },
            ]}
          >
            {t("offline.updatePlan", { defaultValue: "Update" })}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.dangerAction, styles.actionButton]}
          onPress={() => handleDeletePlan(item)}
          activeOpacity={0.85}
          disabled={downloading}
        >
          <Ionicons name="trash-outline" size={16} color={THEME.danger} />
          <Text style={styles.dangerActionText}>
            {t("common.delete", { defaultValue: "Delete" })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.headerButton}
          onPress={() => navigation.goBack()}
          activeOpacity={0.75}
        >
          <Ionicons name="arrow-back" size={22} color={THEME.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("offline.managerTitle", { defaultValue: "Offline data" })}
        </Text>
        <View style={styles.headerButtonPlaceholder} />
      </View>

      {loading ? (
        <View style={styles.loadingWrap}>
          <ActivityIndicator size="large" color={THEME.primary} />
        </View>
      ) : (
        <FlatList
          data={plans}
          keyExtractor={(item) => item.id}
          renderItem={renderPlannerCard}
          ListHeaderComponent={renderHeader}
          ListEmptyComponent={renderEmptyState}
          contentContainerStyle={[
            styles.listContent,
            plans.length === 0 && styles.listContentEmpty,
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              tintColor={THEME.primary}
              colors={[THEME.primary]}
            />
          }
        />
      )}

      <ConfirmModal />

      <OfflineDownloadModal
        visible={showDownloadModal}
        onClose={closeDownloadModal}
        downloading={downloading}
        progress={progress}
        success={success}
        error={error}
      />

      <OfflineBanner />
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "transparent",
  },
  headerButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surface,
    ...SHADOWS.small,
  },
  headerButtonPlaceholder: {
    width: 40,
    height: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: THEME.textMain,
  },
  loadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 32,
  },
  listContentEmpty: {
    flexGrow: 1,
  },
  summaryCard: {
    marginTop: 20,
    padding: 18,
    borderRadius: 22,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.medium,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  summaryItem: {
    flex: 1,
  },
  summaryDivider: {
    width: 1,
    height: 42,
    backgroundColor: THEME.borderSoft,
    marginHorizontal: 16,
  },
  summaryValue: {
    fontSize: 22,
    fontWeight: "800",
    color: THEME.textMain,
  },
  summaryLabel: {
    marginTop: 4,
    fontSize: 12,
    color: THEME.textMuted,
  },
  summaryMeta: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    gap: 8,
  },
  summaryMetaText: {
    flex: 1,
    fontSize: 13,
    color: THEME.textMuted,
  },
  deleteAllButton: {
    marginTop: 16,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 14,
    backgroundColor: THEME.dangerSoft,
  },
  deleteAllText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.danger,
  },
  sectionHeader: {
    marginTop: 24,
    marginBottom: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textMain,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: THEME.textMuted,
  },
  planCard: {
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    backgroundColor: THEME.surface,
    borderWidth: 1,
    borderColor: THEME.border,
    ...SHADOWS.small,
  },
  planTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  planImageWrap: {
    width: 72,
    height: 72,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: THEME.surfaceSoft,
    marginRight: 14,
  },
  planImage: {
    width: "100%",
    height: "100%",
  },
  planImagePlaceholder: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  planContent: {
    flex: 1,
  },
  planName: {
    fontSize: 16,
    fontWeight: "700",
    color: THEME.textMain,
    marginBottom: 6,
  },
  planMeta: {
    fontSize: 13,
    color: THEME.textMuted,
    lineHeight: 18,
  },
  planActions: {
    flexDirection: "row",
    marginTop: 16,
    gap: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 11,
    borderRadius: 14,
  },
  secondaryAction: {
    backgroundColor: THEME.secondarySoft,
  },
  secondaryActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.secondary,
  },
  dangerAction: {
    backgroundColor: THEME.dangerSoft,
  },
  dangerActionText: {
    fontSize: 13,
    fontWeight: "700",
    color: THEME.danger,
  },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingTop: 80,
  },
  emptyIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: THEME.surfaceSoft,
    marginBottom: 18,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: THEME.textMain,
    textAlign: "center",
  },
  emptyMessage: {
    marginTop: 10,
    fontSize: 14,
    lineHeight: 21,
    color: THEME.textMuted,
    textAlign: "center",
  },
  emptyButton: {
    marginTop: 24,
    paddingHorizontal: 22,
    paddingVertical: 13,
    borderRadius: 18,
    backgroundColor: THEME.primary,
    ...SHADOWS.small,
  },
  emptyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: THEME.white,
  },
});

export default OfflineDownloadsScreen;
