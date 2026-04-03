import { Ionicons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react";
import {
  ActivityIndicator,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import PlanHeader from "../components/active-journey/PlanHeader";
import TimelineDaySection from "../components/active-journey/TimelineDaySection";
import { useJourneyExecution } from "../hooks/useJourneyExecution";
import { usePlanData } from "../hooks/usePlanData";
import { SOSRequestModal } from "../components/active-journey/SOSRequestModal";

type Props = {
  route: { params?: { planId?: string } };
  navigation: any;
};

export default function ActiveJourneyScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const planId = route.params?.planId || "";
  const { user } = useAuth();
  const {
    plan,
    loading,
    error,
    sortedDays,
    firstItem,
    mapPins,
    mapCenter,
    refreshPlan,
  } = usePlanData(planId);

  const todayIdx = useMemo(() => {
    if (!plan?.start_date || !sortedDays.length) return -1;
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0]; // "YYYY-MM-DD"
    
    return sortedDays.findIndex((_, idx) => {
      const d = new Date(plan.start_date!);
      d.setDate(d.getDate() + idx);
      return d.toISOString().split("T")[0] === todayStr;
    });
  }, [plan?.start_date, sortedDays]);

  const [selectedDay, setSelectedDay] = React.useState("");
  const [checkedInIds, setCheckedInIds] = React.useState<Set<string>>(new Set());
  const [sosModalVisible, setSosModalVisible] = React.useState(false);

  useEffect(() => {
    if (!planId || !user?.id) return;
    const fetchProgress = async () => {
      try {
        const res = await pilgrimPlannerApi.getPlannerProgress(planId);
        if (res.success && res.data) {
          const me = res.data.member_progress.find((m) => String(m.user_id) === String(user.id));
          if (me?.history) {
            const ids = me.history.filter(h => h.status === 'checked_in').map(h => h.planner_item_id);
            setCheckedInIds(new Set(ids));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    void fetchProgress();
  }, [planId, user?.id, plan?.items_by_day]);

  useEffect(() => {
    if (sortedDays.length > 0 && !selectedDay) {
      setSelectedDay(sortedDays[todayIdx >= 0 ? todayIdx : 0] || "");
    }
  }, [sortedDays, todayIdx, selectedDay]);

  const allItemsFlat = useMemo(() => {
    if (!plan?.items_by_day) return [];
    return Object.values(plan.items_by_day).flat();
  }, [plan?.items_by_day]);

  const isLastItem = useMemo(() => {
    if (allItemsFlat.length === 0 || !firstItem) return false;
    return firstItem.id === allItemsFlat[allItemsFlat.length - 1].id;
  }, [allItemsFlat, firstItem]);

  const onCompleted = useCallback(() => {
    navigation.replace("PlanDetailScreen", { planId });
  }, [navigation, planId]);

  const {
    checkingInItemId,
    skippingItemId,
    markingVisitedItemId,
    checkIn,
    skipItem,
    markVisited,
  } = useJourneyExecution(planId, refreshPlan, onCompleted);
  const isOwner = useMemo(
    () => !!plan && !!user?.id && String(plan.user_id) === String(user.id),
    [plan, user?.id],
  );
  const completingRef = useRef(false);
  const allStopsHandled = useMemo(() => {
    if (!plan?.items_by_day) return false;
    const items = Object.values(plan.items_by_day).flat();
    if (!items.length) return false;
    return items.every((item) => {
      const st = String(item.status || "").toLowerCase();
      return st === "visited" || st === "skipped";
    });
  }, [plan]);

  const hasVisitedStops = useMemo(() => {
    if (!plan?.items_by_day) return false;
    const items = Object.values(plan.items_by_day).flat();
    return items.some((item) => String(item.status || "").toLowerCase() === "visited");
  }, [plan]);

  useEffect(() => {
    const maybeCompleteJourney = async () => {
      if (!plan?.id || !isOwner) return;
      if (String(plan.status || "").toLowerCase() !== "ongoing") return;
      if (!allStopsHandled) return;
      
      // Nếu bỏ qua toàn bộ, backend sẽ tự động "cancelled"
      if (!hasVisitedStops) {
        Toast.show({
          type: "info",
          text1: "Chuyến đi bị hủy",
          text2: "Bạn đã bỏ qua tất cả địa điểm trong hành trình",
        });
        navigation.replace("PlanDetailScreen", { planId: plan.id });
        return;
      }

      if (completingRef.current) return;

      try {
        completingRef.current = true;
        const response = await pilgrimPlannerApi.updatePlannerStatus(plan.id, {
          status: "completed",
        });
        if (!response.success) {
          throw new Error(response.message || "Không thể kết thúc chuyến đi");
        }
        Toast.show({
          type: "success",
          text1: "Đã hoàn thành hành trình",
          text2: "Chuyển về trang chi tiết kế hoạch",
        });
        navigation.replace("PlanDetailScreen", { planId: plan.id });
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: "Không thể chuyển trạng thái hoàn thành",
          text2: e?.message || "Vui lòng thử lại",
        });
      } finally {
        completingRef.current = false;
      }
    };

    void maybeCompleteJourney();
  }, [allStopsHandled, isOwner, navigation, plan]);

  // Hide Bottom Tab Bar
  useEffect(() => {
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: undefined,
      });
    };
  }, [navigation]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!plan || error) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.textPrimary, marginBottom: 8 }}>
          {error || "Không tìm thấy hành trình"}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.accent, fontWeight: "700" }}>
            Quay lại
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* TOP BAR */}
      <View style={[styles.topBar, { paddingTop: insets.top + 10, paddingBottom: 14 }]}>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.topTitle} numberOfLines={1} ellipsizeMode="tail">
            {plan?.name || "Kế hoạch"}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() =>
            navigation.navigate("PlanChatScreen", {
              planId: plan.id,
              planName: plan.name,
            })
          }
        >
          <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* BANNER - compact */}
      <PlanHeader plan={plan} firstItem={firstItem} compact />

      {/* TIMELINE SECTION - flex grow */}
      <View style={styles.timelineSection}>
        <View style={styles.timelineHeader}>
          <Text style={styles.timelineTitle}>Lịch trình chuyến đi</Text>
        </View>

        {sortedDays.length > 0 ? (
          <TimelineDaySection
            days={sortedDays.map((d, idx) => {
              const date = new Date(plan!.start_date!);
              date.setDate(date.getDate() + idx);
              return {
                key: d,
                label: date.toISOString().split("T")[0], // Pass YYYY-MM-DD
                isToday: idx === todayIdx,
              };
            })}
            selectedDay={selectedDay}
            onSelectDay={setSelectedDay}
            items={plan.items_by_day?.[selectedDay] || []}
            onViewRoute={(item) =>
              navigation.navigate("PlannerMapScreen", {
                planId: plan.id,
                focusItemId: item.id,
                focusDay: selectedDay,
              })
            }
          />
        ) : (
          <View style={styles.timelineEmptyContainer}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.timelineEmpty}>Chưa có lịch trình nào được lưu</Text>
          </View>
        )}
      </View>

      {/* ACTION BUTTONS - fixed at bottom, always visible */}
      <View style={[styles.actionsWrapper, { paddingBottom: insets.bottom + 20 }]}>
        {/* Row 1: Check-in (Full Width) */}
        <TouchableOpacity
          style={[styles.checkinFullBtn, (!firstItem || checkedInIds.has(firstItem.id)) && { backgroundColor: "#9CA3AF" }]}
          disabled={!firstItem || checkingInItemId === firstItem?.id || checkedInIds.has(firstItem?.id)}
          onPress={async () => {
            if (firstItem) {
              try {
                await checkIn(firstItem, isLastItem);
                setCheckedInIds(prev => new Set(prev).add(firstItem.id));
              } catch {
                // Toast error was handled in useJourneyExecution hook
              }
            }
          }}
          activeOpacity={0.82}
        >
          <Ionicons name="checkmark-circle" size={20} color="#fff" />
          <Text style={styles.checkinFullText}>
            {!firstItem || checkedInIds.has(firstItem?.id) ? "Đã check-in điểm này" : "Check-in điểm hành hương"}
          </Text>
        </TouchableOpacity>

        {/* Row 2: Owner Specific (Skip/Visited) - Only visible to owner */}
        {isOwner && (
          <View style={styles.ownerPrimaryRow}>
            <TouchableOpacity
              style={[styles.smallPrimaryBtn, styles.skipBtn]}
              disabled={!firstItem || skippingItemId === firstItem.id}
              onPress={() => firstItem && skipItem(firstItem)}
              activeOpacity={0.82}
            >
              <Ionicons name="play-skip-forward" size={16} color="#9A3412" />
              <Text style={styles.smallPrimaryBtnText}>Bỏ qua</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.smallPrimaryBtn, styles.visitedBtn]}
              disabled={!firstItem || markingVisitedItemId === firstItem.id}
              onPress={() => firstItem && markVisited(firstItem, isLastItem)}
              activeOpacity={0.82}
            >
              <Ionicons name="flag" size={16} color="#92400E" />
              <Text style={styles.smallPrimaryBtnText}>Đã viếng</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* 2x2 Grid for 4 buttons */}
        <View style={styles.buttonGrid}>
          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridBtn}
              onPress={() =>
                navigation.navigate("Nhat ky", { 
                  screen: "CreateJournalScreen",
                  params: {
                    planId: plan.id,
                    plannerItemId: firstItem?.id,
                    from: "ActiveJourney"
                  }
                })
              }
              activeOpacity={0.82}
            >
              <Ionicons name="book-outline" size={20} color="#9A3412" />
              <Text style={styles.gridBtnText}>Nhật ký</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.gridBtn}
              onPress={() =>
                navigation.navigate("PlannerMembersScreen", { planId: plan.id })
              }
              activeOpacity={0.82}
            >
              <Ionicons name="people-outline" size={20} color="#8B7355" />
              <Text style={styles.gridBtnText}>Thành viên</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.gridRow}>
            <TouchableOpacity
              style={styles.gridBtn}
              onPress={() => navigation.navigate("PlannerMapScreen", { planId: plan.id })}
              activeOpacity={0.82}
            >
              <Ionicons name="map-outline" size={20} color="#1A2845" />
              <Text style={styles.gridBtnText}>Bản đồ</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.gridBtn, styles.sosGridBtn]}
              onPress={() => setSosModalVisible(true)}
              activeOpacity={0.82}
            >
              <Ionicons name="warning" size={20} color="#DC2626" />
              <Text style={[styles.gridBtnText, { color: "#DC2626" }]}>Cứu trợ SOS</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <SOSRequestModal
        visible={sosModalVisible}
        onClose={() => setSosModalVisible(false)}
        planId={planId}
        siteId={firstItem?.site?.id}
        siteName={firstItem?.site?.name}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // TOP BAR
  topBar: {
    backgroundColor: COLORS.holy, // Nâu vàng đậm
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    ...SHADOWS.small,
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
  },
  topTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 240,
    letterSpacing: 0.5,
  },

  // TIMELINE SECTION
  timelineSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 0,
    paddingBottom: 4,
    overflow: "hidden",
  },
  timelineHeader: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.3,
  },
  timelineEmptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderStyle: "dashed",
    gap: 8,
  },
  timelineEmpty: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontStyle: "italic",
  },

  // ACTION BUTTONS
  actionsWrapper: {
    paddingHorizontal: SPACING.md,
    paddingTop: 10,
    backgroundColor: COLORS.background,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderMedium,
    gap: 10,
  },

  // Owner Primary row (Skip/Visited)
  ownerPrimaryRow: {
    flexDirection: "row",
    gap: 10,
  },
  smallPrimaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: BORDER_RADIUS.md,
  },
  smallPrimaryBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#9A3412",
  },
  skipBtn: {
    backgroundColor: "#FEE2E2", // Light red/orange
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  visitedBtn: {
    backgroundColor: "#ECFDF5", // Light green
    borderWidth: 1,
    borderColor: "#A7F3D0",
  },

  // Grid Layout
  buttonGrid: {
    gap: 10,
  },
  gridRow: {
    flexDirection: "row",
    gap: 10,
  },
  gridBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.small,
  },
  sosGridBtn: {
    borderColor: "#FECACA",
    backgroundColor: "#FEF2F2",
  },
  gridBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Check-in
  checkinFullBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    backgroundColor: "#D35400", // Cam hành hương đậm
    paddingVertical: 14,
    borderRadius: 30, // Pill shape
    ...SHADOWS.medium,
  },
  checkinFullText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
  },
});
