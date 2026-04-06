import { MaterialIcons } from '@expo/vector-icons';
import { CommonActions, useFocusEffect, useNavigation, useScrollToTop } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
    ActivityIndicator,
    Animated,
    Dimensions,
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
import Toast from 'react-native-toast-message';
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import { useConfirm } from '../../../../hooks/useConfirm';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import pilgrimSiteApi from '../../../../services/api/pilgrim/siteApi';
import { JournalEntry } from '../../../../types/pilgrim/journal.types';
import { normalizeImageUrls, parsePostgresArray } from '../../../../utils/postgresArrayParser';

const { width } = Dimensions.get('window');

const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const getJournalPlannerItemIds = (journal: JournalEntry): string[] =>
    Array.from(new Set([
        ...parsePostgresArray(journal.planner_item_id),
        ...parsePostgresArray(journal.planner_item_ids),
    ]));

// Animated guest card with floating + icon pulse
const GuestCardAnimated = ({ handleLogin, t }: { handleLogin: () => void; t: any }) => {
    const cardFloat = useRef(new Animated.Value(0)).current;
    const iconPulse = useRef(new Animated.Value(1)).current;

    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(cardFloat, { toValue: -6, duration: 1500, useNativeDriver: true }),
                Animated.timing(cardFloat, { toValue: 6, duration: 1500, useNativeDriver: true }),
            ])
        ).start();
        Animated.loop(
            Animated.sequence([
                Animated.timing(iconPulse, { toValue: 1.15, duration: 800, useNativeDriver: true }),
                Animated.timing(iconPulse, { toValue: 1, duration: 800, useNativeDriver: true }),
            ])
        ).start();
    }, []);

    return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: SPACING.xl }}>
            <Animated.View style={[styles.guestCard, { transform: [{ translateY: cardFloat }] }]}>
                <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
                    <MaterialIcons name="lock-outline" size={48} color="#D4AF37" />
                </Animated.View>
                <Text style={styles.guestTitle}>{t('profile.loginRequired')}</Text>
                <Text style={styles.guestSubtitle}>{t('profile.loginRequiredMessage')}</Text>
                <TouchableOpacity style={styles.guestLoginBtn} onPress={handleLogin} activeOpacity={0.8}>
                    <View style={styles.guestLoginInner}>
                        <MaterialIcons name="login" size={20} color="#FFFFFF" />
                        <Text style={styles.guestLoginText}>{t('profile.loginRegister', { defaultValue: 'Đăng nhập / Đăng ký' })}</Text>
                    </View>
                </TouchableOpacity>
            </Animated.View>
        </View>
    );
};

export const JournalScreen = () => {
    const navigation = useNavigation<any>();
    const insets = useSafeAreaInsets();
    const { isGuest, exitGuestMode, user } = useAuth();
    const { t } = useTranslation();
    const { confirm: showConfirm } = useConfirm();
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(!isGuest);
    const [siteNamesById, setSiteNamesById] = useState<Record<string, string>>({});
    const [plannerNamesById, setPlannerNamesById] = useState<Record<string, string>>({});
    const [plannerItemSiteNamesById, setPlannerItemSiteNamesById] = useState<Record<string, string>>({});

    const scrollRef = useRef(null);
    const requestedSiteIdsRef = useRef(new Set<string>());
    const requestedPlannerIdsRef = useRef(new Set<string>());
    useScrollToTop(scrollRef);

    const fetchJournals = async () => {
        try {
            setLoading(true);
            const response = await pilgrimJournalApi.getMyJournals({ is_active: 'all' } as any);
            if (response.data && response.data.journals) {
                setJournals(response.data.journals);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const handleRestore = async (id: string) => {
        try {
            await pilgrimJournalApi.restoreJournal(id);
            Toast.show({
                type: 'success',
                text1: t('common.success'),
                text2: t('journal.restoreSuccess'),
                position: 'top',
            });
            // Refresh after restore
            await fetchJournals();
        } catch (error: any) {
            console.error('Restore failed:', error);
            const errorMsg = error?.response?.data?.error?.message || error?.message || t('journal.restoreError');
            Toast.show({
                type: 'error',
                text1: t('journal.restoreErrorTitle'),
                text2: errorMsg,
                position: 'top',
            });
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!isGuest) {
                fetchJournals();
            }
        }, [isGuest])
    );

    // Resolve site names for journals without site.name
    useEffect(() => {
        const missingSiteIds = Array.from(new Set(
            journals
                .map(j => j.site?.name ? null : j.site_id)
                .filter((id): id is string => Boolean(id && !siteNamesById[id] && !requestedSiteIdsRef.current.has(id)))
        ));
        if (!missingSiteIds.length) return;
        missingSiteIds.forEach(id => requestedSiteIdsRef.current.add(id));
        let cancelled = false;
        (async () => {
            const results = await Promise.all(missingSiteIds.map(async id => {
                try { const r = await pilgrimSiteApi.getSiteDetail(id); return { id, name: r.data?.name || null }; }
                catch { return { id, name: null }; }
            }));
            if (cancelled) return;
            const next: Record<string, string> = {};
            results.forEach(({ id, name }) => { if (name) next[id] = name; else requestedSiteIdsRef.current.delete(id); });
            if (Object.keys(next).length) setSiteNamesById(prev => ({ ...prev, ...next }));
        })();
        return () => { cancelled = true; };
    }, [journals, siteNamesById]);

    // Resolve planner names + planner item site names
    useEffect(() => {
        const missingPlannerIds = Array.from(new Set(
            journals
                .map(j => {
                    const itemIds = getJournalPlannerItemIds(j);
                    const needsName = j.planner_id && !j.planner?.name && !plannerNamesById[j.planner_id];
                    const needsSite = j.planner_id && itemIds.length > 0 && itemIds.some(id => !plannerItemSiteNamesById[id]);
                    return (needsName || needsSite) ? j.planner_id : null;
                })
                .filter((id): id is string => Boolean(id && !requestedPlannerIdsRef.current.has(id)))
        ));
        if (!missingPlannerIds.length) return;
        missingPlannerIds.forEach(id => requestedPlannerIdsRef.current.add(id));
        let cancelled = false;
        (async () => {
            const results = await Promise.all(missingPlannerIds.map(async plannerId => {
                try {
                    const r = await pilgrimPlannerApi.getPlanDetail(plannerId);
                    const planner = r.data;
                    const items = planner?.items || Object.values(planner?.items_by_day || {}).flat();
                    return {
                        plannerId,
                        plannerName: planner?.name || null,
                        itemSiteNames: Object.fromEntries(
                            (items as any[]).filter(i => i?.id && i.site?.name).map(i => [i.id, i.site.name])
                        ) as Record<string, string>,
                    };
                } catch { return { plannerId, plannerName: null, itemSiteNames: {} }; }
            }));
            if (cancelled) return;
            const nextNames: Record<string, string> = {};
            const nextItemSites: Record<string, string> = {};
            results.forEach(({ plannerId, plannerName, itemSiteNames }) => {
                if (plannerName) nextNames[plannerId] = plannerName;
                Object.assign(nextItemSites, itemSiteNames);
                if (!plannerName && Object.keys(itemSiteNames).length === 0) requestedPlannerIdsRef.current.delete(plannerId);
            });
            if (Object.keys(nextNames).length) setPlannerNamesById(prev => ({ ...prev, ...nextNames }));
            if (Object.keys(nextItemSites).length) setPlannerItemSiteNamesById(prev => ({ ...prev, ...nextItemSites }));
        })();
        return () => { cancelled = true; };
    }, [journals, plannerItemSiteNamesById, plannerNamesById]);

    const handleLogin = async () => {
        if (isGuest) {
            await exitGuestMode();
        }
        navigation.dispatch(
            CommonActions.reset({
                index: 0,
                routes: [{ name: 'Auth' }],
            })
        );
    };

    const renderItem = ({ item }: { item: JournalEntry }) => {
        const isPrivate = item.privacy === 'private';
        const isInactive = (item as any).is_active === false;
        const images = normalizeImageUrls(item.image_url);
        const plannerItemIds = getJournalPlannerItemIds(item);

        // Resolve location: site.name > siteNamesById > plannerItemSiteNames > plannerName
        const resolvedSiteName = [
            item.site?.name,
            item.site_id ? siteNamesById[item.site_id] : undefined,
            ...plannerItemIds.map(id => plannerItemSiteNamesById[id]),
        ].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
        const resolvedPlannerName = item.planner?.name || (item.planner_id ? plannerNamesById[item.planner_id] : undefined);
        const locationLabel = resolvedSiteName || resolvedPlannerName || null;

        const authorName = item.author?.full_name || user?.fullName || t('journal.pilgrimRole');
        const avatarUrl = item.author?.avatar_url || user?.avatar;

        return (
            <TouchableOpacity
                activeOpacity={isInactive ? 1 : 0.9}
                onPress={() => !isInactive && navigation.navigate('JournalDetailScreen', { journalId: item.id })}
                style={[styles.card, isPrivate && styles.cardPrivate, isInactive && styles.cardInactive]}
            >
                {isPrivate && (
                    <View style={styles.privateDecor}>
                        <MaterialIcons name="lock" size={180} color="rgba(0,0,0,0.02)" />
                    </View>
                )}

                {/* Inactive banner */}
                {isInactive && (
                    <View style={styles.inactiveBanner}>
                        <MaterialIcons name="delete-outline" size={14} color="#fff" />
                        <Text style={styles.inactiveBannerText}>{t('journal.deleted')}</Text>
                    </View>
                )}

                {/* Header: Avatar + Name + Location */}
                <View style={styles.cardHeader}>
                    <View style={styles.avatarContainer}>
                        {avatarUrl ? (
                            <Image source={{ uri: avatarUrl }} style={styles.avatar} />
                        ) : (
                            <View style={[styles.avatar, styles.initialAvatar]}>
                                <Text style={styles.initialAvatarText}>
                                    {authorName.trim().charAt(0).toUpperCase()}
                                </Text>
                            </View>
                        )}
                    </View>
                    <View style={styles.headerInfo}>
                        <Text style={styles.authorName} numberOfLines={1}>{authorName}</Text>
                        {locationLabel && (
                            <View style={styles.locationRow}>
                                <MaterialIcons name="location-on" size={12} color={COLORS.accent} />
                                <Text style={styles.locationText} numberOfLines={2}>
                                    {locationLabel}
                                </Text>
                            </View>
                        )}
                        <Text style={styles.dateText}>
                            {new Date(item.created_at).toLocaleDateString(t('common.locale', { defaultValue: 'vi-VN' }))}
                        </Text>
                    </View>
                </View>

                {/* Content */}
                <View style={styles.contentContainer}>
                    <Text style={[styles.cardTitle, isInactive && styles.textFaded]}>{item.title}</Text>
                    <Text style={[styles.cardBody, isInactive && styles.textFaded]} numberOfLines={3}>
                        {item.content}
                    </Text>
                </View>

                {/* Images Grid */}
                {(images.length > 0 || item.video_url) && (
                    <View style={[styles.imageGrid, isInactive && { opacity: 0.4 }]}>
                        <View style={styles.mainImageContainer}>
                            {images.length > 0 ? (
                                <Image source={{ uri: images[0] }} style={styles.mainImage} />
                            ) : (
                                <View style={[styles.mainImage, { backgroundColor: '#1a1a2e', justifyContent: 'center', alignItems: 'center' }]}>
                                    <MaterialIcons name="videocam" size={40} color={COLORS.accent} />
                                </View>
                            )}
                            {item.video_url && (
                                <View style={styles.videoOverlay}>
                                    <MaterialIcons name="play-circle-filled" size={40} color="rgba(255,255,255,0.9)" />
                                </View>
                            )}
                        </View>
                        {images.length > 1 && (
                            <View style={styles.sideImagesContainer}>
                                {images.slice(1, 3).map((img, idx) => (
                                    <View key={idx} style={styles.sideImageWrapper}>
                                        <Image source={{ uri: img }} style={styles.sideImage} />
                                    </View>
                                ))}
                            </View>
                        )}
                    </View>
                )}

                {/* Restore button for inactive */}
                {isInactive ? (
                    <TouchableOpacity
                        style={styles.restoreButton}
                        activeOpacity={0.8}
                        onPress={() => handleRestore(item.id)}
                    >
                        <MaterialIcons name="restore" size={16} color="#fff" />
                        <Text style={styles.restoreButtonText}>{t('journal.restore')}</Text>
                    </TouchableOpacity>
                ) : (
                    !isPrivate && (
                        <View style={styles.cardFooter}>
                            <View style={styles.socialActions}>
                                <TouchableOpacity style={styles.actionButton}>
                                    <MaterialIcons name="favorite-border" size={20} color={COLORS.textSecondary} />
                                    <Text style={styles.actionText}>0</Text>
                                </TouchableOpacity>
                                <TouchableOpacity style={styles.actionButton}>
                                    <MaterialIcons name="chat-bubble-outline" size={20} color={COLORS.textSecondary} />
                                    <Text style={styles.actionText}>0</Text>
                                </TouchableOpacity>
                            </View>
                            <TouchableOpacity onPress={() => navigation.navigate('JournalDetailScreen', { journalId: item.id })}>
                                <Text style={styles.readMoreText}>{t('journal.readMore')}</Text>
                            </TouchableOpacity>
                        </View>
                    )
                )}
            </TouchableOpacity>
        );
    };

    return (
        <ImageBackground
            source={require('../../../../../assets/images/journal-bg.png')}
            style={styles.container}
            resizeMode="cover"
        >

            <StatusBar barStyle="dark-content" backgroundColor="transparent" translucent />

            {/* Header */}
            <View style={[styles.header, { paddingTop: insets.top + 20 }]}>
                <View style={styles.headerTitleContainer}>
                    {/* Background Icon Decoration - Aligned with Planner */}
                    <View style={styles.headerWatermark}>
                        <MaterialIcons name="church" size={160} color={COLORS.textTertiary} style={{ opacity: 0.1 }} />
                    </View>

                    {/* Tagline - New addition to match Planner */}
                    <Text style={styles.headerTagline}>{t('journal.tagline')}</Text>

                    {/* Main Title */}
                    <Text style={styles.headerTitle}>{t('journal.screenTitle')}</Text>

                    {/* Yellow Line Decoration */}
                    <View style={styles.headerDecoration} />
                </View>
            </View>

            {isGuest ? (
                <GuestCardAnimated handleLogin={handleLogin} t={t} />
            ) : loading ? (
                <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                    <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
            ) : (
                <FlatList
                    ref={scrollRef}
                    data={journals}
                    renderItem={renderItem}
                    keyExtractor={(item) => item.id}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                    ListFooterComponent={<View style={{ height: 100 }} />}
                    ListEmptyComponent={
                        <View style={{ alignItems: 'center', marginTop: 50 }}>
                            <Text style={{ color: COLORS.textSecondary }}>{t('journal.emptyList')}</Text>
                        </View>
                    }
                />
            )}

            {/* FAB - Hidden for guests */}
            {!isGuest && (
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
                        <Text style={styles.fabText}>{t('journal.writeJournal')}</Text>
                    </LinearGradient>
                </TouchableOpacity>
            )}
        </ImageBackground>
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
    authorName: {
        fontSize: 14,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginBottom: 2,
    },
    initialAvatar: {
        backgroundColor: COLORS.accent,
        justifyContent: 'center',
        alignItems: 'center',
    },
    initialAvatarText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '700',
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
        position: 'relative',
        borderRadius: 12,
        overflow: 'hidden',
    },
    videoOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center',
        alignItems: 'center',
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
    guestCard: {
        backgroundColor: 'rgba(255, 255, 255, 0.95)',
        borderRadius: BORDER_RADIUS.xl,
        padding: SPACING.xl,
        alignItems: 'center',
        gap: SPACING.md,
        ...SHADOWS.medium,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        width: '100%',
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
    fabText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 16,
    },
    cardInactive: {
        opacity: 0.6,
        borderColor: 'rgba(200,50,50,0.15)',
        borderWidth: 1,
    },
    inactiveBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        backgroundColor: '#c0392b',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginBottom: 12,
    },
    inactiveBannerText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
        letterSpacing: 0.5,
    },
    textFaded: {
        color: COLORS.textTertiary,
    },
    restoreButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
        marginTop: 14,
        paddingVertical: 12,
        paddingHorizontal: 20,
        backgroundColor: '#27ae60',
        borderRadius: 20,
    },
    restoreButtonText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
    },
});
