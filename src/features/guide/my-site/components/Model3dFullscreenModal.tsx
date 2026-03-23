/**
 * Phóng to mô hình 3D toàn màn hình (tương tự YoutubeFullscreenModal).
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useEffect } from "react";
import {
  Modal,
  Platform,
  Pressable,
  StatusBar,
  StyleSheet,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ModelViewerWebView } from "./ModelViewerWebView";

export interface Model3dFullscreenModalProps {
  visible: boolean;
  modelUrl: string;
  /** Đổi khi mở lại để reset WebView */
  instanceKey: number;
  onClose: () => void;
}

export const Model3dFullscreenModal: React.FC<Model3dFullscreenModalProps> = ({
  visible,
  modelUrl,
  instanceKey,
  onClose,
}) => {
  const insets = useSafeAreaInsets();
  const { width: W, height: H } = useWindowDimensions();

  useEffect(() => {
    if (!visible) return;
    StatusBar.setHidden(true, "fade");
    return () => {
      StatusBar.setHidden(false, "fade");
    };
  }, [visible]);

  return (
    <Modal
      visible={visible}
      animationType="fade"
      presentationStyle="fullScreen"
      statusBarTranslucent={Platform.OS === "android"}
      onRequestClose={onClose}
      supportedOrientations={[
        "portrait",
        "landscape-left",
        "landscape-right",
      ]}
    >
      <View style={[styles.root, { width: W, height: H }]}>
        <Pressable
          style={[styles.closeWrap, { top: Math.max(insets.top, 8) + 4, right: 12 }]}
          onPress={onClose}
          hitSlop={12}
          accessibilityRole="button"
          accessibilityLabel="Đóng xem 3D"
        >
          <View style={styles.closeBtn}>
            <MaterialIcons name="close" size={28} color="#fff" />
          </View>
        </Pressable>

        {visible ? (
          <ModelViewerWebView
            key={`3d-fs-${instanceKey}-${modelUrl}`}
            modelUrl={modelUrl}
            style={styles.viewer}
            fullscreen
          />
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    backgroundColor: "#12100c",
  },
  viewer: {
    flex: 1,
    width: "100%",
    height: "100%",
  },
  closeWrap: {
    position: "absolute",
    zIndex: 20,
  },
  closeBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(255,255,255,0.35)",
  },
});
