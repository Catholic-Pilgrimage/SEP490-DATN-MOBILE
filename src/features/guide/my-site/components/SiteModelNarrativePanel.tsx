/**
 * Panel thuyết minh âm thanh cho `model_3d` — thu gọn/mở rộng, tab TTS vs upload,
 * đếm ký tự, auto-poll khi `processing`, cleanup âm thanh khi unmount.
 *
 * Flow trạng thái (backend): null → processing → pending → approved | rejected → …
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Keyboard,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { GUIDE_SPACING } from "../../../../constants/guide.constants";
import { GUIDE_KEYS } from "../../../../constants/queryKeys";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  deleteModelNarrative,
  getTtsVoices,
  updateModelNarrative,
} from "../../../../services/api/guide/narrativeApi";
import type { MediaItem, MediaNarrativeStatus, TtsVoiceOption } from "../../../../types/guide";
import {
  formatGuideReviewDateTime,
  getGuideReviewerEmail,
  getGuideReviewerName,
} from "../../utils/reviewTracking";
import { PREMIUM_COLORS } from "../constants";

const AUDIO_MIME = [
  "audio/mpeg",
  "audio/mp3",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/m4a",
] as const;

const TTS_MAX = 5000;
const TTS_WARN = 4000;
const TTS_DANGER = 4800;

function narrativeStatusLabel(
  status: MediaNarrativeStatus | null | undefined,
  t: (k: string) => string,
): string {
  switch (status) {
    case "pending":
      return t("siteModels3d.narrativeStatusPending");
    case "approved":
      return t("siteModels3d.narrativeStatusApproved");
    case "rejected":
      return t("siteModels3d.narrativeStatusRejected");
    case "processing":
      return t("siteModels3d.narrativeStatusProcessing");
    default:
      return t("siteModels3d.narrativeStatusNone");
  }
}

function charCountColor(len: number) {
  if (len >= TTS_DANGER) return "#f87171";
  if (len >= TTS_WARN) return PREMIUM_COLORS.gold;
  return "rgba(255,255,255,0.45)";
}

export interface SiteModelNarrativePanelProps {
  media: MediaItem;
  bottomInset: number;
  onRefreshModels?: () => void;
}

type EditTab = "tts" | "upload";

export const SiteModelNarrativePanel: React.FC<SiteModelNarrativePanelProps> = ({
  media,
  bottomInset,
  onRefreshModels,
}) => {
  const { t, i18n } = useTranslation();
  const { confirm, ConfirmModal } = useConfirm();
  const { height: windowH } = useWindowDimensions();
  const queryClient = useQueryClient();

  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);

  /** Demo preview trong voice modal */
  const demoSoundRef = useRef<Audio.Sound | null>(null);
  const [playingDemoId, setPlayingDemoId] = useState<string | null>(null);

  /** Ref ScrollView để cuộn khi bàn phím hiện */
  const scrollRef = useRef<import("react-native").ScrollView>(null);

  /** Theo dõi chiều cao bàn phím để điều chỉnh maxHeight panel */
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => setKeyboardHeight(e.endCoordinates.height),
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => setKeyboardHeight(0),
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const [expanded, setExpanded] = useState(false);
  const [editTab, setEditTab] = useState<EditTab>("tts");
  const [ttsText, setTtsText] = useState(media.narration_text ?? "");
  const [uploadNote, setUploadNote] = useState(media.narration_text ?? "");
  const [voiceModalVisible, setVoiceModalVisible] = useState(false);
  const [selectedVoiceId, setSelectedVoiceId] = useState<string | undefined>(
    undefined,
  );

  const narrativeStatus = media.narrative_status ?? null;
  const canEdit = narrativeStatus !== "approved";
  const reviewLocale = i18n.language?.startsWith("en") ? "en-US" : "vi-VN";
  const narrativeReviewerName = getGuideReviewerName(
    media.narrativeReviewer,
    media.narrative_reviewed_by,
  );
  const narrativeReviewerEmail = getGuideReviewerEmail(media.narrativeReviewer);
  const narrativeReviewedAtLabel = formatGuideReviewDateTime(
    media.narrative_reviewed_at,
    reviewLocale,
  );
  const canDelete = narrativeStatus != null && narrativeStatus !== "approved";

  const expandedMaxHeight = Math.min(384, Math.round(windowH * 0.52));

  useEffect(() => {
    setTtsText(media.narration_text ?? "");
    setUploadNote(media.narration_text ?? "");
    setSelectedVoiceId(undefined);
  }, [media.id, media.narration_text]);

  /** Unmount: luôn dừng & unload âm thanh (tránh phát nền sau khi rời màn). */
  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
      void demoSoundRef.current?.unloadAsync();
      demoSoundRef.current = null;
    };
  }, []);

  useEffect(() => {
    void soundRef.current?.unloadAsync();
    soundRef.current = null;
    setIsPlaying(false);
  }, [media.id]);

  /** TTS processing: poll 5s + refetch danh sách mô hình. */
  useEffect(() => {
    if (narrativeStatus !== "processing" || !onRefreshModels) return;
    const id = setInterval(() => {
      onRefreshModels();
    }, 5000);
    return () => clearInterval(id);
  }, [narrativeStatus, onRefreshModels, media.id]);

  const { data: voices = [], isLoading: voicesLoading } = useQuery({
    queryKey: GUIDE_KEYS.narrativeTtsVoices(),
    queryFn: async () => {
      const res = await getTtsVoices();
      if (!res.success) throw new Error(res.message || "voices");
      return res.data ?? [];
    },
    staleTime: 1000 * 60 * 10,
  });

  const selectedVoiceName = useMemo(() => {
    if (!selectedVoiceId) return null;
    return voices.find((v) => v.id === selectedVoiceId)?.name ?? selectedVoiceId;
  }, [selectedVoiceId, voices]);

  /**
   * Nh\u00f3m gi\u1ecdng theo ng\u00f4n ng\u1eef \u2192 v\u00f9ng mi\u1ec1n.
   * Chu\u1ea9n h\u00f3a c\u00e1c gi\u00e1 tr\u1ecb unknown / tr\u1ed1ng th\u00e0nh nh\u00e3n hi\u1ec3n th\u1ecb \u0111\u1eb9p h\u01a1n.
   */
  const voiceSections = useMemo(() => {
    /** Hi\u1ec3n th\u1ecb language: "vi" \u2192 "VI", "en" \u2192 "EN", kh\u00e1c \u2192 in hoa */
    const normLang = (raw: string | undefined | null): string => {
      const v = (raw ?? "").trim().toLowerCase();
      if (!v || v === "unknown") return "Kh\u00e1c";
      return v;
    };
    /** Hi\u1ec3n th\u1ecb v\u00f9ng: gi\u1eef nguy\u00ean, n\u1ebfu tr\u1ed1ng / unknown \u2192 "Kh\u00e1c" */
    const normRegion = (raw: string | undefined | null): string => {
      const v = (raw ?? "").trim();
      if (!v || v.toLowerCase() === "unknown") return "Kh\u00e1c";
      return v;
    };

    const byLang = new Map<string, Map<string, TtsVoiceOption[]>>();
    for (const voice of voices) {
      const lang = normLang(voice.language);
      const region = normRegion(voice.region);
      if (!byLang.has(lang)) byLang.set(lang, new Map());
      const byRegion = byLang.get(lang)!;
      if (!byRegion.has(region)) byRegion.set(region, []);
      byRegion.get(region)!.push(voice);
    }

    const sections: { lang: string; region: string; data: TtsVoiceOption[] }[] = [];
    // S\u1eafp x\u1ebfp language: vi tr\u01b0\u1edbc, en sau, "Kh\u00e1c" cu\u1ed1i
    const langOrder = ["vi", "en"];
    const sortedLangs = [
      ...langOrder.filter((l) => byLang.has(l)),
      ...[...byLang.keys()].filter((l) => !langOrder.includes(l) && l !== "Kh\u00e1c"),
      ...(byLang.has("Kh\u00e1c") ? ["Kh\u00e1c"] : []),
    ];
    for (const lang of sortedLangs) {
      const byRegion = byLang.get(lang)!;
      // S\u1eafp x\u1ebfp v\u00f9ng: B\u1eafc tr\u01b0\u1edbc, Trung gi\u1eefa, Nam cu\u1ed1i, "Kh\u00e1c" sau c\u00f9ng
      const regionOrder = ["B\u1eafc", "Trung", "Nam"];
      const sortedRegions = [
        ...regionOrder.filter((r) => byRegion.has(r)),
        ...[...byRegion.keys()].filter((r) => !regionOrder.includes(r) && r !== "Kh\u00e1c"),
        ...(byRegion.has("Kh\u00e1c") ? ["Kh\u00e1c"] : []),
      ];
      for (const region of sortedRegions) {
        sections.push({ lang, region, data: byRegion.get(region)! });
      }
    }
    return sections;
  }, [voices]);


  const invalidateModels = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.siteModels3d() });
  }, [queryClient]);

  const showApiToast = useCallback(
    (success: boolean, message: string) => {
      Toast.show({
        type: success ? "success" : "error",
        text1: message,
      });
    },
    [],
  );

  const ttsMutation = useMutation({
    mutationFn: async () => {
      const text = ttsText.trim();
      if (text.length < 3) throw new Error("SHORT");
      return updateModelNarrative(media.id, {
        source: "tts",
        narrationText: text,
        voice: selectedVoiceId,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        showApiToast(true, res.message || t("siteModels3d.narrativeSuccessTts"));
        invalidateModels();
      } else {
        showApiToast(false, res.message || t("siteModels3d.narrativeErrorGeneric"));
      }
    },
    onError: (err: Error) => {
      if (err.message === "SHORT") {
        showApiToast(false, t("siteModels3d.narrativeErrorShort"));
      } else {
        showApiToast(false, t("siteModels3d.narrativeErrorGeneric"));
      }
    },
  });

  const audioMutation = useMutation({
    mutationFn: async (file: { uri: string; name: string; type: string }) => {
      return updateModelNarrative(media.id, {
        source: "audio",
        audioFile: file,
        narrationText: uploadNote.trim() || undefined,
      });
    },
    onSuccess: (res) => {
      if (res.success) {
        showApiToast(true, res.message || t("siteModels3d.narrativeSuccessAudio"));
        invalidateModels();
      } else {
        showApiToast(false, res.message || t("siteModels3d.narrativeErrorGeneric"));
      }
    },
    onError: () => {
      showApiToast(false, t("siteModels3d.narrativeErrorGeneric"));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteModelNarrative(media.id),
    onSuccess: (res) => {
      if (res.success) {
        showApiToast(true, res.message || t("siteModels3d.narrativeSuccessDelete"));
        setTtsText("");
        setUploadNote("");
        invalidateModels();
      } else {
        showApiToast(false, res.message || t("siteModels3d.narrativeErrorGeneric"));
      }
    },
    onError: () => {
      showApiToast(false, t("siteModels3d.narrativeErrorGeneric"));
    },
  });

  const pickAudioFile = useCallback(async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: [...AUDIO_MIME],
        copyToCacheDirectory: true,
      });
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      audioMutation.mutate({
        uri: asset.uri,
        name: asset.name || "narration.mp3",
        type: asset.mimeType || "audio/mpeg",
      });
    } catch {
      showApiToast(false, t("siteModels3d.narrativePickAudioError"));
    }
  }, [audioMutation, showApiToast, t]);

  const togglePlayback = useCallback(async () => {
    const url = media.audio_url;
    if (!url?.trim()) return;

    try {
      const current = soundRef.current;
      if (current && isPlaying) {
        await current.pauseAsync();
        setIsPlaying(false);
        return;
      }
      if (current && !isPlaying) {
        await current.playAsync();
        setIsPlaying(true);
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlaying(false);
          }
        },
      );
      soundRef.current = newSound;
      setIsPlaying(true);
    } catch {
      showApiToast(false, t("siteModels3d.narrativePlayError"));
    }
  }, [isPlaying, media.audio_url, showApiToast, t]);

  const confirmDelete = useCallback(async () => {
    const confirmed = await confirm({
      type: "danger",
      title: t("siteModels3d.narrativeDeleteTitle"),
      message: t("siteModels3d.narrativeDeleteMessage"),
      confirmText: t("siteModels3d.narrativeDeleteConfirm"),
      cancelText: t("common.cancel"),
    });

    if (confirmed) {
      deleteMutation.mutate();
    }
  }, [confirm, deleteMutation, t]);

  /** Phát / dừng demo clip của giọng. */
  const playDemoVoice = useCallback(
    async (voice: TtsVoiceOption) => {
      if (!voice.demo) return;
      try {
        // Đang phát chính giọng này → pause
        if (playingDemoId === voice.id && demoSoundRef.current) {
          await demoSoundRef.current.pauseAsync();
          setPlayingDemoId(null);
          return;
        }
        // Dừng bất kỳ demo đang phát
        if (demoSoundRef.current) {
          await demoSoundRef.current.unloadAsync();
          demoSoundRef.current = null;
        }
        setPlayingDemoId(voice.id);
        await Audio.setAudioModeAsync({
          allowsRecordingIOS: false,
          playsInSilentModeIOS: true,
          staysActiveInBackground: false,
          shouldDuckAndroid: true,
        });
        const { sound } = await Audio.Sound.createAsync(
          { uri: voice.demo },
          { shouldPlay: true },
          (status) => {
            if (status.isLoaded && status.didJustFinish) {
              setPlayingDemoId(null);
            }
          },
        );
        demoSoundRef.current = sound;
      } catch {
        setPlayingDemoId(null);
        showApiToast(false, t("siteModels3d.narrativePlayError"));
      }
    },
    [playingDemoId, showApiToast, t],
  );

  const renderVoiceRow = useCallback(
    ({ item }: { item: TtsVoiceOption }) => {
      const isDemo = playingDemoId === item.id;
      return (
        <Pressable
          style={({ pressed }) => [
            styles.voiceRow,
            selectedVoiceId === item.id && styles.voiceRowSelected,
            pressed && styles.voiceRowPressed,
          ]}
          onPress={() => {
            // Dừng demo nếu đang phát
            void demoSoundRef.current?.unloadAsync();
            demoSoundRef.current = null;
            setPlayingDemoId(null);
            setSelectedVoiceId(item.id);
            setVoiceModalVisible(false);
          }}
        >
          <View style={styles.voiceRowContent}>
            <View style={styles.voiceRowInfo}>
              <Text style={styles.voiceRowTitle} numberOfLines={1}>
                {item.name}
              </Text>
            </View>
            {item.demo ? (
              <Pressable
                style={styles.demoBtn}
                onPress={(e) => {
                  e.stopPropagation();
                  void playDemoVoice(item);
                }}
                hitSlop={8}
                accessibilityRole="button"
                accessibilityLabel={
                  isDemo
                    ? t("siteModels3d.narrativeDemoPause")
                    : t("siteModels3d.narrativeDemoPlay")
                }
              >
                <MaterialIcons
                  name={isDemo ? "pause-circle" : "play-circle-outline"}
                  size={28}
                  color={isDemo ? PREMIUM_COLORS.gold : "rgba(255,255,255,0.55)"}
                />
              </Pressable>
            ) : null}
          </View>
        </Pressable>
      );
    },
    [selectedVoiceId, playingDemoId, playDemoVoice, t],
  );

  const busy =
    ttsMutation.isPending || audioMutation.isPending || deleteMutation.isPending;

  const ttsLen = ttsText.length;
  const countColor = charCountColor(ttsLen);

  const collapsedLabel = narrativeStatusLabel(narrativeStatus, t);

  return (
    <View
      style={[
        styles.wrap,
        expanded && {
          maxHeight: keyboardHeight > 0
            ? Math.min(expandedMaxHeight + keyboardHeight * 0.6, windowH * 0.75)
            : expandedMaxHeight,
        },
        !expanded && styles.wrapCollapsed,
        { paddingBottom: bottomInset },
      ]}
    >
      {/* ——— Thu gọn: thanh trạng thái + phát + mở rộng ——— */}
      <View style={styles.collapsedRow}>
        <Pressable
          style={styles.collapsedMain}
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          accessibilityLabel={
            expanded
              ? t("siteModels3d.narrativeCollapse")
              : t("siteModels3d.narrativeExpand")
          }
        >
          <MaterialIcons name="record-voice-over" size={22} color={PREMIUM_COLORS.gold} />
          <View style={styles.collapsedTextCol}>
            <Text style={styles.collapsedTitle} numberOfLines={1}>
              {t("siteModels3d.narrativeSectionTitle")}
            </Text>
            <Text style={styles.collapsedStatus} numberOfLines={1}>
              {collapsedLabel}
            </Text>
            {!expanded ? (
              <Text style={styles.collapsedHint} numberOfLines={2}>
                {narrativeStatus === "processing"
                  ? t("siteModels3d.narrativeCollapsedHintProcessing")
                  : narrativeStatus === "approved"
                    ? t("siteModels3d.narrativeCollapsedHintApproved")
                    : canEdit
                      ? t("siteModels3d.narrativeCollapsedHintEdit")
                      : t("siteModels3d.narrativeCollapsedHintDefault")}
              </Text>
            ) : null}
          </View>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={28}
            color="rgba(255,255,255,0.65)"
          />
        </Pressable>
        {media.audio_url ? (
          <Pressable
            style={styles.collapsedPlay}
            onPress={togglePlayback}
            disabled={busy}
            accessibilityRole="button"
            accessibilityLabel={
              isPlaying
                ? t("siteModels3d.narrativePauseAudio")
                : t("siteModels3d.narrativePlayAudio")
            }
          >
            <MaterialIcons
              name={isPlaying ? "pause-circle" : "play-circle-filled"}
              size={40}
              color={PREMIUM_COLORS.gold}
            />
          </Pressable>
        ) : null}
      </View>

      {expanded ? (
        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          style={styles.expandedScroll}
          contentContainerStyle={styles.expandedScrollContent}
        >
          {narrativeStatus === "approved" ? (
            <Text style={styles.statusHint}>{t("siteModels3d.narrativeCannotEdit")}</Text>
          ) : null}

          {narrativeStatus === "processing" ? (
            <View style={styles.processingBanner}>
              <ActivityIndicator size="small" color={PREMIUM_COLORS.gold} />
              <View style={styles.processingTextCol}>
                <Text style={styles.processingText}>
                  {t("siteModels3d.narrativeProcessingHint")}
                </Text>
                <Text style={styles.pollingHint}>
                  {t("siteModels3d.narrativePollingHint")}
                </Text>
              </View>
              {onRefreshModels ? (
                <Pressable onPress={onRefreshModels} style={styles.refreshLink} hitSlop={8}>
                  <Text style={styles.refreshLinkText}>
                    {t("siteModels3d.narrativeRefresh")}
                  </Text>
                </Pressable>
              ) : null}
            </View>
          ) : null}

          {narrativeStatus === "rejected" && media.narrative_rejection_reason ? (
            <Text style={styles.rejectReason}>
              {t("siteModels3d.narrativeRejectionPrefix")}{" "}
              {media.narrative_rejection_reason}
            </Text>
          ) : null}

          {narrativeStatus !== "pending" &&
          (narrativeReviewerName || narrativeReviewerEmail || narrativeReviewedAtLabel) ? (
            <View style={styles.reviewMetaBox}>
              <View style={styles.reviewMetaHeader}>
                <MaterialIcons
                  name="verified-user"
                  size={15}
                  color={PREMIUM_COLORS.gold}
                />
                <Text style={styles.reviewMetaTitle}>{t("reviewTracking.title")}</Text>
              </View>
              {narrativeReviewerName ? (
                <Text style={styles.reviewMetaText}>
                  <Text style={styles.reviewMetaLabel}>{t("reviewTracking.reviewer")}: </Text>
                  {narrativeReviewerName}
                </Text>
              ) : null}
              {narrativeReviewerEmail ? (
                <Text style={styles.reviewMetaHint}>{narrativeReviewerEmail}</Text>
              ) : null}
              {narrativeReviewedAtLabel ? (
                <Text style={styles.reviewMetaText}>
                  <Text style={styles.reviewMetaLabel}>{t("reviewTracking.reviewedAt")}: </Text>
                  {narrativeReviewedAtLabel}
                </Text>
              ) : null}
            </View>
          ) : null}

          {false && narrativeStatus !== "pending" &&
          (narrativeReviewerName || narrativeReviewerEmail || narrativeReviewedAtLabel) ? (
            <View style={styles.reviewMetaBox}>
              <View style={styles.reviewMetaHeader}>
                <MaterialIcons
                  name="verified-user"
                  size={15}
                  color={PREMIUM_COLORS.gold}
                />
                <Text style={styles.reviewMetaTitle}>Thông tin kiểm duyệt</Text>
              </View>
              {narrativeReviewerName ? (
                <Text style={styles.reviewMetaText}>
                  <Text style={styles.reviewMetaLabel}>Người kiểm duyệt: </Text>
                  {narrativeReviewerName}
                </Text>
              ) : null}
              {narrativeReviewerEmail ? (
                <Text style={styles.reviewMetaHint}>{narrativeReviewerEmail}</Text>
              ) : null}
              {narrativeReviewedAtLabel ? (
                <Text style={styles.reviewMetaText}>
                  <Text style={styles.reviewMetaLabel}>Thời gian xử lý: </Text>
                  {narrativeReviewedAtLabel}
                </Text>
              ) : null}
            </View>
          ) : null}

          {!canEdit && narrativeStatus === "approved" && media.narration_text ? (
            <Text style={styles.readOnlyScript}>{media.narration_text}</Text>
          ) : null}

          {canEdit && narrativeStatus !== "processing" ? (
            <>
              <View style={styles.segmentRow}>
                <Pressable
                  style={[styles.segmentBtn, editTab === "tts" && styles.segmentBtnActive]}
                  onPress={() => setEditTab("tts")}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      editTab === "tts" && styles.segmentBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t("siteModels3d.narrativeTabTts")}
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.segmentBtn, editTab === "upload" && styles.segmentBtnActive]}
                  onPress={() => setEditTab("upload")}
                >
                  <Text
                    style={[
                      styles.segmentBtnText,
                      editTab === "upload" && styles.segmentBtnTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {t("siteModels3d.narrativeTabUpload")}
                  </Text>
                </Pressable>
              </View>

              {editTab === "tts" ? (
                <View>
                  <Text style={styles.inputLabel}>{t("siteModels3d.narrativeTtsLabel")}</Text>
                  <TextInput
                    style={styles.textInput}
                    value={ttsText}
                    onChangeText={setTtsText}
                    placeholder={t("siteModels3d.narrativeTtsPlaceholder")}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    multiline
                    maxLength={TTS_MAX}
                    editable={!busy}
                    onFocus={() => {
                      setTimeout(() => {
                        scrollRef.current?.scrollToEnd({ animated: true });
                      }, 300);
                    }}
                  />
                  <Text style={[styles.charCount, { color: countColor }]}>
                    {t("siteModels3d.narrativeCharCount", {
                      current: ttsLen,
                      max: TTS_MAX,
                    })}
                  </Text>

                  <Pressable
                    style={styles.voicePickerBtn}
                    onPress={() => setVoiceModalVisible(true)}
                    disabled={busy || voicesLoading}
                  >
                    <MaterialIcons name="graphic-eq" size={20} color="#fff" />
                    <Text style={styles.voicePickerText} numberOfLines={1}>
                      {selectedVoiceName
                        ? `${t("siteModels3d.narrativeVoice")}: ${selectedVoiceName}`
                        : t("siteModels3d.narrativeVoiceDefault")}
                    </Text>
                    <MaterialIcons name="chevron-right" size={22} color="rgba(255,255,255,0.5)" />
                  </Pressable>

                  <Pressable
                    style={[styles.primaryBtn, busy && styles.btnDisabled]}
                    onPress={() => ttsMutation.mutate()}
                    disabled={busy}
                  >
                    {ttsMutation.isPending ? (
                      <ActivityIndicator color="#1a1a1a" />
                    ) : (
                      <Text style={styles.primaryBtnText}>
                        {t("siteModels3d.narrativeSubmitTts")}
                      </Text>
                    )}
                  </Pressable>
                </View>
              ) : (
                <View>
                  <Text style={styles.inputLabel}>
                    {t("siteModels3d.narrativeUploadNoteLabel")}
                  </Text>
                  <TextInput
                    style={styles.textInput}
                    value={uploadNote}
                    onChangeText={setUploadNote}
                    placeholder={t("siteModels3d.narrativeUploadNotePlaceholder")}
                    placeholderTextColor="rgba(255,255,255,0.35)"
                    multiline
                    maxLength={5000}
                    editable={!busy}
                  />

                  <Pressable
                    style={[styles.secondaryBtn, busy && styles.btnDisabled]}
                    onPress={pickAudioFile}
                    disabled={busy}
                  >
                    {audioMutation.isPending ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <>
                        <MaterialIcons name="upload-file" size={20} color="#fff" />
                        <Text style={styles.secondaryBtnText}>
                          {t("siteModels3d.narrativePickAudio")}
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              )}

              {canDelete ? (
                <Pressable
                  style={[styles.dangerBtn, busy && styles.btnDisabled]}
                  onPress={confirmDelete}
                  disabled={busy}
                >
                  {deleteMutation.isPending ? (
                    <ActivityIndicator color="#fca5a5" />
                  ) : (
                    <Text style={styles.dangerBtnText}>
                      {t("siteModels3d.narrativeDelete")}
                    </Text>
                  )}
                </Pressable>
              ) : null}
            </>
          ) : null}
        </ScrollView>
      ) : null}

      <Modal
        visible={voiceModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setVoiceModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setVoiceModalVisible(false)}
        >
          <Pressable style={styles.modalCard} onPress={(e) => e.stopPropagation()}>
            <Text style={styles.modalTitle}>{t("siteModels3d.narrativeVoiceModalTitle")}</Text>
            <Pressable
              style={styles.clearVoiceBtn}
              onPress={() => {
                setSelectedVoiceId(undefined);
                setVoiceModalVisible(false);
              }}
            >
              <Text style={styles.clearVoiceText}>
                {t("siteModels3d.narrativeVoiceDefault")}
              </Text>
            </Pressable>
            {voicesLoading ? (
              <ActivityIndicator color={PREMIUM_COLORS.gold} style={{ marginVertical: 16 }} />
            ) : (
              <SectionList
                sections={voiceSections}
                keyExtractor={(item) => item.id}
                renderItem={renderVoiceRow}
                renderSectionHeader={({ section }) => (
                  <View style={styles.sectionHeader}>
                    <View style={styles.sectionLangBadge}>
                      <Text style={styles.sectionLangText}>
                        {(section as { lang: string; region: string }).lang.toUpperCase()}
                      </Text>
                    </View>
                    <Text style={styles.sectionRegionText}>
                      {(section as { lang: string; region: string }).region}
                    </Text>
                  </View>
                )}
                style={styles.voiceList}
                keyboardShouldPersistTaps="handled"
                stickySectionHeadersEnabled={false}
              />
            )}
            <Pressable
              style={styles.modalCloseBtn}
              onPress={() => setVoiceModalVisible(false)}
            >
              <Text style={styles.modalCloseText}>{t("common.close")}</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
      <ConfirmModal />
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(255,255,255,0.18)",
    backgroundColor: "#0c0c0c",
    paddingHorizontal: GUIDE_SPACING.md,
    paddingTop: GUIDE_SPACING.xs,
  },
  wrapCollapsed: {
    flexGrow: 0,
  },
  collapsedRow: {
    flexDirection: "row",
    alignItems: "center",
    minHeight: 56,
    gap: 4,
  },
  collapsedMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 8,
  },
  collapsedTextCol: {
    flex: 1,
    minWidth: 0,
  },
  collapsedTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#fff",
  },
  collapsedStatus: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
    marginTop: 2,
  },
  collapsedHint: {
    fontSize: 10,
    color: "rgba(255,255,255,0.4)",
    marginTop: 4,
    lineHeight: 13,
  },
  collapsedPlay: {
    padding: 4,
  },
  expandedScroll: {
    marginTop: 4,
  },
  expandedScrollContent: {
    paddingBottom: GUIDE_SPACING.md,
  },
  statusHint: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginBottom: 8,
  },
  processingBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: 10,
    padding: 10,
    borderRadius: 10,
    backgroundColor: "rgba(212, 175, 55, 0.12)",
    marginBottom: 10,
  },
  processingTextCol: {
    flex: 1,
    minWidth: 140,
  },
  processingText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.88)",
    lineHeight: 16,
  },
  pollingHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.5)",
    marginTop: 4,
  },
  refreshLink: {
    paddingVertical: 4,
    paddingHorizontal: 4,
    alignSelf: "center",
  },
  refreshLinkText: {
    fontSize: 12,
    fontWeight: "700",
    color: PREMIUM_COLORS.gold,
    textDecorationLine: "underline",
  },
  rejectReason: {
    fontSize: 12,
    color: "#fca5a5",
    marginBottom: 10,
  },
  reviewMetaBox: {
    backgroundColor: "rgba(255,255,255,0.06)",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(212, 175, 55, 0.3)",
    borderRadius: 12,
    padding: 12,
    gap: 6,
    marginBottom: 12,
  },
  reviewMetaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  reviewMetaTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: "#F8E7B2",
  },
  reviewMetaLabel: {
    fontWeight: "700",
    color: "rgba(255,255,255,0.92)",
  },
  reviewMetaText: {
    fontSize: 12,
    lineHeight: 18,
    color: "rgba(255,255,255,0.82)",
  },
  reviewMetaHint: {
    fontSize: 11,
    color: "rgba(255,255,255,0.55)",
  },
  segmentRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 12,
  },
  segmentBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 8,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    alignItems: "center",
  },
  segmentBtnActive: {
    backgroundColor: "rgba(212, 175, 55, 0.22)",
    borderColor: PREMIUM_COLORS.gold,
  },
  segmentBtnText: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
  },
  segmentBtnTextActive: {
    color: "#fff",
    fontWeight: "700",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "rgba(255,255,255,0.65)",
    marginBottom: 6,
  },
  textInput: {
    minHeight: 88,
    maxHeight: 140,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    borderRadius: 10,
    padding: 10,
    fontSize: 14,
    color: "#fff",
    textAlignVertical: "top",
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  charCount: {
    fontSize: 11,
    fontWeight: "600",
    textAlign: "right",
    marginTop: 4,
    marginBottom: 10,
  },
  voicePickerBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    marginBottom: 10,
  },
  voicePickerText: {
    flex: 1,
    fontSize: 13,
    color: "#fff",
  },
  primaryBtn: {
    backgroundColor: PREMIUM_COLORS.gold,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 8,
  },
  primaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.25)",
    marginBottom: 8,
  },
  secondaryBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#fff",
  },
  dangerBtn: {
    paddingVertical: 12,
    alignItems: "center",
    marginTop: 4,
  },
  dangerBtnText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fca5a5",
  },
  btnDisabled: {
    opacity: 0.55,
  },
  readOnlyScript: {
    fontSize: 13,
    color: "rgba(255,255,255,0.8)",
    lineHeight: 20,
    marginBottom: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    padding: 24,
  },
  modalCard: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    maxHeight: "70%",
    padding: 16,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 12,
  },
  clearVoiceBtn: {
    paddingVertical: 10,
    marginBottom: 8,
  },
  clearVoiceText: {
    fontSize: 14,
    color: PREMIUM_COLORS.gold,
    fontWeight: "600",
  },
  voiceList: {
    maxHeight: 300,
  },
  voiceRow: {
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 10,
    marginBottom: 6,
    backgroundColor: "rgba(255,255,255,0.06)",
  },
  voiceRowSelected: {
    borderWidth: 1,
    borderColor: PREMIUM_COLORS.gold,
  },
  voiceRowPressed: {
    opacity: 0.85,
  },
  voiceRowContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  voiceRowInfo: {
    flex: 1,
    minWidth: 0,
  },
  voiceRowTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  voiceRowMeta: {
    fontSize: 12,
    color: "rgba(255,255,255,0.5)",
    marginTop: 2,
  },
  demoBtn: {
    padding: 2,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
    paddingHorizontal: 4,
    marginTop: 8,
    marginBottom: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "rgba(255,255,255,0.1)",
  },
  sectionLangBadge: {
    backgroundColor: PREMIUM_COLORS.gold,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  sectionLangText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#1a1a1a",
    letterSpacing: 0.5,
  },
  sectionRegionText: {
    fontSize: 13,
    fontWeight: "700",
    color: "rgba(255,255,255,0.7)",
  },
  modalCloseBtn: {
    marginTop: 12,
    alignItems: "center",
    paddingVertical: 10,
  },
  modalCloseText: {
    fontSize: 15,
    fontWeight: "600",
    color: "rgba(255,255,255,0.75)",
  },
});
