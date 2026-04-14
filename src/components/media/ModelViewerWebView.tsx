/**
 * GLB/GLTF viewer via @google/model-viewer trong WebView (xoay, chụm zoom).
 * - baseUrl HTTPS: bắt buộc để WKWebView/WebView load WebGL + fetch model ổn định.
 * - touch-action: pan-y trên model-viewer làm mất xoay — dùng CSS none.
 */
import { MaterialIcons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from "react-native";
import { WebView } from "react-native-webview";
import { COLORS } from "../../constants/theme.constants";

const MODEL_VIEWER_MODULE =
  "https://ajax.googleapis.com/ajax/libs/model-viewer/3.4.0/model-viewer.min.js";

/** Origin hợp lệ cho document (HTML string) — tránh WebView trống / WebGL lỗi trên iOS. */
const WEBVIEW_BASE_URL = "https://modelviewer.dev";

function buildModelViewerHtml(modelUrl: string): string {
  const safeSrc = JSON.stringify(modelUrl?.trim() || "");
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, minimum-scale=1.0, maximum-scale=5.0, viewport-fit=cover" />
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #12100c;
    }
    model-viewer {
      width: 100%;
      height: 100%;
      display: block;
      --poster-color: transparent;
      touch-action: none;
    }
  </style>
  <script type="module" src="${MODEL_VIEWER_MODULE}"></script>
</head>
<body>
  <model-viewer
    id="mv"
    src=${safeSrc}
    alt="3D"
    camera-controls
    interaction-prompt="auto"
    shadow-intensity="1"
    exposure="1"
    environment-image="neutral"
  ></model-viewer>
  <script type="module">
    (async () => {
      await customElements.whenDefined("model-viewer");
      const mv = document.getElementById("mv");
      if (!mv || !window.ReactNativeWebView) return;
      const send = (payload) => {
        try {
          window.ReactNativeWebView.postMessage(JSON.stringify(payload));
        } catch (e) {}
      };
      mv.addEventListener("load", () => send({ type: "model-viewer-load" }));
      mv.addEventListener("error", () => send({ type: "model-viewer-error" }));
    })();
  </script>
</body>
</html>`;
}

export interface ModelViewerWebViewProps {
  /** HTTPS URL tới file .glb / .gltf */
  modelUrl: string;
  style?: StyleProp<ViewStyle>;
  /** Gọi khi model 3D load xong (không phải chỉ HTML) */
  onLoadEnd?: () => void;
  /** Modal fullscreen: ép flex full để WebView có kích thước đủ lớn */
  fullscreen?: boolean;
}

export const ModelViewerWebView: React.FC<ModelViewerWebViewProps> = ({
  modelUrl,
  style,
  onLoadEnd,
  fullscreen = false,
}) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const loadTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const html = useMemo(() => buildModelViewerHtml(modelUrl), [modelUrl]);

  const clearLoadTimeout = useCallback(() => {
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearLoadTimeout();
  }, [clearLoadTimeout]);

  const handleError = useCallback(() => {
    clearLoadTimeout();
    setLoading(false);
    setError(true);
  }, [clearLoadTimeout]);

  const handleWebViewMessage = useCallback(
    (event: { nativeEvent: { data: string } }) => {
      try {
        const data = JSON.parse(event.nativeEvent.data) as {
          type?: string;
        };
        if (data.type === "model-viewer-load") {
          clearLoadTimeout();
          setLoading(false);
          setError(false);
          onLoadEnd?.();
        }
        if (data.type === "model-viewer-error") {
          handleError();
        }
      } catch {
        /* ignore */
      }
    },
    [clearLoadTimeout, handleError, onLoadEnd],
  );

  const handleWebViewLoadEnd = useCallback(() => {
    /** Nếu không nhận được sự kiện từ model-viewer (tải lỗi treo) */
    clearLoadTimeout();
    loadTimeoutRef.current = setTimeout(() => {
      setLoading((still) => {
        if (still) setError(true);
        return false;
      });
    }, 45000);
  }, [clearLoadTimeout]);

  const trimmed = modelUrl?.trim() ?? "";
  if (!trimmed.startsWith("http")) {
    return (
      <View style={[styles.fallback, style]}>
        <MaterialIcons name="error-outline" size={40} color={COLORS.textTertiary} />
        <Text style={styles.fallbackText}>URL mô hình không hợp lệ (cần https)</Text>
      </View>
    );
  }

  return (
    <View style={[styles.wrap, fullscreen && styles.wrapFullscreen, style]}>
      {loading && !error && (
        <View style={styles.loadingOverlay} pointerEvents="none">
          <View style={styles.skeletonStage}>
            <View style={styles.skeletonCube} />
            <View style={styles.skeletonShine} />
          </View>
          <View style={styles.skeletonBars}>
            <View style={[styles.skeletonBar, { width: "72%" }]} />
            <View style={[styles.skeletonBar, { width: "48%" }]} />
          </View>
          <ActivityIndicator size="large" color={COLORS.accent} style={styles.loadingSpinner} />
          <Text style={styles.loadingText}>Đang tải mô hình 3D…</Text>
        </View>
      )}
      {error ? (
        <View style={styles.fallback}>
          <MaterialIcons name="view-in-ar" size={48} color={COLORS.textTertiary} />
          <Text style={styles.fallbackText}>Không thể hiển thị mô hình</Text>
          <Text style={styles.fallbackHint}>
            Kiểm tra URL .glb/.gltf (HTTPS, CORS). Xoay: một ngón kéo; phóng to: chụm hai ngón.
          </Text>
        </View>
      ) : (
        <WebView
          originWhitelist={["*"]}
          source={{ html, baseUrl: WEBVIEW_BASE_URL }}
          style={styles.webview}
          onLoadEnd={handleWebViewLoadEnd}
          onMessage={handleWebViewMessage}
          onError={handleError}
          onHttpError={handleError}
          javaScriptEnabled
          domStorageEnabled
          allowsInlineMediaPlayback
          mediaPlaybackRequiresUserAction={false}
          mixedContentMode="always"
          setSupportMultipleWindows={false}
          thirdPartyCookiesEnabled
          nestedScrollEnabled
          cacheEnabled
          {...Platform.select({
            android: {
              androidLayerType: "hardware" as const,
            },
            ios: {
              allowsBackForwardNavigationGestures: false,
            },
          })}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    backgroundColor: "#12100c",
    overflow: "hidden",
    minHeight: 1,
    minWidth: 1,
    flex: 1,
  },
  wrapFullscreen: {
    flex: 1,
    width: "100%",
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
    minHeight: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(18,16,12,0.92)",
    zIndex: 2,
    paddingHorizontal: 32,
  },
  skeletonStage: {
    width: 120,
    height: 120,
    marginBottom: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  skeletonCube: {
    width: 88,
    height: 88,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  skeletonShine: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  skeletonBars: {
    width: "100%",
    maxWidth: 220,
    gap: 8,
    marginBottom: 16,
  },
  skeletonBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignSelf: "center",
  },
  loadingSpinner: {
    marginTop: 4,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: "rgba(255,255,255,0.75)",
    textAlign: "center",
  },
  fallback: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#12100c",
  },
  fallbackText: {
    marginTop: 12,
    fontSize: 15,
    color: COLORS.textTertiary,
    textAlign: "center",
  },
  fallbackHint: {
    marginTop: 8,
    fontSize: 12,
    color: COLORS.textLight,
    textAlign: "center",
  },
});
