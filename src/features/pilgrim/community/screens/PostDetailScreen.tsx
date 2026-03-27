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
import type { FeedPostComment } from "../../../../types/post.types";
import ReportPostModal from "../components/ReportPostModal";

// ─── Utilities ───────────────────────────────────────────

const formatTime = (dateString: string) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const now = new Date();
  const rawDiffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  // Avoid negative relative time when clocks differ slightly.
  if (rawDiffInSeconds < 0) {
    if (Math.abs(rawDiffInSeconds) < 60) return "Vừa xong";
    return date.toLocaleDateString("vi-VN");
  }

  const diffInSeconds = rawDiffInSeconds;
  if (diffInSeconds < 5) return "Vừa xong";

  if (diffInSeconds < 60) return `${diffInSeconds} giây trước`;

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes} phút trước`;

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours} giờ trước`;

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) return `${diffInDays} ngày trước`;

  return date.toLocaleDateString("vi-VN");
};

/**
 * Facebook-style comment structure:
 * - Top-level comments shown directly
 * - ALL replies (regardless of nesting depth in backend) are flattened
 *   and shown as 1-level indent under the root comment
 * - Initial collapsed: hide replies behind a single "Xem tất cả..." action
 */
interface CommentNode {
  comment: FeedPostComment;
  replies: FeedPostComment[]; // all descendants, flattened
}

function buildCommentTree(comments: FeedPostComment[]): CommentNode[] {
  const byId = new Map<string, FeedPostComment>();
  for (const c of comments) {
    byId.set(c.id, c);
  }

  // Find root ancestor for each comment
  const getRootId = (c: FeedPostComment): string | null => {
    const raw = c.parent_id;
    const pid =
      raw === undefined || raw === null || raw === "" ? null : String(raw);
    if (pid === null) return null;
    const parent = byId.get(pid);
    if (!parent) return pid; // parent not loaded, treat pid as root
    return getRootId(parent) ?? pid;
  };

  const roots: FeedPostComment[] = [];
  const repliesByRoot = new Map<string, FeedPostComment[]>();

  for (const c of comments) {
    const rootId = getRootId(c);
    if (rootId === null) {
      roots.push(c);
    } else {
      if (!repliesByRoot.has(rootId)) repliesByRoot.set(rootId, []);
      repliesByRoot.get(rootId)!.push(c);
    }
  }

  // Sort by time
  roots.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const arr of repliesByRoot.values()) {
    arr.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return roots.map((root) => ({
    comment: root,
    replies: repliesByRoot.get(root.id) ?? [],
  }));
}

// ─── Sub-components ──────────────────────────────────────

const FeedItemHeader = ({
  user,
  time,
  location,
  isHighlightedGuide = false,
  onMorePress,
}: {
  user: { name: string; avatar?: string };
  time: string;
  location?: string;
  isHighlightedGuide?: boolean;
  onMorePress?: () => void;
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
    <TouchableOpacity style={{ padding: 4 }} onPress={onMorePress}>
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

// ─── Reply Bubble (same style as CommentBubble but indented) ─────────────────

const ReplyBubble = ({
  comment,
  isGuide,
  onReply,
}: {
  comment: FeedPostComment;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
}) => (
  <View style={styles.replyRow}>
    {comment.author?.avatar_url ? (
      <Image
        source={{ uri: comment.author.avatar_url }}
        style={[styles.replyAvatar, isGuide && styles.commentAvatarGuide]}
      />
    ) : (
      <View
        style={[
          styles.replyAvatar,
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
            fontSize: 11,
            color: isGuide ? "#9A6C00" : COLORS.textPrimary,
          }}
        >
          {comment.author?.full_name?.charAt(0) || "U"}
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
            {comment.author?.full_name}
          </Text>
          {isGuide ? (
            <View style={styles.commentGuideBadge}>
              <MaterialIcons name="verified" size={10} color="#fff" />
              <Text style={styles.commentGuideBadgeText}>Local Guide</Text>
            </View>
          ) : (
            <View
              style={[styles.commentGuideBadge, { backgroundColor: "#E0E0E0" }]}
            >
              <Text style={[styles.commentGuideBadgeText, { color: "#666" }]}>
                Pilgrim
              </Text>
            </View>
          )}
        </View>
        {/* Show who they're replying to if it's a nested reply */}
        <Text style={styles.commentText}>{comment.content}</Text>
      </View>
      <View style={styles.commentMetaRow}>
        <Text style={styles.commentTime}>{formatTime(comment.created_at)}</Text>
        <TouchableOpacity
          onPress={() => onReply(comment)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.replyLink}>Trả lời</Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);

// ─── Comment Item with Facebook-style replies ────────────────────────────────

const CommentItem = ({
  node,
  isGuide,
  onReply,
}: {
  node: CommentNode;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
}) => {
  const { comment, replies } = node;
  const [expanded, setExpanded] = useState(false);
  const repliesToggleLabel = expanded
    ? "Thu gọn phản hồi"
    : replies.length === 1
      ? "Xem 1 phản hồi"
      : `Xem tất cả ${replies.length} phản hồi`;

  return (
    <View style={styles.commentItem}>
      {/* Root comment */}
      <View style={styles.commentRow}>
        {comment.author?.avatar_url ? (
          <Image
            source={{ uri: comment.author.avatar_url }}
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
              {comment.author?.full_name?.charAt(0) || "U"}
            </Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View
            style={[styles.commentBubble, isGuide && styles.commentBubbleGuide]}
          >
            <View style={styles.commentAuthorRow}>
              <Text
                style={[
                  styles.commentAuthor,
                  isGuide && styles.commentAuthorGuide,
                ]}
              >
                {comment.author?.full_name}
              </Text>
              {isGuide ? (
                <View style={styles.commentGuideBadge}>
                  <MaterialIcons name="verified" size={10} color="#fff" />
                  <Text style={styles.commentGuideBadgeText}>Local Guide</Text>
                </View>
              ) : (
                <View
                  style={[
                    styles.commentGuideBadge,
                    { backgroundColor: "#E0E0E0" },
                  ]}
                >
                  <Text
                    style={[styles.commentGuideBadgeText, { color: "#666" }]}
                  >
                    Pilgrim
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.commentText}>{comment.content}</Text>
          </View>
          <View style={styles.commentMetaRow}>
            <Text style={styles.commentTime}>
              {formatTime(comment.created_at)}
            </Text>
            <TouchableOpacity
              onPress={() => onReply(comment)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyLink}>Trả lời</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Replies section — Facebook style, all at 1 indent level */}
      {replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {!expanded ? (
            <TouchableOpacity
              style={styles.viewMoreReplies}
              onPress={() => setExpanded(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewMoreText}>{repliesToggleLabel}</Text>
              <MaterialIcons
                name="expand-more"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <>
              {replies.map((reply) => {
                const isReplyGuide = reply.author?.role === "local_guide";
                return (
                  <ReplyBubble
                    key={reply.id}
                    comment={reply}
                    isGuide={isReplyGuide}
                    onReply={onReply}
                  />
                );
              })}

              <TouchableOpacity
                style={styles.viewMoreReplies}
                onPress={() => setExpanded(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.viewMoreText}>{repliesToggleLabel}</Text>
                <MaterialIcons
                  name="expand-less"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};

// ─── Main Screen ─────────────────────────────────────────

export default function PostDetailScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const postId = route.params?.postId;
  const autoFocusComment = route.params?.autoFocusComment;
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [showReport, setShowReport] = useState(false);
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
      {
        content: commentText.trim(),
        ...(replyingTo ? { parent_id: replyingTo.id } : {}),
      },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyingTo(null);
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
      (page: any) =>
        page.comments ??
        page.data?.comments ??
        page.data?.items ??
        page.items ??
        [],
    );
  }, [commentsData]);

  // Build Facebook-style tree: root comments + all replies flattened at depth 1
  const commentNodes = React.useMemo(
    () => buildCommentTree(comments as FeedPostComment[]),
    [comments],
  );

  const handleReplyPress = React.useCallback((c: FeedPostComment) => {
    setReplyingTo({
      id: c.id,
      name: c.author?.full_name || "Người dùng",
    });
    commentInputRef.current?.focus();
  }, []);

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
            onMorePress={() => setShowReport(true)}
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
          data={commentNodes}
          keyExtractor={(node, index: number) =>
            node.comment.id || `comment-${index}`
          }
          ListHeaderComponent={renderPostHeader}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xxl }}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          renderItem={({ item: node }) => {
            const isCommentByGuide =
              node.comment.author?.role === "local_guide";
            return (
              <CommentItem
                node={node}
                isGuide={isCommentByGuide}
                onReply={handleReplyPress}
              />
            );
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

        {replyingTo ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              Trả lời{" "}
              <Text style={styles.replyBannerName}>{replyingTo.name}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyBannerCancel}>Hủy</Text>
            </TouchableOpacity>
          </View>
        ) : null}

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
              replyingTo
                ? `Trả lời ${replyingTo.name}...`
                : isCurrentUserGuide
                  ? "Bình luận với tư cách Local Guide..."
                  : "Thêm lời nguyện cầu hoặc bình luận..."
            }
            placeholderTextColor={COLORS.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            onFocus={() => {
              if (commentNodes.length > 0) {
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

      <ReportPostModal
        visible={showReport}
        onClose={() => setShowReport(false)}
        targetId={postId}
        targetType="post"
      />
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

  // Root comment wrapper
  commentItem: {
    paddingHorizontal: SPACING.lg,
    paddingRight: SPACING.lg,
    marginBottom: 12,
  },

  // Row inside a comment (avatar + bubble)
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
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
    gap: 4,
    marginBottom: 1,
  },
  commentBubble: {
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  commentBubbleGuide: {
    backgroundColor: "#FDF6E3",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  commentAuthor: {
    fontWeight: "bold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  commentAuthorGuide: {
    color: "#9A6C00",
  },
  commentGuideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  commentGuideBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  commentText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  commentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
    marginLeft: 2,
  },
  replyLink: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  commentTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  // Replies container (all indented, FB style)
  repliesContainer: {
    marginTop: 6,
    marginLeft: 18,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderLight,
  },

  // "View X more replies" row
  viewMoreReplies: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    paddingVertical: 2,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // Individual reply row (inside repliesContainer)
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },

  // Reply banner
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: "#EEF2FF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  replyBannerName: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  replyBannerCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
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
