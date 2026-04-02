import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import type { TFunction } from 'i18next';
import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Alert,
    Animated,
    FlatList,
    Image,
    ImageBackground,
    Platform,
    RefreshControl,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useDeletePost, useLikePost, usePosts } from '../../../../hooks/usePosts';
import { pilgrimSiteApi } from '../../../../services/api/pilgrim';
import { FeedPost } from '../../../../types';
import { CreatePostBar } from '../components/CreatePostBar';
import PostActionSheet from '../components/PostActionSheet';
import ReportPostModal from '../components/ReportPostModal';

const COMMUNITY_BG = require('../../../../../assets/images/bg3.jpg');

const FeedCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    return (
        <View style={[styles.cardContainer, style]}>
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
                    {t('profile.loginRequired', {
                        defaultValue: 'Yêu cầu đăng nhập',
                    })}
                </Text>
                <Text style={styles.guestSubtitle}>
                    {t('profile.loginRequiredMessage', {
                        defaultValue: 'Vui lòng đăng nhập để sử dụng tính năng này.',
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
                            {t('profile.loginRegister', {
                                defaultValue: 'Đăng nhập / Đăng ký',
                            })}
                        </Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

const getDateLocale = (language: string) =>
    language.startsWith('en') ? 'en-US' : 'vi-VN';

const formatLocalizedTime = (
    dateString: string,
    t: TFunction,
    language: string,
) => {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';

    const locale = getDateLocale(language);
    const now = new Date();
    const rawDiffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (rawDiffInSeconds < 0) {
        if (Math.abs(rawDiffInSeconds) < 60) {
            return t('community.timeAgo.justNow', { defaultValue: 'Just now' });
        }
        return date.toLocaleDateString(locale);
    }

    const diffInSeconds = rawDiffInSeconds;
    if (diffInSeconds < 5) {
        return t('community.timeAgo.justNow', { defaultValue: 'Just now' });
    }

    if (diffInSeconds < 60) {
        return t('community.timeAgo.secondsAgo', {
            count: diffInSeconds,
            defaultValue: '{{count}} seconds ago',
        });
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
        return t('community.timeAgo.minutesAgo', {
            count: diffInMinutes,
            defaultValue: '{{count}} minutes ago',
        });
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
        return t('community.timeAgo.hoursAgo', {
            count: diffInHours,
            defaultValue: '{{count}} hours ago',
        });
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) {
        return t('community.timeAgo.daysAgo', {
            count: diffInDays,
            defaultValue: '{{count}} days ago',
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
                    <Image source={{ uri: user.avatar }} style={[styles.avatar, isHighlightedGuide && styles.avatarGuide]} />
                ) : (
                    <View style={[styles.avatar, styles.initialAvatar, isHighlightedGuide && styles.avatarGuide]}>
                        <Text style={styles.initialAvatarText}>{user.name.charAt(0).toUpperCase()}</Text>
                    </View>
                )}
                <View>
                    <View style={styles.userNameRow}>
                        <Text style={[styles.userName, isHighlightedGuide && styles.userNameGuide]}>{user.name}</Text>
                        {isHighlightedGuide ? (
                            <View style={styles.guideBadge}>
                                <MaterialIcons name="verified" size={12} color={COLORS.white} />
                                <Text style={styles.guideBadgeText}>
                                    {t('profile.localGuide', { defaultValue: 'Local Guide' })}
                                </Text>
                            </View>
                        ) : null}
                    </View>
                    <View style={{ flexDirection: 'column' }}>
                        <Text style={styles.timeText}>{formatLocalizedTime(time, t, i18n.language)}</Text>
                        {location ? (
                            <View style={styles.locationRow}>
                                <MaterialIcons name="location-on" size={14} color={COLORS.danger} />
                                <Text style={styles.locationText}>
                                    {t('community.locatedAt', { defaultValue: 'At' })}{' '}
                                    <Text style={styles.locationName}>
                                        {location}
                                    </Text>
                                </Text>
                            </View>
                        ) : null}
                    </View>
                </View>
            </View>
            <TouchableOpacity style={{ padding: 4 }} onPress={onMorePress}>
                <MaterialIcons name="more-horiz" size={24} color={COLORS.textTertiary} />
            </TouchableOpacity>
        </View>
    );
};

const FeedItemActions = ({
    stats,
    postId,
    isLiked,
    onCommentPress
}: {
    stats: { prayers: number; comments: number };
    postId: string;
    isLiked: boolean;
    onCommentPress?: () => void;
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
                    name={isLiked ? 'favorite' : 'favorite-border'}
                    size={22}
                    color={isLiked ? COLORS.danger : COLORS.textSecondary}
                />
                <Text style={[styles.actionText, isLiked && styles.actionTextDanger]}>
                    {t('community.prayersCount', {
                        count: stats.prayers,
                        defaultValue: '{{count}} Prayers',
                    })}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
                <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.textSecondary} />
                <Text style={styles.actionText}>
                    {t('community.commentsCount', {
                        count: stats.comments,
                        defaultValue: '{{count}} Comments',
                    })}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="share" size={20} color={COLORS.textSecondary} />
                <Text style={styles.actionText}>
                    {t('community.share', { defaultValue: 'Share' })}
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const FeedItemComponent = ({
    item,
    onPress,
    onCommentPress,
    onMorePress,
    siteName,
}: {
    item: FeedPost;
    onPress: () => void;
    onCommentPress?: () => void;
    onMorePress?: (post: FeedPost) => void;
    siteName?: string;
}) => {
    const { t } = useTranslation();
    const { user: currentUser } = useAuth();
    const displayCommentsCount = item.comment_count || (item as any).comments_count || 0;
    const isHighlightedGuide = currentUser?.role === 'local_guide' && item.user_id === currentUser.id;

    const postAuthor = {
        name: item.author.full_name || t('community.anonymousUser', { defaultValue: 'Anonymous user' }),
        avatar: item.author.avatar_url,
    };
    const postLocation = item.site?.name || siteName;

    if (item.image_urls && item.image_urls.length > 0) {
        return (
            <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
                <FeedCard>
                    <View style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}> 
                        <FeedItemHeader
                            user={postAuthor}
                            time={item.created_at}
                            location={postLocation}
                            isHighlightedGuide={isHighlightedGuide}
                            onMorePress={onMorePress ? () => onMorePress(item) : undefined}
                        />
                    </View>

                    {item.content ? (
                        <View style={[styles.paddingContent, { paddingTop: 0, paddingBottom: SPACING.md }]}>
                            <Text style={styles.bodyText}>{item.content}</Text>
                        </View>
                    ) : null}

                    <View style={[styles.imageContainer, { marginHorizontal: SPACING.lg, width: 'auto', borderRadius: 12, overflow: 'hidden' }]}>
                        <Image source={{ uri: item.image_urls[0] }} style={styles.feedImage} />
                    </View>

                    <View style={[styles.paddingContent, { paddingTop: SPACING.sm }]}> 
                        <FeedItemActions
                            stats={{ prayers: item.likes_count, comments: displayCommentsCount }}
                            postId={item.id}
                            isLiked={item.is_liked}
                            onCommentPress={onCommentPress || onPress}
                        />
                    </View>
                </FeedCard>
            </TouchableOpacity>
        );
    }

    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
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
                        <Text style={styles.bodyText}>{item.content}</Text>
                    </View>
                    <FeedItemActions
                        stats={{ prayers: item.likes_count, comments: displayCommentsCount }}
                        postId={item.id}
                        isLiked={item.is_liked}
                        onCommentPress={onCommentPress || onPress}
                    />
                </View>
            </FeedCard>
        </TouchableOpacity>
    );
};

export default function CommunityScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t, i18n } = useTranslation();
    const { user, isAuthenticated, isGuest, exitGuestMode } = useAuth();
    const isGuideViewer = user?.role === 'local_guide';
    const requiresLogin = !isAuthenticated || isGuest;
    const [activePostAction, setActivePostAction] = useState<FeedPost | null>(null);
    const [reportPostId, setReportPostId] = useState<string | null>(null);
    const [siteNamesById, setSiteNamesById] = useState<Record<string, string>>({});
    const requestedSiteIdsRef = useRef<Set<string>>(new Set());

    const dateString = new Date().toLocaleDateString(getDateLocale(i18n.language), {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    }).toUpperCase();

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

    const handleLogin = React.useCallback(async () => {
        if (isGuest) {
            await exitGuestMode();
        }

        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            }),
        );
    }, [exitGuestMode, isGuest, navigation]);

    const posts = React.useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page: any) => {
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
    }, [data]);

    useEffect(() => {
        const missingSiteIds = Array.from(
            new Set(
                posts
                    .map((post) => post.site?.name ? null : post.site_id)
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

    const handleEditPost = React.useCallback(() => {
        if (!activePostAction) return;

        const targetPost = activePostAction;
        setActivePostAction(null);
        navigation.navigate('CreatePost', {
            postId: targetPost.id,
            initialPost: targetPost,
        });
    }, [activePostAction, navigation]);

    const handleDeletePost = React.useCallback(() => {
        if (!activePostAction) return;

        const targetPost = activePostAction;
        setActivePostAction(null);

        Alert.alert(
            t('postDetail.deletePost', { defaultValue: 'Delete post' }),
            t('postDetail.deletePostMessage', {
                defaultValue: 'Are you sure you want to delete this post?',
            }),
            [
                {
                    text: t('common.cancel', { defaultValue: 'Cancel' }),
                    style: 'cancel',
                },
                {
                    text: t('common.delete', { defaultValue: 'Delete' }),
                    style: 'destructive',
                    onPress: () => {
                        deletePostMutation.mutate(targetPost.id, {
                            onSuccess: () => {
                                Toast.show({
                                    type: 'success',
                                    text1: t('common.success', { defaultValue: 'Success' }),
                                    text2: t('postDetail.deletePostSuccess', {
                                        defaultValue: 'Post deleted.',
                                    }),
                                });
                            },
                            onError: (error: any) => {
                                Toast.show({
                                    type: 'error',
                                    text1: t('common.error', { defaultValue: 'Error' }),
                                    text2:
                                        t('postDetail.deletePostError', {
                                            defaultValue: 'Unable to delete post.',
                                        }) + (error?.message ? ` ${error.message}` : ''),
                                });
                            },
                        });
                    },
                },
            ],
        );
    }, [activePostAction, deletePostMutation, t]);

    const handleReportPost = React.useCallback(() => {
        if (!activePostAction) return;
        setReportPostId(activePostAction.id);
        setActivePostAction(null);
    }, [activePostAction]);

    const renderItem = ({ item }: { item: FeedPost }) => (
        <FeedItemComponent
            item={item}
            onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
            onCommentPress={() => navigation.navigate('PostDetail', { postId: item.id, autoFocusComment: true } as any)}
            onMorePress={setActivePostAction}
            siteName={item.site_id ? siteNamesById[item.site_id] : undefined}
        />
    );

    return (
        <ImageBackground
            source={COMMUNITY_BG}
            style={styles.container}
            resizeMode="cover"
        >
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            <LinearGradient
                colors={[
                    'rgba(252, 248, 238, 0.62)',
                    'rgba(255,255,255,0.54)',
                    'rgba(250, 244, 230, 0.66)',
                ]}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={[styles.headerContainer, { paddingTop: insets.top }]}> 
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerDate}>{dateString}</Text>
                        <Text style={styles.headerTitle}>
                            {t('community.greeting', { defaultValue: 'Catholic\nCommunity' })}
                        </Text>
                    </View>
                    <View style={styles.profileContainer}>
                        {user?.avatar ? (
                            <Image source={{ uri: user.avatar }} style={styles.profileImage} />
                        ) : (
                            <View style={[styles.profileImage, styles.initialAvatar]}>
                                <Text style={styles.initialAvatarText}>
                                    {(() => {
                                        const name = user?.fullName || t('profile.defaultPilgrim', { defaultValue: 'Pilgrim' });
                                        const parts = name.trim().split(' ');
                                        if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
                                        return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
                                    })()}
                                </Text>
                            </View>
                        )}
                    </View>
                </View>
            </View>

            {requiresLogin ? (
                <GuestCommunityCard handleLogin={handleLogin} t={t} />
            ) : isLoading && !posts.length ? (
                <View style={styles.centerContent}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : isError ? (
                <View style={styles.errorContainer}>
                    <Text style={styles.errorText}>
                        {t('community.feedLoadError', {
                            defaultValue: 'Something went wrong while loading the feed. Please try again.',
                        })}
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={styles.retryButton}
                    >
                        <Text style={styles.retryText}>
                            {t('common.retry', { defaultValue: 'Retry' })}
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
                            <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                                <CreatePostBar
                                    avatar={user?.avatar}
                                    name={user?.fullName || t('profile.defaultPilgrim', { defaultValue: 'Pilgrim' })}
                                    onPress={() => {
                                        navigation.navigate('CreatePost');
                                    }}
                                />
                            </View>
                        ) : null
                    }
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => null}
                    refreshControl={
                        <RefreshControl
                            refreshing={isLoading}
                            onRefresh={refetch}
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
                            <ActivityIndicator size="small" color={COLORS.primary} style={{ margin: SPACING.md }} />
                        ) : null
                    }
                    ListEmptyComponent={
                        !isLoading ? (
                            <View style={{ padding: SPACING.xl, alignItems: 'center' }}>
                                <Text style={styles.emptyText}>
                                    {t('community.emptyFeed', {
                                        defaultValue: 'No posts yet. Be the first to share!',
                                    })}
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}
            <PostActionSheet
                visible={Boolean(activePostAction)}
                postContent={activePostAction?.content}
                busy={deletePostMutation.isPending}
                onClose={() => setActivePostAction(null)}
                onEdit={handleEditPost}
                onDelete={handleDeletePost}
                onReport={handleReportPost}
            />

            <ReportPostModal
                visible={!!reportPostId}
                onClose={() => setReportPostId(null)}
                targetId={reportPostId || ''}
                targetType="post"
            />
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    headerContainer: {
        backgroundColor: 'rgba(255,255,255,0.74)',
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        zIndex: 10,
    },
    headerContent: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    headerDate: {
        color: COLORS.accent,
        fontSize: TYPOGRAPHY.fontSize.sm,
        fontWeight: '800',
        letterSpacing: 0.5,
        textTransform: 'uppercase',
        fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
        marginBottom: 2,
    },
    headerTitle: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.fontSize.xl,
        fontWeight: '700',
        fontFamily: 'serif',
    },
    profileContainer: {
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: COLORS.surface0,
        borderRadius: 22,
        ...SHADOWS.subtle,
    },
    profileImage: {
        width: 44,
        height: 44,
        borderRadius: 22,
        borderWidth: 2,
        borderColor: COLORS.surface0,
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    guestContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: SPACING.xl,
    },
    guestCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.9)',
        borderRadius: 28,
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.md,
        width: '100%',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        ...SHADOWS.medium,
    },
    guestTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: COLORS.textPrimary,
        textAlign: 'center',
    },
    guestSubtitle: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    guestLoginBtn: {
        borderRadius: 20,
        overflow: 'hidden',
        marginTop: SPACING.sm,
    },
    guestLoginInner: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        paddingHorizontal: 28,
        borderRadius: 20,
        backgroundColor: '#D4AF37',
        gap: 8,
    },
    guestLoginText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
    errorContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: SPACING.lg,
    },
    errorText: {
        textAlign: 'center',
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
        fontWeight: 'bold',
    },
    listContent: {
        paddingBottom: 100,
    },
    cardContainer: {
        backgroundColor: 'rgba(255, 255, 255, 0.86)',
    },
    paddingContent: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    postDivider: {
        height: 8,
        backgroundColor: 'rgba(250, 244, 230, 0.7)',
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: SPACING.md,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: SPACING.sm,
    },
    userNameRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: 8,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    initialAvatar: {
        backgroundColor: COLORS.primary,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialAvatarText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: COLORS.white,
    },
    avatarGuide: {
        borderWidth: 2,
        borderColor: '#D4AF37',
    },
    userName: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: '600',
        fontFamily: 'serif',
    },
    userNameGuide: {
        color: '#9A6C00',
    },
    guideBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#D4AF37',
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 999,
    },
    guideBadgeText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    timeText: {
        color: COLORS.textTertiary,
        fontSize: TYPOGRAPHY.fontSize.xs,
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    locationText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
        marginLeft: 4,
    },
    locationName: {
        fontWeight: '700',
        color: COLORS.primary,
    },
    textBody: {
        marginBottom: SPACING.md,
    },
    bodyText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textPrimary,
        lineHeight: 24,
        fontFamily: 'serif',
    },
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTopWidth: StyleSheet.hairlineWidth,
        borderTopColor: COLORS.borderLight,
        paddingTop: SPACING.md,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
    },
    actionText: {
        color: COLORS.textSecondary,
        fontWeight: '500',
        fontSize: 14,
        marginLeft: 6,
    },
    actionTextDanger: {
        color: COLORS.danger,
    },
    emptyText: {
        color: COLORS.textSecondary,
        textAlign: 'center',
    },
    imageContainer: {
        height: 280,
        width: '100%',
    },
    feedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
});
