import { MaterialIcons } from "@expo/vector-icons";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Audio } from "expo-av";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { LinearGradient } from "expo-linear-gradient";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  ImageBackground,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View
} from "react-native";
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { AudioPickerModal } from "../../../../components/common/AudioPickerModal";
import { MediaPickerModal } from "../../../../components/common/MediaPickerModal";
import { AISparkles } from "../../../../components/ui/AISparkles";
import {
  COLORS,
  SHADOWS,
  SPACING
} from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import pilgrimJournalApi from "../../../../services/api/pilgrim/journalApi";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import {
  JournalVisibility,
  PrayerSuggestionResult,
} from "../../../../types/pilgrim";
import {
  CheckInEntity,
  PlanEntity,
} from "../../../../types/pilgrim/planner.types";
import {
  normalizeImageUrls,
  parsePostgresArray,
} from "../../../../utils/postgresArrayParser";

const { width } = Dimensions.get("window");
const FontDisplay = Platform.select({
  ios: "Georgia",
  android: "serif",
  default: "serif",
});

const dedupeCheckInsByPlannerItem = (checkIns: CheckInEntity[]) =>
  Array.from(
    new Map(
      checkIns
        .filter((checkIn) => checkIn.planner_item_id)
        .map((checkIn) => [checkIn.planner_item_id, checkIn]),
    ).values(),
  );

const getJournalPlannerItemIds = (journal: any): string[] =>
  Array.from(
    new Set([
      ...parsePostgresArray(journal?.planner_item_id),
      ...parsePostgresArray(journal?.planner_item_ids),
    ]),
  );

const buildLocationFromCheckIns = (checkIns: CheckInEntity[]) =>
  Array.from(
    new Set(
      checkIns.map((checkIn) => checkIn.site?.name || "").filter(Boolean),
    ),
  ).join(", ");

const getSiteImageFromSource = (site?: Record<string, any> | null) => {
  if (!site) return undefined;

  const normalizedImageUrls = normalizeImageUrls(site.image_url);

  return (
    site.cover_image ||
    site.image ||
    site.coverImage ||
    normalizedImageUrls[0] ||
    site.thumbnail_url ||
    undefined
  );
};

const mergeCheckInSiteSnapshot = (
  checkIn: CheckInEntity,
  plannerItem?: { site?: Record<string, any> } | null,
): CheckInEntity => {
  const plannerSite = plannerItem?.site;

  if (!checkIn.site && !plannerSite) return checkIn;

  const mergedSite = {
    ...(plannerSite || {}),
    ...(checkIn.site || {}),
  };

  return {
    ...checkIn,
    site: {
      id: mergedSite.id || checkIn.site?.id || plannerSite?.id || '',
      name: mergedSite.name || checkIn.site?.name || plannerSite?.name || '',
      address: mergedSite.address,
      cover_image:
        getSiteImageFromSource(checkIn.site as any) ||
        getSiteImageFromSource(plannerSite) ||
        undefined,
      image:
        (checkIn.site as any)?.image ||
        (plannerSite as any)?.image ||
        (plannerSite as any)?.cover_image ||
        (checkIn.site as any)?.cover_image ||
        undefined,
    },
  };
};

const getCheckInSiteImage = (checkIn?: CheckInEntity | null) =>
  getSiteImageFromSource(checkIn?.site as any);

const extractPrayerText = (result: PrayerSuggestionResult | null) => {
  if (!result) return "";

  const candidates = [
    result.prayer,
    result.suggested_prayer,
    result.suggestion,
    result.prayer_text,
  ];

  return candidates.find(
    (value): value is string => typeof value === "string" && value.trim().length > 0,
  ) || "";
};

const appendPrayerToJournalContent = (
  currentContent: string,
  prayerText: string,
) => {
  const trimmedPrayer = prayerText.trim();
  if (!trimmedPrayer) return currentContent;

  const trimmedContent = currentContent.trim();
  if (!trimmedContent) return trimmedPrayer;
  if (trimmedContent.includes(trimmedPrayer)) return currentContent;

  return `${trimmedContent}\n\n${trimmedPrayer}`;
};

export default function CreateJournalScreen() {
  const { t } = useTranslation();
  const { confirm } = useConfirm();
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { journalId, plannerItemId: paramPlannerItemId } = route.params || {};
  const insets = useSafeAreaInsets();

  const handleBackNavigation = () => {
    if (route.params?.from === "ActiveJourney" && route.params?.planId) {
      navigation.navigate("Lich trinh", {
        screen: "ActiveJourneyScreen",
        params: { planId: route.params.planId }
      });
    } else {
      navigation.goBack();
    }
  };

  // State
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(false);
  const [existingImages, setExistingImages] = useState<string[]>([]);
  const [existingVideoUrl, setExistingVideoUrl] = useState<string | null>(null);
  const [existingAudioUrl, setExistingAudioUrl] = useState<string | null>(null);

  // Media State
  const [selectedImages, setSelectedImages] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [selectedVideos, setSelectedVideos] = useState<
    ImagePicker.ImagePickerAsset[]
  >([]);
  const [previewMedia, setPreviewMedia] = useState<{
    type: "image" | "video";
    uri: string;
  } | null>(null);
  const [isMediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [isAudioPickerVisible, setAudioPickerVisible] = useState(false);

  // Audio Recording State
  const [recording, setRecording] = useState<Audio.Recording | undefined>();
  const [recordingUri, setRecordingUri] = useState<string | undefined>();
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [sound, setSound] = useState<Audio.Sound | undefined>();
  const [isPlaying, setIsPlaying] = useState(false);
  const originalMediaRef = useRef<{
    images: string[];
    videoUrl: string | null;
    audioUrl: string | null;
  }>({
    images: [],
    videoUrl: null,
    audioUrl: null,
  });

  // Preview
  const previewVideoPlayer = useVideoPlayer(
    previewMedia?.type === "video" ? previewMedia.uri : null,
    (player) => {
      player.loop = true;
    },
  );
  const playableAudioUri = recordingUri || existingAudioUrl || undefined;

  // Step 1: Select a completed pilgrimage plan (planner_id)
  const [completedPlanners, setCompletedPlanners] = useState<PlanEntity[]>([]);
  const [selectedPlanner, setSelectedPlanner] = useState<PlanEntity | null>(
    null,
  );
  const [plannerLoading, setPlannerLoading] = useState(false);

  // Step 2: Select check-in locations from that plan (planner_item_ids - multi-select)
  const [allCheckIns, setAllCheckIns] = useState<CheckInEntity[]>([]);
  const [filteredCheckIns, setFilteredCheckIns] = useState<CheckInEntity[]>([]);
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInsLoaded, setCheckInsLoaded] = useState(false);
  const [selectedPlannerItemIds, setSelectedPlannerItemIds] = useState<
    string[]
  >(paramPlannerItemId ? [paramPlannerItemId] : []);
  const [journalPrivacy, setJournalPrivacy] =
    useState<JournalVisibility>("private");
  const [location, setLocation] = useState("");
  const [plannerModalVisible, setPlannerModalVisible] = useState(false);
  const [pickerTab, setPickerTab] = useState<"planner" | "locations">(
    "planner",
  );
  const [prayerMood, setPrayerMood] = useState("");
  const [prayerIntention, setPrayerIntention] = useState("");
  const [prayerLoading, setPrayerLoading] = useState(false);
  const [prayerResult, setPrayerResult] = useState<PrayerSuggestionResult | null>(
    null,
  );
  const [prayerError, setPrayerError] = useState<string | null>(null);
  const [pendingEditSelection, setPendingEditSelection] = useState<{
    plannerId?: string;
    plannerName?: string;
    plannerItemIds: string[];
    location?: string;
  } | null>(null);
  const [editSelectionInitialized, setEditSelectionInitialized] =
    useState(false);
  const [aiBottomSheetVisible, setAiBottomSheetVisible] = useState(false);
  const prayerSlowTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearPrayerSlowTimer = () => {
    if (prayerSlowTimerRef.current) {
      clearTimeout(prayerSlowTimerRef.current);
      prayerSlowTimerRef.current = null;
    }
  };

  useEffect(() => {
    setPendingEditSelection(null);
    setEditSelectionInitialized(false);
  }, [journalId]);

  useEffect(() => {
    return () => {
      clearPrayerSlowTimer();
    };
  }, []);

  const resetDraftMediaState = () => {
    if (sound) {
      sound.unloadAsync().catch(() => {});
      setSound(undefined);
    }
    setSelectedImages([]);
    setSelectedVideos([]);
    setRecordingUri(undefined);
    setRecordingDuration(0);
    setPreviewMedia(null);
    setIsPlaying(false);
  };

  const applyServerMediaState = (data: {
    image_url?: any;
    video_url?: string | null;
    audio_url?: string | null;
  }) => {
    const nextImages = normalizeImageUrls(data.image_url);
    const nextVideoUrl = data.video_url ?? null;
    const nextAudioUrl = data.audio_url ?? null;

    setExistingImages(nextImages);
    setExistingVideoUrl(nextVideoUrl);
    setExistingAudioUrl(nextAudioUrl);
    resetDraftMediaState();
    originalMediaRef.current = {
      images: nextImages,
      videoUrl: nextVideoUrl,
      audioUrl: nextAudioUrl,
    };
  };

  useEffect(() => {
    fetchCompletedPlanners();
    fetchMyCheckIns();
    if (journalId) fetchJournalDetails();
  }, [journalId]);

  useEffect(() => {
    if (
      !journalId ||
      !checkInsLoaded ||
      !pendingEditSelection ||
      editSelectionInitialized
    ) {
      return;
    }

    const plannerChoice = pendingEditSelection.plannerId
      ? completedPlanners.find(
          (planner) => planner.id === pendingEditSelection.plannerId,
        ) ||
        ({
          id: pendingEditSelection.plannerId,
          name:
            pendingEditSelection.plannerName || t("journal.genericPlanName"),
          user_id: "",
          number_of_people: 0,
          transportation: "",
          status: "completed",
          share_token: "",
          qr_code_url: "",
          created_at: "",
          updated_at: "",
        } as PlanEntity)
      : null;

    if (!plannerChoice) {
      const nextPlannerItemIds = pendingEditSelection.plannerItemIds;
      setSelectedPlannerItemIds(nextPlannerItemIds);
      setLocation(pendingEditSelection.location || "");
      setEditSelectionInitialized(true);
      return;
    }

    hydratePlannerSelection(
      plannerChoice,
      pendingEditSelection.plannerItemIds,
      {
        autoSelectSingle: false,
        fallbackLocation: pendingEditSelection.location,
      },
    ).finally(() => {
      setEditSelectionInitialized(true);
    });
  }, [
    checkInsLoaded,
    completedPlanners,
    editSelectionInitialized,
    journalId,
    pendingEditSelection,
  ]);

  /** Fetch all planners with status === "completed". */
  const fetchCompletedPlanners = async () => {
    try {
      setPlannerLoading(true);
      const response = await pilgrimPlannerApi.getPlans({ limit: 100 });
      if (response.success && response.data?.planners) {
        const completed = response.data.planners.filter(
          (p) => p.status === "completed",
        );
        setCompletedPlanners(completed);
      }
    } catch (error) {
      console.error("Failed to fetch completed planners", error);
    } finally {
      setPlannerLoading(false);
    }
  };

  /** Fetch all user check-ins (only status="checked_in"). */
  const fetchMyCheckIns = async () => {
    try {
      const response = await pilgrimPlannerApi.getMyCheckIns();
      if (response.success && response.data) {
        const rawData = response.data as
          | CheckInEntity[]
          | { check_ins?: CheckInEntity[] };
        const all = Array.isArray(rawData) ? rawData : rawData.check_ins || [];
        const valid = dedupeCheckInsByPlannerItem(
          all.filter(
            (c) =>
              (!c.status || c.status === "checked_in") && c.site && c.site.name,
          ),
        );
        setAllCheckIns(valid);

        // If we navigated from a specific planner item
        if (paramPlannerItemId) {
          const found = valid.find(
            (c) => c.planner_item_id === paramPlannerItemId,
          );
          if (found && found.site) {
            setLocation(found.site.name);
            setSelectedPlannerItemIds([found.planner_item_id]);
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch check-ins", error);
    } finally {
      setCheckInsLoaded(true);
    }
  };

  /** User selects a plan -> fetch detail, filter check-ins, and reset location selection. */
  const hydratePlannerSelection = async (
    planner: PlanEntity,
    initialSelectedPlannerItemIds: string[] = [],
    options?: {
      autoSelectSingle?: boolean;
      fallbackLocation?: string;
    },
  ) => {
    setSelectedPlanner(planner);
    setFilteredCheckIns([]);
    setCheckInLoading(true);

    try {
      const detail = await pilgrimPlannerApi.getPlanDetail(planner.id);
      const plannerItems = (
        detail?.data?.items ||
        Object.values(detail?.data?.items_by_day || {}).flat()
      ) as any[];
      const plannerItemMap = new Map(
        plannerItems.map((item: any) => [item.id, item]),
      );
      const plannerItemIds = new Set(plannerItems.map((item: any) => item.id));
      const filtered = dedupeCheckInsByPlannerItem(
        allCheckIns
          .filter((c) => plannerItemIds.has(c.planner_item_id))
          .map((checkIn) =>
            mergeCheckInSiteSnapshot(
              checkIn,
              plannerItemMap.get(checkIn.planner_item_id),
            ),
          ),
      );
      const matchedCheckIns = filtered.filter((checkIn) =>
        initialSelectedPlannerItemIds.includes(checkIn.planner_item_id),
      );

      setFilteredCheckIns(filtered);

      if (matchedCheckIns.length > 0) {
        setSelectedPlannerItemIds(
          matchedCheckIns.map((checkIn) => checkIn.planner_item_id),
        );
        setLocation(buildLocationFromCheckIns(matchedCheckIns));
        return;
      }

      if (
        options?.autoSelectSingle !== false &&
        filtered.length === 1 &&
        filtered[0].site
      ) {
        setSelectedPlannerItemIds([filtered[0].planner_item_id]);
        setLocation(filtered[0].site.name);
        return;
      }

      setSelectedPlannerItemIds([]);
      setLocation(options?.fallbackLocation || "");
    } catch (error) {
      console.error("Failed to fetch planner detail", error);
      const filtered = dedupeCheckInsByPlannerItem(
        allCheckIns.filter((c) => c.planner?.id === planner.id),
      );
      const matchedCheckIns = filtered.filter((checkIn) =>
        initialSelectedPlannerItemIds.includes(checkIn.planner_item_id),
      );

      setFilteredCheckIns(filtered);

      if (matchedCheckIns.length > 0) {
        setSelectedPlannerItemIds(
          matchedCheckIns.map((checkIn) => checkIn.planner_item_id),
        );
        setLocation(buildLocationFromCheckIns(matchedCheckIns));
        return;
      }

      setSelectedPlannerItemIds([]);
      setLocation(options?.fallbackLocation || "");
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleSelectPlanner = async (planner: PlanEntity) => {
    setEditSelectionInitialized(true);
    await hydratePlannerSelection(planner);
    return;
    /*
            // Fetch planner detail to get items[]
            const detail = await pilgrimPlannerApi.getPlanDetail(planner.id);
            const plannerItems = detail?.data?.items || 
                Object.values(detail?.data?.items_by_day || {}).flat();

            // Collect planner item ids
            const plannerItemIds = new Set(plannerItems.map((item: any) => item.id));

            // Keep only check-ins whose planner_item_id belongs to this planner
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => plannerItemIds.has(c.planner_item_id)));
            setFilteredCheckIns(filtered);

            // Auto-select when there is only one check-in
            if (filtered.length === 1 && filtered[0].site) {
                setSelectedPlannerItemIds([filtered[0].planner_item_id]);
                setLocation(filtered[0].site.name);
            }
        } catch (error) {
            console.error('Failed to fetch planner detail', error);
            const filtered = dedupeCheckInsByPlannerItem(allCheckIns.filter(c => c.planner?.id === planner.id));
            setFilteredCheckIns(filtered);
        } finally {
            setCheckInLoading(false);
        }
        */
  };

  const handleChoosePlanner = async (planner: PlanEntity) => {
    await handleSelectPlanner(planner);
    setPickerTab("locations");
  };

  const openLocationSheet = (initialTab?: "planner" | "locations") => {
    const nextTab =
      initialTab ||
      (selectedPlanner ? "locations" : "planner");
    setPickerTab(nextTab);
    setPlannerModalVisible(true);
  };

  const getPlannerCheckInCount = (plannerId: string) =>
    dedupeCheckInsByPlannerItem(
      allCheckIns.filter((checkIn) => checkIn.planner?.id === plannerId),
    ).length;

  const selectedLocationCheckIns = filteredCheckIns.filter((checkIn) =>
    selectedPlannerItemIds.includes(checkIn.planner_item_id),
  );
  const locationPreviewCheckIn =
    selectedLocationCheckIns[0] ||
    (filteredCheckIns.length === 1 ? filteredCheckIns[0] : null);
  const locationPreviewImage = getCheckInSiteImage(locationPreviewCheckIn);
  const locationDisplayValue =
    location ||
    locationPreviewCheckIn?.site?.name ||
    (selectedPlanner
      ? t("journal.selectCheckInBelow")
      : t("journal.selectPlanFirst"));

  /** Toggle a check-in location on or off. */
  const handleSelectLocation = (checkIn: CheckInEntity) => {
    if (!checkIn.site) return;
    const id = checkIn.planner_item_id;
    setSelectedPlannerItemIds((prev) => {
      const isSelected = prev.includes(id);
      const next = isSelected
        ? prev.filter((x) => x !== id)
        : Array.from(new Set([...prev, id]));
      // Update location text
      const selectedCheckIns = filteredCheckIns.filter((c) =>
        next.includes(c.planner_item_id),
      );
      setLocation(
        selectedCheckIns
          .map((c) => c.site?.name || "")
          .filter(Boolean)
          .join(", "),
      );
      return next;
    });
  };

  const handleSuggestPrayer = async () => {
    const plannerItemId =
      selectedPlannerItemIds.length === 1 ? selectedPlannerItemIds[0] : undefined;
    const plannerId =
      plannerItemId === undefined
        ? selectedPlanner?.id || pendingEditSelection?.plannerId
        : undefined;
    const currentText = content.trim();
    const mood = prayerMood.trim();
    const intention = prayerIntention.trim();

    if (!plannerItemId && !plannerId) {
      Toast.show({
        type: 'info',
        text1: t('journal.aiPrayerMissingPlanTitle'),
        text2: t('journal.aiPrayerMissingPlanMessage'),
        position: 'top',
      });
      return;
    }

    if (!currentText && !mood && !intention) {
      Toast.show({
        type: 'info',
        text1: t('journal.aiPrayerMissingPromptTitle'),
        text2: t('journal.aiPrayerMissingPromptMessage'),
        position: 'top',
      });
      return;
    }

    clearPrayerSlowTimer();
    setPrayerLoading(true);
    setPrayerError(null);

    prayerSlowTimerRef.current = setTimeout(() => {
      Toast.show({
        type: "info",
        text1: t("journal.aiPrayerTitle"),
        text2: t("journal.aiPrayerSlowResponse"),
        position: "top",
      });
    }, 10000);

    try {
      const response = await pilgrimJournalApi.suggestPrayer({
        planner_item_id: plannerItemId,
        planner_id: plannerId,
        current_text: currentText || undefined,
        mood: mood || undefined,
        intention: intention || undefined,
      });

      const nextResult = response.data ?? null;
      const nextPrayerText = extractPrayerText(nextResult);

      if (!response.success || !nextResult || !nextPrayerText) {
        throw new Error(
          response.message || t("journal.aiPrayerError"),
        );
      }

      setPrayerResult(nextResult);
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        t("journal.aiPrayerError");

      setPrayerError(message);
      Toast.show({
        type: "error",
        text1: t("journal.genericError"),
        text2: message,
        position: "top",
      });
    } finally {
      clearPrayerSlowTimer();
      setPrayerLoading(false);
    }
  };

  const handleInsertPrayer = () => {
    const prayerText = extractPrayerText(prayerResult);
    if (!prayerText) return;

    setContent((prev) => appendPrayerToJournalContent(prev, prayerText));
    setAiBottomSheetVisible(false);
    Toast.show({
      type: "success",
      text1: t("common.success"),
      text2: t("journal.aiPrayerInserted"),
      position: "top",
    });
  };

  const handlePickMedia = async (type: "images" | "videos") => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes:
        type === "images"
          ? ImagePicker.MediaTypeOptions.Images
          : ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: type === "images",
      quality: 0.8,
      videoMaxDuration: 300, // 5 minutes
    });

    if (!result.canceled && result.assets.length > 0) {
      if (type === "images") {
        setSelectedImages((prev) => [...prev, ...result.assets].slice(0, 10));
      } else {
        // Only allow one video
        setSelectedVideos([result.assets[0]]);
      }
    }
  };

  const handleMediaPicked = (result: ImagePicker.ImagePickerResult) => {
    if (!result.canceled && result.assets.length > 0) {
      const images = result.assets.filter((a) => a.type !== "video");
      const videos = result.assets.filter((a) => a.type === "video");
      if (images.length > 0) {
        setSelectedImages((prev) => [...prev, ...images].slice(0, 10));
      }
      if (videos.length > 0) {
        setSelectedVideos([videos[0]]);
      }
    }
    setMediaPickerVisible(false);
  };

  const handleRemoveMedia = (
    index: number,
    type: "images" | "videos" = "images",
    isExistingVideo = false,
    isExistingImage = false,
  ) => {
    if (type === "images") {
      if (isExistingImage) {
        setExistingImages((prev) => prev.filter((_, i) => i !== index));
      } else {
        setSelectedImages((prev) => prev.filter((_, i) => i !== index));
      }
    } else {
      if (isExistingVideo) {
        setExistingVideoUrl(null);
      } else {
        setSelectedVideos([]);
      }
    }
  };

  const handleAddAudio = async () => {
    if (isRecording) {
      await handleStopRecording();
      return;
    }

    setAudioPickerVisible(true);
  };

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets.length > 0) {
        const asset = result.assets[0];
        setRecordingUri(asset.uri);
        setRecordingDuration(0); // Optional: we could try to get duration using expo-av

        await confirm({
          type: "info",
          iconName: "checkmark-circle-outline",
          title: t("common.success"),
          message: t("journal.audioSaveSuccess"),
          showCancel: false,
        });
      }
    } catch (error) {
      console.error("Failed to pick audio:", error);
      await confirm({
        type: "danger",
        title: t("journal.genericError"),
        message: t("journal.audioStartError"),
        showCancel: false,
      });
    }
  };

  const startRecording = async () => {
    try {
      console.log("Starting audio recording...");
      // Request permissions
      const permission = await Audio.requestPermissionsAsync();
      console.log("Audio permission:", permission);
      if (!permission.granted) {
        await confirm({
          type: "warning",
          iconName: "mic-outline",
          title: t("journal.micPermissionTitle"),
          message: t("journal.micPermissionMessage"),
          showCancel: false,
        });
        return;
      }

      // If already recording, stop it
      if (recording) {
        await handleStopRecording();
        return;
      }

      // Configure audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
        interruptionModeIOS: 1, // DoNotMix
        shouldDuckAndroid: true,
        interruptionModeAndroid: 1, // DoNotMix
        playThroughEarpieceAndroid: false,
      });

      console.log("Creating recording...");
      // Start recording
      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY,
      );
      console.log("Recording created successfully");

      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);

      // Update duration every second
      newRecording.setOnRecordingStatusUpdate((status) => {
        if (status.isRecording && status.durationMillis) {
          setRecordingDuration(Math.floor(status.durationMillis / 1000));
        }
      });
    } catch (error) {
      console.error("Failed to start recording:", error);
      await confirm({
        type: "danger",
        title: t("journal.genericError"),
        message: t("journal.audioStartError"),
        showCancel: false,
      });
    }
  };

  const handleStopRecording = async () => {
    if (!recording) return;

    try {
      const status = await recording.getStatusAsync();
      console.log("Recording status before stop:", status);

      // Save final duration
      if (status.durationMillis) {
        setRecordingDuration(Math.floor(status.durationMillis / 1000));
      }

      // Get URI before stopping
      const uri = recording.getURI();
      console.log("Recording URI:", uri);

      // Only unload if recording is still loaded
      if (status.canRecord || status.isRecording) {
        await recording.stopAndUnloadAsync();
      }

      setRecordingUri(uri || undefined);
      setRecording(undefined);
      setIsRecording(false);

      if (uri) {
        await confirm({
          type: "info",
          iconName: "checkmark-circle-outline",
          title: t("common.success"),
          message: t("journal.audioSaveSuccess"),
          showCancel: false,
        });
      }

      // Reset audio mode
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
      });
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setRecording(undefined);
      setIsRecording(false);
      await confirm({
        type: "danger",
        title: t("journal.genericError"),
        message: t("journal.audioStopError", {
          defaultValue: "Không thể dừng ghi âm.",
        }),
        showCancel: false,
      });
    }
  };

  const handlePlayAudio = async () => {
    if (!playableAudioUri) {
      console.warn("No recording URI available");
      return;
    }

    console.log("Playing audio from URI:", playableAudioUri);

    try {
      // If sound exists and is playing, pause it
      if (sound && isPlaying) {
        await sound.pauseAsync();
        setIsPlaying(false);
        return;
      }

      // If sound exists and is paused, resume it
      if (sound && !isPlaying) {
        await sound.playAsync();
        setIsPlaying(true);
        return;
      }

      // Set audio mode for playback
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      // Create new sound if doesn't exist
      console.log("Creating audio sound...");
      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: playableAudioUri },
        { shouldPlay: true },
      );
      console.log("Audio sound created successfully");
      setSound(newSound);
      setIsPlaying(true);

      // Auto cleanup when finished
      newSound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          newSound.unloadAsync().catch(console.error);
          setSound(undefined);
          setIsPlaying(false);
        }
      });
    } catch (error) {
      console.error("Failed to play audio:", error);
      setIsPlaying(false);
      await confirm({
        type: "danger",
        title: t("journal.genericError"),
        message: t("journal.audioPlayError"),
        showCancel: false,
      });
    }
  };

  const handleDeleteAudio = async () => {
    const confirmed = await confirm({
      type: "danger",
      iconName: "trash-outline",
      title: t("journal.deleteAudioTitle"),
      message: t("journal.deleteAudioMessage"),
      confirmText: t("common.delete"),
      cancelText: t("common.cancel"),
    });

    if (confirmed) {
      try {
        if (sound) {
          await sound.unloadAsync();
          setSound(undefined);
        }
      } catch (error) {
        console.error("Failed to unload sound:", error);
      }
      if (recordingUri) {
        setRecordingUri(undefined);
      } else {
        setExistingAudioUrl(null);
      }
      setRecordingDuration(0);
      setIsPlaying(false);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (recording) {
        recording
          .getStatusAsync()
          .then((status) => {
            if (status.canRecord || status.isRecording) {
              recording.stopAndUnloadAsync().catch(console.error);
            }
          })
          .catch(console.error);
      }
      if (sound) {
        sound.unloadAsync().catch(console.error);
      }
    };
  }, [recording, sound]);

  const fetchJournalDetails = async () => {
    try {
      setInitialLoading(true);
      const response = await pilgrimJournalApi.getJournalDetail(journalId);
      if (response.success && response.data) {
        const data = response.data;
        const plannerItemIds = getJournalPlannerItemIds(data);
        const plannerId = data.planner?.id || data.planner_id;
        const plannerName = data.planner?.name;
        const fallbackLocation = data.site?.name || "";

        setTitle(data.title);
        setContent(data.content);
        setSelectedPlannerItemIds(plannerItemIds);
        setJournalPrivacy(data.privacy || "private");
        setLocation(fallbackLocation);
        applyServerMediaState(data);
        if (plannerId) {
          setSelectedPlanner(
            completedPlanners.find((planner) => planner.id === plannerId) ||
              ({
                id: plannerId,
                name: plannerName || "Kế hoạch hành hương",
                user_id: "",
                number_of_people: 0,
                transportation: "",
                status: "completed",
                share_token: "",
                qr_code_url: "",
                created_at: "",
                updated_at: "",
              } as PlanEntity),
          );
        }
        setPendingEditSelection({
          plannerId,
          plannerName,
          plannerItemIds,
          location: fallbackLocation,
        });
      }
    } catch (error) {
      console.error(error);
      await confirm({
        type: "danger",
        title: t("journal.genericError"),
        message: t("journal.loadError"),
        showCancel: false,
      });
      handleBackNavigation();
    } finally {
      setInitialLoading(false);
    }
  };

  const handleSave = async () => {
    if (!title.trim() || !content.trim()) {
      await confirm({
        type: "warning",
        title: t("journal.missingInfo"),
        message: t("journal.missingTitleContent"),
        showCancel: false,
      });
      return;
    }

    // Validate: require at least one check-in location when creating a new journal
    if (!journalId && selectedPlannerItemIds.length === 0) {
      await confirm({
        type: "warning",
        title: t("journal.checkInRequired"),
        message: t("journal.checkInRequiredMessage"),
        showCancel: false,
      });
      return;
    }

    setLoading(true);
    try {
      const plannerItemIds = Array.from(
        new Set(selectedPlannerItemIds.filter(Boolean)),
      );

      if (journalId) {
        // UPDATE
        // Prepare new image URIs (only send newly selected images)
        const imageUris = selectedImages.map((img) => img.uri);
        const expectedImageCount = existingImages.length + imageUris.length;
        const expectedHasVideo = Boolean(
          existingVideoUrl || selectedVideos[0]?.uri,
        );
        const expectedHasAudio = Boolean(existingAudioUrl || recordingUri);

        if (plannerItemIds.length === 0) {
          await confirm({
            type: "danger",
            title: t("journal.genericError"),
            message: t("journal.checkInRequiredMessage"),
            showCancel: false,
          });
          return;
        }

        const res = await pilgrimJournalApi.updateJournal(journalId, {
          title,
          content,
          planner_item_ids: plannerItemIds,
          planner_id: selectedPlanner?.id || pendingEditSelection?.plannerId,
          privacy: journalPrivacy,
          images: imageUris.length > 0 ? imageUris : undefined,
          video: selectedVideos[0]?.uri || undefined,
          audio: recordingUri,
          image_url: existingImages,
          video_url: selectedVideos[0]?.uri ? null : existingVideoUrl,
          audio_url: recordingUri ? null : existingAudioUrl,
          clear_images: expectedImageCount === 0,
          clear_video: !expectedHasVideo,
          clear_audio: !expectedHasAudio,
        });

        // Refresh media state from the server after update.
        const refreshed = await pilgrimJournalApi.getJournalDetail(journalId);
        const refreshedJournal = refreshed.success ? refreshed.data : res.data;
        const actualImages = normalizeImageUrls(refreshedJournal?.image_url);
        const actualHasVideo = Boolean(refreshedJournal?.video_url);
        const actualHasAudio = Boolean(refreshedJournal?.audio_url);
        const mediaMismatch =
          actualImages.length !== expectedImageCount ||
          actualHasVideo !== expectedHasVideo ||
          actualHasAudio !== expectedHasAudio;

        if (refreshedJournal) {
          applyServerMediaState(refreshedJournal);
        }

        if (mediaMismatch) {
          Toast.show({
            type: "error",
            text1: t("journal.genericError"),
            text2: t("journal.mediaSyncWarning", {
              defaultValue:
                "Máy chủ chưa lưu đúng thay đổi ảnh, video hoặc ghi âm. Dữ liệu trên form đã được đồng bộ lại theo kết quả thực tế.",
            }),
            position: "top",
          });
          return;
        }

        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("journal.saveSuccessUpdate", {
            shareMsg: "",
            imagesMsg:
              imageUris.length > 0
                ? t("journal.imagesMsg", { count: imageUris.length })
                : "",
            audioMsg:
              recordingUri || existingAudioUrl ? t("journal.audioMsg") : "",
          }),
          position: "top",
        });
      } else {
        // CREATE - at least one planner_item_id is required
        if (plannerItemIds.length === 0) {
          await confirm({
            type: "danger",
            title: t("journal.genericError"),
            message: t("journal.checkInRequiredMessage"),
            showCancel: false,
          });
          return;
        }

        // Prepare image URIs
        const imageUris = selectedImages.map((img) => img.uri);

        await pilgrimJournalApi.createJournal({
          title: title.trim(),
          content: content.trim(),
          planner_item_ids: plannerItemIds,
          planner_id: selectedPlanner?.id || undefined,
          privacy: journalPrivacy,
          images: imageUris.length > 0 ? imageUris : undefined,
          video: selectedVideos[0]?.uri || undefined,
          audio: recordingUri,
        });

        Toast.show({
          type: "success",
          text1: t("journal.saveJournal", {
            defaultValue: "Lưu nhật ký",
          }),
          text2: t("journal.saveSuccessCreate", {
            shareMsg: "",
            imagesMsg:
              imageUris.length > 0
                ? t("journal.imagesMsgCreate", { count: imageUris.length })
                : "",
            audioMsg: recordingUri ? t("journal.audioMsgCreate") : "",
          }),
          position: "top",
        });
      }
      handleBackNavigation();
    } catch (error: any) {
      console.error(error);
      Toast.show({
        type: "error",
        text1: t("journal.genericError"),
        text2:
          error?.message ||
          t("journal.saveError", { defaultValue: "Không thể lưu nhật ký" }),
        position: "top",
      });
    } finally {
      setLoading(false);
    }
  };

  // Mock images for UI if empty
  const displayImages = [
    ...existingImages.map((uri, index) => ({
      id: `existing-${uri}-${index}`,
      uri,
      isExisting: true,
      sourceIndex: index,
    })),
    ...selectedImages.map((img, index) => ({
      id: `new-${index}`,
      uri: img.uri,
      isExisting: false,
      sourceIndex: index,
    })),
  ];
  const currentVideoUri = selectedVideos[0]?.uri || existingVideoUrl || null;
  const hasCurrentVideo = Boolean(currentVideoUri);
  const hasVisualMedia = displayImages.length > 0 || hasCurrentVideo;
  const generatedPrayerText = extractPrayerText(prayerResult);
  const prayerContext = prayerResult?.context;
  const prayerSuggestions = prayerResult?.suggestions ?? [];
  const locationBarSubtitle = selectedPlanner?.name || t("journal.selectPlanFirst");
  const scrollBottomPadding = SPACING.lg;
  const renderAIPrayerSheetBody = () => (
    <>
      <View style={styles.aiPrayerFields}>
        <View style={styles.aiPrayerField}>
          <Text style={styles.aiPrayerFieldLabel}>
            {t("journal.aiPrayerMoodLabel")}
          </Text>
          <TextInput
            style={styles.aiPrayerInput}
            placeholder={t("journal.aiPrayerMoodPlaceholder")}
            placeholderTextColor="rgba(138, 127, 97, 0.55)"
            value={prayerMood}
            onChangeText={setPrayerMood}
          />
        </View>

        <View style={styles.aiPrayerField}>
          <Text style={styles.aiPrayerFieldLabel}>
            {t("journal.aiPrayerIntentionLabel")}
          </Text>
          <TextInput
            style={styles.aiPrayerInput}
            placeholder={t("journal.aiPrayerIntentionPlaceholder")}
            placeholderTextColor="rgba(138, 127, 97, 0.55)"
            value={prayerIntention}
            onChangeText={setPrayerIntention}
          />
        </View>
      </View>

      {prayerLoading && (
        <View style={styles.aiPrayerLoadingBox}>
          <ActivityIndicator size="small" color={COLORS.accent} />
          <View style={styles.aiPrayerLoadingTextWrap}>
            <Text style={styles.aiPrayerLoadingTitle}>
              {t("journal.aiPrayerLoadingTitle")}
            </Text>
            <Text style={styles.aiPrayerLoadingHint}>
              {t("journal.aiPrayerLoadingHint")}
            </Text>
          </View>
        </View>
      )}

      {!prayerLoading && prayerError && (
        <View style={styles.aiPrayerErrorBox}>
          <MaterialIcons
            name="error-outline"
            size={18}
            color={COLORS.danger}
          />
          <Text style={styles.aiPrayerErrorText}>{prayerError}</Text>
        </View>
      )}

      {!prayerLoading && generatedPrayerText ? (
        <View style={styles.aiPrayerResultCard}>
          <Text style={styles.aiPrayerResultTitle}>
            {t("journal.aiPrayerResultTitle")}
          </Text>
          <Text style={styles.aiPrayerResultText}>{generatedPrayerText}</Text>

          {(prayerContext?.detected_mood ||
            prayerContext?.detected_theme ||
            prayerResult?.prayer_type) && (
            <View style={styles.aiPrayerMetaWrap}>
              {prayerContext?.detected_mood ? (
                <View style={styles.aiPrayerMetaChip}>
                  <Text style={styles.aiPrayerMetaLabel}>
                    {t("journal.aiPrayerContextMood")}
                  </Text>
                  <Text style={styles.aiPrayerMetaValue}>
                    {prayerContext.detected_mood}
                  </Text>
                </View>
              ) : null}

              {prayerContext?.detected_theme ? (
                <View style={styles.aiPrayerMetaChip}>
                  <Text style={styles.aiPrayerMetaLabel}>
                    {t("journal.aiPrayerContextTheme")}
                  </Text>
                  <Text style={styles.aiPrayerMetaValue}>
                    {prayerContext.detected_theme}
                  </Text>
                </View>
              ) : null}

              {prayerResult?.prayer_type ? (
                <View style={styles.aiPrayerMetaChip}>
                  <Text style={styles.aiPrayerMetaLabel}>
                    {t("journal.aiPrayerContextType")}
                  </Text>
                  <Text style={styles.aiPrayerMetaValue}>
                    {prayerResult.prayer_type}
                  </Text>
                </View>
              ) : null}
            </View>
          )}

          {prayerSuggestions.length > 0 && (
            <View style={styles.aiPrayerSuggestionsBlock}>
              <Text style={styles.aiPrayerSuggestionsTitle}>
                {t("journal.aiPrayerSuggestionsLabel")}
              </Text>
              {prayerSuggestions.slice(0, 3).map((item, index) => (
                <View
                  key={`${item}-${index}`}
                  style={styles.aiPrayerSuggestionItem}
                >
                  <View style={styles.aiPrayerSuggestionDot} />
                  <Text style={styles.aiPrayerSuggestionText}>{item}</Text>
                </View>
              ))}
            </View>
          )}

          <TouchableOpacity
            style={styles.aiPrayerApplyButton}
            onPress={handleInsertPrayer}
            activeOpacity={0.88}
          >
            <AISparkles size={18} color={COLORS.textPrimary} isAnimating={true} />
            <Text style={styles.aiPrayerApplyButtonText}>
              {t("journal.aiPrayerInsert")}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <TouchableOpacity
        style={[
          styles.aiPrayerGenerateButton,
          prayerLoading && styles.aiPrayerGenerateButtonDisabled,
        ]}
        onPress={handleSuggestPrayer}
        disabled={prayerLoading}
        activeOpacity={0.9}
      >
        {prayerLoading ? (
          <ActivityIndicator size="small" color={COLORS.textPrimary} />
        ) : (
          <AISparkles size={18} color={COLORS.textPrimary} isAnimating={true} />
        )}
        <Text style={styles.aiPrayerGenerateButtonText}>
          {generatedPrayerText
            ? t("journal.aiPrayerRegenerate")
            : t("journal.aiPrayerGenerate")}
        </Text>
      </TouchableOpacity>
    </>
  );

  if (initialLoading) {
    return (
      <ImageBackground
        source={require("../../../../../assets/images/journal-bg.png")}
        style={[
          styles.container,
          { justifyContent: "center", alignItems: "center" },
        ]}
        resizeMode="cover"
      >
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color={COLORS.accent} />
      </ImageBackground>
    );
  }

  return (
    <ImageBackground
      source={require("../../../../../assets/images/journal-bg.png")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + (Platform.OS === "android" ? 10 : 0) },
        ]}
      >
        <TouchableOpacity
          style={styles.iconButton}
          onPress={() => handleBackNavigation()}
        >
          <MaterialIcons
            name="arrow-back"
            size={24}
            color={COLORS.textPrimary}
          />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>
          {journalId ? t("journal.updateTitle") : t("journal.createTitle")}
        </Text>

        <TouchableOpacity style={styles.iconButton}>
          <MaterialIcons
            name="bookmark-border"
            size={24}
            color={COLORS.accent}
          />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            styles.contentJSON,
            { paddingBottom: scrollBottomPadding },
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Step 1: Plan selection */}
          <TouchableOpacity
            style={styles.compactLocationBar}
            onPress={() =>
              openLocationSheet(selectedPlanner ? "locations" : "planner")
            }
            activeOpacity={0.9}
          >
            {locationPreviewImage ? (
              <Image
                source={{ uri: locationPreviewImage }}
                style={styles.locationThumb}
              />
            ) : (
              <View style={styles.locationThumbFallback}>
                <MaterialIcons name="place" size={20} color={COLORS.accent} />
              </View>
            )}

            <View style={styles.locationInfo}>
              <View style={styles.locationRow}>
                <MaterialIcons name="place" size={14} color={COLORS.accent} />
                <Text style={styles.locationName} numberOfLines={1}>
                  {locationDisplayValue}
                </Text>
              </View>

              <Text style={styles.locationSub} numberOfLines={1}>
                {locationBarSubtitle}
              </Text>
            </View>

            <MaterialIcons
              name="chevron-right"
              size={20}
              color={COLORS.textTertiary}
            />
          </TouchableOpacity>

          <View style={styles.writerCard}>
            <TextInput
              style={styles.titleInput}
              placeholder={t("journal.titlePlaceholder")}
              placeholderTextColor="rgba(138, 128, 96, 0.5)"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.divider} />

            <TextInput
              style={[styles.multilineInput, styles.writerContentInput]}
              placeholder={t("journal.contentPlaceholder")}
              placeholderTextColor="rgba(138, 128, 96, 0.4)"
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />

            <View style={styles.mediaToolbar}>
              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => handlePickMedia("images")}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name="photo-camera"
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.mediaBtn}
                onPress={() => handlePickMedia("videos")}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name="videocam"
                  size={22}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.mediaBtn,
                  isRecording && styles.mediaBtnActive,
                ]}
                onPress={handleAddAudio}
                activeOpacity={0.85}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={22}
                  color={isRecording ? "#C62828" : COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>
          </View>

          {hasVisualMedia && (
            <View style={styles.mediaSectionCard}>
              <View style={styles.mediaSectionHeader}>
                <Text style={styles.mediaSectionTitle}>
                  {t("journal.mediaHeader")}
                </Text>
                <Text style={styles.mediaSectionMeta}>
                  {displayImages.length + (hasCurrentVideo ? 1 : 0) > 0
                    ? `${t("journal.mediaCount_photos", {
                        count: displayImages.length,
                      })}${hasCurrentVideo ? t("journal.mediaCount_video") : ""}`
                    : t("journal.mediaLimit")}
                </Text>
              </View>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.mediaRow}
              >
                {displayImages.map((img, index) => (
                  <View key={img.id || index} style={styles.mediaItem}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={() =>
                        setPreviewMedia({ type: "image", uri: img.uri })
                      }
                    >
                      <Image
                        source={{ uri: img.uri }}
                        style={styles.mediaImage}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() =>
                        handleRemoveMedia(
                          img.sourceIndex,
                          "images",
                          false,
                          img.isExisting,
                        )
                      }
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                ))}

                {(() => {
                  const videoUri = currentVideoUri;
                  const isExistingVideo =
                    selectedVideos.length === 0 && !!existingVideoUrl;

                  if (!videoUri) return null;

                  return (
                    <View style={styles.mediaItem}>
                      <TouchableOpacity
                        activeOpacity={0.8}
                        style={[styles.mediaImage, styles.videoThumbBase]}
                        onPress={() =>
                          setPreviewMedia({ type: "video", uri: videoUri })
                        }
                      >
                        <MaterialIcons
                          name="videocam"
                          size={30}
                          color={COLORS.accent}
                        />
                        <View style={styles.videoOverlay}>
                          <MaterialIcons
                            name="play-circle-filled"
                            size={28}
                            color="rgba(255,255,255,0.9)"
                          />
                        </View>
                      </TouchableOpacity>

                      <View style={styles.videoChip}>
                        <Text style={styles.videoChipText}>VID</Text>
                      </View>

                      <TouchableOpacity
                        style={styles.removeMediaBtn}
                        onPress={() =>
                          handleRemoveMedia(0, "videos", isExistingVideo)
                        }
                      >
                        <MaterialIcons name="close" size={14} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  );
                })()}
              </ScrollView>
            </View>
          )}

          {(isRecording || playableAudioUri) && (
            <View style={styles.audioSectionCard}>
              <View style={styles.mediaSectionHeader}>
                <Text style={styles.mediaSectionTitle}>
                  {t("journal.audioHeader")}
                </Text>
              </View>

              {isRecording ? (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {t("journal.recording")}{" "}
                    {Math.floor(recordingDuration / 60)}:
                    {(recordingDuration % 60).toString().padStart(2, "0")}
                  </Text>
                  <TouchableOpacity
                    style={styles.stopRecordingBtn}
                    onPress={handleStopRecording}
                  >
                    <MaterialIcons name="stop" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : playableAudioUri ? (
                <View style={styles.audioPlayer}>
                  <TouchableOpacity
                    style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    onPress={handlePlayAudio}
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={28}
                      color={isPlaying ? "#fff" : COLORS.accent}
                    />
                  </TouchableOpacity>
                  <View style={styles.audioInfo}>
                    <Text style={styles.audioTitle}>
                      {recordingUri
                        ? t("journal.yourRecording")
                        : t("journal.existingAudioFile")}
                    </Text>
                    <Text
                      style={[
                        styles.audioDuration,
                        isPlaying && styles.audioDurationActive,
                      ]}
                    >
                      {isPlaying
                        ? t("journal.playing")
                        : recordingDuration > 0
                          ? `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")}`
                          : "0:00"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteAudioBtn}
                    onPress={handleDeleteAudio}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={24}
                      color="#FF6B6B"
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          <View style={styles.section}>
            <TouchableOpacity
              style={styles.aiCompactBanner}
              onPress={() => setAiBottomSheetVisible(true)}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={["#F4E4BA", "#D4AF37"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.aiCompactBannerGradient}
              >
                <View style={styles.aiCompactBannerContent}>
                  <View style={styles.aiCompactBannerLeft}>
                    <AISparkles
                      size={18}
                      color={COLORS.textPrimary}
                      isAnimating={!prayerLoading}
                    />
                    <Text style={styles.aiCompactBannerText}>
                      {t("journal.aiPrayerTitle")}
                    </Text>
                  </View>

                  <MaterialIcons
                    name="arrow-forward-ios"
                    size={14}
                    color={COLORS.textPrimary}
                  />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </View>

          <View
            style={[
              styles.footer,
              styles.writerFooter,
              { paddingBottom: insets.bottom + 24 },
            ]}
          >
            <View style={styles.footerContent}>
              <TouchableOpacity
                style={styles.btnPrimary}
                onPress={handleSave}
                disabled={loading}
              >
                <MaterialIcons
                  name="menu-book"
                  size={18}
                  color={COLORS.textPrimary}
                />
                <Text style={styles.btnPrimaryText}>
                  {loading
                    ? t("journal.saving")
                    : t("journal.saveJournal", {
                        defaultValue: "Lưu nhật ký",
                      })}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={styles.legacyWriterHidden}>
          <View style={[styles.section, styles.contextSection]}>
            <View style={styles.contextSubsection}>
            <View style={styles.stepHeroHeader}>
              <View style={styles.stepHeroTitleWrap}>
                <View style={styles.stepHeroIconWrap}>
                  <MaterialIcons name="route" size={18} color={COLORS.accent} />
                </View>
                <View style={styles.stepHeroTextWrap}>
                  <Text style={styles.label}>{t("journal.step1")}</Text>
                  <Text style={styles.stepHeroSubtitle}>
                    {t("journal.step1Subtitle")}
                  </Text>
                </View>
              </View>

              {!plannerLoading && completedPlanners.length > 0 && (
                <View style={styles.stepHeroCountChip}>
                  <Text style={styles.stepHeroCountText}>
                    {t("journal.plannerCount", { count: completedPlanners.length })}
                  </Text>
                </View>
              )}
            </View>

            {plannerLoading ? (
              <View style={styles.selectedPlannerLoadingCard}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.selectedPlannerLoadingText}>
                  {t("common.loading")}
                </Text>
              </View>
            ) : completedPlanners.length === 0 ? (
              <View style={styles.plannerEmptyCard}>
                <View style={styles.plannerEmptyIconWrap}>
                  <MaterialIcons name="route" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.plannerEmptyTitle}>
                  {t("journal.noCompletedPlans")}
                </Text>
                <Text style={styles.plannerEmptySubtitle}>
                  {t("journal.plannerPickerEmptySubtitle")}
                </Text>
              </View>
            ) : selectedPlanner ? (
              <TouchableOpacity
                style={styles.selectedPlannerCard}
                onPress={() => setPlannerModalVisible(true)}
                activeOpacity={0.9}
              >
                <View style={styles.selectedPlannerSimpleCard}>
                  <View style={styles.selectedPlannerSimpleHeader}>
                    <View style={styles.selectedPlannerMain}>
                      <View style={styles.selectedPlannerIcon}>
                        <MaterialIcons
                          name="route"
                          size={20}
                          color={COLORS.accent}
                        />
                      </View>
                      <View style={styles.selectedPlannerTextWrap}>
                        <View style={styles.selectedPlannerLabelRow}>
                          <Text style={styles.selectedPlannerCaption}>
                            {t("journal.selectedPlanLabel")}
                          </Text>
                          <View style={styles.selectedPlannerTopBadge}>
                            <MaterialIcons
                              name="auto-awesome"
                              size={12}
                              color={COLORS.accent}
                            />
                            <Text style={styles.selectedPlannerTopBadgeText}>
                              {t("journal.plannerContextLabel")}
                            </Text>
                          </View>
                        </View>
                        <Text style={styles.selectedPlannerName}>
                          {selectedPlanner.name}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.selectedPlannerActionChip}>
                      <Text style={styles.selectedPlannerActionText}>
                        {t("journal.changePlan")}
                      </Text>
                      <MaterialIcons
                        name="chevron-right"
                        size={18}
                        color={COLORS.accent}
                      />
                    </View>
                  </View>

                  <View style={styles.selectedPlannerMetaRow}>
                    <View style={styles.completedBadge}>
                      <Text style={styles.completedBadgeText}>
                        {t("journal.completed")}
                      </Text>
                    </View>

                    {filteredCheckIns.length > 0 && (
                      <View style={styles.selectedPlannerMetaChip}>
                        <MaterialIcons
                          name="place"
                          size={14}
                          color={COLORS.textSecondary}
                        />
                        <Text style={styles.selectedPlannerMetaText}>
                          {t("journal.availableCheckIns", {
                            count: filteredCheckIns.length,
                          })}
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.selectedPlannerContextRow}>
                    <Text style={styles.selectedPlannerContextText}>
                      {t("journal.plannerReadyHint")}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.plannerEmptyCard}
                onPress={() => setPlannerModalVisible(true)}
                activeOpacity={0.9}
              >
                <View style={styles.plannerEmptyIconWrap}>
                  <MaterialIcons name="route" size={24} color={COLORS.accent} />
                </View>
                <Text style={styles.plannerEmptyTitle}>
                  {t("journal.plannerPickerEmptyTitle")}
                </Text>
                <Text style={styles.plannerEmptySubtitle}>
                  {t("journal.plannerPickerEmptySubtitle")}
                </Text>
                <View style={styles.pickPlannerButton}>
                  <Text style={styles.pickPlannerButtonText}>
                    {t("journal.choosePlan")}
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={18}
                    color={COLORS.textPrimary}
                  />
                </View>
              </TouchableOpacity>
            )}

            <View style={styles.legacyPlannerHidden}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                marginBottom: 6,
              }}
            >
              <MaterialIcons
                name="route"
                size={16}
                color={COLORS.accent}
                style={{ marginRight: 6 }}
              />
              <Text style={styles.label}>{t("journal.step1")}</Text>
              <View style={styles.completedBadge}>
                <Text style={styles.completedBadgeText}>
                  {t("journal.completed")}
                </Text>
              </View>
            </View>

            {plannerLoading ? (
              <ActivityIndicator
                size="small"
                color={COLORS.accent}
                style={{ marginVertical: 8 }}
              />
            ) : completedPlanners.length === 0 ? (
              <Text style={styles.emptyHint}>
                {t("journal.noCompletedPlans")}
              </Text>
            ) : (
              <View style={styles.chipWrapContainer}>
                {completedPlanners.map((planner) => (
                  <TouchableOpacity
                    key={planner.id}
                    style={[
                      styles.chip,
                      selectedPlanner?.id === planner.id && {
                        backgroundColor: COLORS.accent,
                        borderColor: COLORS.accent,
                      },
                    ]}
                    onPress={() => handleSelectPlanner(planner)}
                  >
                    <MaterialIcons
                      name="check-circle"
                      size={16}
                      color={
                        selectedPlanner?.id === planner.id
                          ? COLORS.white
                          : COLORS.accent
                      }
                    />
                    <Text
                      style={[
                        styles.chipText,
                        selectedPlanner?.id === planner.id && {
                          color: COLORS.white,
                        },
                      ]}
                      numberOfLines={1}
                    >
                      {planner.name}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}
            </View>
          </View>

          {/* Step 2: Check-in selection */}
          <View style={styles.contextDivider} />
          <View style={styles.contextSubsection}>
            <View style={styles.stepHeroHeader}>
              <View style={styles.stepHeroTitleWrap}>
                <View style={styles.stepHeroIconWrap}>
                  <MaterialIcons
                    name="location-on"
                    size={18}
                    color={COLORS.accent}
                  />
                </View>
                <View style={styles.stepHeroTextWrap}>
                  <Text style={styles.label}>{t("journal.step2")}</Text>
                  <Text style={styles.stepHeroSubtitle}>
                    {t("journal.step2Subtitle")}
                  </Text>
                </View>
              </View>

              {(selectedPlanner || journalId) && !checkInLoading && (
                <View style={styles.stepHeroCountChip}>
                  <Text style={styles.stepHeroCountText}>
                    {selectedPlannerItemIds.length > 0
                      ? t("journal.selectedCheckInCount", {
                          count: selectedPlannerItemIds.length,
                        })
                      : t("journal.availableCheckInCount", {
                          count: filteredCheckIns.length,
                        })}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.selectedLocationCard}>
              {locationPreviewImage ? (
                <ImageBackground
                  source={{ uri: locationPreviewImage }}
                  style={styles.selectedLocationHero}
                  imageStyle={styles.selectedLocationHeroImage}
                >
                  <View style={styles.selectedLocationHeroOverlay} />
                  <View style={styles.selectedLocationHeroContent}>
                    <View style={styles.selectedLocationHeroBadge}>
                      <MaterialIcons name="place" size={12} color={COLORS.white} />
                      <Text style={styles.selectedLocationHeroBadgeText}>
                        {t("journal.locationContextLabel")}
                      </Text>
                    </View>
                    <Text style={styles.selectedLocationHeroTitle}>
                      {locationDisplayValue}
                    </Text>
                    {selectedPlanner ? (
                      <Text style={styles.selectedLocationHeroSubtitle}>
                        {selectedPlanner.name}
                      </Text>
                    ) : null}
                  </View>
                </ImageBackground>
              ) : null}

              <View style={styles.selectedLocationBody}>
                {!locationPreviewImage ? (
                  <View style={styles.selectedLocationHeader}>
                    <View style={styles.selectedLocationIcon}>
                      <MaterialIcons
                        name="place"
                        size={20}
                        color={COLORS.accent}
                      />
                    </View>
                    <View style={styles.selectedLocationTextWrap}>
                      <Text style={styles.selectedLocationLabel}>
                        {t("journal.locationContextLabel")}
                      </Text>
                      <Text style={styles.selectedLocationValue}>
                        {locationDisplayValue}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <View style={styles.selectedLocationTopMeta}>
                    <Text style={styles.selectedLocationLabel}>
                      {t("journal.locationContextLabel")}
                    </Text>
                    <Text
                      style={styles.selectedLocationInlineValue}
                      numberOfLines={2}
                    >
                      {locationDisplayValue}
                    </Text>
                  </View>
                )}

                <View style={styles.selectedLocationMetaRow}>
                  {selectedPlanner && (
                    <View style={styles.selectedLocationMetaChip}>
                      <MaterialIcons
                        name="route"
                        size={14}
                        color={COLORS.textSecondary}
                      />
                      <Text style={styles.selectedLocationMetaText}>
                        {selectedPlanner.name}
                      </Text>
                    </View>
                  )}

                  {selectedPlannerItemIds.length > 0 && (
                    <View style={styles.selectedLocationMetaChip}>
                      <MaterialIcons
                        name="check-circle"
                        size={14}
                        color={COLORS.accent}
                      />
                      <Text style={styles.selectedLocationMetaText}>
                        {t("journal.selectedCheckInCount", {
                          count: selectedPlannerItemIds.length,
                        })}
                      </Text>
                    </View>
                  )}
                </View>

                <View style={styles.selectedLocationHintBox}>
                  <Text style={styles.selectedLocationHintText}>
                    {selectedPlanner
                      ? t("journal.locationContextHint")
                      : t("journal.selectPlanToSeeCheckIns")}
                  </Text>
                </View>
              </View>
            </View>

            <Text style={styles.locationListLabel}>
              {selectedPlanner
                ? t("journal.checkInsIn", { name: selectedPlanner.name })
                : t("journal.selectPlanToSeeCheckIns")}
            </Text>
            {(selectedPlanner || journalId) &&
              (checkInLoading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.accent}
                  style={{ marginVertical: 10 }}
                />
              ) : filteredCheckIns.length > 0 ? (
                <View style={styles.locationOptionList}>
                  {filteredCheckIns.map((checkIn: CheckInEntity, index: number) => {
                    const isSelected = selectedPlannerItemIds.includes(
                      checkIn.planner_item_id,
                    );
                    const siteImage = getCheckInSiteImage(checkIn);

                    return (
                      <TouchableOpacity
                        key={`location-card-${checkIn.id || index}`}
                        style={[
                          styles.locationOptionCard,
                          isSelected && styles.locationOptionCardSelected,
                        ]}
                        onPress={() => handleSelectLocation(checkIn)}
                        activeOpacity={0.9}
                      >
                        {siteImage ? (
                          <Image
                            source={{ uri: siteImage }}
                            style={[
                              styles.locationOptionImage,
                              isSelected && styles.locationOptionImageSelected,
                            ]}
                            resizeMode="cover"
                          />
                        ) : (
                          <View
                            style={[
                              styles.locationOptionIconWrap,
                              isSelected && styles.locationOptionIconWrapSelected,
                            ]}
                          >
                            <MaterialIcons
                              name={isSelected ? "check-circle" : "place"}
                              size={20}
                              color={isSelected ? COLORS.white : COLORS.accent}
                            />
                          </View>
                        )}

                        <View style={styles.locationOptionTextWrap}>
                          <View style={styles.locationOptionTitleRow}>
                            <Text
                              style={[
                                styles.locationOptionName,
                                isSelected && styles.locationOptionNameSelected,
                              ]}
                              numberOfLines={2}
                            >
                              {checkIn.site?.name || t("journal.genericLocationName")}
                            </Text>

                            {isSelected && (
                              <View style={styles.locationOptionSelectedBadge}>
                                <Text style={styles.locationOptionSelectedBadgeText}>
                                  {"Đã chọn"}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text
                            style={[
                              styles.locationOptionCaption,
                              isSelected && styles.locationOptionCaptionSelected,
                            ]}
                          >
                            {isSelected
                              ? t("journal.locationSelectedHint")
                              : t("journal.selectCheckInBelow")}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.locationOptionTrailing,
                            isSelected && styles.locationOptionTrailingSelected,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              isSelected
                                ? "check-circle"
                                : "radio-button-unchecked"
                            }
                            size={22}
                            color={
                              isSelected ? COLORS.accent : COLORS.textTertiary
                            }
                          />
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              ) : (
                <View style={styles.locationEmptyCard}>
                  <Text style={styles.locationEmptyTitle}>
                    {selectedPlanner
                      ? t("journal.noCheckInsInPlan")
                      : t("journal.noCheckInLocations")}
                  </Text>
                  <Text style={styles.locationEmptySubtitle}>
                    {selectedPlanner
                      ? t("journal.locationContextHint")
                      : t("journal.selectPlanToSeeCheckIns")}
                  </Text>
                </View>
              ))}
            <View style={styles.legacyPlannerHidden}>

            {/* Check-in chips - shown after a planner is selected */}
            {(selectedPlanner || journalId) &&
              (checkInLoading ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.accent}
                  style={{ marginVertical: 10 }}
                />
              ) : (
                <View style={styles.chipWrapContainer}>
                  {filteredCheckIns.length > 0 ? (
                    filteredCheckIns.map(
                      (checkIn: CheckInEntity, index: number) => (
                        <TouchableOpacity
                          key={checkIn.id || index}
                          style={[
                            styles.chip,
                            selectedPlannerItemIds.includes(
                              checkIn.planner_item_id,
                            ) && {
                              backgroundColor: COLORS.accent,
                              borderColor: COLORS.accent,
                            },
                          ]}
                          onPress={() => handleSelectLocation(checkIn)}
                        >
                          <MaterialIcons
                            name={
                              selectedPlannerItemIds.includes(
                                checkIn.planner_item_id,
                              )
                                ? "check-circle"
                                : "radio-button-unchecked"
                            }
                            size={16}
                            color={
                              selectedPlannerItemIds.includes(
                                checkIn.planner_item_id,
                              )
                                ? COLORS.white
                                : COLORS.accent
                            }
                          />
                          <Text
                            style={[
                              styles.chipText,
                              selectedPlannerItemIds.includes(
                                checkIn.planner_item_id,
                              ) && { color: COLORS.white },
                            ]}
                          >
                            {checkIn.site?.name ||
                              t("journal.genericLocationName")}
                          </Text>
                        </TouchableOpacity>
                      ),
                    )
                  ) : (
                    <Text
                      style={{
                        color: COLORS.textSecondary,
                        fontStyle: "italic",
                        padding: 10,
                      }}
                    >
                      {selectedPlanner
                        ? t("journal.noCheckInsInPlan")
                        : t("journal.noCheckInLocations")}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
          </View>

          <View style={styles.aiPrayerCard}>
            <View style={styles.aiPrayerHeader}>
              <View style={styles.aiPrayerIconWrap}>
                <AISparkles size={20} color={COLORS.accent} isAnimating={!prayerLoading} />
              </View>
              <View style={styles.aiPrayerHeaderContent}>
                <Text style={styles.aiPrayerTitle}>
                  {t("journal.aiPrayerTitle")}
                </Text>
                <Text style={styles.aiPrayerSubtitle}>
                  {t("journal.aiPrayerSubtitle")}
                </Text>
              </View>
            </View>

            <View style={styles.aiPrayerFields}>
              <View style={styles.aiPrayerField}>
                <Text style={styles.aiPrayerFieldLabel}>
                  {t("journal.aiPrayerMoodLabel")}
                </Text>
                <TextInput
                  style={styles.aiPrayerInput}
                  placeholder={t("journal.aiPrayerMoodPlaceholder")}
                  placeholderTextColor="rgba(138, 127, 97, 0.55)"
                  value={prayerMood}
                  onChangeText={setPrayerMood}
                />
              </View>

              <View style={styles.aiPrayerField}>
                <Text style={styles.aiPrayerFieldLabel}>
                  {t("journal.aiPrayerIntentionLabel")}
                </Text>
                <TextInput
                  style={styles.aiPrayerInput}
                  placeholder={t("journal.aiPrayerIntentionPlaceholder")}
                  placeholderTextColor="rgba(138, 127, 97, 0.55)"
                  value={prayerIntention}
                  onChangeText={setPrayerIntention}
                />
              </View>
            </View>

            {prayerLoading && (
              <View style={styles.aiPrayerLoadingBox}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <View style={styles.aiPrayerLoadingTextWrap}>
                  <Text style={styles.aiPrayerLoadingTitle}>
                    {t("journal.aiPrayerLoadingTitle")}
                  </Text>
                  <Text style={styles.aiPrayerLoadingHint}>
                    {t("journal.aiPrayerLoadingHint")}
                  </Text>
                </View>
              </View>
            )}

            {!prayerLoading && prayerError && (
              <View style={styles.aiPrayerErrorBox}>
                <MaterialIcons name="error-outline" size={18} color={COLORS.danger} />
                <Text style={styles.aiPrayerErrorText}>{prayerError}</Text>
              </View>
            )}

            {!prayerLoading && generatedPrayerText ? (
              <View style={styles.aiPrayerResultCard}>
                <Text style={styles.aiPrayerResultTitle}>
                  {t("journal.aiPrayerResultTitle")}
                </Text>
                <Text style={styles.aiPrayerResultText}>{generatedPrayerText}</Text>

                {(prayerContext?.detected_mood ||
                  prayerContext?.detected_theme ||
                  prayerResult?.prayer_type) && (
                  <View style={styles.aiPrayerMetaWrap}>
                    {prayerContext?.detected_mood ? (
                      <View style={styles.aiPrayerMetaChip}>
                        <Text style={styles.aiPrayerMetaLabel}>
                          {t("journal.aiPrayerContextMood")}
                        </Text>
                        <Text style={styles.aiPrayerMetaValue}>
                          {prayerContext.detected_mood}
                        </Text>
                      </View>
                    ) : null}

                    {prayerContext?.detected_theme ? (
                      <View style={styles.aiPrayerMetaChip}>
                        <Text style={styles.aiPrayerMetaLabel}>
                          {t("journal.aiPrayerContextTheme")}
                        </Text>
                        <Text style={styles.aiPrayerMetaValue}>
                          {prayerContext.detected_theme}
                        </Text>
                      </View>
                    ) : null}

                    {prayerResult?.prayer_type ? (
                      <View style={styles.aiPrayerMetaChip}>
                        <Text style={styles.aiPrayerMetaLabel}>
                          {t("journal.aiPrayerContextType")}
                        </Text>
                        <Text style={styles.aiPrayerMetaValue}>
                          {prayerResult.prayer_type}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                )}

                {prayerSuggestions.length > 0 && (
                  <View style={styles.aiPrayerSuggestionsBlock}>
                    <Text style={styles.aiPrayerSuggestionsTitle}>
                      {t("journal.aiPrayerSuggestionsLabel")}
                    </Text>
                    {prayerSuggestions.slice(0, 3).map((item, index) => (
                      <View key={`${item}-${index}`} style={styles.aiPrayerSuggestionItem}>
                        <View style={styles.aiPrayerSuggestionDot} />
                        <Text style={styles.aiPrayerSuggestionText}>{item}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <TouchableOpacity
                  style={styles.aiPrayerApplyButton}
                  onPress={handleInsertPrayer}
                  activeOpacity={0.88}
                >
                  <AISparkles size={18} color={COLORS.textPrimary} isAnimating={true} />
                  <Text style={styles.aiPrayerApplyButtonText}>
                    {t("journal.aiPrayerInsert")}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            <TouchableOpacity
              style={[
                styles.aiPrayerGenerateButton,
                prayerLoading && styles.aiPrayerGenerateButtonDisabled,
              ]}
              onPress={handleSuggestPrayer}
              disabled={prayerLoading}
              activeOpacity={0.9}
            >
              {prayerLoading ? (
                <ActivityIndicator size="small" color={COLORS.textPrimary} />
              ) : (
                <AISparkles size={18} color={COLORS.textPrimary} isAnimating={true} />
              )}
              <Text style={styles.aiPrayerGenerateButtonText}>
                {generatedPrayerText
                  ? t("journal.aiPrayerRegenerate")
                  : t("journal.aiPrayerGenerate")}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Reflection Editor */}
          <View style={styles.editorContainer}>
            <TextInput
              style={styles.titleInput}
              placeholder={t("journal.titlePlaceholder")}
              placeholderTextColor="rgba(138, 128, 96, 0.5)"
              value={title}
              onChangeText={setTitle}
            />

            <View style={styles.divider} />

            <View style={styles.toolbar}>
              <TouchableOpacity
                style={[styles.toolbarBtn, styles.micBtnMini]}
                onPress={handleAddAudio}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={20}
                  color={isRecording ? "#FF0000" : COLORS.accent}
                />
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.toolbarBtn, { marginLeft: "auto" }]}
                onPress={() => setMediaPickerVisible(true)}
              >
                <MaterialIcons
                  name="add-photo-alternate"
                  size={20}
                  color={COLORS.textSecondary}
                />
              </TouchableOpacity>
            </View>

            <TextInput
              style={styles.multilineInput}
              placeholder={t("journal.contentPlaceholder")}
              placeholderTextColor="rgba(138, 128, 96, 0.4)"
              multiline
              textAlignVertical="top"
              value={content}
              onChangeText={setContent}
            />
          </View>

          {/* Media Strip */}
          <View style={styles.section}>
            <View style={styles.mediaHeader}>
              <Text style={styles.label}>{t("journal.mediaHeader")}</Text>
              <Text style={{ fontSize: 12, color: COLORS.textTertiary }}>
                {displayImages.length + (hasCurrentVideo ? 1 : 0) > 0
                  ? t("journal.mediaCount_photos", {
                      count: displayImages.length,
                    }) + (hasCurrentVideo ? t("journal.mediaCount_video") : "")
                  : t("journal.mediaLimit")}
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.mediaRow}
            >
              {/* Add button (MediaPickerModal) */}
              <TouchableOpacity
                style={styles.addMediaBtn}
                onPress={() => setMediaPickerVisible(true)}
              >
                <MaterialIcons
                  name="add-circle-outline"
                  size={28}
                  color={COLORS.accent}
                />
                <Text style={styles.addMediaText}>{t("journal.add")}</Text>
              </TouchableOpacity>

              {/* Image thumbnails */}
              {displayImages.map((img, index) => (
                <View key={img.id || index} style={styles.mediaItem}>
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() =>
                      setPreviewMedia({ type: "image", uri: img.uri })
                    }
                  >
                    <Image
                      source={{ uri: img.uri }}
                      style={styles.mediaImage}
                    />
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.removeMediaBtn}
                    onPress={() =>
                      handleRemoveMedia(
                        img.sourceIndex,
                        "images",
                        false,
                        img.isExisting,
                      )
                    }
                  >
                    <MaterialIcons name="close" size={14} color="#fff" />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Thumbnail video */}
              {(() => {
                const videoUri = currentVideoUri;
                const isExistingVideo =
                  selectedVideos.length === 0 && !!existingVideoUrl;

                if (!videoUri) return null;

                return (
                  <View style={styles.mediaItem}>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      style={styles.mediaImage}
                      onPress={() =>
                        setPreviewMedia({ type: "video", uri: videoUri })
                      }
                    >
                      <View
                        style={[
                          StyleSheet.absoluteFillObject,
                          {
                            backgroundColor: "#1a1a2e",
                            justifyContent: "center",
                            alignItems: "center",
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="videocam"
                          size={30}
                          color={COLORS.accent}
                        />
                      </View>
                      <View style={styles.videoOverlay}>
                        <MaterialIcons
                          name="play-circle-filled"
                          size={28}
                          color="rgba(255,255,255,0.9)"
                        />
                      </View>
                    </TouchableOpacity>
                    <View
                      style={{
                        position: "absolute",
                        bottom: 4,
                        left: 4,
                        backgroundColor: "rgba(0,0,0,0.6)",
                        borderRadius: 4,
                        paddingHorizontal: 4,
                        paddingVertical: 1,
                      }}
                    >
                      <Text
                        style={{
                          color: "#fff",
                          fontSize: 9,
                          fontWeight: "600",
                        }}
                      >
                        VID
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeMediaBtn}
                      onPress={() =>
                        handleRemoveMedia(0, "videos", isExistingVideo)
                      }
                    >
                      <MaterialIcons name="close" size={14} color="#fff" />
                    </TouchableOpacity>
                  </View>
                );
              })()}
            </ScrollView>
          </View>

          {/* Audio Recording Section */}
          {(isRecording || playableAudioUri) && (
            <View style={styles.section}>
              <Text style={styles.label}>{t("journal.audioHeader")}</Text>
              {isRecording ? (
                <View style={styles.recordingIndicator}>
                  <View style={styles.recordingDot} />
                  <Text style={styles.recordingText}>
                    {t("journal.recording")}{" "}
                    {Math.floor(recordingDuration / 60)}:
                    {(recordingDuration % 60).toString().padStart(2, "0")}
                  </Text>
                  <TouchableOpacity
                    style={styles.stopRecordingBtn}
                    onPress={handleStopRecording}
                  >
                    <MaterialIcons name="stop" size={24} color="#fff" />
                  </TouchableOpacity>
                </View>
              ) : playableAudioUri ? (
                <View style={styles.audioPlayer}>
                  <TouchableOpacity
                    style={[styles.playBtn, isPlaying && styles.playBtnActive]}
                    onPress={handlePlayAudio}
                  >
                    <MaterialIcons
                      name={isPlaying ? "pause" : "play-arrow"}
                      size={28}
                      color={isPlaying ? "#fff" : COLORS.accent}
                    />
                  </TouchableOpacity>
                  <View style={styles.audioInfo}>
                    <Text style={styles.audioTitle}>
                      {recordingUri
                        ? t("journal.yourRecording")
                        : t("journal.existingAudioFile")}
                    </Text>
                    <Text
                      style={[
                        styles.audioDuration,
                        isPlaying && styles.audioDurationActive,
                      ]}
                    >
                      {isPlaying
                        ? t("journal.playing")
                        : recordingDuration > 0
                          ? `${Math.floor(recordingDuration / 60)}:${(recordingDuration % 60).toString().padStart(2, "0")}`
                          : "0:00"}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={styles.deleteAudioBtn}
                    onPress={handleDeleteAudio}
                  >
                    <MaterialIcons
                      name="delete-outline"
                      size={24}
                      color="#FF6B6B"
                    />
                  </TouchableOpacity>
                </View>
              ) : null}
            </View>
          )}

          <View style={[styles.footer, { paddingBottom: insets.bottom + 24 }]}>
            <View style={styles.actionCard}>
              <TouchableOpacity
                style={[
                  styles.actionCardMicButton,
                  isRecording && styles.actionCardMicButtonRecording,
                ]}
                activeOpacity={0.9}
                onPress={handleAddAudio}
              >
                <MaterialIcons
                  name={isRecording ? "stop" : "mic"}
                  size={32}
                  color={isRecording ? "#fff" : COLORS.textPrimary}
                />
              </TouchableOpacity>

              <View style={styles.footerContent}>
                <TouchableOpacity
                  style={styles.btnPrimary}
                  onPress={handleSave}
                  disabled={loading}
                >
                    <MaterialIcons
                      name="menu-book"
                      size={18}
                      color={COLORS.textPrimary}
                    />
                    <Text style={styles.btnPrimaryText}>
                      {loading
                        ? t("journal.saving")
                        : t("journal.saveJournal", {
                            defaultValue: "Lưu nhật ký",
                          })}
                    </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <MediaPickerModal
        visible={isMediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={handleMediaPicked}
        mediaTypes={["images", "videos"]}
        allowsMultipleSelection={true}
        selectionLimit={10}
        title={t("journal.addMediaTitle")}
      />

      <AudioPickerModal
        visible={isAudioPickerVisible}
        onClose={() => setAudioPickerVisible(false)}
        onRecordNow={startRecording}
        onUploadFile={handlePickAudio}
      />

      <Modal
        visible={aiBottomSheetVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setAiBottomSheetVisible(false)}
      >
        <View style={styles.aiModalOverlay}>
          <TouchableWithoutFeedback
            onPress={() => setAiBottomSheetVisible(false)}
          >
            <View style={styles.aiModalBackdrop} />
          </TouchableWithoutFeedback>

          <SafeAreaView edges={["bottom"]} style={styles.aiModalSafeArea}>
            <TouchableWithoutFeedback>
              <View style={[styles.aiBottomSheet, { paddingBottom: SPACING.lg }]}>
                <View style={styles.aiModalHandleWrap}>
                  <View style={styles.aiModalHandle} />
                </View>

                <View style={styles.aiSheetHeader}>
                  <View style={styles.aiSheetHeaderIcon}>
                    <AISparkles
                      size={20}
                      color={COLORS.accent}
                      isAnimating={!prayerLoading}
                    />
                  </View>

                  <View style={styles.aiSheetHeaderContent}>
                    <Text style={styles.aiSheetTitle}>
                      {t("journal.aiPrayerTitle")}
                    </Text>
                    <Text style={styles.aiSheetSubtitle}>
                      {prayerLoading
                        ? t("journal.aiPrayerLoadingHint")
                        : t("journal.aiPrayerSubtitle")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.aiSheetCloseButton}
                    onPress={() => setAiBottomSheetVisible(false)}
                    activeOpacity={0.85}
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.aiSheetScrollView}
                  contentContainerStyle={styles.aiSheetScrollContent}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                >
                  {renderAIPrayerSheetBody()}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </View>
      </Modal>

      <Modal
        visible={plannerModalVisible}
        transparent
        animationType="slide"
        statusBarTranslucent
        onRequestClose={() => setPlannerModalVisible(false)}
      >
        <View style={styles.plannerModalOverlay}>
          <TouchableWithoutFeedback onPress={() => setPlannerModalVisible(false)}>
            <View style={styles.plannerModalBackdrop} />
          </TouchableWithoutFeedback>

          <SafeAreaView edges={["bottom"]} style={styles.plannerModalSafeArea}>
            <TouchableWithoutFeedback>
              <View
                style={[
                  styles.plannerModalSheet,
                  { paddingBottom: SPACING.lg },
                ]}
              >
                <View style={styles.plannerModalHandleWrap}>
                  <View style={styles.plannerModalHandle} />
                </View>

                <View style={styles.plannerModalHeader}>
                  <View style={styles.plannerModalTitleWrap}>
                    <Text style={styles.plannerModalTitle}>
                      {pickerTab === "planner"
                        ? t("journal.plannerPickerTitle")
                        : "Chọn địa điểm"}
                    </Text>
                    <Text style={styles.plannerModalSubtitle}>
                      {pickerTab === "planner"
                        ? t("journal.plannerPickerSubtitle")
                        : selectedPlanner
                          ? t("journal.checkInsIn", {
                              name: selectedPlanner.name,
                            })
                          : t("journal.selectPlanToSeeCheckIns")}
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={styles.plannerModalCloseButton}
                    onPress={() => setPlannerModalVisible(false)}
                  >
                    <MaterialIcons
                      name="close"
                      size={22}
                      color={COLORS.textSecondary}
                    />
                  </TouchableOpacity>
                </View>

                <View style={styles.pickerTabBar}>
                  <TouchableOpacity
                    style={[
                      styles.pickerTabButton,
                      pickerTab === "planner" && styles.pickerTabButtonActive,
                    ]}
                    onPress={() => setPickerTab("planner")}
                    activeOpacity={0.9}
                  >
                    <Text
                      style={[
                        styles.pickerTabText,
                        pickerTab === "planner" && styles.pickerTabTextActive,
                      ]}
                    >
                      {"Kế hoạch"}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.pickerTabButton,
                      !selectedPlanner && styles.pickerTabButtonDisabled,
                      pickerTab === "locations" &&
                        styles.pickerTabButtonActive,
                    ]}
                    onPress={() => selectedPlanner && setPickerTab("locations")}
                    activeOpacity={0.9}
                    disabled={!selectedPlanner}
                  >
                    <Text
                      style={[
                        styles.pickerTabText,
                        !selectedPlanner && styles.pickerTabTextDisabled,
                        pickerTab === "locations" &&
                          styles.pickerTabTextActive,
                      ]}
                    >
                      {"Địa điểm"}
                    </Text>
                  </TouchableOpacity>
                </View>

                <ScrollView
                  style={styles.plannerModalList}
                  contentContainerStyle={styles.plannerModalListContent}
                  showsVerticalScrollIndicator={false}
                >
                  {pickerTab === "planner" ? (
                    completedPlanners.length > 0 ? (
                      completedPlanners.map((planner) => {
                        const isSelected = selectedPlanner?.id === planner.id;
                        const plannerCheckInCount = getPlannerCheckInCount(
                          planner.id,
                        );

                        return (
                          <TouchableOpacity
                            key={planner.id}
                            style={[
                              styles.plannerOptionCard,
                              isSelected && styles.plannerOptionCardSelected,
                            ]}
                            activeOpacity={0.9}
                            onPress={() => handleChoosePlanner(planner)}
                          >
                            <View
                              style={[
                                styles.plannerOptionIconWrap,
                                isSelected &&
                                  styles.plannerOptionIconWrapSelected,
                              ]}
                            >
                              <MaterialIcons
                                name={isSelected ? "check-circle" : "route"}
                                size={22}
                                color={isSelected ? COLORS.white : COLORS.accent}
                              />
                            </View>

                            <View style={styles.plannerOptionTextWrap}>
                              <Text
                                style={[
                                  styles.plannerOptionName,
                                  isSelected &&
                                    styles.plannerOptionNameSelected,
                                ]}
                              >
                                {planner.name}
                              </Text>
                              <View style={styles.plannerOptionMetaRow}>
                                <View style={styles.plannerOptionStatusChip}>
                                  <Text
                                    style={[
                                      styles.plannerOptionCaption,
                                      isSelected &&
                                        styles.plannerOptionCaptionSelected,
                                    ]}
                                  >
                                    {t("journal.completed")}
                                  </Text>
                                </View>

                                {plannerCheckInCount > 0 && (
                                  <View
                                    style={[
                                      styles.plannerOptionCountChip,
                                      isSelected &&
                                        styles.plannerOptionCountChipSelected,
                                    ]}
                                  >
                                    <MaterialIcons
                                      name="place"
                                      size={12}
                                      color={
                                        isSelected
                                          ? COLORS.accent
                                          : COLORS.textSecondary
                                      }
                                    />
                                    <Text
                                      style={styles.plannerOptionCountText}
                                    >
                                      {t("journal.availableCheckIns", {
                                        count: plannerCheckInCount,
                                      })}
                                    </Text>
                                  </View>
                                )}
                              </View>
                            </View>

                            <View
                              style={[
                                styles.plannerOptionTrailing,
                                isSelected &&
                                  styles.plannerOptionTrailingSelected,
                              ]}
                            >
                              <MaterialIcons
                                name={
                                  isSelected
                                    ? "radio-button-checked"
                                    : "chevron-right"
                                }
                                size={22}
                                color={
                                  isSelected
                                    ? COLORS.accent
                                    : COLORS.textTertiary
                                }
                              />
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    ) : (
                      <View style={styles.locationEmptyCard}>
                        <Text style={styles.locationEmptyTitle}>
                          {t("journal.noCompletedPlans")}
                        </Text>
                        <Text style={styles.locationEmptySubtitle}>
                          {t("journal.plannerPickerEmptySubtitle")}
                        </Text>
                      </View>
                    )
                  ) : selectedPlanner ? (
                    <>
                      <View style={styles.modalContextCard}>
                        <Text style={styles.modalContextLabel}>
                          {t("journal.selectedPlanLabel")}
                        </Text>
                        <Text style={styles.modalContextTitle}>
                          {selectedPlanner.name}
                        </Text>
                        <Text style={styles.modalContextHint}>
                          {selectedPlannerItemIds.length > 0
                            ? t("journal.selectedCheckInCount", {
                                count: selectedPlannerItemIds.length,
                              })
                            : t("journal.step2Subtitle")}
                        </Text>
                      </View>

                      {filteredCheckIns.length > 0 ? (
                        filteredCheckIns.map((checkIn) => {
                          const isSelected = selectedPlannerItemIds.includes(
                            checkIn.planner_item_id,
                          );
                          const siteImage = getCheckInSiteImage(checkIn);

                          return (
                            <TouchableOpacity
                              key={checkIn.id}
                              style={[
                                styles.locationOptionCard,
                                isSelected &&
                                  styles.locationOptionCardSelected,
                              ]}
                              activeOpacity={0.9}
                              onPress={() => handleSelectLocation(checkIn)}
                            >
                              {siteImage ? (
                                <Image
                                  source={{ uri: siteImage }}
                                  style={styles.locationOptionImage}
                                />
                              ) : (
                                <View
                                  style={styles.locationOptionImageFallback}
                                >
                                  <MaterialIcons
                                    name="place"
                                    size={20}
                                    color={COLORS.accent}
                                  />
                                </View>
                              )}

                              <View style={styles.locationOptionContent}>
                                <Text
                                  style={styles.locationOptionName}
                                  numberOfLines={1}
                                >
                                  {checkIn.site?.name ||
                                    t("journal.genericLocationName")}
                                </Text>

                                <Text
                                  style={styles.locationOptionMeta}
                                  numberOfLines={1}
                                >
                                  {checkIn.site?.address ||
                                    t("journal.locationContextHint")}
                                </Text>

                                <View style={styles.locationOptionMetaRow}>
                                  <View
                                    style={[
                                      styles.locationOptionBadge,
                                      isSelected &&
                                        styles.locationOptionBadgeSelected,
                                    ]}
                                  >
                                    <Text
                                      style={[
                                        styles.locationOptionBadgeText,
                                        isSelected &&
                                          styles.locationOptionBadgeTextSelected,
                                      ]}
                                    >
                                      {isSelected
                                        ? "Đã chọn"
                                        : t("journal.locationContextLabel")}
                                    </Text>
                                  </View>
                                </View>
                              </View>

                              <View
                                style={[
                                  styles.locationOptionTrailing,
                                  isSelected &&
                                    styles.locationOptionTrailingSelected,
                                ]}
                              >
                                <MaterialIcons
                                  name={
                                    isSelected
                                      ? "check-circle"
                                      : "radio-button-unchecked"
                                  }
                                  size={22}
                                  color={
                                    isSelected
                                      ? COLORS.accent
                                      : COLORS.textTertiary
                                  }
                                />
                              </View>
                            </TouchableOpacity>
                          );
                        })
                      ) : (
                        <View style={styles.locationEmptyCard}>
                          <Text style={styles.locationEmptyTitle}>
                            {t("journal.noCheckInsInPlan")}
                          </Text>
                          <Text style={styles.locationEmptySubtitle}>
                            {t("journal.locationContextHint")}
                          </Text>
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.locationEmptyCard}>
                      <Text style={styles.locationEmptyTitle}>
                        {t("journal.selectPlanFirst")}
                      </Text>
                      <Text style={styles.locationEmptySubtitle}>
                        {t("journal.plannerPickerSubtitle")}
                      </Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            </TouchableWithoutFeedback>
          </SafeAreaView>
        </View>
      </Modal>

      {/* Media Preview Modal */}
      <Modal
        visible={!!previewMedia}
        transparent
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.previewBackdrop}>
          <TouchableOpacity
            style={styles.previewCloseBtn}
            onPress={() => setPreviewMedia(null)}
          >
            <MaterialIcons name="close" size={28} color="#fff" />
          </TouchableOpacity>
          {previewMedia?.type === "image" && (
            <Image
              source={{ uri: previewMedia.uri }}
              style={styles.previewImage}
              resizeMode="contain"
            />
          )}
          {previewMedia?.type === "video" && (
            <View style={styles.previewVideoContainer}>
              <VideoView
                style={styles.previewVideo}
                player={previewVideoPlayer}
                allowsFullscreen
                nativeControls
              />
            </View>
          )}
        </View>
      </Modal>

    </ImageBackground>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    backgroundColor: "rgba(253, 251, 247, 0.95)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.02)",
    zIndex: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    backgroundColor: "rgba(0,0,0,0.02)",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
    letterSpacing: -0.5,
  },
  contentJSON: {
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
  },
  compactLocationBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 250, 239, 0.92)",
    borderRadius: 18,
    padding: 12,
    marginBottom: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.16)",
    gap: 12,
    ...SHADOWS.subtle,
  },
  locationThumb: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: COLORS.borderLight,
  },
  locationThumbFallback: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationInfo: {
    flex: 1,
    gap: 4,
    minWidth: 0,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  locationName: {
    flex: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  locationSub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  writerCard: {
    backgroundColor: "rgba(255, 253, 249, 0.98)",
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
    overflow: "hidden",
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  writerContentInput: {
    minHeight: 220,
    paddingTop: 18,
  },
  mediaToolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
    gap: 8,
  },
  mediaBtn: {
    width: 42,
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(245, 239, 226, 0.9)",
  },
  mediaBtnActive: {
    backgroundColor: "rgba(220, 76, 76, 0.14)",
  },
  mediaSectionCard: {
    backgroundColor: "rgba(255, 252, 245, 0.94)",
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  mediaSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  mediaSectionTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  mediaSectionMeta: {
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "right",
    flexShrink: 1,
  },
  audioSectionCard: {
    backgroundColor: "rgba(255, 252, 245, 0.94)",
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  aiCompactBanner: {
    borderRadius: 18,
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  aiCompactBannerGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  aiCompactBannerContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  aiCompactBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  aiCompactBannerText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  aiModalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.28)",
  },
  aiModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  aiModalSafeArea: {
    justifyContent: "flex-end",
  },
  aiBottomSheet: {
    backgroundColor: "rgba(255, 251, 243, 0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.xs,
    maxHeight: "82%",
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
  },
  aiModalHandleWrap: {
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  aiModalHandle: {
    width: 42,
    height: 4,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
  },
  aiSheetHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiSheetHeaderIcon: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginTop: 2,
  },
  aiSheetHeaderContent: {
    flex: 1,
    gap: 4,
  },
  aiSheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
  },
  aiSheetSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  aiSheetCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    justifyContent: "center",
    alignItems: "center",
  },
  aiSheetScrollView: {
    flexGrow: 0,
  },
  aiSheetScrollContent: {
    paddingBottom: SPACING.xs,
  },
  writerFooter: {
    marginTop: 0,
    paddingHorizontal: 0,
  },
  btnOutline: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.08)",
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    backgroundColor: "rgba(255,255,255,0.82)",
  },
  btnOutlineText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  videoThumbBase: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1a1a2e",
  },
  videoChip: {
    position: "absolute",
    bottom: 4,
    left: 4,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  videoChipText: {
    color: "#fff",
    fontSize: 9,
    fontWeight: "600",
  },
  legacyWriterHidden: {
    display: "none",
  },
  section: {
    marginBottom: SPACING.md,
  },
  contextSection: {
    backgroundColor: "rgba(255, 252, 245, 0.88)",
    borderRadius: 24,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  contextSubsection: {},
  contextDivider: {
    height: 1,
    backgroundColor: "rgba(236, 182, 19, 0.14)",
    marginVertical: SPACING.lg,
  },
  plannerSection: {
    backgroundColor: "rgba(255, 252, 245, 0.85)",
    borderRadius: 20,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 10,
    marginLeft: 0,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  stepHeroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  stepHeroTitleWrap: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  stepHeroIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  stepHeroTextWrap: {
    flex: 1,
  },
  stepHeroSubtitle: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  stepHeroCountChip: {
    backgroundColor: "rgba(236, 182, 19, 0.1)",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
  },
  stepHeroCountText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  selectedPlannerLoadingCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    minHeight: 96,
    borderRadius: 20,
    backgroundColor: "rgba(255, 250, 241, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
  },
  selectedPlannerLoadingText: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  selectedPlannerCard: {
    borderRadius: 24,
    ...SHADOWS.small,
  },
  selectedPlannerSimpleCard: {
    borderRadius: 24,
    padding: SPACING.md,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.2)",
    backgroundColor: "rgba(255, 249, 235, 0.98)",
  },
  selectedPlannerSimpleHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  selectedPlannerLabelRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
    marginBottom: 6,
  },
  selectedPlannerTopBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
  },
  selectedPlannerTopBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accent,
    textTransform: "uppercase",
  },
  selectedPlannerMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    flex: 1,
  },
  selectedPlannerIcon: {
    width: 48,
    height: 48,
    borderRadius: 16,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  selectedPlannerTextWrap: {
    flex: 1,
  },
  selectedPlannerCaption: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
  },
  selectedPlannerName: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
  },
  selectedPlannerActionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedPlannerActionText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  selectedPlannerMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  selectedPlannerMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: COLORS.white,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedPlannerMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  selectedPlannerContextRow: {
    marginTop: SPACING.md,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.74)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectedPlannerContextText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  plannerEmptyCard: {
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.xl,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
    backgroundColor: "rgba(255, 251, 243, 0.9)",
    ...SHADOWS.subtle,
  },
  plannerEmptyIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.sm,
  },
  plannerEmptyTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
    fontFamily: FontDisplay,
    textAlign: "center",
  },
  plannerEmptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    textAlign: "center",
    maxWidth: 320,
  },
  pickPlannerButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: SPACING.md,
    backgroundColor: COLORS.accent,
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    ...SHADOWS.subtle,
  },
  pickPlannerButtonText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  legacyPlannerHidden: {
    display: "none",
  },
  locationSection: {
    backgroundColor: "rgba(255, 255, 255, 0.92)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
  },
  selectedLocationCard: {
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.16)",
    backgroundColor: "rgba(255, 250, 239, 0.98)",
    overflow: "hidden",
    ...SHADOWS.subtle,
  },
  selectedLocationHero: {
    height: 168,
    justifyContent: "flex-end",
  },
  selectedLocationHeroImage: {
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
  },
  selectedLocationHeroOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(24, 22, 17, 0.28)",
  },
  selectedLocationHeroContent: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    gap: 8,
  },
  selectedLocationHeroBadge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  selectedLocationHeroBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.white,
    textTransform: "uppercase",
  },
  selectedLocationHeroTitle: {
    fontSize: 22,
    lineHeight: 30,
    fontWeight: "700",
    color: COLORS.white,
    fontFamily: FontDisplay,
  },
  selectedLocationHeroSubtitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "rgba(255,255,255,0.92)",
  },
  selectedLocationBody: {
    padding: SPACING.md,
  },
  selectedLocationHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  selectedLocationTopMeta: {
    marginBottom: SPACING.sm,
  },
  selectedLocationIcon: {
    width: 46,
    height: 46,
    borderRadius: 15,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  selectedLocationImage: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginRight: SPACING.sm,
    backgroundColor: COLORS.borderLight,
  },
  selectedLocationTextWrap: {
    flex: 1,
  },
  selectedLocationLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  selectedLocationInlineValue: {
    fontSize: 15,
    lineHeight: 22,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  selectedLocationValue: {
    fontSize: 19,
    lineHeight: 28,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
  },
  selectedLocationMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  selectedLocationMetaChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedLocationMetaText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  selectedLocationHintBox: {
    marginTop: SPACING.md,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.76)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
  },
  selectedLocationHintText: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  locationListLabel: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
  },
  locationOptionList: {
    gap: SPACING.sm,
  },
  locationOptionCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...SHADOWS.subtle,
  },
  locationOptionCardSelected: {
    backgroundColor: "#FFF6DE",
    borderColor: "rgba(236, 182, 19, 0.28)",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    elevation: 0,
  },
  locationOptionIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    marginRight: SPACING.md,
  },
  locationOptionImage: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginRight: SPACING.md,
    backgroundColor: COLORS.borderLight,
  },
  locationOptionImageSelected: {
    borderWidth: 2,
    borderColor: "rgba(236, 182, 19, 0.35)",
  },
  locationOptionIconWrapSelected: {
    backgroundColor: COLORS.accent,
  },
  locationOptionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  locationOptionTitleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
    marginBottom: 4,
  },
  locationOptionName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    flex: 1,
    lineHeight: 22,
  },
  locationOptionNameSelected: {
    color: COLORS.textPrimary,
  },
  locationOptionSelectedBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    borderWidth: 1,
    borderColor: "rgba(76, 175, 80, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  locationOptionSelectedBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.success,
  },
  locationOptionCaption: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  locationOptionCaptionSelected: {
    color: COLORS.accent,
  },
  locationOptionTrailing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    marginLeft: SPACING.sm,
    alignSelf: "center",
  },
  locationOptionTrailingSelected: {
    backgroundColor: "#FFFBEF",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.2)",
  },
  locationEmptyCard: {
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.12)",
    backgroundColor: "rgba(255, 250, 239, 0.86)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.lg,
  },
  locationEmptyTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 6,
  },
  locationEmptySubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  locationInput: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface0,
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  locationIcon: {
    marginRight: 12,
  },
  locationPlaceholder: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
  },
  chevronIcon: {
    marginLeft: 12,
  },
  chipContainer: {
    marginTop: 12,
    paddingVertical: 4, // for shadow clipping
  },
  chipWrapContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 12,
    paddingVertical: 4,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface0,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 99,
    marginRight: 8,
    marginBottom: 8,
    gap: 6,
    borderWidth: 1,
    borderColor: "transparent",
    ...SHADOWS.subtle,
  },
  chipText: {
    fontSize: 14,
    fontWeight: "500",
    color: COLORS.textSecondary,
    flexShrink: 1,
  },
  aiPrayerCard: {
    backgroundColor: "rgba(255, 252, 245, 0.96)",
    borderRadius: 24,
    padding: SPACING.md,
    marginBottom: SPACING.lg,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.22)",
    ...SHADOWS.small,
  },
  aiPrayerHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: SPACING.md,
  },
  aiPrayerIconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  aiPrayerHeaderContent: {
    flex: 1,
  },
  aiPrayerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
    fontFamily: FontDisplay,
  },
  aiPrayerSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  aiPrayerFields: {
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  aiPrayerField: {
    gap: 6,
  },
  aiPrayerFieldLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginLeft: 4,
  },
  aiPrayerInput: {
    backgroundColor: COLORS.surface0,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
  },
  aiPrayerLoadingBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(236, 182, 19, 0.08)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
    padding: SPACING.md,
    marginBottom: SPACING.md,
  },
  aiPrayerLoadingTextWrap: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  aiPrayerLoadingTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  aiPrayerLoadingHint: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  aiPrayerErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.dangerLight,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "rgba(220, 76, 76, 0.16)",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    marginBottom: SPACING.md,
  },
  aiPrayerErrorText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.danger,
    marginLeft: SPACING.xs,
  },
  aiPrayerResultCard: {
    backgroundColor: COLORS.surface0,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.15)",
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  aiPrayerResultTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  aiPrayerResultText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  aiPrayerMetaWrap: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
    marginTop: SPACING.md,
  },
  aiPrayerMetaChip: {
    backgroundColor: "rgba(236, 182, 19, 0.08)",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.16)",
  },
  aiPrayerMetaLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    marginBottom: 2,
  },
  aiPrayerMetaValue: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  aiPrayerSuggestionsBlock: {
    marginTop: SPACING.md,
    gap: SPACING.xs,
  },
  aiPrayerSuggestionsTitle: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  aiPrayerSuggestionItem: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  aiPrayerSuggestionDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: COLORS.accent,
    marginTop: 7,
    marginRight: 8,
  },
  aiPrayerSuggestionText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  aiPrayerApplyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accentLight,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: SPACING.md,
    marginTop: SPACING.md,
  },
  aiPrayerApplyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  aiPrayerGenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 18,
    paddingVertical: 14,
    backgroundColor: COLORS.accent,
    ...SHADOWS.subtle,
  },
  aiPrayerGenerateButtonDisabled: {
    opacity: 0.7,
  },
  aiPrayerGenerateButtonText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  editorContainer: {
    backgroundColor: COLORS.surface0,
    borderRadius: 24,
    padding: 4,
    ...SHADOWS.subtle,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: SPACING.lg,
  },
  titleInput: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 16,
    fontFamily: FontDisplay,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.border,
    marginHorizontal: 20,
  },
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "transparent",
  },
  toolbarGroup: {
    flexDirection: "row",
    gap: 4,
  },
  toolbarBtn: {
    padding: 8,
    borderRadius: 8,
  },
  micBtnMini: {
    backgroundColor: "rgba(236, 182, 19, 0.1)",
  },
  multilineInput: {
    fontSize: 18,
    lineHeight: 28,
    color: COLORS.textPrimary,
    padding: 20,
    minHeight: 240,
    fontFamily: FontDisplay,
  },
  mediaHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 4,
  },
  linkText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accent,
  },
  mediaRow: {
    gap: 12,
    paddingTop: 8,
    paddingBottom: 8,
  },
  addMediaBtn: {
    width: 96,
    height: 96,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "rgba(236, 182, 19, 0.4)",
    borderStyle: "dashed",
    backgroundColor: "rgba(236, 182, 19, 0.05)",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  addMediaText: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.accent,
  },
  mediaItem: {
    width: 96,
    height: 96,
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    ...SHADOWS.small,
  },
  mediaImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  removeMediaBtn: {
    position: "absolute",
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  footer: {
    marginTop: SPACING.lg,
    paddingTop: 8,
    paddingHorizontal: 16,
    backgroundColor: "transparent",
  },
  actionCard: {
    maxWidth: 500,
    width: "100%",
    alignSelf: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 8,
  },
  actionCardMicButton: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    marginTop: 0,
    marginBottom: 12,
    ...SHADOWS.medium,
    shadowColor: COLORS.accent,
    shadowOpacity: 0.35,
    borderWidth: 4,
    borderColor: COLORS.surface0,
  },
  actionCardMicButtonRecording: {
    backgroundColor: "#FF0000",
    shadowColor: "#FF0000",
  },
  footerContent: {
    flexDirection: "row",
    gap: 16,
    width: "100%",
  },
  btnSecondary: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    borderWidth: 2,
    borderColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  btnSecondaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.accent,
  },
  btnPrimary: {
    flex: 1,
    height: 56,
    borderRadius: 28,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
    ...SHADOWS.subtle,
  },
  btnPrimaryText: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary, // Or White depending on contrast, Mockup has dark text
  },
  plannerModalOverlay: {
    flex: 1,
    backgroundColor: COLORS.overlayDark,
    justifyContent: "flex-end",
  },
  plannerModalBackdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  plannerModalSafeArea: {
    justifyContent: "flex-end",
  },
  plannerModalSheet: {
    backgroundColor: "rgba(255, 251, 243, 0.98)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingTop: SPACING.xs,
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderRightWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.14)",
    ...SHADOWS.large,
  },
  plannerModalHandleWrap: {
    alignItems: "center",
    paddingVertical: SPACING.md,
  },
  plannerModalHandle: {
    width: 42,
    height: 5,
    borderRadius: 999,
    backgroundColor: COLORS.borderMedium,
  },
  plannerModalHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.sm,
    gap: SPACING.md,
  },
  plannerModalTitleWrap: {
    flex: 1,
  },
  plannerModalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
    marginBottom: 4,
  },
  plannerModalSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  plannerModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: COLORS.backgroundSoft,
  },
  plannerModalList: {
    maxHeight: 460,
  },
  plannerModalListContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
    gap: SPACING.sm,
  },
  pickerTabBar: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: SPACING.lg,
    paddingBottom: SPACING.md,
  },
  pickerTabButton: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.78)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
  },
  pickerTabButtonActive: {
    backgroundColor: "#FFF3CC",
    borderColor: "rgba(236, 182, 19, 0.24)",
  },
  pickerTabButtonDisabled: {
    opacity: 0.55,
  },
  pickerTabText: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  pickerTabTextActive: {
    color: COLORS.textPrimary,
  },
  pickerTabTextDisabled: {
    color: COLORS.textTertiary,
  },
  modalContextCard: {
    borderRadius: 18,
    padding: SPACING.md,
    backgroundColor: "rgba(255, 247, 223, 0.9)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
    marginBottom: SPACING.sm,
  },
  modalContextLabel: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.textTertiary,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  modalContextTitle: {
    fontSize: 17,
    lineHeight: 24,
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontFamily: FontDisplay,
  },
  modalContextHint: {
    marginTop: 6,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },
  plannerOptionCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    ...SHADOWS.subtle,
  },
  plannerOptionCardSelected: {
    backgroundColor: "#FFF6DE",
    borderColor: "rgba(236, 182, 19, 0.28)",
    shadowColor: "transparent",
    shadowOpacity: 0,
    shadowRadius: 0,
    shadowOffset: { width: 0, height: 0 },
    elevation: 0,
  },
  plannerOptionIconWrap: {
    width: 48,
    height: 48,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    marginRight: SPACING.md,
  },
  plannerOptionIconWrapSelected: {
    backgroundColor: COLORS.accent,
  },
  plannerOptionTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  plannerOptionName: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  plannerOptionNameSelected: {
    color: COLORS.textPrimary,
  },
  plannerOptionCaption: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  plannerOptionCaptionSelected: {
    color: COLORS.accent,
  },
  plannerOptionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    gap: 8,
  },
  plannerOptionStatusChip: {
    borderRadius: 999,
    backgroundColor: "rgba(236, 182, 19, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  plannerOptionCountChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.82)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  plannerOptionCountChipSelected: {
    backgroundColor: "#FFFBEF",
    borderColor: "rgba(236, 182, 19, 0.18)",
  },
  plannerOptionCountText: {
    fontSize: 11,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  plannerOptionTrailing: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(0,0,0,0.03)",
    marginLeft: SPACING.sm,
  },
  plannerOptionTrailingSelected: {
    backgroundColor: "#FFFBEF",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
  },
  locationOptionImageFallback: {
    width: 46,
    height: 46,
    borderRadius: 15,
    marginRight: SPACING.md,
    backgroundColor: "rgba(236, 182, 19, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  locationOptionContent: {
    flex: 1,
    minWidth: 0,
  },
  locationOptionMeta: {
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  locationOptionMetaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  locationOptionBadge: {
    borderRadius: 999,
    backgroundColor: "rgba(236, 182, 19, 0.1)",
    borderWidth: 1,
    borderColor: "rgba(236, 182, 19, 0.18)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  locationOptionBadgeSelected: {
    backgroundColor: "rgba(76, 175, 80, 0.12)",
    borderColor: "rgba(76, 175, 80, 0.18)",
  },
  locationOptionBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: COLORS.accent,
  },
  locationOptionBadgeTextSelected: {
    color: COLORS.success,
  },
  // Audio Recording Styles
  recordingIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 0, 0, 0.1)",
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF0000",
    marginRight: SPACING.sm,
  },
  recordingText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#FF0000",
  },
  stopRecordingBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#FF0000",
    justifyContent: "center",
    alignItems: "center",
  },
  audioPlayer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.surface0,
    borderRadius: 12,
    padding: SPACING.md,
    marginTop: SPACING.sm,
    ...SHADOWS.subtle,
  },
  playBtn: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  playBtnActive: {
    backgroundColor: COLORS.accent,
  },
  audioInfo: {
    flex: 1,
  },
  audioTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  audioDuration: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  audioDurationActive: {
    color: COLORS.accent,
    fontWeight: "600",
  },
  deleteAudioBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  // Planner tag (shows the linked plan after selecting a check-in)
  plannerTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.25)",
    alignSelf: "flex-start",
  },
  plannerTagText: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  // Sub-text below the chip (plan name)
  chipSubText: {
    fontSize: 10,
    color: COLORS.textTertiary,
    marginTop: 1,
  },
  // Green "Completed" badge
  completedBadge: {
    marginLeft: 8,
    backgroundColor: "rgba(39, 174, 96, 0.12)",
    borderRadius: 99,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "rgba(39, 174, 96, 0.3)",
  },
  completedBadgeText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#27ae60",
  },
  emptyHint: {
    fontSize: 13,
    color: COLORS.textTertiary,
    fontStyle: "italic",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.3)",
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 10,
  },
  // Preview Modal
  previewBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  previewCloseBtn: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 999,
    padding: 8,
    backgroundColor: "rgba(0,0,0,0.5)",
    borderRadius: 20,
  },
  previewImage: {
    width: "100%",
    height: "100%",
  },
  previewVideoContainer: {
    width: width,
    height: (width * 16) / 9, // Max aspect ratio
    maxHeight: "100%",
    justifyContent: "center",
  },
  previewVideo: {
    width: "100%",
    height: "100%",
  },
});
