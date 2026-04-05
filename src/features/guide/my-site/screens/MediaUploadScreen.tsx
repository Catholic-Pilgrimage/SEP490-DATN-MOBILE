/**
 * MediaUploadScreen
 * Upload flow: Choose type → Select file / paste YouTube URL → Preview + Caption → Submit
 *
 * Supported uploads: image (camera/library), video (record/library), YouTube URL → stored as `video`.
 * Not uploaded here: `model_3d` (admin-only). GET /media types: image | video | model_3d.
 *
 * Features:
 * - Image compression (expo-image-manipulator), HEIC → JPEG
 * - Video: MIME inferred from picked asset (mp4/mov/webm)
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Platform,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollView } from "react-native-keyboard-aware-scroll-view";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import {
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import {
  uploadMedia,
  uploadMediaWithYouTube,
} from "../../../../services/api/guide";
import { MediaType } from "../../../../types/guide";
import { extractYoutubeVideoId } from "../../../../utils/mediaUtils";
import { YoutubeEmbedWebView } from "../components/YoutubeEmbedWebView";
import { styles } from "./MediaUploadScreen.styles";

// ============================================
// TYPES
// ============================================

type UploadStep = "select-type" | "select-file" | "preview";

interface MediaTypeOption {
  type: MediaType | "youtube";
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  iconColor: string;
  description: string;
}

interface CompressedImage {
  uri: string;
  width: number;
  height: number;
  fileSize?: number;
}

// ============================================
// CONSTANTS
// ============================================

const IMAGE_COMPRESSION = {
  maxWidth: 2000,
  maxHeight: 2000,
  quality: 0.8,
} as const;

/** MIME + filename for multipart upload (expo may omit mime on some Android builds). */
function buildVideoUploadFile(asset: ImagePicker.ImagePickerAsset): {
  uri: string;
  name: string;
  type: string;
} {
  const fromUri = decodeURIComponent(
    asset.uri.split("/").pop()?.split("?")[0] || "",
  );
  const rawName = asset.fileName || fromUri;
  const name =
    rawName && rawName.includes(".")
      ? rawName
      : `video_${Date.now()}.mp4`;
  const lower = name.toLowerCase();
  const mime =
    asset.mimeType ||
    (lower.endsWith(".mov") || lower.endsWith(".qt")
      ? "video/quicktime"
      : lower.endsWith(".webm")
        ? "video/webm"
        : lower.endsWith(".m4v")
          ? "video/x-m4v"
          : "video/mp4");
  return { uri: asset.uri, name, type: mime };
}

// ============================================
// COMPONENTS
// ============================================

interface MediaTypeCardProps {
  option: MediaTypeOption;
  onPress: () => void;
}

const MediaTypeCard: React.FC<MediaTypeCardProps> = ({ option, onPress }) => (
  <TouchableOpacity
    style={styles.typeCard}
    onPress={onPress}
    activeOpacity={0.7}
  >
    <View
      style={[
        styles.typeIconContainer,
        { backgroundColor: `${option.iconColor}15` },
      ]}
    >
      <MaterialIcons name={option.icon} size={32} color={option.iconColor} />
    </View>
    <View style={styles.typeCardContent}>
      <Text style={styles.typeCardLabel}>{option.label}</Text>
      <Text style={styles.typeCardDescription}>{option.description}</Text>
    </View>
    <MaterialIcons
      name="chevron-right"
      size={24}
      color={GUIDE_COLORS.gray400}
    />
  </TouchableOpacity>
);

// ============================================
// MAIN COMPONENT
// ============================================

export const MediaUploadScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { t } = useTranslation();

  const mediaTypeOptions = useMemo((): MediaTypeOption[] => {
    return [
      {
        type: "image",
        label: t("mediaUpload.typeImageLabel"),
        icon: "photo-camera",
        iconColor: GUIDE_COLORS.info,
        description: t("mediaUpload.typeImageDesc"),
      },
      {
        type: "video",
        label: t("mediaUpload.typeVideoLabel"),
        icon: "videocam",
        iconColor: GUIDE_COLORS.error,
        description: t("mediaUpload.typeVideoDesc"),
      },
      {
        type: "youtube",
        label: t("mediaUpload.typeYoutubeLabel"),
        icon: "smart-display",
        iconColor: "#FF0000",
        description: t("mediaUpload.typeYoutubeDesc"),
      },
    ];
  }, [t]);

  // State
  const [step, setStep] = useState<UploadStep>("select-type");
  const [selectedType, setSelectedType] = useState<
    MediaType | "youtube" | null
  >(null);
  const [selectedFile, setSelectedFile] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [compressedImage, setCompressedImage] =
    useState<CompressedImage | null>(null);
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [caption, setCaption] = useState("");
  const [uploading, setUploading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [isMediaPickerVisible, setIsMediaPickerVisible] = useState(false);
  const [mediaPickerConfig, setMediaPickerConfig] = useState<{
    mediaTypes: "images" | "videos";
    allowsEditing: boolean;
  }>({ mediaTypes: "images", allowsEditing: false });

  const player = useVideoPlayer(
    selectedType === "video" && selectedFile ? selectedFile.uri : "",
    (player) => {
      player.loop = true;
    },
  );

  // ============================================
  // IMAGE COMPRESSION
  // ============================================

  /** Chỉ dùng cho upload ảnh (bước này không xử lý model_3d). */
  const compressImage = useCallback(
    async (uri: string): Promise<CompressedImage> => {
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: IMAGE_COMPRESSION.maxWidth,
              height: IMAGE_COMPRESSION.maxHeight,
            },
          },
        ],
        {
          compress: IMAGE_COMPRESSION.quality,
          format: ImageManipulator.SaveFormat.JPEG,
        },
      );

      return {
        uri: manipulated.uri,
        width: manipulated.width,
        height: manipulated.height,
      };
    },
    [],
  );

  // Handlers
  const handleBack = useCallback(() => {
    if (step === "preview") {
      setStep("select-file");
      setCompressedImage(null);
    } else if (step === "select-file") {
      setStep("select-type");
      setSelectedFile(null);
      setCompressedImage(null);
      setYoutubeUrl("");
    } else {
      navigation.goBack();
    }
  }, [step, navigation]);

  const handleMediaPicked = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (!result.canceled && result.assets[0] && selectedType) {
        const asset = result.assets[0];
        setSelectedFile(asset);

        // Compress image (not video)
        if (selectedType !== "video" && selectedType !== "youtube") {
          setCompressing(true);
          try {
            const compressed = await compressImage(asset.uri);
            setCompressedImage(compressed);
          } catch (error) {
            console.error("Compression error:", error);
            // Fallback to original if compression fails
            setCompressedImage({
              uri: asset.uri,
              width: asset.width || 0,
              height: asset.height || 0,
            });
          } finally {
            setCompressing(false);
          }
        }

        setStep("preview");
      }
    },
    [selectedType, compressImage],
  );

  const handleSelectType = useCallback((type: MediaType | "youtube") => {
    setSelectedType(type);

    if (type === "youtube") {
      setStep("select-file");
    } else {
      const mediaTypesOptions: "images" | "videos" =
        type === "video" ? "videos" : "images";
      setMediaPickerConfig({
        mediaTypes: mediaTypesOptions,
        // Video: không crop/trim ở picker — tránh lỗi trên một số máy khi quay file dài
        allowsEditing: type === "image",
      });
      setIsMediaPickerVisible(true);
    }
  }, []);

  const handleYoutubeUrlSubmit = useCallback(() => {
    if (!youtubeUrl.trim()) {
      Toast.show({
        type: "error",
        text1: t("mediaUpload.missingLink"),
        text2: t("mediaUpload.enterUrlHint"),
      });
      return;
    }

    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      Toast.show({
        type: "error",
        text1: t("mediaUpload.invalidYoutube"),
        text2: t("mediaUpload.invalidYoutube"),
      });
      return;
    }

    setStep("preview");
  }, [youtubeUrl, t]);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;

    setUploading(true);

    try {
      let result;

      if (selectedType === "youtube") {
        result = await uploadMediaWithYouTube({
          type: "video",
          url: youtubeUrl.trim(),
          caption: caption.trim() || undefined,
        });
      } else {
        const fileUri =
          selectedType !== "video" && compressedImage
            ? compressedImage.uri
            : selectedFile?.uri;

        if (!fileUri || !selectedFile) {
          throw new Error("No file selected");
        }

        const filePayload =
          selectedType === "video"
            ? buildVideoUploadFile(selectedFile)
            : {
                uri: fileUri,
                name: `image_${Date.now()}.jpg`,
                type: "image/jpeg",
              };

        const uploadType: Extract<MediaType, "image" | "video"> =
          selectedType === "video" ? "video" : "image";

        result = await uploadMedia({
          type: uploadType,
          caption: caption.trim() || undefined,
          file: filePayload,
        });
      }

      if (result?.success) {
        Toast.show({
          type: "success",
          text1: t("mediaUpload.successTitle"),
          text2: t("mediaUpload.successBody"),
        });
        setTimeout(() => navigation.goBack(), 450);
      } else {
        Toast.show({
          type: "error",
          text1: t("mediaUpload.uploadFailed"),
          text2: result?.message || t("mediaUpload.errorGeneric"),
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: "error",
        text1: t("mediaUpload.uploadFailed"),
        text2: t("mediaUpload.errorGeneric"),
      });
    } finally {
      setUploading(false);
    }
  }, [
    selectedType,
    selectedFile,
    compressedImage,
    youtubeUrl,
    caption,
    navigation,
    t,
  ]);

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case "select-type":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("mediaUpload.step1Title")}</Text>
            <Text style={styles.stepSubtitle}>
              {t("mediaUpload.step1Subtitle")}
            </Text>
            <View style={styles.typeList}>
              {mediaTypeOptions.map((option) => (
                <MediaTypeCard
                  key={option.type}
                  option={option}
                  onPress={() => handleSelectType(option.type)}
                />
              ))}
            </View>
          </View>
        );

      case "select-file":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("mediaUpload.stepYoutubeTitle")}</Text>
            <Text style={styles.stepSubtitle}>
              {t("mediaUpload.stepYoutubeSubtitle")}
            </Text>
            <View style={styles.urlInputContainer}>
              <MaterialIcons
                name="link"
                size={24}
                color={GUIDE_COLORS.gray400}
                style={styles.urlInputIcon}
              />
              <TextInput
                style={styles.urlInput}
                placeholder={t("mediaUpload.urlPlaceholder")}
                placeholderTextColor={GUIDE_COLORS.gray400}
                value={youtubeUrl}
                onChangeText={setYoutubeUrl}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
            <TouchableOpacity
              style={[
                styles.continueButton,
                !youtubeUrl.trim() && styles.continueButtonDisabled,
              ]}
              onPress={handleYoutubeUrlSubmit}
              disabled={!youtubeUrl.trim()}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>{t("mediaUpload.continue")}</Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={GUIDE_COLORS.surface}
              />
            </TouchableOpacity>
          </View>
        );

      case "preview": {
        const thumbUri = compressedImage?.uri || selectedFile?.uri;
        const youtubeId =
          selectedType === "youtube"
            ? extractYoutubeVideoId(youtubeUrl)
            : null;

        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>{t("mediaUpload.stepPreviewTitle")}</Text>

            {/* Preview */}
            <View style={styles.previewContainer}>
              {compressing ? (
                <View style={styles.previewPlaceholder}>
                  <ActivityIndicator
                    size="large"
                    color={GUIDE_COLORS.primary}
                  />
                  <Text
                    style={[
                      styles.captionLabel,
                      { marginTop: GUIDE_SPACING.md },
                    ]}
                  >
                    {t("mediaUpload.compressingImage")}
                  </Text>
                </View>
              ) : selectedType === "video" && selectedFile ? (
                <VideoView
                  style={styles.previewImage}
                  player={player}
                  fullscreenOptions={{ enable: true }}
                  allowsPictureInPicture
                  contentFit="contain"
                />
              ) : selectedType === "youtube" && youtubeId ? (
                <YoutubeEmbedWebView
                  videoUrl={youtubeUrl}
                  style={styles.previewImage}
                  play={false}
                />
              ) : thumbUri ? (
                <Image
                  source={{ uri: thumbUri }}
                  style={styles.previewImage}
                  resizeMode="cover"
                />
              ) : (
                <View style={styles.previewPlaceholder}>
                  <MaterialIcons
                    name="broken-image"
                    size={48}
                    color={GUIDE_COLORS.gray300}
                  />
                </View>
              )}

              {/* Type badge */}
              <View style={styles.previewTypeBadge}>
                <MaterialIcons
                  name={
                    selectedType === "youtube"
                      ? "smart-display"
                      : selectedType === "video"
                        ? "videocam"
                        : "photo-camera"
                  }
                  size={16}
                  color={GUIDE_COLORS.surface}
                />
                <Text style={styles.previewTypeBadgeText}>
                  {selectedType === "youtube"
                    ? t("mediaUpload.badgeYoutube")
                    : selectedType === "video"
                      ? t("mediaUpload.badgeVideo")
                      : t("mediaUpload.badgePhoto")}
                </Text>
              </View>
            </View>

            {/* Caption Input */}
            <View style={styles.captionContainer}>
              <Text style={styles.captionLabel}>Caption (tùy chọn)</Text>
              <TextInput
                style={styles.captionInput}
                placeholder="Mô tả về media này..."
                placeholderTextColor={GUIDE_COLORS.gray400}
                value={caption}
                onChangeText={setCaption}
                multiline
                numberOfLines={3}
                maxLength={500}
              />
              <Text style={styles.captionCount}>{caption.length}/500</Text>
            </View>

            {/* Status Notice */}
            <View style={styles.statusNotice}>
              <MaterialIcons
                name="info-outline"
                size={18}
                color={GUIDE_COLORS.warning}
              />
              <Text style={styles.statusNoticeText}>
                {t("mediaUpload.pendingNotice")}
              </Text>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              style={[
                styles.submitButton,
                (uploading || compressing) && styles.submitButtonDisabled,
              ]}
              onPress={handleSubmit}
              disabled={uploading || compressing}
              activeOpacity={0.8}
            >
              {uploading ? (
                <ActivityIndicator color={GUIDE_COLORS.surface} />
              ) : (
                <>
                  <MaterialIcons
                    name="cloud-upload"
                    size={22}
                    color={GUIDE_COLORS.surface}
                  />
                  <Text style={styles.submitButtonText}>{t("mediaUpload.submit")}</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      }
    }
  };

  // Progress indicator
  const getStepNumber = () => {
    switch (step) {
      case "select-type":
        return 1;
      case "select-file":
        return 2;
      case "preview":
        return 3;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor={GUIDE_COLORS.creamBg}
      />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={handleBack}>
          <MaterialIcons
            name="arrow-back-ios"
            size={20}
            color={GUIDE_COLORS.creamInk}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("mediaUpload.screenTitle")}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        {[1, 2, 3].map((num) => (
          <React.Fragment key={num}>
            <View
              style={[
                styles.progressStep,
                getStepNumber() >= num && styles.progressStepActive,
              ]}
            >
              <Text
                style={[
                  styles.progressStepText,
                  getStepNumber() >= num && styles.progressStepTextActive,
                ]}
              >
                {num}
              </Text>
            </View>
            {num < 3 && (
              <View
                style={[
                  styles.progressLine,
                  getStepNumber() > num && styles.progressLineActive,
                ]}
              />
            )}
          </React.Fragment>
        ))}
      </View>

      {/* Content */}
      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + GUIDE_SPACING.xxxl },
        ]}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        enableOnAndroid
        enableAutomaticScroll
        enableResetScrollToCoords={false}
        extraScrollHeight={Platform.select({ ios: 24, android: 72 })}
        extraHeight={Platform.select({ ios: 80, android: 140 })}
      >
        {renderStepContent()}
      </KeyboardAwareScrollView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={mediaPickerConfig.mediaTypes}
        allowsEditing={mediaPickerConfig.allowsEditing}
        quality={1}
        title={
          selectedType === "video"
            ? t("mediaUpload.pickerTitleVideo")
            : t("mediaUpload.pickerTitleImage")
        }
      />
    </View>
  );
};


export default MediaUploadScreen;
