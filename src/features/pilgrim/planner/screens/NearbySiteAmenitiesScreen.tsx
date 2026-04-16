import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import VietmapView, { MapPin, VietmapViewRef } from "../../../../components/map/VietmapView";
import { COLORS, SHADOWS } from "../../../../constants/theme.constants";
import type {
  PlannerCompositeNavigationProp,
  PlannerRouteProp,
} from "../../../../navigation/pilgrimNavigation.types";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import pilgrimSiteApi from "../../../../services/api/pilgrim/siteApi";
import type { NearbyPlaceCategory } from "../../../../types/common.types";
import type { PlanItem, SiteNearbyPlace } from "../../../../types/pilgrim";
import { runWithActionGuard } from "../../../../utils/actionGuard";

type NearbyFilter = "all" | NearbyPlaceCategory;

const NEARBY_CACHE_TTL_MS = 2 * 60 * 1000;
const nearbyCache = new Map<
  string,
  { at: number; places: SiteNearbyPlace[]; lat?: number; lng?: number }
>();

type Props = {
  route: PlannerRouteProp<"NearbySiteAmenitiesScreen">;
  navigation: PlannerCompositeNavigationProp;
};

const CATEGORY_UI: Record<NearbyPlaceCategory, { icon: keyof typeof Ionicons.glyphMap; color: string }> = {
  food: { icon: "restaurant-outline", color: "#F97316" },
  lodging: { icon: "bed-outline", color: "#2563EB" },
  medical: { icon: "medkit-outline", color: "#10B981" },
};

const categoryIcon: Record<NearbyPlaceCategory, keyof typeof Ionicons.glyphMap> = {
  food: "restaurant-outline",
  lodging: "bed-outline",
  medical: "medkit-outline",
};

const categoryLabel = (
  t: (key: string, opts?: any) => string,
  value: NearbyFilter,
) => {
  if (value === "all") return t("planner.all", { defaultValue: "Tất cả" });
  if (value === "food") return t("common.categoryFood", { defaultValue: "Ăn uống" });
  if (value === "lodging") return t("common.categoryAccommodation", { defaultValue: "Lưu trú" });
  return t("common.categoryMedical", { defaultValue: "Y tế" });
};

const withAlpha = (hex: string, alpha: number) => {
  const value = hex.replace("#", "");
  const normalized = value.length === 3
    ? `${value[0]}${value[0]}${value[1]}${value[1]}${value[2]}${value[2]}`
    : value;
  const r = parseInt(normalized.slice(0, 2), 16);
  const g = parseInt(normalized.slice(2, 4), 16);
  const b = parseInt(normalized.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
};

export default function NearbySiteAmenitiesScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<VietmapViewRef>(null);

  const { planId, siteId, siteName, siteAddress, latitude, longitude, itemsByDay } = route.params || {};

  const [loading, setLoading] = useState(true);
  const [loadingMap, setLoadingMap] = useState(!latitude || !longitude);
  const [places, setPlaces] = useState<SiteNearbyPlace[]>([]);
  const [filter, setFilter] = useState<NearbyFilter>("all");
  const [baseLat, setBaseLat] = useState<number | undefined>(latitude);
  const [baseLng, setBaseLng] = useState<number | undefined>(longitude);
  const [targetPlanItem, setTargetPlanItem] = useState<PlanItem | null>(null);
  const [savedNearbyIds, setSavedNearbyIds] = useState<Set<string>>(new Set());
  const [savingPlaceId, setSavingPlaceId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error" | "info";
    message: string;
  } | null>(null);
  const feedbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const showFeedback = (
    type: "success" | "error" | "info",
    message: string,
  ) => {
    if (feedbackTimerRef.current) {
      clearTimeout(feedbackTimerRef.current);
      feedbackTimerRef.current = null;
    }
    setFeedback({ type, message });
    feedbackTimerRef.current = setTimeout(() => {
      setFeedback(null);
      feedbackTimerRef.current = null;
    }, 2200);
  };

  const findMatchingPlanItem = (source?: Record<string, PlanItem[]>) => {
    if (!source || !siteId) return null;
    const orderedItems = Object.entries(source)
      .sort((a, b) => Number(a[0]) - Number(b[0]))
      .flatMap(([, items]) => [...(items || [])])
      .sort((a, b) => Number(a?.order_index || 0) - Number(b?.order_index || 0));

    const matched = orderedItems.find((it) => {
      const sid = String(it?.site_id || it?.site?.id || "");
      return sid === String(siteId);
    });

    return matched || null;
  };

  useEffect(() => {
    const fromRouteItem = findMatchingPlanItem(itemsByDay);
    if (fromRouteItem) {
      setTargetPlanItem(fromRouteItem);
      setSavedNearbyIds(new Set(fromRouteItem.nearby_amenity_ids || []));
    }

    const load = async () => {
      if (!siteId) {
        setLoading(false);
        setLoadingMap(false);
        return;
      }

      const cached = nearbyCache.get(siteId);
      if (cached && Date.now() - cached.at < NEARBY_CACHE_TTL_MS) {
        setPlaces(cached.places);
        if (!baseLat && cached.lat) setBaseLat(cached.lat);
        if (!baseLng && cached.lng) setBaseLng(cached.lng);
        setLoading(false);
      }

      try {
        if (!cached) setLoading(true);

        const nearbyResPromise = pilgrimSiteApi.getSiteNearbyPlaces(siteId, { limit: 100 });
        const detailResPromise =
          baseLat && baseLng ? Promise.resolve(null) : pilgrimSiteApi.getSiteDetail(siteId);

        const [nearbyResSettle, detailResSettle, planResSettle] = await Promise.allSettled([
          nearbyResPromise,
          detailResPromise,
          planId && !fromRouteItem ? pilgrimPlannerApi.getPlanDetail(planId) : Promise.resolve(null),
        ]);

        const nearbyRes = nearbyResSettle.status === "fulfilled" ? nearbyResSettle.value : null;
        const detailRes = detailResSettle.status === "fulfilled" ? detailResSettle.value : null;
        const planRes = planResSettle.status === "fulfilled" ? planResSettle.value : null;

        let nextLat = baseLat;
        let nextLng = baseLng;

        if (nearbyRes?.success && nearbyRes?.data?.data) {
          setPlaces(nearbyRes.data.data);
        }

        if (detailRes?.success && detailRes.data) {
          nextLat = Number(detailRes.data.latitude || 0) || undefined;
          nextLng = Number(detailRes.data.longitude || 0) || undefined;
          setBaseLat(nextLat);
          setBaseLng(nextLng);
        }

        if (!fromRouteItem && planRes?.success && planRes.data?.items_by_day && siteId) {
          const matched = findMatchingPlanItem(planRes.data.items_by_day);
          setTargetPlanItem(matched || null);
          setSavedNearbyIds(new Set(matched?.nearby_amenity_ids || []));
        }

        nearbyCache.set(siteId, {
          at: Date.now(),
          places: nearbyRes?.data?.data || [],
          lat: nextLat,
          lng: nextLng,
        });
      } catch {
        if (!cached) setPlaces([]);
      } finally {
        setLoading(false);
        setLoadingMap(false);
      }
    };

    void load();
  }, [siteId, planId, itemsByDay]);

  useEffect(() => {
    return () => {
      if (feedbackTimerRef.current) {
        clearTimeout(feedbackTimerRef.current);
      }
    };
  }, []);

  const extractErrorMessage = (error: any) => {
    const msg =
      error?.response?.data?.error?.message ||
      error?.response?.data?.message ||
      error?.message;
    return typeof msg === "string" && msg.trim()
      ? msg
      : t("planner.cannotSavePlace", { defaultValue: "Không thể lưu địa điểm lúc này." });
  };

  const handleToggleNearbyAmenity = async (place: SiteNearbyPlace) => {
    if (!planId) {
      showFeedback(
        "error",
        t("planner.cannotSavePlace", {
          defaultValue: "Không thể lưu địa điểm lúc này.",
        }),
      );
      return;
    }

    if (!targetPlanItem?.id) {
      showFeedback(
        "info",
        t("planner.nearbyNeedsSiteInPlan", {
          defaultValue:
            "Bạn cần thêm địa điểm này vào lịch trình trước khi gắn tiện ích xung quanh.",
        }),
      );
      return;
    }

    if (savingPlaceId) return;

    try {
      setSavingPlaceId(place.id);
      const existingIds = (targetPlanItem.nearby_amenity_ids || []).map((id) =>
        String(id),
      );
      const isSaved = savedNearbyIds.has(place.id);
      const nextIds = isSaved
        ? existingIds.filter((id) => id !== place.id)
        : Array.from(new Set([...existingIds, place.id]));

      const res = await pilgrimPlannerApi.updatePlanItem(
        planId,
        targetPlanItem.id,
        { nearby_amenity_ids: nextIds },
      );

      if (res?.success) {
        setSavedNearbyIds((prev) => {
          const next = new Set(prev);
          if (isSaved) {
            next.delete(place.id);
          } else {
            next.add(place.id);
          }
          return next;
        });
        setTargetPlanItem((prev) =>
          prev ? { ...prev, nearby_amenity_ids: nextIds } : prev,
        );
        showFeedback(
          "success",
          isSaved
            ? t("planner.placeRemoved", {
                defaultValue: "Đã bỏ khỏi lịch trình",
              })
            : t("planner.placeSaved", {
                defaultValue: "Đã lưu vào lịch trình",
              }),
        );
      } else {
        showFeedback(
          "error",
          res?.message ||
            t("planner.cannotSavePlace", {
              defaultValue: "Không thể lưu địa điểm lúc này.",
            }),
        );
      }
    } catch (error: any) {
      showFeedback("error", extractErrorMessage(error));
    } finally {
      setSavingPlaceId(null);
    }
  };

  const filteredPlaces = useMemo(() => {
    if (filter === "all") return places;
    return places.filter((p) => p.category === filter);
  }, [places, filter]);

  const mapPins = useMemo<MapPin[]>(() => {
    const pins: MapPin[] = [];

    if (baseLat && baseLng) {
      pins.push({
        id: `site_${siteId}`,
        latitude: baseLat,
        longitude: baseLng,
        title: siteName || t("planner.chooseLocation", { defaultValue: "Địa điểm" }),
        subtitle: siteAddress,
        markerType: "site",
        color: "#8B7355",
      });
    }

    filteredPlaces.forEach((p) => {
      const lat = Number(p.latitude || 0);
      const lng = Number(p.longitude || 0);
      if (!lat || !lng) return;
      const markerColor = CATEGORY_UI[p.category]?.color || COLORS.accent;
      pins.push({
        id: `nearby_${p.id}`,
        latitude: lat,
        longitude: lng,
        title: p.name,
        subtitle: p.address,
        color: markerColor,
        markerType:
          p.category === "food"
            ? "restaurant"
            : p.category === "lodging"
              ? "hotel"
              : "medical",
      });
    });

    return pins;
  }, [baseLat, baseLng, filteredPlaces, siteAddress, siteId, siteName, t]);

  return (
    <View style={[styles.container, { paddingTop: Math.max(insets.top, 12) }]}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() =>
            runWithActionGuard(`nearby:${siteId}:back`, () => {
              navigation.goBack();
            })
          }
        >
          <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {t("planner.nearbyLocations", { defaultValue: "Tiện ích xung quanh" })}
          </Text>
          <Text style={styles.subtitle} numberOfLines={1}>
            {siteName || t("planner.chooseLocation", { defaultValue: "Địa điểm" })}
          </Text>
        </View>
      </View>

      <View style={styles.mapCard}>
        {loadingMap ? (
          <View style={styles.mapLoadingWrap}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        ) : (
          <VietmapView
            ref={mapRef}
            style={styles.map}
            initialRegion={{
              latitude: baseLat || 16.047079,
              longitude: baseLng || 108.20623,
              zoom: 13,
            }}
            pins={mapPins}
            showUserLocation
            showInfoCards
          />
        )}
      </View>

      <View style={styles.filterRow}>
        {(["all", "food", "lodging", "medical"] as NearbyFilter[]).map((opt) => {
          const active = filter === opt;
          return (
            <TouchableOpacity
              key={opt}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setFilter(opt)}
            >
              {opt !== "all" ? (
                <Ionicons
                  name={categoryIcon[opt]}
                  size={13}
                  color={active ? CATEGORY_UI[opt].color : COLORS.textSecondary}
                />
              ) : null}
              <Text
                style={[
                  styles.filterChipText,
                  active && styles.filterChipTextActive,
                  active && opt !== "all" ? { color: CATEGORY_UI[opt].color } : null,
                ]}
              >
                {categoryLabel(t, opt)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {feedback ? (
        <View
          style={[
            styles.feedbackBanner,
            feedback.type === "success"
              ? styles.feedbackSuccess
              : feedback.type === "error"
                ? styles.feedbackError
                : styles.feedbackInfo,
          ]}
        >
          <Text style={styles.feedbackText} numberOfLines={2}>
            {feedback.message}
          </Text>
        </View>
      ) : null}

      <Text style={styles.countLabel}>
        {t("planner.foundPlacesLabel", {
          defaultValue: "{{count}} địa điểm phù hợp",
          count: filteredPlaces.length,
        })}
      </Text>

      {planId && !targetPlanItem ? (
        <View style={styles.planWarningBox}>
          <Ionicons name="information-circle-outline" size={14} color="#9A3412" />
          <Text style={styles.planWarningText}>
            {t("planner.nearbyNeedsSiteInPlan", {
              defaultValue: "Bạn cần thêm địa điểm này vào lịch trình trước khi gắn tiện ích xung quanh.",
            })}
          </Text>
        </View>
      ) : null}

      <FlatList
        data={filteredPlaces}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: Math.max(insets.bottom, 12) + 10 }}
        ListEmptyComponent={
          loading ? null : (
            <View style={styles.emptyWrap}>
              <Ionicons name="location-outline" size={40} color={COLORS.textTertiary} />
              <Text style={styles.emptyText}>
                {t("planner.noNearbyLocations", { defaultValue: "Chưa có tiện ích xung quanh" })}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={styles.placeCard}
            onPress={() => {
              const lat = Number(item.latitude || 0);
              const lng = Number(item.longitude || 0);
              if (lat && lng) mapRef.current?.flyTo(lat, lng, 15);
            }}
          >
            <View
              style={[
                styles.placeIconWrap,
                { backgroundColor: withAlpha(CATEGORY_UI[item.category]?.color || "#9A3412", 0.12) },
              ]}
            >
              <Ionicons
                name={categoryIcon[item.category] || "location-outline"}
                size={16}
                color={CATEGORY_UI[item.category]?.color || "#9A3412"}
              />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.placeName} numberOfLines={1}>
                {item.name}
              </Text>
              <Text style={styles.placeAddress} numberOfLines={1}>
                {item.address || "-"}
              </Text>
              <View style={styles.placeMetaRow}>
                {item.distance_meters ? (
                  <Text style={styles.placeMetaText}>
                    {item.distance_meters >= 1000
                      ? `${(item.distance_meters / 1000).toFixed(1)} km`
                      : `${item.distance_meters} m`}
                  </Text>
                ) : null}
                {item.phone ? (
                  <Text style={styles.placeMetaText} numberOfLines={1}>
                    {item.phone}
                  </Text>
                ) : null}
              </View>
            </View>
            <TouchableOpacity
              style={[
                styles.addBtn,
                savedNearbyIds.has(item.id) && styles.addBtnSaved,
              ]}
              onPress={() => handleToggleNearbyAmenity(item)}
              disabled={savingPlaceId === item.id}
            >
              {savingPlaceId === item.id ? (
                <ActivityIndicator size="small" color="#4B5563" />
              ) : savedNearbyIds.has(item.id) ? (
                <Ionicons name="checkmark" size={16} color="#fff" />
              ) : (
                <Ionicons name="add" size={18} color="#4B5563" />
              )}
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 10,
    gap: 10,
  },
  backButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  mapCard: {
    marginHorizontal: 16,
    height: 250,
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    ...SHADOWS.small,
  },
  map: {
    flex: 1,
  },
  mapLoadingWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  filterRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    marginTop: 12,
  },
  filterChip: {
    height: 32,
    borderRadius: 999,
    paddingHorizontal: 12,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  filterChipActive: {
    backgroundColor: "rgba(217,119,6,0.14)",
    borderColor: "rgba(217,119,6,0.22)",
  },
  filterChipText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  filterChipTextActive: {
    color: "#9A3412",
  },
  feedbackBanner: {
    marginTop: 10,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
  },
  feedbackSuccess: {
    backgroundColor: "#ECFDF5",
    borderColor: "#A7F3D0",
  },
  feedbackError: {
    backgroundColor: "#FEF2F2",
    borderColor: "#FECACA",
  },
  feedbackInfo: {
    backgroundColor: "#EFF6FF",
    borderColor: "#BFDBFE",
  },
  feedbackText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  countLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
    paddingHorizontal: 16,
    marginTop: 10,
    marginBottom: 2,
  },
  planWarningBox: {
    marginTop: 6,
    marginHorizontal: 16,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "rgba(217,119,6,0.10)",
    borderWidth: 1,
    borderColor: "rgba(217,119,6,0.22)",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  planWarningText: {
    flex: 1,
    fontSize: 12,
    color: "#9A3412",
    fontWeight: "600",
    lineHeight: 17,
  },
  placeCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 11,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.08)",
    backgroundColor: COLORS.white,
    marginBottom: 10,
  },
  addBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: "rgba(15, 23, 42, 0.10)",
  },
  addBtnSaved: {
    backgroundColor: COLORS.accent,
    borderColor: "rgba(0,0,0,0)",
  },
  placeIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(217,119,6,0.12)",
  },
  placeName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  placeAddress: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  placeMetaRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  placeMetaText: {
    fontSize: 11,
    color: COLORS.textTertiary,
    fontWeight: "600",
  },
  emptyWrap: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  emptyText: {
    marginTop: 10,
    fontSize: 14,
    color: COLORS.textSecondary,
  },
});
