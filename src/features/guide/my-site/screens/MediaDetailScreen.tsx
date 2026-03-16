/**
 * MediaDetailScreen
 * View media detail, edit caption, delete (for pending/rejected media)
 */
import { MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
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
import {
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { deleteMedia, updateMedia } from "../../../../services/api/guide";
import { MediaStatus } from "../../../../types/guide";
import { StatusBadge } from "../components/StatusBadge";
import { styles } from "./MediaDetailScreen.styles";

type MediaDetailRouteProp = RouteProp<MySiteStackParamList, "MediaDetail">;

const STATUS_LABELS: Record<MediaStatus, string> = {
  pending: "Chờ duyệt",
  approved: "Đã duyệt",
  rejected: "Đã bị từ chối",
};

export const MediaDetailScreen: React.FC = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const route = useRoute<MediaDetailRouteProp>();
  const { media } = route.params;

  // State
  const [caption, setCaption] = useState(media.caption || "");
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const canEdit = media.status === "pending" || media.status === "rejected";
  const canDelete = media.status === "pending" || media.status === "rejected";

  // Get YouTube thumbnail
  const getYoutubeThumbnail = useCallback((url: string) => {
    const videoId = url.match(
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/,
    )?.[1];
    return videoId
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
      : null;
  }, []);

  const isYouTube = media.type === "video" && media.url.includes("youtube");
  const isLocalVideo = media.type === "video" && !isYouTube;
  const thumbnailUrl = isYouTube ? getYoutubeThumbnail(media.url) : media.url;

  // Init video player (even if not video, hooks must be called unconditionally)
  const player = useVideoPlayer(isLocalVideo ? media.url : "", (player) => {
    player.loop = true;
    // Don't auto-play by default unless you want
  });

  // Handlers
  const handleBack = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  const handleSaveCaption = useCallback(async () => {
    if (caption === media.caption) {
      setIsEditing(false);
      return;
    }

    setIsSaving(true);
    try {
      const result = await updateMedia(media.id, { caption });

      if (result?.success) {
        Alert.alert("Thành công", "Caption đã được cập nhật");
        setIsEditing(false);
      } else {
        Alert.alert("Lỗi", result?.message || "Không thể cập nhật caption");
      }
    } catch (error: any) {
      console.error("[MediaDetail] Update error:", error);
      // Error has been transformed by apiClient, just use error.message
      const errorMessage = error?.message || "Đã có lỗi xảy ra";
      Alert.alert("Lỗi", errorMessage);
    } finally {
      setIsSaving(false);
    }
  }, [caption, media.id, media.caption]);

  const handleDelete = useCallback(() => {
    Alert.alert("Xóa media", "Bạn có chắc chắn muốn xóa media này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          setIsDeleting(true);
          try {
            const result = await deleteMedia(media.id);

            if (result?.success) {
              Alert.alert("Thành công", "Media đã được xóa", [
                { text: "OK", onPress: () => navigation.goBack() },
              ]);
            } else {
              Alert.alert("Lỗi", result?.message || "Không thể xóa media");
            }
          } catch (error: any) {
            console.error("[MediaDetail] Delete error:", error);
            // Error has been transformed by apiClient, just use error.message
            const errorMessage = error?.message || "Đã có lỗi xảy ra";
            Alert.alert("Lỗi", errorMessage);
          } finally {
            setIsDeleting(false);
          }
        },
      },
    ]);
  }, [media.id, navigation]);

  // Get media type icon
  const getMediaTypeIcon = () => {
    switch (media.type) {
      case "video":
        return "videocam";
      case "panorama":
        return "panorama-fish-eye";
      default:
        return "photo-camera";
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <StatusBar barStyle="light-content" backgroundColor="#000" translucent />

      {/* Full Screen Image or Video */}
      <View style={styles.imageContainer}>
        {isLocalVideo ? (
          <VideoView
            style={styles.fullImage}
            player={player}
            allowsFullscreen
            allowsPictureInPicture
            contentFit="contain"
          />
        ) : (
          <Image
            source={{ uri: thumbnailUrl || media.url }}
            style={styles.fullImage}
            resizeMode="contain"
          />
        )}

        {/* Overlay gradient */}
        <View style={styles.topOverlay} pointerEvents="none" />
        <View style={styles.bottomOverlay} pointerEvents="none" />

        {/* Header (on top of image) */}
        <View style={[styles.header, { top: insets.top + GUIDE_SPACING.sm }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons
              name="arrow-back"
              size={24}
              color={GUIDE_COLORS.surface}
            />
          </TouchableOpacity>

          <StatusBadge status={media.status} label={STATUS_LABELS[media.status]} />
        </View>

        {/* Media type badge */}
        <View style={styles.mediaTypeBadge}>
          <MaterialIcons
            name={getMediaTypeIcon()}
            size={18}
            color={GUIDE_COLORS.surface}
          />
          <Text style={styles.mediaTypeBadgeText}>
            {media.type === "video"
              ? "Video"
              : media.type === "panorama"
                ? "360°"
                : "Photo"}
          </Text>
        </View>

        {/* Play button ONLY for YouTube video */}
        {isYouTube && (
          <TouchableOpacity
            style={styles.playButton}
            activeOpacity={0.8}
            onPress={() => {
              if (media.url) {
                Linking.openURL(media.url).catch(() => {
                  Alert.alert("Lỗi", "Không thể mở video này");
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
      </View>

      {/* Content Panel */}
      <KeyboardAvoidingView
        style={styles.contentPanel}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          style={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Rejection Reason (if rejected) */}
          {media.status === "rejected" && media.rejection_reason && (
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
                {media.rejection_reason}
              </Text>
            </View>
          )}

          {/* Caption Section */}
          <View style={styles.captionSection}>
            <View style={styles.captionHeader}>
              <Text style={styles.captionLabel}>Caption</Text>
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
                  <Text style={styles.editButtonText}>Edit</Text>
                </TouchableOpacity>
              )}
            </View>

            {isEditing ? (
              <View style={styles.editCaptionContainer}>
                <TextInput
                  style={styles.captionInput}
                  placeholder="Nhập caption..."
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
                      setCaption(media.caption || "");
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
                {media.caption || "Không có caption"}
              </Text>
            )}
          </View>

          {/* Info Section */}
          {/* Removed generic Info Section */}

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
                <ActivityIndicator size="small" color={GUIDE_COLORS.error} />
              ) : (
                <>
                  <MaterialIcons
                    name="delete-outline"
                    size={20}
                    color={GUIDE_COLORS.error}
                  />
                  <Text style={styles.deleteButtonText}>Xóa bản nháp này</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Cannot edit/delete notice for approved media */}
          {media.status === "approved" && (
            <View style={styles.approvedNotice}>
              <MaterialIcons
                name="lock"
                size={18}
                color={GUIDE_COLORS.textMuted}
              />
              <Text style={styles.approvedNoticeText}>
                Media đã được duyệt không thể chỉnh sửa hoặc xóa
              </Text>
            </View>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
};

export default MediaDetailScreen;
