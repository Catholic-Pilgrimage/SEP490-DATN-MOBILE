import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { LinearGradient } from "expo-linear-gradient";
import Slider from "@react-native-community/slider";
import React, { useEffect, useState, useMemo, useRef } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { VietmapView, MapPin, VietmapViewRef } from "../../../../components/map/VietmapView";
import { FullMapModal } from "../../../../components/map/FullMapModal";
import { useSites } from "../../../../hooks/useSites";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import locationService from "../../../../services/location/locationService";
import vietmapService from "../../../../services/map/vietmapService";
import {
  NearbyPlaceCategory,
  SiteEvent,
  SiteNearbyPlace,
  SiteSummary,
} from "../../../../types/pilgrim";
import {
  PlanEntity,
  PlanItem,
  PlanParticipant,
  UpdatePlanItemRequest,
} from "../../../../types/pilgrim/planner.types";

const PlanDetailScreen = ({ route, navigation }: any) => {
  const { planId } = route.params;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [plan, setPlan] = useState<PlanEntity | null>(null);
  const [loading, setLoading] = useState(true);

  const mapRef = useRef<VietmapViewRef>(null);

  // Day-based pin colors for visual distinction
  const DAY_PIN_COLORS = [
    '#E74C3C', // Red
    '#3498DB', // Blue
    '#2ECC71', // Green
    '#F39C12', // Orange
    '#9B59B6', // Purple
    '#1ABC9C', // Teal
    '#E67E22', // Dark Orange
    '#E91E63', // Pink
    '#00BCD4', // Cyan
    '#8BC34A', // Light Green
  ];

  const DAY_PIN_ICONS = ['📍', '📍', '📍', '📍', '📍', '📍', '📍', '📍', '📍', '📍'];

  // Prepare Map Pins — one per site, colored by day
  const mapPins: MapPin[] = useMemo(() => {
    if (!plan || !plan.items_by_day) return [];
    const pins: MapPin[] = [];
    const seenSiteIds = new Set<string>(); // avoid duplicate pins for same site
    Object.entries(plan.items_by_day).forEach(([dayKey, items]) => {
      const dayIndex = parseInt(dayKey, 10) - 1;
      const pinColor = DAY_PIN_COLORS[dayIndex % DAY_PIN_COLORS.length];
      const pinIcon = DAY_PIN_ICONS[dayIndex % DAY_PIN_ICONS.length];
      items.forEach((item, index) => {
        const siteId = item.site_id || item.site?.id || '';
        if (item.site && item.site.latitude && item.site.longitude && !seenSiteIds.has(siteId)) {
          if (siteId) seenSiteIds.add(siteId);
          pins.push({
            id: item.id || `pin_${dayKey}_${index}`,
            latitude: Number(item.site.latitude),
            longitude: Number(item.site.longitude),
            title: item.site.name,
            subtitle: `Ngày ${dayKey}${item.site.address ? ' • ' + item.site.address : ''}`,
            icon: pinIcon,
            color: pinColor,
          });
        }
      });
    });
    return pins;
  }, [plan]);

  // Calculate map center & zoom to fit ALL pins
  const mapCenter = useMemo(() => {
    if (mapPins.length === 0) {
      return { latitude: 10.762622, longitude: 106.660172, zoom: 6 }; // Default center Vietnam
    }
    if (mapPins.length === 1) {
      return { latitude: mapPins[0].latitude, longitude: mapPins[0].longitude, zoom: 13 };
    }
    // Calculate bounding box center
    const lats = mapPins.map(p => p.latitude);
    const lngs = mapPins.map(p => p.longitude);
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    let zoom = 12;
    if (maxDiff > 5) zoom = 4;
    else if (maxDiff > 3) zoom = 5;
    else if (maxDiff > 1.5) zoom = 6;
    else if (maxDiff > 1) zoom = 7;
    else if (maxDiff > 0.5) zoom = 8;
    else if (maxDiff > 0.2) zoom = 9;
    else if (maxDiff > 0.1) zoom = 10;
    else if (maxDiff > 0.05) zoom = 11;
    else if (maxDiff > 0.02) zoom = 12;
    else zoom = 13;
    return { latitude: centerLat, longitude: centerLng, zoom };
  }, [mapPins]);

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
        const lats = mapPins.map(p => p.latitude);
        const lngs = mapPins.map(p => p.longitude);
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

  // Time input state for all sites
  const [showTimeInputModal, setShowTimeInputModal] = useState(false);
  const [selectedSiteId, setSelectedSiteId] = useState<string>("");
  const [estimatedTime, setEstimatedTime] = useState("10:00"); // HH:MM format
  const [restDuration, setRestDuration] = useState(120); // Minutes as number
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [tempTime, setTempTime] = useState(new Date());
  const [calculatingRoute, setCalculatingRoute] = useState(false);
  const [routeInfo, setRouteInfo] = useState<string>("");
  const [travelTimeMinutes, setTravelTimeMinutes] = useState<
    number | undefined
  >(undefined);
  const [note, setNote] = useState("");

  // Share/Participants state
  const [showShareModal, setShowShareModal] = useState(false);
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"editor" | "viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  // Cross-day auto-push states
  const [crossDayWarning, setCrossDayWarning] = useState<string | null>(null);
  const [crossDaysAdded, setCrossDaysAdded] = useState<number>(0);

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

  // Check-in state
  const [checkingInItemId, setCheckingInItemId] = useState<string | null>(null);
  // Item detail sheet state
  const [selectedItem, setSelectedItem] = useState<PlanItem | null>(null);

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
  const [removingNearbyPlaceId, setRemovingNearbyPlaceId] = useState<
    string | null
  >(null);

  // Saved nearby places, and event details for Item Detail view
  const [selectedItemNearbyPlaces, setSelectedItemNearbyPlaces] = useState<
    SiteNearbyPlace[]
  >([]);
  const [loadingSelectedItemNearby, setLoadingSelectedItemNearby] =
    useState(false);
  const [selectedItemEvent, setSelectedItemEvent] = useState<SiteEvent | null>(
    null,
  );
  const [loadingSelectedItemEvent, setLoadingSelectedItemEvent] =
    useState(false);

  // Edit Plan Modal
  const [showEditPlanModal, setShowEditPlanModal] = useState(false);
  const [editPlanName, setEditPlanName] = useState("");
  const [editPlanStartDate, setEditPlanStartDate] = useState("");
  const [editPlanEndDate, setEditPlanEndDate] = useState("");
  const [editPlanPeople, setEditPlanPeople] = useState(1);
  const [editPlanTransportation, setEditPlanTransportation] = useState("bus");
  const [savingPlan, setSavingPlan] = useState(false);
  const [showEditStartDatePicker, setShowEditStartDatePicker] = useState(false);
  const [showEditEndDatePicker, setShowEditEndDatePicker] = useState(false);

  // Menu Dropdown state
  const [showMenuDropdown, setShowMenuDropdown] = useState(false);

  // Full Map Modal state
  const [showFullMap, setShowFullMap] = useState(false);

  useEffect(() => {
    // Attempt to hide bottom tab
    navigation.getParent()?.setOptions({
      tabBarStyle: { display: "none" },
    });
    return () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "flex" }, 
      });
    };
  }, [navigation]);

  useEffect(() => {
    loadPlan();
  }, [planId]);

  useEffect(() => {
    if (isAddModalVisible) {
      if (activeTab === "all") {
        fetchSites({ limit: 20 });
      } else {
        fetchFavorites();
      }
    }
  }, [isAddModalVisible, activeTab]);

  // Fetch nearby places, and event detail when item detail modal opens
  useEffect(() => {
    if (!selectedItem) {
      setSelectedItemNearbyPlaces([]);
      setSelectedItemEvent(null);
      return;
    }
    const siteId = selectedItem.site_id || selectedItem.site?.id || "";
    if (!siteId) return;

    // Load Event details if there's an event_id
    if (selectedItem.event_id) {
      setLoadingSelectedItemEvent(true);
      pilgrimSiteApi
        .getSiteEvents(siteId)
        .then((res) => {
          if (res.success && res.data?.data) {
            const ev = res.data.data.find(
              (e) => e.id === selectedItem.event_id,
            );
            setSelectedItemEvent(ev || null);
          }
        })
        .catch((err) => console.error("Load event error:", err))
        .finally(() => setLoadingSelectedItemEvent(false));
    } else {
      setSelectedItemEvent(null);
    }

    // Load Nearby Places
    const ids = selectedItem.nearby_amenity_ids;
    if (!ids || ids.length === 0) {
      setSelectedItemNearbyPlaces([]);
      return;
    }
    setLoadingSelectedItemNearby(true);
    pilgrimSiteApi
      .getSiteNearbyPlaces(siteId)
      .then((res) => {
        if (res.success && res.data?.data) {
          const filtered = res.data.data.filter((p: SiteNearbyPlace) =>
            ids.includes(p.id),
          );
          setSelectedItemNearbyPlaces(filtered);
        }
      })
      .catch((err) => console.error("Load saved nearby error:", err))
      .finally(() => setLoadingSelectedItemNearby(false));
  }, [selectedItem]);

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
          }),
        );
        setFavorites(mappedFavorites);
      }
    } catch (error) {
      console.error("Fetch favorites error:", error);
    } finally {
      setIsLoadingFavorites(false);
    }
  };

  const loadPlan = async () => {
    try {
      setLoading(true);
      const response = await pilgrimPlannerApi.getPlanDetail(planId);
      if (response.success && response.data) {
        setPlan(response.data);
      } else {
        Alert.alert(
          t("common.error"),
          response.message ||
            t("planner.loadDetailError", {
              defaultValue: "Không thể tải chi tiết kế hoạch",
            }),
        );
      }
    } catch (error) {
      console.error("Load plan detail error:", error);
      Alert.alert(
        t("common.error"),
        t("planner.loadDetailFailed", {
          defaultValue: "Tải chi tiết kế hoạch thất bại",
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEditPlan = () => {
    if (!plan) return;
    setEditPlanName(plan.name || "");
    setEditPlanStartDate(plan.start_date || "");
    setEditPlanEndDate(plan.end_date || "");
    setEditPlanPeople(plan.number_of_people || 1);
    setEditPlanTransportation(plan.transportation || "bus");
    setShowEditPlanModal(true);
  };

  const handleSavePlan = async () => {
    if (!editPlanName.trim()) {
      Alert.alert("Lỗi", "Vui lòng nhập tên kế hoạch");
      return;
    }
    try {
      setSavingPlan(true);
      const response = await pilgrimPlannerApi.updatePlan(planId, {
        name: editPlanName.trim(),
        start_date: editPlanStartDate,
        end_date: editPlanEndDate,
        number_of_people: editPlanPeople,
        transportation: editPlanTransportation,
      });
      if (response.success) {
        setShowEditPlanModal(false);
        await loadPlan();
        Alert.alert("Thành công", "Đã cập nhật kế hoạch");
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật kế hoạch");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể cập nhật kế hoạch");
    } finally {
      setSavingPlan(false);
    }
  };

  const loadParticipants = async () => {
    try {
      setLoadingParticipants(true);
      const response = await pilgrimPlannerApi.getParticipants(planId);
      if (response.success && response.data) {
        setParticipants(response.data);
      }
    } catch (error: any) {
      // Silently handle 404 - participants feature might not be implemented yet
      if (error?.message?.includes("Không tìm thấy")) {
        setParticipants([]);
        // Log as info instead of error
        console.log(
          "Participants endpoint not available, using plan owner only",
        );
      } else {
        // Log other errors
        console.error("Load participants error:", error);
      }
    } finally {
      setLoadingParticipants(false);
    }
  };

  const handleInviteParticipant = async () => {
    if (!inviteEmail.trim()) {
      Alert.alert("Error", "Please enter an email address");
      return;
    }

    try {
      setInviting(true);
      const response = await pilgrimPlannerApi.inviteParticipant(planId, {
        userId: inviteEmail, // Backend expects userId, but we'll send email
        role: inviteRole,
      });

      if (response.success) {
        Alert.alert("Success", "Invitation sent successfully");
        setInviteEmail("");
        loadParticipants();
      } else {
        Alert.alert("Error", response.message || "Failed to send invitation");
      }
    } catch (error: any) {
      console.error("Invite participant error:", error);
      Alert.alert("Error", error.message || "Failed to send invitation");
    } finally {
      setInviting(false);
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
        }));
        setEventSitesList(siteData);
      }
      setHasLoadedEventSites(true);
    } catch (e) {
      console.error("Fetch event sites error:", e);
    } finally {
      setIsLoadingEventSites(false);
    }
  };

  const handleOpenShareModal = () => {
    setShowShareModal(true);
    loadParticipants();
  };

  const handleDeletePlan = () => {
    setShowMenuDropdown(false); // Hide menu if open
    Alert.alert(
      t("planner.deleteTitle", { defaultValue: "Xóa kế hoạch" }),
      t("planner.deleteConfirmMsg", {
        defaultValue:
          "Bạn có chắc chắn muốn xóa kế hoạch này? Hành động này không thể hoàn tác.",
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              const response = await pilgrimPlannerApi.deletePlan(planId);
              if (response.success) {
                navigation.goBack();
              } else {
                Alert.alert(
                  t("common.error"),
                  response.message ||
                    t("planner.deleteFailed", {
                      defaultValue: "Xóa kế hoạch thất bại",
                    }),
                );
              }
            } catch (error) {
              console.error("Delete plan error:", error);
              Alert.alert(
                t("common.error"),
                t("planner.deleteFailed", {
                  defaultValue: "Xóa kế hoạch thất bại",
                }),
              );
            }
          },
        },
      ],
    );
  };

  const handleDeleteItem = (itemId: string) => {
    Alert.alert(
      t("planner.removeItem", { defaultValue: "Xóa địa điểm" }),
      t("planner.removeItemConfirm", {
        defaultValue: "Bạn có chắc chắn muốn xóa địa điểm này khỏi lịch trình?",
      }),
      [
        { text: t("common.cancel"), style: "cancel" },
        {
          text: t("common.delete"),
          style: "destructive",
          onPress: async () => {
            try {
              // Optimistic update could be done here, but reloading is safer for sync
              const response = await pilgrimPlannerApi.deletePlanItem(
                planId,
                itemId,
              );
              if (response.success) {
                loadPlan(); // Reload to refresh
              } else {
                Alert.alert(
                  t("common.error"),
                  response.message ||
                    t("planner.removeItemFailed", {
                      defaultValue: "Xóa địa điểm thất bại",
                    }),
                );
              }
            } catch (error: any) {
              console.error("Delete item error:", error);
              Alert.alert(
                t("common.error"),
                error.message ||
                  t("planner.removeItemFailed", {
                    defaultValue: "Xóa địa điểm thất bại",
                  }),
              );
            }
          },
        },
      ],
    );
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
    const dayItems: PlanItem[] =
      plan?.items_by_day?.[String(item.day_number)] || [];
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

  const buildDurationString = (totalMinutes: number): string => {
    const dh = Math.floor(totalMinutes / 60);
    const dm = totalMinutes % 60;
    if (dh > 0 && dm > 0)
      return `${dh} ${dh === 1 ? "hour" : "hours"} ${dm} ${dm === 1 ? "minute" : "minutes"}`;
    if (dh > 0) return `${dh} ${dh === 1 ? "hour" : "hours"}`;
    return `${totalMinutes} ${totalMinutes === 1 ? "minute" : "minutes"}`;
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
      const response = await pilgrimPlannerApi.updatePlanItem(
        planId,
        editingItem.id,
        payload,
      );
      if (response.success) {
        setShowEditItemModal(false);
        setEditingItem(null);
        loadPlan();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể cập nhật địa điểm");
      }
    } catch (error: any) {
      console.error("Update item error:", error);
      Alert.alert("Lỗi", error.message || "Không thể cập nhật địa điểm");
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

  const parseDurationToMinutes = (durationStr: any): number => {
    if (!durationStr) return 0; // Default if nil
    const durStr = formatTimeValue(durationStr).toLowerCase();
    let minutes = 0;
    const hourMatch = durStr.match(/(\d+)\s*hour|(\d+)\s*gi[oờ]/);
    const minMatch = durStr.match(/(\d+)\s*minute|(\d+)\s*ph[uút]/);

    if (hourMatch) {
      minutes += parseInt(hourMatch[1] || hourMatch[2]) * 60;
    }
    if (minMatch) {
      minutes += parseInt(minMatch[1] || minMatch[2]);
    }
    // Fallback if just a number
    if (!hourMatch && !minMatch) {
      const rawMatch = durStr.match(/(\d+)/);
      if (rawMatch) minutes = parseInt(rawMatch[1]);
    }
    return minutes;
  };

  const calculateEndTime = (startTimeStr: any, durationStr: any): string => {
    if (!startTimeStr) return "";
    const startStr = formatTimeValue(startTimeStr);
    const durationMins = parseDurationToMinutes(durationStr);
    if (!durationMins) return startStr;
    const [hours, minutes] = startStr.split(":").map(Number);
    if (isNaN(hours) || isNaN(minutes)) return startStr;
    const date = new Date();
    date.setHours(hours);
    date.setMinutes(minutes + durationMins);
    return `${date.getHours().toString().padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
  };

  const getDateForDay = (startDateStr: string, dayNumber: number): string => {
    try {
       const date = new Date(startDateStr);
       date.setDate(date.getDate() + (dayNumber - 1));
       return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
    } catch {
       return "";
    }
  };

  const handleAddItem = async (siteId: string, eventId?: string) => {
    setSelectedSiteId(siteId);
    setSelectedEventId(eventId || null);
    setCalculatingRoute(true);
    setRouteInfo("");
    setCrossDayWarning(null);
    setCrossDaysAdded(0);

    setTravelTimeMinutes(undefined);

    // Check if there are previous sites in the day
    const itemsForDay = plan?.items_by_day?.[selectedDay.toString()] || [];

    if (itemsForDay.length > 0) {
      try {
        // Get the last site's ID
        const lastItem = itemsForDay[itemsForDay.length - 1];
        const lastSiteId = lastItem.site_id || lastItem.site?.id;

        // Fetch both site details to get accurate coordinates
        const [lastSiteDetail, newSiteDetail] = await Promise.all([
          lastSiteId ? pilgrimSiteApi.getSiteDetail(lastSiteId) : null,
          pilgrimSiteApi.getSiteDetail(siteId),
        ]);

        const lastSite = lastSiteDetail?.data;
        const newSite = newSiteDetail?.data;

        // If both sites have coordinates, calculate route
        if (
          lastSite?.latitude &&
          lastSite?.longitude &&
          newSite?.latitude &&
          newSite?.longitude
        ) {
          const routeResult = await vietmapService.calculateRoute(
            {
              latitude: lastSite.latitude,
              longitude: lastSite.longitude,
            },
            {
              latitude: newSite.latitude,
              longitude: newSite.longitude,
            },
          );

          // Calculate arrival time based on last site's departure time + previous rest duration + travel time
          const lastSiteTime = lastItem.estimated_time || "10:00";
          const previousRestMinutes = parseDurationToMinutes(
            lastItem.rest_duration,
          );

          const arrivalResult = vietmapService.calculateArrivalTime(
            lastSiteTime,
            previousRestMinutes + routeResult.durationMinutes,
          );

          setTravelTimeMinutes(routeResult.durationMinutes);
          setEstimatedTime(arrivalResult.time);

          const distanceDisplay =
            routeResult.distance < 1000
              ? `${Math.round(routeResult.distance)} m`
              : `${routeResult.distanceKm.toFixed(1)} km`;

          setRouteInfo(
            `Khoảng cách: ${distanceDisplay} • Thời gian di chuyển: ${routeResult.durationText}`,
          );

          if (arrivalResult.daysAdded > 0) {
            setCrossDaysAdded(arrivalResult.daysAdded);
            setCrossDayWarning(
              `Thời gian di chuyển vượt qua ngày hiện tại. Vui lòng chọn ngày khác cho địa điểm này.`,
            );
          }
        } else {
          // No coordinates available, use default
          setEstimatedTime("10:00");
          setRouteInfo("Không có tọa độ để tính toán lộ trình");
        }
      } catch (error) {
        console.error("Route calculation failed:", error);
        // Fallback to default time
        setEstimatedTime("10:00");
        setRouteInfo("Không thể tính toán lộ trình");
      }
    } else {
      // First site of the day, use default
      setEstimatedTime("10:00");
      setRouteInfo("Địa điểm đầu tiên trong ngày");
    }

    setCalculatingRoute(false);
    setShowTimeInputModal(true);
  };

  const addItemToItinerary = async (siteId: string) => {
    if (crossDaysAdded > 0) {
      Alert.alert(
        "Lỗi",
        "Không thể thêm địa điểm vì thời gian đến vượt qua ngày hiện tại. Vui lòng thêm sang ngày khác.",
      );
      return;
    }

    try {
      setAddingItem(true);
      const payload: any = {
        site_id: siteId,
        day_number: selectedDay,
        note: note.trim() || undefined,
        estimated_time: estimatedTime,
      };

      if (selectedEventId) {
        payload.event_id = selectedEventId;
      }

      if (travelTimeMinutes !== undefined) {
        payload.travel_time_minutes = travelTimeMinutes;
      }

      // Convert minutes to duration format with proper singular/plural
      const totalMinutes = restDuration;
      const durationHours = Math.floor(totalMinutes / 60);
      const remainingMinutes = totalMinutes % 60;

      if (durationHours > 0 && remainingMinutes > 0) {
        payload.rest_duration = `${durationHours} hour${durationHours > 1 ? "s" : ""} ${remainingMinutes} minute${remainingMinutes > 1 ? "s" : ""}`;
      } else if (durationHours > 0) {
        payload.rest_duration = `${durationHours} hour${durationHours > 1 ? "s" : ""}`;
      } else {
        payload.rest_duration = `${totalMinutes} minute${totalMinutes > 1 ? "s" : ""}`;
      }

      console.log("🚀 SENDING PAYLOAD:", payload);
      const response = await pilgrimPlannerApi.addPlanItem(planId, payload);

      if (response.success) {
        setIsAddModalVisible(false);
        setShowTimeInputModal(false);
        setNote("");
        loadPlan();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể thêm địa điểm");
      }
    } catch (error: any) {
      console.error("Add item error:", error);
      Alert.alert("Lỗi", error.message || "Không thể thêm địa điểm");
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
      const response = await pilgrimSiteApi.getSiteNearbyPlaces(siteId);
      if (response.success && response.data?.data) {
        setNearbyPlaces(response.data.data);
      }
    } catch (error) {
      console.error("Load nearby places error:", error);
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
        loadPlan();
      } else {
        Alert.alert("Lỗi", response.message || "Không thể lưu địa điểm");
      }
    } catch (error: any) {
      Alert.alert("Lỗi", error.message || "Không thể lưu địa điểm");
    } finally {
      setSavingNearbyPlaceId(null);
    }
  };

  const handleRemoveNearbyPlace = async (placeId: string) => {
    if (!selectedItem) return;
    Alert.alert(
      "Xóa địa điểm",
      "Bạn có muốn xóa địa điểm lân cận này khỏi lịch trình?",
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            try {
              setRemovingNearbyPlaceId(placeId);
              const newIds = (selectedItem.nearby_amenity_ids || []).filter(
                (id) => id !== placeId,
              );
              const response = await pilgrimPlannerApi.updatePlanItem(
                planId,
                selectedItem.id,
                {
                  nearby_amenity_ids: newIds,
                },
              );
              if (response.success) {
                setSelectedItem((prev) =>
                  prev ? { ...prev, nearby_amenity_ids: newIds } : prev,
                );
                setSelectedItemNearbyPlaces((prev) =>
                  prev.filter((p) => p.id !== placeId),
                );
                loadPlan();
              } else {
                Alert.alert(
                  "Lỗi",
                  response.message || "Không thể xóa địa điểm",
                );
              }
            } catch (error: any) {
              Alert.alert("Lỗi", error.message || "Không thể xóa địa điểm");
            } finally {
              setRemovingNearbyPlaceId(null);
            }
          },
        },
      ],
    );
  };

  const handleCheckIn = async (itemId: string, siteName: string) => {
    Alert.alert("Check-in", `Bạn có muốn check-in tại ${siteName}?`, [
      { text: "Hủy", style: "cancel" },
      {
        text: "Check-in",
        onPress: async () => {
          try {
            setCheckingInItemId(itemId);

            // Get current location
            const location = await locationService.getCurrentLocation();

            const response = await pilgrimPlannerApi.checkInPlanItem(itemId, {
              latitude: location.latitude,
              longitude: location.longitude,
            });

            if (response.success) {
              Alert.alert("Thành công", `Đã check-in tại ${siteName}!`);
              loadPlan(); // Reload to update UI
            } else {
              Alert.alert("Lỗi", response.message || "Không thể check-in");
            }
          } catch (error: any) {
            console.error("Check-in error:", error);
            if (
              error.message?.includes("Location") ||
              error.message?.includes("Geolocation")
            ) {
              Alert.alert(
                "Lỗi vị trí",
                "Không thể lấy vị trí của bạn. Vui lòng bật GPS và cho phép ứng dụng truy cập vị trí.",
              );
            } else {
              Alert.alert("Lỗi", error.message || "Không thể check-in");
            }
          } finally {
            setCheckingInItemId(null);
          }
        },
      },
    ]);
  };

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
        return "Đang lên kế hoạch";
      case "planned":
        return "Đã lên kế hoạch";
      case "ongoing":
        return "Đang thực hiện";
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

  const totalDays =
    plan.number_of_days ||
    (plan.items_by_day ? Object.keys(plan.items_by_day).length : 1);
  const sortedDays = Array.from({ length: totalDays }, (_, i) => String(i + 1));

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
           scrollEnabled={true}
           showInfoCards={true}
           cardBottomOffset={180}
           style={styles.headerImage}
        />
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.15)', 'transparent']}
          style={[StyleSheet.absoluteFill, { zIndex: 1, height: '35%' }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.3)', 'rgba(0,0,0,0.75)']}
          style={[StyleSheet.absoluteFill, { zIndex: 1, top: '55%' }]}
          pointerEvents="none"
        />

          {/* Navbar */}
          <View style={[styles.navbar, { marginTop: insets.top, zIndex: 10 }]}>
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
                style={styles.navButton}
                onPress={handleOpenShareModal}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
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
            <TouchableOpacity 
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100 }}
              activeOpacity={1}
              onPress={() => setShowMenuDropdown(false)}
            >
              <View style={{ position: 'absolute', top: insets.top + 45, right: 16, backgroundColor: '#fff', borderRadius: 12, padding: 8, ...SHADOWS.medium, minWidth: 160 }}>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' }}
                  onPress={() => {
                    setShowMenuDropdown(false);
                    handleOpenEditPlan();
                  }}
                >
                  <Ionicons name="create-outline" size={20} color={COLORS.textPrimary} style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' }}>Sửa kế hoạch</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={{ flexDirection: 'row', alignItems: 'center', padding: 12 }}
                  onPress={handleDeletePlan}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" style={{ marginRight: 12 }} />
                  <Text style={{ fontSize: 16, color: "#EF4444", fontWeight: '500' }}>Xóa kế hoạch</Text>
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          )}

        {/* Title & Info */}
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
                <Text style={styles.statusText}>Công khai</Text>
              </View>
            )}
          </View>
          <Text style={styles.title}>{plan.name}</Text>
          <View style={[styles.metaRow, { justifyContent: 'space-between', width: '100%', alignItems: 'center' }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <View style={styles.metaItem}>
                <Ionicons
                  name="calendar-outline"
                  size={16}
                  color="rgba(255,255,255,0.9)"
                />
                <Text style={styles.metaText}>
                  {new Date(plan.start_date).toLocaleDateString("vi-VN")}
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
            
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
               <TouchableOpacity style={{ flexDirection: 'row', alignItems: 'center' }} onPress={handleOpenShareModal}>
                 {/* Mini Avatars */}
                 <View style={{ flexDirection: 'row' }}>
                   <Image source={{ uri: plan.owner?.avatar_url || 'https://i.pravatar.cc/100?img=1' }} style={{ width: 28, height: 28, borderRadius: 14, borderWidth: 1.5, borderColor: '#fff' }} />
                   {plan.number_of_people > 1 && (
                     <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center', marginLeft: -10, borderWidth: 1.5, borderColor: '#fff' }}>
                       <Text style={{ fontSize: 10, color: '#fff', fontWeight: 'bold' }}>+{plan.number_of_people - 1}</Text>
                     </View>
                   )}
                 </View>
                 <View style={{ marginLeft: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.25)' }}>
                   <Text style={{ color: '#fff', fontSize: 13, fontWeight: 'bold' }}>+ Mời</Text>
                 </View>
               </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Itinerary Section */}
        <Text style={styles.sectionTitle}>{t("planner.itinerary")}</Text>

        {sortedDays.length > 0 ? (
          sortedDays.map((dayKey) => {
            const items = plan.items_by_day?.[dayKey] || [];
            return (
              <View key={dayKey} style={styles.dayContainer}>
                <View style={[styles.dayHeader, { backgroundColor: COLORS.backgroundSoft, paddingVertical: 12, marginHorizontal: -SPACING.lg, paddingHorizontal: SPACING.lg }]}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: COLORS.textPrimary }}>
                    Ngày {dayKey} • {getDateForDay(plan.start_date, Number(dayKey))}
                  </Text>
                </View>

                <View style={styles.timelineContainer}>
                  <View style={[styles.timelineLine, { width: 1.5, backgroundColor: '#E5E7EB', left: 24 }]} />
                  <View style={styles.timelineItems}>
                    {items.length === 0 && (
                       <TouchableOpacity style={{ borderWidth: 1.5, borderColor: '#D1D5DB', borderStyle: 'dashed', borderRadius: 12, padding: 24, justifyContent: 'center', alignItems: 'center', width: '100%', marginBottom: 16, backgroundColor: '#F9FAFB' }} onPress={() => openAddModal(Number(dayKey))}>
                         <Ionicons name="add-circle-outline" size={32} color={COLORS.accent} />
                         <Text style={{ fontSize: 15, color: COLORS.textSecondary, marginTop: 8, fontWeight: '500' }}>Bấm để thêm nhà thờ/điểm đến</Text>
                       </TouchableOpacity>
                    )}
                    {items.map((item: PlanItem, index) => (
                      <TouchableOpacity
                        key={item.id || index}
                        style={styles.timelineItem}
                        onPress={() => setSelectedItem(item)}
                      >
                        <View style={[styles.timelineDot, { borderColor: '#D97706', borderWidth: 2, backgroundColor: '#fff', width: 12, height: 12, borderRadius: 6, left: -6 }]} />
                        <View style={styles.itemCard}>
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
                            {item.site.address && (
                              <Text
                                style={styles.itemAddress}
                                numberOfLines={1}
                              >
                                {item.site.address}
                              </Text>
                            )}
                            {/* End Time display (instead of duration), and remove formatting seconds from raw time if formatTimeValue does not handle it cleanly, but calculateEndTime will. */}
                            <View style={styles.itemFooter}>
                              <View style={styles.itemTimeInfo}>
                                <Ionicons
                                  name="time-outline"
                                  size={16}
                                  color={COLORS.accent}
                                />
                                <Text style={styles.itemTime}>
                                  {formatTimeValue(item.estimated_time || item.arrival_time)} 
                                  {item.rest_duration ? ` - ${calculateEndTime(item.estimated_time || item.arrival_time, item.rest_duration)}` : ""}
                                </Text>
                              </View>
                            </View>
                            {item.note && item.note !== "Visited" && (
                              <Text style={styles.itemNote} numberOfLines={1}>
                                {item.note}
                              </Text>
                            )}
                          </View>
                          <Ionicons
                            name="reorder-two-outline"
                            size={24}
                            color={COLORS.textTertiary}
                          />
                        </View>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      style={styles.addSmallButton}
                      onPress={() => openAddModal(Number(dayKey))}
                    >
                      <Ionicons name="add" size={16} color={COLORS.primary} />
                      <Text style={styles.addSmallButtonText}>
                        {t("planner.addStop", {
                          defaultValue: "Thêm điểm dừng",
                        })}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            );
          })
        ) : (
          <View style={[styles.emptyState, { marginTop: 40 }]}>
            <MaterialIcons
              name="edit-road"
              size={64}
              color={COLORS.border}
            />
            <Text style={[styles.emptyStateText, { marginTop: 16, marginBottom: 24, fontSize: 16 }]}>
              {t("planner.noLocationsInPlan")}
            </Text>
            <TouchableOpacity
              style={{ paddingHorizontal: 32, paddingVertical: 14, backgroundColor: COLORS.accent, borderRadius: 24, shadowColor: COLORS.accent, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6 }}
              onPress={() => openAddModal(1)}
            >
              <Text style={{ color: '#fff', fontWeight: 'bold', fontSize: 16 }}>
                + Thêm điểm dừng đầu tiên
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* All days are always displayed above — each day has its own Add Stop button */}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Add Site Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("planner.chooseLocation")}</Text>
            <TouchableOpacity onPress={() => setIsAddModalVisible(false)}>
              <Text style={styles.modalClose}>{t("planner.close")}</Text>
            </TouchableOpacity>
          </View>

          {/* Tabs */}
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "all" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("all")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "all" && styles.activeTabText,
                ]}
              >
                {t("planner.allLocations")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "events" && styles.activeTabButton,
              ]}
              onPress={() => {
                setActiveTab("events");
                loadEventSites();
              }}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "events" && styles.activeTabText,
                ]}
              >
                Sự kiện
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.tabButton,
                activeTab === "favorites" && styles.activeTabButton,
              ]}
              onPress={() => setActiveTab("favorites")}
            >
              <Text
                style={[
                  styles.tabText,
                  activeTab === "favorites" && styles.activeTabText,
                ]}
              >
                {t("planner.myFavorites")}
              </Text>
            </TouchableOpacity>
          </View>

          {isLoadingSites ||
          isLoadingFavorites ||
          (activeTab === "events" && isLoadingEventSites) ? (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={{ marginTop: 20 }}
            />
          ) : activeTab === "events" ? (
            /* Events tab: pick a site to see its events */
            eventSitesList.length === 0 ? (
              <View
                style={{
                  flex: 1,
                  alignItems: "center",
                  justifyContent: "center",
                  padding: 32,
                }}
              >
                <Ionicons
                  name="calendar-outline"
                  size={48}
                  color={COLORS.textTertiary}
                />
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    marginTop: 12,
                    fontSize: 15,
                    textAlign: "center",
                  }}
                >
                  Hiện tại không có địa điểm nào có sự kiện diễn ra trong thời
                  gian lịch trình của bạn.
                </Text>
              </View>
            ) : (
              <FlatList
                data={eventSitesList}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 16 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.siteItem}
                    onPress={async () => {
                      setEventSite(item);
                      setShowEventListModal(true);
                      setSiteEvents([]);
                      try {
                        setIsLoadingEvents(true);
                        const eventParams: any = { limit: 20 };
                        if (plan?.start_date && plan?.end_date) {
                          eventParams.start_date = plan.start_date.substring(
                            0,
                            10,
                          );
                          eventParams.end_date = plan.end_date.substring(0, 10);
                        } else {
                          eventParams.upcoming = "true";
                        }

                        const res = await pilgrimSiteApi.getSiteEvents(
                          item.id,
                          eventParams,
                        );
                        if (res.success && res.data?.data) {
                          setSiteEvents(res.data.data);
                        }
                      } catch (e) {
                        console.error("Load site events error:", e);
                      } finally {
                        setIsLoadingEvents(false);
                      }
                    }}
                  >
                    <Image
                      source={{
                        uri:
                          item.coverImage || "https://via.placeholder.com/60",
                      }}
                      style={styles.siteItemImage}
                    />
                    <View style={styles.siteItemContent}>
                      <Text style={styles.siteItemName}>{item.name}</Text>
                      <Text style={styles.siteItemAddress} numberOfLines={1}>
                        Chọn để xem sự kiện
                      </Text>
                    </View>
                    <Ionicons
                      name="calendar-outline"
                      size={24}
                      color={COLORS.accent}
                    />
                  </TouchableOpacity>
                )}
              />
            )
          ) : (
            <FlatList
              data={activeTab === "all" ? sites : favorites}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.siteItem}
                  onPress={() => handleAddItem(item.id)}
                  disabled={addingItem}
                >
                  <Image
                    source={{
                      uri: item.coverImage || "https://via.placeholder.com/60",
                    }}
                    style={styles.siteItemImage}
                  />
                  <View style={styles.siteItemContent}>
                    <Text style={styles.siteItemName}>{item.name}</Text>
                    <Text style={styles.siteItemAddress} numberOfLines={1}>
                      {item.address}
                    </Text>
                  </View>
                  <Ionicons
                    name="add-circle-outline"
                    size={24}
                    color={COLORS.accent}
                  />
                </TouchableOpacity>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Site Events Modal */}
      <Modal
        visible={showEventListModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEventListModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {eventSite?.name || t("planner.events")}
            </Text>
            <TouchableOpacity onPress={() => setShowEventListModal(false)}>
              <Text style={styles.modalClose}>{t("planner.close")}</Text>
            </TouchableOpacity>
          </View>

          {isLoadingEvents ? (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={{ marginTop: 40 }}
            />
          ) : siteEvents.length === 0 ? (
            <View
              style={{
                flex: 1,
                alignItems: "center",
                justifyContent: "center",
                padding: 32,
              }}
            >
              <Ionicons
                name="calendar-outline"
                size={48}
                color={COLORS.textSecondary}
              />
              <Text
                style={{
                  color: COLORS.textSecondary,
                  marginTop: 12,
                  fontSize: 15,
                  textAlign: "center",
                }}
              >
                Không có sự kiện sắp tới tại địa điểm này
              </Text>
            </View>
          ) : (
            <FlatList
              data={siteEvents}
              keyExtractor={(ev) => ev.id}
              contentContainerStyle={{ padding: 16 }}
              renderItem={({ item: ev }) => {
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
                return (
                  <TouchableOpacity
                    style={[
                      styles.siteItem,
                      { alignItems: "flex-start", paddingVertical: 14 },
                    ]}
                    onPress={() => {
                      // Pre-fill note with event info and open time setup modal
                      const noteText = `🎉 Chọn Sự kiện: ${ev.name}\n📅 ${dateStr}${endStr}${timeStr}${ev.location ? `\n📍 ${ev.location}` : ""}${ev.description ? `\n${ev.description}` : ""}`;
                      setNote(noteText);
                      setShowEventListModal(false);
                      if (eventSite) {
                        handleAddItem(eventSite.id, ev.id);
                      }
                    }}
                  >
                    <View style={{ flex: 1 }}>
                      <View
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          gap: 8,
                          marginBottom: 6,
                        }}
                      >
                        <View
                          style={{
                            backgroundColor: COLORS.accent,
                            borderRadius: 6,
                            padding: 6,
                          }}
                        >
                          <Ionicons
                            name="calendar"
                            size={16}
                            color={COLORS.textPrimary}
                          />
                        </View>
                        <Text
                          style={[styles.siteItemName, { flex: 1 }]}
                          numberOfLines={2}
                        >
                          {ev.name}
                        </Text>
                      </View>
                      <Text
                        style={[styles.siteItemAddress, { marginLeft: 38 }]}
                      >
                        📅 {dateStr}
                        {endStr}
                        {timeStr}
                      </Text>
                      {ev.location && (
                        <Text
                          style={[styles.siteItemAddress, { marginLeft: 38 }]}
                          numberOfLines={1}
                        >
                          📍 {ev.location}
                        </Text>
                      )}
                      {ev.description && (
                        <Text
                          style={[styles.siteItemAddress, { marginLeft: 38 }]}
                          numberOfLines={2}
                        >
                          {ev.description}
                        </Text>
                      )}
                    </View>
                    <Ionicons
                      name="add-circle-outline"
                      size={24}
                      color={COLORS.accent}
                      style={{ marginTop: 2, alignSelf: "center" }}
                    />
                  </TouchableOpacity>
                );
              }}
            />
          )}
        </View>
      </Modal>

      {/* Time Input Modal */}
      <Modal
        visible={showTimeInputModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowTimeInputModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("planner.setTime")}</Text>
            <TouchableOpacity onPress={() => setShowTimeInputModal(false)}>
              <Text style={styles.modalClose}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            <Text style={styles.timeInputLabel}>
              {t("planner.addLocationDay")} {selectedDay}
            </Text>
            <Text style={styles.timeInputDescription}>
              Vui lòng chọn giờ dự kiến và thời gian nghỉ (tối thiểu 1 giờ).
            </Text>

            {/* Route Calculation Info */}
            {calculatingRoute ? (
              <View style={styles.routeInfoContainer}>
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>
                  Đang tính toán lộ trình...
                </Text>
              </View>
            ) : routeInfo ? (
              <View style={styles.routeInfoContainer}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.routeInfoText}>{routeInfo}</Text>
              </View>
            ) : null}

            {crossDayWarning ? (
              <View
                style={[
                  styles.routeInfoContainer,
                  { backgroundColor: "#E8F5E9" },
                ]}
              >
                <Ionicons
                  name="information-circle-outline"
                  size={20}
                  color="#4CAF50"
                />
                <Text style={[styles.routeInfoText, { color: "#4CAF50" }]}>
                  {crossDayWarning}
                </Text>
              </View>
            ) : null}

            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Giờ dự kiến</Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openTimePicker}
              >
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.timePickerButtonText}>{estimatedTime}</Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
              <Text style={styles.durationValueText}>
                {formatDuration(restDuration)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={60}
                maximumValue={240}
                step={15}
                value={restDuration}
                onValueChange={setRestDuration}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>1 giờ</Text>
                <Text style={styles.sliderLabelText}>4 giờ</Text>
              </View>
            </View>

            <View style={styles.noteInputContainer}>
              <Text style={styles.timeInputFieldLabel}>
                {t("planner.noteOptional")}
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder={t("planner.notePlaceholder")}
                placeholderTextColor={COLORS.textTertiary}
                value={note}
                onChangeText={setNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            <TouchableOpacity
              style={[
                styles.confirmButton,
                addingItem && styles.saveTimeButtonDisabled,
              ]}
              onPress={() => addItemToItinerary(selectedSiteId!)}
              disabled={addingItem || !selectedSiteId}
            >
              {addingItem ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>
                  {t("planner.addToItinerary")}
                </Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={showEditItemModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowEditItemModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Chỉnh sửa địa điểm</Text>
            <TouchableOpacity onPress={() => setShowEditItemModal(false)}>
              <Text style={styles.modalClose}>Hủy</Text>
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={{ padding: 16 }}>
            {editingItem && (
              <Text style={[styles.timeInputLabel, { marginBottom: 16 }]}>
                {editingItem.site.name}
              </Text>
            )}

            {/* Route Calculation Info */}
            {calculatingEditRoute ? (
              <View style={styles.routeInfoContainer}>
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
                <Text style={styles.routeInfoText}>
                  Đang tính toán lộ trình...
                </Text>
              </View>
            ) : editRouteInfo ? (
              <View style={styles.routeInfoContainer}>
                <Ionicons
                  name="car-outline"
                  size={20}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.routeInfoText}>{editRouteInfo}</Text>
              </View>
            ) : null}

            {/* Estimated Time */}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>
                {t("planner.estimatedTime")}
              </Text>
              <TouchableOpacity
                style={styles.timePickerButton}
                onPress={openEditTimePicker}
              >
                <Ionicons
                  name="time-outline"
                  size={24}
                  color={COLORS.primary}
                />
                <Text style={styles.timePickerButtonText}>
                  {editEstimatedTime}
                </Text>
                <Ionicons
                  name="chevron-down"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            {/* Rest Duration */}
            <View style={styles.timeInputContainer}>
              <Text style={styles.timeInputFieldLabel}>Thời gian nghỉ</Text>
              <Text style={styles.durationValueText}>
                {formatDuration(editRestDuration)}
              </Text>
              <Slider
                style={styles.slider}
                minimumValue={60}
                maximumValue={240}
                step={15}
                value={editRestDuration}
                onValueChange={setEditRestDuration}
                minimumTrackTintColor={COLORS.primary}
                maximumTrackTintColor={COLORS.border}
                thumbTintColor={COLORS.accent}
              />
              <View style={styles.sliderLabels}>
                <Text style={styles.sliderLabelText}>
                  1 {t("planner.hour")}
                </Text>
                <Text style={styles.sliderLabelText}>
                  4 {t("planner.hours")}
                </Text>
              </View>
            </View>

            {/* Note */}
            <View style={styles.noteInputContainer}>
              <Text style={styles.timeInputFieldLabel}>
                {t("planner.noteOptional")}
              </Text>
              <TextInput
                style={styles.noteInput}
                placeholder={t("planner.notePlaceholder")}
                placeholderTextColor={COLORS.textTertiary}
                value={editNote}
                onChangeText={setEditNote}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>

            {/* Save Button */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={handleSaveEditItem}
              disabled={savingEdit}
            >
              {savingEdit ? (
                <ActivityIndicator color={COLORS.textPrimary} />
              ) : (
                <Text style={styles.confirmButtonText}>Lưu thay đổi</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      {/* Nearby Places Modal */}
      <Modal
        visible={showNearbyModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowNearbyModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle} numberOfLines={1}>
              {t("planner.nearbyLocations")} - {nearbySiteName}
            </Text>
            <TouchableOpacity onPress={() => setShowNearbyModal(false)}>
              <Text style={styles.modalClose}>{t("planner.close")}</Text>
            </TouchableOpacity>
          </View>

          {/* Category Filter Tabs */}
          <View style={[styles.tabContainer, { paddingHorizontal: 16 }]}>
            {(["all", "food", "lodging", "medical"] as const).map((cat) => (
              <TouchableOpacity
                key={cat}
                style={[
                  styles.tabButton,
                  nearbyCategory === cat && styles.activeTabButton,
                ]}
                onPress={() => setNearbyCategory(cat)}
              >
                <Text
                  style={[
                    styles.tabText,
                    nearbyCategory === cat && styles.activeTabText,
                  ]}
                >
                  {cat === "all"
                    ? "Tất cả"
                    : cat === "food"
                      ? "🍜 Ăn uống"
                      : cat === "lodging"
                        ? "🏨 Lưu trú"
                        : "🏥 Y tế"}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {loadingNearby ? (
            <ActivityIndicator
              size="large"
              color={COLORS.accent}
              style={{ marginTop: 40 }}
            />
          ) : (
            <FlatList
              data={
                nearbyCategory === "all"
                  ? nearbyPlaces
                  : nearbyPlaces.filter((p) => p.category === nearbyCategory)
              }
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ padding: 16 }}
              ListEmptyComponent={
                <View style={styles.emptyState}>
                  <Ionicons
                    name="location-outline"
                    size={48}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.emptyStateText}>
                    {t("planner.noNearbyLocations")}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <View style={styles.nearbyPlaceCard}>
                  <View style={styles.nearbyPlaceCategoryBadge}>
                    <Text style={styles.nearbyPlaceCategoryText}>
                      {item.category === "food"
                        ? "🍜"
                        : item.category === "lodging"
                          ? "🏨"
                          : "🏥"}
                    </Text>
                  </View>
                  <View style={styles.nearbyPlaceContent}>
                    <Text style={styles.nearbyPlaceName}>{item.name}</Text>
                    {item.address ? (
                      <Text style={styles.nearbyPlaceAddress} numberOfLines={1}>
                        {item.address}
                      </Text>
                    ) : null}
                    <View
                      style={{ flexDirection: "row", gap: 12, marginTop: 4 }}
                    >
                      {item.distance_meters ? (
                        <Text style={styles.nearbyPlaceMeta}>
                          📍{" "}
                          {item.distance_meters >= 1000
                            ? `${(item.distance_meters / 1000).toFixed(1)} km`
                            : `${item.distance_meters} m`}
                        </Text>
                      ) : null}
                      {item.phone ? (
                        <Text style={styles.nearbyPlaceMeta}>
                          📞 {item.phone}
                        </Text>
                      ) : null}
                    </View>
                    {item.description ? (
                      <Text
                        style={styles.nearbyPlaceDescription}
                        numberOfLines={2}
                      >
                        {item.description}
                      </Text>
                    ) : null}
                    <TouchableOpacity
                      style={[
                        styles.nearbyPlaceSelectBtn,
                        savedNearbyPlaceIds.has(item.id) && {
                          backgroundColor: "#4CAF50",
                        },
                      ]}
                      onPress={() => handleSaveNearbyPlace(item)}
                      disabled={
                        savingNearbyPlaceId === item.id ||
                        savedNearbyPlaceIds.has(item.id)
                      }
                    >
                      {savingNearbyPlaceId === item.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : savedNearbyPlaceIds.has(item.id) ? (
                        <>
                          <Ionicons
                            name="checkmark-circle"
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.nearbyPlaceSelectBtnText}>
                            Đã lưu
                          </Text>
                        </>
                      ) : (
                        <>
                          <Ionicons
                            name="bookmark-outline"
                            size={14}
                            color="#fff"
                          />
                          <Text style={styles.nearbyPlaceSelectBtnText}>
                            Lưu vào lịch trình
                          </Text>
                        </>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              )}
            />
          )}
        </View>
      </Modal>

      {/* Item Detail Modal */}
      <Modal
        visible={!!selectedItem}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setSelectedItem(null)}
      >
        {selectedItem && (
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle} numberOfLines={1}>
                {t("planner.locationDetails")}
              </Text>
              <TouchableOpacity onPress={() => setSelectedItem(null)}>
                <Text style={styles.modalClose}>{t("planner.close")}</Text>
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={{ padding: 16 }}>
              {/* Site image + name */}
              <View style={styles.itemDetailHero}>
                <Image
                  source={{
                    uri:
                      selectedItem.site.cover_image ||
                      selectedItem.site.image ||
                      "https://via.placeholder.com/300x150",
                  }}
                  style={styles.itemDetailImage}
                  resizeMode="cover"
                />
                <View style={styles.itemDetailOverlay} />
                <Text style={styles.itemDetailSiteName}>
                  {selectedItem.site.name}
                </Text>
              </View>

              {/* Info rows */}
              {selectedItem.site.address ? (
                <View style={styles.itemDetailRow}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.itemDetailRowText}>
                    {selectedItem.site.address}
                  </Text>
                </View>
              ) : null}

              {selectedItem.estimated_time || selectedItem.arrival_time ? (
                <View style={styles.itemDetailRow}>
                  <Ionicons
                    name="time-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.itemDetailRowText}>
                    Giờ dự kiến:{" "}
                    {formatTimeValue(
                      selectedItem.estimated_time || selectedItem.arrival_time,
                    )}
                  </Text>
                </View>
              ) : null}

              {selectedItem.rest_duration ? (
                <View style={styles.itemDetailRow}>
                  <Ionicons
                    name="hourglass-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={styles.itemDetailRowText}>
                    Thời gian nghỉ:{" "}
                    {formatTimeValue(selectedItem.rest_duration)}
                  </Text>
                </View>
              ) : null}

              {selectedItem.note ? (
                <View
                  style={[styles.itemDetailRow, { alignItems: "flex-start" }]}
                >
                  <Ionicons
                    name="document-text-outline"
                    size={18}
                    color={COLORS.accent}
                  />
                  <Text style={[styles.itemDetailRowText, { flex: 1 }]}>
                    {selectedItem.note}
                  </Text>
                </View>
              ) : null}

              {/* Event Details */}
              {loadingSelectedItemEvent ? (
                <View
                  style={[
                    styles.itemDetailRow,
                    { justifyContent: "center", marginTop: 8 },
                  ]}
                >
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={[styles.itemDetailRowText, { marginLeft: 8 }]}>
                    Đang tải thông tin sự kiện...
                  </Text>
                </View>
              ) : selectedItemEvent ? (
                <View
                  style={{
                    marginTop: 8,
                    marginBottom: 8,
                    padding: 12,
                    backgroundColor: "#E3F2FD",
                    borderRadius: 12,
                    borderWidth: 1,
                    borderColor: "#BBDEFB",
                  }}
                >
                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 8,
                    }}
                  >
                    <Ionicons name="calendar" size={18} color="#1976D2" />
                    <Text
                      style={{
                        fontSize: 15,
                        fontWeight: "700",
                        color: "#1565C0",
                        marginLeft: 8,
                      }}
                    >
                      {selectedItemEvent.name}
                    </Text>
                  </View>

                  {selectedItemEvent.description ? (
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        marginBottom: 8,
                      }}
                    >
                      {selectedItemEvent.description}
                    </Text>
                  ) : null}

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="time-outline"
                      size={14}
                      color={COLORS.textTertiary}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Bắt đầu:{" "}
                      {selectedItemEvent.start_date
                        ? new Date(
                            selectedItemEvent.start_date,
                          ).toLocaleDateString("vi-VN")
                        : ""}{" "}
                      {selectedItemEvent.start_time
                        ? `lúc ${selectedItemEvent.start_time}`
                        : ""}
                    </Text>
                  </View>

                  <View
                    style={{
                      flexDirection: "row",
                      alignItems: "center",
                      marginBottom: 4,
                    }}
                  >
                    <Ionicons
                      name="flag-outline"
                      size={14}
                      color={COLORS.textTertiary}
                    />
                    <Text
                      style={{
                        fontSize: 13,
                        color: COLORS.textSecondary,
                        marginLeft: 6,
                      }}
                    >
                      Kết thúc:{" "}
                      {selectedItemEvent.end_date
                        ? new Date(
                            selectedItemEvent.end_date,
                          ).toLocaleDateString("vi-VN")
                        : ""}{" "}
                      {selectedItemEvent.end_time
                        ? `lúc ${selectedItemEvent.end_time}`
                        : ""}
                    </Text>
                  </View>

                  {selectedItemEvent.location ? (
                    <View
                      style={{ flexDirection: "row", alignItems: "center" }}
                    >
                      <Ionicons
                        name="location-outline"
                        size={14}
                        color={COLORS.textTertiary}
                      />
                      <Text
                        style={{
                          fontSize: 13,
                          color: COLORS.textSecondary,
                          marginLeft: 6,
                        }}
                      >
                        Địa điểm: {selectedItemEvent.location}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ) : null}

              {/* Saved Nearby Places */}
              {loadingSelectedItemNearby ? (
                <View
                  style={[styles.itemDetailRow, { justifyContent: "center" }]}
                >
                  <ActivityIndicator size="small" color={COLORS.accent} />
                  <Text style={[styles.itemDetailRowText, { marginLeft: 8 }]}>
                    {t("planner.loadingNearbyLocations")}
                  </Text>
                </View>
              ) : selectedItemNearbyPlaces.length > 0 ? (
                <View style={{ marginTop: 4, marginBottom: 4 }}>
                  <View style={styles.itemDetailRow}>
                    <Ionicons
                      name="map-outline"
                      size={18}
                      color={COLORS.accent}
                    />
                    <Text
                      style={[styles.itemDetailRowText, { fontWeight: "600" }]}
                    >
                      {t("planner.savedNearbyLocations")} (
                      {selectedItemNearbyPlaces.length})
                    </Text>
                  </View>
                  {selectedItemNearbyPlaces.map((place) => (
                    <View key={place.id} style={styles.savedNearbyPlaceRow}>
                      <Text style={styles.savedNearbyPlaceEmoji}>
                        {place.category === "food"
                          ? "🍜"
                          : place.category === "lodging"
                            ? "🏨"
                            : "🏥"}
                      </Text>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.savedNearbyPlaceName}>
                          {place.name}
                        </Text>
                        {place.address ? (
                          <Text
                            style={styles.savedNearbyPlaceAddress}
                            numberOfLines={1}
                          >
                            {place.address}
                          </Text>
                        ) : null}
                        {place.phone ? (
                          <Text style={styles.savedNearbyPlaceAddress}>
                            📞 {place.phone}
                          </Text>
                        ) : null}
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveNearbyPlace(place.id)}
                        disabled={removingNearbyPlaceId === place.id}
                        style={{ padding: 4 }}
                      >
                        {removingNearbyPlaceId === place.id ? (
                          <ActivityIndicator size="small" color="#e53e3e" />
                        ) : (
                          <Ionicons
                            name="trash-outline"
                            size={16}
                            color="#e53e3e"
                          />
                        )}
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              ) : null}

              <View style={styles.itemDetailDivider} />

              {/* Action buttons */}
              <TouchableOpacity
                style={styles.itemDetailActionBtn}
                disabled={checkingInItemId === selectedItem.id}
                onPress={() => {
                  setSelectedItem(null);
                  handleCheckIn(selectedItem.id, selectedItem.site.name);
                }}
              >
                {checkingInItemId === selectedItem.id ? (
                  <ActivityIndicator size="small" color={COLORS.accent} />
                ) : (
                  <Ionicons
                    name="checkmark-circle-outline"
                    size={22}
                    color={COLORS.accent}
                  />
                )}
                <Text style={styles.itemDetailActionText}>Check-in</Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textTertiary}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.itemDetailActionBtn}
                onPress={() => {
                  setSelectedItem(null);
                  handleOpenNearbyPlaces(selectedItem);
                }}
              >
                <Ionicons name="map-outline" size={22} color={COLORS.accent} />
                <Text style={styles.itemDetailActionText}>
                  {t("planner.nearbyLocations")}
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textTertiary}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.itemDetailActionBtn}
                onPress={() => {
                  const item = selectedItem;
                  setSelectedItem(null);
                  handleOpenEditItem(item);
                }}
              >
                <Ionicons
                  name="create-outline"
                  size={22}
                  color={COLORS.primary}
                />
                <Text style={styles.itemDetailActionText}>
                  Chỉnh sửa thời gian & ghi chú
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color={COLORS.textTertiary}
                  style={{ marginLeft: "auto" }}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.itemDetailActionBtn,
                  { borderColor: "#FF6B6B22" },
                ]}
                onPress={() => {
                  const itemId = selectedItem.id;
                  setSelectedItem(null);
                  handleDeleteItem(itemId);
                }}
              >
                <Ionicons name="trash-outline" size={22} color="#FF6B6B" />
                <Text
                  style={[styles.itemDetailActionText, { color: "#FF6B6B" }]}
                >
                  Xóa khỏi lịch trình
                </Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        )}
      </Modal>

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

      {/* Share/Participants Modal */}
      <Modal
        visible={showShareModal}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowShareModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>{t("planner.sharePlan")}</Text>
            <TouchableOpacity onPress={() => setShowShareModal(false)}>
              <Text style={styles.modalClose}>{t("planner.close")}</Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ padding: 16 }}
          >
            {/* Invite Section */}
            <View style={styles.inviteSection}>
              <Text style={styles.shareSectionTitle}>
                {t("planner.addMember")}
              </Text>
              <TextInput
                style={styles.emailInput}
                placeholder="Nhập email hoặc ID người dùng"
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />

              {/* Role Selection */}
              <View style={styles.roleSelection}>
                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === "viewer" && styles.roleButtonActive,
                  ]}
                  onPress={() => setInviteRole("viewer")}
                >
                  <Ionicons
                    name="eye-outline"
                    size={20}
                    color={
                      inviteRole === "viewer" ? "#fff" : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === "viewer" && styles.roleButtonTextActive,
                    ]}
                  >
                    Xem
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.roleButton,
                    inviteRole === "editor" && styles.roleButtonActive,
                  ]}
                  onPress={() => setInviteRole("editor")}
                >
                  <Ionicons
                    name="create-outline"
                    size={20}
                    color={
                      inviteRole === "editor" ? "#fff" : COLORS.textSecondary
                    }
                  />
                  <Text
                    style={[
                      styles.roleButtonText,
                      inviteRole === "editor" && styles.roleButtonTextActive,
                    ]}
                  >
                    Chỉnh sửa
                  </Text>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={styles.inviteButton}
                onPress={handleInviteParticipant}
                disabled={inviting}
              >
                {inviting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.inviteButtonText}>Gửi lời mời</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Participants List */}
            <View style={styles.participantsSection}>
              <Text style={styles.shareSectionTitle}>
                Thành viên ({participants.length + (plan?.owner ? 1 : 0)})
              </Text>

              {loadingParticipants ? (
                <ActivityIndicator
                  style={{ marginTop: 20 }}
                  color={COLORS.primary}
                />
              ) : (
                <>
                  {/* Show plan owner first */}
                  {plan?.owner && (
                    <View style={styles.participantItem}>
                      <View style={styles.participantAvatar}>
                        {plan.owner.avatar_url ? (
                          <Image
                            source={{ uri: plan.owner.avatar_url }}
                            style={styles.avatarImage}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={24}
                            color={COLORS.textSecondary}
                          />
                        )}
                      </View>
                      <View style={styles.participantInfo}>
                        <Text style={styles.participantName}>
                          {plan.owner.full_name}
                        </Text>
                        <Text style={styles.participantRole}>Chủ sở hữu</Text>
                      </View>
                      <View style={styles.ownerBadge}>
                        <Ionicons name="star" size={16} color="#FFD700" />
                      </View>
                    </View>
                  )}

                  {/* Show other participants */}
                  {participants.length === 0 ? (
                    <Text style={styles.emptyParticipantsText}>
                      Chưa có thành viên nào khác
                    </Text>
                  ) : (
                    participants.map((participant) => (
                      <View key={participant.id} style={styles.participantItem}>
                        <View style={styles.participantAvatar}>
                          {participant.userAvatar ? (
                            <Image
                              source={{ uri: participant.userAvatar }}
                              style={styles.avatarImage}
                            />
                          ) : (
                            <Ionicons
                              name="person"
                              size={24}
                              color={COLORS.textSecondary}
                            />
                          )}
                        </View>
                        <View style={styles.participantInfo}>
                          <Text style={styles.participantName}>
                            {participant.userName}
                          </Text>
                          <Text style={styles.participantRole}>
                            {participant.role === "owner"
                              ? "Chủ sở hữu"
                              : participant.role === "editor"
                                ? "Chỉnh sửa"
                                : "Xem"}
                          </Text>
                        </View>
                        {participant.role === "owner" && (
                          <View style={styles.ownerBadge}>
                            <Ionicons name="star" size={16} color="#FFD700" />
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </>
              )}
            </View>
          </ScrollView>
        </View>
      </Modal>
      {/* Edit Plan Modal */}
      <Modal
        visible={showEditPlanModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditPlanModal(false)}
      >
        <View
          style={{
            flex: 1,
            backgroundColor: "rgba(0,0,0,0.5)",
            justifyContent: "flex-end",
          }}
        >
          <View
            style={{
              backgroundColor: "#fff",
              borderTopLeftRadius: 24,
              borderTopRightRadius: 24,
              maxHeight: "90%",
            }}
          >
            <ScrollView
              contentContainerStyle={{ padding: 24, paddingBottom: 40 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginBottom: 20,
                }}
              >
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: COLORS.textPrimary,
                  }}
                >
                  {t("planner.editPlan")}
                </Text>
                <TouchableOpacity onPress={() => setShowEditPlanModal(false)}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Name */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: COLORS.textSecondary,
                  marginBottom: 6,
                }}
              >
                {t("planner.planName")}
              </Text>
              <TextInput
                style={{
                  borderWidth: 1,
                  borderColor: COLORS.border,
                  borderRadius: 12,
                  paddingHorizontal: 14,
                  paddingVertical: 12,
                  fontSize: 15,
                  color: COLORS.textPrimary,
                  marginBottom: 16,
                  backgroundColor: "#FAFAFA",
                }}
                value={editPlanName}
                onChangeText={setEditPlanName}
                placeholder={t("planner.planNamePlaceholder")}
                placeholderTextColor={COLORS.textSecondary}
              />

              {/* Dates */}
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 16 }}>
                {/* Start Date */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: COLORS.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    {t("planner.startDate")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEditStartDatePicker(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: "#FAFAFA",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: editPlanStartDate
                          ? COLORS.textPrimary
                          : COLORS.textSecondary,
                      }}
                    >
                      {editPlanStartDate
                        ? new Date(editPlanStartDate).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "Chọn ngày"}
                    </Text>
                  </TouchableOpacity>
                  {showEditStartDatePicker && (
                    <DateTimePicker
                      value={
                        editPlanStartDate
                          ? new Date(editPlanStartDate)
                          : new Date()
                      }
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(_, selectedDate) => {
                        setShowEditStartDatePicker(Platform.OS === "ios");
                        if (selectedDate) {
                          const iso = selectedDate.toISOString().split("T")[0];
                          setEditPlanStartDate(iso);
                          // Auto-adjust end date if it's before start date
                          if (editPlanEndDate && editPlanEndDate < iso) {
                            setEditPlanEndDate(iso);
                          }
                        }
                      }}
                      minimumDate={new Date()}
                      locale="vi"
                    />
                  )}
                </View>

                {/* End Date */}
                <View style={{ flex: 1 }}>
                  <Text
                    style={{
                      fontSize: 13,
                      fontWeight: "600",
                      color: COLORS.textSecondary,
                      marginBottom: 6,
                    }}
                  >
                    {t("planner.endDate")}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setShowEditEndDatePicker(true)}
                    style={{
                      borderWidth: 1,
                      borderColor: COLORS.border,
                      borderRadius: 12,
                      paddingHorizontal: 14,
                      paddingVertical: 12,
                      backgroundColor: "#FAFAFA",
                      flexDirection: "row",
                      alignItems: "center",
                      gap: 8,
                    }}
                  >
                    <Ionicons
                      name="calendar-outline"
                      size={16}
                      color={COLORS.primary}
                    />
                    <Text
                      style={{
                        fontSize: 14,
                        color: editPlanEndDate
                          ? COLORS.textPrimary
                          : COLORS.textSecondary,
                      }}
                    >
                      {editPlanEndDate
                        ? new Date(editPlanEndDate).toLocaleDateString(
                            "vi-VN",
                            {
                              day: "2-digit",
                              month: "2-digit",
                              year: "numeric",
                            },
                          )
                        : "Chọn ngày"}
                    </Text>
                  </TouchableOpacity>
                  {showEditEndDatePicker && (
                    <DateTimePicker
                      value={
                        editPlanEndDate ? new Date(editPlanEndDate) : new Date()
                      }
                      mode="date"
                      display={Platform.OS === "ios" ? "inline" : "default"}
                      onChange={(_, selectedDate) => {
                        setShowEditEndDatePicker(Platform.OS === "ios");
                        if (selectedDate) {
                          setEditPlanEndDate(
                            selectedDate.toISOString().split("T")[0],
                          );
                        }
                      }}
                      minimumDate={
                        editPlanStartDate
                          ? new Date(editPlanStartDate)
                          : new Date()
                      }
                      locale="vi"
                    />
                  )}
                </View>
              </View>

              {/* People Count */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: COLORS.textSecondary,
                  marginBottom: 6,
                }}
              >
                {t("planner.numberOfPeople")}
              </Text>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: 16,
                  marginBottom: 24,
                  backgroundColor: "#F5F5F5",
                  borderRadius: 12,
                  padding: 8,
                  alignSelf: "flex-start",
                }}
              >
                <TouchableOpacity
                  onPress={() =>
                    setEditPlanPeople(Math.max(1, editPlanPeople - 1))
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons
                    name="remove"
                    size={18}
                    color={COLORS.textPrimary}
                  />
                </TouchableOpacity>
                <Text
                  style={{
                    fontSize: 18,
                    fontWeight: "700",
                    color: COLORS.textPrimary,
                    minWidth: 28,
                    textAlign: "center",
                  }}
                >
                  {editPlanPeople}
                </Text>
                <TouchableOpacity
                  onPress={() =>
                    setEditPlanPeople(Math.min(50, editPlanPeople + 1))
                  }
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 18,
                    backgroundColor: "#fff",
                    justifyContent: "center",
                    alignItems: "center",
                  }}
                >
                  <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                </TouchableOpacity>
              </View>

              {/* Transport */}
              <Text
                style={{
                  fontSize: 13,
                  fontWeight: "600",
                  color: COLORS.textSecondary,
                  marginBottom: 8,
                  marginTop: 4,
                }}
              >
                {t("planner.transportation")}
              </Text>
              <View style={{ flexDirection: "row", gap: 12, marginBottom: 24 }}>
                {[
                  {
                    value: "bus",
                    label: t("planner.bus"),
                    icon: "bus" as const,
                  },
                  {
                    value: "car",
                    label: t("planner.car"),
                    icon: "car" as const,
                  },
                  {
                    value: "other",
                    label: t("planner.motorcycle"),
                    icon: null,
                  },
                ].map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setEditPlanTransportation(item.value)}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 12,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor:
                        editPlanTransportation === item.value
                          ? COLORS.accent
                          : "#F5F5F5",
                      borderWidth:
                        editPlanTransportation === item.value ? 0 : 1,
                      borderColor: COLORS.border,
                      gap: 4,
                    }}
                  >
                    {item.icon ? (
                      <Ionicons
                        name={item.icon}
                        size={20}
                        color={
                          editPlanTransportation === item.value
                            ? COLORS.textPrimary
                            : COLORS.textSecondary
                        }
                      />
                    ) : (
                      <Text style={{ fontSize: 18 }}>🏍️</Text>
                    )}
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "600",
                        color:
                          editPlanTransportation === item.value
                            ? COLORS.textPrimary
                            : COLORS.textSecondary,
                      }}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSavePlan}
                disabled={savingPlan}
                style={{
                  backgroundColor: COLORS.accent,
                  borderRadius: 14,
                  paddingVertical: 15,
                  alignItems: "center",
                  opacity: savingPlan ? 0.7 : 1,
                }}
              >
                {savingPlan ? (
                  <ActivityIndicator color={COLORS.textPrimary} />
                ) : (
                  <Text
                    style={{
                      fontSize: 16,
                      fontWeight: "700",
                      color: COLORS.textPrimary,
                    }}
                  >
                    {t("planner.saveChanges")}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Full Map Modal */}
      <FullMapModal
        visible={showFullMap}
        onClose={() => setShowFullMap(false)}
        pins={mapPins}
        initialRegion={mapCenter}
        title={plan?.name || 'Bản đồ kế hoạch'}
        showUserLocation={true}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  backButton: {
    padding: SPACING.sm,
  },
  backButtonText: {
    color: COLORS.primary,
    fontWeight: "bold",
  },
  headerImageContainer: {
    width: "100%",
    height: 260,
    position: "relative",
    overflow: "hidden",
  },
  headerImage: {
    width: "100%",
    height: "100%",
  },
  headerOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
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
  navActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  headerContent: {
    position: "absolute",
    bottom: SPACING.xl, // Push up slightly
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
    backgroundColor: COLORS.accent, // Yellow
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
  content: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 24,
  },
  scrollContent: {
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dayContainer: {
    marginBottom: SPACING.lg,
  },
  dayHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  dayNumberContainer: {
    backgroundColor: COLORS.primary, // Dark
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.md,
    marginRight: SPACING.sm,
  },
  dayNumber: {
    color: "#fff",
    fontWeight: "bold",
    fontSize: 14,
  },
  dayLine: {
    flex: 1,
    height: 1,
    backgroundColor: COLORS.border,
  },
  timelineContainer: {
    paddingHorizontal: SPACING.lg,
    position: "relative",
  },
  timelineLine: {
    position: "absolute",
    left: 36, // Adjust based on layout
    top: 0,
    bottom: 0,
    width: 2,
    backgroundColor: COLORS.border,
  },
  timelineItems: {
    gap: SPACING.md,
    paddingLeft: 12, // Space for line
  },
  timelineItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: "absolute",
    left: -19, // Center on line
    zIndex: 1,
  },
  itemCard: {
    flex: 1,
    flexDirection: "row",
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginLeft: 12,
    ...SHADOWS.small,
    alignItems: "center",
  },
  itemImage: {
    width: 60,
    height: 60,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundSoft,
  },
  itemContent: {
    flex: 1,
    paddingHorizontal: SPACING.sm,
    justifyContent: "center",
  },
  itemName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  itemAddress: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  itemFooter: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  itemTimeInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.accentSubtle,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: BORDER_RADIUS.sm,
  },
  itemTime: {
    fontSize: 11,
    fontWeight: "500",
    color: COLORS.primary,
  },
  itemNote: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    maxWidth: 100,
  },
  itemActions: {
    flexDirection: "column",
    alignItems: "center",
    gap: 4,
    flexShrink: 0,
  },
  checkInButton: {
    padding: 4,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyStateText: {
    color: COLORS.textTertiary,
    fontSize: 14,
  },
  addItemsButton: {
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  addItemsButtonText: {
    color: COLORS.primary,
    fontWeight: "600",
    fontSize: 14,
  },
  addSmallButton: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 8,
    marginLeft: 40,
    gap: 4,
  },
  addSmallButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  addNextDayButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: SPACING.lg,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.lg,
    backgroundColor: COLORS.accentSubtle,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 2,
    borderColor: COLORS.accent,
    borderStyle: "dashed",
    gap: SPACING.sm,
  },
  addNextDayButtonText: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.accent,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40, // Add padding to push content down
  },
  modalHeader: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  modalClose: {
    fontSize: 16,
    color: COLORS.primary,
  },
  siteItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    marginBottom: 12,
    ...SHADOWS.small,
  },
  siteItemImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: COLORS.backgroundSoft,
  },
  siteItemContent: {
    flex: 1,
    marginLeft: 12,
    marginRight: 8,
  },
  siteItemName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  siteItemAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  tabContainer: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    marginBottom: 8,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: COLORS.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  activeTabText: {
    color: COLORS.primary,
  },
  timeInputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  timeInputDescription: {
    fontSize: 14,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
  },
  routeInfoContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.accentSubtle,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.md,
  },
  routeInfoText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flex: 1,
  },
  timeInputContainer: {
    marginBottom: SPACING.md,
  },
  timeInputFieldLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  timeInputHint: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginBottom: SPACING.xs,
    fontStyle: "italic",
  },
  timePickerButton: {
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 8,
  },
  timePickerButtonText: {
    fontSize: 24,
    fontWeight: "700",
    color: COLORS.primary,
    flex: 1,
    textAlign: "center",
    letterSpacing: 2,
  },
  durationValueText: {
    fontSize: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginVertical: SPACING.md,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  sliderLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  sliderLabelText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  noteInputContainer: {
    marginBottom: SPACING.md,
  },
  noteInput: {
    marginTop: SPACING.xs,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    maxHeight: 120,
  },
  confirmButton: {
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    alignItems: "center",
    marginTop: SPACING.lg,
    ...SHADOWS.small,
  },
  saveTimeButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: COLORS.textPrimary,
    fontSize: 16,
    fontWeight: "600",
  },
  // Share/Participants Modal Styles
  inviteSection: {
    marginBottom: SPACING.xl,
  },
  shareSectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emailInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.md,
  },
  roleSelection: {
    flexDirection: "row",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  roleButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  roleButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  roleButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  roleButtonTextActive: {
    color: "#fff",
  },
  inviteButton: {
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  inviteButtonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  participantsSection: {
    marginTop: SPACING.md,
  },
  emptyParticipantsText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.lg,
    fontStyle: "italic",
  },
  participantItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  participantAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    overflow: "hidden",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  participantInfo: {
    flex: 1,
  },
  participantName: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  participantRole: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  ownerBadge: {
    padding: SPACING.xs,
  },
  // Nearby Places
  nearbyPlaceCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  nearbyPlaceCategoryBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  nearbyPlaceCategoryText: {
    fontSize: 20,
  },
  nearbyPlaceContent: {
    flex: 1,
  },
  nearbyPlaceName: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  nearbyPlaceAddress: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  nearbyPlaceMeta: {
    fontSize: 12,
    color: COLORS.textTertiary,
  },
  nearbyPlaceDescription: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    fontStyle: "italic",
  },
  nearbyPlaceSelectBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    backgroundColor: COLORS.accent,
    borderRadius: BORDER_RADIUS.sm,
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginTop: 8,
    alignSelf: "flex-start",
  },
  nearbyPlaceSelectBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  // Item Detail Modal
  itemDetailHero: {
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    height: 160,
    marginBottom: SPACING.md,
    position: "relative",
    justifyContent: "flex-end",
  },
  itemDetailImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  itemDetailOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  itemDetailSiteName: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "700",
    padding: SPACING.md,
    textShadowColor: "rgba(0,0,0,0.6)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  },
  itemDetailRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  itemDetailRowText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  itemDetailDivider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.md,
  },
  itemDetailActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  itemDetailActionText: {
    fontSize: 15,
    fontWeight: "500",
    color: COLORS.textPrimary,
  },
  // Saved nearby places in item detail
  savedNearbyPlaceRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    marginBottom: 4,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.sm,
    borderLeftWidth: 3,
    borderLeftColor: COLORS.accent,
  },
  savedNearbyPlaceEmoji: {
    fontSize: 18,
    lineHeight: 24,
  },
  savedNearbyPlaceName: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  savedNearbyPlaceAddress: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
});

export default PlanDetailScreen;
