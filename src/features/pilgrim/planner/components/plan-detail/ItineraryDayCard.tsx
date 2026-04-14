import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Image, Text, TouchableOpacity, View } from "react-native";
import { Swipeable } from "react-native-gesture-handler";
import { COLORS } from "../../../../../constants/theme.constants";
import { PlanItem } from "../../../../../types/pilgrim/planner.types";

interface ItineraryDayCardProps {
  dayKey: string;
  items: PlanItem[];
  startDate?: string;
  planStatus: string;
  isPlanOwner: boolean;
  swapPick: { dayKey: string; itemId: string } | null;
  setSwapPick: React.Dispatch<
    React.SetStateAction<{ dayKey: string; itemId: string } | null>
  >;
  setSelectedItem: (item: PlanItem | null) => void;
  handleReorderIconPress: (dayKey: string, item: PlanItem) => void;
  handleDeleteItem: (itemId: string) => void;
  openAddModal: (day: number) => void;
  t: (key: string, opts?: any) => string;
  getDateForDayCalc: (startDate: string, day: number) => string;
  getPilgrimTagStr?: (
    item: PlanItem,
    t?: (key: string, opts?: any) => string,
  ) => string;
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
  swapPick,
  setSwapPick,
  setSelectedItem,
  handleReorderIconPress,
  handleDeleteItem,
  openAddModal,
  t,
  getDateForDayCalc,
  getPilgrimTagStr = getPilgrimTag,
  styles,
  formatTimeValueCalc,
  calculateEndTimeCalc,
}) => {
  return (
    <View style={styles.dayContainer}>
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
          }}
        >
          {t("planner.dayWithDate", {
            day: dayKey,
            date: getDateForDayCalc(startDate ?? "", Number(dayKey)),
            defaultValue: "Ngày {{day}} • {{date}}",
          })}
        </Text>
      </View>

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
          {items.length === 0 && isPlanOwner && (
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
            const cardBody = (
              <View style={styles.itemCardInner}>
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
                  style={[
                    styles.timelineCardShadowWrap,
                    swapSelected && {
                      borderWidth: 2,
                      borderColor: COLORS.accent,
                    },
                  ]}
                >
                  {isPlanOwner ? (
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
                        {t("planner.travelMinutesLabel", {
                          minutes: Math.max(1, Math.round(travelMinutes)),
                          defaultValue: "Di chuyển {{minutes}} phút",
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
            (planStatus === "planning" || planStatus === "ongoing") && (
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
