import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ImageBackground,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import useI18n from "../../../../hooks/useI18n";
import { useUserQuery } from "../../../../hooks/useUserQuery";
import pilgrimJournalApi from "../../../../services/api/pilgrim/journalApi";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import {
  CheckInEntity,
  PlanEntity,
} from "../../../../types/pilgrim/planner.types";
import { parsePostgresArray } from "../../../../utils/postgresArrayParser";

const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F4E4BA",
  goldDark: "#B8860B",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  warmGray: "#F7F5F2",
  textMuted: "#6C8CA3",
};

const BG_IMAGE = require("../../../../../assets/images/profile-bg.jpg");

export default function HistoryScreen() {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NativeStackNavigationProp<any>>();
  const { data: user } = useUserQuery();

  const [activeTab, setActiveTab] = useState<"journeys" | "sites">("journeys");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [completedPlans, setCompletedPlans] = useState<PlanEntity[]>([]);
  const [checkIns, setCheckIns] = useState<CheckInEntity[]>([]);
  const [journalCount, setJournalCount] = useState(0);

  const fetchData = async () => {
    try {
      // Fetch Planners
      const plansRes = await pilgrimPlannerApi.getPlans({
        page: 1,
        limit: 100,
        status: "completed",
      });
      if (plansRes.success && plansRes.data) {
        const completed = plansRes.data.planners || [];
        completed.sort(
          (a, b) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        );
        
        // Fetch details for each plan to get items with site images
        const plansWithDetails = await Promise.all(
          completed.map(async (plan) => {
            try {
              const detailRes = await pilgrimPlannerApi.getPlanDetail(plan.id);
              if (detailRes.success && detailRes.data) {
                return detailRes.data;
              }
              return plan;
            } catch (e) {
              console.log(`Failed to fetch detail for plan ${plan.id}:`, e);
              return plan;
            }
          })
        );
        
        setCompletedPlans(plansWithDetails);
      }

      // Fetch Check-ins
      const checkInsRes = await pilgrimPlannerApi.getMyCheckIns({});
      if (checkInsRes.success && checkInsRes.data) {
        // Handle both format { check_ins: [] } array directly
        const checkinsData = Array.isArray(checkInsRes.data)
          ? checkInsRes.data
          : (checkInsRes.data as any).check_ins ||
            (checkInsRes.data as any).data ||
            [];

        const sortedCheckIns = [...checkinsData].sort((a, b) => {
          const dateA =
            a.checked_in_at ||
            (a as any).created_at ||
            (a as any).createdAt ||
            0;
          const dateB =
            b.checked_in_at ||
            (b as any).created_at ||
            (b as any).createdAt ||
            0;
          return new Date(dateB).getTime() - new Date(dateA).getTime();
        });
        setCheckIns(sortedCheckIns);
      }

      // Fetch Journals count
      const journalsRes = await pilgrimJournalApi.getMyJournals({
        page: 1,
        limit: 1,
      });
      if (
        journalsRes.data &&
        journalsRes.data.pagination &&
        journalsRes.data.pagination.total !== undefined
      ) {
        setJournalCount(journalsRes.data.pagination.total);
      } else if (journalsRes.data && journalsRes.data.journals) {
        setJournalCount(journalsRes.data.journals.length);
      }
    } catch (e) {
      console.log("Failed to fetch history:", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const renderStatsCard = () => {
    return (
      <View style={styles.statsCard}>
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{completedPlans.length}</Text>
          <Text style={styles.statLabel}>
            {t("historyScreen.stats.trips", { defaultValue: "Chuyến đi" })}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>
            {(user as any)?.visitedSites ?? checkIns.length}
          </Text>
          <Text style={styles.statLabel}>
            {t("historyScreen.stats.destinations", {
              defaultValue: "Điểm đến",
            })}
          </Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNumber}>{journalCount}</Text>
          <Text style={styles.statLabel}>
            {t("historyScreen.stats.journals", { defaultValue: "Nhật ký" })}
          </Text>
        </View>
      </View>
    );
  };

  const safeDateString = (dateStr: any) => {
    if (!dateStr)
      return t("historyScreen.unknownDate", { defaultValue: "Chưa rõ" });
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // If it's a DD/MM/YYYY format, new Date() will fail. We can just return the raw string.
      return String(dateStr).split("T")[0];
    }
    return d.toLocaleDateString("vi-VN");
  };

  const safeTimeString = (dateStr: any) => {
    if (!dateStr) return "";
    let d = new Date(dateStr);
    if (isNaN(d.getTime())) {
      // Find time part if exists (e.g. "18/4/2026 14:30")
      const parts = String(dateStr).split(" ");
      return parts.length > 1
        ? ` • ${t("historyScreen.at", { defaultValue: "Lúc" })} ${parts[1]}`
        : "";
    }
    return ` • ${t("historyScreen.at", { defaultValue: "Lúc" })} ${d.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}`;
  };

  const LOCAL_FALLBACK = require("../../../../../assets/images/profile-bg.jpg");

  const renderJourneyCard = ({ item }: { item: PlanEntity }) => {
    // Try to get image from: 1) plan cover_image, 2) first site in items, 3) fallback
    let imageSource = LOCAL_FALLBACK;
    
    const coverImage = (item as any).cover_image || (item as any).image;
    if (coverImage) {
      imageSource = { uri: coverImage };
    } else if (item.items && item.items.length > 0) {
      // Try to get from items array
      const firstItem = item.items[0];
      const siteImage =
        firstItem.site?.cover_image ||
        firstItem.site?.image ||
        (firstItem.site as any)?.image_url;
      if (siteImage) {
        imageSource = { uri: siteImage };
      }
    } else if (item.items_by_day) {
      // Get first site image from items_by_day
      const allDays = Object.keys(item.items_by_day);
      for (const day of allDays) {
        const items = item.items_by_day[day];
        if (items && items.length > 0) {
          const firstItem = items[0];
          const siteImage =
            firstItem.site?.cover_image ||
            firstItem.site?.image ||
            (firstItem.site as any)?.image_url;
          if (siteImage) {
            imageSource = { uri: siteImage };
            break;
          }
        }
      }
    }

    const tripDate =
      item.start_date || item.created_at || (item as any).createdAt;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() =>
          navigation.navigate("PlanDetailScreen", { planId: item.id })
        }
        style={styles.journeyCard}
      >
        <ImageBackground source={imageSource} style={styles.journeyImage}>
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.8)"]}
            style={styles.journeyOverlay}
          >
            <View style={styles.journeyBadgeContainer}>
              <View style={styles.journeyStatusBadge}>
                <Ionicons name="checkmark-circle" size={14} color="#FFF" />
                <Text style={styles.journeyStatusText}>
                  {t("historyScreen.completed", {
                    defaultValue: "ĐÃ HOÀN THÀNH",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.journeyContentRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.journeyTitle} numberOfLines={2}>
                  {item.name}
                </Text>

                <View style={styles.journeyMetaRow}>
                  <View style={styles.journeyMetaItem}>
                    <Ionicons name="calendar-outline" size={14} color="#FFF" />
                    <Text style={styles.journeyMetaText}>
                      {safeDateString(tripDate)}
                    </Text>
                  </View>
                  <View style={styles.journeyMetaItem}>
                    <Ionicons name="people-outline" size={14} color="#FFF" />
                    <Text style={styles.journeyMetaText}>
                      {item.number_of_people}{" "}
                      {t("historyScreen.people", { defaultValue: "người" })}
                    </Text>
                  </View>
                </View>
              </View>
              <Ionicons
                name="chevron-forward-circle"
                size={32}
                color="#FFF"
                style={{ opacity: 0.9, marginLeft: 16 }}
              />
            </View>
          </LinearGradient>
        </ImageBackground>
      </TouchableOpacity>
    );
  };

  const renderCheckInCard = ({ item }: { item: CheckInEntity }) => {
    const parsedPhotos = Array.isArray(item.photos)
      ? item.photos
      : item.photos
        ? parsePostgresArray(item.photos as any)
        : [];
    const photoUrl = (item as any).photo_url;
    // Prefer the uploaded check-in photo, fallback to site cover_image, then site image_url
    const siteImage =
      photoUrl ||
      (parsedPhotos.length > 0
        ? parsedPhotos[0]
        : item.site?.cover_image ||
          item.site?.image ||
          (item.site as any)?.image_url);
    const imageSource = siteImage ? { uri: siteImage } : LOCAL_FALLBACK;
    const checkInDateStr =
      (item as any).checkin_date ||
      item.checked_in_at ||
      (item as any).checkin_time ||
      (item as any).created_at ||
      (item as any).createdAt ||
      (item as any).updated_at;

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={styles.checkInCard}
        onPress={() =>
          item.site_id
            ? navigation.navigate("SiteDetail", { siteId: item.site_id })
            : null
        }
      >
        <View style={styles.checkInTimeline}>
          <View style={styles.timelineDot} />
          <View style={styles.timelineLine} />
        </View>
        <View style={styles.checkInContent}>
          <Text style={styles.checkInDate}>
            {safeDateString(checkInDateStr)}
            {safeTimeString(checkInDateStr)}
          </Text>
          <View style={styles.checkInBox}>
            <ImageBackground
              source={imageSource}
              style={styles.checkInImage}
              imageStyle={styles.checkInImageStyle}
            >
              <LinearGradient
                colors={["transparent", "rgba(0,0,0,0.7)"]}
                style={styles.checkInOverlay}
              >
                <Text style={styles.checkInSiteName} numberOfLines={2}>
                  {item.site?.name ||
                    t("historyScreen.unknownLocation", {
                      defaultValue: "Địa điểm chưa rõ",
                    })}
                </Text>
              </LinearGradient>
            </ImageBackground>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ImageBackground
      source={BG_IMAGE}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={PREMIUM_COLORS.charcoal}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("historyScreen.title", { defaultValue: "Hành trình Đức Tin" })}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.listHeaderInner}>
        {renderStatsCard()}

        {/* Tabs */}
        <View style={styles.tabsContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === "journeys" && styles.activeTab]}
            onPress={() => setActiveTab("journeys")}
          >
            <Ionicons
              name="book-outline"
              size={18}
              color={
                activeTab === "journeys"
                  ? PREMIUM_COLORS.goldDark
                  : PREMIUM_COLORS.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "journeys" && styles.activeTabText,
              ]}
            >
              {t("historyScreen.tabs.journeys", {
                defaultValue: "Kỷ niệm chuyến đi",
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === "sites" && styles.activeTab]}
            onPress={() => setActiveTab("sites")}
          >
            <Ionicons
              name="footsteps-outline"
              size={18}
              color={
                activeTab === "sites"
                  ? PREMIUM_COLORS.goldDark
                  : PREMIUM_COLORS.textMuted
              }
            />
            <Text
              style={[
                styles.tabText,
                activeTab === "sites" && styles.activeTabText,
              ]}
            >
              {t("historyScreen.tabs.footprints", { defaultValue: "Dấu chân" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
        </View>
      ) : (
        <FlatList
          data={(activeTab === "journeys" ? completedPlans : checkIns) as any[]}
          keyExtractor={(item: any) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          renderItem={
            activeTab === "journeys"
              ? (renderJourneyCard as any)
              : (renderCheckInCard as any)
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Ionicons
                name={
                  activeTab === "journeys"
                    ? "book-outline"
                    : "footsteps-outline"
                }
                size={64}
                color={PREMIUM_COLORS.goldLight}
              />
              <Text style={styles.emptyTitle}>
                {activeTab === "journeys"
                  ? t("historyScreen.empty.journeys.title", {
                      defaultValue: "Chưa có chuyến đi hoàn thành",
                    })
                  : t("historyScreen.empty.footprints.title", {
                      defaultValue: "Chưa có dấu chân nào",
                    })}
              </Text>
              <Text style={styles.emptyDescription}>
                {activeTab === "journeys"
                  ? t("historyScreen.empty.journeys.description", {
                      defaultValue:
                        "Khi bạn hoàn thành 1 chuyến đi, nó sẽ được lưu lại như một quyển sách kỷ niệm tại đây.",
                    })
                  : t("historyScreen.empty.footprints.description", {
                      defaultValue:
                        "Các địa điểm bạn đã viếng thăm (Check-in) sẽ được lưu lại tại đây.",
                    })}
              </Text>
            </View>
          }
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={[PREMIUM_COLORS.gold]}
            />
          }
        />
      )}
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "transparent" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "rgba(253, 248, 240, 0.95)",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: PREMIUM_COLORS.charcoal,
  },
  headerSpacer: { width: 40 },
  loadingContainer: { flex: 1, justifyContent: "center", alignItems: "center" },
  listHeaderInner: {
    paddingHorizontal: 16,
    paddingTop: 16,
    backgroundColor: "rgba(253, 248, 240, 0.95)",
  },
  listContent: { padding: 16, paddingBottom: 40 },
  statsCard: {
    flexDirection: "row",
    paddingVertical: 16,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.goldLight,
    elevation: 2,
    shadowColor: PREMIUM_COLORS.gold,
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    marginBottom: 20,
  },
  statItem: { flex: 1, alignItems: "center" },
  statNumber: {
    fontSize: 24,
    fontWeight: "700",
    color: PREMIUM_COLORS.goldDark,
  },
  statLabel: {
    fontSize: 13,
    color: PREMIUM_COLORS.textMuted,
    marginTop: 8,
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 36,
    backgroundColor: PREMIUM_COLORS.goldLight,
  },
  tabsContainer: {
    flexDirection: "row",
    backgroundColor: "#EBE6DF",
    padding: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 10,
  },
  activeTab: {
    backgroundColor: "#FFFFFF",
    elevation: 1,
    shadowColor: "#000",
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
  },
  tabText: { fontSize: 14, fontWeight: "600", color: PREMIUM_COLORS.textMuted },
  activeTabText: { color: PREMIUM_COLORS.goldDark, fontWeight: "700" },
  journeyCard: {
    marginBottom: 16,
    borderRadius: 16,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
  },
  journeyImage: { height: 180, width: "100%", justifyContent: "flex-end" },
  journeyOverlay: {
    padding: 16,
    paddingTop: 60,
    flex: 1,
    justifyContent: "flex-end",
  },
  journeyBadgeContainer: { position: "absolute", top: 12, left: 12 },
  journeyStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(46, 204, 113, 0.95)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
  },
  journeyStatusText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#FFFFFF",
    letterSpacing: 0.5,
  },
  journeyContentRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    justifyContent: "space-between",
    flex: 1,
  },
  journeyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  journeyMetaRow: { flexDirection: "row", alignItems: "center", gap: 16 },
  journeyMetaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  journeyMetaText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.9)",
    fontWeight: "500",
  },
  checkInCard: { flexDirection: "row", marginBottom: 16 },
  checkInTimeline: { width: 32, alignItems: "center" },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: PREMIUM_COLORS.gold,
    borderWidth: 3,
    borderColor: PREMIUM_COLORS.goldLight,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: PREMIUM_COLORS.goldLight,
    marginTop: 4,
  },
  checkInContent: { flex: 1, paddingBottom: 16 },
  checkInDate: {
    fontSize: 13,
    color: PREMIUM_COLORS.charcoal,
    fontWeight: "700",
    marginBottom: 8,
    marginLeft: 4,
  },
  checkInBox: {
    borderRadius: 16,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 },
  },
  checkInImage: { width: "100%", height: 140, justifyContent: "flex-end" },
  checkInImageStyle: { borderRadius: 16 },
  checkInOverlay: { padding: 12, paddingTop: 30, borderRadius: 16 },
  checkInSiteName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    marginBottom: 4,
  },
  checkInPlannerInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  checkInPlannerText: {
    fontSize: 12,
    color: PREMIUM_COLORS.goldLight,
    fontWeight: "500",
    flex: 1,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: PREMIUM_COLORS.charcoal,
    marginTop: 16,
  },
  emptyDescription: {
    fontSize: 14,
    color: PREMIUM_COLORS.textMuted,
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
});
