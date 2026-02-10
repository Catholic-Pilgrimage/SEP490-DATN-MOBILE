
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    FlatList,
    Image,
    ImageBackground,
    Platform,
    SafeAreaView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { SACRED_COLORS } from '../../../../constants/sacred-theme.constants';

// --- Constants & Types ---
const PRIMARY_GOLD = SACRED_COLORS.goldBright || '#f2b90d';
const BG_DARK = SACRED_COLORS.backgroundVariantDark || '#221e10';
const BG_LIGHT = SACRED_COLORS.backgroundVariantLight || '#f8f8f5';

const STAINED_GLASS_PATTERN = {
    uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAxrhiVQWx2be6uJ1xrGN4hrOCUzxkfSHMR9cY-0Rhvsmxq3dUZv72rXkE6aALqYJ_SyYq2b7EXCmgdin9z1u5YfXrQ4VOyNsBL1wjMkzIj0u2uvABqykyPMwnM2GF7VxfEaMbOhZPO_wESJVkyuN5tziBRX-eik_dKiqMIs5XmPvzq79GKdmgklm_GlWjY9erNgg8PcfbBz-ougrXWAVrtGGPdjXZtKHCHWgj7Hbm6Y4a0LzDmRA_ZwuKYbEpTo7ux9fZX7Q9pCYE',
};

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

const GoldBorderCard = ({ children, style }: { children: React.ReactNode; style?: any }) => {
    return (
        <View style={[styles.cardContainer, style]}>
            {/* Gradient Border */}
            <LinearGradient
                colors={['rgba(242, 185, 13, 0.6)', 'rgba(242, 185, 13, 0.1)', 'rgba(242, 185, 13, 0.6)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardBorderGradient}
            >
                {/* Inner Content Background */}
                <View style={styles.cardInner}>
                    {children}
                </View>
            </LinearGradient>
        </View>
    );
};

const FeedItemHeader = ({ user, location }: { user: FeedItem['user']; location?: string }) => (
    <View style={styles.headerRow}>
        <View style={styles.userInfo}>
            <Image source={{ uri: user.avatar }} style={styles.avatar} />
            <View>
                <Text style={styles.userName}>{user.name}</Text>
                <Text style={styles.timeText}>{user.time}</Text>
            </View>
        </View>
        {location && (
            <View style={styles.locationBadge}>
                <MaterialIcons name="place" size={14} color={PRIMARY_GOLD} />
                <Text style={styles.locationText}>{location}</Text>
            </View>
        )}
    </View>
);

const FeedItemActions = ({ stats }: { stats: FeedItem['stats'] }) => (
    <View style={styles.actionsRow}>
        <TouchableOpacity style={styles.actionButton}>
            <MaterialIcons name="favorite-border" size={20} color={`${PRIMARY_GOLD}CC`} />
            <Text style={styles.actionText}>{stats.prayers} Prayers</Text>
        </TouchableOpacity>
        <View style={styles.rightActions}>
            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="chat-bubble-outline" size={20} color="white" />
                <Text style={styles.actionStatsText}>{stats.comments}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton}>
                <MaterialIcons name="ios-share" size={20} color="white" />
            </TouchableOpacity>
        </View>
    </View>
);

const TextFeedItem = ({ item }: { item: FeedItem }) => (
    <GoldBorderCard style={styles.cardMargin}>
        <View style={styles.paddingContent}>
            <FeedItemHeader user={item.user} location={item.location} />
            <View style={styles.textBody}>
                <Text style={styles.bodyText}>{item.content.text}</Text>
            </View>
            <View style={styles.divider} />
            <FeedItemActions stats={item.stats} />
        </View>
    </GoldBorderCard>
);

const ImageFeedItem = ({ item }: { item: FeedItem }) => (
    <GoldBorderCard style={[styles.cardMargin, styles.overflowHidden]}>
        {/* Image Section */}
        <View style={styles.imageContainer}>
            <Image source={{ uri: item.content.image }} style={styles.feedImage} />
            <LinearGradient
                colors={['transparent', 'rgba(34, 30, 16, 0.6)', '#221e10']}
                style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.imageOverlayHeader}>
                <View style={styles.overlayHeaderRow}>
                    <View style={styles.overlayUserInfo}>
                        <Image source={{ uri: item.user.avatar }} style={styles.overlayAvatar} />
                        <View style={styles.overlayUserTextBg}>
                            <Text style={styles.overlayUserName}>{item.user.name}</Text>
                            <Text style={styles.overlayTimeText}>{item.user.time}</Text>
                        </View>
                    </View>
                    {item.location && (
                        <View style={styles.overlayLocationBadge}>
                            <MaterialIcons name="church" size={14} color={PRIMARY_GOLD} />
                            <Text style={styles.overlayLocationText}>{item.location}</Text>
                        </View>
                    )}
                </View>
            </View>
        </View>

        {/* Content Section */}
        <View style={[styles.paddingContent, { paddingTop: 12 }]}>
            {item.content.quote && (
                <Text style={styles.quoteText}>{item.content.quote}</Text>
            )}
            <Text style={styles.bodyTextLight}>{item.content.text}</Text>
            <View style={styles.divider} />
            <FeedItemActions stats={item.stats} />
        </View>
    </GoldBorderCard>
);

// --- Main Screen ---

export default function SpiritualScreen() {
    const insets = useSafeAreaInsets();

    const renderItem = ({ item }: { item: FeedItem }) => {
        if (item.type === 'image') return <ImageFeedItem item={item} />;
        return <TextFeedItem item={item} />;
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" />

            {/* Background with Stained Glass Pattern */}
            <ImageBackground
                source={STAINED_GLASS_PATTERN}
                style={StyleSheet.absoluteFillObject}
                resizeMode="cover"
            >
                <View style={styles.overlayDark} />
                {/* Radial Gradient Logic Mock using another View/Image or just darkened overlay */}
                <LinearGradient
                    colors={['rgba(34, 30, 16, 0.85)', 'rgba(34, 30, 16, 0.95)']}
                    style={StyleSheet.absoluteFillObject}
                />
            </ImageBackground>

            <SafeAreaView style={styles.safeArea}>
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.headerDate}>SEPTEMBER 24, 2023</Text>
                        <Text style={styles.headerTitle}>Peace be with you, Maria</Text>
                    </View>
                    <View style={styles.profileContainer}>
                        <View style={styles.profileGlow} />
                        <Image
                            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAJ4rNfhZInF5ZxsB5RphBy2_tnsi0da8Sf0o9Ntb5-G2ORlgpIOjWTKv7cq7ymiqe3kSzGqc4cLCM8mBWNnxLqb5gxm1nXCocedeJ1PnPawB0acLOH_sIK82-rzvTc974Wk0PHA7VYrmqi0n5u42rH57KzhCHILeLz-NiNWlEE84n3sj80i2-fuLxBpMG6EtoZwpdWublsJIDR3vjPe9lfwrAhV7s64-Ano90Iz6vqh4MQUifYBd8VzF8rWZHBXNFOdrsFKdyAESc' }}
                            style={styles.profileImage}
                        />
                    </View>
                </View>

                {/* Feed List */}
                <FlatList
                    data={DEMO_DATA}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={[styles.listContent, { paddingBottom: 100 }]}
                    showsVerticalScrollIndicator={false}
                />

                {/* Floating Action Button */}
                <TouchableOpacity style={[styles.fab, { bottom: 24 }]}>
                    <MaterialIcons name="edit" size={24} color={BG_DARK} />
                </TouchableOpacity>
            </SafeAreaView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: BG_DARK,
    },
    safeArea: {
        flex: 1,
    },
    overlayDark: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: BG_DARK,
        opacity: 0.1, // Base opacity before gradient
    },

    // Header
    header: {
        paddingHorizontal: 24,
        paddingVertical: 16,
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(242, 185, 13, 0.2)',
        backgroundColor: 'rgba(34, 30, 16, 0.8)',
    },
    headerDate: {
        color: PRIMARY_GOLD,
        fontSize: 12,
        fontWeight: '600',
        letterSpacing: 1,
        textTransform: 'uppercase',
        opacity: 0.8,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'serif',
    },
    headerTitle: {
        color: 'white',
        fontSize: 22,
        fontStyle: 'italic',
        fontWeight: '500',
        marginTop: 4,
        fontFamily: 'serif', // Trying to match Newsreader style
    },
    profileContainer: {
        position: 'relative',
        width: 40,
        height: 40,
        justifyContent: 'center',
        alignItems: 'center',
    },
    profileGlow: {
        position: 'absolute',
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: PRIMARY_GOLD,
        opacity: 0.3,
    },
    profileImage: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(242, 185, 13, 0.4)',
    },

    // List
    listContent: {
        padding: 16,
        gap: 24,
    },

    // Cards
    cardContainer: {
        borderRadius: 16,
        marginBottom: 0,
        // Shadow
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    cardBorderGradient: {
        padding: 1, // Border width
        borderRadius: 16,
    },
    cardInner: {
        backgroundColor: '#2a2618', // Inner card bg from CSS
        borderRadius: 15, // slightly less than container
        overflow: 'hidden',
    },
    paddingContent: {
        padding: 20,
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
        marginBottom: 16,
    },
    userInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    avatar: {
        width: 40,
        height: 40,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(242, 185, 13, 0.2)',
    },
    userName: {
        color: 'white',
        fontSize: 16,
        fontWeight: '500',
        fontFamily: 'serif',
    },
    timeText: {
        color: PRIMARY_GOLD,
        fontSize: 12,
        opacity: 0.6,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(242, 185, 13, 0.1)',
        borderWidth: 1,
        borderColor: 'rgba(242, 185, 13, 0.3)',
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 4,
    },
    locationText: {
        color: PRIMARY_GOLD,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },

    // Text Body
    textBody: {
        marginBottom: 20,
    },
    bodyText: {
        fontSize: 16,
        color: '#E5E5E5', // gray-200
        lineHeight: 24,
        fontWeight: '300',
        fontFamily: 'serif',
    },
    bodyTextLight: {
        fontSize: 14,
        color: '#D1D5DB', // gray-300
        lineHeight: 22,
        fontWeight: '300',
        fontFamily: 'serif',
        marginBottom: 20,
    },
    quoteText: {
        fontSize: 18,
        fontStyle: 'italic',
        color: 'rgba(242, 185, 13, 0.9)',
        marginBottom: 12,
        fontFamily: 'serif',
        fontWeight: '500',
    },

    // Divider
    divider: {
        height: 1,
        width: '100%',
        backgroundColor: 'rgba(242, 185, 13, 0.1)', // via-primary/20 logic roughly
        marginBottom: 16,
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
    },
    rightActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    actionText: {
        color: PRIMARY_GOLD,
        fontSize: 13,
        fontWeight: '500',
        opacity: 0.9,
    },
    actionStatsText: {
        color: 'white',
        fontSize: 13,
        fontWeight: '400',
    },

    // Image Card Specifics
    imageContainer: {
        height: 200,
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
        borderColor: 'rgba(242, 185, 13, 0.4)',
    },
    overlayUserTextBg: {
        backgroundColor: 'rgba(0,0,0,0.4)',
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 8,

    },
    overlayUserName: {
        color: 'white',
        fontWeight: '500',
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
        borderColor: 'rgba(242, 185, 13, 0.4)',
        borderWidth: 1,
        borderRadius: 100,
        paddingHorizontal: 8,
        paddingVertical: 4,
        gap: 6,
    },
    overlayLocationText: {
        color: PRIMARY_GOLD,
        fontSize: 10,
        fontWeight: '700',
        textTransform: 'uppercase',
    },

    // FAB
    fab: {
        position: 'absolute',
        right: 24,
        backgroundColor: PRIMARY_GOLD,
        width: 56,
        height: 56,
        borderRadius: 28,
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: PRIMARY_GOLD,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 8,
    },
});
