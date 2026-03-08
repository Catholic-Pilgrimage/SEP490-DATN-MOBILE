import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback } from "react";
import {
    Modal,
    Platform,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../constants/theme.constants";

export type PickerOptionType = "camera_photo" | "camera_video" | "library";

export interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onMediaPicked: (result: ImagePicker.ImagePickerResult) => void;
  mediaTypes?:
    | "images"
    | "videos"
    | "livePhotos"
    | ("images" | "videos" | "livePhotos")[];
  allowsEditing?: boolean;
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  title?: string;
  aspect?: [number, number];
}

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  visible,
  onClose,
  onMediaPicked,
  mediaTypes = ["images", "videos"],
  allowsEditing = false,
  quality = 0.8,
  allowsMultipleSelection = false,
  selectionLimit = 1,
  title = "Chọn thao tác",
  aspect,
}) => {
  const handlePickCamera = useCallback(
    async (type: "photo" | "video") => {
      onClose();
      setTimeout(
        async () => {
          try {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Toast.show({
                type: "error",
                text1: "Từ chối quyền",
                text2: "Vui lòng cấp quyền máy ảnh để sử dụng chức năng này.",
              });
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: type === "photo" ? "images" : "videos",
              allowsEditing,
              aspect,
              quality,
            });

            if (!result.canceled) {
              onMediaPicked(result);
            }
          } catch (error: any) {
            Toast.show({
              type: "error",
              text1: "Lỗi",
              text2: error.message || "Không thể mở máy ảnh",
            });
          }
        },
        Platform.OS === "ios" ? 300 : 0,
      );
    },
    [allowsEditing, quality, onClose, onMediaPicked],
  );

  const handlePickLibrary = useCallback(async () => {
    onClose();
    setTimeout(
      async () => {
        try {
          const permission =
            await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (!permission.granted) {
            Toast.show({
              type: "error",
              text1: "Từ chối quyền",
              text2: "Vui lòng cấp quyền thư viện để chọn ảnh/video.",
            });
            return;
          }

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes,
            allowsEditing,
            aspect,
            quality,
            allowsMultipleSelection,
            selectionLimit: allowsMultipleSelection ? selectionLimit : 1,
          });

          if (!result.canceled) {
            onMediaPicked(result);
          }
        } catch (error: any) {
          Toast.show({
            type: "error",
            text1: "Lỗi",
            text2: error.message || "Không thể mở thư viện",
          });
        }
      },
      Platform.OS === "ios" ? 300 : 0,
    );
  }, [
    mediaTypes,
    allowsEditing,
    quality,
    allowsMultipleSelection,
    selectionLimit,
    onClose,
    onMediaPicked,
  ]);

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
                <Text style={styles.title}>{title}</Text>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons
                    name="close"
                    size={24}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {(Array.isArray(mediaTypes)
                  ? mediaTypes.includes("images")
                  : mediaTypes === "images") && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handlePickCamera("photo")}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: "#E3F2FD" },
                      ]}
                    >
                      <MaterialIcons
                        name="photo-camera"
                        size={24}
                        color="#2196F3"
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.optionTitle}>Chụp ảnh mới</Text>
                      <Text style={styles.optionDesc}>
                        Sử dụng máy ảnh để chụp
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                {(Array.isArray(mediaTypes)
                  ? mediaTypes.includes("videos")
                  : mediaTypes === "videos") && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handlePickCamera("video")}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: "#FFF5F5" },
                      ]}
                    >
                      <MaterialIcons
                        name="videocam"
                        size={24}
                        color={COLORS.danger}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.optionTitle}>Quay video mới</Text>
                      <Text style={styles.optionDesc}>
                        Sử dụng máy ảnh để quay
                      </Text>
                    </View>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.option}
                  onPress={handlePickLibrary}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: "#E8F5E9" },
                    ]}
                  >
                    <MaterialIcons
                      name="photo-library"
                      size={24}
                      color="#4CAF50"
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>Chọn từ thư viện</Text>
                    <Text style={styles.optionDesc}>
                      Tải lên từ thiết bị của bạn
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
