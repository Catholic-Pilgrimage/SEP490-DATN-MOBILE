import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Animated,
    Dimensions,
    Image,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import { JournalEntry } from '../../../../types/pilgrim/journal.types';

const { width, height } = Dimensions.get('window');
const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

// Mock data (replace with actual data fetching later)
const MOCK_ENTRY = {
    id: '1',
    title: 'Day 4: The Road to Santiago',
    location: 'Santiago de Compostela, Spain',
    date: 'Oct 12, 2023',
    time: '10:45 AM',
    author: {
        name: 'Maria S.',
        level: 'Pilgrim • Level 4',
        avatar: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAUGD9Yx3JwftBecTlmAnwRpmGxYTW4r79CCNco4hmoGBSev8QwA4S8fmLWEbf7wGd2Se_kmYdXabH2n1oRlsqWul-ZgG59qz3nVNtQEl2cVpZ2dIGZEeKmpsgzFHMvwo_3b16gyKIm3yTE1YpPa4bCMXtaWK7reObPn2LK9CWV84dH_6AAyjHXlvfAxUruohDyQXz_F0yUbZUq7T7frrqMewSFRiVAkYf4A306HLb7thLZ6kPbiJe5GNd9TFH8hWKUCehIN_LLr7s'
    },
    content: [
        "Today was difficult but rewarding. The silence of the morning walk allowed me to hear my own thoughts clearly for the first time in days. As the sun rose over the hills, I felt a profound sense of peace wash over me, reminding me why I started this journey.",
        "The path was steep, covered in loose stones that rattled with every step. My feet ached, but my spirit felt surprisingly light. I met an elderly couple from France who shared their water with me; their kindness was a simple sacrament in itself.",
        "I stopped at a small chapel near the river to pray. The stone walls seemed to hold centuries of whispered hopes. I lit a candle for my family back home, watching the flame dance in the drafty air. It felt like my prayers were physically rising with the smoke.",
        "Tomorrow brings the final stretch. I am tired, yes, but also full. Full of gratitude, full of grace."
    ],
    quote: {
        text: "Be still, and know that I am God.",
        source: "Psalm 46:10"
    },
    audio: {
        title: "Morning Prayer at the Chapel",
        duration: "05:00",
        current: "02:14",
        progress: 0.45
    },
    images: [
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDfr6qqAvNwbXI-JCjBBaPqW-Xhmz0tQF-BUAks8KkKaXOwQPPpWEJEI69ELyx8wY_EKvak5llqd7IodwYpdtBa76007C6hWGeDQp_sAwA6x2qcCHrd_V2rwc5XjWaWzTSEXFcPBdfpNsqA6LKFaiJM6Tgt9lQdo2DWrP5GTifqVFGzjtcPr6XlemCWvLGiAe8VDKf3ja2AJWB9KDjyzrGaEDxIv03QiHhh_YjcfojF3zKKL5Fe-z0oeIkX-2uVfHWyvimHmwRx_9k',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDl9BXuzMcrYYLlSby2hQlA1Txg2aAAOVwnUDtPpwEOpB6bjITNyvRTWiG_VgmvMKdou9jvyKEf46BSducxw2F2xk4x8-MqZBFkRxpNspF80W9S2fUSt1J0E5jQU2cFLIG0426iW5TKnO2SelOxF0jmxueZ5LwT2jZhFMRvdV5tdaO8MZrItZ9Y00NOAaTWdDoO5oc-eTWTJ5mH-GxArA5ZimyOyhaP10qq24hbL8p_MvYVwZ_gjlx7eBNb2Hu0dKOSFt6R_8pUXRg',
        'https://lh3.googleusercontent.com/aida-public/AB6AXuB2A-RUrIoccHey0psvfKDfJIabxJFG7n9bD2BWhUHKjCcKODzSqnycroybrThr_q7Or-cQ-raMq4cG6-3WRBWWyPYISDqWi66boslDZGgsx8UQm9fbD_tqeAj89qcPRO6Eja94gx_y5MaSzWFHT3RTK7D394VRVznFCW8PTJSfd-D5ROPK2RrCR9_3S4d-MzaWbR45FGm1N0ViTcJ-KBk3mpu8NoZ-RQIKQmKIWh3Iqx5JQnEi5u4s_fMStqV15qtHEGzSt86iHbw',
    ]
};

export default function JournalDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { journalId } = route.params || {};
    const insets = useSafeAreaInsets();
    const scrollY = new Animated.Value(0);
    const [activeSlide, setActiveSlide] = useState(0);

    const [journal, setJournal] = useState<JournalEntry | null>(null);
    const [loading, setLoading] = useState(true);

    // Fetch Journal Detail
    useEffect(() => {
        if (!journalId) return;
        fetchJournalDetail();
    }, [journalId]);

    const fetchJournalDetail = async () => {
        try {
            setLoading(true);
            const response = await pilgrimJournalApi.getJournalDetail(journalId);
            if (response.success && response.data) {
                setJournal(response.data);
            }
        } catch (error) {
            console.error("Failed to fetch journal detail", error);
            // Optionally show alert
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        try {
            await pilgrimJournalApi.deleteJournal(journalId);
            navigation.goBack();
        } catch (error) {
            console.error("Failed to delete journal", error);
        }
    };

    const handleEdit = () => {
        if (journal) {
            navigation.navigate('CreateJournal', { journalId: journal.id });
        }
    };

    // Animation values
    const headerOpacity = scrollY.interpolate({
        inputRange: [0, 200],
        outputRange: [0, 1],
        extrapolate: 'clamp',
    });

    const imageScale = scrollY.interpolate({
        inputRange: [-100, 0],
        outputRange: [1.1, 1],
        extrapolate: 'clamp',
    });

    const imageTranslateY = scrollY.interpolate({
        inputRange: [-100, 0, 200],
        outputRange: [-50, 0, 100],
        extrapolate: 'clamp',
    });

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="dark-content" />
                <Text style={{ color: COLORS.textSecondary }}>Loading...</Text>
            </View>
        );
    }

    if (!journal) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <StatusBar barStyle="dark-content" />
                <Text>Journal not found</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: COLORS.accent }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const images = journal.image_url || [];
    // If no images, use a placeholder or handle gracefully
    // For now, we'll assume at least one or use a placeholder if empty for the hero
    const heroImageUri = images.length > 0 ? images[0] : 'https://via.placeholder.com/400x300';

    const renderPagination = () => {
        if (images.length <= 1) return null;
        return (
            <View style={styles.paginationContainer}>
                {images.map((_, i) => (
                    <View
                        key={i}
                        style={[
                            styles.paginationDot,
                            i === activeSlide ? styles.paginationDotActive : styles.paginationDotInactive,
                        ]}
                    />
                ))}
            </View>
        );
    };

    // Helper to format date
    const formatDate = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleDateString('vi-VN', { year: 'numeric', month: 'short', day: 'numeric' });
    };

    const formatTime = (dateString: string) => {
        const date = new Date(dateString);
        return date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <View style={styles.container}>
            <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

            {/* Floating Header Actions (Back & Menu) */}
            <View style={[styles.floatingHeader, { paddingTop: insets.top }]}>
                <TouchableOpacity
                    style={styles.glassButton}
                    onPress={() => navigation.goBack()}
                >
                    <MaterialIcons name="arrow-back" size={24} color="#fff" />
                </TouchableOpacity>

                <TouchableOpacity style={styles.glassButton}>
                    <MaterialIcons name="more-horiz" size={24} color="#fff" />
                </TouchableOpacity>
            </View>

            {/* Sticky Header Background (appears on scroll) */}
            <Animated.View style={[
                styles.stickyHeader,
                {
                    height: 60 + insets.top,
                    paddingTop: insets.top,
                    opacity: headerOpacity
                }
            ]}>
                <View style={styles.stickyHeaderContent}>
                    <Text style={styles.stickyHeaderTitle} numberOfLines={1}>{journal.title}</Text>
                </View>
            </Animated.View>

            <Animated.ScrollView
                showsVerticalScrollIndicator={false}
                scrollEventThrottle={16}
                onScroll={Animated.event(
                    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
                    { useNativeDriver: true }
                )}
                contentContainerStyle={{ paddingBottom: 100 }}
            >
                {/* Hero Section */}
                <View style={styles.heroContainer}>
                    <Animated.View style={[
                        styles.heroImageContainer,
                        {
                            transform: [
                                { scale: imageScale },
                                { translateY: imageTranslateY }
                            ]
                        }
                    ]}>
                        <Image
                            source={{ uri: heroImageUri }}
                            style={styles.heroImage}
                            resizeMode="cover"
                        />
                        <LinearGradient
                            colors={['transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
                            style={styles.heroGradient}
                        />
                    </Animated.View>

                    {/* Hero Content Overlay */}
                    <View style={[styles.heroContent, { paddingBottom: 40 }]}>
                        {journal.site && (
                            <View style={styles.locationBadge}>
                                <MaterialIcons name="location-on" size={14} color={COLORS.accent} />
                                <Text style={styles.locationText}>{journal.site.name}</Text>
                            </View>
                        )}
                        <Text style={styles.heroTitle}>{journal.title}</Text>
                    </View>

                    {renderPagination()}
                </View>

                {/* Main Content */}
                <View style={styles.contentContainer}>
                    {/* Author Info */}
                    <View style={styles.authorSection}>
                        <View style={styles.authorInfo}>
                            <Image
                                source={{ uri: journal.author?.avatar_url || 'https://via.placeholder.com/50' }}
                                style={styles.authorAvatar}
                            />
                            <View>
                                <Text style={styles.authorName}>{journal.author?.full_name}</Text>
                                <Text style={styles.authorLevel}>Pilgrim</Text>
                            </View>
                        </View>
                        <View style={styles.dateInfo}>
                            <Text style={styles.dateText}>{formatDate(journal.created_at)}</Text>
                            <Text style={styles.timeText}>{formatTime(journal.created_at)}</Text>
                        </View>
                    </View>

                    <View style={styles.divider} />

                    {/* Article Body */}
                    <View style={styles.articleBody}>
                        {/* Simple content render for now */}
                        <Text style={styles.paragraph}>{journal.content}</Text>
                    </View>

                    {/* Audio Player Card - Only if audio_url exists */}
                    {journal.audio_url && (
                        <View style={styles.audioCard}>
                            <View style={styles.audioHeader}>
                                <Text style={styles.audioTitleLabel}>VOICE NOTE</Text>
                            </View>
                            <View style={styles.audioContent}>
                                <TouchableOpacity style={styles.playButton}>
                                    <MaterialIcons name="play-arrow" size={28} color={COLORS.textPrimary} />
                                </TouchableOpacity>
                                <View style={styles.audioInfo}>
                                    <View style={styles.audioMeta}>
                                        <Text style={styles.audioTrackTitle} numberOfLines={1}>Audio Recording</Text>
                                        <Text style={styles.audioDuration}>--:--</Text>
                                    </View>
                                    <View style={styles.progressBarBg}>
                                        <View style={[styles.progressBarFill, { width: `0%` }]} />
                                    </View>
                                </View>
                            </View>
                        </View>
                    )}
                </View>
            </Animated.ScrollView>

            {/* Bottom Actions Bar */}
            <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 10 }]}>
                <View style={styles.bottomBarContent}>
                    {/* Edit/Delete Actions */}
                    <View style={styles.leftActions}>
                        <TouchableOpacity style={styles.actionItem} onPress={handleEdit}>
                            <View style={styles.actionIconCircle}>
                                <MaterialIcons name="edit-note" size={22} color={COLORS.textSecondary} />
                            </View>
                            <Text style={styles.actionLabel}>Edit</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.actionItem} onPress={handleDelete}>
                            <View style={[styles.actionIconCircle, styles.deleteAction]}>
                                <MaterialIcons name="delete-outline" size={22} color={COLORS.danger} />
                            </View>
                            <Text style={[styles.actionLabel, { color: COLORS.danger }]}>Delete</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Share Button */}
                    <TouchableOpacity style={styles.shareButton}>
                        <MaterialIcons name="ios-share" size={20} color={COLORS.textPrimary} />
                        <Text style={styles.shareButtonText}>Share</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.background,
    },
    floatingHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        flexDirection: 'row',
        justifyContent: 'space-between',
        paddingHorizontal: SPACING.md,
        paddingBottom: SPACING.sm,
    },
    glassButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(0,0,0,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    stickyHeader: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 90,
        backgroundColor: 'rgba(255,255,255,0.95)',
        borderBottomWidth: 1,
        borderBottomColor: 'rgba(0,0,0,0.05)',
    },
    stickyHeaderContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        paddingHorizontal: 60,
    },
    stickyHeaderTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    heroContainer: {
        height: 400,
        position: 'relative',
        justifyContent: 'flex-end',
    },
    heroImageContainer: {
        ...StyleSheet.absoluteFillObject,
    },
    heroImage: {
        width: '100%',
        height: '100%',
    },
    heroGradient: {
        ...StyleSheet.absoluteFillObject,
    },
    heroContent: {
        paddingHorizontal: SPACING.lg,
        zIndex: 10,
    },
    locationBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 6,
        paddingHorizontal: 12,
        borderRadius: 20,
        alignSelf: 'flex-start',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    locationText: {
        color: '#fff',
        fontSize: 12,
        fontWeight: '600',
        marginLeft: 4,
    },
    heroTitle: {
        fontFamily: FontDisplay,
        fontSize: 32,
        fontWeight: '700',
        color: '#fff',
        lineHeight: 40,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 2 },
        textShadowRadius: 4,
    },
    paginationContainer: {
        position: 'absolute',
        bottom: 48,
        right: SPACING.lg,
        flexDirection: 'row',
        gap: 6,
    },
    paginationDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
    },
    paginationDotActive: {
        backgroundColor: COLORS.accent,
        shadowColor: COLORS.accent,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.8,
        shadowRadius: 8,
    },
    paginationDotInactive: {
        backgroundColor: 'rgba(255,255,255,0.4)',
    },
    contentContainer: {
        backgroundColor: COLORS.background,
        borderTopLeftRadius: 32,
        borderTopRightRadius: 32,
        marginTop: -32,
        paddingTop: 32,
        paddingHorizontal: SPACING.lg,
        minHeight: 800,
    },
    authorSection: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 24,
    },
    authorInfo: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    authorAvatar: {
        width: 48,
        height: 48,
        borderRadius: 24,
        borderWidth: 2,
        borderColor: COLORS.surface0,
    },
    authorName: {
        fontSize: 16,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    authorLevel: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    dateInfo: {
        alignItems: 'flex-end',
    },
    dateText: {
        fontSize: 14,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    timeText: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 2,
    },
    divider: {
        height: 1,
        backgroundColor: COLORS.border,
        marginBottom: 24,
        opacity: 0.5,
    },
    articleBody: {
        marginBottom: 32,
    },
    paragraph: {
        fontSize: 17,
        lineHeight: 28,
        color: COLORS.textPrimary,
        marginBottom: 20,
        opacity: 0.9,
        fontFamily: Platform.OS === 'ios' ? 'System' : 'sans-serif', // Keep body readable
    },
    quoteBlock: {
        marginVertical: 24,
        paddingLeft: 24,
        borderLeftWidth: 4,
        borderLeftColor: 'rgba(236, 182, 19, 0.5)',
        position: 'relative',
    },
    quoteIcon: {
        position: 'absolute',
        top: -16,
        left: -12,
    },
    quoteText: {
        fontFamily: FontDisplay,
        fontSize: 22,
        fontStyle: 'italic',
        color: COLORS.textPrimary,
        lineHeight: 32,
        marginBottom: 12,
    },
    quoteSource: {
        fontSize: 13,
        fontWeight: '700',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 1,
    },
    audioCard: {
        backgroundColor: COLORS.surface0, // White
        borderRadius: 20,
        padding: 20,
        ...SHADOWS.subtle,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        marginBottom: 32,
    },
    audioHeader: {
        marginBottom: 16,
    },
    audioTitleLabel: {
        fontSize: 11,
        fontWeight: '800',
        color: COLORS.textSecondary,
        letterSpacing: 1.5,
    },
    audioContent: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 16,
    },
    playButton: {
        width: 48,
        height: 48,
        borderRadius: 24,
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
        ...SHADOWS.medium,
        shadowColor: COLORS.accent,
    },
    audioInfo: {
        flex: 1,
        gap: 8,
    },
    audioMeta: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    audioTrackTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
        flex: 1,
        marginRight: 8,
    },
    audioDuration: {
        fontSize: 12,
        fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace',
        color: COLORS.textSecondary,
    },
    progressBarBg: {
        height: 6,
        backgroundColor: 'rgba(0,0,0,0.05)',
        borderRadius: 3,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: COLORS.accent,
        borderRadius: 3,
    },
    bottomBar: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: Platform.OS === 'android' ? 'rgba(255,255,255,0.95)' : 'transparent', // Fallback for android
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.05)',
        paddingTop: 16,
        paddingHorizontal: 24,
    },
    bottomBarContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    leftActions: {
        flexDirection: 'row',
        gap: 20,
    },
    actionItem: {
        alignItems: 'center',
        gap: 4,
    },
    actionIconCircle: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: 'rgba(0,0,0,0.03)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    deleteAction: {
        backgroundColor: 'rgba(220, 76, 76, 0.05)',
    },
    actionLabel: {
        fontSize: 10,
        fontWeight: '600',
        color: COLORS.textSecondary,
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    shareButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: COLORS.accent,
        paddingVertical: 12,
        paddingHorizontal: 24,
        borderRadius: 30,
        gap: 8,
        ...SHADOWS.medium,
        shadowColor: COLORS.accent,
    },
    shareButtonText: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
});
