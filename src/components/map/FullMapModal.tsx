import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { toastConfig } from "../../config/toast.config";
import { MapPin, VietmapView, VietmapViewRef } from "./VietmapView";
import {
  COLORS,
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
  SHADOWS,
} from "../../constants/theme.constants";

interface FullMapModalProps {
  visible: boolean;
  onClose: () => void;
  pins: MapPin[];
  initialRegion?: {
    latitude: number;
    longitude: number;
    zoom: number;
  };
  tileUrlTemplate?: string;
  title?: string;
  showUserLocation?: boolean;
  /** When provided, shows an "add place" FAB. Called with coordinates when user taps the button. */
  onAddPlace?: (coords: { latitude: number; longitude: number }) => void;
  /** When true, the next map tap will call onLocationSelected instead of normal behavior. */
  isSelectingLocation?: boolean;
  onLocationSelected?: (coords: { latitude: number; longitude: number }) => void;
  onConfirmLocationSelection?: () => void;
  
  tapRelocatesPin?: boolean;

  /** Single continuous route polyline [lng, lat][] */
  routeCoordinates?: [number, number][];
  /** Multiple color-coded route segments */
  routeSegments?: { coordinates: [number, number][]; color?: string }[];
  /** Summary text shown at the bottom, e.g. "120 km • 2 giờ 15 phút" */
  routeSummary?: string;
  /** True while route is being calculated */
  routeLoading?: boolean;
}

export const FullMapModal: React.FC<FullMapModalProps> = ({
  visible,
  onClose,
  pins,
  initialRegion,
  tileUrlTemplate,
  title,
  showUserLocation = true,
  onAddPlace,
  isSelectingLocation = false,
  onLocationSelected,
  onConfirmLocationSelection,
  tapRelocatesPin: tapRelocatesPinProp,
  routeCoordinates,
  routeSegments,
  routeSummary,
  routeLoading = false,
}) => {
  const tapRelocatesPin = tapRelocatesPinProp ?? isSelectingLocation;
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const mapRef = useRef<VietmapViewRef>(null);
  const [lastTapCoords, setLastTapCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const handleFitAllPins = useCallback(() => {
    if (pins.length === 0) return;

    const lats = pins.map((p) => p.latitude);
    const lngs = pins.map((p) => p.longitude);

    const minLat = Math.min(...lats);
    const maxLat = Math.max(...lats);
    const minLng = Math.min(...lngs);
    const maxLng = Math.max(...lngs);

    const centerLat = (minLat + maxLat) / 2;
    const centerLng = (minLng + maxLng) / 2;

    const latDiff = maxLat - minLat;
    const lngDiff = maxLng - minLng;
    const maxDiff = Math.max(latDiff, lngDiff);

    let zoom = 15;
    if (maxDiff > 0.1) zoom = 12;
    if (maxDiff > 0.5) zoom = 10;
    if (maxDiff > 1) zoom = 8;

    mapRef.current?.flyTo(centerLat, centerLng, zoom);
  }, [pins]);

  const handlePinChipPress = useCallback((pin: MapPin) => {
    mapRef.current?.flyTo(pin.latitude, pin.longitude, 16);
    mapRef.current?.selectPin(pin.id);
  }, []);

  const handleMapPress = useCallback(
    (event: { latitude: number; longitude: number }) => {
      if (isSelectingLocation && onLocationSelected) {
        onLocationSelected(event);
        return;
      }
      if (onAddPlace) {
        setLastTapCoords(event);
      }
    },
    [onAddPlace, isSelectingLocation, onLocationSelected],
  );

  const mapPressEnabled =
    (isSelectingLocation && onLocationSelected) || onAddPlace;

  const handleAddPress = useCallback(() => {
    if (!onAddPlace) return;
    const coords = lastTapCoords || {
      latitude: initialRegion?.latitude || pins[0]?.latitude || 10.762622,
      longitude: initialRegion?.longitude || pins[0]?.longitude || 106.660172,
    };
    onAddPlace(coords);
  }, [onAddPlace, lastTapCoords, initialRegion, pins]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={COLORS.parchment} />

        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="arrow-back" size={24} color={COLORS.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.title}>{title || t("locationsTab.fullMapTitle")}</Text>
          <TouchableOpacity style={styles.fitButton} onPress={handleFitAllPins}>
            <MaterialIcons name="fit-screen" size={24} color={COLORS.accent} />
          </TouchableOpacity>
        </View>

        {pins.length > 0 && (
          <View style={styles.legendBar}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.pinChipList}
            >
              <TouchableOpacity
                style={styles.pinChipAll}
                onPress={handleFitAllPins}
                activeOpacity={0.7}
              >
                <MaterialIcons name="place" size={14} color={COLORS.accent} />
                <Text style={styles.pinChipAllText}>
                  {pins.length} {t("map.location").toLowerCase()}
                </Text>
              </TouchableOpacity>

              {pins.map((pin) => (
                <TouchableOpacity
                  key={pin.id}
                  style={styles.pinChip}
                  onPress={() => handlePinChipPress(pin)}
                  activeOpacity={0.7}
                >
                  <View
                    style={[
                      styles.pinChipDot,
                      { backgroundColor: pin.color || COLORS.accent },
                    ]}
                  >
                    <Text style={styles.pinChipEmoji}>{pin.icon || "📍"}</Text>
                  </View>
                  <Text style={styles.pinChipText} numberOfLines={1}>
                    {pin.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        )}

        <View style={styles.mapWrapper}>
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
            onMapPress={mapPressEnabled ? handleMapPress : undefined}
            tileUrlTemplate={tileUrlTemplate}
            style={styles.map}
            tapRelocatesPin={tapRelocatesPin}
            routeCoordinates={routeCoordinates}
            routeSegments={routeSegments}
          />

          {onAddPlace && !isSelectingLocation && (
            <TouchableOpacity
              style={[styles.addButton, { bottom: SPACING.lg + insets.bottom }]}
              onPress={handleAddPress}
              activeOpacity={0.85}
            >
              <LinearGradient
                colors={[COLORS.accent, "#B8860B"]}
                style={styles.addButtonGradient}
              >
                <MaterialIcons name="add-location" size={24} color={COLORS.white} />
              </LinearGradient>
            </TouchableOpacity>
          )}

          {isSelectingLocation && onConfirmLocationSelection && (
            <View
              style={[
                styles.selectionFooter,
                { paddingBottom: SPACING.md + insets.bottom },
              ]}
            >
              <Text style={styles.selectionHint}>
                {t("locationsTab.modal.selectOnMapHint")}
              </Text>
              <TouchableOpacity
                style={styles.selectionConfirmBtn}
                onPress={onConfirmLocationSelection}
                activeOpacity={0.85}
              >
                <MaterialIcons name="check" size={22} color={COLORS.white} />
                <Text style={styles.selectionConfirmText}>
                  {t("locationsTab.modal.doneSelectLocation")}
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </View>

        {/* Route summary bar */}
        {(routeLoading || routeSummary) && (
          <View style={[styles.routeSummaryBar, { paddingBottom: Math.max(insets.bottom, 8) + 8 }]}>
            {routeLoading ? (
              <View style={styles.routeSummaryContent}>
                <ActivityIndicator size="small" color={COLORS.accent} />
                <Text style={styles.routeSummaryText}>Đang tính tuyến đường...</Text>
              </View>
            ) : routeSummary ? (
              <View style={styles.routeSummaryContent}>
                <MaterialIcons name="directions" size={20} color={COLORS.accent} />
                <Text style={styles.routeSummaryText}>{routeSummary}</Text>
              </View>
            ) : null}
          </View>
        )}

        <Toast config={toastConfig} />
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.parchment,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.md,
    backgroundColor: COLORS.parchment,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.accent,
    ...Platform.select({
      ios: {
        ...SHADOWS.small,
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
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.holy,
    flex: 1,
    textAlign: "center",
  },
  fitButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.white,
    justifyContent: "center",
    alignItems: "center",
  },
  legendBar: {
    backgroundColor: COLORS.parchment,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  pinChipList: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  pinChipAll: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: SPACING.md,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accentSubtle,
    borderWidth: 1,
    borderColor: COLORS.accent,
  },
  pinChipAllText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.accent,
  },
  pinChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: 6,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    maxWidth: 180,
    ...SHADOWS.subtle,
  },
  pinChipDot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: "center",
    alignItems: "center",
  },
  pinChipEmoji: {
    fontSize: 11,
  },
  pinChipText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  mapWrapper: {
    flex: 1,
  },
  map: {
    flex: 1,
  },
  addButton: {
    position: "absolute",
    right: SPACING.md,
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
  selectionFooter: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm,
    backgroundColor: "rgba(253, 248, 240, 0.97)",
    borderTopWidth: 1,
    borderTopColor: COLORS.accent,
    gap: SPACING.sm,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: { width: 0, height: -4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  selectionHint: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  selectionConfirmBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.sm,
    backgroundColor: COLORS.accent,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
  },
  selectionConfirmText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.white,
  },
  routeSummaryBar: {
    backgroundColor: "rgba(253, 248, 240, 0.97)",
    borderTopWidth: 1,
    borderTopColor: COLORS.border,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.sm + 2,
  },
  routeSummaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  routeSummaryText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    flex: 1,
  },
});

export default FullMapModal;
