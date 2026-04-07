import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useFocusEffect } from "@react-navigation/native";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef
} from "react";
import {
  ActivityIndicator,
  ScrollView,
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
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import type { PlanItem } from "../../../../types/pilgrim/planner.types";
import CheckinPhotoSheet from "../components/active-journey/CheckinPhotoSheet";
import ItemActionSheet from "../components/active-journey/ItemActionSheet";
import MarkVisitedModal from "../components/active-journey/MarkVisitedModal";
import PlanHeader from "../components/active-journey/PlanHeader";
import TimelineDaySection from "../components/active-journey/TimelineDaySection";
import { useCheckinPhoto } from "../hooks/useCheckinPhoto";
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
    setPlan,
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
  const [photoSheetVisible, setPhotoSheetVisible] = React.useState(false);

  // Owner action sheet & mark visited modal state
  const [actionSheetItem, setActionSheetItem] = React.useState<PlanItem | null>(null);
  const [markVisitedItem, setMarkVisitedItem] = React.useState<PlanItem | null>(null);

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

  useFocusEffect(
    useCallback(() => {
      refreshPlan();
    }, [refreshPlan])
  );

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
    checkIn,
    skipItem,
    markVisited,
  } = useJourneyExecution(planId, refreshPlan, onCompleted);
  const { takePhoto, pickFromGallery } = useCheckinPhoto();
  const isOwner = useMemo(
    () => !!plan && !!user?.id && String(plan.user_id) === String(user.id),
    [plan, user?.id],
  );
  const completingRef = useRef(false);
  const planStatus = useMemo(
    () => String(plan?.status || "").toLowerCase(),
    [plan?.status],
  );

  const allStopsHandled = useMemo(() => {
    if (!plan?.items_by_day) return false;
    const items = Object.values(plan.items_by_day).flat();
    if (!items.length) return false;
    return items.every((item) => {
      return item.status === "visited" || item.status === "skipped";
    });
  }, [plan?.items_by_day]);

  // Vòng lặp silent tự động tải lại kế hoạch để các thành viên nhận thông tin thay đổi mới (nếu có)
  useEffect(() => {
    if (!planId) return;
    const interval = setInterval(() => {
      pilgrimPlannerApi.getPlanDetail(planId).then(res => {
        if (res.success && res.data) {
          setPlan(res.data);
        }
      }).catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [planId, setPlan]);


  const hasVisitedStops = useMemo(() => {
    if (!plan?.items_by_day) return false;
    const items = Object.values(plan.items_by_day).flat();
    return items.some((item) => String(item.status || "").toLowerCase() === "visited");
  }, [plan]);

  // Auto-detect completion: navigate away if plan is no longer ongoing
  useEffect(() => {
    if (!plan?.id) return;

    // Case 1: Backend đã tự chuyển sang completed/cancelled → navigate ngay
    if (planStatus === "completed" || planStatus === "cancelled") {
      Toast.show({
        type: planStatus === "completed" ? "success" : "info",
        text1:
          planStatus === "completed"
            ? "Hành trình đã hoàn thành!"
            : "Hành trình đã bị hủy",
        text2: "Chuyển về trang chi tiết kế hoạch",
      });
      navigation.replace("PlanDetailScreen", { planId: plan.id });
      return;
    }

    // Case 2: Tất cả điểm đã được xử lý (visited/skipped) → Owner gọi API complete
    if (planStatus !== "ongoing" || !allStopsHandled) return;

    if (!isOwner) return; // Member chờ owner xử lý

    if (!hasVisitedStops) {
      // Skip toàn bộ → backend sẽ tự cancelled
      Toast.show({
        type: "info",
        text1: "Chuyến đi bị hủy",
        text2: "Tất cả địa điểm đã bị bỏ qua",
      });
      navigation.replace("PlanDetailScreen", { planId: plan.id });
      return;
    }

    if (completingRef.current) return;

    const completeJourney = async () => {
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
          text1: "Đã hoàn thành hành trình!",
          text2: "Chuyển về trang chi tiết kế hoạch",
        });
        navigation.replace("PlanDetailScreen", { planId: plan.id });
      } catch (e: any) {
        // Có thể backend đã tự complete → refresh lại plan
        Toast.show({
          type: "error",
          text1: "Không thể chuyển trạng thái",
          text2: e?.message || "Vui lòng thử lại",
        });
        await refreshPlan();
      } finally {
        completingRef.current = false;
      }
    };
    void completeJourney();
  }, [planStatus, allStopsHandled, hasVisitedStops, isOwner, navigation, plan?.id, refreshPlan]);

  // Hide Bottom Tab Bar
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "none" },
      });
    }, [navigation])
  );

  // Determine check-in button state
  const isAlreadyCheckedIn = firstItem ? checkedInIds.has(firstItem.id) : false;
  const isCheckInDisabled = !firstItem || checkingInItemId === firstItem?.id || isAlreadyCheckedIn;
  const nextSiteName = firstItem?.site?.name || "Điểm tiếp theo";

  // Calculate floating CTA height for ScrollView padding (only check-in btn now)
  const FLOATING_CTA_HEIGHT = 90;

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

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: FLOATING_CTA_HEIGHT + insets.bottom + 24 }}
        showsVerticalScrollIndicator={false}
      >
        {/* BANNER */}
        <PlanHeader plan={plan} firstItem={firstItem} />

        {/* TOOLBAR: 4 Quick-Access Buttons */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
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
            activeOpacity={0.7}
          >
            <View style={styles.toolbarIconBox}>
              <Ionicons name="book-outline" size={22} color={COLORS.holy} />
            </View>
            <Text style={styles.toolbarBtnText}>Nhật ký</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => navigation.navigate("PlannerMapScreen", { planId: plan.id, itemsByDay: plan.items_by_day })}
            activeOpacity={0.7}
          >
            <View style={styles.toolbarIconBox}>
              <Ionicons name="map-outline" size={22} color="#1A67C1" />
            </View>
            <Text style={styles.toolbarBtnText}>Bản đồ</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() =>
              navigation.navigate("PlannerMembersScreen", { planId: plan.id })
            }
            activeOpacity={0.7}
          >
            <View style={styles.toolbarIconBox}>
              <Ionicons name="people-outline" size={22} color="#8B7355" />
            </View>
            <Text style={styles.toolbarBtnText}>Thành viên</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setSosModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.toolbarIconBox, styles.sosIconBox]}>
              <Ionicons name="warning" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.toolbarBtnText, { color: "#DC2626" }]}>SOS</Text>
          </TouchableOpacity>
        </View>

        {/* TIMELINE SECTION */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <Text style={styles.timelineTitle}>Lịch trình chuyến đi</Text>
            {isOwner && planStatus === "ongoing" && (
              <TouchableOpacity
                style={styles.editItineraryBtn}
                onPress={() => navigation.navigate("PlanDetailScreen", { planId })}
                activeOpacity={0.7}
              >
                <Ionicons name="create-outline" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            )}
          </View>

          {sortedDays.length > 0 ? (
            <TimelineDaySection
              days={sortedDays.map((d, idx) => {
                const date = new Date(plan!.start_date!);
                date.setDate(date.getDate() + idx);
                return {
                  key: d,
                  label: date.toISOString().split("T")[0],
                  isToday: idx === todayIdx,
                };
              })}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              items={plan.items_by_day?.[selectedDay] || []}
              isOwner={isOwner}
              onItemAction={(item) => setActionSheetItem(item)}
              onViewRoute={(item) =>
                navigation.navigate("PlannerMapScreen", {
                  planId: plan.id,
                  focusItemId: item.id,
                  focusDay: selectedDay,
                  itemsByDay: plan.items_by_day,
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
      </ScrollView>

      {/* FLOATING BOTTOM CTA - Only Check-in button now */}
      <LinearGradient
        colors={['transparent', COLORS.background, COLORS.background]}
        locations={[0, 0.35, 1]}
        style={[styles.floatingBottomContainer, { paddingBottom: insets.bottom + 16 }]}
      >
        {/* PRIMARY CHECK-IN BUTTON */}
        <TouchableOpacity
          style={[
            styles.stickyCheckinBtn,
            isAlreadyCheckedIn && styles.stickyCheckinBtnDisabled,
          ]}
          disabled={isCheckInDisabled}
          onPress={() => setPhotoSheetVisible(true)}
          activeOpacity={0.82}
        >
          {checkingInItemId === firstItem?.id ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons
                name={isAlreadyCheckedIn ? "checkmark-done-circle" : "location"}
                size={20}
                color="#fff"
              />
              <Text style={styles.stickyCheckinText} numberOfLines={1}>
                {isAlreadyCheckedIn
                  ? "Đã check-in điểm này ✓"
                  : `Check-in: ${nextSiteName}`}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </LinearGradient>

      {/* Check-in Photo Picker Sheet */}
      <CheckinPhotoSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        onCamera={async () => {
          setPhotoSheetVisible(false);
          const photo = await takePhoto();
          if (!photo || !firstItem) return;
          const success = await checkIn(firstItem, photo.uri);
          if (success) {
            setCheckedInIds((prev) => new Set(prev).add(firstItem.id));
          }
        }}
        onGallery={async () => {
          setPhotoSheetVisible(false);
          const photo = await pickFromGallery();
          if (!photo || !firstItem) return;
          const success = await checkIn(firstItem, photo.uri);
          if (success) {
            setCheckedInIds((prev) => new Set(prev).add(firstItem.id));
          }
        }}
      />

      {/* OWNER: Item Action Bottom Sheet */}
      <ItemActionSheet
        visible={!!actionSheetItem}
        onClose={() => setActionSheetItem(null)}
        item={actionSheetItem}
        isSkipping={skippingItemId === actionSheetItem?.id}
        onViewRoute={() => {
          if (actionSheetItem) {
            navigation.navigate("PlannerMapScreen", {
              planId: plan.id,
              focusItemId: actionSheetItem.id,
              focusDay: selectedDay,
              itemsByDay: plan.items_by_day,
            });
          }
        }}
        onMarkVisited={() => {
          setMarkVisitedItem(actionSheetItem);
        }}
        onSkip={() => {
          if (actionSheetItem) skipItem(actionSheetItem);
        }}
      />

      {/* OWNER: Mark Visited Confirmation Modal */}
      <MarkVisitedModal
        visible={!!markVisitedItem}
        onClose={() => setMarkVisitedItem(null)}
        planId={planId}
        item={markVisitedItem}
        isLastItem={
          markVisitedItem
            ? markVisitedItem.id === allItemsFlat[allItemsFlat.length - 1]?.id
            : false
        }
        onCompleted={onCompleted}
        refreshPlan={refreshPlan}
      />

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

  // TOOLBAR (Quick-Access Buttons)
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
  },
  toolbarBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 64,
  },
  toolbarIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  sosIconBox: {
    backgroundColor: "#FEF2F2",
  },
  toolbarBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },

  // TIMELINE SECTION
  timelineSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 4,
  },
  timelineHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  timelineTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#4B5563",
    letterSpacing: 0.3,
  },
  editItineraryBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.15)",
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
    minHeight: 200,
  },
  timelineEmpty: {
    color: COLORS.textTertiary,
    fontSize: 13,
    fontStyle: "italic",
  },

  // FLOATING BOTTOM CTA
  floatingBottomContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 24,
  },

  // Sticky Check-in Button
  stickyCheckinBtn: {
    backgroundColor: "#D35400",
    flexDirection: "row",
    height: 54,
    borderRadius: 27,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    shadowColor: "#D35400",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  stickyCheckinBtnDisabled: {
    backgroundColor: "#9CA3AF",
    shadowColor: "#9CA3AF",
    shadowOpacity: 0.15,
  },
  stickyCheckinText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
    letterSpacing: 0.5,
    maxWidth: "75%",
  },
});
