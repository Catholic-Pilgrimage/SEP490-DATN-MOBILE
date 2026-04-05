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
  COLORS,
  SHADOWS,
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
      animationType="fade"
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
                      { backgroundColor: "rgba(255, 152, 0, 0.12)" },
                    ]}
                  >
                    <MaterialIcons
                      name="mic-none"
                      size={28}
                      color="#FF9800"
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
                      { backgroundColor: "rgba(76, 175, 80, 0.12)" },
                    ]}
                  >
                    <MaterialIcons
                      name="file-upload"
                      size={28}
                      color="#4CAF50"
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
    backgroundColor: "rgba(0, 0, 0, 0.45)",
    justifyContent: "flex-end",
  },
  container: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingBottom: Platform.OS === "ios" ? 40 : 24,
    ...SHADOWS.large,
  },
  handleBarContainer: {
    alignItems: "center",
    paddingVertical: 12,
  },
  handleBar: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#E0E0E0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 24,
    marginBottom: 16,
  },
  titleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerIcon: {
    marginRight: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#212121",
    letterSpacing: -0.3,
  },
  closeButton: {
    padding: 6,
    backgroundColor: "#F5F5F5",
    borderRadius: 20,
  },
  optionsContainer: {
    paddingHorizontal: 20,
    gap: 12,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  textContainer: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#212121",
    marginBottom: 4,
  },
  optionDesc: {
    fontSize: 13,
    color: "#757575",
    lineHeight: 18,
  },
});
