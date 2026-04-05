import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BORDER_RADIUS, COLORS, SHADOWS } from "../../../../../constants/theme.constants";

type Props = {
  visible: boolean;
  onClose: () => void;
  onCamera: () => void;
  onGallery: () => void;
};

/**
 * Bottom Sheet cho phép chọn nguồn ảnh check-in (Camera / Thư viện).
 * Thay thế Alert.alert() hệ thống để đồng bộ giao diện.
 */
export default function CheckinPhotoSheet({
  visible,
  onClose,
  onCamera,
  onGallery,
}: Props) {
  const insets = useSafeAreaInsets();

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
          {/* Handle */}
          <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="camera" size={22} color={COLORS.accent} />
            <Text style={styles.headerTitle}>Ảnh check-in</Text>
          </View>
          <Text style={styles.subtitle}>
            Chụp hoặc chọn ảnh tại địa điểm để xác nhận check-in
          </Text>

          {/* Options */}
          <View style={styles.options}>
            <TouchableOpacity
              style={styles.optionBtn}
              onPress={onCamera}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "#FFF3E0" },
                ]}
              >
                <Ionicons name="camera-outline" size={24} color="#D35400" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Chụp ảnh</Text>
                <Text style={styles.optionDesc}>
                  Sử dụng camera để chụp ngay
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={styles.optionBtn}
              onPress={onGallery}
              activeOpacity={0.7}
            >
              <View
                style={[
                  styles.optionIcon,
                  { backgroundColor: "#EDE9FE" },
                ]}
              >
                <Ionicons name="images-outline" size={24} color="#7C3AED" />
              </View>
              <View style={styles.optionTextWrap}>
                <Text style={styles.optionTitle}>Chọn từ thư viện</Text>
                <Text style={styles.optionDesc}>
                  Chọn ảnh có sẵn trong máy
                </Text>
              </View>
              <Ionicons
                name="chevron-forward"
                size={18}
                color={COLORS.textTertiary}
              />
            </TouchableOpacity>
          </View>

          {/* Cancel */}
          <TouchableOpacity
            style={styles.cancelBtn}
            onPress={onClose}
            activeOpacity={0.7}
          >
            <Text style={styles.cancelText}>Hủy</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
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

  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 20,
    lineHeight: 18,
  },

  options: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    marginBottom: 16,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 14,
    gap: 14,
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionTextWrap: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  optionDesc: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderLight,
    marginHorizontal: 14,
  },

  cancelBtn: {
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
});
