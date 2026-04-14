/**
 * Panel thuyết minh âm thanh cho `model_3d` dành cho Khách hành hương.
 * Chỉ bao gồm chức năng nghe (Play/Pause) và xem nội dung thuyết minh.
 */
import { MaterialIcons } from "@expo/vector-icons";
import { Audio } from "expo-av";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { COLORS, SPACING, BORDER_RADIUS } from "../../constants/theme.constants";
import { SiteMedia } from "../../types/pilgrim";

export interface SiteModelNarrativePanelProps {
  media: SiteMedia;
  bottomInset: number;
}

export const SiteModelNarrativePanel: React.FC<SiteModelNarrativePanelProps> = ({
  media,
  bottomInset,
}) => {
  const { t } = useTranslation();
  const soundRef = useRef<Audio.Sound | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);

  /** Unmount: luôn dừng & unload âm thanh */
  useEffect(() => {
    return () => {
      void soundRef.current?.unloadAsync();
      soundRef.current = null;
    };
  }, []);

  useEffect(() => {
    void soundRef.current?.unloadAsync();
    soundRef.current = null;
    setIsPlaying(false);
  }, [media.id]);

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

      setLoading(true);
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
            void soundRef.current?.setPositionAsync(0);
          }
        },
      );
      soundRef.current = newSound;
      setIsPlaying(true);
    } catch (error) {
      console.error("Audio playback error:", error);
      Toast.show({
        type: "error",
        text1: t("siteModels3d.narrativePlayError", { defaultValue: "Không thể phát âm thanh" }),
      });
    } finally {
      setLoading(false);
    }
  }, [isPlaying, media.audio_url, t]);

  if (!media.audio_url && !media.narration_text) return null;

  return (
    <View
      style={[
        styles.wrap,
        expanded && styles.wrapExpanded,
        { paddingBottom: bottomInset + SPACING.sm },
      ]}
    >
      <View style={styles.header}>
        <Pressable
          style={styles.headerMain}
          onPress={() => setExpanded(!expanded)}
        >
          <MaterialIcons name="record-voice-over" size={22} color={COLORS.accent} />
          <View style={styles.headerText}>
            <Text style={styles.title} numberOfLines={1}>
              {t("siteModels3d.narrativeSectionTitle", { defaultValue: "Thuyết minh" })}
            </Text>
            {!expanded && media.narration_text && (
              <Text style={styles.subtitle} numberOfLines={1}>
                {media.narration_text}
              </Text>
            )}
          </View>
          <MaterialIcons
            name={expanded ? "expand-less" : "expand-more"}
            size={24}
            color="rgba(255,255,255,0.6)"
          />
        </Pressable>

        {media.audio_url && (
          <Pressable
            style={styles.playBtn}
            onPress={togglePlayback}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color={COLORS.accent} size="small" />
            ) : (
              <MaterialIcons
                name={isPlaying ? "pause-circle" : "play-circle-filled"}
                size={42}
                color={COLORS.accent}
              />
            )}
          </Pressable>
        )}
      </View>

      {expanded && media.narration_text && (
        <ScrollView style={styles.contentScroll} showsVerticalScrollIndicator={false}>
          <Text style={styles.scriptText}>{media.narration_text}</Text>
        </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "rgba(26, 40, 69, 0.95)",
    borderTopLeftRadius: BORDER_RADIUS.lg,
    borderTopRightRadius: BORDER_RADIUS.lg,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  wrapExpanded: {
    height: 250,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerMain: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.sm,
  },
  headerText: {
    flex: 1,
    marginLeft: SPACING.sm,
  },
  title: {
    fontSize: 15,
    fontWeight: "700",
    color: "#fff",
  },
  subtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.6)",
    marginTop: 2,
  },
  playBtn: {
    width: 44,
    height: 44,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: SPACING.sm,
  },
  contentScroll: {
    flex: 1,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  scriptText: {
    fontSize: 14,
    lineHeight: 22,
    color: "rgba(255,255,255,0.9)",
    textAlign: "justify",
  },
});
