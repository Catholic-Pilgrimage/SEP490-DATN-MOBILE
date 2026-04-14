import { Ionicons, MaterialIcons } from "@expo/vector-icons";

import DateTimePicker from "@react-native-community/datetimepicker";
import { useFocusEffect } from "@react-navigation/native";
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
import { SiteEvent, SiteSummary } from "../../../../types/pilgrim";
import {
  AddPlanItemRequest,
  PlanEntity,
  PlanItem,
  UpdatePlanRequest,
} from "../../../../types/pilgrim/planner.types";
import { getInitialsFromFullName } from "../../../../utils/initials";
import AddSiteModal from "../components/plan-detail/AddSiteModal";
import EditItemModal, {
  type EditItemModalProps,
} from "../components/plan-detail/EditItemModal";
import EditPlanModal from "../components/plan-detail/EditPlanModal";
import { InviteDecisionButtons } from "../components/plan-detail/InviteDecisionButtons";
import InvitePreviewCard from "../components/plan-detail/InvitePreviewCard";
import ItemDetailModal from "../components/plan-detail/ItemDetailModal";
import { ItineraryDayCard } from "../components/plan-detail/ItineraryDayCard";
import { LockScheduleCard } from "../components/plan-detail/LockScheduleCard";
import { MenuDropdown } from "../components/plan-detail/MenuDropdown";
import NearbyPlacesModal from "../components/plan-detail/NearbyPlacesModal";
import SiteEventsModal from "../components/plan-detail/SiteEventsModal";
import TimeInputModal from "../components/plan-detail/TimeInputModal";
import { PlannerTransactionsModal } from "../components/shared/PlannerTransactionsModal";
import { SharePlanModal } from "../components/shared/SharePlanModal";
import { useAddSiteFlow } from "../hooks/useAddSiteFlow";
import { useChatUnreadCount } from "../hooks/useChatUnreadCount";
import { useEditItemForm } from "../hooks/useEditItemForm";
import { useInvitePlanActions } from "../hooks/useInvitePlanActions";
import { useNearbyPlaces } from "../hooks/useNearbyPlaces";
import { usePlanRoute } from "../hooks/usePlanRoute";
import {
  MAX_DEPOSIT_VND,
  parsePenaltyPercent,
  parseVndInteger,
} from "../utils/depositInput.utils";
import {
  extractApiErrorMessage,
  showErrorToast,
} from "../utils/planDetailHelpers";
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
  calculateEndTimeRaw,
  getDateForDayRaw,
} from "../utils/planDetailTime.utils";
import { getGroupPatronConstraintFromPlan } from "../utils/planPatronScope.utils";
import { formatDurationLocalized } from "../utils/siteScheduleHelper";
import { parseDurationToMinutes } from "../utils/time";
import styles from "./PlanDetailScreen.styles";

const PlanDetailScreen = ({ route, navigation }: any) => {
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
    setShowEditTimePicker,
    editTempTime,
    savingEdit,
    editRouteInfo,
    calculatingEditRoute,
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
    formatTimeValue,
  });

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
    handleLoadNearbyPlaces: handleOpenNearbyPlaces,
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

  // Route calculation (extracted to hook)
  const { routeCoordinates, routeSegments, routeSummary, routeLoading } =
    usePlanRoute(plan, isOffline);

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

  const checkOfflineAvailability = async () => {
    const [available, tileTemplate] = await Promise.all([
      checkAvailability(planId),
      offlinePlannerService.getOfflineMapTileTemplate(planId),
    ]);
    setIsAvailableOffline(available);
    setOfflineTileUrlTemplate(tileTemplate || undefined);
  };

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

    void markChatAsRead();
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

  // Chat unread count polling is now handled by useChatUnreadCount hook

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
      setPlan(cachedPlan);
      return cachedPlan;
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
  }

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
      iconName: "lock-closed-outline",
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
      Number(plan?.number_of_people || 1) > 1 &&
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
        ? "lock-closed-outline"
        : isStart
          ? "rocket-outline"
          : "flag-outline",
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
      const isSolo = Number(plan?.number_of_people || 1) <= 1;
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
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        return;
      }

      const response = await pilgrimPlannerApi.deletePlanItem(planId, itemId);
      if (response.success) {
        await applyPlanMutation(
          (currentPlan) => applyLocalDeleteItem(currentPlan, itemId),
          () => offlinePlannerService.deletePlannerItem(planId, itemId),
        );
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.removeItemSuccess", {
            defaultValue: "Đã xóa địa điểm khỏi lịch trình",
          }),
        });
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

  const handleReorderIconPress = (dayKey: string, item: PlanItem) => {
    if (!plan || isReadOnlyPlannerView) return;
    const id = item.id;
    if (!id) return;

    if (!swapPick) {
      setSwapPick({ dayKey, itemId: id });
      return;
    }
    if (swapPick.itemId === id) {
      setSwapPick(null);
      return;
    }

    // Cross-day swap: execute directly (without same-day preview modal)
    if (swapPick.dayKey !== dayKey) {
      const firstPick = swapPick;
      setSwapPick(null);
      void executeCrossDaySwap(firstPick.dayKey, firstPick.itemId, dayKey, id);
      return;
    }

    // Same-day swap: use confirm modal (same UX style as cross-day)
    const firstPick = swapPick;
    void executeSameDaySwap(firstPick.dayKey, firstPick.itemId, id);
    setSwapPick(null);
  };

  type PlannerItemPatch = {
    id: string;
    day_number: number;
    order_index: number;
    estimated_time: string;
    travel_time_minutes: number;
  };

  const toHHmm = (value?: string): string => {
    if (!value) return "08:00";
    const text = String(value);
    return text.length >= 5 ? text.slice(0, 5) : "08:00";
  };

  const hhmmToMinutes = (value?: string): number => {
    const normalized = toHHmm(value);
    const [h, m] = normalized.split(":").map(Number);
    if (Number.isNaN(h) || Number.isNaN(m)) return 0;
    return h * 60 + m;
  };

  const pickLaterTime = (left?: string, right?: string): string => {
    const l = toHHmm(left);
    const r = toHHmm(right);
    return hhmmToMinutes(r) > hhmmToMinutes(l) ? r : l;
  };

  const shouldFallbackLegacySwap = (error: any): boolean => {
    const status = Number(error?.response?.status || 0);
    return status === 404 || status === 405 || status === 501;
  };

  const toDisplayHHmm = (value?: string): string => {
    if (!value) return "";
    const text = String(value).trim();
    if (/^\d{2}:\d{2}:\d{2}$/.test(text)) return text.slice(0, 5);
    if (/^\d{2}:\d{2}$/.test(text)) return text;
    return text;
  };

  const normalizeSwapBackendMessage = (message: string): string => {
    const raw = String(message || "").trim();
    if (!raw) {
      return t("planner.swapInvalidTimeData", {
        defaultValue: "Không thể đổi thứ tự do dữ liệu thời gian chưa hợp lệ.",
      });
    }

    const invalidArrival = raw.match(
      /Invalid arrival time suggested:\s*([0-9:]+),\s*departure\s*([0-9:]+),\s*travel\s*(\d+)m,\s*suggested\s*([0-9:]+)/i,
    );

    if (invalidArrival) {
      const arrival = toDisplayHHmm(invalidArrival[1]);
      const departure = toDisplayHHmm(invalidArrival[2]);
      const travel = invalidArrival[3];
      const suggested = toDisplayHHmm(invalidArrival[4]);

      return t("planner.swapInvalidArrivalTemplate", {
        arrival,
        departure,
        travel,
        suggested,
        defaultValue:
          "Lộ trình sau khi đổi chưa hợp lệ: giờ đến {{arrival}} không khớp với điểm trước (rời {{departure}}, di chuyển {{travel}} phút). Hệ thống gợi ý tối thiểu {{suggested}}.",
      });
    }

    if (/Item A ID|Item B ID/i.test(raw)) {
      return t("planner.swapMissingPair", {
        defaultValue:
          "Không xác định được 2 điểm cần đổi chỗ. Vui lòng chọn lại rồi thử lại.",
      });
    }

    if (/Dữ liệu không hợp lệ/i.test(raw)) {
      return t("planner.swapInvalidRouteData", {
        defaultValue:
          "Không thể đổi thứ tự vì dữ liệu lộ trình chưa hợp lệ. Vui lòng thử lại.",
      });
    }

    return raw;
  };

  const getSwapValidationMessage = (error: any, fallback: string): string => {
    const details = error?.response?.data?.error?.details;
    if (Array.isArray(details) && details.length > 0) {
      const messages = details
        .map((detail: any) => {
          if (typeof detail === "string") return detail;
          return detail?.message || detail?.msg || "";
        })
        .filter(Boolean);

      if (messages.length > 0) {
        return messages.map(normalizeSwapBackendMessage).join(". ");
      }
    }

    const extracted = extractApiErrorMessage(error, fallback);
    return normalizeSwapBackendMessage(extracted);
  };

  const applyLocalItemPatches = (
    currentPlan: PlanEntity,
    patches: PlannerItemPatch[],
  ): PlanEntity => {
    const patchById = patches.reduce<Record<string, PlannerItemPatch>>(
      (acc, patch) => {
        acc[patch.id] = patch;
        return acc;
      },
      {},
    );

    const originalItems = Object.values(currentPlan.items_by_day || {}).flat();
    const patchedItems = originalItems.map((item) => {
      if (!item.id || !patchById[item.id]) return item;
      const patch = patchById[item.id];
      return {
        ...item,
        day_number: patch.day_number,
        leg_number: patch.day_number,
        order_index: patch.order_index,
        estimated_time: patch.estimated_time,
        travel_time_minutes: patch.travel_time_minutes,
      };
    });

    const regrouped: Record<string, PlanItem[]> = {};
    patchedItems.forEach((item) => {
      const resolvedDay =
        Number(item.day_number ?? item.leg_number ?? 1) > 0
          ? Number(item.day_number ?? item.leg_number ?? 1)
          : 1;
      const dayKey = String(resolvedDay);
      if (!regrouped[dayKey]) regrouped[dayKey] = [];
      regrouped[dayKey].push({
        ...item,
        day_number: resolvedDay,
        leg_number: resolvedDay,
      });
    });

    Object.keys(regrouped).forEach((dayKey) => {
      regrouped[dayKey] = sortPlanDayItems(regrouped[dayKey]).map(
        (item, index) => ({
          ...item,
          day_number: Number(dayKey),
          leg_number: Number(dayKey),
          order_index: index + 1,
        }),
      );
    });

    const sortedDayKeys = Object.keys(regrouped).sort(
      (a, b) => Number(a) - Number(b),
    );
    const flattened = sortedDayKeys.flatMap((dayKey) => regrouped[dayKey]);

    return {
      ...currentPlan,
      items_by_day: regrouped,
      items: flattened,
      number_of_days:
        sortedDayKeys.length > 0
          ? Math.max(...sortedDayKeys.map((key) => Number(key)))
          : currentPlan.number_of_days,
    };
  };

  const buildDayPatches = async (
    orderedItems: PlanItem[],
    dayNumber: number,
    anchorTime: string,
    siteCache: Record<
      string,
      { latitude: number; longitude: number; name?: string }
    >,
    earliestStartTime?: string,
  ): Promise<PlannerItemPatch[]> => {
    const resolveSiteData = async (item: PlanItem) => {
      const siteId = item.site_id || item.site?.id || "";
      if (siteId && siteCache[siteId]) return siteCache[siteId];

      const lat = Number(item.site?.latitude || 0);
      const lng = Number(item.site?.longitude || 0);
      if (siteId && lat && lng) {
        siteCache[siteId] = {
          latitude: lat,
          longitude: lng,
          name: item.site?.name,
        };
        return siteCache[siteId];
      }

      if (siteId) {
        try {
          const response = await pilgrimSiteApi.getSiteDetail(siteId);
          const site = response?.data as any;
          siteCache[siteId] = {
            latitude: Number(site?.latitude || lat || 0),
            longitude: Number(site?.longitude || lng || 0),
            name: site?.name || item.site?.name,
          };
          return siteCache[siteId];
        } catch {
          // Ignore and fallback below
        }
      }

      return {
        latitude: lat,
        longitude: lng,
        name: item.site?.name,
      };
    };

    const patches: PlannerItemPatch[] = [];

    for (let index = 0; index < orderedItems.length; index++) {
      const item = orderedItems[index];
      if (!item.id) continue;

      let travelTimeMinutes =
        index === 0 ? 0 : Math.max(0, Number(item.travel_time_minutes) || 0);

      if (index > 0) {
        const prevItem = orderedItems[index - 1];
        const [from, to] = await Promise.all([
          resolveSiteData(prevItem),
          resolveSiteData(item),
        ]);

        if (from.latitude && from.longitude && to.latitude && to.longitude) {
          try {
            const routeResult = await vietmapService.calculateRoute(
              { latitude: from.latitude, longitude: from.longitude },
              { latitude: to.latitude, longitude: to.longitude },
            );
            travelTimeMinutes = Math.max(
              0,
              Math.round(routeResult.durationMinutes || 0),
            );
          } catch {
            travelTimeMinutes = 30;
          }
        } else {
          travelTimeMinutes = 30;
        }
      }

      const time =
        index === 0
          ? pickLaterTime(anchorTime, earliestStartTime)
          : (() => {
              const prev = patches[index - 1];
              const prevItem = orderedItems[index - 1];
              const prevRest = parseDurationToMinutes(prevItem.rest_duration);
              const safePrevRest = prevRest > 0 ? prevRest : 120;
              return vietmapService.calculateArrivalTime(
                prev.estimated_time,
                safePrevRest + travelTimeMinutes,
              ).time;
            })();

      patches.push({
        id: item.id,
        day_number: dayNumber,
        order_index: index + 1,
        estimated_time: toHHmm(time),
        travel_time_minutes: travelTimeMinutes,
      });
    }

    return patches;
  };

  const executeCrossDaySwap = async (
    dayKeyA: string,
    itemIdA: string,
    dayKeyB: string,
    itemIdB: string,
  ) => {
    if (!plan) return;

    const confirmed = await confirm({
      type: "info",
      iconName: "swap-horizontal-outline",
      title: t("planner.swapCrossDayTitle", {
        defaultValue: "Đổi chỗ khác ngày",
      }),
      message: t("planner.swapCrossDayMessage", {
        defaultValue:
          "Bạn đang đổi 2 điểm ở 2 ngày khác nhau. Hệ thống sẽ tính lại giờ theo lộ trình mới.",
      }),
      confirmText: t("planner.swapConfirm", {
        defaultValue: "Đổi chỗ",
      }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
      const dayAItems = sortPlanDayItems(plan.items_by_day?.[dayKeyA] || []);
      const dayBItems = sortPlanDayItems(plan.items_by_day?.[dayKeyB] || []);
      const indexA = dayAItems.findIndex((i) => i.id === itemIdA);
      const indexB = dayBItems.findIndex((i) => i.id === itemIdB);

      if (indexA < 0 || indexB < 0) {
        throw new Error(
          t("planner.swapItemNotFound", {
            defaultValue: "Không tìm thấy điểm cần đổi",
          }),
        );
      }

      const nextDayA = [...dayAItems];
      const nextDayB = [...dayBItems];
      const pickedA = nextDayA[indexA];
      const pickedB = nextDayB[indexB];

      nextDayA[indexA] = {
        ...pickedB,
        day_number: Number(dayKeyA),
        leg_number: Number(dayKeyA),
      };
      nextDayB[indexB] = {
        ...pickedA,
        day_number: Number(dayKeyB),
        leg_number: Number(dayKeyB),
      };

      const siteCache: Record<
        string,
        { latitude: number; longitude: number; name?: string }
      > = {};

      const dayItemsByNumber: Record<number, PlanItem[]> = {
        [Number(dayKeyA)]: nextDayA,
        [Number(dayKeyB)]: nextDayB,
      };
      const dayAnchorByNumber: Record<number, string> = {
        [Number(dayKeyA)]: toHHmm(dayAItems[0]?.estimated_time),
        [Number(dayKeyB)]: toHHmm(dayBItems[0]?.estimated_time),
      };

      const affectedDayNumbers = Array.from(
        new Set([Number(dayKeyA), Number(dayKeyB)]),
      ).sort((a, b) => a - b);

      const patchesByDayNumber: Record<number, PlannerItemPatch[]> = {};

      for (const dayNumber of affectedDayNumbers) {
        let earliestStartTime: string | undefined;
        const previousDayNumber = dayNumber - 1;

        const previousDayPatches = patchesByDayNumber[previousDayNumber];
        if (previousDayPatches?.length) {
          const previousLastPatch =
            previousDayPatches[previousDayPatches.length - 1];
          const previousDayItems = dayItemsByNumber[previousDayNumber] || [];
          const previousLastItem = previousDayItems.find(
            (item) => item.id === previousLastPatch.id,
          );
          const previousRest = parseDurationToMinutes(
            previousLastItem?.rest_duration,
          );
          const safePreviousRest = previousRest > 0 ? previousRest : 120;
          earliestStartTime = vietmapService.calculateArrivalTime(
            previousLastPatch.estimated_time,
            safePreviousRest,
          ).time;
        } else {
          const previousPlanDayItems = sortPlanDayItems(
            plan.items_by_day?.[String(previousDayNumber)] || [],
          );
          const previousLastItem =
            previousPlanDayItems[previousPlanDayItems.length - 1];
          if (previousLastItem?.estimated_time) {
            const previousRest = parseDurationToMinutes(
              previousLastItem.rest_duration,
            );
            const safePreviousRest = previousRest > 0 ? previousRest : 120;
            earliestStartTime = vietmapService.calculateArrivalTime(
              toHHmm(previousLastItem.estimated_time),
              safePreviousRest,
            ).time;
          }
        }

        patchesByDayNumber[dayNumber] = await buildDayPatches(
          dayItemsByNumber[dayNumber],
          dayNumber,
          dayAnchorByNumber[dayNumber],
          siteCache,
          earliestStartTime,
        );
      }

      const patchesDayA = patchesByDayNumber[Number(dayKeyA)] || [];
      const patchesDayB = patchesByDayNumber[Number(dayKeyB)] || [];

      const allPatches = [...patchesDayA, ...patchesDayB];
      const affectedDays = [
        {
          leg_number: Number(dayKeyA),
          items: patchesDayA.map((patch) => ({
            id: patch.id,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          })),
        },
        {
          leg_number: Number(dayKeyB),
          items: patchesDayB.map((patch) => ({
            id: patch.id,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          })),
        },
      ];

      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        for (const patch of allPatches) {
          await networkService.addToOfflineQueue({
            endpoint: `/api/planners/${planId}/items/${patch.id}`,
            method: "PATCH",
            data: {
              day_number: patch.day_number,
              order_index: patch.order_index,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            },
          });
        }

        await applyPlanMutation((currentPlan) =>
          applyLocalItemPatches(currentPlan, allPatches),
        );

        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        return;
      }

      try {
        const swapPayload = {
          item_id_a: itemIdA,
          item_id_b: itemIdB,
          affected_days: affectedDays,
        };

        if (__DEV__) {
          console.log("[Swap][CrossDay] payload:", JSON.stringify(swapPayload));
        }

        const swapResponse = await pilgrimPlannerApi.swapPlannerItems(
          planId,
          swapPayload,
        );

        if (!swapResponse.success) {
          throw new Error(
            swapResponse.message ||
              t("planner.swapApiFailed", {
                defaultValue: "Không thể đổi thứ tự bằng API swap",
              }),
          );
        }
      } catch (swapError: any) {
        if (!shouldFallbackLegacySwap(swapError)) {
          throw swapError;
        }

        for (const patch of allPatches) {
          await pilgrimPlannerApi.updatePlanItem(planId, patch.id, {
            day_number: patch.day_number,
            order_index: patch.order_index,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          });
        }
      }

      await applyPlanMutation((currentPlan) =>
        applyLocalItemPatches(currentPlan, allPatches),
      );

      Toast.show({
        type: "success",
        text1: t("planner.swapSuccessTitle", {
          defaultValue: "Đã đổi thứ tự",
        }),
        text2: t("planner.swapSuccessCrossDayBody", {
          defaultValue: "Đã cập nhật lịch trình cho cả 2 ngày.",
        }),
      });
      loadPlan({ silent: true });
    } catch (error: any) {
      console.log("Cross-day swap error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getSwapValidationMessage(
          error,
          t("planner.swapCrossDayFailed", {
            defaultValue: "Không thể đổi thứ tự khác ngày",
          }),
        ),
      });
    } finally {
      // noop
    }
  };

  const executeSameDaySwap = async (
    dayKey: string,
    itemIdA: string,
    itemIdB: string,
  ) => {
    if (!plan) return;

    const confirmed = await confirm({
      type: "info",
      iconName: "swap-horizontal-outline",
      title: t("planner.swapSameDayTitle", {
        defaultValue: "Đổi thứ tự trong ngày",
      }),
      message: t("planner.swapSameDayMessage", {
        defaultValue:
          "Bạn đang đổi 2 điểm trong cùng ngày. Hệ thống sẽ tính lại giờ theo lộ trình mới.",
      }),
      confirmText: t("planner.swapConfirm", {
        defaultValue: "Đổi chỗ",
      }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (!confirmed) return;

    try {
      const dayItems = sortPlanDayItems(plan.items_by_day?.[dayKey] || []);
      const indexA = dayItems.findIndex((i) => i.id === itemIdA);
      const indexB = dayItems.findIndex((i) => i.id === itemIdB);

      if (indexA < 0 || indexB < 0) {
        throw new Error(
          t("planner.swapItemNotFound", {
            defaultValue: "Không tìm thấy điểm cần đổi",
          }),
        );
      }

      const swapped = [...dayItems];
      [swapped[indexA], swapped[indexB]] = [swapped[indexB], swapped[indexA]];

      const dayNumber = Number(dayKey);
      const anchorTime = toHHmm(dayItems[0]?.estimated_time);
      const siteCache: Record<
        string,
        { latitude: number; longitude: number; name?: string }
      > = {};

      let earliestStartTime: string | undefined;
      const previousDayItems = sortPlanDayItems(
        plan.items_by_day?.[String(dayNumber - 1)] || [],
      );
      const previousLastItem = previousDayItems[previousDayItems.length - 1];
      if (previousLastItem?.estimated_time) {
        const previousRest = parseDurationToMinutes(
          previousLastItem.rest_duration,
        );
        const safePreviousRest = previousRest > 0 ? previousRest : 120;
        earliestStartTime = vietmapService.calculateArrivalTime(
          toHHmm(previousLastItem.estimated_time),
          safePreviousRest,
        ).time;
      }

      const patches = await buildDayPatches(
        swapped,
        dayNumber,
        anchorTime,
        siteCache,
        earliestStartTime,
      );

      const affectedDays = [
        {
          leg_number: dayNumber,
          items: patches.map((patch) => ({
            id: patch.id,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          })),
        },
      ];

      const isOnline = await networkService.checkConnection();

      if (!isOnline) {
        for (const patch of patches) {
          await networkService.addToOfflineQueue({
            endpoint: `/api/planners/${planId}/items/${patch.id}`,
            method: "PATCH",
            data: {
              day_number: patch.day_number,
              order_index: patch.order_index,
              estimated_time: patch.estimated_time,
              travel_time_minutes: patch.travel_time_minutes,
            },
          });
        }

        await applyPlanMutation((currentPlan) =>
          applyLocalItemPatches(currentPlan, patches),
        );

        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("offline.changesSavedOffline"),
        });
        return;
      }

      try {
        const swapPayload = {
          item_id_a: itemIdA,
          item_id_b: itemIdB,
          affected_days: affectedDays,
        };

        if (__DEV__) {
          console.log(
            "[Swap][SameDay][Confirm] payload:",
            JSON.stringify(swapPayload),
          );
        }

        const swapResponse = await pilgrimPlannerApi.swapPlannerItems(
          planId,
          swapPayload,
        );

        if (!swapResponse.success) {
          throw new Error(
            swapResponse.message ||
              t("planner.swapApiFailed", {
                defaultValue: "Không thể đổi thứ tự bằng API swap",
              }),
          );
        }
      } catch (swapError: any) {
        if (!shouldFallbackLegacySwap(swapError)) {
          throw swapError;
        }

        for (const patch of patches) {
          await pilgrimPlannerApi.updatePlanItem(planId, patch.id, {
            day_number: patch.day_number,
            order_index: patch.order_index,
            estimated_time: patch.estimated_time,
            travel_time_minutes: patch.travel_time_minutes,
          });
        }
      }

      await applyPlanMutation((currentPlan) =>
        applyLocalItemPatches(currentPlan, patches),
      );

      Toast.show({
        type: "success",
        text1: t("planner.swapSuccessTitle", {
          defaultValue: "Đã đổi thứ tự",
        }),
        text2: t("planner.swapSuccessSameDayBody", {
          defaultValue: "Thời gian đã được tính lại theo lộ trình mới.",
        }),
      });
      loadPlan({ silent: true });
    } catch (error: any) {
      console.log("Same-day swap error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getSwapValidationMessage(
          error,
          t("planner.swapSameDayFailed", {
            defaultValue: "Không thể đổi thứ tự",
          }),
        ),
      });
    } finally {
      // noop
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
    setShowTimePicker(true);
  };

  const formatDuration = (minutes: number) => {
    return formatDurationLocalized(minutes, t);
  };

  // parseDurationToMinutes removed — use parseDurationToMinutesRaw directly if needed

  const calculateEndTime = (startTimeStr: any, durationStr: any): string =>
    calculateEndTimeRaw(startTimeStr, durationStr, formatTimeValue);

  const getDateForDay = (startDateStr: string, dayNumber: number): string =>
    getDateForDayRaw(startDateStr, dayNumber);

  const handleAddItem = async (siteId: string, eventId?: string) => {
    setSelectedEventId(eventId || null);
    await addSiteFlow.startFlow(siteId, eventId);
  };

  const addItemToItinerary = async (siteId: string) => {
    if (addSiteFlow.crossDaysAdded > 0) {
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
      if (!isConfirmed) return;
    }

    try {
      setAddingItem(true);

      // Convert minutes to duration format (backend expects English for this specific field)
      const totalMinutes = addSiteFlow.restDuration;
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
        setIsAddModalVisible(false);
        addSiteFlow.setNote("");
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
        setIsAddModalVisible(false);
        addSiteFlow.setNote("");
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.itemAddedSuccess", {
            defaultValue: "Đã thêm địa điểm vào lịch trình",
          }),
        });
        loadPlan({ silent: true });
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
            <TouchableOpacity
              style={styles.navButton}
              onPress={() => setShowMenuDropdown(true)}
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
            isGroupPlan={(plan?.number_of_people || 1) > 1}
            syncingCalendar={syncingCalendar}
            syncingOfflineActions={syncingOfflineActions}
            downloadingOffline={downloadingOffline}
            offlineQueueCount={offlineQueueCount}
            isAvailableOffline={isAvailableOffline}
            setShowMenuDropdown={setShowMenuDropdown}
            handleOpenEditPlan={handleOpenEditPlan}
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
              <Ionicons name="chatbubbles-outline" size={18} color="#FFF8E7" />
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

          {/* Tiến độ (solo) / Thành viên (nhóm) — hiện khi ongoing hoặc completed */}
          {!isDroppedOut &&
            !isInvitePendingView &&
            (!isPlanOwner || isOngoingPlan || isCompletedPlan) && (
              <TouchableOpacity
                style={[
                  styles.quickActionButton,
                  isOffline && styles.disabledAction,
                ]}
                onPress={handleOpenMembers}
                disabled={isOffline}
              >
                <Ionicons
                  name={isSoloPlan ? "analytics-outline" : "people-outline"}
                  size={18}
                  color="#FFF8E7"
                />
                <Text style={styles.quickActionText}>
                  {isSoloPlan
                    ? t("planner.groupProgress", {
                        defaultValue: "Tiến độ",
                      })
                    : t("planner.crewTitle", {
                        defaultValue: "Thành viên",
                      })}
                </Text>
              </TouchableOpacity>
            )}

          {/* Mời bạn bè (nhóm, planning/locked) / Chia sẻ cộng đồng (completed) */}
          {!isDroppedOut &&
            isPlanOwner &&
            !isOngoingPlan &&
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
                    isCompletedPlan ? "share-social-outline" : "qr-code-outline"
                  }
                  size={18}
                  color="#FFF8E7"
                />
                <Text style={styles.quickActionText}>
                  {isCompletedPlan ? t("common.share") : t("planner.inviteFriends")}
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
                    name="rocket-outline"
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
                  {t("planner.deleteAll", { defaultValue: "Xóa tất cả" })}
                </Text>
              </TouchableOpacity>
            )}
        </View>

        {sortedDays.length > 0 ? (
          sortedDays.map((dayKey) => {
            const items = sortPlanDayItems(plan.items_by_day?.[dayKey] || []);
            return (
              <ItineraryDayCard
                key={dayKey}
                dayKey={dayKey}
                items={items}
                startDate={plan.start_date}
                planStatus={planStatusStr}
                isPlanOwner={isPlanOwner}
                swapPick={swapPick}
                setSwapPick={setSwapPick}
                setSelectedItem={setSelectedItem}
                handleReorderIconPress={handleReorderIconPress}
                handleDeleteItem={handleDeleteItem}
                openAddModal={openAddModal}
                t={t}
                getDateForDayCalc={getDateForDay}
                getPilgrimTagStr={getPilgrimTag}
                formatTimeValueCalc={formatTimeValue}
                calculateEndTimeCalc={calculateEndTime}
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
          const timeStr = ev.start_time ? t("planner.atTime", { time: ev.start_time }) : "";
          const noteText = `${t("planner.eventSelectionPrefix")}${ev.name}\n📅 ${dateStr}${endStr}${timeStr}${ev.location ? `\n📍 ${ev.location}` : ""}${ev.description ? `\n${ev.description}` : ""}`;
          addSiteFlow.setNote(noteText);
          setShowEventListModal(false);
          if (eventSite) {
            handleAddItem(eventSite.id, ev.id);
          }
        }}
      />

      <TimeInputModal
        visible={addSiteFlow.showTimeInputModal}
        onClose={addSiteFlow.closeTimeModal}
        t={t}
        styles={styles}
        selectedDay={selectedDay}
        calculatingRoute={addSiteFlow.calculatingRoute}
        routeInfo={addSiteFlow.routeInfo}
        crossDayWarning={addSiteFlow.crossDayWarning}
        estimatedTime={addSiteFlow.estimatedTime}
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

      <OfflineBanner
        style={{
          marginBottom: Math.max(insets.bottom, 12),
        }}
      />
    </View>
  );
};

export default PlanDetailScreen;
