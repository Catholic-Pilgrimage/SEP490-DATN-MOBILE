/**
 * PlannerMapScreen
 * Full-screen interactive map showing all pilgrimage sites for the active journey.
 * - Filters pins by selected day (default: today or day 1)
 * - Uses VietMap Routing API to draw REAL road routes between sites
 * - Shows travel time & distance for each segment and total
 * - Day selector tabs at the top allow switching days
 * - Tapping a pin shows site info card
 */

import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import VietmapView from "../../../../components/map/VietmapView";
import type { MapPin } from "../../../../components/map/VietmapView";
import { usePlanData } from "../hooks/usePlanData";
import {
  calculateMultiPointRoute,
  type LngLat,
  type MultiPointRouteResult,
  type RoutePoint,
  type RouteSegment,
} from "../../../../services/map/vietmapService";

// Day-specific pin colors (up to 8 days; cycles after that)
const DAY_COLORS = [
  "#D35400", // orange
  "#1A6B8A", // teal
  "#6B3A8A", // purple
  "#1A7A4A", // green
  "#8A3A1A", // red-brown
  "#1A3A8A", // navy
  "#8A6B1A", // gold
  "#5C1A8A", // violet
];

/** Format duration in Vietnamese */
const formatDuration = (minutes: number): string => {
  if (minutes < 60) return `${minutes} phút`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h} giờ` : `${h}h${m}'`;
};

/** Format distance */
const formatDistance = (km: number): string => {
  if (km < 1) return `${Math.round(km * 1000)} m`;
  return `${km.toFixed(1)} km`;
};

type Props = {
  route: { params: { planId: string; focusItemId?: string; focusDay?: string } };
  navigation: any;
};

export default function PlannerMapScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const { planId, focusItemId, focusDay } = route.params;

  const { plan, loading, error, sortedDays } = usePlanData(planId);

  // If focusDay is provided, pre-select it
  const [selectedDay, setSelectedDay] = useState<string | null>(focusDay ?? null);
  const [routeData, setRouteData] = useState<MultiPointRouteResult | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);

  // Compute today's day index (0-based)
  const todayIdx = useMemo(() => {
    if (!plan?.start_date || !sortedDays.length) return 0;
    const todayStr = new Date().toISOString().split("T")[0];
    const idx = sortedDays.findIndex((_, i) => {
      const d = new Date(plan.start_date!);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0] === todayStr;
    });
    return idx >= 0 ? idx : 0;
  }, [plan?.start_date, sortedDays]);

  // Auto-select today (or day 1) on first load
  const effectiveDay = useMemo(() => {
    if (selectedDay) return selectedDay;
    return sortedDays[todayIdx] ?? sortedDays[0] ?? null;
  }, [selectedDay, sortedDays, todayIdx]);

  // All pins for the entire plan (overview mode)
  const allPins: MapPin[] = useMemo(() => {
    if (!plan?.items_by_day) return [];
    const pins: MapPin[] = [];
    const seen = new Set<string>();
    sortedDays.forEach((day, dayIdx) => {
      const items = plan.items_by_day?.[day] || [];
      items.forEach((item, itemIdx) => {
        const siteId = item.site_id || item.site?.id || `${day}_${itemIdx}`;
        if (!item.site?.latitude || !item.site?.longitude || seen.has(siteId))
          return;
        seen.add(siteId);
        pins.push({
          id: item.id || siteId,
          latitude: Number(item.site.latitude),
          longitude: Number(item.site.longitude),
          title: item.site.name,
          subtitle: `Ngày ${day}`,
          color: DAY_COLORS[dayIdx % DAY_COLORS.length],
          icon: "📍",
        });
      });
    });
    return pins;
  }, [plan, sortedDays]);

  // Pins for the currently selected day
  const dayPins: MapPin[] = useMemo(() => {
    if (!effectiveDay || !plan?.items_by_day) return allPins;
    const items = plan.items_by_day[effectiveDay] || [];
    const dayIdx = sortedDays.indexOf(effectiveDay);
    const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
    return items
      .filter((item) => item.site?.latitude && item.site?.longitude)
      .map((item, idx) => ({
        id: item.id || item.site_id || item.site?.id || Math.random().toString(),
        latitude: Number(item.site.latitude),
        longitude: Number(item.site.longitude),
        title: item.site.name,
        subtitle: `Điểm ${idx + 1} - Ngày ${effectiveDay}`,
        // Highlight focused item with a distinct color
        color: focusItemId && item.id === focusItemId ? "#DC2626" : color,
        icon: "📍",
      }));
  }, [effectiveDay, plan, sortedDays, allPins, focusItemId]);

  // Waypoints for routing API
  const waypoints: RoutePoint[] = useMemo(() => {
    return dayPins.map((p) => ({ latitude: p.latitude, longitude: p.longitude }));
  }, [dayPins]);

  // Fetch real road route when waypoints change
  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteData(null);
      return;
    }

    let cancelled = false;
    const fetchRoute = async () => {
      setRouteLoading(true);
      try {
        const result = await calculateMultiPointRoute(waypoints);
        if (!cancelled) setRouteData(result);
      } catch (e) {
        console.warn("Route calculation failed:", e);
        if (!cancelled) setRouteData(null);
      } finally {
        if (!cancelled) setRouteLoading(false);
      }
    };

    void fetchRoute();
    return () => {
      cancelled = true;
    };
  }, [waypoints]);

  // Route segments for VietmapView
  const displayRouteSegments = useMemo(() => {
    if (!routeData?.segments.length) return [];
    const dayIdx = sortedDays.indexOf(effectiveDay ?? "");
    const color = DAY_COLORS[dayIdx % DAY_COLORS.length];
    return routeData.segments.map((seg) => ({
      coordinates: seg.route.coordinates,
      color,
    }));
  }, [routeData, effectiveDay, sortedDays]);

  // Map center — if focusItemId, center on that pin; otherwise fit all day pins
  const mapCenter = useMemo(() => {
    // Focus on specific item if provided
    if (focusItemId) {
      const focusPin = dayPins.find((p) => p.id === focusItemId);
      if (focusPin) {
        return { latitude: focusPin.latitude, longitude: focusPin.longitude, zoom: 12 };
      }
    }
    const pins = dayPins.length > 0 ? dayPins : allPins;
    if (!pins.length)
      return { latitude: 10.762622, longitude: 106.660172, zoom: 7 };
    if (pins.length === 1)
      return {
        latitude: pins[0].latitude,
        longitude: pins[0].longitude,
        zoom: 13,
      };
    const lats = pins.map((p) => p.latitude);
    const lngs = pins.map((p) => p.longitude);
    return {
      latitude: (Math.min(...lats) + Math.max(...lats)) / 2,
      longitude: (Math.min(...lngs) + Math.max(...lngs)) / 2,
      zoom: 9,
    };
  }, [dayPins, allPins, focusItemId]);

  // Day label for the tab
  const getDayLabel = useCallback(
    (day: string, dayIdx: number) => {
      if (!plan?.start_date) return `Ngày ${dayIdx + 1}`;
      const d = new Date(plan.start_date);
      d.setDate(d.getDate() + dayIdx);
      const mm = (d.getMonth() + 1).toString().padStart(2, "0");
      const dd = d.getDate().toString().padStart(2, "0");
      return `${dd}/${mm}`;
    },
    [plan?.start_date]
  );

  // Focused item name for the preview banner
  const focusSiteName = useMemo(() => {
    if (!focusItemId) return null;
    const pin = dayPins.find((p) => p.id === focusItemId);
    return pin?.title ?? null;
  }, [focusItemId, dayPins]);

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
        <Ionicons name="map-outline" size={48} color={COLORS.textTertiary} />
        <Text style={styles.errorText}>
          {error || "Không tìm thấy hành trình"}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.backLink}>Quay lại</Text>
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
      <View
        style={[
          styles.topBar,
          {
            paddingTop:
              insets.top + (Platform.OS === "android" ? 12 : 8),
          },
        ]}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={styles.topTitle}>
          <Text style={styles.topTitleText} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={styles.topSubtitle}>
            {dayPins.length} điểm
            {effectiveDay ? ` • Ngày ${effectiveDay}` : ""}
            {routeData
              ? ` • ${formatDistance(routeData.totalDistanceKm)} • ${formatDuration(routeData.totalDurationMinutes)}`
              : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={styles.legendBtn}
          onPress={() => setSelectedDay(null)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="layers-outline"
            size={22}
            color={selectedDay === null ? COLORS.accent : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* DAY SELECTOR TABS */}
      {sortedDays.length > 1 && (
        <View style={styles.dayTabs}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.dayTabsContent}
          >
            {sortedDays.map((day, dayIdx) => {
              const isActive = effectiveDay === day;
              const dayColor = DAY_COLORS[dayIdx % DAY_COLORS.length];
              const isToday = dayIdx === todayIdx;
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    styles.dayTab,
                    isActive && {
                      backgroundColor: dayColor,
                      borderColor: dayColor,
                    },
                  ]}
                  onPress={() => setSelectedDay(day)}
                  activeOpacity={0.75}
                >
                  {isToday && (
                    <View
                      style={[
                        styles.todayDot,
                        {
                          backgroundColor: isActive ? "#fff" : dayColor,
                        },
                      ]}
                    />
                  )}
                  <Text
                    style={[
                      styles.dayTabText,
                      isActive && styles.dayTabTextActive,
                    ]}
                  >
                    {getDayLabel(day, dayIdx)}
                  </Text>
                  <Text
                    style={[
                      styles.dayTabCount,
                      isActive && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {
                      (plan.items_by_day?.[day] || []).filter(
                        (i) => i.site?.latitude
                      ).length
                    }{" "}
                    điểm
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* FOCUS BANNER — shown when previewing a specific stop */}
      {focusSiteName && (
        <View style={styles.focusBanner}>
          <Ionicons name="navigate" size={16} color="#DC2626" />
          <Text style={styles.focusBannerText} numberOfLines={1}>
            Xem trước: {focusSiteName}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.setParams({ focusItemId: undefined })}
            style={styles.focusBannerClear}
            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          >
            <Text style={styles.focusBannerClearText}>Xem tất cả</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ROUTE LOADING INDICATOR */}
      {routeLoading && (
        <View style={styles.routeLoadingBar}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={styles.routeLoadingText}>
            Đang tính tuyến đường...
          </Text>
        </View>
      )}

      {/* MAP */}
      <View style={styles.mapContainer}>
        {dayPins.length === 0 ? (
          <View style={styles.emptyMap}>
            <Ionicons
              name="map-outline"
              size={56}
              color={COLORS.textTertiary}
            />
            <Text style={styles.emptyMapText}>
              Ngày này chưa có điểm hành hương
            </Text>
          </View>
        ) : (
          <VietmapView
            key={effectiveDay ?? "all"}
            style={styles.map}
            initialRegion={mapCenter}
            pins={dayPins}
            showUserLocation
            showInfoCards
            routeSegments={displayRouteSegments}
            cardBottomOffset={insets.bottom + 8}
          />
        )}
      </View>

      {/* BOTTOM LEGEND — Shows stops + distance/time between each */}
      {dayPins.length > 0 && (
        <View
          style={[
            styles.legend,
            { paddingBottom: Math.max(insets.bottom, 12) + 8 },
          ]}
        >
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.legendContent}
          >
            {dayPins.map((pin, idx) => {
              // Find the segment FROM this pin to the next
              const seg: RouteSegment | undefined =
                routeData?.segments[idx - 1];
              return (
                <React.Fragment key={pin.id}>
                  {/* Segment info arrow (between pins) */}
                  {idx > 0 && seg && (
                    <View style={styles.segmentInfo}>
                      <Ionicons
                        name="arrow-forward"
                        size={12}
                        color={COLORS.textTertiary}
                      />
                      <Text style={styles.segmentText}>
                        {formatDistance(seg.route.distanceKm)}
                      </Text>
                      <Text style={styles.segmentTime}>
                        {formatDuration(seg.route.durationMinutes)}
                      </Text>
                    </View>
                  )}
                  {idx > 0 && !seg && (
                    <View style={styles.segmentInfo}>
                      <Ionicons
                        name="arrow-forward"
                        size={12}
                        color={COLORS.textTertiary}
                      />
                    </View>
                  )}

                  {/* Pin item */}
                  <View style={styles.legendItem}>
                    <View
                      style={[
                        styles.legendDot,
                        { backgroundColor: pin.color || COLORS.accent },
                      ]}
                    >
                      <Text style={styles.legendDotText}>{idx + 1}</Text>
                    </View>
                    <Text style={styles.legendLabel} numberOfLines={1}>
                      {pin.title}
                    </Text>
                  </View>
                </React.Fragment>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 12,
  },
  errorText: {
    color: COLORS.textSecondary,
    fontSize: 15,
    textAlign: "center",
  },
  backLink: { color: COLORS.accent, fontWeight: "700", fontSize: 15 },

  // TOP BAR
  topBar: {
    backgroundColor: COLORS.holy,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...SHADOWS.small,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  topTitle: { flex: 1 },
  topTitleText: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  topSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 12,
    marginTop: 2,
  },
  legendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },

  // DAY SELECTOR TABS
  dayTabs: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayTabsContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    flexDirection: "row",
  },
  dayTab: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  todayDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  dayTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  dayTabTextActive: {
    color: "#fff",
  },
  dayTabCount: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginLeft: 2,
  },

  // ROUTE LOADING
  routeLoadingBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(207, 170, 58, 0.1)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeLoadingText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // MAP
  mapContainer: {
    flex: 1,
  },
  map: {
    flex: 1,
    borderRadius: 0,
  },
  emptyMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.background,
  },
  emptyMapText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontStyle: "italic",
  },

  // BOTTOM LEGEND
  legend: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: SPACING.sm,
    ...SHADOWS.small,
  },
  legendContent: {
    paddingHorizontal: SPACING.md,
    gap: 6,
    alignItems: "center",
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    maxWidth: 130,
  },
  legendDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  legendDotText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "800",
  },
  legendLabel: {
    fontSize: 12,
    color: COLORS.textPrimary,
    fontWeight: "500",
    flexShrink: 1,
  },
  segmentInfo: {
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    paddingHorizontal: 4,
  },
  segmentText: {
    fontSize: 10,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  segmentTime: {
    fontSize: 9,
    color: COLORS.textTertiary,
  },

  // Focus Banner
  focusBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: "#FEF2F2",
    borderBottomWidth: 1,
    borderBottomColor: "#FECACA",
  },
  focusBannerText: {
    flex: 1,
    fontSize: 13,
    fontWeight: "700",
    color: "#991B1B",
  },
  focusBannerClear: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  focusBannerClearText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
});
