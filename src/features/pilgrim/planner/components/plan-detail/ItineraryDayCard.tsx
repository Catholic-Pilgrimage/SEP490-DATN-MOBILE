import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { BORDER_RADIUS, COLORS } from "../../../../../constants/theme.constants";
import { PlanItem } from "../../../../../types/pilgrim/planner.types";
import { formatDurationLocalized } from "../../utils/siteScheduleHelper";

interface ItineraryDayCardProps {
  dayKey: string;
  items: PlanItem[];
  startDate?: string;
  planStatus: string;
  isPlanOwner: boolean;
  canDeleteItems?: boolean;
  swapPick: { dayKey: string; itemId: string } | null;
  setSwapPick: React.Dispatch<
    React.SetStateAction<{ dayKey: string; itemId: string } | null>
  >;
  setSelectedItem: (item: PlanItem | null) => void;
  handleReorderIconPress: (dayKey: string, item: PlanItem) => void;
  handleDeleteItem: (itemId: string) => void;
  onRemoveNearbyAmenity?: (itemId: string, amenityId: string) => void;
  removingNearbyAmenityKey?: string | null;
  pendingNearbyRemovalsByItem?: Record<
    string,
    Array<{ amenityId: string; amenityName: string }>
  >;
  onUndoRemoveNearbyAmenity?: (itemId: string, amenityId: string) => void;
  onReloadDayFromPrevious?: (dayNumber: number) => void;
  reloadingDayNumber?: number | null;
  showEtaSyncWarning?: boolean;
  lastClosedDayNumber?: number;
  openAddModal: (day: number) => void;
  t: (key: string, opts?: any) => string;
  getDateForDayCalc: (startDate: string, day: number) => string;
  getPilgrimTagStr?: (
    item: PlanItem,
    t?: (key: string, opts?: any) => string,
  ) => string;
  nearbyAmenityLookup?: Record<
    string,
    {
      id: string;
      name: string;
      category?: string;
      distance_meters?: number;
    }
  >;
  styles: any; // We can lazily accept parents styles instead of copy-pasting 50 styles
  formatTimeValueCalc: (value: any) => string;
  calculateEndTimeCalc: (startTimeStr: any, durationStr: any) => string;
}

function getPilgrimTag(
  item: PlanItem,
  t?: (key: string, opts?: any) => string,
): string {
  if (item.event_id)
    return t ? t("planner.tagMass", { defaultValue: "Thánh lễ" }) : "Thánh lễ";
  const note = String(item.note || "").toLowerCase();
  if (note.includes("chầu"))
    return t
      ? t("planner.tagAdoration", { defaultValue: "Chầu Thánh Thể" })
      : "Chầu Thánh Thể";
  if (note.includes("đức mẹ") || note.includes("duc me"))
    return t
      ? t("planner.tagMarianVisit", { defaultValue: "Viếng Đức Mẹ" })
      : "Viếng Đức Mẹ";
  if (note.includes("nghỉ") || note.includes("rest"))
    return t
      ? t("planner.tagRest", { defaultValue: "Nghỉ ngơi" })
      : "Nghỉ ngơi";
  return t
    ? t("planner.tagPilgrimStop", { defaultValue: "Điểm viếng" })
    : "Điểm viếng";
}

export const ItineraryDayCard: React.FC<ItineraryDayCardProps> = ({
  dayKey,
  items,
  startDate,
  planStatus,
  isPlanOwner,
  canDeleteItems = false,
  swapPick,
  setSwapPick,
  setSelectedItem,
  handleReorderIconPress,
  handleDeleteItem,
  onRemoveNearbyAmenity,
  removingNearbyAmenityKey = null,
  pendingNearbyRemovalsByItem = {},
  onUndoRemoveNearbyAmenity,
  onReloadDayFromPrevious,
  reloadingDayNumber,
  showEtaSyncWarning,
  lastClosedDayNumber = 0,
  openAddModal,
  t,
  getDateForDayCalc,
  getPilgrimTagStr = getPilgrimTag,
  nearbyAmenityLookup = {},
  styles,
  formatTimeValueCalc,
  calculateEndTimeCalc,
}) => {
  const conflictedItemIds = React.useMemo(() => {
    const toMinutes = (value: string): number | null => {
      const m = value.match(/^(\d{1,2}):(\d{2})$/);
      if (!m) return null;
      const hh = Number(m[1]);
      const mm = Number(m[2]);
      if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
      return hh * 60 + mm;
    };

    const seq = items
      .map((item, index) => {
        const start = formatTimeValueCalc(
          item.estimated_time || item.arrival_time,
        );
        const end = calculateEndTimeCalc(
          item.estimated_time || item.arrival_time,
          item.rest_duration,
        );
        return {
          id: item.id,
          index,
          startMinutes: toMinutes(start),
          endMinutes: toMinutes(end),
        };
      })
      .filter(
        (
          entry,
        ): entry is {
          id: string;
          index: number;
          startMinutes: number;
          endMinutes: number | null;
        } => !!entry.id && entry.startMinutes !== null,
      )
      .sort((a, b) => {
        if (a.startMinutes !== b.startMinutes) {
          return a.startMinutes - b.startMinutes;
        }
        return a.index - b.index;
      });

    const conflictIds = new Set<string>();
    let latestEnd = -1;

    seq.forEach((entry) => {
      if (latestEnd >= 0 && entry.startMinutes < latestEnd) {
        conflictIds.add(entry.id);
      }
      const safeEnd = entry.endMinutes ?? entry.startMinutes;
      if (safeEnd > latestEnd) {
        latestEnd = safeEnd;
      }
    });

    return conflictIds;
  }, [items, formatTimeValueCalc, calculateEndTimeCalc]);

  const dayNumber = Number(dayKey);
  const normalizedLastClosedDay = Math.max(0, Number(lastClosedDayNumber) || 0);
  const isDayClosed = Number.isFinite(dayNumber) && dayNumber <= normalizedLastClosedDay;
  const allItemsCompleted =
    items.length > 0 &&
    items.every((item) => {
      const itemStatus = String(item.status || "").toLowerCase();
      return itemStatus === "visited" || itemStatus === "skipped";
    });
  const canAddStopToDay =
    isPlanOwner &&
    (planStatus === "planning" || (planStatus === "ongoing" && !isDayClosed));
  const canSwipeDeleteItem =
    isPlanOwner &&
    !!canDeleteItems &&
    (planStatus === "planning" || planStatus === "draft");

  return (
    <View style={styles.dayContainer}>
      {/** Sync warning is shown only for days flagged as timeline-dependent after add/delete changes. */}
      {(() => {
        const canReload =
          isPlanOwner &&
          !!showEtaSyncWarning &&
          typeof onReloadDayFromPrevious === "function";

        return (
      <View
        style={[
          styles.dayHeader,
          {
            backgroundColor: COLORS.backgroundSoft,
            paddingVertical: 12,
            marginHorizontal: -20, // assuming SPACING.lg is 20
            paddingHorizontal: 20,
          },
        ]}
      >
        <Text
          style={{
            fontSize: 16,
            fontWeight: "700",
            color: COLORS.textPrimary,
            flex: 1,
          }}
        >
          {t("planner.dayWithDate", {
            day: dayKey,
            date: getDateForDayCalc(startDate ?? "", Number(dayKey)),
            defaultValue: "Ngày {{day}} • {{date}}",
          })}
        </Text>
        <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
          {isDayClosed && (
            <View
              style={{
                paddingHorizontal: 8,
                paddingVertical: 4,
                borderRadius: 999,
                backgroundColor: "#ECFDF5",
                borderWidth: 1,
                borderColor: "#A7F3D0",
              }}
            >
              <Text style={{ fontSize: 11, fontWeight: "700", color: "#047857" }}>
                {t("planner.dayClosedBadge", { defaultValue: "Đã chốt" })}
              </Text>
            </View>
          )}
          {canReload && (
            <TouchableOpacity
              onPress={() => onReloadDayFromPrevious(dayNumber)}
              disabled={reloadingDayNumber === dayNumber}
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 4,
                paddingHorizontal: 8,
                paddingVertical: 6,
                borderRadius: 10,
                borderWidth: 1,
                borderColor: "#FDE68A",
                backgroundColor: "#FFFBEB",
                opacity: reloadingDayNumber === dayNumber ? 0.6 : 1,
              }}
            >
              <Ionicons name="warning-outline" size={14} color="#B45309" />
              <Text style={{ fontSize: 12, fontWeight: "700", color: "#B45309" }}>
                {reloadingDayNumber === dayNumber
                  ? t("planner.syncingEtaShort", { defaultValue: "Đang đồng bộ" })
                  : t("planner.syncShort", { defaultValue: "Đồng bộ" })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      </View>
        );
      })()}

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
          {items.length === 0 && canAddStopToDay && (
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
                {t("planner.tapToAddPilgrimStop", {
                  defaultValue: "Bấm để thêm địa điểm viếng",
                })}
              </Text>
            </TouchableOpacity>
          )}
          {items.map((item: PlanItem, index: number) => {
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
              swapPick?.dayKey === dayKey && swapPick?.itemId === item.id;
            const hasTimeConflict = conflictedItemIds.has(item.id);
            const rawNearbyAmenityIds =
              (item.nearby_amenity_ids as string[] | string | undefined) ||
              ((item as any).nearbyAmenityIds as string[] | string | undefined);
            const rawNearbyAmenities =
              ((item as any).nearby_amenities as any[] | undefined) ||
              ((item as any).nearbyAmenities as any[] | undefined) ||
              [];
            const directAmenities = rawNearbyAmenities
              .map((amenity) => {
                const amenityId = String(
                  amenity?.id || amenity?.place_id || amenity?.amenity_id || "",
                ).trim();
                if (!amenityId) return null;
                return {
                  id: amenityId,
                  name: String(
                    amenity?.name ||
                      amenity?.place_name ||
                      amenity?.title ||
                      t("planner.savedAmenityFallback", {
                        defaultValue: "Tiện ích đã lưu",
                      }),
                  ),
                  category:
                    typeof amenity?.category === "string"
                      ? amenity.category
                      : undefined,
                  distance_meters:
                    typeof amenity?.distance_meters === "number"
                      ? amenity.distance_meters
                      : undefined,
                };
              })
              .filter(Boolean) as Array<{
              id: string;
              name: string;
              category?: string;
              distance_meters?: number;
            }>;
            const directAmenitiesById = directAmenities.reduce<
              Record<string, (typeof directAmenities)[number]>
            >((acc, amenity) => {
              acc[amenity.id] = amenity;
              return acc;
            }, {});

            const parseNearbyIds = (value: string[] | string | undefined) => {
              if (Array.isArray(value)) {
                return value
                  .map((id) => String(id || "").trim())
                  .filter(Boolean);
              }

              if (typeof value === "string") {
                const trimmed = value.trim();
                if (!trimmed) return [];

                if (
                  (trimmed.startsWith("[") && trimmed.endsWith("]")) ||
                  (trimmed.startsWith("{") && trimmed.endsWith("}"))
                ) {
                  try {
                    const normalizedJson = trimmed
                      .replace(/^\{/, "[")
                      .replace(/\}$/, "]");
                    const parsed = JSON.parse(normalizedJson);
                    if (Array.isArray(parsed)) {
                      return parsed
                        .map((id) => String(id || "").trim())
                        .filter(Boolean);
                    }
                  } catch {
                    // Fall through to separator-based parsing
                  }
                }

                return trimmed
                  .split(",")
                  .map((id) =>
                    id.replace(/[\[\]\{\}"]+/g, "").trim(),
                  )
                  .filter(Boolean);
              }

              return [];
            };

            const nearbyAmenityIds = parseNearbyIds(rawNearbyAmenityIds);
            const nearbyAmenitiesFromIds = nearbyAmenityIds.map((amenityId) => {
              const mapped =
                directAmenitiesById[amenityId] || nearbyAmenityLookup[amenityId];
              if (mapped) {
                return mapped;
              }
              return {
                id: amenityId,
                name: t("planner.savedAmenityFallback", {
                  defaultValue: "Tiện ích đã lưu",
                }),
                category: undefined,
              };
            });
            const nearbyAmenities =
              nearbyAmenitiesFromIds.length > 0
                ? nearbyAmenitiesFromIds
                : directAmenities;
            const pendingUndos = pendingNearbyRemovalsByItem[item.id] || [];

            const getAmenityMeta = (category?: string) => {
              const normalized = String(category || "").toLowerCase();
              if (normalized === "food") {
                return { icon: "restaurant-outline" as const, color: "#F97316" };
              }
              if (normalized === "lodging") {
                return { icon: "bed-outline" as const, color: "#2563EB" };
              }
              return { icon: "medkit-outline" as const, color: "#10B981" };
            };

            const cardBody = (
              <View
                style={[
                  styles.itemCardInner,
                  { flexDirection: "column", alignItems: "stretch" },
                ]}
              >
                <View
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
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
                      <Text style={styles.itemName}>{item.site.name}</Text>
                      <View style={styles.pilgrimTag}>
                        <Text style={styles.pilgrimTagText}>
                          {getPilgrimTagStr(item, t)}
                        </Text>
                      </View>
                      {item.site.address && (
                        <Text style={styles.itemAddress} numberOfLines={1}>
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
                            {formatTimeValueCalc(
                              item.estimated_time || item.arrival_time,
                            )}
                            {item.rest_duration
                              ? ` - ${calculateEndTimeCalc(item.estimated_time || item.arrival_time, item.rest_duration)}`
                              : ""}
                          </Text>
                        </View>
                      </View>

                      {hasTimeConflict && (
                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            backgroundColor: "#FEF2F2",
                            paddingVertical: 4,
                            paddingHorizontal: 8,
                            borderRadius: 6,
                            marginTop: 6,
                          }}
                        >
                          <Ionicons
                            name="warning"
                            size={14}
                            color="#DC2626"
                            style={{ marginRight: 4 }}
                          />
                          <Text
                            style={{
                              fontSize: 12,
                              color: "#DC2626",
                              fontWeight: "500",
                            }}
                          >
                            {t("planner.timeConflictWarning", {
                              defaultValue: "Thời gian bị chồng chéo",
                            })}
                          </Text>
                        </View>
                      )}
                      {item.note && item.note !== "Visited" && (
                        <Text style={styles.itemNote} numberOfLines={1}>
                          {item.note}
                        </Text>
                      )}
                    </View>
                  </TouchableOpacity>
                {isPlanOwner ? (
                  <TouchableOpacity
                    onPress={() => handleReorderIconPress(dayKey, item)}
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
                        swapSelected ? "reorder-two" : "reorder-two-outline"
                      }
                      size={24}
                      color={swapSelected ? COLORS.accent : COLORS.textTertiary}
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

                {(nearbyAmenities.length > 0 || pendingUndos.length > 0) && (
                  <View
                    style={{
                      marginTop: 10,
                      marginLeft: 0,
                      borderRadius: 10,
                      borderWidth: 1,
                      borderColor: "#E5E7EB",
                      backgroundColor: "#FAFBFC",
                      paddingHorizontal: 10,
                      paddingVertical: 8,
                      rowGap: 6,
                    }}
                  >
                    <View
                      style={{
                        flexDirection: "row",
                        alignItems: "center",
                        justifyContent: "space-between",
                      }}
                    >
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "700",
                          color: COLORS.textSecondary,
                        }}
                      >
                        {t("planner.nearbyAmenitiesTitle", {
                          defaultValue: "Tiện ích lân cận",
                        })}
                      </Text>
                      <Text
                        style={{
                          fontSize: 11,
                          fontWeight: "600",
                          color: COLORS.textTertiary,
                        }}
                      >
                        {nearbyAmenities.length}
                      </Text>
                    </View>

                    {nearbyAmenities.map((amenity) => {
                      const meta = getAmenityMeta(amenity.category);
                      const removeKey = `${item.id}:${amenity.id}`;
                      const isRemoving = removingNearbyAmenityKey === removeKey;
                      return (
                        <View
                          key={`${item.id}_${amenity.id}`}
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            gap: 6,
                          }}
                        >
                          <Ionicons name={meta.icon} size={13} color={meta.color} />
                          <Text
                            numberOfLines={1}
                            style={{
                              fontSize: 12,
                              color: COLORS.textSecondary,
                              fontWeight: "500",
                              flex: 1,
                            }}
                          >
                            {amenity.name}
                          </Text>
                          {isPlanOwner && onRemoveNearbyAmenity && (
                            <TouchableOpacity
                              onPress={() => onRemoveNearbyAmenity(item.id, amenity.id)}
                              disabled={isRemoving}
                              hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                              style={{
                                width: 18,
                                height: 18,
                                borderRadius: 9,
                                alignItems: "center",
                                justifyContent: "center",
                                borderWidth: 1,
                                borderColor: "#D1D5DB",
                                backgroundColor: isRemoving ? "#F3F4F6" : "#FFFFFF",
                              }}
                            >
                              <Ionicons
                                name={isRemoving ? "time-outline" : "close"}
                                size={11}
                                color={isRemoving ? COLORS.textTertiary : "#6B7280"}
                              />
                            </TouchableOpacity>
                          )}
                        </View>
                      );
                    })}

                    {pendingUndos.map((pendingItem) => (
                      <View
                        key={`undo_${item.id}_${pendingItem.amenityId}`}
                        style={{
                          flexDirection: "row",
                          alignItems: "center",
                          justifyContent: "space-between",
                          paddingHorizontal: 8,
                          paddingVertical: 6,
                          borderRadius: 8,
                          borderWidth: 1,
                          borderStyle: "dashed",
                          borderColor: "#F59E0B",
                          backgroundColor: "#FFF7ED",
                        }}
                      >
                        <Text
                          numberOfLines={1}
                          style={{
                            flex: 1,
                            fontSize: 12,
                            color: "#92400E",
                            fontWeight: "600",
                          }}
                        >
                          {t("planner.removedNearbyAmenityPending", {
                            defaultValue: "Đã ẩn {{name}}",
                            name: pendingItem.amenityName,
                          })}
                        </Text>
                        {onUndoRemoveNearbyAmenity && (
                          <TouchableOpacity
                            onPress={() =>
                              onUndoRemoveNearbyAmenity(
                                item.id,
                                pendingItem.amenityId,
                              )
                            }
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={{
                              marginLeft: 8,
                              paddingHorizontal: 8,
                              paddingVertical: 3,
                              borderRadius: 999,
                              backgroundColor: "#F59E0B",
                            }}
                          >
                            <Text
                              style={{
                                color: "#FFFFFF",
                                fontSize: 11,
                                fontWeight: "700",
                              }}
                            >
                              {t("common.undo", { defaultValue: "Hoàn tác" })}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    ))}
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
                  style={styles.timelineCardShadowWrap}
                >
                  {swapSelected ? (
                    <View
                      pointerEvents="none"
                      style={{
                        position: "absolute",
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        borderWidth: 2,
                        borderColor: COLORS.accent,
                        borderRadius: BORDER_RADIUS.lg,
                        zIndex: 5,
                      }}
                    />
                  ) : null}
                  {canSwipeDeleteItem ? (
                    <Swipeable
                      overshootRight={false}
                      containerStyle={styles.timelineSwipeInner}
                      renderRightActions={() => (
                        <View style={styles.timelineDeleteActionWrap}>
                          <TouchableOpacity
                            style={styles.timelineDeleteAction}
                            activeOpacity={0.92}
                            onPress={() => item.id && handleDeleteItem(item.id)}
                          >
                            <Ionicons
                              name="trash-outline"
                              size={26}
                              color="#fff"
                            />
                            <Text style={styles.timelineDeleteActionLabel}>
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
                    <View style={styles.timelineSwipeInner}>{cardBody}</View>
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
                        {t("planner.travelDurationLabel", {
                          duration: formatDurationLocalized(
                            Math.max(1, Math.round(travelMinutes)),
                            t,
                          ),
                          defaultValue: "Di chuyển {{duration}}",
                        })}
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
          {isPlanOwner &&
            canAddStopToDay && (
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
};
