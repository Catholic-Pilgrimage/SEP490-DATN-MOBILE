/**
 * VietmapView Component
 * Native map using @rnmapbox/maps SDK with Vietmap raster tiles
 * Uses RasterSource/RasterLayer for tiles — no dependency on Mapbox CDN
 * Supports tap-to-search via Vietmap Reverse Geocoding API
 */
import Mapbox, {
  Camera,
  LineLayer,
  LocationPuck,
  MapView,
  PointAnnotation,
  RasterLayer,
  RasterSource,
  ShapeSource,
  UserLocation,
} from "@rnmapbox/maps";
import React, {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useRef,
} from "react";
import { FontAwesome5, Ionicons, MaterialIcons } from "@expo/vector-icons";
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
  markerType?: "restaurant" | "hotel" | "medical" | "media" | "site" | "pick" | "sos";
  chipMarkerType?: "restaurant" | "hotel" | "medical" | "media" | "site" | "pick" | "sos";
  chipPlainIcon?: boolean;
  chipUseDefaultPin?: boolean;
  chipIconColor?: string;
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
  
  tapRelocatesPin?: boolean;

  /** Callback khi vị trí người dùng cập nhật (real-time tracking) */
  onUserLocationUpdate?: (location: { latitude: number; longitude: number }) => void;

  /**
   * Route coordinates to draw as a polyline on the map.
   * Each entry is [longitude, latitude] (GeoJSON order).
   * This draws a SINGLE continuous polyline.
   */
  routeCoordinates?: [number, number][];

  /**
   * Multiple route segments — each segment gets its own color.
   * Takes priority over `routeCoordinates` if both are specified.
   */
  routeSegments?: {
    coordinates: [number, number][];
    color?: string;
  }[];
}

export interface VietmapViewRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  fitBounds: (ne: [number, number], sw: [number, number], padding?: number) => void;
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

/** Colors for route segments when using multi-segment mode */
const ROUTE_SEGMENT_COLORS = [
  "#E74C3C", // red
  "#3498DB", // blue
  "#2ECC71", // green
  "#F39C12", // orange
  "#9B59B6", // purple
  "#1ABC9C", // teal
  "#E67E22", // dark orange
  "#E91E63", // pink
];

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
      tapRelocatesPin = false,
      onUserLocationUpdate,
      routeCoordinates,
      routeSegments,
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

        if (!tapRelocatesPin) {
          const nearbyPin = localPins.find(
            (p) =>
              Math.abs(p.latitude - lat) < SNAP_THRESHOLD &&
              Math.abs(p.longitude - lng) < SNAP_THRESHOLD,
          );
          if (nearbyPin) {
            handleMarkerPress(nearbyPin);
            return;
          }
        }

        setSelectedPin(null);
        onMapPress?.({ latitude: lat, longitude: lng });
        if (showInfoCards) {
          reverseGeocode(lat, lng);
        }
      },
      [
        tapRelocatesPin,
        localPins,
        onMapPress,
        reverseGeocode,
        handleMarkerPress,
        showInfoCards,
      ],
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
        fitBounds: (ne: [number, number], sw: [number, number], padding = 80) => {
          if (!cameraRef.current) return;
          cameraRef.current.fitBounds(ne, sw, padding, 800);
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
            <>
              <LocationPuck
                puckBearingEnabled
                puckBearing="heading"
                pulsing={{ isEnabled: true, color: COLORS.info, radius: 50 }}
              />
              {onUserLocationUpdate && (
                <UserLocation
                  visible={false}
                  onUpdate={(loc) => {
                    if (loc?.coords) {
                      onUserLocationUpdate({
                        latitude: loc.coords.latitude,
                        longitude: loc.coords.longitude,
                      });
                    }
                  }}
                  minDisplacement={50}
                />
              )}
            </>
          )}

          {/* Route polyline rendering */}
          {routeSegments && routeSegments.length > 0
            ? routeSegments.map((segment, idx) => {
                if (!segment.coordinates || segment.coordinates.length < 2) return null;
                const geoJson: GeoJSON.Feature<GeoJSON.LineString> = {
                  type: 'Feature',
                  properties: {},
                  geometry: {
                    type: 'LineString',
                    coordinates: segment.coordinates,
                  },
                };
                const segColor = segment.color || ROUTE_SEGMENT_COLORS[idx % ROUTE_SEGMENT_COLORS.length];
                return (
                  <ShapeSource key={`route-seg-${idx}`} id={`route-segment-${idx}`} shape={geoJson}>
                    <LineLayer
                      id={`route-line-bg-${idx}`}
                      style={{
                        lineColor: '#FFFFFF',
                        lineWidth: 9,
                        lineOpacity: 0.85,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                    <LineLayer
                      id={`route-line-${idx}`}
                      style={{
                        lineColor: segColor,
                        lineWidth: 5,
                        lineJoin: 'round',
                        lineCap: 'round',
                      }}
                    />
                  </ShapeSource>
                );
              })
            : routeCoordinates && routeCoordinates.length >= 2
              ? (() => {
                  const geoJson: GeoJSON.Feature<GeoJSON.LineString> = {
                    type: 'Feature',
                    properties: {},
                    geometry: {
                      type: 'LineString',
                      coordinates: routeCoordinates,
                    },
                  };
                  return (
                    <ShapeSource id="route-line-source" shape={geoJson}>
                      <LineLayer
                        id="route-line-bg"
                        style={{
                          lineColor: '#000000',
                          lineWidth: 7,
                          lineOpacity: 0.15,
                          lineJoin: 'round',
                          lineCap: 'round',
                        }}
                      />
                      <LineLayer
                        id="route-line-main"
                        style={{
                          lineColor: '#2563EB',
                          lineWidth: 4,
                          lineJoin: 'round',
                          lineCap: 'round',
                        }}
                      />
                    </ShapeSource>
                  );
                })()
              : null}

          {localPins.map((pin) => {
            const isNumeric = pin.icon && /^\d+$/.test(pin.icon);
            const isSelected = selectedPin?.id === pin.id;
            return (
              <PointAnnotation
                key={pin.id}
                id={pin.id}
                coordinate={[pin.longitude, pin.latitude]}
                anchor={{ x: 0.5, y: 0.5 }}
                onSelected={() => {
                  if (tapRelocatesPin) {
                    onMapPress?.({
                      latitude: pin.latitude,
                      longitude: pin.longitude,
                    });
                    return;
                  }
                  handleMarkerPress(pin);
                }}
              >
                <View
                  style={[
                    styles.markerContainer,
                    { backgroundColor: pin.color || COLORS.accent },
                    isSelected && styles.markerContainerSelected,
                  ]}
                >
                  {isNumeric ? (
                    <Text style={styles.markerNumber}>{pin.icon}</Text>
                  ) : (
                    <MapPinGlyph
                      icon={pin.icon}
                      markerType={pin.markerType}
                      color={COLORS.white}
                      selected={isSelected}
                      size={isSelected ? 30 : 28}
                    />
                  )}
                </View>
              </PointAnnotation>
            );
          })}
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
                <View style={styles.pinCardIcon}>
                  <MapPinGlyph
                    icon={selectedPin.icon}
                    markerType={selectedPin.markerType}
                    color={COLORS.white}
                    selected
                    size={24}
                  />
                </View>
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
                  <View style={styles.pinCardIcon}>
                    <MapPinGlyph color={COLORS.white} selected size={24} />
                  </View>
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
                  <Ionicons name="close" size={16} color={COLORS.textSecondary} />
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

export const MapPinGlyph = ({
  icon,
  markerType,
  color,
  selected = false,
  size = 28,
}: {
  icon?: string;
  markerType?: MapPin["markerType"];
  color: string;
  selected?: boolean;
  size?: number;
}) => {
  if (markerType === "site" || icon === "⛪") {
    return <MaterialIcons name="church" size={size} color={color} />;
  }
  if (markerType === "pick" || icon === "📌") {
    return <Ionicons name="locate" size={size} color={color} />;
  }
  if (markerType === "sos" || icon === "🆘") {
    return <MaterialIcons name="sos" size={size} color={color} />;
  }
  if (markerType === "restaurant") {
    return <Ionicons name="restaurant" size={size} color={color} />;
  }
  if (markerType === "hotel") {
    return <FontAwesome5 name="hotel" size={size - 2} color={color} />;
  }
  if (markerType === "medical") {
    return <Ionicons name="medkit" size={size - 2} color={color} />;
  }
  if (markerType === "media") {
    return <MaterialIcons name="perm-media" size={size} color={color} />;
  }
  if (icon === "📍") {
    return <Ionicons name="navigate" size={size - 2} color={color} />;
  }

  return (
    <Ionicons
      name={selected ? "location" : "location-outline"}
      size={size}
      color={color}
    />
  );
};

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
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2.5,
    borderColor: COLORS.white,
    ...SHADOWS.large,
  },
  markerContainerSelected: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderColor: COLORS.white,
    borderWidth: 3,
    ...SHADOWS.large,
    elevation: 8,
    shadowOpacity: 0.5,
  },
  markerNumber: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '900',
    textAlign: 'center',
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
    alignItems: "center",
    justifyContent: "center",
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
