import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";
import { NearbyPlaceCard } from "../../../site/components/NearbyPlaceCard";
import {
  useSiteDetail,
  useSiteEvents,
  useSiteMassSchedules,
  useSiteMedia,
  useSiteNearbyPlaces,
} from "../../../../../hooks/useSites";
import { DayOfWeek } from "../../../../../types";
import type { SiteEvent } from "../../../../../types/pilgrim";

type TFn = (key: string, options?: Record<string, unknown>) => string;

interface Props {
  siteId: string | undefined;
  isOffline: boolean;
  t: TFn;
}

const formatDays = (days: DayOfWeek[], t: TFn): string => {
  if (days.includes(0) && days.length === 1) return t("planner.dayNames.sunday");
  if (days.length === 6 && !days.includes(0)) return t("planner.dayNames.weekday");
  if (days.includes(6) && days.length === 1) return t("planner.dayNames.saturday");
  return days
    .map((d) => (d === 0 ? t("planner.dayNames.sun") : t(`planner.dayNames.${["mon", "tue", "wed", "thu", "fri", "sat"][d - 1]}`)))
    .join(", ");
};

function mapNearbyCategory(
  cat: string,
): "hotel" | "restaurant" | "church" | "medical" | "other" {
  if (cat === "lodging") return "hotel";
  if (cat === "food") return "restaurant";
  if (cat === "medical") return "medical";
  return "other";
}

/**
 * Khối thông tin địa điểm (media, lịch lễ, sự kiện, lân cận) — cùng nguồn Site Detail,
 * dùng trong planner để tham khảo khi sắp lịch (không phải hành động hành hương).
 */
export default function ItemDetailSiteInfoSections({
  siteId,
  isOffline,
  t,
}: Props) {
  const [descExpanded, setDescExpanded] = useState(false);

  const canFetch = !!siteId && !isOffline;

  const { site, isLoading: loadingSite } = useSiteDetail(siteId, {
    autoFetch: canFetch,
  });
  const { media, isLoading: loadingMedia } = useSiteMedia(siteId, {
    autoFetch: canFetch,
    params: { limit: 12, type: "image" },
  });
  const { schedules, isLoading: loadingSchedules } = useSiteMassSchedules(
    siteId,
    { autoFetch: canFetch },
  );
  const { events, isLoading: loadingEvents } = useSiteEvents(siteId, {
    autoFetch: canFetch,
    params: { upcoming: "true", limit: 6 },
  });
  const { places, isLoading: loadingPlaces } = useSiteNearbyPlaces(siteId, {
    autoFetch: canFetch,
    params: { limit: 10 },
  });

  const scheduleLines = useMemo(() => {
    if (!schedules?.length) return [];
    return schedules.map((s) => {
      const rawDays = (s as { days_of_week?: DayOfWeek[] }).days_of_week;
      const dayStr = formatDays((rawDays ?? []) as DayOfWeek[], t);
      const timeStr = s.time?.substring(0, 5) ?? "";
      const note = s.note ? ` (${s.note})` : "";
      return `${dayStr}: ${timeStr}${note}`;
    });
  }, [schedules, t]);

  if (!siteId) {
    return (
      <Text style={styles.muted}>
        {t("planner.itemDetailNoSiteId")}
      </Text>
    );
  }

  if (isOffline) {
    return (
      <View style={styles.offlineBanner}>
        <Ionicons name="cloud-offline-outline" size={20} color="#C2410C" />
        <Text style={styles.offlineText}>
          {t("planner.itemDetailSiteInfoOffline")}
        </Text>
      </View>
    );
  }

  const loadingAny =
    loadingSite && !site && (loadingMedia || loadingSchedules || loadingEvents);

  return (
    <View style={styles.wrap}>
      <Text style={styles.sectionHead}>
        {t("planner.itemDetailDiscoverTitle")}
      </Text>
      <Text style={styles.sectionSub}>
        {t("planner.itemDetailDiscoverSubtitle")}
      </Text>

      {loadingAny ? (
        <View style={styles.centerRow}>
          <ActivityIndicator color={COLORS.accent} />
        </View>
      ) : null}

      {site?.description ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("planner.aboutSite")}
          </Text>
          <Text
            style={styles.body}
            numberOfLines={descExpanded ? undefined : 5}
          >
            {site.description}
          </Text>
          {site.description.length > 200 ? (
            <TouchableOpacity
              onPress={() => setDescExpanded(!descExpanded)}
              style={styles.readMore}
            >
              <Text style={styles.readMoreText}>
                {descExpanded
                  ? t("common.collapse", { defaultValue: "Thu gọn" })
                  : t("common.readMore", { defaultValue: "Đọc thêm" })}
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}

      {loadingMedia ? (
        <View style={styles.centerRow}>
          <ActivityIndicator size="small" color={COLORS.accent} />
        </View>
      ) : media && media.length > 0 ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>
            {t("planner.mediaGallery")}
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {media.map((m, i) => (
              <View key={m.id || i} style={styles.galleryItem}>
                <Image
                  source={{ uri: m.url }}
                  style={styles.galleryImg}
                  resizeMode="cover"
                />
                {m.type === "video" ? (
                  <View style={styles.playBadge}>
                    <Ionicons name="play" size={18} color="#fff" />
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      ) : null}

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="calendar-outline" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitle}>
            {t("planner.massSchedule")}
          </Text>
        </View>
        {loadingSchedules ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : scheduleLines.length > 0 ? (
          scheduleLines.map((line, idx) => (
            <Text key={idx} style={styles.scheduleLine}>
              • {line}
            </Text>
          ))
        ) : (
          <Text style={styles.muted}>
            {t("planner.massScheduleEmpty")}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="ticket-outline" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitleInRow}>
            {t("planner.upcomingEvents")}
          </Text>
        </View>
        {loadingEvents ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : events && events.length > 0 ? (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.hScroll}
          >
            {events.map((ev: SiteEvent) => {
              const d = new Date(ev.start_date);
              return (
                <View key={ev.id} style={styles.eventCard}>
                  {ev.banner_url ? (
                    <Image
                      source={{ uri: ev.banner_url }}
                      style={styles.eventCardImg}
                      resizeMode="cover"
                    />
                  ) : (
                    <LinearGradient
                      colors={[COLORS.primary, "#4A3B2A"]}
                      style={styles.eventCardImg}
                    />
                  )}
                  <LinearGradient
                    colors={["transparent", "rgba(0,0,0,0.85)"]}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.eventDateBadge}>
                    <Text style={styles.eventDay}>{d.getDate()}</Text>
                    <Text style={styles.eventMonth}>
                      THG {d.getMonth() + 1}
                    </Text>
                  </View>
                  <Text style={styles.eventName} numberOfLines={2}>
                    {ev.name}
                  </Text>
                </View>
              );
            })}
          </ScrollView>
        ) : (
          <Text style={styles.muted}>
            {t("planner.eventsEmpty")}
          </Text>
        )}
      </View>

      <View style={styles.card}>
        <View style={styles.cardTitleRow}>
          <Ionicons name="map-outline" size={20} color={COLORS.accent} />
          <Text style={styles.cardTitleInRow}>
            {t("planner.nearbyAreaTitle")}
          </Text>
        </View>
        {loadingPlaces ? (
          <ActivityIndicator size="small" color={COLORS.accent} />
        ) : places && places.length > 0 ? (
          places.map((place, index) => (
            <NearbyPlaceCard
              key={place.id || index}
              name={place.name}
              address={place.address}
              distance={
                place.distance_meters != null
                  ? place.distance_meters >= 1000
                    ? `${(place.distance_meters / 1000).toFixed(1)} km`
                    : `${Math.round(place.distance_meters)} m`
                  : "—"
              }
              type={mapNearbyCategory(place.category || "other")}
            />
          ))
        ) : (
          <Text style={styles.muted}>
            {t("planner.nearbyEmpty")}
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginTop: SPACING.sm,
    paddingBottom: SPACING.lg,
  },
  sectionHead: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.primary,
    letterSpacing: 0.3,
    marginBottom: 4,
  },
  sectionSub: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
    lineHeight: 18,
  },
  centerRow: {
    paddingVertical: SPACING.md,
    alignItems: "center",
  },
  card: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  cardTitleInRow: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  body: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 22,
  },
  readMore: {
    marginTop: SPACING.sm,
    alignSelf: "flex-start",
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.accent,
  },
  hScroll: {
    gap: SPACING.sm,
    paddingVertical: 4,
  },
  galleryItem: {
    width: 120,
    height: 88,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    marginRight: SPACING.sm,
    backgroundColor: COLORS.backgroundSoft,
  },
  galleryImg: {
    width: "100%",
    height: "100%",
  },
  playBadge: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
    alignItems: "center",
    justifyContent: "center",
  },
  scheduleLine: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: 4,
  },
  eventCard: {
    position: "relative",
    width: 200,
    height: 130,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
    marginRight: SPACING.sm,
    backgroundColor: COLORS.primary,
  },
  eventCardImg: {
    ...StyleSheet.absoluteFillObject,
  },
  eventDateBadge: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignItems: "center",
    zIndex: 2,
  },
  eventDay: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  eventMonth: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  eventName: {
    position: "absolute",
    bottom: 8,
    left: 8,
    right: 8,
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
    zIndex: 2,
  },
  muted: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  offlineBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    backgroundColor: "#FFF7ED",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: "#FDBA74",
    marginTop: SPACING.sm,
  },
  offlineText: {
    flex: 1,
    fontSize: 13,
    color: "#9A3412",
    lineHeight: 20,
  },
});
