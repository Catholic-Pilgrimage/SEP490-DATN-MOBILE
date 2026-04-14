import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useMemo } from "react";
import {
  Image,
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { COLORS } from "../../../../../constants/theme.constants";
import type { PlanItem } from "../../../../../types/pilgrim";
import ItemDetailSiteInfoSections from "./ItemDetailSiteInfoSections";

interface ItemDetailModalProps {
  visible: boolean;
  selectedItem: PlanItem | null;
  onClose: () => void;
  t: (key: string, options?: Record<string, unknown>) => string;
  styles: Record<string, unknown>;
  formatTimeValue: (value?: string | null) => string;
  calculateEndTime: (startTimeStr: unknown, durationStr: unknown) => string;
  getPilgrimTag: (item: PlanItem) => string;
  isOffline: boolean;
  handleOpenEditItem: (item: PlanItem) => void;
  handleDeleteItem: (itemId: string) => void;
  isPlanOwner: boolean;
}

export default function ItemDetailModal(props: ItemDetailModalProps) {
  const {
    visible,
    selectedItem,
    onClose,
    t,
    styles,
    formatTimeValue,
    calculateEndTime,
    getPilgrimTag,
    isOffline,
    handleOpenEditItem,
    handleDeleteItem,
    isPlanOwner,
  } = props;

  const s = styles as Record<string, any>;

  const siteId = selectedItem?.site_id || selectedItem?.site?.id;

  const travelLine = useMemo(() => {
    if (!selectedItem) return null;
    const km = selectedItem.travel_distance_km;
    const min = selectedItem.travel_time_minutes;
    const parts: string[] = [];
    if (typeof km === "number" && !Number.isNaN(km)) {
      parts.push(km < 1 ? `${Math.round(km * 1000)} m` : `${km.toFixed(1)} km`);
    }
    if (typeof min === "number" && !Number.isNaN(min)) {
      parts.push(
        `${Math.max(1, Math.round(min))} ${t("planner.itemDetailTravelMinSuffix")}`,
      );
    }
    return parts.length ? parts.join(" · ") : null;
  }, [selectedItem, t]);

  const scheduleTimeDisplay = useMemo(() => {
    if (!selectedItem) return { primary: null as string | null };
    const start = selectedItem.estimated_time || selectedItem.arrival_time;
    if (!start) return { primary: null };
    const rest = selectedItem.rest_duration;
    if (rest) {
      const end = calculateEndTime(start, rest);
      return {
        primary: `${formatTimeValue(start)} – ${end}`,
      };
    }
    return { primary: formatTimeValue(start) };
  }, [selectedItem, calculateEndTime, formatTimeValue]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      {selectedItem && (
        <View style={s.modalContainer}>
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={onClose} hitSlop={12}>
              <Text style={s.modalClose}>{t("planner.close")}</Text>
            </TouchableOpacity>
            <Text style={[s.modalTitle, s.itemDetailModalTitleCenter]} numberOfLines={1}>
              {t("planner.locationDetails")}
            </Text>
            <View style={s.itemDetailModalHeaderActions}>
              {isPlanOwner ? (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      handleOpenEditItem(selectedItem);
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t("planner.editTimeAndNote")}
                  >
                    <Ionicons name="create-outline" size={24} color={COLORS.primary} />
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      onClose();
                      handleDeleteItem(selectedItem.id);
                    }}
                    hitSlop={10}
                    accessibilityRole="button"
                    accessibilityLabel={t("planner.removeFromItinerary")}
                  >
                    <Ionicons name="trash-outline" size={24} color="#EF4444" />
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ width: 56 }} />
              )}
            </View>
          </View>

          <ScrollView
            contentContainerStyle={[s.itemDetailContentWrap, { padding: 16 }]}
            showsVerticalScrollIndicator={false}
          >
            <View style={s.itemDetailHero}>
              <Image
                source={{
                  uri:
                    selectedItem.site.cover_image ||
                    selectedItem.site.image ||
                    "https://via.placeholder.com/300x150",
                }}
                style={s.itemDetailImage}
                resizeMode="cover"
              />
              <View style={s.itemDetailOverlay} />
              <LinearGradient
                colors={["rgba(0,0,0,0.05)", "rgba(0,0,0,0.35)", "rgba(0,0,0,0.88)"]}
                style={s.itemDetailHeroGradient}
                pointerEvents="none"
              />
              <View style={s.itemDetailHeroContent}>
                <View style={s.itemDetailTypeBadge}>
                  <Ionicons name="business" size={14} color={COLORS.textPrimary} />
                  <Text style={s.itemDetailTypeBadgeText}>
                    {getPilgrimTag(selectedItem)}
                  </Text>
                </View>
                <Text style={s.itemDetailSiteName}>{selectedItem.site.name}</Text>
                {selectedItem.site.address ? (
                  <View style={s.itemDetailHeroAddressRow}>
                    <Ionicons name="location" size={18} color={COLORS.accent} />
                    <Text style={s.itemDetailHeroAddressText} numberOfLines={3}>
                      {selectedItem.site.address}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            <View style={s.itemDetailScheduleCard}>
              <Text style={s.itemDetailScheduleCardTitle}>
                {t("planner.itemDetailScheduleSection")}
              </Text>

              {travelLine ? (
                <View style={s.itemDetailTravelBanner}>
                  <Ionicons name="navigate-outline" size={22} color="#B45309" />
                  <Text style={s.itemDetailTravelBannerText}>
                    {t("planner.itemDetailFromPreviousStop")}
                    {": "}
                    {travelLine}
                  </Text>
                </View>
              ) : null}

              {scheduleTimeDisplay.primary ? (
                <View style={[s.itemDetailInfoRow, !selectedItem.rest_duration && s.itemDetailInfoRowLast]}>
                  <View style={s.itemDetailInfoIconContainer}>
                    <Ionicons name="time-outline" size={20} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.itemDetailInfoLabel}>
                      {t("planner.itemDetailTimeWindow")}
                    </Text>
                    <Text style={s.itemDetailInfoValue}>{scheduleTimeDisplay.primary}</Text>
                  </View>
                </View>
              ) : null}

              {selectedItem.rest_duration ? (
                <View style={[s.itemDetailInfoRow, s.itemDetailInfoRowLast]}>
                  <View style={s.itemDetailInfoIconContainer}>
                    <Ionicons name="hourglass-outline" size={20} color={COLORS.accent} />
                  </View>
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={s.itemDetailInfoLabel}>
                      {t("planner.itemDetailRestAtSite")}
                    </Text>
                    <Text style={s.itemDetailInfoValue}>
                      {formatTimeValue(selectedItem.rest_duration)}
                    </Text>
                  </View>
                </View>
              ) : null}

              {!scheduleTimeDisplay.primary && !selectedItem.rest_duration ? (
                <Text style={s.itemDetailRowText}>
                  {t("planner.itemDetailNoScheduleYet")}
                </Text>
              ) : null}
            </View>

            {selectedItem.note &&
            selectedItem.note !== "Visited" &&
            String(selectedItem.note).trim() ? (
              <View style={s.itemDetailScheduleCard}>
                <Text style={s.itemDetailScheduleCardTitle}>
                  {t("planner.note")}
                </Text>
                <View style={[s.itemDetailInfoRow, s.itemDetailInfoRowLast]}>
                  <View style={s.itemDetailInfoIconContainer}>
                    <Ionicons name="document-text-outline" size={20} color={COLORS.accent} />
                  </View>
                  <Text style={[s.itemDetailRowText, { flex: 1, fontSize: 15, lineHeight: 22 }]}>
                    {selectedItem.note}
                  </Text>
                </View>
              </View>
            ) : null}

            <ItemDetailSiteInfoSections siteId={siteId} isOffline={isOffline} t={t} />
          </ScrollView>
        </View>
      )}
    </Modal>
  );
}
