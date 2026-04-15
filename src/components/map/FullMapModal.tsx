import { MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { useTranslation } from "react-i18next";
import { VIETMAP_CONFIG } from "../../config/map.config";
import { toastConfig } from "../../config/toast.config";
import {
  MapPin,
  MapPinGlyph,
  VietmapView,
  VietmapViewRef,
} from "./VietmapView";
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
  onUserLocationUpdate?: (location: { latitude: number; longitude: number }) => void;
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

interface VietmapSearchItem {
  ref_id?: string;
  name?: string;
  address?: string;
  display?: string;
  lat?: number | string;
  lng?: number | string;
}

interface VietmapReverseItem {
  address?: string;
  display?: string;
  name?: string;
  housenumber?: string;
  house_number?: string;
  street?: string;
  street_name?: string;
  ward?: string;
  district?: string;
  province?: string;
  city?: string;
}

const normalizeText = (value: unknown): string =>
  typeof value === "string" ? value.trim() : "";

const uniqueParts = (parts: string[]) => {
  const seen = new Set<string>();
  return parts.filter((part) => {
    const key = part.toLowerCase();
    if (!part || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const detailedAddressFromReverseItem = (item?: VietmapReverseItem): string => {
  if (!item) return "";

  const houseNo = normalizeText(item.housenumber) || normalizeText(item.house_number);
  const street = normalizeText(item.street) || normalizeText(item.street_name);
  const ward = normalizeText(item.ward);
  const district = normalizeText(item.district);
  const province = normalizeText(item.province) || normalizeText(item.city);

  const roadPart = [houseNo, street].filter(Boolean).join(" ").trim();
  const granular = uniqueParts([roadPart, ward, district, province]).join(", ");
  if (granular) return granular;

  const display = normalizeText(item.display);
  const address = normalizeText(item.address);
  const name = normalizeText(item.name);
  if (display) return display;
  if (name && address) return `${name}, ${address}`;
  return address || name;
};

export const FullMapModal: React.FC<FullMapModalProps> = ({
  visible,
  onClose,
  pins,
  initialRegion,
  tileUrlTemplate,
  title,
  showUserLocation = true,
  onUserLocationUpdate,
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
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [lastTapCoords, setLastTapCoords] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [searchResults, setSearchResults] = useState<VietmapSearchItem[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchMarkerPin, setSearchMarkerPin] = useState<MapPin | null>(null);
  const initialRegionRef = useRef<{ latitude: number; longitude: number; zoom: number } | null>(null);

  useEffect(() => {
    if (!visible) {
      initialRegionRef.current = null;
      return;
    }
    if (!initialRegionRef.current) {
      initialRegionRef.current = {
        latitude: initialRegion?.latitude || pins[0]?.latitude || 10.762622,
        longitude: initialRegion?.longitude || pins[0]?.longitude || 106.660172,
        zoom: initialRegion?.zoom || 15,
      };
    }
  }, [visible, initialRegion, pins]);

  const stableInitialRegion = useMemo(
    () =>
      initialRegionRef.current || {
        latitude: initialRegion?.latitude || pins[0]?.latitude || 10.762622,
        longitude: initialRegion?.longitude || pins[0]?.longitude || 106.660172,
        zoom: initialRegion?.zoom || 15,
      },
    [initialRegion, pins],
  );

  const mergedPins = React.useMemo(() => {
    if (isSelectingLocation) return pins;
    if (!searchMarkerPin) return pins;
    return [...pins, searchMarkerPin];
  }, [isSelectingLocation, pins, searchMarkerPin]);

  const runVietmapSearch = useCallback(async (query: string) => {
    const keyword = query.trim();
    if (keyword.length < 2) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    try {
      setSearchLoading(true);
      const searchUrl = `${VIETMAP_CONFIG.SEARCH_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&text=${encodeURIComponent(keyword)}`;
      const response = await fetch(searchUrl);
      const data = await response.json();
      if (Array.isArray(data)) {
        setSearchResults(data.slice(0, 6));
      } else {
        setSearchResults([]);
      }
    } catch {
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  }, []);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchText(value);

      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }

      if (value.trim().length < 2) {
        setSearchResults([]);
        setSearchLoading(false);
        return;
      }

      searchDebounceRef.current = setTimeout(() => {
        void runVietmapSearch(value);
      }, 350);
    },
    [runVietmapSearch],
  );

  const resolveSearchCoordinates = useCallback(async (item: VietmapSearchItem) => {
    const lat = Number(item.lat);
    const lng = Number(item.lng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) {
      return { latitude: lat, longitude: lng };
    }

    if (!item.ref_id) return null;

    try {
      const detailUrl = `${VIETMAP_CONFIG.PLACE_DETAIL_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&refid=${item.ref_id}`;
      const detailRes = await fetch(detailUrl);
      const detailData = await detailRes.json();
      const detailLat = Number(detailData?.lat);
      const detailLng = Number(detailData?.lng);
      if (Number.isFinite(detailLat) && Number.isFinite(detailLng)) {
        return { latitude: detailLat, longitude: detailLng };
      }
      return null;
    } catch {
      return null;
    }
  }, []);

  const reverseGeocodeLabel = useCallback(async (coords: { latitude: number; longitude: number }) => {
    try {
      const reverseUrl = `${VIETMAP_CONFIG.REVERSE_GEOCODING_URL}?apikey=${VIETMAP_CONFIG.SERVICES_KEY}&lat=${coords.latitude}&lng=${coords.longitude}&display_type=1`;
      const reverseRes = await fetch(reverseUrl);
      const reverseData = await reverseRes.json();
      const candidates: VietmapReverseItem[] = Array.isArray(reverseData)
        ? reverseData
        : Array.isArray(reverseData?.value)
          ? reverseData.value
          : [];

      // Prefer the most specific candidate (usually longer formatted address).
      const best = candidates
        .map((item) => detailedAddressFromReverseItem(item as VietmapReverseItem))
        .filter(Boolean)
        .sort((a, b) => b.length - a.length)[0];

      return best || `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    } catch {
      return `${coords.latitude.toFixed(6)}, ${coords.longitude.toFixed(6)}`;
    }
  }, []);

  const handleSearchResultPress = useCallback(
    async (item: VietmapSearchItem) => {
      const label = item.name || item.display || item.address || searchText;
      setSearchText(label);
      setSearchResults([]);

      const coordinates = await resolveSearchCoordinates(item);
      if (!coordinates) {
        Toast.show({
          type: "error",
          text1: "Không tìm thấy vị trí",
          text2: "Không lấy được tọa độ từ kết quả VietMap",
        });
        return;
      }

      mapRef.current?.flyTo(coordinates.latitude, coordinates.longitude, 16);
      setSearchMarkerPin({
        id: "search-location-pin",
        latitude: coordinates.latitude,
        longitude: coordinates.longitude,
        title: label,
        subtitle: item.address || item.display,
        color: "#8B3A3A",
      });
    },
    [resolveSearchCoordinates, searchText],
  );

  React.useEffect(() => {
    return () => {
      if (searchDebounceRef.current) {
        clearTimeout(searchDebounceRef.current);
      }
    };
  }, []);

  const handleFitAllPins = useCallback(() => {
    if (mergedPins.length === 0) return;

    const lats = mergedPins.map((p) => p.latitude);
    const lngs = mergedPins.map((p) => p.longitude);

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
  }, [mergedPins]);

  const handlePinChipPress = useCallback((pin: MapPin) => {
    mapRef.current?.flyTo(pin.latitude, pin.longitude, 16);
    mapRef.current?.selectPin(pin.id);
  }, []);

  const handleMapPress = useCallback(
    async (event: { latitude: number; longitude: number }) => {
      if (isSelectingLocation && onLocationSelected) {
        onLocationSelected(event);
      }
      if (onAddPlace) {
        setLastTapCoords(event);
      }

      const address = await reverseGeocodeLabel(event);
      setSearchText(address);
      setSearchResults([]);
      if (!isSelectingLocation) {
        setSearchMarkerPin({
          id: "search-location-pin",
          latitude: event.latitude,
          longitude: event.longitude,
          title: address,
          subtitle: t("map.selectedLocation", { defaultValue: "Vị trí đã chọn" }),
          color: "#8B3A3A",
        });
      }
    },
    [onAddPlace, isSelectingLocation, onLocationSelected, reverseGeocodeLabel, t],
  );

  const handleAddPress = useCallback(() => {
    if (!onAddPlace) return;
    const coords = lastTapCoords || {
      latitude: stableInitialRegion.latitude,
      longitude: stableInitialRegion.longitude,
    };
    onAddPlace(coords);
  }, [onAddPlace, lastTapCoords, stableInitialRegion]);

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

        <View style={styles.searchBarWrap}>
          <View style={styles.searchBar}>
            <MaterialIcons name="search" size={18} color={COLORS.textSecondary} />
            <TextInput
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder={t("siteDetail.searchNearbyPlaceholder", {
                defaultValue: "Tìm vị trí trên VietMap...",
              })}
              placeholderTextColor={COLORS.textTertiary}
              style={styles.searchInput}
              returnKeyType="search"
            />
            {searchLoading ? (
              <ActivityIndicator size="small" color={COLORS.accent} />
            ) : searchText.length > 0 ? (
              <TouchableOpacity
                onPress={() => {
                  setSearchText("");
                  setSearchResults([]);
                  setSearchMarkerPin(null);
                }}
              >
                <MaterialIcons name="close" size={18} color={COLORS.textSecondary} />
              </TouchableOpacity>
            ) : null}
          </View>
          {searchResults.length > 0 && (
            <View style={styles.searchResultList}>
              {searchResults.map((item, idx) => (
                <TouchableOpacity
                  key={`${item.ref_id || item.name || "result"}-${idx}`}
                  style={styles.searchResultItem}
                  activeOpacity={0.75}
                  onPress={() => {
                    void handleSearchResultPress(item);
                  }}
                >
                  <MaterialIcons name="place" size={16} color={COLORS.accent} />
                  <View style={styles.searchResultTextWrap}>
                    <Text style={styles.searchResultTitle} numberOfLines={1}>
                      {item.name || item.display || item.address || "Địa điểm"}
                    </Text>
                    {!!item.address && (
                      <Text style={styles.searchResultSubtitle} numberOfLines={1}>
                        {item.address}
                      </Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {mergedPins.length > 0 && (
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
                  {mergedPins.length} {t("map.location").toLowerCase()}
                </Text>
              </TouchableOpacity>

              {mergedPins.map((pin) => (
                <TouchableOpacity
                  key={pin.id}
                  style={styles.pinChip}
                  onPress={() => handlePinChipPress(pin)}
                  activeOpacity={0.7}
                >
                  {pin.chipPlainIcon ? (
                    <MapPinGlyph
                      icon={pin.chipUseDefaultPin ? undefined : pin.icon}
                      markerType={
                        pin.chipUseDefaultPin
                          ? undefined
                          : (pin.chipMarkerType ?? pin.markerType)
                      }
                      color={pin.chipIconColor || pin.color || COLORS.accent}
                      size={14}
                    />
                  ) : (
                    <View
                      style={[
                        styles.pinChipDot,
                        { backgroundColor: pin.color || COLORS.accent },
                      ]}
                    >
                      {pin.icon && /^\d+$/.test(pin.icon) ? (
                        <Text style={styles.pinChipNumber}>{pin.icon}</Text>
                      ) : (
                        <MapPinGlyph
                          icon={pin.chipUseDefaultPin ? undefined : pin.icon}
                          markerType={
                            pin.chipUseDefaultPin
                              ? undefined
                              : (pin.chipMarkerType ?? pin.markerType)
                          }
                          color={pin.chipIconColor || COLORS.white}
                          size={12}
                        />
                      )}
                    </View>
                  )}
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
            initialRegion={stableInitialRegion}
            pins={mergedPins}
            showUserLocation={showUserLocation}
            onUserLocationUpdate={onUserLocationUpdate}
            onMapPress={handleMapPress}
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
              {!!searchText && (
                <View style={styles.selectedAddressCard}>
                  <MaterialIcons name="place" size={16} color={COLORS.accent} />
                  <Text style={styles.selectedAddressText} numberOfLines={2}>
                    {searchText}
                  </Text>
                </View>
              )}
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
  searchBarWrap: {
    backgroundColor: COLORS.parchment,
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  searchBar: {
    height: 42,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.sm + 4,
  },
  searchInput: {
    flex: 1,
    color: COLORS.textPrimary,
    fontSize: TYPOGRAPHY.fontSize.md,
    paddingVertical: 0,
  },
  searchResultList: {
    marginTop: SPACING.xs,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    overflow: "hidden",
  },
  searchResultItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: SPACING.sm + 4,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  searchResultTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  searchResultTitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  searchResultSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 1,
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
  pinChipNumber: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.white,
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
  selectedAddressCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.sm + 2,
    paddingVertical: SPACING.sm,
    marginBottom: SPACING.sm,
  },
  selectedAddressText: {
    flex: 1,
    minWidth: 0,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
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
