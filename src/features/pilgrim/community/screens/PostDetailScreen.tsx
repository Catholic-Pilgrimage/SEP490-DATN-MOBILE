import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import { useVideoPlayer, VideoView } from "expo-video";
import type { TFunction } from "i18next";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  FlatList,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import Toast from "react-native-toast-message";
import {
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
  useAddComment,
  useDeleteComment,
  useDeletePost,
  useLikePost,
  usePostComments,
  usePostDetail,
  useTranslateComment,
  useTranslatePost,
  useUpdateComment,
} from "../../../../hooks/usePosts";
import { useSendFriendRequest } from "../../../../hooks/useFriendship";
import i18n from "../../../../i18n";
import { pilgrimJournalApi, pilgrimPlannerApi, pilgrimSiteApi } from "../../../../services/api/pilgrim";
import type { FeedPost, FeedPostComment, FeedTranslationResult } from "../../../../types/post.types";
import {
  getFeedPostLocationName,
  getFeedPostPlannerId,
  getFeedPostPlannerItemIds,
  getFeedPostSiteId,
} from "../../../../utils/feedPostLocation";
import { resolveJournalLocationName } from "../../../../utils/journalLocation";
import { MediaLightbox } from "../../../guide/my-site/components/MediaLightbox";
import PostActionSheet from "../components/PostActionSheet";
import ReportPostModal from "../components/ReportPostModal";
import TranslationMeta from "../components/TranslationMeta";
import { useSafeAreaInsets } from "react-native-safe-area-context";

// Date Helpers (Synced with CreatePlanScreen)
const toLocalYMD = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const parseYMDLocal = (ymd: string): Date => {
  const [y, mo, da] = ymd.split("-").map((x) => parseInt(x, 10));
  return new Date(y, mo - 1, da);
};
const addDaysToYMD = (ymd: string, days: number): string => {
  const d = parseYMDLocal(ymd);
  d.setDate(d.getDate() + days);
  return toLocalYMD(d);
};
const tomorrowYMD = (): string => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return toLocalYMD(d);
};
const getDaysInMonth = (year: number, month: number) => {
  return new Date(year, month + 1, 0).getDate();
};
const getFirstDayOfMonth = (year: number, month: number) => {
  return new Date(year, month, 1).getDay();
};
const generateCalendarDays = (year: number, month: number) => {
  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);
  const days: (number | null)[] = [];
  for (let i = 0; i < firstDay; i++) days.push(null);
  for (let i = 1; i <= daysInMonth; i++) days.push(i);
  return days;
};
const inclusiveTripDays = (startYMD: string, endYMD: string): number => {
  const a = parseYMDLocal(startYMD).getTime();
  const b = parseYMDLocal(endYMD).getTime();
  if (b < a) return 0;
  return Math.ceil((b - a) / (1000 * 60 * 60 * 24)) + 1;
};

// Utilities

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const POST_MEDIA_WIDTH = SCREEN_WIDTH - SPACING.lg * 2;

const getDateLocale = (language: string) =>
  language.startsWith("en") ? "en-US" : "vi-VN";

const formatLocalizedTime = (
  dateString: string,
  t: TFunction,
  language: string,
) => {
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return "";

  const locale = getDateLocale(language);
  const now = new Date();
  const rawDiffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (rawDiffInSeconds < 0) {
    if (Math.abs(rawDiffInSeconds) < 60) {
      return t("postDetail.timeAgo.justNow", { defaultValue: "Just now" });
    }
    return date.toLocaleDateString(locale);
  }

  const diffInSeconds = rawDiffInSeconds;
  if (diffInSeconds < 5) {
    return t("postDetail.timeAgo.justNow", { defaultValue: "Just now" });
  }

  if (diffInSeconds < 60) {
    return t("postDetail.timeAgo.secondsAgo", {
      count: diffInSeconds,
      defaultValue: "{{count}} seconds ago",
    });
  }

  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) {
    return t("postDetail.timeAgo.minutesAgo", {
      count: diffInMinutes,
      defaultValue: "{{count}} minutes ago",
    });
  }

  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) {
    return t("postDetail.timeAgo.hoursAgo", {
      count: diffInHours,
      defaultValue: "{{count}} hours ago",
    });
  }

  const diffInDays = Math.floor(diffInHours / 24);
  if (diffInDays < 7) {
    return t("postDetail.timeAgo.daysAgo", {
      count: diffInDays,
      defaultValue: "{{count}} days ago",
    });
  }

  return date.toLocaleDateString(locale);
};

const formatAudioDuration = (millis: number) => {
  if (!Number.isFinite(millis) || millis <= 0) {
    return "0:00";
  }

  const totalSeconds = Math.floor(millis / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const isLikelyAudioFileUrl = (url?: string | null) =>
  Boolean(url && /\.(aac|flac|m4a|mp3|ogg|wav)(?:[?#].*)?$/i.test(url));

const translate = i18n.t.bind(i18n) as TFunction;

/**
 * Facebook-style comment structure:
 * - Top-level comments shown directly
 * - ALL replies (regardless of nesting depth in backend) are flattened
 *   and shown as 1-level indent under the root comment
 * - Initial collapsed: hide replies behind a single "View all..." action
 */
interface CommentNode {
  comment: FeedPostComment;
  replies: FeedPostComment[]; // all descendants, flattened
}

function buildCommentTree(comments: FeedPostComment[]): CommentNode[] {
  const byId = new Map<string, FeedPostComment>();
  for (const c of comments) {
    byId.set(c.id, c);
  }

  // Find root ancestor for each comment
  const getRootId = (c: FeedPostComment): string | null => {
    const raw = c.parent_id;
    const pid =
      raw === undefined || raw === null || raw === "" ? null : String(raw);
    if (pid === null) return null;
    const parent = byId.get(pid);
    if (!parent) return pid; // parent not loaded, treat pid as root
    return getRootId(parent) ?? pid;
  };

  const roots: FeedPostComment[] = [];
  const repliesByRoot = new Map<string, FeedPostComment[]>();

  for (const c of comments) {
    const rootId = getRootId(c);
    if (rootId === null) {
      roots.push(c);
    } else {
      if (!repliesByRoot.has(rootId)) repliesByRoot.set(rootId, []);
      repliesByRoot.get(rootId)!.push(c);
    }
  }

  // Sort by time
  roots.sort(
    (a, b) =>
      new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
  );
  for (const arr of repliesByRoot.values()) {
    arr.sort(
      (a, b) =>
        new Date(a.created_at).getTime() - new Date(b.created_at).getTime(),
    );
  }

  return roots.map((root) => ({
    comment: root,
    replies: repliesByRoot.get(root.id) ?? [],
  }));
}

// Sub-components

const FeedItemHeader = ({
  user,
  time,
  location,
  isHighlightedGuide = false,
  onMorePress,
}: {
  user: { name: string; avatar?: string };
  time: string;
  location?: string;
  isHighlightedGuide?: boolean;
  onMorePress?: () => void;
}) => {
  const { t, i18n } = useTranslation();

  return (
    <View style={styles.headerRow}>
      <View style={styles.userInfo}>
        {user.avatar ? (
          <Image
            source={{ uri: user.avatar }}
            style={[styles.avatar, isHighlightedGuide && styles.avatarGuide]}
          />
        ) : (
          <View
            style={[
              styles.avatar,
              {
                backgroundColor: COLORS.primary,
                justifyContent: "center",
                alignItems: "center",
              },
              isHighlightedGuide && styles.avatarGuide,
            ]}
          >
            <Text
              style={{ fontSize: 16, fontWeight: "bold", color: COLORS.white }}
            >
              {user.name.charAt(0).toUpperCase()}
            </Text>
          </View>
        )}
        <View style={styles.userMeta}>
          <View style={styles.userNameRow}>
            <Text
              style={[
                styles.userName,
                isHighlightedGuide && styles.userNameGuide,
              ]}
              numberOfLines={1}
            >
              {user.name}
            </Text>
            {isHighlightedGuide && (
              <View style={styles.guideBadge}>
                <MaterialIcons name="verified" size={12} color={COLORS.white} />
                <Text style={styles.guideBadgeText}>
                  {t("profile.localGuide", { defaultValue: "Local Guide" })}
                </Text>
              </View>
            )}
          </View>
          <View style={{ flexDirection: "column" }}>
            <Text style={styles.timeText}>
              {formatLocalizedTime(time, t, i18n.language)}
            </Text>
            {location && (
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  marginTop: 4,
                }}
              >
                <Text style={{ fontSize: 12, marginRight: 4 }}>📍</Text>
                <Text
                  style={{
                    color: COLORS.textSecondary,
                    fontSize: 13,
                    fontWeight: "500",
                  }}
                >
                  <Text style={{ fontWeight: "700", color: COLORS.primary }}>
                    {location}
                  </Text>
                </Text>
              </View>
            )}
          </View>
        </View>
      </View>
      <TouchableOpacity style={{ padding: 4 }} onPress={onMorePress}>
        <MaterialIcons
          name="more-horiz"
          size={24}
          color={COLORS.textTertiary}
        />
      </TouchableOpacity>
    </View>
  );
};
const FeedItemActions = ({
  stats,
  postId,
  isLiked,
}: {
  stats: { prayers: number; comments: number };
  postId: string;
  isLiked: boolean;
}) => {
  const { t } = useTranslation();
  const likePostMutation = useLikePost();

  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        style={styles.actionButton}
        onPress={() => likePostMutation.mutate({ postId, isLiked })}
        disabled={likePostMutation.isPending}
      >
        <MaterialIcons
          name={isLiked ? "favorite" : "favorite-border"}
          size={22}
          color={isLiked ? COLORS.danger : COLORS.textSecondary}
        />
        <Text
          style={{
            color: isLiked ? COLORS.danger : COLORS.textSecondary,
            fontWeight: "500",
            fontSize: 14,
            marginLeft: 6,
          }}
        >
          {t("postDetail.prayersCount", {
            count: stats.prayers,
            defaultValue: "{{count}} Prayers",
          })}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.actionButton}>
        <MaterialIcons
          name="chat-bubble-outline"
          size={20}
          color={COLORS.textSecondary}
        />
        <Text
          style={{
            color: COLORS.textSecondary,
            fontWeight: "500",
            fontSize: 14,
            marginLeft: 6,
          }}
        >
          {t("postDetail.commentsCount", {
            count: stats.comments,
            defaultValue: "{{count}} Comments",
          })}
        </Text>
      </TouchableOpacity>


    </View>
  );
};
const PostAudioAttachment = ({
  url,
  label,
  iconName,
}: {
  url: string;
  label: string;
  iconName: React.ComponentProps<typeof MaterialIcons>["name"];
}) => {
  const { t } = useTranslation();
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [positionMillis, setPositionMillis] = useState(0);
  const [durationMillis, setDurationMillis] = useState(0);

  useEffect(() => {
    return () => {
      if (sound) {
        sound.unloadAsync().catch(() => null);
      }
    };
  }, [sound]);

  const handleTogglePlayback = async () => {
    try {
      if (sound) {
        if (isPlaying) {
          await sound.pauseAsync();
          setIsPlaying(false);
          return;
        }

        if (durationMillis > 0 && positionMillis >= durationMillis) {
          await sound.replayAsync();
          setIsPlaying(true);
          return;
        }

        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      setIsLoading(true);

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: nextSound, status } = await Audio.Sound.createAsync(
        { uri: url },
        { shouldPlay: true },
        (playbackStatus) => {
          if (!playbackStatus.isLoaded) return;

          setPositionMillis(playbackStatus.positionMillis || 0);
          setDurationMillis(playbackStatus.durationMillis || 0);

          if (playbackStatus.didJustFinish) {
            setIsPlaying(false);
            setPositionMillis(0);
          }
        },
      );

      if (status.isLoaded) {
        setDurationMillis(status.durationMillis || 0);
        setPositionMillis(status.positionMillis || 0);
      }

      setSound(nextSound);
      setIsPlaying(true);
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error", { defaultValue: "Error" }),
        text2: t("postDetail.playMediaError", {
          defaultValue: "Unable to play {{label}}.",
          label: label.toLowerCase(),
        }),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const progress =
    durationMillis > 0 ? Math.min(positionMillis / durationMillis, 1) : 0;

  return (
    <View style={styles.mediaSection}>
      <View style={styles.audioCard}>
        <View style={styles.audioCardHeader}>
          <View style={styles.audioIconBadge}>
            <MaterialIcons name={iconName} size={22} color={COLORS.primary} />
          </View>
          <View style={styles.audioTextColumn}>
            <Text style={styles.mediaSectionTitle}>{label}</Text>
            <Text style={styles.mediaSectionSubtitle}>
              {isPlaying
                ? t("postDetail.nowPlaying", { defaultValue: "Đang phát" })
                : t("postDetail.tapToPlay", { defaultValue: "Nhấn để phát" })}
            </Text>
          </View>
          <TouchableOpacity
            style={[
              styles.audioActionButton,
              (isPlaying || isLoading) && styles.audioActionButtonActive,
            ]}
            onPress={handleTogglePlayback}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons
                name={isPlaying ? "pause" : "play-arrow"}
                size={24}
                color={COLORS.white}
              />
            )}
          </TouchableOpacity>
        </View>

        <View style={styles.audioProgressTrack}>
          <View
            style={[styles.audioProgressFill, { width: `${progress * 100}%` }]}
          />
        </View>

        <View style={styles.audioTimeRow}>
          <Text style={styles.audioTimeText}>
            {formatAudioDuration(positionMillis)}
          </Text>
          <Text style={styles.audioTimeText}>
            {formatAudioDuration(durationMillis)}
          </Text>
        </View>
      </View>
    </View>
  );
};

const formatDate = (ymd: string) => {
  if (!ymd) return "";
  const parts = ymd.split("-");
  if (parts.length !== 3) return ymd;
  const [y, m, d] = parts;
  return `${d}-${m}-${y}`;
};

const formatDisplayDate = (ymd: string) => {
  if (!ymd) return "";
  try {
    const date = parseYMDLocal(ymd);
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    
    return `${d}-${m}-${y}`;
  } catch {
    return ymd;
  }
};

const ClonePlanModal = ({
  visible,
  onClose,
  onConfirm,
  initialData,
  isBusy,
}: {
  visible: boolean;
  onClose: () => void;
  onConfirm: (data: any) => void;
  initialData: any;
  isBusy: boolean;
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();

  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState(tomorrowYMD());
  const [endDate, setEndDate] = useState("");
  const [peopleCount, setPeopleCount] = useState(1);
  const [transportation, setTransportation] = useState<"bus" | "car" | "motorbike">("bus");
  const [depositAmount, setDepositAmount] = useState<string>("0");
  const [penaltyPercent, setPenaltyPercent] = useState<string>("0");

  // Date picker states
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [startCalendarDate, setStartCalendarDate] = useState(new Date());
  const [endCalendarDate, setEndCalendarDate] = useState(new Date());

  useEffect(() => {
    if (visible && initialData) {
      setName(`${initialData.name} (${t("common.copy", { defaultValue: "Bản sao" })})`);

      const t0 = tomorrowYMD();
      setStartDate(t0);

      // Preserve duration
      let duration = 3;
      if (initialData.start_date && initialData.end_date) {
        const d1 = parseYMDLocal(initialData.start_date).getTime();
        const d2 = parseYMDLocal(initialData.end_date).getTime();
        duration = Math.max(1, Math.ceil((d2 - d1) / (1000 * 60 * 60 * 24)));
      }
      setEndDate(addDaysToYMD(t0, duration));

      setPeopleCount(initialData.number_of_people || 1);
      setTransportation(initialData.transportation || "bus");
      setDepositAmount(String(initialData.member_deposit || "0"));
      setPenaltyPercent(String(initialData.penalty_percentage || "0"));

      // Reset calendar focus
      const dStart = parseYMDLocal(t0);
      setStartCalendarDate(new Date(dStart.getFullYear(), dStart.getMonth(), 1));
      const dEnd = parseYMDLocal(addDaysToYMD(t0, duration));
      setEndCalendarDate(new Date(dEnd.getFullYear(), dEnd.getMonth(), 1));
    }
  }, [visible, initialData, t]);

  const handleConfirm = () => {
    if (!name.trim()) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.nameRequired"),
      });
      return;
    }
    onConfirm({
      name: name.trim(),
      start_date: startDate,
      end_date: endDate,
      number_of_people: peopleCount,
      transportation,
      member_deposit: Number(depositAmount) || 0,
      penalty_percentage: Number(penaltyPercent) || 0,
    });
  };

  const renderCalendar = (
    currentDate: Date,
    setCurrentDate: (d: Date) => void,
    selectedYMD: string,
    onSelect: (ymd: string) => void,
    minYMD?: string,
  ) => {
    const days = generateCalendarDays(currentDate.getFullYear(), currentDate.getMonth());
    const monthLabel = currentDate.toLocaleDateString("vi-VN", { month: "long", year: "numeric" });

    return (
      <View style={styles.cloneCalendarCard}>
        <View style={styles.cloneCalendarHeader}>
          <TouchableOpacity
            onPress={() => {
              const d = new Date(currentDate);
              d.setMonth(d.getMonth() - 1);
              setCurrentDate(d);
            }}
          >
            <Ionicons name="chevron-back" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.cloneCalendarMonth}>{monthLabel}</Text>
          <TouchableOpacity
            onPress={() => {
              const d = new Date(currentDate);
              d.setMonth(d.getMonth() + 1);
              setCurrentDate(d);
            }}
          >
            <Ionicons name="chevron-forward" size={20} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        <View style={styles.cloneCalendarDaysHeader}>
          {["S", "M", "T", "W", "T", "F", "S"].map((d, i) => (
            <Text key={i} style={styles.cloneCalendarDayHeader}>{d}</Text>
          ))}
        </View>

        <View style={styles.cloneCalendarGrid}>
          {days.map((day, idx) => {
            if (day === null) return <View key={idx} style={styles.cloneCalendarDay} />;
            const ymd = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
            const isSelected = ymd === selectedYMD;
            const isDisabled = minYMD ? ymd < minYMD : false;

            return (
              <TouchableOpacity
                key={idx}
                style={[styles.cloneCalendarDay, isSelected && styles.cloneCalendarDaySelected, isDisabled && styles.cloneCalendarDayDisabled]}
                disabled={isDisabled}
                onPress={() => onSelect(ymd)}
              >
                <Text style={[styles.cloneCalendarDayText, isSelected && styles.cloneCalendarDayTextSelected, isDisabled && styles.cloneCalendarDayTextDisabled]}>
                  {day}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.cloneModalOverlay}>
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          style={[styles.cloneModalContent, { paddingBottom: insets.bottom + 20 }]}
        >
          <View style={styles.cloneHeader}>
            <TouchableOpacity onPress={onClose} style={styles.cloneCloseBtn}>
              <Text style={styles.cloneCloseText}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.cloneHeaderTitle}>{t("planner.newJourney") || "Hành trình mới"}</Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.cloneScroll}>
            <View style={styles.cloneSection}>
              <View style={styles.cloneLabelRow}>
                <Ionicons name="trail-sign" size={18} color={COLORS.accent} />
                <Text style={styles.cloneLabel}>{t("planner.journeyName")}</Text>
              </View>
              <TextInput
                style={styles.cloneInput}
                value={name}
                onChangeText={setName}
                placeholder={t("planner.journeyName")}
                placeholderTextColor={COLORS.textTertiary}
              />
            </View>

            <View style={styles.cloneSection}>
              <View style={[styles.cloneLabelRow, { justifyContent: "space-between" }]}>
                <View style={styles.cloneLabelRow}>
                  <Ionicons name="calendar" size={18} color={COLORS.accent} />
                  <Text style={styles.cloneLabel}>{t("planner.tripTime") || "Thời gian hành hương"}</Text>
                </View>
                <View style={styles.cloneDurationBadge}>
                  <Text style={styles.cloneDurationText}>
                    {t("planner.tripDuration", {
                      days: inclusiveTripDays(startDate, endDate),
                      nights: Math.max(0, inclusiveTripDays(startDate, endDate) - 1),
                    })}
                  </Text>
                </View>
              </View>

              <View style={styles.cloneDateSelector}>
                <TouchableOpacity
                  style={[styles.cloneDateBox, showStartPicker && styles.cloneDateBoxActive]}
                  onPress={() => { setShowStartPicker(!showStartPicker); setShowEndPicker(false); }}
                >
                  <Text style={styles.cloneDateLabel}>{t("planner.startDate") || "Ngày đi"}</Text>
                  <Text style={styles.cloneDateValue}>{formatDisplayDate(startDate)}</Text>
                </TouchableOpacity>
                <View style={styles.cloneDateArrow}><Ionicons name="arrow-forward" size={16} color={COLORS.textTertiary} /></View>
                <TouchableOpacity
                  style={[styles.cloneDateBox, showEndPicker && styles.cloneDateBoxActive]}
                  onPress={() => { setShowEndPicker(!showEndPicker); setShowStartPicker(false); }}
                >
                  <Text style={styles.cloneDateLabel}>{t("planner.endDate") || "Ngày về"}</Text>
                  <Text style={styles.cloneDateValue}>{formatDisplayDate(endDate)}</Text>
                </TouchableOpacity>
              </View>

              {showStartPicker && renderCalendar(startCalendarDate, setStartCalendarDate, startDate, (d) => { setStartDate(d); if (endDate < d) setEndDate(d); setShowStartPicker(false); }, tomorrowYMD())}
              {showEndPicker && renderCalendar(endCalendarDate, setEndCalendarDate, endDate, (d) => { setEndDate(d); setShowEndPicker(false); }, startDate)}
            </View>

            <View style={styles.cloneSection}>
              <View style={styles.cloneLabelRow}>
                <Ionicons name="people" size={18} color={COLORS.accent} />
                <Text style={styles.cloneLabel}>{t("planner.numberOfPeople") || "Số lượng người tham gia"}</Text>
              </View>
              <View style={styles.cloneCounterBox}>
                <Text style={styles.cloneCounterLabel}>{t("planner.people") || "Số người đi"}</Text>
                <View style={styles.cloneCounterControls}>
                  <TouchableOpacity style={styles.cloneCounterBtn} onPress={() => setPeopleCount(Math.max(1, peopleCount - 1))}>
                    <Ionicons name="remove" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                  <Text style={styles.cloneCounterValue}>{peopleCount}</Text>
                  <TouchableOpacity style={styles.cloneCounterBtn} onPress={() => setPeopleCount(peopleCount + 1)}>
                    <Ionicons name="add" size={18} color={COLORS.textPrimary} />
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {peopleCount > 1 && (
              <View style={styles.cloneSection}>
                <View style={[styles.cloneLabelRow, { justifyContent: "space-between" }]}>
                  <View style={styles.cloneLabelRow}>
                    <Ionicons name="warning-outline" size={18} color={COLORS.accent} />
                    <Text style={styles.cloneLabel}>{t("planner.memberDepositLabel")}</Text>
                  </View>
                  <TouchableOpacity style={styles.infoIconButton}>
                    <Ionicons name="information-circle-outline" size={18} color={COLORS.textSecondary} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.cloneDepositCard}>
                  <Text style={styles.cloneInputLabel}>{t("planner.depositAmountLabel") || "Member deposit (VND)"}</Text>
                  <TextInput
                    style={styles.cloneDepositInput}
                    value={depositAmount}
                    onChangeText={setDepositAmount}
                    keyboardType="numeric"
                    placeholder="e.g. 100000"
                  />
                  
                  <Text style={[styles.cloneInputLabel, { marginTop: SPACING.md }]}>{t("planner.penaltyPercentageLabel") || "Penalty rate (%)"}</Text>
                  <View style={styles.clonePenaltyRow}>
                    <TextInput
                      style={styles.clonePenaltyInput}
                      value={penaltyPercent}
                      onChangeText={setPenaltyPercent}
                      keyboardType="numeric"
                    />
                    <Text style={styles.clonePenaltySuffix}>%</Text>
                  </View>
                  <Text style={styles.clonePenaltyHint}>
                    {t("planner.penaltyPreview", { percent: penaltyPercent })}
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.cloneSection}>
              <View style={styles.cloneLabelRow}>
                <Ionicons name="car" size={18} color={COLORS.accent} />
                <Text style={styles.cloneLabel}>{t("planner.transportationMain") || "Phương tiện di chuyển chính"}</Text>
              </View>
              <View style={styles.cloneTransportRow}>
                {[
                  { id: "bus", icon: "bus", label: t("planner.bus") },
                  { id: "car", icon: "car", label: t("planner.car") },
                  { id: "motorbike", icon: "bicycle", label: t("planner.motorcycle") }
                ].map((item) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.cloneTransportItem, transportation === item.id && styles.cloneTransportItemSelected]}
                    onPress={() => setTransportation(item.id as any)}
                  >
                    <Ionicons name={item.icon as any} size={24} color={transportation === item.id ? COLORS.white : COLORS.textTertiary} />
                    <Text style={[styles.cloneTransportLabel, transportation === item.id && styles.cloneTransportLabelSelected]}>{item.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity style={[styles.cloneConfirmBtn, isBusy && { opacity: 0.7 }]} onPress={handleConfirm} disabled={isBusy}>
            {isBusy ? <ActivityIndicator color={COLORS.textPrimary} /> : <Text style={styles.cloneConfirmBtnText}>{t("planner.continueSelectingPlaces")} ➔</Text>}
          </TouchableOpacity>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
};

const JourneyAttachment = ({ journey }: { journey: any }) => {
  const { t } = useTranslation();
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const isGuide = user?.role === "local_guide";
  const [isCloning, setIsCloning] = useState(false);
  const [showCloneModal, setShowCloneModal] = useState(false);

  if (!journey) return null;

  const summary = journey.summary || {};
  const itemsByDay = journey.items_by_day || {};
  const dayKeys = Object.keys(itemsByDay).sort((a, b) => Number(a) - Number(b));

  const handleCloneJourney = () => {
    setShowCloneModal(true);
  };

  const handleConfirmClone = async (formData: any) => {
    try {
      setIsCloning(true);
      const res = await pilgrimPlannerApi.clonePlanner(journey.id, formData);

      if (res.success && res.data) {
        setShowCloneModal(false);
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.cloneSuccess"),
        });

        // Navigate back to the Planner main dashboard (Schedule tab)
        navigation.navigate("Schedule");
      } else {
        throw new Error(res.message || t("planner.cloneError"));
      }
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: err.message || t("planner.cloneError"),
      });
    } finally {
      setIsCloning(false);
    }
  };

  return (
    <View style={styles.mediaSection}>
      <ClonePlanModal
        visible={showCloneModal}
        onClose={() => setShowCloneModal(false)}
        onConfirm={handleConfirmClone}
        initialData={journey}
        isBusy={isCloning}
      />
      <Text style={styles.mediaSectionTitle}>
        {t("postDetail.sharedJourney")}
      </Text>
      <View style={styles.journeyCard}>
        <View style={styles.journeyHeader}>
          <View style={styles.journeyTitleRow}>
            <View style={styles.journeyIconBadge}>
              <MaterialIcons name="map" size={24} color={COLORS.primary} />
            </View>
            <View style={styles.journeyNameCol}>
              <Text style={styles.journeyName} numberOfLines={1}>
                {journey.name}
              </Text>
              <Text style={styles.journeyDates}>
                {formatDate(journey.start_date)} → {formatDate(journey.end_date)}
              </Text>
              <View style={styles.journeyMetaRow}>
                <View style={styles.journeyMetaItem}>
                  <MaterialIcons
                    name="people-outline"
                    size={14}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.journeyMetaText}>
                    {journey.number_of_people || 0} {t("planner.people")}
                  </Text>
                </View>
                <View style={styles.metaDivider} />
                <View style={styles.journeyMetaItem}>
                  <MaterialIcons
                    name={
                      journey.transportation === "bus"
                        ? "directions-bus"
                        : journey.transportation === "motorcycle"
                        ? "motorcycle"
                        : "directions-car"
                    }
                    size={14}
                    color={COLORS.textTertiary}
                  />
                  <Text style={styles.journeyMetaText}>
                    {t(`planner.${journey.transportation || "car"}`)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.journeySummaryRow}>
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.total_days}</Text>
            <Text style={styles.summaryLabel}>
              {t("planner.days")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>{summary.total_stops}</Text>
            <Text style={styles.summaryLabel}>
              {t("planner.stops")}
            </Text>
          </View>
          <View style={styles.summaryDivider} />
          <View style={styles.summaryItem}>
            <Text style={styles.summaryValue}>
              {summary.visited_percentage}%
            </Text>
            <Text style={styles.summaryLabel}>
              {t("planner.completed")}
            </Text>
          </View>
        </View>

        <View style={styles.itineraryContainer}>
          {dayKeys.map((dayKey) => (
            <View key={dayKey} style={styles.dayGroup}>
              <View style={styles.dayHeaderRow}>
                <View style={styles.dayPulse} />
                <Text style={styles.dayHeaderText}>
                  {t("planner.day", { count: Number(dayKey) })}
                </Text>
              </View>
              <View style={styles.dayItemsList}>
                {itemsByDay[dayKey].map((item: any, idx: number) => {
                  const hasImage = !!item.site?.cover_image;
                  const hasPatron = !!item.site?.patron_saint;
                  const hasNote = !!item.note;

                  return (
                    <View key={item.id || idx} style={styles.siteItemRow}>
                      <View style={styles.siteTimeline}>
                        <View style={styles.siteTimelineLine} />
                        <View style={styles.siteTimelineDot} />
                      </View>
                      <View style={styles.siteInfoCard}>
                        {hasImage && (
                          <View style={styles.siteImageContainer}>
                            <Image
                              source={{ uri: item.site.cover_image }}
                              style={styles.siteImage}
                            />
                          </View>
                        )}
                        <Text style={styles.siteItemName} numberOfLines={1}>
                          {item.site?.name}
                        </Text>
                        <View style={styles.siteMeta}>
                          <Text style={styles.siteProvince}>
                            <MaterialIcons name="location-on" size={10} />{" "}
                            {(item.site?.province || "").split(",").pop()}
                          </Text>
                          {hasPatron && (
                            <>
                              <View style={styles.metaDivider} />
                              <Text style={styles.sitePatronText}>
                                <MaterialIcons name="shield" size={10} />{" "}
                                {item.site.patron_saint}
                              </Text>
                            </>
                          )}
                        </View>

                        {hasNote && (
                          <View style={styles.siteNoteContainer}>
                            <MaterialIcons
                              name="event-note"
                              size={12}
                              color={COLORS.textTertiary}
                            />
                            <Text style={styles.siteNoteText} numberOfLines={3}>
                              {item.note}
                            </Text>
                          </View>
                        )}

                        <View
                          style={{
                            flexDirection: "row",
                            alignItems: "center",
                            marginTop: 4,
                            gap: 6,
                          }}
                        >
                          {item.status === "skipped" && (
                            <View style={styles.skippedBadge}>
                              <Text style={styles.skippedText}>
                                {t("planner.statusSkipped")}
                              </Text>
                            </View>
                          )}
                          {item.status === "visited" && (
                            <View style={styles.visitedBadge}>
                              <Text style={styles.visitedText}>
                                {t("planner.statusVisited")}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    </View>
                  );
                })}
              </View>
            </View>
          ))}
        </View>

        {journey.id && !isGuide && (
          <TouchableOpacity
            style={[styles.cloneBtn, isCloning && { opacity: 0.7 }]}
            onPress={handleCloneJourney}
            disabled={isCloning}
            activeOpacity={0.8}
          >
            {isCloning ? (
              <ActivityIndicator size="small" color={COLORS.white} />
            ) : (
              <MaterialIcons name="content-copy" size={18} color={COLORS.white} />
            )}
            <Text style={styles.cloneBtnText}>
              {isCloning
                ? t("common.processing")
                : t("planner.cloneJourney")}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
};

const PostVideoAttachment = ({
  url,
  onOpenFullscreen,
}: {
  url: string;
  onOpenFullscreen: () => void;
}) => {
  const { t } = useTranslation();
  const [hasError, setHasError] = useState(false);
  const player = useVideoPlayer(url, (videoPlayer) => {
    videoPlayer.loop = false;
  });

  useEffect(() => {
    const sub = player.addListener(
      "statusChange",
      ({ status }: { status: string }) => {
        if (status === "error") {
          setHasError(true);
        }
      },
    );

    return () => sub.remove();
  }, [player]);

  return (
    <View style={styles.mediaSection}>
      <Text style={styles.mediaSectionTitle}>
        {t("postDetail.videoAttachment")}
      </Text>

      {hasError ? (
        <View style={styles.videoFallback}>
          <MaterialIcons
            name="videocam-off"
            size={32}
            color={COLORS.textTertiary}
          />
          <Text style={styles.videoFallbackText}>
            {t("postDetail.videoUnavailable")}
          </Text>
        </View>
      ) : (
        <>
          <View style={styles.videoCard}>
            <VideoView
              style={styles.videoPlayer}
              player={player}
              fullscreenOptions={{ enable: true }}
              allowsPictureInPicture
              contentFit="contain"
            />
          </View>

          <TouchableOpacity
            style={styles.mediaInlineAction}
            onPress={onOpenFullscreen}
          >
            <MaterialIcons
              name="open-in-full"
              size={18}
              color={COLORS.primary}
            />
            <Text style={styles.mediaInlineActionText}>
              {t("postDetail.openFullscreen")}
            </Text>
          </TouchableOpacity>
        </>
      )}
    </View>
  );
};
const CommentOverflowButton = ({
  onPress,
}: {
  onPress: () => void;
}) => (
  <TouchableOpacity
    style={styles.commentMoreButton}
    onPress={onPress}
    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
  >
    <MaterialIcons
      name="more-horiz"
      size={18}
      color={COLORS.textSecondary}
    />
  </TouchableOpacity>
);
const CommentActionSheet = ({
  visible,
  comment,
  commentPreview,
  canTranslate = false,
  isOwner = false,
  isTranslated = false,
  busy = false,
  onClose,
  onEdit,
  onDelete,
  onReport,
  onTranslate,
}: {
  visible: boolean;
  comment: FeedPostComment | null;
  commentPreview?: string;
  canTranslate?: boolean;
  /** Whether the current user owns this comment */
  isOwner?: boolean;
  isTranslated?: boolean;
  busy?: boolean;
  onClose: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onReport: () => void;
  onTranslate?: () => void;
}) => {
  const { t } = useTranslation();

  if (!visible || !comment) return null;

  const actionItems = [
    ...(canTranslate && onTranslate
      ? [
          {
            key: "translate",
            icon: "g-translate",
            label: isTranslated
              ? t("postDetail.viewOriginal", {
                  defaultValue: "View original",
                })
              : t("postDetail.translateComment", {
                  defaultValue: "Translate comment",
                }),
            onPress: onTranslate,
            danger: false,
          },
        ]
      : []),
    ...(isOwner
      ? [
          {
            key: "edit",
            icon: "edit",
            label: t("postDetail.editComment"),
            onPress: onEdit,
            danger: false,
          },
          {
            key: "delete",
            icon: "delete-outline",
            label: t("postDetail.deleteComment"),
            onPress: onDelete,
            danger: true,
          },
        ]
      : [
          {
            key: "report",
            icon: "flag",
            label: t("postDetail.reportComment"),
            onPress: onReport,
            danger: false,
          },
        ]),
  ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.commentSheetRoot}>
        <TouchableOpacity
          style={styles.commentSheetOverlay}
          activeOpacity={1}
          onPress={onClose}
        />

        <View style={styles.commentSheet}>
          <View style={styles.commentSheetHandle} />
          <Text style={styles.commentSheetTitle}>
            {t("postDetail.commentActions")}
          </Text>
          <Text style={styles.commentSheetPreview} numberOfLines={2}>
            {commentPreview ?? comment.content}
          </Text>

          {actionItems.map((item) => (
            <TouchableOpacity
              key={item.key}
              style={styles.commentSheetAction}
              onPress={item.onPress}
              disabled={busy}
            >
              <MaterialIcons
                name={item.icon as any}
                size={20}
                color={item.danger ? COLORS.danger : COLORS.textPrimary}
              />
              <Text
                style={[
                  styles.commentSheetActionText,
                  item.danger && styles.commentSheetActionTextDanger,
                ]}
              >
                {item.label}
              </Text>
            </TouchableOpacity>
          ))}

          <TouchableOpacity
            style={styles.commentSheetCancel}
            onPress={onClose}
            disabled={busy}
          >
            <Text style={styles.commentSheetCancelText}>
              {t("common.cancel", { defaultValue: "Cancel" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};
const ReplyBubble = ({
  comment,
  isGuide,
  onReply,
  onMorePress,
  translatedComment,
  onShowOriginal,
}: {
  comment: FeedPostComment;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
  onMorePress: (c: FeedPostComment) => void;
  translatedComment?: FeedTranslationResult;
  onShowOriginal: (commentId: string) => void;
}) => {
  const isTranslated = Boolean(translatedComment?.translated_text);
  const content = translatedComment?.translated_text || comment.content;

  return (
    <View style={styles.replyRow}>
      {comment.author?.avatar_url ? (
        <Image
          source={{ uri: comment.author.avatar_url }}
          style={[styles.replyAvatar, isGuide && styles.commentAvatarGuide]}
        />
      ) : (
        <View
          style={[
            styles.replyAvatar,
            {
              backgroundColor: isGuide ? "#FDF6E3" : COLORS.surface0,
              justifyContent: "center",
              alignItems: "center",
            },
            isGuide && styles.commentAvatarGuide,
          ]}
        >
          <Text
            style={{
              fontWeight: "bold",
              fontSize: 11,
              color: isGuide ? "#9A6C00" : COLORS.textPrimary,
            }}
          >
            {(comment.author?.full_name || translate("postDetail.user", { defaultValue: "User" })).charAt(0)}
          </Text>
        </View>
      )}

      <View style={styles.commentContent}>
        <View style={styles.commentBubbleRow}>
          <View
            style={[styles.commentBubble, isGuide && styles.commentBubbleGuide]}
          >
            <View style={styles.commentAuthorRow}>
              <Text
                style={[styles.commentAuthor, isGuide && styles.commentAuthorGuide]}
              >
                {comment.author?.full_name ||
                  translate("postDetail.user")}
              </Text>
              {isGuide ? (
                <View style={styles.commentGuideBadge}>
                  <MaterialIcons name="verified" size={10} color="#fff" />
                  <Text style={styles.commentGuideBadgeText}>
                    {translate("profile.localGuide")}
                  </Text>
                </View>
              ) : (
                <View
                  style={[styles.commentGuideBadge, { backgroundColor: "#E0E0E0" }]}
                >
                  <Text style={[styles.commentGuideBadgeText, { color: "#666" }]}>
                    {translate("profile.pilgrimRole")}
                  </Text>
                </View>
              )}
            </View>
            <Text style={styles.commentText}>{content}</Text>
            {isTranslated ? (
              <TranslationMeta
                compact
                onShowOriginal={() => onShowOriginal(comment.id)}
              />
            ) : null}
          </View>
          <CommentOverflowButton onPress={() => onMorePress(comment)} />
        </View>
        <View style={styles.commentMetaRow}>
          <Text style={styles.commentTime}>
            {formatLocalizedTime(comment.created_at, translate, i18n.language)}
          </Text>
          <TouchableOpacity
            onPress={() => onReply(comment)}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.replyLink}>
              {translate("postDetail.reply", { defaultValue: "Reply" })}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
};
const CommentItem = ({
  node,
  isGuide,
  onReply,
  onMorePress,
  translatedCommentsById,
  onShowOriginal,
}: {
  node: CommentNode;
  isGuide: boolean;
  onReply: (c: FeedPostComment) => void;
  onMorePress: (c: FeedPostComment) => void;
  translatedCommentsById: Record<string, FeedTranslationResult>;
  onShowOriginal: (commentId: string) => void;
}) => {
  const { comment, replies } = node;
  const [expanded, setExpanded] = useState(false);
  const translatedComment = translatedCommentsById[comment.id];
  const isTranslated = Boolean(translatedComment?.translated_text);
  const content = translatedComment?.translated_text || comment.content;
  const repliesToggleLabel = expanded
    ? translate("postDetail.collapseReplies")
    : replies.length === 1
      ? translate("postDetail.viewOneReply")
      : translate("postDetail.viewAllReplies", {
        count: replies.length,
      });

  return (
    <View style={styles.commentItem}>
      <View style={styles.commentRow}>
        {comment.author?.avatar_url ? (
          <Image
            source={{ uri: comment.author.avatar_url }}
            style={[styles.commentAvatar, isGuide && styles.commentAvatarGuide]}
          />
        ) : (
          <View
            style={[
              styles.commentAvatar,
              {
                backgroundColor: isGuide ? "#FDF6E3" : COLORS.surface0,
                justifyContent: "center",
                alignItems: "center",
              },
              isGuide && styles.commentAvatarGuide,
            ]}
          >
            <Text
              style={{
                fontWeight: "bold",
                color: isGuide ? "#9A6C00" : COLORS.textPrimary,
              }}
            >
              {(comment.author?.full_name || translate("postDetail.user", { defaultValue: "User" })).charAt(0)}
            </Text>
          </View>
        )}
        <View style={styles.commentContent}>
          <View style={styles.commentBubbleRow}>
            <View
              style={[styles.commentBubble, isGuide && styles.commentBubbleGuide]}
            >
              <View style={styles.commentAuthorRow}>
                <Text
                  style={[
                    styles.commentAuthor,
                    isGuide && styles.commentAuthorGuide,
                  ]}
                >
                  {comment.author?.full_name ||
                    translate("postDetail.user", { defaultValue: "User" })}
                </Text>
                {isGuide ? (
                  <View style={styles.commentGuideBadge}>
                    <MaterialIcons name="verified" size={10} color="#fff" />
                    <Text style={styles.commentGuideBadgeText}>
                      {translate("profile.localGuide", { defaultValue: "Local Guide" })}
                    </Text>
                  </View>
                ) : (
                  <View
                    style={[
                      styles.commentGuideBadge,
                      { backgroundColor: "#E0E0E0" },
                    ]}
                  >
                    <Text
                      style={[styles.commentGuideBadgeText, { color: "#666" }]}
                    >
                      {translate("profile.pilgrimRole", {
                        defaultValue: "Người hành hương",
                      })}
                    </Text>
                  </View>
                )}
              </View>
              <Text style={styles.commentText}>{content}</Text>
              {isTranslated ? (
                <TranslationMeta
                  compact
                  onShowOriginal={() => onShowOriginal(comment.id)}
                />
              ) : null}
            </View>
            <CommentOverflowButton onPress={() => onMorePress(comment)} />
          </View>
          <View style={styles.commentMetaRow}>
            <Text style={styles.commentTime}>
              {formatLocalizedTime(comment.created_at, translate, i18n.language)}
            </Text>
            <TouchableOpacity
              onPress={() => onReply(comment)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyLink}>
                {translate("postDetail.reply", { defaultValue: "Reply" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {replies.length > 0 && (
        <View style={styles.repliesContainer}>
          {!expanded ? (
            <TouchableOpacity
              style={styles.viewMoreReplies}
              onPress={() => setExpanded(true)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.viewMoreText}>{repliesToggleLabel}</Text>
              <MaterialIcons
                name="expand-more"
                size={18}
                color={COLORS.textSecondary}
              />
            </TouchableOpacity>
          ) : (
            <>
              {replies.map((reply) => {
                const isReplyGuide = reply.author?.role === "local_guide";
                return (
                  <ReplyBubble
                    key={reply.id}
                    comment={reply}
                    isGuide={isReplyGuide}
                    onReply={onReply}
                    onMorePress={onMorePress}
                    translatedComment={translatedCommentsById[reply.id]}
                    onShowOriginal={onShowOriginal}
                  />
                );
              })}

              <TouchableOpacity
                style={styles.viewMoreReplies}
                onPress={() => setExpanded(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={styles.viewMoreText}>{repliesToggleLabel}</Text>
                <MaterialIcons
                  name="expand-less"
                  size={18}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}
    </View>
  );
};
export default function PostDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const postId = route.params?.postId;
  const autoFocusComment = route.params?.autoFocusComment;
  const { t, i18n: i18nInstance } = useTranslation();
  const { user } = useAuth();
  const [commentText, setCommentText] = useState("");
  const [replyingTo, setReplyingTo] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [editingComment, setEditingComment] = useState<FeedPostComment | null>(
    null,
  );
  const [activeCommentAction, setActiveCommentAction] =
    useState<FeedPostComment | null>(null);
  const [activePostAction, setActivePostAction] = useState<FeedPost | null>(null);
  const [reportPostId, setReportPostId] = useState<string | null>(null);
  const [reportCommentId, setReportCommentId] = useState<string | null>(null);
  const [translatedPostsById, setTranslatedPostsById] = useState<Record<string, FeedTranslationResult>>({});
  const [translatedCommentsById, setTranslatedCommentsById] = useState<Record<string, FeedTranslationResult>>({});
  const [translatingPostId, setTranslatingPostId] = useState<string | null>(null);
  const [translatingCommentId, setTranslatingCommentId] = useState<string | null>(null);
  const [resolvedSiteName, setResolvedSiteName] = useState<string | null>(null);
  const [lightbox, setLightbox] = useState<{
    type: "image" | "video";
    url: string;
  } | null>(null);
  const commentInputRef = useRef<TextInput>(null);
  const flatListRef = useRef<any>(null);

  const isCurrentUserGuide = user?.role === "local_guide";
  const { confirm: showConfirm } = useConfirm();

  useEffect(() => {
    if (autoFocusComment) {
      const timer = setTimeout(() => {
        commentInputRef.current?.focus();
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [autoFocusComment]);

  const { data: post, isLoading: isLoadingPost } = usePostDetail(postId);
  const {
    data: commentsData,
    isLoading: isLoadingComments,
    fetchNextPage,
    hasNextPage,
  } = usePostComments(postId, 20);

  const addCommentMutation = useAddComment(postId);
  const updateCommentMutation = useUpdateComment(postId);
  const deleteCommentMutation = useDeleteComment(postId);
  const deletePostMutation = useDeletePost();
  const translatePostMutation = useTranslatePost();
  const translateCommentMutation = useTranslateComment(postId);
  const sendFriendRequestMutation = useSendFriendRequest();

  useEffect(() => {
    setTranslatedPostsById({});
    setTranslatedCommentsById({});
  }, [i18nInstance.language, postId]);

  const clearTranslatedPost = React.useCallback((targetPostId: string) => {
    setTranslatedPostsById((prev) => {
      if (!prev[targetPostId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[targetPostId];
      return next;
    });
  }, []);

  const clearTranslatedComment = React.useCallback((commentId: string) => {
    setTranslatedCommentsById((prev) => {
      if (!prev[commentId]) {
        return prev;
      }

      const next = { ...prev };
      delete next[commentId];
      return next;
    });
  }, []);

  const getDisplayedPostContent = React.useCallback((targetPost?: FeedPost | null) => {
    if (!targetPost) {
      return "";
    }

    return translatedPostsById[targetPost.id]?.translated_text || targetPost.content;
  }, [translatedPostsById]);

  const getDisplayedPostTitle = React.useCallback((targetPost?: FeedPost | null) => {
    if (!targetPost) {
      return "";
    }

    return (
      translatedPostsById[targetPost.id]?.translated_title ||
      targetPost.title?.trim() ||
      targetPost.sourceJournal?.title?.trim() ||
      ""
    );
  }, [translatedPostsById]);

  const getDisplayedCommentContent = React.useCallback((targetComment?: FeedPostComment | null) => {
    if (!targetComment) {
      return "";
    }

    return translatedCommentsById[targetComment.id]?.translated_text || targetComment.content;
  }, [translatedCommentsById]);

  const handleAddFriend = React.useCallback(() => {
    if (!activePostAction) return;

    const targetUser = activePostAction.author;
    const targetUserId = activePostAction.user_id;

    setActivePostAction(null);

    sendFriendRequestMutation.mutate(targetUserId, {
      onSuccess: () => {
        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2: t("postDetail.friendRequestSent", {
            defaultValue: "Đã gửi lời mời kết bạn đến {{name}}",
            name: targetUser.full_name,
          }),
        });
      },
      onError: (error: any) => {
        const errorMessage =
          error?.message === "Đã gửi lời mời kết bạn trước đó"
            ? t("postDetail.friendRequestDuplicate")
            : error?.message;

        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Lỗi" }),
          text2:
            errorMessage ||
            t("postDetail.friendRequestError", {
              defaultValue: "Không thể gửi lời mời kết bạn",
            }),
        });
      },
    });
  }, [activePostAction, sendFriendRequestMutation, t]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const locationName = getFeedPostLocationName(post);
      if (locationName) {
        if (!cancelled) {
          setResolvedSiteName(locationName);
        }
        return;
      }

      if (post?.journal_id) {
        try {
          const response = await pilgrimJournalApi.getJournalDetail(post.journal_id);
          if (cancelled) return;

          const journalLocationName = await resolveJournalLocationName(response.data);
          if (cancelled) return;

          if (journalLocationName) {
            setResolvedSiteName(journalLocationName);
            return;
          }
        } catch (error: any) {
          console.log("[PostDetail] Journal lookup failed:", error?.response?.status === 404 ? "Journal not found" : error.message);
          // Fall through to post/source journal fields.
        }
      }

      const plannerItemIds = getFeedPostPlannerItemIds(post);
      const plannerId = getFeedPostPlannerId(post);
      if (plannerItemIds.length > 0 && plannerId) {
        try {
          const response = await pilgrimPlannerApi.getPlanDetail(plannerId);
          if (cancelled) return;

          const items =
            response.data?.items ||
            Object.values(response.data?.items_by_day || {}).flat();
          const matched = (items as any[]).filter(
            (item) => plannerItemIds.includes(item.id) && item.site?.name,
          );

          if (matched.length > 0) {
            setResolvedSiteName(
              Array.from(new Set(matched.map((item: any) => item.site.name))).join(", "),
            );
            return;
          }

          if (response.data?.name) {
            setResolvedSiteName(response.data.name);
            return;
          }
        } catch {
          // Fall through to site lookup.
        }
      }

      const siteId = getFeedPostSiteId(post);
      if (!siteId) {
        if (!cancelled) {
          setResolvedSiteName(null);
        }
        return;
      }

      try {
        const response = await pilgrimSiteApi.getSiteDetail(siteId);
        if (!cancelled) {
          setResolvedSiteName(response.data?.name || null);
        }
      } catch {
        if (!cancelled) {
          setResolvedSiteName(null);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [post]);

  const handleAddComment = () => {
    if (!commentText.trim()) return;

    if (editingComment) {
      updateCommentMutation.mutate(
        {
          commentId: editingComment.id,
          content: commentText.trim(),
        },
        {
          onSuccess: () => {
            clearTranslatedComment(editingComment.id);
            Toast.show({
              type: "success",
              text1: t("common.success", { defaultValue: "Success" }),
              text2: t("postDetail.editCommentSuccess", {
                defaultValue: "Comment updated.",
              }),
            });
            setCommentText("");
            setEditingComment(null);
          },
          onError: (err: any) => {
            Toast.show({
              type: "error",
              text1: t("common.error", { defaultValue: "Error" }),
              text2:
                t("postDetail.editCommentError", {
                  defaultValue: "Unable to edit comment.",
                }) + (err?.message ? ` ${err.message}` : ""),
            });
          },
        },
      );
      return;
    }

    addCommentMutation.mutate(
      {
        content: commentText.trim(),
        ...(replyingTo ? { parent_id: replyingTo.id } : {}),
      },
      {
        onSuccess: () => {
          setCommentText("");
          setReplyingTo(null);
        },
        onError: (err) => {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2:
              t("postDetail.addCommentError", {
                defaultValue: "Unable to add comment.",
              }) + (err.message ? ` ${err.message}` : ""),
          });
        },
      },
    );
  };

  const comments = React.useMemo(() => {
    if (!commentsData) return [];
    return commentsData.pages.flatMap(
      (page: any) =>
        page.comments ??
        page.data?.comments ??
        page.data?.items ??
        page.items ??
        [],
    );
  }, [commentsData]);

  // Build Facebook-style tree: root comments + all replies flattened at depth 1
  const commentNodes = React.useMemo(
    () => buildCommentTree(comments as FeedPostComment[]),
    [comments],
  );

  const handleReplyPress = React.useCallback(
    (c: FeedPostComment) => {
      setEditingComment(null);
      setReplyingTo({
        id: c.id,
        name:
          c.author?.full_name ||
          t("postDetail.user", { defaultValue: "User" }),
      });
      commentInputRef.current?.focus();
    },
    [t],
  );

  const handleCommentMorePress = React.useCallback((c: FeedPostComment) => {
    setActiveCommentAction(c);
  }, []);

  const handleEditComment = React.useCallback(() => {
    if (!activeCommentAction) return;

    setEditingComment(activeCommentAction);
    setReplyingTo(null);
    setCommentText(activeCommentAction.content);
    setActiveCommentAction(null);

    setTimeout(() => {
      commentInputRef.current?.focus();
    }, 150);
  }, [activeCommentAction]);

  const handleDeleteComment = React.useCallback(async () => {
    if (!activeCommentAction) return;

    const targetComment = activeCommentAction;
    setActiveCommentAction(null);

    const confirmed = await showConfirm({
      title: t("postDetail.deleteCommentTitle", {
        defaultValue: "Delete comment",
      }),
      message: t("postDetail.deleteCommentMessage", {
        defaultValue: "Are you sure you want to delete this comment?",
      }),
      confirmText: t("common.delete", { defaultValue: "Delete" }),
      cancelText: t("common.cancel", { defaultValue: "Cancel" }),
      type: "danger",
    });

    if (confirmed) {
      deleteCommentMutation.mutate(targetComment.id, {
        onSuccess: () => {
          clearTranslatedComment(targetComment.id);
          if (editingComment?.id === targetComment.id) {
            setEditingComment(null);
            setCommentText("");
          }

          Toast.show({
            type: "success",
            text1: t("common.success", { defaultValue: "Success" }),
            text2: t("postDetail.deleteCommentSuccess", {
              defaultValue: "Comment deleted.",
            }),
          });
        },
        onError: (err: any) => {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2:
              t("postDetail.deleteCommentError", {
                defaultValue: "Unable to delete comment.",
              }) + (err?.message ? ` ${err.message}` : ""),
          });
        },
      });
    }
  }, [activeCommentAction, clearTranslatedComment, showConfirm, deleteCommentMutation, editingComment?.id, t]);

  const handleReportComment = React.useCallback(() => {
    if (!activeCommentAction) return;
    setReportCommentId(activeCommentAction.id);
    setActiveCommentAction(null);
  }, [activeCommentAction]);

  const handleToggleCommentTranslation = React.useCallback(() => {
    if (!activeCommentAction) return;

    const targetComment = activeCommentAction;
    const translatedComment = translatedCommentsById[targetComment.id];

    if (translatedComment) {
      clearTranslatedComment(targetComment.id);
      setActiveCommentAction(null);
      return;
    }

    if (!targetComment.content?.trim()) {
      return;
    }

    setTranslatingCommentId(targetComment.id);

    translateCommentMutation.mutate(targetComment.id, {
      onSuccess: (response) => {
        const translatedResult = response.data;

        if (!translatedResult?.translated_text?.trim()) {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2: t("postDetail.translateCommentError", {
              defaultValue: "Unable to translate comment.",
            }),
          });
          return;
        }

        setTranslatedCommentsById((prev) => ({
          ...prev,
          [targetComment.id]: translatedResult,
        }));
        setActiveCommentAction(null);

        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Success" }),
          text2: t("postDetail.translateCommentSuccess", {
            defaultValue: "Comment translated.",
          }),
        });
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Error" }),
          text2:
            t("postDetail.translateCommentError", {
              defaultValue: "Unable to translate comment.",
            }) + (error?.message ? ` ${error.message}` : ""),
        });
      },
      onSettled: () => {
        setTranslatingCommentId(null);
      },
    });
  }, [activeCommentAction, clearTranslatedComment, t, translatedCommentsById, translateCommentMutation]);

  const handleEditPost = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    clearTranslatedPost(targetPost.id);
    setActivePostAction(null);
    navigation.navigate("CreatePost", {
      postId: targetPost.id,
      initialPost: targetPost,
    });
  }, [activePostAction, clearTranslatedPost, navigation]);

  const handleDeletePost = React.useCallback(async () => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    setActivePostAction(null);

    const confirmed = await showConfirm({
      title: t("postDetail.deletePost", {
        defaultValue: "Delete post",
      }),
      message: t("postDetail.deletePostMessage", {
        defaultValue: "Are you sure you want to delete this post?",
      }),
      confirmText: t("common.delete", { defaultValue: "Delete" }),
      cancelText: t("common.cancel", { defaultValue: "Cancel" }),
      type: "danger",
    });

    if (confirmed) {
      deletePostMutation.mutate(targetPost.id, {
        onSuccess: () => {
          clearTranslatedPost(targetPost.id);
          Toast.show({
            type: "success",
            text1: t("common.success", { defaultValue: "Success" }),
            text2: t("postDetail.deletePostSuccess", {
              defaultValue: "Post deleted.",
            }),
          });
          navigation.goBack();
        },
        onError: (error: any) => {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2:
              t("postDetail.deletePostError", {
                defaultValue: "Unable to delete post.",
              }) + (error?.message ? ` ${error.message}` : ""),
          });
        },
      });
    }
  }, [activePostAction, clearTranslatedPost, showConfirm, deletePostMutation, navigation, t]);

  const handleReportPost = React.useCallback(() => {
    if (!activePostAction) return;
    setReportPostId(activePostAction.id);
    setActivePostAction(null);
  }, [activePostAction]);

  const handleTogglePostTranslation = React.useCallback(() => {
    if (!activePostAction) return;

    const targetPost = activePostAction;
    const translatedPost = translatedPostsById[targetPost.id];

    if (translatedPost) {
      clearTranslatedPost(targetPost.id);
      setActivePostAction(null);
      return;
    }

    if (!targetPost.content?.trim()) {
      return;
    }

    setTranslatingPostId(targetPost.id);

    translatePostMutation.mutate(targetPost.id, {
      onSuccess: (response) => {
        const translatedResult = response.data;

        if (!translatedResult?.translated_text?.trim()) {
          Toast.show({
            type: "error",
            text1: t("common.error", { defaultValue: "Error" }),
            text2: t("postDetail.translatePostError", {
              defaultValue: "Unable to translate post.",
            }),
          });
          return;
        }

        setTranslatedPostsById((prev) => ({
          ...prev,
          [targetPost.id]: translatedResult,
        }));
        setActivePostAction(null);

        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Success" }),
          text2: t("postDetail.translatePostSuccess", {
            defaultValue: "Post translated.",
          }),
        });
      },
      onError: (error: any) => {
        Toast.show({
          type: "error",
          text1: t("common.error", { defaultValue: "Error" }),
          text2:
            t("postDetail.translatePostError", {
              defaultValue: "Unable to translate post.",
            }) + (error?.message ? ` ${error.message}` : ""),
        });
      },
      onSettled: () => {
        setTranslatingPostId(null);
      },
    });
  }, [activePostAction, clearTranslatedPost, t, translatedPostsById, translatePostMutation]);

  const renderPostHeader = () => {
    if (isLoadingPost) {
      return (
        <View style={{ padding: SPACING.xl, alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.primary} />
        </View>
      );
    }
    if (!post) {
      return (
        <View style={{ padding: SPACING.xl, alignItems: "center" }}>
          <Text style={{ color: COLORS.textSecondary }}>
            {t("postDetail.postNotFound", { defaultValue: "Post not found" })}
          </Text>
        </View>
      );
    }

    const author = {
      name: post.author?.full_name || t("postDetail.anonymousUser", { defaultValue: "Anonymous user" }),
      avatar: post.author?.avatar_url,
    };
    const actualPost = post;
    const translatedPost = translatedPostsById[actualPost.id];
    const displayPostTitle =
      translatedPost?.translated_title ||
      actualPost.title?.trim() ||
      actualPost.sourceJournal?.title?.trim() ||
      "";
    const displayPostContent = translatedPost?.translated_text || actualPost.content;
    const isPostAuthorGuide =
      isCurrentUserGuide && actualPost.user_id === user?.id;
    const commentCount =
      (actualPost as any).comment_count ||
      (actualPost as any).comments_count ||
      comments.length;
    const imageUrls = actualPost.image_urls || [];
    const videoUrl = actualPost.video_url || actualPost.sourceJournal?.video_url;
    const audioUrl = actualPost.audio_url || actualPost.sourceJournal?.audio_url;
    const videoShouldUseAudioPlayer = isLikelyAudioFileUrl(videoUrl);
    const location = getFeedPostLocationName(actualPost, resolvedSiteName);

    return (
      <View style={styles.postContainer}>
        <View style={[styles.paddingContent, { paddingBottom: SPACING.sm }]}>
          <FeedItemHeader
            user={author}
            time={actualPost.created_at}
            location={location}
            isHighlightedGuide={isPostAuthorGuide}
            onMorePress={() => setActivePostAction(actualPost)}
          />
        </View>

        {displayPostContent ? (
          <View
            style={[
              styles.paddingContent,
              { paddingTop: 0, paddingBottom: SPACING.md },
            ]}
          >
            {displayPostTitle ? (
              <Text style={styles.postTitle}>{displayPostTitle}</Text>
            ) : null}
            <Text style={styles.bodyText}>{displayPostContent}</Text>
            {translatedPost ? (
              <TranslationMeta
                onShowOriginal={() => clearTranslatedPost(actualPost.id)}
              />
            ) : null}
          </View>
        ) : null}

        {imageUrls.length === 1 ? (
          <View style={styles.mediaSection}>
            <TouchableOpacity
              activeOpacity={0.92}
              onPress={() =>
                setLightbox({ type: "image", url: imageUrls[0] })
              }
            >
              <View
                style={[styles.imageContainer, styles.singleImageContainer]}
              >
                <Image source={{ uri: imageUrls[0] }} style={styles.feedImage} />
              </View>
            </TouchableOpacity>
          </View>
        ) : null}

        {imageUrls.length > 1 ? (
          <View style={styles.mediaSection}>
            <Text style={styles.mediaSectionTitle}>
              {t("postDetail.photosCount", {
                count: imageUrls.length,
                defaultValue: "{{count}} ảnh",
              })}
            </Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryScrollContent}
            >
              {imageUrls.map((imageUrl, index) => (
                <TouchableOpacity
                  key={`${imageUrl}-${index}`}
                  activeOpacity={0.92}
                  onPress={() =>
                    setLightbox({ type: "image", url: imageUrl })
                  }
                >
                  <View
                    style={[
                      styles.galleryImageCard,
                      index === imageUrls.length - 1 &&
                      styles.galleryImageCardLast,
                    ]}
                  >
                    <Image source={{ uri: imageUrl }} style={styles.feedImage} />
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        ) : null}

        {videoUrl ? (
          videoShouldUseAudioPlayer ? (
            <PostAudioAttachment
              url={videoUrl}
              label={t("postDetail.videoAttachment", {
                defaultValue: "Video đính kèm",
              })}
              iconName="videocam"
            />
          ) : (
            <PostVideoAttachment
              url={videoUrl}
              onOpenFullscreen={() =>
                setLightbox({ type: "video", url: videoUrl })
              }
            />
          )
        ) : null}

        {audioUrl ? (
          <PostAudioAttachment
            url={audioUrl}
            label={t("postDetail.audioAttachment", {
              defaultValue: "Ghi âm đính kèm",
            })}
            iconName="graphic-eq"
          />
        ) : null}

        {actualPost.journey ? (
          <JourneyAttachment journey={actualPost.journey} />
        ) : null}

        <View style={[styles.paddingContent, { paddingTop: SPACING.sm }]}>
          <FeedItemActions
            stats={{ prayers: actualPost.likes_count, comments: commentCount }}
            postId={actualPost.id}
            isLiked={actualPost.is_liked}
          />
        </View>

        <View style={styles.dividerHuge} />
        <View style={styles.paddingContent}>
          <Text style={styles.commentsTitle}>
            {t("postDetail.commentsTitle", {
              count: commentCount,
              defaultValue: "Comments ({{count}})",
            })}
          </Text>
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={COLORS.white} />

      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("postDetail.title", { defaultValue: "Post details" })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 60 : 20}
      >
        <FlatList
          ref={flatListRef}
          style={{ flex: 1 }}
          data={commentNodes}
          keyExtractor={(node, index: number) =>
            node.comment.id || `comment-${index}`
          }
          ListHeaderComponent={renderPostHeader}
          contentContainerStyle={{ flexGrow: 1, paddingBottom: SPACING.xxl }}
          onEndReached={() => {
            if (hasNextPage) fetchNextPage();
          }}
          renderItem={({ item: node }) => {
            const isCommentByGuide =
              node.comment.author?.role === "local_guide";
            return (
              <CommentItem
                node={node}
                isGuide={isCommentByGuide}
                onReply={handleReplyPress}
                onMorePress={handleCommentMorePress}
                translatedCommentsById={translatedCommentsById}
                onShowOriginal={clearTranslatedComment}
              />
            );
          }}
          ListEmptyComponent={
            !isLoadingComments && !isLoadingPost ? (
              <View style={styles.emptyContainer}>
                <MaterialIcons
                  name="chat-bubble-outline"
                  size={48}
                  color={COLORS.borderMedium}
                />
                <Text style={styles.emptyTitle}>
                  {t("postDetail.emptyTitle", {
                    defaultValue: "No comments yet",
                  })}
                </Text>
                <Text style={styles.emptyText}>
                  {t("postDetail.emptyText", {
                    defaultValue: "Be the first to share your thoughts!",
                  })}
                </Text>
              </View>
            ) : null
          }
        />

        {editingComment ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              {t("postDetail.editingComment", {
                defaultValue: "Editing comment",
              })}
            </Text>
            <TouchableOpacity
              onPress={() => {
                setEditingComment(null);
                setCommentText("");
              }}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyBannerCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {!editingComment && replyingTo ? (
          <View style={styles.replyBanner}>
            <Text style={styles.replyBannerText} numberOfLines={1}>
              {t("postDetail.reply", { defaultValue: "Reply" })}{" "}
              <Text style={styles.replyBannerName}>{replyingTo.name}</Text>
            </Text>
            <TouchableOpacity
              onPress={() => setReplyingTo(null)}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.replyBannerCancel}>
                {t("common.cancel", { defaultValue: "Cancel" })}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Comment Input */}
        <View
          style={[
            styles.inputContainer,
            { paddingBottom: Platform.OS === "ios" ? 24 : SPACING.sm },
          ]}
        >
          {isCurrentUserGuide && (
            <View style={styles.inputGuideBadge}>
              <MaterialIcons name="verified" size={14} color="#D4AF37" />
            </View>
          )}
          <TextInput
            ref={commentInputRef}
            style={[
              styles.commentInput,
              isCurrentUserGuide && styles.commentInputGuide,
            ]}
            placeholder={
              editingComment
                ? t("postDetail.editCommentPlaceholder")
                : replyingTo
                  ? t("postDetail.replyPlaceholder", {
                    name: replyingTo.name,
                  })
                  : isCurrentUserGuide
                    ? t("postDetail.commentAsGuidePlaceholder")
                    : t("postDetail.commentPlaceholder")
            }
            placeholderTextColor={COLORS.textTertiary}
            value={commentText}
            onChangeText={setCommentText}
            multiline
            onFocus={() => {
              if (commentNodes.length > 0) {
                setTimeout(() => {
                  flatListRef.current?.scrollToEnd({ animated: true });
                }, 500);
              }
            }}
          />
          <TouchableOpacity
            style={[
              styles.sendButton,
              commentText.trim() ? styles.sendButtonActive : null,
            ]}
            onPress={handleAddComment}
            disabled={
              !commentText.trim() ||
              addCommentMutation.isPending ||
              updateCommentMutation.isPending
            }
          >
            {addCommentMutation.isPending || updateCommentMutation.isPending ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : (
              <Ionicons
                name={editingComment ? "checkmark" : "send"}
                size={18}
                color={commentText.trim() ? "#fff" : COLORS.textTertiary}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      <PostActionSheet
        visible={Boolean(activePostAction)}
        postContent={getDisplayedPostTitle(activePostAction) || getDisplayedPostContent(activePostAction)}
        canTranslate={Boolean(activePostAction?.content?.trim())}
        isOwner={Boolean(
          user?.id &&
          activePostAction?.user_id &&
          user.id === activePostAction.user_id
        )}
        isTranslated={Boolean(activePostAction && translatedPostsById[activePostAction.id]?.translated_text)}
        busy={
          deletePostMutation.isPending ||
          sendFriendRequestMutation.isPending ||
          translatingPostId === activePostAction?.id
        }
        onClose={() => setActivePostAction(null)}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
        onReport={handleReportPost}
        onTranslate={handleTogglePostTranslation}
        onAddFriend={isCurrentUserGuide ? undefined : handleAddFriend}
      />

      <ReportPostModal
        visible={Boolean(reportPostId)}
        onClose={() => setReportPostId(null)}
        targetId={reportPostId || ""}
        targetType="post"
      />

      <CommentActionSheet
        visible={Boolean(activeCommentAction)}
        comment={activeCommentAction}
        commentPreview={getDisplayedCommentContent(activeCommentAction)}
        canTranslate={Boolean(activeCommentAction?.content?.trim())}
        isOwner={Boolean(
          user?.id &&
          activeCommentAction?.user_id &&
          user.id === activeCommentAction.user_id
        )}
        isTranslated={Boolean(activeCommentAction && translatedCommentsById[activeCommentAction.id]?.translated_text)}
        busy={
          deleteCommentMutation.isPending ||
          translatingCommentId === activeCommentAction?.id
        }
        onClose={() => setActiveCommentAction(null)}
        onEdit={handleEditComment}
        onDelete={handleDeleteComment}
        onReport={handleReportComment}
        onTranslate={handleToggleCommentTranslation}
      />

      <ReportPostModal
        visible={Boolean(reportCommentId)}
        onClose={() => setReportCommentId(null)}
        targetId={reportCommentId || ""}
        targetType="comment"
      />

      <MediaLightbox
        visible={Boolean(lightbox)}
        onClose={() => setLightbox(null)}
        imageUri={lightbox?.type === "image" ? lightbox.url : undefined}
        videoUrl={lightbox?.type === "video" ? lightbox.url : undefined}
      />
    </View>
  );
}

// Styles

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingTop:
      Platform.OS === "android"
        ? (StatusBar.currentHeight || 0) + SPACING.sm
        : SPACING.sm,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },

  // Post
  postContainer: {
    backgroundColor: COLORS.white,
  },
  paddingContent: {
    paddingHorizontal: SPACING.lg,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    flex: 1,
    minWidth: 0,
  },
  userMeta: {
    flex: 1,
    minWidth: 0,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  avatarGuide: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  userNameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    minWidth: 0,
  },
  userName: {
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
  },
  userNameGuide: {
    color: "#9A6C00",
  },
  guideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  guideBadgeText: {
    color: COLORS.white,
    fontSize: 10,
    fontWeight: "700",
    textTransform: "uppercase",
  },
  timeText: {
    color: COLORS.textTertiary,
    fontSize: TYPOGRAPHY.fontSize.xs,
  },
  mediaSection: {
    paddingHorizontal: SPACING.lg,
    marginBottom: SPACING.md,
  },
  mediaSectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  mediaSectionSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  imageContainer: {
    width: "auto",
    height: 300,
    marginBottom: SPACING.md,
    marginHorizontal: SPACING.lg,
    borderRadius: 12,
    overflow: "hidden",
    backgroundColor: COLORS.backgroundSoft,
  },
  singleImageContainer: {
    marginHorizontal: 0,
    marginBottom: 0,
  },
  galleryScrollContent: {
    paddingRight: SPACING.md,
  },
  galleryImageCard: {
    width: POST_MEDIA_WIDTH,
    height: 300,
    borderRadius: 12,
    overflow: "hidden",
    marginRight: SPACING.sm,
    backgroundColor: COLORS.backgroundSoft,
  },
  galleryImageCardLast: {
    marginRight: 0,
  },
  feedImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  bodyText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    lineHeight: 24,
  },
  postTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    color: COLORS.textPrimary,
    lineHeight: 30,
    fontWeight: "700",
    fontFamily: "serif",
    marginBottom: SPACING.xs,
  },
  audioCard: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  audioCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  audioIconBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(24, 119, 242, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  audioTextColumn: {
    flex: 1,
  },
  audioActionButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.textSecondary,
  },
  audioActionButtonActive: {
    backgroundColor: COLORS.primary,
  },
  audioProgressTrack: {
    marginTop: SPACING.md,
    height: 6,
    borderRadius: 999,
    backgroundColor: COLORS.borderLight,
    overflow: "hidden",
  },
  audioProgressFill: {
    height: "100%",
    borderRadius: 999,
    backgroundColor: COLORS.primary,
  },
  audioTimeRow: {
    marginTop: SPACING.xs,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  audioTimeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  videoCard: {
    borderRadius: 16,
    overflow: "hidden",
    backgroundColor: "#000",
  },
  videoPlayer: {
    width: "100%",
    height: 220,
  },
  videoFallback: {
    height: 120,
    borderRadius: 16,
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
  },
  videoFallbackText: {
    marginTop: SPACING.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  mediaInlineAction: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
  },
  mediaInlineActionText: {
    marginLeft: 6,
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "600",
    color: COLORS.primary,
  },
  dividerHuge: {
    height: 8,
    backgroundColor: COLORS.backgroundSoft,
    marginHorizontal: -SPACING.lg,
    marginVertical: SPACING.lg,
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
    paddingTop: SPACING.md,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 6,
  },

  // Comments section
  commentsTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "bold",
    marginBottom: SPACING.sm,
  },

  // Root comment wrapper
  commentItem: {
    paddingHorizontal: SPACING.lg,
    paddingRight: SPACING.lg,
    marginBottom: 12,
  },

  // Row inside a comment (avatar + bubble)
  commentRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  commentAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 10,
  },
  commentAvatarGuide: {
    borderWidth: 2,
    borderColor: "#D4AF37",
  },
  commentContent: {
    flex: 1,
  },
  commentBubbleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.xs,
  },
  commentAuthorRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    flexWrap: "wrap",
    marginBottom: 1,
  },
  commentBubble: {
    flex: 1,
    backgroundColor: "#F0F2F5",
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 14,
    alignSelf: "flex-start",
  },
  commentBubbleGuide: {
    backgroundColor: "#FDF6E3",
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
  },
  commentAuthor: {
    fontWeight: "bold",
    fontSize: 12,
    color: COLORS.textPrimary,
  },
  commentAuthorGuide: {
    color: "#9A6C00",
  },
  commentGuideBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    backgroundColor: "#D4AF37",
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 999,
  },
  commentGuideBadgeText: {
    color: "#fff",
    fontSize: 8,
    fontWeight: "700",
  },
  commentText: {
    fontSize: 13,
    color: COLORS.textPrimary,
    lineHeight: 18,
  },
  commentMoreButton: {
    width: 24,
    alignItems: "center",
    paddingTop: 6,
  },
  commentMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 3,
    marginLeft: 2,
  },
  replyLink: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.primary,
  },
  commentTime: {
    fontSize: 11,
    color: COLORS.textTertiary,
  },

  // Replies container (all indented, FB style)
  repliesContainer: {
    marginTop: 6,
    marginLeft: 18,
    paddingLeft: 12,
    borderLeftWidth: 1,
    borderLeftColor: COLORS.borderLight,
  },

  // "View X more replies" row
  viewMoreReplies: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: 2,
    paddingVertical: 2,
  },
  viewMoreText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // Individual reply row (inside repliesContainer)
  replyRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginTop: 6,
  },
  replyAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginTop: 2,
    marginRight: 8,
    flexShrink: 0,
  },

  // Reply banner
  replyBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
    backgroundColor: "#EEF2FF",
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  replyBannerText: {
    flex: 1,
    fontSize: 13,
    color: COLORS.textSecondary,
    marginRight: SPACING.sm,
  },
  replyBannerName: {
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  replyBannerCancel: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.primary,
  },
  commentSheetRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  commentSheetOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  commentSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.lg,
    ...SHADOWS.large,
  },
  commentSheetHandle: {
    width: 40,
    height: 4,
    borderRadius: 999,
    backgroundColor: COLORS.borderMedium,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  commentSheetTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  commentSheetPreview: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: SPACING.xs,
    marginBottom: SPACING.md,
  },
  commentSheetAction: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingVertical: SPACING.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.borderLight,
  },
  commentSheetActionText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textPrimary,
    fontWeight: "500",
  },
  commentSheetActionTextDanger: {
    color: COLORS.danger,
  },
  commentSheetCancel: {
    marginTop: SPACING.sm,
    alignItems: "center",
    paddingVertical: SPACING.md,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 14,
  },
  commentSheetCancelText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },

  // Empty state
  emptyContainer: {
    alignItems: "center",
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    gap: SPACING.sm,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  emptyText: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.md,
  },

  // Input bar
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.sm,
    paddingHorizontal: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    backgroundColor: COLORS.white,
  },
  inputGuideBadge: {
    marginRight: 6,
  },
  commentInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: "#F0F2F5",
    borderRadius: 20,
    paddingHorizontal: SPACING.md,
    paddingTop: Platform.OS === "ios" ? 10 : 8,
    paddingBottom: Platform.OS === "ios" ? 10 : 8,
    fontSize: 14,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    color: COLORS.textPrimary,
  },
  commentInputGuide: {
    borderColor: "rgba(212, 175, 55, 0.4)",
    backgroundColor: "#FFFEF9",
  },
  sendButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.xs,
    backgroundColor: COLORS.borderLight,
  },
  sendButtonActive: {
    backgroundColor: COLORS.accent,
    ...SHADOWS.small,
  },
  // Journey Attachment styles
  journeyCard: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  journeyHeader: {
    marginBottom: SPACING.md,
  },
  journeyTitleRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  journeyIconBadge: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "rgba(24, 119, 242, 0.08)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  journeyNameCol: {
    flex: 1,
  },
  journeyName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  journeyDates: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
  },
  journeyMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    gap: 8,
  },
  journeyMetaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  journeyMetaText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
  journeySummaryRow: {
    flexDirection: "row",
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 12,
    paddingVertical: SPACING.md,
    marginBottom: SPACING.lg,
  },
  summaryItem: {
    flex: 1,
    alignItems: "center",
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.primary,
  },
  summaryLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
    fontWeight: "600",
  },
  summaryDivider: {
    width: 1,
    height: "100%",
    backgroundColor: COLORS.borderLight,
  },
  itineraryContainer: {
    paddingLeft: 4,
  },
  dayGroup: {
    marginBottom: SPACING.md,
  },
  dayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  dayPulse: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.primary,
    marginRight: 8,
  },
  dayHeaderText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayItemsList: {
    paddingLeft: 3,
  },
  siteItemRow: {
    flexDirection: "row",
    minHeight: 50,
  },
  siteTimeline: {
    width: 20,
    alignItems: "center",
  },
  siteTimelineLine: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.borderLight,
  },
  siteTimelineDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: COLORS.white,
    borderWidth: 2,
    borderColor: COLORS.primary,
    position: "absolute",
    top: 6,
  },
  siteInfoCard: {
    flex: 1,
    paddingBottom: SPACING.md,
    paddingLeft: SPACING.xs,
  },
  siteItemName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  siteImageContainer: {
    width: "100%",
    height: 120,
    borderRadius: 8,
    overflow: 'hidden',
    marginBottom: 8,
    backgroundColor: COLORS.backgroundSoft,
  },
  siteNoteContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
    gap: 4,
  },
  siteImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  sitePatronText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '500',
  },
  metaDivider: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: COLORS.textTertiary,
  },
  siteMeta: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    marginTop: 2,
    gap: 6,
  },
  siteProvince: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  siteNoteText: {
    flex: 1,
    fontSize: 11,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  skippedBadge: {
    backgroundColor: "rgba(239, 68, 68, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  skippedText: {
    fontSize: 10,
    color: "#EF4448",
    fontWeight: "700",
  },
  visitedBadge: {
    backgroundColor: "rgba(34, 197, 94, 0.1)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  visitedText: {
    fontSize: 10,
    color: "#22C55E",
    fontWeight: "700",
  },
  cloneBtn: {
    backgroundColor: COLORS.primary,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 12,
    marginTop: SPACING.sm,
    gap: 8,
  },
  cloneBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: "700",
  },

  // Clone Modal Styles
  cloneModalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  cloneModalContent: {
    backgroundColor: COLORS.backgroundSoft,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    height: "85%",
  },
  cloneHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: SPACING.lg,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  cloneCloseBtn: {
    padding: 8,
    marginLeft: -8,
  },
  cloneCloseText: {
    color: COLORS.textSecondary,
    fontSize: 14,
    fontWeight: "600",
  },
  cloneHeaderTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  cloneScroll: {
    padding: SPACING.lg,
  },
  cloneSection: {
    marginBottom: SPACING.xl,
  },
  cloneLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: SPACING.sm,
  },
  cloneLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cloneInput: {
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 16,
    padding: SPACING.md,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
  cloneDurationBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 8,
  },
  cloneDurationText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cloneDateSelector: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    borderRadius: 20,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: COLORS.border,
    height: 80,
  },
  cloneDateBox: {
    flex: 1,
    padding: SPACING.md,
    alignItems: "center",
    justifyContent: "center",
  },
  cloneDateBoxActive: {
    backgroundColor: "#F3F4F6",
  },
  cloneDateLabel: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginBottom: 4,
  },
  cloneDateValue: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cloneDateArrow: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#F9FAFB",
    alignItems: "center",
    justifyContent: "center",
  },
  cloneCounterBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cloneCounterLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  cloneCounterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  cloneCounterBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    alignItems: "center",
    justifyContent: "center",
  },
  cloneCounterValue: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    minWidth: 20,
    textAlign: "center",
  },
  cloneTransportRow: {
    flexDirection: "row",
    gap: 12,
  },
  cloneTransportItem: {
    flex: 1,
    backgroundColor: COLORS.white,
    padding: SPACING.md,
    borderRadius: 24,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cloneTransportItemSelected: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  cloneTransportLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textTertiary,
    marginTop: SPACING.xs,
  },
  cloneTransportLabelSelected: {
    color: COLORS.white,
  },
  cloneConfirmBtn: {
    margin: SPACING.lg,
    backgroundColor: COLORS.accent,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.medium,
  },
  cloneConfirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },

  // Calendar within modal
  cloneCalendarCard: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  cloneCalendarHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: SPACING.sm,
  },
  cloneCalendarMonth: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  cloneCalendarDaysHeader: {
    flexDirection: "row",
    marginBottom: SPACING.xs,
  },
  cloneCalendarDayHeader: {
    flex: 1,
    textAlign: "center",
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textTertiary,
  },
  cloneCalendarGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  cloneCalendarDay: {
    width: "14.28%",
    aspectRatio: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 8,
  },
  cloneCalendarDaySelected: {
    backgroundColor: COLORS.primary,
  },
  cloneCalendarDayDisabled: {
    opacity: 0.3,
  },
  cloneCalendarDayTextDisabled: {
    color: COLORS.textTertiary,
  },
  cloneCalendarDayText: {
    fontSize: 13,
    color: COLORS.textPrimary,
  },
  cloneCalendarDayTextSelected: {
    color: COLORS.white,
    fontWeight: "700",
  },
  // Deposit Info
  infoIconButton: {
    padding: 2,
  },
  cloneDepositCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  cloneInputLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: "600",
  },
  cloneDepositInput: {
    backgroundColor: "#F9F7F1",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  clonePenaltyRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F7F1",
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 52,
  },
  clonePenaltyInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    fontWeight: "700",
  },
  clonePenaltySuffix: {
    fontSize: 18,
    color: COLORS.textSecondary,
    fontWeight: "700",
    marginLeft: 8,
  },
  clonePenaltyHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "500",
  },
});
