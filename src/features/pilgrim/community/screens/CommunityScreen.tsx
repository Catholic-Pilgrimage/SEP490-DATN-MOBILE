import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
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
import { COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useLikePost, usePosts } from '../../../../hooks/usePosts';
import { FeedPost } from '../../../../types';
import { CreatePostBar } from '../components/CreatePostBar';
import ReportPostModal from '../components/ReportPostModal';

// --- Constants & Types ---
// Using app-wide theme COLORS instead of custom SACRED_COLORS
// Colors are now synchronized with Profile and Planner screens (Light Theme)

const STAINED_GLASS_PATTERN = {
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxrhiVQWx2be6uJ1xrGN4hrOCUzxkfSHMR9cY-0Rhvsmxq3dUZv72rXkE6aALqYJ_SyYq2b7EXCmgdin9z1u5YfXrQ4VOyNsBL1wjMkzIj0u2uvABqykyPMwnM2GF7VxfEaMbOhZPO_wESJVkyuN5tziBRX-eik_dKiqMIs5XmPvzq79GKdmgklm_GlWjY9erNgg8PcfbBz-ougrXWAVrtGGPdjXZtKHCHWgj7Hbm6Y4a0LzDmRA_ZwuKYbEpTo7ux9fZX7Q9pCYE',
};

// --- Components ---

const FeedCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    return (
        <View style={[styles.cardContainer, style]}>
            {children}
            <View style={styles.postDivider} />
        </View>
    );
};

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

    return date.toLocaleDateString('vi-VN');
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
}) => (
    <View style={styles.headerRow}>
        <View style={styles.userInfo}>
            {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={[styles.avatar, isHighlightedGuide && styles.avatarGuide]} />
            ) : (
                <View style={[styles.avatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }, isHighlightedGuide && styles.avatarGuide]}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>
                        {user.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
            <View>
                <View style={styles.userNameRow}>
                    <Text style={[styles.userName, isHighlightedGuide && styles.userNameGuide]}>{user.name}</Text>
                    {isHighlightedGuide ? (
                        <View style={styles.guideBadge}>
                            <MaterialIcons name="verified" size={12} color={COLORS.white} />
                            <Text style={styles.guideBadgeText}>Local Guide</Text>
                        </View>
                    ) : null}
                </View>
                <View style={{ flexDirection: 'column' }}>
                    <Text style={styles.timeText}>{formatTime(time)}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 4 }}>
                        <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
                        <Text style={{ color: COLORS.textSecondary, fontSize: 13, fontWeight: '500' }}>
                            Đang ở <Text style={{ fontWeight: '700', color: COLORS.primary }}>{location || 'Nhà thờ Đức Bà Sài Gòn'}</Text>
                        </Text>
                    </View>
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
    onCommentPress
}: {
    stats: { prayers: number; comments: number };
    postId: string;
    isLiked: boolean;
    onCommentPress?: () => void;
}) => {
    const likePostMutation = useLikePost();

    const handleLike = () => {
        likePostMutation.mutate({ postId, isLiked });
    };

    return (
        <View style={styles.actionsRow}>
            <TouchableOpacity
                style={styles.actionButton}
                onPress={handleLike}
                disabled={likePostMutation.isPending}
            >
                <MaterialIcons
                    name={isLiked ? "favorite" : "favorite-border"}
                    size={22}
                    color={isLiked ? COLORS.danger : COLORS.textSecondary}
                />
                <Text style={{ color: isLiked ? COLORS.danger : COLORS.textSecondary, fontWeight: '500', fontSize: 14, marginLeft: 6 }}>
                    {stats.prayers} Prayers
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton} onPress={onCommentPress}>
                <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary, fontWeight: '500', fontSize: 14, marginLeft: 6 }}>
                    {stats.comments} Bình luận
                </Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="share" size={20} color={COLORS.textSecondary} />
                <Text style={{ color: COLORS.textSecondary, fontWeight: '500', fontSize: 14, marginLeft: 6 }}>
                    Chia sẻ
                </Text>
            </TouchableOpacity>
        </View>
    );
};

const FeedItemComponent = ({ item, onPress, onCommentPress, onMorePress }: { item: FeedPost; onPress: () => void; onCommentPress?: () => void; onMorePress?: () => void }) => {
    const displayCommentsCount = item.comment_count || (item as any).comments_count || 0;
    const { user: currentUser } = useAuth();
    const isHighlightedGuide = currentUser?.role === 'local_guide' && item.user_id === currentUser.id;

    const user = {
        name: item.author.full_name,
        avatar: item.author.avatar_url,
    };

    // Check if it's an image post
    if (item.image_urls && item.image_urls.length > 0) {
        return (
            <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
                <FeedCard>

                    <View style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}>
                        <FeedItemHeader user={user} time={item.created_at} location={item.status === 'check_in' ? 'Nhà thờ Đức Bà Sài Gòn' : undefined} isHighlightedGuide={isHighlightedGuide} onMorePress={onMorePress} />
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

    // Text Post
    return (
        <TouchableOpacity activeOpacity={0.8} onPress={onPress}>
            <FeedCard>
                <View style={styles.paddingContent}>
                    <FeedItemHeader user={user} time={item.created_at} location={item.status === 'check_in' ? 'Nhà thờ Đức Bà Sài Gòn' : undefined} isHighlightedGuide={isHighlightedGuide} onMorePress={onMorePress} />
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

// --- Main Screen ---

export default function CommunityScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { user } = useAuth();
    const isGuideViewer = user?.role === 'local_guide';
    const [reportPostId, setReportPostId] = useState<string | null>(null);

    // Format current date
    const today = new Date();
    const dateString = today.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).toUpperCase();
    const {
        data,
        isLoading,
        isError,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        refetch,
    } = usePosts(10);

    const posts = React.useMemo(() => {
        if (!data) return [];
        return data.pages.flatMap((page: any) => page.data?.items || page.items || page.posts || []);
    }, [data]);

    const renderItem = ({ item }: { item: FeedPost }) => {
        return (
            <FeedItemComponent
                item={item}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                onCommentPress={() => navigation.navigate('PostDetail', { postId: item.id, autoFocusComment: true } as any)}
                onMorePress={() => setReportPostId(item.id)}
            />
        );
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />


            <ImageBackground
                source={STAINED_GLASS_PATTERN}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                imageStyle={{ opacity: 0.03 }} // Very subtle on light bg
            >

                <LinearGradient
                    colors={[COLORS.backgroundSoft, 'rgba(255,255,255,0.95)', COLORS.backgroundSoft]}
                    style={StyleSheet.absoluteFillObject}
                />
            </ImageBackground>

            <View style={[styles.headerContainer, { paddingTop: insets.top }]}>
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.headerDate}>{dateString}</Text>
                        <Text style={styles.headerTitle}>
                            {t('community.greeting', { defaultValue: 'Cộng đồng\nCông giáo' })}
                        </Text>
                    </View>
                    <View style={styles.profileContainer}>
                        {user?.avatar ? (
                            <Image
                                source={{ uri: user.avatar }}
                                style={styles.profileImage}
                            />
                        ) : (
                            <View style={[styles.profileImage, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                                <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>
                                    {(() => {
                                        const name = user?.fullName || 'Pilgrim';
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

            {isLoading && !posts.length ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.primary} />
                </View>
            ) : isError ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: SPACING.lg }}>
                    <Text style={{ textAlign: 'center', color: COLORS.textSecondary, marginBottom: SPACING.md }}>
                        Đã có lỗi xảy ra khi tải bảng tin. Vui lòng thử lại.
                    </Text>
                    <TouchableOpacity
                        onPress={() => refetch()}
                        style={{ padding: SPACING.sm, backgroundColor: COLORS.primary, borderRadius: 8 }}
                    >
                        <Text style={{ color: COLORS.white, fontWeight: 'bold' }}>Thử lại</Text>
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
                                    name={user?.fullName || 'Pilgrim'}
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
                                <Text style={{ color: COLORS.textSecondary, textAlign: 'center' }}>
                                    Chưa có bài đăng nào. Hãy là người đầu tiên chia sẻ!
                                </Text>
                            </View>
                        ) : null
                    }
                />
            )}

            <ReportPostModal
                visible={!!reportPostId}
                onClose={() => setReportPostId(null)}
                targetId={reportPostId || ''}
                targetType="post"
            />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSoft,
    },
    // Header
    headerContainer: {
        backgroundColor: 'rgba(255,255,255,0.9)',
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
        fontSize: TYPOGRAPHY.fontSize.sm, // Slightly larger
        fontWeight: '800', // Bolder
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

    // List
    listContent: {
        paddingBottom: 100,
    },

    // Posts
    cardContainer: {
        backgroundColor: COLORS.backgroundCard,
    },
    paddingContent: {
        paddingHorizontal: SPACING.lg,
        paddingVertical: SPACING.md,
    },
    postDivider: {
        height: 8,
        backgroundColor: COLORS.backgroundSoft,
    },

    // Feed Item Header
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

    // Text Body
    textBody: {
        marginBottom: SPACING.md,
    },
    bodyText: {
        fontSize: TYPOGRAPHY.fontSize.md,
        color: COLORS.textPrimary,
        lineHeight: 24,
        fontFamily: 'serif',
    },

    // Actions
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


    // Image - Full width
    imageContainer: {
        height: 280,
        width: '100%',
    },
    feedImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },

    // FAB - Removed
});
