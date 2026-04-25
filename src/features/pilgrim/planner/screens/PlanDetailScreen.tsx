import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import DateTimePicker from "@react-native-community/datetimepicker";
import { CommonActions, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    AppState,
    Image,
    Platform,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { OfflineBanner } from "../../../../components/common/OfflineBanner";
import { FullMapModal } from "../../../../components/map/FullMapModal";
import {
    MapPin,
    VietmapView,
    VietmapViewRef,
} from "../../../../components/map/VietmapView";
import { CalendarSyncModal } from "../../../../components/ui/CalendarSyncModal";
import { OfflineDownloadModal } from "../../../../components/ui/OfflineDownloadModal";
import {
    BORDER_RADIUS,
    COLORS,
    SPACING,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import {
    CalendarSyncError,
    useCalendarSync,
} from "../../../../hooks/useCalendarSync";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useOffline } from "../../../../hooks/useOffline";
import { useOfflineDownload } from "../../../../hooks/useOfflineDownload";
import { useSites } from "../../../../hooks/useSites";
import type {
    PlannerCompositeNavigationProp,
    PlannerRouteProp,
} from "../../../../navigation/pilgrimNavigation.types";
import { PILGRIM_ENDPOINTS } from "../../../../services/api/endpoints";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import { PlannerCalendarSyncResult } from "../../../../services/calendar/calendarService";
import vietmapService from "../../../../services/map/vietmapService";
import networkService from "../../../../services/network/networkService";
import {
    createOfflinePlannerItemId,
    offlinePlannerService,
} from "../../../../services/offline/offlinePlannerService";
import offlineSyncService from "../../../../services/offline/offlineSyncService";
import type { SiteEvent, SiteSummary } from "../../../../types/pilgrim";
import {
    AddPlanItemRequest,
    PlanEntity,
    PlanItem,
    UpdatePlanRequest,
} from "../../../../types/pilgrim/planner.types";
import type { SiteNearbyPlace } from "../../../../types/pilgrim/site.types";
import { runWithActionGuard } from "../../../../utils/actionGuard";
import { getInitialsFromFullName } from "../../../../utils/initials";
import AddSiteModal from "../components/plan-detail/AddSiteModal";
import EditPlanModal from "../components/plan-detail/EditPlanModal";
import { InviteDecisionButtons } from "../components/plan-detail/InviteDecisionButtons";
import InvitePreviewCard from "../components/plan-detail/InvitePreviewCard";
import ItemDetailModal from "../components/plan-detail/ItemDetailModal";
import { ItineraryDayCard } from "../components/plan-detail/ItineraryDayCard";
import { LockScheduleCard } from "../components/plan-detail/LockScheduleCard";
import { MenuDropdown } from "../components/plan-detail/MenuDropdown";
import NearbyPlacesModal from "../components/plan-detail/NearbyPlacesModal";
import TimeInputModal from "../components/plan-detail/TimeInputModal";
import { PlannerTransactionsModal } from "../components/shared/PlannerTransactionsModal";
import { SharePlanModal } from "../components/shared/SharePlanModal";
import { useAddSiteFlow } from "../hooks/useAddSiteFlow";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import { useEditItemForm } from "../hooks/useEditItemForm";
import { useInvitePlanActions } from "../hooks/useInvitePlanActions";
import { useNearbyPlaces } from "../hooks/useNearbyPlaces";
import {
    type PlannerItemPatch,
    usePlannerDayPatching,
} from "../hooks/usePlannerDayPatching";
import { usePlannerSwapActions } from "../hooks/usePlannerSwapActions";
import { usePlanRoute } from "../hooks/usePlanRoute";
import {
    isValidGroupDepositVnd,
    isValidGroupPenaltyPercent,
    MAX_DEPOSIT_VND,
    MAX_GROUP_PENALTY_PERCENT,
    MIN_DEPOSIT_VND,
    MIN_GROUP_PENALTY_PERCENT,
    parsePenaltyPercent,
    parseVndInteger,
} from "../utils/depositInput.utils";
import { MIN_GROUP_MIN_PEOPLE_REQUIRED } from "../utils/groupMinPeople.utils";
import {
    extractApiErrorMessage,
    showErrorToast,
} from "../utils/planDetailHelpers";
import { isPlanAccessForbiddenError } from "../utils/plannerNavigation.utils";
import {
    LocalSiteSnapshot,
    applyLocalAddItem,
    applyLocalClearAllItems,
    applyLocalDeleteItem,
    sortPlanDayItems,
} from "../utils/planDetailLocalPlan.utils";
import {
    buildPlanMapPins,
    getPlanMapCenter,
    getPlannerRosterCount,
} from "../utils/planDetailMap.utils";
import {
    buildDurationString,
    calculateEndTimeRaw,
    getDateForDayRaw,
} from "../utils/planDetailTime.utils";
import {
    getGroupPatronConstraintFromPlan,
    isGroupJourneyPlan,
} from "../utils/planPatronScope.utils";
import { formatDurationLocalized } from "../utils/siteScheduleHelper";
import { parseDurationToMinutes } from "../utils/time";
import styles from "./PlanDetailScreen.styles";

/** Ổn định tham chiếu cho `useAddSiteFlow` (không dùng state siteEvents từ PlanDetail nữa). */
const EMPTY_SITE_EVENTS_FOR_FLOW: SiteEvent[] = [];

type PlanDetailScreenProps = {
  route: PlannerRouteProp<"PlanDetailScreen">;
  navigation: PlannerCompositeNavigationProp;
};

const PlanDetailScreen = ({ route, navigation }: PlanDetailScreenProps) => {
  const {
    planId,
    autoAddSiteId,
    autoAddDay,
    planPrefill,
    inviteToken,
    inviteStatus,
    invitedView,
    ownerName,
    ownerEmail,
    depositAmount,
    penaltyPercentage,
    inviteType,
  } = route.params || {};
  const { t } = useTranslation();

  const initialPrefilledPlan = useMemo<PlanEntity | null>(() => {
    if (!planPrefill?.id) return null;

    const startDate =
      typeof planPrefill.start_date === "string"
        ? planPrefill.start_date
        : typeof planPrefill.startDate === "string"
          ? planPrefill.startDate
          : undefined;
    const endDate =
      typeof planPrefill.end_date === "string"
        ? planPrefill.end_date
        : typeof planPrefill.endDate === "string"
          ? planPrefill.endDate
          : startDate;

    return {
      id: String(planPrefill.id),
      user_id: "",
      name: String(planPrefill.name || planPrefill.title || "Kế hoạch"),
      start_date: startDate,
      end_date: endDate,
      number_of_days: Math.max(1, Number(planPrefill.number_of_days || 1)),
      number_of_people: Math.max(1, Number(planPrefill.number_of_people || 1)),
      transportation: String(planPrefill.transportation || "car"),
      status: String(planPrefill.status || "planning"),
      share_token: "",
      qr_code_url: "",
      created_at: "",
      updated_at: "",
      item_count: Number(planPrefill.item_count || 0),
      items_by_day: {},
    };
  }, [planPrefill]);

  const formatTimeValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") {
      if (value.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return value.substring(0, 5);
      }
      return value;
    }
    if (typeof value === "object" && value.hours !== undefined) {
      const hours = value.hours || 0;
      const minutes = value.minutes || 0;
      return formatDurationLocalized(hours * 60 + minutes, t);
    }
    return String(value);
  };
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanEntity | null>(initialPrefilledPlan);
  const [loading, setLoading] = useState(true);
  const [pullRefreshing, setPullRefreshing] = useState(false);

  const isPlanOwner = useMemo(
    () => !!plan && !!user?.id && String(plan.user_id) === String(user.id),
    [plan, user?.id],
  );
  const isInvitePendingView =
    !!invitedView &&
    !!inviteToken &&
    ["pending", "awaiting_payment"].includes(
      String(inviteStatus || "").toLowerCase(),
    );
  const isReadOnlyPlannerView = !isPlanOwner;
  const isDroppedOut = plan?.viewer_join_status === "dropped_out";
  const showMembersInsteadOfChat = useMemo(() => {
    const st = String(plan?.status || "").toLowerCase();
    return (
      !!plan &&
      !isPlanOwner &&
      !isInvitePendingView &&
      !isDroppedOut &&
      (st === "planning" || st === "locked")
    );
  }, [isInvitePendingView, isPlanOwner, plan, isDroppedOut]);
  const { syncing: syncingCalendar, syncPlanToCalendar } = useCalendarSync();
  const { confirm } = useConfirm();
  const { isOffline, offlineQueueCount } = useOffline();
  const [syncingOfflineActions, setSyncingOfflineActions] = useState(false);
  const { unreadChatCount, markAsRead: markChatAsRead } = useChatUnreadCount(
    planId,
    user?.id,
    isOffline,
  );

  const mapRef = useRef<VietmapViewRef>(null);
  const autoRedirectedToActiveRef = useRef(false);
  /** True một khi user được xác nhận dropped_out — không bao giờ reset về false dù API omit field sau đó. */
  const wasDroppedOutRef = useRef(false);
  const [plannerUserLocation, setPlannerUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [nearbyAmenityPins, setNearbyAmenityPins] = useState<MapPin[]>([]);
  const [nearbyAmenityLookup, setNearbyAmenityLookup] = useState<
    Record<string, SiteNearbyPlace>
  >({});
  const [removingNearbyAmenityKey, setRemovingNearbyAmenityKey] = useState<
    string | null
  >(null);
  const [pendingNearbyRemovals, setPendingNearbyRemovals] = useState<
    Record<string, { itemId: string; amenityId: string; amenityName: string }>
  >({});
  const pendingNearbyRemovalTimersRef = useRef<
    Record<string, ReturnType<typeof setTimeout>>
  >({});
  const pendingNearbyRemovalMetaRef = useRef<
    Record<
      string,
      {
        itemId: string;
        amenityId: string;
        previousIds: string[];
        nextIds: string[];
      }
    >
  >({});

  const pilgrimagePins: MapPin[] = useMemo(
    () => buildPlanMapPins(plan),
    [plan],
  );
  const mapPins: MapPin[] = useMemo(
    () => [...pilgrimagePins, ...nearbyAmenityPins],
    [pilgrimagePins, nearbyAmenityPins],
  );
  const mapCenter = useMemo(
    () => getPlanMapCenter(pilgrimagePins.length ? pilgrimagePins : mapPins),
    [pilgrimagePins, mapPins],
  );
  const groupPatronConstraint = useMemo(
    () => getGroupPatronConstraintFromPlan(plan),
    [plan],
  );

  useEffect(() => {
    return () => {
      Object.values(pendingNearbyRemovalTimersRef.current).forEach(
        (timerId) => {
          clearTimeout(timerId);
        },
      );
      pendingNearbyRemovalTimersRef.current = {};
      pendingNearbyRemovalMetaRef.current = {};
    };
  }, []);

  const pendingNearbyRemovalsByItem = useMemo(() => {
    const grouped: Record<
      string,
      { amenityId: string; amenityName: string }[]
    > = {};

    Object.values(pendingNearbyRemovals).forEach((entry) => {
      if (!grouped[entry.itemId]) {
        grouped[entry.itemId] = [];
      }
      grouped[entry.itemId].push({
        amenityId: entry.amenityId,
        amenityName: entry.amenityName,
      });
    });

    return grouped;
  }, [pendingNearbyRemovals]);

  useEffect(() => {
    let cancelled = false;

    const getNearbyMarkerType = (category?: string): MapPin["markerType"] => {
      const normalized = String(category || "").toLowerCase();
      if (normalized === "food" || normalized === "restaurant") {
        return "restaurant";
      }
      if (normalized === "lodging" || normalized === "hotel") {
        return "hotel";
      }
      return "media";
    };

    const loadNearbyPins = async () => {
      if (!plan?.items_by_day || isOffline) {
        setNearbyAmenityPins([]);
        setNearbyAmenityLookup({});
        return;
      }

      const uniqueSites = new Map<string, { name: string }>();
      Object.values(plan.items_by_day).forEach((items) => {
        items.forEach((item) => {
          const siteId = String(item.site_id || item.site?.id || "").trim();
          if (!siteId) return;
          if (!item.site?.latitude || !item.site?.longitude) return;
          if (!uniqueSites.has(siteId)) {
            uniqueSites.set(siteId, { name: String(item.site?.name || "") });
          }
        });
      });

      if (!uniqueSites.size) {
        setNearbyAmenityPins([]);
        setNearbyAmenityLookup({});
        return;
      }

      const responses = await Promise.allSettled(
        Array.from(uniqueSites.entries()).map(([siteId, site]) =>
          pilgrimSiteApi
            .getSiteNearbyPlaces(siteId, { limit: 50 })
            .then((res) => ({
              siteId,
              siteName: site.name,
              places: res?.data?.data || [],
            })),
        ),
      );

      if (cancelled) return;

      const seen = new Set<string>();
      const pins: MapPin[] = [];
      const amenityLookup: Record<string, SiteNearbyPlace> = {};
      responses.forEach((entry) => {
        if (entry.status !== "fulfilled") return;
        entry.value.places.forEach((place: SiteNearbyPlace) => {
          const placeId = String(place?.id || "").trim();
          const lat = Number(place?.latitude);
          const lng = Number(place?.longitude);
          if (!placeId || Number.isNaN(lat) || Number.isNaN(lng)) return;

          amenityLookup[placeId] = place;

          if (seen.has(placeId)) return;
          seen.add(placeId);

          const markerType = getNearbyMarkerType(place.category);
          const pinColor =
            markerType === "restaurant"
              ? "#DC2626"
              : markerType === "hotel"
                ? "#1D4ED8"
                : "#0F766E";

          pins.push({
            id: `nearby_${placeId}`,
            latitude: lat,
            longitude: lng,
            title: place.name || "Tiện ích xung quanh",
            subtitle: `${entry.value.siteName || "Điểm hành hương"} • ${place.address || ""}`,
            markerType,
            color: pinColor,
          });
        });
      });

      setNearbyAmenityPins(pins);
      setNearbyAmenityLookup(amenityLookup);
    };

    void loadNearbyPins();

    return () => {
      cancelled = true;
    };
  }, [plan?.items_by_day, isOffline]);

  const handlePlannerUserLocationUpdate = useCallback(
    (loc: { latitude: number; longitude: number }) => {
      setPlannerUserLocation((prev) => {
        if (!prev) return loc;
        const latMeters = (loc.latitude - prev.latitude) * 111000;
        const lngMeters =
          (loc.longitude - prev.longitude) *
          111000 *
          Math.cos((loc.latitude * Math.PI) / 180);
        const movedMeters = Math.sqrt(latMeters ** 2 + lngMeters ** 2);
        if (movedMeters < 80) return prev;
        return loc;
      });
    },
    [],
  );

  // Fly camera to fit all pins when pins change
  useEffect(() => {
    const pinsForFit = pilgrimagePins.length > 0 ? pilgrimagePins : mapPins;
    if (pinsForFit.length > 0 && mapRef.current) {
      // Small delay to ensure the map is mounted & ready
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        if (pinsForFit.length === 1) {
          mapRef.current.flyTo(
            pinsForFit[0].latitude,
            pinsForFit[0].longitude,
            13,
          );
          return;
        }
        const lats = pinsForFit.map((p) => p.latitude);
        const lngs = pinsForFit.map((p) => p.longitude);
        const minLat = Math.min(...lats);
        const maxLat = Math.max(...lats);
        const minLng = Math.min(...lngs);
        const maxLng = Math.max(...lngs);
        const centerLat = (minLat + maxLat) / 2;
        const centerLng = (minLng + maxLng) / 2;
        const latDiff = maxLat - minLat;
        const lngDiff = maxLng - minLng;
        const maxDiff = Math.max(latDiff, lngDiff);
        let targetZoom = 12;
        if (maxDiff > 5) targetZoom = 4;
        else if (maxDiff > 3) targetZoom = 5;
        else if (maxDiff > 1.5) targetZoom = 6;
        else if (maxDiff > 1) targetZoom = 7;
        else if (maxDiff > 0.5) targetZoom = 8;
        else if (maxDiff > 0.2) targetZoom = 9;
        else if (maxDiff > 0.1) targetZoom = 10;
        else if (maxDiff > 0.05) targetZoom = 11;
        else if (maxDiff > 0.02) targetZoom = 12;
        else targetZoom = 13;
        mapRef.current.flyTo(centerLat, centerLng, targetZoom);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [mapPins, pilgrimagePins]);

  // Add Item State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [addFlowOriginDay, setAddFlowOriginDay] = useState<number | null>(null);
  const { sites, isLoading: isLoadingSites, fetchSites } = useSites();
  const [favorites, setFavorites] = useState<SiteSummary[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "events">(
    "all",
  );

  // Events tab: danh sách site có sự kiện (nạp lần đầu khi mở tab)
  const [eventSitesList, setEventSitesList] = useState<SiteSummary[]>([]);
  const [isLoadingEventSites, setIsLoadingEventSites] = useState(false);
  const [hasLoadedEventSites, setHasLoadedEventSites] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const addItemInFlightRef = useRef(false);
  const [reloadingDayNumber, setReloadingDayNumber] = useState<number | null>(
    null,
  );
  const [etaSyncFromDay, setEtaSyncFromDay] = useState<number | null>(null);
  /**
   * Ngày đã thử đồng bộ nhưng điểm đầu rơi ra ngoài khung mở cửa
   * (di chuyển quá lâu hoặc đóng cửa trước khi đến) — trường hợp này
   * không thể tự đồng bộ; phải xoá điểm hiện tại và chọn điểm khác.
   */
  const [blockedSyncInfo, setBlockedSyncInfo] = useState<{
    dayNumber: number;
    itemId?: string;
    siteName?: string;
    eta?: string;
    closeTime?: string;
    openingWindow?: string;
    /**
     * Vân tay các ngày trước (và item đầu ngày bị chặn) tại thời điểm chặn.
     * Khi signature thay đổi → có điểm trước đó vừa đổi → huỷ cờ chặn để
     * user có thể bấm "Đồng bộ" lại và đánh giá tình huống mới.
     */
    signature?: string;
  } | null>(null);

  /**
   * Tạo signature phản ánh trạng thái ảnh hưởng tới ETA của ngày `dayNumber`:
   * liệt kê tất cả item ở các ngày 1..dayNumber (id, order, giờ, rest) cùng
   * id điểm đầu ngày bị chặn. Nếu có bất kỳ thay đổi → signature khác.
   */
  const buildBlockedSyncSignature = useCallback(
    (sourcePlan: PlanEntity | null | undefined, dayNumber: number): string => {
      if (!sourcePlan?.items_by_day || !Number.isFinite(dayNumber)) return "";
      const parts: string[] = [];
      for (let d = 1; d <= dayNumber; d += 1) {
        const dayItems = sortPlanDayItems(
          sourcePlan.items_by_day[String(d)] || [],
        );
        dayItems.forEach((it) => {
          parts.push(
            [
              d,
              it.id ?? "",
              it.order_index ?? "",
              it.estimated_time ?? it.arrival_time ?? "",
              it.rest_duration ?? "",
              it.travel_time_minutes ?? "",
            ].join(":"),
          );
        });
      }
      return parts.join("|");
    },
    [],
  );

  // Gỡ cờ chặn khi:
  //  a) điểm đầu ngày bị chặn đã đổi/ bị xoá, HOẶC
  //  b) có thay đổi ở các ngày trước (vì ETA phụ thuộc các ngày đó).
  useEffect(() => {
    if (!blockedSyncInfo || !plan?.items_by_day) return;

    const dayItems = sortPlanDayItems(
      plan.items_by_day[String(blockedSyncInfo.dayNumber)] || [],
    );
    const firstId = dayItems[0]?.id;
    if (!firstId) {
      setBlockedSyncInfo(null);
      return;
    }
    if (blockedSyncInfo.itemId && firstId !== blockedSyncInfo.itemId) {
      setBlockedSyncInfo(null);
      return;
    }

    if (blockedSyncInfo.signature) {
      const currentSignature = buildBlockedSyncSignature(
        plan,
        blockedSyncInfo.dayNumber,
      );
      if (currentSignature !== blockedSyncInfo.signature) {
        setBlockedSyncInfo(null);
      }
    }
  }, [blockedSyncInfo, plan, buildBlockedSyncSignature]);

  // Time picker state (shared)
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [lastClosedDayNumber, setLastClosedDayNumber] = useState(0);

  const selectedDayDateLabel = useMemo(() => {
    if (!plan?.start_date) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: selectedDay,
      });
    }

    const baseDate = new Date(plan.start_date);
    if (Number.isNaN(baseDate.getTime())) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: selectedDay,
      });
    }

    baseDate.setDate(baseDate.getDate() + Math.max(0, selectedDay - 1));

    const weekday = baseDate.toLocaleDateString("vi-VN", {
      weekday: "long",
    });
    const dateText = baseDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return `${weekday}, ${dateText}`;
  }, [plan?.start_date, selectedDay, t]);

  const getLastClosedDayFromPlan = useCallback(
    (sourcePlan: PlanEntity | null | undefined): number => {
      const p = sourcePlan as any;
      if (!p || typeof p !== "object") return 0;

      const rawClosedDays = p.closed_days || p.closedDays;
      if (Array.isArray(rawClosedDays)) {
        const maxClosed = rawClosedDays
          .map((value) => Number(value))
          .filter((value) => Number.isFinite(value) && value > 0)
          .reduce((acc, value) => Math.max(acc, Math.floor(value)), 0);
        if (maxClosed > 0) return maxClosed;
      }

      const directCandidates = [
        p.last_closed_day,
        p.last_closed_day_number,
        p.lastClosedDay,
      ];

      for (const candidate of directCandidates) {
        const numeric = Number(candidate);
        if (!Number.isFinite(numeric)) continue;
        if (numeric <= 0) continue;

        return Math.max(0, Math.floor(numeric));
      }

      const nextDayToClose = Number(p.next_day_to_close ?? p.nextDayToClose);
      if (Number.isFinite(nextDayToClose) && nextDayToClose > 1) {
        return Math.max(0, Math.floor(nextDayToClose - 1));
      }

      const legacyClosedDay = Number(p.closed_day);
      if (Number.isFinite(legacyClosedDay) && legacyClosedDay > 0) {
        return Math.max(0, Math.floor(legacyClosedDay));
      }

      return 0;
    },
    [],
  );

  useEffect(() => {
    const fromPlan = getLastClosedDayFromPlan(plan);
    setLastClosedDayNumber((current) => Math.max(current, fromPlan));
  }, [getLastClosedDayFromPlan, plan]);

  // Important: only trust backend closed-day markers.
  // Do not infer "closed" from handled item statuses to avoid premature lock UI.
  const effectiveLastClosedDayNumber = lastClosedDayNumber;

  // ── Add Site Flow (hook) ──
  const addSiteFlow = useAddSiteFlow({
    plan,
    selectedDay,
    siteEvents: EMPTY_SITE_EVENTS_FOR_FLOW,
  });

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingToCommunity, setSharingToCommunity] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [updatingPlanStatus, setUpdatingPlanStatus] = useState(false);

  // Cross-day auto-push states are now managed by addSiteFlow hook

  // Item detail sheet state
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);

  // Edit Item Hook
  const {
    showEditItemModal,
    setShowEditItemModal,
    editingItem,
    editEstimatedTime,
    setEditEstimatedTime,
    editRestDuration,
    setEditRestDuration,
    editNote,
    setEditNote,
    showEditTimePicker,
    editTempTime,
    savingEdit,
    calculatingEditRoute,
    editScheduleContext,
    editInsight,
    editSuggestedTime,
    handleOpenEditItem,
    handleEditTimeChange,
    openEditTimePicker,
    handleSaveEditItem,
  } = useEditItemForm({
    planId,
    plan,
    t,
    applyPlanMutation,
    loadPlan,
  });

  const editSelectedDay = Number(
    editingItem?.day_number ?? editingItem?.leg_number ?? 1,
  );

  const editSelectedDayDateLabel = useMemo(() => {
    if (!plan?.start_date) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: editSelectedDay,
      });
    }

    const baseDate = new Date(plan.start_date);
    if (Number.isNaN(baseDate.getTime())) {
      return t("planner.dayNumberOnly", {
        defaultValue: "Ngày {{day}}",
        day: editSelectedDay,
      });
    }

    baseDate.setDate(baseDate.getDate() + Math.max(0, editSelectedDay - 1));

    const weekday = baseDate.toLocaleDateString("vi-VN", {
      weekday: "long",
    });
    const dateText = baseDate.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    return `${weekday}, ${dateText}`;
  }, [editSelectedDay, plan?.start_date, t]);

  // Nearby Places Hook
  const {
    showNearbyModal,
    setShowNearbyModal,
    nearbyPlaces,
    loadingNearby,
    nearbyCategory,
    setNearbyCategory,
    nearbySiteName,
    savingNearbyPlaceId,
    savedNearbyPlaceIds,
    handleSaveNearbyPlace,
  } = useNearbyPlaces({
    planId,
    t,
    applyPlanMutation,
    loadPlan,
    setSelectedItem,
  });

  /** First tap on reorder icon selects; second on another item in the same day swaps. */
  const [swapPick, setSwapPick] = useState<{
    dayKey: string;
    itemId: string;
  } | null>(null);

  // Edit Plan Modal
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanStartDate, setEditPlanStartDate] = useState("");
  const [editPlanEndDate, setEditPlanEndDate] = useState("");
  const [editPlanPeople, setEditPlanPeople] = useState(1);
  const [editPlanMinPeople, setEditPlanMinPeople] = useState(2);
  const [editPlanTransportation, setEditPlanTransportation] = useState("bus");
  const [editPlanDepositInput, setEditPlanDepositInput] = useState("");
  const [editPlanPenaltyInput, setEditPlanPenaltyInput] = useState("0");
  const [savingPlan, setSavingPlan] = useState(false);
  const [editPlanModalError, setEditPlanModalError] = useState<string | null>(
    null,
  );
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);
  const [editLockAt, setEditLockAt] = useState<string | null>(null);
  const [isLockScheduleExpanded, setIsLockScheduleExpanded] = useState(true);

  useEffect(() => {
    if (editPlanPeople > 1) {
      setEditPlanMinPeople((m) =>
        Math.min(
          editPlanPeople,
          Math.max(MIN_GROUP_MIN_PEOPLE_REQUIRED, m),
        ),
      );
    }
  }, [editPlanPeople]);

  // Menu Dropdown state
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [previewJoinedCount, setPreviewJoinedCount] = useState<number | null>(
    null,
  );

  // Full Map Modal state
  const [showFullMap, setShowFullMap] = useState(false);

  // Route calculation (extracted to hook)
  const { routeCoordinates, routeSegments, routeSummary, routeLoading } =
    usePlanRoute(plan, isOffline, plannerUserLocation);

  // Calendar Sync Modal state
  const [showCalendarSyncModal, setShowCalendarSyncModal] = useState(false);
  const [calendarSyncSuccess, setCalendarSyncSuccess] = useState(false);
  const [calendarSyncResult, setCalendarSyncResult] = useState<
    PlannerCalendarSyncResult | undefined
  >();
  const [calendarSyncError, setCalendarSyncError] = useState<
    CalendarSyncError | undefined
  >();

  // Offline Download state
  const {
    downloading: downloadingOffline,
    progress: offlineProgress,
    error: offlineError,
    success: offlineSuccess,
    downloadPlanner,
    checkAvailability,
    deleteOfflineData: deleteOffline,
    reset: resetOfflineDownload,
  } = useOfflineDownload();
  const [showOfflineModal, setShowOfflineModal] = useState(false);
  const [isAvailableOffline, setIsAvailableOffline] = useState(false);
  const [offlineTileUrlTemplate, setOfflineTileUrlTemplate] = useState<
    string | undefined
  >();

  useFocusEffect(
    useCallback(() => {
      // Attempt to hide bottom tab strictly when focused
      const parent = navigation.getParent();
      parent?.setOptions({
        tabBarStyle: { display: "none" },
      });

      return () => {
        parent?.setOptions({
          tabBarStyle: {
            height: 60 + (insets.bottom || 10),
            paddingBottom: insets.bottom || 10,
            paddingTop: 8,
            backgroundColor: COLORS.white,
            borderTopWidth: 1,
            borderTopColor: COLORS.border,
            display: "flex",
          },
        });
      };
    }, [navigation, insets]),
  );

  // Handle returning from browser payment (PayOS)
  useEffect(() => {
    if (!isInvitePendingView) return;

    const subscription = AppState.addEventListener("change", (nextAppState) => {
      if (nextAppState === "active") {
        // App has come to the foreground, reload to check if payment succeeded
        loadPlan();
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isInvitePendingView]);

  useEffect(() => {
    loadPlan();
    checkOfflineAvailability();
  }, [planId]);

  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      void loadPlan({ silent: true });
      void checkOfflineAvailability();
    });

    return unsubscribe;
  }, [navigation, planId]);

  // Auto-reload for members when plan is ongoing (polling every 30 seconds)
  useEffect(() => {
    // Only poll for members (not owner) when plan is active; former members (read-only) do not need fast refresh
    if (isPlanOwner || !plan || isOffline || isDroppedOut) return;

    const planStatus = String(plan.status || "").toLowerCase();
    const shouldPoll = planStatus === "ongoing" || planStatus === "locked";

    if (!shouldPoll) return;

    const interval = setInterval(() => {
      void loadPlan({ silent: true });
    }, 8000); // Keep members in sync quickly for auto-transition UX

    return () => clearInterval(interval);
  }, [isPlanOwner, isDroppedOut, plan?.status, planId, isOffline]);

  // Member auto-transition: khi owner đã bắt đầu chuyến, chỉ thành viên `joined` tự theo lên ActiveJourney.
  useEffect(() => {
    const status = String(plan?.status || "").toLowerCase();

    if (status !== "ongoing") {
      autoRedirectedToActiveRef.current = false;
      return;
    }

    if (!plan?.id) return;
    if (isPlanOwner) return;
    if (isInvitePendingView) return;
    // Double-guard: cả isDroppedOut (reactive) lẫn wasDroppedOutRef (ổn định, không bị reset khi API omit field).
    if (isDroppedOut || wasDroppedOutRef.current) return;
    if (String(plan?.viewer_join_status || "") !== "joined") return;
    if (autoRedirectedToActiveRef.current) return;

    autoRedirectedToActiveRef.current = true;
    navigation.replace("ActiveJourneyScreen", { planId: plan.id });
  }, [
    isDroppedOut,
    isInvitePendingView,
    isPlanOwner,
    navigation,
    plan?.id,
    plan?.status,
    plan?.viewer_join_status,
  ]);

  async function checkOfflineAvailability() {
    const [available, tileTemplate] = await Promise.all([
      checkAvailability(planId),
      offlinePlannerService.getOfflineMapTileTemplate(planId),
    ]);
    setIsAvailableOffline(available);
    setOfflineTileUrlTemplate(tileTemplate || undefined);
  }

  const showConnectionRequiredAlert = () => {
    Toast.show({
      type: "error",
      text1: t("common.error"),
      text2: t("offline.noConnection", {
        defaultValue: "Không có kết nối mạng",
      }),
    });
  };

  const { respondingInvite, handleRejectInvite, handleJoinInvite } =
    useInvitePlanActions({
      inviteToken,
      planId,
      navigation,
      t,
      isOffline,
      showConnectionRequiredAlert,
    });

  const runGuardedUiAction = useCallback(
    (key: string, action: () => void) => {
      runWithActionGuard(`plan-detail:${planId}:${key}`, action);
    },
    [planId],
  );

  const handleOpenChat = () => {
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    void markChatAsRead();
    runGuardedUiAction("open-chat", () => {
      navigation.dispatch(
        CommonActions.navigate({
          name: "PlanChatScreen",
          params: {
            planId,
            planName: plan?.name,
            ownerId: plan?.user_id || plan?.owner?.id,
          },
        }),
      );
    });
  };

  const handleOpenMembers = () => {
    runGuardedUiAction("open-members", () => {
      navigation.dispatch(
        CommonActions.navigate({
          name: "PlannerMembersScreen",
          params: {
            planId,
            planName: plan?.name,
            readOnlyFormerMember: isDroppedOut,
          },
        }),
      );
    });
  };

  // Chat unread count polling is now handled by useChatUnreadCount hook

  const getKnownSiteSnapshot = (
    siteId: string,
  ): LocalSiteSnapshot | undefined => {
    const knownSites = [...sites, ...favorites, ...eventSitesList];
    const matchedSite = knownSites.find((site) => site.id === siteId);

    if (!matchedSite) {
      return undefined;
    }

    return {
      id: matchedSite.id,
      name: matchedSite.name,
      address: matchedSite.address,
      coverImage: matchedSite.coverImage,
      latitude: matchedSite.latitude,
      longitude: matchedSite.longitude,
    };
  };

  const loadOfflinePlan = async () => {
    const offlinePlan = await offlinePlannerService.getPlannerEntity(planId);
    if (!offlinePlan) {
      return false;
    }

    setPlan(offlinePlan);
    setIsAvailableOffline(true);
    return true;
  };

  async function applyPlanMutation(
    localUpdater: (currentPlan: PlanEntity) => PlanEntity,
    cacheUpdater?: () => Promise<PlanEntity | null>,
  ) {
    let cachedPlan: PlanEntity | null = null;

    if (isAvailableOffline && cacheUpdater) {
      try {
        cachedPlan = await cacheUpdater();
      } catch (error) {
        console.log("Failed to persist offline planner mutation:", error);
      }
    }

    if (cachedPlan) {
      const nextPlan = localUpdater(cachedPlan);
      setPlan(nextPlan);
      return nextPlan;
    }

    setPlan((currentPlan) =>
      currentPlan ? localUpdater(currentPlan) : currentPlan,
    );
    return null;
  }

  // Auto-open time setup when navigated from AddToPlanModal (Explore flow)
  const autoAddHandled = useRef(false);
  useEffect(() => {
    if (autoAddSiteId && plan && !loading && !autoAddHandled.current) {
      autoAddHandled.current = true;
      setSelectedDay(autoAddDay || 1);
      // Small delay to ensure state is ready
      setTimeout(() => {
        handleAddItem(autoAddSiteId);
      }, 300);
    }
  }, [autoAddSiteId, plan, loading]);

  useEffect(() => {
    if (isAddModalVisible) {
      if (activeTab === "all") {
        fetchSites({ limit: 20 });
        if (!hasLoadedEventSites) {
          void loadEventSites();
        }
      } else {
        fetchFavorites();
      }
    }
  }, [isAddModalVisible, activeTab, hasLoadedEventSites]);

  const fetchFavorites = async () => {
    try {
      setIsLoadingFavorites(true);
      const response = await pilgrimSiteApi.getFavorites({ limit: 50 }); // Fetch more for selection
      if (response.success && response.data?.sites) {
        // Map FavoriteSite (snake_case) to SiteSummary (camelCase) for consistency
        const mappedFavorites: SiteSummary[] = response.data.sites.map(
          (site) => ({
            id: site.id,
            name: site.name,
            address: site.address,
            coverImage: site.cover_image,
            rating: 0, // Not in FavoriteSite, default
            reviewCount: 0, // Not in FavoriteSite, default
            isFavorite: true,
            type: site.type,
            region: site.region,
            patronSaint: site.patron_saint || undefined,
          }),
        );
        setFavorites(mappedFavorites);
      }
    } catch (error) {
      console.log("Fetch favorites error:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const loadPlanFromInvitePreview = async () => {
    if (!inviteToken) return false;
    const inviteRes = await pilgrimPlannerApi.getPlanByInviteToken(inviteToken);
    if (!(inviteRes?.success && inviteRes.data)) {
      return false;
    }

    if (inviteRes.data.status === "accepted") {
      // User has successfully joined/paid!
      Toast.show({
        type: "success",
        text1: t("planner.inviteJoinSuccessTitle", {
          defaultValue: "Tham gia th\u00e0nh c\u00f4ng",
        }),
        text2: t("planner.inviteJoinSuccessBody", {
          defaultValue:
            "B\u1ea1n \u0111\u00e3 l\u00e0 th\u00e0nh vi\u00ean c\u1ee7a k\u1ebf ho\u1ea1ch n\u00e0y.",
        }),
        visibilityTime: 3000,
      });
      // Replace screen to plain member view
      navigation.replace("PlanDetailScreen", { planId });
      return true;
    }

    if (!inviteRes.data.planner) return false;

    const preview = inviteRes.data.planner as any;
    setPlan(
      (prev) =>
        ({
          ...(prev || {}),
          id: preview.id || planId,
          user_id: prev?.user_id || "",
          name: preview.name || "Kế hoạch được mời",
          start_date: preview.start_date,
          end_date: preview.end_date,
          number_of_days: preview.number_of_days || preview.estimated_days || 1,
          number_of_people: preview.number_of_people || 1,
          transportation: preview.transportation || "car",
          status: preview.status || "planning",
          share_token: prev?.share_token || "",
          qr_code_url: prev?.qr_code_url || "",
          created_at: preview.created_at || prev?.created_at || "",
          updated_at: preview.updated_at || prev?.updated_at || "",
          items_by_day: preview.items_by_day || prev?.items_by_day || {},
          owner: preview.owner || prev?.owner,
          deposit_amount: preview.deposit_amount,
          penalty_percentage: preview.penalty_percentage,
          is_locked: preview.is_locked,
        }) as PlanEntity,
    );

    setPreviewJoinedCount(
      typeof preview.companion_count === "number"
        ? preview.companion_count
        : null,
    );

    // If coming from deep-link, inviteType may not be in route params yet
    // Update from API response so the UI knows friend vs external
    if (!inviteType && inviteRes.data.invite_type) {
      navigation.setParams({ inviteType: inviteRes.data.invite_type });
    }

    return true;
  };

  async function loadPlan(options?: { silent?: boolean }) {
    try {
      const isSilentRefresh = Boolean(options?.silent && plan);
      if (!isSilentRefresh) {
        setLoading(true);
      }
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        const hasOfflinePlan = await loadOfflinePlan();
        if (!hasOfflinePlan) {
          showConnectionRequiredAlert();
        }
        return;
      }

      // Invite preview: DO NOT call the protected detail endpoint (may return 403).
      if (isInvitePendingView) {
        const loadedFromInvite = await loadPlanFromInvitePreview();
        if (!loadedFromInvite) {
          const hasOfflinePlan = await loadOfflinePlan();
          if (hasOfflinePlan) return;
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: t("planner.loadDetailError", {
              defaultValue: "Không thể tải chi tiết kế hoạch",
            }),
          });
        }
        return;
      }

      const response = await pilgrimPlannerApi.getPlanDetail(planId);
      if (
        !isInvitePendingView &&
        response &&
        response.success === false &&
        isPlanAccessForbiddenError(response.message || "")
      ) {
        Toast.show({
          type: "info",
          text1: t("planner.planAccessRevokedTitle", {
            defaultValue: "Không còn quyền xem",
          }),
          text2: t("planner.planAccessRevokedBody", {
            defaultValue: "Đang quay về danh sách kế hoạch.",
          }),
        });
        navigation.navigate("PlannerMain", { refresh: Date.now() });
        return;
      }
      if (response?.success && response.data) {
        const nextPlan = response.data;
        // Ghi nhận dropped_out vào ref ngay khi API trả về
        if (nextPlan.viewer_join_status === "dropped_out") {
          wasDroppedOutRef.current = true;
        }
        setPlan((prev) => {
          const incomingDays = Math.max(
            Number(nextPlan.number_of_days || 0),
            Object.keys(nextPlan.items_by_day || {}).length,
            1,
          );
          const previousDays = Math.max(Number(prev?.number_of_days || 0), 1);
          // Bảo toàn viewer_join_status: nếu API mới không trả "dropped_out"
          // nhưng trước đó đã từng là dropped_out, giữ lại để isDroppedOut không flip.
          const prevJoinStatus = prev?.viewer_join_status;
          const safeJoinStatus =
            nextPlan.viewer_join_status != null
              ? nextPlan.viewer_join_status
              : wasDroppedOutRef.current
                ? ("dropped_out" as const)
                : prevJoinStatus;
          return {
            ...nextPlan,
            number_of_days: Math.max(previousDays, incomingDays),
            viewer_join_status: safeJoinStatus,
          };
        });
        try {
          const memRes = await pilgrimPlannerApi.getPlanMembers(planId);
          if (memRes.success && memRes.data?.members) {
            const membersActive = memRes.data.members.filter(
              (m) =>
                String(m.join_status || "").toLowerCase() !== "dropped_out",
            );
            setPlan((prev) =>
              prev && prev.id === nextPlan.id
                ? {
                    ...prev,
                    members: membersActive as unknown[],
                  }
                : prev,
            );
          }
        } catch {
          /* roster vẫn dựa trên companion_count / mặc định 1 */
        }
        return;
      }

      if (inviteToken) {
        const loadedFromInvite = await loadPlanFromInvitePreview();
        if (loadedFromInvite) return;
      }

      const hasOfflinePlan = await loadOfflinePlan();
      if (hasOfflinePlan) return;

      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          response?.message ||
          t("planner.loadDetailError", {
            defaultValue: "Không thể tải chi tiết kế hoạch",
          }),
      });
    } catch (error) {
      if (isInvitePendingView) {
        // In invite preview mode, we expect the protected detail endpoint is not used.
        // Keep logs quiet and just fallback to offline / toast.
      } else {
        const errMsg = extractApiErrorMessage(error, "");
        const httpStatus = (error as { response?: { status?: number } })
          ?.response?.status;
        if (isPlanAccessForbiddenError(errMsg, httpStatus)) {
          Toast.show({
            type: "info",
            text1: t("planner.planAccessRevokedTitle", {
              defaultValue: "Không còn quyền xem",
            }),
            text2: t("planner.planAccessRevokedBody", {
              defaultValue: "Đang quay về danh sách kế hoạch.",
            }),
          });
          navigation.navigate("PlannerMain", { refresh: Date.now() });
          return;
        }
        console.log("Load plan detail error:", error);
        if (inviteToken) {
          try {
            const loadedFromInvite = await loadPlanFromInvitePreview();
            if (loadedFromInvite) {
              return;
            }
          } catch {
            // Ignore and fallback below
          }
        }
      }
      const hasOfflinePlan = await loadOfflinePlan();
      if (hasOfflinePlan) {
        return;
      }

      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.loadPlanFailed", {
          defaultValue: "Tải chi tiết kế hoạch thất bại",
        }),
      });
    } finally {
      setLoading(false);
    }
  }

  const handleOpenEditPlan = async () => {
    if (isReadOnlyPlannerView) return;

    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotEdit"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    if (!plan) return;
    setEditPlanName(plan.name || "");
    setEditPlanStartDate(plan.start_date || "");
    setEditPlanEndDate(plan.end_date || "");
    const nPeople = plan.number_of_people || 1;
    setEditPlanPeople(nPeople);
    const rawMin = plan.min_people_required;
    const parsedMin =
      rawMin != null && Number.isFinite(Number(rawMin))
        ? Math.round(Number(rawMin))
        : null;
    const lower = nPeople > 1 ? MIN_GROUP_MIN_PEOPLE_REQUIRED : 1;
    setEditPlanMinPeople(
      parsedMin != null
        ? Math.min(nPeople, Math.max(lower, parsedMin))
        : nPeople > 1
          ? Math.min(MIN_GROUP_MIN_PEOPLE_REQUIRED, nPeople)
          : 1,
    );
    setEditPlanTransportation(plan.transportation || "bus");
    // Deposit: API may return number or string — normalise both
    const rawDeposit = (plan as any).deposit_amount ?? depositAmount;
    const daNum = Number(rawDeposit);
    setEditPlanDepositInput(
      !isNaN(daNum) && daNum > 0 ? String(Math.round(daNum)) : "",
    );
    // Penalty
    const rawPenalty = (plan as any).penalty_percentage ?? penaltyPercentage;
    const ppNum = Number(rawPenalty);
    setEditPlanPenaltyInput(
      !isNaN(ppNum) && Number.isFinite(ppNum) ? String(Math.round(ppNum)) : "0",
    );
    setEditLockAt(plan.edit_lock_at || null);
    setEditPlanModalError(null);
    runGuardedUiAction("open-edit-plan-modal", () => {
      setShowEditPlanModal(true);
    });
  };

  const handleSavePlan = async () => {
    setEditPlanModalError(null);
    if (!editPlanName.trim()) {
      setEditPlanModalError(t("planner.planNameRequired"));
      return;
    }
    try {
      setSavingPlan(true);
      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        showConnectionRequiredAlert();
        return;
      }

      let depositAmount = 0;
      let penaltyPct = 0;
      const shareLocked = !!plan?.first_invite_at;
      const editLockedOnly = !!plan?.is_locked;
      const depositPenaltyFromPlan = () => ({
        dep: Math.round(
          Number((plan as PlanEntity)?.deposit_amount ?? 0),
        ),
        pen: Math.round(
          Number((plan as PlanEntity)?.penalty_percentage ?? 0),
        ),
      });

      if (editPlanPeople > 1) {
        if (
          !Number.isInteger(editPlanMinPeople) ||
          editPlanMinPeople < MIN_GROUP_MIN_PEOPLE_REQUIRED ||
          editPlanMinPeople > editPlanPeople
        ) {
          setEditPlanModalError(
            t("planner.minPeopleInvalid", {
              min: MIN_GROUP_MIN_PEOPLE_REQUIRED,
              defaultValue:
                "Minimum must be at least 2 and at most the group size.",
            }),
          );
          return;
        }
        if (editLockedOnly || shareLocked) {
          const { dep, pen } = depositPenaltyFromPlan();
          depositAmount = dep;
          penaltyPct = pen;
        } else {
          const dep = parseVndInteger(editPlanDepositInput);
          if (!isValidGroupDepositVnd(dep)) {
            setEditPlanModalError(
              t("planner.depositOutOfRange", {
                min: MIN_DEPOSIT_VND,
                max: MAX_DEPOSIT_VND,
                defaultValue:
                  "Cọc từ {{min}} đến {{max}} VNĐ (theo quy định).",
              }),
            );
            return;
          }
          const pen = parsePenaltyPercent(editPlanPenaltyInput);
          if (!isValidGroupPenaltyPercent(pen)) {
            setEditPlanModalError(
              t("planner.penaltyOutOfGroupRange", {
                min: MIN_GROUP_PENALTY_PERCENT,
                max: MAX_GROUP_PENALTY_PERCENT,
                defaultValue: "Tỷ lệ phạt từ {{min}}% đến {{max}}%.",
              }),
            );
            return;
          }
          depositAmount = dep;
          penaltyPct = pen;
        }
      }

      let updateBody: UpdatePlanRequest;

      if (plan?.is_locked) {
        // If plan is already edit-locked, only allow updating the lock schedule
        updateBody = {
          edit_lock_at: editLockAt,
        } as any;
      } else {
        updateBody = {
          name: editPlanName.trim(),
          start_date: editPlanStartDate,
          end_date: editPlanEndDate,
          number_of_people: editPlanPeople,
          transportation: editPlanTransportation,
          ...(editPlanPeople > 1
            ? {
                deposit_amount: depositAmount,
                penalty_percentage: penaltyPct,
                min_people_required: editPlanMinPeople,
                // Chỉ gửi edit_lock_at nếu giá trị thay đổi so với ban đầu
                ...(editLockAt !== (plan?.edit_lock_at || null)
                  ? { edit_lock_at: editLockAt }
                  : {}),
              }
            : { deposit_amount: 0, penalty_percentage: 0 }),
        };
      }

      const response = await pilgrimPlannerApi.updatePlan(planId, updateBody);
      if (response.success) {
        if (isAvailableOffline) {
          await offlinePlannerService.updatePlannerMetadata(planId, {
            name: editPlanName.trim(),
            start_date: editPlanStartDate,
            end_date: editPlanEndDate,
            number_of_people: editPlanPeople,
            transportation: editPlanTransportation,
            ...(editPlanPeople > 1
              ? {
                  deposit_amount: depositAmount,
                  penalty_percentage: penaltyPct,
                  min_people_required: editPlanMinPeople,
                }
              : { deposit_amount: 0, penalty_percentage: 0 }),
          });
        }

        setEditPlanModalError(null);
        setShowEditPlanModal(false);
        await loadPlan();
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.planUpdated"),
        });
      } else {
        setEditPlanModalError(
          response.message || t("planner.cannotUpdatePlan"),
        );
      }
    } catch (error: any) {
      setEditPlanModalError(error.message || t("planner.cannotUpdatePlan"));
    } finally {
      setSavingPlan(false);
    }
  };

  const loadEventSites = async () => {
    if (hasLoadedEventSites) return;
    try {
      setIsLoadingEventSites(true);
      const params: any = { has_events: "true", limit: 100 };
      if (plan?.start_date && plan?.end_date) {
        params.start_date = plan.start_date.substring(0, 10);
        params.end_date = plan.end_date.substring(0, 10);
      }

      const res = await pilgrimSiteApi.getSites(params);
      if (res && res.success && res.data) {
        const rawData = (res.data as any).data || (res.data as any).items || [];
        const siteData = rawData.map((site: any) => ({
          id: site.id,
          name: site.name,
          address: site.address || "",
          coverImage: site.cover_image || site.coverImage || "",
          rating: site.rating || 0,
          reviewCount: site.review_count || site.reviewCount || 0,
          isFavorite: site.is_favorite || site.isFavorite || false,
          type: site.type,
          latitude: site.latitude || 0,
          longitude: site.longitude || 0,
          patronSaint: site.patron_saint || site.patronSaint || undefined,
        }));
        setEventSitesList(siteData);
      }
      setHasLoadedEventSites(true);
    } catch (e) {
      console.log("Fetch event sites error:", e);
    } finally {
      setIsLoadingEventSites(false);
    }
  };

  const handleOpenSiteDetailFromAddModal = (siteId: string) => {
    if (!siteId) return;
    runGuardedUiAction(`site-detail:${siteId}`, () => {
      navigation.dispatch(
        CommonActions.navigate({
          name: "SiteDetail",
          params: { siteId },
        }),
      );
    });
  };

  const handleOpenNearbyAmenitiesFromAddModal = (site: SiteSummary) => {
    if (!site?.id) return;
    runGuardedUiAction(`nearby:${site.id}`, () => {
      navigation.dispatch(
        CommonActions.navigate({
          name: "NearbySiteAmenitiesScreen",
          params: {
            planId,
            siteId: site.id,
            siteName: site.name,
            siteAddress: site.address,
            latitude: site.latitude,
            longitude: site.longitude,
            itemsByDay: plan?.items_by_day || {},
          },
        }),
      );
    });
  };

  const handleOpenShareModal = () => {
    if (isReadOnlyPlannerView) return;
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    runGuardedUiAction("open-share-modal", () => {
      setShowShareModal(true);
    });
  };

  const handleSharePlannerToCommunity = async () => {
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }
    if (
      !plan ||
      (plan.status || "").toLowerCase() !== "completed" ||
      !isPlanOwner
    ) {
      return;
    }
    setSharingToCommunity(true);
    try {
      const response = await pilgrimPlannerApi.sharePlannerToCommunity(planId);
      if (response.success) {
        Toast.show({
          type: "success",
          text1: t("planner.shareCommunitySuccessTitle", {
            defaultValue: "Đã chia sẻ lên cộng đồng",
          }),
          text2: t("planner.shareCommunitySuccessBody", {
            defaultValue: "Bài viết đã được tạo từ hành trình của bạn.",
          }),
          visibilityTime: 3500,
        });
        setPlan((prev) =>
          prev ? { ...prev, shared_to_community: true } : prev,
        );
        await loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            response.message ||
            t("planner.shareCommunityError", {
              defaultValue:
                "Không thể chia sẻ. Kiểm tra quyền và trạng thái kế hoạch.",
            }),
          visibilityTime: 4500,
        });
      }
    } catch (error: any) {
      console.log("Share planner to community error:", error);
      const errMsg = extractApiErrorMessage(
        error,
        t("planner.shareCommunityError", {
          defaultValue:
            "Không thể chia sẻ. Kiểm tra quyền và trạng thái kế hoạch.",
        }),
      );
      showErrorToast(t, errMsg, { visibilityTime: 4500 });
    } finally {
      setSharingToCommunity(false);
    }
  };

  const handleManualLockEdit = async () => {
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }
    if (!isPlanOwner) return;

    // Check if there is at least a first invite AT
    if (!plan?.first_invite_at) {
      Toast.show({
        type: "error",
        text1: t("planner.lockEditFailedTitle", {
          defaultValue: "Không thể khoá chỉnh sửa",
        }),
        text2: t("planner.lockEditRequiresInvite", {
          defaultValue:
            "Cần mời ít nhất 1 thành viên trước khi có thể khoá chỉnh sửa.",
        }),
        visibilityTime: 4000,
      });
      return;
    }

    const confirmed = await confirm({
      type: "info",
      iconName: "shield-checkmark-outline",
      title: t("planner.lockEditConfirmTitle", {
        defaultValue: "Khoá chỉnh sửa lộ trình?",
      }),
      message: t("planner.lockEditConfirmMessage", {
        defaultValue:
          "Bạn có chắc muốn khoá lộ trình ngay bây giờ? Việc này sẽ ghi đè lịch trình tự động. Sau khi khoá, lộ trình sẽ được cố định để thành viên tham khảo, nhưng chưa khoá danh sách người đi.",
      }),
      confirmText: t("planner.lockEditConfirmAction", {
        defaultValue: "Khoá ngay",
      }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    setUpdatingPlanStatus(true);
    try {
      const res = await pilgrimPlannerApi.updatePlannerLock(planId, {
        locked: true,
      });
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("planner.lockEditSuccessTitle", {
            defaultValue: "Đã khoá chỉnh sửa",
          }),
          text2: t("planner.lockEditSuccessMessage", {
            defaultValue: "Lộ trình đã được khoá cố định.",
          }),
          visibilityTime: 3000,
        });
        await loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("planner.lockEditFailedMessage", {
              defaultValue: "Không thể khoá chỉnh sửa.",
            }),
        });
      }
    } catch (error: any) {
      const errMsg = extractApiErrorMessage(
        error,
        t("planner.lockEditFailedMessage", {
          defaultValue: "Không thể khoá chỉnh sửa.",
        }),
      );
      showErrorToast(t, errMsg, { visibilityTime: 4000 });
    } finally {
      setUpdatingPlanStatus(false);
    }
  };

  const handleUpdatePlannerStatus = async (
    targetStatus: "locked" | "ongoing" | "completed",
  ) => {
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }
    if (!isPlanOwner) return;

    const isLock = targetStatus === "locked";
    const isStart = targetStatus === "ongoing";
    const isComplete = targetStatus === "completed";

    // Validate schedule completion locally before any API calls for 'locked' or 'ongoing':
    if ((isStart || isLock) && plan) {
      let totalDays = 0;
      if (plan.start_date && plan.end_date) {
        const start = new Date(plan.start_date);
        const end = new Date(plan.end_date);
        totalDays =
          Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
          1;
      } else {
        const itemsMap = plan.items_by_day || {};
        const numericKeys = Object.keys(itemsMap)
          .map(Number)
          .filter((d) => !isNaN(d));
        totalDays = numericKeys.length > 0 ? Math.max(...numericKeys) : 1;
      }

      const missingDays = [];
      const itemsMap = plan.items_by_day || {};
      for (let i = 1; i <= totalDays; i++) {
        const dayStr = String(i);
        if (!itemsMap[dayStr] || itemsMap[dayStr].length === 0) {
          missingDays.push(i);
        }
      }

      if (missingDays.length > 0) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: t("planner.missingDaysBeforeAction", {
            days: missingDays.join(", "),
            action: isLock
              ? t("planner.lockPlanActionText", {
                  defaultValue: "chốt kế hoạch",
                })
              : t("planner.startJourneyActionText", {
                  defaultValue: "bắt đầu hành hương",
                }),
            defaultValue:
              "Vui lòng thêm điểm viếng cho ngày {{days}} trước khi {{action}}.",
          }),
          visibilityTime: 4000,
        });
        return;
      }
    }

    const title = isLock
      ? t("planner.lockPlanTitle", { defaultValue: "Chốt kế hoạch" })
      : isStart
        ? t("planner.startJourneyTitle", { defaultValue: "Bắt đầu hành hương" })
        : t("planner.completeJourneyTitle", {
            defaultValue: "Kết thúc chuyến đi",
          });

    let msg = isLock
      ? t("planner.lockPlanMsg", {
          defaultValue:
            "Bạn có chắc muốn chốt kế hoạch này? Sau khi chốt, danh sách thành viên sẽ bị khoá và có thể bắt đầu hành hương cùng mọi người.",
        })
      : isStart
        ? t("planner.startJourneyMsg", {
            defaultValue:
              "Bạn có chắc muốn bắt đầu hành hương? Trạng thái sẽ chuyển thành 'Đang thực hiện'.",
          })
        : t("planner.completeJourneyMsg", {
            defaultValue:
              "Bạn có chắc muốn kết thúc chuyến đi? Trạng thái sẽ chuyển thành 'Hoàn thành'.",
          });

    let confirmType: "info" | "warning" = isComplete ? "warning" : "info";

    // 12-hour warning check for Group Lock Plan
    if (
      isLock &&
      isGroupJourneyPlan(plan || {}) &&
      plan?.is_locked &&
      plan?.edit_lock_at
    ) {
      const lockEditTime = new Date(plan.edit_lock_at).getTime();
      const now = new Date().getTime();
      const hoursSinceLock = (now - lockEditTime) / (1000 * 60 * 60);

      if (hoursSinceLock < 12) {
        msg = t("planner.lockPlanSoonMsg", {
          defaultValue:
            "Lịch trình chỉ mới khoá chỉnh sửa chưa đầy 12h, một số thành viên có thể chưa kịp xem để xác nhận đi hay không. Bạn có chắc chắn muốn chốt danh sách người tham gia ngay bây giờ không?",
        });
        confirmType = "warning";
      }
    }

    const confirmed = await confirm({
      type: confirmType,
      iconName: isLock
        ? "flag-outline"
        : isStart
          ? "compass-outline"
          : "checkmark-done-circle-outline",
      title,
      message: msg,
      confirmText: isLock
        ? t("planner.finalizeNow")
        : isStart
          ? t("planner.startNow")
          : title,
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    setUpdatingPlanStatus(true);
    try {
      // Solo planner: auto-lock status before starting (backend requires 'locked' before 'ongoing')
      const isSolo = !isGroupJourneyPlan(plan || {});
      const currentStatus = (plan?.status || "").toLowerCase();

      if (isStart && isSolo && currentStatus === "planning") {
        await pilgrimPlannerApi.updatePlannerStatus(planId, {
          status: "locked",
        });
      }

      // Group planner: if owner wants to lock status but edit is not locked yet, lock edit first
      // Update: Edit lock logic holds its own separate CTA button (Khoá lộ trình), so we no longer do it here.

      const res = await pilgrimPlannerApi.updatePlannerStatus(planId, {
        status: targetStatus,
      });
      if (res.success) {
        Toast.show({
          type: "success",
          text1: title,
          text2: isLock
            ? t("planner.lockPlanSuccess", {
                defaultValue: "Kế hoạch đã được chốt!",
              })
            : isStart
              ? t("planner.startJourneySuccess", {
                  defaultValue: "Chuyến đi đã bắt đầu!",
                })
              : t("planner.completeJourneySuccess", {
                  defaultValue: "Chuyến đi đã hoàn thành!",
                }),
          visibilityTime: 3000,
        });
        await loadPlan();
        if (isStart) {
          navigation.replace("ActiveJourneyScreen", {
            planId,
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("planner.statusUpdateFailed", {
              defaultValue: "Không thể cập nhật trạng thái.",
            }),
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      const errMsg = extractApiErrorMessage(
        error,
        t("planner.statusUpdateFailed", {
          defaultValue: "Không thể cập nhật trạng thái.",
        }),
      );
      showErrorToast(t, errMsg, { visibilityTime: 4000 });
    } finally {
      setUpdatingPlanStatus(false);
    }
  };

  const handleDeletePlan = async () => {
    if (isReadOnlyPlannerView) return;
    setShowMenuDropdown(false);

    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotDelete"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("planner.deleteTitle", { defaultValue: "Xóa kế hoạch" }),
      message: t("planner.deleteConfirmMsg", {
        defaultValue:
          "Bạn có chắc chắn muốn xóa kế hoạch này? Hành động này không thể hoàn tác.",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        showConnectionRequiredAlert();
        return;
      }

      const response = await pilgrimPlannerApi.deletePlan(planId);
      if (response.success) {
        if (isAvailableOffline) {
          await offlinePlannerService.deletePlannerData(planId);
        }
        Toast.show({
          type: "success",
          text1: t("planner.deleteSuccess", {
            defaultValue: "Đã xóa kế hoạch",
          }),
        });
        // Navigate back and trigger refresh
        navigation.navigate("PlannerMain", {
          refresh: Date.now(), // Use timestamp to force refresh
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            response.message ||
            t("planner.deleteFailed", {
              defaultValue: "Xóa kế hoạch thất bại",
            }),
        });
      }
    } catch (error) {
      console.log("Delete plan error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.deleteFailed", {
          defaultValue: "Xóa kế hoạch thất bại",
        }),
      });
    }
  };

  const handleClearAllItems = async () => {
    if (isReadOnlyPlannerView || !plan) return;
    setShowMenuDropdown(false);

    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotClearItems"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("planner.clearAllItemsTitle", {
        defaultValue: "Xóa toàn bộ địa điểm",
      }),
      message: t("planner.clearAllItemsConfirmMsg", {
        defaultValue:
          "Bạn có chắc muốn xóa tất cả địa điểm trong kế hoạch này? Hành động này không thể hoàn tác.",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
      setLoading(true);
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        await applyPlanMutation(
          (currentPlan) => applyLocalClearAllItems(currentPlan),
          () => offlinePlannerService.clearPlannerItems(planId),
        );

        await networkService.addToOfflineQueue({
          endpoint: PILGRIM_ENDPOINTS.PLANNER.CLEAR_ITEMS(planId),
          method: "DELETE",
          data: {},
        });

        loadPlan();
        return;
      }

      const response = await pilgrimPlannerApi.clearPlanItems(planId);
      if (response.success) {
        await applyPlanMutation(
          (currentPlan) => applyLocalClearAllItems(currentPlan),
          () => offlinePlannerService.clearPlannerItems(planId),
        );
        loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            response.message ||
            t("planner.clearAllItemsFailed", {
              defaultValue: "Xóa toàn bộ địa điểm thất bại",
            }),
        });
      }
    } catch (error: any) {
      console.log("Clear all items error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          error.message ||
          t("planner.clearAllItemsFailed", {
            defaultValue: "Xóa toàn bộ địa điểm thất bại",
          }),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSyncCalendar = async () => {
    setShowMenuDropdown(false);

    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotSyncCalendar"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    const response = await syncPlanToCalendar(planId);

    if (response.success && response.result) {
      setCalendarSyncSuccess(true);
      setCalendarSyncResult(response.result);
      setCalendarSyncError(undefined);
    } else if (response.error) {
      setCalendarSyncSuccess(false);
      setCalendarSyncResult(undefined);
      setCalendarSyncError(response.error);
    }

    runGuardedUiAction("open-calendar-sync-modal", () => {
      setShowCalendarSyncModal(true);
    });
  };

  const handleSyncOfflineActions = async () => {
    setShowMenuDropdown(false);

    if (offlineQueueCount === 0) {
      Toast.show({
        type: "info",
        text1: t("common.success"),
        text2: t("planner.noPendingOfflineActions", {
          defaultValue: "Khong co hanh dong ngoai tuyen nao cho dong bo",
        }),
      });
      return;
    }

    const isOnline = await networkService.checkConnection();
    if (!isOnline) {
      showConnectionRequiredAlert();
      return;
    }

    try {
      setSyncingOfflineActions(true);
      const result = await offlineSyncService.syncOfflineActions();

      if ((result.synced || 0) > 0 || result.success) {
        await loadPlan();
      }

      if (!result.success && (result.failed || 0) > 0) {
        const shouldClearPending = await confirm({
          type: "danger",
          title: t("common.error", { defaultValue: "Lỗi" }),
          message: `${result.message}\n\n${t(
            "offline.clearPendingActionsPrompt",
            {
              defaultValue:
                "Nếu hành động này đang bị máy chủ từ chối, bạn có thể xóa hàng chờ đồng bộ trên thiết bị này.",
            },
          )}`,
          confirmText: t("offline.clearPendingActions", {
            defaultValue: "Xóa hàng chờ đồng bộ",
          }),
          cancelText: t("common.cancel", { defaultValue: "Hủy" }),
        });

        if (shouldClearPending) {
          await offlineSyncService.clearPendingActions();
          Toast.show({
            type: "success",
            text1: t("offline.clearPendingActionsSuccess", {
              defaultValue: "Đã xóa hàng chờ đồng bộ",
            }),
          });
        }
        return;
      }

      Toast.show({
        type: result.success ? "success" : "error",
        text1: result.success ? t("common.success") : t("common.error"),
        text2: result.message,
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          error.message ||
          t("planner.syncFailed", { defaultValue: "Dong bo that bai" }),
      });
    } finally {
      setSyncingOfflineActions(false);
    }
  };

  const handleDownloadOffline = async () => {
    setShowMenuDropdown(false);

    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    runGuardedUiAction("open-offline-modal", () => {
      setShowOfflineModal(true);
    });
    resetOfflineDownload();

    const result = await downloadPlanner(planId);

    if (result.success) {
      await checkOfflineAvailability();
    }
  };

  const handleClearOfflineActions = async () => {
    setShowMenuDropdown(false);

    if (offlineQueueCount === 0) {
      Toast.show({
        type: "info",
        text1: t("common.success"),
        text2: t("planner.noPendingOfflineActions", {
          defaultValue: "Không có hành động ngoại tuyến nào chờ đồng bộ",
        }),
      });
      return;
    }

    const confirmed = await confirm({
      type: "danger",
      title: t("offline.clearPendingActions", {
        defaultValue: "Xóa hàng chờ đồng bộ",
      }),
      message: t("offline.clearPendingActionsConfirm", {
        defaultValue:
          "Xóa tất cả hành động đang chờ đồng bộ trên thiết bị này? Các thay đổi offline này sẽ không được gửi lên hệ thống.",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) {
      return;
    }

    await offlineSyncService.clearPendingActions();
    Toast.show({
      type: "success",
      text1: t("offline.clearPendingActionsSuccess", {
        defaultValue: "Đã xóa hàng chờ đồng bộ",
      }),
    });
  };

  const handleOpenOfflineDownloads = () => {
    setShowMenuDropdown(false);

    navigation.getParent()?.dispatch(
      CommonActions.navigate({
        name: "Ho so",
        params: {
          screen: "OfflineDownloads",
        },
      }),
    );
  };

  const handleReloadEtaFromMenu = async () => {
    setShowMenuDropdown(false);

    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotSyncEta"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    const targetDay =
      etaSyncFromDay ||
      Object.keys(plan?.items_by_day || {})
        .map((day) => Number(day))
        .filter((day) => Number.isFinite(day) && day > 1)
        .sort((a, b) => a - b)[0];
    if (!targetDay) {
      Toast.show({
        type: "info",
        text1: t("planner.reloadEtaNotNeededTitle", {
          defaultValue: "Không cần đồng bộ giờ dự kiến",
        }),
        text2: t("planner.reloadEtaNotNeededMessage", {
          defaultValue:
            "Hiện chưa có ngày phụ thuộc (từ ngày 2) để đồng bộ giờ dự kiến theo điểm liền kề.",
        }),
      });
      return;
    }

    const shouldProceed = await confirm({
      type: "warning",
      title: t("planner.reloadEtaConfirmTitle", {
        defaultValue: "Xác nhận đồng bộ giờ dự kiến",
      }),
      message: t("planner.reloadEtaConfirmMessage", {
        defaultValue:
          "Thao tác này sẽ tính lại giờ theo điểm trước đó và thời gian di chuyển. Một số điểm có thể tự chuyển sang ngày khác. Thay đổi sẽ áp dụng ngay cho lịch trình.",
      }),
      confirmText: t("planner.syncShort", { defaultValue: "Đồng bộ" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!shouldProceed) {
      return;
    }

    await handleReloadDayFromPrevious(targetDay);
  };

  const handleDeleteOfflineData = async () => {
    setShowMenuDropdown(false);
    const confirmed = await confirm({
      type: "danger",
      title: t("offline.deleteOfflineData", {
        defaultValue: "Xóa dữ liệu ngoại tuyến",
      }),
      message: t("offline.deleteOfflineConfirm", {
        defaultValue:
          "Bạn có chắc muốn xóa dữ liệu ngoại tuyến của kế hoạch này?",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (confirmed) {
      const result = await deleteOffline(planId);
      if (result.success) {
        setIsAvailableOffline(false);
        setOfflineTileUrlTemplate(undefined);
        Toast.show({
          type: "success",
          text1: t("offline.deleteSuccess", {
            defaultValue: "Đã xóa dữ liệu ngoại tuyến",
          }),
        });
      }
    }
  };

  const handleDeleteItem = async (
    itemId: string,
    options: { skipConfirm?: boolean } = {},
  ) => {
    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotDeleteItem"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    if (!options.skipConfirm) {
      const confirmed = await confirm({
        type: "danger",
        iconName: "trash-outline",
        title: t("planner.removeItem", { defaultValue: "Xóa địa điểm" }),
        message: t("planner.removeItemConfirm", {
          defaultValue:
            "Bạn có chắc chắn muốn xóa địa điểm này khỏi lịch trình?",
        }),
        confirmText: t("common.delete", { defaultValue: "Xóa" }),
        cancelText: t("common.cancel", { defaultValue: "Hủy" }),
      });

      if (!confirmed) return;
    }

    try {
      const currentPlan = plan;
      const changedDay = currentPlan
        ? Object.entries(currentPlan.items_by_day || {}).reduce<number>(
            (found, [dayKey, dayItems]) => {
              if (found > 0) return found;
              const hasItem = (dayItems || []).some(
                (item) => String(item.id || "") === String(itemId || ""),
              );
              return hasItem ? Number(dayKey) || 0 : 0;
            },
            0,
          )
        : 0;

      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items/${itemId}`,
          method: "DELETE",
          data: {
            planner_item_id: itemId,
          },
        });

        await applyPlanMutation(
          (nextPlan) => applyLocalDeleteItem(nextPlan, itemId),
          async () => offlinePlannerService.deletePlannerItem(planId, itemId),
        );
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        if (changedDay > 0) {
          markEtaSyncFromDay(changedDay + 1);
        }
        return;
      }

      const response = await pilgrimPlannerApi.deletePlanItem(planId, itemId);
      if (response.success) {
        await applyPlanMutation(
          (nextPlan) => applyLocalDeleteItem(nextPlan, itemId),
          async () => offlinePlannerService.deletePlannerItem(planId, itemId),
        );
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.removeItemSuccess", {
            defaultValue: "Đã xóa địa điểm khỏi lịch trình",
          }),
        });
        if (changedDay > 0) {
          markEtaSyncFromDay(changedDay + 1);
        }
        loadPlan({ silent: true });
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            response.message ||
            t("planner.removeItemFailed", {
              defaultValue: "Xóa địa điểm thất bại",
            }),
        });
      }
    } catch (error: any) {
      console.log("Delete item error:", error?.message || error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          error.message ||
          t("planner.removeItemFailed", {
            defaultValue: "Xóa địa điểm thất bại",
          }),
      });
    }
  };

  const applyLocalNearbyAmenityIds = useCallback(
    (itemId: string, amenityIds: string[]) => {
      setPlan((currentPlan) => {
        if (!currentPlan) return currentPlan;

        const nextItemsByDay: Record<string, PlanItem[]> = {};
        Object.entries(currentPlan.items_by_day || {}).forEach(
          ([dayKey, dayItems]) => {
            nextItemsByDay[dayKey] = (dayItems || []).map((dayItem) => {
              if (String(dayItem.id || "") !== String(itemId || "")) {
                return dayItem;
              }

              return {
                ...dayItem,
                nearby_amenity_ids: amenityIds,
              };
            });
          },
        );

        return {
          ...currentPlan,
          items_by_day: nextItemsByDay,
        };
      });

      setSelectedItem((prev) =>
        prev && String(prev.id || "") === String(itemId)
          ? { ...prev, nearby_amenity_ids: amenityIds }
          : prev,
      );
    },
    [],
  );

  const commitPendingNearbyRemoval = useCallback(
    async (removeKey: string) => {
      const pendingMeta = pendingNearbyRemovalMetaRef.current[removeKey];
      if (!pendingMeta) {
        return;
      }

      const { itemId, nextIds, previousIds } = pendingMeta;

      setRemovingNearbyAmenityKey(removeKey);

      try {
        const isOnline = await networkService.checkConnection();

        if (!isOnline) {
          await networkService.addToOfflineQueue({
            endpoint: `/api/planners/${planId}/items/${itemId}`,
            method: "PUT",
            data: {
              planner_item_id: itemId,
              nearby_amenity_ids: nextIds,
            },
          });

          await offlinePlannerService.updatePlannerItem(planId, itemId, {
            nearby_amenity_ids: nextIds,
          });

          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("offline.changesSavedOffline"),
          });
          return;
        }

        const response = await pilgrimPlannerApi.updatePlanItem(
          planId,
          itemId,
          {
            nearby_amenity_ids: nextIds,
          },
        );

        if (!response?.success) {
          throw new Error(
            response?.message ||
              t("planner.removeNearbyAmenityFailed", {
                defaultValue: "Không thể xoá tiện ích lân cận",
              }),
          );
        }

        await offlinePlannerService.updatePlannerItem(planId, itemId, {
          nearby_amenity_ids: nextIds,
        });

        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.removeNearbyAmenitySuccess", {
            defaultValue: "Đã xoá tiện ích khỏi lịch trình",
          }),
        });
      } catch (error: any) {
        applyLocalNearbyAmenityIds(itemId, previousIds);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            error?.message ||
            t("planner.removeNearbyAmenityFailed", {
              defaultValue: "Không thể xoá tiện ích lân cận",
            }),
        });
      } finally {
        const activeTimer = pendingNearbyRemovalTimersRef.current[removeKey];
        if (activeTimer) {
          clearTimeout(activeTimer);
          delete pendingNearbyRemovalTimersRef.current[removeKey];
        }
        delete pendingNearbyRemovalMetaRef.current[removeKey];
        setPendingNearbyRemovals((prev) => {
          if (!prev[removeKey]) return prev;
          const next = { ...prev };
          delete next[removeKey];
          return next;
        });
        setRemovingNearbyAmenityKey((current) =>
          current === removeKey ? null : current,
        );
      }
    },
    [applyLocalNearbyAmenityIds, planId, t],
  );

  const handleRemoveNearbyAmenity = async (
    itemId: string,
    amenityId: string,
  ) => {
    const allItems = Object.values(plan?.items_by_day || {}).flat();
    const targetItem = allItems.find(
      (it) => String(it.id || "") === String(itemId || ""),
    );

    if (!targetItem) {
      return;
    }

    const existingIds = (targetItem.nearby_amenity_ids || []).map((id) =>
      String(id),
    );
    const nextIds = existingIds.filter((id) => id !== String(amenityId));

    if (nextIds.length === existingIds.length) {
      return;
    }

    const removeKey = `${itemId}:${amenityId}`;
    if (pendingNearbyRemovalMetaRef.current[removeKey]) {
      return;
    }

    applyLocalNearbyAmenityIds(itemId, nextIds);

    const amenityName =
      nearbyAmenityLookup[String(amenityId)]?.name ||
      t("planner.savedAmenityFallback", {
        defaultValue: "Tiện ích đã lưu",
      });

    pendingNearbyRemovalMetaRef.current[removeKey] = {
      itemId,
      amenityId,
      previousIds: existingIds,
      nextIds,
    };
    setPendingNearbyRemovals((prev) => ({
      ...prev,
      [removeKey]: {
        itemId,
        amenityId,
        amenityName,
      },
    }));

    pendingNearbyRemovalTimersRef.current[removeKey] = setTimeout(() => {
      void commitPendingNearbyRemoval(removeKey);
    }, 3000);

    Toast.show({
      type: "info",
      text1: t("planner.nearbyRemovedUndoWindowTitle", {
        defaultValue: "Đã ẩn tiện ích (3 giây)",
      }),
      text2: t("planner.nearbyRemovedUndoWindowMessage", {
        defaultValue: "Bạn có thể hoàn tác ngay trên thẻ tiện ích.",
      }),
    });
  };

  const handleUndoRemoveNearbyAmenity = useCallback(
    (itemId: string, amenityId: string) => {
      const removeKey = `${itemId}:${amenityId}`;
      const pendingMeta = pendingNearbyRemovalMetaRef.current[removeKey];
      if (!pendingMeta) {
        return;
      }

      const timerId = pendingNearbyRemovalTimersRef.current[removeKey];
      if (timerId) {
        clearTimeout(timerId);
        delete pendingNearbyRemovalTimersRef.current[removeKey];
      }

      applyLocalNearbyAmenityIds(itemId, pendingMeta.previousIds);

      delete pendingNearbyRemovalMetaRef.current[removeKey];
      setPendingNearbyRemovals((prev) => {
        if (!prev[removeKey]) return prev;
        const next = { ...prev };
        delete next[removeKey];
        return next;
      });

      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("planner.undoNearbyAmenitySuccess", {
          defaultValue: "Đã hoàn tác xoá tiện ích",
        }),
      });
    },
    [applyLocalNearbyAmenityIds, t],
  );

  const handleReplaceBlockedItem = useCallback(
    async (dayNumber: number) => {
      if (!blockedSyncInfo || blockedSyncInfo.dayNumber !== dayNumber) return;
      const { itemId, siteName, eta, closeTime, openingWindow } =
        blockedSyncInfo;
      if (!itemId) return;

      const site =
        siteName || t("planner.thisLocation", { defaultValue: "địa điểm này" });
      const windowText =
        openingWindow ||
        t("planner.unknownOpeningWindow", {
          defaultValue: "không xác định",
        });

      const message = eta
        ? t("planner.blockedSyncMessageWithEta", {
            defaultValue:
              '"{{site}}" không thể nằm trong ngày {{day}}: theo thời gian di chuyển từ điểm trước, giờ đến dự kiến là {{eta}}{{closeSuffix}}, nằm ngoài khung mở cửa {{window}}. Hãy xoá điểm này và chọn điểm khác gần hơn hoặc mở cửa muộn hơn.',
            site,
            day: dayNumber,
            eta,
            closeSuffix: closeTime
              ? t("planner.reloadEtaCloseSuffix", {
                  defaultValue: " (đóng cửa lúc {{time}})",
                  time: closeTime,
                })
              : "",
            window: windowText,
          })
        : t("planner.blockedSyncMessageNoEta", {
            defaultValue:
              '"{{site}}" không thể nằm trong ngày {{day}}: theo thời gian di chuyển từ điểm trước, giờ đến sẽ rơi ngoài khung mở cửa {{window}}. Hãy xoá điểm này và chọn điểm khác gần hơn hoặc mở cửa muộn hơn.',
            site,
            day: dayNumber,
            window: windowText,
          });

      const confirmed = await confirm({
        type: "danger",
        iconName: "trash-outline",
        title: t("planner.blockedSyncTitle", {
          defaultValue: "Không thể đưa vào ngày này",
        }),
        message,
        confirmText: t("planner.deleteBlockingItem", {
          defaultValue: "Xoá điểm",
        }),
        cancelText: t("common.cancel", { defaultValue: "Hủy" }),
      });

      if (!confirmed) return;

      setBlockedSyncInfo(null);
      await handleDeleteItem(itemId, { skipConfirm: true });
    },
    [blockedSyncInfo, confirm, t, handleDeleteItem],
  );

  async function handleReloadDayFromPreviousWithConfirm(dayNumber: number) {
    const shouldProceed = await confirm({
      type: "warning",
      title: t("planner.reloadEtaConfirmTitle", {
        defaultValue: "Xác nhận đồng bộ giờ dự kiến",
      }),
      message: t("planner.reloadEtaConfirmMessage", {
        defaultValue:
          "Thao tác này sẽ tính lại giờ theo điểm trước đó và thời gian di chuyển. Một số điểm có thể tự chuyển sang ngày khác. Thay đổi sẽ áp dụng ngay cho lịch trình.",
      }),
      confirmText: t("planner.syncShort", { defaultValue: "Đồng bộ" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!shouldProceed) {
      return;
    }

    await handleReloadDayFromPrevious(dayNumber);
  }

  const { applyLocalItemPatches, buildDayPatches } = usePlannerDayPatching(
    plan?.transportation,
  );

  const { handleReorderIconPress } = usePlannerSwapActions({
    plan,
    planId,
    isReadOnlyPlannerView,
    swapPick,
    setSwapPick,
    t,
    confirm,
    loadPlan,
    applyPlanMutation,
    buildDayPatches,
    applyLocalItemPatches,
  });

  const openAddModal = (day: number) => {
    if (
      String(plan?.status || "").toLowerCase() === "ongoing" &&
      day <= effectiveLastClosedDayNumber
    ) {
      Toast.show({
        type: "error",
        text1: t("planner.addItemFailedTitle", {
          defaultValue: "Không thể thêm địa điểm",
        }),
        text2: t("planner.dayAlreadyClosedCannotAdd", {
          defaultValue:
            "Ngày {{day}} đã được chốt nên không thể thêm địa điểm mới.",
          day,
        }),
      });
      return;
    }

    setSelectedDay(day);
    setAddFlowOriginDay(day);
    runGuardedUiAction(`open-add-modal-day-${day}`, () => {
      setIsAddModalVisible(true);
    });
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      addSiteFlow.setEstimatedTime(`${hours}:${minutes}`);
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    }
  };

  const openTimePicker = () => {
    const [hours, minutes] = addSiteFlow.estimatedTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    setTempTime(date);
    runGuardedUiAction("open-time-picker", () => {
      setShowTimePicker(true);
    });
  };

  const formatDuration = (minutes: number) => {
    return formatDurationLocalized(minutes, t);
  };

  const calculateEndTime = (startTimeStr: any, durationStr: any): string =>
    calculateEndTimeRaw(startTimeStr, durationStr, formatTimeValue);

  const getDateForDay = (startDateStr: string, dayNumber: number): string =>
    getDateForDayRaw(startDateStr, dayNumber);

  const handleAddItem = async (
    siteId: string,
    eventId?: string,
    startFlowOptions?: { autoBindFirstDayEvent?: boolean },
  ) => {
    // Check if plan is completed
    if (plan?.status === "completed") {
      await confirm({
        iconName: "checkmark-circle",
        title: t("planner.completedPlanTitle"),
        message: t("planner.completedPlanCannotAddItem"),
        confirmText: t("planner.understood"),
        showCancel: false,
      });
      return;
    }

    setAddFlowOriginDay(selectedDay);
    await addSiteFlow.startFlow(siteId, eventId, undefined, startFlowOptions);
  };

  /** Tab "Sự kiện": chạm site → bắt đầu luồng gắn sự kiện trong ngày (nếu có) ngay. */
  const handleAddSiteFromEventsTab = (site: SiteSummary) => {
    if (!site?.id) return;
    void handleAddItem(String(site.id), undefined, {
      autoBindFirstDayEvent: true,
    });
  };

  const closeAddTimeModal = () => {
    addSiteFlow.closeTimeModal();
    setAddFlowOriginDay(null);
  };

  const markEtaSyncFromDay = (fromDay: number | null | undefined) => {
    const safeDay = Number(fromDay || 0);
    if (!Number.isFinite(safeDay) || safeDay < 1) return;
    setEtaSyncFromDay((current) =>
      current === null ? safeDay : Math.min(current, safeDay),
    );
  };

  const hasItemsInDay = useCallback(
    (sourcePlan: PlanEntity | null | undefined, dayNumber: number): boolean => {
      if (!sourcePlan?.items_by_day || dayNumber < 1) return false;
      return (sourcePlan.items_by_day[String(dayNumber)] || []).length > 0;
    },
    [],
  );

  const findPreviousNonEmptyDay = useCallback(
    (sourcePlan: PlanEntity | null | undefined, dayNumber: number): number => {
      if (!sourcePlan?.items_by_day || dayNumber <= 1) return 0;
      let cursor = dayNumber - 1;
      while (cursor >= 1) {
        const items = sortPlanDayItems(
          sourcePlan.items_by_day?.[String(cursor)] || [],
        );
        if (items.length > 0) return cursor;
        cursor -= 1;
      }
      return 0;
    },
    [],
  );

  const detectFirstEtaOutOfSyncDay = useCallback(
    (sourcePlan: PlanEntity | null | undefined): number | null => {
      if (!sourcePlan?.items_by_day) return null;

      const dayKeys = Object.keys(sourcePlan.items_by_day)
        .map((value) => Number(value))
        .filter((value) => Number.isFinite(value) && value >= 2)
        .sort((a, b) => a - b);

      for (const dayNumber of dayKeys) {
        const dayItems = sortPlanDayItems(
          sourcePlan.items_by_day?.[String(dayNumber)] || [],
        );
        if (dayItems.length === 0) continue;

        const previousNonEmptyDay = findPreviousNonEmptyDay(
          sourcePlan,
          dayNumber,
        );
        if (previousNonEmptyDay < 1) continue;

        const previousItems = sortPlanDayItems(
          sourcePlan.items_by_day?.[String(previousNonEmptyDay)] || [],
        );
        const prevLast = previousItems[previousItems.length - 1];
        const firstOfDay = dayItems[0];
        if (!prevLast || !firstOfDay) continue;

        const prevLastTime = toHHmm(
          prevLast.estimated_time || prevLast.arrival_time,
        );
        const prevRest = parseDurationToMinutes(prevLast.rest_duration);
        const safePrevRest = prevRest > 0 ? prevRest : 120;
        const firstTravel = Math.max(
          0,
          Number(firstOfDay.travel_time_minutes) || 0,
        );
        const safeTravel = firstTravel > 0 ? firstTravel : 30;

        const expectedFromPrevious = vietmapService.calculateArrivalTime(
          prevLastTime,
          safePrevRest + safeTravel,
        );
        const expectedTime = toHHmm(expectedFromPrevious.time);
        const currentTime = toHHmm(
          firstOfDay.estimated_time || firstOfDay.arrival_time,
        );
        const expectedDay = Math.max(
          1,
          Math.min(
            dayNumber,
            previousNonEmptyDay +
              Math.max(0, Number(expectedFromPrevious.daysAdded) || 0),
          ),
        );
        const currentDay = Number(
          firstOfDay.day_number ?? firstOfDay.leg_number ?? dayNumber,
        );

        if (currentDay !== expectedDay || currentTime !== expectedTime) {
          return dayNumber;
        }
      }

      return null;
    },
    [findPreviousNonEmptyDay],
  );

  useEffect(() => {
    if (!plan?.items_by_day) return;

    const autoSyncDay = detectFirstEtaOutOfSyncDay(plan);
    setEtaSyncFromDay((current) => {
      if (current !== null && hasItemsInDay(plan, current)) {
        return current;
      }
      return autoSyncDay;
    });
  }, [detectFirstEtaOutOfSyncDay, hasItemsInDay, plan]);

  const filterMeaningfulPatches = useCallback(
    (
      sourcePlan: PlanEntity,
      patches: PlannerItemPatch[],
    ): PlannerItemPatch[] => {
      const itemById = new Map<string, PlanItem>();
      Object.values(sourcePlan.items_by_day || {}).forEach((dayItems) => {
        (dayItems || []).forEach((item) => {
          if (!item?.id) return;
          itemById.set(item.id, item);
        });
      });

      return patches.filter((patch) => {
        const currentItem = itemById.get(patch.id);
        if (!currentItem) return true;

        const currentDay = Number(
          currentItem.day_number ?? currentItem.leg_number ?? 1,
        );
        const currentOrder = Number(currentItem.order_index ?? 0);
        const currentEstimated = toHHmm(
          currentItem.estimated_time || currentItem.arrival_time,
        );
        const currentTravel = Math.max(
          0,
          Number(currentItem.travel_time_minutes) || 0,
        );

        const nextEstimated = toHHmm(patch.estimated_time);
        const nextTravel = Math.max(0, Number(patch.travel_time_minutes) || 0);

        return (
          currentDay !== patch.day_number ||
          currentOrder !== patch.order_index ||
          currentEstimated !== nextEstimated ||
          currentTravel !== nextTravel
        );
      });
    },
    [],
  );

  const handleMoveAddToPreviousDay = async (targetDay: number) => {
    if (!addSiteFlow.selectedSiteId || targetDay < 1) return;
    setSelectedDay(targetDay);
    await addSiteFlow.startFlow(
      addSiteFlow.selectedSiteId,
      addSiteFlow.selectedEventId || undefined,
      targetDay,
      undefined,
    );
  };

  const handleMoveAddBackToOriginDay = async (targetDay: number) => {
    if (!addSiteFlow.selectedSiteId || targetDay < 1) return;
    setSelectedDay(targetDay);
    await addSiteFlow.startFlow(
      addSiteFlow.selectedSiteId,
      addSiteFlow.selectedEventId || undefined,
      targetDay,
      undefined,
    );
  };

  const handleMoveAddToNextDay = async (targetDay: number) => {
    if (!addSiteFlow.selectedSiteId || targetDay < 1) return;
    setSelectedDay(targetDay);
    await addSiteFlow.startFlow(
      addSiteFlow.selectedSiteId,
      addSiteFlow.selectedEventId || undefined,
      targetDay,
      undefined,
    );
  };

  const parseClockToMinutes = (value?: string | null): number | null => {
    if (!value) return null;
    const normalized = String(value).trim().slice(0, 5);
    const [h, m] = normalized.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
    return h * 60 + m;
  };

  const toHHmm = (value?: string | null): string => {
    if (!value) return "00:00";
    const text = String(value).trim();
    return text.length >= 5 ? text.slice(0, 5) : "00:00";
  };

  const extractCreatedItemId = (response: any): string | undefined => {
    const rawId =
      response?.data?.item?.id ??
      response?.data?.id ??
      response?.item?.id ??
      response?.id;
    if (!rawId) return undefined;
    const id = String(rawId).trim();
    return id || undefined;
  };

  const computeFirstItemPatchFromPrevious = useCallback(
    async (
      basePlan: PlanEntity,
      dayNumber: number,
    ): Promise<PlannerItemPatch | null> => {
      if (!basePlan?.items_by_day || dayNumber <= 1) return null;

      const currentDayItems = sortPlanDayItems(
        basePlan.items_by_day?.[String(dayNumber)] || [],
      );
      if (currentDayItems.length === 0) return null;

      const firstItem = currentDayItems[0];
      if (!firstItem?.id) return null;

      let sourceDay = dayNumber - 1;
      let previousDayItems: PlanItem[] = [];
      while (sourceDay >= 1) {
        previousDayItems = sortPlanDayItems(
          basePlan.items_by_day?.[String(sourceDay)] || [],
        );
        if (previousDayItems.length > 0) break;
        sourceDay -= 1;
      }
      if (sourceDay < 1 || previousDayItems.length === 0) return null;

      const prevLast = previousDayItems[previousDayItems.length - 1];
      if (!prevLast) return null;

      const resolveLatLng = async (item: PlanItem) => {
        const localLat = Number(item.site?.latitude || 0);
        const localLng = Number(item.site?.longitude || 0);
        if (localLat && localLng) {
          return { latitude: localLat, longitude: localLng };
        }

        const siteId = item.site_id || item.site?.id;
        if (!siteId) return { latitude: 0, longitude: 0 };

        try {
          const detail = await pilgrimSiteApi.getSiteDetail(siteId);
          const site = detail?.data as any;
          return {
            latitude: Number(site?.latitude || 0),
            longitude: Number(site?.longitude || 0),
          };
        } catch {
          return { latitude: 0, longitude: 0 };
        }
      };

      const [from, to] = await Promise.all([
        resolveLatLng(prevLast),
        resolveLatLng(firstItem),
      ]);

      let travelMinutes = Math.max(
        0,
        Number(firstItem.travel_time_minutes) || 0,
      );

      if (from.latitude && from.longitude && to.latitude && to.longitude) {
        try {
          const route = await vietmapService.calculateRoute(
            { latitude: from.latitude, longitude: from.longitude },
            { latitude: to.latitude, longitude: to.longitude },
            plan?.transportation,
          );
          travelMinutes = Math.max(1, Math.round(route.durationMinutes || 0));
        } catch {
          travelMinutes = Math.max(travelMinutes, 30);
        }
      } else if (travelMinutes <= 0) {
        travelMinutes = 30;
      }

      const prevLastTime = toHHmm(
        prevLast.estimated_time || prevLast.arrival_time,
      );
      const prevRest = parseDurationToMinutes(prevLast.rest_duration);
      const safePrevRest = prevRest > 0 ? prevRest : 120;
      const arrival = vietmapService.calculateArrivalTime(
        prevLastTime,
        safePrevRest + travelMinutes,
      );

      const targetDay = Math.max(
        1,
        Math.min(
          dayNumber,
          sourceDay + Math.max(0, Number(arrival.daysAdded) || 0),
        ),
      );

      return {
        id: firstItem.id,
        day_number: targetDay,
        order_index: Number(firstItem.order_index || 1),
        estimated_time: toHHmm(arrival.time),
        travel_time_minutes: travelMinutes,
      };
    },
    [],
  );

  const computeReflowFromChangedDay = async (
    basePlan: PlanEntity,
    changedDay: number,
  ): Promise<PlannerItemPatch[]> => {
    if (!basePlan?.items_by_day || changedDay < 1) {
      return [];
    }

    const firstItemPatch = await computeFirstItemPatchFromPrevious(
      basePlan,
      changedDay,
    );
    if (!firstItemPatch) return [];

    return filterMeaningfulPatches(basePlan, [firstItemPatch]);
  };

  /**
   * Tách thông tin xung đột (điểm rơi ngoài khung mở cửa) từ lỗi đồng bộ BE
   * để phục vụ UI swap nút "Đồng bộ" → "Xoá điểm chặn".
   */
  const parseReloadEtaConflict = useCallback(
    (
      error: any,
    ): {
      blocked: boolean;
      siteName?: string;
      eta?: string;
      closeTime?: string;
      openingWindow?: string;
    } => {
      const fallback = extractApiErrorMessage(error, "");
      const details = error?.response?.data?.error?.details;
      const primaryDetail = Array.isArray(details) ? details[0] : undefined;
      const detailRecord =
        primaryDetail && typeof primaryDetail === "object"
          ? (primaryDetail as Record<string, any>)
          : null;

      const normalizeClock = (value?: unknown): string | undefined => {
        if (value == null) return undefined;
        const m = String(value)
          .trim()
          .match(/(\d{1,2}:\d{2})/);
        return m ? m[1] : undefined;
      };

      const eta =
        normalizeClock(detailRecord?.estimated_time) ||
        normalizeClock(detailRecord?.eta) ||
        normalizeClock(detailRecord?.arrival_time);
      const closeTime =
        normalizeClock(detailRecord?.close_time) ||
        normalizeClock(detailRecord?.closing_time) ||
        normalizeClock(detailRecord?.site_close_time);
      const openTime =
        normalizeClock(detailRecord?.open_time) ||
        normalizeClock(detailRecord?.opening_time);
      const windowFromMessage = String(fallback).match(
        /(\d{1,2}:\d{2})\s*[\-–]\s*(\d{1,2}:\d{2})/,
      );
      const openingWindow =
        (typeof detailRecord?.opening_window === "string"
          ? detailRecord.opening_window
          : undefined) ||
        (openTime && closeTime ? `${openTime}-${closeTime}` : undefined) ||
        (windowFromMessage
          ? `${windowFromMessage[1]}-${windowFromMessage[2]}`
          : undefined);

      const lowered = String(fallback).toLowerCase();
      const hasWindowSignal =
        /outside\s+(?:opening|hours)|khung\s*mở\s*cửa|not\s*open|after\s+closing|before\s+opening|closed|đóng\s*cửa|chưa\s*(?:đến|toi)\s*giờ\s*mở/i.test(
          lowered,
        );

      const blocked = Boolean(
        detailRecord?.outside_opening_window === true ||
        (eta && (closeTime || openTime)) ||
        hasWindowSignal,
      );

      const siteName =
        detailRecord?.site_name ||
        detailRecord?.siteName ||
        detailRecord?.name ||
        undefined;

      return { blocked, siteName, eta, closeTime, openingWindow };
    },
    [],
  );

  const buildReloadEtaErrorMessage = useCallback(
    (error: any, contextItem?: PlanItem | null) => {
      const fallback = extractApiErrorMessage(
        error,
        t("planner.reloadEtaFailed", {
          defaultValue: "Không thể đồng bộ giờ dự kiến cho lịch trình.",
        }),
      );

      const details = error?.response?.data?.error?.details;
      const primaryDetail = Array.isArray(details) ? details[0] : undefined;
      const detailRecord =
        primaryDetail && typeof primaryDetail === "object"
          ? (primaryDetail as Record<string, any>)
          : null;

      const normalizeClock = (value?: unknown): string | undefined => {
        if (value == null) return undefined;
        const text = String(value).trim();
        const match = text.match(/(\d{1,2}:\d{2})/);
        return match ? match[1] : undefined;
      };

      const readTravelMinutes = (value?: unknown): number | undefined => {
        if (value == null) return undefined;
        const numeric = Number(value);
        if (Number.isFinite(numeric) && numeric > 0) {
          return Math.round(numeric);
        }
        return undefined;
      };

      // Chỉ lấy siteName từ payload có cấu trúc hoặc từ context item của ngày
      // đang đồng bộ — tuyệt đối KHÔNG suy ra từ plain text lỗi để tránh khớp
      // nhầm (ví dụ khớp "đóng cửa lúc 23:19" thành tên điểm).
      const siteName =
        detailRecord?.site_name ||
        detailRecord?.siteName ||
        detailRecord?.name ||
        contextItem?.site?.name ||
        undefined;

      const travelMinutes =
        readTravelMinutes(detailRecord?.travel_time_minutes) ||
        readTravelMinutes(detailRecord?.travelMinutes) ||
        readTravelMinutes(detailRecord?.travel_minutes) ||
        readTravelMinutes(contextItem?.travel_time_minutes);

      const eta =
        normalizeClock(detailRecord?.estimated_time) ||
        normalizeClock(detailRecord?.eta) ||
        normalizeClock(detailRecord?.arrival_time) ||
        normalizeClock(detailRecord?.arrival);

      // Ưu tiên lấy giờ mở/đóng từ field có cấu trúc hoặc từ context site.
      // KHÔNG match `/close\s*at\s*\d+:\d+/` trên fallback vì BE thường nhét
      // chính ETA vào đó gây hiểu nhầm đó là giờ đóng cửa.
      const contextSite = contextItem?.site as
        | { open_time?: string; close_time?: string }
        | undefined;
      const openTime =
        normalizeClock(detailRecord?.open_time) ||
        normalizeClock(detailRecord?.opening_time) ||
        normalizeClock(detailRecord?.site_open_time) ||
        normalizeClock(contextSite?.open_time);
      const closeTime =
        normalizeClock(detailRecord?.close_time) ||
        normalizeClock(detailRecord?.closing_time) ||
        normalizeClock(detailRecord?.site_close_time) ||
        normalizeClock(contextSite?.close_time);

      const windowFromDetail =
        detailRecord?.opening_window ||
        detailRecord?.openingWindow ||
        detailRecord?.open_hours ||
        detailRecord?.opening_hours;
      const windowFromMessage = String(fallback).match(
        /(\d{1,2}:\d{2})\s*[\-–]\s*(\d{1,2}:\d{2})/,
      );

      const openingWindow =
        (typeof windowFromDetail === "string" && windowFromDetail.trim()) ||
        (openTime && closeTime ? `${openTime}-${closeTime}` : undefined) ||
        (windowFromMessage
          ? `${windowFromMessage[1]}-${windowFromMessage[2]}`
          : undefined);

      // Nếu chưa biết giờ đóng cửa, suy ra từ khung mở cửa (phần sau dấu "-").
      const closeTimeForDisplay =
        closeTime ||
        (openingWindow ? openingWindow.split(/[\-–]/)[1]?.trim() : undefined);

      const fallbackText = String(fallback || "").toLowerCase();
      const isBeforeOpening =
        /before\s+opening|not\s+open\s+yet|chưa\s*(đến|toi)\s*giờ\s*mở\s*cửa|sớm\s*hơn\s*giờ\s*mở\s*cửa/i.test(
          fallbackText,
        );
      const isAfterClosing =
        /after\s+closing|quá\s*giờ\s*đóng\s*cửa|trễ\s*hơn\s*giờ\s*đóng\s*cửa/i.test(
          fallbackText,
        ) ||
        (!!eta &&
          !!closeTimeForDisplay &&
          eta.localeCompare(closeTimeForDisplay) >= 0);

      if (!siteName && !eta && !travelMinutes && !openingWindow) {
        return fallback;
      }

      const reason = isBeforeOpening
        ? t("planner.reloadEtaBeforeOpeningReason", {
            defaultValue: "trước giờ mở cửa",
          })
        : isAfterClosing
          ? t("planner.reloadEtaAfterClosingReason", {
              defaultValue: "sau giờ đóng cửa",
            })
          : t("planner.reloadEtaOutsideWindowReason", {
              defaultValue: "ngoài khung mở cửa",
            });

      return t("planner.reloadEtaConflictDetailed", {
        defaultValue:
          "Không thể đồng bộ “{{site}}”: giờ đến dự kiến {{eta}} {{reason}} (khung {{window}}). Hãy xoá điểm này và chọn điểm khác gần hơn hoặc mở cửa muộn hơn.",
        site:
          siteName ||
          t("planner.thisLocation", { defaultValue: "địa điểm này" }),
        eta: eta || t("planner.unknownEta", { defaultValue: "—" }),
        reason,
        window:
          openingWindow ||
          t("planner.unknownOpeningWindow", {
            defaultValue: "không xác định",
          }),
      });
    },
    [t],
  );

  const resolveEtaSyncDayAfterPatch = useCallback(
    (
      sourcePlan: PlanEntity,
      syncedDay: number,
      appliedPatch: PlannerItemPatch | undefined,
    ): number | null => {
      if (!appliedPatch) {
        const nextDay = syncedDay + 1;
        return hasItemsInDay(sourcePlan, nextDay) ? nextDay : null;
      }

      const movedOutOfSyncedDay = appliedPatch.day_number !== syncedDay;
      const sameDayItems = sortPlanDayItems(
        sourcePlan.items_by_day?.[String(syncedDay)] || [],
      );
      const remainingAfterMove = sameDayItems.filter(
        (item) => item.id && item.id !== appliedPatch.id,
      );

      if (movedOutOfSyncedDay && remainingAfterMove.length > 0) {
        // First item was moved out; keep syncing same day for the new first item.
        return syncedDay;
      }

      const nextDay = syncedDay + 1;
      return hasItemsInDay(sourcePlan, nextDay) ? nextDay : null;
    },
    [hasItemsInDay],
  );

  const handleReloadDayFromPrevious = useCallback(
    async (dayNumber: number) => {
      if (!plan || !isPlanOwner) return;

      if (dayNumber < 1) return;

      if (reloadingDayNumber !== null) {
        return;
      }

      try {
        setReloadingDayNumber(dayNumber);
        const patches = await computeReflowFromChangedDay(plan, dayNumber);

        if (patches.length === 0) {
          Toast.show({
            type: "info",
            text1: t("planner.reloadEtaNoChangesTitle", {
              defaultValue: "Không có thay đổi giờ dự kiến",
            }),
            text2: t("planner.reloadEtaNoChangesMessage", {
              defaultValue:
                "Không có điểm phụ thuộc cần đồng bộ từ ngày đã chọn.",
            }),
          });
          setEtaSyncFromDay(null);
          return;
        }

        const appliedPatch = patches[0];
        const nextEtaSyncDay = resolveEtaSyncDayAfterPatch(
          plan,
          dayNumber,
          appliedPatch,
        );

        const isOnline = await networkService.checkConnection();

        if (!isOnline) {
          for (const patch of patches) {
            await networkService.addToOfflineQueue({
              endpoint: `/api/planners/${planId}/items/${patch.id}`,
              method: "PATCH",
              data: {
                day_number: patch.day_number,
                leg_number: patch.day_number,
                order_index: patch.order_index,
                estimated_time: patch.estimated_time,
                travel_time_minutes: patch.travel_time_minutes,
                planner_item_id: patch.id,
              },
            });
          }

          await applyPlanMutation(
            (currentPlan) => applyLocalItemPatches(currentPlan, patches),
            async () => {
              let mirroredPlan =
                await offlinePlannerService.getPlannerEntity(planId);
              for (const patch of patches) {
                const next = await offlinePlannerService.updatePlannerItem(
                  planId,
                  patch.id,
                  {
                    day_number: patch.day_number,
                    estimated_time: patch.estimated_time,
                    travel_time_minutes: patch.travel_time_minutes,
                  },
                );
                if (next) mirroredPlan = next;
              }
              return mirroredPlan;
            },
          );

          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("offline.changesSavedOffline"),
          });
          setEtaSyncFromDay(nextEtaSyncDay);
          return;
        }

        const originalDayByItemId = new Map<string, number>();
        Object.entries(plan.items_by_day || {}).forEach(
          ([dayKey, dayItems]) => {
            const normalizedDay = Number(dayKey);
            if (!Number.isFinite(normalizedDay) || normalizedDay < 1) return;
            (dayItems || []).forEach((item) => {
              if (!item?.id) return;
              originalDayByItemId.set(item.id, normalizedDay);
            });
          },
        );

        for (const patch of patches) {
          if (String(patch.id || "").startsWith("offline_")) {
            continue;
          }
          const originalItem = Object.values(plan.items_by_day || {})
            .flat()
            .find((item) => item.id === patch.id);

          const originalDayNumber = Number(
            originalDayByItemId.get(patch.id) ??
              originalItem?.leg_number ??
              originalItem?.day_number ??
              0,
          );
          const shouldMoveAcrossDay =
            !!originalItem &&
            originalDayNumber > 0 &&
            patch.day_number > 0 &&
            patch.day_number !== originalDayNumber;

          const updatePayload = {
            day_number: patch.day_number,
            leg_number: patch.day_number,
            order_index: patch.order_index,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          } as any;

          if (shouldMoveAcrossDay) {
            // First attempt: ask backend to move the same item across day directly.
            // This keeps operation idempotent and avoids duplicate create on retries.
            const directMoveResponse = await pilgrimPlannerApi.updatePlanItem(
              planId,
              patch.id,
              updatePayload,
            );

            if (directMoveResponse?.success) {
              const movedData: any = directMoveResponse.data;
              const hasDayInfo =
                movedData &&
                (movedData.day_number !== undefined ||
                  movedData.leg_number !== undefined);
              const movedDayNumber = Number(
                movedData?.day_number ??
                  movedData?.leg_number ??
                  patch.day_number,
              );

              if (!hasDayInfo || movedDayNumber === patch.day_number) {
                continue;
              }
            }

            // Fallback for backends that cannot move item across day in-place.
            const moveSiteId = originalItem?.site_id || originalItem?.site?.id;
            if (!moveSiteId) {
              throw new Error(
                t("planner.reloadEtaMoveFallbackMissingSite", {
                  defaultValue:
                    "Không thể đồng bộ vì thiếu thông tin địa điểm để chuyển ngày.",
                }),
              );
            }

            const moveCreateResponse = await pilgrimPlannerApi.addPlanItem(
              planId,
              {
                site_id: String(moveSiteId),
                leg_number: patch.day_number,
                event_id: originalItem?.event_id || undefined,
                note: originalItem?.note || undefined,
                estimated_time: patch.estimated_time,
                rest_duration: originalItem?.rest_duration || undefined,
                travel_time_minutes: patch.travel_time_minutes,
              },
            );

            const movedItemId = extractCreatedItemId(moveCreateResponse);

            if (!moveCreateResponse?.success || !movedItemId) {
              throw new Error(
                moveCreateResponse?.message ||
                  t("planner.reloadEtaMoveFallbackCreateFailed", {
                    defaultValue:
                      "Không thể tạo điểm mới khi đồng bộ chuyển ngày.",
                  }),
              );
            }

            const movePatchResponse = await pilgrimPlannerApi.updatePlanItem(
              planId,
              movedItemId,
              {
                day_number: patch.day_number,
                leg_number: patch.day_number,
                order_index: patch.order_index,
                estimated_time: patch.estimated_time,
                travel_time_minutes: patch.travel_time_minutes,
                note: originalItem?.note || undefined,
                rest_duration: originalItem?.rest_duration || undefined,
              } as any,
            );

            if (!movePatchResponse?.success) {
              throw new Error(
                movePatchResponse?.message ||
                  t("planner.reloadEtaMoveFallbackPatchFailed", {
                    defaultValue:
                      "Không thể cập nhật giờ dự kiến cho điểm vừa chuyển ngày.",
                  }),
              );
            }

            const deleteMovedOldResponse =
              await pilgrimPlannerApi.deletePlanItem(planId, patch.id);

            if (!deleteMovedOldResponse?.success) {
              // Compensate partial success to avoid duplicate item (new + old).
              try {
                await pilgrimPlannerApi.deletePlanItem(planId, movedItemId);
              } catch {
                // Ignore rollback failure and surface deterministic error below.
              }

              throw new Error(
                t("planner.reloadEtaMoveFallbackDeleteFailed", {
                  defaultValue:
                    "Không thể xóa điểm cũ sau khi chuyển ngày. Vui lòng thử lại.",
                }),
              );
            }

            continue;
          }

          const updateResponse = await pilgrimPlannerApi.updatePlanItem(
            planId,
            patch.id,
            updatePayload,
          );

          if (!updateResponse?.success) {
            throw new Error(
              updateResponse?.message ||
                t("planner.reloadEtaUpdateFailed", {
                  defaultValue: "Không thể cập nhật ETA cho điểm hành hương.",
                }),
            );
          }
        }

        await loadPlan({ silent: true });

        Toast.show({
          type: "success",
          text1: t("planner.reloadEtaSuccessTitle", {
            defaultValue: "Đã đồng bộ giờ dự kiến",
          }),
          text2: t("planner.reloadEtaSuccessMessage", {
            defaultValue:
              "Đã tính lại giờ dự kiến từ ngày {{day}} trở đi theo thời gian rời và di chuyển.",
            day: dayNumber,
          }),
        });
        setEtaSyncFromDay(nextEtaSyncDay);
        setBlockedSyncInfo((prev) =>
          prev && prev.dayNumber === dayNumber ? null : prev,
        );
      } catch (error: any) {
        const firstItem = sortPlanDayItems(
          plan?.items_by_day?.[String(dayNumber)] || [],
        )[0];

        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: buildReloadEtaErrorMessage(error, firstItem),
          visibilityTime: 5000,
        });

        const conflict = parseReloadEtaConflict(error);
        if (conflict.blocked) {
          const siteMeta = firstItem?.site as
            | { open_time?: string; close_time?: string }
            | undefined;
          const siteWindow =
            siteMeta?.open_time && siteMeta?.close_time
              ? `${siteMeta.open_time}-${siteMeta.close_time}`
              : undefined;
          const openingWindow = conflict.openingWindow || siteWindow;
          const closeTime =
            conflict.closeTime ||
            siteMeta?.close_time ||
            (openingWindow
              ? openingWindow.split(/[\-–]/)[1]?.trim()
              : undefined);

          setBlockedSyncInfo({
            dayNumber,
            itemId: firstItem?.id,
            siteName: conflict.siteName || firstItem?.site?.name || undefined,
            eta: conflict.eta,
            closeTime,
            openingWindow,
            signature: buildBlockedSyncSignature(plan, dayNumber),
          });
        }
      } finally {
        setReloadingDayNumber(null);
      }
    },
    [
      applyLocalItemPatches,
      applyPlanMutation,
      buildReloadEtaErrorMessage,
      computeReflowFromChangedDay,
      isPlanOwner,
      parseReloadEtaConflict,
      buildBlockedSyncSignature,
      plan,
      planId,
      reloadingDayNumber,
      resolveEtaSyncDayAfterPatch,
      loadPlan,
      t,
    ],
  );

  const addItemToItinerary = async (siteId: string) => {
    const previousSourceDay = Number(
      addSiteFlow.travelData?.sourceDayNumber ?? selectedDay,
    );
    const isSameDayConsecutiveSite =
      !!addSiteFlow.travelData?.previousSiteId &&
      String(addSiteFlow.travelData.previousSiteId) === String(siteId) &&
      Number.isFinite(previousSourceDay) &&
      previousSourceDay === selectedDay;

    if (isSameDayConsecutiveSite) {
      Toast.show({
        type: "error",
        text1: t("planner.sameSiteConsecutiveTitle", {
          defaultValue: "Không thể thêm trùng địa điểm",
        }),
        text2: t("planner.sameSiteConsecutiveMessage", {
          defaultValue:
            "Địa điểm này đang trùng với điểm ngay trước đó. Hãy chọn địa điểm khác hoặc đổi thứ tự trước khi thêm.",
        }),
      });
      return;
    }

    if (addSiteFlow.crossDaysAdded > 0) {
      Toast.show({
        type: "info",
        text1: t("planner.journeyWarning", {
          defaultValue: "Lưu ý hành trình",
        }),
        text2: t("planner.cannotAddItemCrossDay"),
      });
    }

    if (addItemInFlightRef.current || addingItem) {
      Toast.show({
        type: "info",
        text1: t("planner.addInProgressTitle", {
          defaultValue: "Đang thêm địa điểm",
        }),
        text2: t("planner.addInProgressMessage", {
          defaultValue: "Vui lòng đợi thao tác hiện tại hoàn tất.",
        }),
      });
      return;
    }
    addItemInFlightRef.current = true;

    // Modal confirmation if plan is ongoing
    const currentStatus = String(plan?.status || "").toLowerCase();

    const sourceDepartureMin = parseClockToMinutes(
      addSiteFlow.travelData?.departureTimeFromPrev,
    );
    const travelMinutesFromSource = Number(
      addSiteFlow.travelData?.travelMinutes || 0,
    );
    const canArriveWithinSourceDay =
      sourceDepartureMin !== null &&
      travelMinutesFromSource > 0 &&
      sourceDepartureMin + travelMinutesFromSource < 24 * 60;
    const isTrueEarlyFromPreviousDay =
      addSiteFlow.travelData?.fastestArrival === "00:00" &&
      Number(addSiteFlow.travelData?.fastestArrivalDayOffset || 0) <= 0;
    const canActuallyArriveFromSourceDay =
      addSiteFlow.travelData?.isCrossDayTravel === true &&
      canArriveWithinSourceDay &&
      isTrueEarlyFromPreviousDay;

    if (canActuallyArriveFromSourceDay) {
      const keepCurrentDay = await confirm({
        title: t("planner.crossDayKeepCurrentTitle", {
          defaultValue: "Xác nhận thêm địa điểm",
        }),
        message: t("planner.crossDayKeepCurrentMessage", {
          defaultValue:
            "Lộ trình từ ngày trước cho thấy bạn có thể đến sớm hơn. Nếu giữ ở ngày hiện tại, giờ dự kiến có thể lệch khỏi tiến trình ban đầu. Chọn 'Xem lại' để chỉnh giờ trước khi thêm.",
        }),
        confirmText: t("planner.crossDayKeepCurrentConfirm", {
          defaultValue: "Thêm địa điểm",
        }),
        cancelText: t("planner.reviewBeforeAdd", { defaultValue: "Xem lại" }),
        type: "warning",
      });

      if (!keepCurrentDay) {
        addItemInFlightRef.current = false;
        return;
      }
    }

    if (currentStatus === "ongoing") {
      const isConfirmed = await confirm({
        title: t("planner.addItemConfirmTitle", {
          defaultValue: "Xác nhận thêm địa điểm",
        }),
        message: t("planner.addItemConfirmMessage", {
          defaultValue:
            "Hành trình này đang diễn ra. Khi thêm mới bạn sẽ KHÔNG THỂ xóa hay chỉnh sửa lại địa điểm này nữa! Bạn chắc chắn muốn thêm?",
        }),
        confirmText: t("planner.addItemConfirmAction", {
          defaultValue: "Thêm địa điểm",
        }),
        cancelText: t("common.cancel", { defaultValue: "Hủy" }),
        type: "warning",
      });
      if (!isConfirmed) {
        addItemInFlightRef.current = false;
        return;
      }
    }

    try {
      setAddingItem(true);

      // Keep duration format consistent with edit/swap flows.
      const restDurationStr = buildDurationString(addSiteFlow.restDuration);

      // Use flow's selectedEventId (includes auto-detected events)
      const flowEventId = addSiteFlow.selectedEventId;

      const localDraft = {
        site_id: siteId,
        day_number: selectedDay,
        note: addSiteFlow.note.trim() || undefined,
        estimated_time: addSiteFlow.estimatedTime,
        rest_duration: restDurationStr,
        ...(flowEventId ? { event_id: flowEventId } : {}),
      };

      const apiPayload: AddPlanItemRequest = {
        site_id: siteId,
        leg_number: selectedDay,
        estimated_time: addSiteFlow.estimatedTime,
        rest_duration: restDurationStr,
        ...(localDraft.note ? { note: localDraft.note } : {}),
        ...(flowEventId ? { event_id: flowEventId } : {}),
        ...(addSiteFlow.travelTimeMinutes !== undefined
          ? { travel_time_minutes: addSiteFlow.travelTimeMinutes }
          : {}),
      };
      const siteSnapshot = getKnownSiteSnapshot(siteId);
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        const tempItemId = createOfflinePlannerItemId();

        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items`,
          method: "POST",
          data: {
            ...apiPayload,
            client_item_id: tempItemId,
          },
        });

        await applyPlanMutation(
          (currentPlan) => {
            return applyLocalAddItem(
              currentPlan,
              planId,
              localDraft,
              tempItemId,
              siteSnapshot,
            );
          },
          async () => {
            return offlinePlannerService.addPlannerItem(planId, {
              id: tempItemId,
              ...localDraft,
              site: siteSnapshot
                ? {
                    id: siteSnapshot.id,
                    name: siteSnapshot.name,
                    address: siteSnapshot.address,
                    cover_image: siteSnapshot.coverImage,
                    latitude: siteSnapshot.latitude,
                    longitude: siteSnapshot.longitude,
                  }
                : undefined,
            });
          },
        );

        closeAddTimeModal();
        setIsAddModalVisible(false);
        addSiteFlow.setNote("");
        setTimeout(() => {
          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("planner.itemAddedOffline"),
          });
        }, 80);
        markEtaSyncFromDay(selectedDay + 1);
        return;
      }

      const response = await pilgrimPlannerApi.addPlanItem(planId, apiPayload);

      if (response.success) {
        const createdItemId = extractCreatedItemId(response);

        await applyPlanMutation(
          (currentPlan) => {
            return applyLocalAddItem(
              currentPlan,
              planId,
              localDraft,
              createdItemId,
              siteSnapshot,
            );
          },
          createdItemId
            ? async () => {
                return offlinePlannerService.addPlannerItem(planId, {
                  id: createdItemId,
                  ...localDraft,
                  site: siteSnapshot
                    ? {
                        id: siteSnapshot.id,
                        name: siteSnapshot.name,
                        address: siteSnapshot.address,
                        cover_image: siteSnapshot.coverImage,
                        latitude: siteSnapshot.latitude,
                        longitude: siteSnapshot.longitude,
                      }
                    : undefined,
                });
              }
            : undefined,
        );
        closeAddTimeModal();
        setIsAddModalVisible(false);
        addSiteFlow.setNote("");
        setTimeout(() => {
          Toast.show({
            type: "success",
            text1: t("common.success"),
            text2: t("planner.itemAddedSuccess", {
              defaultValue: "Đã thêm địa điểm vào lịch trình",
            }),
          });
        }, 80);
        markEtaSyncFromDay(selectedDay + 1);
        void loadPlan({ silent: true });
      } else {
        Toast.show({
          type: "error",
          text1: t("planner.addItemFailedTitle", {
            defaultValue: "Không thể thêm địa điểm",
          }),
          text2:
            response.message ||
            t("planner.addItemUnexpectedError", {
              defaultValue: "Đã xảy ra lỗi",
            }),
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      const respData = error?.response?.data;
      const isValidationError =
        error?.response?.status === 400 || error?.response?.status === 409;

      if (isValidationError) {
        console.log(
          "[API] Validation error adding item:",
          JSON.stringify(respData),
        );
      } else {
        console.log("Add item serious error:", error?.message || error);
      }

      const errMsg =
        respData?.error?.message ||
        respData?.message ||
        respData?.error?.details?.[0]?.message ||
        error?.message ||
        t("planner.addItemFailedTitle", {
          defaultValue: "Không thể thêm địa điểm",
        });
      const patronErr =
        typeof errMsg === "string" &&
        (errMsg.includes("bổn mạng") || errMsg.includes("Bổn mạng"));
      Toast.show({
        type: "error",
        text1: patronErr
          ? t("planner.patronConstraintToastTitle", {
              defaultValue: "Không cùng bổn mạng đoàn",
            })
          : t("planner.addItemFailedTitle", {
              defaultValue: "Không thể thêm địa điểm",
            }),
        text2: errMsg,
        visibilityTime: patronErr ? 6500 : 4000,
      });
    } finally {
      setAddingItem(false);
      addItemInFlightRef.current = false;
    }
  };

  const memberAvatars = useMemo(() => {
    /** Số người thực tế trong đoàn (không dùng number_of_people = quota chỗ). */
    const rosterCount = getPlannerRosterCount(plan);
    const ownerName = String(plan?.owner?.full_name || "Trưởng đoàn");
    const ownerAvatar = String(plan?.owner?.avatar_url || "").trim();
    const ownerId = plan?.user_id ?? plan?.owner?.id;

    const fromApi = Array.isArray((plan as any)?.members)
      ? (plan as any).members
          .filter(
            (m: any) =>
              String(m?.join_status || "").toLowerCase() !== "dropped_out",
          )
          .map((m: any) => ({
            id: String(m?.id ?? m?.user_id ?? ""),
            name: String(m?.full_name || m?.user?.full_name || ""),
            avatar: String(m?.avatar_url || m?.user?.avatar_url || ""),
          }))
          .filter((m: any) => !!m.name || !!m.avatar)
      : [];

    const list: Array<{ name: string; avatar: string }> = [];
    list.push({ name: ownerName, avatar: ownerAvatar });
    fromApi.forEach((m: any) => {
      if (ownerId && m.id && String(m.id) === String(ownerId)) return;
      if (list.length >= 2) return;
      list.push({
        name: m.name || "Bạn đồng hành",
        avatar: m.avatar || "",
      });
    });

    /** Tối đa 2 avatar; nếu > 2 người thực tế thì chip +N */
    const overflowMore = Math.max(0, rosterCount - 2);

    return { list, people: rosterCount, overflowMore };
  }, [plan]);

  if (loading && !plan) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>
          {t("planner.planNotFound", {
            defaultValue: "Không tìm thấy kế hoạch",
          })}
        </Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>
            {t("common.back", { defaultValue: "Quay lại" })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Translate plan status based on current locale
  const translateStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "planning":
        return t("planner.statusInPlanning", {
          defaultValue: "Đang lập kế hoạch",
        });
      case "locked":
        return t("planner.statusLocked", { defaultValue: "Sẵn sàng" });
      case "ongoing":
        return t("planner.statusOngoing", { defaultValue: "Đang thực hiện" });
      case "completed":
        return t("planner.statusCompleted", { defaultValue: "Hoàn thành" });
      case "cancelled":
        return t("planner.statusCancelled", { defaultValue: "Đã hủy" });
      case "draft":
        return t("planner.statusDraft", { defaultValue: "Nháp" });
      default:
        return (
          status ||
          t("planner.statusPlanned", { defaultValue: "Đã lên kế hoạch" })
        );
    }
  };

  const getPilgrimTag = (item: PlanItem): string => {
    if (item.event_id)
      return t("planner.tagMass", { defaultValue: "Thánh lễ" });
    const note = String(item.note || "").toLowerCase();
    if (note.includes("chầu"))
      return t("planner.tagAdoration", { defaultValue: "Chầu Thánh Thể" });
    if (note.includes("đức mẹ") || note.includes("duc me"))
      return t("planner.tagMarianVisit", { defaultValue: "Viếng Đức Mẹ" });
    if (note.includes("nghỉ") || note.includes("rest"))
      return t("planner.tagRest", { defaultValue: "Nghỉ ngơi" });
    return t("planner.tagPilgrimStop", { defaultValue: "Điểm viếng" });
  };

  const totalDays =
    plan.number_of_days ||
    (plan.items_by_day ? Object.keys(plan.items_by_day).length : 1);
  const sortedDays = Array.from({ length: totalDays }, (_, i) => String(i + 1));
  const safeTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const planStatusStr = (plan?.status || "").toLowerCase();
  const isCompletedPlan = planStatusStr === "completed";
  const isCancelledPlan = planStatusStr === "cancelled";
  const isOngoingPlan = planStatusStr === "ongoing";
  const isSoloPlan = !isGroupJourneyPlan(plan || {});
  const isGroupPlan = !isSoloPlan;
  /** Đã rời nhóm: vẫn xem tiến độ/thành viên từ Plan Detail (không qua ActiveJourney). */
  const canFormerMemberViewCrewProgress =
    isDroppedOut &&
    isGroupPlan &&
    (isOngoingPlan || planStatusStr === "locked" || isCompletedPlan || isCancelledPlan);
  const canDeleteItems =
    isPlanOwner &&
    !plan?.is_locked &&
    (planStatusStr === "planning" || planStatusStr === "draft");

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Header Image Background -> VietMap Background */}
      <View style={styles.headerImageContainer}>
        <VietmapView
          ref={mapRef}
          initialRegion={mapCenter}
          pins={mapPins}
          scrollEnabled={false}
          showInfoCards={false}
          showUserLocation={true}
          onUserLocationUpdate={handlePlannerUserLocationUpdate}
          tileUrlTemplate={isOffline ? offlineTileUrlTemplate : undefined}
          routeSegments={routeSegments}
          cardBottomOffset={180}
          style={styles.headerImage}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.72)", "rgba(0,0,0,0.38)", "transparent"]}
          style={[StyleSheet.absoluteFill, { zIndex: 1, height: "35%" }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.5)", "rgba(0,0,0,0.88)"]}
          style={[StyleSheet.absoluteFill, { zIndex: 1, top: "55%" }]}
          pointerEvents="none"
        />

        {/* Navbar */}
        <View
          style={[styles.navbar, { paddingTop: safeTopInset + 8, zIndex: 10 }]}
        >
          <TouchableOpacity
            style={styles.navButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={26} color="#fff" />
          </TouchableOpacity>
          <View style={styles.navActions}>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() =>
                runGuardedUiAction("open-full-map", () => {
                  setShowFullMap(true);
                })
              }
            >
              <Ionicons name="expand-outline" size={24} color="#fff" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.navButton}
              onPress={() =>
                runGuardedUiAction("open-menu-dropdown", () => {
                  setShowMenuDropdown(true);
                })
              }
            >
              <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Menu Dropdown Popup */}
        {showMenuDropdown && (
          <MenuDropdown
            insets={insets}
            isPlanOwner={isPlanOwner}
            isOffline={isOffline}
            isGroupPlan={isGroupPlan}
            reloadingEta={reloadingDayNumber !== null}
            showEtaSyncAction={etaSyncFromDay !== null}
            syncingCalendar={syncingCalendar}
            syncingOfflineActions={syncingOfflineActions}
            downloadingOffline={downloadingOffline}
            offlineQueueCount={offlineQueueCount}
            isAvailableOffline={isAvailableOffline}
            setShowMenuDropdown={setShowMenuDropdown}
            handleOpenEditPlan={handleOpenEditPlan}
            handleReloadEta={handleReloadEtaFromMenu}
            handleSyncCalendar={handleSyncCalendar}
            handleSyncOfflineActions={handleSyncOfflineActions}
            handleClearOfflineActions={handleClearOfflineActions}
            handleDownloadOffline={handleDownloadOffline}
            handleOpenOfflineDownloads={handleOpenOfflineDownloads}
            setShowTransactionsModal={setShowTransactionsModal}
            handleDeletePlan={handleDeletePlan}
            t={t}
          />
        )}

        {/* Title & Info */}
        <View
          style={[styles.headerContent, { zIndex: 10 }]}
          pointerEvents="box-none"
        >
          <View style={styles.badgeContainer}>
            <View
              style={[
                styles.statusBadge,
                plan.status === "completed" && styles.statusBadgeCompleted,
                plan.status === "cancelled" && styles.statusBadgeCancelled,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  plan.status === "completed" && styles.statusTextCompleted,
                  plan.status === "cancelled" && styles.statusTextCancelled,
                ]}
              >
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
                <Text style={styles.statusText}>
                  {t("planner.public", { defaultValue: "Công khai" })}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{plan.name}</Text>
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
                <Text style={styles.metaText}>
                  {t("planner.day", {
                    count: plan.number_of_days,
                    defaultValue: "Ngày {{count}}",
                  })}
                </Text>
              </View>
            </View>

            <View style={styles.memberGroup}>
              <View style={styles.memberAvatarStack}>
                {memberAvatars.list.map((member, idx) => {
                  const initials = getInitialsFromFullName(member.name || "B");
                  const hasAvatar = !!member.avatar;
                  return hasAvatar ? (
                    <Image
                      key={`${member.name}_${idx}`}
                      source={{ uri: member.avatar }}
                      style={[
                        styles.memberAvatar,
                        { marginLeft: idx === 0 ? 0 : -10 },
                      ]}
                    />
                  ) : (
                    <View
                      key={`${member.name}_${idx}`}
                      style={[
                        styles.memberInitialAvatar,
                        { marginLeft: idx === 0 ? 0 : -10 },
                      ]}
                    >
                      <Text style={styles.memberInitialText}>{initials}</Text>
                    </View>
                  );
                })}
                {memberAvatars.overflowMore > 0 ? (
                  <View
                    style={[
                      styles.memberOverflowChip,
                      { marginLeft: memberAvatars.list.length === 0 ? 0 : -10 },
                    ]}
                  >
                    <Text style={styles.memberOverflowChipText}>
                      +{memberAvatars.overflowMore}
                    </Text>
                  </View>
                ) : null}
              </View>
              <Text style={styles.memberCountText}>
                {t("planner.peopleCount", {
                  count: memberAvatars.people,
                  defaultValue: "{{count}} người",
                })}
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={pullRefreshing}
            onRefresh={async () => {
              setPullRefreshing(true);
              try {
                await loadPlan({ silent: true });
              } finally {
                setPullRefreshing(false);
              }
            }}
            progressViewOffset={Math.max(insets.top, 0) + 8}
            colors={[COLORS.accent]}
            tintColor={COLORS.accent}
          />
        }
      >
        <View style={styles.quickActionsRow}>
          {/* Chat nhóm — chỉ hiện cho nhóm và không bị dropout */}
          {!isSoloPlan && !isDroppedOut && (
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                isOffline && styles.disabledAction,
              ]}
              onPress={handleOpenChat}
              disabled={isOffline}
            >
              <Ionicons
                name="chatbubble-ellipses-outline"
                size={18}
                color="#FFF8E7"
              />
              <Text style={styles.quickActionText}>
                {t("planner.groupChat", { defaultValue: "Chat nhóm" })}
              </Text>
              {unreadChatCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Tiến độ (solo) / Thành viên (nhóm) — thành viên hiện tại; hoặc người đã rời: chỉ xem (không mở ActiveJourney) */}
          {!isInvitePendingView &&
            ((!isDroppedOut &&
              (!isPlanOwner || isOngoingPlan || isCompletedPlan || isCancelledPlan)) ||
              canFormerMemberViewCrewProgress) && (
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  (isOffline && !canFormerMemberViewCrewProgress) && styles.disabledAction,
                  canFormerMemberViewCrewProgress && styles.quickActionButtonReadOnly,
                ]}
                onPress={handleOpenMembers}
                disabled={isOffline && !canFormerMemberViewCrewProgress}
                accessibilityLabel={
                  canFormerMemberViewCrewProgress
                    ? t("planner.droppedOutProgressA11y", {
                        defaultValue: "Xem tiến độ và thành viên (chỉ xem)",
                      })
                    : undefined
                }
              >
                <Ionicons
                  name={
                    isSoloPlan && !isDroppedOut
                      ? "pulse-outline"
                      : "people-circle-outline"
                  }
                  size={18}
                  color="#FFF8E7"
                />
                <Text style={styles.quickActionText}>
                  {canFormerMemberViewCrewProgress
                    ? t("planner.droppedOutProgressCta", {
                        defaultValue: "Tiến độ đoàn",
                      })
                    : isSoloPlan
                      ? t("planner.progress", {
                          defaultValue: "Tiến độ",
                        })
                      : t("planner.crewTitle", {
                          defaultValue: "Thành viên",
                        })}
                </Text>
              </TouchableOpacity>
            )}

          {/* Mời bạn bè (nhóm, planning/locked) / Chia sẻ cộng đồng (completed only, không bao gồm cancelled) */}
          {!isDroppedOut &&
            isPlanOwner &&
            !isOngoingPlan &&
            !isCancelledPlan &&
            (!isSoloPlan || isCompletedPlan) && (
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  (isCompletedPlan
                    ? isOffline || sharingToCommunity
                    : isOffline) && styles.disabledAction,
                ]}
                onPress={
                  isCompletedPlan
                    ? handleSharePlannerToCommunity
                    : handleOpenShareModal
                }
                disabled={
                  isCompletedPlan ? isOffline || sharingToCommunity : isOffline
                }
              >
                <Ionicons
                  name={
                    isCompletedPlan ? "megaphone-outline" : "person-add-outline"
                  }
                  size={18}
                  color="#FFF8E7"
                />
                <Text style={styles.quickActionText}>
                  {isCompletedPlan
                    ? t("common.share")
                    : t("planner.inviteFriends")}
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {/* Dropped Out Banner */}
        {isDroppedOut && (
          <View
            style={{
              backgroundColor: "#FEE2E2",
              padding: 12,
              marginHorizontal: 16,
              marginTop: 16,
              borderRadius: BORDER_RADIUS.md,
            }}
          >
            <Text
              style={{
                color: "#DC2626",
                fontWeight: "600",
                textAlign: "center",
                fontSize: 13,
                lineHeight: 18,
              }}
            >
              {t("planner.droppedOutBanner")}
            </Text>
          </View>
        )}

        {/* Cancelled Reason Banner */}
        {isCancelledPlan && (
          <View style={styles.cancelledReasonBanner}>
            <View style={styles.cancelledReasonHeader}>
              <Ionicons name="stop-circle" size={16} color="#DC2626" />
              <Text style={styles.cancelledReasonTitle}>
                {t("planner.cancelledReasonTitle", {
                  defaultValue: "Hành trình đã dừng khẩn cấp",
                })}
              </Text>
            </View>
            {!!plan.cancelled_reason && (
              <Text style={styles.cancelledReasonText}>
                {plan.cancelled_reason}
              </Text>
            )}
          </View>
        )}

        {/* 1. Thẻ Lời mời (Đọc thông tin trước khi quyết định) */}
        {isInvitePendingView && (
          <InvitePreviewCard
            ownerName={ownerName}
            ownerEmail={ownerEmail}
            depositAmount={
              typeof depositAmount === "number"
                ? depositAmount
                : Number(depositAmount || 0) || undefined
            }
            penaltyPercentage={
              typeof penaltyPercentage === "number"
                ? penaltyPercentage
                : Number(penaltyPercentage || 0) || undefined
            }
            joinedCount={previewJoinedCount}
            estimatedJoinedCount={Math.max(
              (plan?.number_of_people || 1) - 1,
              0,
            )}
            editLockAt={plan?.edit_lock_at}
            plannerLockAt={(plan as any)?.planner_lock_at}
            isEditLocked={plan?.is_locked}
            planStatusStr={planStatusStr}
            planStartDate={plan?.start_date}
            isFriendInvite={inviteType === "friend"}
          />
        )}

        {/* 2. Cụm nút Quyết định (Ra quyết định sau khu đọc) */}
        {isInvitePendingView && (
          <InviteDecisionButtons
            depositAmount={depositAmount as number | null}
            respondingInvite={respondingInvite}
            isOffline={isOffline}
            handleRejectInvite={handleRejectInvite}
            handleJoinInvite={handleJoinInvite}
            isFriendInvite={inviteType === "friend"}
          />
        )}

        {offlineQueueCount > 0 && (
          <View
            style={{
              marginBottom: 16,
              padding: 16,
              borderRadius: 20,
              backgroundColor: isOffline ? "#FFF7ED" : "#EFF6FF",
              borderWidth: 1,
              borderColor: isOffline ? "#FDBA74" : "#BFDBFE",
            }}
          >
            <View
              style={{
                gap: 12,
              }}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", gap: 12 }}
              >
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 15,
                      fontWeight: "700",
                      color: isOffline ? "#9A3412" : "#1D4ED8",
                      marginBottom: 4,
                    }}
                  >
                    {offlineQueueCount} {t("offline.pendingActions")}
                  </Text>
                  <Text
                    style={{
                      fontSize: 13,
                      lineHeight: 18,
                      color: isOffline ? "#9A3412" : COLORS.textSecondary,
                    }}
                  >
                    {isOffline
                      ? t("planner.pendingActionsWillSync", {
                          defaultValue:
                            "Cac thay doi offline se duoc dong bo khi ban co mang.",
                        })
                      : t("planner.pendingActionsReadyToSync", {
                          defaultValue:
                            "Ban co the dong bo ngay bay gio de cap nhat len he thong.",
                        })}
                  </Text>
                </View>
              </View>

              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: 10,
                  flexWrap: "wrap",
                }}
              >
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    borderWidth: 1,
                    borderColor: "#FCA5A5",
                    backgroundColor: "#FEF2F2",
                  }}
                  onPress={handleClearOfflineActions}
                >
                  <Text
                    style={{
                      color: "#DC2626",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {t("offline.clearPendingActions", {
                      defaultValue: "Xóa hàng chờ",
                    })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={{
                    paddingHorizontal: 14,
                    paddingVertical: 10,
                    borderRadius: 14,
                    backgroundColor:
                      isOffline || syncingOfflineActions
                        ? "#CBD5E1"
                        : "#2563EB",
                  }}
                  onPress={handleSyncOfflineActions}
                  disabled={isOffline || syncingOfflineActions}
                >
                  <Text
                    style={{
                      color: "#FFFFFF",
                      fontSize: 13,
                      fontWeight: "700",
                    }}
                  >
                    {syncingOfflineActions
                      ? t("planner.syncing")
                      : t("offline.syncOfflineActions")}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Lock Schedule Info — Chỉ hiện cho Nhóm khi planning hoặc locked */}
        {!isSoloPlan &&
          !isInvitePendingView &&
          (planStatusStr === "planning" || planStatusStr === "locked") && (
            <LockScheduleCard
              plan={plan}
              planStatusStr={planStatusStr}
              isPlanOwner={isPlanOwner}
              isLockScheduleExpanded={isLockScheduleExpanded}
              setIsLockScheduleExpanded={setIsLockScheduleExpanded}
              handleManualLockEdit={handleManualLockEdit}
              updatingPlanStatus={updatingPlanStatus}
              handleUpdatePlannerStatus={handleUpdatePlannerStatus}
              t={t}
            />
          )}

        {/* CTA: Bắt đầu hành hương — Solo: từ planning | Group: từ locked */}
        {isPlanOwner &&
          (planStatusStr === "locked" ||
            (isSoloPlan && planStatusStr === "planning")) && (
            <View
              style={{
                marginBottom: SPACING.md,
                paddingHorizontal: SPACING.lg,
              }}
            >
              <TouchableOpacity
                onPress={() => handleUpdatePlannerStatus("ongoing")}
                disabled={updatingPlanStatus}
                activeOpacity={0.85}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  justifyContent: "center",
                  backgroundColor: COLORS.accent,
                  paddingVertical: 14,
                  borderRadius: BORDER_RADIUS.lg,
                  opacity: updatingPlanStatus ? 0.7 : 1,
                }}
              >
                {updatingPlanStatus ? (
                  <ActivityIndicator
                    size="small"
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                ) : (
                  <Ionicons
                    name="compass-outline"
                    size={20}
                    color="#fff"
                    style={{ marginRight: 8 }}
                  />
                )}
                <Text
                  style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}
                >
                  {t("planner.startJourneyCta", {
                    defaultValue: "Bắt đầu hành hương",
                  })}
                </Text>
              </TouchableOpacity>
            </View>
          )}

        {/* Itinerary Section */}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            marginRight: SPACING.lg,
            marginBottom: SPACING.md, // Move margin from text to here
          }}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.sectionTitle,
              {
                flex: 1,
                paddingHorizontal: 0,
                marginLeft: SPACING.lg,
                marginBottom: 0, // Reset margin
              },
            ]}
          >
            {t("planner.pilgrimRoute", { defaultValue: "Lộ trình hành hương" })}
          </Text>

          {canDeleteItems &&
            ["planning", "draft"].includes(
              String(plan?.status || "").toLowerCase(),
            ) &&
            sortedDays.length > 0 && (
              <TouchableOpacity
                onPress={handleClearAllItems}
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  paddingVertical: 4,
                  paddingHorizontal: 8,
                  backgroundColor: "#FEF2F2",
                  borderRadius: 12,
                  borderWidth: 1,
                  borderColor: "#FEE2E2",
                }}
              >
                <Ionicons
                  name="trash-outline"
                  size={14}
                  color="#EF4444"
                  style={{ marginRight: 4 }}
                />
                <Text
                  style={{
                    fontSize: 12,
                    fontWeight: "700",
                    color: "#EF4444",
                  }}
                >
                  {t("planner.deleteAll", { defaultValue: "Xóa tất cả" })}
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {sortedDays.length > 0 ? (
          sortedDays.map((dayKey) => {
            const items = sortPlanDayItems(plan.items_by_day?.[dayKey] || []);
            const dayNumber = Number(dayKey);
            const canShowDaySyncAction =
              isPlanOwner && planStatusStr === "planning" && !plan?.is_locked;
            const showEtaSyncWarning =
              canShowDaySyncAction &&
              etaSyncFromDay !== null &&
              Number.isFinite(dayNumber) &&
              dayNumber === etaSyncFromDay &&
              items.length > 0;
            const isSyncBlockedForDay =
              canShowDaySyncAction &&
              !!blockedSyncInfo &&
              Number.isFinite(dayNumber) &&
              blockedSyncInfo.dayNumber === dayNumber &&
              items.length > 0;
            return (
              <ItineraryDayCard
                key={dayKey}
                dayKey={dayKey}
                items={items}
                startDate={plan.start_date}
                planStatus={planStatusStr}
                isPlanOwner={isPlanOwner}
                canDeleteItems={canDeleteItems}
                swapPick={swapPick}
                setSwapPick={setSwapPick}
                setSelectedItem={setSelectedItem}
                handleReorderIconPress={handleReorderIconPress}
                handleDeleteItem={handleDeleteItem}
                onReloadDayFromPrevious={
                  canShowDaySyncAction
                    ? handleReloadDayFromPreviousWithConfirm
                    : undefined
                }
                reloadingDayNumber={reloadingDayNumber}
                showEtaSyncWarning={showEtaSyncWarning}
                isSyncBlocked={isSyncBlockedForDay}
                onResolveBlockedSync={
                  isSyncBlockedForDay ? handleReplaceBlockedItem : undefined
                }
                lastClosedDayNumber={effectiveLastClosedDayNumber}
                openAddModal={openAddModal}
                t={t}
                getDateForDayCalc={getDateForDay}
                getPilgrimTagStr={getPilgrimTag}
                formatTimeValueCalc={formatTimeValue}
                calculateEndTimeCalc={calculateEndTime}
                nearbyAmenityLookup={nearbyAmenityLookup}
                onRemoveNearbyAmenity={handleRemoveNearbyAmenity}
                removingNearbyAmenityKey={removingNearbyAmenityKey}
                pendingNearbyRemovalsByItem={pendingNearbyRemovalsByItem}
                onUndoRemoveNearbyAmenity={handleUndoRemoveNearbyAmenity}
                styles={styles}
              />
            );
          })
        ) : (
          <View style={[styles.emptyState, { marginTop: 40 }]}>
            <MaterialIcons name="edit-road" size={64} color={COLORS.border} />
            <Text
              style={[
                styles.emptyStateText,
                { marginTop: 16, marginBottom: 24, fontSize: 16 },
              ]}
            >
              {t("planner.noLocationsInPlan")}
            </Text>
            {isPlanOwner &&
              (String(plan?.status || "").toLowerCase() === "planning" ||
                String(plan?.status || "").toLowerCase() === "ongoing") && (
                <TouchableOpacity
                  style={{
                    paddingHorizontal: 32,
                    paddingVertical: 14,
                    backgroundColor: COLORS.accent,
                    borderRadius: 24,
                    shadowColor: COLORS.accent,
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 6,
                  }}
                  onPress={() => openAddModal(1)}
                >
                  <Text
                    style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}
                  >
                    + {t("planner.addFirstLocation")}
                  </Text>
                </TouchableOpacity>
              )}
          </View>
        )}

        {/* All days are always displayed above — each day has its own Add Stop button */}

        <View style={{ height: 40 }} />
      </ScrollView>

      <AddSiteModal
        visible={isAddModalVisible}
        onClose={() => setIsAddModalVisible(false)}
        t={t}
        styles={styles}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenEventsTab={() => {
          setActiveTab("events");
          loadEventSites();
        }}
        isLoadingSites={isLoadingSites}
        isLoadingFavorites={isLoadingFavorites}
        isLoadingEventSites={isLoadingEventSites}
        eventSitesList={eventSitesList}
        onSelectEventSite={handleAddSiteFromEventsTab}
        sites={sites}
        favorites={favorites}
        onAddSite={isPlanOwner ? (siteId) => handleAddItem(siteId) : undefined}
        onOpenNearbyAmenities={handleOpenNearbyAmenitiesFromAddModal}
        onOpenSiteDetail={handleOpenSiteDetailFromAddModal}
        addingItem={addingItem}
        alreadyAddedSiteIds={
          new Set(
            (plan.items_by_day?.[selectedDay.toString()] || [])
              .map((it: any) => String(it?.site_id || it?.site?.id || ""))
              .filter(Boolean),
          )
        }
        addedCount={Object.values(plan.items_by_day || {}).flat().length}
      />

      <TimeInputModal
        visible={addSiteFlow.showTimeInputModal && !showEditItemModal}
        onClose={closeAddTimeModal}
        t={t}
        styles={styles}
        selectedDay={selectedDay}
        selectedDayDateLabel={selectedDayDateLabel}
        originalSelectedDay={addFlowOriginDay ?? undefined}
        calculatingRoute={addSiteFlow.calculatingRoute}
        crossDayWarning={addSiteFlow.crossDayWarning}
        crossDaysAdded={addSiteFlow.crossDaysAdded}
        estimatedTime={addSiteFlow.estimatedTime}
        onApplySuggestedTime={addSiteFlow.applySuggestedTime}
        restDuration={addSiteFlow.restDuration}
        setRestDuration={addSiteFlow.setRestDuration}
        note={addSiteFlow.note}
        setNote={addSiteFlow.setNote}
        openTimePicker={openTimePicker}
        formatDuration={formatDuration}
        addingItem={addingItem}
        selectedSiteId={addSiteFlow.selectedSiteId}
        onConfirmAdd={() => addItemToItinerary(addSiteFlow.selectedSiteId!)}
        {...(addSiteFlow.travelData || {})}
        previousSiteId={addSiteFlow.travelData?.previousSiteId}
        insight={addSiteFlow.insight}
        suggestedTime={addSiteFlow.suggestedTime}
        onMoveToPreviousDay={handleMoveAddToPreviousDay}
        onMoveToNextDay={handleMoveAddToNextDay}
        onMoveBackToOriginalDay={handleMoveAddBackToOriginDay}
        isEventLocked={addSiteFlow.isEventLocked}
        bufferMinutes={addSiteFlow.bufferMinutes}
        eventDurationMinutes={addSiteFlow.eventDurationMinutes}
        setBufferMinutes={addSiteFlow.setBufferMinutes}
        onUnlockEvent={addSiteFlow.unlockEvent}
      />

      <TimeInputModal
        visible={showEditItemModal}
        onClose={() => setShowEditItemModal(false)}
        t={t}
        styles={styles}
        modalTitle={t("planner.editLocationTitle", {
          defaultValue: "Chỉnh sửa địa điểm",
        })}
        confirmButtonLabel={t("planner.saveChanges", {
          defaultValue: "Lưu thay đổi",
        })}
        selectedDay={editSelectedDay}
        selectedDayDateLabel={editSelectedDayDateLabel}
        calculatingRoute={calculatingEditRoute}
        crossDayWarning={editScheduleContext.crossDayWarning}
        crossDaysAdded={editScheduleContext.crossDaysAdded}
        estimatedTime={editEstimatedTime}
        onApplySuggestedTime={setEditEstimatedTime}
        restDuration={editRestDuration}
        setRestDuration={setEditRestDuration}
        note={editNote}
        setNote={setEditNote}
        openTimePicker={openEditTimePicker}
        formatDuration={formatDuration}
        addingItem={savingEdit}
        selectedSiteId={editingItem?.site_id || editingItem?.site?.id || ""}
        onConfirmAdd={handleSaveEditItem}
        previousSiteName={editScheduleContext.previousSiteName}
        previousSiteId={editScheduleContext.previousSiteId}
        departureTimeFromPrev={editScheduleContext.departureTimeFromPrev}
        travelMinutes={editScheduleContext.travelMinutes}
        travelDistanceKm={editScheduleContext.travelDistanceKm}
        fastestArrival={editScheduleContext.fastestArrival}
        fastestArrivalDayOffset={editScheduleContext.fastestArrivalDayOffset}
        sourceDayNumber={editScheduleContext.sourceDayNumber}
        isCrossDayTravel={editScheduleContext.isCrossDayTravel}
        newSiteName={editScheduleContext.newSiteName}
        newSiteAddress={editScheduleContext.newSiteAddress}
        newSitePatronSaint={editScheduleContext.newSitePatronSaint}
        newSiteCoverImage={editScheduleContext.newSiteCoverImage}
        openTime={editScheduleContext.openTime}
        closeTime={editScheduleContext.closeTime}
        massTimesForDay={editScheduleContext.massTimesForDay}
        eventsForDay={editScheduleContext.eventsForDay}
        eventStartTime={editScheduleContext.eventStartTime}
        eventName={editScheduleContext.eventName}
        eventEndTime={editScheduleContext.eventEndTime}
        insight={editInsight}
        suggestedTime={editSuggestedTime}
      />

      <NearbyPlacesModal
        visible={showNearbyModal}
        onClose={() => setShowNearbyModal(false)}
        t={t}
        styles={styles}
        nearbySiteName={nearbySiteName}
        nearbyCategory={nearbyCategory}
        setNearbyCategory={setNearbyCategory}
        loadingNearby={loadingNearby}
        nearbyPlaces={nearbyPlaces}
        savedNearbyPlaceIds={savedNearbyPlaceIds}
        savingNearbyPlaceId={savingNearbyPlaceId}
        handleSaveNearbyPlace={handleSaveNearbyPlace}
      />

      <ItemDetailModal
        visible={!!selectedItem}
        selectedItem={selectedItem}
        onClose={() => setSelectedItem(null)}
        t={t}
        styles={styles}
        formatTimeValue={formatTimeValue}
        calculateEndTime={calculateEndTime}
        getPilgrimTag={getPilgrimTag}
        isOffline={isOffline}
        handleOpenEditItem={handleOpenEditItem}
        handleDeleteItem={handleDeleteItem}
        isPlanOwner={isPlanOwner}
        canDeleteItems={canDeleteItems}
        planStatus={plan?.status}
        confirm={confirm}
      />

      {/* Edit Time Picker */}
      {showEditTimePicker && (
        <DateTimePicker
          value={editTempTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleEditTimeChange}
        />
      )}

      {/* Time Picker */}
      {showTimePicker && (
        <DateTimePicker
          value={tempTime}
          mode="time"
          is24Hour={true}
          display={Platform.OS === "ios" ? "spinner" : "default"}
          onChange={handleTimeChange}
        />
      )}

      <SharePlanModal
        visible={showShareModal}
        onClose={() => setShowShareModal(false)}
        planId={planId}
        plan={plan}
        isPlanOwner={isPlanOwner}
        isOffline={isOffline}
        onOfflineRequired={showConnectionRequiredAlert}
        onPlanRefresh={() => void loadPlan()}
      />
      <PlannerTransactionsModal
        visible={showTransactionsModal}
        onClose={() => setShowTransactionsModal(false)}
        planId={planId}
        planName={plan.name}
      />
      <EditPlanModal
        visible={showEditPlanModal}
        onClose={() => {
          setShowEditPlanModal(false);
          setEditPlanModalError(null);
        }}
        onSave={handleSavePlan}
        saving={savingPlan}
        saveError={editPlanModalError}
        t={t}
        editPlanName={editPlanName}
        setEditPlanName={setEditPlanName}
        editPlanStartDate={editPlanStartDate}
        setEditPlanStartDate={setEditPlanStartDate}
        editPlanEndDate={editPlanEndDate}
        setEditPlanEndDate={setEditPlanEndDate}
        editPlanPeople={editPlanPeople}
        setEditPlanPeople={setEditPlanPeople}
        editPlanMinPeople={editPlanMinPeople}
        setEditPlanMinPeople={setEditPlanMinPeople}
        editPlanTransportation={editPlanTransportation}
        setEditPlanTransportation={setEditPlanTransportation}
        editPlanDepositInput={editPlanDepositInput}
        setEditPlanDepositInput={setEditPlanDepositInput}
        editPlanPenaltyInput={editPlanPenaltyInput}
        setEditPlanPenaltyInput={setEditPlanPenaltyInput}
        showEditStartDatePicker={showEditStartDatePicker}
        setShowEditStartDatePicker={setShowEditStartDatePicker}
        showEditEndDatePicker={showEditEndDatePicker}
        setShowEditEndDatePicker={setShowEditEndDatePicker}
        editLockAt={editLockAt}
        setEditLockAt={setEditLockAt}
        editLockAvailableAt={plan?.edit_lock_available_at}
        plannerLockAt={plan?.planner_lock_at}
        depositPenaltyLockedByShare={
          !!plan?.first_invite_at && isGroupJourneyPlan(plan || {})
        }
      />

      {/* Full Map Modal */}
      <FullMapModal
        visible={showFullMap}
        onClose={() => setShowFullMap(false)}
        pins={mapPins}
        initialRegion={mapCenter}
        tileUrlTemplate={isOffline ? offlineTileUrlTemplate : undefined}
        title={plan?.name || "Bản đồ kế hoạch"}
        showUserLocation={true}
        onUserLocationUpdate={handlePlannerUserLocationUpdate}
        routeCoordinates={routeCoordinates}
        routeSegments={routeSegments}
        routeSummary={routeSummary}
        routeLoading={routeLoading}
      />

      {/* Calendar Sync Modal */}
      <CalendarSyncModal
        visible={showCalendarSyncModal}
        onClose={() => setShowCalendarSyncModal(false)}
        success={calendarSyncSuccess}
        result={calendarSyncResult}
        error={calendarSyncError}
      />

      {/* Offline Download Modal */}
      <OfflineDownloadModal
        visible={showOfflineModal}
        onClose={() => {
          setShowOfflineModal(false);
          resetOfflineDownload();
        }}
        downloading={downloadingOffline}
        progress={offlineProgress}
        success={offlineSuccess}
        error={offlineError}
      />

      <OfflineBanner
        style={{
          marginBottom: Math.max(insets.bottom, 12),
        }}
      />
    </View>
  );
};

export default PlanDetailScreen;
