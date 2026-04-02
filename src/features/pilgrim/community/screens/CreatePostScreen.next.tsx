import { Ionicons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
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
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import {
  COLORS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  useCreatePost,
  usePostDetail,
  useUpdatePost,
} from "../../../../hooks/usePosts";
import type { FeedPost } from "../../../../types/post.types";

export default function CreatePostScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const postId = route.params?.postId as string | undefined;
  const initialPost = route.params?.initialPost as FeedPost | undefined;
  const isEditing = Boolean(postId);

  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);
  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);

  const hydratedRef = useRef(false);

  const createPostMutation = useCreatePost();
  const updatePostMutation = useUpdatePost();
  const { data: editingPost, isLoading: isLoadingEditingPost } = usePostDetail(
    postId || "",
  );

  useEffect(() => {
    if (!isEditing || hydratedRef.current) return;

    const sourcePost = editingPost || initialPost;
    if (!sourcePost) return;

    setContent(sourcePost.content || "");
    hydratedRef.current = true;
  }, [editingPost, initialPost, isEditing]);

  const pickImage = () => {
    setMediaPickerVisible(true);
  };

  const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled) {
      setImages((prev) => [...prev, ...result.assets].slice(0, 4));
    }
  };

  const removeImage = (index: number) => {
    setImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handlePost = () => {
    if (!content.trim() && images.length === 0) {
      Toast.show({
        type: "info",
        text1: "Noi dung bat buoc",
        text2: "Vui long nhap noi dung bai viet hoac them anh.",
      });
      return;
    }

    const formattedImages = images.map((img) => ({
      uri: Platform.OS === "ios" ? img.uri.replace("file://", "") : img.uri,
      type: img.mimeType || "image/jpeg",
      name: img.fileName || `post_image_${Date.now()}.jpg`,
    }));

    const payload = {
      content: content.trim(),
      ...(formattedImages.length > 0 ? { images: formattedImages as any } : {}),
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
              text1: "Thanh cong",
              text2: "Da cap nhat bai viet.",
            });
            navigation.goBack();
          },
          onError: (error: any) => {
            Toast.show({
              type: "error",
              text1: "Loi",
              text2: `Khong the cap nhat bai viet. ${error?.message || ""}`,
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
          text1: "Thanh cong",
          text2: "Da tao bai viet va chia se den moi nguoi.",
        });
        navigation.goBack();
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: "Loi",
          text2: `Khong the tao bai viet. ${error?.message || ""}`,
        });
      },
    });
  };

  const existingImages = (editingPost || initialPost)?.image_urls || [];
  const isSubmitting =
    createPostMutation.isPending || updatePostMutation.isPending;

  if (isEditing && isLoadingEditingPost && !hydratedRef.current && !initialPost) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
        <View style={styles.loadingState}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.cancelText}>Huy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {isEditing ? "Chinh sua bai viet" : "Tao bai viet"}
        </Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[
            styles.postButton,
            !content.trim() && images.length === 0 && styles.postButtonDisabled,
          ]}
          disabled={isSubmitting || (!content.trim() && images.length === 0)}
        >
          {isSubmitting ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.postText}>{isEditing ? "Luu" : "Dang"}</Text>
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
            <Text style={styles.userName}>{user?.fullName || "Pilgrim"}</Text>
          </View>

          <TextInput
            style={styles.textInput}
            placeholder="Ban dang nghi gi?"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            autoFocus
            value={content}
            onChangeText={setContent}
          />

          {isEditing && existingImages.length > 0 && images.length === 0 ? (
            <View style={styles.existingMediaSection}>
              <Text style={styles.existingMediaLabel}>Anh hien co</Text>
              <View style={styles.imagePreviewContainer}>
                {existingImages.map((uri, index) => (
                  <View key={`${uri}-${index}`} style={styles.imagePreviewWrapper}>
                    <Image source={{ uri }} style={styles.imagePreview} />
                  </View>
                ))}
              </View>
            </View>
          ) : null}

          {images.length > 0 ? (
            <View style={styles.imagePreviewContainer}>
              {images.map((img, index) => (
                <View key={`${img.uri}-${index}`} style={styles.imagePreviewWrapper}>
                  <Image source={{ uri: img.uri }} style={styles.imagePreview} />
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
        </ScrollView>

        <View style={styles.toolbar}>
          <TouchableOpacity
            style={styles.toolbarItem}
            onPress={pickImage}
            disabled={images.length >= 4}
          >
            <Ionicons
              name="image-outline"
              size={24}
              color={images.length >= 4 ? COLORS.border : "#4CAF50"}
            />
            <Text
              style={[
                styles.toolbarText,
                images.length >= 4 && { color: COLORS.border },
              ]}
            >
              Anh/Video
            </Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={"images"}
        allowsMultipleSelection={true}
        selectionLimit={4}
        title="Them anh vao bai viet"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
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
    backgroundColor: COLORS.white,
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
  toolbar: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    padding: SPACING.md,
    backgroundColor: COLORS.white,
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
