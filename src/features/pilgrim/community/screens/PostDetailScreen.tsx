import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    FlatList,
    Image,
    KeyboardAvoidingView,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import {
    useAddComment,
    useLikePost,
    usePostComments,
    usePostDetail,
} from "../../../../hooks/usePosts";

// ─── Utilities ───────────────────────────────────────────

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

// ─── Sub-components ──────────────────────────────────────

const FeedItemHeader = ({
  user,
  time,
  location,
  isHighlightedGuide = false,
}: {
  user: { name: string; avatar?: string };
  time: string;
  location?: string;
  isHighlightedGuide?: boolean;
}) => (
  <View style={styles.headerRow}>
    <View style={styles.userInfo}>
      {user.avatar ? (
        <Image
          source={{ uri: user.avatar }}
          style={[styles.avatar, isHighlightedGuide && styles.avatarGuide]}
        />
      ) : (
        <View
          style={[
            styles.avatar,
            {
              backgroundColor: COLORS.primary,
              justifyContent: "center",
              alignItems: "center",
            },
            isHighlightedGuide && styles.avatarGuide,
          ]}
        >
          <Text
            style={{ fontSize: 16, fontWeight: "bold", color: COLORS.white }}
          >
            {user.name.charAt(0).toUpperCase()}
          </Text>
        </View>
      )}
      <View style={{ flex: 1 }}>
        <View style={styles.userNameRow}>
          <Text
            style={[
              styles.userName,
              isHighlightedGuide && styles.userNameGuide,
            ]}
          >
            {user.name}
          </Text>
          {isHighlightedGuide && (
            <View style={styles.guideBadge}>
              <MaterialIcons name="verified" size={12} color={COLORS.white} />
              <Text style={styles.guideBadgeText}>Local Guide</Text>
            </View>
          )}
        </View>
        <View style={{ flexDirection: "column" }}>
          <Text style={styles.timeText}>{formatTime(time)}</Text>
          {location && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginTop: 4,
              }}
            >
              <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
              <Text
                style={{
                  color: COLORS.textSecondary,
                  fontSize: 13,
                  fontWeight: "500",
                }}
              >
                Đang ở{" "}
                <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                  {location}
                </Text>
              </Text>
            </View>
          )}
        </View>
      </View>
    </View>
    <TouchableOpacity style={{ padding: 4 }}>
      <MaterialIcons name="more-horiz" size={24} color={COLORS.textTertiary} />
    </TouchableOpacity>
  </View>
);

const FeedItemActions = ({
  stats,
  postId,
  isLiked,
}: {
  stats: { prayers: number; comments: number };
  postId: string;
  isLiked: boolean;
}) => {
  const likePostMutation = useLikePost();

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => likePostMutation.mutate({ postId, isLiked })}
        disabled={likePostMutation.isPending}
      >
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={22}
          color={isLiked ? COLORS.danger : COLORS.textSecondary}
        />
        <Text
          style={{
            color: isLiked ? COLORS.danger : COLORS.textSecondary,
            fontWeight: "500",
            fontSize: 14,
            marginLeft: 6,
          }}
        >
          {stats.prayers} Prayers
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <MaterialIcons
          name="chat-bubble-outline"
          size={20}
          color={COLORS.textSecondary}
        />
        <Text
          style={{
            color: COLORS.textSecondary,
            fontWeight: "500",
            fontSize: 14,
            marginLeft: 6,
          }}
        >
          {stats.comments} Bình luận
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <MaterialIcons name="share" size={20} color={COLORS.textSecondary} />
        <Text
          style={{
            color: COLORS.textSecondary,
            fontWeight: "500",
            fontSize: 14,
            marginLeft: 6,
          }}
        >
          Chia sẻ
        </Text>
      </TouchableOpacity>
    </View>
  );
};

// ─── Comment Item with Local Guide support ───────────────

const CommentItem = ({ item, isGuide }: { item: any; isGuide: boolean }) => (
  <View style={[styles.commentItem, isGuide && styles.commentItemGuide]}>
    {item.author?.avatar_url ? (
      <Image
        source={{ uri: item.author.avatar_url }}
        style={[styles.commentAvatar, isGuide && styles.commentAvatarGuide]}
      />
    ) : (
      <View
        style={[
          styles.commentAvatar,
          {
            backgroundColor: isGuide ? "#FDF6E3" : COLORS.surface0,
            justifyContent: "center",
            alignItems: "center",
          },
          isGuide && styles.commentAvatarGuide,
        ]}
      >
        <Text
          style={{
            fontWeight: "bold",
            color: isGuide ? "#9A6C00" : COLORS.textPrimary,
          }}
        >
          {item.author?.full_name?.charAt(0) || "U"}
        </Text>
      </View>
    )}
    <View style={styles.commentContent}>
      <View
        style={[styles.commentBubble, isGuide && styles.commentBubbleGuide]}
      >
        <View style={styles.commentAuthorRow}>
          <Text
            style={[styles.commentAuthor, isGuide && styles.commentAuthorGuide]}
          >
            {item.author?.full_name}
          </Text>
          {isGuide && (
            <View style={styles.commentGuideBadge}>
              <MaterialIcons name="verified" size={10} color="#fff" />
              <Text style={styles.commentGuideBadgeText}>Guide</Text>
            </View>
          )}
        </View>
        <Text style={styles.commentText}>{item.content}</Text>
      </View>
      <Text style={styles.commentTime}>{formatTime(item.created_at)}</Text>
    </View>
  </View>
);

// ─── Main Screen ─────────────────────────────────────────

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const postId = route.params?.postId;
  const autoFocusComment = route.params?.autoFocusComment;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<any>(null);

  const isCurrentUserGuide = user?.role === "local_guide";

  useEffect(() => {
    if (autoFocusComment) {
      const timer = setTimeout(() => {
        commentInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoFocusComment]);

  const { data: post, isLoading: isLoadingPost } = usePostDetail(postId);
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
  } = usePostComments(postId, 20);

  const addCommentMutation = useAddComment(postId);

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    addCommentMutation.mutate(
      { content: commentText.trim() },
      {
        onSuccess: () => {
          setCommentText("");
        },
        onError: (err) => {
          Toast.show({
            type: "error",
            text1: "Lỗi",
            text2: "Không thể thêm bình luận. " + (err.message || ""),
          });
        },
      },
    );
  };

  const comments = React.useMemo(() => {
    if (!commentsData) return [];
    return commentsData.pages.flatMap(
      (page: any) => page.data?.items || page.items || page.comments || [],
    );
  }, [commentsData]);

  const renderPostHeader = () => {
    if (isLoadingPost) {
      return (
        <View style={{ padding: SPACING.xl, alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    if (!post) {
      return (
        <View style={{ padding: SPACING.xl, alignItems: "center" }}>
          <Text style={{ color: COLORS.textSecondary }}>
            Bài viết không tồn tại
          </Text>
        </View>
      );
    }

    const author = {
      name: post.author?.full_name || "Người dùng ẩn danh",
      avatar: post.author?.avatar_url,
    };
    const actualPost = post;
    const isPostAuthorGuide =
      isCurrentUserGuide && actualPost.user_id === user?.id;
    const commentCount =
      (actualPost as any).comment_count ||
      (actualPost as any).comments_count ||
      comments.length;

    return (
      <View style={styles.postContainer}>
        <View style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}>
          <FeedItemHeader
            user={author}
            time={actualPost.created_at}
            location={
              actualPost.status === "check_in"
                ? "Nhà thờ Đức Bà Sài Gòn"
                : undefined
            }
            isHighlightedGuide={isPostAuthorGuide}
          />
        </View>

        {actualPost.content ? (
          <View
            style={[
              styles.paddingContent,
              { paddingTop: 0, paddingBottom: SPACING.md },
            ]}
          >
            <Text style={styles.bodyText}>{actualPost.content}</Text>
          </View>
        ) : null}

        {actualPost.image_urls && actualPost.image_urls.length > 0 ? (
          <View style={styles.imageContainer}>
            <Image
              source={{ uri: actualPost.image_urls[0] }}
              style={styles.feedImage}
            />
          </View>
        ) : null}

        <View style={[styles.paddingContent, { paddingTop: SPACING.sm }]}>
          <FeedItemActions
            stats={{ prayers: actualPost.likes_count, comments: commentCount }}
            postId={actualPost.id}
            isLiked={actualPost.is_liked}
          />
        </View>

        <View style={styles.dividerHuge} />
        <View style={styles.paddingContent}>
          <Text style={styles.commentsTitle}>Bình luận ({commentCount})</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Chi tiết bài viết</Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={comments}
          keyExtractor={(item: any, index: number) =>
            item.id || `comment-${index}`
          }
          ListHeaderComponent={renderPostHeader}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xxl }}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          renderItem={({ item }) => {
            const isCommentByGuide =
              isCurrentUserGuide && item.user_id === user?.id;
            return <CommentItem item={item} isGuide={isCommentByGuide} />;
          }}
          ListEmptyComponent={
            !isLoadingComments && !isLoadingPost ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={48}
                  color={COLORS.borderMedium}
                />
                <Text style={styles.emptyTitle}>Chưa có bình luận</Text>
                <Text style={styles.emptyText}>
                  Hãy là người đầu tiên chia sẻ cảm nghĩ!
                </Text>
              </View>
            ) : null
          }
        />

        {/* Comment Input */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Platform.OS === "ios" ? 24 : SPACING.sm },
          ]}
        >
          {isCurrentUserGuide && (
            <View style={styles.inputGuideBadge}>
              <MaterialIcons name="verified" size={14} color="#D4AF37" />
            </View>
          )}
          <TextInput
            ref={commentInputRef}
            style={[
              styles.commentInput,
              isCurrentUserGuide && styles.commentInputGuide,
            ]}
            placeholder={
              isCurrentUserGuide
                ? "Bình luận với tư cách Local Guide..."
                : "Thêm lời nguyện cầu hoặc bình luận..."
            }
            placeholderTextColor={COLORS.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            onFocus={() => {
              if (comments.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 500);
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              commentText.trim() ? styles.sendButtonActive : null,
            ]}
            onPress={handleAddComment}
            disabled={!commentText.trim() || addCommentMutation.isPending}
          >
            {addCommentMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Ionicons
                name="send"
                size={18}
                color={commentText.trim() ? "#fff" : COLORS.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

// ─── Styles ──────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + SPACING.sm
        : SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },

  // Post
  postContainer: {
    backgroundColor: COLORS.white,
  },
  paddingContent: {
    paddingHorizontal: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarGuide: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
  },
  userNameGuide: {
    color: "#9A6C00",
  },
  guideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  guideBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timeText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  imageContainer: {
    width: "auto",
    height: 300,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    overflow: "hidden",
  },
  feedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bodyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  dividerHuge: {
    height: 8,
    backgroundColor: COLORS.backgroundSoft,
    marginHorizontal: -SPACING.lg,
    marginVertical: SPACING.lg,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },

  // Comments section
  commentsTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },
  commentItem: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    marginBottom: 16,
  },
  commentItemGuide: {
    backgroundColor: "rgba(212, 175, 55, 0.06)",
    paddingVertical: SPACING.sm,
    marginHorizontal: SPACING.sm,
    borderRadius: 12,
    borderLeftWidth: 3,
    borderLeftColor: "#D4AF37",
  },
  commentAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: SPACING.sm,
  },
  commentAvatarGuide: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  commentContent: {
    flex: 1,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  commentBubble: {
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    alignSelf: "flex-start",
  },
  commentBubbleGuide: {
    backgroundColor: "#FDF6E3",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  commentAuthor: {
    fontWeight: "bold",
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  commentAuthorGuide: {
    color: "#9A6C00",
  },
  commentGuideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 999,
  },
  commentGuideBadgeText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "700",
  },
  commentText: {
    fontSize: 14,
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  commentTime: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 4,
    marginLeft: 8,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  // Input bar
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  inputGuideBadge: {
    marginRight: 6,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    color: COLORS.textPrimary,
  },
  commentInputGuide: {
    borderColor: "rgba(212, 175, 55, 0.4)",
    backgroundColor: "#FFFEF9",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },
  sendButtonActive: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.small,
  },
});
