import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  SafeAreaView,
} from "react-native";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import { AudioPickerModal } from "../../../../components/common/AudioPickerModal";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useAuth } from "../../../../contexts/AuthContext";
import { useI18n } from "../../../../hooks/useI18n";
import {
  useCreatePost,
  usePostDetail,
  useUpdatePost,
} from "../../../../hooks/usePosts";
import type { FeedPost } from "../../../../types/post.types";
import { getAudioUploadMeta } from "../../../../utils/audioUpload";

const COMMUNITY_BG = require("../../../../../assets/images/bg3.jpg");
const MAX_IMAGES = 4;
const VIDEO_EXTENSIONS = new Set(["mp4", "mov", "avi", "webm", "mkv", "m4v"]);

const getFileExtension = (uri: string, fallback: string) => {
  const cleanUri = uri.split("?")[0] || "";
  const extension = cleanUri.split(".").pop()?.trim().toLowerCase();
  return extension || fallback;
};

const isVideoAsset = (asset: ImagePicker.ImagePickerAsset) => {
  const extension = getFileExtension(asset.fileName || asset.uri, "");

  return (
    asset.type === "video" ||
    asset.mimeType?.startsWith("video/") ||
    VIDEO_EXTENSIONS.has(extension) ||
    Boolean(asset.duration && asset.duration > 0)
  );
};

const buildImageFile = (asset: ImagePicker.ImagePickerAsset, index: number) => {
  const extension = getFileExtension(asset.uri, "jpg");

  return {
    uri: Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri,
    type: asset.mimeType || `image/${extension}`,
    name: asset.fileName || `post_image_${index}.${extension}`,
  };
};

const buildVideoFile = (asset: ImagePicker.ImagePickerAsset) => {
  const extension = getFileExtension(asset.uri, "mp4");

  return {
    uri: Platform.OS === "ios" ? asset.uri.replace("file://", "") : asset.uri,
    type: asset.mimeType || `video/${extension}`,
    name: asset.fileName || `post_video.${extension}`,
  };
};

const buildAudioFile = (uri: string) => {
  const { extension, mimeType } = getAudioUploadMeta(uri);

  return {
    uri: Platform.OS === "ios" ? uri.replace("file://", "") : uri,
    type: mimeType,
    name: `post_audio.${extension}`,
  };
};

const formatDuration = (seconds: number) => {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

const areStringListsEqual = (left: string[], right: string[]) =>
  left.length === right.length &&
  left.every((item, index) => item === right[index]);

export default function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const { t } = useI18n();
  const postId = route.params?.postId as string | undefined;
  const initialPost = route.params?.initialPost as FeedPost | undefined;
  const isEditing = Boolean(postId);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [selectedVideo, setSelectedVideo] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingUri, setRecordingUri] = useState<string | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isRecording, setIsRecording] = useState(false);
  const [isAudioPickerVisible, setAudioPickerVisible] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);
  const [retainedExistingImages, setRetainedExistingImages] = useState<
    string[]
  >([]);
  const [retainedExistingVideoUrl, setRetainedExistingVideoUrl] = useState<
    string | null
  >(null);
  const [retainedExistingAudioUrl, setRetainedExistingAudioUrl] = useState<
    string | null
  >(null);
  const [previewImageUri, setPreviewImageUri] = useState<string | null>(null);

  const hydratedRef = useRef(false);
  const soundUriRef = useRef<string | null>(null);

  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const { data: editingPost, isLoading: isLoadingEditingPost } = usePostDetail(
    postId || "",
  );
  const { confirm } = useConfirm();
  const sourcePost = editingPost || initialPost;
  const sourcePostImages = sourcePost?.image_urls || [];
  const sourcePostVideoUrl =
    sourcePost?.video_url || sourcePost?.sourceJournal?.video_url || null;
  const sourcePostAudioUrl =
    sourcePost?.audio_url || sourcePost?.sourceJournal?.audio_url || null;
  const playableAudioUri = recordingUri || retainedExistingAudioUrl || null;
  const currentVideoUri = selectedVideo?.uri || retainedExistingVideoUrl || "";
  const hasExistingAttachments =
    retainedExistingImages.length > 0 ||
    Boolean(retainedExistingVideoUrl) ||
    Boolean(retainedExistingAudioUrl);
  const hasDraftAttachments =
    images.length > 0 || Boolean(selectedVideo) || Boolean(recordingUri);
  const canSubmit =
    content.trim().length > 0 || hasDraftAttachments || hasExistingAttachments;
  const hasExistingImagesChanged = !areStringListsEqual(
    retainedExistingImages,
    sourcePostImages,
  );
  const shouldSyncExistingImages =
    isEditing &&
    sourcePostImages.length > 0 &&
    (images.length > 0 || hasExistingImagesChanged);
  const shouldSyncExistingVideo =
    isEditing &&
    Boolean(sourcePostVideoUrl) &&
    (Boolean(selectedVideo) || retainedExistingVideoUrl !== sourcePostVideoUrl);
  const shouldSyncExistingAudio =
    isEditing &&
    Boolean(sourcePostAudioUrl) &&
    (Boolean(recordingUri) || retainedExistingAudioUrl !== sourcePostAudioUrl);
  const videoPlayer = useVideoPlayer(currentVideoUri, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    if (!isEditing || hydratedRef.current) return;

    if (!sourcePost) return;

    const nextSourcePostImages = sourcePost.image_urls || [];
    const nextSourcePostVideoUrl =
      sourcePost.video_url || sourcePost.sourceJournal?.video_url || null;
    const nextSourcePostAudioUrl =
      sourcePost.audio_url || sourcePost.sourceJournal?.audio_url || null;

    setContent(sourcePost.content || "");
    setRetainedExistingImages(nextSourcePostImages);
    setRetainedExistingVideoUrl(nextSourcePostVideoUrl);
    setRetainedExistingAudioUrl(nextSourcePostAudioUrl);
    hydratedRef.current = true;
  }, [isEditing, sourcePost]);

  useEffect(() => {
    return () => {
      if (recording) {
        recording
          .getStatusAsync()
          .then((status) => {
            if (status.isRecording || status.canRecord) {
              return recording.stopAndUnloadAsync();
            }
            return null;
          })
          .catch(() => null);
      }

      if (sound) {
        sound.unloadAsync().catch(() => null);
      }
    };
  }, [recording, sound]);

  useEffect(() => {
    setHasVideoError(false);

    if (!currentVideoUri) return;

    const sub = videoPlayer.addListener(
      "statusChange",
      ({ status }: { status: string }) => {
        if (status === "error") {
          setHasVideoError(true);
        }
      },
    );

    return () => sub.remove();
  }, [currentVideoUri, videoPlayer]);

  const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
    setMediaPickerVisible(false);
    if (result.canceled) return;

    const pickedImages = result.assets.filter((asset) => !isVideoAsset(asset));
    const pickedVideos = result.assets.filter((asset) => isVideoAsset(asset));

    if (pickedImages.length > 0) {
      const availableImageSlots = Math.max(
        MAX_IMAGES - retainedExistingImages.length - images.length,
        0,
      );
      const nextImages = pickedImages.slice(0, availableImageSlots);

      if (nextImages.length > 0) {
        setImages((prev) => [...prev, ...nextImages]);
      }

      if (pickedImages.length > availableImageSlots) {
        Toast.show({
          type: "info",
          text1: t("createPost.imageLimit", {
            defaultValue: "Tối đa 4 ảnh",
          }),
        });
      }
    }

    if (pickedVideos.length > 0) {
      setSelectedVideo(pickedVideos[0]);

      if (pickedVideos.length > 1) {
        Toast.show({
          type: "info",
          text1: t("createPost.videoLimit", {
            defaultValue: "Chỉ giữ 1 video",
          }),
        });
      }
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeExistingImage = (index: number) => {
    setRetainedExistingImages((prev) => prev.filter((_, i) => i !== index));
  };

  const removeSelectedVideo = () => {
    setSelectedVideo(null);
  };

  const removeExistingVideo = () => {
    setRetainedExistingVideoUrl(null);
    setHasVideoError(false);
  };

  const handleOpenAudioPicker = () => {
    if (isRecording) {
      handleStopRecording();
      return;
    }
    setAudioPickerVisible(true);
  };

  const handlePickAudioFile = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setRecordingUri(asset.uri);
        setRecordingDuration(0);

        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2: t("journal.audioSaveSuccess", {
            defaultValue: "Đã chọn tệp âm thanh.",
          }),
        });
      }
    } catch (error) {
      console.error("Pick audio error:", error);
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Lỗi" }),
        text2: t("createPost.audioStartError", {
          defaultValue: "Không thể chọn tệp âm thanh.",
        }),
      });
    }
  };

  const startRecordingProcess = async () => {
    try {
      const permission = await Audio.requestPermissionsAsync();
      if (!permission.granted) {
        Alert.alert(
          t("createPost.audioPermissionTitle", {
            defaultValue: "Quyền microphone",
          }),
          t("createPost.audioPermissionDenied", {
            defaultValue: "Cần quyền microphone để ghi âm.",
          }),
        );
        return;
      }

      if (sound) {
        await sound.unloadAsync().catch(() => null);
        setSound(null);
        soundUriRef.current = null;
        setIsPlayingAudio(false);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });

      const { recording: nextRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );

      nextRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.durationMillis) {
          setRecordingDuration(Math.floor(status.durationMillis / 1000));
        }
      });

      setRecording(nextRecording);
      setIsRecording(true);
      setRecordingDuration(0);
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Loi" }),
        text2: t("createPost.audioStartError", {
          defaultValue: "Không thể bắt đầu ghi âm.",
        }),
      });
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();

      setRecordingUri(uri || null);
      setRecording(null);
      setIsRecording(false);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        shouldDuckAndroid: true,
      });
    } catch {
      setRecording(null);
      setIsRecording(false);
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Loi" }),
        text2: t("createPost.audioStopError", {
          defaultValue: "Không thể dừng ghi âm.",
        }),
      });
    }
  };

  const handlePlayAudio = async () => {
    if (!playableAudioUri) return;

    try {
      if (sound && soundUriRef.current === playableAudioUri) {
        if (isPlayingAudio) {
          await sound.pauseAsync();
          setIsPlayingAudio(false);
          return;
        }

        await sound.playAsync();
        setIsPlayingAudio(true);
        return;
      }

      if (sound) {
        await sound.unloadAsync().catch(() => null);
        setSound(null);
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: nextSound } = await Audio.Sound.createAsync(
        { uri: playableAudioUri },
        { shouldPlay: true },
        (status) => {
          if (!status.isLoaded) return;
          if (status.didJustFinish) {
            setIsPlayingAudio(false);
          }
        },
      );

      soundUriRef.current = playableAudioUri;
      setSound(nextSound);
      setIsPlayingAudio(true);
    } catch {
      setIsPlayingAudio(false);
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Loi" }),
        text2: t("createPost.playAudioError", {
          defaultValue: "Không thể phát ghi âm.",
        }),
      });
    }
  };

  const handleDeleteAudio = async () => {
    const targetAudioUri = recordingUri || retainedExistingAudioUrl;
    if (!targetAudioUri) return;

    const confirmed = await confirm({
      title: t("journal.deleteAudioTitle", { defaultValue: "Xóa ghi âm" }),
      message: t("journal.deleteAudioMessage", {
        defaultValue: "Bạn có chắc muốn xóa ghi âm này?",
      }),
      confirmText: t("common.delete", { defaultValue: "Xóa" }),
      type: "danger",
    });

    if (!confirmed) return;

    if (sound && soundUriRef.current === targetAudioUri) {
      await sound.unloadAsync().catch(() => null);
      setSound(null);
      soundUriRef.current = null;
      setIsPlayingAudio(false);
    }

    if (recordingUri) {
      setRecordingUri(null);
    } else {
      setRetainedExistingAudioUrl(null);
    }
    setRecordingDuration(0);

    Toast.show({
      type: "info",
      text1: t("common.success", { defaultValue: "Thành công" }),
      text2: t("journal.deleteSuccess", { defaultValue: "Đã xóa ghi âm" }),
    });
  };

  const handlePost = () => {
    if (!canSubmit) {
      Toast.show({
        type: "info",
        text1: t("createPost.contentRequired", {
          defaultValue: "Nội dung bắt buộc",
        }),
        text2: t("createPost.contentRequiredMessage", {
          defaultValue: "Vui lòng nhập nội dung bài viết hoặc thêm ảnh.",
        }),
      });
      return;
    }

    const safeImageAssets = images.filter((asset) => !isVideoAsset(asset));
    const fallbackVideoAsset =
      selectedVideo || images.find((asset) => isVideoAsset(asset)) || null;

    const formattedImages = safeImageAssets.map((img, index) =>
      buildImageFile(img, index),
    );
    const formattedVideo = fallbackVideoAsset
      ? buildVideoFile(fallbackVideoAsset)
      : undefined;
    const formattedAudio = recordingUri
      ? buildAudioFile(recordingUri)
      : undefined;
    const expectedImageCount =
      retainedExistingImages.length + formattedImages.length;
    const expectedHasVideo = Boolean(retainedExistingVideoUrl || formattedVideo);
    const expectedHasAudio = Boolean(retainedExistingAudioUrl || formattedAudio);

    const payload = {
      content: content.trim(),
      ...(formattedImages.length > 0 ? { images: formattedImages as any } : {}),
      ...(formattedVideo ? { video: formattedVideo as any } : {}),
      ...(formattedAudio ? { audio: formattedAudio as any } : {}),
      ...(shouldSyncExistingImages
        ? {
            image_urls: retainedExistingImages,
            clear_images: expectedImageCount === 0,
          }
        : {}),
      ...(shouldSyncExistingVideo
        ? {
            video_url: formattedVideo ? null : retainedExistingVideoUrl,
            clear_video: !expectedHasVideo,
          }
        : {}),
      ...(shouldSyncExistingAudio
        ? {
            audio_url: formattedAudio ? null : retainedExistingAudioUrl,
            clear_audio: !expectedHasAudio,
          }
        : {}),
    };

    if (isEditing && postId) {
      updatePostMutation.mutate(
        {
          postId,
          data: payload,
        },
        {
          onSuccess: () => {
            Toast.show({
              type: "success",
              text1: t("common.success", { defaultValue: "Thành công" }),
              text2: t("createPost.updateSuccess", {
                defaultValue: "Đã cập nhật bài viết.",
              }),
            });
            navigation.goBack();
          },
          onError: (error: any) => {
            Toast.show({
              type: "error",
              text1: t("common.error", { defaultValue: "Lỗi" }),
              text2:
                t("createPost.updateError", {
                  defaultValue: "Không thể cập nhật bài viết.",
                }) + ` ${error?.message || ""}`,
            });
          },
        },
      );
      return;
    }

    createPostMutation.mutate(payload, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2: t("createPost.createSuccess", {
            defaultValue: "Đã tạo bài viết và chia sẻ đến mọi người.",
          }),
        });
        navigation.goBack();
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Lỗi" }),
          text2:
            t("createPost.createError", {
              defaultValue: "Không thể tạo bài viết.",
            }) + ` ${error?.message || ""}`,
        });
      },
    });
  };

  const isSubmitting =
    createPostMutation.isPending || updatePostMutation.isPending;

  if (
    isEditing &&
    isLoadingEditingPost &&
    !hydratedRef.current &&
    !initialPost
  ) {
    return (
      <ImageBackground
        source={COMMUNITY_BG}
        style={styles.container}
        resizeMode="cover"
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={[
            "rgba(252, 248, 238, 0.62)",
            "rgba(255,255,255,0.54)",
            "rgba(250, 244, 230, 0.66)",
          ]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </ImageBackground>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1 }}>
      <ImageBackground
        source={COMMUNITY_BG}
        style={styles.container}
        resizeMode="cover"
      >
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={[
            "rgba(252, 248, 238, 0.62)",
            "rgba(255,255,255,0.54)",
            "rgba(250, 244, 230, 0.66)",
          ]}
          style={StyleSheet.absoluteFillObject}
        />
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.headerButton}
          >
            <Text style={styles.cancelText}>
              {t("common.cancel", { defaultValue: "Hủy" })}
            </Text>
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditing
              ? t("createPost.editPost", { defaultValue: "Chỉnh sửa bài viết" })
              : t("createPost.createPost", { defaultValue: "Tạo bài viết" })}
          </Text>
          <TouchableOpacity
            onPress={handlePost}
            style={[
              styles.postButton,
              !canSubmit && styles.postButtonDisabled,
              isSubmitting && { opacity: 0.8 },
            ]}
            disabled={isSubmitting || !canSubmit}
          >
            {isSubmitting ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <Text style={styles.postText}>
                {isEditing
                  ? t("common.save", { defaultValue: "Luu" })
                  : t("createPost.post", { defaultValue: "Dang" })}
              </Text>
            )}
          </TouchableOpacity>
        </View>

        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 20}
        >
          <ScrollView
            style={styles.contentContainer}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: SPACING.xl }}
          >
            <View style={styles.userInfo}>
              {user?.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
              ) : (
                <View style={[styles.avatar, styles.avatarFallback]}>
                  <Text style={styles.avatarFallbackText}>
                    {user?.fullName?.charAt(0).toUpperCase() || "P"}
                  </Text>
                </View>
              )}
              <Text style={styles.userName}>
                {user?.fullName ||
                  t("profile.defaultPilgrim", { defaultValue: "Người hành hương" })}
              </Text>
            </View>

            <TextInput
              style={styles.textInput}
              placeholder={t("createPost.placeholder", {
                defaultValue: "Bạn đang nghĩ gì?",
              })}
              placeholderTextColor={COLORS.textTertiary}
              multiline
              autoFocus
              value={content}
              onChangeText={setContent}
            />

            {isEditing && retainedExistingImages.length > 0 ? (
              <View style={styles.existingMediaSection}>
                <Text style={styles.existingMediaLabel}>
                  {t("createPost.existingImages", {
                    defaultValue: "Ảnh hiện có",
                  })}
                </Text>
                <View style={styles.imagePreviewContainer}>
                  {retainedExistingImages.map((uri, index) => (
                    <View
                      key={`${uri}-${index}`}
                      style={styles.imagePreviewWrapper}
                    >
                      <TouchableOpacity
                        activeOpacity={0.85}
                        onPress={() => setPreviewImageUri(uri)}
                      >
                        <Image source={{ uri }} style={styles.imagePreview} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.removeImageButton}
                        onPress={() => removeExistingImage(index)}
                      >
                        <Ionicons
                          name="close"
                          size={16}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {images.length > 0 ? (
              <View style={styles.imagePreviewContainer}>
                {images.map((img, index) => (
                  <View
                    key={`${img.uri}-${index}`}
                    style={styles.imagePreviewWrapper}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      onPress={() => setPreviewImageUri(img.uri)}
                    >
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.imagePreview}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeImageButton}
                      onPress={() => removeImage(index)}
                    >
                      <Ionicons name="close" size={16} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            {selectedVideo || retainedExistingVideoUrl ? (
              <View style={styles.attachmentSection}>
                <Text style={styles.existingMediaLabel}>
                  {selectedVideo
                    ? t("createPost.selectedVideo", {
                        defaultValue: "Video đã chọn",
                      })
                    : t("createPost.existingVideo", {
                        defaultValue: "Video hiện có",
                      })}
                </Text>
                {hasVideoError ? (
                  <View style={styles.videoFallback}>
                    <MaterialIcons
                      name="videocam-off"
                      size={30}
                      color={COLORS.textTertiary}
                    />
                    <Text style={styles.videoFallbackText}>
                      {t("createPost.videoUnavailable", {
                        defaultValue: "Không thể tải video xem trước.",
                      })}
                    </Text>
                    <TouchableOpacity
                      style={styles.videoRemoveButton}
                      onPress={
                        selectedVideo ? removeSelectedVideo : removeExistingVideo
                      }
                    >
                      <Ionicons name="close" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.videoPreviewCard}>
                    <VideoView
                      style={styles.videoPreview}
                      player={videoPlayer}
                      nativeControls
                      fullscreenOptions={{ enable: true }}
                      allowsPictureInPicture
                      contentFit="contain"
                    />
                    <TouchableOpacity
                      style={styles.videoRemoveButton}
                      onPress={
                        selectedVideo ? removeSelectedVideo : removeExistingVideo
                      }
                    >
                      <Ionicons name="close" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : null}

            {isRecording || playableAudioUri ? (
              <View style={styles.attachmentSection}>
                <Text style={styles.existingMediaLabel}>
                  {isRecording
                    ? t("createPost.recording", {
                        defaultValue: "Đang ghi âm",
                      })
                    : recordingUri
                      ? t("createPost.recordedAudio", {
                          defaultValue: "Ghi âm đã chọn",
                        })
                      : t("createPost.existingAudio", {
                          defaultValue: "Ghi âm hiện có",
                        })}
                </Text>
                {isRecording ? (
                  <View style={[styles.mediaCard, styles.recordingCard]}>
                    <View style={styles.recordingPulse} />
                    <View style={styles.mediaCardText}>
                      <Text style={styles.mediaCardTitle}>
                        {t("createPost.recordingNow", {
                          defaultValue: "Đang ghi âm...",
                        })}
                      </Text>
                      <Text style={styles.mediaCardSubtitle}>
                        {formatDuration(recordingDuration)}
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={[
                        styles.audioActionButton,
                        styles.audioActionButtonStop,
                      ]}
                      onPress={handleStopRecording}
                    >
                      <Ionicons name="stop" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.mediaCard}>
                    <View style={styles.mediaCardIcon}>
                      <MaterialIcons
                        name="audiotrack"
                        size={24}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={styles.mediaCardText}>
                      <Text style={styles.mediaCardTitle}>
                        {recordingUri
                          ? t("createPost.recordedFile", {
                              defaultValue: "File ghi âm",
                            })
                          : t("createPost.existingAudioFile", {
                              defaultValue: "Audio hiện có",
                            })}
                      </Text>
                      <Text style={styles.mediaCardSubtitle}>
                        {recordingUri
                          ? t("createPost.readyToPost", {
                              defaultValue: "Sẵn sàng để đăng",
                            })
                          : t("createPost.attachedToPost", {
                              defaultValue: "Đính kèm cùng bài viết",
                            })}
                      </Text>
                    </View>
                    <View style={styles.mediaCardActions}>
                      <TouchableOpacity
                        style={styles.audioActionButton}
                        onPress={handlePlayAudio}
                      >
                        <Ionicons
                          name={isPlayingAudio ? "pause" : "play"}
                          size={18}
                          color={COLORS.white}
                        />
                      </TouchableOpacity>
                      {(recordingUri || retainedExistingAudioUrl) && (
                        <TouchableOpacity
                          style={[
                            styles.audioActionButton,
                            styles.audioActionButtonDelete,
                          ]}
                          onPress={handleDeleteAudio}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={18}
                            color={COLORS.white}
                          />
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                )}
              </View>
            ) : null}
          </ScrollView>

          <View style={styles.toolbar}>
            <TouchableOpacity
              style={styles.toolbarButton}
              onPress={() => setMediaPickerVisible(true)}
            >
              <MaterialIcons
                name="insert-photo"
                size={22}
                color={COLORS.textSecondary}
              />
              <Text style={styles.toolbarText}>{t("createPost.addMedia")}</Text>
            </TouchableOpacity>

            {/* Audio Tool */}
            <TouchableOpacity
              style={[
                styles.toolbarButton,
                (recordingUri || retainedExistingAudioUrl) &&
                  styles.activeToolbarButton,
              ]}
              onPress={handleOpenAudioPicker}
            >
              <View style={styles.iconWrapper}>
                <MaterialIcons
                  name="mic"
                  size={22}
                  color={
                    recordingUri || retainedExistingAudioUrl
                      ? COLORS.primary
                      : COLORS.textSecondary
                  }
                />
                {(recordingUri || retainedExistingAudioUrl) && (
                  <View style={styles.activeDot} />
                )}
              </View>
              <Text
                style={[
                  styles.toolbarText,
                  (recordingUri || retainedExistingAudioUrl) &&
                    styles.activeToolbarText,
                ]}
              >
                {t("createPost.recordAudio")}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>

        <MediaPickerModal
          visible={isMediaPickerVisible}
          onClose={() => setMediaPickerVisible(false)}
          onMediaPicked={handleMediaPicked}
          allowsMultipleSelection={true}
          selectionLimit={MAX_IMAGES}
        />

        {/* Audio Picker Modal */}
        <AudioPickerModal
          visible={isAudioPickerVisible}
          onClose={() => setAudioPickerVisible(false)}
          onRecordNow={startRecordingProcess}
          onUploadFile={handlePickAudioFile}
        />

        <Modal
          visible={Boolean(previewImageUri)}
          transparent
          animationType="fade"
          onRequestClose={() => setPreviewImageUri(null)}
        >
          <View style={styles.previewBackdrop}>
            <TouchableOpacity
              style={styles.previewCloseBtn}
              onPress={() => setPreviewImageUri(null)}
            >
              <MaterialIcons name="close" size={28} color={COLORS.white} />
            </TouchableOpacity>
            {previewImageUri ? (
              <Image
                source={{ uri: previewImageUri }}
                style={styles.previewImage}
                resizeMode="contain"
              />
            ) : null}
          </View>
        </Modal>
      </ImageBackground>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === "ios" ? 10 : StatusBar.currentHeight || 20,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerButton: {
    padding: SPACING.xs,
  },
  cancelText: {
    fontSize: 16,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  headerTitle: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.textPrimary,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.xs,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 70,
    alignItems: "center",
    justifyContent: "center",
  },
  postButtonDisabled: {
    backgroundColor: COLORS.placeholder,
    opacity: 0.6,
  },
  postText: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
  contentContainer: {
    flex: 1,
    padding: SPACING.md,
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.full,
    marginRight: SPACING.sm,
  },
  avatarFallback: {
    backgroundColor: COLORS.primaryLight,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    color: COLORS.primary,
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
  },
  userName: {
    fontSize: 16,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.textPrimary,
  },
  textInput: {
    fontSize: 18,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
    color: COLORS.textPrimary,
    minHeight: 120,
    textAlignVertical: "top",
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: SPACING.md,
    gap: SPACING.sm,
  },
  imagePreviewWrapper: {
    width: "48%",
    aspectRatio: 1,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.small,
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  existingMediaSection: {
    marginTop: SPACING.lg,
  },
  existingMediaLabel: {
    fontSize: 14,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    marginLeft: SPACING.xs,
  },
  attachmentSection: {
    marginTop: SPACING.lg,
  },
  videoPreviewCard: {
    backgroundColor: COLORS.black,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    aspectRatio: 16 / 9,
    position: "relative",
    ...SHADOWS.medium,
  },
  videoPreview: {
    width: "100%",
    height: "100%",
  },
  videoRemoveButton: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "rgba(0,0,0,0.6)",
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  videoExistingBadge: {
    position: "absolute",
    top: 12,
    left: 12,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  existingBadgeText: {
    fontSize: 11,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.primary,
  },
  videoFallback: {
    backgroundColor: "#F5F5F5",
    borderRadius: BORDER_RADIUS.lg,
    aspectRatio: 16 / 9,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderStyle: "dashed",
  },
  videoFallbackText: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textTertiary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.small,
  },
  recordingCard: {
    backgroundColor: "#FFF9F0",
    borderColor: "#FFE0B2",
  },
  mediaCardIcon: {
    width: 48,
    height: 48,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "rgba(255, 152, 0, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  mediaCardText: {
    flex: 1,
  },
  mediaCardTitle: {
    fontSize: 15,
    fontFamily: TYPOGRAPHY.fontFamily.bold,
    color: COLORS.textPrimary,
  },
  mediaCardSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.regular,
  },
  mediaCardActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  audioActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  audioActionButtonStop: {
    backgroundColor: "#F44336",
  },
  audioActionButtonDelete: {
    backgroundColor: "#9E9E9E",
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#F44336",
    marginRight: SPACING.md,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    paddingBottom: Platform.OS === "ios" ? SPACING.lg : SPACING.md,
    backgroundColor: COLORS.white,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    gap: SPACING.md,
  },
  toolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: SPACING.xs,
  },
  activeToolbarButton: {
    backgroundColor: "rgba(255, 152, 0, 0.08)",
    borderWidth: 1,
    borderColor: "rgba(255, 152, 0, 0.2)",
  },
  toolbarText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontFamily: TYPOGRAPHY.fontFamily.medium,
  },
  iconWrapper: {
    position: "relative",
    justifyContent: "center",
    alignItems: "center",
    width: 24,
    height: 24,
  },
  activeDot: {
    position: "absolute",
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    borderWidth: 1.5,
    borderColor: COLORS.white,
  },
  activeToolbarText: {
    color: COLORS.primary,
    fontWeight: "600",
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 48,
    right: 20,
    zIndex: 20,
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
});
