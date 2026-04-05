import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
} from "../../../../../constants/theme.constants";
import type { PlanItem } from "../../../../../types/pilgrim/planner.types";

type Props = {
  visible: boolean;
  onClose: () => void;
  item: PlanItem | null;
  onViewRoute: () => void;
  onMarkVisited: () => void;
  onSkip: () => void;
  isSkipping?: boolean;
  isMarkingVisited?: boolean;
};

/**
 * Owner-only Bottom Sheet with 3 contextual actions for a timeline item:
 * 1. Xem đường đi
 * 2. Chốt điểm (Mark Visited)
 * 3. Bỏ qua (Skip)
 */
export default function ItemActionSheet({
  visible,
  onClose,
  item,
  onViewRoute,
  onMarkVisited,
  onSkip,
  isSkipping,
  isMarkingVisited,
}: Props) {
  const insets = useSafeAreaInsets();
  if (!item) return null;

  const siteName = item.site?.name || "Địa điểm";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable
          style={[styles.sheet, { paddingBottom: insets.bottom + 16 }]}
          onPress={(e) => e.stopPropagation()}
        >
          {/* Handle bar */}
          <View style={styles.handleBar} />

          {/* Header */}
          <Text style={styles.sheetTitle} numberOfLines={1}>
            {siteName}
          </Text>

          {/* Actions */}
          <View style={styles.actionList}>
            {/* View Route */}
            {item.site?.latitude && (
              <TouchableOpacity
                style={styles.actionRow}
                onPress={() => {
                  onClose();
                  onViewRoute();
                }}
                activeOpacity={0.7}
              >
                <View style={[styles.actionIcon, { backgroundColor: "#FFF3E0" }]}>
                  <Ionicons name="navigate-outline" size={20} color="#D35400" />
                </View>
                <View style={styles.actionTextCol}>
                  <Text style={styles.actionLabel}>Xem đường đi</Text>
                  <Text style={styles.actionDesc}>Mở bản đồ dẫn đường tới địa điểm</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
              </TouchableOpacity>
            )}

            {/* Mark Visited */}
            <TouchableOpacity
              style={styles.actionRow}
              onPress={() => {
                onClose();
                onMarkVisited();
              }}
              disabled={isMarkingVisited}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#ECFDF5" }]}>
                {isMarkingVisited ? (
                  <ActivityIndicator size="small" color="#15803D" />
                ) : (
                  <Ionicons name="flag" size={20} color="#15803D" />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={styles.actionLabel}>Chốt điểm</Text>
                <Text style={styles.actionDesc}>
                  Xác nhận đoàn đã viếng thăm địa điểm này
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>

            {/* Skip */}
            <TouchableOpacity
              style={[styles.actionRow, { borderBottomWidth: 0 }]}
              onPress={() => {
                onClose();
                onSkip();
              }}
              disabled={isSkipping}
              activeOpacity={0.7}
            >
              <View style={[styles.actionIcon, { backgroundColor: "#FEF2F2" }]}>
                {isSkipping ? (
                  <ActivityIndicator size="small" color="#9A3412" />
                ) : (
                  <Ionicons name="play-skip-forward" size={20} color="#9A3412" />
                )}
              </View>
              <View style={styles.actionTextCol}>
                <Text style={[styles.actionLabel, { color: "#9A3412" }]}>Bỏ qua</Text>
                <Text style={styles.actionDesc}>
                  Bỏ qua địa điểm này, chuyển sang điểm tiếp theo
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={COLORS.textTertiary} />
            </TouchableOpacity>
          </View>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Đóng</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderMedium,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 16,
    textAlign: "center",
  },

  // Action list
  actionList: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  actionRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 14,
  },
  actionIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  actionTextCol: {
    flex: 1,
  },
  actionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  actionDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    lineHeight: 16,
  },

  // Cancel
  cancelBtn: {
    marginTop: 12,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    ...SHADOWS.subtle,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
});
