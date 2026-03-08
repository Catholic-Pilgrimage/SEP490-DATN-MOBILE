import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { BaseToastProps } from "react-native-toast-message";
import {
    SACRED_COLORS,
    SACRED_SHADOWS,
    SACRED_TYPOGRAPHY,
} from "../constants/sacred-theme.constants";
import { COLORS } from "../constants/theme.constants";

// Add margin top for SafeArea on iOS/Android if placed near top
export const toastConfig = {
  success: (props: BaseToastProps) => (
    <View style={[styles.container, styles.successContainer]}>
      <View style={[styles.iconContainer, styles.successIconContainer]}>
        <Ionicons
          name="checkmark-circle"
          size={26}
          color={SACRED_COLORS.success}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.successTitle]}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),

  error: (props: BaseToastProps) => (
    <View style={[styles.container, styles.errorContainer]}>
      <View style={[styles.iconContainer, styles.errorIconContainer]}>
        <Ionicons name="alert-circle" size={26} color={SACRED_COLORS.danger} />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.errorTitle]}>
          {props.text1 || "Lỗi"}
        </Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),

  info: (props: BaseToastProps) => (
    <View style={[styles.container, styles.infoContainer]}>
      <View style={[styles.iconContainer, styles.infoIconContainer]}>
        <Ionicons
          name="information-circle"
          size={26}
          color={SACRED_COLORS.gold}
        />
      </View>
      <View style={styles.textContainer}>
        <Text style={[styles.title, styles.infoTitle]}>{props.text1}</Text>
        {props.text2 && <Text style={styles.message}>{props.text2}</Text>}
      </View>
    </View>
  ),
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    width: "90%",
    backgroundColor: "#FFFFFF",
    borderRadius: 100, // Pill shape
    paddingVertical: 10,
    paddingHorizontal: 16,
    ...SACRED_SHADOWS.elevated,
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: "center",
  },
  title: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.title,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 0,
  },
  message: {
    fontSize: SACRED_TYPOGRAPHY.fontSize.body,
    fontWeight: "400",
    color: COLORS.textSecondary,
  },

  /* Success Variant */
  successContainer: {
    backgroundColor: SACRED_COLORS.successBg, // #E8F0EB - xanh lá nhạt
    borderWidth: 1,
    borderColor: SACRED_COLORS.success, // #4A7C59
  },
  successIconContainer: {
    backgroundColor: "transparent",
  },
  successTitle: {
    color: SACRED_COLORS.success,
  },

  /* Error Variant */
  errorContainer: {
    backgroundColor: SACRED_COLORS.dangerBg, // #F5EBEB - đỏ nhạt
    borderWidth: 1,
    borderColor: SACRED_COLORS.danger, // #8B3A3A
  },
  errorIconContainer: {
    backgroundColor: "transparent",
  },
  errorTitle: {
    color: SACRED_COLORS.danger,
  },

  /* Info Variant */
  infoContainer: {
    backgroundColor: SACRED_COLORS.warningBg, // #F5F0E8 - vàng nhạt
    borderWidth: 1,
    borderColor: SACRED_COLORS.gold, // #C9A572
  },
  infoIconContainer: {
    backgroundColor: "transparent",
  },
  infoTitle: {
    color: SACRED_COLORS.goldDark,
  },
});
