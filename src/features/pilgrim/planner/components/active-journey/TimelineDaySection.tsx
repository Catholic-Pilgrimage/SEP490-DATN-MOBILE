import React from "react";
import {
  Dimensions,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";

const SCREEN_WIDTH = Dimensions.get("window").width;
const CONTAINER_PADDING = 16; // SPACING.md
const LIST_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2);
const PILL_WIDTH = 180;
const BOX_WIDTH = 60;
const GAP = 10;
const SPACER_WIDTH = (LIST_WIDTH - PILL_WIDTH) / 2;

type DayTab = {
  key: string;
  label: string;
  isToday?: boolean;
};

type Props = {
  days: DayTab[];
  selectedDay: string;
  onSelectDay: (key: string) => void;
  items: any[];
  /** Called when user taps the "view route" icon on a timeline item */
  onViewRoute?: (item: any) => void;
  isOwner?: boolean;
  onItemAction?: (item: any) => void;
};

export default function TimelineDaySection({
  days,
  selectedDay,
  onSelectDay,
  items,
  onViewRoute,
  isOwner,
  onItemAction,
}: Props) {
  const { t, i18n } = useTranslation();
  const scrollRef = React.useRef<ScrollView>(null);

  // Auto-scroll to center whenever selectedDay changes
  React.useEffect(() => {
    const idx = days.findIndex((d) => d.key === selectedDay);
    if (idx >= 0 && scrollRef.current) {
      setTimeout(() => {
        // Precise centering: 
        // Sum widths of preceding items + spacers
        let offset = idx * (BOX_WIDTH + GAP);
        // Note: The pill is only current, so we don't need complicated sum if only one is large.
        // Wait, the pill IS the current index, so we only need to account for boxes before it.
        scrollRef.current?.scrollTo({
          x: offset, 
          animated: true,
        });
      }, 100);
    }
  }, [selectedDay, days]);

  return (
    <View style={styles.container}>
      <View style={{ flexGrow: 0, flexShrink: 0, marginBottom: 0 }}>
        <ScrollView
          ref={scrollRef}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={[
            styles.tabBar,
            days.length <= 2 && { justifyContent: "center", width: "100%" },
          ]}
          snapToAlignment="start" // Start of the pill to allow precise offset
          decelerationRate="fast"
        >
          {/* LEFT SPACER */}
          {days.length > 2 && <View style={{ width: SPACER_WIDTH }} />}

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

            const fullLabel = i18n.language === "vi" 
              ? `${dateInfo.day} ${dateInfo.month} (${t("planner.dayWithNumber", { day: d.key })})`
              : `${dateInfo.month} ${dateInfo.day} (${t("planner.dayWithNumber", { day: d.key })})`;

            return (
              <TouchableOpacity
                key={d.key}
                style={[isActive ? styles.pillActive : styles.pillInactive]}
                onPress={() => onSelectDay(d.key)}
                activeOpacity={0.8}
              >
                <Text style={[styles.pillText, isActive ? styles.pillTextActive : styles.pillTextInactive]}>
                  {fullLabel}
                </Text>
              </TouchableOpacity>
            );
          })}

          {/* RIGHT SPACER */}
          {days.length > 2 && <View style={{ width: SPACER_WIDTH }} />}
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
              const isSkipped = status === "skipped";
              const isNext = item.is_next;

              const formatTimeOnly = (t?: string) => {
                if (!t) return "—";
                const p = t.split(":");
                return p.length >= 2 ? `${p[0]}:${p[1]}` : t;
              };

              return (
                <View key={item.id} style={styles.timelineRow}>
                  {/* LEFT: THUMBNAIL */}
                  <View style={styles.thumbContainer}>
                    <Image
                      source={{
                        uri: item.site?.image || item.site?.cover_image || "https://via.placeholder.com/60",
                      }}
                      style={[styles.thumb, (isVisited || isSkipped) && styles.thumbDone]}
                    />
                  </View>

                  {/* RIGHT: CONTENT */}
                  <View style={styles.contentCol}>
                    <Text style={[styles.siteName, (isVisited || isSkipped) && styles.siteNameDone]} numberOfLines={1}>
                      {item.site?.name || t("planner.siteNameUnknown")}
                    </Text>

                    <View style={styles.timeRow}>
                      <Ionicons 
                        name="time-outline" 
                        size={14} 
                        color={(isVisited || isSkipped) ? COLORS.textLight : COLORS.textSecondary} 
                      />
                      <Text style={[styles.timeText, isNext && styles.timeNext, (isVisited || isSkipped) && styles.timeDone]}>
                        {formatTimeOnly(item.estimated_time)}
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
                  </View>

                  {/* ACTION ICONS: Owner sees menu, Member sees route preview */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                    {!isVisited && !isSkipped && (
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
    paddingBottom: 8,
    gap: 12,
    paddingHorizontal: 8,
    alignItems: "center",
  },
  pillActive: {
    backgroundColor: COLORS.holy, 
    height: 42,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.holy,
    ...SHADOWS.small,
  },
  pillInactive: {
    backgroundColor: COLORS.white,
    height: 42,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    ...SHADOWS.subtle,
  },
  pillText: {
    fontSize: 14,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  pillTextActive: {
    color: "#fff",
  },
  pillTextInactive: {
    color: COLORS.textSecondary,
  },

  // CARD CONTAINER
  card: {
    flex: 1,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    ...SHADOWS.small,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
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
    backgroundColor: "#FDFBF7",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(139, 115, 85, 0.1)",
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
    color: COLORS.textLight,
    textDecorationLine: "line-through",
  },
  timeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  timeText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  timeNext: {
    color: COLORS.holy,
  },
  timeDone: {
    color: COLORS.textLight,
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
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  skippedBadgeText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#6B7280",
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
});
