/**
 * MediaDetailScreen
 * View media detail, edit caption, delete (for pending/rejected media)
 */
import { MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
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
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING,
  GUIDE_TYPOGRAPHY
} from "../../../../constants/guide.constants";
import { MySiteStackParamList } from "../../../../navigation/MySiteNavigator";
import { deleteMedia, updateMedia } from "../../../../services/api/guide/mediaApi";
import { MediaStatus } from "../../../../types/guide";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

type MediaDetailRouteProp = RouteProp<MySiteStackParamList, "MediaDetail">;

// ============================================
// STATUS BADGE COMPONENT
// ============================================

interface StatusBadgeProps {
  status: MediaStatus;
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status }) => {
  const getBadgeConfig = () => {
    switch (status) {
      case "pending":
        return {
          backgroundColor: GUIDE_COLORS.warningLight,
          color: GUIDE_COLORS.warning,
          label: "Pending",
          icon: "schedule" as keyof typeof MaterialIcons.glyphMap,
        };
      case "approved":
        return {
          backgroundColor: GUIDE_COLORS.successLight,
          color: GUIDE_COLORS.success,
          label: "Approved",
          icon: "check-circle" as keyof typeof MaterialIcons.glyphMap,
        };
      case "rejected":
        return {
          backgroundColor: GUIDE_COLORS.errorLight,
          color: GUIDE_COLORS.error,
          label: "Rejected",
          icon: "cancel" as keyof typeof MaterialIcons.glyphMap,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <View style={[styles.statusBadge, { backgroundColor: config.backgroundColor }]}>
      <MaterialIcons name={config.icon} size={16} color={config.color} />
      <Text style={[styles.statusBadgeText, { color: config.color }]}>
        {config.label}
      </Text>
    </View>
  );
};

// ============================================
// MAIN COMPONENT
// ============================================

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
      /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/
    )?.[1];
    return videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;
  }, []);

  const thumbnailUrl = media.type === "video" && media.url.includes("youtube")
    ? getYoutubeThumbnail(media.url)
    : media.url;

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
    Alert.alert(
      "Xóa media",
      "Bạn có chắc chắn muốn xóa media này?",
      [
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
      ]
    );
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

      {/* Full Screen Image */}
      <View style={styles.imageContainer}>
        <Image
          source={{ uri: thumbnailUrl || media.url }}
          style={styles.fullImage}
          resizeMode="contain"
        />

        {/* Overlay gradient */}
        <View style={styles.topOverlay} />
        <View style={styles.bottomOverlay} />

        {/* Header (on top of image) */}
        <View style={[styles.header, { top: insets.top + GUIDE_SPACING.sm }]}>
          <TouchableOpacity
            style={styles.headerButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <MaterialIcons name="arrow-back" size={24} color={GUIDE_COLORS.surface} />
          </TouchableOpacity>

          <StatusBadge status={media.status} />
        </View>

        {/* Media type badge */}
        <View style={styles.mediaTypeBadge}>
          <MaterialIcons
            name={getMediaTypeIcon()}
            size={18}
            color={GUIDE_COLORS.surface}
          />
          <Text style={styles.mediaTypeBadgeText}>
            {media.type === "video" ? "Video" : media.type === "panorama" ? "360°" : "Photo"}
          </Text>
        </View>

        {/* Play button for video */}
        {media.type === "video" && (
          <TouchableOpacity style={styles.playButton} activeOpacity={0.8}>
            <MaterialIcons name="play-arrow" size={48} color={GUIDE_COLORS.surface} />
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
                <MaterialIcons name="error" size={20} color={GUIDE_COLORS.error} />
                <Text style={styles.rejectionTitle}>Lý do từ chối</Text>
              </View>
              <Text style={styles.rejectionReason}>{media.rejection_reason}</Text>
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
                  <MaterialIcons name="edit" size={18} color={GUIDE_COLORS.primary} />
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
                    style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
                    onPress={handleSaveCaption}
                    disabled={isSaving}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color={GUIDE_COLORS.surface} />
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
          <View style={styles.infoSection}>
            <View style={styles.infoRow}>
              <MaterialIcons name="fingerprint" size={18} color={GUIDE_COLORS.textMuted} />
              <Text style={styles.infoLabel}>ID:</Text>
              <Text style={styles.infoValue}>{media.code}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="category" size={18} color={GUIDE_COLORS.textMuted} />
              <Text style={styles.infoLabel}>Type:</Text>
              <Text style={styles.infoValue}>{media.type}</Text>
            </View>
            <View style={styles.infoRow}>
              <MaterialIcons name="access-time" size={18} color={GUIDE_COLORS.textMuted} />
              <Text style={styles.infoLabel}>Created:</Text>
              <Text style={styles.infoValue}>
                {new Date(media.created_at).toLocaleDateString("vi-VN")}
              </Text>
            </View>
          </View>

          {/* Delete Button */}
          {canDelete && (
            <TouchableOpacity
              style={[styles.deleteButton, isDeleting && styles.deleteButtonDisabled]}
              onPress={handleDelete}
              disabled={isDeleting}
              activeOpacity={0.8}
            >
              {isDeleting ? (
                <ActivityIndicator size="small" color={GUIDE_COLORS.error} />
              ) : (
                <>
                  <MaterialIcons name="delete" size={20} color={GUIDE_COLORS.error} />
                  <Text style={styles.deleteButtonText}>Xóa media này</Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {/* Cannot edit/delete notice for approved media */}
          {media.status === "approved" && (
            <View style={styles.approvedNotice}>
              <MaterialIcons name="lock" size={18} color={GUIDE_COLORS.textMuted} />
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

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },

  // Image Container
  imageContainer: {
    width: "100%",
    height: SCREEN_WIDTH,
    backgroundColor: "#000",
    position: "relative",
  },
  fullImage: {
    width: "100%",
    height: "100%",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 120,
    backgroundColor: "rgba(0,0,0,0.3)",
  },
  bottomOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: "rgba(0,0,0,0.2)",
  },

  // Header
  header: {
    position: "absolute",
    left: GUIDE_SPACING.lg,
    right: GUIDE_SPACING.lg,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    zIndex: 10,
  },
  headerButton: {
    width: 44,
    height: 44,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Status Badge
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.full,
  },
  statusBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
  },

  // Media Type Badge
  mediaTypeBadge: {
    position: "absolute",
    bottom: GUIDE_SPACING.md,
    left: GUIDE_SPACING.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 6,
    paddingHorizontal: GUIDE_SPACING.sm,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  mediaTypeBadgeText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeXS,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },

  // Play Button
  playButton: {
    position: "absolute",
    top: "50%",
    left: "50%",
    marginTop: -40,
    marginLeft: -40,
    width: 80,
    height: 80,
    borderRadius: GUIDE_BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Content Panel
  contentPanel: {
    flex: 1,
    backgroundColor: GUIDE_COLORS.background,
    borderTopLeftRadius: GUIDE_BORDER_RADIUS.xxl,
    borderTopRightRadius: GUIDE_BORDER_RADIUS.xxl,
    marginTop: -GUIDE_SPACING.xl,
  },
  scrollContent: {
    padding: GUIDE_SPACING.lg,
    paddingTop: GUIDE_SPACING.xl,
  },

  // Rejection Container
  rejectionContainer: {
    backgroundColor: GUIDE_COLORS.errorLight,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: `${GUIDE_COLORS.error}30`,
  },
  rejectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    marginBottom: GUIDE_SPACING.sm,
  },
  rejectionTitle: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightBold,
    color: GUIDE_COLORS.error,
  },
  rejectionReason: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.error,
    lineHeight: 20,
  },

  // Caption Section
  captionSection: {
    marginBottom: GUIDE_SPACING.lg,
  },
  captionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.sm,
  },
  captionLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.textSecondary,
  },
  editButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  editButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.primary,
  },
  captionText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    lineHeight: 24,
  },

  // Edit Caption
  editCaptionContainer: {
    gap: GUIDE_SPACING.md,
  },
  captionInput: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primary,
    padding: GUIDE_SPACING.md,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    color: GUIDE_COLORS.textPrimary,
    minHeight: 80,
    textAlignVertical: "top",
  },
  editActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: GUIDE_SPACING.sm,
  },
  cancelButton: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: GUIDE_COLORS.gray100,
  },
  cancelButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
    color: GUIDE_COLORS.textSecondary,
  },
  saveButton: {
    paddingVertical: GUIDE_SPACING.sm,
    paddingHorizontal: GUIDE_SPACING.lg,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    backgroundColor: GUIDE_COLORS.primary,
    minWidth: 60,
    alignItems: "center",
  },
  saveButtonDisabled: {
    backgroundColor: GUIDE_COLORS.gray400,
  },
  saveButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.surface,
  },

  // Info Section
  infoSection: {
    backgroundColor: GUIDE_COLORS.surface,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.sm,
  },
  infoLabel: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
    width: 60,
  },
  infoValue: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textPrimary,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightMedium,
  },

  // Delete Button
  deleteButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: GUIDE_SPACING.sm,
    paddingVertical: GUIDE_SPACING.md,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    borderWidth: 1.5,
    borderColor: GUIDE_COLORS.error,
    backgroundColor: GUIDE_COLORS.surface,
    marginBottom: GUIDE_SPACING.lg,
  },
  deleteButtonDisabled: {
    borderColor: GUIDE_COLORS.gray300,
  },
  deleteButtonText: {
    fontSize: GUIDE_TYPOGRAPHY.fontSizeMD,
    fontWeight: GUIDE_TYPOGRAPHY.fontWeightSemiBold,
    color: GUIDE_COLORS.error,
  },

  // Approved Notice
  approvedNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: GUIDE_SPACING.sm,
    backgroundColor: GUIDE_COLORS.gray100,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: GUIDE_SPACING.md,
  },
  approvedNoticeText: {
    flex: 1,
    fontSize: GUIDE_TYPOGRAPHY.fontSizeSM,
    color: GUIDE_COLORS.textMuted,
  },
});

export default MediaDetailScreen;
