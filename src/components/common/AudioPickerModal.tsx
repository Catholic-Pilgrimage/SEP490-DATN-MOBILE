import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import React from "react";
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
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../constants/theme.constants";

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

              <View style={styles.header}>
                <Text style={styles.title}>{title || t('journal.addAudioSource')}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={COLORS.textSecondary}
                  />
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
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: COLORS.warningLight || '#FFF8E1' },
                    ]}
                  >
                    <MaterialIcons
                      name="mic"
                      size={24}
                      color={COLORS.accent}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>{t('journal.recordNow')}</Text>
                    <Text style={styles.optionDesc}>
                      {t('journal.recordNowDesc')}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Option: Upload File */}
                <TouchableOpacity
                  style={styles.option}
                  onPress={() => {
                    onClose();
                    onUploadFile();
                  }}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: COLORS.successLight || '#E8F5E9' },
                    ]}
                  >
                    <MaterialIcons
                      name="file-upload"
                      size={24}
                      color={COLORS.success}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>{t('journal.uploadAudioFile')}</Text>
                    <Text style={styles.optionDesc}>
                      {t('journal.uploadAudioFileDesc')}
                    </Text>
                  </View>
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
    paddingBottom: Platform.OS === "ios" ? 34 : SPACING.lg,
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
    width: 48,
    height: 48,
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
    marginBottom: 2,
  },
  optionDesc: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
});
