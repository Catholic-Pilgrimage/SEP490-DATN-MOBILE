import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useVideoPlayer, VideoView } from "expo-video";
import type { TFunction } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  FlatList,
  Image,
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
} from "react-native";
import Toast from "react-native-toast-message";
import {
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { MediaLightbox } from "../../../guide/my-site/components/MediaLightbox";
import {
  useAddComment,
  useDeleteComment,
  useDeletePost,
  useLikePost,
  usePostComments,
  usePostDetail,
  useUpdateComment,
} from "../../../../hooks/usePosts";
import i18n from "../../../../i18n";
import { pilgrimJournalApi, pilgrimPlannerApi, pilgrimSiteApi } from "../../../../services/api/pilgrim";
import type { FeedPost, FeedPostComment } from "../../../../types/post.types";
import {
  getFeedPostLocationName,
  getFeedPostPlannerId,
  getFeedPostPlannerItemIds,
  getFeedPostSiteId,
} from "../../../../utils/feedPostLocation";
import { resolveJournalLocationName } from "../../../../utils/journalLocation";
import PostActionSheet from "../components/PostActionSheet";
import ReportPostModal from "../components/ReportPostModal";

// Utilities

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const POST_MEDIA_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;

const getDateLocale = (language: string) =>
  language.startsWith("en") ? "en-US" : "vi-VN";

const formatLocalizedTime = (
  dateString: string,
  t: TFunction,
  language: string,
) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const locale = getDateLocale(language);
  const now = new Date();
  const rawDiffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (rawDiffInSeconds < 0) {
    if (Math.abs(rawDiffInSeconds) < 60) {
      return t("postDetail.timeAgo.justNow", { defaultValue: "Just now" });
    }
    return date.toLocaleDateString(locale);
  }

  const diffInSeconds = rawDiffInSeconds;
  if (diffInSeconds < 5) {
    return t("postDetail.timeAgo.justNow", { defaultValue: "Just now" });
  }

  if (diffInSeconds < 60) {
    return t("postDetail.timeAgo.secondsAgo", {
      count: diffInSeconds,
      defaultValue: "{{count}} seconds ago",
    });
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t("postDetail.timeAgo.minutesAgo", {
      count: diffInMinutes,
      defaultValue: "{{count}} minutes ago",
    });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t("postDetail.timeAgo.hoursAgo", {
      count: diffInHours,
      defaultValue: "{{count}} hours ago",
    });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t("postDetail.timeAgo.daysAgo", {
      count: diffInDays,
      defaultValue: "{{count}} days ago",
    });
  }

  return date.toLocaleDateString(locale);
};

const formatAudioDuration = (millis: number) => {
  if (!Number.isFinite(millis) || millis <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const isLikelyAudioFileUrl = (url?: string | null) =>
  Boolean(url && /\.(aac|flac|m4a|mp3|ogg|wav)(?:[?#].*)?$/i.test(url));

const translate = i18n.t.bind(i18n) as TFunction;

/**
 * Facebook-style comment structure:
 * - Top-level comments shown directly
 * - ALL replies (regardless of nesting depth in backend) are flattened
 *   and shown as 1-level indent under the root comment
 * - Initial collapsed: hide replies behind a single "View all..." action
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

// Sub-components

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
}) => {
  const { t, i18n } = useTranslation();

  return (
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
        <View style={styles.userMeta}>
          <View style={styles.userNameRow}>
            <Text
              style={[
                styles.userName,
                isHighlightedGuide && styles.userNameGuide,
              ]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            {isHighlightedGuide && (
              <View style={styles.guideBadge}>
                <MaterialIcons name="verified" size={12} color={COLORS.white} />
                <Text style={styles.guideBadgeText}>
                  {t("profile.localGuide", { defaultValue: "Local Guide" })}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: "column" }}>
            <Text style={styles.timeText}>
              {formatLocalizedTime(time, t, i18n.language)}
            </Text>
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
        <MaterialIcons
          name="more-horiz"
          size={24}
          color={COLORS.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
};
const FeedItemActions = ({
  stats,
  postId,
  isLiked,
}: {
  stats: { prayers: number; comments: number };
  postId: string;
  isLiked: boolean;
}) => {
  const { t } = useTranslation();
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
          {t("postDetail.prayersCount", {
            count: stats.prayers,
            defaultValue: "{{count}} Prayers",
          })}
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
          {t("postDetail.commentsCount", {
            count: stats.comments,
            defaultValue: "{{count}} Comments",
          })}
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
          {t("postDetail.share", { defaultValue: "Share" })}
        </Text>
      </TouchableOpacity>
    </View>
  );
};
const PostAudioAttachment = ({
  url,
  label,
  iconName,
}: {
  url: string;
  label: string;
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
}) => {
  const { t } = useTranslation();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => null);
      }
    };
  }, [sound]);

  const handleTogglePlayback = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        }

        if (durationMillis > 0 && positionMillis >= durationMillis) {
          await sound.replayAsync();
          setIsPlaying(true);
          return;
        }

        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      setIsLoading(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: nextSound, status } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (playbackStatus) => {
          if (!playbackStatus.isLoaded) return;

          setPositionMillis(playbackStatus.positionMillis || 0);
          setDurationMillis(playbackStatus.durationMillis || 0);

          if (playbackStatus.didJustFinish) {
            setIsPlaying(false);
            setPositionMillis(0);
          }
        },
      );

      if (status.isLoaded) {
        setDurationMillis(status.durationMillis || 0);
        setPositionMillis(status.positionMillis || 0);
      }

      setSound(nextSound);
      setIsPlaying(true);
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Error" }),
        text2: t("postDetail.playMediaError", {
          defaultValue: "Unable to play {{label}}.",
          label: label.toLowerCase(),
        }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progress =
    durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  return (
    <View style={styles.mediaSection}>
      <View style={styles.audioCard}>
        <View style={styles.audioCardHeader}>
          <View style={styles.audioIconBadge}>
            <MaterialIcons name={iconName} size={22} color={COLORS.primary} />
          </View>
          <View style={styles.audioTextColumn}>
            <Text style={styles.mediaSectionTitle}>{label}</Text>
            <Text style={styles.mediaSectionSubtitle}>
              {isPlaying
                ? t("postDetail.nowPlaying", { defaultValue: "Now playing" })
                : t("postDetail.tapToPlay", { defaultValue: "Tap to play" })}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.audioActionButton,
              (isPlaying || isLoading) && styles.audioActionButtonActive,
            ]}
            onPress={handleTogglePlayback}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons
                name={isPlaying ? "pause" : "play-arrow"}
                size={24}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.audioProgressTrack}>
          <View
            style={[styles.audioProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <View style={styles.audioTimeRow}>
          <Text style={styles.audioTimeText}>
            {formatAudioDuration(positionMillis)}
          </Text>
          <Text style={styles.audioTimeText}>
            {formatAudioDuration(durationMillis)}
          </Text>
        </View>
      </View>
    </View>
  );
};
const PostVideoAttachment = ({
  url,
  onOpenFullscreen,
}: {
  url: string;
  onOpenFullscreen: () => void;
}) => {
  const { t } = useTranslation();
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  useEffect(() => {
    const sub = player.addListener(
      "statusChange",
      ({ status }: { status: string }) => {
        if (status === "error") {
          setHasError(true);
        }
      },
    );

    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.mediaSection}>
      <Text style={styles.mediaSectionTitle}>
        {t("postDetail.videoAttachment", {
          defaultValue: "Video attachment",
        })}
      </Text>

      {hasError ? (
        <View style={styles.videoFallback}>
          <MaterialIcons
            name="videocam-off"
            size={32}
            color={COLORS.textTertiary}
          />
          <Text style={styles.videoFallbackText}>
            {t("postDetail.videoUnavailable", {
              defaultValue: "Video is unavailable.",
            })}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.videoCard}>
            <VideoView
              style={styles.videoPlayer}
              player={player}
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              contentFit="contain"
            />
          </View>

          <TouchableOpacity
            style={styles.mediaInlineAction}
            onPress={onOpenFullscreen}
          >
            <MaterialIcons
              name="open-in-full"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.mediaInlineActionText}>
              {t("postDetail.openFullscreen", {
                defaultValue: "Open fullscreen",
              })}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
const CommentOverflowButton = ({
  onPress,
}: {
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.commentMoreButton}
    onPress={onPress}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <MaterialIcons
      name="more-horiz"
      size={18}
      color={COLORS.textSecondary}
    />
  </TouchableOpacity>
);
const CommentActionSheet = ({
  visible,
  comment,
  isOwner = false,
  busy = false,
  onClose,
  onEdit,
  onDelete,
  onReport,
}: {
  visible: boolean;
  comment: FeedPostComment | null;
  /** Whether the current user owns this comment */
  isOwner?: boolean;
  busy?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
}) => {
  const { t } = useTranslation();

  if (!visible || !comment) return null;

  const allItems = [
    {
      key: "edit",
      icon: "edit",
      label: t("postDetail.editComment", { defaultValue: "Edit comment" }),
      onPress: onEdit,
      danger: false,
      ownerOnly: true,
    },
    {
      key: "delete",
      icon: "delete-outline",
      label: t("postDetail.deleteComment", { defaultValue: "Delete comment" }),
      onPress: onDelete,
      danger: true,
      ownerOnly: true,
    },
    {
      key: "report",
      icon: "flag",
      label: t("postDetail.reportComment", { defaultValue: "Report comment" }),
      onPress: onReport,
      danger: false,
      ownerOnly: false,
    },
  ];

  const actionItems = isOwner
    ? allItems.filter((item) => item.ownerOnly)
    : allItems.filter((item) => !item.ownerOnly);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.commentSheetRoot}>
        <TouchableOpacity
          style={styles.commentSheetOverlay}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.commentSheet}>
          <View style={styles.commentSheetHandle} />
          <Text style={styles.commentSheetTitle}>
            {t("postDetail.commentActions", {
              defaultValue: "Comment actions",
            })}
          </Text>
          <Text style={styles.commentSheetPreview} numberOfLines={2}>
            {comment.content}
          </Text>

          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.commentSheetAction}
              onPress={item.onPress}
              disabled={busy}
            >
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.danger ? COLORS.danger : COLORS.textPrimary}
              />
              <Text
                style={[
                  styles.commentSheetActionText,
                  item.danger && styles.commentSheetActionTextDanger,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.commentSheetCancel}
            onPress={onClose}
            disabled={busy}
          >
            <Text style={styles.commentSheetCancelText}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
const ReplyBubble = ({
  comment,
  isGuide,
  onReply,
  onMorePress,
}: {
  comment: FeedPostComment;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
  onMorePress: (c: FeedPostComment) => void;
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
          {(comment.author?.full_name || translate("postDetail.user", { defaultValue: "User" })).charAt(0)}
        </Text>
      </View>
    )}

    <View style={styles.commentContent}>
      <View style={styles.commentBubbleRow}>
        <View
          style={[styles.commentBubble, isGuide && styles.commentBubbleGuide]}
        >
          <View style={styles.commentAuthorRow}>
            <Text
              style={[styles.commentAuthor, isGuide && styles.commentAuthorGuide]}
            >
              {comment.author?.full_name ||
                translate("postDetail.user", { defaultValue: "User" })}
            </Text>
            {isGuide ? (
              <View style={styles.commentGuideBadge}>
                <MaterialIcons name="verified" size={10} color="#fff" />
                <Text style={styles.commentGuideBadgeText}>
                  {translate("profile.localGuide", { defaultValue: "Local Guide" })}
                </Text>
              </View>
            ) : (
              <View
                style={[styles.commentGuideBadge, { backgroundColor: "#E0E0E0" }]}
              >
                <Text style={[styles.commentGuideBadgeText, { color: "#666" }]}>
                  {translate("profile.pilgrimRole", { defaultValue: "Pilgrim" })}
                </Text>
              </View>
            )}
          </View>
          <Text style={styles.commentText}>{comment.content}</Text>
        </View>
        <CommentOverflowButton onPress={() => onMorePress(comment)} />
      </View>
      <View style={styles.commentMetaRow}>
        <Text style={styles.commentTime}>
          {formatLocalizedTime(comment.created_at, translate, i18n.language)}
        </Text>
        <TouchableOpacity
          onPress={() => onReply(comment)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={styles.replyLink}>
            {translate("postDetail.reply", { defaultValue: "Reply" })}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  </View>
);
const CommentItem = ({
  node,
  isGuide,
  onReply,
  onMorePress,
}: {
  node: CommentNode;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
  onMorePress: (c: FeedPostComment) => void;
}) => {
  const { comment, replies } = node;
  const [expanded, setExpanded] = useState(false);
  const repliesToggleLabel = expanded
    ? translate("postDetail.collapseReplies", {
        defaultValue: "Hide replies",
      })
    : replies.length === 1
      ? translate("postDetail.viewOneReply", {
          defaultValue: "View 1 reply",
        })
      : translate("postDetail.viewAllReplies", {
          count: replies.length,
          defaultValue: "View all {{count}} replies",
        });

  return (
    <View style={styles.commentItem}>
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
              {(comment.author?.full_name || translate("postDetail.user", { defaultValue: "User" })).charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentBubbleRow}>
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
                  {comment.author?.full_name ||
                    translate("postDetail.user", { defaultValue: "User" })}
                </Text>
                {isGuide ? (
                  <View style={styles.commentGuideBadge}>
                    <MaterialIcons name="verified" size={10} color="#fff" />
                    <Text style={styles.commentGuideBadgeText}>
                      {translate("profile.localGuide", { defaultValue: "Local Guide" })}
                    </Text>
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
                      {translate("profile.pilgrimRole", {
                        defaultValue: "Pilgrim",
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentText}>{comment.content}</Text>
            </View>
            <CommentOverflowButton onPress={() => onMorePress(comment)} />
          </View>
          <View style={styles.commentMetaRow}>
            <Text style={styles.commentTime}>
              {formatLocalizedTime(comment.created_at, translate, i18n.language)}
            </Text>
            <TouchableOpacity
              onPress={() => onReply(comment)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyLink}>
                {translate("postDetail.reply", { defaultValue: "Reply" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
                    onMorePress={onMorePress}
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
export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const postId = route.params?.postId;
  const autoFocusComment = route.params?.autoFocusComment;
  const { t } = useTranslation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<FeedPostComment | null>(
    null,
  );
  const [activeCommentAction, setActiveCommentAction] =
    useState<FeedPostComment | null>(null);
  const [activePostAction, setActivePostAction] = useState<FeedPost | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [resolvedSiteName, setResolvedSiteName] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    type: "image" | "video";
    url: string;
  } | null>(null);
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
  const updateCommentMutation = useUpdateComment(postId);
  const deleteCommentMutation = useDeleteComment(postId);
  const deletePostMutation = useDeletePost();

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const locationName = getFeedPostLocationName(post);
      if (locationName) {
        if (!cancelled) {
          setResolvedSiteName(locationName);
        }
        return;
      }

      if (post?.journal_id) {
        try {
          const response = await pilgrimJournalApi.getJournalDetail(post.journal_id);
          if (cancelled) return;

          const journalLocationName = await resolveJournalLocationName(response.data);
          if (cancelled) return;

          if (journalLocationName) {
            setResolvedSiteName(journalLocationName);
            return;
          }
        } catch {
          // Fall through to post/source journal fields.
        }
      }

      const plannerItemIds = getFeedPostPlannerItemIds(post);
      const plannerId = getFeedPostPlannerId(post);
      if (plannerItemIds.length > 0 && plannerId) {
        try {
          const response = await pilgrimPlannerApi.getPlanDetail(plannerId);
          if (cancelled) return;

          const items =
            response.data?.items ||
            Object.values(response.data?.items_by_day || {}).flat();
          const matched = (items as any[]).filter(
            (item) => plannerItemIds.includes(item.id) && item.site?.name,
          );

          if (matched.length > 0) {
            setResolvedSiteName(
              Array.from(new Set(matched.map((item: any) => item.site.name))).join(", "),
            );
            return;
          }

          if (response.data?.name) {
            setResolvedSiteName(response.data.name);
            return;
          }
        } catch {
          // Fall through to site lookup.
        }
      }

      const siteId = getFeedPostSiteId(post);
      if (!siteId) {
        if (!cancelled) {
          setResolvedSiteName(null);
        }
        return;
      }

      try {
        const response = await pilgrimSiteApi.getSiteDetail(siteId);
        if (!cancelled) {
          setResolvedSiteName(response.data?.name || null);
        }
      } catch {
        if (!cancelled) {
          setResolvedSiteName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    if (editingComment) {
      updateCommentMutation.mutate(
        {
          commentId: editingComment.id,
          content: commentText.trim(),
        },
        {
          onSuccess: () => {
            Toast.show({
              type: "success",
              text1: t("common.success", { defaultValue: "Success" }),
              text2: t("postDetail.editCommentSuccess", {
                defaultValue: "Comment updated.",
              }),
            });
            setCommentText("");
            setEditingComment(null);
          },
          onError: (err: any) => {
            Toast.show({
              type: "error",
              text1: t("common.error", { defaultValue: "Error" }),
              text2:
                t("postDetail.editCommentError", {
                  defaultValue: "Unable to edit comment.",
                }) + (err?.message ? ` ${err.message}` : ""),
            });
          },
        },
      );
      return;
    }

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
            text1: t("common.error", { defaultValue: "Error" }),
            text2:
              t("postDetail.addCommentError", {
                defaultValue: "Unable to add comment.",
              }) + (err.message ? ` ${err.message}` : ""),
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

  const handleReplyPress = React.useCallback(
    (c: FeedPostComment) => {
      setEditingComment(null);
      setReplyingTo({
        id: c.id,
        name:
          c.author?.full_name ||
          t("postDetail.user", { defaultValue: "User" }),
      });
      commentInputRef.current?.focus();
    },
    [t],
  );

  const handleCommentMorePress = React.useCallback((c: FeedPostComment) => {
    setActiveCommentAction(c);
  }, []);

  const handleEditComment = React.useCallback(() => {
    if (!activeCommentAction) return;

    setEditingComment(activeCommentAction);
    setReplyingTo(null);
    setCommentText(activeCommentAction.content);
    setActiveCommentAction(null);

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 150);
  }, [activeCommentAction]);

  const handleDeleteComment = React.useCallback(() => {
    if (!activeCommentAction) return;

    const targetComment = activeCommentAction;
    setActiveCommentAction(null);

    Alert.alert(
      t("postDetail.deleteCommentTitle", {
        defaultValue: "Delete comment",
      }),
      t("postDetail.deleteCommentMessage", {
        defaultValue: "Are you sure you want to delete this comment?",
      }),
      [
        {
          text: t("common.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("common.delete", { defaultValue: "Delete" }),
          style: "destructive",
          onPress: () => {
            deleteCommentMutation.mutate(targetComment.id, {
              onSuccess: () => {
                if (editingComment?.id === targetComment.id) {
                  setEditingComment(null);
                  setCommentText("");
                }

                Toast.show({
                  type: "success",
                  text1: t("common.success", { defaultValue: "Success" }),
                  text2: t("postDetail.deleteCommentSuccess", {
                    defaultValue: "Comment deleted.",
                  }),
                });
              },
              onError: (err: any) => {
                Toast.show({
                  type: "error",
                  text1: t("common.error", { defaultValue: "Error" }),
                  text2:
                    t("postDetail.deleteCommentError", {
                      defaultValue: "Unable to delete comment.",
                    }) + (err?.message ? ` ${err.message}` : ""),
                });
              },
            });
          },
        },
      ],
    );
  }, [activeCommentAction, deleteCommentMutation, editingComment?.id, t]);

  const handleReportComment = React.useCallback(() => {
    if (!activeCommentAction) return;
    setReportCommentId(activeCommentAction.id);
    setActiveCommentAction(null);
  }, [activeCommentAction]);

  const handleEditPost = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    setActivePostAction(null);
    navigation.navigate("CreatePost", {
      postId: targetPost.id,
      initialPost: targetPost,
    });
  }, [activePostAction, navigation]);

  const handleDeletePost = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    setActivePostAction(null);

    Alert.alert(
      t("postDetail.deletePost", {
        defaultValue: "Delete post",
      }),
      t("postDetail.deletePostMessage", {
        defaultValue: "Are you sure you want to delete this post?",
      }),
      [
        {
          text: t("common.cancel", { defaultValue: "Cancel" }),
          style: "cancel",
        },
        {
          text: t("common.delete", { defaultValue: "Delete" }),
          style: "destructive",
          onPress: () => {
            deletePostMutation.mutate(targetPost.id, {
              onSuccess: () => {
                Toast.show({
                  type: "success",
                  text1: t("common.success", { defaultValue: "Success" }),
                  text2: t("postDetail.deletePostSuccess", {
                    defaultValue: "Post deleted.",
                  }),
                });
                navigation.goBack();
              },
              onError: (error: any) => {
                Toast.show({
                  type: "error",
                  text1: t("common.error", { defaultValue: "Error" }),
                  text2:
                    t("postDetail.deletePostError", {
                      defaultValue: "Unable to delete post.",
                    }) + (error?.message ? ` ${error.message}` : ""),
                });
              },
            });
          },
        },
      ],
    );
  }, [activePostAction, deletePostMutation, navigation, t]);

  const handleReportPost = React.useCallback(() => {
    if (!activePostAction) return;
    setReportPostId(activePostAction.id);
    setActivePostAction(null);
  }, [activePostAction]);

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
            {t("postDetail.postNotFound", { defaultValue: "Post not found" })}
          </Text>
        </View>
      );
    }

    const author = {
      name: post.author?.full_name || t("postDetail.anonymousUser", { defaultValue: "Anonymous user" }),
      avatar: post.author?.avatar_url,
    };
    const actualPost = post;
    const isPostAuthorGuide =
      isCurrentUserGuide && actualPost.user_id === user?.id;
    const commentCount =
      (actualPost as any).comment_count ||
      (actualPost as any).comments_count ||
      comments.length;
    const imageUrls = actualPost.image_urls || [];
    const videoUrl = actualPost.video_url || actualPost.sourceJournal?.video_url;
    const audioUrl = actualPost.audio_url || actualPost.sourceJournal?.audio_url;
    const videoShouldUseAudioPlayer = isLikelyAudioFileUrl(videoUrl);
    const location = getFeedPostLocationName(actualPost, resolvedSiteName);

    return (
      <View style={styles.postContainer}>
        <View style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}>
          <FeedItemHeader
            user={author}
            time={actualPost.created_at}
            location={location}
            isHighlightedGuide={isPostAuthorGuide}
            onMorePress={() => setActivePostAction(actualPost)}
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

        {imageUrls.length === 1 ? (
          <View style={styles.mediaSection}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() =>
                setLightbox({ type: "image", url: imageUrls[0] })
              }
            >
              <View
                style={[styles.imageContainer, styles.singleImageContainer]}
              >
                <Image source={{ uri: imageUrls[0] }} style={styles.feedImage} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {imageUrls.length > 1 ? (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaSectionTitle}>
              {t("postDetail.photosCount", {
                count: imageUrls.length,
                defaultValue: "{{count}} photos",
              })}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScrollContent}
            >
              {imageUrls.map((imageUrl, index) => (
                <TouchableOpacity
                  key={`${imageUrl}-${index}`}
                  activeOpacity={0.92}
                  onPress={() =>
                    setLightbox({ type: "image", url: imageUrl })
                  }
                >
                  <View
                    style={[
                      styles.galleryImageCard,
                      index === imageUrls.length - 1 &&
                        styles.galleryImageCardLast,
                    ]}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.feedImage} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {videoUrl ? (
          videoShouldUseAudioPlayer ? (
            <PostAudioAttachment
              url={videoUrl}
              label={t("postDetail.videoAttachment", {
                defaultValue: "Video attachment",
              })}
              iconName="videocam"
            />
          ) : (
            <PostVideoAttachment
              url={videoUrl}
              onOpenFullscreen={() =>
                setLightbox({ type: "video", url: videoUrl })
              }
            />
          )
        ) : null}

        {audioUrl ? (
          <PostAudioAttachment
            url={audioUrl}
            label={t("postDetail.audioAttachment", {
              defaultValue: "Audio attachment",
            })}
            iconName="graphic-eq"
          />
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
          <Text style={styles.commentsTitle}>
            {t("postDetail.commentsTitle", {
              count: commentCount,
              defaultValue: "Comments ({{count}})",
            })}
          </Text>
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
        <Text style={styles.headerTitle}>
          {t("postDetail.title", { defaultValue: "Post details" })}
        </Text>
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
                onMorePress={handleCommentMorePress}
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
                <Text style={styles.emptyTitle}>
                  {t("postDetail.emptyTitle", {
                    defaultValue: "No comments yet",
                  })}
                </Text>
                <Text style={styles.emptyText}>
                  {t("postDetail.emptyText", {
                    defaultValue: "Be the first to share your thoughts!",
                  })}
                </Text>
              </View>
            ) : null
          }
        />

        {editingComment ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              {t("postDetail.editingComment", {
                defaultValue: "Editing comment",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                setCommentText("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyBannerCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!editingComment && replyingTo ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              {t("postDetail.reply", { defaultValue: "Reply" })}{" "}
              <Text style={styles.replyBannerName}>{replyingTo.name}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyBannerCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Text>
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
              editingComment
                ? t("postDetail.editCommentPlaceholder", {
                    defaultValue: "Edit your comment...",
                  })
                : replyingTo
                ? t("postDetail.replyPlaceholder", {
                    name: replyingTo.name,
                    defaultValue: "Reply to {{name}}...",
                  })
                : isCurrentUserGuide
                  ? t("postDetail.commentAsGuidePlaceholder", {
                      defaultValue: "Comment as Local Guide...",
                    })
                  : t("postDetail.commentPlaceholder", {
                      defaultValue: "Add a prayer or comment...",
                    })
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
            disabled={
              !commentText.trim() ||
              addCommentMutation.isPending ||
              updateCommentMutation.isPending
            }
          >
            {addCommentMutation.isPending || updateCommentMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Ionicons
                name={editingComment ? "checkmark" : "send"}
                size={18}
                color={commentText.trim() ? "#fff" : COLORS.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PostActionSheet
        visible={Boolean(activePostAction)}
        postContent={activePostAction?.content}
        isOwner={Boolean(
          user?.id &&
          activePostAction?.user_id &&
          user.id === activePostAction.user_id
        )}
        busy={deletePostMutation.isPending}
        onClose={() => setActivePostAction(null)}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
      />

      <ReportPostModal
        visible={Boolean(reportPostId)}
        onClose={() => setReportPostId(null)}
        targetId={reportPostId || ""}
        targetType="post"
      />

      <CommentActionSheet
        visible={Boolean(activeCommentAction)}
        comment={activeCommentAction}
        isOwner={Boolean(
          user?.id &&
          activeCommentAction?.user_id &&
          user.id === activeCommentAction.user_id
        )}
        busy={deleteCommentMutation.isPending}
        onClose={() => setActiveCommentAction(null)}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
        onReport={handleReportComment}
      />

      <ReportPostModal
        visible={Boolean(reportCommentId)}
        onClose={() => setReportCommentId(null)}
        targetId={reportCommentId || ""}
        targetType="comment"
      />

      <MediaLightbox
        visible={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        imageUri={lightbox?.type === "image" ? lightbox.url : undefined}
        videoUrl={lightbox?.type === "video" ? lightbox.url : undefined}
      />
    </View>
  );
}

// Styles

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
    minWidth: 0,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
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
    minWidth: 0,
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
  mediaSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  mediaSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  mediaSectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  imageContainer: {
    width: "auto",
    height: 300,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundSoft,
  },
  singleImageContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  galleryScrollContent: {
    paddingRight: SPACING.md,
  },
  galleryImageCard: {
    width: POST_MEDIA_WIDTH,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: SPACING.sm,
    backgroundColor: COLORS.backgroundSoft,
  },
  galleryImageCardLast: {
    marginRight: 0,
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
  audioCard: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  audioCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  audioIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(24, 119, 242, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  audioTextColumn: {
    flex: 1,
  },
  audioActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.textSecondary,
  },
  audioActionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  audioProgressTrack: {
    marginTop: SPACING.md,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  audioTimeRow: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioTimeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    height: 220,
  },
  videoFallback: {
    height: 120,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  videoFallbackText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  mediaInlineAction: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  mediaInlineActionText: {
    marginLeft: 6,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "600",
    color: COLORS.primary,
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
  commentBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 1,
  },
  commentBubble: {
    flex: 1,
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
  commentMoreButton: {
    width: 24,
    alignItems: "center",
    paddingTop: 6,
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
  commentSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  commentSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  commentSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.borderMedium,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  commentSheetTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  commentSheetPreview: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  commentSheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  commentSheetActionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  commentSheetActionTextDanger: {
    color: COLORS.danger,
  },
  commentSheetCancel: {
    marginTop: SPACING.sm,
    alignItems: "center",
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 14,
  },
  commentSheetCancelText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
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
