import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../../../../hooks/useI18n";
import {
  EXPLORE_REGIONS,
  EXPLORE_SITE_TYPE_OPTIONS,
  type ExploreSiteTypeFilter,
} from "../constants/exploreFilter.constants";
import { exploreFilterModalStyles as styles } from "./ExploreFilterModal.styles";

export type ExploreFilterModalProps = {
  visible: boolean;
  onClose: () => void;
  draftRegionId: string;
  onChangeDraftRegionId: (id: string) => void;
  draftHasEvents: boolean;
  onChangeDraftHasEvents: (v: boolean) => void;
  draftSiteType: ExploreSiteTypeFilter;
  onChangeDraftSiteType: (t: ExploreSiteTypeFilter) => void;
  onApply: () => void;
  onReset: () => void;
};

const regionLabel = (regionId: string, t: (k: string, o?: { defaultValue?: string }) => string) => {
  if (regionId === "all")
    return t("explore.allRegions", { defaultValue: "Tất cả" });
  if (regionId === "bac") return t("explore.north", { defaultValue: "Miền Bắc" });
  if (regionId === "trung")
    return t("explore.central", { defaultValue: "Miền Trung" });
  return t("explore.south", { defaultValue: "Miền Nam" });
};

export const ExploreFilterModal: React.FC<ExploreFilterModalProps> = ({
  visible,
  onClose,
  draftRegionId,
  onChangeDraftRegionId,
  draftHasEvents,
  onChangeDraftHasEvents,
  draftSiteType,
  onChangeDraftSiteType,
  onApply,
  onReset,
}) => {
  const { t } = useI18n();
  const insets = useSafeAreaInsets();

  if (!visible) return null;

  return (
    <View style={styles.modalOverlay} pointerEvents="box-none">
      <Pressable style={styles.overlayDismiss} onPress={onClose} />
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={styles.keyboardView}
      >
        <View style={styles.modalContent}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {t("explore.filter.title", { defaultValue: "Bộ lọc tìm kiếm" })}
              </Text>
              <TouchableOpacity onPress={onClose} hitSlop={12}>
                <Ionicons name="close-circle" size={26} color="#D1D5DB" />
              </TouchableOpacity>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>
                {t("explore.filter.regionLabel", { defaultValue: "Khu vực" })}
              </Text>
              <View style={styles.regionGrid}>
                {EXPLORE_REGIONS.map((region, index) => {
                  const isActive = region.id === draftRegionId;
                  return (
                    <TouchableOpacity
                      key={region.id}
                      style={[
                        styles.regionChip,
                        index < EXPLORE_REGIONS.length - 1 && styles.regionChipSpacing,
                        isActive && styles.regionChipActive,
                      ]}
                      onPress={() => onChangeDraftRegionId(region.id)}
                    >
                      <Text
                        style={[
                          styles.regionChipText,
                          isActive && styles.regionChipTextActive,
                        ]}
                        numberOfLines={1}
                      >
                        {regionLabel(region.id, t)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>
                {t("explore.filter.typeLabel", {
                  defaultValue: "Loại địa điểm",
                })}
              </Text>
              <View style={styles.typeWrap}>
                {EXPLORE_SITE_TYPE_OPTIONS.map((opt) => {
                  const isActive = draftSiteType === opt.id;
                  return (
                    <TouchableOpacity
                      key={opt.id}
                      style={[
                        styles.typeChip,
                        isActive && styles.typeChipActive,
                      ]}
                      onPress={() => onChangeDraftSiteType(opt.id)}
                    >
                      <Text
                        style={[
                          styles.typeChipText,
                          isActive && styles.typeChipTextActive,
                        ]}
                      >
                        {t(opt.labelKey, { defaultValue: opt.defaultLabel })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            <View style={styles.filterSection}>
              <Text style={styles.filterSectionLabel}>
                {t("explore.filter.featuresLabel", { defaultValue: "Tính năng" })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.optionRow,
                  draftHasEvents && styles.optionRowActive,
                ]}
                onPress={() => onChangeDraftHasEvents(!draftHasEvents)}
              >
                <View style={styles.optionRowLeft}>
                  <View
                    style={[
                      styles.optionIconBox,
                      { backgroundColor: "rgba(239, 68, 68, 0.1)" },
                    ]}
                  >
                    <Ionicons name="calendar" size={20} color="#EF4444" />
                  </View>
                  <View style={styles.optionTextWrap}>
                    <Text style={styles.optionRowTitle}>
                      {t("explore.filter.hasEventsTitle", {
                        defaultValue: "Có sự kiện",
                      })}
                    </Text>
                    <Text style={styles.optionRowSub}>
                      {t("explore.filter.hasEventsSub", {
                        defaultValue: "Ưu tiên địa điểm đang có lễ / sự kiện",
                      })}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.toggleBase,
                    draftHasEvents && styles.toggleBaseActive,
                  ]}
                >
                  <View
                    style={[
                      styles.toggleCircle,
                      draftHasEvents && styles.toggleCircleActive,
                    ]}
                  />
                </View>
              </TouchableOpacity>
            </View>
          </ScrollView>

          <View
            style={[
              styles.modalFooterActions,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <TouchableOpacity style={styles.resetBtn} onPress={onReset}>
              <Text style={styles.resetBtnText}>
                {t("explore.filter.reset", { defaultValue: "Reset" })}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyBtn}
              onPress={onApply}
              activeOpacity={0.9}
            >
              <Text style={styles.applyBtnText}>
                {t("explore.filter.apply", { defaultValue: "Áp dụng" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
};
