/**
 * MediaUploadScreen
 * Upload flow: Choose type → Select file/URL → Preview + Caption → Submit
 *
 * Features:
 * - Image compression (max 2MB, 2000px)
 * - EXIF orientation fix (automatic with expo-image-manipulator)
 * - HEIC → JPEG conversion
 * - Progress indicator
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImageManipulator from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

// Compression settings based on media type
const COMPRESSION_CONFIG = {
  image: { maxWidth: 2000, maxHeight: 2000, quality: 0.8, maxSizeMB: 2 },
  panorama: { maxWidth: 4096, maxHeight: 2048, quality: 0.85, maxSizeMB: 5 },
  video: { maxWidth: 1920, maxHeight: 1080, quality: 1, maxSizeMB: 100 },
};

const MEDIA_TYPES: MediaTypeOption[] = [
  {
    type: "image",
    label: "Ảnh",
    icon: "photo-camera",
    iconColor: GUIDE_COLORS.info,
    description: "Upload ảnh từ thư viện",
  },
  {
    type: "video",
    label: "Video",
    icon: "videocam",
    iconColor: GUIDE_COLORS.error,
    description: "Upload video từ thư viện",
  },
  {
    type: "panorama",
    label: "Panorama 360°",
    icon: "panorama-fish-eye",
    iconColor: GUIDE_COLORS.success,
    description: "Upload ảnh panorama 360°",
  },
  {
    type: "youtube",
    label: "YouTube URL",
    icon: "smart-display",
    iconColor: "#FF0000",
    description: "Nhập link video YouTube",
  },
];

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

  /**
   * Compress image using expo-image-manipulator
   * - Resize to max dimensions
   * - Convert to JPEG (fixes HEIC from iPhone)
   * - Compress quality
   * - Auto-fix EXIF orientation
   */
  const compressImage = useCallback(
    async (uri: string, type: MediaType): Promise<CompressedImage> => {
      const config = COMPRESSION_CONFIG[type] || COMPRESSION_CONFIG.image;

      // Manipulate image: resize and compress
      const manipulated = await ImageManipulator.manipulateAsync(
        uri,
        [
          {
            resize: {
              width: config.maxWidth,
              height: config.maxHeight,
            },
          },
        ],
        {
          compress: config.quality,
          format: ImageManipulator.SaveFormat.JPEG, // Convert HEIC → JPEG
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
            const compressed = await compressImage(
              asset.uri,
              selectedType as MediaType,
            );
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
        allowsEditing: type !== "panorama",
      });
      setIsMediaPickerVisible(true);
    }
  }, []);

  const handleYoutubeUrlSubmit = useCallback(() => {
    if (!youtubeUrl.trim()) {
      Toast.show({
        type: "error",
        text1: "Thiếu link",
        text2: "Vui lòng nhập link YouTube",
      });
      return;
    }

    // Validate YouTube URL
    const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
    if (!youtubeRegex.test(youtubeUrl)) {
      Toast.show({
        type: "error",
        text1: "Link không hợp lệ",
        text2: "Vui lòng dán đúng URL YouTube",
      });
      return;
    }

    setStep("preview");
  }, [youtubeUrl]);

  const getYoutubeThumbnail = useCallback((url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    )?.[1];
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : null;
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedType) return;

    setUploading(true);

    try {
      const mediaType: MediaType =
        selectedType === "youtube" ? "video" : selectedType;

      let result;

      if (selectedType === "youtube") {
        // YouTube URL: Send as JSON
        result = await uploadMediaWithYouTube({
          type: mediaType,
          url: youtubeUrl.trim(),
          caption: caption.trim() || undefined,
        });
      } else {
        // File upload: Send as multipart/form-data
        // Use compressed image for images, original for video
        const fileUri =
          selectedType !== "video" && compressedImage
            ? compressedImage.uri
            : selectedFile?.uri;

        if (!fileUri) {
          throw new Error("No file selected");
        }

        // Prepare file info for FormData
        const fileName =
          selectedType !== "video"
            ? `image_${Date.now()}.jpg` // Compressed images are always JPEG
            : `video_${Date.now()}.mp4`;

        const mimeType = selectedType !== "video" ? "image/jpeg" : "video/mp4";

        result = await uploadMedia({
          type: mediaType,
          caption: caption.trim() || undefined,
          file: {
            uri: fileUri,
            name: fileName,
            type: mimeType,
          },
        });
      }

      if (result?.success) {
        Toast.show({
          type: "success",
          text1: "Đã gửi media",
          text2: "Đang chờ duyệt. Bạn có thể theo dõi trong Thư viện media.",
        });
        setTimeout(() => navigation.goBack(), 450);
      } else {
        Toast.show({
          type: "error",
          text1: "Upload thất bại",
          text2: result?.message || "Không thể upload media",
        });
      }
    } catch (error) {
      console.error("Upload error:", error);
      Toast.show({
        type: "error",
        text1: "Lỗi",
        text2: "Đã có lỗi xảy ra khi upload",
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
  ]);

  // Render step content
  const renderStepContent = () => {
    switch (step) {
      case "select-type":
        return (
          <View style={styles.stepContent}>
            <Text style={styles.stepTitle}>Chọn loại media</Text>
            <Text style={styles.stepSubtitle}>
              Bạn muốn upload loại nội dung nào?
            </Text>
            <View style={styles.typeList}>
              {MEDIA_TYPES.map((option) => (
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
            <Text style={styles.stepTitle}>Nhập YouTube URL</Text>
            <Text style={styles.stepSubtitle}>
              Dán link video YouTube của bạn
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
                placeholder="https://youtube.com/watch?v=..."
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
              <Text style={styles.continueButtonText}>Tiếp tục</Text>
              <MaterialIcons
                name="arrow-forward"
                size={20}
                color={GUIDE_COLORS.surface}
              />
            </TouchableOpacity>
          </View>
        );

      case "preview":
        // Use compressed image for preview (if available), fallback to original
        const thumbnailUrl =
          selectedType === "youtube"
            ? getYoutubeThumbnail(youtubeUrl)
            : compressedImage?.uri || selectedFile?.uri;

        return (
          <KeyboardAvoidingView
            style={styles.stepContent}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
          >
            <Text style={styles.stepTitle}>Preview & Caption</Text>

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
                    Đang nén ảnh...
                  </Text>
                </View>
              ) : selectedType === "video" && selectedFile ? (
                <VideoView
                  style={styles.previewImage}
                  player={player}
                  allowsFullscreen
                  allowsPictureInPicture
                  contentFit="contain"
                />
              ) : thumbnailUrl ? (
                <>
                  <Image
                    source={{ uri: thumbnailUrl }}
                    style={styles.previewImage}
                    resizeMode="cover"
                  />
                  {selectedType === "youtube" && (
                    <TouchableOpacity
                      style={styles.playButton}
                      activeOpacity={0.8}
                      onPress={() => {
                        if (youtubeUrl) {
                          Linking.openURL(youtubeUrl).catch(() => {
                            Toast.show({
                              type: "error",
                              text1: "Lỗi",
                              text2: "Không thể mở video này",
                            });
                          });
                        }
                      }}
                    >
                      <MaterialIcons
                        name="play-arrow"
                        size={48}
                        color={GUIDE_COLORS.surface}
                      />
                    </TouchableOpacity>
                  )}
                </>
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
                        : selectedType === "panorama"
                          ? "panorama-fish-eye"
                          : "photo-camera"
                  }
                  size={16}
                  color={GUIDE_COLORS.surface}
                />
                <Text style={styles.previewTypeBadgeText}>
                  {selectedType === "youtube"
                    ? "YouTube"
                    : selectedType === "video"
                      ? "Video"
                      : selectedType === "panorama"
                        ? "360°"
                        : "Photo"}
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
                Media sẽ có trạng thái "Pending" và cần được Admin duyệt
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
                  <Text style={styles.submitButtonText}>Upload Media</Text>
                </>
              )}
            </TouchableOpacity>
          </KeyboardAvoidingView>
        );
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
        <Text style={styles.headerTitle}>Upload Media</Text>
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
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {renderStepContent()}
      </ScrollView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setIsMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={mediaPickerConfig.mediaTypes}
        allowsEditing={mediaPickerConfig.allowsEditing}
        quality={1}
        title={selectedType === "video" ? "Upload Video" : "Upload Ảnh"}
      />
    </View>
  );
};


export default MediaUploadScreen;
