import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { calculateEndTime, parseDurationToMinutes } from "../../utils/time";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";

type DayTab = {
  key: string;
  label: string;
  isToday?: boolean;
  totalStops?: number;
  handledStops?: number;
};

type Props = {
  days: DayTab[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
  items: any[];
  /** Called when user taps the "view route" icon on a timeline item */
  onViewRoute?: (item: any) => void;
  /** Called when user taps rate action on checked/visited item */
  onRateSite?: (item: any) => void;
  isOwner?: boolean;
  onItemAction?: (item: any) => void;
};

export default function TimelineDaySection({
  days,
  selectedDay,
  onSelectDay,
  items,
  onViewRoute,
  onRateSite,
  isOwner,
  onItemAction,
}: Props) {
  const { t, i18n } = useTranslation();
  const scrollRef = React.useRef<ScrollView>(null);
  const dayLayoutsRef = React.useRef<Record<string, { x: number; width: number }>>({});
  const { width: screenWidth } = useWindowDimensions();

  const centerSelectedDay = React.useCallback(() => {
    const selectedLayout = dayLayoutsRef.current[selectedDay];
    if (!selectedLayout || !scrollRef.current) return;

    // Keep selected chip near start with margin to avoid partially clipped previous chips.
    const targetX = Math.max(0, selectedLayout.x - 14);
    scrollRef.current.scrollTo({ x: targetX, animated: true });
  }, [selectedDay]);

  React.useEffect(() => {
    const timer = setTimeout(centerSelectedDay, 90);
    return () => clearTimeout(timer);
  }, [centerSelectedDay, days]);

  return (
    <View style={styles.container}>
      <View style={{ flexGrow: 0, flexShrink: 0, marginBottom: 0 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBar}
          onContentSizeChange={centerSelectedDay}
          decelerationRate="normal"
        >
          {days.map((d) => {
            const isActive = d.key === selectedDay;
            const dateInfo = (() => {
              try {
                const date = new Date(d.label);
                if (isNaN(date.getTime())) throw new Error();
                
                if (i18n.language === "vi") {
                  const day = date.getDate();
                  const month = date.getMonth() + 1;
                  return { day: day.toString(), month: `Th${month}` };
                } else {
                  const day = date.getDate();
                  const month = date.toLocaleString("en-US", { month: "short" });
                  return { day: day.toString(), month };
                }
              } catch {
                return { day: d.label, month: "" };
              }
            })();

            const primaryLabel = i18n.language === "vi"
              ? `${dateInfo.day} ${dateInfo.month}`
              : `${dateInfo.month} ${dateInfo.day}`;
            const secondaryLabel = t("planner.dayWithNumber", { day: d.key });
            const totalStops = Number(d.totalStops || 0);
            const handledStops = Math.min(totalStops, Number(d.handledStops || 0));
            const isDayCompleted = totalStops > 0 && handledStops === totalStops;
            const hasProgress = totalStops > 0 && handledStops > 0;

            return (
              <TouchableOpacity
                key={d.key}
                style={styles.pillTouch}
                onPress={() => onSelectDay(d.key)}
                activeOpacity={0.8}
                onLayout={(event) => {
                  const { x, width } = event.nativeEvent.layout;
                  dayLayoutsRef.current[d.key] = { x, width };
                }}
              >
                {isActive ? (
                  <LinearGradient
                    colors={["#8B6A42", "#A58256"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.pillActive}
                  >
                    <View style={styles.pillMetaRow}>
                      <View
                        style={[
                          styles.pillProgressDot,
                          isDayCompleted
                            ? styles.pillProgressDotCompleted
                            : hasProgress
                              ? styles.pillProgressDotInProgress
                              : styles.pillProgressDotPending,
                        ]}
                      />
                      <Text style={[styles.pillProgressText, styles.pillProgressTextActive]}>
                        {totalStops > 0
                          ? `${handledStops}/${totalStops}`
                          : t("planner.noneShort", { defaultValue: "0" })}
                      </Text>
                    </View>
                    <Text style={[styles.pillPrimaryText, styles.pillTextActive]}>
                      {primaryLabel}
                    </Text>
                    <Text style={[styles.pillSecondaryText, styles.pillSecondaryTextActive]}>
                      {d.isToday
                        ? t("planner.today", { defaultValue: "Hôm nay" })
                        : secondaryLabel}
                    </Text>
                  </LinearGradient>
                ) : (
                  <View style={styles.pillInactive}>
                    <View style={styles.pillMetaRow}>
                      <View
                        style={[
                          styles.pillProgressDot,
                          isDayCompleted
                            ? styles.pillProgressDotCompleted
                            : hasProgress
                              ? styles.pillProgressDotInProgress
                              : styles.pillProgressDotPending,
                        ]}
                      />
                      <Text style={[styles.pillProgressText, styles.pillProgressTextInactive]}>
                        {totalStops > 0
                          ? `${handledStops}/${totalStops}`
                          : t("planner.noneShort", { defaultValue: "0" })}
                      </Text>
                    </View>
                    <Text style={[styles.pillPrimaryText, styles.pillTextInactive]}>
                      {primaryLabel}
                    </Text>
                    <Text style={[styles.pillSecondaryText, styles.pillSecondaryTextInactive]}>
                      {d.isToday
                        ? t("planner.today", { defaultValue: "Hôm nay" })
                        : secondaryLabel}
                    </Text>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      {/* TIMELINE LIST - Wrapped in a single professional card */}
      <View style={styles.card}>
        {items.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="calendar-outline" size={32} color={COLORS.textTertiary} />
            <Text style={styles.emptyText}>{t("planner.noScheduleForThisDay")}</Text>
          </View>
        ) : (
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          >
            {items.map((item, idx) => {
              const status = (item.status || "").toLowerCase();
              const isVisited = status === "visited";
              const isCheckedIn = status === "checked_in";
              const isSkipped = status === "skipped";
              const isNext = item.is_next;
              const isDone = isVisited || isSkipped;
              const isReviewEligible = isVisited || isCheckedIn;
              const isEventStop = !!item?.event_id;
              const nearbyCount = Array.isArray(item?.nearby_amenity_ids)
                ? item.nearby_amenity_ids.length
                : 0;
              const travelTimeMin = Number(item?.travel_time_minutes || 0);
              const travelDistanceKm = Number(item?.travel_distance_km || 0);
              const hasTravelInfo = travelTimeMin > 0 || travelDistanceKm > 0;
              const formatDurationToHourDay = (minutes: number): string => {
                if (minutes <= 0) return "";

                if (minutes >= 24 * 60) {
                  const day = Math.floor(minutes / (24 * 60));
                  const hourRemainder = Math.round((minutes - day * 24 * 60) / 60);
                  if (hourRemainder > 0) {
                    return `${day} ngày ${hourRemainder} giờ`;
                  }
                  return `${day} ngày`;
                }

                const hours = minutes / 60;
                const rounded = Number(hours.toFixed(1));
                return `${rounded.toLocaleString("vi-VN")} giờ`;
              };

              const travelInfoText = (() => {
                if (!hasTravelInfo) return "";

                const minutesPart =
                  travelTimeMin > 0
                    ? formatDurationToHourDay(travelTimeMin)
                    : "";

                const distancePart =
                  travelDistanceKm > 0
                    ? t("planner.travelDistanceKm", {
                        defaultValue: "{{distance}} km",
                        distance: Number(travelDistanceKm.toFixed(1)).toLocaleString("vi-VN"),
                      })
                    : "";

                if (minutesPart && distancePart) {
                  return `${minutesPart} • ${distancePart}`;
                }

                return minutesPart || distancePart;
              })();
              const travelLegLabel = idx === 0 ? "Xuất phát" : "Chặng trước";

              const formatTimeOnly = (t?: string) => {
                if (!t) return "—";
                const p = t.split(":");
                return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
              };

              const startTime = formatTimeOnly(item.arrival_time || item.estimated_time);
              const restMinutes = parseDurationToMinutes(item.rest_duration);
              const endTime = item.departure_time
                ? formatTimeOnly(item.departure_time)
                : restMinutes > 0
                  ? calculateEndTime(item.arrival_time || item.estimated_time, item.rest_duration)
                  : "--:--";
              const isEstimatedEndTime = !item.departure_time && restMinutes > 0;
              const isUnknownEndTime = endTime === "--:--";

              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* LEFT: THUMBNAIL */}
                  <View style={styles.thumbContainer}>
                    <Image
                      source={{
                        uri: item.site?.image || item.site?.cover_image || "https://via.placeholder.com/60",
                      }}
                      style={[
                        styles.thumb,
                        isVisited && styles.thumbDone,
                        isSkipped && styles.thumbSkipped,
                      ]}
                    />
                  </View>

                  {/* RIGHT: CONTENT */}
                  <View style={styles.contentCol}>
                    <Text
                      style={[
                        styles.siteName,
                        isVisited && styles.siteNameDone,
                        isSkipped && styles.siteNameSkipped,
                      ]}
                      numberOfLines={1}
                    >
                      {item.site?.name || t("planner.siteNameUnknown")}
                    </Text>

                    <View style={styles.timeRow}>
                      <Ionicons 
                        name="time-outline" 
                        size={14} 
                        color={isDone ? "#6B7280" : "#4B5563"} 
                      />
                      <Text style={[styles.timeText, isNext && styles.timeNext, isVisited && styles.timeDone]}>
                        {startTime}
                      </Text>
                      <Text style={styles.timeRangeDivider}>-</Text>
                      <Text
                        style={[
                          styles.timeText,
                          styles.timeEndText,
                          isVisited && styles.timeDone,
                          isEstimatedEndTime && styles.timeEstimated,
                          isUnknownEndTime && styles.timeUnknown,
                        ]}
                      >
                        {endTime}
                      </Text>
                      {isNext && (
                        <View style={styles.nextBadge}>
                          <Text style={styles.nextBadgeText}>{t("planner.statusNext")}</Text>
                        </View>
                      )}
                      {isVisited && <View style={styles.visitedBadge}><Text style={styles.visitedBadgeText}>{t("planner.statusVisited")}</Text></View>}
                      {isSkipped && <View style={styles.skippedBadge}><Text style={styles.skippedBadgeText}>{t("planner.statusSkipped")}</Text></View>}
                    </View>

                    {!!item.site?.address && !isVisited && !isSkipped && (
                      <Text style={styles.addressText} numberOfLines={1}>
                        {item.site.address}
                      </Text>
                    )}

                    {(isEventStop || nearbyCount > 0 || hasTravelInfo) && (
                      <View style={styles.itemMetaRow}>
                        {isEventStop && (
                          <View style={styles.itemMetaChip}>
                            <Ionicons name="sparkles-outline" size={12} color="#7C3AED" />
                            <Text style={styles.itemMetaChipText}>
                              {t("planner.eventStop", { defaultValue: "Sự kiện" })}
                            </Text>
                          </View>
                        )}
                        {nearbyCount > 0 && (
                          <View style={styles.itemMetaChip}>
                            <Ionicons name="restaurant-outline" size={12} color="#0EA5A4" />
                            <Text style={styles.itemMetaChipText}>
                              {t("planner.nearbyCount", {
                                defaultValue: "+{{count}} nearby",
                                count: nearbyCount,
                              })}
                            </Text>
                          </View>
                        )}
                        {hasTravelInfo && (
                          <View style={styles.itemMetaChip}>
                            <Ionicons name="navigate-outline" size={12} color="#2563EB" />
                            <Text style={styles.itemMetaChipText}>
                              {`${travelLegLabel} • ${travelInfoText}`}
                            </Text>
                          </View>
                        )}
                      </View>
                    )}
                  </View>

                  {/* ACTION ICONS: Owner sees menu, Member sees route preview */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {isReviewEligible && onRateSite ? (
                      <TouchableOpacity
                        style={styles.rateBtn}
                        onPress={() => onRateSite(item)}
                        hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                        activeOpacity={0.75}
                      >
                        <Ionicons name="star-outline" size={16} color="#B45309" />
                        <Text style={styles.rateBtnText}>
                          {t("common.write", { defaultValue: "Viết" })}
                        </Text>
                      </TouchableOpacity>
                    ) : (
                      !isVisited &&
                      !isSkipped && (
                        <>
                          {isOwner && onItemAction ? (
                            <TouchableOpacity
                              style={styles.actionMenuBtn}
                              onPress={() => onItemAction(item)}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="ellipsis-vertical" size={20} color={COLORS.textSecondary} />
                            </TouchableOpacity>
                          ) : onViewRoute && item.site?.latitude ? (
                            <TouchableOpacity
                              style={styles.routePreviewBtn}
                              onPress={() => onViewRoute(item)}
                              hitSlop={{ top: 8, bottom: 8, left: 6, right: 6 }}
                              activeOpacity={0.7}
                            >
                              <Ionicons name="navigate-outline" size={18} color={COLORS.holy} />
                            </TouchableOpacity>
                          ) : null}
                        </>
                      )
                    )}
                  </View>
                </View>
              );
            })}
          </ScrollView>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // DATE TABS (Unified Pill Design)
  tabBar: {
    paddingBottom: 10,
    gap: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  pillActive: {
    minWidth: 128,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "rgba(138, 106, 66, 0.65)",
    ...SHADOWS.small,
  },
  pillInactive: {
    backgroundColor: COLORS.white,
    minWidth: 124,
    height: 56,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.subtle,
  },
  pillTouch: {
    borderRadius: 18,
  },
  pillPrimaryText: {
    fontSize: 19,
    lineHeight: 22,
    fontWeight: "800",
    letterSpacing: 0.1,
  },
  pillSecondaryText: {
    marginTop: 1,
    fontSize: 11,
    lineHeight: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: "#fff",
  },
  pillSecondaryTextActive: {
    color: "rgba(255,255,255,0.9)",
  },
  pillTextInactive: {
    color: "#4B3A2B",
  },
  pillSecondaryTextInactive: {
    color: COLORS.textSecondary,
  },
  pillMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-end",
    gap: 4,
    marginBottom: 2,
  },
  pillProgressDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  pillProgressDotCompleted: {
    backgroundColor: "#16A34A",
  },
  pillProgressDotInProgress: {
    backgroundColor: "#F59E0B",
  },
  pillProgressDotPending: {
    backgroundColor: "#9CA3AF",
  },
  pillProgressText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.1,
  },
  pillProgressTextActive: {
    color: "rgba(255,255,255,0.9)",
  },
  pillProgressTextInactive: {
    color: COLORS.textTertiary,
  },

  // CARD CONTAINER
  card: {
    flex: 1,
    backgroundColor: "#FFFEFC",
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.16)",
  },
  listContent: {
    padding: 12,
    paddingBottom: 24,
  },

  // TIMELINE ROWS
  timelineRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    padding: 12,
    backgroundColor: "#FCFAF5",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.14)",
    ...SHADOWS.small,
  },
  thumbContainer: {
    ...SHADOWS.small,
  },
  thumb: {
    width: 64,
    height: 64,
    borderRadius: 12,
    backgroundColor: COLORS.background,
  },
  thumbDone: {
    opacity: 0.4,
  },
  thumbSkipped: {
    opacity: 0.65,
  },

  // Content
  contentCol: {
    flex: 1,
    marginLeft: 12,
    justifyContent: "center",
  },
  siteName: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  siteNameDone: {
    color: "#6B7280",
    textDecorationLine: "line-through",
  },
  siteNameSkipped: {
    color: "#86654A",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#374151",
  },
  timeRangeDivider: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginHorizontal: 2,
  },
  timeEndText: {
    color: "#4B5563",
  },
  timeEstimated: {
    color: "#6D4C41",
  },
  timeUnknown: {
    color: "#9CA3AF",
    fontWeight: "700",
  },
  timeNext: {
    color: COLORS.holy,
  },
  timeDone: {
    color: "#6B7280",
  },
  itemMetaRow: {
    marginTop: 6,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
  },
  itemMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 999,
    backgroundColor: "#F6F3EA",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.16)",
  },
  itemMetaChipText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#4B5563",
  },

  // Badges
  nextBadge: {
    backgroundColor: COLORS.divine,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  nextBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: COLORS.holy,
    textTransform: "uppercase",
  },
  visitedBadge: {
    backgroundColor: "#E8F5E9",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  visitedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#2E7D32",
    textTransform: "uppercase",
  },
  skippedBadge: {
    backgroundColor: "#FFF7ED",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "rgba(217, 119, 6, 0.25)",
  },
  skippedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#B45309",
    textTransform: "uppercase",
  },

  addressText: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
  },

  // Empty State
  emptyContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    color: COLORS.textTertiary,
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
  },
  routePreviewBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.divine,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.15)",
  },
  actionMenuBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  rateBtn: {
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF7ED",
    borderWidth: 1,
    borderColor: "rgba(180, 83, 9, 0.26)",
  },
  rateBtnText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#B45309",
  },
});
