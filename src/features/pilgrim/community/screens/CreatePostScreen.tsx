import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import * as ImagePicker from "expo-image-picker";
import React, { useState } from "react";
import {
    ActivityIndicator,
    Image,
    KeyboardAvoidingView,
    Platform,
    SafeAreaView,
    ScrollView,
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
import { useCreatePost } from "../../../../hooks/usePosts";

export default function CreatePostScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [content, setContent] = useState("");
  const [images, setImages] = useState<ImagePicker.ImagePickerAsset[]>([]);

  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);

  const createPostMutation = useCreatePost();

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
        text1: "Nội dung bắt buộc",
        text2: "Vui lòng nhập nội dung bài viết hoặc thêm ảnh.",
      });
      return;
    }

    // Format images for API (assuming standard React Native file object for FormData)
    const formattedImages = images.map((img) => ({
      uri: Platform.OS === "ios" ? img.uri.replace("file://", "") : img.uri,
      type: img.mimeType || "image/jpeg",
      name: img.fileName || `post_image_${Date.now()}.jpg`,
    }));

    createPostMutation.mutate(
      {
        content: content.trim(),
        images: formattedImages as any,
      },
      {
        onSuccess: () => {
          Toast.show({
            type: "success",
            text1: "Thành công",
            text2: "Đã tạo bài viết và chia sẻ đến mọi người.",
          });
          navigation.goBack();
        },
        onError: (error) => {
          Toast.show({
            type: "error",
            text1: "Lỗi",
            text2: "Không thể tạo bài viết. " + (error.message || ""),
          });
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.headerButton}
        >
          <Text style={styles.cancelText}>Hủy</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Tạo bài viết</Text>
        <TouchableOpacity
          onPress={handlePost}
          style={[
            styles.postButton,
            !content.trim() && images.length === 0 && styles.postButtonDisabled,
          ]}
          disabled={
            createPostMutation.isPending ||
            (!content.trim() && images.length === 0)
          }
        >
          {createPostMutation.isPending ? (
            <ActivityIndicator size="small" color={COLORS.white} />
          ) : (
            <Text style={styles.postText}>Đăng</Text>
          )}
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          style={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* User Info */}
          <View style={styles.userInfo}>
            {user?.avatar ? (
              <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
              <View
                style={[
                  styles.avatar,
                  {
                    backgroundColor: COLORS.primary,
                    justifyContent: "center",
                    alignItems: "center",
                  },
                ]}
              >
                <Text
                  style={{
                    fontSize: 16,
                    fontWeight: "bold",
                    color: COLORS.white,
                  }}
                >
                  {user?.fullName?.charAt(0).toUpperCase() || "P"}
                </Text>
              </View>
            )}
            <Text style={styles.userName}>{user?.fullName || "Pilgrim"}</Text>
          </View>

          {/* Input Field */}
          <TextInput
            style={styles.textInput}
            placeholder="Bạn đang nghĩ gì?"
            placeholderTextColor={COLORS.textTertiary}
            multiline
            autoFocus
            value={content}
            onChangeText={setContent}
          />

          {/* Image Preview Area */}
          {images.length > 0 && (
            <View style={styles.imagePreviewContainer}>
              {images.map((img, index) => (
                <View key={index} style={styles.imagePreviewWrapper}>
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
          )}
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
              Ảnh/Video
            </Text>
          </TouchableOpacity>
          {/* More toolbar icons (location, tag) could be added here */}
        </View>
      </KeyboardAvoidingView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={"images"}
        allowsMultipleSelection={true}
        selectionLimit={4}
        title="Thêm ảnh vào bài viết"
      />
    </SafeAreaView>
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
    paddingVertical: SPACING.md,
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
