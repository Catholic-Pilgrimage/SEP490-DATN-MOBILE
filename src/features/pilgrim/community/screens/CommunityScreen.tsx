
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    FlatList,
    Image,
    ImageBackground,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING, TYPOGRAPHY } from '../../../../constants/theme.constants';
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
        </View>
    );
};

const FeedItemHeader = ({ user, location }: { user: FeedItem['user']; location?: string }) => (
    <View style={styles.headerRow}>
        <View style={styles.userInfo}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <View>
                <Text style={styles.userName}>{user.name}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                    <Text style={styles.timeText}>{user.time}</Text>
                    {location && (
                        <>
                            <Text style={{ color: COLORS.textTertiary, fontSize: 10 }}>•</Text>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
                                <MaterialIcons name="place" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.locationText}>{location}</Text>
                            </View>
                        </>
                    )}
                </View>
            </View>
        </View>
    </View>
);

const FeedItemActions = ({ stats }: { stats: FeedItem['stats'] }) => (
    <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton}>
            <View style={styles.prayerButtonContent}>
                {/* Using heart for now, user requested "Prayers" label and interaction feeling */}
                <MaterialIcons name="favorite-border" size={22} color={COLORS.danger} />
                <Text style={[styles.actionText, { color: COLORS.danger, fontWeight: '600' }]}>
                    {stats.prayers} Prayers
                </Text>
            </View>
        </TouchableOpacity>
        <View style={styles.rightActions}>
            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.textTertiary} />
                <Text style={styles.actionStatsText}>{stats.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="share" size={20} color={COLORS.textTertiary} />
            </TouchableOpacity>
        </View>
    </View>
);

const TextFeedItem = ({ item }: { item: FeedItem }) => (
    <FeedCard style={styles.cardMargin}>
        <View style={styles.paddingContent}>
            <FeedItemHeader user={item.user} location={item.location} />
            <View style={styles.textBody}>
                <Text style={styles.bodyText}>{item.content.text}</Text>
            </View>
            <View style={styles.divider} />
            <FeedItemActions stats={item.stats} />
        </View>
    </FeedCard>
);

const ImageFeedItem = ({ item }: { item: FeedItem }) => (
    <FeedCard style={[styles.cardMargin, styles.overflowHidden]}>
        {/* Standard User Header (Consistent with Text Posts) */}
        <View style={{ paddingHorizontal: SPACING.lg, paddingTop: SPACING.md, paddingBottom: SPACING.sm }}>
            <FeedItemHeader user={item.user} location={item.location} />
        </View>

        {/* Image Section */}
        <View style={styles.imageContainer}>
            <Image source={{ uri: item.content.image }} style={styles.feedImage} />
        </View>

        {/* Content Section */}
        <View style={[styles.paddingContent, { paddingTop: 12 }]}>
            {item.content.quote && (
                <Text style={styles.quoteText}>{item.content.quote}</Text>
            )}
            <Text style={styles.bodyText}>{item.content.text}</Text>
            <View style={styles.divider} />
            <FeedItemActions stats={item.stats} />
        </View>
    </FeedCard>
);

import { useTranslation } from 'react-i18next';
import { useAuth } from '../../../../contexts/AuthContext';

// ... (keep existing imports)

// --- Main Screen ---

export default function CommunityScreen() {
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

    const renderItem = ({ item }: { item: FeedItem }) => {
        if (item.type === 'image') return <ImageFeedItem item={item} />;
        return <TextFeedItem item={item} />;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Background Pattern - Light Mode */}
            <ImageBackground
                source={STAINED_GLASS_PATTERN}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
                imageStyle={{ opacity: 0.03 }} // Very subtle on light bg
            >
                {/* Soft gradient overlay */}
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

            <FlatList
                data={DEMO_DATA}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={[
                    styles.listContent,
                    { paddingBottom: 100, paddingTop: 10 }
                ]}
                ListHeaderComponent={
                    <View style={{ marginBottom: SPACING.lg }}>
                        <CreatePostBar
                            avatar={user?.avatar}
                            name={user?.fullName || 'Pilgrim'}
                            onPress={() => {
                                // Navigate to Create Post Screen
                            }}
                        />
                    </View>
                }
                showsVerticalScrollIndicator={false}
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
        padding: SPACING.lg,
        gap: SPACING.lg,
    },

    // Cards
    cardContainer: {
        backgroundColor: COLORS.backgroundCard,
        borderRadius: BORDER_RADIUS.lg,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: COLORS.border,
    },
    paddingContent: {
        padding: SPACING.lg,
    },
    cardMargin: {
        // handled by list gap
    },
    overflowHidden: {
        overflow: 'hidden',
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

    // Divider
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: COLORS.divider,
        marginBottom: SPACING.md,
    },

    // Actions
    actionsRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingVertical: 4, // Hit area
    },
    prayerButtonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: 'rgba(220, 76, 76, 0.08)', // Light red bg
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
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


    // Image Card Specifics
    imageContainer: {
        height: 220,
        width: '100%',
        position: 'relative',
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
