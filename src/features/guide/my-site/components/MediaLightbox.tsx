/**
 * Phóng to ảnh / video — chỉ dùng RNGH + Reanimated (không thêm thư viện).
 * - Ảnh: pinch + kéo khi đã zoom, nút đóng, chạm nền đóng.
 * - Video (file): fullscreen trong Modal, nút đóng (không dùng fullscreen native — chỉ nút header / đóng).
 */
import { MaterialIcons } from "@expo/vector-icons";
import { useVideoPlayer, VideoView } from "expo-video";
import React, { useCallback, useEffect, useMemo } from "react";
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import Animated, {
  clamp,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getBounded16by9Size } from "../utils/videoFullscreenLayout";

const { width: SW, height: SH } = Dimensions.get("window");

type Props = {
  visible: boolean;
  onClose: () => void;
  /** URL ảnh (jpg/png/webp…) hoặc thumbnail YouTube */
  imageUri?: string;
  /** URL video file — khi set thì hiện player fullscreen, không dùng imageUri */
  videoUrl?: string;
};

function clampScale(v: number) {
  "worklet";
  return clamp(v, 1, 4);
}

export const MediaLightbox: React.FC<Props> = ({
  visible,
  onClose,
  imageUri,
  videoUrl,
}) => {
  const insets = useSafeAreaInsets();
  const isVideo = Boolean(videoUrl);
  const uri = imageUri || "";

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const pinchStartScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedTranslateX = useSharedValue(0);
  const savedTranslateY = useSharedValue(0);
  const panStartX = useSharedValue(0);
  const panStartY = useSharedValue(0);

  const resetTransforms = useCallback(() => {
    scale.value = 1;
    savedScale.value = 1;
    pinchStartScale.value = 1;
    translateX.value = 0;
    translateY.value = 0;
    savedTranslateX.value = 0;
    savedTranslateY.value = 0;
  }, [scale, savedScale, pinchStartScale, translateX, translateY, savedTranslateX, savedTranslateY]);

  useEffect(() => {
    if (!visible) {
      resetTransforms();
    }
  }, [visible, resetTransforms]);

  const pinchGesture = Gesture.Pinch()
    .onBegin(() => {
      pinchStartScale.value = scale.value;
    })
    .onUpdate((e) => {
      const next = pinchStartScale.value * e.scale;
      scale.value = clampScale(next);
    })
    .onEnd(() => {
      savedScale.value = scale.value;
      if (scale.value < 1.02) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      }
    });

  const panGesture = Gesture.Pan()
    .onBegin(() => {
      panStartX.value = translateX.value;
      panStartY.value = translateY.value;
    })
    .onUpdate((e) => {
      if (scale.value > 1.02) {
        translateX.value = panStartX.value + e.translationX;
        translateY.value = panStartY.value + e.translationY;
      }
    })
    .onEnd(() => {
      savedTranslateX.value = translateX.value;
      savedTranslateY.value = translateY.value;
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .maxDuration(250)
    .onEnd(() => {
      if (scale.value > 1.1) {
        scale.value = withTiming(1);
        savedScale.value = 1;
        translateX.value = withTiming(0);
        translateY.value = withTiming(0);
        savedTranslateX.value = 0;
        savedTranslateY.value = 0;
      } else {
        scale.value = withTiming(2);
        savedScale.value = 2;
      }
    });

  const zoomGestures = Gesture.Simultaneous(
    pinchGesture,
    panGesture,
    doubleTap,
  );

  const imageAnimatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
  }));

  if (isVideo && videoUrl) {
    return (
      <Modal
        visible={visible}
        transparent
        animationType="fade"
        onRequestClose={onClose}
        presentationStyle="fullScreen"
        supportedOrientations={[
          "portrait",
          "landscape-left",
          "landscape-right",
        ]}
      >
        <VideoLightboxInner url={videoUrl} onClose={onClose} insetsTop={insets.top} />
      </Modal>
    );
  }

  if (!uri) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.root}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} accessibilityLabel="Đóng" />
        <GestureDetector gesture={zoomGestures}>
          <Animated.View style={[styles.imageBox, imageAnimatedStyle]} pointerEvents="box-none">
            <Image
              source={{ uri }}
              style={styles.fullImage}
              resizeMode="contain"
            />
          </Animated.View>
        </GestureDetector>
        <Pressable
          style={[styles.closeBtn, { top: insets.top + 8 }]}
          onPress={onClose}
          hitSlop={12}
        >
          <MaterialIcons name="close" size={28} color="#fff" />
        </Pressable>
      </View>
    </Modal>
  );
};

function VideoLightboxInner({
  url,
  onClose,
  insetsTop,
}: {
  url: string;
  onClose: () => void;
  insetsTop: number;
}) {
  const { width: W, height: H } = useWindowDimensions();
  const playerSize = useMemo(
    () => getBounded16by9Size(W, H, 0.88),
    [W, H],
  );

  const player = useVideoPlayer(url, (p) => {
    p.loop = true;
  });

  return (
    <View style={styles.videoRoot}>
      <View style={styles.videoCenterShell}>
        <VideoView
          style={{
            width: playerSize.width,
            height: playerSize.height,
          }}
          player={player}
          fullscreenOptions={{ enable: false }}
          allowsPictureInPicture
          contentFit="contain"
        />
      </View>
      <Pressable
        style={[styles.closeBtn, { top: insetsTop + 8 }]}
        onPress={onClose}
        hitSlop={12}
      >
        <MaterialIcons name="close" size={28} color="#fff" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  videoRoot: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  videoCenterShell: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  imageBox: {
    width: SW,
    height: SH * 0.92,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: SW,
    height: SH * 0.85,
  },
  closeBtn: {
    position: "absolute",
    right: 16,
    zIndex: 10,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.3)",
  },
});
