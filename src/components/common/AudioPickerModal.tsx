import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import {
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../constants/theme.constants";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export interface AudioPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onRecordNow: () => void;
  onUploadFile: () => void;
  title?: string;
}

export const AudioPickerModal: React.FC<AudioPickerModalProps> = ({
  visible,
  onClose,
  onRecordNow,
  onUploadFile,
  title,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <View
              style={[
                styles.container,
                { paddingBottom: Math.max(insets.bottom, SPACING.lg) },
              ]}
            >
              {/* Handle Bar */}
              <View style={styles.handleBarContainer}>
                <View style={styles.handleBar} />
              </View>

              <View style={styles.header}>
                <View style={styles.titleContainer}>
                  <MaterialIcons
                    name="audiotrack"
                    size={20}
                    color={COLORS.primary}
                    style={styles.headerIcon}
                  />
                  <Text style={styles.title}>
                    {title || t("journal.addAudioSource")}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {/* Option: Record Now */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onClose();
                    onRecordNow();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: "rgba(236, 182, 19, 0.12)" },
                    ]}
                  >
                    <MaterialIcons
                      name="mic-none"
                      size={28}
                      color={COLORS.accent}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>
                      {t("journal.recordNow")}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {t("journal.recordNowDesc")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#BDBDBD"
                  />
                </TouchableOpacity>

                {/* Option: Upload File */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onClose();
                    onUploadFile();
                  }}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: COLORS.successLight },
                    ]}
                  >
                    <MaterialIcons
                      name="file-upload"
                      size={28}
                      color={COLORS.success}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>
                      {t("journal.uploadAudioFile")}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {t("journal.uploadAudioFileDesc")}
                    </Text>
                  </View>
                  <Ionicons
                    name="chevron-forward"
                    size={20}
                    color="#BDBDBD"
                  />
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
  overlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    paddingTop: SPACING.xs,
    ...SHADOWS.large,
  },
  handleBarContainer: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  handleBar: {
    width: 40,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: COLORS.borderMedium,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  closeButton: {
    padding: SPACING.xs,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.full,
  },
  optionsContainer: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.xl,
    paddingTop: SPACING.sm,
    gap: SPACING.md,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
});
