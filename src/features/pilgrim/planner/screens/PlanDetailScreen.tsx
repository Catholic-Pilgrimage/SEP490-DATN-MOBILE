import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  Image,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { Swipeable } from "react-native-gesture-handler";
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
  SHADOWS,
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
import { PILGRIM_ENDPOINTS } from "../../../../services/api/endpoints";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import { PlannerCalendarSyncResult } from "../../../../services/calendar/calendarService";
import type { LngLat, RoutePoint } from "../../../../services/map/vietmapService";
import vietmapService from "../../../../services/map/vietmapService";
import networkService from "../../../../services/network/networkService";
import {
  createOfflinePlannerItemId,
  offlinePlannerService,
} from "../../../../services/offline/offlinePlannerService";
import offlineSyncService from "../../../../services/offline/offlineSyncService";
import {
  NearbyPlaceCategory,
  SiteEvent,
  SiteNearbyPlace,
  SiteSummary,
} from "../../../../types/pilgrim";
import {
  AddPlanItemRequest,
  PlanEntity,
  PlanItem,
  UpdatePlanItemRequest,
  UpdatePlanRequest,
} from "../../../../types/pilgrim/planner.types";
import { getInitialsFromFullName } from "../../../../utils/initials";
import AddSiteModal from "../components/plan-detail/AddSiteModal";
import EditItemModal, {
  type EditItemModalProps,
} from "../components/plan-detail/EditItemModal";
import EditPlanModal from "../components/plan-detail/EditPlanModal";
import InvitePreviewCard from "../components/plan-detail/InvitePreviewCard";
import ItemDetailModal from "../components/plan-detail/ItemDetailModal";
import NearbyPlacesModal from "../components/plan-detail/NearbyPlacesModal";
import SiteEventsModal from "../components/plan-detail/SiteEventsModal";
import SwapPreviewModal from "../components/plan-detail/SwapPreviewModal";
import TimeInputModal from "../components/plan-detail/TimeInputModal";
import { PlannerTransactionsModal } from "../components/shared/PlannerTransactionsModal";
import { SharePlanModal } from "../components/shared/SharePlanModal";
import { useAddSiteFlow } from "../hooks/useAddSiteFlow";
import { useInvitePlanActions } from "../hooks/useInvitePlanActions";
import { useSwapPreview } from "../hooks/useSwapPreview";
import {
  MAX_DEPOSIT_VND,
  parsePenaltyPercent,
  parseVndInteger,
} from "../utils/depositInput.utils";
import {
  LocalSiteSnapshot,
  applyLocalAddItem,
  applyLocalClearAllItems,
  applyLocalDeleteItem,
  applyLocalItemUpdate,
  applyLocalSwapDayItems,
  mapOfflineNearbyPlace,
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
  parseDurationToMinutesRaw,
} from "../utils/planDetailTime.utils";
import {
  getGroupPatronConstraintFromPlan
} from "../utils/planPatronScope.utils";
import styles from "./PlanDetailScreen.styles";

const PlanDetailScreen = ({ route, navigation }: any) => {
  const {
    planId,
    autoAddSiteId,
    autoAddDay,
    inviteToken,
    inviteStatus,
    invitedView,
    ownerName,
    ownerEmail,
    depositAmount,
    penaltyPercentage,
  } = route.params || {};
  const { t } = useTranslation();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanEntity | null>(null);
  const [loading, setLoading] = useState(true);

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
  const showMembersInsteadOfChat = useMemo(() => {
    const st = String(plan?.status || "").toLowerCase();
    return (
      !!plan &&
      !isPlanOwner &&
      !isInvitePendingView &&
      (st === "planning" || st === "locked")
    );
  }, [isInvitePendingView, isPlanOwner, plan]);
  const { syncing: syncingCalendar, syncPlanToCalendar } = useCalendarSync();
  const { confirm } = useConfirm();
  const { isOffline, offlineQueueCount } = useOffline();
  const [syncingOfflineActions, setSyncingOfflineActions] = useState(false);
  const [unreadChatCount, setUnreadChatCount] = useState(0);

  const mapRef = useRef<VietmapViewRef>(null);

  const mapPins: MapPin[] = useMemo(() => buildPlanMapPins(plan), [plan]);
  const mapCenter = useMemo(() => getPlanMapCenter(mapPins), [mapPins]);
  const groupPatronConstraint = useMemo(
    () => getGroupPatronConstraintFromPlan(plan),
    [plan],
  );

  // Fly camera to fit all pins when pins change
  useEffect(() => {
    if (mapPins.length > 0 && mapRef.current) {
      // Small delay to ensure the map is mounted & ready
      const timer = setTimeout(() => {
        if (!mapRef.current) return;
        if (mapPins.length === 1) {
          mapRef.current.flyTo(mapPins[0].latitude, mapPins[0].longitude, 13);
          return;
        }
        const lats = mapPins.map((p) => p.latitude);
        const lngs = mapPins.map((p) => p.longitude);
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
  }, [mapPins]);

  // Add Item State
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const { sites, isLoading: isLoadingSites, fetchSites } = useSites();
  const [favorites, setFavorites] = useState<SiteSummary[]>([]);
  const [isLoadingFavorites, setIsLoadingFavorites] = useState(false);
  const [activeTab, setActiveTab] = useState<"all" | "favorites" | "events">(
    "all",
  );

  // Events tab state
  const [showEventListModal, setShowEventListModal] = useState(false);
  const [eventSite, setEventSite] = useState<SiteSummary | null>(null);
  const [siteEvents, setSiteEvents] = useState<SiteEvent[]>([]);
  const [isLoadingEvents, setIsLoadingEvents] = useState(false);
  const [eventSitesList, setEventSitesList] = useState<SiteSummary[]>([]);
  const [isLoadingEventSites, setIsLoadingEventSites] = useState(false);
  const [hasLoadedEventSites, setHasLoadedEventSites] = useState(false);
  const [addingItem, setAddingItem] = useState(false);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);

  // Time picker state (shared)
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());

  // ── Add Site Flow (hook) ──
  const addSiteFlow = useAddSiteFlow({ plan, selectedDay, siteEvents });

  // Legacy aliases for backward compat (edit flows, addItemToItinerary, etc.)
  const showTimeInputModal = addSiteFlow.showTimeInputModal;
  const selectedSiteId = addSiteFlow.selectedSiteId;
  const estimatedTime = addSiteFlow.estimatedTime;
  const setEstimatedTime = addSiteFlow.setEstimatedTime;
  const restDuration = addSiteFlow.restDuration;
  const setRestDuration = addSiteFlow.setRestDuration;
  const note = addSiteFlow.note;
  const setNote = addSiteFlow.setNote;
  const calculatingRoute = addSiteFlow.calculatingRoute;
  const routeInfo = addSiteFlow.routeInfo;
  const travelTimeMinutes = addSiteFlow.travelTimeMinutes;
  const crossDayWarning = addSiteFlow.crossDayWarning;
  const crossDaysAdded = addSiteFlow.crossDaysAdded;

  const [showShareModal, setShowShareModal] = useState(false);
  const [sharingToCommunity, setSharingToCommunity] = useState(false);
  const [showTransactionsModal, setShowTransactionsModal] = useState(false);
  const [updatingPlanStatus, setUpdatingPlanStatus] = useState(false);

  // Cross-day auto-push states are now managed by addSiteFlow hook

  // Edit Item State
  const [showEditItemModal, setShowEditItemModal] = useState(false);
  const [editingItem, setEditingItem] = useState<PlanItem | null>(null);
  const [editEstimatedTime, setEditEstimatedTime] = useState("10:00");
  const [editRestDuration, setEditRestDuration] = useState(120);
  const [editNote, setEditNote] = useState("");
  const [showEditTimePicker, setShowEditTimePicker] = useState(false);
  const [editTempTime, setEditTempTime] = useState(new Date());
  const [savingEdit, setSavingEdit] = useState(false);
  const [editRouteInfo, setEditRouteInfo] = useState<string>("");
  const [calculatingEditRoute, setCalculatingEditRoute] = useState(false);

  // Item detail sheet state
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);
  /** First tap on reorder icon selects; second on another item in the same day swaps. */
  const [swapPick, setSwapPick] = useState<{
    dayKey: string;
    itemId: string;
  } | null>(null);

  // ── Swap Preview ──
  const swapPreview = useSwapPreview(plan);
  const [swappingItems, setSwappingItems] = useState(false);

  // Nearby Places state
  const [showNearbyModal, setShowNearbyModal] = useState(false);
  const [nearbyPlaces, setNearbyPlaces] = useState<SiteNearbyPlace[]>([]);
  const [loadingNearby, setLoadingNearby] = useState(false);
  const [nearbyCategory, setNearbyCategory] = useState<
    NearbyPlaceCategory | "all"
  >("all");
  const [nearbySiteName, setNearbySiteName] = useState("");
  const [nearbyContextItem, setNearbyContextItem] = useState<PlanItem | null>(
    null,
  );
  const [savingNearbyPlaceId, setSavingNearbyPlaceId] = useState<string | null>(
    null,
  );
  const [savedNearbyPlaceIds, setSavedNearbyPlaceIds] = useState<Set<string>>(
    new Set(),
  );

  // Edit Plan Modal
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanStartDate, setEditPlanStartDate] = useState("");
  const [editPlanEndDate, setEditPlanEndDate] = useState("");
  const [editPlanPeople, setEditPlanPeople] = useState(1);
  const [editPlanTransportation, setEditPlanTransportation] = useState("bus");
  const [editPlanDepositInput, setEditPlanDepositInput] = useState("");
  const [editPlanPenaltyInput, setEditPlanPenaltyInput] = useState("0");
  const [savingPlan, setSavingPlan] = useState(false);
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);
  const [editLockAt, setEditLockAt] = useState<string | null>(null);
  const [isLockScheduleExpanded, setIsLockScheduleExpanded] = useState(true);

  // Menu Dropdown state
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);
  const [previewJoinedCount, setPreviewJoinedCount] = useState<number | null>(
    null,
  );

  // Full Map Modal state
  const [showFullMap, setShowFullMap] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<LngLat[]>([]);
  const [routeSegments, setRouteSegments] = useState<{ coordinates: LngLat[]; color?: string }[]>([]);
  const [routeSummary, setRouteSummary] = useState<string>("");
  const [routeLoading, setRouteLoading] = useState(false);

  // Calculate route when plan data is available (for both inline map + full map)
  const [hasCalcRoute, setHasCalcRoute] = useState(false);
  useEffect(() => {
    if (hasCalcRoute || !plan?.items_by_day || isOffline) return;

    const calculatePlanRoute = async () => {
      // Collect all waypoints ordered by day then by leg_number/order
      const waypoints: RoutePoint[] = [];
      const dayKeys = Object.keys(plan.items_by_day!)
        .map(Number)
        .sort((a, b) => a - b);

      for (const dayKey of dayKeys) {
        const dayItems = plan.items_by_day![String(dayKey)] || [];
        const sorted = [...dayItems].sort(
          (a, b) => (a.leg_number || 0) - (b.leg_number || 0),
        );
        for (const item of sorted) {
          const lat = Number(item.site?.latitude);
          const lng = Number(item.site?.longitude);
          if (lat && lng && !isNaN(lat) && !isNaN(lng)) {
            const prev = waypoints[waypoints.length - 1];
            if (!prev || prev.latitude !== lat || prev.longitude !== lng) {
              waypoints.push({ latitude: lat, longitude: lng });
            }
          }
        }
      }

      if (waypoints.length < 2) {
        setRouteCoordinates([]);
        setRouteSegments([]);
        setRouteSummary("");
        return;
      }

      try {
        setRouteLoading(true);
        const result = await vietmapService.calculateMultiPointRoute(waypoints);

        if (result.allCoordinates.length >= 2) {
          setRouteCoordinates(result.allCoordinates);

          const DAY_ROUTE_COLORS = [
            "#E74C3C", "#3498DB", "#2ECC71", "#F39C12",
            "#9B59B6", "#1ABC9C", "#E67E22", "#E91E63",
          ];
          const segs = result.segments.map((seg, idx) => ({
            coordinates: seg.route.coordinates,
            color: DAY_ROUTE_COLORS[idx % DAY_ROUTE_COLORS.length],
          }));
          setRouteSegments(segs);

          const totalKm = result.totalDistanceKm;
          const totalMin = result.totalDurationMinutes;
          const distText = totalKm < 1
            ? `${Math.round(totalKm * 1000)} m`
            : `${totalKm.toFixed(1)} km`;
          let timeText: string;
          if (totalMin < 60) {
            timeText = `${totalMin} phút`;
          } else {
            const h = Math.floor(totalMin / 60);
            const m = totalMin % 60;
            timeText = m === 0 ? `${h} giờ` : `${h} giờ ${m} phút`;
          }
          setRouteSummary(
            `Tổng: ${distText} • ${timeText} • ${waypoints.length} điểm dừng`,
          );
        }
      } catch (err) {
        console.log("Route calculation failed:", err);
        setRouteSummary("");
      } finally {
        setRouteLoading(false);
        setHasCalcRoute(true);
      }
    };

    calculatePlanRoute();
  }, [hasCalcRoute, plan?.items_by_day, isOffline]);

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
            display: "flex"
           },
        });
      };
    }, [navigation, insets])
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

  const checkOfflineAvailability = async () => {
    const [available, tileTemplate] = await Promise.all([
      checkAvailability(planId),
      offlinePlannerService.getOfflineMapTileTemplate(planId),
    ]);
    setIsAvailableOffline(available);
    setOfflineTileUrlTemplate(tileTemplate || undefined);
  };

  const isOnlineOnlyActionDisabled = isOffline;

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

  const handleOpenChat = () => {
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    const chatReadStorageKey = `planner_chat_last_read_${planId}_${user?.id || "guest"}`;
    void AsyncStorage.setItem(chatReadStorageKey, new Date().toISOString());
    setUnreadChatCount(0);

    navigation.navigate("PlanChatScreen", {
      planId,
      planName: plan?.name,
      ownerId: plan?.user_id || plan?.owner?.id,
    });
  };

  const handleOpenMembers = () => {
    navigation.navigate(
      "PlannerMembersScreen" as never,
      {
        planId,
        planName: plan?.name,
      } as never,
    );
  };

  useEffect(() => {
    const readUnreadCount = async () => {
      if (!planId || !user?.id || isOffline) return;

      try {
        const chatReadStorageKey = `planner_chat_last_read_${planId}_${user?.id || "guest"}`;
        const [messagesRes, lastReadRaw] = await Promise.all([
          pilgrimPlannerApi.getPlanMessages(planId, { page: 1, limit: 30 }),
          AsyncStorage.getItem(chatReadStorageKey),
        ]);

        const data: any = messagesRes?.data ?? (messagesRes as any);
        const messages: any[] = Array.isArray(data?.messages)
          ? data.messages
          : [];
        const lastReadAt = lastReadRaw ? new Date(lastReadRaw).getTime() : 0;

        const isOwnMessage = (msg: any) => {
          const uid = String(user.id);
          return (
            String(msg?.user_id ?? "") === uid ||
            String(msg?.sender?.id ?? "") === uid ||
            String(msg?.user?.id ?? "") === uid
          );
        };

        const unread = messages.filter((msg) => {
          if (isOwnMessage(msg)) return false;
          const createdAt = msg?.created_at || msg?.createdAt;
          const ts = createdAt ? new Date(createdAt).getTime() : 0;
          return ts > lastReadAt;
        }).length;

        setUnreadChatCount(unread);
      } catch {
        // Ignore polling errors (e.g., no permission in some invite states).
      }
    };

    void readUnreadCount();
    const timer = setInterval(() => {
      void readUnreadCount();
    }, 10000);

    return () => clearInterval(timer);
  }, [planId, user?.id, isOffline]);

  const getKnownSiteSnapshot = (
    siteId: string,
  ): LocalSiteSnapshot | undefined => {
    const knownSites = [
      ...sites,
      ...favorites,
      ...eventSitesList,
      ...(eventSite ? [eventSite] : []),
    ];
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

  const applyPlanMutation = async (
    localUpdater: (currentPlan: PlanEntity) => PlanEntity,
    cacheUpdater?: () => Promise<PlanEntity | null>,
  ) => {
    let cachedPlan: PlanEntity | null = null;

    if (isAvailableOffline && cacheUpdater) {
      try {
        cachedPlan = await cacheUpdater();
      } catch (error) {
        console.log("Failed to persist offline planner mutation:", error);
      }
    }

    if (cachedPlan) {
      setPlan(cachedPlan);
      return cachedPlan;
    }

    setPlan((currentPlan) =>
      currentPlan ? localUpdater(currentPlan) : currentPlan,
    );
    return null;
  };

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
      } else {
        fetchFavorites();
      }
    }
  }, [isAddModalVisible, activeTab]);

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
        text1: t("planner.inviteJoinSuccessTitle", { defaultValue: "Tham gia th\u00e0nh c\u00f4ng" }),
        text2: t("planner.inviteJoinSuccessBody", { defaultValue: "B\u1ea1n \u0111\u00e3 l\u00e0 th\u00e0nh vi\u00ean c\u1ee7a k\u1ebf ho\u1ea1ch n\u00e0y." }),
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

    return true;
  };

  const loadPlan = async () => {
    try {
      setLoading(true);
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
      if (response?.success && response.data) {
        const nextPlan = response.data;
        setPlan(nextPlan);
        try {
          const memRes = await pilgrimPlannerApi.getPlanMembers(planId);
          if (memRes.success && memRes.data?.members?.length) {
            setPlan((prev) =>
              prev && prev.id === nextPlan.id
                ? {
                  ...prev,
                  members: memRes.data!.members as unknown[],
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
  };

  const handleOpenEditPlan = () => {
    if (isReadOnlyPlannerView) return;
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    if (!plan) return;
    setEditPlanName(plan.name || "");
    setEditPlanStartDate(plan.start_date || "");
    setEditPlanEndDate(plan.end_date || "");
    setEditPlanPeople(plan.number_of_people || 1);
    setEditPlanTransportation(plan.transportation || "bus");
    const da = plan.deposit_amount;
    setEditPlanDepositInput(
      typeof da === "number" && da > 0 ? String(Math.round(da)) : "",
    );
    const pp = plan.penalty_percentage;
    setEditPlanPenaltyInput(
      typeof pp === "number" && Number.isFinite(pp)
        ? String(Math.round(pp))
        : "0",
    );
    setEditLockAt(plan.edit_lock_at || null);
    setShowEditPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!editPlanName.trim()) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.planNameRequired"),
      });
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
      if (editPlanPeople > 1) {
        const dep = parseVndInteger(editPlanDepositInput);
        if (!Number.isFinite(dep) || dep <= 0) {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: t("planner.depositRequiredForGroup"),
          });
          return;
        }
        if (dep > MAX_DEPOSIT_VND) {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: t("planner.depositInvalid"),
          });
          return;
        }
        const pen = parsePenaltyPercent(editPlanPenaltyInput);
        if (!Number.isFinite(pen) || pen < 0 || pen > 100) {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: t("planner.penaltyInvalid"),
          });
          return;
        }
        depositAmount = dep;
        penaltyPct = pen;
      }

      const updateBody: UpdatePlanRequest = {
        name: editPlanName.trim(),
        start_date: editPlanStartDate,
        end_date: editPlanEndDate,
        number_of_people: editPlanPeople,
        transportation: editPlanTransportation,
        ...(editPlanPeople > 1
          ? {
              deposit_amount: depositAmount,
              penalty_percentage: penaltyPct,
              // Chỉ gửi edit_lock_at nếu giá trị thay đổi so với ban đầu
              ...(editLockAt !== (plan?.edit_lock_at || null)
                ? { edit_lock_at: editLockAt }
                : {}),
            }
          : { deposit_amount: 0, penalty_percentage: 0 }),
      };

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
              }
              : { deposit_amount: 0, penalty_percentage: 0 }),
          });
        }

        setShowEditPlanModal(false);
        await loadPlan();
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.planUpdated"),
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || t("planner.cannotUpdatePlan"),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("planner.cannotUpdatePlan"),
      });
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
    navigation.navigate("SiteDetail" as never, { siteId } as never);
  };

  const handleOpenEventSite = async (site: SiteSummary) => {
    setEventSite(site);
    setShowEventListModal(true);
    setSiteEvents([]);
    try {
      setIsLoadingEvents(true);
      const eventParams: any = { limit: 20 };
      if (plan?.start_date && plan?.end_date) {
        eventParams.start_date = plan.start_date.substring(0, 10);
        eventParams.end_date = plan.end_date.substring(0, 10);
      } else {
        eventParams.upcoming = "true";
      }
      const res = await pilgrimSiteApi.getSiteEvents(site.id, eventParams);
      if (res.success && res.data?.data) {
        setSiteEvents(res.data.data);
      }
    } catch (e) {
      console.log("Load site events error:", e);
    } finally {
      setIsLoadingEvents(false);
    }
  };

  const handleOpenShareModal = () => {
    if (isReadOnlyPlannerView) return;
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    setShowShareModal(true);
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
      const errMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.response?.data?.error?.details?.[0]?.message ||
        error?.message ||
        t("planner.shareCommunityError", {
          defaultValue:
            "Không thể chia sẻ. Kiểm tra quyền và trạng thái kế hoạch.",
        });
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: errMsg,
        visibilityTime: 4500,
      });
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
        text1: "Không thể khoá chỉnh sửa",
        text2: "Cần mời ít nhất 1 thành viên trước khi có thể khoá chỉnh sửa.",
        visibilityTime: 4000,
      });
      return;
    }

    const confirmed = await confirm({
      type: "info",
      iconName: "lock-closed-outline",
      title: "Khoá chỉnh sửa lộ trình?",
      message:
        "Bạn có chắc muốn khoá lộ trình ngay bây giờ? Việc này sẽ ghi đè lịch trình tự động. Sau khi khoá, lộ trình sẽ được cố định để thành viên tham khảo, nhưng chưa khoá danh sách người đi.",
      confirmText: "Khoá ngay",
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
          text1: "Đã khoá chỉnh sửa",
          text2: "Lộ trình đã được khoá cố định.",
          visibilityTime: 3000,
        });
        await loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: res.message || "Không thể khoá chỉnh sửa.",
        });
      }
    } catch (error: any) {
      const errMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        "Không thể khoá chỉnh sửa.";
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: errMsg,
        visibilityTime: 4000,
      });
    } finally {
      setUpdatingPlanStatus(false);
    }
  };

  const handleUpdatePlannerStatus = async (
    targetStatus: "locked" | "ongoing" | "completed"
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
          text2: `Vui lòng thêm điểm viếng cho ngày ${missingDays.join(", ")} trước khi ${isLock ? "chốt kế hoạch" : "bắt đầu hành hương"}.`,
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
      Number(plan?.number_of_people || 1) > 1 &&
      plan?.is_locked &&
      plan?.edit_lock_at
    ) {
      const lockEditTime = new Date(plan.edit_lock_at).getTime();
      const now = new Date().getTime();
      const hoursSinceLock = (now - lockEditTime) / (1000 * 60 * 60);

      if (hoursSinceLock < 12) {
        msg =
          "Lịch trình chỉ mới khoá chỉnh sửa chưa đầy 12h, một số thành viên có thể chưa kịp xem để xác nhận đi hay không. Bạn có chắc chắn muốn chốt danh sách người tham gia ngay bây giờ không?";
        confirmType = "warning";
      }
    }

    const confirmed = await confirm({
      type: confirmType,
      iconName: isLock
        ? "lock-closed-outline"
        : isStart
          ? "rocket-outline"
          : "flag-outline",
      title,
      message: msg,
      confirmText: isLock ? "Chốt ngay" : isStart ? "Bắt đầu" : title,
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    setUpdatingPlanStatus(true);
    try {
      // Solo planner: auto-lock status before starting (backend requires 'locked' before 'ongoing')
      const isSolo = Number(plan?.number_of_people || 1) <= 1;
      const currentStatus = (plan?.status || "").toLowerCase();

      if (isStart && isSolo && currentStatus === "planning") {
        await pilgrimPlannerApi.updatePlannerStatus(planId, { status: "locked" });
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
      const errMsg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        t("planner.statusUpdateFailed", {
          defaultValue: "Không thể cập nhật trạng thái.",
        });
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: errMsg,
        visibilityTime: 4000,
      });
    } finally {
      setUpdatingPlanStatus(false);
    }
  };

  const handleDeletePlan = async () => {
    if (isReadOnlyPlannerView) return;
    setShowMenuDropdown(false);

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
        navigation.goBack();
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

    setShowCalendarSyncModal(true);
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

    setShowOfflineModal(true);
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

    navigation.getParent()?.navigate(
      "Ho so" as never,
      {
        screen: "OfflineDownloads",
      } as never,
    );
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

  const handleDeleteItem = async (itemId: string) => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("planner.removeItem", { defaultValue: "Xóa địa điểm" }),
      message: t("planner.removeItemConfirm", {
        defaultValue: "Bạn có chắc chắn muốn xóa địa điểm này khỏi lịch trình?",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
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
          (currentPlan) => applyLocalDeleteItem(currentPlan, itemId),
          () => offlinePlannerService.deletePlannerItem(planId, itemId),
        );
        return;
      }

      const response = await pilgrimPlannerApi.deletePlanItem(
        planId,
        itemId,
      );
      if (response.success) {
        await applyPlanMutation(
          (currentPlan) => applyLocalDeleteItem(currentPlan, itemId),
          () => offlinePlannerService.deletePlannerItem(planId, itemId),
        );
        loadPlan();
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

  const handleReorderIconPress = (dayKey: string, item: PlanItem) => {
    if (!plan || isReadOnlyPlannerView) return;
    const id = item.id;
    if (!id) return;

    if (!swapPick || swapPick.dayKey !== dayKey) {
      setSwapPick({ dayKey, itemId: id });
      return;
    }
    if (swapPick.itemId === id) {
      setSwapPick(null);
      return;
    }
    // Show preview instead of swapping immediately
    swapPreview.startPreview(dayKey, swapPick.itemId, id);
    setSwapPick(null);
  };

  /** Execute swap after preview confirmation — reorder + update times */
  const executeSwapWithTimes = async () => {
    if (!plan || !swapPreview.result) return;
    const { dayKey, itemIdA, itemIdB, result } = swapPreview;
    if (!dayKey || !itemIdA || !itemIdB) return;

    setSwappingItems(true);
    try {
      const raw = plan.items_by_day?.[dayKey] || [];
      const sorted = sortPlanDayItems(raw);
      const indexA = sorted.findIndex((i) => i.id === itemIdA);
      const indexB = sorted.findIndex((i) => i.id === itemIdB);
      if (indexA < 0 || indexB < 0) throw new Error('Items not found');

      // orderedNewTimes is already in correct position order (0, 1, 2, ...)
      const { orderedNewTimes } = result;

      // Build a lookup for local state mutation
      const timeLookup: Record<string, string> = {};
      orderedNewTimes.forEach((entry) => {
        timeLookup[entry.id] = entry.time;
      });

      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        // Offline: queue individual item updates (order_index + time)
        for (let i = 0; i < orderedNewTimes.length; i++) {
          const { id: itemId, time } = orderedNewTimes[i];
          await networkService.addToOfflineQueue({
            endpoint: `/api/planners/${planId}/items/${itemId}`,
            method: "PATCH",
            data: {
              order_index: i + 1,
              estimated_time: time,
            },
          });
        }
        await applyPlanMutation(
          (currentPlan) => {
            let updated = applyLocalSwapDayItems(currentPlan, dayKey, indexA, indexB);
            const itemsByDay = { ...updated.items_by_day };
            itemsByDay[dayKey] = (itemsByDay[dayKey] || []).map((item) => ({
              ...item,
              estimated_time: timeLookup[item.id!] || item.estimated_time,
            }));
            return { ...updated, items_by_day: itemsByDay };
          },
          () =>
            offlinePlannerService.swapPlannerItemsOrder(
              planId, Number(dayKey), itemIdA, itemIdB,
            ),
        );
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        swapPreview.close();
        return;
      }

      // ── Online: update each item SEQUENTIALLY (order matters!) ──
      // Update order_index + estimated_time in ONE call per item,
      // processed first-to-last so backend validation passes.
      for (let i = 0; i < orderedNewTimes.length; i++) {
        const { id: itemId, time } = orderedNewTimes[i];
        await pilgrimPlannerApi.updatePlanItem(planId, itemId, {
          order_index: i + 1,
          estimated_time: time,
        });
      }

      // Apply locally + refresh
      await applyPlanMutation(
        (currentPlan) => {
          let updated = applyLocalSwapDayItems(currentPlan, dayKey, indexA, indexB);
          const itemsByDay = { ...updated.items_by_day };
          itemsByDay[dayKey] = (itemsByDay[dayKey] || []).map((item) => ({
            ...item,
            estimated_time: timeLookup[item.id!] || item.estimated_time,
          }));
          return { ...updated, items_by_day: itemsByDay };
        },
        () =>
          offlinePlannerService.swapPlannerItemsOrder(
            planId, Number(dayKey), itemIdA, itemIdB,
          ),
      );

      Toast.show({
        type: "success",
        text1: "Đã đổi thứ tự",
        text2: "Thời gian đã được tính lại theo lộ trình mới.",
      });
      swapPreview.close();
      loadPlan();
    } catch (error: any) {
      console.log("Swap error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || "Không thể đổi thứ tự",
      });
    } finally {
      setSwappingItems(false);
    }
  };

  const handleOpenEditItem = async (item: PlanItem) => {
    setEditingItem(item);
    // Parse existing estimated_time
    const timeVal =
      typeof item.estimated_time === "string" ? item.estimated_time : "10:00";
    setEditEstimatedTime(
      timeVal.length >= 5 ? timeVal.substring(0, 5) : timeVal,
    );
    // Parse rest_duration to minutes
    const durStr = formatTimeValue(item.rest_duration);
    let minutes = 120;
    const hourMatch = durStr.match(/(\d+)\s*gi[oờ]/);
    const minMatch = durStr.match(/(\d+)\s*ph[uút]/);
    if (hourMatch) minutes = parseInt(hourMatch[1]) * 60;
    if (minMatch) minutes += parseInt(minMatch[1]);
    if (!hourMatch && !minMatch) {
      const rawMatch = durStr.match(/(\d+)/);
      if (rawMatch) minutes = parseInt(rawMatch[1]);
    }
    setEditRestDuration(Math.max(60, Math.min(240, minutes)));
    setEditNote(item.note || "");
    setEditRouteInfo("");
    setShowEditItemModal(true);

    // Calculate route from previous item to this item using VietMap
    const dayKey = String(item.day_number ?? item.leg_number ?? 1);
    const dayItems: PlanItem[] = plan?.items_by_day?.[dayKey] || [];
    const currentIndex = dayItems.findIndex((i) => i.id === item.id);
    if (currentIndex > 0) {
      const prevItem = dayItems[currentIndex - 1];
      const prevSiteId = prevItem.site_id || prevItem.site?.id;
      const currSiteId = item.site_id || item.site?.id;
      if (prevSiteId && currSiteId) {
        try {
          setCalculatingEditRoute(true);
          const [prevDetail, currDetail] = await Promise.all([
            pilgrimSiteApi.getSiteDetail(prevSiteId),
            pilgrimSiteApi.getSiteDetail(currSiteId),
          ]);
          const prevSite = prevDetail?.data;
          const currSite = currDetail?.data;
          if (
            prevSite?.latitude &&
            prevSite?.longitude &&
            currSite?.latitude &&
            currSite?.longitude
          ) {
            const route = await vietmapService.calculateRoute(
              { latitude: prevSite.latitude, longitude: prevSite.longitude },
              { latitude: currSite.latitude, longitude: currSite.longitude },
            );
            const distanceDisplay =
              route.distance < 1000
                ? `${Math.round(route.distance)} m`
                : `${route.distanceKm.toFixed(1)} km`;
            setEditRouteInfo(
              `📍 ${distanceDisplay}  ⏱️ ${route.durationText} di chuyển từ điểm trước`,
            );
          } else {
            setEditRouteInfo("Không có tọa độ để tính toán lộ trình");
          }
        } catch {
          setEditRouteInfo("Không thể tính toán lộ trình");
        } finally {
          setCalculatingEditRoute(false);
        }
      }
    } else if (currentIndex === 0) {
      setEditRouteInfo("Điểm đầu tiên trong ngày");
    }
  };

  const handleEditTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") setShowEditTimePicker(false);
    if (selectedDate) {
      const h = selectedDate.getHours().toString().padStart(2, "0");
      const m = selectedDate.getMinutes().toString().padStart(2, "0");
      setEditEstimatedTime(`${h}:${m}`);
      if (Platform.OS === "ios") setShowEditTimePicker(false);
    }
  };

  const openEditTimePicker = () => {
    const [h, m] = editEstimatedTime.split(":").map(Number);
    const d = new Date();
    d.setHours(h || 10);
    d.setMinutes(m || 0);
    setEditTempTime(d);
    setShowEditTimePicker(true);
  };

  const handleSaveEditItem = async () => {
    if (!editingItem) return;
    try {
      setSavingEdit(true);
      const payload: UpdatePlanItemRequest = {
        estimated_time: editEstimatedTime,
        rest_duration: buildDurationString(editRestDuration),
        note: editNote.trim() || undefined,
      };

      const isOnline = await networkService.checkConnection();
      if (!isOnline) {
        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items/${editingItem.id}`,
          method: "PUT",
          data: {
            planner_item_id: editingItem.id,
            ...payload,
          },
        });

        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(planId, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
        );

        setShowEditItemModal(false);
        setEditingItem(null);
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        return;
      }

      const response = await pilgrimPlannerApi.updatePlanItem(
        planId,
        editingItem.id,
        payload,
      );
      if (response.success) {
        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(planId, editingItem.id, {
              estimated_time: payload.estimated_time,
              rest_duration: payload.rest_duration,
              note: payload.note,
            }),
        );
        setShowEditItemModal(false);
        setEditingItem(null);
        loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || t("planner.cannotUpdateItem"),
        });
      }
    } catch (error: any) {
      const respData = error?.response?.data;
      const isValidationError = error?.response?.status === 400 || error?.response?.status === 409;

      if (isValidationError) {
        console.log("[API] Validation error saving edit:", JSON.stringify(respData));
      } else {
        console.log("Save edit serious error:", error?.message || error);
      }

      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          respData?.error?.message ||
          respData?.message ||
          error.message ||
          t("planner.cannotUpdateItem"),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const openAddModal = (day: number) => {
    setSelectedDay(day);
    setIsAddModalVisible(true);
  };

  const handleTimeChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === "android") {
      setShowTimePicker(false);
    }
    if (selectedDate) {
      const hours = selectedDate.getHours().toString().padStart(2, "0");
      const minutes = selectedDate.getMinutes().toString().padStart(2, "0");
      setEstimatedTime(`${hours}:${minutes}`);
      if (Platform.OS === "ios") {
        setShowTimePicker(false);
      }
    }
  };

  const openTimePicker = () => {
    // Parse current estimatedTime to set initial time
    const [hours, minutes] = estimatedTime.split(":").map(Number);
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes);
    setTempTime(date);
    setShowTimePicker(true);
  };

  const formatDuration = (minutes: number) => {
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (hours > 0 && remainingMinutes > 0) {
      return `${hours} ${t("planner.hours")} ${remainingMinutes} ${t("planner.minutes")}`;
    } else if (hours > 0) {
      return `${hours} ${t("planner.hours")}`;
    } else {
      return `${minutes} ${t("planner.minutes")}`;
    }
  };

  const formatTimeValue = (value: any): string => {
    if (!value) return "";
    if (typeof value === "string") {
      // If it's a time string like "10:30:00", trim the seconds
      if (value.match(/^\d{2}:\d{2}:\d{2}$/)) {
        return value.substring(0, 5);
      }
      return value;
    }
    if (typeof value === "object" && value.hours !== undefined) {
      // Handle object format like {hours: 2, minutes: 30}
      const hours = value.hours || 0;
      const minutes = value.minutes || 0;
      if (hours > 0 && minutes > 0) {
        return `${hours} ${t("planner.hours")} ${minutes} ${t("planner.minutes")}`;
      } else if (hours > 0) {
        return `${hours} ${t("planner.hours")}`;
      } else if (minutes > 0) {
        return `${minutes} ${t("planner.minutes")}`;
      }
    }
    return String(value);
  };

  const parseDurationToMinutes = (durationStr: any): number =>
    parseDurationToMinutesRaw(durationStr, formatTimeValue);

  const calculateEndTime = (startTimeStr: any, durationStr: any): string =>
    calculateEndTimeRaw(startTimeStr, durationStr, formatTimeValue);

  const getDateForDay = (startDateStr: string, dayNumber: number): string =>
    getDateForDayRaw(startDateStr, dayNumber);

  const handleAddItem = async (siteId: string, eventId?: string) => {
    setSelectedEventId(eventId || null);
    await addSiteFlow.startFlow(siteId, eventId);
  };


  const addItemToItinerary = async (siteId: string) => {
    if (crossDaysAdded > 0) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.cannotAddItemCrossDay"),
      });
      return;
    }

    // Modal confirmation if plan is ongoing
    const currentStatus = String(plan?.status || "").toLowerCase();
    if (currentStatus === "ongoing") {
      const isConfirmed = await confirm({
        title: "Xác nhận thêm địa điểm",
        message: "Hành trình này đang diễn ra. Khi thêm mới bạn sẽ KHÔNG THỂ xóa hay chỉnh sửa lại địa điểm này nữa! Bạn chắc chắn muốn thêm?",
        confirmText: "Thêm địa điểm",
        cancelText: "Hủy",
        type: "warning",
      });
      if (!isConfirmed) return;
    }

    try {
      setAddingItem(true);

      // Convert minutes to duration format with proper singular/plural
      const totalMinutes = restDuration;
      const durationHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      let restDurationStr: string;
      if (durationHours > 0 && remainingMinutes > 0) {
        restDurationStr = `${durationHours} hour${durationHours > 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
      } else if (durationHours > 0) {
        restDurationStr = `${durationHours} hour${durationHours > 1 ? "s" : ""}`;
      } else {
        restDurationStr = `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
      }

      // Use flow's selectedEventId (includes auto-detected events)
      const flowEventId = addSiteFlow.selectedEventId;

      const localDraft = {
        site_id: siteId,
        day_number: selectedDay,
        note: note.trim() || undefined,
        estimated_time: estimatedTime,
        rest_duration: restDurationStr,
        ...(flowEventId ? { event_id: flowEventId } : {}),
      };

      const apiPayload: AddPlanItemRequest = {
        site_id: siteId,
        leg_number: selectedDay,
        estimated_time: estimatedTime,
        rest_duration: restDurationStr,
        ...(localDraft.note ? { note: localDraft.note } : {}),
        ...(flowEventId ? { event_id: flowEventId } : {}),
        ...(travelTimeMinutes !== undefined
          ? { travel_time_minutes: travelTimeMinutes }
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
          (currentPlan) =>
            applyLocalAddItem(
              currentPlan,
              planId,
              localDraft,
              tempItemId,
              siteSnapshot,
            ),
          () =>
            offlinePlannerService.addPlannerItem(planId, {
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
            }),
        );

        addSiteFlow.closeTimeModal();
        setNote("");
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.itemAddedOffline"),
        });
        return;
      }

      const response = await pilgrimPlannerApi.addPlanItem(planId, apiPayload);

      if (response.success) {
        const createdItemId = response.data?.item?.id;

        await applyPlanMutation(
          (currentPlan) =>
            applyLocalAddItem(
              currentPlan,
              planId,
              localDraft,
              createdItemId,
              siteSnapshot,
            ),
          createdItemId
            ? () =>
              offlinePlannerService.addPlannerItem(planId, {
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
              })
            : undefined,
        );
        addSiteFlow.closeTimeModal();
        setNote("");
        loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: "Không thể thêm địa điểm",
          text2: response.message || "Đã xảy ra lỗi",
          visibilityTime: 4000,
        });
      }
    } catch (error: any) {
      const respData = error?.response?.data;
      const isValidationError = error?.response?.status === 400 || error?.response?.status === 409;

      if (isValidationError) {
        console.log("[API] Validation error adding item:", JSON.stringify(respData));
      } else {
        console.log("Add item serious error:", error?.message || error);
      }

      const errMsg =
        respData?.error?.message ||
        respData?.message ||
        respData?.error?.details?.[0]?.message ||
        error?.message ||
        "Không thể thêm địa điểm";
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
    }
  };

  const handleOpenNearbyPlaces = async (item: PlanItem) => {
    setNearbyContextItem(item);
    setNearbySiteName(item.site.name);
    setNearbyCategory("all");
    setNearbyPlaces([]);
    setSavedNearbyPlaceIds(new Set(item.nearby_amenity_ids || [])); // pre-mark already saved places
    setShowNearbyModal(true);
    try {
      setLoadingNearby(true);
      const siteId = item.site_id || item.site?.id || "";
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        const offlineData = await offlinePlannerService.getPlannerData(planId);
        const offlinePlaces = (offlineData?.nearby_places || [])
          .filter((place) => place.site_id === siteId)
          .map(mapOfflineNearbyPlace);
        setNearbyPlaces(offlinePlaces);
        return;
      }

      const response = await pilgrimSiteApi.getSiteNearbyPlaces(siteId);
      if (response.success && response.data?.data) {
        setNearbyPlaces(response.data.data);
      }
    } catch (error) {
      console.log("Load nearby places error:", error);
    } finally {
      setLoadingNearby(false);
    }
  };

  const handleSaveNearbyPlace = async (place: SiteNearbyPlace) => {
    if (!nearbyContextItem) return;
    // Lấy danh sách UUID hiện tại, thêm UUID mới vào (tránh trùng)
    const existingIds: string[] = nearbyContextItem.nearby_amenity_ids || [];
    if (existingIds.includes(place.id)) {
      // Đã lưu rồi, chỉ mark UI
      setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
      return;
    }
    try {
      setSavingNearbyPlaceId(place.id);
      const newIds = [...existingIds, place.id];
      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        await networkService.addToOfflineQueue({
          endpoint: `/api/planners/${planId}/items/${nearbyContextItem.id}`,
          method: "PUT",
          data: {
            planner_item_id: nearbyContextItem.id,
            nearby_amenity_ids: newIds,
          },
        });

        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, nearbyContextItem.id, {
              nearby_amenity_ids: newIds,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(
              planId,
              nearbyContextItem.id,
              {
                nearby_amenity_ids: newIds,
              },
            ),
        );

        setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
        setNearbyContextItem((prev) =>
          prev ? { ...prev, nearby_amenity_ids: newIds } : prev,
        );
        setSelectedItem((prev) =>
          prev && prev.id === nearbyContextItem.id
            ? { ...prev, nearby_amenity_ids: newIds }
            : prev,
        );
        return;
      }

      const response = await pilgrimPlannerApi.updatePlanItem(
        planId,
        nearbyContextItem.id,
        {
          nearby_amenity_ids: newIds,
        },
      );
      if (response.success) {
        // Mark as saved — keep modal open so user can save more places
        setSavedNearbyPlaceIds((prev) => new Set([...prev, place.id]));
        // Update contextItem so next save chains correctly
        setNearbyContextItem((prev) =>
          prev ? { ...prev, nearby_amenity_ids: newIds } : prev,
        );
        // Also update selectedItem so reopening the nearby modal shows correct saved state
        setSelectedItem((prev) =>
          prev && prev.id === nearbyContextItem.id
            ? { ...prev, nearby_amenity_ids: newIds }
            : prev,
        );
        await applyPlanMutation(
          (currentPlan) =>
            applyLocalItemUpdate(currentPlan, nearbyContextItem.id, {
              nearby_amenity_ids: newIds,
            }),
          () =>
            offlinePlannerService.updatePlannerItem(
              planId,
              nearbyContextItem.id,
              {
                nearby_amenity_ids: newIds,
              },
            ),
        );
        loadPlan();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || t("planner.cannotSavePlace"),
        });
      }
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error.message || t("planner.cannotSavePlace"),
      });
    } finally {
      setSavingNearbyPlaceId(null);
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

  if (loading) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!plan) {
    return (
      <View style={[styles.container, styles.centerContent]}>
        <Text style={styles.errorText}>Không tìm thấy kế hoạch</Text>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Text style={styles.backButtonText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // Translate plan status to Vietnamese
  const translateStatus = (status?: string) => {
    switch (status?.toLowerCase()) {
      case "planning":
        return "Đang lập kế hoạch";
      case "locked":
        return "Sẵn sàng";
      case "ongoing":
        return "Đang hành hương";
      case "completed":
        return "Hoàn thành";
      case "cancelled":
        return "Đã hủy";
      case "draft":
        return "Nháp";
      default:
        return status || "Đã lên kế hoạch";
    }
  };

  const getPilgrimTag = (item: PlanItem): string => {
    if (item.event_id) return "Thánh lễ";
    const note = String(item.note || "").toLowerCase();
    if (note.includes("chầu")) return "Chầu Thánh Thể";
    if (note.includes("đức mẹ") || note.includes("duc me"))
      return "Viếng Đức Mẹ";
    if (note.includes("nghỉ") || note.includes("rest")) return "Nghỉ ngơi";
    return "Điểm viếng";
  };

  const totalDays =
    plan.number_of_days ||
    (plan.items_by_day ? Object.keys(plan.items_by_day).length : 1);
  const sortedDays = Array.from({ length: totalDays }, (_, i) => String(i + 1));
  const safeTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);
  const planStatusStr = (plan?.status || "").toLowerCase();
  const isCompletedPlan = planStatusStr === "completed";
  const isOngoingPlan = planStatusStr === "ongoing";
  const isSoloPlan = Number(plan?.number_of_people || 1) <= 1;

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
              onPress={() => setShowFullMap(true)}
            >
              <Ionicons name="expand-outline" size={24} color="#fff" />
            </TouchableOpacity>
            {(isPlanOwner || !isPlanOwner) && (
              <TouchableOpacity
                style={styles.navButton}
                onPress={() => setShowMenuDropdown(true)}
              >
                <Ionicons name="ellipsis-vertical" size={24} color="#fff" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Menu Dropdown Popup */}
        {showMenuDropdown && (
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
                    opacity: isOnlineOnlyActionDisabled ? 0.5 : 1,
                  }}
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
                    style={{
                      fontSize: 16,
                      color: isOnlineOnlyActionDisabled
                        ? COLORS.textTertiary
                        : "#C08A2E",
                      fontWeight: "500",
                    }}
                  >
                    Sửa kế hoạch
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
                  color={
                    isOffline || syncingCalendar
                      ? COLORS.textTertiary
                      : "#2563EB"
                  }
                  style={{ marginRight: 12 }}
                />
                <Text
                  style={{
                    fontSize: 16,
                    color:
                      isOffline || syncingCalendar
                        ? COLORS.textTertiary
                        : "#2563EB",
                    fontWeight: "500",
                  }}
                >
                  {syncingCalendar
                    ? t("planner.syncing")
                    : t("planner.syncCalendar")}
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
                      isOffline || downloadingOffline
                        ? COLORS.textTertiary
                        : "#10B981"
                    }
                    style={{ marginRight: 12 }}
                  />
                  <Text
                    style={{
                      fontSize: 16,
                      color:
                        isOffline || downloadingOffline
                          ? COLORS.textTertiary
                          : "#10B981",
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
                      defaultValue: "Manage offline data",
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
                  opacity: isOnlineOnlyActionDisabled ? 0.5 : 1,
                }}
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
                  style={{
                    fontSize: 16,
                    color: isOnlineOnlyActionDisabled
                      ? COLORS.textTertiary
                      : "#8B5CF6",
                    fontWeight: "500",
                  }}
                >
                  {t("planner.fundStatement", {
                    defaultValue: "Sao kê quỹ nhóm",
                  })}
                </Text>
              </TouchableOpacity>

              {isPlanOwner && (
                <TouchableOpacity
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    padding: 12,
                    opacity: isOnlineOnlyActionDisabled ? 0.5 : 1,
                  }}
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
                    style={{
                      fontSize: 16,
                      color: isOnlineOnlyActionDisabled
                        ? COLORS.textTertiary
                        : "#EF4444",
                      fontWeight: "500",
                    }}
                  >
                    Xóa kế hoạch
                  </Text>
                </TouchableOpacity>
              )}

            </View>
          </TouchableOpacity>
        )}

        {/* Title & Info */}
        <View
          style={[styles.headerContent, { zIndex: 10 }]}
          pointerEvents="box-none"
        >
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
                <Text style={styles.statusText}>Công khai</Text>
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
                <Text style={styles.metaText}>{plan.number_of_days} Ngày</Text>
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
                {memberAvatars.people} người
              </Text>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.quickActionsRow}>
          {/* Chat nhóm — chỉ hiện cho nhóm */}
          {!isSoloPlan && (
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                isOnlineOnlyActionDisabled && styles.disabledAction,
              ]}
              onPress={handleOpenChat}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF8E7" />
              <Text style={styles.quickActionText}>Chat nhóm</Text>
              {unreadChatCount > 0 && (
                <View style={styles.quickActionBadge}>
                  <Text style={styles.quickActionBadgeText}>
                    {unreadChatCount > 99 ? "99+" : unreadChatCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          )}

          {/* Tiến độ (solo) / Thành viên (nhóm) — hiện khi ongoing hoặc completed */}
          {!isInvitePendingView && (!isPlanOwner || isOngoingPlan || isCompletedPlan) && (
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                isOnlineOnlyActionDisabled && styles.disabledAction,
              ]}
              onPress={handleOpenMembers}
              disabled={isOnlineOnlyActionDisabled}
            >
              <Ionicons
                name={isSoloPlan ? "analytics-outline" : "people-outline"}
                size={18}
                color="#FFF8E7"
              />
              <Text style={styles.quickActionText}>
                {isSoloPlan ? "Tiến độ" : "Thành viên"}
              </Text>
            </TouchableOpacity>
          )}

          {/* Mời bạn bè (nhóm, planning/locked) / Chia sẻ cộng đồng (completed) */}
          {isPlanOwner && !isOngoingPlan && (!isSoloPlan || isCompletedPlan) && (
            <TouchableOpacity
              style={[
                styles.quickActionButton,
                (isCompletedPlan
                  ? isOnlineOnlyActionDisabled || sharingToCommunity
                  : isOnlineOnlyActionDisabled) && styles.disabledAction,
              ]}
              onPress={
                isCompletedPlan
                  ? handleSharePlannerToCommunity
                  : handleOpenShareModal
              }
              disabled={
                isCompletedPlan
                  ? isOnlineOnlyActionDisabled || sharingToCommunity
                  : isOnlineOnlyActionDisabled
              }
            >
              <Ionicons
                name={isCompletedPlan ? "share-social-outline" : "qr-code-outline"}
                size={18}
                color="#FFF8E7"
              />
              <Text style={styles.quickActionText}>
                {isCompletedPlan ? "Chia sẻ" : "Mời bạn bè"}
              </Text>
            </TouchableOpacity>
          )}
        </View>

        {/* 1. Thẻ Lời mời (Đọc thông tin trước khi quyết định) */}
        {isInvitePendingView && (
          <InvitePreviewCard
            ownerName={ownerName}
            ownerEmail={ownerEmail}
            depositAmount={depositAmount}
            penaltyPercentage={penaltyPercentage}
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
          />
        )}

        {/* 2. Cụm nút Quyết định (Ra quyết định sau khu đọc) */}
        {isInvitePendingView && (
          <View
            style={{ flexDirection: "row", marginHorizontal: SPACING.lg, marginBottom: SPACING.md, gap: 12 }}
          >
            <TouchableOpacity
              style={{
                flex: 1,
                paddingVertical: 14,
                alignItems: "center",
                opacity: respondingInvite ? 0.6 : 1,
                borderWidth: 1,
                borderColor: "#E5E7EB",
                borderRadius: BORDER_RADIUS.md,
                backgroundColor: "#FFFFFF",
              }}
              onPress={async () => {
                const confirmed = await confirm({
                  type: "danger",
                  iconName: "close-circle-outline",
                  title: "T\u1eeb ch\u1ed1i l\u1eddi m\u1eddi",
                  message: "B\u1ea1n ch\u1eafc ch\u1eafn mu\u1ed1n t\u1eeb ch\u1ed1i l\u1eddi m\u1eddi tham gia k\u1ebf ho\u1ea1ch n\u00e0y? Thao t\u00e1c n\u00e0y kh\u00f4ng th\u1ec3 ho\u00e0n t\u00e1c.",
                  confirmText: "T\u1eeb ch\u1ed1i",
                  cancelText: "Quay l\u1ea1i",
                });
                if (confirmed) handleRejectInvite();
              }}
              disabled={respondingInvite || isOffline}
              activeOpacity={0.85}
            >
              <Text style={{ fontWeight: "600", color: COLORS.textSecondary, fontSize: 15 }}>
                Từ chối
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={{
                flex: 1,
                backgroundColor: COLORS.accent,
                borderRadius: BORDER_RADIUS.md,
                paddingVertical: 14,
                alignItems: "center",
                opacity: respondingInvite ? 0.6 : 1,
              }}
              onPress={async () => {
                const depositText = depositAmount != null && Number(depositAmount) > 0
                  ? `${Math.round(Number(depositAmount)).toLocaleString("vi-VN")} \u20ab`
                  : null;
                const confirmed = await confirm({
                  type: "info",
                  iconName: "checkmark-circle-outline",
                  title: "X\u00e1c nh\u1eadn tham gia",
                  message: depositText
                    ? `B\u1ea1n s\u1ebd tham gia k\u1ebf ho\u1ea1ch n\u00e0y v\u00e0 c\u1ea7n thanh to\u00e1n ti\u1ec1n c\u1ecdc ${depositText}. Ti\u1ebfp t\u1ee5c?`
                    : "B\u1ea1n x\u00e1c nh\u1eadn mu\u1ed1n tham gia k\u1ebf ho\u1ea1ch h\u00e0nh h\u01b0\u01a1ng n\u00e0y?",
                  confirmText: "\u0110\u1ed3ng \u00fd",
                  cancelText: "H\u1ee7y",
                });
                if (confirmed) handleJoinInvite();
              }}
              disabled={respondingInvite || isOffline}
              activeOpacity={0.85}
            >
              <Text style={{ fontWeight: "700", color: COLORS.textPrimary, fontSize: 15 }}>
                Tham gia
              </Text>
            </TouchableOpacity>
          </View>
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
          <View
            style={{
              marginBottom: SPACING.md,
              marginHorizontal: SPACING.lg,
              backgroundColor: "#F0F4FF",
              borderRadius: BORDER_RADIUS.lg,
              padding: 14,
              borderWidth: 1,
              borderColor: "#D6E0F5",
            }}
          >
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => setIsLockScheduleExpanded(!isLockScheduleExpanded)}
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: isLockScheduleExpanded ? 10 : 0,
              }}
            >
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Ionicons
                  name="timer-outline"
                  size={18}
                  color="#2563EB"
                  style={{ marginRight: 8 }}
                />
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "700",
                    color: "#1E40AF",
                  }}
                >
                  Lịch khoá kế hoạch
                </Text>
              </View>
              <Ionicons
                name={isLockScheduleExpanded ? "chevron-up" : "chevron-down"}
                size={20}
                color="#64748B"
              />
            </TouchableOpacity>

            {isLockScheduleExpanded && (
              <View>
                {/* Edit Lock */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor: plan?.is_locked ? "#16A34A" : "#F59E0B",
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
                    <Text style={{ fontWeight: "600", color: "#4B5563" }}>Khoá chỉnh sửa: </Text>
                    {plan?.is_locked ? (
                      <Text style={{ fontWeight: "700", color: "#16A34A" }}>Đã khoá ✓</Text>
                    ) : plan?.edit_lock_at ? (
                      <Text style={{ fontWeight: "800", color: "#D97706" }}>
                        {new Date(plan.edit_lock_at).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    ) : (
                      <Text style={{ fontWeight: "600", color: "#6B7280" }}>Tự động (24h trước ngày đi)</Text>
                    )}
                  </Text>
                </View>

                {/* Status Lock */}
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    marginBottom: 6,
                  }}
                >
                  <View
                    style={{
                      width: 8,
                      height: 8,
                      borderRadius: 4,
                      backgroundColor:
                        planStatusStr === "locked" ? "#16A34A" : "#F59E0B",
                      marginRight: 8,
                    }}
                  />
                  <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
                    <Text style={{ fontWeight: "600", color: "#4B5563" }}>Chốt kế hoạch: </Text>
                    {planStatusStr === "locked" ? (
                      <Text style={{ fontWeight: "700", color: "#16A34A" }}>Đã chốt ✓</Text>
                    ) : (plan as any)?.planner_lock_at ? (
                      <Text style={{ fontWeight: "800", color: "#D97706" }}>
                        {new Date((plan as any).planner_lock_at).toLocaleString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </Text>
                    ) : (
                      <Text style={{ fontWeight: "600", color: "#6B7280" }}>Tự động (12h trước ngày đi)</Text>
                    )}
                  </Text>
                </View>

                {/* Hint */}
                {planStatusStr === "planning" && (
                  <Text
                    style={{
                      fontSize: 11,
                      color: "#6B7280",
                      marginTop: 4,
                      lineHeight: 16,
                    }}
                  >
                    💡 Hệ thống sẽ tự động khoá theo lịch trên. Bạn có thể sử dụng nút bên dưới để thực hiện thủ công ngay lập tức.
                  </Text>
                )}

                {/* CTA: Khoá lộ trình / Chốt kế hoạch — Gộp vào trong thẻ cho Owner */}
                {isPlanOwner && planStatusStr === "planning" && (
                  <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#D6E0F5" }}>
                    {!plan?.is_locked ? (
                      <TouchableOpacity
                        onPress={handleManualLockEdit}
                        disabled={updatingPlanStatus}
                        activeOpacity={0.85}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#F59E0B", // Amber/Orange to indicate early action
                          paddingVertical: 12,
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
                            name="settings-outline"
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                          Khoá lộ trình
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      <TouchableOpacity
                        onPress={() => handleUpdatePlannerStatus("locked")}
                        disabled={updatingPlanStatus}
                        activeOpacity={0.85}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "center",
                          backgroundColor: "#2563EB", // Blue for final lock plan
                          paddingVertical: 12,
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
                            name="lock-closed-outline"
                            size={18}
                            color="#fff"
                            style={{ marginRight: 8 }}
                          />
                        )}
                        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                          {t("planner.lockPlanCta", { defaultValue: "Chốt kế hoạch" })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>
        )}

        {/* CTA: Bắt đầu hành hương — Solo: từ planning | Group: từ locked */}
        {isPlanOwner &&
          (planStatusStr === "locked" ||
            (isSoloPlan && planStatusStr === "planning")) && (
          <View
            style={{ marginBottom: SPACING.md, paddingHorizontal: SPACING.lg }}
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
                  name="rocket-outline"
                  size={20}
                  color="#fff"
                  style={{ marginRight: 8 }}
                />
              )}
              <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>
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

          {isPlanOwner &&
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
                  Xóa tất cả
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {sortedDays.length > 0 ? (
          sortedDays.map((dayKey) => {
            const items = sortPlanDayItems(plan.items_by_day?.[dayKey] || []);
            return (
              <View key={dayKey} style={styles.dayContainer}>
                <View
                  style={[
                    styles.dayHeader,
                    {
                      backgroundColor: COLORS.backgroundSoft,
                      paddingVertical: 12,
                      marginHorizontal: -SPACING.lg,
                      paddingHorizontal: SPACING.lg,
                    },
                  ]}
                >
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLORS.textPrimary,
                    }}
                  >
                    Ngày {dayKey} •{" "}
                    {getDateForDay(plan.start_date ?? "", Number(dayKey))}
                  </Text>
                </View>

                <View style={styles.timelineContainer}>
                  <View
                    style={[
                      styles.timelineLine,
                      {
                        width: 2,
                        backgroundColor: "#E7E2D5",
                        left: 24,
                        top: 6,
                        bottom: -18,
                      },
                    ]}
                  />
                  <View style={styles.timelineItems}>
                    {items.length === 0 && isPlanOwner && (
                      <TouchableOpacity
                        style={{
                          borderWidth: 1.5,
                          borderColor: "#D1D5DB",
                          borderStyle: "dashed",
                          borderRadius: 12,
                          padding: 24,
                          justifyContent: "center",
                          alignItems: "center",
                          width: "100%",
                          marginBottom: 16,
                          backgroundColor: "#F9FAFB",
                        }}
                        onPress={() => openAddModal(Number(dayKey))}
                      >
                        <Ionicons
                          name="add-circle-outline"
                          size={32}
                          color={COLORS.accent}
                        />
                        <Text
                          style={{
                            fontSize: 15,
                            color: COLORS.textSecondary,
                            marginTop: 8,
                            fontWeight: "500",
                          }}
                        >
                          Bấm để thêm địa điểm viếng
                        </Text>
                      </TouchableOpacity>
                    )}
                    {items.map((item: PlanItem, index) => {
                      const travelMinutes = (
                        item as PlanItem & {
                          travel_time_minutes?: number;
                          travel_distance_km?: number;
                        }
                      ).travel_time_minutes;
                      const travelDistanceKm = (
                        item as PlanItem & {
                          travel_time_minutes?: number;
                          travel_distance_km?: number;
                        }
                      ).travel_distance_km;
                      const swapSelected =
                        swapPick?.dayKey === dayKey &&
                        swapPick?.itemId === item.id;
                      const cardBody = (
                        <View style={styles.itemCardInner}>
                          <TouchableOpacity
                            style={{
                              flex: 1,
                              flexDirection: "row",
                              alignItems: "center",
                            }}
                            activeOpacity={0.85}
                            onPress={() => {
                              setSwapPick(null);
                              setSelectedItem(item);
                            }}
                          >
                            <Image
                              source={{
                                uri:
                                  item.site.cover_image ||
                                  item.site.image ||
                                  "https://via.placeholder.com/100",
                              }}
                              style={styles.itemImage}
                            />
                            <View style={styles.itemContent}>
                              <Text style={styles.itemName}>
                                {item.site.name}
                              </Text>
                              <View style={styles.pilgrimTag}>
                                <Text style={styles.pilgrimTagText}>
                                  {getPilgrimTag(item)}
                                </Text>
                              </View>
                              {item.site.address && (
                                <Text
                                  style={styles.itemAddress}
                                  numberOfLines={1}
                                >
                                  {item.site.address}
                                </Text>
                              )}
                              <View style={styles.itemFooter}>
                                <View style={styles.itemTimeInfo}>
                                  <Ionicons
                                    name="time-outline"
                                    size={16}
                                    color={COLORS.accent}
                                  />
                                  <Text style={styles.itemTime}>
                                    {formatTimeValue(
                                      item.estimated_time || item.arrival_time,
                                    )}
                                    {item.rest_duration
                                      ? ` - ${calculateEndTime(item.estimated_time || item.arrival_time, item.rest_duration)}`
                                      : ""}
                                  </Text>
                                </View>
                              </View>
                              {item.note && item.note !== "Visited" && (
                                <Text style={styles.itemNote} numberOfLines={1}>
                                  {item.note}
                                </Text>
                              )}
                            </View>
                          </TouchableOpacity>
                          {isPlanOwner ? (
                            <TouchableOpacity
                              onPress={() =>
                                handleReorderIconPress(dayKey, item)
                              }
                              hitSlop={{
                                top: 12,
                                bottom: 12,
                                left: 8,
                                right: 8,
                              }}
                              style={{
                                paddingHorizontal: 4,
                                paddingVertical: 4,
                              }}
                            >
                              <Ionicons
                                name={
                                  swapSelected
                                    ? "reorder-two"
                                    : "reorder-two-outline"
                                }
                                size={24}
                                color={
                                  swapSelected
                                    ? COLORS.accent
                                    : COLORS.textTertiary
                                }
                              />
                            </TouchableOpacity>
                          ) : (
                            <View
                              style={{
                                paddingHorizontal: 4,
                                paddingVertical: 4,
                              }}
                            >
                              <Ionicons
                                name="reorder-two-outline"
                                size={24}
                                color={COLORS.textTertiary}
                                style={{ opacity: 0.35 }}
                              />
                            </View>
                          )}
                        </View>
                      );
                      const timelineRow = (
                        <View style={styles.timelineItem}>
                          <View
                            style={[
                              styles.timelineDot,
                              {
                                borderColor: "#C9A227",
                                borderWidth: 2,
                                backgroundColor: "#fff",
                                width: 12,
                                height: 12,
                                borderRadius: 6,
                                left: -6,
                              },
                            ]}
                          />
                          <View
                            style={[
                              styles.timelineCardShadowWrap,
                              swapSelected && {
                                borderWidth: 2,
                                borderColor: COLORS.accent,
                              },
                            ]}
                          >
                            {isPlanOwner ? (
                              <Swipeable
                                overshootRight={false}
                                containerStyle={styles.timelineSwipeInner}
                                renderRightActions={() => (
                                  <View style={styles.timelineDeleteActionWrap}>
                                    <TouchableOpacity
                                      style={styles.timelineDeleteAction}
                                      activeOpacity={0.92}
                                      onPress={() =>
                                        item.id && handleDeleteItem(item.id)
                                      }
                                    >
                                      <Ionicons
                                        name="trash-outline"
                                        size={26}
                                        color="#fff"
                                      />
                                      <Text
                                        style={styles.timelineDeleteActionLabel}
                                      >
                                        {t("common.delete", {
                                          defaultValue: "Xóa",
                                        })}
                                      </Text>
                                    </TouchableOpacity>
                                  </View>
                                )}
                              >
                                {cardBody}
                              </Swipeable>
                            ) : (
                              <View style={styles.timelineSwipeInner}>
                                {cardBody}
                              </View>
                            )}
                          </View>
                        </View>
                      );
                      return (
                        <View key={item.id || index}>
                          {index > 0 && typeof travelMinutes === "number" && (
                            <View style={styles.travelSegment}>
                              <View style={styles.verticalDashedLine} />
                              <View style={styles.travelBadge}>
                                <Ionicons name="car" size={14} color="#6B7280" />
                                <Text style={styles.travelText}>
                                  Di chuyển {Math.max(1, Math.round(travelMinutes))} phút
                                  {typeof travelDistanceKm === "number"
                                    ? ` (${travelDistanceKm.toFixed(1)} km)`
                                    : ""}
                                </Text>
                              </View>
                            </View>
                          )}
                          {timelineRow}
                        </View>
                      );
                    })}
                    {isPlanOwner && (String(plan?.status || "").toLowerCase() === "planning" || String(plan?.status || "").toLowerCase() === "ongoing") && (
                      <TouchableOpacity
                        style={styles.addSmallButton}
                        onPress={() => openAddModal(Number(dayKey))}
                      >
                        <Ionicons name="add" size={16} color={COLORS.primary} />
                        <Text style={styles.addSmallButtonText}>
                          {t("planner.addStop", {
                            defaultValue: "Thêm điểm viếng",
                          })}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
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
            {isPlanOwner && (String(plan?.status || "").toLowerCase() === "planning" || String(plan?.status || "").toLowerCase() === "ongoing") && (
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
                <Text style={{ color: "#fff", fontWeight: "bold", fontSize: 16 }}>
                  + Thêm địa điểm đầu tiên
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
        onSelectEventSite={handleOpenEventSite}
        sites={sites}
        favorites={favorites}
        onAddSite={isPlanOwner ? (siteId) => handleAddItem(siteId) : undefined}
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

      <SiteEventsModal
        visible={showEventListModal}
        onClose={() => setShowEventListModal(false)}
        title={eventSite?.name || t("planner.events")}
        t={t}
        styles={styles}
        isLoading={isLoadingEvents}
        events={siteEvents}
        onSelectEvent={(ev) => {
          const dateStr = ev.start_date
            ? new Date(ev.start_date).toLocaleDateString("vi-VN", {
              day: "2-digit",
              month: "2-digit",
              year: "numeric",
            })
            : "";
          const endStr =
            ev.end_date && ev.end_date !== ev.start_date
              ? ` – ${new Date(ev.end_date).toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" })}`
              : "";
          const timeStr = ev.start_time ? ` lúc ${ev.start_time}` : "";
          const noteText = `🎉 Chọn Sự kiện: ${ev.name}\n📅 ${dateStr}${endStr}${timeStr}${ev.location ? `\n📍 ${ev.location}` : ""}${ev.description ? `\n${ev.description}` : ""}`;
          setNote(noteText);
          setShowEventListModal(false);
          if (eventSite) {
            handleAddItem(eventSite.id, ev.id);
          }
        }}
      />

      <TimeInputModal
        visible={showTimeInputModal}
        onClose={addSiteFlow.closeTimeModal}
        t={t}
        styles={styles}
        selectedDay={selectedDay}
        calculatingRoute={calculatingRoute}
        routeInfo={routeInfo}
        crossDayWarning={crossDayWarning}
        estimatedTime={estimatedTime}
        restDuration={restDuration}
        setRestDuration={setRestDuration}
        note={note}
        setNote={setNote}
        openTimePicker={openTimePicker}
        formatDuration={formatDuration}
        addingItem={addingItem}
        selectedSiteId={selectedSiteId}
        onConfirmAdd={() => addItemToItinerary(selectedSiteId!)}
        {...(addSiteFlow.travelData || {})}
        insight={addSiteFlow.insight}
        suggestedTime={addSiteFlow.suggestedTime}
        onApplySuggestedTime={() => {
          if (addSiteFlow.suggestedTime) {
            addSiteFlow.setEstimatedTime(addSiteFlow.suggestedTime.time);
          }
        }}
      />

      <EditItemModal
        {...({
          visible: showEditItemModal,
          onClose: () => setShowEditItemModal(false),
          t,
          styles,
          editingItem,
          calculatingEditRoute,
          editRouteInfo,
          openEditTimePicker,
          editEstimatedTime,
          editRestDuration,
          setEditRestDuration,
          formatDuration,
          editNote,
          setEditNote,
          handleSaveEditItem,
          savingEdit,
          onOpenNearbyPlaces: editingItem
            ? () => {
              setShowEditItemModal(false);
              setTimeout(() => void handleOpenNearbyPlaces(editingItem), 280);
            }
            : undefined,
        } satisfies EditItemModalProps)}
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
        onClose={() => setShowEditPlanModal(false)}
        onSave={handleSavePlan}
        saving={savingPlan}
        t={t}
        editPlanName={editPlanName}
        setEditPlanName={setEditPlanName}
        editPlanStartDate={editPlanStartDate}
        setEditPlanStartDate={setEditPlanStartDate}
        editPlanEndDate={editPlanEndDate}
        setEditPlanEndDate={setEditPlanEndDate}
        editPlanPeople={editPlanPeople}
        setEditPlanPeople={setEditPlanPeople}
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
        canSetEditLockAt={plan?.can_set_edit_lock_at}
        editLockAvailableAt={plan?.edit_lock_available_at}
        plannerLockAt={plan?.planner_lock_at}
        isLocked={plan?.is_locked}
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

      {/* Swap Preview Modal */}
      <SwapPreviewModal
        visible={swapPreview.visible}
        loading={swapPreview.loading}
        error={swapPreview.error}
        result={swapPreview.result}
        onClose={swapPreview.close}
        onConfirm={executeSwapWithTimes}
        confirming={swappingItems}
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
