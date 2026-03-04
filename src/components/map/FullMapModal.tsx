import { MaterialIcons } from "@expo/vector-icons";
import React, { useRef } from "react";
import {
    Modal,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MapPin, VietmapView, VietmapViewRef } from "./VietmapView";

interface FullMapModalProps {
  visible: boolean;
  onClose: () => void;
  pins: MapPin[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  title?: string;
  showUserLocation?: boolean;
}

export const FullMapModal: React.FC<FullMapModalProps> = ({
  visible,
  onClose,
  pins,
  initialRegion,
  title = "Bản đồ",
  showUserLocation = true,
}) => {
  const insets = useSafeAreaInsets();
  const mapRef = useRef<VietmapViewRef>(null);

  const handleFitAllPins = () => {
    if (pins.length === 0) return;
    
    // Calculate bounds from all pins
    const lats = pins.map((p) => p.latitude);
    const lngs = pins.map((p) => p.longitude);
    
    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);
    
    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;
    
    // Calculate appropriate zoom level
    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);
    
    let zoom = 15;
    if (maxDiff > 0.1) zoom = 12;
    if (maxDiff > 0.5) zoom = 10;
    if (maxDiff > 1) zoom = 8;
    
    mapRef.current?.flyTo(centerLat, centerLng, zoom);
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor="#FFF" />
        
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.title}>{title}</Text>
          <TouchableOpacity style={styles.fitButton} onPress={handleFitAllPins}>
            <MaterialIcons name="fit-screen" size={24} color="#D4AF37" />
          </TouchableOpacity>
        </View>

        {/* Legend below header */}
        {pins.length > 0 && (
          <View style={styles.legendBar}>
            <Text style={styles.legendText}>
              {pins.length} địa điểm
            </Text>
          </View>
        )}

        {/* Full Screen Map */}
        <VietmapView
          ref={mapRef}
          initialRegion={
            initialRegion || {
              latitude: pins[0]?.latitude || 10.762622,
              longitude: pins[0]?.longitude || 106.660172,
              zoom: 15,
            }
          }
          pins={pins}
          showUserLocation={showUserLocation}
          style={styles.map}
        />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FDF8F0",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: "#FDF8F0",
    borderBottomWidth: 1,
    borderBottomColor: "#D4AF37",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#8B7355",
    flex: 1,
    textAlign: "center",
  },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
  },
  legendBar: {
    backgroundColor: "#FDF8F0",
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#D4AF37",
    alignItems: "center",
  },
  legendText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B7355",
  },
  map: {
    flex: 1,
    marginTop: 0,
  },
});

export default FullMapModal;
