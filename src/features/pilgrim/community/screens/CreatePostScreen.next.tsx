import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
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
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
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
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [hasVideoError, setHasVideoError] = useState(false);

  const hydratedRef = useRef(false);
  const soundUriRef = useRef<string | null>(null);

  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const { data: editingPost, isLoading: isLoadingEditingPost } = usePostDetail(
    postId || "",
  );
  const sourcePost = editingPost || initialPost;
  const existingImages = sourcePost?.image_urls || [];
  const existingVideoUrl =
    sourcePost?.video_url || sourcePost?.sourceJournal?.video_url || null;
  const existingAudioUrl =
    sourcePost?.audio_url || sourcePost?.sourceJournal?.audio_url || null;
  const playableAudioUri = recordingUri || existingAudioUrl || null;
  const currentVideoUri = selectedVideo?.uri || existingVideoUrl || "";
  const hasExistingAttachments =
    existingImages.length > 0 ||
    Boolean(existingVideoUrl) ||
    Boolean(existingAudioUrl);
  const hasDraftAttachments =
    images.length > 0 || Boolean(selectedVideo) || Boolean(recordingUri);
  const canSubmit =
    content.trim().length > 0 || hasDraftAttachments || hasExistingAttachments;
  const videoPlayer = useVideoPlayer(currentVideoUri, (player) => {
    player.loop = false;
  });

  useEffect(() => {
    if (!isEditing || hydratedRef.current) return;

    if (!sourcePost) return;

    setContent(sourcePost.content || "");
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
      const nextCount = images.length + pickedImages.length;
      setImages((prev) => [...prev, ...pickedImages].slice(0, MAX_IMAGES));

      if (nextCount > MAX_IMAGES) {
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

  const removeSelectedVideo = () => {
    setSelectedVideo(null);
  };

  const handleRecordAudio = async () => {
    try {
      if (isRecording) {
        await handleStopRecording();
        return;
      }

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

  const handleDeleteRecordedAudio = async () => {
    if (!recordingUri) return;

    if (sound && soundUriRef.current === recordingUri) {
      await sound.unloadAsync().catch(() => null);
      setSound(null);
      soundUriRef.current = null;
      setIsPlayingAudio(false);
    }

    setRecordingUri(null);
    setRecordingDuration(0);
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

    const payload = {
      content: content.trim(),
      ...(formattedImages.length > 0 ? { images: formattedImages as any } : {}),
      ...(formattedVideo ? { video: formattedVideo as any } : {}),
      ...(formattedAudio ? { audio: formattedAudio as any } : {}),
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
          style={[styles.postButton, !canSubmit && styles.postButtonDisabled]}
          disabled={isSubmitting || !canSubmit}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.postText}>
              {isEditing
                ? t("common.save", { defaultValue: "Lưu" })
                : t("createPost.post", { defaultValue: "Đăng" })}
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
                t("profile.defaultPilgrim", { defaultValue: "Pilgrim" })}
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

          {isEditing && existingImages.length > 0 && images.length === 0 ? (
            <View style={styles.existingMediaSection}>
              <Text style={styles.existingMediaLabel}>
                {t("createPost.existingImages", {
                  defaultValue: "Ảnh hiện có",
                })}
              </Text>
              <View style={styles.imagePreviewContainer}>
                {existingImages.map((uri, index) => (
                  <View
                    key={`${uri}-${index}`}
                    style={styles.imagePreviewWrapper}
                  >
                    <Image source={{ uri }} style={styles.imagePreview} />
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
                  <Image
                    source={{ uri: img.uri }}
                    style={styles.imagePreview}
                  />
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

          {selectedVideo || existingVideoUrl ? (
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
                  {!selectedVideo && existingVideoUrl ? (
                    <View style={styles.videoExistingBadge}>
                      <Text style={styles.existingBadgeText}>
                        {t("common.current", { defaultValue: "Hiện có" })}
                      </Text>
                    </View>
                  ) : null}
                  {selectedVideo ? (
                    <TouchableOpacity
                      style={styles.videoRemoveButton}
                      onPress={removeSelectedVideo}
                    >
                      <Ionicons name="close" size={18} color={COLORS.white} />
                    </TouchableOpacity>
                  ) : null}
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
                      name="keyboard-voice"
                      size={24}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={styles.mediaCardText}>
                    <Text style={styles.mediaCardTitle} numberOfLines={1}>
                      {recordingUri
                        ? t("createPost.yourRecording", {
                            defaultValue: "Bản ghi của bạn",
                          })
                        : t("createPost.existingAudio", {
                            defaultValue: "Ghi âm hiện có",
                          })}
                    </Text>
                    <Text style={styles.mediaCardSubtitle}>
                      {recordingUri && recordingDuration > 0
                        ? formatDuration(recordingDuration)
                        : t("createPost.tapToPlay", {
                            defaultValue: "Nhấn để nghe",
                          })}
                    </Text>
                  </View>
                  {!recordingUri && existingAudioUrl ? (
                    <View style={styles.existingBadge}>
                      <Text style={styles.existingBadgeText}>
                        {t("common.current", { defaultValue: "Hiện có" })}
                      </Text>
                    </View>
                  ) : null}
                  <TouchableOpacity
                    style={[
                      styles.audioActionButton,
                      isPlayingAudio && styles.audioActionButtonActive,
                    ]}
                    onPress={handlePlayAudio}
                  >
                    <Ionicons
                      name={isPlayingAudio ? "pause" : "play"}
                      size={18}
                      color={COLORS.white}
                    />
                  </TouchableOpacity>
                  {recordingUri ? (
                    <TouchableOpacity
                      style={styles.audioDeleteButton}
                      onPress={handleDeleteRecordedAudio}
                    >
                      <Ionicons
                        name="trash-outline"
                        size={18}
                        color={COLORS.danger}
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>
              )}
            </View>
          ) : null}
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarItem}
            onPress={() => setMediaPickerVisible(true)}
          >
            <Ionicons name="image-outline" size={24} color="#4CAF50" />
            <Text style={styles.toolbarText}>
              {t("createPost.imageVideo", { defaultValue: "Ảnh/Video" })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.toolbarItem}
            onPress={handleRecordAudio}
          >
            <Ionicons
              name={isRecording ? "stop-circle-outline" : "mic-outline"}
              size={24}
              color={isRecording ? COLORS.danger : COLORS.primary}
            />
            <Text style={styles.toolbarText}>
              {isRecording
                ? t("createPost.stopRecording", {
                    defaultValue: "Dừng ghi âm",
                  })
                : t("createPost.recordAudio", {
                    defaultValue: "Ghi âm",
                  })}
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={["images", "videos"]}
        allowsMultipleSelection={true}
        selectionLimit={MAX_IMAGES + 1}
        title={t("createPost.addMedia", {
          defaultValue: "Thêm ảnh vào bài viết",
        })}
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + SPACING.sm
        : SPACING.md,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: "rgba(255,255,255,0.74)",
  },
  headerButton: {
    minWidth: 60,
  },
  cancelText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  postButton: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    minWidth: 70,
    alignItems: "center",
  },
  postButtonDisabled: {
    backgroundColor: COLORS.border,
  },
  postText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    color: COLORS.white,
  },
  contentContainer: {
    flex: 1,
    padding: SPACING.lg,
  },
  loadingState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: SPACING.sm,
  },
  avatarFallback: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarFallbackText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  userName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  textInput: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textPrimary,
    minHeight: 120,
    textAlignVertical: "top",
    marginBottom: SPACING.lg,
  },
  existingMediaSection: {
    marginBottom: SPACING.lg,
  },
  existingMediaLabel: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: SPACING.sm,
  },
  imagePreviewContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  imagePreviewWrapper: {
    position: "relative",
    width: "48%",
    aspectRatio: 1,
    borderRadius: 8,
    overflow: "hidden",
  },
  imagePreview: {
    width: "100%",
    height: "100%",
  },
  removeImageButton: {
    position: "absolute",
    top: 8,
    right: 8,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
  },
  attachmentSection: {
    marginTop: SPACING.lg,
  },
  videoPreviewCard: {
    position: "relative",
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: "#000",
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  videoPreview: {
    width: "100%",
    height: 220,
  },
  videoFallback: {
    height: 160,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.sm,
  },
  videoFallbackText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  videoExistingBadge: {
    position: "absolute",
    top: SPACING.sm,
    left: SPACING.sm,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
  },
  videoRemoveButton: {
    position: "absolute",
    top: SPACING.sm,
    right: SPACING.sm,
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  mediaCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: "rgba(255,255,255,0.78)",
    ...SHADOWS.small,
  },
  recordingCard: {
    borderWidth: 1,
    borderColor: "rgba(211, 47, 47, 0.18)",
  },
  mediaCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(44, 95, 45, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.sm,
  },
  mediaCardText: {
    flex: 1,
    minWidth: 0,
  },
  mediaCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  mediaCardSubtitle: {
    marginTop: 2,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },
  existingBadge: {
    backgroundColor: "rgba(44, 95, 45, 0.1)",
    borderRadius: BORDER_RADIUS.full,
    paddingHorizontal: SPACING.sm,
    paddingVertical: 6,
    marginLeft: SPACING.sm,
  },
  existingBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    fontWeight: "600",
    color: COLORS.primary,
  },
  recordingPulse: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.danger,
    marginRight: SPACING.sm,
  },
  audioActionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary,
    marginLeft: SPACING.sm,
  },
  audioActionButtonActive: {
    backgroundColor: COLORS.textSecondary,
  },
  audioActionButtonStop: {
    backgroundColor: COLORS.danger,
  },
  audioDeleteButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(211, 47, 47, 0.08)",
    marginLeft: SPACING.sm,
  },
  removeAttachmentButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.08)",
    marginLeft: SPACING.sm,
  },
  toolbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    padding: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.86)",
  },
  toolbarItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: SPACING.lg,
  },
  toolbarText: {
    marginLeft: SPACING.xs,
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
