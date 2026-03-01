import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useInfiniteQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
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
import { postKeys, useLikePost, usePosts } from '../../../../hooks/usePosts';
import { FeedPost } from '../../../../types';
import { CreatePostBar } from '../components/CreatePostBar';

// --- Constants & Types ---
// Using app-wide theme COLORS instead of custom SACRED_COLORS
// Colors are now synchronized with Profile and Planner screens (Light Theme)

const STAINED_GLASS_PATTERN = {
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxrhiVQWx2be6uJ1xrGN4hrOCUzxkfSHMR9cY-0Rhvsmxq3dUZv72rXkE6aALqYJ_SyYq2b7EXCmgdin9z1u5YfXrQ4VOyNsBL1wjMkzIj0u2uvABqykyPMwnM2GF7VxfEaMbOhZPO_wESJVkyuN5tziBRX-eik_dKiqMIs5XmPvzq79GKdmgklm_GlWjY9erNgg8PcfbBz-ougrXWAVrtGGPdjXZtKHCHWgj7Hbm6Y4a0LzDmRA_ZwuKYbEpTo7ux9fZX7Q9pCYE',
};

// Filter Types
const FILTER_CHIPS = [
    { id: 'all', label: '#Tất cả' },
    { id: 'prayers', label: '#LờiCầuNguyện' },
    { id: 'journey', label: '#ChiaSẻHànhTrình' },
    { id: 'questions', label: '#HỏiĐáp' },
    { id: 'inspiration', label: '#CảmHứng' },
];

interface FeedItem {
    id: string;
    type: 'text' | 'image' | 'short_text';
    user: {
        name: string;
        avatar: string;
        time: string;
    };
    location?: string;
    content: {
        text?: string;
        image?: string;
        quote?: string;
    };
    stats: {
        prayers: number;
        comments: number;
    };
}

const DEMO_DATA: FeedItem[] = [
    {
        id: '1',
        type: 'text',
        user: {
            name: 'Father John',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBhPBshT02ka0IOFsBQM31RuOoobPWOSJ4AL9DdJ1yGazW1JAeqJf5PZr4DFjFV-w-XcRAbeOJMDppRvL9JDPNHb6JaHWZB0e0IIxCdijd_Gryre4iFczQs4VsuLpAHAmF_5gSBqrz9kcyqXYiTwAaqIh33DNBBk5ylyY6Aq3tse79a1hjhznXAK5gSfrJEcbyNE5YNqk48h8l4i26TRjtIxLiJPRdbuV_whKca8ar8UqKvraT18jFspHBS6AemhdE3wRF2ks2we1Y',
            time: '2 hours ago',
        },
        location: 'Santiago de Compostela',
        content: {
            text: '"The walk today was arduous, but the silence spoke louder than words. In the quiet rhythm of my steps, I found a prayer I hadn\'t known I needed to speak."',
        },
        stats: { prayers: 24, comments: 5 },
    },
    {
        id: '2',
        type: 'image',
        user: {
            name: 'Elena R.',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBdCbzQM_tth_3LAjHMOpAUiwNC_g2jyAhTbBciTpsMjgmWdeUBmeLYyQYkIcwq31K2QxR5KC0V4HIwNBiJQdvTu2iXtWP81bSeq8s3aFYM0-cYywvKy_FMc9FI8w6S1ib7eq4fuUSMIHRQrcGL0pmSh-J9CkVe0KKHzubmOZuJN1GqZE5z15iEkOvPkcNOfgzUJS7N1_zFHsDB9qdcjd6okS8Rzcr8ofzujBTpCBsdE5vAAJPSRH9PLzhXj1N_1janZ2Jz1_qLdkg',
            time: 'Yesterday',
        },
        location: 'Basilica of Guadalupe',
        content: {
            image: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCcmXbxaLt3IdniWZ1Wyzj498V-PdOdKuiVUt79eGPMKgYZVX_q83RBc3DTxS7BlXSHOMSP7tD2hSQrwGtNe2UzFn9SYDuTU-guHwM9zOWuTaTrxozOQu1WnlAesX7HKOpH4QDm14SoJJui9MEqsmeAsocge5Neq5DHwEce0aJXWvqFkspyI-m4SUeO9neGPpdxH-BtI7e0cqtxdcHTBjKgvdMpJ9CCwcahEx2Qf7OVRICjKIFb5mwO5YT3OrzySP_InKBkA-kWByg',
            quote: '"A light in the darkness..."',
            text: 'I felt a profound sense of grace lighting a candle here today. The heavy scent of wax and roses... it felt like home.',
        },
        stats: { prayers: 156, comments: 32 },
    },
    {
        id: '3',
        type: 'short_text',
        user: {
            name: 'Markus T.',
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCBd_sUzZAC2XsUZTrzvkQB2W0TZylLuQ7YxzMcjja2bHHqBpcX36iLjmMP4Z2s0qFKe2eJXxlokwvi7KZDrk4u1yyFqOHaJaExe30rIyszaUQSPRlPkHCc5-avAwYLT0rnnyitAww7JlHt59EPpUQKEqHgcDvCYtl_jwMpVwyBCqX74hDd1qnB8zxyoj9TTl88TtgaDn92YA0eHTDIi9fQFPzOOMnN7osYBx3CGBkOT650g7sg7OHx1xvBGLKLgbXwVgyHQkBO5M4',
            time: '3 days ago',
        },
        location: 'Vatican City',
        content: {
            text: 'Arrived just in time for the Angelus. The square was packed, yet my heart felt singular focus.',
        },
        stats: { prayers: 89, comments: 12 },
    },
];

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

const FeedItemHeader = ({ user, time, location }: { user: { name: string; avatar?: string }; time: string; location?: string }) => (
    <View style={styles.headerRow}>
        <View style={styles.userInfo}>
            {user.avatar ? (
                <Image source={{ uri: user.avatar }} style={styles.avatar} />
            ) : (
                <View style={[styles.avatar, { backgroundColor: COLORS.primary, justifyContent: 'center', alignItems: 'center' }]}>
                    <Text style={{ fontSize: 16, fontWeight: 'bold', color: COLORS.white }}>
                        {user.name.charAt(0).toUpperCase()}
                    </Text>
                </View>
            )}
            <View>
                <Text style={styles.userName}>{user.name}</Text>
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
        <TouchableOpacity style={{ padding: 4 }}>
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

const FeedItemComponent = ({ item, onPress, onCommentPress, isFirstItem }: { item: FeedPost; onPress: () => void; onCommentPress?: () => void; isFirstItem?: boolean }) => {
    // DEVELOPMENT LOG: To see exact API structure and find comment count
    if (isFirstItem && __DEV__) {
        console.log('\n--- 🔍 CHI TIẾT DỮ LIỆU TỪ API (BÀI VIẾT ĐẦU TIÊN) ---', JSON.stringify({
            id: item.id,
            keys_có_trong_item: Object.keys(item),
            nội_dung: item.content,
            giá_trị_comment: {
                comment_count: (item as any).comment_count,
                comments_count: (item as any).comments_count,
                numberOfComments: (item as any).numberOfComments,
                total_comments: (item as any).total_comments,
                totalComments: (item as any).totalComments,
                stats: (item as any).stats
            }
        }, null, 2));
    }

    const queryClient = useQueryClient();

    // Chuyên nghiệp: Dùng useInfiniteQuery với enabled: false để SUBSCRIBE (lắng nghe) 
    // sự thay đổi của bộ nhớ đệm (cache) bình luận mà không tốn 1 Request Network nào.
    // Khi PostDetail cập nhật cache hoặc mutate, component này sẽ tự động re-render!
    const { data: commentsData } = useInfiniteQuery({
        queryKey: postKeys.comments(item.id),
        initialPageParam: 1,
        queryFn: () => Promise.resolve({ data: { items: [] } } as any), // Dummy config
        getNextPageParam: () => undefined,
        enabled: false, // Tuyệt đối không gọi API
    });

    const cachedCommentCount = commentsData?.pages
        ? commentsData.pages.flatMap((p: any) => p.data?.items || p.items || p.comments || []).length
        : 0;

    const displayCommentsCount = Math.max(
        cachedCommentCount,
        (item as any).comment_count || (item as any).comments_count || 0
    );

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
                        <FeedItemHeader user={user} time={item.created_at} location={item.status === 'check_in' ? 'Nhà thờ Đức Bà Sài Gòn' : undefined} />
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
                    <FeedItemHeader user={user} time={item.created_at} location={item.status === 'check_in' ? 'Nhà thờ Đức Bà Sài Gòn' : undefined} />
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



import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';

// ... (keep existing imports)

// --- Main Screen ---

export default function CommunityScreen() {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { t } = useTranslation();
    const { user } = useAuth();

    // Format current date
    const today = new Date();
    const dateString = today.toLocaleDateString('vi-VN', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).toUpperCase();

    const [activeFilter, setActiveFilter] = React.useState('all');

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

    const renderItem = ({ item, index }: { item: FeedPost, index: number }) => {
        return (
            <FeedItemComponent
                item={item}
                isFirstItem={index === 0}
                onPress={() => navigation.navigate('PostDetail', { postId: item.id })}
                onCommentPress={() => navigation.navigate('PostDetail', { postId: item.id, autoFocusComment: true } as any)}
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
                        <View style={{ paddingHorizontal: SPACING.lg, paddingVertical: SPACING.md }}>
                            <CreatePostBar
                                avatar={user?.avatar}
                                name={user?.fullName || 'Pilgrim'}
                                onPress={() => {
                                    navigation.navigate('CreatePost');
                                }}
                            />
                        </View>
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

    // Filters
    filterContainer: {
        paddingVertical: 4,
        gap: 8,
    },
    filterChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        backgroundColor: COLORS.white,
        borderWidth: 1,
        borderColor: COLORS.borderLight,
        ...SHADOWS.subtle,
    },
    filterChipActive: {
        backgroundColor: COLORS.accent,
        borderColor: COLORS.accent,
    },
    filterChipText: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
    },
    filterChipTextActive: {
        color: COLORS.white,
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
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    userName: {
        color: COLORS.textPrimary,
        fontSize: TYPOGRAPHY.fontSize.md,
        fontWeight: '600',
        fontFamily: 'serif',
    },
    timeText: {
        color: COLORS.textTertiary,
        fontSize: TYPOGRAPHY.fontSize.xs,
    },
    // Location style modernized (inline)
    locationText: {
        color: COLORS.textSecondary,
        fontSize: TYPOGRAPHY.fontSize.xs,
        fontWeight: '500',
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
    quoteText: {
        fontSize: TYPOGRAPHY.fontSize.lg,
        fontStyle: 'italic',
        color: COLORS.accent,
        marginBottom: SPACING.sm,
        fontFamily: 'serif',
        fontWeight: '500',
    },

    // Divider (kept for backward compat but not used in main feed)
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: COLORS.divider,
        marginVertical: SPACING.sm,
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
    actionText: {
        color: COLORS.textSecondary,
        fontSize: 13,
        fontWeight: '500',
    },
    actionStatsText: {
        color: COLORS.textTertiary,
        fontSize: 13,
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
    imageOverlayHeader: {
        position: 'absolute',
        top: 16,
        left: 16,
        right: 16,
    },
    overlayHeaderRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
    },
    overlayUserInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    overlayAvatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 2,
        borderColor: COLORS.white,
    },
    overlayUserTextBg: {
        backgroundColor: 'rgba(0,0,0,0.6)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,
    },
    overlayUserName: {
        color: COLORS.white,
        fontWeight: '600',
        fontSize: 14,
        fontFamily: 'serif',
    },
    overlayTimeText: {
        color: 'rgba(255,255,255,0.8)',
        fontSize: 10,
    },
    overlayLocationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.6)',
        borderColor: 'rgba(255,255,255,0.4)',
        borderWidth: 1,
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 6,
    },
    overlayLocationText: {
        color: COLORS.white,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },


    // FAB - Removed
});
