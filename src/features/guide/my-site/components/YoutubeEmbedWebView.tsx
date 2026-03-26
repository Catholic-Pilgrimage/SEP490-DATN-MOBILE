/**
 * Phát YouTube trong app (Expo / React Native) qua `react-native-youtube-iframe`.
 * forwardRef → YoutubeIframeRef (getCurrentTime, seekTo, …) cho đồng bộ fullscreen.
 */
import { MaterialIcons } from "@expo/vector-icons";
import * as Linking from "expo-linking";
import React, { forwardRef, useCallback, useMemo, useState } from "react";
import {
  LayoutChangeEvent,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import YoutubePlayer, { YoutubeIframeRef } from "react-native-youtube-iframe";
import { GUIDE_COLORS } from "../../../../constants/guide.constants";
import { extractYoutubeVideoId } from "../../../../utils/mediaUtils";

export interface YoutubeEmbedWebViewProps {
  videoUrl: string;
  style?: StyleProp<ViewStyle>;
  play?: boolean;
  preventNativeFullscreen?: boolean;
  onChangeState?: (state: string) => void;
  /** Thời điểm bắt đầu (giây) — áp khi load player (resume / fullscreen tiếp tục) */
  startSeconds?: number;
}

export const YoutubeEmbedWebView = forwardRef<
  YoutubeIframeRef,
  YoutubeEmbedWebViewProps
>(function YoutubeEmbedWebView(
  {
    videoUrl,
    style,
    /** false = user điều khiển trong iframe; tránh sync play từ state gây tự fullscreen trên Android. */
    play = false,
    preventNativeFullscreen = false,
    onChangeState,
    startSeconds = 0,
  },
  ref,
) {
  const videoId = extractYoutubeVideoId(videoUrl);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [error, setError] = useState<string | null>(null);

  const start = Math.max(0, Math.floor(startSeconds));

  const initialPlayerParams = useMemo(
    () => ({
      controls: true,
      preventFullScreen: preventNativeFullscreen,
      start,
    }),
    [preventNativeFullscreen, start],
  );

  const onLayout = useCallback((e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setBox((prev) =>
        prev.w === width && prev.h === height ? prev : { w: width, h: height },
      );
    }
  }, []);

  const openExternal = useCallback(() => {
    if (videoUrl) Linking.openURL(videoUrl).catch(() => {});
  }, [videoUrl]);

  if (!videoId) {
    return (
      <View style={[styles.fallback, style]}>
        <MaterialIcons name="smart-display" size={40} color={GUIDE_COLORS.gray400} />
        <Text style={styles.fallbackText}>Link YouTube không hợp lệ</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, style]} onLayout={onLayout}>
      {error ? (
        <View style={styles.fallbackInner}>
          <MaterialIcons name="error-outline" size={44} color={GUIDE_COLORS.gray400} />
          <Text style={styles.fallbackText}>{error}</Text>
          <TouchableOpacity style={styles.openBtn} onPress={openExternal} activeOpacity={0.85}>
            <MaterialIcons name="open-in-new" size={20} color={GUIDE_COLORS.surface} />
            <Text style={styles.openBtnText}>Mở trên YouTube</Text>
          </TouchableOpacity>
        </View>
      ) : box.w > 0 && box.h > 0 ? (
        <YoutubePlayer
          ref={ref}
          height={Math.max(box.h, 1)}
          width={Math.max(box.w, 1)}
          videoId={videoId}
          play={play}
          mute={false}
          volume={100}
          forceAndroidAutoplay={play}
          initialPlayerParams={initialPlayerParams}
          webViewProps={{
            allowsInlineMediaPlayback: true,
            mediaPlaybackRequiresUserAction: !play,
            androidLayerType: "hardware",
            ...Platform.select({
              ios: {
                allowsFullscreenVideo: !preventNativeFullscreen,
              },
            }),
          }}
          webViewStyle={styles.webViewInner}
          onChangeState={onChangeState}
          onError={(err: string) => {
            setError(
              err === "embed_not_allowed"
                ? "Video không cho phép nhúng — mở trên YouTube."
                : "Không phát được video.",
            );
          }}
        />
      ) : (
        <View style={styles.loadingBox}>
          <Text style={styles.loadingText}>Đang tải trình phát…</Text>
        </View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#000",
    overflow: "hidden",
    minHeight: 1,
    minWidth: 1,
  },
  webViewInner: {
    backgroundColor: "#000",
  },
  loadingBox: {
    flex: 1,
    minHeight: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#000",
  },
  loadingText: {
    fontSize: 13,
    color: "rgba(255,255,255,0.6)",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "#111",
    minHeight: 200,
  },
  fallbackInner: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  fallbackText: {
    marginTop: 10,
    fontSize: 14,
    color: GUIDE_COLORS.gray400,
    textAlign: "center",
  },
  openBtn: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: GUIDE_COLORS.primary,
    borderRadius: 12,
  },
  openBtnText: {
    marginLeft: 8,
    color: GUIDE_COLORS.surface,
    fontSize: 15,
    fontWeight: "600",
  },
});
