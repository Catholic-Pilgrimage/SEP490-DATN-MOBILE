import { Ionicons } from "@expo/vector-icons";
import { StackActions, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    KeyboardAvoidingView,
    Modal,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import {
    SafeAreaView,
    useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import type {
    PlannerCompositeNavigationProp,
    PlannerRouteProp,
} from "../../../../navigation/pilgrimNavigation.types";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import type { PlanItem } from "../../../../types/pilgrim/planner.types";
import { runWithActionGuard } from "../../../../utils/actionGuard";
import CheckinPhotoSheet from "../components/active-journey/CheckinPhotoSheet";
import ItemActionSheet from "../components/active-journey/ItemActionSheet";
import MarkVisitedModal from "../components/active-journey/MarkVisitedModal";
import PlanHeader from "../components/active-journey/PlanHeader";
import { SOSRequestModal } from "../components/active-journey/SOSRequestModal";
import TimelineDaySection from "../components/active-journey/TimelineDaySection";
import { useCheckinPhoto } from "../hooks/useCheckinPhoto";
import { useJourneyExecution } from "../hooks/useJourneyExecution";
import { usePlanData } from "../hooks/usePlanData";
import { isGroupJourneyPlan } from "../utils/planPatronScope.utils";
import { isViewerStatusBlockedFromActiveJourney } from "../utils/plannerNavigation.utils";

type Props = {
  route: PlannerRouteProp<"ActiveJourneyScreen">;
  navigation: PlannerCompositeNavigationProp;
};

const parseTimeToMinutes = (value?: string) => {
  if (!value) return Number.MAX_SAFE_INTEGER;
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return Number.MAX_SAFE_INTEGER;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (Number.isNaN(hour) || Number.isNaN(minute)) {
    return Number.MAX_SAFE_INTEGER;
  }
  return hour * 60 + minute;
};

const compareItemsInDay = (a: PlanItem, b: PlanItem) => {
  const orderA = Number.isFinite(a.order_index)
    ? Number(a.order_index)
    : Number.MAX_SAFE_INTEGER;
  const orderB = Number.isFinite(b.order_index)
    ? Number(b.order_index)
    : Number.MAX_SAFE_INTEGER;
  if (orderA !== orderB) return orderA - orderB;

  const timeA = parseTimeToMinutes(a.arrival_time || a.estimated_time);
  const timeB = parseTimeToMinutes(b.arrival_time || b.estimated_time);
  if (timeA !== timeB) return timeA - timeB;

  return String(a.site?.name || "").localeCompare(String(b.site?.name || ""));
};

const normalizeItemStatus = (status: unknown): string =>
  String(status || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_")
    .replace(/-/g, "_");

const isHandledItemStatus = (status: unknown): boolean => {
  const normalized = normalizeItemStatus(status);
  return (
    normalized === "visited" ||
    normalized === "skipped" ||
    normalized === "checked_in" ||
    normalized === "completed" ||
    normalized === "done"
  );
};

export default function ActiveJourneyScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
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

  /** Người đã rời nhóm không dùng màn hành trình; replace về PlanDetail (có Tiến độ đoàn). */
  const droppedOutRedirectedRef = useRef(false);
  useEffect(() => {
    droppedOutRedirectedRef.current = false;
  }, [planId]);
  useLayoutEffect(() => {
    if (loading) return;
    if (!plan?.id) return;
    if (droppedOutRedirectedRef.current) return;
    if (!isViewerStatusBlockedFromActiveJourney(plan.viewer_join_status))
      return;
    droppedOutRedirectedRef.current = true;
    navigation.replace("PlanDetailScreen", { planId: plan.id });
  }, [loading, plan?.id, plan?.viewer_join_status, navigation]);

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
  const [checkedInIds, setCheckedInIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [sosModalVisible, setSosModalVisible] = React.useState(false);
  const [photoSheetVisible, setPhotoSheetVisible] = React.useState(false);
  const [skipReasonModalVisible, setSkipReasonModalVisible] =
    React.useState(false);
  const [skipReason, setSkipReason] = React.useState("");
  const [pullRefreshing, setPullRefreshing] = React.useState(false);
  const [lastClosedDayNumber, setLastClosedDayNumber] = React.useState(0);
  const [closingDayNumber, setClosingDayNumber] = React.useState<number | null>(
    null,
  );
  const [shouldSnapToActionableDay, setShouldSnapToActionableDay] =
    React.useState(true);
  const [skipReasonItem, setSkipReasonItem] = React.useState<PlanItem | null>(
    null,
  );

  // Owner action sheet & mark visited modal state
  const [actionSheetItem, setActionSheetItem] = React.useState<PlanItem | null>(
    null,
  );
  const [markVisitedItem, setMarkVisitedItem] = React.useState<PlanItem | null>(
    null,
  );

  useEffect(() => {
    if (!planId || !user?.id) return;
    const fetchProgress = async () => {
      try {
        const res = await pilgrimPlannerApi.getPlannerProgress(planId);
        if (res.success && res.data) {
          const me = res.data.member_progress.find(
            (m) => String(m.user_id) === String(user.id),
          );
          if (me?.history) {
            const ids = me.history
              .filter((h) => h.status === "checked_in")
              .map((h) => h.planner_item_id);
            setCheckedInIds(new Set(ids));
          }
        }
      } catch (e) {
        // ignore
      }
    };
    void fetchProgress();
  }, [planId, user?.id, plan?.items_by_day]);

  const getLastClosedDayFromPlan = useCallback(
    (sourcePlan: any): number => {
      if (!sourcePlan || typeof sourcePlan !== "object") return 0;

      const rawClosedDays = sourcePlan.closed_days || sourcePlan.closedDays;
      if (Array.isArray(rawClosedDays)) {
        const fromArray = rawClosedDays
          .map((value: unknown) => Number(value))
          .filter((value: number) => Number.isFinite(value) && value > 0)
          .reduce((acc: number, value: number) => Math.max(acc, Math.floor(value)), 0);
        if (fromArray > 0) return fromArray;
      }

      const directCandidates = [
        sourcePlan.last_closed_day,
        sourcePlan.last_closed_day_number,
        sourcePlan.lastClosedDay,
      ];

      for (const candidate of directCandidates) {
        const numeric = Number(candidate);
        if (!Number.isFinite(numeric) || numeric <= 0) continue;
        return Math.max(0, Math.floor(numeric));
      }

      return 0;
    },
    [],
  );

  useEffect(() => {
    const fromPlan = getLastClosedDayFromPlan(plan);
    setLastClosedDayNumber(fromPlan);
  }, [getLastClosedDayFromPlan, plan]);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      setShouldSnapToActionableDay(false);
      void refreshPlan().finally(() => {
        if (active) {
          setShouldSnapToActionableDay(true);
        }
      });

      return () => {
        active = false;
      };
    }, [refreshPlan]),
  );

  const handlePullRefresh = useCallback(async () => {
    try {
      setPullRefreshing(true);
      await refreshPlan();
    } finally {
      setPullRefreshing(false);
    }
  }, [refreshPlan]);

  const allItemsFlat = useMemo(() => {
    if (!plan?.items_by_day) return [];
    return sortedDays.flatMap((dayKey) =>
      [...(plan.items_by_day?.[dayKey] || [])].sort(compareItemsInDay),
    );
  }, [plan?.items_by_day, sortedDays]);

  const nextDayToClose = useMemo(() => lastClosedDayNumber + 1, [lastClosedDayNumber]);

  const actionableDayKey = useMemo(() => {
    if (!sortedDays.length) return "";
    const exact = sortedDays.find((dayKey) => Number(dayKey) === nextDayToClose);
    if (exact) return exact;
    return sortedDays[sortedDays.length - 1] || "";
  }, [nextDayToClose, sortedDays]);

  const actionableDayItems = useMemo(
    () => [...(plan?.items_by_day?.[actionableDayKey] || [])].sort(compareItemsInDay),
    [actionableDayKey, plan?.items_by_day],
  );

  const isHandledStatus = useCallback(
    (item: PlanItem) => {
      const status = normalizeItemStatus(item.status);
      return (
        isHandledItemStatus(status) ||
        (item.id ? checkedInIds.has(item.id) : false)
      );
    },
    [checkedInIds],
  );

  const isActionableDayHandled = useMemo(() => {
    if (!actionableDayItems.length) return false;
    return actionableDayItems.every((item) => isHandledStatus(item));
  }, [actionableDayItems, isHandledStatus]);

  const inferredCurrentCheckinDayKey = useMemo(() => {
    if (!sortedDays.length) return "";

    for (const dayKey of sortedDays) {
      const dayItems = [...(plan?.items_by_day?.[dayKey] || [])].sort(compareItemsInDay);
      if (!dayItems.length) continue;

      const allHandled = dayItems.every((item) => isHandledStatus(item));
      if (!allHandled) {
        return dayKey;
      }
    }

    return actionableDayKey || sortedDays[sortedDays.length - 1] || "";
  }, [actionableDayKey, isHandledStatus, plan?.items_by_day, sortedDays]);

  const nextPendingItem = useMemo(
    () =>
      actionableDayItems.find((item) => {
        if (!item?.id) return false;
        return !isHandledStatus(item);
      }) || null,
    [actionableDayItems, isHandledStatus],
  );

  const journalPrefillItem = useMemo(() => {
    if (!allItemsFlat.length) return nextPendingItem;

    const isVisitedLike = (item: PlanItem) => {
      const status = String(item.status || "").toLowerCase();
      return (
        status === "visited" ||
        status === "checked_in" ||
        (item.id ? checkedInIds.has(item.id) : false)
      );
    };

    if (nextPendingItem?.id) {
      const nextIndex = allItemsFlat.findIndex(
        (item) => item.id === nextPendingItem.id,
      );
      if (nextIndex > 0) {
        for (let i = nextIndex - 1; i >= 0; i -= 1) {
          const item = allItemsFlat[i];
          if (isVisitedLike(item)) return item;
        }
      }
    }

    for (let i = allItemsFlat.length - 1; i >= 0; i -= 1) {
      const item = allItemsFlat[i];
      if (isVisitedLike(item)) return item;
    }

    return nextPendingItem;
  }, [allItemsFlat, checkedInIds, nextPendingItem]);

  const journalPrefillItemIds = useMemo(() => {
    if (!allItemsFlat.length) return [] as string[];

    const isVisitedLike = (item: PlanItem) => {
      const status = String(item.status || "").toLowerCase();
      return (
        status === "visited" ||
        status === "checked_in" ||
        (item.id ? checkedInIds.has(item.id) : false)
      );
    };

    const nextIndex = nextPendingItem?.id
      ? allItemsFlat.findIndex((item) => item.id === nextPendingItem.id)
      : -1;
    const candidateRange =
      nextIndex > 0 ? allItemsFlat.slice(0, nextIndex) : allItemsFlat;

    const visitedIds = candidateRange
      .filter((item) => !!item.id && isVisitedLike(item))
      .map((item) => item.id as string);

    if (visitedIds.length > 0) return visitedIds;
    return journalPrefillItem?.id ? [journalPrefillItem.id] : [];
  }, [allItemsFlat, checkedInIds, journalPrefillItem, nextPendingItem]);

  const selectedDayItems = useMemo(
    () =>
      [...(plan?.items_by_day?.[selectedDay] || [])].sort(compareItemsInDay),
    [plan?.items_by_day, selectedDay],
  );

  const selectedDayNumber = Number(selectedDay);
  const isSelectedDayHandled =
    selectedDayItems.length > 0 &&
    selectedDayItems.every((item) => isHandledStatus(item));

  const closeTargetDayNumber = useMemo(() => {
    if (Number.isFinite(selectedDayNumber) && selectedDayNumber > 0) {
      return Math.floor(selectedDayNumber);
    }
    const fallback = Number(actionableDayKey || nextDayToClose);
    if (!Number.isFinite(fallback) || fallback <= 0) return nextDayToClose;
    return Math.floor(fallback);
  }, [actionableDayKey, nextDayToClose, selectedDayNumber]);

  const closeTargetDateLabel = useMemo(() => {
    if (!plan?.start_date || closeTargetDayNumber <= 0) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: closeTargetDayNumber,
      });
    }

    const baseDate = new Date(plan.start_date);
    if (Number.isNaN(baseDate.getTime())) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: closeTargetDayNumber,
      });
    }

    baseDate.setDate(baseDate.getDate() + Math.max(0, closeTargetDayNumber - 1));
    return baseDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [closeTargetDayNumber, plan?.start_date, t]);

  const canShowCloseDayCta =
    !!plan &&
    !!user?.id &&
    String(plan.user_id) === String(user.id) &&
    String(plan.status || "").toLowerCase() === "ongoing" &&
    Number.isFinite(selectedDayNumber) &&
    selectedDayNumber > 0 &&
    selectedDayNumber === nextDayToClose &&
    isSelectedDayHandled;

  const actionableDayNumber = useMemo(() => {
    const raw = Number(actionableDayKey || nextDayToClose);
    if (!Number.isFinite(raw) || raw <= 0) return nextDayToClose;
    return Math.floor(raw);
  }, [actionableDayKey, nextDayToClose]);

  const isViewingNonCurrentDay =
    Number.isFinite(selectedDayNumber) &&
    selectedDayNumber > 0 &&
    selectedDayNumber !== actionableDayNumber;

  const isViewingPastClosedDay =
    isViewingNonCurrentDay && selectedDayNumber < actionableDayNumber;

  const returnCurrentDayLabel = isViewingPastClosedDay
    ? t("planner.closedDayReturnCurrent", {
        defaultValue: "Đã chốt: Quay lại ngày hiện tại",
      })
    : t("planner.returnCurrentDay", {
        defaultValue: "Quay lại ngày hiện tại",
      });

  const handleCloseSelectedDay = useCallback(async () => {
    if (!plan?.id) return;
    const dayNumber = closeTargetDayNumber;
    if (!Number.isFinite(dayNumber) || dayNumber <= 0) return;

    const expectedDay = lastClosedDayNumber + 1;
    if (dayNumber !== expectedDay) {
      Toast.show({
        type: "info",
        text1: t("planner.closeDaySequenceTitle", {
          defaultValue: "Không thể chốt ngày này",
        }),
        text2: t("planner.closeDaySequenceMessage", {
          defaultValue: "Bạn cần chốt lần lượt. Hãy chốt ngày {{day}} trước.",
          day: expectedDay,
        }),
      });
      return;
    }

    const dayItems = plan.items_by_day?.[String(dayNumber)] || [];
    const dayHandled = dayItems.length > 0 && dayItems.every((item) => isHandledStatus(item));
    if (!dayHandled) {
      Toast.show({
        type: "info",
        text1: t("planner.closeDayNotReadyTitle", {
          defaultValue: "Chưa thể chốt ngày",
        }),
        text2: t("planner.closeDayNotReadyMessage", {
          defaultValue: "Cần xử lý hết các điểm trong ngày trước khi chốt.",
        }),
      });
      return;
    }

    try {
      setClosingDayNumber(dayNumber);
      const response = await pilgrimPlannerApi.closePlannerDay(plan.id, dayNumber);
      if (!response.success) {
        throw new Error(
          response.message ||
            t("planner.closeDayFailed", {
              defaultValue: "Không thể chốt ngày. Vui lòng thử lại.",
            }),
        );
      }

      const closedDay = Number(response.data?.closed_day || dayNumber);
      const nextDay = Number(response.data?.next_day_to_close || closedDay + 1);

      setLastClosedDayNumber((current) => Math.max(current, closedDay));
      await refreshPlan();
      setSelectedDay(String(nextDay));

      Toast.show({
        type: "success",
        text1: t("planner.dayClosedTitle", {
          defaultValue: "Đã chốt ngày thành công",
        }),
        text2: t("planner.dayClosedMessage", {
          defaultValue: "Ngày {{day}} đã khóa, chuyển sang ngày {{nextDay}}.",
          day: closedDay,
          nextDay,
        }),
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("planner.closeDayFailed", {
          defaultValue: "Không thể chốt ngày",
        }),
        text2:
          error?.message ||
          t("common.retry", { defaultValue: "Vui lòng thử lại" }),
      });
    } finally {
      setClosingDayNumber(null);
    }
  }, [
    closeTargetDayNumber,
    isHandledStatus,
    lastClosedDayNumber,
    plan,
    refreshPlan,
    t,
  ]);

  useEffect(() => {
    if (!shouldSnapToActionableDay) return;

    // Prioritize day inferred from real check-in progress, then fall back to last_closed_day + 1.
    const fallbackTodayDay = sortedDays[todayIdx >= 0 ? todayIdx : 0] || "";
    const targetDay = inferredCurrentCheckinDayKey || actionableDayKey || fallbackTodayDay;
    if (!targetDay) return;

    if (selectedDay !== targetDay) {
      setSelectedDay(targetDay);
    }
    setShouldSnapToActionableDay(false);
  }, [
    inferredCurrentCheckinDayKey,
    actionableDayKey,
    selectedDay,
    shouldSnapToActionableDay,
    sortedDays,
    todayIdx,
  ]);

  const isLastItem = useMemo(() => {
    if (allItemsFlat.length === 0 || !nextPendingItem) return false;
    return nextPendingItem.id === allItemsFlat[allItemsFlat.length - 1].id;
  }, [allItemsFlat, nextPendingItem]);

  const onCompleted = useCallback(() => {
    navigation.replace("PlanDetailScreen", { planId });
  }, [navigation, planId]);

  const { checkingInItemId, skippingItemId, checkIn, skipItem, markVisited } =
    useJourneyExecution(planId, refreshPlan, onCompleted);
  const { takePhoto, pickFromGallery } = useCheckinPhoto();

  const handleOpenSkipReasonModal = useCallback((item: PlanItem) => {
    setSkipReasonItem(item);
    setSkipReason("");
    setSkipReasonModalVisible(true);
  }, []);

  const handleCloseSkipReasonModal = useCallback(() => {
    if (skippingItemId) return;
    setSkipReasonModalVisible(false);
    setSkipReason("");
    setSkipReasonItem(null);
  }, [skippingItemId]);

  const handleSubmitSkipReason = useCallback(async () => {
    if (!skipReasonItem) return;
    const reason = skipReason.trim();
    if (!reason) {
      Toast.show({
        type: "info",
        text1: "Thiếu lý do",
        text2: "Vui lòng nhập lý do bỏ qua địa điểm.",
      });
      return;
    }

    await skipItem(skipReasonItem, reason);
    setSkipReasonModalVisible(false);
    setSkipReason("");
    setSkipReasonItem(null);
  }, [skipItem, skipReason, skipReasonItem]);

  const isOwner = useMemo(
    () => !!plan && !!user?.id && String(plan.user_id) === String(user.id),
    [plan, user?.id],
  );

  const planStatus = useMemo(
    () => String(plan?.status || "").toLowerCase(),
    [plan?.status],
  );
  const isSoloPlan = useMemo(
    () => !isGroupJourneyPlan(plan || {}),
    [plan],
  );
  const topBarTitle = useMemo(() => {
    const rawName = String(plan?.name || "").trim();
    if (rawName.length >= 4) return rawName;
    return t("planner.active.headerTitle", { defaultValue: "Hành trình" });
  }, [plan?.name, t]);

  const runGuardedUiAction = useCallback(
    (key: string, action: () => void) => {
      runWithActionGuard(`active-journey:${planId}:${key}`, action);
    },
    [planId],
  );



  // Vòng lặp silent tự động tải lại kế hoạch để các thành viên nhận thông tin thay đổi mới (nếu có)
  useEffect(() => {
    if (!planId) return;
    const interval = setInterval(() => {
      pilgrimPlannerApi
        .getPlanDetail(planId)
        .then((res) => {
          if (res.success && res.data) {
            setPlan(res.data);
          }
        })
        .catch(() => {});
    }, 15000);
    return () => clearInterval(interval);
  }, [planId, setPlan]);



  // Auto-detect completion: navigate away if plan is no longer ongoing
  // (e.g. backend or markVisited already transitioned to completed/cancelled)
  useEffect(() => {
    if (!plan?.id) return;

    // Backend đã chuyển sang completed/cancelled → navigate ngay
    if (planStatus === "completed" || planStatus === "cancelled") {
      Toast.show({
        type: planStatus === "completed" ? "success" : "info",
        text1:
          planStatus === "completed"
            ? t("planner.active.completedTitle", {
                defaultValue: "Hành trình đã hoàn thành!",
              })
            : t("planner.active.cancelledTitle", {
                defaultValue: "Hành trình đã bị hủy",
              }),
        text2: t("planner.active.redirectToDetail", {
          defaultValue: "Chuyển về trang chi tiết kế hoạch",
        }),
      });
      navigation.replace("PlanDetailScreen", { planId: plan.id });
      return;
    }

    // NOTE: Không tự động gọi updatePlannerStatus("completed") ở đây.
    // Việc hoàn thành hành trình CHỈ xảy ra khi owner chủ động chốt
    // điểm cuối cùng qua MarkVisitedModal → useJourneyExecution.markVisited().
    // Tránh race condition khi closePlannerDay + refreshPlan trigger
    // allStopsHandled = true → 2 API call complete cùng lúc.
  }, [
    planStatus,
    navigation,
    plan?.id,
    t,
  ]);

  // Hide Bottom Tab Bar
  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "none" },
      });
    }, [navigation]),
  );

  // Determine check-in button state
  const isAlreadyCheckedIn = nextPendingItem
    ? checkedInIds.has(nextPendingItem.id)
    : false;
  const isCheckInDisabled =
    !nextPendingItem ||
    checkingInItemId === nextPendingItem?.id ||
    isAlreadyCheckedIn;
  const nextSiteName =
    nextPendingItem?.site?.name ||
    t("planner.active.noNextStop", { defaultValue: "Chưa có điểm tiếp theo" });

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
          {error ||
            t("planner.map.notFound", {
              defaultValue: "Không tìm thấy hành trình",
            })}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.accent, fontWeight: "700" }}>
            {t("common.back", { defaultValue: "Quay lại" })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  /** Cực tuyến: dropped / kicked không thấy UI hành trình (chuyển về PlanDetail). */
  if (isViewerStatusBlockedFromActiveJourney(plan.viewer_join_status)) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
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

      {/* SCROLLABLE CONTENT */}
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{
          paddingBottom: FLOATING_CTA_HEIGHT + insets.bottom + 24,
        }}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={handlePullRefresh}
            progressViewOffset={Math.max(insets.top, 0) + 8}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        {/* HERO */}
        <View style={styles.heroWrap}>
          <PlanHeader plan={plan} firstItem={nextPendingItem || firstItem} />

          <LinearGradient
            colors={["rgba(14, 9, 4, 0.55)", "rgba(14, 9, 4, 0.12)", "transparent"]}
            locations={[0, 0.5, 1]}
            style={[
              styles.topBarOverlay,
              { paddingTop: insets.top + 8 },
            ]}
          >
            <View style={styles.topBar}>
              <TouchableOpacity
                style={styles.topBtn}
                onPress={() => navigation.goBack()}
              >
                <Ionicons name="arrow-back" size={24} color="#fff" />
              </TouchableOpacity>
              <View
                style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
              >
                <Text style={styles.topTitle} numberOfLines={1} ellipsizeMode="tail">
                  {topBarTitle}
                </Text>
              </View>
              {!isSoloPlan ? (
                <TouchableOpacity
                  style={styles.topBtn}
                  onPress={() =>
                    runGuardedUiAction("open-chat", () => {
                      navigation.navigate("PlanChatScreen" as never, {
                        planId: plan.id,
                        planName: plan.name,
                      } as never);
                    })
                  }
                >
                  <Ionicons name="chatbubbles-outline" size={24} color="#fff" />
                </TouchableOpacity>
              ) : (
                <View style={{ width: 44 }} />
              )}
            </View>
          </LinearGradient>
        </View>

        {/* TOOLBAR: Quick-Access Buttons */}
        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() =>
              runGuardedUiAction("open-journal", () => {
                navigation.navigate("CreateJournalScreen", {
                  planId: plan.id,
                  planName: plan.name,
                  plannerItemId: journalPrefillItem?.id,
                  plannerItemIds: journalPrefillItemIds,
                  siteName: journalPrefillItem?.site?.name,
                  from: "ActiveJourney",
                });
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.toolbarIconBox, styles.toolbarIconJournal]}>
              <Ionicons name="book-outline" size={22} color={COLORS.holy} />
            </View>
            <Text style={styles.toolbarBtnText}>
              {t("navigation.journal", { defaultValue: "Nhật ký" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() =>
              runGuardedUiAction("open-map", () => {
                navigation.navigate("PlannerMapScreen", {
                  planId: plan.id,
                  itemsByDay: plan.items_by_day,
                });
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.toolbarIconBox, styles.toolbarIconMap]}>
              <Ionicons name="map-outline" size={22} color="#1A67C1" />
            </View>
            <Text style={styles.toolbarBtnText}>
              {t("planner.map.title", { defaultValue: "Bản đồ" })}
            </Text>
          </TouchableOpacity>

          {/* Solo: Tiến độ | Group: Thành viên */}
          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() =>
              runGuardedUiAction("open-members", () => {
                navigation.navigate("PlannerMembersScreen" as never, {
                  planId: plan.id,
                } as never);
              })
            }
            activeOpacity={0.7}
          >
            <View style={[styles.toolbarIconBox, styles.toolbarIconProgress]}>
              <Ionicons
                name={isSoloPlan ? "analytics-outline" : "people-outline"}
                size={22}
                color="#8B7355"
              />
            </View>
            <Text style={styles.toolbarBtnText}>
              {isSoloPlan
                ? t("planner.progress", {
                    defaultValue: "Tiến độ",
                  })
                : t("planner.crewTitle", { defaultValue: "Thành viên" })}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.toolbarBtn}
            onPress={() => setSosModalVisible(true)}
            activeOpacity={0.7}
          >
            <View style={[styles.toolbarIconBox, styles.sosIconBox]}>
              <Ionicons name="warning" size={22} color="#DC2626" />
            </View>
            <Text style={[styles.toolbarBtnText, { color: "#DC2626" }]}>
              SOS
            </Text>
          </TouchableOpacity>
        </View>

        {/* TIMELINE SECTION */}
        <View style={styles.timelineSection}>
          <View style={styles.timelineHeader}>
            <View style={styles.timelineTitleWrap}>
              <View style={styles.timelineIconWrap}>
                <Ionicons name="trail-sign-outline" size={16} color={COLORS.holy} />
              </View>
              <Text style={styles.timelineTitle}>
                {t("planner.active.timelineTitle", {
                  defaultValue: "Lịch trình hành hương",
                })}
              </Text>
              {isOwner && planStatus === "ongoing" && (
                <TouchableOpacity
                  style={styles.editItineraryBtn}
                  onPress={() =>
                    runGuardedUiAction("open-plan-detail", () => {
                      navigation.navigate("PlanDetailScreen", { planId });
                    })
                  }
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="create-outline"
                    size={18}
                    color="#FFFFFF"
                  />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {sortedDays.length > 0 ? (
            <TimelineDaySection
              days={sortedDays.map((d, idx) => {
                const date = new Date(plan!.start_date!);
                date.setDate(date.getDate() + idx);
                const dayItems = [...(plan?.items_by_day?.[d] || [])].sort(compareItemsInDay);
                const totalStops = dayItems.length;
                const handledStops = dayItems.filter((item) => isHandledStatus(item)).length;

                return {
                  key: d,
                  label: date.toISOString().split("T")[0],
                  isToday: idx === todayIdx,
                  totalStops,
                  handledStops,
                };
              })}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              items={selectedDayItems}
              isOwner={isOwner}
              onItemAction={(item) => setActionSheetItem(item)}
              onViewRoute={(item) =>
                runGuardedUiAction(`view-route:${item.id}`, () => {
                  navigation.navigate("PlannerMapScreen", {
                    planId: plan.id,
                    focusItemId: item.id,
                    focusDay: selectedDay,
                    itemsByDay: plan.items_by_day,
                  });
                })
              }
              onRateSite={(item) =>
                runGuardedUiAction(`rate-site:${item?.id || "unknown"}`, () => {
                  const siteId = item?.site?.id;
                  if (!siteId) {
                    Toast.show({
                      type: "info",
                      text1: t("common.info", { defaultValue: "Thông báo" }),
                      text2: t("planner.siteNameUnknown", {
                        defaultValue: "Không tìm thấy địa điểm để đánh giá.",
                      }),
                    });
                    return;
                  }

                  navigation.dispatch(
                    StackActions.push("SiteDetail", {
                      siteId,
                      fromActiveJourneyReview: true,
                      autoScrollTo: "reviews",
                      hideAddToPlan: true,
                    }),
                  );
                })
              }
            />
          ) : (
            <View style={styles.timelineEmptyContainer}>
              <Ionicons
                name="calendar-outline"
                size={32}
                color={COLORS.textTertiary}
              />
              <Text style={styles.timelineEmpty}>
                {t("planner.active.emptyTimeline", {
                  defaultValue: "Chưa có lịch trình nào được lưu",
                })}
              </Text>
            </View>
          )}
        </View>
      </ScrollView>

      {/* FLOATING BOTTOM CTA - Check-in or Close Day (owner) */}
      <LinearGradient
        colors={["transparent", COLORS.background, COLORS.background]}
        locations={[0, 0.35, 1]}
        style={[
          styles.floatingBottomContainer,
          { paddingBottom: insets.bottom + 16 },
        ]}
      >
        {isViewingNonCurrentDay ? (
          <TouchableOpacity
            style={[styles.stickyCheckinBtn, styles.stickyReturnCurrentDayBtn]}
            onPress={() => setSelectedDay(String(actionableDayNumber))}
            activeOpacity={0.82}
          >
            <Ionicons name="return-down-back-outline" size={20} color="#fff" />
            <Text style={styles.stickyCheckinText} numberOfLines={1}>
              {returnCurrentDayLabel}
            </Text>
          </TouchableOpacity>
        ) : canShowCloseDayCta ? (
          <TouchableOpacity
            style={[
              styles.stickyCheckinBtn,
              styles.stickyCloseDayBtn,
              closingDayNumber === closeTargetDayNumber &&
                styles.stickyCheckinBtnDisabled,
            ]}
            disabled={closingDayNumber === closeTargetDayNumber}
            onPress={() => void handleCloseSelectedDay()}
            activeOpacity={0.82}
          >
            {closingDayNumber === closeTargetDayNumber ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <Ionicons name="lock-closed-outline" size={20} color="#fff" />
                <Text style={styles.stickyCheckinText} numberOfLines={1}>
                  {t("planner.closeDayWithDate", {
                    defaultValue: "Chốt ngày {{day}} ({{date}})",
                    day: closeTargetDayNumber,
                    date: closeTargetDateLabel,
                  })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <TouchableOpacity
            style={[
              styles.stickyCheckinBtn,
              isAlreadyCheckedIn && styles.stickyCheckinBtnDisabled,
            ]}
            disabled={isCheckInDisabled}
            onPress={() => setPhotoSheetVisible(true)}
            activeOpacity={0.82}
          >
            {checkingInItemId === nextPendingItem?.id ? (
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
                    ? t("planner.active.checkedInThisStop", {
                        defaultValue: "Đã check-in điểm này ✓",
                      })
                    : t("planner.active.checkInAt", {
                        defaultValue: "Check-in: {{site}}",
                        site: nextSiteName,
                      })}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </LinearGradient>

      {/* Check-in Photo Picker Sheet */}
      <CheckinPhotoSheet
        visible={photoSheetVisible}
        onClose={() => setPhotoSheetVisible(false)}
        onCamera={async () => {
          setPhotoSheetVisible(false);
          const photo = await takePhoto();
          if (!photo || !nextPendingItem) return;
          const success = await checkIn(nextPendingItem, photo.uri);
          if (success) {
            setCheckedInIds((prev) => new Set(prev).add(nextPendingItem.id));
          }
        }}
        onGallery={async () => {
          setPhotoSheetVisible(false);
          const photo = await pickFromGallery();
          if (!photo || !nextPendingItem) return;
          const success = await checkIn(nextPendingItem, photo.uri);
          if (success) {
            setCheckedInIds((prev) => new Set(prev).add(nextPendingItem.id));
          }
        }}
      />

      {/* OWNER: Item Action Bottom Sheet */}
      <ItemActionSheet
        visible={!!actionSheetItem}
        onClose={() => setActionSheetItem(null)}
        item={actionSheetItem}
        numberOfPeople={plan.number_of_people}
        isSkipping={skippingItemId === actionSheetItem?.id}
        onViewRoute={() => {
          if (actionSheetItem) {
            runGuardedUiAction(`sheet-view-route:${actionSheetItem.id}`, () => {
              navigation.navigate("PlannerMapScreen", {
                planId: plan.id,
                focusItemId: actionSheetItem.id,
                focusDay: selectedDay,
                itemsByDay: plan.items_by_day,
              });
            });
          }
        }}
        onMarkVisited={() => {
          setMarkVisitedItem(actionSheetItem);
        }}
        onSkip={() => {
          if (actionSheetItem) handleOpenSkipReasonModal(actionSheetItem);
        }}
      />

      <Modal
        visible={skipReasonModalVisible}
        transparent
        animationType="fade"
        onRequestClose={handleCloseSkipReasonModal}
      >
        <KeyboardAvoidingView
          style={styles.skipReasonModalRoot}
          behavior="padding"
          keyboardVerticalOffset={insets.top + 8}
        >
          <Pressable
            style={styles.skipReasonOverlay}
            onPress={handleCloseSkipReasonModal}
          />

          <SafeAreaView edges={["bottom"]} style={styles.skipReasonSafeArea}>
            <Pressable
              style={styles.skipReasonCard}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.skipReasonTitle}>Lý do bỏ qua</Text>
              <Text style={styles.skipReasonSubtitle}>
                {skipReasonItem?.site?.name
                  ? `Nhập lý do bỏ qua điểm "${skipReasonItem.site.name}"`
                  : "Nhập lý do bỏ qua địa điểm"}
              </Text>

              <TextInput
                style={styles.skipReasonInput}
                value={skipReason}
                onChangeText={setSkipReason}
                placeholder="Ví dụ: Trời mưa lớn, đoàn không thể tiếp tục"
                placeholderTextColor={COLORS.textTertiary}
                multiline
                textAlignVertical="top"
                editable={!skippingItemId}
              />

              <View style={styles.skipReasonActions}>
                <TouchableOpacity
                  style={styles.skipReasonCancelBtn}
                  onPress={handleCloseSkipReasonModal}
                  disabled={!!skippingItemId}
                >
                  <Text style={styles.skipReasonCancelText}>Hủy</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.skipReasonSubmitBtn}
                  onPress={() => void handleSubmitSkipReason()}
                  disabled={!!skippingItemId}
                >
                  {skippingItemId ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.skipReasonSubmitText}>
                      Xác nhận bỏ qua
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
            </Pressable>
          </SafeAreaView>
        </KeyboardAvoidingView>
      </Modal>

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
        siteId={nextPendingItem?.site?.id}
        siteName={nextPendingItem?.site?.name}
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
  heroWrap: {
    position: "relative",
    marginBottom: 4,
  },
  topBarOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingBottom: 8,
  },
  topBar: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "transparent",
  },
  topBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255, 255, 255, 0.16)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.35)",
  },
  topTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "800",
    textAlign: "center",
    maxWidth: 220,
    letterSpacing: 0.3,
    textShadowColor: "rgba(0,0,0,0.35)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  // TOOLBAR (Quick-Access Buttons)
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 4,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(154, 116, 73, 0.14)",
    ...SHADOWS.small,
  },
  toolbarBtn: {
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minWidth: 64,
  },
  toolbarIconBox: {
    width: 50,
    height: 50,
    borderRadius: 15,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.14)",
  },
  toolbarIconJournal: {
    backgroundColor: "#FAF5EC",
  },
  toolbarIconMap: {
    backgroundColor: "#EFF6FF",
  },
  toolbarIconProgress: {
    backgroundColor: "#F8F7F3",
  },
  sosIconBox: {
    backgroundColor: "#FEF2F2",
    borderColor: "rgba(220, 38, 38, 0.2)",
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
    justifyContent: "flex-start",
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  timelineTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  timelineIconWrap: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: "#F8F3E9",
    alignItems: "center",
    justifyContent: "center",
  },
  timelineTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#3F2E1D",
    letterSpacing: 0.2,
  },
  editItineraryBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginLeft: 4,
    backgroundColor: COLORS.holy,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.65)",
    shadowColor: COLORS.holy,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
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
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    shadowColor: "#D35400",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.36,
    shadowRadius: 10,
    elevation: 7,
  },
  stickyCloseDayBtn: {
    backgroundColor: "#0F766E",
    shadowColor: "#0F766E",
  },
  stickyReturnCurrentDayBtn: {
    backgroundColor: "#374151",
    shadowColor: "#374151",
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

  skipReasonOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  skipReasonModalRoot: {
    flex: 1,
  },
  skipReasonSafeArea: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 20,
  },
  skipReasonCard: {
    backgroundColor: COLORS.white,
    borderRadius: 18,
    padding: 18,
    ...SHADOWS.medium,
  },
  skipReasonTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  skipReasonSubtitle: {
    marginTop: 6,
    fontSize: 13,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  skipReasonInput: {
    marginTop: 12,
    minHeight: 96,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.surface0,
  },
  skipReasonActions: {
    marginTop: 14,
    flexDirection: "row",
    gap: 10,
  },
  skipReasonCancelBtn: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
  },
  skipReasonCancelText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  skipReasonSubmitBtn: {
    flex: 1.4,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#9A3412",
    alignItems: "center",
    justifyContent: "center",
  },
  skipReasonSubmitText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#fff",
  },
});
