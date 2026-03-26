/**
 * Fullscreen YouTube: tiếp tục từ startAtSeconds.
 * Xoay ngang: dùng supportedOrientations trên Modal (không cần expo-screen-orientation / rebuild native).
 * Đóng → trả về vị trí & trạng thái phát để resume trên màn detail.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import type { YoutubeIframeRef } from "react-native-youtube-iframe";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBounded16by9Size } from "../utils/videoFullscreenLayout";
import { YoutubeEmbedWebView } from "./YoutubeEmbedWebView";

export type YoutubeFullscreenClosePayload = {
  resumeAt: number;
  resumePlaying: boolean;
};

export interface YoutubeFullscreenModalProps {
  visible: boolean;
  videoUrl: string;
  /** Tăng mỗi lần mở fullscreen — reset player trong modal */
  instanceKey: number;
  /** Bắt đầu từ giây này (khi mở từ player đang chạy) */
  startAtSeconds: number;
  /** true nếu lúc mở fullscreen đang phát */
  autoPlay: boolean;
  onClose: (payload: YoutubeFullscreenClosePayload) => void;
}

export const YoutubeFullscreenModal: React.FC<YoutubeFullscreenModalProps> = ({
  visible,
  videoUrl,
  instanceKey,
  startAtSeconds,
  autoPlay,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();
  const playerRef = useRef<YoutubeIframeRef>(null);
  const [modalPlaying, setModalPlaying] = useState(autoPlay);

  const playerSize = React.useMemo(
    () => getBounded16by9Size(W, H, 0.9),
    [W, H],
  );

  useEffect(() => {
    setModalPlaying(autoPlay);
  }, [instanceKey, autoPlay]);

  useEffect(() => {
    if (!visible) return;
    StatusBar.setHidden(true, "fade");
    return () => {
      StatusBar.setHidden(false, "fade");
    };
  }, [visible]);

  const finishClose = useCallback(async () => {
    let resumeAt = Math.max(0, Math.floor(startAtSeconds));
    try {
      const t = await playerRef.current?.getCurrentTime();
      if (typeof t === "number" && !Number.isNaN(t)) {
        resumeAt = Math.max(0, Math.floor(t));
      }
    } catch {
      /* noop */
    }
    onClose({ resumeAt, resumePlaying: modalPlaying });
  }, [onClose, startAtSeconds, modalPlaying]);

  const handleStateChange = useCallback((state: string) => {
    if (state === "playing") setModalPlaying(true);
    if (state === "paused" || state === "ended") setModalPlaying(false);
  }, []);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={finishClose}
      supportedOrientations={[
        "portrait",
        "landscape-left",
        "landscape-right",
      ]}
    >
      <View style={styles.root}>
        <Pressable
          style={[styles.closeWrap, { top: Math.max(insets.top, 8) + 4, right: 12 }]}
          onPress={finishClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Đóng video"
        >
          <View style={styles.closeBtn}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </View>
        </Pressable>

        <View style={styles.playerShell} pointerEvents="box-none">
          {visible ? (
            <YoutubeEmbedWebView
              ref={playerRef}
              key={`fs-${instanceKey}-${videoUrl}-${startAtSeconds}`}
              videoUrl={videoUrl}
              style={{
                width: playerSize.width,
                height: playerSize.height,
              }}
              play={modalPlaying}
              startSeconds={startAtSeconds}
              preventNativeFullscreen={false}
              onChangeState={handleStateChange}
            />
          ) : null}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  playerShell: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  closeWrap: {
    position: "absolute",
    zIndex: 20,
    elevation: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.25)",
  },
});
