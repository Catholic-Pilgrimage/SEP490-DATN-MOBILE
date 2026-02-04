/**
 * VietmapView Component
 * Interactive map using Vietmap API via WebView
 * Supports markers, user location, and pin management
 */
import React, { useRef, useCallback, useImperativeHandle, forwardRef } from "react";
import {
  StyleSheet,
  View,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { VIETMAP_CONFIG } from "../../config/env";

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
  zoom: 15,
};

// Generate HTML for Vietmap
const generateMapHTML = (
  center: { latitude: number; longitude: number; zoom: number },
  pins: MapPin[],
  showUserLocation: boolean
) => {
  const pinsJSON = JSON.stringify(pins);
  
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Vietmap</title>
  <script src="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.js"></script>
  <link href="https://unpkg.com/maplibre-gl@3.6.2/dist/maplibre-gl.css" rel="stylesheet" />
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body, #map { width: 100%; height: 100%; }
    .marker {
      width: 32px;
      height: 32px;
      border-radius: 50% 50% 50% 0;
      background: #D4AF37;
      transform: rotate(-45deg);
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 4px 8px rgba(0,0,0,0.3);
      cursor: pointer;
    }
    .marker-inner {
      width: 16px;
      height: 16px;
      border-radius: 50%;
      background: white;
      transform: rotate(45deg);
    }
    .marker-icon {
      position: absolute;
      transform: rotate(45deg);
      font-size: 14px;
    }
    .user-location {
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: #2563EB;
      border: 3px solid white;
      box-shadow: 0 0 0 2px rgba(37, 99, 235, 0.3), 0 2px 8px rgba(0,0,0,0.3);
    }
  </style>
</head>
<body>
  <div id="map"></div>
  <script>
    const VIETMAP_KEY = '${VIETMAP_CONFIG.TILEMAP_KEY}';
    const STYLE_URL = '${VIETMAP_CONFIG.STYLE_URL}';
    
    let map;
    let markers = {};
    let userLocationMarker = null;
    
    // Initialize map
    map = new maplibregl.Map({
      container: 'map',
      style: STYLE_URL,
      center: [${center.longitude}, ${center.latitude}],
      zoom: ${center.zoom}
    });
    
    // Add navigation controls
    map.addControl(new maplibregl.NavigationControl(), 'bottom-right');
    
    // Map ready
    map.on('load', function() {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapReady'
      }));
      
      // Add initial pins
      const pins = ${pinsJSON};
      pins.forEach(pin => addMarker(pin));
      
      // Show user location if enabled
      ${showUserLocation ? `
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            const { latitude, longitude } = pos.coords;
            showUserLocation(latitude, longitude);
          },
          (err) => console.log('Geolocation error:', err),
          { enableHighAccuracy: true }
        );
      }
      ` : ''}
    });
    
    // Map click event
    map.on('click', function(e) {
      window.ReactNativeWebView.postMessage(JSON.stringify({
        type: 'mapPress',
        latitude: e.lngLat.lat,
        longitude: e.lngLat.lng
      }));
    });
    
    // Add marker function
    function addMarker(pin) {
      if (markers[pin.id]) {
        markers[pin.id].remove();
      }
      
      // Create custom marker element
      const el = document.createElement('div');
      el.className = 'marker';
      el.style.background = pin.color || '#D4AF37';
      el.innerHTML = '<div class="marker-inner"></div>';
      if (pin.icon) {
        el.innerHTML += '<span class="marker-icon">' + pin.icon + '</span>';
      }
      
      // Add click handler
      el.addEventListener('click', function(e) {
        e.stopPropagation();
        window.ReactNativeWebView.postMessage(JSON.stringify({
          type: 'markerPress',
          pin: pin
        }));
      });
      
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([pin.longitude, pin.latitude])
        .addTo(map);
      
      markers[pin.id] = marker;
    }
    
    // Remove marker
    function removeMarker(pinId) {
      if (markers[pinId]) {
        markers[pinId].remove();
        delete markers[pinId];
      }
    }
    
    // Clear all markers
    function clearMarkers() {
      Object.keys(markers).forEach(id => {
        markers[id].remove();
      });
      markers = {};
    }
    
    // Show user location
    function showUserLocation(lat, lng) {
      if (userLocationMarker) {
        userLocationMarker.remove();
      }
      
      const el = document.createElement('div');
      el.className = 'user-location';
      
      userLocationMarker = new maplibregl.Marker({ element: el })
        .setLngLat([lng, lat])
        .addTo(map);
    }
    
    // Fly to location
    function flyTo(lat, lng, zoom) {
      map.flyTo({
        center: [lng, lat],
        zoom: zoom || map.getZoom(),
        essential: true
      });
    }
    
    // Handle messages from React Native
    window.handleMessage = function(data) {
      const message = JSON.parse(data);
      switch (message.action) {
        case 'flyTo':
          flyTo(message.latitude, message.longitude, message.zoom);
          break;
        case 'addPin':
          addMarker(message.pin);
          break;
        case 'removePin':
          removeMarker(message.pinId);
          break;
        case 'clearPins':
          clearMarkers();
          break;
      }
    };
  </script>
</body>
</html>
`;
};

// VietmapView Component
export const VietmapView = forwardRef<VietmapViewRef, VietmapViewProps>(
  (
    {
      initialRegion = DEFAULT_CENTER,
      pins = [],
      showUserLocation = false,
      onMapReady,
      onMapPress,
      onMarkerPress,
      style,
    },
    ref
  ) => {
    const webViewRef = useRef<WebView>(null);
    const [isLoading, setIsLoading] = React.useState(true);

    // Expose methods via ref
    useImperativeHandle(ref, () => ({
      flyTo: (latitude: number, longitude: number, zoom?: number) => {
        webViewRef.current?.injectJavaScript(`
          window.handleMessage('${JSON.stringify({ action: 'flyTo', latitude, longitude, zoom })}');
          true;
        `);
      },
      addPin: (pin: MapPin) => {
        webViewRef.current?.injectJavaScript(`
          window.handleMessage('${JSON.stringify({ action: 'addPin', pin })}');
          true;
        `);
      },
      removePin: (pinId: string) => {
        webViewRef.current?.injectJavaScript(`
          window.handleMessage('${JSON.stringify({ action: 'removePin', pinId })}');
          true;
        `);
      },
      clearPins: () => {
        webViewRef.current?.injectJavaScript(`
          window.handleMessage('${JSON.stringify({ action: 'clearPins' })}');
          true;
        `);
      },
    }));

    // Handle messages from WebView
    const handleMessage = useCallback(
      (event: WebViewMessageEvent) => {
        try {
          const data = JSON.parse(event.nativeEvent.data);
          switch (data.type) {
            case "mapReady":
              setIsLoading(false);
              onMapReady?.();
              break;
            case "mapPress":
              onMapPress?.({
                latitude: data.latitude,
                longitude: data.longitude,
              });
              break;
            case "markerPress":
              onMarkerPress?.(data.pin);
              break;
          }
        } catch (error) {
          console.error("VietmapView message error:", error);
        }
      },
      [onMapReady, onMapPress, onMarkerPress]
    );

    const region = {
      latitude: initialRegion.latitude ?? DEFAULT_CENTER.latitude,
      longitude: initialRegion.longitude ?? DEFAULT_CENTER.longitude,
      zoom: initialRegion.zoom ?? DEFAULT_CENTER.zoom,
    };

    const html = generateMapHTML(region, pins, showUserLocation);

    return (
      <View style={[styles.container, style]}>
        <WebView
          ref={webViewRef}
          source={{ html }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled
          domStorageEnabled
          geolocationEnabled={showUserLocation}
          allowsInlineMediaPlayback
          startInLoadingState
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#D4AF37" />
            </View>
          )}
        />
        {isLoading && (
          <View style={styles.loadingOverlay}>
            <ActivityIndicator size="large" color="#D4AF37" />
          </View>
        )}
      </View>
    );
  }
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: "hidden",
    borderRadius: 12,
  },
  webview: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#FDF8F0",
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(253, 248, 240, 0.8)",
  },
});

export default VietmapView;
