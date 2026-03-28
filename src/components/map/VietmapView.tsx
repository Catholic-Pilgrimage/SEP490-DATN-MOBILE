/**
 * VietmapView Component
 * Native map using @rnmapbox/maps SDK with Vietmap raster tiles
 * Uses RasterSource/RasterLayer for tiles — no dependency on Mapbox CDN
 * Supports tap-to-search via Vietmap Reverse Geocoding API
 */
import Mapbox, {
  Camera,
  LocationPuck,
  MapView,
  PointAnnotation,
  RasterLayer,
  RasterSource,
} from "@rnmapbox/maps";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import {
  ActivityIndicator,
  StyleProp,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTranslation } from "react-i18next";
import { MAPBOX_ACCESS_TOKEN, VIETMAP_CONFIG } from "../../config/map.config";
import {
  COLORS,
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
} from "../../constants/theme.constants";

Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

const EMPTY_STYLE = JSON.stringify({
  version: 8,
  name: "empty",
  glyphs: "https://maps.vietmap.vn/mt/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": COLORS.parchment },
    },
  ],
});

export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
  subtitle?: string;
  icon?: string;
  color?: string;
}

export interface VietmapViewProps {
  initialRegion?: {
    latitude: number;
    longitude: number;
    zoom?: number;
  };
  pins?: MapPin[];
  showUserLocation?: boolean;
  scrollEnabled?: boolean;
  onMapReady?: () => void;
  onMapPress?: (event: { latitude: number; longitude: number }) => void;
  onMarkerPress?: (pin: MapPin) => void;
  style?: StyleProp<ViewStyle>;
  tileUrlTemplate?: string;
  /** Extra bottom offset (px) for the info card to avoid overlapping external overlay buttons */
  cardBottomOffset?: number;
  /** Whether to show info cards (selected pin + reverse-geocode) on the map (default: true) */
  showInfoCards?: boolean;
}

export interface VietmapViewRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  addPin: (pin: MapPin) => void;
  removePin: (pinId: string) => void;
  clearPins: () => void;
  selectPin: (pinId: string) => void;
}

const DEFAULT_CENTER = {
  latitude: 10.762622,
  longitude: 106.660172,
  zoom: 14,
};

const SNAP_THRESHOLD = 0.0003; // ~30m

/** Stable empty default — `pins = []` in params creates a new array every render and breaks `useEffect([pins])`. */
const EMPTY_PINS: MapPin[] = [];

export const VietmapView = forwardRef<VietmapViewRef, VietmapViewProps>(
  (
    {
      initialRegion,
      pins = EMPTY_PINS,
      showUserLocation = false,
      scrollEnabled = true,
      onMapReady,
      onMapPress,
      onMarkerPress,
      style,
      tileUrlTemplate,
      cardBottomOffset = 0,
      showInfoCards = true,
    },
    ref,
  ) => {
    const { t } = useTranslation();
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<Camera>(null);
    const abortRef = useRef<AbortController | null>(null);
    const [localPins, setLocalPins] = React.useState<MapPin[]>(pins);
    const [isLoading, setIsLoading] = React.useState(true);
    const [selectedPin, setSelectedPin] = React.useState<MapPin | null>(null);
    const [tapInfo, setTapInfo] = React.useState<{
      title: string;
      subtitle: string;
      lat: number;
      lng: number;
      icon: string;
    } | null>(null);
    const [tapLoading, setTapLoading] = React.useState(false);
    const loadingTimerRef = React.useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

    React.useEffect(() => {
      setLocalPins(pins);
    }, [pins]);

    React.useEffect(() => {
      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
      return () => {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      };
    }, []);

    React.useEffect(() => {
      return () => {
        abortRef.current?.abort();
      };
    }, []);

    const centerLat = initialRegion?.latitude ?? DEFAULT_CENTER.latitude;
    const centerLng = initialRegion?.longitude ?? DEFAULT_CENTER.longitude;
    const zoomLevel = initialRegion?.zoom ?? DEFAULT_CENTER.zoom;

    const reverseGeocode = useCallback(async (lat: number, lng: number) => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      try {
        setTapLoading(true);
        setTapInfo(null);
        const url = `${VIETMAP_CONFIG.REVERSE_GEOCODING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&lat=${lat}&lng=${lng}`;
        const res = await fetch(url, { signal: controller.signal });
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : data?.value?.[0];
        if (first) {
          const name: string = first.name || first.display || "";
          setTapInfo({
            title: name || t("map.location"),
            subtitle:
              first.address ||
              first.display ||
              `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            icon: "📍",
          });
        } else {
          setTapInfo({
            title: t("map.selectedLocation"),
            subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            icon: "📍",
          });
        }
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        setTapInfo({
          title: t("map.selectedLocation"),
          subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          icon: "📍",
        });
      } finally {
        setTapLoading(false);
      }
    }, [t]);

    const handleMarkerPress = useCallback(
      (pin: MapPin) => {
        setTapInfo(null);
        setSelectedPin((prev) => (prev?.id === pin.id ? null : pin));
        cameraRef.current?.flyTo([pin.longitude, pin.latitude], 400);
        onMarkerPress?.(pin);
      },
      [onMarkerPress],
    );

    const handlePress = useCallback(
      (feature: any) => {
        const coords = feature?.geometry?.coordinates;
        if (!coords) return;
        const lng = coords[0];
        const lat = coords[1];

        const nearbyPin = localPins.find(
          (p) =>
            Math.abs(p.latitude - lat) < SNAP_THRESHOLD &&
            Math.abs(p.longitude - lng) < SNAP_THRESHOLD,
        );
        if (nearbyPin) {
          handleMarkerPress(nearbyPin);
          return;
        }

        setSelectedPin(null);
        onMapPress?.({ latitude: lat, longitude: lng });
        if (showInfoCards) {
          reverseGeocode(lat, lng);
        }
      },
      [localPins, onMapPress, reverseGeocode, handleMarkerPress, showInfoCards],
    );

    const dismissTapInfo = useCallback(() => {
      setTapInfo(null);
    }, []);

    const handleMapLoaded = useCallback(() => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setIsLoading(false);
      onMapReady?.();
    }, [onMapReady]);

    const handleMapFailed = useCallback(() => {
      if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      setIsLoading(false);
    }, []);

    useImperativeHandle(
      ref,
      () => ({
        flyTo: (latitude: number, longitude: number, zoom?: number) => {
          if (!cameraRef.current) return;
          if (zoom !== undefined) {
            cameraRef.current.setCamera({
              centerCoordinate: [longitude, latitude],
              zoomLevel: zoom,
              animationDuration: 800,
            });
          } else {
            cameraRef.current.flyTo([longitude, latitude], 600);
          }
        },
        addPin: (pin: MapPin) => {
          setLocalPins((prev) => {
            const filtered = prev.filter((p) => p.id !== pin.id);
            return [...filtered, pin];
          });
        },
        removePin: (pinId: string) => {
          setLocalPins((prev) => prev.filter((p) => p.id !== pinId));
        },
        clearPins: () => {
          setLocalPins([]);
        },
        selectPin: (pinId: string) => {
          setLocalPins((current) => {
            const pin = current.find((p) => p.id === pinId);
            if (pin) {
              setTapInfo(null);
              setSelectedPin(pin);
            }
            return current;
          });
        },
      }),
      [],
    );

    return (
      <View style={[styles.container, style]}>
        <MapView
          style={styles.map}
          styleJSON={EMPTY_STYLE}
          scrollEnabled={scrollEnabled}
          zoomEnabled={scrollEnabled}
          pitchEnabled={false}
          onDidFinishLoadingMap={handleMapLoaded}
          onDidFailLoadingMap={handleMapFailed}
          onPress={handlePress}
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled
        >
          <RasterSource
            id="vietmap-raster"
            tileUrlTemplates={[tileUrlTemplate || VIETMAP_CONFIG.TILE_URL]}
            tileSize={256}
            minZoomLevel={0}
            maxZoomLevel={20}
          >
            <RasterLayer
              id="vietmap-raster-layer"
              sourceID="vietmap-raster"
              aboveLayerID="background"
              style={{ rasterOpacity: 1 }}
            />
          </RasterSource>

          <Camera
            ref={cameraRef}
            zoomLevel={zoomLevel}
            centerCoordinate={[centerLng, centerLat]}
            animationMode="flyTo"
            animationDuration={0}
          />

          {showUserLocation && (
            <LocationPuck
              puckBearingEnabled
              puckBearing="heading"
              pulsing={{ isEnabled: true, color: COLORS.info, radius: 50 }}
            />
          )}

          {localPins.map((pin) => (
            <PointAnnotation
              key={pin.id}
              id={pin.id}
              coordinate={[pin.longitude, pin.latitude]}
              anchor={{ x: 0.5, y: 0.5 }}
              onSelected={() => handleMarkerPress(pin)}
            >
              <View
                style={[
                  styles.markerContainer,
                  { backgroundColor: pin.color || COLORS.accent },
                  selectedPin?.id === pin.id && styles.markerContainerSelected,
                ]}
              >
                <Text style={styles.markerIcon}>{pin.icon || "📍"}</Text>
              </View>
            </PointAnnotation>
          ))}
        </MapView>

        {showInfoCards && selectedPin && (
          <TouchableOpacity
            style={[styles.pinCard, { bottom: SPACING.md + insets.bottom + cardBottomOffset }]}
            onPress={() => onMarkerPress?.(selectedPin)}
            activeOpacity={0.9}
          >
            <View style={styles.pinCardContent}>
              <View
                style={[
                  styles.pinCardMarker,
                  { backgroundColor: selectedPin.color || COLORS.accent },
                ]}
              >
                <Text style={styles.pinCardIcon}>
                  {selectedPin.icon || "📍"}
                </Text>
              </View>
              <View style={styles.pinCardText}>
                <Text style={styles.pinCardTitle} numberOfLines={1}>
                  {selectedPin.title}
                </Text>
                <Text style={styles.pinCardSubtitle} numberOfLines={1}>
                  {selectedPin.subtitle || t("map.tapToViewDetail")}
                </Text>
              </View>
              <Text style={styles.pinCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {showInfoCards && !selectedPin && (tapLoading || tapInfo) && (
          <View style={[styles.pinCard, { bottom: SPACING.md + insets.bottom + cardBottomOffset }]}>
            {tapLoading ? (
              <View style={styles.pinCardContent}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={[styles.pinCardSubtitle, { marginLeft: SPACING.sm }]}>
                  {t("map.searchingLocation")}
                </Text>
              </View>
            ) : tapInfo ? (
              <View style={styles.pinCardContent}>
                <View
                  style={[
                    styles.pinCardMarker,
                    { backgroundColor: COLORS.danger },
                  ]}
                >
                  <Text style={styles.pinCardIcon}>{tapInfo.icon}</Text>
                </View>
                <View style={styles.pinCardText}>
                  <Text style={styles.pinCardTitle} numberOfLines={1}>
                    {tapInfo.title}
                  </Text>
                  <Text style={styles.pinCardSubtitle} numberOfLines={2}>
                    {tapInfo.subtitle}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={dismissTapInfo}
                  style={styles.dismissBtn}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.dismissText}>✕</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}

        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color={COLORS.accent} />
          </View>
        )}
      </View>
    );
  },
);

VietmapView.displayName = "VietmapView";

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: BORDER_RADIUS.md,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(253, 248, 240, 0.85)",
    borderRadius: BORDER_RADIUS.md,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.large,
  },
  markerContainerSelected: {
    borderColor: COLORS.white,
    borderWidth: 3,
    ...SHADOWS.large,
    elevation: 8,
    shadowOpacity: 0.5,
  },
  markerIcon: {
    fontSize: TYPOGRAPHY.fontSize.xl,
  },
  pinCard: {
    position: "absolute",
    left: SPACING.md,
    right: SPACING.md,
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.large,
    elevation: 8,
    maxWidth: "95%",
  },
  pinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    gap: 10,
  },
  pinCardMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: COLORS.white,
    ...SHADOWS.small,
  },
  pinCardIcon: {
    fontSize: TYPOGRAPHY.fontSize.xxl + 2,
  },
  pinCardText: {
    flex: 1,
    minWidth: 0,
  },
  pinCardTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  pinCardSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
    flexShrink: 1,
  },
  pinCardArrow: {
    fontSize: TYPOGRAPHY.fontSize.xxl + 2,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  dismissBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  dismissText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
});

export default VietmapView;
