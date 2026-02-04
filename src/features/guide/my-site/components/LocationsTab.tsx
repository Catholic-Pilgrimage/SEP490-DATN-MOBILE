/**
 * LocationsTab Component
 * Map with pinned key points (Parking, Restroom, Reception, etc.)
 * Implements "Pin key points" functionality using Vietmap
 */
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState, useCallback, useRef } from "react";
import {
  Alert,
  FlatList,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  GUIDE_BORDER_RADIUS,
  GUIDE_COLORS,
  GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { getSpacing, getFontSize, moderateScale } from "../../../../utils/responsive";
import { VietmapView, VietmapViewRef, MapPin } from "../../../../components/map/VietmapView";

// Premium Colors
const PREMIUM_COLORS = {
  gold: "#D4AF37",
  goldLight: "#F5E6B8",
  cream: "#FDF8F0",
  charcoal: "#1A1A1A",
  emerald: "#10B981",
  sapphire: "#2563EB",
  ruby: "#E11D48",
};

// Pin Types
const PIN_TYPES = [
  { id: "parking", icon: "car", label: "Bãi đỗ xe", color: PREMIUM_COLORS.sapphire },
  { id: "restroom", icon: "water", label: "Nhà vệ sinh", color: PREMIUM_COLORS.emerald },
  { id: "reception", icon: "information-circle", label: "Lễ tân", color: PREMIUM_COLORS.gold },
  { id: "chapel", icon: "home", label: "Nhà nguyện", color: "#9333EA" },
  { id: "entrance", icon: "enter", label: "Lối vào", color: "#F97316" },
  { id: "exit", icon: "exit", label: "Lối ra", color: PREMIUM_COLORS.ruby },
  { id: "other", icon: "location", label: "Khác", color: GUIDE_COLORS.gray500 },
] as const;

type PinType = typeof PIN_TYPES[number]["id"];

interface LocationPin {
  id: string;
  type: PinType;
  name: string;
  latitude: number;
  longitude: number;
  description?: string;
}

interface LocationsTabProps {
  siteLocation?: {
    latitude: number;
    longitude: number;
  };
  pins?: LocationPin[];
  onAddPin?: (pin: Omit<LocationPin, "id">) => Promise<void>;
  onDeletePin?: (pinId: string) => Promise<void>;
  onPinPress?: (pin: LocationPin) => void;
}

// Mock pins for demo
const MOCK_PINS: LocationPin[] = [
  { id: "1", type: "parking", name: "Bãi đỗ xe chính", latitude: 10.762622, longitude: 106.660172, description: "Sức chứa 50 xe" },
  { id: "2", type: "entrance", name: "Cổng chính", latitude: 10.762822, longitude: 106.660372 },
  { id: "3", type: "restroom", name: "Nhà vệ sinh A", latitude: 10.762422, longitude: 106.660572 },
  { id: "4", type: "reception", name: "Quầy lễ tân", latitude: 10.762722, longitude: 106.660272 },
  { id: "5", type: "chapel", name: "Nhà nguyện nhỏ", latitude: 10.762522, longitude: 106.660472 },
];

// Helper to get emoji for pin type
const getIconEmoji = (type: PinType): string => {
  const emojiMap: Record<PinType, string> = {
    parking: "🅿️",
    restroom: "🚻",
    reception: "ℹ️",
    chapel: "⛪",
    entrance: "🚪",
    exit: "🚶",
    other: "📍",
  };
  return emojiMap[type] || "📍";
};

// Pin Card Component
const PinCard: React.FC<{
  pin: LocationPin;
  onPress?: () => void;
  onDelete?: () => void;
}> = ({ pin, onPress, onDelete }) => {
  const pinType = PIN_TYPES.find((p) => p.id === pin.type) || PIN_TYPES[6];

  return (
    <TouchableOpacity style={styles.pinCard} onPress={onPress} activeOpacity={0.8}>
      <View style={[styles.pinCardIcon, { backgroundColor: pinType.color + "20" }]}>
        <Ionicons name={pinType.icon as any} size={24} color={pinType.color} />
      </View>
      <View style={styles.pinCardContent}>
        <Text style={styles.pinCardName}>{pin.name}</Text>
        <Text style={styles.pinCardType}>{pinType.label}</Text>
        {pin.description && (
          <Text style={styles.pinCardDesc} numberOfLines={1}>{pin.description}</Text>
        )}
      </View>
      <TouchableOpacity 
        style={styles.pinCardDelete} 
        onPress={onDelete}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <MaterialIcons name="delete-outline" size={20} color={GUIDE_COLORS.gray400} />
      </TouchableOpacity>
    </TouchableOpacity>
  );
};

// Legend Component
const Legend: React.FC = () => {
  return (
    <View style={styles.legend}>
      <Text style={styles.legendTitle}>Chú thích</Text>
      <View style={styles.legendGrid}>
        {PIN_TYPES.map((type) => (
          <View key={type.id} style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: type.color }]}>
              <Ionicons name={type.icon as any} size={12} color="#FFF" />
            </View>
            <Text style={styles.legendLabel}>{type.label}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};

// Main Component
export const LocationsTab: React.FC<LocationsTabProps> = ({
  siteLocation,
  pins = MOCK_PINS,
  onAddPin,
  onDeletePin,
  onPinPress,
}) => {
  const [selectedType, setSelectedType] = useState<PinType>("parking");
  const [localPins, setLocalPins] = useState<LocationPin[]>(pins);
  const mapRef = useRef<VietmapViewRef>(null);

  // Convert LocationPin to MapPin for VietmapView
  const mapPins: MapPin[] = localPins.map((pin) => {
    const pinType = PIN_TYPES.find((p) => p.id === pin.type);
    return {
      id: pin.id,
      latitude: pin.latitude,
      longitude: pin.longitude,
      title: pin.name,
      color: pinType?.color || PREMIUM_COLORS.gold,
      icon: getIconEmoji(pin.type),
    };
  });

  const handleAddPin = useCallback(() => {
    Alert.prompt(
      "Thêm điểm mới",
      `Nhập tên cho ${PIN_TYPES.find((p) => p.id === selectedType)?.label}:`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thêm",
          onPress: async (name: string | undefined) => {
            if (!name?.trim()) return;
            const pinType = PIN_TYPES.find((p) => p.id === selectedType);
            const newPin: LocationPin = {
              id: Date.now().toString(),
              type: selectedType,
              name: name.trim(),
              latitude: siteLocation?.latitude || 10.762622,
              longitude: siteLocation?.longitude || 106.660172,
            };
            setLocalPins((prev) => [...prev, newPin]);
            // Add to map
            mapRef.current?.addPin({
              id: newPin.id,
              latitude: newPin.latitude,
              longitude: newPin.longitude,
              title: newPin.name,
              color: pinType?.color,
              icon: getIconEmoji(selectedType),
            });
            if (onAddPin) {
              await onAddPin(newPin);
            }
          },
        },
      ],
      "plain-text"
    );
  }, [selectedType, onAddPin, siteLocation]);

  const handleDeletePin = useCallback((pin: LocationPin) => {
    Alert.alert(
      "Xóa điểm",
      `Bạn có chắc muốn xóa "${pin.name}"?`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Xóa",
          style: "destructive",
          onPress: async () => {
            setLocalPins((prev) => prev.filter((p) => p.id !== pin.id));
            mapRef.current?.removePin(pin.id);
            if (onDeletePin) {
              await onDeletePin(pin.id);
            }
          },
        },
      ]
    );
  }, [onDeletePin]);

  const handleMapPress = useCallback((event: { latitude: number; longitude: number }) => {
    // Show option to add pin at tapped location
    Alert.prompt(
      "Thêm điểm tại vị trí này",
      `Nhập tên cho ${PIN_TYPES.find((p) => p.id === selectedType)?.label}:`,
      [
        { text: "Hủy", style: "cancel" },
        {
          text: "Thêm",
          onPress: async (name: string | undefined) => {
            if (!name?.trim()) return;
            const pinType = PIN_TYPES.find((p) => p.id === selectedType);
            const newPin: LocationPin = {
              id: Date.now().toString(),
              type: selectedType,
              name: name.trim(),
              latitude: event.latitude,
              longitude: event.longitude,
            };
            setLocalPins((prev) => [...prev, newPin]);
            mapRef.current?.addPin({
              id: newPin.id,
              latitude: newPin.latitude,
              longitude: newPin.longitude,
              title: newPin.name,
              color: pinType?.color,
              icon: getIconEmoji(selectedType),
            });
            if (onAddPin) {
              await onAddPin(newPin);
            }
          },
        },
      ],
      "plain-text"
    );
  }, [selectedType, onAddPin]);

  const handleMarkerPress = useCallback((mapPin: MapPin) => {
    const pin = localPins.find((p) => p.id === mapPin.id);
    if (pin && onPinPress) {
      onPinPress(pin);
    }
  }, [localPins, onPinPress]);

  return (
    <View style={styles.container}>
      {/* Vietmap View */}
      <View style={styles.mapContainer}>
        <VietmapView
          ref={mapRef}
          initialRegion={{
            latitude: siteLocation?.latitude || 10.762622,
            longitude: siteLocation?.longitude || 106.660172,
            zoom: 16,
          }}
          pins={mapPins}
          showUserLocation
          onMapPress={handleMapPress}
          onMarkerPress={handleMarkerPress}
          style={styles.map}
        />

        {/* Floating Add Button */}
        <TouchableOpacity style={styles.addButton} onPress={handleAddPin}>
          <LinearGradient
            colors={[PREMIUM_COLORS.gold, "#B8860B"]}
            style={styles.addButtonGradient}
          >
            <MaterialIcons name="add-location" size={24} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      </View>

      {/* Pin Type Selector */}
      <View style={styles.selectorContainer}>
        <Text style={styles.selectorTitle}>Loại điểm:</Text>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.selectorScroll}
        >
          {PIN_TYPES.map((type) => (
            <TouchableOpacity
              key={type.id}
              style={[
                styles.typeChip,
                selectedType === type.id && { backgroundColor: type.color },
              ]}
              onPress={() => setSelectedType(type.id)}
            >
              <Ionicons
                name={type.icon as any}
                size={16}
                color={selectedType === type.id ? "#FFF" : type.color}
              />
              <Text
                style={[
                  styles.typeChipLabel,
                  selectedType === type.id && { color: "#FFF" },
                ]}
              >
                {type.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Pins List */}
      <View style={styles.listContainer}>
        <View style={styles.listHeader}>
          <Text style={styles.listTitle}>Các điểm đã đánh dấu</Text>
          <Text style={styles.listCount}>{localPins.length} điểm</Text>
        </View>
        <FlatList
          data={localPins}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <PinCard
              pin={item}
              onPress={() => onPinPress?.(item)}
              onDelete={() => handleDeletePin(item)}
            />
          )}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <MaterialIcons name="place" size={48} color={GUIDE_COLORS.gray300} />
              <Text style={styles.emptyText}>Chưa có điểm nào</Text>
              <Text style={styles.emptySubtext}>Nhấn nút + để thêm điểm mới</Text>
            </View>
          }
        />
      </View>

      {/* Legend */}
      <Legend />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: PREMIUM_COLORS.cream,
  },
  
  // Map Section
  mapContainer: {
    height: 200,
    position: "relative",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    margin: getSpacing(GUIDE_SPACING.md),
    overflow: "hidden",
  },
  map: {
    flex: 1,
    borderRadius: GUIDE_BORDER_RADIUS.lg,
  },
  addButton: {
    position: "absolute",
    bottom: getSpacing(GUIDE_SPACING.md),
    right: getSpacing(GUIDE_SPACING.md),
    borderRadius: 28,
    zIndex: 10,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  addButtonGradient: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },

  // Selector
  selectorContainer: {
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingBottom: getSpacing(GUIDE_SPACING.sm),
  },
  selectorTitle: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  selectorScroll: {
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  typeChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
    paddingVertical: getSpacing(GUIDE_SPACING.sm),
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.gray200,
  },
  typeChipLabel: {
    fontSize: getFontSize(12),
    fontWeight: "500",
    color: GUIDE_COLORS.textSecondary,
  },

  // List
  listContainer: {
    flex: 1,
    paddingHorizontal: getSpacing(GUIDE_SPACING.md),
  },
  listHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  listTitle: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  listCount: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textMuted,
  },
  listContent: {
    gap: getSpacing(GUIDE_SPACING.sm),
    paddingBottom: getSpacing(GUIDE_SPACING.lg),
  },

  // Pin Card
  pinCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    padding: getSpacing(GUIDE_SPACING.md),
    gap: getSpacing(GUIDE_SPACING.md),
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
      },
      android: {
        elevation: 3,
      },
    }),
  },
  pinCardIcon: {
    width: 48,
    height: 48,
    borderRadius: GUIDE_BORDER_RADIUS.md,
    justifyContent: "center",
    alignItems: "center",
  },
  pinCardContent: {
    flex: 1,
  },
  pinCardName: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  pinCardType: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textSecondary,
    marginTop: 2,
  },
  pinCardDesc: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textMuted,
    marginTop: 2,
  },
  pinCardDelete: {
    padding: getSpacing(GUIDE_SPACING.xs),
  },

  // Empty State
  emptyState: {
    alignItems: "center",
    paddingVertical: getSpacing(GUIDE_SPACING.xxl),
  },
  emptyText: {
    fontSize: getFontSize(15),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginTop: getSpacing(GUIDE_SPACING.md),
  },
  emptySubtext: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textMuted,
    marginTop: getSpacing(GUIDE_SPACING.xs),
  },

  // Legend
  legend: {
    backgroundColor: "#FFF",
    marginHorizontal: getSpacing(GUIDE_SPACING.md),
    marginBottom: getSpacing(GUIDE_SPACING.md),
    padding: getSpacing(GUIDE_SPACING.md),
    borderRadius: GUIDE_BORDER_RADIUS.lg,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  legendTitle: {
    fontSize: getFontSize(13),
    fontWeight: "600",
    color: GUIDE_COLORS.textSecondary,
    marginBottom: getSpacing(GUIDE_SPACING.sm),
  },
  legendGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: getSpacing(GUIDE_SPACING.sm),
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  legendLabel: {
    fontSize: getFontSize(11),
    color: GUIDE_COLORS.textSecondary,
  },
});

export default LocationsTab;
