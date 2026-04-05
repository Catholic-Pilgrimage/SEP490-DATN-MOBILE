import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Audio } from 'expo-av';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    Image,
    ImageBackground,
    Modal,
    NativeScrollEvent,
    NativeSyntheticEvent,
    Platform,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS, SHADOWS, SPACING } from '../../../../constants/theme.constants';
import { useAuth } from '../../../../hooks/useAuth';
import pilgrimJournalApi from '../../../../services/api/pilgrim/journalApi';
import pilgrimPlannerApi from '../../../../services/api/pilgrim/plannerApi';
import pilgrimSiteApi from '../../../../services/api/pilgrim/siteApi';
import { JournalEntry } from '../../../../types/pilgrim/journal.types';
import { normalizeImageUrls, parsePostgresArray } from '../../../../utils/postgresArrayParser';
import { VideoView, useVideoPlayer } from 'expo-video';

const { width } = Dimensions.get('window');
const CARD_W = width - SPACING.lg * 2;
const FONT_DISPLAY = Platform.select({ ios: 'Georgia', android: 'serif', default: 'serif' });

const getJournalPlannerItemIds = (j: JournalEntry): string[] =>
    Array.from(new Set([
        ...parsePostgresArray(j.planner_item_id),
        ...parsePostgresArray(j.planner_item_ids),
    ]));

export default function JournalDetailScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { journalId } = route.params || {};
    const insets = useSafeAreaInsets();
    const { user } = useAuth();

    const [journal, setJournal] = useState<JournalEntry | null>(null);
    const [loading, setLoading] = useState(true);
    const [siteName, setSiteName] = useState<string | null>(null);
    const [siteSubtitle, setSiteSubtitle] = useState<string | null>(null);

    // Audio
    const [sound, setSound] = useState<Audio.Sound | null>(null);
    const [playing, setPlaying] = useState(false);
    const [audioDuration, setAudioDuration] = useState(0);
    const [audioPos, setAudioPos] = useState(0);

    // Action sheet
    const [menuVisible, setMenuVisible] = useState(false);
    const slideAnim = React.useRef(new Animated.Value(400)).current;

    const videoPlayer = useVideoPlayer(journal?.video_url || '', (player) => {
        player.loop = true;
    });

    const showMenu = () => {
        setMenuVisible(true);
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, bounciness: 4 }).start();
    };
    const hideMenu = (cb?: () => void) => {
        Animated.timing(slideAnim, { toValue: 400, duration: 200, useNativeDriver: true }).start(() => {
            setMenuVisible(false);
            slideAnim.setValue(400);
            cb?.();
        });
    };

    /* ─── Fetch ─── */
    useEffect(() => {
        if (!journalId) return;
        (async () => {
            try {
                setLoading(true);
                const res = await pilgrimJournalApi.getJournalDetail(journalId);
                if (res.success && res.data) setJournal(res.data);
            } catch (e) { console.error(e); }
            finally { setLoading(false); }
        })();
    }, [journalId]);

    /* ─── Resolve location ─── */
    useEffect(() => {
        if (!journal) return;
        let cancelled = false;
        const plannerItemIds = getJournalPlannerItemIds(journal);

        (async () => {
            if (plannerItemIds.length > 0 && journal.planner_id) {
                try {
                    const res = await pilgrimPlannerApi.getPlanDetail(journal.planner_id);
                    const items: any[] = res.data?.items || Object.values(res.data?.items_by_day || {}).flat();
                    const matched = items.filter(i => plannerItemIds.includes(i.id) && i.site?.name);
                    if (matched.length > 0 && !cancelled) {
                        setSiteName([...new Set(matched.map((i: any) => i.site.name))].join(', '));
                        const provs = [...new Set(matched.map((i: any) => i.site?.province).filter(Boolean))];
                        setSiteSubtitle(provs.length ? provs.join(' • ') : res.data?.name || null);
                        return;
                    }
                    if (!cancelled && res.data?.name) { setSiteName(res.data.name); setSiteSubtitle(null); }
                } catch { /* fall through */ }
            }
            if (journal.site?.name && !cancelled) {
                setSiteName(journal.site.name);
                setSiteSubtitle((journal.site as any).province || null);
                return;
            }
            if (journal.site_id && !cancelled) {
                try {
                    const res = await pilgrimSiteApi.getSiteDetail(journal.site_id);
                    if (!cancelled) {
                        setSiteName(res.data?.name || null);
                        setSiteSubtitle((res.data as any)?.province || null);
                    }
                } catch { if (!cancelled) setSiteName(null); }
            }
        })();
        return () => { cancelled = true; };
    }, [journal]);

    /* ─── Actions ─── */
    const askDelete = () => hideMenu(() =>
        Alert.alert('Xóa nhật ký', 'Bạn có chắc muốn xóa?', [
            { text: 'Hủy', style: 'cancel' },
            {
                text: 'Xóa', style: 'destructive', onPress: async () => {
                    try {
                        const r = await pilgrimJournalApi.deleteJournal(journalId);
                        if (r.success) { Alert.alert('Đã xóa'); navigation.goBack(); }
                        else Alert.alert('Lỗi', 'Không thể xóa');
                    } catch { Alert.alert('Lỗi', 'Không thể xóa'); }
                }
            },
        ])
    );

    const doShare = () => hideMenu(async () => {
        try {
            await pilgrimJournalApi.shareJournal(journalId);
            Alert.alert('Đã chia sẻ!', 'Nhật ký đã được chia sẻ ra cộng đồng.');
        } catch (e: any) { Alert.alert('Lỗi', e?.message || 'Không thể chia sẻ'); }
    });

    /* ─── Audio ─── */
    const toggleAudio = async () => {
        if (!journal?.audio_url) return;
        try {
            if (sound && playing) { await sound.pauseAsync(); setPlaying(false); return; }
            if (sound && !playing) { await sound.playAsync(); setPlaying(true); return; }
            await Audio.setAudioModeAsync({ allowsRecordingIOS: false, playsInSilentModeIOS: true, staysActiveInBackground: false, shouldDuckAndroid: true });
            const { sound: s } = await Audio.Sound.createAsync(
                { uri: journal.audio_url }, { shouldPlay: true },
                (st) => {
                    if (st.isLoaded) {
                        setAudioDuration(st.durationMillis || 0);
                        setAudioPos(st.positionMillis || 0);
                        if (st.didJustFinish) { setPlaying(false); setAudioPos(0); }
                    }
                }
            );
            setSound(s); setPlaying(true);
        } catch { Alert.alert('Không thể phát audio'); }
    };
    useEffect(() => () => { sound?.unloadAsync().catch(() => {}); }, [sound]);

    const fmtMs = (ms: number) => {
        const m = Math.floor(ms / 60000), s = Math.floor((ms % 60000) / 1000);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };
    const fmtDate = (d: string) => new Date(d).toLocaleDateString('vi-VN', { day: 'numeric', month: 'short', year: 'numeric' });
    const fmtTime = (d: string) => new Date(d).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    /* ─── Guards ─── */
    if (loading) {
        return (
            <ImageBackground source={require('../../../../../assets/images/bg3.jpg')} style={s.root} resizeMode="cover">
                <StatusBar barStyle="dark-content" />
                <View style={[s.center, { paddingTop: insets.top + 80 }]}>
                    <Text style={{ color: COLORS.textSecondary }}>Đang tải...</Text>
                </View>
            </ImageBackground>
        );
    }
    if (!journal) {
        return (
            <ImageBackground source={require('../../../../../assets/images/bg3.jpg')} style={s.root} resizeMode="cover">
                <StatusBar barStyle="dark-content" />
                <View style={[s.center, { paddingTop: insets.top + 80 }]}>
                    <Text style={{ marginBottom: 16, color: COLORS.textPrimary }}>Không tìm thấy nhật ký</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Text style={{ color: COLORS.accent, fontWeight: '600' }}>← Quay lại</Text>
                    </TouchableOpacity>
                </View>
            </ImageBackground>
        );
    }

    const images = normalizeImageUrls(journal.image_url);
    const coverUri = images.length > 0 ? images[0] : null;
    const authorName = journal.author?.full_name || user?.fullName || 'Pilgrim';
    const avatarUri = journal.author?.avatar_url || user?.avatar;
    const audioProgress = audioDuration > 0 ? audioPos / audioDuration : 0;
    const mediaCount = [
        images.length > 0 && `📷 Ảnh (${images.length})`,
        journal.video_url && '🎥 Video (1)',
        journal.audio_url && '🎧 Audio (1)',
    ].filter(Boolean).join('  ·  ');

    return (
        <>
            <ImageBackground source={require('../../../../../assets/images/bg3.jpg')} style={s.root} resizeMode="cover">
                <StatusBar barStyle="dark-content" translucent backgroundColor="transparent" />

                {/* ── Floating Header ── */}
                <View style={[s.header, { paddingTop: insets.top + 10 }]}>
                    <TouchableOpacity style={s.headerBtn} onPress={() => navigation.goBack()}>
                        <MaterialIcons name="arrow-back" size={22} color={COLORS.textPrimary} />
                        <Text style={s.headerBtnLabel}>Quay lại</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.headerIconBtn} onPress={showMenu}>
                        <MaterialIcons name="more-horiz" size={22} color={COLORS.textPrimary} />
                    </TouchableOpacity>
                </View>

                <ScrollView
                    contentContainerStyle={{ paddingTop: insets.top + 68, paddingBottom: insets.bottom + 40, paddingHorizontal: SPACING.lg }}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ══════════════════════════════════════════
                        MAIN CARD — viền bao quanh toàn bộ nội dung
                    ══════════════════════════════════════════ */}
                    <View style={s.card}>

                        {/* Location section */}
                        <View style={s.locationSection}>
                            <MaterialIcons name="location-on" size={16} color={COLORS.accent} style={{ marginTop: 1 }} />
                            <View style={{ flex: 1 }}>
                                <Text style={s.locationName} numberOfLines={2}>{siteName || 'Không xác định'}</Text>
                                {siteSubtitle && (
                                    <Text style={s.locationSub}>{siteSubtitle}</Text>
                                )}
                            </View>
                        </View>

                        {/* Cover Image — full width inside card */}
                        {coverUri ? (
                            <Image source={{ uri: coverUri }} style={s.coverImage} resizeMode="cover" />
                        ) : (
                            <LinearGradient colors={['#1a2a3a', '#2c4a6e', '#1a3a5e']} style={s.coverPlaceholder}>
                                <MaterialIcons name="auto-stories" size={48} color="rgba(255,255,255,0.4)" />
                            </LinearGradient>
                        )}

                        {/* Card Body */}
                        <View style={s.cardBody}>

                            {/* Author Row */}
                            <View style={s.authorRow}>
                                <View style={s.authorLeft}>
                                    {avatarUri ? (
                                        <Image source={{ uri: avatarUri }} style={s.avatar} />
                                    ) : (
                                        <View style={[s.avatar, s.avatarFallback]}>
                                            <MaterialIcons name="person" size={18} color={COLORS.textSecondary} />
                                        </View>
                                    )}
                                    <View>
                                        <Text style={s.authorName}>{authorName}</Text>
                                        <Text style={s.authorRole}>+ Pilgrim</Text>
                                    </View>
                                </View>
                                <View style={{ alignItems: 'flex-end' }}>
                                    <Text style={s.dateText}>{fmtDate(journal.created_at)}</Text>
                                    <Text style={s.timeText}>{fmtTime(journal.created_at)}</Text>
                                </View>
                            </View>

                            {/* Title */}
                            <Text style={s.title}>"{journal.title}"</Text>

                            {/* Divider with ornament */}
                            <View style={s.ornamentRow}>
                                <View style={s.ornamentLine} />
                                <MaterialIcons name="add" size={16} color="rgba(0,0,0,0.2)" />
                                <View style={s.ornamentLine} />
                            </View>

                            {/* NỘI DUNG */}
                            <View style={s.sectionLabelRow}>
                                <MaterialIcons name="menu-book" size={14} color={COLORS.accent} />
                                <Text style={s.sectionLabel}>NỘI DUNG</Text>
                            </View>
                            <Text style={s.content}>{journal.content}</Text>

                            {/* Media summary pill row */}
                            {mediaCount.length > 0 && (
                                <View style={s.mediaSummaryRow}>
                                    {images.length > 0 && (
                                        <View style={s.mediaPill}>
                                            <MaterialIcons name="photo-camera" size={12} color={COLORS.accent} />
                                            <Text style={s.mediaPillText}>Ảnh ({images.length})</Text>
                                        </View>
                                    )}
                                    {journal.video_url && (
                                        <View style={s.mediaPill}>
                                            <MaterialIcons name="videocam" size={12} color={COLORS.accent} />
                                            <Text style={s.mediaPillText}>Video (1)</Text>
                                        </View>
                                    )}
                                    {journal.audio_url && (
                                        <View style={s.mediaPill}>
                                            <MaterialIcons name="headset" size={12} color={COLORS.accent} />
                                            <Text style={s.mediaPillText}>Audio (1)</Text>
                                        </View>
                                    )}
                                </View>
                            )}

                            {/* Images grid */}
                            {images.length > 0 && (
                                <>
                                    <View style={s.mediaDivider} />
                                    <View style={s.sectionLabelRow}>
                                        <MaterialIcons name="photo-camera" size={14} color={COLORS.accent} />
                                        <Text style={s.sectionLabel}>HÌNH ẢNH</Text>
                                    </View>
                                    <View style={s.imageGrid}>
                                        {images.map((uri, idx) => (
                                            <View key={idx} style={s.imageThumb}>
                                                <Image source={{ uri }} style={StyleSheet.absoluteFill} resizeMode="cover" />
                                                {/* Video play overlay on last thumb if video exists */}
                                                {journal.video_url && idx === images.length - 1 && (
                                                    <View style={s.videoThumbOverlay}>
                                                        <MaterialIcons name="play-circle-filled" size={28} color="rgba(255,255,255,0.9)" />
                                                    </View>
                                                )}
                                            </View>
                                        ))}
                                    </View>
                                </>
                            )}

                            {/* Video Section */}
                            {journal.video_url && (
                                <>
                                    <View style={s.mediaDivider} />
                                    <View style={s.sectionLabelRow}>
                                        <MaterialIcons name="videocam" size={14} color={COLORS.accent} />
                                        <Text style={s.sectionLabel}>VIDEO</Text>
                                    </View>
                                    <View style={s.videoPreviewCard}>
                                        <VideoView
                                            style={s.videoPlayer}
                                            player={videoPlayer}
                                            allowsFullscreen
                                            allowsPictureInPicture
                                            nativeControls
                                        />
                                    </View>
                                </>
                            )}

                            {/* Audio player */}
                            {journal.audio_url && (
                                <>
                                    <View style={s.mediaDivider} />
                                    <View style={s.sectionLabelRow}>
                                        <MaterialIcons name="headset" size={14} color={COLORS.accent} />
                                        <Text style={s.sectionLabel}>AUDIO</Text>
                                    </View>
                                    <View style={s.audioPlayer}>
                                        <TouchableOpacity
                                            style={[s.audioPlayBtn, playing && s.audioPlayBtnActive]}
                                            onPress={toggleAudio}
                                        >
                                            <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={26} color="#fff" />
                                        </TouchableOpacity>
                                        <View style={{ flex: 1 }}>
                                            <View style={s.audioTimeRow}>
                                                <Text style={s.audioTime}>{fmtMs(audioPos)}</Text>
                                                <Text style={s.audioTime}>{audioDuration > 0 ? fmtMs(audioDuration) : '--:--'}</Text>
                                            </View>
                                            <View style={s.progressTrack}>
                                                <View style={[s.progressFill, { width: `${audioProgress * 100}%` }]} />
                                                <View style={[s.progressThumb, { left: `${audioProgress * 100}%` }]} />
                                            </View>
                                        </View>
                                    </View>
                                </>
                            )}

                        </View>
                    </View>
                </ScrollView>
            </ImageBackground>

            {/* ── Action Sheet Modal ── */}
            <Modal transparent visible={menuVisible} animationType="none" onRequestClose={() => hideMenu()}>
                <TouchableWithoutFeedback onPress={() => hideMenu()}>
                    <View style={s.backdrop} />
                </TouchableWithoutFeedback>
                <Animated.View style={[s.actionSheet, { transform: [{ translateY: slideAnim }] }]}>
                    <View style={s.sheetHandle} />
                    <View style={s.sheetHeader}>
                        <Text style={s.sheetTitle}>Nhật ký</Text>
                        {journal?.title && (
                            <Text style={s.sheetSubtitle} numberOfLines={2}>"{journal.title}"</Text>
                        )}
                    </View>
                    <View style={s.sheetDivider} />
                    <TouchableOpacity style={s.sheetAction} onPress={() => hideMenu(() => navigation.navigate('CreateJournalScreen', { journalId }))}>
                        <View style={s.sheetActionIcon}><MaterialIcons name="edit" size={20} color={COLORS.textPrimary} /></View>
                        <Text style={s.sheetActionLabel}>Chỉnh sửa nhật ký</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.sheetAction} onPress={doShare}>
                        <View style={s.sheetActionIcon}><MaterialIcons name="public" size={20} color={COLORS.textPrimary} /></View>
                        <Text style={s.sheetActionLabel}>Chia sẻ ra cộng đồng</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={s.sheetAction} onPress={askDelete}>
                        <View style={[s.sheetActionIcon, s.sheetIconDanger]}><MaterialIcons name="delete-outline" size={20} color={COLORS.danger} /></View>
                        <Text style={[s.sheetActionLabel, { color: COLORS.danger }]}>Xóa nhật ký</Text>
                    </TouchableOpacity>
                    <View style={s.sheetDivider} />
                    <TouchableOpacity style={s.sheetCancel} onPress={() => hideMenu()}>
                        <Text style={s.sheetCancelText}>Hủy</Text>
                    </TouchableOpacity>
                </Animated.View>
            </Modal>
        </>
    );
}

/* ─────────── Styles ─────────── */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: '#f5f0ea' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },

    /* Header */
    header: {
        position: 'absolute', top: 0, left: 0, right: 0, zIndex: 100,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: SPACING.md, paddingBottom: 10,
        backgroundColor: 'rgba(245,240,234,0.96)',
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    headerBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingVertical: 8, paddingRight: 8 },
    headerBtnLabel: { fontSize: 15, color: COLORS.textPrimary, fontWeight: '500' },
    headerIconBtn: {
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(0,0,0,0.07)',
        justifyContent: 'center', alignItems: 'center',
    },

    /* ══ MAIN CARD ══ */
    card: {
        backgroundColor: '#fff',
        borderRadius: 20,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.08)',
        overflow: 'hidden',
        ...SHADOWS.medium,
        shadowColor: 'rgba(0,0,0,0.12)',
        marginBottom: 16,
    },

    /* Location inside card */
    locationSection: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 8,
        paddingHorizontal: 16, paddingVertical: 14,
        borderBottomWidth: 1, borderBottomColor: 'rgba(0,0,0,0.06)',
    },
    locationName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary, lineHeight: 19 },
    locationSub: { fontSize: 11, color: COLORS.textSecondary, marginTop: 2, fontWeight: '500' },

    /* Cover image */
    coverImage: { width: '100%', height: 210 },
    coverPlaceholder: { width: '100%', height: 210, justifyContent: 'center', alignItems: 'center' },

    /* Card body (padded) */
    cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },

    /* Author */
    authorRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 },
    authorLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 2, borderColor: 'rgba(236,182,19,0.25)' },
    avatarFallback: { backgroundColor: 'rgba(0,0,0,0.06)', justifyContent: 'center', alignItems: 'center' },
    authorName: { fontSize: 14, fontWeight: '700', color: COLORS.textPrimary },
    authorRole: { fontSize: 12, color: COLORS.accent, fontWeight: '600', marginTop: 1 },
    dateText: { fontSize: 12, fontWeight: '600', color: COLORS.textPrimary, textAlign: 'right' },
    timeText: { fontSize: 11, color: COLORS.textSecondary, textAlign: 'right', marginTop: 2 },

    /* Title */
    title: {
        fontFamily: FONT_DISPLAY, fontSize: 22, fontWeight: '700',
        color: COLORS.textPrimary, lineHeight: 30, marginBottom: 16,
    },

    /* Ornament divider */
    ornamentRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 16 },
    ornamentLine: { flex: 1, height: 1, backgroundColor: 'rgba(0,0,0,0.08)' },

    /* Section label */
    sectionLabelRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 10 },
    sectionLabel: {
        fontSize: 11, fontWeight: '800', color: COLORS.textSecondary,
        textTransform: 'uppercase', letterSpacing: 1.2,
    },

    /* Content */
    content: { fontSize: 15, lineHeight: 25, color: COLORS.textPrimary, opacity: 0.87, marginBottom: 16 },

    /* Media summary pills */
    mediaSummaryRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
    mediaPill: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(236,182,19,0.1)',
        borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
        borderWidth: 1, borderColor: 'rgba(236,182,19,0.2)',
    },
    mediaPillText: { fontSize: 11, fontWeight: '700', color: COLORS.textPrimary },

    /* Media divider */
    mediaDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)', marginVertical: 16 },

    /* Image grid */
    imageGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
    imageThumb: {
        width: (CARD_W - 32 - 12) / 3,
        height: (CARD_W - 32 - 12) / 3,
        borderRadius: 10, overflow: 'hidden',
        backgroundColor: 'rgba(0,0,0,0.06)',
    },
    videoThumbOverlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.3)',
        justifyContent: 'center', alignItems: 'center',
    },

    /* Video card (no image fallback) */
    videoCard: {
        height: 160, borderRadius: 14, overflow: 'hidden',
        backgroundColor: '#111', justifyContent: 'center', alignItems: 'center',
    },
    videoPlayBtn: {
        width: 56, height: 56, borderRadius: 28,
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderWidth: 2, borderColor: 'rgba(255,255,255,0.5)',
        justifyContent: 'center', alignItems: 'center',
    },

    /* Audio */
    audioPlayer: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        backgroundColor: 'rgba(0,0,0,0.03)', borderRadius: 14,
        padding: 14, borderWidth: 1, borderColor: 'rgba(0,0,0,0.06)',
    },
    audioPlayBtn: {
        width: 48, height: 48, borderRadius: 24,
        backgroundColor: COLORS.accent, justifyContent: 'center', alignItems: 'center',
        ...SHADOWS.subtle, shadowColor: COLORS.accent,
    },
    audioPlayBtnActive: { backgroundColor: '#b89400' },
    audioTimeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
    audioTime: { fontSize: 11, fontWeight: '600', color: COLORS.textSecondary, fontFamily: Platform.OS === 'ios' ? 'Courier New' : 'monospace' },
    progressTrack: { height: 4, backgroundColor: 'rgba(0,0,0,0.1)', borderRadius: 2, position: 'relative', overflow: 'visible' },
    progressFill: { height: '100%', backgroundColor: COLORS.accent, borderRadius: 2 },
    progressThumb: {
        position: 'absolute', top: -4, width: 12, height: 12, borderRadius: 6,
        backgroundColor: COLORS.accent, marginLeft: -6, ...SHADOWS.subtle,
    },

    /* Video */
    videoPreviewCard: {
        width: '100%',
        height: 220,
        borderRadius: 14,
        overflow: 'hidden',
        backgroundColor: '#000',
        ...SHADOWS.small,
        marginBottom: 8,
    },
    videoPlayer: {
        width: '100%',
        height: '100%',
    },
    /* Action Sheet */
    backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.45)' },
    actionSheet: {
        position: 'absolute', bottom: 0, left: 0, right: 0,
        backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24,
        paddingBottom: 32, ...SHADOWS.medium,
    },
    sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: 'rgba(0,0,0,0.15)', alignSelf: 'center', marginTop: 12, marginBottom: 4 },
    sheetHeader: { paddingHorizontal: 20, paddingVertical: 16 },
    sheetTitle: { fontSize: 17, fontWeight: '700', color: COLORS.textPrimary, marginBottom: 4 },
    sheetSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
    sheetDivider: { height: 1, backgroundColor: 'rgba(0,0,0,0.07)' },
    sheetAction: { flexDirection: 'row', alignItems: 'center', gap: 14, paddingHorizontal: 20, paddingVertical: 16 },
    sheetActionIcon: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(0,0,0,0.05)', justifyContent: 'center', alignItems: 'center' },
    sheetIconDanger: { backgroundColor: 'rgba(220,76,76,0.08)' },
    sheetActionLabel: { fontSize: 16, color: COLORS.textPrimary, fontWeight: '500' },
    sheetCancel: { marginHorizontal: 16, marginTop: 8, paddingVertical: 14, borderRadius: 14, backgroundColor: 'rgba(0,0,0,0.05)', alignItems: 'center' },
    sheetCancelText: { fontSize: 16, fontWeight: '600', color: COLORS.textPrimary },
});
