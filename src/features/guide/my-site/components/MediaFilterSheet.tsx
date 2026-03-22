import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  ScrollView,
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
import type { FilterItem } from "./FilterBottomSheet";

interface MediaFilterSheetProps {
  visible: boolean;
  activeType: string;
  activeStatus: string;
  onApply: (type: string, status: string) => void;
  onClose: () => void;
  typeFilters: FilterItem[];
  statusFilters: FilterItem[];
}

export const MediaFilterSheet: React.FC<MediaFilterSheetProps> = ({
  visible,
  activeType,
  activeStatus,
  onApply,
  onClose,
  typeFilters,
  statusFilters,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  
  const [selectedType, setSelectedType] = useState<string>(activeType);
  const [selectedStatus, setSelectedStatus] = useState<string>(activeStatus);

  useEffect(() => {
    if (visible) {
      setSelectedType(activeType);
      setSelectedStatus(activeStatus);
    }
  }, [visible, activeType, activeStatus]);

  const handleApply = () => {
    onApply(selectedType, selectedStatus);
    onClose();
  };

  const renderFilterOptions = (filters: FilterItem[], selected: string, onSelect: (v: string) => void) => {
    return (
      <View style={styles.filterGroup}>
        {filters.map((filter) => {
          const isSelected = selected === filter.key;
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
                    name={(filter.icon as any) || "apps"}
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
                <Text style={styles.bottomSheetTitle}>{t("mediaTab.filter", "Bộ lọc nâng cao")}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={GUIDE_COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <ScrollView 
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.filterOptionsContainer}
              >
                <Text style={styles.groupTitle}>{t("mediaTab.typeSection", "Loại media")}</Text>
                {renderFilterOptions(typeFilters, selectedType, setSelectedType)}

                <Text style={[styles.groupTitle, { marginTop: GUIDE_SPACING.md }]}>
                  {t("mediaTab.statusSection", "Trạng thái")}</Text>
                {renderFilterOptions(statusFilters, selectedStatus, setSelectedStatus)}
              </ScrollView>

              {/* Apply Button */}
              <View style={styles.bottomSheetFooter}>
                <TouchableOpacity
                  style={styles.applyButton}
                  onPress={handleApply}
                  activeOpacity={0.8}
                >
                  <Text style={styles.applyButtonText}>
                    {t("common.apply", { defaultValue: "Áp dụng" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  bottomSheetOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  bottomSheetContainer: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: "85%",
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
  },
  groupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
    marginBottom: GUIDE_SPACING.sm,
  },
  filterGroup: {
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
    paddingBottom: GUIDE_SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: GUIDE_COLORS.borderLight,
  },
  applyButton: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    alignItems: "center",
    ...GUIDE_SHADOWS.md,
  },
  applyButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
  },
});
