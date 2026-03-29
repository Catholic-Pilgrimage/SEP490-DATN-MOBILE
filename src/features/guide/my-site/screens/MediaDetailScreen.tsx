/**
 * MediaDetailScreen
 * View media detail, edit caption, replace image file, delete (pending/rejected)
 */
import { MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import {
  Gesture,
  GestureDetector,
  ScrollView as GHScrollView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import type { YoutubeIframeRef } from "react-native-youtube-iframe";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import {
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { deleteMedia, updateMedia } from "../../../../services/api/guide";
import { MediaItem, MediaStatus } from "../../../../types/guide";
import {
  isYoutubeVideoMedia,
  normalizeMediaItem,
} from "../../../../utils/mediaUtils";
import { MediaLightbox } from "../components/MediaLightbox";
import { Model3dFullscreenModal } from "../components/Model3dFullscreenModal";
import { ModelViewerWebView } from "../components/ModelViewerWebView";
import { SiteModels3dEntryButton } from "../components/SiteModels3dEntryButton";
import { StatusBadge } from "../components/StatusBadge";
import { YoutubeEmbedWebView } from "../components/YoutubeEmbedWebView";
import {
  YoutubeFullscreenModal,
  type YoutubeFullscreenClosePayload,
} from "../components/YoutubeFullscreenModal";
import { compressGuideImage } from "../utils/compressGuideImage";
import { styles } from "./MediaDetailScreen.styles";

const ReanimatedScrollView = Animated.createAnimatedComponent(GHScrollView);

const SCREEN_HEIGHT = Dimensions.get("window").height;

type MediaDetailRouteProp = RouteProp<MySiteStackParamList, "MediaDetail">;

const STATUS_LABELS: Record<MediaStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã bị từ chối",
};

const LocalVideoPlayer = ({ url, style }: { url: string; style: any }) => {
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });

  useEffect(() => {
    const sub = player.addListener(
      "statusChange",
      ({ status }: { status: string }) => {
        if (status === "error") setHasError(true);
      },
    );
    return () => sub.remove();
  }, [player]);

  if (hasError) {
    return (
      <View style={[style, styles.videoErrorFallback]}>
        <MaterialIcons
          name="videocam-off"
          size={48}
          color="rgba(255,255,255,0.4)"
        />
        <Text style={styles.videoErrorText}>Video không khả dụng</Text>
      </View>
    );
  }

  return (
    <VideoView
      style={style}
      player={player}
      allowsFullscreen={false}
      allowsPictureInPicture
      contentFit="contain"
    />
  );
};

export const MediaDetailScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { confirm, ConfirmModal } = useConfirm();
  const route = useRoute<MediaDetailRouteProp>();
  const { media: initialMedia } = route.params;
  const initialNormalized = normalizeMediaItem(initialMedia);

  // State (displayMedia updates after caption/file replace success)
  const [displayMedia, setDisplayMedia] =
    useState<MediaItem>(initialNormalized);
  const [caption, setCaption] = useState(initialNormalized.caption || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isPickerVisible, setIsPickerVisible] = useState(false);
  const [isReplacingFile, setIsReplacingFile] = useState(false);
  const [lightbox, setLightbox] = useState<"off" | "image" | "video">("off");
  const [youtubeInlinePlayOneShot, setYoutubeInlinePlayOneShot] =
    useState(false);
  const [youtubeInlineStart, setYoutubeInlineStart] = useState(0);
  const [youtubeInlineMountKey, setYoutubeInlineMountKey] = useState(0);
  const [youtubeFullscreenOpen, setYoutubeFullscreenOpen] = useState(false);
  const [youtubeFsInstanceKey, setYoutubeFsInstanceKey] = useState(0);
  const [youtubeFsStartAt, setYoutubeFsStartAt] = useState(0);
  const [youtubeFsAutoPlay, setYoutubeFsAutoPlay] = useState(false);
  const youtubeInlineRef = useRef<YoutubeIframeRef>(null);
  const youtubePlaybackActiveRef = useRef(false);
  const [model3dFullscreenOpen, setModel3dFullscreenOpen] = useState(false);
  const [model3dFsInstanceKey, setModel3dFsInstanceKey] = useState(0);

  const openModel3dFullscreen = useCallback(() => {
    setModel3dFsInstanceKey((k) => k + 1);
    setModel3dFullscreenOpen(true);
  }, []);

  const canEdit =
    displayMedia.status === "pending" || displayMedia.status === "rejected";
  const canDelete =
    displayMedia.status === "pending" || displayMedia.status === "rejected";
  /** Chỉ ảnh có file cục bộ — không áp dụng cho video YouTube */
  const canReplaceImageFile = canEdit && displayMedia.type === "image";

  // Swipe-to-dismiss (RNGH Pan + Reanimated — panel theo tay, đóng khi đủ kéo / vận tốc)
  const translateY = useSharedValue(0);
  const scrollY = useSharedValue(0);
  const startTranslateY = useSharedValue(0);

  const goBackDismiss = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollY.value = e.contentOffset.y;
    },
  });

  const panGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetY(8)
        .failOffsetX([-48, 48])
        .onStart(() => {
          startTranslateY.value = translateY.value;
        })
        .onUpdate((e) => {
          if (scrollY.value > 2) return;
          const next = startTranslateY.value + e.translationY;
          translateY.value = next > 0 ? next : 0;
        })
        .onEnd((e) => {
          if (scrollY.value > 2) {
            translateY.value = withSpring(0, { damping: 24, stiffness: 320 });
            return;
          }
          const dismiss = translateY.value > 110 || e.velocityY > 900;
          if (dismiss) {
            translateY.value = withTiming(
              SCREEN_HEIGHT,
              { duration: 240 },
              (finished) => {
                if (finished) runOnJS(goBackDismiss)();
              },
            );
          } else {
            translateY.value = withSpring(0, {
              damping: 26,
              stiffness: 300,
            });
          }
        }),
    [goBackDismiss], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const animatedRootStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  // Metadata helpers
  const formatUploadDate = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    const day = d.getDate().toString().padStart(2, "0");
    const month = (d.getMonth() + 1).toString().padStart(2, "0");
    const year = d.getFullYear();
    const hours = d.getHours().toString().padStart(2, "0");
    const mins = d.getMinutes().toString().padStart(2, "0");
    return `${day}/${month}/${year}, ${hours}:${mins}`;
  }, []);

  const getMediaTypeLabel = useCallback(() => {
    switch (displayMedia.type) {
      case "video":
        return "Video";
      case "model_3d":
        return "Mô hình 3D";
      default:
        return "Ảnh";
    }
  }, [displayMedia.type]);

  const formatDuration = useCallback((secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }, []);

  const isYouTube = isYoutubeVideoMedia(displayMedia);
  const isLocalVideo = displayMedia.type === "video" && !isYouTube;
  const isModel3d = displayMedia.type === "model_3d";
  const thumbnailUrl = displayMedia.url;
  const handleYoutubeStateChange = useCallback((state: string) => {
    if (state === "playing") youtubePlaybackActiveRef.current = true;
    if (state === "paused" || state === "ended") {
      youtubePlaybackActiveRef.current = false;
      setYoutubeInlinePlayOneShot(false);
    }
  }, []);

  const openYoutubeFullscreen = useCallback(async () => {
    let t = 0;
    try {
      const cur = await youtubeInlineRef.current?.getCurrentTime();
      if (typeof cur === "number" && !Number.isNaN(cur)) {
        t = cur;
      }
    } catch {
      /* noop */
    }
    setYoutubeFsStartAt(Math.max(0, Math.floor(t)));
    setYoutubeFsAutoPlay(youtubePlaybackActiveRef.current);
    setYoutubeFsInstanceKey((k) => k + 1);
    setYoutubeFullscreenOpen(true);
  }, []);

  const handleYoutubeFullscreenClose = useCallback(
    (payload: YoutubeFullscreenClosePayload) => {
      setYoutubeFullscreenOpen(false);
      setYoutubeInlineStart(payload.resumeAt);
      setYoutubeInlinePlayOneShot(payload.resumePlaying);
      setYoutubeInlineMountKey((k) => k + 1);
    },
    [],
  );

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSaveCaption = useCallback(async () => {
    if (caption === displayMedia.caption) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateMedia(displayMedia.id, { caption });

      if (result?.success) {
        Toast.show({
          type: "success",
          text1: "Thành công",
          text2: "Chú thích đã được cập nhật",
        });
        setIsEditing(false);
        if (result.data) setDisplayMedia(result.data);
      } else {
        Toast.show({
          type: "error",
          text1: "Lỗi",
          text2: result?.message || "Không thể cập nhật chú thích",
        });
      }
    } catch (error: any) {
      console.error("[MediaDetail] Update error:", error);
      // Error has been transformed by apiClient, just use error.message
      const errorMessage = error?.message || "Đã có lỗi xảy ra";
      Toast.show({ type: "error", text1: "Lỗi", text2: errorMessage });
    } finally {
      setIsSaving(false);
    }
  }, [caption, displayMedia.id, displayMedia.caption]);

  const handleMediaPickedForReplace = useCallback(
    async (result: ImagePicker.ImagePickerResult) => {
      if (result.canceled || !result.assets[0] || !canReplaceImageFile) return;

      setIsReplacingFile(true);
      try {
        const asset = result.assets[0];

        let fileUri = asset.uri;
        try {
          const compressed = await compressGuideImage(asset.uri);
          fileUri = compressed.uri;
        } catch (e) {
          console.error("[MediaDetail] Compress error:", e);
        }

        const fileName = `image_${Date.now()}.jpg`;
        const resultUpdate = await updateMedia(displayMedia.id, {
          type: displayMedia.type,
          file: {
            uri: fileUri,
            name: fileName,
            type: "image/jpeg",
          },
        });

        if (resultUpdate?.success && resultUpdate.data) {
          setDisplayMedia(resultUpdate.data);
          setCaption(resultUpdate.data.caption || "");
          Toast.show({
            type: "success",
            text1: "Đã cập nhật ảnh",
            text2:
              "Nếu chuyển sang «Chờ duyệt», bạn vẫn có thể sửa chú thích hoặc thay ảnh thêm trước khi admin duyệt.",
            visibilityTime: 4500,
          });
        } else {
          Toast.show({
            type: "error",
            text1: "Lỗi",
            text2: resultUpdate?.message || "Không thể cập nhật file ảnh",
          });
        }
      } catch (error: any) {
        console.error("[MediaDetail] Replace file error:", error);
        Toast.show({
          type: "error",
          text1: "Lỗi",
          text2: error?.message || "Đã có lỗi xảy ra",
        });
      } finally {
        setIsReplacingFile(false);
      }
    },
    [canReplaceImageFile, displayMedia.id, displayMedia.type],
  );

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: "Xóa media",
      message: "Bạn có chắc chắn muốn xóa media này?",
      confirmText: "Xóa",
      cancelText: "Hủy",
    });

    if (!confirmed) {
      return;
    }

    setIsDeleting(true);
    try {
      const result = await deleteMedia(displayMedia.id);

      if (result?.success) {
        Toast.show({
          type: "success",
          text1: "Đã xóa",
          text2: "Media đã được gỡ khỏi thư viện.",
        });
        setTimeout(() => navigation.goBack(), 400);
      } else {
        Toast.show({
          type: "error",
          text1: "Lỗi",
          text2: result?.message || "Không thể xóa media",
        });
      }
    } catch (error: any) {
      console.error("[MediaDetail] Delete error:", error);
      const errorMessage = error?.message || "Đã có lỗi xảy ra";
      Toast.show({ type: "error", text1: "Lỗi", text2: errorMessage });
    } finally {
      setIsDeleting(false);
    }
  }, [confirm, displayMedia.id, navigation]);

  // Get media type icon
  const getMediaTypeIcon = () => {
    switch (displayMedia.type) {
      case "video":
        return "videocam";
      case "model_3d":
        return "view-in-ar";
      default:
        return "photo-camera";
    }
  };

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        style={[
          styles.container,
          { paddingTop: insets.top },
          animatedRootStyle,
        ]}
      >
        <StatusBar
          barStyle="light-content"
          backgroundColor="#000"
          translucent
        />

        {/* Full Screen Image or Video */}
        <View style={styles.imageContainer}>
          {isReplacingFile && (
            <View style={styles.replaceOverlay} pointerEvents="none">
              <ActivityIndicator size="large" color={GUIDE_COLORS.surface} />
              <Text style={styles.replaceOverlayText}>Đang tải ảnh lên...</Text>
            </View>
          )}
          {isLocalVideo ? (
            <View style={styles.imagePressable} accessibilityLabel="Video">
              <LocalVideoPlayer
                url={displayMedia.url}
                style={styles.fullImage}
              />
            </View>
          ) : isYouTube ? (
            <View
              style={[styles.imagePressable, styles.youtubeHeroShell]}
              accessibilityLabel="Video YouTube nhúng"
            >
              {!youtubeFullscreenOpen ? (
                <YoutubeEmbedWebView
                  ref={youtubeInlineRef}
                  key={`yt-inline-${displayMedia.id}-${youtubeInlineMountKey}`}
                  videoUrl={displayMedia.url}
                  style={styles.youtubeEmbedFrame}
                  startSeconds={youtubeInlineStart}
                  play={youtubeInlinePlayOneShot}
                  preventNativeFullscreen
                  onChangeState={handleYoutubeStateChange}
                />
              ) : (
                <View style={styles.youtubeInlinePlaceholder} />
              )}
            </View>
          ) : isModel3d ? (
            <>
              <View
                style={styles.imagePressable}
                accessibilityLabel="Mô hình 3D — xoay, chụm để zoom"
              >
                {!model3dFullscreenOpen ? (
                  <ModelViewerWebView
                    modelUrl={displayMedia.url}
                    style={styles.fullImage}
                  />
                ) : (
                  <View
                    style={[styles.fullImage, { backgroundColor: "#12100c" }]}
                  />
                )}
              </View>
              {!model3dFullscreenOpen ? (
                <View
                  style={[
                    styles.model3dFullscreenCtaWrap,
                    { bottom: GUIDE_SPACING.md },
                  ]}
                  pointerEvents="box-none"
                >
                  <SiteModels3dEntryButton
                    variant="hero"
                    onPress={openModel3dFullscreen}
                    label={t("mediaTab.floatingOpen3d")}
                    accessibilityHint={t("mediaTab.floatingOpen3dHint")}
                  />
                </View>
              ) : null}
            </>
          ) : (
            <Pressable
              style={styles.imagePressable}
              onPress={() => setLightbox("image")}
              disabled={isReplacingFile}
              accessibilityRole="button"
              accessibilityLabel="Phóng to ảnh"
            >
              <Image
                key={displayMedia.url}
                source={{ uri: thumbnailUrl || displayMedia.url }}
                style={styles.fullImage}
                resizeMode="contain"
              />
            </Pressable>
          )}

          {/* Thin edge scrims — không phủ cả khung hình như overlay đặc */}
          <LinearGradient
            pointerEvents="none"
            colors={["rgba(0,0,0,0.55)", "rgba(0,0,0,0.12)", "transparent"]}
            locations={[0, 0.42, 1]}
            style={styles.topGradientScrim}
          />
          <LinearGradient
            pointerEvents="none"
            colors={[
              "transparent",
              "rgba(245, 237, 227, 0.35)",
              "rgba(253, 248, 240, 0.96)",
            ]}
            locations={[0, 0.42, 1]}
            style={styles.bottomGradientScrim}
          />

          {/* Header (on top of image) */}
          <View style={[styles.header, { top: insets.top + GUIDE_SPACING.sm }]}>
            <TouchableOpacity
              style={styles.headerButton}
              onPress={handleBack}
              activeOpacity={0.75}
            >
              <MaterialIcons
                name="arrow-back"
                size={22}
                color={GUIDE_COLORS.surface}
              />
            </TouchableOpacity>

            <View style={styles.headerRightCluster}>
              {isYouTube ? (
                <TouchableOpacity
                  style={styles.headerButton}
                  onPress={openYoutubeFullscreen}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel="Phóng to video"
                >
                  <MaterialIcons
                    name="fullscreen"
                    size={22}
                    color={GUIDE_COLORS.surface}
                  />
                </TouchableOpacity>
              ) : isModel3d ? (
                <TouchableOpacity
                  style={[styles.headerButton, styles.headerButtonModel3d]}
                  onPress={openModel3dFullscreen}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  accessibilityLabel={t("mediaTab.floatingOpen3d")}
                  accessibilityHint={t("mediaTab.floatingOpen3dHint")}
                >
                  <MaterialIcons
                    name="fullscreen"
                    size={22}
                    color="#fff"
                  />
                </TouchableOpacity>
              ) : null}
              <View style={styles.statusBadgeShell}>
                <StatusBadge
                  status={displayMedia.status}
                  label={STATUS_LABELS[displayMedia.status]}
                />
              </View>
            </View>
          </View>

          {/* Media type badge */}
          <View style={styles.mediaTypeBadge}>
            <MaterialIcons
              name={getMediaTypeIcon()}
              size={18}
              color={GUIDE_COLORS.surface}
            />
            <Text style={styles.mediaTypeBadgeText}>
              {displayMedia.type === "video"
                ? "Video"
                : displayMedia.type === "model_3d"
                  ? "3D"
                  : "Photo"}
            </Text>
          </View>
        </View>

        {/* Content Panel */}
        <KeyboardAvoidingView
          style={styles.contentPanel}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Drag Indicator Affordance */}
          <View style={styles.dragHandleContainer}>
            <View style={styles.dragHandle} />
          </View>

          <ReanimatedScrollView
            style={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            onScroll={scrollHandler}
            scrollEventThrottle={16}
            bounces
          >
            {/* Rejection Reason (if rejected) */}
            {displayMedia.status === "rejected" &&
              displayMedia.rejection_reason && (
                <View style={styles.rejectionContainer}>
                  <View style={styles.rejectionHeader}>
                    <MaterialIcons
                      name="error"
                      size={20}
                      color={GUIDE_COLORS.error}
                    />
                    <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
                  </View>
                  <Text style={styles.rejectionReason}>
                    {displayMedia.rejection_reason}
                  </Text>
                </View>
              )}

            {/* Caption Section */}
            <View style={styles.captionSection}>
              <View style={styles.captionHeader}>
                <Text style={styles.captionLabel}>Chú thích</Text>
                {canEdit && !isEditing && (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => setIsEditing(true)}
                  >
                    <MaterialIcons
                      name="edit"
                      size={18}
                      color={GUIDE_COLORS.primary}
                    />
                    <Text style={styles.editButtonText}>Sửa</Text>
                  </TouchableOpacity>
                )}
              </View>
              {canEdit && !isEditing && displayMedia.status === "pending" && (
                <Text style={styles.captionEditHint}>
                  Đang chờ duyệt — bạn vẫn có thể sửa chú thích hoặc thay file
                  ảnh bất cứ lúc nào trước khi được duyệt.
                </Text>
              )}
              {canEdit && !isEditing && displayMedia.status === "rejected" && (
                <Text style={styles.captionEditHint}>
                  Bạn có thể sửa chú thích, thay ảnh mới hoặc xóa bản nháp; sau
                  khi cập nhật, media có thể chuyển lại «Chờ duyệt» và vẫn chỉnh
                  sửa được như trên.
                </Text>
              )}

              {isEditing ? (
                <View style={styles.editCaptionContainer}>
                  <TextInput
                    style={styles.captionInput}
                    placeholder="Nhập chú thích..."
                    placeholderTextColor={GUIDE_COLORS.gray400}
                    value={caption}
                    onChangeText={setCaption}
                    multiline
                    maxLength={500}
                    autoFocus
                  />
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.cancelButton}
                      onPress={() => {
                        setCaption(displayMedia.caption || "");
                        setIsEditing(false);
                      }}
                    >
                      <Text style={styles.cancelButtonText}>Hủy</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.saveButton,
                        isSaving && styles.saveButtonDisabled,
                      ]}
                      onPress={handleSaveCaption}
                      disabled={isSaving}
                    >
                      {isSaving ? (
                        <ActivityIndicator
                          size="small"
                          color={GUIDE_COLORS.surface}
                        />
                      ) : (
                        <Text style={styles.saveButtonText}>Lưu</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <Text style={styles.captionText}>
                  {displayMedia.caption || "Không có chú thích"}
                </Text>
              )}
            </View>

            {/* Thay file ảnh (chờ duyệt / từ chối) */}
            {canReplaceImageFile && (
              <View style={styles.replaceFileSection}>
                <Text style={styles.replaceFileLabel}>File ảnh</Text>
                <TouchableOpacity
                  style={[
                    styles.replaceFileButton,
                    isReplacingFile && styles.replaceFileButtonDisabled,
                  ]}
                  onPress={() => setIsPickerVisible(true)}
                  disabled={isReplacingFile || isSaving || isEditing}
                  activeOpacity={0.85}
                >
                  <MaterialIcons
                    name="photo-library"
                    size={20}
                    color={GUIDE_COLORS.primary}
                  />
                  <Text style={styles.replaceFileButtonText}>
                    Chọn ảnh khác từ thư viện
                  </Text>
                </TouchableOpacity>
                <Text style={styles.replaceFileHint}>
                  Ảnh mới sẽ thay thế file hiện tại và gửi lại để duyệt.
                </Text>
              </View>
            )}

            {/* Media Info */}
            <View style={styles.metadataSection}>
              <Text style={styles.metadataTitle}>Thông tin chi tiết</Text>

              <View style={styles.metadataRow}>
                <MaterialIcons
                  name="calendar-today"
                  size={16}
                  color={GUIDE_COLORS.creamMuted}
                />
                <Text style={styles.metadataLabel}>Ngày tải lên</Text>
                <Text style={styles.metadataValue}>
                  {formatUploadDate(displayMedia.created_at)}
                </Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataRow}>
                <MaterialIcons
                  name={getMediaTypeIcon()}
                  size={16}
                  color={GUIDE_COLORS.creamMuted}
                />
                <Text style={styles.metadataLabel}>Loại</Text>
                <Text style={styles.metadataValue}>{getMediaTypeLabel()}</Text>
              </View>

              <View style={styles.metadataDivider} />

              <View style={styles.metadataRow}>
                <MaterialIcons
                  name="label-outline"
                  size={16}
                  color={GUIDE_COLORS.creamMuted}
                />
                <Text style={styles.metadataLabel}>Mã</Text>
                <Text style={styles.metadataValue}>{displayMedia.code}</Text>
              </View>

              {displayMedia.type === "video" &&
                displayMedia.duration != null && (
                  <>
                    <View style={styles.metadataDivider} />
                    <View style={styles.metadataRow}>
                      <MaterialIcons
                        name="timer"
                        size={16}
                        color={GUIDE_COLORS.creamMuted}
                      />
                      <Text style={styles.metadataLabel}>Thời lượng</Text>
                      <Text style={styles.metadataValue}>
                        {formatDuration(displayMedia.duration)}
                      </Text>
                    </View>
                  </>
                )}
            </View>

            {/* Delete Button */}
            {canDelete && (
              <TouchableOpacity
                style={[
                  styles.deleteButton,
                  isDeleting && styles.deleteButtonDisabled,
                ]}
                onPress={handleDelete}
                disabled={isDeleting}
                activeOpacity={0.8}
              >
                {isDeleting ? (
                  <ActivityIndicator
                    size="small"
                    color={GUIDE_COLORS.creamMuted}
                  />
                ) : (
                  <>
                    <MaterialIcons
                      name="delete-outline"
                      size={16}
                      color={GUIDE_COLORS.creamMuted}
                    />
                    <Text style={styles.deleteButtonText}>
                      Xóa bản nháp này
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {/* Cannot edit/delete notice for approved media */}
            {displayMedia.status === "approved" && (
              <View style={styles.approvedNotice}>
                <MaterialIcons
                  name="lock"
                  size={18}
                  color={GUIDE_COLORS.creamMuted}
                />
                <Text style={styles.approvedNoticeText}>
                  Media đã được duyệt không thể chỉnh sửa hoặc xóa
                </Text>
              </View>
            )}
          </ReanimatedScrollView>
        </KeyboardAvoidingView>

        <MediaLightbox
          visible={lightbox !== "off"}
          onClose={() => setLightbox("off")}
          imageUri={
            lightbox === "image" ? thumbnailUrl || displayMedia.url : undefined
          }
          videoUrl={lightbox === "video" ? displayMedia.url : undefined}
        />

        <YoutubeFullscreenModal
          visible={youtubeFullscreenOpen && isYouTube}
          instanceKey={youtubeFsInstanceKey}
          videoUrl={displayMedia.url}
          startAtSeconds={youtubeFsStartAt}
          autoPlay={youtubeFsAutoPlay}
          onClose={handleYoutubeFullscreenClose}
        />

        <Model3dFullscreenModal
          visible={model3dFullscreenOpen && isModel3d}
          instanceKey={model3dFsInstanceKey}
          modelUrl={displayMedia.url}
          onClose={() => setModel3dFullscreenOpen(false)}
        />

        <MediaPickerModal
          visible={isPickerVisible}
          onClose={() => setIsPickerVisible(false)}
          onMediaPicked={handleMediaPickedForReplace}
          mediaTypes="images"
          allowsEditing={displayMedia.type === "image"}
          title="Chọn ảnh thay thế"
        />
        <ConfirmModal />
      </Animated.View>
    </GestureDetector>
  );
};

export default MediaDetailScreen;
