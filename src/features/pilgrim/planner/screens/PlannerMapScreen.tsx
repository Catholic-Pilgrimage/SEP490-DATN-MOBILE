/**
 * PlannerMapScreen — "Người dẫn đường thông minh"
 *
 * 1. AUTO-ROUTE: automatically draws route from user's current location to the
 *    next unvisited stop. Updates when a stop is marked visited/skipped.
 * 2. PREVIEW: swipe carousel to preview route to any upcoming stop (same day or next day).
 * 3. Numbered Status Markers — green (visited), gray (skipped), red (next stop).
 * 4. Center-on-Me + Auto-Fit FABs (no button overlap).
 * 5. Dynamic ETA + progress warning.
 * 6. Enhanced route lines — white casing, gray for visited segments.
 */

import { Ionicons } from "@expo/vector-icons";
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
  Dimensions,
  FlatList,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import type {
  MapPin,
  VietmapViewRef,
} from "../../../../components/map/VietmapView";
import VietmapView from "../../../../components/map/VietmapView";
import {
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import type {
  PlannerCompositeNavigationProp,
  PlannerRouteProp,
} from "../../../../navigation/pilgrimNavigation.types";
import {
  calculateMultiPointRoute,
  calculateRouteWithGeometry,
  type LngLat,
  type MultiPointRouteResult,
  type RoutePoint,
  type RouteResultWithGeometry,
} from "../../../../services/map/vietmapService";
import type { PlanItem } from "../../../../types/pilgrim/planner.types";
import { usePlanData } from "../hooks/usePlanData";

// ─── Constants ───────────────────────────────────────────────
const { width: SCREEN_WIDTH } = Dimensions.get("window");
const CARD_WIDTH = SCREEN_WIDTH * 0.78;
const CARD_GAP = 10;

const DAY_COLORS = [
  "#D35400",
  "#1A6B8A",
  "#6B3A8A",
  "#1A7A4A",
  "#8A3A1A",
  "#1A3A8A",
  "#8A6B1A",
  "#5C1A8A",
];
const STATUS_COLORS = {
  visited: "#22C55E",
  skipped: "#9CA3AF",
  next: "#DC2626",
};

// ─── Helpers ─────────────────────────────────────────────────
const fmtDur = (m: number) => {
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  return r === 0 ? `${h}h` : `${h}h${r}m`;
};
const fmtDist = (km: number) =>
  km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`;
const fmtETA = (m: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() + m);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};
const fmtTime = (t?: string) => {
  if (!t) return null;
  const p = t.split(":");
  return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
};

// ─── Types ───────────────────────────────────────────────────
type Props = {
  route: PlannerRouteProp<"PlannerMapScreen">;
  navigation: PlannerCompositeNavigationProp;
};

type CardData = {
  key: string;
  fromName: string;
  toName: string;
  distKm: number;
  durMin: number;
  eta: string;
  toLat: number;
  toLng: number;
  status: string;
  isNext: boolean;
  estTime?: string;
  idx: number;
};

// ═══════════════════════════════════════════════════════════════
// Component
// ═══════════════════════════════════════════════════════════════
export default function PlannerMapScreen({ route, navigation }: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const {
    planId,
    focusItemId,
    focusDay,
    itemsByDay: passedItems,
  } = route.params;
  const { plan, loading, error, sortedDays } = usePlanData(planId);
  const mapRef = useRef<VietmapViewRef>(null);

  const [selDay, setSelDay] = useState<string | null>(focusDay ?? null);
  const [routeData, setRouteData] = useState<MultiPointRouteResult | null>(
    null,
  );
  const [routeLoading, setRouteLoading] = useState(false);
  const [activeIdx, setActiveIdx] = useState(0);
  const [userLoc, setUserLoc] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [followMode, setFollowMode] = useState(false);

  // Live route from user → next stop
  const [liveRoute, setLiveRoute] = useState<RouteResultWithGeometry | null>(
    null,
  );
  const [liveRouteLoading, setLiveRouteLoading] = useState(false);
  const liveRouteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const ibd = useMemo(
    () => passedItems || plan?.items_by_day || {},
    [passedItems, plan?.items_by_day],
  );

  // ─── Day logic ───
  const todayIdx = useMemo(() => {
    if (!plan?.start_date || !sortedDays.length) return 0;
    const ts = new Date().toISOString().split("T")[0];
    const i = sortedDays.findIndex((_, x) => {
      const d = new Date(plan.start_date!);
      d.setDate(d.getDate() + x);
      return d.toISOString().split("T")[0] === ts;
    });
    return i >= 0 ? i : 0;
  }, [plan?.start_date, sortedDays]);

  const activeDay = useMemo(
    () => selDay || sortedDays[todayIdx] || sortedDays[0] || null,
    [selDay, sortedDays, todayIdx],
  );

  // ─── Items, next stop ───
  const dayItems = useMemo(() => {
    if (!activeDay) return [];
    return (ibd[activeDay] || []).filter(
      (i) => i.site?.latitude && i.site?.longitude,
    );
  }, [activeDay, ibd]);

  const nextStopId = useMemo(() => {
    const it = dayItems.find((i) => {
      const s = (i.status || "").toLowerCase();
      return s !== "visited" && s !== "skipped";
    });
    return it?.id ?? null;
  }, [dayItems]);

  // Next stop across ALL days (for "preview next day" feature)
  const globalNextStop = useMemo(() => {
    for (const day of sortedDays) {
      for (const it of ibd[day] || []) {
        const s = (it.status || "").toLowerCase();
        if (
          s !== "visited" &&
          s !== "skipped" &&
          it.site?.latitude &&
          it.site?.longitude
        ) {
          return { item: it, day };
        }
      }
    }
    return null;
  }, [sortedDays, ibd]);

  // ─── Pins ───
  const dayPins: MapPin[] = useMemo(() => {
    const di = sortedDays.indexOf(activeDay ?? "");
    const base = DAY_COLORS[di % DAY_COLORS.length];
    return dayItems.map((it, i) => {
      const st = (it.status || "").toLowerCase();
      const isNext = it.id === nextStopId;
      let color = base;
      if (st === "visited") color = STATUS_COLORS.visited;
      else if (st === "skipped") color = STATUS_COLORS.skipped;
      else if (isNext) color = STATUS_COLORS.next;
      return {
        id: it.id || it.site_id || it.site?.id || `${i}`,
        latitude: Number(it.site.latitude),
        longitude: Number(it.site.longitude),
        title: it.site.name,
        subtitle: isNext
          ? t("planner.map.stopSubtitleNext", {
              defaultValue: "Điểm {{index}} • Tiếp theo",
              index: i + 1,
            })
          : st === "visited"
            ? t("planner.map.stopSubtitleVisited", {
                defaultValue: "Điểm {{index}} • Đã viếng ✓",
                index: i + 1,
              })
            : st === "skipped"
              ? t("planner.map.stopSubtitleSkipped", {
                  defaultValue: "Điểm {{index}} • Bỏ qua",
                  index: i + 1,
                })
              : t("planner.map.stopSubtitle", {
                  defaultValue: "Điểm {{index}}",
                  index: i + 1,
                }),
        color,
        icon: `${i + 1}`,
      };
    });
  }, [dayItems, activeDay, sortedDays, nextStopId, t]);

  const allPins: MapPin[] = useMemo(() => {
    const pins: MapPin[] = [];
    const seen = new Set<string>();
    sortedDays.forEach((day, di) => {
      (ibd[day] || []).forEach((it, ii) => {
        const sid = it.site_id || it.site?.id || `${day}_${ii}`;
        if (!it.site?.latitude || !it.site?.longitude || seen.has(sid)) return;
        seen.add(sid);
        pins.push({
          id: it.id || sid,
          latitude: Number(it.site.latitude),
          longitude: Number(it.site.longitude),
          title: it.site.name,
          subtitle: `${t("planner.map.dayPrefix", {
            defaultValue: "Ngày",
          })} ${day}`,
          color: DAY_COLORS[di % DAY_COLORS.length],
          icon: `${ii + 1}`,
        });
      });
    });
    return pins;
  }, [ibd, sortedDays, t]);

  // ─── Multi-point route (between all day waypoints) ───
  const waypoints: RoutePoint[] = useMemo(
    () =>
      dayPins.map((p) => ({ latitude: p.latitude, longitude: p.longitude })),
    [dayPins],
  );

  useEffect(() => {
    if (waypoints.length < 2) {
      setRouteData(null);
      return;
    }
    let off = false;
    (async () => {
      setRouteLoading(true);
      try {
        const r = await calculateMultiPointRoute(
          waypoints,
          plan?.transportation,
        );
        if (!off) setRouteData(r);
      } catch {
        if (!off) setRouteData(null);
      } finally {
        if (!off) setRouteLoading(false);
      }
    })();
    return () => {
      off = true;
    };
  }, [waypoints, plan?.transportation]);

  // ─── LIVE ROUTE: user location → next stop ───
  const nextPin = useMemo(
    () => dayPins.find((p) => p.id === nextStopId) ?? null,
    [dayPins, nextStopId],
  );

  useEffect(() => {
    if (!userLoc || !nextPin) {
      setLiveRoute(null);
      return;
    }

    // Debounce: recalc every 30s or on nextPin change
    const calc = async () => {
      setLiveRouteLoading(true);
      try {
        const r = await calculateRouteWithGeometry(
          { latitude: userLoc.latitude, longitude: userLoc.longitude },
          { latitude: nextPin.latitude, longitude: nextPin.longitude },
          plan?.transportation,
        );
        setLiveRoute(r);
      } catch {
        setLiveRoute(null);
      } finally {
        setLiveRouteLoading(false);
      }
    };

    void calc();

    // Recalculate periodically
    liveRouteTimer.current = setInterval(() => {
      if (userLoc && nextPin) void calc();
    }, 30000);

    return () => {
      if (liveRouteTimer.current) clearInterval(liveRouteTimer.current);
    };
  }, [userLoc?.latitude, userLoc?.longitude, nextPin?.id, plan?.transportation]);

  // ─── Merged route segments for rendering ───
  const routeSegments = useMemo(() => {
    const segs: { coordinates: LngLat[]; color: string }[] = [];
    const di = sortedDays.indexOf(activeDay ?? "");
    const base = DAY_COLORS[di % DAY_COLORS.length];

    // 1) Live route from user → next stop (blue dashed visually, but we use solid blue for now)
    if (liveRoute && liveRoute.coordinates.length >= 2) {
      segs.push({ coordinates: liveRoute.coordinates, color: "#1A67C1" });
    }

    // 2) Inter-stop routes
    if (routeData?.segments.length) {
      routeData.segments.forEach((seg, i) => {
        const it = dayItems[i + 1];
        const st = (it?.status || "").toLowerCase();
        const done = st === "visited" || st === "skipped";
        segs.push({
          coordinates: seg.route.coordinates,
          color: done ? "#C8C8C8" : base,
        });
      });
    }

    return segs;
  }, [liveRoute, routeData, activeDay, sortedDays, dayItems]);

  // ─── Map center ───
  const mapCenter = useMemo(() => {
    if (focusItemId) {
      const fp = dayPins.find((p) => p.id === focusItemId);
      if (fp)
        return { latitude: fp.latitude, longitude: fp.longitude, zoom: 12 };
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

  // ─── Carousel data ───
  const cards: CardData[] = useMemo(() => {
    if (!dayPins.length) return [];
    const out: CardData[] = [];
    for (let i = 0; i < dayPins.length; i++) {
      const seg = i > 0 ? routeData?.segments[i - 1] : null;
      const cumDur = routeData
        ? routeData.segments
            .slice(0, i)
            .reduce((a, s) => a + s.route.durationMinutes, 0)
        : 0;
      const it = dayItems[i];
      const isNext = it?.id === nextStopId;

      // For the next stop, use live route data if available
      const useLive = isNext && liveRoute;
      out.push({
        key: dayPins[i].id,
        fromName:
          i === 0
            ? t("planner.map.yourLocation", { defaultValue: "Vị trí của bạn" })
            : dayPins[i - 1].title,
        toName: dayPins[i].title,
        distKm: useLive ? liveRoute!.distanceKm : (seg?.route.distanceKm ?? 0),
        durMin: useLive
          ? liveRoute!.durationMinutes
          : (seg?.route.durationMinutes ?? 0),
        eta: useLive ? fmtETA(liveRoute!.durationMinutes) : fmtETA(cumDur),
        toLat: dayPins[i].latitude,
        toLng: dayPins[i].longitude,
        status: (it?.status || "").toLowerCase(),
        isNext,
        estTime: it?.estimated_time,
        idx: i + 1,
      });
    }

    // Add preview card for next day's first stop (if current day is all done)
    if (nextStopId === null && activeDay) {
      const curDayIdx = sortedDays.indexOf(activeDay);
      const nextDayKey = sortedDays[curDayIdx + 1];
      if (nextDayKey) {
        const nextDayItems = (ibd[nextDayKey] || []).filter(
          (it) => it.site?.latitude && it.site?.longitude,
        );
        const firstItem = nextDayItems[0];
        if (firstItem) {
          out.push({
            key: `preview-${nextDayKey}`,
            fromName: t("planner.map.nextDay", {
              defaultValue: "Ngày tiếp theo",
            }),
            toName: firstItem.site.name,
            distKm: 0,
            durMin: 0,
            eta: fmtTime(firstItem.estimated_time) || "--:--",
            toLat: Number(firstItem.site.latitude),
            toLng: Number(firstItem.site.longitude),
            status: "preview",
            isNext: false,
            estTime: firstItem.estimated_time,
            idx: 0,
          });
        }
      }
    }
    return out;
  }, [
    dayPins,
    routeData,
    dayItems,
    nextStopId,
    liveRoute,
    activeDay,
    sortedDays,
    ibd,
    t,
  ]);

  // ─── Handlers ───
  const getDayLabel = useCallback(
    (_: string, i: number) => {
      if (!plan?.start_date)
        return t("planner.day", {
          defaultValue: "Ngày {{count}}",
          count: i + 1,
        });
      const d = new Date(plan.start_date);
      d.setDate(d.getDate() + i);
      return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}`;
    },
    [plan?.start_date, t],
  );

  const scrollToCard = useCallback(
    (i: number) => {
      setActiveIdx(i);
      const c = cards[i];
      if (c && mapRef.current) {
        mapRef.current.flyTo(c.toLat, c.toLng, 13);
        setFollowMode(false);
      }
    },
    [cards],
  );

  const centerOnUser = useCallback(() => {
    if (userLoc && mapRef.current) {
      mapRef.current.flyTo(userLoc.latitude, userLoc.longitude, 15);
      setFollowMode(true);
    }
  }, [userLoc]);

  const autoFit = useCallback(() => {
    if (!mapRef.current || !dayPins.length) return;
    const pts = [
      ...dayPins.map((p) => ({ lat: p.latitude, lng: p.longitude })),
    ];
    if (userLoc) pts.push({ lat: userLoc.latitude, lng: userLoc.longitude });
    if (pts.length < 2) return;
    const lats = pts.map((p) => p.lat);
    const lngs = pts.map((p) => p.lng);
    mapRef.current.fitBounds(
      [Math.max(...lngs), Math.max(...lats)],
      [Math.min(...lngs), Math.min(...lats)],
      60,
    );
    setFollowMode(false);
  }, [dayPins, userLoc]);

  const onUserLocUpdate = useCallback(
    (loc: { latitude: number; longitude: number }) => {
      setUserLoc(loc);
      if (followMode && mapRef.current) {
        mapRef.current.flyTo(loc.latitude, loc.longitude, 15);
      }
    },
    [followMode],
  );

  const getDelay = useCallback(
    (c: CardData): string | null => {
      if (!c.estTime || c.status === "visited" || c.status === "skipped")
        return null;
      try {
        const [eh, em] = c.estTime.split(":").map(Number);
        const [ah, am] = c.eta.split(":").map(Number);
        const diff = ah * 60 + am - (eh * 60 + em);
        if (diff > 10)
          return t("planner.map.delayWarning", {
            defaultValue: "Chậm {{minutes}} phút so với kế hoạch",
            minutes: diff,
          });
      } catch {
        /* ignore */
      }
      return null;
    },
    [t],
  );

  const focusSite = useMemo(
    () =>
      focusItemId
        ? (dayPins.find((p) => p.id === focusItemId)?.title ?? null)
        : null,
    [focusItemId, dayPins],
  );

  // ─── Loading / Error ───
  if (loading) {
    return (
      <View style={[st.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }
  if (!plan || error) {
    return (
      <View style={[st.center, { backgroundColor: COLORS.background }]}>
        <Ionicons name="map-outline" size={48} color={COLORS.textTertiary} />
        <Text style={st.errText}>
          {error ||
            t("planner.map.notFound", {
              defaultValue: "Không tìm thấy hành trình",
            })}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={st.errLink}>
            {t("common.back", { defaultValue: "Quay lại" })}
          </Text>
        </TouchableOpacity>
      </View>
    );
  }

  // ═══════════════════════════════════════════════════════════
  // Render
  // ═══════════════════════════════════════════════════════════
  return (
    <View style={st.root}>
      <StatusBar
        barStyle="light-content"
        translucent
        backgroundColor="transparent"
      />

      {/* ── TOP BAR ── */}
      <View
        style={[
          st.topBar,
          { paddingTop: insets.top + (Platform.OS === "android" ? 12 : 8) },
        ]}
      >
        <TouchableOpacity style={st.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <View style={st.topInfo}>
          <Text style={st.topName} numberOfLines={1}>
            {plan.name}
          </Text>
          <Text style={st.topSub}>
            {t("planner.map.stopCount", {
              defaultValue: "{{count}} điểm",
              count: dayPins.length,
            })}
            {activeDay
              ? ` • ${t("planner.map.dayPrefix", {
                  defaultValue: "Ngày",
                })} ${activeDay}`
              : ""}
            {routeData
              ? ` • ${fmtDist(routeData.totalDistanceKm)} • ${fmtDur(routeData.totalDurationMinutes)}`
              : ""}
          </Text>
        </View>
        <TouchableOpacity
          style={st.topBtn}
          onPress={() => setSelDay(null)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name="layers-outline"
            size={22}
            color={selDay === null ? COLORS.accent : "#fff"}
          />
        </TouchableOpacity>
      </View>

      {/* ── DAY TABS ── */}
      {sortedDays.length > 1 && (
        <View style={st.dayBar}>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={st.dayBarInner}
          >
            {sortedDays.map((day, di) => {
              const on = activeDay === day;
              const dc = DAY_COLORS[di % DAY_COLORS.length];
              return (
                <TouchableOpacity
                  key={day}
                  style={[
                    st.dayPill,
                    on && { backgroundColor: dc, borderColor: dc },
                  ]}
                  onPress={() => {
                    setSelDay(day);
                    setActiveIdx(0);
                  }}
                  activeOpacity={0.75}
                >
                  {di === todayIdx && (
                    <View
                      style={[
                        st.todayDot,
                        { backgroundColor: on ? "#fff" : dc },
                      ]}
                    />
                  )}
                  <Text style={[st.dayText, on && { color: "#fff" }]}>
                    {getDayLabel(day, di)}
                  </Text>
                  <Text
                    style={[
                      st.dayCount,
                      on && { color: "rgba(255,255,255,0.8)" },
                    ]}
                  >
                    {t("planner.map.stopCount", {
                      defaultValue: "{{count}} điểm",
                      count: (ibd[day] || []).filter((i) => i.site?.latitude)
                        .length,
                    })}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>
      )}

      {/* ── FOCUS BANNER ── */}
      {focusSite && (
        <View style={st.focusBanner}>
          <Ionicons name="navigate" size={16} color="#DC2626" />
          <Text style={st.focusBannerText} numberOfLines={1}>
            {t("planner.map.previewSite", {
              defaultValue: "Xem trước: {{site}}",
              site: focusSite,
            })}
          </Text>
          <TouchableOpacity
            onPress={() => navigation.setParams({ focusItemId: undefined })}
            style={st.focusBannerBtn}
          >
            <Text style={st.focusBannerBtnText}>
              {t("common.viewAll", { defaultValue: "Xem tất cả" })}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* ── ROUTE LOADING ── */}
      {(routeLoading || liveRouteLoading) && (
        <View style={st.routeBar}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <Text style={st.routeBarText}>
            {liveRouteLoading
              ? t("planner.map.calculatingNextRoute", {
                  defaultValue: "Đang tính đường đến điểm tiếp theo...",
                })
              : t("planner.map.calculatingRoute", {
                  defaultValue: "Đang tính tuyến đường...",
                })}
          </Text>
        </View>
      )}

      {/* ── LIVE ROUTE INFO BANNER ── */}
      {liveRoute && nextPin && !routeLoading && !liveRouteLoading && (
        <View style={st.liveBanner}>
          <Ionicons name="navigate-circle" size={18} color="#1A67C1" />
          <Text style={st.liveBannerText}>
            {t("planner.map.liveRouteBanner", {
              defaultValue:
                "Đến {{site}}: {{distance}} • {{duration}} • ETA {{eta}}",
              site: nextPin.title,
              distance: fmtDist(liveRoute.distanceKm),
              duration: fmtDur(liveRoute.durationMinutes),
              eta: fmtETA(liveRoute.durationMinutes),
            })}
          </Text>
        </View>
      )}

      {/* ── MAP ── */}
      <View style={st.mapWrap}>
        {dayPins.length === 0 ? (
          <View style={st.emptyMap}>
            <Ionicons
              name="map-outline"
              size={56}
              color={COLORS.textTertiary}
            />
            <Text style={st.emptyText}>
              {t("planner.map.emptyDay", {
                defaultValue: "Ngày này chưa có điểm hành hương",
              })}
            </Text>
          </View>
        ) : (
          <VietmapView
            ref={mapRef}
            key={activeDay ?? "all"}
            style={st.map}
            initialRegion={mapCenter}
            pins={dayPins}
            showUserLocation
            showInfoCards
            routeSegments={routeSegments}
            cardBottomOffset={8}
            onUserLocationUpdate={onUserLocUpdate}
          />
        )}

        {/* ── FABs ── */}
        {dayPins.length > 0 && (
          <View
            style={[
              st.fabCol,
              { bottom: insets.bottom + (cards.length > 0 ? 165 : 24) },
            ]}
          >
            <TouchableOpacity
              style={st.fab}
              onPress={autoFit}
              activeOpacity={0.8}
            >
              <Ionicons
                name="scan-outline"
                size={20}
                color={COLORS.textPrimary}
              />
            </TouchableOpacity>
            <TouchableOpacity
              style={[st.fab, followMode && st.fabActive]}
              onPress={centerOnUser}
              activeOpacity={0.8}
            >
              <Ionicons
                name={followMode ? "navigate" : "navigate-outline"}
                size={20}
                color={followMode ? "#fff" : COLORS.textPrimary}
              />
            </TouchableOpacity>
          </View>
        )}
      </View>

      {/* ── CAROUSEL ── */}
      {cards.length > 0 && (
        <View
          style={[
            st.carousel,
            { paddingBottom: Math.max(insets.bottom, 12) + 4 },
          ]}
        >
          <FlatList
            data={cards}
            horizontal
            snapToInterval={CARD_WIDTH + CARD_GAP}
            snapToAlignment="start"
            decelerationRate="fast"
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={{ paddingHorizontal: 16 }}
            keyExtractor={(c) => c.key}
            onMomentumScrollEnd={(e) => {
              const i = Math.round(
                e.nativeEvent.contentOffset.x / (CARD_WIDTH + CARD_GAP),
              );
              if (i >= 0 && i < cards.length) scrollToCard(i);
            }}
            renderItem={({ item: c, index: i }) => (
              <SegCard
                card={c}
                active={i === activeIdx}
                delay={getDelay(c)}
                onPress={() => scrollToCard(i)}
              />
            )}
          />
        </View>
      )}
    </View>
  );
}

// ─── SegCard (memoized) ──────────────────────────────────────
const SegCard = React.memo(function SegCard({
  card: c,
  active,
  delay,
  onPress,
}: {
  card: CardData;
  active: boolean;
  delay: string | null;
  onPress: () => void;
}) {
  const { t } = useTranslation();
  const vis = c.status === "visited";
  const skip = c.status === "skipped";
  const preview = c.status === "preview";
  const done = vis || skip;
  const est = fmtTime(c.estTime);

  return (
    <TouchableOpacity
      style={[
        st.card,
        active && st.cardOn,
        vis && st.cardVis,
        skip && st.cardSkip,
        preview && st.cardPreview,
      ]}
      onPress={onPress}
      activeOpacity={0.92}
    >
      {/* Row 1 */}
      <View style={st.cardR1}>
        <View
          style={[
            st.badge,
            done && {
              backgroundColor: vis
                ? STATUS_COLORS.visited
                : STATUS_COLORS.skipped,
            },
            preview && { backgroundColor: "#6366F1" },
          ]}
        >
          {vis ? (
            <Ionicons name="checkmark" size={14} color="#fff" />
          ) : preview ? (
            <Ionicons name="eye-outline" size={14} color="#fff" />
          ) : (
            <Text style={st.badgeText}>{c.idx}</Text>
          )}
        </View>
        <View style={st.cardNameW}>
          <Text
            style={[st.cardName, done && { color: COLORS.textTertiary }]}
            numberOfLines={1}
          >
            {c.toName}
          </Text>
          {c.idx > 1 && !preview && (
            <Text style={st.cardFrom} numberOfLines={1}>
              {t("planner.map.from", { defaultValue: "Từ" })}: {c.fromName}
            </Text>
          )}
          {preview && (
            <Text style={st.cardFrom}>
              {t("planner.map.previewNextDay", {
                defaultValue: "Xem trước ngày tiếp theo",
              })}
            </Text>
          )}
        </View>
        {c.isNext && !done && (
          <View style={st.tNext}>
            <View style={st.tDot} />
            <Text style={st.tNextT}>
              {t("planner.map.next", { defaultValue: "Tiếp theo" })}
            </Text>
          </View>
        )}
        {vis && (
          <View style={st.tVis}>
            <Text style={st.tVisT}>
              {t("planner.statusVisited", { defaultValue: "Đã viếng" })}
            </Text>
          </View>
        )}
        {skip && (
          <View style={st.tSkip}>
            <Text style={st.tSkipT}>
              {t("planner.statusSkipped", { defaultValue: "Bỏ qua" })}
            </Text>
          </View>
        )}
        {preview && (
          <View style={st.tPreview}>
            <Text style={st.tPreviewT}>
              {t("planner.map.preview", { defaultValue: "Xem trước" })}
            </Text>
          </View>
        )}
      </View>

      {/* Row 2: Metrics */}
      <View style={st.cardR2}>
        {c.distKm > 0 && (
          <>
            <View style={st.met}>
              <Ionicons
                name="car-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={st.metV}>{fmtDist(c.distKm)}</Text>
            </View>
            <Text style={st.metS}>•</Text>
            <View style={st.met}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={st.metV}>{fmtDur(c.durMin)}</Text>
            </View>
            <Text style={st.metS}>•</Text>
          </>
        )}
        <View style={st.met}>
          <Ionicons name="flag-outline" size={13} color={COLORS.holy} />
          <Text style={[st.metV, { color: COLORS.holy, fontWeight: "800" }]}>
            {est
              ? t("planner.map.estimated", {
                  defaultValue: "Dự kiến {{time}}",
                  time: est,
                })
              : `ETA ${c.eta}`}
          </Text>
        </View>
      </View>

      {delay && (
        <View style={st.warn}>
          <Ionicons name="alert-circle" size={13} color="#D97706" />
          <Text style={st.warnT}>{delay}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
});

// ─── Styles ──────────────────────────────────────────────────
const st = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center", gap: 12 },
  errText: { color: COLORS.textSecondary, fontSize: 15, textAlign: "center" },
  errLink: { color: COLORS.accent, fontWeight: "700", fontSize: 15 },

  topBar: {
    backgroundColor: COLORS.holy,
    paddingHorizontal: 14,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    ...SHADOWS.small,
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center",
    justifyContent: "center",
  },
  topInfo: { flex: 1 },
  topName: {
    color: "#fff",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  topSub: { color: "rgba(255,255,255,0.7)", fontSize: 12, marginTop: 2 },

  dayBar: {
    backgroundColor: COLORS.white,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  dayBarInner: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    gap: 8,
    flexDirection: "row",
  },
  dayPill: {
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
  todayDot: { width: 6, height: 6, borderRadius: 3 },
  dayText: { fontSize: 13, fontWeight: "600", color: COLORS.textSecondary },
  dayCount: { fontSize: 11, color: COLORS.textTertiary, marginLeft: 2 },

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
  focusBannerBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  focusBannerBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  routeBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 6,
    backgroundColor: "rgba(207,170,58,0.1)",
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  routeBarText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },

  // Live route info banner
  liveBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.md,
    paddingVertical: 8,
    backgroundColor: "#EFF6FF",
    borderBottomWidth: 1,
    borderBottomColor: "#BFDBFE",
  },
  liveBannerText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "700",
    color: "#1D4ED8",
  },

  mapWrap: { flex: 1 },
  map: { flex: 1, borderRadius: 0 },
  emptyMap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    backgroundColor: COLORS.background,
  },
  emptyText: { color: COLORS.textTertiary, fontSize: 14, fontStyle: "italic" },

  fabCol: {
    position: "absolute",
    right: 14,
    gap: 10,
    alignItems: "center",
    zIndex: 20,
  },
  fab: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: COLORS.white,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  fabActive: { backgroundColor: COLORS.info, borderColor: COLORS.info },

  carousel: {
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingTop: 10,
    ...SHADOWS.medium,
  },

  card: {
    width: CARD_WIDTH,
    marginRight: CARD_GAP,
    backgroundColor: COLORS.surface0,
    borderRadius: 14,
    padding: 12,
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
    ...SHADOWS.small,
  },
  cardOn: {
    borderColor: COLORS.holy,
    backgroundColor: "#FFFDF7",
    ...SHADOWS.medium,
  },
  cardVis: {
    borderColor: "#BBF7D0",
    backgroundColor: "#F0FFF5",
    opacity: 0.85,
  },
  cardSkip: {
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
    opacity: 0.7,
  },
  cardPreview: {
    borderColor: "#C7D2FE",
    backgroundColor: "#EEF2FF",
    borderStyle: "dashed" as any,
  },

  cardR1: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.holy,
    alignItems: "center",
    justifyContent: "center",
  },
  badgeText: { color: "#fff", fontSize: 13, fontWeight: "900" },
  cardNameW: { flex: 1, minWidth: 0 },
  cardName: { fontSize: 14, fontWeight: "800", color: COLORS.textPrimary },
  cardFrom: { fontSize: 11, color: COLORS.textTertiary, marginTop: 1 },

  tNext: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#DC2626" },
  tNextT: { fontSize: 10, fontWeight: "700", color: "#DC2626" },
  tVis: {
    backgroundColor: "#DCFCE7",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tVisT: { fontSize: 10, fontWeight: "700", color: "#16A34A" },
  tSkip: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tSkipT: { fontSize: 10, fontWeight: "700", color: "#6B7280" },
  tPreview: {
    backgroundColor: "#E0E7FF",
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tPreviewT: { fontSize: 10, fontWeight: "700", color: "#4338CA" },

  cardR2: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
    gap: 4,
    flexWrap: "wrap",
  },
  met: { flexDirection: "row", alignItems: "center", gap: 3 },
  metV: { fontSize: 12, fontWeight: "600", color: COLORS.textSecondary },
  metS: { fontSize: 10, color: COLORS.textLight, marginHorizontal: 1 },

  warn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "#FFFBEB",
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 8,
    marginTop: 4,
    borderWidth: 1,
    borderColor: "#FDE68A",
  },
  warnT: { fontSize: 11, fontWeight: "600", color: "#D97706", flex: 1 },
});
