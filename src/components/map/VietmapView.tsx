/**
 * VietmapView Component
 * Native map using @rnmapbox/maps SDK with Vietmap style URL
 * Much faster and smoother than WebView approach
 */
import Mapbox, {
  Camera,
  LocationPuck,
  MapView,
  PointAnnotation,
} from "@rnmapbox/maps";
import React, { forwardRef, useImperativeHandle, useRef } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { MAPBOX_ACCESS_TOKEN, VIETMAP_CONFIG } from "../../config/env";

// Init Mapbox SDK with token (required by SDK, tiles still served from Vietmap)
Mapbox.setAccessToken(MAPBOX_ACCESS_TOKEN);

// Types
export interface MapPin {
  id: string;
  latitude: number;
  longitude: number;
  title: string;
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
      onMapReady,
      onMapPress,
      onMarkerPress,
      style,
    },
    ref,
  ) => {
    const cameraRef = useRef<Camera>(null);
    const [localPins, setLocalPins] = React.useState<MapPin[]>(pins);
    const [isLoading, setIsLoading] = React.useState(true);

    // Sync pins prop → localPins
    React.useEffect(() => {
      setLocalPins(pins);
    }, [pins]);

    const centerLat = initialRegion?.latitude ?? DEFAULT_CENTER.latitude;
    const centerLng = initialRegion?.longitude ?? DEFAULT_CENTER.longitude;
    const zoomLevel = initialRegion?.zoom ?? DEFAULT_CENTER.zoom;

    // Expose imperative methods
    useImperativeHandle(ref, () => ({
      flyTo: (latitude: number, longitude: number, zoom?: number) => {
        cameraRef.current?.flyTo([longitude, latitude], 600);
        if (zoom !== undefined) {
          cameraRef.current?.zoomTo(zoom, 600);
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
    }));

    const handlePress = (feature: any) => {
      if (!onMapPress) return;
      const coords = feature?.geometry?.coordinates;
      if (coords) {
        onMapPress({ latitude: coords[1], longitude: coords[0] });
      }
    };

    return (
      <View style={[styles.container, style]}>
        <MapView
          style={styles.map}
          styleURL={VIETMAP_CONFIG.STYLE_URL}
          onDidFinishLoadingMap={() => {
            setIsLoading(false);
            onMapReady?.();
          }}
          onPress={handlePress}
          attributionEnabled={false}
          logoEnabled={false}
          compassEnabled
        >
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

          {/* Render pins */}
          {localPins.map((pin) => (
            <PointAnnotation
              key={pin.id}
              id={pin.id}
              coordinate={[pin.longitude, pin.latitude]}
              onSelected={() => onMarkerPress?.(pin)}
            >
              <TouchableOpacity
                style={[
                  styles.markerContainer,
                  { backgroundColor: pin.color || "#D4AF37" },
                ]}
                onPress={() => onMarkerPress?.(pin)}
                activeOpacity={0.85}
              >
                <Text style={styles.markerIcon}>{pin.icon || "📍"}</Text>
              </TouchableOpacity>
              <Mapbox.Callout title={pin.title} />
            </PointAnnotation>
          ))}
        </MapView>

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
    width: 36,
    height: 36,
    borderRadius: 18,
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
  markerIcon: {
    fontSize: 18,
  },
});

export default VietmapView;
