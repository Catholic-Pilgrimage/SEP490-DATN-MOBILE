import { Ionicons } from "@expo/vector-icons";
import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import dayjs from "dayjs";
import "dayjs/locale/vi";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    Alert,
    Image,
    ImageBackground,
    Linking,
    StyleSheet as RNStyleSheet,
    ScrollView,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    BORDER_RADIUS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useConfirm } from "../../../../hooks/useConfirm";
import {
    cancelSOS,
    getSOSDetail,
} from "../../../../services/api/pilgrim/sosApi";
import { SOSEntity } from "../../../../types/pilgrim";

// Colors Theme (Terracotta)
const THEME = {
  primary: "#C05621",
  primaryLight: "#FDF1E6",
  primarySoft: "#F9E8DC",
  white: "#FFFFFF",
  textMain: "#2D3748",
  textMuted: "#718096",
  locationIcon: "#A16207",
  locationBg: "#FEF3C7",
  contentIcon: "#7C3AED",
  contentBg: "#EDE9FE",
  timeIcon: "#0F766E",
  timeBg: "#CCFBF1",
  border: "#E2E8F0",
  danger: "#E53E3E",
  success: "#38A169",
  info: "#3182CE",
  warning: "#DD6B20",
  gray: "#A0AEC0",
};

type ParamList = {
  SOSDetail: {
    sosId: string;
  };
};

export const SOSDetailScreen = () => {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<ParamList, "SOSDetail">>();
  const { sosId } = route.params;
  const insets = useSafeAreaInsets();
  const [sosData, setSosData] = useState<SOSEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState(false);
  const { confirm } = useConfirm();

  const fetchSOSDetail = useCallback(async () => {
    try {
      const response = await getSOSDetail(sosId);
      if (response.data) {
        setSosData(response.data);
      }
    } catch (error) {
      console.error("Failed to fetch SOS detail", error);
      Alert.alert(t("common.error"), t("sos.fetchError"));
      navigation.goBack();
    } finally {
      setIsLoading(false);
    }
  }, [navigation, sosId, t]);

  useEffect(() => {
    if (sosId) {
      fetchSOSDetail();
    }
  }, [fetchSOSDetail, sosId]);

  const handleCancelSOS = async () => {
    const isConfirmed = await confirm({
      title: t("sos.confirmCancelTitle"),
      message: t("sos.confirmCancelMsg"),
      confirmText: t("sos.cancelRequest"),
      cancelText: t("common.no"),
      type: "danger",
      iconName: "warning",
    });

    if (!isConfirmed) return;

    setIsCancelling(true);
    try {
      await cancelSOS(sosId);
      Toast.show({
        type: "success",
        text1: t("common.success"),
        text2: t("sos.cancelSuccess"),
      });
      setSosData((prev) => (prev ? { ...prev, status: "cancelled" } : null));
    } catch (error) {
      console.error("Failed to cancel SOS", error);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("sos.cancelError"),
      });
    } finally {
      setIsCancelling(false);
    }
  };

  const handleCallGuide = () => {
    if (sosData?.assignedGuide?.phone) {
      Linking.openURL(`tel:${sosData.assignedGuide.phone}`);
    } else {
      Alert.alert(t("sos.notice"), t("sos.noContact"));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={THEME.primary} />
      </View>
    );
  }

  if (!sosData) return null;
  const sosNote = String(sosData.notes ?? sosData.note ?? "").trim();

  const getStatusInfo = (status: string) => {
    switch (status) {
      case "pending":
        return {
          label: t("sos.statusPending"),
          color: THEME.warning,
          icon: "time",
        };
      case "accepted":
      case "processing":
        return {
          label: t("sos.statusProcessing"),
          color: THEME.info,
          icon: "sync",
        };
      case "resolved":
        return {
          label: t("sos.statusResolved"),
          color: THEME.success,
          icon: "checkmark-circle",
        };
      case "cancelled":
        return {
          label: t("sos.statusCancelled"),
          color: THEME.gray,
          icon: "close-circle",
        };
      default:
        return {
          label: t("sos.statusUnknown"),
          color: THEME.gray,
          icon: "help-circle",
        };
    }
  };

  const statusInfo = getStatusInfo(sosData.status);

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[styles.container, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Ionicons name="arrow-back" size={24} color={THEME.textMain} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t("sos.detailTitle")}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom || SPACING.md },
        ]}
      >
        {/* Status Card */}
        <View
          style={[styles.statusCard, { borderLeftColor: statusInfo.color }]}
        >
          <View
            style={[
              styles.statusIcon,
              { backgroundColor: `${statusInfo.color}15` },
            ]}
          >
            <Ionicons
              name={statusInfo.icon as any}
              size={24}
              color={statusInfo.color}
            />
          </View>
          <View>
            <Text style={styles.statusLabel}>{t("sos.statusLabel")}</Text>
            <Text style={[styles.statusValue, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
        </View>

        {/* Main Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t("sos.requestInfo")}</Text>

          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconBadge,
                { backgroundColor: THEME.locationBg },
              ]}
            >
              <Ionicons
                name="location-outline"
                size={18}
                color={THEME.locationIcon}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("sos.location")}</Text>
              <Text style={styles.infoValue}>{sosData.site?.name}</Text>
              <Text style={styles.infoSub}>{sosData.site?.address}</Text>
            </View>
          </View>

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View
              style={[
                styles.infoIconBadge,
                { backgroundColor: THEME.contentBg },
              ]}
            >
              <Ionicons
                name="document-text-outline"
                size={18}
                color={THEME.contentIcon}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("sos.content")}</Text>
              <Text style={styles.infoValue}>{sosData.message}</Text>
            </View>
          </View>

          {!!sosNote && (
            <>
              <View style={styles.divider} />

              <View style={styles.infoRow}>
                <View
                  style={[
                    styles.infoIconBadge,
                    { backgroundColor: `${THEME.success}20` },
                  ]}
                >
                  <Ionicons
                    name="chatbox-ellipses-outline"
                    size={18}
                    color={THEME.success}
                  />
                </View>
                <View style={styles.infoContent}>
                  <Text style={styles.infoLabel}>
                    {t("sos.guideDetail.supportNotes")}
                  </Text>
                  <Text style={styles.infoValue}>{sosNote}</Text>
                </View>
              </View>
            </>
          )}

          <View style={styles.divider} />

          <View style={styles.infoRow}>
            <View
              style={[styles.infoIconBadge, { backgroundColor: THEME.timeBg }]}
            >
              <Ionicons
                name="calendar-outline"
                size={18}
                color={THEME.timeIcon}
              />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoLabel}>{t("sos.timeLabel")}</Text>
              <Text style={styles.infoValue}>
                {dayjs(sosData.created_at)
                  .locale(i18n.language)
                  .format("HH:mm - DD/MM/YYYY")}
              </Text>
            </View>
          </View>
        </View>

        {/* Guide Info (if assigned) */}
        {sosData.assignedGuide && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t("sos.helper")}</Text>
            <View style={styles.guideDetailedCard}>
              <View style={styles.guideHeader}>
                {sosData.assignedGuide.avatar_url ? (
                  <Image
                    source={{ uri: sosData.assignedGuide.avatar_url }}
                    style={styles.guideAvatarImage}
                  />
                ) : (
                  <View style={styles.guideAvatar}>
                    <Ionicons name="person" size={28} color={THEME.primary} />
                  </View>
                )}
                <View style={styles.guideInfo}>
                  <Text style={styles.guideName}>
                    {sosData.assignedGuide.full_name}
                  </Text>
                  <Text style={styles.guideRole}>
                    Local Guide • {sosData.site?.name || t("sos.role")}
                  </Text>
                </View>
              </View>

              <View style={styles.dividerLight} />

              <View style={styles.guideContactRow}>
                <View style={styles.contactDetails}>
                  <Text style={styles.contactLabel}>
                    {t("sos.phone", { defaultValue: "Số điện thoại" })}
                  </Text>
                  <Text style={styles.contactValue}>
                    {sosData.assignedGuide.phone || t("sos.noContact")}
                  </Text>
                </View>
                <TouchableOpacity
                  style={styles.callActionButton}
                  onPress={handleCallGuide}
                >
                  <Ionicons name="call" size={20} color={THEME.white} />
                  <Text style={styles.callActionText}>
                    {t("sos.call", { defaultValue: "Gọi ngay" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}

        {/* Actions */}
        {sosData.status === "pending" && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancelSOS}
            disabled={isCancelling}
          >
            {isCancelling ? (
              <ActivityIndicator color={THEME.danger} />
            ) : (
              <>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={THEME.danger}
                />
                <Text style={styles.cancelButtonText}>
                  {t("sos.cancelRequest")}
                </Text>
              </>
            )}
          </TouchableOpacity>
        )}
      </ScrollView>
    </ImageBackground>
  );
};

const styles = RNStyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "transparent",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
    backgroundColor: "transparent",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(240, 240, 240, 0.5)",
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
  },
  headerTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: THEME.textMain,
  },
  content: {
    padding: SPACING.md,
  },
  statusCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.white,
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    borderLeftWidth: 4,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  statusIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
  },
  statusLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: THEME.textMuted,
    textTransform: "uppercase",
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
  },
  section: {
    backgroundColor: THEME.white,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.lg,
    marginBottom: SPACING.md,
    ...SHADOWS.small,
  },
  sectionTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: THEME.textMain,
    marginBottom: SPACING.md,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.md,
  },
  infoIconBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: THEME.textMuted,
    marginBottom: 2,
  },
  infoValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: THEME.textMain,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  infoSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: THEME.textMuted,
    marginTop: 2,
  },
  divider: {
    height: 1,
    backgroundColor: THEME.border,
    marginVertical: SPACING.md,
    marginLeft: 36, // align with content
  },
  guideDetailedCard: {
    backgroundColor: THEME.primaryLight,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: `${THEME.primary}20`,
    overflow: "hidden",
  },
  guideHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.lg,
  },
  guideAvatarImage: {
    width: 56,
    height: 56,
    borderRadius: 28,
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  guideAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: `${THEME.primary}15`,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.md,
    borderWidth: 2,
    borderColor: THEME.white,
  },
  guideInfo: {
    flex: 1,
  },
  guideName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: THEME.textMain,
  },
  guideRole: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: THEME.primary,
    marginTop: 4,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
  dividerLight: {
    height: 1,
    backgroundColor: `${THEME.primary}20`,
    marginHorizontal: SPACING.lg,
  },
  guideContactRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: SPACING.lg,
    backgroundColor: `${THEME.primary}05`,
  },
  contactDetails: {
    flex: 1,
  },
  contactLabel: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: THEME.textMuted,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: THEME.textMain,
  },
  callActionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: THEME.success,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.full,
    gap: 6,
    ...SHADOWS.small,
  },
  callActionText: {
    color: THEME.white,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  cancelButton: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    padding: SPACING.lg,
    backgroundColor: THEME.white,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: THEME.danger,
    marginTop: SPACING.sm,
  },
  cancelButtonText: {
    color: THEME.danger,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
});

export default SOSDetailScreen;
