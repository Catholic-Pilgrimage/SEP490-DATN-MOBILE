import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React, { useCallback, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Keyboard,
    KeyboardAvoidingView,
    Linking,
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
import { FullMapModal } from "../../../../components/map/FullMapModal";
import { MapPin } from "../../../../components/map/VietmapView";
import {
    GUIDE_COLORS,
    GUIDE_SPACING,
} from "../../../../constants/guide.constants";
import { SACRED_COLORS } from "../../../../constants/sacred-theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import { getCurrentLocation } from "../../../../services/location/locationService";
import { calculateRouteWithGeometry } from "../../../../services/map/vietmapService";
import { getFontSize } from "../../../../utils/responsive";
import { useGuideSOSActions, useGuideSOSDetail } from "../hooks/useGuideSOS";

// Navigation Types
type RootStackParamList = {
  SOSList: undefined;
};

type SOSDetailScreenRouteProp = RouteProp<
  { params: { id: string; autoOpenMap?: boolean } },
  "params"
>;
type SOSDetailNavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const SOSDetailScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation<SOSDetailNavigationProp>();
  const route = useRoute<SOSDetailScreenRouteProp>();
  const insets = useSafeAreaInsets();
  const { id, autoOpenMap } = route.params;

  const { data: sos, isLoading } = useGuideSOSDetail(id);
  const { assignSOS, resolveSOS, isAssigning, isResolving } =
    useGuideSOSActions();
  const { confirm } = useConfirm();
  const processing = isAssigning || isResolving;
  const locale = i18n.resolvedLanguage === "vi" ? "vi-VN" : "en-US";
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);
  const [isNotesFocused, setIsNotesFocused] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // Map States
  const [mapVisible, setMapVisible] = useState(false);
  const [routeCoordinates, setRouteCoordinates] = useState<[number, number][]>(
    [],
  );
  const [routeSummary, setRouteSummary] = useState<string>("");
  const [routeLoading, setRouteLoading] = useState(false);
  const [guideLocation, setGuideLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const scrollRef = useRef<ScrollView | null>(null);
  const notesSectionYRef = useRef(0);
  const sosNote = String(sos?.notes ?? sos?.note ?? "").trim();
  const waitingMinutes = React.useMemo(() => {
    if (!sos?.created_at) return 0;

    const createdAtMs = new Date(sos.created_at).getTime();
    if (Number.isNaN(createdAtMs)) return 0;

    const isCompleted = sos.status === "resolved" || sos.status === "cancelled";
    const endTimestamp = isCompleted
      ? sos.resolved_at || sos.updated_at || sos.created_at
      : new Date().toISOString();
    const endAtMs = new Date(endTimestamp).getTime();

    if (Number.isNaN(endAtMs)) return 0;
    return Math.max(0, Math.floor((endAtMs - createdAtMs) / 60000));
  }, [sos?.created_at, sos?.resolved_at, sos?.status, sos?.updated_at]);

  const scrollToNotesSection = useCallback((animated = true) => {
    const targetY = Math.max(0, notesSectionYRef.current - 20);
    scrollRef.current?.scrollTo({ y: targetY, animated });
  }, []);

  React.useEffect(() => {
    if (sos?.status === "accepted" || sos?.status === "resolved") {
      setResolveNotes(sosNote);
    }
  }, [sos?.status, sosNote]);

  React.useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", (event) => {
      setIsKeyboardVisible(true);
      setKeyboardHeight(event.endCoordinates?.height || 0);

      if (isNotesFocused) {
        setTimeout(() => {
          scrollToNotesSection();
        }, 80);
      }
    });
    const hideSub = Keyboard.addListener("keyboardDidHide", () => {
      setIsKeyboardVisible(false);
      setKeyboardHeight(0);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [isNotesFocused, scrollToNotesSection]);

  const handleAssign = async () => {
    try {
      await assignSOS(id);
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("sos.guideDetail.assignSuccess"),
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error?.message || t("sos.guideDetail.assignError"),
      });
    }
  };

  const handleResolve = async () => {
    const notes = resolveNotes.trim();
    if (!notes) {
      Toast.show({
        type: "error",
        text1: t("sos.guideDetail.notesRequiredTitle"),
        text2: t("sos.guideDetail.notesRequiredMessage"),
      });
      return;
    }

    const isConfirmed = await confirm({
      title: t("sos.guideDetail.resolveConfirmTitle"),
      message: t("sos.guideDetail.resolveConfirmMessage"),
      confirmText: t("sos.guideDetail.resolveConfirmAction"),
      cancelText: t("common.cancel"),
      type: "success",
      iconName: "checkmark-circle",
    });

    if (!isConfirmed) return;

    try {
      await resolveSOS({ id, data: { notes } });
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("sos.guideDetail.resolveSuccess"),
      });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error?.message || t("sos.guideDetail.resolveError"),
      });
    }
  };

  const openMap = useCallback(async () => {
    if (!sos?.latitude || !sos?.longitude) return;
    setMapVisible(true);
    setRouteLoading(true);

    try {
      // Get guide's current location to draw route
      const userLoc = await getCurrentLocation();
      setGuideLocation(userLoc);

      // Calculate Vietmap route
      const route = await calculateRouteWithGeometry(
        { latitude: userLoc.latitude, longitude: userLoc.longitude },
        { latitude: Number(sos.latitude), longitude: Number(sos.longitude) },
      );

      setRouteCoordinates(route.coordinates);
      setRouteSummary(
        t("sos.guideDetail.routeSummary", {
          distance: route.distanceKm.toFixed(2),
          duration: route.durationText,
        }),
      );
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("sos.guideDetail.routeCalculationError"),
      });
      // Even if route fails, map is visible with pins
    } finally {
      setRouteLoading(false);
    }
  }, [sos?.latitude, sos?.longitude, t]);

  // Auto open map effect
  React.useEffect(() => {
    if (autoOpenMap && sos?.latitude && sos?.longitude) {
      openMap();
    }
  }, [autoOpenMap, openMap, sos?.latitude, sos?.longitude]);

  const callPhone = () => {
    const phone = sos?.pilgrim?.phone || sos?.contact_phone;
    if (phone) {
      Linking.openURL(`tel:${phone}`);
    }
  };

  const getMapPins = (): MapPin[] => {
    const pins: MapPin[] = [];
    if (sos?.latitude && sos?.longitude) {
      pins.push({
        id: "sos_location",
        latitude: Number(sos.latitude),
        longitude: Number(sos.longitude),
        title: t("sos.guideDetail.pins.pilgrimTitle"),
        subtitle: sos.message || t("sos.guideDetail.pins.pilgrimSubtitle"),
        color: SACRED_COLORS.danger,
        icon: "🆘",
        markerType: "sos",
        chipMarkerType: "sos",
        chipPlainIcon: true,
        chipUseDefaultPin: false,
        chipIconColor: SACRED_COLORS.danger,
      });
    }
    if (guideLocation) {
      pins.push({
        id: "guide_location",
        latitude: guideLocation.latitude,
        longitude: guideLocation.longitude,
        title: t("sos.guideDetail.pins.guideTitle"),
        subtitle: t("sos.guideDetail.pins.guideSubtitle"),
        color: GUIDE_COLORS.primary,
        icon: "📍",
        chipPlainIcon: true,
        chipUseDefaultPin: true,
        chipIconColor: "#2563EB",
      });
    }
    return pins;
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={SACRED_COLORS.gold} />
      </View>
    );
  }

  if (!sos) return null;

  return (
    <KeyboardAvoidingView
      style={styles.keyboardContainer}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      keyboardVerticalOffset={Platform.OS === "ios" ? insets.top + 12 : 0}
    >
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            accessibilityLabel={t("common.back")}
          >
            <Ionicons
              name="arrow-back"
              size={24}
              color={GUIDE_COLORS.textPrimary}
            />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {t("sos.guideDetail.detailTitle")}
          </Text>
          <View style={styles.headerRight} />
        </View>

        <ScrollView
          ref={scrollRef}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={
            Platform.OS === "ios" ? "interactive" : "on-drag"
          }
          contentContainerStyle={[
            styles.content,
            {
              paddingBottom: isKeyboardVisible
                ? Math.max(insets.bottom + 20, Math.min(keyboardHeight, 280))
                : insets.bottom + 120,
            },
          ]}
        >
          {/* Status Card */}
          <View style={styles.statusCard}>
            <Text style={styles.statusLabel}>
              {t("sos.guideDetail.currentStatus")}
            </Text>
            <View
              style={[
                styles.statusBadge,
                sos.status === "pending" && styles.statusPending,
                sos.status === "accepted" && styles.statusProgress,
                sos.status === "resolved" && styles.statusResolved,
              ]}
            >
              <Text
                style={[
                  styles.statusText,
                  sos.status === "pending" && styles.textPending,
                  sos.status === "accepted" && styles.textProgress,
                  sos.status === "resolved" && styles.textResolved,
                ]}
              >
                {sos.status === "pending"
                  ? t("sos.statusPending")
                  : sos.status === "accepted"
                    ? t("sos.statusProcessing")
                    : sos.status === "resolved"
                      ? t("sos.statusResolved")
                      : t("sos.statusCancelled")}
              </Text>
            </View>
          </View>

          {/* Message Card */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="message"
                size={20}
                color={SACRED_COLORS.gold}
              />
              <Text style={styles.sectionTitle}>
                {t("sos.guideDetail.requestContent")}
              </Text>
            </View>
            <Text style={styles.messageText}>
              {sos.message || t("sos.guideDetail.noDetailMessage")}
            </Text>
            <View style={styles.metaRow}>
              <Text style={styles.timestamp}>
                {t("sos.guideDetail.sentAt", {
                  time: new Date(sos.created_at).toLocaleString(locale, {
                    hour: "2-digit",
                    minute: "2-digit",
                  }),
                })}
              </Text>
              <Text style={styles.slaTimer}>
                {t("sos.guideDetail.waitingMinutes", {
                  count: waitingMinutes,
                })}
              </Text>
            </View>
          </View>

          {/* Pilgrim Info */}
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeader}>
              <MaterialIcons
                name="person"
                size={20}
                color={SACRED_COLORS.gold}
              />
              <Text style={styles.sectionTitle}>
                {t("sos.guideDetail.requesterInfo")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>
                {t("sos.guideDetail.fullName")}
              </Text>
              <Text style={styles.infoValue}>
                {sos.pilgrim?.full_name || t("sos.guideDetail.notAvailable")}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>{t("sos.phone")}:</Text>
              <TouchableOpacity
                style={styles.phoneWrapper}
                onPress={callPhone}
                disabled={!sos.pilgrim?.phone && !sos.contact_phone}
              >
                <Text
                  style={[
                    styles.infoValue,
                    (sos.pilgrim?.phone || sos.contact_phone) && {
                      color: GUIDE_COLORS.primary,
                      textDecorationLine: "underline",
                    },
                  ]}
                >
                  {sos.pilgrim?.phone ||
                    sos.contact_phone ||
                    t("sos.guideDetail.noPhone")}
                </Text>
                {(sos.pilgrim?.phone || sos.contact_phone) && (
                  <View style={styles.miniCallIcon}>
                    <Ionicons name="call" size={14} color="#FFF" />
                  </View>
                )}
              </TouchableOpacity>
            </View>
          </View>

          {/* Location Box */}
          {sos.latitude && sos.longitude && (
            <View style={styles.locationCard}>
              <View
                style={[
                  styles.sectionHeader,
                  { justifyContent: "space-between", marginBottom: 12 },
                ]}
              >
                <View
                  style={{ flexDirection: "row", alignItems: "center", gap: 6 }}
                >
                  <MaterialIcons
                    name="my-location"
                    size={20}
                    color={GUIDE_COLORS.primary}
                  />
                  <Text style={styles.sectionTitle}>
                    {t("sos.guideDetail.rescueLocation")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.compactMapButton}
                  onPress={openMap}
                  activeOpacity={0.8}
                >
                  <Ionicons name="map" size={14} color="#FFF" />
                  <Text style={styles.compactMapText}>
                    {t("sos.guideDetail.openMap")}
                  </Text>
                </TouchableOpacity>
              </View>

              <View style={styles.coordinatesWrapper}>
                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>
                    {t("sos.guideDetail.latitude")}
                  </Text>
                  <Text style={styles.coordinateValue}>
                    {Number(sos.latitude).toFixed(6)}
                  </Text>
                </View>
                <View style={styles.coordinateDivider} />
                <View style={styles.coordinateItem}>
                  <Text style={styles.coordinateLabel}>
                    {t("sos.guideDetail.longitude")}
                  </Text>
                  <Text style={styles.coordinateValue}>
                    {Number(sos.longitude).toFixed(6)}
                  </Text>
                </View>
              </View>
            </View>
          )}

          {sos.status === "accepted" && (
            <View
              style={styles.sectionCard}
              onLayout={(event) => {
                notesSectionYRef.current = event.nativeEvent.layout.y;
              }}
            >
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="notes"
                  size={20}
                  color={SACRED_COLORS.gold}
                />
                <Text style={styles.sectionTitle}>
                  {t("sos.guideDetail.supportNotes")}
                </Text>
              </View>
              <TextInput
                style={styles.notesInput}
                placeholder={t("sos.guideDetail.notesPlaceholder")}
                placeholderTextColor={GUIDE_COLORS.textMuted}
                multiline
                value={resolveNotes}
                onChangeText={setResolveNotes}
                onBlur={() => setIsNotesFocused(false)}
                onFocus={() => {
                  setIsNotesFocused(true);
                  setTimeout(() => {
                    scrollToNotesSection();
                  }, 80);
                }}
                textAlignVertical="top"
                maxLength={500}
              />
              <Text style={styles.notesHint}>
                {t("sos.guideDetail.notesHint")}
              </Text>
            </View>
          )}

          {sos.status === "resolved" && !!sosNote && (
            <View style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <MaterialIcons
                  name="notes"
                  size={20}
                  color={SACRED_COLORS.success}
                />
                <Text style={styles.sectionTitle}>
                  {t("sos.guideDetail.supportNotes")}
                </Text>
              </View>
              <View style={styles.resolvedNotesBox}>
                <Text style={styles.resolvedNotesText}>{sosNote}</Text>
              </View>
            </View>
          )}
        </ScrollView>

        {/* Action Buttons Floating Footer */}
        {!isKeyboardVisible && (
          <View style={[styles.footer, { bottom: insets.bottom + 16 }]}>
            {sos.status === "pending" && (
              <TouchableOpacity
                style={[styles.actionButton, styles.buttonPrimary]}
                onPress={handleAssign}
                disabled={processing}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons
                      name="assignment-turned-in"
                      size={24}
                      color="#FFF"
                    />
                    <Text style={styles.buttonText}>
                      {t("sos.guideDetail.acceptNow")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {sos.status === "accepted" && (
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.buttonSuccess,
                  (!resolveNotes.trim() || processing) && styles.buttonDisabled,
                ]}
                onPress={handleResolve}
                disabled={processing || !resolveNotes.trim()}
              >
                {processing ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={24} color="#FFF" />
                    <Text style={styles.buttonText}>
                      {t("sos.guideDetail.completeSupport")}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            {sos.status === "resolved" && (
              <View style={styles.completedMessage}>
                <MaterialIcons
                  name="verified"
                  size={24}
                  color={SACRED_COLORS.success}
                />
                <Text style={styles.completedText}>
                  {t("sos.guideDetail.requestResolved")}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Map Modal */}
        <FullMapModal
          visible={mapVisible}
          onClose={() => setMapVisible(false)}
          pins={getMapPins()}
          title={t("sos.guideDetail.mapTitle")}
          routeCoordinates={routeCoordinates}
          routeSummary={routeSummary}
          routeLoading={routeLoading}
          showUserLocation={true}
        />
      </View>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  keyboardContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    backgroundColor: SACRED_COLORS.parchment,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: GUIDE_SPACING.lg,
    paddingBottom: GUIDE_SPACING.md,
    backgroundColor: GUIDE_COLORS.background,
    borderBottomWidth: 1,
    borderBottomColor: GUIDE_COLORS.borderLight,
  },
  backButton: {
    padding: GUIDE_SPACING.sm,
    marginLeft: -GUIDE_SPACING.sm,
  },
  headerTitle: {
    fontSize: getFontSize(18),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  headerRight: {
    width: 40,
  },
  content: {
    padding: GUIDE_SPACING.lg,
    paddingBottom: 100,
  },
  statusCard: {
    backgroundColor: GUIDE_COLORS.surface,
    padding: GUIDE_SPACING.lg,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  statusLabel: {
    fontSize: getFontSize(13),
    color: GUIDE_COLORS.textSecondary,
    marginBottom: 8,
  },
  statusBadge: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: GUIDE_COLORS.gray200,
  },
  statusPending: { backgroundColor: SACRED_COLORS.danger + "20" },
  statusProgress: { backgroundColor: SACRED_COLORS.gold + "20" },
  statusResolved: { backgroundColor: SACRED_COLORS.success + "20" },
  statusText: {
    fontSize: getFontSize(14),
    fontWeight: "700",
    color: GUIDE_COLORS.textPrimary,
  },
  textPending: { color: SACRED_COLORS.danger },
  textProgress: { color: SACRED_COLORS.gold },
  textResolved: { color: SACRED_COLORS.success },

  sectionCard: {
    backgroundColor: GUIDE_COLORS.surface,
    padding: GUIDE_SPACING.lg,
    borderRadius: 12,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: GUIDE_SPACING.md,
    gap: 8,
  },
  sectionTitle: {
    fontSize: getFontSize(16),
    fontWeight: "600",
    color: GUIDE_COLORS.textPrimary,
  },
  messageText: {
    fontSize: getFontSize(15),
    color: GUIDE_COLORS.textPrimary,
    lineHeight: 22,
    marginBottom: GUIDE_SPACING.sm,
  },
  timestamp: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textMuted,
    fontStyle: "italic",
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
    justifyContent: "space-between",
  },
  infoLabel: {
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textSecondary,
    width: "35%",
  },
  infoValue: {
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textPrimary,
    fontWeight: "500",
    width: "65%",
    textAlign: "right",
  },

  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 4,
  },
  slaTimer: {
    fontSize: getFontSize(12),
    color: "#E74C3C", // Red for urgency
    fontWeight: "600",
  },
  phoneWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flex: 1,
    justifyContent: "flex-end",
  },
  miniCallIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: GUIDE_COLORS.success,
    justifyContent: "center",
    alignItems: "center",
  },
  locationCard: {
    backgroundColor: GUIDE_COLORS.surface,
    padding: GUIDE_SPACING.lg,
    borderRadius: 12,
    marginBottom: GUIDE_SPACING.lg,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.primary + "30", // Soft primary border
    shadowColor: GUIDE_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  coordinatesWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
  },
  coordinateItem: {
    flex: 1,
    alignItems: "center",
  },
  coordinateLabel: {
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textSecondary,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  coordinateValue: {
    fontSize: getFontSize(16),
    fontWeight: "bold",
    color: GUIDE_COLORS.textPrimary,
    fontFamily: Platform.OS === "ios" ? "Menlo" : "monospace",
  },
  coordinateDivider: {
    width: 1,
    height: "80%",
    backgroundColor: GUIDE_COLORS.borderLight,
    marginHorizontal: 12,
  },
  compactMapButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: GUIDE_COLORS.primary,
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 20,
    gap: 4,
    shadowColor: GUIDE_COLORS.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  compactMapText: {
    fontSize: getFontSize(12),
    fontWeight: "bold",
    color: "#FFF",
  },

  footer: {
    position: "absolute",
    left: GUIDE_SPACING.lg,
    right: GUIDE_SPACING.lg,
    bottom: 20,
    borderRadius: 100,
    backgroundColor: "transparent",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 18,
    borderRadius: 100,
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonPrimary: {
    backgroundColor: SACRED_COLORS.gold,
  },
  buttonSuccess: {
    backgroundColor: SACRED_COLORS.success,
  },
  buttonDisabled: {
    opacity: 0.55,
  },
  buttonText: {
    fontSize: getFontSize(16),
    fontWeight: "bold",
    color: "#FFF",
    textTransform: "uppercase",
  },
  notesInput: {
    minHeight: 96,
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    borderRadius: 10,
    backgroundColor: GUIDE_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textPrimary,
  },
  notesHint: {
    marginTop: 8,
    fontSize: getFontSize(12),
    color: GUIDE_COLORS.textSecondary,
    lineHeight: 18,
  },
  resolvedNotesBox: {
    borderWidth: 1,
    borderColor: GUIDE_COLORS.borderLight,
    borderRadius: 10,
    backgroundColor: GUIDE_COLORS.background,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  resolvedNotesText: {
    fontSize: getFontSize(14),
    color: GUIDE_COLORS.textPrimary,
    lineHeight: 20,
  },
  completedMessage: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: SACRED_COLORS.success + "15",
    padding: GUIDE_SPACING.md,
    borderRadius: 100,
    borderWidth: 1,
    borderColor: SACRED_COLORS.success,
  },
  completedText: {
    fontSize: getFontSize(16),
    fontWeight: "600",
    color: SACRED_COLORS.success,
  },
});

export default SOSDetailScreen;
