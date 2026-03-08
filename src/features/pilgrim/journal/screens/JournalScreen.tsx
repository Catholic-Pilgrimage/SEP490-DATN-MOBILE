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
import { BORDER_RADIUS, COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../contexts/AuthContext';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import { JournalEntry } from '../../../../types/pilgrim/journal.types';
import { normalizeImageUrls } from '../../../../utils/postgresArrayParser';

const { width } = Dimensions.get('window');

const FontDisplay = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

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
    const [journals, setJournals] = useState<JournalEntry[]>([]);
    const [loading, setLoading] = useState(!isGuest);

    const scrollRef = useRef(null);
    useScrollToTop(scrollRef);

    const fetchJournals = async () => {
        try {
            setLoading(true);
            const response = await pilgrimJournalApi.getMyJournals();
            if (response.data && response.data.journals) {
                setJournals(response.data.journals);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useFocusEffect(
        useCallback(() => {
            if (!isGuest) {
                fetchJournals();
            }
        }, [isGuest])
    );

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
        const images = normalizeImageUrls(item.image_url);
        const avatarUrl = item.author?.avatar_url || user?.avatar || 'https://via.placeholder.com/50';

        return (
            <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => navigation.navigate('JournalDetailScreen', { journalId: item.id })}
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
                        <Image
                            source={{ uri: avatarUrl }}
                            style={styles.avatar}
                        />
                    </View>
                    <View style={styles.headerInfo}>
                        <View style={styles.locationRow}>
                            <MaterialIcons name="location-on" size={14} color={COLORS.accent} />
                            <Text style={styles.locationText} numberOfLines={1}>
                                {item.site?.name || 'Unknown Location'}
                            </Text>
                        </View>
                        <Text style={styles.dateText}>
                            {new Date(item.created_at).toLocaleDateString()}
                        </Text>
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
                </View>

                {/* Images Grid */}
                {images.length > 0 && (
                    <View style={styles.imageGrid}>
                        <View style={styles.mainImageContainer}>
                            <Image source={{ uri: images[0] }} style={styles.mainImage} />
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

                {/* Footer Actions */}
                {!isPrivate && (
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
                            <Text style={styles.readMoreText}>Read More</Text>
                        </TouchableOpacity>
                    </View>
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
                    <Text style={styles.headerTagline}>HÀNH TRÌNH ĐỨC TIN</Text>

                    {/* Main Title */}
                    <Text style={styles.headerTitle}>Nhật ký Tâm linh</Text>

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
                            <Text style={{ color: COLORS.textSecondary }}>Chưa có nhật ký nào</Text>
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
                        <Text style={styles.fabText}>Viết nhật ký</Text>
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
    }
});
