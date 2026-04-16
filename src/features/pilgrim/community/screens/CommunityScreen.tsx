import { MaterialIcons } from "@expo/vector-icons";
import { CommonActions, useNavigation } from "@react-navigation/native";
import * as Haptics from "expo-haptics";
import { LinearGradient } from "expo-linear-gradient";
import type { TFunction } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Animated,
    FlatList,
    Image,
    ImageBackground,
    Platform,
    Pressable,
    RefreshControl,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import { useSendFriendRequest } from "../../../../hooks/useFriendship";
import {
    useDeletePost,
    useLikePost,
    usePosts,
    useTranslatePost,
} from "../../../../hooks/usePosts";
import {
    pilgrimJournalApi,
    pilgrimPlannerApi,
    pilgrimSiteApi,
} from "../../../../services/api/pilgrim";
import { FeedPost, FeedTranslationResult } from "../../../../types";
import {
    getFeedPostLocationName,
    getFeedPostPlannerId,
    getFeedPostPlannerItemIds,
    getFeedPostPlannerLocationName,
    getFeedPostSiteId,
} from "../../../../utils/feedPostLocation";
import { resolveJournalLocationName } from "../../../../utils/journalLocation";
import { CreatePostBar } from "../components/CreatePostBar";
import PostActionSheet from "../components/PostActionSheet";
import ReportPostModal from "../components/ReportPostModal";
import TranslationMeta from "../components/TranslationMeta";

const COMMUNITY_BG = require("../../../../../assets/images/bg3.jpg");

const FeedCard = ({
  children,
  style,
}: {
  children: React.ReactNode;
  style?: any;
}) => {
  return (
    <View style={[styles.cardContainer, style]}>
      <LinearGradient
        colors={["rgba(214, 182, 116, 0.45)", "rgba(214, 182, 116, 0.05)"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={styles.cardAccentStrip}
      />
      {children}
      <View style={styles.postDivider} />
    </View>
  );
};

const GuestCommunityCard = ({
  handleLogin,
  t,
}: {
  handleLogin: () => void;
  t: TFunction;
}) => {
  const cardFloat = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();

    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, [cardFloat, iconPulse]);

  return (
    <View style={styles.guestContainer}>
      <Animated.View
        style={[styles.guestCard, { transform: [{ translateY: cardFloat }] }]}
      >
        <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
          <MaterialIcons name="lock-outline" size={48} color="#D4AF37" />
        </Animated.View>
        <Text style={styles.guestTitle}>
          {t("profile.loginRequired", {
            defaultValue: "Yêu cầu đăng nhập",
          })}
        </Text>
        <Text style={styles.guestSubtitle}>
          {t("profile.loginRequiredMessage", {
            defaultValue: "Vui lòng đăng nhập để sử dụng tính năng này.",
          })}
        </Text>
        <TouchableOpacity
          style={styles.guestLoginBtn}
          onPress={handleLogin}
          activeOpacity={0.85}
        >
          <View style={styles.guestLoginInner}>
            <MaterialIcons name="login" size={20} color={COLORS.white} />
            <Text style={styles.guestLoginText}>
              {t("profile.loginRegister", {
                defaultValue: "Đăng nhập / Đăng ký",
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const CommunityFeedSkeleton = () => {
  const pulseAnim = useRef(new Animated.Value(0.55)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 850,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.55,
          duration: 850,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [pulseAnim]);

  return (
    <View style={styles.skeletonListContainer}>
      {[0, 1, 2].map((index) => (
        <View key={`community-skeleton-${index}`} style={styles.skeletonCard}>
          <View style={styles.skeletonHeaderRow}>
            <Animated.View
              style={[styles.skeletonAvatar, { opacity: pulseAnim }]}
            />
            <View style={styles.skeletonHeaderTextWrap}>
              <Animated.View
                style={[styles.skeletonNameLine, { opacity: pulseAnim }]}
              />
              <Animated.View
                style={[styles.skeletonMetaLine, { opacity: pulseAnim }]}
              />
            </View>
          </View>
          <Animated.View
            style={[styles.skeletonBodyLine, { opacity: pulseAnim }]}
          />
          <Animated.View
            style={[styles.skeletonBodyLineShort, { opacity: pulseAnim }]}
          />
          <View style={styles.skeletonActionRow}>
            <Animated.View
              style={[styles.skeletonActionPill, { opacity: pulseAnim }]}
            />
            <Animated.View
              style={[styles.skeletonActionPill, { opacity: pulseAnim }]}
            />
          </View>
        </View>
      ))}
    </View>
  );
};

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
      return t("community.timeAgo.justNow", { defaultValue: "Just now" });
    }
    return date.toLocaleDateString(locale);
  }

  const diffInSeconds = rawDiffInSeconds;
  if (diffInSeconds < 5) {
    return t("community.timeAgo.justNow", { defaultValue: "Just now" });
  }

  if (diffInSeconds < 60) {
    return t("community.timeAgo.secondsAgo", {
      count: diffInSeconds,
      defaultValue: "{{count}} seconds ago",
    });
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t("community.timeAgo.minutesAgo", {
      count: diffInMinutes,
      defaultValue: "{{count}} minutes ago",
    });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t("community.timeAgo.hoursAgo", {
      count: diffInHours,
      defaultValue: "{{count}} hours ago",
    });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t("community.timeAgo.daysAgo", {
      count: diffInDays,
      defaultValue: "{{count}} days ago",
    });
  }

  return date.toLocaleDateString(locale);
};

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
              styles.initialAvatar,
              isHighlightedGuide && styles.avatarGuide,
            ]}
          >
            <Text style={styles.initialAvatarText}>
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
            {isHighlightedGuide ? (
              <View style={styles.guideBadge}>
                <MaterialIcons name="verified" size={12} color={COLORS.white} />
                <Text style={styles.guideBadgeText}>
                  {t("profile.localGuide", { defaultValue: "Local Guide" })}
                </Text>
              </View>
            ) : null}
          </View>
          <View style={{ flexDirection: "column" }}>
            <Text style={styles.timeText}>
              {formatLocalizedTime(time, t, i18n.language)}
            </Text>
            {location ? (
              <View style={styles.locationRow}>
                <MaterialIcons
                  name="location-on"
                  size={14}
                  color={COLORS.danger}
                />
                <Text
                  style={styles.locationText}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {location}
                </Text>
              </View>
            ) : null}
          </View>
        </View>
      </View>
      <TouchableOpacity style={styles.moreButton} onPress={onMorePress}>
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
  onCommentPress,
}: {
  stats: { prayers: number; comments: number };
  postId: string;
  isLiked: boolean;
  onCommentPress?: () => void;
}) => {
  const { t } = useTranslation();
  const likePostMutation = useLikePost();
  const likeScaleAnim = useRef(new Animated.Value(1)).current;

  const handleLikePress = () => {
    Animated.sequence([
      Animated.timing(likeScaleAnim, {
        toValue: 1.14,
        duration: 110,
        useNativeDriver: true,
      }),
      Animated.spring(likeScaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        damping: 9,
        stiffness: 180,
      }),
    ]).start();

    Haptics.selectionAsync().catch(() => undefined);
    likePostMutation.mutate({ postId, isLiked });
  };

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={[styles.actionButton, isLiked && styles.actionButtonLiked]}
        onPress={handleLikePress}
        disabled={likePostMutation.isPending}
      >
        <Animated.View style={{ transform: [{ scale: likeScaleAnim }] }}>
          <MaterialIcons
            name={isLiked ? "favorite" : "favorite-border"}
            size={22}
            color={isLiked ? COLORS.danger : COLORS.textSecondary}
          />
        </Animated.View>
        <Text style={[styles.actionText, isLiked && styles.actionTextDanger]}>
          {t("community.prayersCount", {
            count: stats.prayers,
            defaultValue: "{{count}} Prayers",
          })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.actionButton, styles.actionButtonNeutral]}
        onPress={onCommentPress}
      >
        <MaterialIcons
          name="chat-bubble-outline"
          size={20}
          color={COLORS.textSecondary}
        />
        <Text style={styles.actionText}>
          {t("community.commentsCount", {
            count: stats.comments,
            defaultValue: "{{count}} Comments",
          })}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const FeedItemComponent = ({
  item,
  displayContent,
  displayTitle,
  isTranslated = false,
  onPress,
  onCommentPress,
  onMorePress,
  onShowOriginal,
  fallbackLocationName,
}: {
  item: FeedPost;
  displayContent?: string;
  displayTitle?: string;
  isTranslated?: boolean;
  onPress: () => void;
  onCommentPress?: () => void;
  onMorePress?: (post: FeedPost) => void;
  onShowOriginal?: (postId: string) => void;
  fallbackLocationName?: string;
}) => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuth();
  const cardEnterAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(cardEnterAnim, {
      toValue: 1,
      useNativeDriver: true,
      damping: 16,
      stiffness: 150,
      mass: 0.65,
    }).start();
  }, [cardEnterAnim]);

  const animatedCardStyle = {
    opacity: cardEnterAnim,
    transform: [
      {
        translateY: cardEnterAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [14, 0],
        }),
      },
    ],
  };

  const displayCommentsCount =
    item.comment_count || (item as any).comments_count || 0;
  const isHighlightedGuide =
    currentUser?.role === "local_guide" && item.user_id === currentUser.id;
  const content = displayContent ?? item.content;
  const title =
    displayTitle ??
    item.title?.trim() ??
    item.sourceJournal?.title?.trim() ??
    "";

  const postAuthor = {
    name:
      item.author.full_name ||
      t("community.anonymousUser", { defaultValue: "Anonymous user" }),
    avatar: item.author.avatar_url,
  };
  const postLocation = getFeedPostLocationName(item, fallbackLocationName);

  if (item.image_urls && item.image_urls.length > 0) {
    return (
      <Pressable
        style={({ pressed }) => pressed && styles.feedItemPressed}
        onPress={onPress}
      >
        <Animated.View style={animatedCardStyle}>
          <FeedCard>
            <View
              style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}
            >
              <FeedItemHeader
                user={postAuthor}
                time={item.created_at}
                location={postLocation}
                isHighlightedGuide={isHighlightedGuide}
                onMorePress={onMorePress ? () => onMorePress(item) : undefined}
              />
            </View>

            {content ? (
              <View
                style={[
                  styles.paddingContent,
                  { paddingTop: 0, paddingBottom: SPACING.md },
                ]}
              >
                {title ? <Text style={styles.postTitle}>{title}</Text> : null}
                <Text style={styles.bodyText}>{content}</Text>
                {isTranslated && onShowOriginal ? (
                  <TranslationMeta
                    onShowOriginal={() => onShowOriginal(item.id)}
                  />
                ) : null}
              </View>
            ) : null}

            <View
              style={[
                styles.imageContainer,
                {
                  marginHorizontal: SPACING.lg,
                  width: "auto",
                  borderRadius: 12,
                  overflow: "hidden",
                },
              ]}
            >
              <Image
                source={{ uri: item.image_urls[0] }}
                style={styles.feedImage}
              />
            </View>

            <View style={[styles.paddingContent, { paddingTop: SPACING.sm }]}>
              <FeedItemActions
                stats={{
                  prayers: item.likes_count,
                  comments: displayCommentsCount,
                }}
                postId={item.id}
                isLiked={item.is_liked}
                onCommentPress={onCommentPress || onPress}
              />
            </View>
          </FeedCard>
        </Animated.View>
      </Pressable>
    );
  }

  return (
    <Pressable
      style={({ pressed }) => pressed && styles.feedItemPressed}
      onPress={onPress}
    >
      <Animated.View style={animatedCardStyle}>
        <FeedCard>
          <View style={styles.paddingContent}>
            <FeedItemHeader
              user={postAuthor}
              time={item.created_at}
              location={postLocation}
              isHighlightedGuide={isHighlightedGuide}
              onMorePress={onMorePress ? () => onMorePress(item) : undefined}
            />
            <View style={styles.textBody}>
              {title ? <Text style={styles.postTitle}>{title}</Text> : null}
              <Text style={styles.bodyText}>{content}</Text>
              {isTranslated && onShowOriginal ? (
                <TranslationMeta
                  onShowOriginal={() => onShowOriginal(item.id)}
                />
              ) : null}
            </View>
            <FeedItemActions
              stats={{
                prayers: item.likes_count,
                comments: displayCommentsCount,
              }}
              postId={item.id}
              isLiked={item.is_liked}
              onCommentPress={onCommentPress || onPress}
            />
          </View>
        </FeedCard>
      </Animated.View>
    </Pressable>
  );
};

export default function CommunityScreen() {
  const navigation = useNavigation<any>();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const { user, isAuthenticated, isGuest, exitGuestMode } = useAuth();
  const { confirm } = useConfirm();
  const isGuideViewer = user?.role === "local_guide";
  const requiresLogin = !isAuthenticated || isGuest;
  const [activePostAction, setActivePostAction] = useState<FeedPost | null>(
    null,
  );
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const [translatedPostsById, setTranslatedPostsById] = useState<
    Record<string, FeedTranslationResult>
  >({});
  const [activeFilter, setActiveFilter] = useState<"all" | "journal" | "planner">(
    "all",
  );
  const [translatingPostId, setTranslatingPostId] = useState<string | null>(
    null,
  );
  const [siteNamesById, setSiteNamesById] = useState<Record<string, string>>(
    {},
  );
  const [journalLocationNamesById, setJournalLocationNamesById] = useState<
    Record<string, string>
  >({});
  const [plannerNamesById, setPlannerNamesById] = useState<
    Record<string, string>
  >({});
  const [plannerItemSiteNamesById, setPlannerItemSiteNamesById] = useState<
    Record<string, string>
  >({});
  const requestedJournalIdsRef = useRef<Set<string>>(new Set());
  const requestedSiteIdsRef = useRef<Set<string>>(new Set());
  const requestedPlannerIdsRef = useRef<Set<string>>(new Set());

  const dateString = new Date()
    .toLocaleDateString(getDateLocale(i18n.language), {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    })
    .toUpperCase();

  const {
    data,
    isLoading,
    isError,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = usePosts(10, { enabled: !requiresLogin });
  const deletePostMutation = useDeletePost();
  const translatePostMutation = useTranslatePost();
  const sendFriendRequestMutation = useSendFriendRequest();

  useEffect(() => {
    setTranslatedPostsById({});
  }, [i18n.language]);

  const handleLogin = React.useCallback(async () => {
    if (isGuest) {
      await exitGuestMode();
    }

    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      }),
    );
  }, [exitGuestMode, isGuest, navigation]);

  const posts = React.useMemo(() => {
    if (!data) return [];
    const flattened = data.pages.flatMap((page: any) => {
      if (Array.isArray(page?.data?.items) && page.data.items.length > 0) {
        return page.data.items;
      }
      if (Array.isArray(page?.items) && page.items.length > 0) {
        return page.items;
      }
      if (Array.isArray(page?.posts) && page.posts.length > 0) {
        return page.posts;
      }
      if (Array.isArray(page?.data?.items)) {
        return page.data.items;
      }
      if (Array.isArray(page?.items)) {
        return page.items;
      }
      if (Array.isArray(page?.posts)) {
        return page.posts;
      }
      return [];
    });

    if (activeFilter === "all") return flattened;
    if (activeFilter === "journal") {
      return flattened.filter(
        (post: FeedPost) => post.journal_id || post.sourceJournal,
      );
    }
    if (activeFilter === "planner") {
      return flattened.filter(
        (post: FeedPost) => post.planner_id || post.journey || post.planner,
      );
    }
    return flattened;
  }, [data, activeFilter]);

  const clearTranslatedPost = React.useCallback((postId: string) => {
    setTranslatedPostsById((prev) => {
      if (!prev[postId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[postId];
      return next;
    });
  }, []);

  const getDisplayedPostContent = React.useCallback(
    (post?: FeedPost | null) => {
      if (!post) {
        return "";
      }

      return translatedPostsById[post.id]?.translated_text || post.content;
    },
    [translatedPostsById],
  );

  const getDisplayedPostTitle = React.useCallback(
    (post?: FeedPost | null) => {
      if (!post) {
        return "";
      }

      return (
        translatedPostsById[post.id]?.translated_title ||
        post.title?.trim() ||
        post.sourceJournal?.title?.trim() ||
        ""
      );
    },
    [translatedPostsById],
  );

  useEffect(() => {
    const missingSiteIds = Array.from(
      new Set(
        posts
          .map((post) =>
            getFeedPostLocationName(post) ? null : getFeedPostSiteId(post),
          )
          .filter((siteId): siteId is string =>
            Boolean(
              siteId &&
              !siteNamesById[siteId] &&
              !requestedSiteIdsRef.current.has(siteId),
            ),
          ),
      ),
    );

    if (!missingSiteIds.length) {
      return;
    }

    missingSiteIds.forEach((siteId) => requestedSiteIdsRef.current.add(siteId));

    let cancelled = false;

    (async () => {
      const resolvedSites = await Promise.all(
        missingSiteIds.map(async (siteId) => {
          try {
            const response = await pilgrimSiteApi.getSiteDetail(siteId);
            return {
              siteId,
              siteName: response.data?.name || null,
            };
          } catch {
            return {
              siteId,
              siteName: null,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextSiteNames: Record<string, string> = {};

      resolvedSites.forEach(({ siteId, siteName }) => {
        if (siteName) {
          nextSiteNames[siteId] = siteName;
          return;
        }

        requestedSiteIdsRef.current.delete(siteId);
      });

      if (Object.keys(nextSiteNames).length > 0) {
        setSiteNamesById((prev) => ({
          ...prev,
          ...nextSiteNames,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [posts, siteNamesById]);

  useEffect(() => {
    const missingPlannerIds = Array.from(
      new Set(
        posts
          .map((post) => {
            const plannerId = getFeedPostPlannerId(post);
            const plannerItemIds = getFeedPostPlannerItemIds(post);
            const siteId = getFeedPostSiteId(post);
            const hasResolvedLocation = Boolean(getFeedPostLocationName(post));
            const hasResolvedSiteLookup = Boolean(
              siteId && siteNamesById[siteId],
            );
            const needsPlannerName = plannerId && !plannerNamesById[plannerId];
            const needsPlannerSites =
              plannerId &&
              plannerItemIds.length > 0 &&
              plannerItemIds.some(
                (itemId) => !plannerItemSiteNamesById[itemId],
              );

            if (
              hasResolvedLocation ||
              hasResolvedSiteLookup ||
              !plannerId ||
              (!needsPlannerName && !needsPlannerSites)
            ) {
              return null;
            }

            return requestedPlannerIdsRef.current.has(plannerId)
              ? null
              : plannerId;
          })
          .filter((plannerId): plannerId is string => Boolean(plannerId)),
      ),
    );

    if (!missingPlannerIds.length) {
      return;
    }

    missingPlannerIds.forEach((plannerId) =>
      requestedPlannerIdsRef.current.add(plannerId),
    );

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missingPlannerIds.map(async (plannerId) => {
          try {
            const response = await pilgrimPlannerApi.getPlanDetail(plannerId);
            const planner = response.data;
            const items =
              planner?.items ||
              Object.values(planner?.items_by_day || {}).flat();

            return {
              plannerId,
              plannerName: planner?.name || null,
              itemSiteNames: Object.fromEntries(
                (items as any[])
                  .filter((item) => item?.id && item.site?.name)
                  .map((item) => [item.id, item.site.name]),
              ) as Record<string, string>,
            };
          } catch {
            return {
              plannerId,
              plannerName: null,
              itemSiteNames: {},
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextPlannerNames: Record<string, string> = {};
      const nextPlannerItemSiteNames: Record<string, string> = {};

      results.forEach(({ plannerId, plannerName, itemSiteNames }) => {
        if (plannerName) {
          nextPlannerNames[plannerId] = plannerName;
        }

        Object.assign(nextPlannerItemSiteNames, itemSiteNames);

        if (!plannerName && Object.keys(itemSiteNames).length === 0) {
          requestedPlannerIdsRef.current.delete(plannerId);
        }
      });

      if (Object.keys(nextPlannerNames).length > 0) {
        setPlannerNamesById((prev) => ({
          ...prev,
          ...nextPlannerNames,
        }));
      }

      if (Object.keys(nextPlannerItemSiteNames).length > 0) {
        setPlannerItemSiteNamesById((prev) => ({
          ...prev,
          ...nextPlannerItemSiteNames,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [plannerItemSiteNamesById, plannerNamesById, posts, siteNamesById]);

  useEffect(() => {
    const missingJournalIds = Array.from(
      new Set(
        posts
          .map((post) => {
            const siteId = getFeedPostSiteId(post);
            const plannerLocationName = getFeedPostPlannerLocationName(
              post,
              plannerItemSiteNamesById,
            );
            const plannerId = getFeedPostPlannerId(post);
            const fallbackLocationName =
              getFeedPostLocationName(post) ||
              (siteId ? siteNamesById[siteId] : undefined) ||
              plannerLocationName ||
              (plannerId ? plannerNamesById[plannerId] : undefined);

            if (
              fallbackLocationName ||
              !post.journal_id ||
              journalLocationNamesById[post.journal_id] ||
              requestedJournalIdsRef.current.has(post.journal_id)
            ) {
              return null;
            }

            return post.journal_id;
          })
          .filter((journalId): journalId is string => Boolean(journalId)),
      ),
    );

    if (!missingJournalIds.length) {
      return;
    }

    missingJournalIds.forEach((journalId) =>
      requestedJournalIdsRef.current.add(journalId),
    );

    let cancelled = false;

    (async () => {
      const results = await Promise.all(
        missingJournalIds.map(async (journalId) => {
          try {
            const response =
              await pilgrimJournalApi.getJournalDetail(journalId);
            return {
              journalId,
              locationName: await resolveJournalLocationName(response.data),
            };
          } catch {
            return {
              journalId,
              locationName: undefined,
            };
          }
        }),
      );

      if (cancelled) {
        return;
      }

      const nextJournalLocations: Record<string, string> = {};

      results.forEach(({ journalId, locationName }) => {
        if (locationName) {
          nextJournalLocations[journalId] = locationName;
          return;
        }

        requestedJournalIdsRef.current.delete(journalId);
      });

      if (Object.keys(nextJournalLocations).length > 0) {
        setJournalLocationNamesById((prev) => ({
          ...prev,
          ...nextJournalLocations,
        }));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    journalLocationNamesById,
    plannerItemSiteNamesById,
    plannerNamesById,
    posts,
    siteNamesById,
  ]);

  const handleEditPost = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    clearTranslatedPost(targetPost.id);
    setActivePostAction(null);
    navigation.navigate("CreatePost", {
      postId: targetPost.id,
      initialPost: targetPost,
    });
  }, [activePostAction, clearTranslatedPost, navigation]);

  const handleDeletePost = React.useCallback(async () => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    setActivePostAction(null);

    const confirmed = await confirm({
      title: t("postDetail.deletePost", { defaultValue: "Delete post" }),
      message: t("postDetail.deletePostMessage", {
        defaultValue: "Are you sure you want to delete this post?",
      }),
      confirmText: t("common.delete", { defaultValue: "Delete" }),
      cancelText: t("common.cancel", { defaultValue: "Cancel" }),
      type: "danger",
    });

    if (confirmed) {
      deletePostMutation.mutate(targetPost.id, {
        onSuccess: () => {
          clearTranslatedPost(targetPost.id);
          Toast.show({
            type: "success",
            text1: t("common.success", { defaultValue: "Success" }),
            text2: t("postDetail.deletePostSuccess", {
              defaultValue: "Post deleted.",
            }),
          });
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
    }
  }, [activePostAction, clearTranslatedPost, confirm, deletePostMutation, t]);

  const handleTogglePostTranslation = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    const translatedPost = translatedPostsById[targetPost.id];

    if (translatedPost) {
      clearTranslatedPost(targetPost.id);
      setActivePostAction(null);
      return;
    }

    if (!targetPost.content?.trim()) {
      return;
    }

    setTranslatingPostId(targetPost.id);

    translatePostMutation.mutate(targetPost.id, {
      onSuccess: (response) => {
        const translatedResult = response.data;

        if (!translatedResult?.translated_text?.trim()) {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2: t("postDetail.translatePostError", {
              defaultValue: "Unable to translate post.",
            }),
          });
          return;
        }

        setTranslatedPostsById((prev) => ({
          ...prev,
          [targetPost.id]: translatedResult,
        }));
        setActivePostAction(null);

        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Success" }),
          text2: t("postDetail.translatePostSuccess", {
            defaultValue: "Post translated.",
          }),
        });
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Error" }),
          text2:
            t("postDetail.translatePostError", {
              defaultValue: "Unable to translate post.",
            }) + (error?.message ? ` ${error.message}` : ""),
        });
      },
      onSettled: () => {
        setTranslatingPostId(null);
      },
    });
  }, [
    activePostAction,
    clearTranslatedPost,
    t,
    translatedPostsById,
    translatePostMutation,
  ]);

  const handleReportPost = React.useCallback(() => {
    if (!activePostAction) return;
    setReportPostId(activePostAction.id);
    setActivePostAction(null);
  }, [activePostAction]);

  const handleAddFriend = React.useCallback(() => {
    if (!activePostAction) return;

    const targetUser = activePostAction.author;
    const targetUserId = activePostAction.user_id;
    setActivePostAction(null);

    sendFriendRequestMutation.mutate(targetUserId, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2: t("postDetail.friendRequestSent", {
            defaultValue: "Đã gửi lời mời kết bạn đến {{name}}",
            name: targetUser.full_name,
          }),
        });
      },
      onError: (error: any) => {
        const errorMessage =
          error?.message === "Đã gửi lời mời kết bạn trước đó"
            ? t("postDetail.friendRequestDuplicate")
            : error?.message;

        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Lỗi" }),
          text2:
            errorMessage ||
            t("postDetail.friendRequestError", {
              defaultValue: "Không thể gửi lời mời kết bạn",
            }),
        });
      },
    });
  }, [activePostAction, sendFriendRequestMutation, t]);

  const renderItem = ({ item }: { item: FeedPost }) => {
    const siteId = getFeedPostSiteId(item);
    const plannerLocationName = getFeedPostPlannerLocationName(
      item,
      plannerItemSiteNamesById,
    );
    const plannerId = getFeedPostPlannerId(item);
    const fallbackLocationName =
      (siteId ? siteNamesById[siteId] : undefined) ||
      plannerLocationName ||
      (plannerId ? plannerNamesById[plannerId] : undefined) ||
      (item.journal_id ? journalLocationNamesById[item.journal_id] : undefined);

    return (
      <FeedItemComponent
        item={item}
        displayTitle={getDisplayedPostTitle(item)}
        displayContent={getDisplayedPostContent(item)}
        isTranslated={Boolean(translatedPostsById[item.id]?.translated_text)}
        onPress={() => navigation.navigate("PostDetail", { postId: item.id })}
        onCommentPress={() =>
          navigation.navigate("PostDetail", {
            postId: item.id,
            autoFocusComment: true,
          } as any)
        }
        onMorePress={setActivePostAction}
        onShowOriginal={clearTranslatedPost}
        fallbackLocationName={fallbackLocationName}
      />
    );
  };

  const handleRefresh = React.useCallback(async () => {
    try {
      setIsManualRefreshing(true);
      await refetch();
    } finally {
      setIsManualRefreshing(false);
    }
  }, [refetch]);

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

      <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
        <View style={styles.headerContent}>
          <View>
            <Text style={styles.headerDate}>{dateString}</Text>
            <Text style={styles.headerTitle}>
              {t("community.greeting", { defaultValue: "Catholic\nCommunity" })}
            </Text>
          </View>
          <View style={styles.profileContainer}>
            {user?.avatar ? (
              <Image
                source={{ uri: user.avatar }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.initialAvatar]}>
                <Text style={styles.initialAvatarText}>
                  {(() => {
                    const name =
                      user?.fullName ||
                      t("profile.defaultPilgrim", {
                        defaultValue: "Người hành hương",
                      });
                    const parts = name.trim().split(" ");
                    if (parts.length === 1)
                      return parts[0].charAt(0).toUpperCase();
                    return (
                      parts[0].charAt(0) + parts[parts.length - 1].charAt(0)
                    ).toUpperCase();
                  })()}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Filter Bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterContainer}
        >
          {[
            { id: "all", label: t("community.filters.all"), icon: "apps" },
            {
              id: "journal",
              label: t("community.filters.journal"),
              icon: "auto-stories",
            },
            {
              id: "planner",
              label: t("community.filters.planner"),
              icon: "event-note",
            },
          ].map((filter) => {
            const isActive = activeFilter === filter.id;
            return (
              <TouchableOpacity
                key={filter.id}
                onPress={() => setActiveFilter(filter.id as any)}
                style={[
                  styles.filterChip,
                  isActive && styles.filterChipActive,
                ]}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name={filter.icon as any}
                  size={16}
                  color={isActive ? COLORS.white : COLORS.textSecondary}
                />
                <Text
                  style={[
                    styles.filterText,
                    isActive && styles.filterTextActive,
                  ]}
                >
                  {filter.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

      </View>

      {requiresLogin ? (
        <GuestCommunityCard handleLogin={handleLogin} t={t} />
      ) : isLoading && !posts.length ? (
        <CommunityFeedSkeleton />
      ) : isError ? (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>
            {t("community.feedLoadError", {
              defaultValue:
                "Something went wrong while loading the feed. Please try again.",
            })}
          </Text>
          <TouchableOpacity
            onPress={() => refetch()}
            style={styles.retryButton}
          >
            <Text style={styles.retryText}>
              {t("common.retry", { defaultValue: "Retry" })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={posts}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            !isGuideViewer ? (
              <View style={styles.createPostWrapper}>
                <CreatePostBar
                  avatar={user?.avatar}
                  name={
                    user?.fullName ||
                    t("profile.defaultPilgrim", {
                      defaultValue: "Người hành hương",
                    })
                  }
                  onPress={() => {
                    navigation.navigate("CreatePost");
                  }}
                />
              </View>
            ) : null
          }
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => null}
          refreshControl={
            <RefreshControl
              refreshing={isManualRefreshing}
              onRefresh={handleRefresh}
              colors={[COLORS.primary]}
            />
          }
          onEndReached={() => {
            if (hasNextPage) {
              fetchNextPage();
            }
          }}
          onEndReachedThreshold={0.5}
          ListFooterComponent={
            isFetchingNextPage ? (
              <ActivityIndicator
                size="small"
                color={COLORS.primary}
                style={{ margin: SPACING.md }}
              />
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <View style={{ padding: SPACING.xl, alignItems: "center" }}>
                <Text style={styles.emptyText}>
                  {t("community.emptyFeed", {
                    defaultValue: "No posts yet. Be the first to share!",
                  })}
                </Text>
              </View>
            ) : null
          }
        />
      )}

      {/* Post action sheet: owner sees Edit+Delete, others see Report only */}
      <PostActionSheet
        visible={Boolean(activePostAction)}
        postContent={
          getDisplayedPostTitle(activePostAction) ||
          getDisplayedPostContent(activePostAction)
        }
        canTranslate={Boolean(activePostAction?.content?.trim())}
        isOwner={Boolean(
          user?.id &&
          activePostAction?.user_id &&
          user.id === activePostAction.user_id,
        )}
        isTranslated={Boolean(
          activePostAction &&
          translatedPostsById[activePostAction.id]?.translated_text,
        )}
        busy={
          deletePostMutation.isPending ||
          sendFriendRequestMutation.isPending ||
          translatingPostId === activePostAction?.id
        }
        onClose={() => setActivePostAction(null)}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
        onTranslate={handleTogglePostTranslation}
        onAddFriend={isGuideViewer ? undefined : handleAddFriend}
      />

      <ReportPostModal
        visible={!!reportPostId}
        onClose={() => setReportPostId(null)}
        targetId={reportPostId || ""}
        targetType="post"
      />
    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  headerContainer: {
    backgroundColor: "rgba(255,255,255,0.84)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(191, 167, 111, 0.22)",
    zIndex: 10,
    shadowColor: "#8A7440",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
    paddingRight: SPACING.xl, // Ensure space for the last item
  },
  filterChip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(191, 167, 111, 0.12)",
    gap: 6,
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.15)",
  },
  filterChipActive: {
    backgroundColor: "#D4AF37",
    borderColor: "#B38A2E",
    ...SHADOWS.subtle,
  },
  filterText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  filterTextActive: {
    color: COLORS.white,
  },
  headerContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerDate: {
    color: "#B38A2E",
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "800",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    fontFamily: Platform.OS === "ios" ? "System" : "serif",
    marginBottom: 2,
  },
  headerTitle: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.xl + 2,
    fontWeight: "700",
    fontFamily: "serif",
    lineHeight: 36,
    letterSpacing: 0.3,
  },
  profileContainer: {
    width: 48,
    height: 48,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.surface0,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.32)",
    ...SHADOWS.subtle,
  },
  profileImage: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: COLORS.surface0,
  },
  centerContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  guestContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  guestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 28,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
    width: "100%",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    ...SHADOWS.medium,
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  guestLoginBtn: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  guestLoginInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: "#D4AF37",
    gap: 8,
  },
  guestLoginText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  errorText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  retryButton: {
    padding: SPACING.sm,
    backgroundColor: COLORS.primary,
    borderRadius: 8,
  },
  retryText: {
    color: COLORS.white,
    fontWeight: "bold",
  },
  listContent: {
    paddingTop: SPACING.sm,
    paddingBottom: 100,
  },
  createPostWrapper: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  cardContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.94)",
    marginHorizontal: SPACING.md,
    marginBottom: SPACING.sm,
    borderRadius: 16,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.2)",
    shadowColor: "#5E4A24",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.09,
    shadowRadius: 10,
    elevation: 4,
  },
  cardAccentStrip: {
    height: 3,
    width: "100%",
  },
  paddingContent: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  postDivider: {
    height: 0,
    backgroundColor: "transparent",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: SPACING.sm,
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
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  avatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  initialAvatar: {
    backgroundColor: COLORS.primary,
    justifyContent: "center",
    alignItems: "center",
  },
  initialAvatarText: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.white,
  },
  avatarGuide: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.md + 1,
    fontWeight: "600",
    fontFamily: "serif",
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
    fontSize: TYPOGRAPHY.fontSize.xs + 1,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    minWidth: 0,
  },
  locationText: {
    flex: 1,
    color: COLORS.primary,
    fontSize: 12.5,
    fontWeight: "700",
    marginLeft: 4,
    minWidth: 0,
  },
  textBody: {
    marginBottom: SPACING.md,
  },
  bodyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 26,
    fontFamily: "serif",
  },
  postTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    color: COLORS.textPrimary,
    lineHeight: 28,
    fontWeight: "700",
    fontFamily: "serif",
    marginBottom: SPACING.xs,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(210, 196, 165, 0.35)",
    paddingTop: SPACING.sm,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 999,
  },
  actionButtonLiked: {
    backgroundColor: "rgba(230, 76, 103, 0.1)",
  },
  actionButtonNeutral: {
    backgroundColor: "rgba(111, 94, 58, 0.08)",
  },
  moreButton: {
    paddingVertical: 5,
    paddingHorizontal: 6,
    borderRadius: 999,
    backgroundColor: "rgba(111, 94, 58, 0.08)",
  },
  actionText: {
    color: COLORS.textSecondary,
    fontWeight: "600",
    fontSize: 14,
    marginLeft: 6,
  },
  actionTextDanger: {
    color: COLORS.danger,
  },
  emptyText: {
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  imageContainer: {
    height: 280,
    width: "100%",
  },
  feedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  feedItemPressed: {
    transform: [{ scale: 0.995 }],
  },
  skeletonListContainer: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    gap: SPACING.sm,
  },
  skeletonCard: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(191, 167, 111, 0.18)",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
  },
  skeletonHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  skeletonAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(185, 176, 157, 0.35)",
    marginRight: SPACING.sm,
  },
  skeletonHeaderTextWrap: {
    flex: 1,
    gap: 8,
  },
  skeletonNameLine: {
    height: 14,
    width: "52%",
    borderRadius: 8,
    backgroundColor: "rgba(185, 176, 157, 0.4)",
  },
  skeletonMetaLine: {
    height: 10,
    width: "34%",
    borderRadius: 8,
    backgroundColor: "rgba(185, 176, 157, 0.3)",
  },
  skeletonBodyLine: {
    height: 12,
    width: "92%",
    borderRadius: 8,
    backgroundColor: "rgba(185, 176, 157, 0.35)",
    marginBottom: 10,
  },
  skeletonBodyLineShort: {
    height: 12,
    width: "64%",
    borderRadius: 8,
    backgroundColor: "rgba(185, 176, 157, 0.35)",
    marginBottom: SPACING.md,
  },
  skeletonActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: 1,
    borderTopColor: "rgba(210, 196, 165, 0.3)",
    paddingTop: SPACING.sm,
  },
  skeletonActionPill: {
    height: 30,
    width: "32%",
    borderRadius: 999,
    backgroundColor: "rgba(185, 176, 157, 0.32)",
  },
});
