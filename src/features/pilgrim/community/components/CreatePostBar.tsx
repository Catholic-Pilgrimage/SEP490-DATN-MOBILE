import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { useTranslation } from "react-i18next";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";

interface CreatePostBarProps {
  avatar?: string | null;
  name?: string;
  onPress: () => void;
}

const getInitials = (name?: string) => {
  if (!name) return "P";
  const parts = name.trim().split(" ");
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
};

export const CreatePostBar: React.FC<CreatePostBarProps> = ({
  avatar,
  name,
  onPress,
}) => {
  const { t } = useTranslation();

  return (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={onPress}
      style={styles.container}
    >
      <View style={styles.row}>
        {avatar ? (
          <Image source={{ uri: avatar }} style={styles.avatar} />
        ) : (
          <View style={[styles.avatar, styles.initialsContainer]}>
            <Text style={styles.initialsText}>{getInitials(name)}</Text>
          </View>
        )}

        <View style={styles.inputContainer}>
          <View style={styles.promptDot} />
          <Text style={styles.placeholderText}>
            {t("community.createPostPlaceholder", {
              defaultValue: "Share blessings or a prayer...",
            })}
          </Text>
        </View>
        <LinearGradient
          colors={["#F3E7C4", "#EFD67B"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.iconButton}
        >
          <Ionicons name="images-outline" size={22} color="#8A7440" />
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "rgba(255,255,255,0.96)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.24)",
    ...SHADOWS.subtle,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: "rgba(191, 167, 111, 0.25)",
  },
  initialsContainer: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
    borderColor: COLORS.borderLight,
  },
  initialsText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: "bold",
  },
  inputContainer: {
    flex: 1,
    height: 48,
    backgroundColor: "#F7F7F2",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "#ECE7D8",
    justifyContent: "center",
    paddingHorizontal: SPACING.md,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  promptDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "rgba(179, 138, 46, 0.55)",
  },
  placeholderText: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontStyle: "italic",
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.4)",
  },
});
