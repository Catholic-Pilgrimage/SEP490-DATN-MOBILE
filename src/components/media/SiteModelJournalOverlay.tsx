/**
 * SiteModelJournalOverlay
 * ─────────────────────────────────────────────────────────────────────────────
 * Hiển thị trong 3D Viewer Modal.
 * • Fetch nhật ký của user cho site đang xem (ưu tiên hôm nay → mới nhất)
 * • Nếu có nhật ký → hiện nút "NHẬT KÝ HÔM NAY / Chạm để mở" phát sáng vàng
 * • Nhấn nút → panel nhật ký slide lên từ dưới (parchment aesthetic)
 * • Panel có nút "Đọc tiếp nhật ký" → navigate sang JournalDetailScreen
 */

import { Ionicons, MaterialCommunityIcons, MaterialIcons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import * as DocumentPicker from "expo-document-picker";
import { Audio, Video, ResizeMode } from "expo-av";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Image,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  PanResponder,
  ActivityIndicator,
  Modal,
  TextInput,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
} from "react-native";
import { COLORS, SHADOWS, SPACING, BORDER_RADIUS } from "../../constants/theme.constants";
import { getMyJournals, updateJournal } from "../../services/api/pilgrim/journalApi";
import { JournalEntry, UpdateJournalRequest } from "../../types/pilgrim/journal.types";
import { SiteMedia } from "../../types/pilgrim";
import Toast from "react-native-toast-message";
import { MediaPickerModal } from "../common/MediaPickerModal";
import { AudioPickerModal } from "../common/AudioPickerModal";

const { height: SCREEN_H, width: SCREEN_W } = Dimensions.get("window");

// ─── helpers ─────────────────────────────────────────────────────────────────

const isToday = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return (
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear()
  );
};

const fmtDateVI = (dateStr?: string) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  return `${d.getDate()}/${d.getMonth() + 1}`;
};

const formatDuration = (millis: number) => {
  const totalSeconds = millis / 1000;
  const seconds = Math.floor(totalSeconds % 60);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
};

const privacyLabel = (privacy?: string) => {
  if (privacy === "public") return "Cộng đồng";
  if (privacy === "friends") return "Bạn bè";
  return "Chỉ mình tôi";
};

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  siteId: string;
  siteName?: string;
  siteCoverImage?: string;
  navigation?: any;
  /** Safe area bottom inset from parent */
  bottomInset?: number;
  /** Current 3D model media for narration */
  currentMedia?: SiteMedia;
  /** Controlled expansion state */
  isExpanded?: boolean;
  /** Callback to change expansion state */
  onToggleExpanded?: (val: boolean) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export const SiteModelJournalOverlay: React.FC<Props> = ({
  siteId,
  siteName,
  siteCoverImage,
  navigation,
  bottomInset = 0,
  currentMedia,
  isExpanded = false,
  onToggleExpanded,
}) => {
  const [journal, setJournal] = useState<JournalEntry | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Audio state - Narration (Header)
  const narrationSoundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingNarration, setIsPlayingNarration] = useState(false);
  const [narrationLoading, setNarrationLoading] = useState(false);

  // Audio state - Journal (Body)
  const journalSoundRef = useRef<Audio.Sound | null>(null);
  const [isPlayingJournal, setIsPlayingJournal] = useState(false);
  const [journalAudioLoading, setJournalAudioLoading] = useState(false);
  const [journalDuration, setJournalDuration] = useState(0);
  const [journalPosition, setJournalPosition] = useState(0);

  // Narration script visible
  const [showScript, setShowScript] = useState(false);

  // Media preview state
  type MediaItem = { type: 'image' | 'video', uri: string };
  const [previewMedia, setPreviewMedia] = useState<MediaItem | null>(null);
  
  // Edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState("");
  const [editContent, setEditContent] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  // New Media Management State
  const [remainingImages, setRemainingImages] = useState<string[]>([]);
  const [newImages, setNewImages] = useState<string[]>([]);
  const [isAudioDeleted, setIsAudioDeleted] = useState(false);
  const [newAudioUri, setNewAudioUri] = useState<string | null>(null);
  const [isVideoDeleted, setIsVideoDeleted] = useState(false);
  const [newVideoUri, setNewVideoUri] = useState<string | null>(null);

  // Picker Modals
  const [mediaPickerVisible, setMediaPickerVisible] = useState(false);
  const [audioPickerVisible, setAudioPickerVisible] = useState(false);

  // Animations
  const panelAnim = useRef(new Animated.Value(0)).current; // 0=collapsed, 1=expanded
  const keyboardShift = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0.4)).current;
  const entryAlpha = useRef(new Animated.Value(0)).current; 
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Draggable state
  const pan = useRef(new Animated.ValueXY()).current;
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gesture) => {
        // Only start dragging if moves more than 5px to avoid conflict with clicks
        return Math.abs(gesture.dx) > 5 || Math.abs(gesture.dy) > 5;
      },
      onPanResponderGrant: () => {
        pan.setOffset({
          x: (pan.x as any)._value,
          y: (pan.y as any)._value,
        });
        pan.setValue({ x: 0, y: 0 });
      },
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { 
        useNativeDriver: false 
      }),
      onPanResponderRelease: () => {
        pan.flattenOffset();
      },
    })
  ).current;

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      void narrationSoundRef.current?.unloadAsync();
      void journalSoundRef.current?.unloadAsync();
    };
  }, []);

  // Stop all audio if site changes
  useEffect(() => {
    stopAllAudio();
  }, [siteId]);

  const stopAllAudio = async () => {
    if (narrationSoundRef.current) {
      await narrationSoundRef.current.stopAsync();
      setIsPlayingNarration(false);
    }
    if (journalSoundRef.current) {
      await journalSoundRef.current.stopAsync();
      setIsPlayingJournal(false);
    }
  };

  const narrationAudioUrl = currentMedia?.audio_url;

  useEffect(() => {
    if (!journal) return;
    setEditTitle(journal.title);
    setEditContent(journal.content);
    setRemainingImages(journal.image_url || []);
  }, [journal]);

  const handleStartEdit = () => {
    if (!journal) return;
    setEditTitle(journal.title);
    setEditContent(journal.content);
    setRemainingImages(journal.image_url || []);
    setNewImages([]);
    setNewVideoUri(null);
    setNewAudioUri(null);
    setIsAudioDeleted(false);
    setIsVideoDeleted(false);
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    Keyboard.dismiss();
    setIsEditing(false);
    setEditTitle(journal?.title || "");
    setEditContent(journal?.content || "");
    setNewImages([]);
    setNewVideoUri(null);
    setNewAudioUri(null);
    setIsAudioDeleted(false);
    setIsVideoDeleted(false);
  };

  const handleSaveUpdate = async () => {
    if (!journal) return;
    if (!editTitle.trim() || !editContent.trim()) {
      Toast.show({ type: "error", text1: "Thiếu thông tin", text2: "Tiêu đề và nội dung không được để trống" });
      return;
    }

    setIsSaving(true);
    try {
      const updateData: UpdateJournalRequest = {
        title: editTitle.trim(),
        content: editContent.trim(),
        image_url: remainingImages,
        images: newImages,
        audio: newAudioUri || undefined,
        video: newVideoUri || undefined,
        clear_audio: isAudioDeleted && !newAudioUri,
        clear_video: isVideoDeleted && !newVideoUri,
      };

      const res = await updateJournal(journal.id, updateData);
      if (res.success && res.data) {
        setJournal(res.data);
        setIsEditing(false);
        Toast.show({ type: "success", text1: "Thành công", text2: "Đã cập nhật nhật ký" });
      }
    } catch (error) {
      console.error("Update journal error:", error);
      Toast.show({ type: "error", text1: "Lỗi", text2: "Không thể cập nhật nhật ký" });
    } finally {
      setIsSaving(false);
    }
  };

  const removeImage = (uri: string, isNew: boolean) => {
    if (isNew) {
      setNewImages(prev => prev.filter(i => i !== uri));
    } else {
      setRemainingImages(prev => prev.filter(i => i !== uri));
    }
  };

  const removeVideo = () => {
    setIsVideoDeleted(true);
    setNewVideoUri(null);
  };

  const removeAudio = () => {
    setIsAudioDeleted(true);
    setNewAudioUri(null);
  };

  const toggleNarration = async () => {
    const audioUrl = currentMedia?.audio_url;
    if (!audioUrl) return;

    try {
      // Stop journal audio first
      if (isPlayingJournal) {
        await journalSoundRef.current?.pauseAsync();
        setIsPlayingJournal(false);
      }

      const current = narrationSoundRef.current;
      if (current && isPlayingNarration) {
        await current.pauseAsync();
        setIsPlayingNarration(false);
        return;
      }
      if (current && !isPlayingNarration) {
        await current.playAsync();
        setIsPlayingNarration(true);
        return;
      }

      setNarrationLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded && status.didJustFinish) {
            setIsPlayingNarration(false);
            void narrationSoundRef.current?.stopAsync();
          }
        }
      );
      narrationSoundRef.current = newSound;
      setIsPlayingNarration(true);
    } catch (error) {
      console.error("Narration playback error:", error);
    } finally {
      setNarrationLoading(false);
    }
  };

  const toggleJournalAudio = async () => {
    const audioUrl = newAudioUri || journal?.audio_url;
    if (!audioUrl) return;

    try {
      // Stop narration audio first
      if (isPlayingNarration) {
        await narrationSoundRef.current?.pauseAsync();
        setIsPlayingNarration(false);
      }

      const current = journalSoundRef.current;
      if (current && isPlayingJournal) {
        await current.pauseAsync();
        setIsPlayingJournal(false);
        return;
      }
      if (current && !isPlayingJournal) {
        await current.playAsync();
        setIsPlayingJournal(true);
        return;
      }

      setJournalAudioLoading(true);
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
      });

      const { sound: newSound, status } = await Audio.Sound.createAsync(
        { uri: audioUrl },
        { shouldPlay: true, isLooping: false },
        (status) => {
          if (status.isLoaded) {
            setJournalPosition(status.positionMillis);
            if (status.durationMillis) setJournalDuration(status.durationMillis);
            if (status.didJustFinish) {
              setIsPlayingJournal(false);
              void journalSoundRef.current?.stopAsync();
            }
          }
        }
      );
      if (status.isLoaded && status.durationMillis) {
        setJournalDuration(status.durationMillis);
      }
      journalSoundRef.current = newSound;
      setIsPlayingJournal(true);
    } catch (error) {
      console.error("Journal audio playback error:", error);
    } finally {
      setJournalAudioLoading(false);
    }
  };

  // Pulse the book button when there's a journal
  useEffect(() => {
    if (!journal) return;
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.08, duration: 900, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 900, useNativeDriver: true }),
      ])
    );
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnim, { toValue: 0.9, duration: 1400, useNativeDriver: true }),
        Animated.timing(glowAnim, { toValue: 0.4, duration: 1400, useNativeDriver: true }),
      ])
    );
    pulse.start();
    glow.start();
}, [journal]);

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillShow" : "keyboardDidShow",
      (e) => {
        setIsKeyboardVisible(true);
        Animated.timing(keyboardShift, {
          toValue: -e.endCoordinates.height + (Platform.OS === "android" ? 0 : 0),
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    const hideSub = Keyboard.addListener(
      Platform.OS === "ios" ? "keyboardWillHide" : "keyboardDidHide",
      () => {
        setIsKeyboardVisible(false);
        Animated.timing(keyboardShift, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }).start();
      }
    );
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [keyboardShift]);

  const handlePickAudio = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "audio/*",
        copyToCacheDirectory: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const uri = result.assets[0].uri;
        setNewAudioUri(uri);
        setIsAudioDeleted(false);
        // Reset player for new audio
        if (journalSoundRef.current) {
          await journalSoundRef.current.unloadAsync();
          journalSoundRef.current = null;
        }
        setIsPlayingJournal(false);
        setJournalDuration(0);
        setJournalPosition(0);
      }
    } catch (error) {
      console.error("Error picking audio:", error);
      Toast.show({ type: "error", text1: "Lỗi", text2: "Không thể chọn tệp âm thanh" });
    }
  };

  // Audio Recording states
  const [isRecording, setIsRecording] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingInterval = useRef<NodeJS.Timeout | null>(null);

  const startRecording = async () => {
    try {
      const { status } = await Audio.requestPermissionsAsync();
      if (status !== 'granted') {
        Toast.show({ type: "error", text1: "Quyền truy cập", text2: "Cần quyền Micro để ghi âm" });
        return;
      }

      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });

      const { recording: newRecording } = await Audio.Recording.createAsync(
        Audio.RecordingOptionsPresets.HIGH_QUALITY
      );
      setRecording(newRecording);
      setIsRecording(true);
      setRecordingDuration(0);
      
      recordingInterval.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);

    } catch (err) {
      console.error('Failed to start recording', err);
      Toast.show({ type: "error", text1: "Lỗi", text2: "Không thể bắt đầu ghi âm" });
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    try {
      setIsRecording(false);
      if (recordingInterval.current) clearInterval(recordingInterval.current);
      
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (uri) {
        setNewAudioUri(uri);
        setIsAudioDeleted(false);
        // Reset player for new recording
        if (journalSoundRef.current) {
          await journalSoundRef.current.unloadAsync();
          journalSoundRef.current = null;
        }
        setIsPlayingJournal(false);
        setJournalDuration(0);
        setJournalPosition(0);
      }
      setRecording(null);
    } catch (err) {
      console.error('Failed to stop recording', err);
    }
  };

  // Panel slide
  useEffect(() => {
    Animated.timing(panelAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 450,
      useNativeDriver: true,
    }).start();
  }, [isExpanded, panelAnim]);

  // Fetch journal
  useEffect(() => {
    if (!siteId) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const res = await getMyJournals({ siteId, limit: 20, page: 1 });
        const entries: JournalEntry[] = res?.data?.journals ?? [];
        if (cancelled || entries.length === 0) { setIsLoading(false); return; }
        const todayEntry = entries.find((e) => isToday(e.created_at));
        const chosen = todayEntry ?? entries[0];
        if (!cancelled) setJournal(chosen);
      } catch { /* silent */ } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [siteId]);

  if (isLoading || !journal) return null;

  const panelTranslateY = panelAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [SCREEN_H, -10], // Phù hợp với chế độ card nổi
  });

  const displayDate = fmtDateVI(journal.created_at);
  const galleryItems: MediaItem[] = [
    ...(journal.image_url || []).map(uri => ({ type: 'image' as const, uri })),
    ...(journal.video_url ? [{ type: 'video' as const, uri: journal.video_url }] : []),
  ];

  const hasNarrationAudio = !!currentMedia?.audio_url;

  return (
    <View style={styles.root} pointerEvents="box-none">
        <Animated.View
          style={[
            styles.panel,
            {
              transform: [
                { translateY: panelTranslateY },
                { translateY: keyboardShift },
              ],
              paddingBottom: isKeyboardVisible ? 2 : (bottomInset + 12),
            },
          ]}
          pointerEvents={isExpanded ? "box-none" : "none"}
        >
          {/* Panel header */}
          <View style={styles.panelHeader}>
            <View style={styles.panelHeaderLeft}>
              <MaterialCommunityIcons name="book-open-page-variant" size={18} color="#8B6914" />
              <View style={{ flex: 1 }}>
                <Text style={styles.panelHeaderTitle}>NHẬT KÝ TÂM LINH</Text>
                <Text style={styles.panelSiteName} numberOfLines={1}>{siteName}</Text>
              </View>
            </View>
            <View style={styles.panelHeaderRight}>
              {hasNarrationAudio && (
                <TouchableOpacity
                  style={[styles.audioIconBtn, isPlayingNarration && styles.audioIconBtnActive]}
                  onPress={toggleNarration}
                  activeOpacity={0.7}
                >
                  {narrationLoading ? (
                    <ActivityIndicator size="small" color={COLORS.accent} />
                  ) : (
                    <MaterialIcons
                      name={isPlayingNarration ? "pause" : "record-voice-over"}
                      size={20}
                      color={isPlayingNarration ? "#fff" : COLORS.accent}
                    />
                  )}
                  {isPlayingNarration && <View style={styles.playingWave} />}
                </TouchableOpacity>
              )}

              <TouchableOpacity
                style={styles.closeBtn}
                onPress={() => onToggleExpanded?.(false)}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name="close" size={18} color="#6B5307" />
              </TouchableOpacity>
            </View>
          </View>

          {/* Divider */}
          <View style={styles.divider} />

          {/* Body */}
          <View style={[styles.panelBody, showScript && { marginTop: 0 }]}>
            <ScrollView
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
            >
              {isEditing ? (
                <View style={[styles.editForm, { maxHeight: SCREEN_H * 0.14 }]}>
                  {isRecording && (
                    <View style={styles.recordingOverlay}>
                      <View style={styles.recordingDot} />
                      <Text style={styles.recordingTimer}>{Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}</Text>
                      <TouchableOpacity style={styles.stopRecordingBtn} onPress={stopRecording}>
                        <MaterialIcons name="stop" size={20} color="#FFF" />
                        <Text style={styles.stopRecordingText}>Dừng ghi</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  <TextInput
                    style={styles.editTitleInput}
                    value={editTitle}
                    onChangeText={setEditTitle}
                    placeholder="Nhập tiêu đề..."
                    placeholderTextColor="rgba(26,40,69,0.4)"
                  />
                  <TextInput
                    style={styles.editContentInput}
                    value={editContent}
                    onChangeText={setEditContent}
                    multiline
                    placeholder="Cảm nghĩ của bạn..."
                    placeholderTextColor="rgba(26,40,69,0.4)"
                  />
                </View>
              ) : (
                <>
                  <Text style={styles.journalTitle}>{journal?.title}</Text>
                  <Text style={styles.journalContent}>{journal?.content}</Text>
                </>
              )}

              {/* Journal Audio Player (Waveform Style) */}
              {(newAudioUri || (!isAudioDeleted && journal?.audio_url)) && (
                <View style={[styles.journalAudioCard, { marginTop: 12, marginBottom: 4 }]}>
                  <TouchableOpacity 
                    style={styles.journalPlayBtn} 
                    onPress={toggleJournalAudio}
                    activeOpacity={0.8}
                  >
                    {journalAudioLoading ? (
                      <ActivityIndicator size="small" color="#fff" />
                    ) : (
                      <MaterialIcons 
                        name={isPlayingJournal ? "pause" : "play-arrow"} 
                        size={20} 
                        color="#fff" 
                      />
                    )}
                  </TouchableOpacity>

                  {/* Simplified Waveform Visualization */}
                  <View style={styles.waveformContainer}>
                    {[0.4, 0.7, 0.5, 0.9, 0.6, 0.8, 0.4, 0.7, 0.5, 0.4, 0.6, 0.8, 0.5, 0.9, 0.6, 0.4, 0.7, 0.5, 0.4, 0.6, 0.8, 0.4, 0.5, 0.7, 0.6].map((h, i) => {
                      // Highlight bars based on current position
                      const progress = journalDuration > 0 ? (journalPosition / journalDuration) * 25 : 0;
                      const isActive = i < progress;
                      return (
                        <View 
                          key={i} 
                          style={[
                            styles.waveBar, 
                            { height: 16 * h },
                            isActive && { backgroundColor: COLORS.accent }
                          ]} 
                        />
                      );
                    })}
                  </View>

                  <Text style={styles.audioDurationText}>
                    {formatDuration(isPlayingJournal ? journalPosition : journalDuration)}
                  </Text>

                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.audioDeleteBtn}
                      onPress={removeAudio}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              )}

              {isEditing && !(newAudioUri || (!isAudioDeleted && journal?.audio_url)) && (
                <TouchableOpacity 
                  style={styles.addAudioBtn}
                  onPress={() => setAudioPickerVisible(true)}
                >
                  <MaterialIcons name="mic" size={16} color={DARK_GOLD} />
                  <Text style={styles.addAudioText}>Thêm ghi âm</Text>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>

          {/* Media Gallery */}
          <View style={styles.galleryWrapper}>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.galleryContent}
            >
              {isEditing && (
                <TouchableOpacity 
                  style={styles.addMediaBtn}
                  onPress={() => setMediaPickerVisible(true)}
                >
                  <Ionicons name="add" size={24} color={DARK_GOLD} />
                </TouchableOpacity>
              )}

              {/* Existing Images */}
              {remainingImages.map((uri, idx) => (
                <View key={`exist-${idx}`} style={styles.galleryItem}>
                  <TouchableOpacity onPress={() => setPreviewMedia({ type: 'image', uri })}>
                    <Image source={{ uri }} style={styles.galleryImage} />
                  </TouchableOpacity>
                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.deleteBadge}
                      onPress={() => removeImage(uri, false)}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              ))}

              {/* New Images */}
              {newImages.map((uri, idx) => (
                <View key={`new-${idx}`} style={[styles.galleryItem, styles.newMediaItem]}>
                  <TouchableOpacity onPress={() => setPreviewMedia({ type: 'image', uri })}>
                    <Image source={{ uri }} style={styles.galleryImage} />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={styles.deleteBadge}
                    onPress={() => removeImage(uri, true)}
                  >
                    <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                  </TouchableOpacity>
                </View>
              ))}

              {/* Video (Existing or New) */}
              {(newVideoUri || (!isVideoDeleted && journal?.video_url)) && (
                <View style={styles.galleryItem}>
                  <TouchableOpacity onPress={() => setPreviewMedia({ type: 'video', uri: newVideoUri || journal?.video_url! })}>
                    <Image source={{ uri: newVideoUri || journal?.video_url! }} style={styles.galleryImage} />
                    <View style={styles.videoOverlay}>
                      <Ionicons name="play-circle" size={24} color="#FFF" />
                    </View>
                  </TouchableOpacity>
                  {isEditing && (
                    <TouchableOpacity 
                      style={styles.deleteBadge}
                      onPress={removeVideo}
                    >
                      <Ionicons name="close-circle" size={18} color={COLORS.danger} />
                    </TouchableOpacity>
                  )}
                </View>
              )}
            </ScrollView>
          </View>


        {/* Action Buttons */}
        {isEditing ? (
          <View style={styles.editActions}>
            <TouchableOpacity
              style={[styles.actionBtn, styles.cancelBtn]}
              onPress={handleCancelEdit}
              disabled={isSaving}
            >
              <Text style={styles.cancelBtnText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.actionBtn, styles.saveBtn]}
              onPress={handleSaveUpdate}
              disabled={isSaving}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="done" size={16} color="#fff" />
                  <Text style={styles.saveBtnText}>Lưu thay đổi</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity
            style={styles.readMoreBtn}
            activeOpacity={0.85}
            onPress={handleStartEdit}
          >
            <MaterialCommunityIcons name="pencil" size={16} color="#1A2845" />
            <Text style={styles.readMoreText}>Chỉnh sửa bài viết</Text>
          </TouchableOpacity>
        )}
        </Animated.View>

      {/* ── Media Picker Modals ── */}
      <MediaPickerModal
        visible={mediaPickerVisible}
        onClose={() => setMediaPickerVisible(false)}
        onMediaPicked={(res) => {
          if (!res.canceled && res.assets && res.assets[0].uri) {
            const asset = res.assets[0];
            if (asset.type === 'video') {
              setNewVideoUri(asset.uri);
              setIsVideoDeleted(false);
            } else {
              setNewImages(prev => [...prev, asset.uri]);
            }
          }
        }}
        mediaTypes={["images", "videos"]}
        allowsMultipleSelection={true}
      />

      <AudioPickerModal
        visible={audioPickerVisible}
        onClose={() => setAudioPickerVisible(false)}
        onRecordNow={startRecording}
        onUploadFile={handlePickAudio}
      />

      {/* ── Media Preview Lightbox Modal ── */}
      <Modal
        visible={!!previewMedia}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPreviewMedia(null)}
      >
        <View style={styles.modalOverlay}>
          <TouchableOpacity 
            style={styles.modalCloseArea} 
            activeOpacity={1} 
            onPress={() => setPreviewMedia(null)} 
          />
          
          <View style={styles.modalContent}>
            {previewMedia?.type === 'image' && previewMedia?.uri ? (
              <Image 
                source={{ uri: previewMedia.uri }} 
                style={styles.modalMedia} 
                resizeMode="contain" 
              />
            ) : previewMedia?.type === 'video' && previewMedia?.uri ? (
              <Video
                source={{ uri: previewMedia.uri }}
                style={styles.modalMedia}
                useNativeControls
                resizeMode={ResizeMode.CONTAIN}
                shouldPlay
              />
            ) : null}

            {/* Close button inside modal */}
            <TouchableOpacity 
              style={styles.modalCloseFab} 
              onPress={() => setPreviewMedia(null)}
            >
              <Ionicons name="close" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

// ─── Styles ──────────────────────────────────────────────────────────────────

const GOLD = "#D4AF37";
const DARK_GOLD = "#8B6914";
const PARCHMENT = "#F5EDD6";
const PARCHMENT_BORDER = "#D4B896";

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 20,
  },
  keyboardAvoidingView: {
    flex: 1,
    justifyContent: "flex-end",
  },
  keyboardView: {
    flex: 1,
    justifyContent: "flex-end",
  },

  // ── Panel ──
  panel: {
    position: "absolute",
    bottom: 0,
    width: "94%",
    alignSelf: "center",
    backgroundColor: PARCHMENT,
    borderRadius: 20,
    borderWidth: 1.2,
    borderColor: PARCHMENT_BORDER,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 8,
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 10,
  },
  panelHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
  },
  panelHeaderTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#1A2845",
    letterSpacing: 0.8,
  },
  panelSiteName: {
    fontSize: 11,
    color: DARK_GOLD,
    fontWeight: "600",
    marginTop: 1,
  },
  panelHeaderRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  audioIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(139,105,20,0.1)",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  audioIconBtnActive: {
    backgroundColor: COLORS.accent,
  },
  playingWave: {
    position: "absolute",
    bottom: 4,
    width: 12,
    height: 2,
    backgroundColor: "#fff",
    borderRadius: 1,
  },
  closeBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: "rgba(139,105,20,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },

  divider: {
    height: 1,
    backgroundColor: PARCHMENT_BORDER,
    marginHorizontal: 16,
    opacity: 0.5,
  },

  panelBody: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    minHeight: 40,
    maxHeight: SCREEN_H * 0.18, 
  },

  journalTitle: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2845",
    marginBottom: 6,
    lineHeight: 18,
  },
  journalContent: {
    fontSize: 12,
    color: "#3D2B0A",
    lineHeight: 18,
    fontStyle: "italic",
  },

  // Edit Form
  editForm: {
    gap: 8,
    marginBottom: 8,
  },
  editTitleInput: {
    fontSize: 13,
    fontWeight: "700",
    color: "#1A2845",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(139, 105, 20, 0.2)",
    paddingVertical: 4,
  },
  editContentInput: {
    fontSize: 12,
    color: "#3D2B0A",
    lineHeight: 18,
    fontStyle: "italic",
    minHeight: 60,
    textAlignVertical: "top",
  },

  // Journal Audio Player
  journalAudioCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(139, 105, 20, 0.08)",
    borderRadius: 24,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "rgba(139, 105, 20, 0.15)",
    gap: 12,
  },
  journalPlayBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: DARK_GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
  waveformContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    height: 20,
  },
  audioDeleteBtn: {
    padding: 2,
    marginLeft: 4,
  },
  addAudioBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderWidth: 1,
    borderStyle: "dashed",
    borderColor: DARK_GOLD,
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "rgba(139, 105, 20, 0.05)",
  },
  addAudioText: {
    fontSize: 12,
    fontWeight: "600",
    color: DARK_GOLD,
  },
  waveBar: {
    width: 2,
    backgroundColor: "rgba(139, 105, 20, 0.2)",
    borderRadius: 1,
  },
  audioDurationText: {
    fontSize: 11,
    color: DARK_GOLD,
    fontWeight: "600",
    minWidth: 35,
  },

  // Gallery
  galleryWrapper: {
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  galleryContent: {
    gap: 8,
  },
  galleryItem: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: PARCHMENT_BORDER,
    overflow: "hidden",
    position: "relative",
  },
  newMediaItem: {
    borderColor: GOLD,
    borderWidth: 1.5,
  },
  addMediaBtn: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: "rgba(139, 105, 20, 0.08)",
    borderWidth: 1.5,
    borderStyle: "dashed",
    borderColor: DARK_GOLD,
    justifyContent: "center",
    alignItems: "center",
  },
  deleteBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#fff",
    borderRadius: 9,
    zIndex: 10,
    ...SHADOWS.subtle,
  },
  galleryImage: {
    width: "100%",
    height: "100%",
  },
  videoOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.25)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Read more button
  readMoreBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginHorizontal: 16,
    marginBottom: 6,
    marginTop: 2,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: GOLD,
    shadowColor: GOLD,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
  },
  readMoreText: {
    fontSize: 14,
    fontWeight: "800",
    color: "#1A2845",
    letterSpacing: 0.4,
  },

  // Edit Actions
  editActions: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 12,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
  cancelBtn: {
    backgroundColor: "rgba(0,0,0,0.05)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
  },
  saveBtn: {
    backgroundColor: GOLD,
  },
  cancelBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  saveBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A2845",
  },

  // Lightbox Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.92)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalCloseArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    width: "95%",
    height: "80%",
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  modalMedia: {
    width: "100%",
    height: "100%",
    borderRadius: 12,
  },
  modalCloseFab: {
    position: "absolute",
    top: -40,
    right: 0,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(255,255,255,0.15)",
    justifyContent: "center",
    alignItems: "center",
  },

  // Recording UI
  recordingOverlay: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(220, 76, 76, 0.1)",
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
    gap: 10,
  },
  recordingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
  },
  recordingTimer: {
    fontSize: 14,
    fontWeight: "bold",
    color: COLORS.danger,
    minWidth: 40,
  },
  stopRecordingBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.danger,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
    gap: 4,
  },
  stopRecordingText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "bold",
  },
});

export default SiteModelJournalOverlay;
