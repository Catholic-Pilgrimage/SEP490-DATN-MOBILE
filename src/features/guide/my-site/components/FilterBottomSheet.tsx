import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Platform,
    ScrollView,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    GUIDE_BORDER_RADIUS,
    GUIDE_COLORS,
    GUIDE_SHADOWS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { PREMIUM_COLORS } from "../constants";

// ============================================
// TYPES
// ============================================

export interface FilterItem {
  key: string;
  label: string;
  color: string;
  bgColor: string;
  icon?: string;
  description?: string;
}

interface FilterBottomSheetProps {
  visible: boolean;
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  onClose: () => void;
  filters: FilterItem[];
  title: string;
  /** Optional second section (e.g. event category) */
  primarySectionTitle?: string;
  secondaryFilters?: FilterItem[];
  activeSecondaryFilter?: string;
  onSecondaryFilterChange?: (filter: string) => void;
  secondarySectionTitle?: string;
}

// ============================================
// FILTER BOTTOM SHEET
// ============================================

export const FilterBottomSheet: React.FC<FilterBottomSheetProps> = ({
  visible,
  activeFilter,
  onFilterChange,
  onClose,
  filters,
  title,
  primarySectionTitle,
  secondaryFilters,
  activeSecondaryFilter = "all",
  onSecondaryFilterChange,
  secondarySectionTitle,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<string>(activeFilter);
  const [selectedSecondary, setSelectedSecondary] = useState<string>(
    activeSecondaryFilter,
  );

  const hasSecondary =
    Array.isArray(secondaryFilters) && secondaryFilters.length > 0;

  React.useEffect(() => {
    if (visible) {
      setSelectedFilter(activeFilter);
      setSelectedSecondary(activeSecondaryFilter);
    }
  }, [visible, activeFilter, activeSecondaryFilter]);

  const handleApply = () => {
    onFilterChange(selectedFilter);
    if (hasSecondary && onSecondaryFilterChange) {
      onSecondaryFilterChange(selectedSecondary);
    }
    onClose();
  };

  const renderOption = (
    keyPrefix: string,
    filter: FilterItem,
    selectedKey: string,
    onSelect: (k: string) => void,
  ) => {
    const isSelected = selectedKey === filter.key;
    return (
      <TouchableOpacity
        key={`${keyPrefix}-${filter.key}`}
        style={[
          styles.filterOption,
          isSelected && {
            backgroundColor: filter.bgColor,
            borderColor: filter.color,
          },
        ]}
        onPress={() => onSelect(filter.key)}
        activeOpacity={0.7}
      >
        <View style={styles.filterOptionLeft}>
          <View
            style={[
              styles.filterIconContainer,
              { backgroundColor: filter.bgColor },
            ]}
          >
            <MaterialIcons
              name={
                (filter.icon as keyof typeof MaterialIcons.glyphMap) || "apps"
              }
              size={20}
              color={filter.color}
            />
          </View>
          <View style={styles.filterOptionText}>
            <Text
              style={[
                styles.filterOptionLabel,
                {
                  color: isSelected
                    ? filter.color
                    : GUIDE_COLORS.textPrimary,
                },
              ]}
            >
              {filter.label}
            </Text>
            {filter.description ? (
              <Text style={styles.filterOptionDescription}>
                {filter.description}
              </Text>
            ) : null}
          </View>
        </View>
        {isSelected && (
          <View
            style={[styles.checkCircle, { backgroundColor: filter.color }]}
          >
            <Ionicons name="checkmark" size={16} color="#FFF" />
          </View>
        )}
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.bottomSheetOverlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.bottomSheetContainer,
                { paddingBottom: Math.max(insets.bottom, GUIDE_SPACING.lg) },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.bottomSheetHeader}>
                <Text style={styles.bottomSheetTitle}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={GUIDE_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <ScrollView
                style={styles.filterScroll}
                contentContainerStyle={styles.filterOptionsContainer}
                showsVerticalScrollIndicator={hasSecondary}
                nestedScrollEnabled
              >
                {hasSecondary && primarySectionTitle ? (
                  <Text style={styles.filterSectionTitle}>
                    {primarySectionTitle}
                  </Text>
                ) : null}
                {filters.map((filter) =>
                  renderOption(
                    "primary",
                    filter,
                    selectedFilter,
                    setSelectedFilter,
                  ),
                )}
                {hasSecondary && secondarySectionTitle ? (
                  <Text
                    style={[styles.filterSectionTitle, styles.filterSectionTitleSpaced]}
                  >
                    {secondarySectionTitle}
                  </Text>
                ) : null}
                {hasSecondary && secondaryFilters
                  ? secondaryFilters.map((filter) =>
                      renderOption(
                        "secondary",
                        filter,
                        selectedSecondary,
                        setSelectedSecondary,
                      ),
                    )
                  : null}
              </ScrollView>

              {/* Apply Button */}
              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>{t("common.apply", { defaultValue: "Áp dụng" })}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

// ============================================
// NÚT LỌC TRÒN 44×44 — dùng chung (Media / Events / Schedules / Locations / …)
// ============================================

export interface GuideFilterIconButtonProps {
  onPress: () => void;
  /** Đang có lọc khác “tất cả” */
  filtered: boolean;
  /** Màu nhấn khi filtered (icon + viền + nền nhạt). Mặc định primary. */
  accentColor?: string;
  accessibilityLabel: string;
  accessibilityHint?: string;
  /** Ghép thêm (vd. chip đếm) */
  style?: StyleProp<ViewStyle>;
}

export const GuideFilterIconButton: React.FC<GuideFilterIconButtonProps> = ({
  onPress,
  filtered,
  accentColor = GUIDE_COLORS.primary,
  accessibilityLabel,
  accessibilityHint,
  style,
}) => {
  const tint = filtered ? accentColor : GUIDE_COLORS.textSecondary;
  return (
    <TouchableOpacity
      style={[
        styles.filterIconButton,
        filtered && {
          borderColor: accentColor,
          backgroundColor: `${accentColor}18`,
        },
        style,
      ]}
      onPress={onPress}
      activeOpacity={0.8}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityHint={accessibilityHint}
      accessibilityState={{ selected: filtered }}
    >
      <Ionicons name="filter" size={18} color={tint} />
      {filtered ? <View style={styles.filterIconBadge} pointerEvents="none" /> : null}
    </TouchableOpacity>
  );
};

// ============================================
// FILTER TRIGGER (Events / Schedules — đồng bộ icon tròn)
// ============================================

interface FilterTriggerProps {
  activeFilter: string;
  onPress: () => void;
  filters: FilterItem[];
  defaultLabel?: string;
  allKey?: string;
  /** Optional category (or second dimension) filter */
  secondaryActiveFilter?: string;
  secondaryFilters?: FilterItem[];
  secondaryAllKey?: string;
}

export const FilterTrigger: React.FC<FilterTriggerProps> = ({
  activeFilter,
  onPress,
  filters,
  defaultLabel = "Filter",
  allKey = "all",
  secondaryActiveFilter,
  secondaryFilters,
  secondaryAllKey = "all",
}) => {
  const activeFilterInfo = filters.find((f) => f.key === activeFilter);
  const secondaryInfo = secondaryFilters?.find(
    (f) => f.key === secondaryActiveFilter,
  );
  const statusFiltered = activeFilter !== allKey;
  const catFiltered =
    secondaryFilters &&
    secondaryFilters.length > 0 &&
    (secondaryActiveFilter ?? secondaryAllKey) !== secondaryAllKey;
  const isFiltered = statusFiltered || !!catFiltered;

  const accentColor =
    (statusFiltered ? activeFilterInfo?.color : undefined) ||
    (catFiltered ? secondaryInfo?.color : undefined) ||
    GUIDE_COLORS.primary;

  let displayLabel = defaultLabel;
  if (statusFiltered && catFiltered) {
    displayLabel = `${activeFilterInfo?.label ?? ""} · ${secondaryInfo?.label ?? ""}`;
  } else if (statusFiltered) {
    displayLabel = activeFilterInfo?.label ?? defaultLabel;
  } else if (catFiltered) {
    displayLabel = secondaryInfo?.label ?? defaultLabel;
  }

  const a11yLabel = isFiltered
    ? `${defaultLabel}. ${displayLabel}`
    : defaultLabel;

  return (
    <GuideFilterIconButton
      onPress={onPress}
      filtered={isFiltered}
      accentColor={accentColor}
      accessibilityLabel={a11yLabel}
    />
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  filterIconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
      },
      android: { elevation: 2 },
    }),
  },
  filterIconBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: GUIDE_COLORS.error,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },

  // Bottom Sheet
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  handleBarContainer: {
    alignItems: "center",
    paddingVertical: GUIDE_SPACING.sm,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: GUIDE_COLORS.gray300,
  },
  bottomSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  bottomSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  closeButton: {
    padding: GUIDE_SPACING.xs,
  },
  filterScroll: {
    maxHeight: 420,
  },
  filterSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: GUIDE_COLORS.textMuted,
    textTransform: "uppercase",
    letterSpacing: 0.6,
    marginBottom: GUIDE_SPACING.sm,
  },
  filterSectionTitleSpaced: {
    marginTop: GUIDE_SPACING.md,
  },
  filterOptionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.lg,
  },
  filterOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: "#FFF",
  },
  filterOptionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  filterIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  filterOptionText: {
    gap: 2,
  },
  filterOptionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  filterOptionDescription: {
    fontSize: 12,
    color: GUIDE_COLORS.textMuted,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  bottomSheetFooter: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
    paddingBottom: GUIDE_SPACING.md,
  },
  applyButton: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    alignItems: "center",
    ...GUIDE_SHADOWS.md,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
