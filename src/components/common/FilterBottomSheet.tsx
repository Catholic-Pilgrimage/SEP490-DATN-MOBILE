/**
 * FilterBottomSheet Component
 * Reusable Bottom Sheet Filter (Gold Standard Mobile Pattern)
 * 
 * Features:
 * - Handle bar for swipe gesture hint
 * - Large border radius (24px)
 * - Dimmed background overlay
 * - Slide animation from bottom
 * - Apply button with Gold theme
 * - Filter options with icons, labels, descriptions
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SHADOWS,
  GUIDE_SPACING,
} from "../../constants/guide.constants";

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  goldDark: "#B8960C",
  cream: "#FDF8F0",
  brown: "#8B7355",
  brownLight: "#E8E0D5",
};

// ============================================
// TYPES
// ============================================

export interface FilterOption<T extends string = string> {
  key: T;
  label: string;
  color: string;
  bgColor: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  description?: string;
}

interface FilterBottomSheetProps<T extends string = string> {
  visible: boolean;
  title: string;
  options: FilterOption<T>[];
  activeFilter: T;
  onFilterChange: (filter: T) => void;
  onClose: () => void;
}

// ============================================
// FILTER BOTTOM SHEET COMPONENT
// ============================================

export function FilterBottomSheet<T extends string = string>({
  visible,
  title,
  options,
  activeFilter,
  onFilterChange,
  onClose,
}: FilterBottomSheetProps<T>) {
  const [selectedFilter, setSelectedFilter] = useState<T>(activeFilter);

  // Reset selection when opened
  useEffect(() => {
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
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View style={styles.container}>
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              {/* Header */}
              <View style={styles.header}>
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={24} color={GUIDE_COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              {/* Filter Options */}
              <View style={styles.optionsContainer}>
                {options.map((option) => {
                  const isSelected = selectedFilter === option.key;
                  return (
                    <TouchableOpacity
                      key={option.key}
                      style={[
                        styles.option,
                        isSelected && {
                          backgroundColor: option.bgColor,
                          borderColor: option.color,
                        },
                      ]}
                      onPress={() => setSelectedFilter(option.key)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.optionLeft}>
                        <View style={[styles.iconContainer, { backgroundColor: option.bgColor }]}>
                          {option.icon ? (
                            <MaterialIcons name={option.icon} size={20} color={option.color} />
                          ) : (
                            <MaterialIcons name="apps" size={20} color={option.color} />
                          )}
                        </View>
                        <View style={styles.optionTextContainer}>
                          <Text
                            style={[
                              styles.optionLabel,
                              { color: isSelected ? option.color : GUIDE_COLORS.textPrimary },
                            ]}
                          >
                            {option.label}
                          </Text>
                          {option.description && (
                            <Text style={styles.optionDescription}>{option.description}</Text>
                          )}
                        </View>
                      </View>
                      {isSelected && (
                        <View style={[styles.checkCircle, { backgroundColor: option.color }]}>
                          <Ionicons name="checkmark" size={16} color="#FFF" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Apply Button */}
              <View style={styles.footer}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>Áp dụng</Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
}

// ============================================
// FILTER TRIGGER BUTTON COMPONENT
// ============================================

interface FilterTriggerButtonProps<T extends string = string> {
  options: FilterOption<T>[];
  activeFilter: T;
  onPress: () => void;
  defaultFilterKey?: T;
}

export function FilterTriggerButton<T extends string = string>({
  options,
  activeFilter,
  onPress,
  defaultFilterKey = "all" as T,
}: FilterTriggerButtonProps<T>) {
  const activeOption = options.find((o) => o.key === activeFilter);
  const isFiltered = activeFilter !== defaultFilterKey;

  return (
    <View style={styles.triggerContainer}>
      <TouchableOpacity
        style={[
          styles.triggerButton,
          isFiltered && {
            backgroundColor: activeOption?.bgColor,
            borderColor: activeOption?.color,
          },
        ]}
        onPress={onPress}
        activeOpacity={0.7}
      >
        <Ionicons
          name="filter"
          size={18}
          color={isFiltered ? activeOption?.color : GUIDE_COLORS.textSecondary}
        />
        <Text
          style={[
            styles.triggerText,
            isFiltered && { color: activeOption?.color },
          ]}
        >
          {isFiltered ? activeOption?.label : "Lọc"}
        </Text>
        <Ionicons
          name="chevron-down"
          size={16}
          color={isFiltered ? activeOption?.color : GUIDE_COLORS.textSecondary}
        />
      </TouchableOpacity>
    </View>
  );
}

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  // Overlay
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  // Container
  container: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingBottom: Platform.OS === "ios" ? 34 : GUIDE_SPACING.lg,
  },

  // Handle Bar
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

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  closeButton: {
    padding: GUIDE_SPACING.xs,
  },

  // Options
  optionsContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.md,
    gap: GUIDE_SPACING.sm,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    backgroundColor: "#FFF",
  },
  optionLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.md,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextContainer: {
    gap: 2,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
  },
  optionDescription: {
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

  // Footer
  footer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.sm,
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

  // Trigger Button
  triggerContainer: {
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingVertical: GUIDE_SPACING.sm,
  },
  triggerButton: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: GUIDE_SPACING.xs,
    paddingHorizontal: GUIDE_SPACING.md,
    paddingVertical: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: GUIDE_COLORS.surface,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.borderLight,
    ...GUIDE_SHADOWS.sm,
  },
  triggerText: {
    fontSize: 14,
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
  },
});

export default FilterBottomSheet;
