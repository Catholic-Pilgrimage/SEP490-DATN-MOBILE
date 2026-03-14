import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
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
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [selectedFilter, setSelectedFilter] = useState<string>(activeFilter);

  React.useEffect(() => {
    if (visible) {
      setSelectedFilter(activeFilter);
    }
  }, [visible, activeFilter]);

  const handleApply = () => {
    onFilterChange(selectedFilter);
    onClose();
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
              <View style={styles.filterOptionsContainer}>
                {filters.map((filter) => {
                  const isSelected = selectedFilter === filter.key;
                  return (
                    <TouchableOpacity
                      key={filter.key}
                      style={[
                        styles.filterOption,
                        isSelected && {
                          backgroundColor: filter.bgColor,
                          borderColor: filter.color,
                        },
                      ]}
                      onPress={() => setSelectedFilter(filter.key)}
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
                              (filter.icon as keyof typeof MaterialIcons.glyphMap) ||
                              "apps"
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
                          {filter.description && (
                            <Text style={styles.filterOptionDescription}>
                              {filter.description}
                            </Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View
                          style={[
                            styles.checkCircle,
                            { backgroundColor: filter.color },
                          ]}
                        >
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

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
// FILTER TRIGGER BUTTON
// ============================================

interface FilterTriggerProps {
  activeFilter: string;
  onPress: () => void;
  filters: FilterItem[];
  defaultLabel?: string;
  allKey?: string;
}

export const FilterTrigger: React.FC<FilterTriggerProps> = ({
  activeFilter,
  onPress,
  filters,
  defaultLabel = "Filter",
  allKey = "all",
}) => {
  const activeFilterInfo = filters.find((f) => f.key === activeFilter);
  const isFiltered = activeFilter !== allKey;

  return (
    <TouchableOpacity
      style={[
        styles.filterTriggerButton,
        isFiltered && {
          backgroundColor: activeFilterInfo?.bgColor,
          borderColor: activeFilterInfo?.color,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Ionicons
        name="filter"
        size={14}
        color={
          isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary
        }
      />
      <Text
        style={[
          styles.filterTriggerText,
          isFiltered && { color: activeFilterInfo?.color },
        ]}
      >
        {isFiltered ? activeFilterInfo?.label : defaultLabel}
      </Text>
      <Ionicons
        name="chevron-down"
        size={14}
        color={
          isFiltered ? activeFilterInfo?.color : GUIDE_COLORS.textSecondary
        }
      />
    </TouchableOpacity>
  );
};

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Filter Trigger Button
  filterTriggerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: GUIDE_BORDER_RADIUS.full,
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
  filterTriggerText: {
    fontSize: 13,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
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
  filterOptionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
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
