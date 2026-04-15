import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import React, { useCallback } from "react";
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../constants/theme.constants";

export type MediaTypeOption =
  | ImagePicker.MediaTypeOptions
  | "images"
  | "videos"
  | "all"
  | "livePhotos";

export interface MediaPickerModalProps {
  visible: boolean;
  onClose: () => void;
  onMediaPicked: (result: ImagePicker.ImagePickerResult) => void;
  mediaTypes?: MediaTypeOption | MediaTypeOption[];
  allowsEditing?: boolean;
  quality?: number;
  allowsMultipleSelection?: boolean;
  selectionLimit?: number;
  title?: string;
  aspect?: [number, number];
}

const mapMediaType = (type: MediaTypeOption): ImagePicker.MediaTypeOptions => {
  switch (type) {
    case "images":
      return ImagePicker.MediaTypeOptions.Images;
    case "videos":
      return ImagePicker.MediaTypeOptions.Videos;
    case "all":
    case "livePhotos": // expo-image-picker treats livePhotos as images/videos depending on context, but All is safest here if we don't know
      return ImagePicker.MediaTypeOptions.All;
    default:
      return type as ImagePicker.MediaTypeOptions;
  }
};

export const MediaPickerModal: React.FC<MediaPickerModalProps> = ({
  visible,
  onClose,
  onMediaPicked,
  mediaTypes = ImagePicker.MediaTypeOptions.All,
  allowsEditing = false,
  quality = 0.8,
  allowsMultipleSelection = false,
  selectionLimit = 1,
  title,
  aspect,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  // Normalize mediaTypes for internal use
  const normalizedMediaTypes = Array.isArray(mediaTypes)
    ? mediaTypes.map(mapMediaType)
    : [mapMediaType(mediaTypes)];

  const firstMediaType = normalizedMediaTypes[0];

  const handlePickCamera = useCallback(
    async (type: "photo" | "video") => {
      onClose();
      // Small delay for modal to close smoothly before opening camera
      setTimeout(
        async () => {
          try {
            const permission =
              await ImagePicker.requestCameraPermissionsAsync();
            if (!permission.granted) {
              Toast.show({
                type: "error",
                text1: t("mediaPicker.permissionDenied"),
                text2: t("mediaPicker.cameraPermissionMsg"),
              });
              return;
            }

            const result = await ImagePicker.launchCameraAsync({
              mediaTypes:
                type === "photo"
                  ? ImagePicker.MediaTypeOptions.Images
                  : ImagePicker.MediaTypeOptions.Videos,
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
              text1: t("common.error"),
              text2: error.message || t("mediaPicker.cameraError"),
            });
          }
        },
        Platform.OS === "ios" ? 300 : 0,
      );
    },
    [allowsEditing, quality, onClose, onMediaPicked, aspect, t],
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
              text1: t("mediaPicker.permissionDenied"),
              text2: t("mediaPicker.libraryPermissionMsg"),
            });
            return;
          }

          const selectionMediaType = hasImages && hasVideos 
            ? ImagePicker.MediaTypeOptions.All 
            : firstMediaType;

          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: selectionMediaType,
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
            text1: t("common.error"),
            text2: error.message || t("mediaPicker.libraryError"),
          });
        }
      },
      Platform.OS === "ios" ? 300 : 0,
    );
  }, [
    firstMediaType,
    allowsEditing,
    quality,
    allowsMultipleSelection,
    selectionLimit,
    onClose,
    onMediaPicked,
    aspect,
    t,
  ]);

  const hasImages = normalizedMediaTypes.some(
    (type) =>
      type === ImagePicker.MediaTypeOptions.Images ||
      type === ImagePicker.MediaTypeOptions.All,
  );

  const hasVideos = normalizedMediaTypes.some(
    (type) =>
      type === ImagePicker.MediaTypeOptions.Videos ||
      type === ImagePicker.MediaTypeOptions.All,
  );

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
                    name="perm-media"
                    size={20}
                    color={COLORS.primary}
                    style={styles.headerIcon}
                  />
                  <Text style={styles.title}>
                    {title || t("journal.addMediaSource")}
                  </Text>
                </View>
                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                  <Ionicons name="close" size={20} color={COLORS.textSecondary} />
                </TouchableOpacity>
              </View>

              <View style={styles.optionsContainer}>
                {hasImages && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handlePickCamera("photo")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: "rgba(33, 150, 243, 0.1)" },
                      ]}
                    >
                      <MaterialIcons
                        name="photo-camera"
                        size={28}
                        color="#2196F3"
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.optionTitle}>
                        {t("mediaPicker.takePhoto")}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {t("mediaPicker.takePhotoDesc")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#BDBDBD"
                    />
                  </TouchableOpacity>
                )}

                {hasVideos && (
                  <TouchableOpacity
                    style={styles.option}
                    onPress={() => handlePickCamera("video")}
                    activeOpacity={0.7}
                  >
                    <View
                      style={[
                        styles.iconContainer,
                        { backgroundColor: "rgba(220, 76, 76, 0.1)" },
                      ]}
                    >
                      <MaterialIcons
                        name="videocam"
                        size={28}
                        color={COLORS.danger}
                      />
                    </View>
                    <View style={styles.textContainer}>
                      <Text style={styles.optionTitle}>
                        {t("mediaPicker.recordVideo")}
                      </Text>
                      <Text style={styles.optionDesc} numberOfLines={2}>
                        {t("mediaPicker.recordVideoDesc")}
                      </Text>
                    </View>
                    <Ionicons
                      name="chevron-forward"
                      size={20}
                      color="#BDBDBD"
                    />
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  style={styles.option}
                  onPress={handlePickLibrary}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.iconContainer,
                      { backgroundColor: COLORS.successLight },
                    ]}
                  >
                    <MaterialIcons
                      name="photo-library"
                      size={28}
                      color={COLORS.success}
                    />
                  </View>
                  <View style={styles.textContainer}>
                    <Text style={styles.optionTitle}>
                      {t("mediaPicker.chooseLibrary")}
                    </Text>
                    <Text style={styles.optionDesc} numberOfLines={2}>
                      {t("mediaPicker.chooseLibraryDesc")}
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
