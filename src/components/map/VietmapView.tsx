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
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  ActivityIndicator,
  Linking,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MAPBOX_ACCESS_TOKEN, VIETMAP_CONFIG } from "../../config/env";

// Init Mapbox SDK with token (required to bootstrap native SDK)
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Minimal inline style — no network request needed
// Includes glyphs so PointAnnotation renders correctly
const EMPTY_STYLE = JSON.stringify({
  version: 8,
  name: "empty",
  glyphs: "https://maps.vietmap.vn/mt/fonts/{fontstack}/{range}.pbf",
  sources: {},
  layers: [
    {
      id: "background",
      type: "background",
      paint: { "background-color": "#f5f0e8" },
    },
  ],
});

// Types
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
  style?: any;
}

export interface VietmapViewRef {
  flyTo: (latitude: number, longitude: number, zoom?: number) => void;
  addPin: (pin: MapPin) => void;
  removePin: (pinId: string) => void;
  clearPins: () => void;
  selectPin: (pinId: string) => void;
}

// Default center: Ho Chi Minh City
const DEFAULT_CENTER = {
  latitude: 10.762622,
  longitude: 106.660172,
  zoom: 14,
};

export const VietmapView = forwardRef<VietmapViewRef, VietmapViewProps>(
  (
    {
      initialRegion,
      pins = [],
      showUserLocation = false,
      scrollEnabled = true,
      onMapReady,
      onMapPress,
      onMarkerPress,
      style,
    },
    ref,
  ) => {
    const insets = useSafeAreaInsets();
    const cameraRef = useRef<Camera>(null);
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

    // Sync pins prop → localPins
    React.useEffect(() => {
      setLocalPins(pins);
    }, [pins]);

    // Safety timeout: hide spinner after 8s regardless of map events
    React.useEffect(() => {
      loadingTimerRef.current = setTimeout(() => {
        setIsLoading(false);
      }, 8000);
      return () => {
        if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
      };
    }, []);

    const centerLat = initialRegion?.latitude ?? DEFAULT_CENTER.latitude;
    const centerLng = initialRegion?.longitude ?? DEFAULT_CENTER.longitude;
    const zoomLevel = initialRegion?.zoom ?? DEFAULT_CENTER.zoom;

    // Reverse geocode a tap position using Vietmap API
    const reverseGeocode = async (lat: number, lng: number) => {
      try {
        setTapLoading(true);
        setTapInfo(null);
        const url = `${VIETMAP_CONFIG.REVERSE_GEOCODING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&lat=${lat}&lng=${lng}`;
        const res = await fetch(url);
        const data = await res.json();
        const first = Array.isArray(data) ? data[0] : data?.value?.[0];
        if (first) {
          const name: string = first.name || first.display || "";
          setTapInfo({
            title: name || "Địa điểm",
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
            title: "Vị trí đã chọn",
            subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
            lat,
            lng,
            icon: "📍",
          });
        }
      } catch {
        setTapInfo({
          title: "Vị trí đã chọn",
          subtitle: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
          lat,
          lng,
          icon: "📍",
        });
      } finally {
        setTapLoading(false);
      }
    };

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      flyTo: (latitude: number, longitude: number, zoom?: number) => {
        if (cameraRef.current) {
          if (zoom !== undefined) {
            cameraRef.current.setCamera({
              centerCoordinate: [longitude, latitude],
              zoomLevel: zoom,
              animationDuration: 800,
            });
          } else {
            cameraRef.current.flyTo([longitude, latitude], 600);
          }
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
        const pin = localPins.find((p) => p.id === pinId);
        if (pin) {
          setTapInfo(null);
          setSelectedPin(pin);
        }
      },
    }));

    const handlePress = (feature: any) => {
      const coords = feature?.geometry?.coordinates;
      if (!coords) return;
      const lng = coords[0];
      const lat = coords[1];

      // If tap is very close to an existing pin → select that pin instead of reverse geocode
      const SNAP_THRESHOLD = 0.0003; // ~30m
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
      reverseGeocode(lat, lng);
    };

    const handleMarkerPress = (pin: MapPin) => {
      setTapInfo(null);
      setSelectedPin((prev) => (prev?.id === pin.id ? null : pin));
      cameraRef.current?.flyTo([pin.longitude, pin.latitude], 400);
      onMarkerPress?.(pin);
    };

    const openInMaps = (lat: number, lng: number, label: string) => {
      const url = `https://maps.google.com/?q=${lat},${lng}&label=${encodeURIComponent(label)}`;
      Linking.openURL(url);
    };

    return (
      <View style={[styles.container, style]}>
        <MapView
          style={styles.map}
          styleJSON={EMPTY_STYLE}
          scrollEnabled={scrollEnabled}
          zoomEnabled={scrollEnabled}
          pitchEnabled={false}
          onDidFinishLoadingMap={() => {
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
            setIsLoading(false);
            onMapReady?.();
          }}
          onDidFailLoadingMap={() => {
            if (loadingTimerRef.current) clearTimeout(loadingTimerRef.current);
            setIsLoading(false);
          }}
          onPress={handlePress}
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled
        >
          {/* Vietmap raster tiles overlay — served directly from Vietmap CDN */}
          <RasterSource
            id="vietmap-raster"
            tileUrlTemplates={[VIETMAP_CONFIG.TILE_URL]}
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

          {/* User location puck */}
          {showUserLocation && (
            <LocationPuck
              puckBearingEnabled
              puckBearing="heading"
              pulsing={{ isEnabled: true, color: "#2563EB", radius: 50 }}
            />
          )}

          {/* Render pins — above raster layer */}
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
                  { backgroundColor: pin.color || "#D4AF37" },
                  selectedPin?.id === pin.id && styles.markerContainerSelected,
                ]}
              >
                <Text style={styles.markerIcon}>{pin.icon || "📍"}</Text>
              </View>
            </PointAnnotation>
          ))}
        </MapView>

        {/* Selected custom pin card */}
        {selectedPin && (
          <TouchableOpacity
            style={[styles.pinCard, { bottom: 12 + insets.bottom }]}
            onPress={() => onMarkerPress?.(selectedPin)}
            activeOpacity={0.9}
          >
            <View style={styles.pinCardContent}>
              <View
                style={[
                  styles.pinCardMarker,
                  { backgroundColor: selectedPin.color || "#D4AF37" },
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
                {selectedPin.subtitle ? (
                  <Text style={styles.pinCardSubtitle} numberOfLines={1}>
                    {selectedPin.subtitle}
                  </Text>
                ) : (
                  <Text style={styles.pinCardSubtitle}>
                    Nhấn để xem chi tiết
                  </Text>
                )}
              </View>
              <Text style={styles.pinCardArrow}>›</Text>
            </View>
          </TouchableOpacity>
        )}

        {/* Tap info card — shown when user taps map (reverse geocode result) */}
        {!selectedPin && (tapLoading || tapInfo) && (
          <View style={[styles.pinCard, { bottom: 12 + insets.bottom }]}>
            {tapLoading ? (
              <View style={styles.pinCardContent}>
                <ActivityIndicator size="small" color="#D4AF37" />
                <Text style={[styles.pinCardSubtitle, { marginLeft: 8 }]}>
                  Đang tìm địa điểm...
                </Text>
              </View>
            ) : tapInfo ? (
              <View style={styles.pinCardContent}>
                <View
                  style={[styles.pinCardMarker, { backgroundColor: "#E53935" }]}
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
              </View>
            ) : null}
          </View>
        )}

        {/* Loading overlay */}
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}
      </View>
    );
  },
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 12,
  },
  map: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(253, 248, 240, 0.85)",
    borderRadius: 12,
  },
  markerContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  markerContainerSelected: {
    borderColor: "#fff",
    borderWidth: 3,
    elevation: 8,
    shadowOpacity: 0.5,
  },
  markerIcon: {
    fontSize: 18,
  },
  pinCard: {
    position: "absolute",
    left: 12,
    right: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
    maxWidth: "95%",
  },
  pinCardContent: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  pinCardMarker: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  pinCardIcon: {
    fontSize: 22,
  },
  pinCardText: {
    flex: 1,
    minWidth: 0,
  },
  pinCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
    flexShrink: 1,
  },
  pinCardSubtitle: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
    flexShrink: 1,
  },
  pinCardArrow: {
    fontSize: 22,
    color: "#D4AF37",
    fontWeight: "600",
  },
  pinCardDirectionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#f5f0e8",
    justifyContent: "center",
    alignItems: "center",
  },
  pinCardDirectionText: {
    fontSize: 18,
  },
});

export default VietmapView;
