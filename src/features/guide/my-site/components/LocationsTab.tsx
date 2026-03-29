/**
 * LocationsTab Component
 * Map with pinned key points (Parking, Restroom, Reception, etc.)
 * Implements "Pin key points" functionality using Vietmap
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
    ActivityIndicator,
    FlatList,
    KeyboardAvoidingView,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";
import { FullMapModal } from "../../../../components/map/FullMapModal";
import {
    MapPin,
    VietmapView,
    VietmapViewRef,
} from "../../../../components/map/VietmapView";
import { VIETMAP_CONFIG } from "../../../../config/map.config";
import {
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import useI18n from "../../../../hooks/useI18n";
import {
    createNearbyPlace,
    CreateNearbyPlaceRequest,
    deleteNearbyPlace,
    getNearbyPlaces,
    GuideNearbyPlace,
    restoreNearbyPlace,
    updateNearbyPlace,
} from "../../../../services/api/guide/nearbyPlacesApi";
import { NearbyPlaceCategory } from "../../../../types/common.types";
import {
  type NearbyPlaceFormErrors,
  validateNearbyPlaceForm,
} from "../../../../utils/validation";
import { getSpacing } from "../../../../utils/responsive";
import { PREMIUM_COLORS } from "../constants";
import { GUIDE_FAB_SIZE } from "./GuideFabButton";
import { styles } from "./LocationsTab.styles";

function parseVietmapReverseFirstItem(
  data: unknown,
): Record<string, unknown> | null {
  if (data == null) return null;
  if (Array.isArray(data) && data.length > 0) {
    const x = data[0];
    return x && typeof x === "object" ? (x as Record<string, unknown>) : null;
  }
  if (typeof data === "object") {
    const o = data as Record<string, unknown>;
    const tryArr = (a: unknown): Record<string, unknown> | null => {
      if (!Array.isArray(a) || a.length === 0) return null;
      const first = a[0];
      return first && typeof first === "object"
        ? (first as Record<string, unknown>)
        : null;
    };
    return (
      tryArr(o.value) ||
      tryArr(o.data) ||
      tryArr(o.list) ||
      (typeof o.lat === "number" && typeof o.lng === "number" ? o : null)
    );
  }
  return null;
}

function addressStringFromReverseItem(
  first: Record<string, unknown> | null,
): string {
  if (!first) return "";
  const display = first.display;
  const address = first.address;
  const name = first.name;
  const strDisplay = typeof display === "string" ? display.trim() : "";
  const strAddress = typeof address === "string" ? address.trim() : "";
  const strName = typeof name === "string" ? name.trim() : "";
  if (strDisplay) return strDisplay;
  if (strName && strAddress) return `${strName}, ${strAddress}`;
  if (strAddress) return strAddress;
  if (strName) return strName;
  return "";
}

async function reverseGeocodeToAddress(
  lat: number,
  lng: number,
): Promise<string> {
  const url = `${VIETMAP_CONFIG.REVERSE_GEOCODING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&lat=${lat}&lng=${lng}&display_type=1`;
  const res = await fetch(url);
  const data = await res.json();
  const first = parseVietmapReverseFirstItem(data);
  const addr = addressStringFromReverseItem(first);
  if (addr) return addr;
  return `${lat.toFixed(6)}, ${lng.toFixed(6)}`;
}

// Category config theo API BE
const getCategoryConfig = (
  t: any,
): Record<
  NearbyPlaceCategory,
  { label: string; icon: any; color: string; emoji: string }
> => ({
  food: {
    label: t("locationsTab.categories.food"),
    icon: "restaurant",
    color: "#F97316",
    emoji: "🍜",
  },
  lodging: {
    label: t("locationsTab.categories.lodging"),
    icon: "bed",
    color: "#2563EB",
    emoji: "🏨",
  },
  medical: {
    label: t("locationsTab.categories.medical"),
    icon: "medical-bag",
    color: "#10B981",
    emoji: "🏥",
  },
});

const CATEGORIES: NearbyPlaceCategory[] = ["food", "lodging", "medical"];

// ---- Filter types ----
type CategoryFilter = "all" | NearbyPlaceCategory;
type PlaceStatusFilter = "all" | "pending" | "approved" | "rejected";
type ActiveFilter = "active" | "inactive" | "all";

const getActiveFilterOptions = (t: any) => [
  {
    key: "all" as ActiveFilter,
    label: t("locationsTab.activeFilter.all"),
    icon: "apps" as keyof typeof MaterialIcons.glyphMap,
    color: "#8B7355",
    desc: t("locationsTab.activeDesc.all"),
  },
  {
    key: "active" as ActiveFilter,
    label: t("locationsTab.activeFilter.active"),
    icon: "check-circle" as keyof typeof MaterialIcons.glyphMap,
    color: "#10B981",
    desc: t("locationsTab.activeDesc.active"),
  },
  {
    key: "inactive" as ActiveFilter,
    label: t("locationsTab.activeFilter.inactive"),
    icon: "delete" as keyof typeof MaterialIcons.glyphMap,
    color: "#EF4444",
    desc: t("locationsTab.activeDesc.inactive"),
  },
];

const getCategoryFilterOptions = (t: any) => [
  {
    key: "all" as CategoryFilter,
    label: t("locationsTab.categories.all"),
    emoji: "🗺️",
  },
  {
    key: "food" as CategoryFilter,
    label: t("locationsTab.categories.food"),
    emoji: "🍜",
  },
  {
    key: "lodging" as CategoryFilter,
    label: t("locationsTab.categories.lodging"),
    emoji: "🏨",
  },
  {
    key: "medical" as CategoryFilter,
    label: t("locationsTab.categories.medical"),
    emoji: "🏥",
  },
];

const getStatusFilterOptions = (t: any) => [
  {
    key: "all" as PlaceStatusFilter,
    label: t("locationsTab.status.all"),
    color: "#8B7355",
    bg: "#F3EFE9",
    icon: "apps" as keyof typeof MaterialIcons.glyphMap,
    desc: t("locationsTab.statusDesc.all"),
  },
  {
    key: "pending" as PlaceStatusFilter,
    label: t("locationsTab.status.pending"),
    color: "#F59E0B",
    bg: "#FEF3C7",
    icon: "schedule" as keyof typeof MaterialIcons.glyphMap,
    desc: t("locationsTab.statusDesc.pending"),
  },
  {
    key: "approved" as PlaceStatusFilter,
    label: t("locationsTab.status.approved"),
    color: "#10B981",
    bg: "#D1FAE5",
    icon: "check-circle" as keyof typeof MaterialIcons.glyphMap,
    desc: t("locationsTab.statusDesc.approved"),
  },
  {
    key: "rejected" as PlaceStatusFilter,
    label: t("locationsTab.status.rejected"),
    color: "#EF4444",
    bg: "#FEE2E2",
    icon: "cancel" as keyof typeof MaterialIcons.glyphMap,
    desc: t("locationsTab.statusDesc.rejected"),
  },
];

interface LocationsTabProps {
  siteLocation?: {
    latitude: number;
    longitude: number;
    name?: string;
    address?: string;
  };
}

// ---- Add Form Modal ----
interface AddFormState {
  name: string;
  category: NearbyPlaceCategory;
  address: string;
  phone: string;
  description: string;
  latitude: number;
  longitude: number;
}

// Status badge config
const getStatusConfig = (t: any) => ({
  pending: {
    label: t("locationsTab.status.pending"),
    color: "#F59E0B",
    bg: "#FEF3C7",
  },
  approved: {
    label: t("locationsTab.status.approved"),
    color: "#10B981",
    bg: "#D1FAE5",
  },
  rejected: {
    label: t("locationsTab.status.rejected"),
    color: "#EF4444",
    bg: "#FEE2E2",
  },
});

// PlaceCard Component
const PlaceCard: React.FC<{
  place: GuideNearbyPlace;
  onDelete: () => void;
  onEdit: () => void;
  onRestore?: () => void;
  onPress?: () => void;
  t: any;
  categoryConfig: any;
  statusConfig: any;
}> = ({
  place,
  onDelete,
  onEdit,
  onRestore,
  onPress,
  t,
  categoryConfig,
  statusConfig,
}) => {
  const cfg = categoryConfig[place.category];
  const statusCfg = statusConfig[place.status] ?? statusConfig.pending;

  const canEdit = place.status === "pending" || place.status === "rejected";
  const canDelete = place.status !== "approved";

  return (
    <TouchableOpacity
      style={styles.pinCard}
      onPress={onPress}
      activeOpacity={0.95}
    >
      {/* Category accent strip */}
      <View style={[styles.pinCardAccent, { backgroundColor: cfg.color }]}>
        <Text style={styles.pinCardEmoji}>{cfg.emoji}</Text>
      </View>

      <View style={styles.pinCardDivider} />

      {/* Content */}
      <View style={styles.pinCardContent}>
        <View style={styles.pinCardHeader}>
          <Text style={styles.pinCardName} numberOfLines={1}>
            {place.name}
          </Text>
          {(canEdit || canDelete || !!onRestore) && (
            <View style={styles.pinCardIconActions}>
              {canEdit && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onEdit();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name="edit"
                    size={16}
                    color={PREMIUM_COLORS.gold}
                  />
                </TouchableOpacity>
              )}
              {!!onRestore && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onRestore();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons name="restore" size={16} color="#10B981" />
                </TouchableOpacity>
              )}
              {canDelete && (
                <TouchableOpacity
                  style={styles.iconActionBtn}
                  onPress={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <MaterialIcons
                    name="delete-outline"
                    size={16}
                    color="#EF4444"
                  />
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>

        <View style={styles.pinCardBadgeRow}>
          <View style={[styles.statusBadge, { backgroundColor: statusCfg.bg }]}>
            <Text style={[styles.statusText, { color: statusCfg.color }]}>
              {statusCfg.label}
            </Text>
          </View>
        </View>

        {!!place.address && (
          <View style={styles.pinCardInfoRow}>
            <Ionicons name="location-outline" size={14} color="#EF4444" />
            <Text style={styles.pinCardDesc} numberOfLines={1}>
              {place.address}
            </Text>
          </View>
        )}

        <View style={styles.pinCardMeta}>
          {!!place.distance_meters && (
            <View style={styles.pinCardInfoRow}>
              <Ionicons name="navigate-outline" size={14} color="#3B82F6" />
              <Text style={styles.pinCardDesc}>
                {t("locationsTab.distanceAway", {
                  distance:
                    place.distance_meters >= 1000
                      ? t("locationsTab.distance.kilometers", {
                          distance: (place.distance_meters / 1000).toFixed(1),
                        })
                      : t("locationsTab.distance.meters", {
                          distance: place.distance_meters,
                        }),
                })}
              </Text>
            </View>
          )}
          {!!place.phone && (
            <View style={styles.pinCardInfoRow}>
              <Ionicons name="call-outline" size={14} color="#10B981" />
              <Text style={styles.pinCardDesc} numberOfLines={1}>
                {place.phone}
              </Text>
            </View>
          )}
        </View>

        {place.status === "rejected" && !!place.rejection_reason && (
          <View style={styles.rejectionBox}>
            <Ionicons name="alert-circle" size={14} color="#E74C3C" />
            <Text style={styles.rejectionText} numberOfLines={1}>
              {place.rejection_reason}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// ---- Filter Bottom Sheet ----
interface FilterSheetProps {
  visible: boolean;
  categoryFilter: CategoryFilter;
  statusFilter: PlaceStatusFilter;
  isActiveFilter: ActiveFilter;
  onApply: (
    cat: CategoryFilter,
    status: PlaceStatusFilter,
    active: ActiveFilter,
  ) => void;
  onClose: () => void;
  t: any;
  categoryFilterOptions: any[];
  statusFilterOptions: any[];
  activeFilterOptions: any[];
}

const FilterSheet: React.FC<FilterSheetProps> = ({
  visible,
  categoryFilter,
  statusFilter,
  isActiveFilter,
  onApply,
  onClose,
  t,
  categoryFilterOptions,
  statusFilterOptions,
  activeFilterOptions,
}) => {
  const insets = useSafeAreaInsets();
  const [localCat, setLocalCat] = useState<CategoryFilter>(categoryFilter);
  const [localStatus, setLocalStatus] =
    useState<PlaceStatusFilter>(statusFilter);
  const [localActive, setLocalActive] = useState<ActiveFilter>(isActiveFilter);

  useEffect(() => {
    if (visible) {
      setLocalCat(categoryFilter);
      setLocalStatus(statusFilter);
      setLocalActive(isActiveFilter);
    }
  }, [visible, categoryFilter, statusFilter, isActiveFilter]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.sheetOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.sheetContainer,
                { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) },
              ]}
            >
              {/* Handle */}
              <View style={styles.sheetHandleWrap}>
                <View style={styles.sheetHandle} />
              </View>

              {/* Header */}
              <View style={styles.sheetHeader}>
                <Text style={styles.sheetTitle}>
                  {t("locationsTab.filterTitle")}
                </Text>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={GUIDE_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Category */}
              <Text style={styles.sheetSectionTitle}>
                {t("locationsTab.categoryLabel")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sheetChipRow}
              >
                {categoryFilterOptions.map((opt) => {
                  const active = localCat === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sheetChip,
                        active && styles.sheetChipActive,
                      ]}
                      onPress={() => setLocalCat(opt.key)}
                    >
                      <Text style={{ fontSize: 16 }}>{opt.emoji}</Text>
                      <Text
                        style={[
                          styles.sheetChipLabel,
                          active && styles.sheetChipLabelActive,
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Status */}
              <Text style={styles.sheetSectionTitle}>
                {t("locationsTab.statusLabel")}
              </Text>
              <View style={styles.sheetStatusList}>
                {statusFilterOptions.map((opt) => {
                  const active = localStatus === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sheetStatusRow,
                        active && {
                          backgroundColor: opt.bg,
                          borderColor: opt.color,
                        },
                      ]}
                      onPress={() => setLocalStatus(opt.key)}
                    >
                      <View
                        style={[
                          styles.sheetStatusIcon,
                          { backgroundColor: opt.bg },
                        ]}
                      >
                        <MaterialIcons
                          name={opt.icon}
                          size={20}
                          color={opt.color}
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text
                          style={[
                            styles.sheetStatusLabel,
                            active && { color: opt.color },
                          ]}
                        >
                          {opt.label}
                        </Text>
                        <Text style={styles.sheetStatusDesc}>{opt.desc}</Text>
                      </View>
                      {active && (
                        <View
                          style={[
                            styles.sheetCheckCircle,
                            { backgroundColor: opt.color },
                          ]}
                        >
                          <Ionicons name="checkmark" size={14} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Active filter - Hiển thị */}
              <Text style={styles.sheetSectionTitle}>
                {t("locationsTab.displayLabel")}
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={[
                  styles.sheetChipRow,
                  { marginBottom: getSpacing(GUIDE_SPACING.md) },
                ]}
              >
                {activeFilterOptions.map((opt) => {
                  const active = localActive === opt.key;
                  return (
                    <TouchableOpacity
                      key={opt.key}
                      style={[
                        styles.sheetActiveChip,
                        active
                          ? {
                              backgroundColor: opt.color,
                              borderColor: opt.color,
                            }
                          : {
                              backgroundColor: "#FAFAFA",
                              borderColor: GUIDE_COLORS.gray200,
                            },
                      ]}
                      onPress={() => setLocalActive(opt.key)}
                    >
                      <MaterialIcons
                        name={opt.icon}
                        size={16}
                        color={active ? "#FFF" : opt.color}
                      />
                      <Text
                        style={[
                          styles.sheetActiveChipLabel,
                          active && { color: "#FFF" },
                        ]}
                      >
                        {opt.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>

              {/* Apply */}
              <TouchableOpacity
                style={styles.sheetApplyBtn}
                onPress={() => {
                  onApply(localCat, localStatus, localActive);
                  onClose();
                }}
              >
                <Text style={styles.sheetApplyText}>
                  {t("locationsTab.applyFilter")}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// Main Component
export const LocationsTab: React.FC<LocationsTabProps> = ({ siteLocation }) => {
  const { t } = useI18n();
  const { confirm, ConfirmModal } = useConfirm();
  const insets = useSafeAreaInsets();

  // Get translated configs
  const CATEGORY_CONFIG = getCategoryConfig(t);
  const STATUS_CONFIG = getStatusConfig(t);
  const CATEGORY_FILTER_OPTIONS = getCategoryFilterOptions(t);
  const STATUS_FILTER_OPTIONS = getStatusFilterOptions(t);
  const ACTIVE_FILTER_OPTIONS = getActiveFilterOptions(t);

  const [places, setPlaces] = useState<GuideNearbyPlace[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<PlaceStatusFilter>("all");
  const [isActiveFilter, setIsActiveFilter] = useState<ActiveFilter>("active");
  const [showFilterSheet, setShowFilterSheet] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showFullMap, setShowFullMap] = useState(false);
  const [isSelectingOnMap, setIsSelectingOnMap] = useState(false);
  const [editingPlace, setEditingPlace] = useState<GuideNearbyPlace | null>(
    null,
  );
  const [pendingCoords, setPendingCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [form, setForm] = useState<AddFormState>({
    name: "",
    category: "food",
    address: "",
    phone: "",
    description: "",
    latitude: siteLocation?.latitude || 10.762622,
    longitude: siteLocation?.longitude || 106.660172,
  });
  const [nearbyPlaceErrors, setNearbyPlaceErrors] =
    useState<NearbyPlaceFormErrors>({});
  const [apiSubmitError, setApiSubmitError] = useState<string | null>(null);
  const [coordsUpdatedHint, setCoordsUpdatedHint] = useState(false);
  const coordsHintTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const mapRef = useRef<VietmapViewRef>(null);
  const selectingLocationFromAddRef = useRef(false);
  const lastMapPickRef = useRef<{ latitude: number; longitude: number } | null>(
    null,
  );
  const addressDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const closeAddModal = useCallback(() => {
    setShowAddModal(false);
    setNearbyPlaceErrors({});
    setApiSubmitError(null);
    setCoordsUpdatedHint(false);
    if (coordsHintTimeoutRef.current) {
      clearTimeout(coordsHintTimeoutRef.current);
      coordsHintTimeoutRef.current = null;
    }
  }, []);

  // Auto-geocode when address changes using 2-step process
  const handleAddressChange = useCallback((address: string) => {
    setForm((prev) => ({ ...prev, address }));
    setNearbyPlaceErrors((prev) => ({ ...prev, address: undefined }));

    // Clear previous timeout
    if (addressDebounceRef.current) {
      clearTimeout(addressDebounceRef.current);
    }

    // Debounce geocoding (wait 1.5s after user stops typing)
    if (address.trim().length > 10) {
      addressDebounceRef.current = setTimeout(async () => {
        try {
          // Step 1: Search v4 to get ref_id
          const searchUrl = `${VIETMAP_CONFIG.SEARCH_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&text=${encodeURIComponent(address)}`;
          const searchRes = await fetch(searchUrl);
          const searchData = await searchRes.json();

          if (!Array.isArray(searchData) || searchData.length === 0) {
            return;
          }

          const firstResult = searchData[0];
          const refId = firstResult.ref_id;

          if (!refId) {
            return;
          }

          // Step 2: Get place detail with ref_id to get coordinates
          const detailUrl = `${VIETMAP_CONFIG.PLACE_DETAIL_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&refid=${refId}`;
          const detailRes = await fetch(detailUrl);
          const detailData = await detailRes.json();

          const lat = detailData?.lat;
          const lng = detailData?.lng;

          if (lat && lng) {
            setForm((prev) => ({
              ...prev,
              latitude: Number(lat),
              longitude: Number(lng),
            }));
            setNearbyPlaceErrors((prev) => ({ ...prev, coordinates: undefined }));
            if (coordsHintTimeoutRef.current) {
              clearTimeout(coordsHintTimeoutRef.current);
            }
            setCoordsUpdatedHint(true);
            coordsHintTimeoutRef.current = setTimeout(() => {
              setCoordsUpdatedHint(false);
              coordsHintTimeoutRef.current = null;
            }, 2500);
          }
        } catch (error) {
          // Silent fail - user can select on map
        }
      }, 1500);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (addressDebounceRef.current) {
        clearTimeout(addressDebounceRef.current);
      }
      if (coordsHintTimeoutRef.current) {
        clearTimeout(coordsHintTimeoutRef.current);
      }
    };
  }, []);

  // Fetch places from API
  const fetchPlaces = useCallback(
    async (activeParam?: ActiveFilter) => {
      setIsLoading(true);
      const active = activeParam ?? isActiveFilter;
      const params: { is_active?: boolean } = {};
      if (active === "active") params.is_active = true;
      if (active === "inactive") params.is_active = false;
      try {
        const res = await getNearbyPlaces(params);
        setPlaces(res.data?.data || []);
      } catch (error) {
        console.error("❌ Error fetching nearby places:", error);
      } finally {
        setIsLoading(false);
      }
    },
    [isActiveFilter],
  );

  useEffect(() => {
    fetchPlaces();
  }, [fetchPlaces]);

  // Filtered places
  const filteredPlaces = places.filter((p) => {
    const catMatch = categoryFilter === "all" || p.category === categoryFilter;
    const statusMatch = statusFilter === "all" || p.status === statusFilter;
    return catMatch && statusMatch;
  });

  const hasFilters =
    categoryFilter !== "all" ||
    statusFilter !== "all" ||
    isActiveFilter !== "active";

  // Convert GuideNearbyPlace[] to MapPin[] + site pin + ghim vị trí đang chọn (chọn trên map)
  const mapPins: MapPin[] = useMemo(() => {
    const approvedPlaces = places.filter((p) => p.status === "approved");
    const pins: MapPin[] = [
      ...(siteLocation
        ? [
            {
              id: "site-main",
              latitude: Number(siteLocation.latitude),
              longitude: Number(siteLocation.longitude),
              title: siteLocation.name || "Thánh đường",
              subtitle: siteLocation.address || "Nhấn để xem chi tiết",
              color: "#DC2626",
              icon: "⛪",
            },
          ]
        : []),
      ...approvedPlaces.map((p) => ({
        id: p.id,
        latitude: Number(p.latitude),
        longitude: Number(p.longitude),
        title: p.name,
        subtitle: p.address || CATEGORY_CONFIG[p.category]?.label,
        color: CATEGORY_CONFIG[p.category]?.color || PREMIUM_COLORS.gold,
        icon: CATEGORY_CONFIG[p.category]?.emoji || "📍",
      })),
    ];
    if (pendingCoords) {
      pins.push({
        id: "pending-map-pick",
        latitude: pendingCoords.latitude,
        longitude: pendingCoords.longitude,
        title: t("locationsTab.map.pendingPickTitle"),
        subtitle: t("locationsTab.map.pendingPickSubtitle"),
        color: PREMIUM_COLORS.sapphire,
        icon: "📌",
      });
    }
    return pins;
  }, [places, siteLocation, pendingCoords, t]);

  // Chọn vị trí chỉ trên full bản đồ — chạm map nhỏ trong list bị bỏ qua khi đang chọn từ form
  const handleMapPress = useCallback(
    (event: { latitude: number; longitude: number }) => {
      if (isSelectingOnMap) {
        return;
      }
      setPendingCoords(event);
    },
    [isSelectingOnMap],
  );

  // Open modal with current site coords or pending coords from map tap
  const handleAddPress = useCallback(() => {
    const coords = pendingCoords || {
      latitude: siteLocation?.latitude || 10.762622,
      longitude: siteLocation?.longitude || 106.660172,
    };

    setForm({
      name: "",
      category: "food",
      address: "",
      phone: "",
      description: "",
      latitude: Number(coords.latitude),
      longitude: Number(coords.longitude),
    });
    setEditingPlace(null);
    setNearbyPlaceErrors({});
    setApiSubmitError(null);
    setShowAddModal(true);
  }, [siteLocation, pendingCoords]);

  const handleFullMapClose = useCallback(() => {
    setShowFullMap(false);
    setIsSelectingOnMap(false);
    if (selectingLocationFromAddRef.current) {
      selectingLocationFromAddRef.current = false;
      setNearbyPlaceErrors({});
      setApiSubmitError(null);
      setShowAddModal(true);
    }
  }, []);

  const handleConfirmLocationFromMap = useCallback(async () => {
    selectingLocationFromAddRef.current = false;
    setShowFullMap(false);
    setIsSelectingOnMap(false);
    setNearbyPlaceErrors({});
    setApiSubmitError(null);

    const c = lastMapPickRef.current ?? {
      latitude: form.latitude,
      longitude: form.longitude,
    };
    try {
      const address = await reverseGeocodeToAddress(c.latitude, c.longitude);
      setForm((prev) => ({
        ...prev,
        latitude: c.latitude,
        longitude: c.longitude,
        address,
      }));
    } catch {
      setForm((prev) => ({
        ...prev,
        latitude: c.latitude,
        longitude: c.longitude,
        address:
          prev.address?.trim() ||
          `${c.latitude.toFixed(6)}, ${c.longitude.toFixed(6)}`,
      }));
    }
    setShowAddModal(true);
  }, [form.latitude, form.longitude]);

  /** Mở full bản đồ ngay; chạm nhiều lần để dời ghim, bấm Xong để quay lại form */
  const handleSelectOnMap = useCallback(() => {
    selectingLocationFromAddRef.current = true;
    lastMapPickRef.current = {
      latitude: form.latitude,
      longitude: form.longitude,
    };
    setPendingCoords(null);
    setIsSelectingOnMap(true);
    setShowFullMap(true);
    closeAddModal();
  }, [closeAddModal, form.latitude, form.longitude]);

  // Open modal prefilled with rejected place data
  const handleEdit = useCallback((place: GuideNearbyPlace) => {
    setForm({
      name: place.name,
      category: place.category,
      address: place.address,
      phone: place.phone || "",
      description: place.description || "",
      latitude: Number(place.latitude),
      longitude: Number(place.longitude),
    });
    setPendingCoords(null);
    setEditingPlace(place);
    setNearbyPlaceErrors({});
    setApiSubmitError(null);
    setShowAddModal(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    const vErrors = validateNearbyPlaceForm({
      name: form.name,
      address: form.address,
      phone: form.phone,
      description: form.description,
      category: form.category,
      latitude: form.latitude,
      longitude: form.longitude,
    });
    setNearbyPlaceErrors(vErrors);
    setApiSubmitError(null);
    if (Object.keys(vErrors).length > 0) {
      return;
    }
    setIsSubmitting(true);
    try {
      const payload: CreateNearbyPlaceRequest = {
        name: form.name.trim(),
        category: form.category,
        address: form.address.trim(),
        latitude: form.latitude,
        longitude: form.longitude,
        phone: form.phone.trim() || undefined,
        description: form.description.trim() || undefined,
      };

      let response;
      if (editingPlace) {
        response = await updateNearbyPlace(editingPlace.id, payload);
      } else {
        response = await createNearbyPlace(payload);
      }

      // Show success message from BE
      setShowAddModal(false);
      setNearbyPlaceErrors({});
      setApiSubmitError(null);
      setEditingPlace(null);

      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2:
          response.message ||
          (editingPlace ? "Đã cập nhật địa điểm" : "Đã thêm địa điểm mới"),
      });

      await fetchPlaces();
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        "Không thể lưu địa điểm. Vui lòng thử lại.";
      setApiSubmitError(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  }, [form, editingPlace, fetchPlaces, t]);

  const handleDelete = useCallback(
    async (place: GuideNearbyPlace) => {
      const confirmed = await confirm({
        type: "danger",
        title: t("locationsTab.deleteConfirm"),
        message: t("locationsTab.deleteMessage", { name: place.name }),
        confirmText: t("locationsTab.delete"),
        cancelText: t("common.cancel"),
      });

      if (!confirmed) {
        return;
      }

      try {
        const response = await deleteNearbyPlace(place.id);
        Toast.show({
          type: "success",
          text1: t("locationsTab.toast.deleted"),
          text2: response.message || "Đã xóa địa điểm thành công",
        });
        setPlaces((prev) => prev.filter((p) => p.id !== place.id));
        mapRef.current?.removePin(place.id);
      } catch (error: any) {
        const errorMsg =
          error?.response?.data?.message || "Không thể xóa địa điểm.";
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: errorMsg,
        });
      }
      return;
      /*
        const response = await deleteNearbyPlace(place.id);
                Toast.show({
                  type: "success",
                  text1: t("locationsTab.toast.deleted"),
                  text2: response.message || "Đã xóa địa điểm thành công",
                });
                setPlaces((prev) => prev.filter((p) => p.id !== place.id));
                mapRef.current?.removePin(place.id);
              } catch (error: any) {
                const errorMsg =
                  error?.response?.data?.message || "Không thể xóa địa điểm.";
                Toast.show({
                  type: "error",
                  text1: t("common.error"),
                  text2: errorMsg,
                });
              }
      */
    },
    [confirm, t],
  );

  const handleRestore = useCallback(
    async (place: GuideNearbyPlace) => {
      const confirmed = await confirm({
        type: "warning",
        title: t("locationsTab.restoreConfirm"),
        message: t("locationsTab.restoreMessage", { name: place.name }),
        confirmText: t("locationsTab.restore"),
        cancelText: t("common.cancel"),
      });

      if (!confirmed) {
        return;
      }

      try {
        const response = await restoreNearbyPlace(place.id);
        Toast.show({
          type: "success",
          text1: t("locationsTab.toast.restored"),
          text2: response.message || "Đã khôi phục địa điểm thành công",
        });
        setPlaces((prev) => prev.filter((p) => p.id !== place.id));
      } catch (error: any) {
        const errorMsg =
          error?.response?.data?.message || "Không thể khôi phục địa điểm.";
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: errorMsg,
        });
      }
      return;
      /*
        const response = await restoreNearbyPlace(place.id);
                Toast.show({
                  type: "success",
                  text1: t("locationsTab.toast.restored"),
                  text2: response.message || "Đã khôi phục địa điểm thành công",
                });
                setPlaces((prev) => prev.filter((p) => p.id !== place.id));
              } catch (error: any) {
                const errorMsg =
                  error?.response?.data?.message ||
                  "Không thể khôi phục địa điểm.";
                Toast.show({
                  type: "error",
                  text1: t("common.error"),
                  text2: errorMsg,
                });
              }
      */
    },
    [confirm, t],
  );

  // Handle card press - fly to location on map
  const handleCardPress = useCallback((place: GuideNearbyPlace) => {
    mapRef.current?.flyTo(Number(place.latitude), Number(place.longitude), 15);
    mapRef.current?.selectPin(place.id);
  }, []);

  if (isLoading && places.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={PREMIUM_COLORS.gold} />
      </View>
    );
  }

  const listHeaderComponent = (
    <>
      {/* Map */}
      <View style={styles.mapContainer}>
        <VietmapView
          ref={mapRef}
          initialRegion={{
            latitude: siteLocation?.latitude || 10.762622,
            longitude: siteLocation?.longitude || 106.660172,
            zoom: 15,
          }}
          pins={mapPins}
          showUserLocation
          onMapPress={handleMapPress}
          style={styles.map}
          showInfoCards
        />
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddPress}
          accessibilityRole="button"
          accessibilityLabel={t("locationsTab.addPlace")}
        >
          <MaterialIcons
            name="add-location"
            size={Math.round(GUIDE_FAB_SIZE * 0.45)}
            color="#FFFFFF"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.fullMapButton}
          onPress={() => setShowFullMap(true)}
          accessibilityRole="button"
          accessibilityLabel={t("locationsTab.viewFullMap")}
        >
          <MaterialIcons
            name="fullscreen"
            size={22}
            color={PREMIUM_COLORS.gold}
          />
        </TouchableOpacity>
      </View>

      {/* List Header with Filter */}
      <View style={styles.listHeader}>
        <Text style={styles.listTitle}>{t("locationsTab.title")}</Text>
        <View style={styles.listHeaderRight}>
          <Text style={styles.listCount}>
            {t("locationsTab.placeCount", { count: filteredPlaces.length })}
          </Text>
          <TouchableOpacity
            style={[
              styles.filterTriggerBtn,
              hasFilters && styles.filterTriggerBtnActive,
            ]}
            onPress={() => setShowFilterSheet(true)}
          >
            <MaterialIcons
              name="filter-list"
              size={18}
              color={
                hasFilters ? PREMIUM_COLORS.gold : GUIDE_COLORS.textSecondary
              }
            />
            <Text
              style={[
                styles.filterTriggerText,
                hasFilters && { color: PREMIUM_COLORS.gold },
              ]}
            >
              {t("locationsTab.filter")}
              {hasFilters ? " ●" : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <PlaceCard
            place={item}
            onPress={() => handleCardPress(item)}
            onDelete={() => handleDelete(item)}
            onEdit={() => handleEdit(item)}
            onRestore={
              isActiveFilter === "inactive"
                ? () => handleRestore(item)
                : undefined
            }
            t={t}
            categoryConfig={CATEGORY_CONFIG}
            statusConfig={STATUS_CONFIG}
          />
        )}
        ListHeaderComponent={listHeaderComponent}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={fetchPlaces}
            colors={[PREMIUM_COLORS.gold]}
            tintColor={PREMIUM_COLORS.gold}
          />
        }
        ListEmptyComponent={
          !isLoading ? (
            <View style={styles.emptyState}>
              <MaterialIcons
                name="place"
                size={48}
                color={GUIDE_COLORS.gray300}
              />
              <Text style={styles.emptyText}>
                {hasFilters
                  ? t("locationsTab.empty.noResults")
                  : t("locationsTab.empty.noPlaces")}
              </Text>
              <Text style={styles.emptySubtext}>
                {hasFilters
                  ? t("locationsTab.empty.tryChangeFilter")
                  : t("locationsTab.empty.tapToAdd")}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Filter Bottom Sheet */}
      <FilterSheet
        visible={showFilterSheet}
        categoryFilter={categoryFilter}
        statusFilter={statusFilter}
        isActiveFilter={isActiveFilter}
        onApply={(cat, status, active) => {
          setCategoryFilter(cat);
          setStatusFilter(status);
          if (active !== isActiveFilter) {
            setIsActiveFilter(active);
            fetchPlaces(active);
          }
        }}
        onClose={() => setShowFilterSheet(false)}
        t={t}
        categoryFilterOptions={CATEGORY_FILTER_OPTIONS}
        statusFilterOptions={STATUS_FILTER_OPTIONS}
        activeFilterOptions={ACTIVE_FILTER_OPTIONS}
      />

      {/* Add Place Modal */}
      <Modal
        visible={showAddModal}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={closeAddModal}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : undefined}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 4 : 0}
        >
          <View style={styles.modalOverlay}>
            <SafeAreaView
              edges={["bottom", "left", "right"]}
              style={[
                styles.modalSheetSafe,
                { paddingTop: Math.max(insets.top, GUIDE_SPACING.sm) },
              ]}
            >
              <View
                style={[styles.modalContainer, styles.modalContainerColumn]}
              >
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {editingPlace
                    ? t("locationsTab.modal.editTitle")
                    : t("locationsTab.modal.addTitle")}
                </Text>
                <TouchableOpacity onPress={closeAddModal}>
                  <MaterialIcons
                    name="close"
                    size={24}
                    color={GUIDE_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <KeyboardAwareScrollView
                style={styles.modalKeyboardScroll}
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                keyboardDismissMode="on-drag"
                enableOnAndroid
                enableAutomaticScroll
                enableResetScrollToCoords={false}
                extraScrollHeight={Platform.select({ ios: 28, android: 64 })}
                extraHeight={Platform.select({ ios: 96, android: 140 })}
                contentContainerStyle={styles.modalScrollContent}
              >
                {apiSubmitError ? (
                  <View style={styles.modalApiErrorBanner}>
                    <MaterialIcons
                      name="error-outline"
                      size={20}
                      color="#B91C1C"
                    />
                    <Text style={styles.modalApiErrorText}>
                      {apiSubmitError}
                    </Text>
                  </View>
                ) : null}

                {/* Category picker */}
                <Text style={styles.fieldLabel}>
                  {t("locationsTab.modal.categoryLabel")}
                </Text>
                <View style={styles.categoryRow}>
                  {CATEGORIES.map((cat) => {
                    const cfg = CATEGORY_CONFIG[cat];
                    return (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catChip,
                          form.category === cat && {
                            backgroundColor: cfg.color,
                            borderColor: cfg.color,
                          },
                        ]}
                        onPress={() => {
                          setForm((f) => ({ ...f, category: cat }));
                          setNearbyPlaceErrors((prev) => ({
                            ...prev,
                            category: undefined,
                          }));
                        }}
                      >
                        <Text>{cfg.emoji}</Text>
                        <Text
                          style={[
                            styles.catChipLabel,
                            form.category === cat && { color: "#FFF" },
                          ]}
                        >
                          {cfg.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
                {nearbyPlaceErrors.category ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.category)}
                  </Text>
                ) : null}

                {/* Name */}
                <Text style={styles.fieldLabel}>
                  {t("locationsTab.modal.nameLabel")}
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    nearbyPlaceErrors.name && styles.inputBoxError,
                  ]}
                  placeholder={t("locationsTab.modal.namePlaceholder")}
                  placeholderTextColor={GUIDE_COLORS.textMuted}
                  value={form.name}
                  onChangeText={(val) => {
                    setForm((f) => ({ ...f, name: val }));
                    setNearbyPlaceErrors((prev) => ({
                      ...prev,
                      name: undefined,
                    }));
                  }}
                  returnKeyType="next"
                />
                {nearbyPlaceErrors.name ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.name)}
                  </Text>
                ) : null}

                {/* Address */}
                <Text style={styles.fieldLabel}>
                  {t("locationsTab.modal.addressLabel")}
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    nearbyPlaceErrors.address && styles.inputBoxError,
                  ]}
                  placeholder={t("locationsTab.modal.addressPlaceholder")}
                  placeholderTextColor={GUIDE_COLORS.textMuted}
                  value={form.address}
                  onChangeText={handleAddressChange}
                  returnKeyType="next"
                />
                {nearbyPlaceErrors.address ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.address)}
                  </Text>
                ) : null}
                {coordsUpdatedHint ? (
                  <Text style={styles.coordsHintSuccess}>
                    {t("locationsTab.toast.coordsUpdated")}
                  </Text>
                ) : null}

                {/* Select on Map button */}
                <TouchableOpacity
                  style={styles.selectMapBtn}
                  onPress={handleSelectOnMap}
                >
                  <MaterialIcons
                    name="map"
                    size={18}
                    color={PREMIUM_COLORS.gold}
                  />
                  <Text style={styles.selectMapText}>
                    {t("locationsTab.modal.selectOnMap")}
                  </Text>
                </TouchableOpacity>

                {/* Show current form coordinates */}
                {form.latitude != null && form.longitude != null && (
                  <Text style={styles.coordsNote}>
                    {t("locationsTab.modal.currentCoords", {
                      lat: Number(form.latitude).toFixed(5),
                      lng: Number(form.longitude).toFixed(5),
                    })}
                  </Text>
                )}
                {nearbyPlaceErrors.coordinates ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.coordinates)}
                  </Text>
                ) : null}

                {/* Phone */}
                <Text style={styles.fieldLabel}>
                  {t("locationsTab.modal.phoneLabel")}
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    nearbyPlaceErrors.phone && styles.inputBoxError,
                  ]}
                  placeholder={t("locationsTab.modal.phonePlaceholder")}
                  placeholderTextColor={GUIDE_COLORS.textMuted}
                  value={form.phone}
                  onChangeText={(val) => {
                    setForm((f) => ({ ...f, phone: val }));
                    setNearbyPlaceErrors((prev) => ({
                      ...prev,
                      phone: undefined,
                    }));
                  }}
                  keyboardType="phone-pad"
                  returnKeyType="next"
                />
                {nearbyPlaceErrors.phone ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.phone)}
                  </Text>
                ) : null}

                {/* Description */}
                <Text style={styles.fieldLabel}>
                  {t("locationsTab.modal.descriptionLabel")}
                </Text>
                <TextInput
                  style={[
                    styles.inputBox,
                    { minHeight: 60, textAlignVertical: "top" },
                    nearbyPlaceErrors.description && styles.inputBoxError,
                  ]}
                  placeholder={t("locationsTab.modal.descriptionPlaceholder")}
                  placeholderTextColor={GUIDE_COLORS.textMuted}
                  value={form.description}
                  onChangeText={(val) => {
                    setForm((f) => ({ ...f, description: val }));
                    setNearbyPlaceErrors((prev) => ({
                      ...prev,
                      description: undefined,
                    }));
                  }}
                  multiline
                  returnKeyType="done"
                />
                {nearbyPlaceErrors.description ? (
                  <Text style={styles.errorText}>
                    {t(nearbyPlaceErrors.description)}
                  </Text>
                ) : null}
              </KeyboardAwareScrollView>

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={closeAddModal}
                >
                  <Text style={styles.cancelBtnText}>
                    {t("locationsTab.modal.cancel")}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, isSubmitting && { opacity: 0.6 }]}
                  onPress={handleSubmit}
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.submitBtnText}>
                      {editingPlace
                        ? t("locationsTab.modal.saveAndResubmit")
                        : t("locationsTab.modal.submit")}
                    </Text>
                  )}
                </TouchableOpacity>
              </View>
              </View>
            </SafeAreaView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Full Map Modal */}
      <FullMapModal
        visible={showFullMap}
        onClose={handleFullMapClose}
        pins={mapPins}
        initialRegion={{
          latitude: siteLocation?.latitude || 10.762622,
          longitude: siteLocation?.longitude || 106.660172,
          zoom: 14,
        }}
        title={t("locationsTab.fullMapTitle")}
        showUserLocation
        onAddPlace={(coords) => {
          setPendingCoords(coords);
          setForm({
            name: "",
            category: "food",
            address: "",
            phone: "",
            description: "",
            latitude: coords.latitude,
            longitude: coords.longitude,
          });
          setEditingPlace(null);
          setNearbyPlaceErrors({});
          setApiSubmitError(null);
          setShowAddModal(true);
        }}
        isSelectingLocation={isSelectingOnMap}
        onLocationSelected={async (coords) => {
          lastMapPickRef.current = {
            latitude: coords.latitude,
            longitude: coords.longitude,
          };
          setPendingCoords(coords);
          setNearbyPlaceErrors((prev) => ({ ...prev, coordinates: undefined }));
          try {
            const address = await reverseGeocodeToAddress(
              coords.latitude,
              coords.longitude,
            );
            setForm((prev) => ({
              ...prev,
              latitude: coords.latitude,
              longitude: coords.longitude,
              address,
            }));
          } catch {
            setForm((prev) => ({
              ...prev,
              latitude: coords.latitude,
              longitude: coords.longitude,
              address:
                prev.address?.trim() ||
                `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`,
            }));
          }
        }}
        onConfirmLocationSelection={
          isSelectingOnMap ? handleConfirmLocationFromMap : undefined
        }
      />
      <ConfirmModal />
    </View>
  );
};

export default LocationsTab;
