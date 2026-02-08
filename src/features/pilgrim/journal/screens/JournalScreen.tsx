import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import {
    Dimensions,
    FlatList,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';

const { width } = Dimensions.get('window');

// Mock Data from user request
const JOURNAL_ENTRIES = [
    {
        id: '1',
        title: 'Prayer at Notre Dame Cathedral',
        content:
            "Today I felt a profound sense of peace standing before the altar. The light filtering through the stained glass reminded me of God's grace touching our lives in colorful, unexpected ways.",
        location: 'Vương cung thánh đường, TP.HCM',
        date: 'Just now',
        type: 'public',
        images: [
            'https://lh3.googleusercontent.com/aida-public/AB6AXuDl9BXuzMcrYYLlSby2hQlA1Txg2aAAOVwnUDtPpwEOpB6bjITNyvRTWiG_VgmvMKdou9jvyKEf46BSducxw2F2xk4x8-MqZBFkRxpNspF80W9S2fUSt1J0E5jQU2cFLIG0426iW5TKnO2SelOxF0jmxueZ5LwT2jZhFMRvdV5tdaO8MZrItZ9Y00NOAaTWdDoO5oc-eTWTJ5mH-GxArA5ZimyOyhaP10qq24hbL8p_MvYVwZ_gjlx7eBNb2Hu0dKOSFt6R_8pUXRg',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuB2A-RUrIoccHey0psvfKDfJIabxJFG7n9bD2BWhUHKjCcKODzSqnycroybrThr_q7Or-cQ-raMq4cG6-3WRBWWyPYISDqWi66boslDZGgsx8UQm9fbD_tqeAj89qcPRO6Eja94gx_y5MaSzWFHT3RTK7D394VRVznFCW8PTJSfd-D5ROPK2RrCR9_3S4d-MzaWbR45FGm1N0ViTcJ-KBk3mpu8NoZ-RQIKQmKIWh3Iqx5JQnEi5u4s_fMStqV15qtHEGzSt86iHbw',
            'https://lh3.googleusercontent.com/aida-public/AB6AXuBNBOnBUMM4cspuLSV1Wy2iEG3GvJuf6UzdfqSZp-LI996kOcX2XBW61U_QCDX51LotmWgBifZeZHRFJsM4Jmhu7Fg5cA9DPJfYEsO-A5IK5cgz4SD6GbL-r3QuYmn4d2NbdxED97c_pLvhv6m6PGWuAshReCMvUv5B1P5Su7oZAvGXWWVwu6BDvpyQi7Nuc5SZzdnLBReWMhMskIOKAcPsOmgzdKfvHlgm5ydFyVTfXqRvZmzPbSSfATlACV-gD_dVEL0jpoWW1BI',
        ],
        likes: 24,
        comments: 5,
        user: {
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBwmrXE68W9FYl0dHKb0V60lfiQduW3LZSVfanHQDabvJ7zo8CFjjD6zKQX9xKS80CSFyZafR0fp6L3rmH8rEum21AEVW8DdIiXXQopto2PgR25aLaVjxBQzErSOvXE4Yg7xDrtYAqwtyP9lUE70ukHEgjx7-4xdkI7TBOeCR8Lq-_kW0oKcJzhZU3jxDavhLWDDgC5EJxbhDB5wNcVTcjdFYtkf6FhW5Y5zGzeirBeeSViKXBQfOvtoRW6YW6KNYLzAYFI4-wC-84',
        },
    },
    {
        id: '2',
        title: 'Asking for guidance on my new path',
        content:
            'I came here with a heavy heart, unsure of the decisions I need to make regarding my career and family. The silence of the shrine offered a momentary clarity...',
        quote: 'Be still, and know that I am God.',
        location: 'La Vang Holy Shrine, Quảng Trị',
        date: '2 days ago',
        type: 'private',
        user: {
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBWUM4JcHs8uTf1VmQjS20uS9QHCWjKHM4huTDLktQ32zDX3JTlQUh8eyDt16azwLsWrR3NiumCtoqJO9uZrr_HW4jXijtHJ7zJjIZqrLHqI6Mq7qxTrbT9SDlI0NZg2YJpDIBkydLiCI4P948a5F7NtRnG3XivIpb6W5D9qkeW5atGB17dV2cstoxDM8O7zI_HyCycZdZ9AFY3jusXJn0t1eBwA0mIpVdlTRzUlR5gOTvFjNTJgRKLnUTjoclXxE0hOpjwvo1daFU',
        },
    },
    {
        id: '3',
        title: 'Evening Mass',
        content: 'A beautiful ceremony to end the week. The choir was angelic.',
        location: "St. Joseph's Cathedral, Hanoi",
        date: 'Oct 24, 2023',
        type: 'public',
        user: {
            avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuD-5tD2NtN10xKIDBrH7YxafM_-Q3LKTnv0_KRzo2kTc2ymFGKE5cr7-INI7Bk-nYy5tyiitFNNMYsz9KD5XANfrdh0dHCF4NUpADl6bla-gUaQAvNd3pc_g9g6Y5qBJTUmYbTpISF-l_HR8JrpwBJR8OrT5xOEHm04mU3MvccrOq9TXSEC47Xsint3Tg-f9pbS2X0o7o_1E-n7tFeI1ZwvrNt-oUkDjI-POOkyjnQnTgnnaXO1Jyfk4y1195qjJfcbr1AUluZQB6k',
        },
    },
];

const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

export const JournalScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();

    const renderItem = ({ item }: { item: any }) => {
        const isPrivate = item.type === 'private';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('JournalDetailScreen', { entryId: item.id })}
                style={[styles.card, isPrivate && styles.cardPrivate]}
            >
                {isPrivate && (
                    <View style={styles.privateDecor}>
                        <MaterialIcons name="lock" size={180} color="rgba(0,0,0,0.02)" />
                    </View>
                )}

                {/* Header: Avatar & Location */}
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        <Image source={{ uri: item.user.avatar }} style={styles.avatar} />
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.locationRow}>
                            <MaterialIcons name="location-on" size={14} color={COLORS.accent} />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {item.location}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>{item.date}</Text>
                    </View>
                    <View
                        style={[
                            styles.badge,
                            isPrivate ? styles.badgePrivate : styles.badgePublic,
                        ]}
                    >
                        <MaterialIcons
                            name={isPrivate ? 'lock' : 'public'}
                            size={12}
                            color={isPrivate ? COLORS.textSecondary : COLORS.accentDark}
                        />
                        <Text
                            style={[
                                styles.badgeText,
                                isPrivate ? styles.badgeTextPrivate : styles.badgeTextPublic,
                            ]}
                        >
                            {isPrivate ? 'Private' : 'Public'}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Text style={styles.cardTitle}>{item.title}</Text>
                    <Text style={styles.cardBody} numberOfLines={3}>
                        {item.content}
                    </Text>

                    {item.quote && (
                        <View style={styles.quoteContainer}>
                            <MaterialIcons name="format-quote" size={32} color={COLORS.textTertiary} />
                            <Text style={styles.quoteText}>"{item.quote}"</Text>
                        </View>
                    )}
                </View>

                {/* Images Grid */}
                {item.images && item.images.length > 0 && (
                    <View style={styles.imageGrid}>
                        <View style={styles.mainImageContainer}>
                            <Image source={{ uri: item.images[0] }} style={styles.mainImage} />
                        </View>
                        {item.images.length > 1 && (
                            <View style={styles.sideImagesContainer}>
                                {item.images.slice(1).map((img: string, idx: number) => (
                                    <View key={idx} style={styles.sideImageWrapper}>
                                        <Image source={{ uri: img }} style={styles.sideImage} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Footer Actions (Public Only or if desired) */}
                {!isPrivate && (
                    <View style={styles.cardFooter}>
                        <View style={styles.socialActions}>
                            <TouchableOpacity style={styles.actionButton}>
                                <MaterialIcons name="favorite-border" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.actionText}>{item.likes || 0}</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={styles.actionButton}>
                                <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.textSecondary} />
                                <Text style={styles.actionText}>{item.comments || 0}</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity onPress={() => navigation.navigate('JournalDetailScreen', { entryId: item.id })}>
                            <Text style={styles.readMoreText}>Read More</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </TouchableOpacity>
        );
    };

    return (
        <View style={styles.container}>
            {/* Background Pattern */}
            <View style={styles.bgPattern} pointerEvents="none">
                {/* Could use an ImageBackground here for the pattern if assets existed */}
            </View>

            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View style={styles.headerTitleContainer}>
                    {/* Background Icon Decoration - Aligned with Planner */}
                    <View style={styles.headerWatermark}>
                        <MaterialIcons name="church" size={160} color={COLORS.textTertiary} style={{ opacity: 0.1 }} />
                    </View>

                    {/* Tagline - New addition to match Planner */}
                    <Text style={styles.headerTagline}>HÀNH TRÌNH ĐỨC TIN</Text>

                    {/* Main Title */}
                    <Text style={styles.headerTitle}>Nhật ký Tâm linh</Text>

                    {/* Yellow Line Decoration */}
                    <View style={styles.headerDecoration} />
                </View>
            </View>

            <FlatList
                data={JOURNAL_ENTRIES}
                renderItem={renderItem}
                keyExtractor={(item) => item.id}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
                ListFooterComponent={<View style={{ height: 100 }} />}
            />

            {/* FAB */}
            <TouchableOpacity
                style={styles.fab}
                activeOpacity={0.9}
                onPress={() => navigation.navigate('CreateJournalScreen')}
            >
                <LinearGradient
                    colors={[COLORS.accent, COLORS.accentDark]}
                    style={styles.fabGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                >
                    <MaterialIcons name="edit" size={24} color={COLORS.white} />
                    {/* Text removed for cleaner look or keep if user prefers Extended FAB. Keeping text for now as it aids usability */}
                    <Text style={styles.fabText}>Viết nhật ký</Text>
                </LinearGradient>
            </TouchableOpacity>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.backgroundSoft, // Use soft background like Planner
    },
    bgPattern: {
        ...StyleSheet.absoluteFillObject,
        opacity: 0.5,
    },
    header: {
        paddingHorizontal: SPACING.lg, // Increased padding
        paddingBottom: SPACING.md,
        backgroundColor: 'transparent',
        zIndex: 10,
        marginBottom: 10,
    },
    headerTitleContainer: {
        position: 'relative',
        paddingVertical: SPACING.xs,
    },
    headerWatermark: {
        position: 'absolute',
        right: -30,
        top: -40,
        transform: [{ rotate: '-15deg' }], // Matching Planner style
        zIndex: -1,
    },
    headerTagline: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.accent,
        letterSpacing: 2,
        textTransform: 'uppercase',
        marginBottom: 8,
    },
    headerTitle: {
        fontFamily: FontDisplay,
        fontSize: 42, // Matched Planner size
        fontWeight: '700',
        color: COLORS.textPrimary,
        lineHeight: 48,
        letterSpacing: -0.5,
    },
    headerDecoration: {
        width: 60,
        height: 4,
        backgroundColor: COLORS.accent,
        borderRadius: 2,
        marginTop: 16,
    },
    listContent: {
        paddingHorizontal: SPACING.lg, // Aligned with header
        paddingBottom: 100,
        gap: SPACING.lg,
    },
    card: {
        backgroundColor: COLORS.surface0,
        borderRadius: BORDER_RADIUS.xl, // Increased radius
        padding: 24, // More breathing room
        ...SHADOWS.medium, // Deeper shadow
        shadowColor: 'rgba(26, 42, 70, 0.08)',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        overflow: 'hidden',
        position: 'relative',
    },
    cardPrivate: {
        backgroundColor: '#fff',
    },
    privateDecor: {
        position: 'absolute',
        right: -30,
        bottom: -30,
        opacity: 0.03,
    },
    cardHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
        gap: 12,
    },
    avatarContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: COLORS.surface0,
        padding: 2,
        ...SHADOWS.small,
    },
    avatar: {
        width: '100%',
        height: '100%',
        borderRadius: 22,
    },
    headerInfo: {
        flex: 1,
        justifyContent: 'center',
    },
    locationRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        marginBottom: 2,
    },
    locationText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    dateText: {
        fontSize: 12,
        color: COLORS.textTertiary,
    },
    badge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 10,
        paddingVertical: 6, // Taller pill
        borderRadius: 20,
        backgroundColor: COLORS.background, // Subtle default
    },
    badgePublic: {
        backgroundColor: 'rgba(236, 182, 19, 0.08)',
    },
    badgePrivate: {
        backgroundColor: 'rgba(0,0,0,0.03)',
    },
    badgeText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    badgeTextPublic: {
        color: COLORS.accentDark,
    },
    badgeTextPrivate: {
        color: COLORS.textSecondary,
    },
    contentContainer: {
        marginBottom: 16,
    },
    cardTitle: {
        fontFamily: FontDisplay, // Serif for entry titles too
        fontSize: 22,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 10,
        lineHeight: 30,
    },
    cardBody: {
        fontSize: 16,
        color: COLORS.textSecondary,
        lineHeight: 26,
        fontFamily: Platform.select({ ios: 'System', default: 'sans-serif' }),
    },
    quoteContainer: {
        marginTop: 16,
        paddingLeft: 16,
        borderLeftWidth: 3,
        borderLeftColor: COLORS.accentLight,
    },
    quoteText: {
        fontFamily: FontDisplay,
        fontStyle: 'italic',
        fontSize: 16,
        color: COLORS.textPrimary,
        lineHeight: 24,
    },
    imageGrid: {
        flexDirection: 'row',
        height: 200,
        gap: 10,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 16,
    },
    mainImageContainer: {
        flex: 1,
    },
    mainImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    sideImagesContainer: {
        width: '48%',
        gap: 10,
    },
    sideImageWrapper: {
        flex: 1,
        borderRadius: 0,
    },
    sideImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    cardFooter: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginTop: 8,
        paddingTop: 16,
        borderTopWidth: 1,
        borderTopColor: COLORS.borderLight,
    },
    socialActions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
    },
    actionText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textTertiary,
    },
    readMoreText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.accent,
        letterSpacing: 0.5,
    },
    fab: {
        position: 'absolute',
        bottom: 30,
        right: 24,
        borderRadius: 30,
        ...SHADOWS.large,
        shadowColor: COLORS.accent,
    },
    fabGradient: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
    },
    fabIconContainer: {
        // Removed container for cleaner look
    },
    fabText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    }
});
