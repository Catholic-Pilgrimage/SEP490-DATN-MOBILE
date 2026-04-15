import { MaterialIcons, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  useFocusEffect,
  useNavigation,
  useRoute,
} from "@react-navigation/native";
import { Audio } from "expo-av";
import { LinearGradient } from "expo-linear-gradient";
import { VideoView, useVideoPlayer } from "expo-video";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  Animated,
  Dimensions,
  Image,
  ImageBackground,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  getJournalDetail,
  deleteJournal,
  shareJournal,
} from "../../../../services/api/pilgrim/journalApi";
import { getPlanDetail } from "../../../../services/api/pilgrim/plannerApi";
import { getSiteDetail, getSiteMedia } from "../../../../services/api/pilgrim/siteApi";
import { JournalEntry } from "../../../../types/pilgrim/journal.types";
import { SiteMedia } from "../../../../types/pilgrim/site.types";
import { ModelViewerWebView } from "../../../../components/media/ModelViewerWebView";
import { SiteModelNarrativePanel } from "../../../../components/media/SiteModelNarrativePanel";
import { SiteModelJournalOverlay } from "../../../../components/media/SiteModelJournalOverlay";
import {
  normalizeImageUrls,
  parsePostgresArray,
} from "../../../../utils/postgresArrayParser";
import { SiteType } from "../../../../types/common.types";

const { width } = Dimensions.get("window");
const CARD_W = width - SPACING.lg * 2;
const FONT_DISPLAY = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const getJournalPlannerItemIds = (j: JournalEntry): string[] =>
  Array.from(
    new Set([
      ...parsePostgresArray(j.planner_item_id),
      ...parsePostgresArray(j.planner_item_ids),
    ]),
  );

const pickSiteImage = (site?: any): string | null => {
  if (!site) return null;
  const candidates = [
    site.coverImage,
    site.cover_image,
    site.image,
    site.thumbnail,
    site.thumbnail_url,
    Array.isArray(site.images) ? site.images[0] : null,
  ];
  const selected = candidates.find(
    (v) => typeof v === "string" && v.trim().length > 0,
  );
  return selected ? String(selected) : null;
};

export default function JournalDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { journalId } = route.params || {};
  const [isJournalUiVisible, setIsJournalUiVisible] = useState(false);
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { confirm: showConfirm, ConfirmModal } = useConfirm();
  const { user } = useAuth();
  const hintOpacity = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const parent = navigation.getParent();
    if (parent) {
      parent.setOptions({
        tabBarStyle: { display: "none" },
      });
    }
    return () => {
      if (parent) {
        parent.setOptions({
          tabBarStyle: undefined,
        });
      }
    };
  }, [navigation]);

  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [siteName, setSiteName] = useState<string | null>(null);
  const [siteType, setSiteType] = useState<SiteType | null>(null);
  const [siteSubtitle, setSiteSubtitle] = useState<string | null>(null);
  const [resolvedCoverUri, setResolvedCoverUri] = useState<string | null>(null);
  const [models3d, setModels3d] = useState<SiteMedia[]>([]);
  const [is3dModalVisible, setIs3dModalVisible] = useState(false);
  const [selectedModelIndex, setSelectedModelIndex] = useState(0);
  const mountAnim = React.useRef(new Animated.Value(0)).current;

  // Audio
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [playing, setPlaying] = useState(false);
  const [audioDuration, setAudioDuration] = useState(0);
  const [audioPos, setAudioPos] = useState(0);
  const isSeekingRef = useRef(false);
  const trackWidthRef = useRef(0);

  // Action sheet
  const [menuVisible, setMenuVisible] = useState(false);
  const slideAnim = React.useRef(new Animated.Value(400)).current;

  const videoPlayer = useVideoPlayer(journal?.video_url || "", (player) => {
    player.loop = true;
  });

  const showMenu = () => {
    setMenuVisible(true);
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      bounciness: 4,
    }).start();
  };
  const hideMenu = (cb?: () => void) => {
    Animated.timing(slideAnim, {
      toValue: 400,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      setMenuVisible(false);
      slideAnim.setValue(400);
      cb?.();
    });
  };

  /* ─── Fetch ─── */
  const fetchJournal = useCallback(async () => {
    if (!journalId) return;
    try {
      setLoading(true);
      const res = await getJournalDetail(journalId);
      if (res.success && res.data) setJournal(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [journalId]);

  useFocusEffect(
    useCallback(() => {
      void fetchJournal();
    }, [fetchJournal]),
  );

  /* ─── Resolve location ─── */
  useEffect(() => {
    if (!journal) return;
    let cancelled = false;
    const plannerItemIds = getJournalPlannerItemIds(journal);
    setResolvedCoverUri(pickSiteImage(journal.site as any));

    (async () => {
      if (plannerItemIds.length > 0 && journal.planner_id) {
        try {
          const res = await getPlanDetail(journal.planner_id);
          const items: any[] =
            res?.data?.items ||
            Object.values(res?.data?.items_by_day || {}).flat();
          const matched = items.filter(
            (i) => plannerItemIds.includes(i.id) && i.site?.name,
          );
          const matchedImage = (items as any[])
            .filter((i) => plannerItemIds.includes(i.id))
            .map((i) => pickSiteImage(i.site))
            .find(Boolean);
          if (matchedImage && !cancelled) {
            setResolvedCoverUri(String(matchedImage));
          }
          if (matched.length > 0 && !cancelled) {
            setSiteName(
              [...new Set(matched.map((i: any) => i.site.name))].join(", "),
            );
            const provs = [
              ...new Set(
                matched.map((i: any) => i.site?.province).filter(Boolean),
              ),
            ];
            setSiteSubtitle(
              provs.length ? provs.join(" • ") : res?.data?.name || null,
            );
            return;
          }
          if (!cancelled && res?.data?.name) {
            setSiteName(res.data.name);
            setSiteSubtitle(null);
          }
        } catch {
          /* fall through */
        }
      }
      if (journal.site?.name && !cancelled) {
        setSiteName(journal.site.name);
        setSiteSubtitle((journal.site as any).province || null);
      }
      if (journal.site_id && !cancelled) {
        try {
          const res = await getSiteDetail(journal.site_id);
          if (!cancelled) {
            setSiteName(res?.data?.name || null);
            setSiteType(res?.data?.type || null);
            setSiteSubtitle((res?.data as any)?.province || null);
            const siteImage = pickSiteImage(res?.data);
            if (siteImage) setResolvedCoverUri(siteImage);
          }
        } catch {
          if (!cancelled) setSiteName(null);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [journal]);

  /* ─── Fetch 3D Media ─── */
  useEffect(() => {
    if (!journal?.site_id && !(journal?.site as any)?.id) {
      setModels3d([]);
      return;
    }
    const targetSiteId = journal?.site_id || (journal?.site as any)?.id;
    let cancelled = false;

    (async () => {
      try {
        const res = await getSiteMedia(targetSiteId, { type: "model_3d" });
        if (!cancelled && res.success && res.data) {
          // SiteMediaResponse structure is data.data
          setModels3d((res.data as any).data || []);
        }
      } catch (e) {
        console.error("Error fetching 3D models for journal site:", e);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [journal?.site_id, journal?.site]);

  // subtle entrance animation for the whole card
  useEffect(() => {
    Animated.spring(mountAnim, {
      toValue: 1,
      useNativeDriver: true,
      tension: 50,
      friction: 8,
    }).start();
  }, [mountAnim]);

  // Fade out hints after 5s
  useEffect(() => {
    if (is3dModalVisible) {
      hintOpacity.setValue(1);
      Animated.timing(hintOpacity, {
        toValue: 0,
        duration: 1000,
        delay: 5000,
        useNativeDriver: true,
      }).start();
    }
  }, [is3dModalVisible]);

  const getPrivacyInfo = (privacy: string = "private") => {
    switch (privacy) {
      case "public": return { label: "Công khai", icon: "public" as const };
      case "friends": return { label: "Bạn bè", icon: "people" as const };
      default: return { label: "Chỉ mình tôi", icon: "lock" as const };
    }
  };
  const privacyInfo = getPrivacyInfo(journal?.privacy);

  /* ─── Actions ─── */
  const askDelete = () =>
    hideMenu(async () => {
      const isConfirmed = await showConfirm({
        type: "danger",
        title: t("journal.deleteConfirmTitle"),
        message: t("journal.deleteConfirmMessage"),
        confirmText: t("journal.deleteJournal"),
        cancelText: t("common.cancel"),
      });

      if (isConfirmed) {
        try {
          const r = await deleteJournal(journalId);
          if (r.success) {
            Toast.show({
              type: "success",
              text1: t("common.success"),
              text2: t("journal.deleteSuccess"),
              position: "top",
            });
            navigation.goBack();
          } else {
            Toast.show({
              type: "error",
              text1: t("common.error"),
              text2: t("journal.deleteError"),
              position: "top",
            });
          }
        } catch {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: t("journal.deleteError"),
            position: "top",
          });
        }
      }
    });

  const doShare = () =>
    hideMenu(async () => {
      try {
        await shareJournal(journalId);
        Toast.show({
          type: "success",
          text1: t("journal.shareSuccess"),
          text2: t("journal.shareSuccessMessage"),
          position: "top",
        });
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: e?.message || t("journal.shareError"),
          position: "top",
        });
      }
    });

  /* ─── Audio ─── */
  const toggleAudio = async () => {
    if (!journal?.audio_url) return;
    try {
      if (sound && playing) {
        await sound.pauseAsync();
        setPlaying(false);
        return;
      }
      if (sound && !playing) {
        // Only seek to start if the audio had finished (audioPos was reset to 0)
        const status = await sound.getStatusAsync();
        if (status.isLoaded && status.positionMillis >= (status.durationMillis ?? 1)) {
          await sound.setPositionAsync(0);
        }
        await sound.playAsync();
        setPlaying(true);
        return;
      }
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });
      const { sound: s } = await Audio.Sound.createAsync(
        { uri: journal.audio_url },
        { shouldPlay: true },
        (st) => {
          if (st.isLoaded) {
            setAudioDuration(st.durationMillis || 0);
            if (!isSeekingRef.current) {
              setAudioPos(st.positionMillis || 0);
            }
            if (st.didJustFinish) {
              setPlaying(false);
              setAudioPos(0);
            }
          }
        },
      );
      setSound(s);
      setPlaying(true);
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("journal.audioPlayError"),
        position: "top",
      });
    }
  };
  useEffect(
    () => () => {
      sound?.unloadAsync().catch(() => {});
    },
    [sound],
  );
  useEffect(() => {
    setPlaying(false);
    setAudioDuration(0);
    setAudioPos(0);
    if (sound) {
      sound.unloadAsync().catch(() => {});
      setSound(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [journal?.audio_url]);

  const seekAudio = async (ratio: number) => {
    if (!sound || audioDuration <= 0) return;
    const clampedRatio = Math.max(0, Math.min(1, ratio));
    const posMs = Math.floor(clampedRatio * audioDuration);
    setAudioPos(posMs);
    try {
      await sound.setPositionAsync(posMs);
    } catch {
      // Sound may have been unloaded
    }
  };

  const handleTrackPress = (e: any) => {
    isSeekingRef.current = true;
    const locationX = e.nativeEvent.locationX;
    const w = trackWidthRef.current;
    if (w > 0) {
      seekAudio(locationX / w);
    }
  };

  const handleTrackMove = (e: any) => {
    const locationX = e.nativeEvent.locationX;
    const w = trackWidthRef.current;
    if (w > 0) {
      const ratio = Math.max(0, Math.min(1, locationX / w));
      setAudioPos(Math.floor(ratio * audioDuration));
    }
  };

  const handleTrackRelease = (e: any) => {
    isSeekingRef.current = false;
    const locationX = e.nativeEvent.locationX;
    const w = trackWidthRef.current;
    if (w > 0) {
      seekAudio(locationX / w);
    }
  };

  const fmtMs = (ms: number) => {
    const m = Math.floor(ms / 60000),
      s = Math.floor((ms % 60000) / 1000);
    return `${m}:${s.toString().padStart(2, "0")}`;
  };
  const fmtDate = (d: string) =>
    new Date(d).toLocaleDateString(
      t("common.locale", { defaultValue: "vi-VN" }),
      { day: "numeric", month: "short", year: "numeric" },
    );
  const fmtTime = (d: string) =>
    new Date(d).toLocaleTimeString(
      t("common.locale", { defaultValue: "vi-VN" }),
      { hour: "2-digit", minute: "2-digit" },
    );

  /* ─── Guards ─── */
  if (loading) {
    return (
      <ImageBackground
        source={require("../../../../../assets/images/journal-bg.png")}
        style={s.root}
        resizeMode="cover"
      >
        <StatusBar barStyle="dark-content" />
        <View style={[s.center, { paddingTop: insets.top + 80 }]}>
          <Text style={{ color: COLORS.textSecondary }}>
            {t("journal.loading")}
          </Text>
        </View>
      </ImageBackground>
    );
  }
  if (!journal) {
    return (
      <ImageBackground
        source={require("../../../../../assets/images/journal-bg.png")}
        style={s.root}
        resizeMode="cover"
      >
        <StatusBar barStyle="dark-content" />
        <View style={[s.center, { paddingTop: insets.top + 80 }]}>
          <Text style={{ marginBottom: 16, color: COLORS.textPrimary }}>
            {t("journal.notFound")}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: COLORS.accent, fontWeight: "600" }}>
              ← {t("journal.back")}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  const images = normalizeImageUrls(journal.image_url);
  const coverUri = images[0] || resolvedCoverUri;
  const authorName =
    journal.author?.full_name || user?.fullName || t("journal.pilgrimRole");
  const avatarUri = journal.author?.avatar_url || user?.avatar;
  const audioProgress = audioDuration > 0 ? audioPos / audioDuration : 0;
  const mediaCount = [
    images.length > 0 && `📷 ${t("journal.imagesLabel")} (${images.length})`,
    journal.video_url && `🎥 ${t("journal.videoLabel")} (1)`,
    journal.audio_url && `🎧 ${t("journal.audioLabel")} (1)`,
  ]
    .filter(Boolean)
    .join("  ·  ");

  const getSacredTypeInfo = (type: SiteType | null) => {
    switch (type) {
      case 'church': return { label: 'NHÀ THỜ', icon: 'church' as const };
      case 'shrine': return { label: 'ĐỀN THÁNH', icon: 'place' as const };
      case 'monastery': return { label: 'TU VIỆN', icon: 'account-balance' as const };
      case 'center': return { label: 'TRUNG TÂM', icon: 'business' as const };
      default: return { label: 'ĐỊA ĐIỂM', icon: 'church' as const };
    }
  };

  const sacredInfo = getSacredTypeInfo(siteType);

  return (
    <>
      <ImageBackground
        source={require("../../../../../assets/images/journal-bg.png")}
        style={s.root}
        resizeMode="cover"
      >
        <StatusBar
          barStyle="dark-content"
          translucent
          backgroundColor="transparent"
        />

        {/* ── Floating Header ── */}
        <View style={[s.header, { paddingTop: insets.top + 10 }]}>
          <TouchableOpacity
            style={s.headerBtn}
            onPress={() => navigation.goBack()}
          >
            <MaterialIcons
              name="arrow-back"
              size={22}
              color={COLORS.textPrimary}
            />
            <Text style={s.headerBtnLabel}>{t("journal.back")}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.headerIconBtn} onPress={showMenu}>
            <MaterialIcons
              name="more-horiz"
              size={22}
              color={COLORS.textPrimary}
            />
          </TouchableOpacity>
        </View>

        <ScrollView
          contentContainerStyle={{
            paddingTop: insets.top + 68,
            paddingBottom: insets.bottom + 40,
            paddingHorizontal: SPACING.lg,
          }}
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={[
              s.notebookWrapper,
              {
                opacity: mountAnim,
                transform: [
                  {
                    translateY: mountAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [6, 0],
                    }),
                  },
                  {
                    scale: mountAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [0.992, 1],
                    }),
                  },
                ],
              },
            ]}
          >
            <View style={s.bindingContainer} pointerEvents="none">
              {Array.from({ length: 8 }).map((_, idx) => (
                <View key={`detail-ring-${idx}`} style={s.ringHole}>
                  <View style={s.ironRing} />
                  <View style={s.ironRingHighlight} />
                </View>
              ))}
            </View>

            <View style={s.cardStackBack} pointerEvents="none" />
            <View style={s.card}>
              <LinearGradient
                pointerEvents="none"
                colors={["rgba(255,255,255,0.30)", "rgba(255,255,255,0)"]}
                style={s.innerTopShadow}
              />
              <View style={s.notebookInnerBorder} pointerEvents="none" />
              <View style={s.pageMarginLine} pointerEvents="none" />
              <Text style={s.notebookHeader}>
                {t("journal.cardHeader", {
                  defaultValue: t("journal.screenTitle").toUpperCase(),
                })}
              </Text>
              {/* Location section */}
              <View style={s.locationSection}>
                <MaterialIcons
                  name="location-on"
                  size={16}
                  color={COLORS.accent}
                  style={{ marginTop: 1 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={s.locationName} numberOfLines={2}>
                    {siteName || t("journal.unknownLocation")}
                  </Text>
                  {siteSubtitle && (
                    <Text style={s.locationSub}>{siteSubtitle}</Text>
                  )}
                </View>
              </View>

              {/* Cover Image — full width inside card */}
              <View style={s.coverWrap}>
                {coverUri ? (
                  <Image
                    source={{ uri: coverUri }}
                    style={s.coverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <LinearGradient
                    colors={["#1a2a3a", "#2c4a6e", "#1a3a5e"]}
                    style={s.coverPlaceholder}
                  >
                    <MaterialIcons
                      name="auto-stories"
                      size={48}
                      color="rgba(255,255,255,0.4)"
                    />
                  </LinearGradient>
                )}

                {/* 3D Model Trigger Overlay */}
                {models3d.length > 0 && (
                  <TouchableOpacity
                    style={s.threeDTrigger}
                    activeOpacity={0.8}
                    onPress={() => {
                      setSelectedModelIndex(0);
                      setIs3dModalVisible(true);
                    }}
                  >
                    <LinearGradient
                      colors={["rgba(212,175,55,0.95)", "rgba(184,134,11,0.95)"]}
                      style={s.threeDGlow}
                    >
                      <MaterialIcons name="3d-rotation" size={24} color="#1A2845" />
                      <Text style={s.threeDLabel}>{t('siteModels3d.title', { defaultValue: 'Xem 3D' })}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                )}

                <LinearGradient
                  colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.28)"]}
                  style={s.coverOverlay}
                  pointerEvents="none"
                />
              </View>

              {/* Card Body */}
              <View style={s.cardBody}>
                {/* Author Row */}
                <View style={s.authorRow}>
                  <View style={s.authorLeft}>
                    {avatarUri ? (
                      <Image source={{ uri: avatarUri }} style={s.avatar} />
                    ) : (
                      <View style={[s.avatar, s.avatarFallback]}>
                        <MaterialIcons
                          name="person"
                          size={18}
                          color={COLORS.textSecondary}
                        />
                      </View>
                    )}
                    <View>
                      <Text style={s.authorName}>{authorName}</Text>
                      <Text style={s.authorRole}>
                        {t("journal.pilgrimRole")}
                      </Text>
                    </View>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={s.dateText}>
                      {fmtDate(journal.created_at)}
                    </Text>
                    <Text style={s.timeText}>
                      {fmtTime(journal.created_at)}
                    </Text>
                  </View>
                </View>

                {/* Title */}
                <View style={s.titleWrap}>
                  <Text style={s.quoteGhost}>“</Text>
                  <LinearGradient
                    pointerEvents="none"
                    colors={[
                      "rgba(218,184,121,0.26)",
                      "rgba(218,184,121,0.06)",
                      "rgba(218,184,121,0)",
                    ]}
                    start={{ x: 0, y: 0.5 }}
                    end={{ x: 1, y: 0.5 }}
                    style={s.titleBrush}
                  />
                  <Text style={s.title}>{`"${journal.title}"`}</Text>
                </View>

                {/* Divider with ornament */}
                <View style={s.ornamentRow}>
                  <View style={s.ornamentLine} />
                  <MaterialIcons name="add" size={16} color="rgba(0,0,0,0.2)" />
                  <View style={s.ornamentLine} />
                </View>

                {/* NỘI DUNG */}
                <View style={s.sectionLabelRow}>
                  <MaterialIcons
                    name="menu-book"
                    size={14}
                    color={COLORS.accent}
                  />
                  <Text style={s.sectionLabel}>
                    {t("journal.contentLabel")}
                  </Text>
                </View>
                <View style={s.notebookContentArea}>
                  <View style={s.leftMarginLine} />
                  <View pointerEvents="none" style={s.ruledLinesContainer}>
                    {Array.from({ length: 7 }).map((_, idx) => (
                      <View key={`detail-rule-${idx}`} style={s.ruleLine} />
                    ))}
                  </View>
                  <Text style={s.content}>{journal.content}</Text>
                </View>

                {/* Media summary pill row */}
                {mediaCount.length > 0 && (
                  <View style={s.mediaSummaryRow}>
                    {images.length > 0 && (
                      <View style={s.mediaPill}>
                        <MaterialIcons
                          name="photo-camera"
                          size={12}
                          color={COLORS.accent}
                        />
                        <Text style={s.mediaPillText}>
                          {t("journal.imagesLabel")} ({images.length})
                        </Text>
                      </View>
                    )}
                    {journal.video_url && (
                      <View style={s.mediaPill}>
                        <MaterialIcons
                          name="videocam"
                          size={12}
                          color={COLORS.accent}
                        />
                        <Text style={s.mediaPillText}>
                          {t("journal.videoLabel")} (1)
                        </Text>
                      </View>
                    )}
                    {journal.audio_url && (
                      <View style={s.mediaPill}>
                        <MaterialIcons
                          name="headset"
                          size={12}
                          color={COLORS.accent}
                        />
                        <Text style={s.mediaPillText}>
                          {t("journal.audioLabel")} (1)
                        </Text>
                      </View>
                    )}
                  </View>
                )}

                {/* Images grid */}
                {images.length > 0 && (
                  <>
                    <View style={s.mediaDivider} />
                    <View style={s.sectionLabelRow}>
                      <MaterialIcons
                        name="photo-camera"
                        size={14}
                        color={COLORS.accent}
                      />
                      <Text style={s.sectionLabel}>
                        {t("journal.imagesLabel")}
                      </Text>
                    </View>
                    <View style={s.imageGrid}>
                      {images.map((uri, idx) => (
                        <View key={idx} style={s.imageThumb}>
                          <Image
                            source={{ uri }}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                          />
                          {/* Video play overlay on last thumb if video exists */}
                          {journal.video_url && idx === images.length - 1 && (
                            <View style={s.videoThumbOverlay}>
                              <MaterialIcons
                                name="play-circle-filled"
                                size={28}
                                color="rgba(255,255,255,0.9)"
                              />
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
                      <MaterialIcons
                        name="videocam"
                        size={14}
                        color={COLORS.accent}
                      />
                      <Text style={s.sectionLabel}>
                        {t("journal.videoLabel")}
                      </Text>
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
                      <MaterialIcons
                        name="headset"
                        size={14}
                        color={COLORS.accent}
                      />
                      <Text style={s.sectionLabel}>
                        {t("journal.audioLabel")}
                      </Text>
                    </View>
                    <View style={s.audioPlayer}>
                      <TouchableOpacity
                        style={[
                          s.audioPlayBtn,
                          playing && s.audioPlayBtnActive,
                        ]}
                        onPress={toggleAudio}
                      >
                        <MaterialIcons
                          name={playing ? "pause" : "play-arrow"}
                          size={26}
                          color="#fff"
                        />
                      </TouchableOpacity>
                      <View style={{ flex: 1 }}>
                        <View style={s.audioTimeRow}>
                          <Text style={s.audioTime}>{fmtMs(audioPos)}</Text>
                          <Text style={s.audioTime}>
                            {audioDuration > 0 ? fmtMs(audioDuration) : "--:--"}
                          </Text>
                        </View>
                        <View
                          style={s.progressTouchArea}
                          onLayout={(e) => {
                            trackWidthRef.current = e.nativeEvent.layout.width;
                          }}
                          onStartShouldSetResponder={() => true}
                          onMoveShouldSetResponder={() => true}
                          onResponderGrant={(e) => {
                            handleTrackPress(e);
                          }}
                          onResponderMove={handleTrackMove}
                          onResponderRelease={handleTrackRelease}
                          onResponderTerminate={() => { isSeekingRef.current = false; }}
                        >
                          <View style={s.progressTrack}>
                            <View
                              style={[
                                s.progressFill,
                                { width: `${audioProgress * 100}%` },
                              ]}
                            />
                            <View
                              style={[
                                s.progressThumb,
                                { left: `${audioProgress * 100}%` },
                              ]}
                            />
                          </View>
                        </View>
                      </View>
                    </View>
                  </>
                )}
              </View>
            </View>
          </Animated.View>
        </ScrollView>
      </ImageBackground>

      {/* ── Action Sheet Modal ── */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="none"
        onRequestClose={() => hideMenu()}
      >
        <TouchableWithoutFeedback onPress={() => hideMenu()}>
          <View style={s.backdrop} />
        </TouchableWithoutFeedback>
        <Animated.View
          style={[s.actionSheet, { transform: [{ translateY: slideAnim }] }]}
        >
          <SafeAreaView edges={["bottom"]} style={s.actionSheetSafeArea}>
            <View style={s.sheetHandle} />
            <View style={s.sheetHeader}>
              <Text style={s.sheetTitle}>{t("journal.menuTitle")}</Text>
              {journal?.title && (
                <Text
                  style={s.sheetSubtitle}
                  numberOfLines={2}
                >{`"${journal.title}"`}</Text>
              )}
            </View>
            <View style={s.sheetDivider} />
            <TouchableOpacity
              style={s.sheetAction}
              onPress={() =>
                hideMenu(() =>
                  navigation.navigate("CreateJournalScreen", { journalId }),
                )
              }
            >
              <View style={[s.sheetActionIcon, s.sheetIconEdit]}>
                <MaterialIcons name="edit" size={21} color={COLORS.primary} />
              </View>
              <Text style={[s.sheetActionLabel, s.sheetActionLabelEdit]}>
                {t("journal.editJournal")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetAction} onPress={doShare}>
              <View style={[s.sheetActionIcon, s.sheetIconShare]}>
                <MaterialIcons name="public" size={21} color={COLORS.info} />
              </View>
              <Text style={[s.sheetActionLabel, s.sheetActionLabelShare]}>
                {t("journal.shareJournal")}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.sheetAction} onPress={askDelete}>
              <View style={[s.sheetActionIcon, s.sheetIconDanger]}>
                <MaterialIcons
                  name="delete-outline"
                  size={20}
                  color={COLORS.danger}
                />
              </View>
              <Text style={[s.sheetActionLabel, { color: COLORS.danger }]}>
                {t("journal.deleteJournal")}
              </Text>
            </TouchableOpacity>
            <View style={s.sheetDivider} />
            <TouchableOpacity style={s.sheetCancel} onPress={() => hideMenu()}>
              <Text style={s.sheetCancelText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
          </SafeAreaView>
        </Animated.View>
      </Modal>

      {/* 3D Model Viewer Modal */}
      <Modal
        visible={is3dModalVisible}
        animationType="fade"
        onRequestClose={() => setIs3dModalVisible(false)}
        transparent={false}
      >
        <LinearGradient
          colors={["#2c1f12", "#120d08"]}
          style={s.modalFullContainer}
        >
          <StatusBar barStyle="light-content" />
          
          {/* Sacred Header Overlay */}
          <View style={s.sacredHeader}>
            <TouchableOpacity 
              style={s.sacredCloseBtn} 
              onPress={() => setIs3dModalVisible(false)}
            >
              <MaterialIcons name="close" size={24} color="rgba(255,255,255,0.6)" />
            </TouchableOpacity>

            <View style={s.sacredTitleWrap}>
              <MaterialIcons name={sacredInfo.icon} size={20} color={COLORS.accent} style={{ marginBottom: 4 }} />
              <Text style={s.sacredSubTitle}>{sacredInfo.label}</Text>
              <Text style={s.sacredMainTitle}>{journal?.site?.name || siteName}</Text>
              <View style={s.sacredTitleDivider}>
                <View style={s.sacredDiamond} />
              </View>
            </View>

            <View style={s.sacredHeaderRight}>
              <TouchableOpacity 
                style={[s.privacyBadge, isJournalUiVisible && { backgroundColor: COLORS.accent }]} 
                onPress={() => setIsJournalUiVisible(!isJournalUiVisible)}
              >
                <MaterialCommunityIcons 
                  name={isJournalUiVisible ? "book-open-variant" : "book-outline"} 
                  size={16} 
                  color={isJournalUiVisible ? "#1A2845" : "#1A2845"} 
                />
                <Text style={s.privacyBadgeText}>
                  {isJournalUiVisible ? "Ẩn nhật ký" : "Mở nhật ký"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {models3d && models3d.length > 1 && (
            <View style={s.modelPickerRow}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.modelPickerContent}>
                {models3d.map((m, idx) => (
                  <TouchableOpacity
                    key={m.id}
                    onPress={() => setSelectedModelIndex(idx)}
                    style={[
                      s.modelChip,
                      selectedModelIndex === idx && s.modelChipActive
                    ]}
                  >
                    <Text style={[
                      s.modelChipText,
                      selectedModelIndex === idx && s.modelChipTextActive
                    ]}>
                      {m.code || t('siteModels3d.modelIndex', { index: idx + 1, defaultValue: `Mô hình ${idx + 1}` })}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          <View style={[
            s.modelViewerContainer, 
            isJournalUiVisible && { marginBottom: 200 }
          ]}>
            {/* Spotlight & Pedestal effect behind/under model */}
            <View style={s.modelStageContainer}>
              <View style={s.modelSpotlight} />
              <View style={s.modelPedestal} />
            </View>

            {models3d && models3d[selectedModelIndex] && (
              <ModelViewerWebView 
                modelUrl={models3d[selectedModelIndex].url} 
                fullscreen 
              />
            )}

            {/* Fading Interaction Hints */}
            <Animated.View style={[s.interactionHint, { opacity: hintOpacity }]}>
              <MaterialIcons name="touch-app" size={14} color="rgba(255,255,255,0.3)" />
              <Text style={s.interactionHintText}>Kéo để xoay • Chạm để tương tác</Text>
            </Animated.View>
          </View>

          {/* Back-link to current journal reflection - Header button now controls expansion directly */}
          <SiteModelJournalOverlay
            siteId={journal?.site_id || (journal?.site as any)?.id}
            siteName={siteName || journal?.site?.name}
            siteCoverImage={coverUri || undefined}
            navigation={navigation}
            bottomInset={insets.bottom}
            currentMedia={models3d ? models3d[selectedModelIndex] : undefined}
            isExpanded={isJournalUiVisible}
            onToggleExpanded={setIsJournalUiVisible}
          />
        </LinearGradient>
      </Modal>

      <ConfirmModal />
    </>
  );
}

/* ─────────── Styles ─────────── */
const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f5f0ea" },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },

  /* Header */
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: 10,
    backgroundColor: "rgba(245,240,234,0.96)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.06)",
  },
  headerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingRight: 8,
  },
  headerBtnLabel: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  headerIconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "rgba(0,0,0,0.07)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* ══ MAIN CARD ══ */
  notebookWrapper: {
    position: "relative",
    marginBottom: 16,
    paddingLeft: 2,
  },
  cardStackBack: {
    position: "absolute",
    left: 12,
    right: 0,
    top: 6,
    bottom: 6,
    borderRadius: 14,
    backgroundColor: "rgba(235, 225, 205, 0.75)",
    borderWidth: 1,
    borderColor: "rgba(185,170,139,0.45)",
    zIndex: 0,
  },
  bindingContainer: {
    position: "absolute",
    left: 8,
    top: 16,
    bottom: 16,
    justifyContent: "space-between",
    width: 14,
    zIndex: 10,
  },
  ringHole: {
    width: 12,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#d1c7b7",
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 0,
  },
  ironRing: {
    width: 16,
    height: 4,
    borderRadius: 2,
    backgroundColor: "#5d5d5d",
    position: "absolute",
    left: -4,
    borderTopWidth: 1,
    borderTopColor: "#999",
    borderBottomWidth: 1.5,
    borderBottomColor: "#333",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.4,
    shadowRadius: 1,
    elevation: 3,
  },
  ironRingHighlight: {
    position: "absolute",
    top: 0,
    left: -3,
    right: -2,
    height: 1,
    backgroundColor: "rgba(255,255,255,0.42)",
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  card: {
    backgroundColor: "#fffcf5",
    borderRadius: 14,
    borderWidth: 1.4,
    borderColor: "#b9aa8b",
    overflow: "hidden",
    ...SHADOWS.medium,
    shadowColor: "rgba(0,0,0,0.10)",
    marginBottom: 0,
    marginLeft: 8,
    position: "relative",
    zIndex: 2,
  },
  notebookInnerBorder: {
    position: "absolute",
    left: 5,
    right: 5,
    top: 5,
    bottom: 5,
    borderWidth: 1,
    borderColor: "#ece2cf",
    borderRadius: 10,
  },
  pageMarginLine: {
    position: "absolute",
    left: 14,
    top: 6,
    bottom: 6,
    width: 1,
    backgroundColor: "rgba(201, 178, 141, 0.5)",
  },
  innerTopShadow: {
    position: "absolute",
    left: 6,
    right: 6,
    top: 6,
    height: 14,
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    overflow: "hidden",
  },
  notebookHeader: {
    fontSize: 18,
    fontWeight: "800",
    color: "#4a3e35",
    letterSpacing: 1.2,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: "#dcd1bb",
    textShadowColor: "rgba(0,0,0,0.06)",
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },

  /* Location inside card */
  locationSection: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#e6dccb",
  },
  locationName: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 19,
  },
  locationSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "500",
  },

  /* Cover image */
  coverWrap: {
    position: "relative",
    width: "100%",
    height: 210,
    overflow: "hidden",
  },
  coverImage: { width: "100%", height: 210 },
  coverOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 95,
  },
  coverPlaceholder: {
    width: "100%",
    height: 210,
    justifyContent: "center",
    alignItems: "center",
  },

  /* Card body (padded) */
  cardBody: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 20 },

  /* Author */
  authorRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  authorLeft: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: "rgba(236,182,19,0.25)",
  },
  avatarFallback: {
    backgroundColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  authorName: { fontSize: 14, fontWeight: "700", color: COLORS.textPrimary },
  authorRole: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: "600",
    marginTop: 1,
  },
  dateText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textPrimary,
    textAlign: "right",
  },
  timeText: {
    fontSize: 11,
    color: COLORS.textSecondary,
    textAlign: "right",
    marginTop: 2,
  },

  /* Title */
  title: {
    fontFamily: FONT_DISPLAY,
    fontSize: 22,
    fontWeight: "700",
    color: "#3f352b",
    lineHeight: 30,
    marginBottom: 16,
    zIndex: 2,
  },
  titleWrap: {
    position: "relative",
    marginBottom: 2,
    paddingBottom: 4,
  },
  titleBrush: {
    position: "absolute",
    left: 2,
    right: "26%",
    bottom: 8,
    height: 9,
    borderRadius: 8,
    transform: [{ rotate: "-1.2deg" }],
    zIndex: 1,
  },
  quoteGhost: {
    position: "absolute",
    left: -6,
    top: -18,
    fontSize: 58,
    lineHeight: 58,
    color: "rgba(170, 136, 90, 0.24)",
    fontFamily: FONT_DISPLAY,
    zIndex: 1,
  },

  /* Ornament divider */
  ornamentRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  ornamentLine: { flex: 1, height: 1, backgroundColor: "rgba(0,0,0,0.08)" },

  /* Section label */
  sectionLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 1.2,
  },

  /* Content */
  notebookContentArea: {
    position: "relative",
    paddingLeft: 12,
    paddingTop: 2,
    minHeight: 150,
    marginBottom: 8,
    paddingRight: 10,
    overflow: "hidden",
  },
  leftMarginLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 2,
    width: 1.2,
    backgroundColor: "rgba(212, 120, 100, 0.45)",
  },
  ruledLinesContainer: {
    ...StyleSheet.absoluteFillObject,
    left: 8,
    right: 10,
    top: 2,
    bottom: 2,
    justifyContent: "space-around",
    opacity: 0.35,
  },
  ruleLine: {
    borderBottomWidth: 1,
    borderBottomColor: "#eeeadd",
    height: 30,
  },
  content: {
    fontSize: 15,
    lineHeight: 34,
    color: COLORS.textPrimary,
    opacity: 0.87,
    marginBottom: 4,
    zIndex: 2,
  },

  /* Media summary pills */
  mediaSummaryRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 4,
  },
  mediaPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(236,182,19,0.1)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "rgba(236,182,19,0.2)",
  },
  mediaPillText: { fontSize: 11, fontWeight: "700", color: COLORS.textPrimary },

  /* Media divider */
  mediaDivider: {
    height: 1,
    backgroundColor: "rgba(0,0,0,0.07)",
    marginVertical: 16,
  },

  /* Image grid */
  imageGrid: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  imageThumb: {
    width: (CARD_W - 32 - 12) / 3,
    height: (CARD_W - 32 - 12) / 3,
    borderRadius: 10,
    overflow: "hidden",
    backgroundColor: "rgba(0,0,0,0.06)",
  },
  videoThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Video card (no image fallback) */
  videoCard: {
    height: 160,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#111",
    justifyContent: "center",
    alignItems: "center",
  },
  videoPlayBtn: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.2)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  /* Audio */
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    backgroundColor: "rgba(0,0,0,0.03)",
    borderRadius: 14,
    padding: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  audioPlayBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.subtle,
    shadowColor: COLORS.accent,
  },
  audioPlayBtnActive: { backgroundColor: "#b89400" },
  audioTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  audioTime: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
    fontFamily: Platform.OS === "ios" ? "Courier New" : "monospace",
  },
  progressTouchArea: {
    paddingVertical: 12,
    marginVertical: -8,
    cursor: "pointer" as any,
  },
  progressTrack: {
    height: 4,
    backgroundColor: "rgba(0,0,0,0.1)",
    borderRadius: 2,
    position: "relative",
    overflow: "visible",
  },
  progressFill: {
    height: "100%",
    backgroundColor: COLORS.accent,
    borderRadius: 2,
  },
  progressThumb: {
    position: "absolute",
    top: -4,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: COLORS.accent,
    marginLeft: -6,
    ...SHADOWS.subtle,
  },

  /* Video */
  videoPreviewCard: {
    width: "100%",
    height: 220,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#000",
    ...SHADOWS.small,
    marginBottom: 8,
  },
  videoPlayer: {
    width: "100%",
    height: "100%",
  },
  /* Action Sheet */
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  actionSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    overflow: "hidden",
    ...SHADOWS.medium,
  },
  actionSheetSafeArea: {
    backgroundColor: "#fff",
    paddingBottom: 16,
  },
  sheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(0,0,0,0.15)",
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 4,
  },
  sheetHeader: { paddingHorizontal: 20, paddingVertical: 16 },
  sheetTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sheetSubtitle: { fontSize: 13, color: COLORS.textSecondary, lineHeight: 18 },
  sheetDivider: { height: 1, backgroundColor: "rgba(0,0,0,0.07)" },
  sheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  sheetActionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.05)",
    justifyContent: "center",
    alignItems: "center",
  },
  sheetIconEdit: {
    backgroundColor: "rgba(26,40,69,0.20)",
    borderWidth: 1,
    borderColor: "rgba(26,40,69,0.28)",
  },
  sheetIconShare: {
    backgroundColor: "rgba(24,144,255,0.22)",
    borderWidth: 1,
    borderColor: "rgba(24,144,255,0.30)",
  },
  sheetIconDanger: {
    backgroundColor: "rgba(220,76,76,0.14)",
    borderWidth: 1,
    borderColor: "rgba(220,76,76,0.25)",
  },
  sheetActionLabel: {
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  sheetActionLabelEdit: { color: COLORS.primary },
  sheetActionLabelShare: { color: COLORS.info },
  sheetCancel: {
    marginHorizontal: 16,
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 14,
    backgroundColor: "rgba(0,0,0,0.05)",
    alignItems: "center",
  },
  sheetCancelText: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // 3D Model Styles
  threeDTrigger: {
    position: 'absolute',
    bottom: SPACING.md,
    right: SPACING.md,
    ...SHADOWS.medium,
  },
  threeDGlow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.4)',
  },
  threeDLabel: {
    fontSize: 13,
    fontWeight: '800',
    color: '#1A2845',
    letterSpacing: 0.5,
    textTransform: 'uppercase',
  },
  modalFullContainer: {
    flex: 1,
  },
  sacredHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: SPACING.xl,
    paddingHorizontal: SPACING.md,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sacredCloseBtn: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  sacredTitleWrap: {
    flex: 1,
    alignItems: 'center',
    paddingTop: 8,
  },
  sacredSubTitle: {
    fontSize: 12,
    color: COLORS.accent,
    fontWeight: '600',
    letterSpacing: 4,
    marginBottom: 4,
    opacity: 0.8,
  },
  sacredMainTitle: {
    fontSize: 22,
    color: '#fff',
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  sacredTitleDivider: {
    marginTop: 12,
    width: 80,
    height: 1,
    backgroundColor: 'rgba(236,182,19,0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sacredDiamond: {
    width: 6,
    height: 6,
    backgroundColor: COLORS.accent,
    transform: [{ rotate: '45deg' }],
  },
  sacredHeaderRight: {
    width: 80,
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  privacyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: COLORS.accent,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  privacyBadgeText: {
    fontSize: 9,
    fontWeight: '700',
    color: '#1A2845',
  },
  modelViewerContainer: {
    flex: 1,
    position: 'relative',
    marginTop: 80,
    marginBottom: 200, 
  },
  modelStageContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modelSpotlight: {
    position: 'absolute',
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: 'rgba(236,182,19,0.03)', // softer
    zIndex: 0,
  },
  modelPedestal: {
    position: 'absolute',
    bottom: '25%', // base of the model
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: 'rgba(236,182,19,0.02)', // softer
    borderWidth: 1,
    borderColor: 'rgba(236,182,19,0.08)', // softer
    transform: [{ scaleY: 0.35 }], // Perspective effect
    zIndex: 0,
  },
  interactionHint: {
    position: 'absolute',
    bottom: 240, // above narrative panel
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  interactionHintText: {
    fontSize: 11,
    color: 'rgba(255,255,255,0.3)', // softer
    fontWeight: '500',
  },
  narrativePanelOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    zIndex: 10,
  },
  modelPickerRow: {
    marginTop: 150, // below header icons
    paddingVertical: SPACING.sm,
    zIndex: 101,
  },
  modelPickerContent: {
    paddingHorizontal: SPACING.md,
    gap: 8,
  },
  modelChip: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    backgroundColor: "rgba(0,0,0,0.4)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  modelChipActive: {
    backgroundColor: COLORS.accent,
    borderColor: COLORS.accent,
  },
  modelChipText: {
    fontSize: 11,
    fontWeight: "600",
    color: "rgba(255,255,255,0.6)",
  },
  modelChipTextActive: {
    color: '#1A2845',
  },
});
