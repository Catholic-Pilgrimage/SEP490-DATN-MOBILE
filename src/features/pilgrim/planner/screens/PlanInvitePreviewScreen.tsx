import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  ImageBackground,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { GuestLoginModal } from "../../../../components/ui/GuestLoginModal";
import {
  BORDER_RADIUS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import { RootStackParamList } from "../../../../navigation/RootNavigator";
import { pilgrimPlannerApi } from "../../../../services/api/pilgrim";
import { PlanInvite } from "../../../../types/pilgrim";

const BG_IMAGE = require("../../../../../assets/images/bg1.jpg");

const TRANSPORT_MAP: Record<
  string,
  { label: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  car: { label: "Ô tô", icon: "car-outline" },
  bus: { label: "Xe buýt", icon: "bus-outline" },
  motorbike: { label: "Xe máy", icon: "bicycle-outline" },
  walk: { label: "Đi bộ", icon: "walk-outline" },
  train: { label: "Tàu hỏa", icon: "train-outline" },
  plane: { label: "Máy bay", icon: "airplane-outline" },
  other: { label: "Khác", icon: "ellipsis-horizontal-outline" },
};

// Màu sắc giống LoginScreen
const INVITE_COLORS = {
  primary: "#cfaa3a",
  textMain: "#191710",
  textMuted: "#6C8CA3",
  borderLight: "#e4e0d3",
  surface: "#ffffff",
  danger: "#dc3545",
  dangerBg: "#f8d7da",
  success: "#28a745",
  successBg: "#d4edda",
  warningBg: "#fff3cd",
  warning: "#856404",
};

type Props = NativeStackScreenProps<RootStackParamList, "PlanInvitePreview">;

const PlanInvitePreviewScreen = ({ route, navigation }: Props) => {
  const { token } = route.params;
  const { isGuest, user } = useAuth();
  const insets = useSafeAreaInsets();

  const [invite, setInvite] = useState<PlanInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showGuestLogin, setShowGuestLogin] = useState(false);

  /**
   * Lưu token vào AsyncStorage trước khi user được chuyển sang màn hình Login.
   * Sau khi login thành công, LoginScreen sẽ đọc key này và navigate trở lại.
   */
  const handleBeforeLogin = useCallback(async () => {
    await AsyncStorage.setItem("pending_invite_token", token);
  }, [token]);

  useEffect(() => {
    fetchInvitePreview();
  }, [token]);

  const fetchInvitePreview = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pilgrimPlannerApi.getPlanByInviteToken(token);
      if (res.success && res.data) {
        setInvite(res.data);
      } else {
        setError(res.message || "Không tìm thấy lời mời.");
      }
    } catch (e: any) {
      setError(e.message || "Lời mời không hợp lệ hoặc đã hết hạn.");
    } finally {
      setLoading(false);
    }
  };

  const handleRespond = async (action: "accept" | "reject") => {
    // Nếu chưa đăng nhập → hiện GuestLoginModal
    if (isGuest || !user) {
      setShowGuestLogin(true);
      return;
    }

    try {
      setResponding(true);
      const res = await pilgrimPlannerApi.respondToInvite(token, { action });
      if (res.success) {
        if (action === "accept") {
          Toast.show({
            type: "success",
            text1: "Tham gia thành công! 🎉",
            text2: res.message,
            visibilityTime: 2500,
            onHide: () => navigation.navigate("Main"),
          });
        } else {
          Toast.show({
            type: "info",
            text1: "Đã từ chối",
            text2: res.message,
            visibilityTime: 2000,
            onHide: () => navigation.goBack(),
          });
        }
      } else {
        Toast.show({
          type: "error",
          text1: "Không thể phản hồi",
          text2: res.message || res.error?.message || "Vui lòng thử lại.",
        });
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Đã xảy ra lỗi",
        text2: e.message || "Vui lòng thử lại.",
      });
    } finally {
      setResponding(false);
    }
  };

  // ─── Loading ───
  if (loading) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={[
            "transparent",
            "rgba(253,248,240,0.92)",
            "rgba(253,248,240,0.99)",
          ]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={INVITE_COLORS.primary} />
          <Text style={styles.loadingText}>Đang tải thông tin lời mời...</Text>
        </View>
      </ImageBackground>
    );
  }

  // ─── Error ───
  if (error || !invite) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        <LinearGradient
          colors={[
            "transparent",
            "rgba(253,248,240,0.92)",
            "rgba(253,248,240,0.99)",
          ]}
          style={StyleSheet.absoluteFillObject}
          start={{ x: 0, y: 0.35 }}
          end={{ x: 0, y: 1 }}
        />
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={22} color={INVITE_COLORS.textMain} />
        </TouchableOpacity>
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <View style={styles.errorSection}>
            <Ionicons
              name="alert-circle-outline"
              size={64}
              color={INVITE_COLORS.danger}
            />
            <Text style={styles.errorTitle}>Lời mời không hợp lệ</Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>Quay lại</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  const planner = invite.planner;
  const isExpired = invite.status === "expired";
  const isAlreadyResponded =
    invite.status === "accepted" || invite.status === "rejected";

  // ─── Main ───
  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Gradient: phần trên trong suốt → phần dưới kem sáng */}
      <LinearGradient
        colors={[
          "transparent",
          "rgba(253,248,240,0.92)",
          "rgba(253,248,240,0.99)",
        ]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0, y: 1 }}
      />

      {/* Close button nổi trên ảnh */}
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + 60, paddingBottom: insets.bottom + 120 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Icon — đổi theo status */}
        <View
          style={[
            styles.iconWrapper,
            isAlreadyResponded && {
              backgroundColor:
                invite.status === "accepted"
                  ? "rgba(40,167,69,0.12)"
                  : "rgba(220,53,69,0.12)",
              borderColor:
                invite.status === "accepted"
                  ? "rgba(40,167,69,0.35)"
                  : "rgba(220,53,69,0.35)",
            },
            isExpired && {
              backgroundColor: "rgba(133,100,4,0.1)",
              borderColor: "rgba(133,100,4,0.3)",
            },
          ]}
        >
          <Ionicons
            name={
              isExpired
                ? "time-outline"
                : invite.status === "accepted"
                  ? "checkmark-circle-outline"
                  : invite.status === "rejected"
                    ? "close-circle-outline"
                    : "mail-unread-outline"
            }
            size={48}
            color={
              isExpired
                ? INVITE_COLORS.warning
                : invite.status === "accepted"
                  ? INVITE_COLORS.success
                  : invite.status === "rejected"
                    ? INVITE_COLORS.danger
                    : INVITE_COLORS.primary
            }
          />
        </View>

        {/* Label */}
        <Text style={styles.inviteLabel}>Bạn được mời tham gia</Text>

        {/* Plan name */}
        <Text style={styles.planName}>
          {planner?.name ?? "Kế hoạch hành hương"}
        </Text>

        {/* Owner */}
        {planner?.owner && (
          <View style={styles.ownerRow}>
            {planner.owner.avatar_url ? (
              <Image
                source={{ uri: planner.owner.avatar_url }}
                style={styles.ownerAvatar}
              />
            ) : (
              <View style={styles.ownerAvatarPlaceholder}>
                <Ionicons
                  name="person"
                  size={16}
                  color={INVITE_COLORS.textMuted}
                />
              </View>
            )}
            <Text style={styles.ownerName}>
              bởi{" "}
              <Text style={styles.ownerNameBold}>
                {planner.owner.full_name}
              </Text>
            </Text>
          </View>
        )}

        <View style={styles.divider} />

        {/* Date */}
        {planner && (
          <View style={styles.infoRow}>
            <Ionicons
              name="calendar-outline"
              size={20}
              color={INVITE_COLORS.primary}
            />
            <Text style={styles.infoText}>
              {new Date(planner.start_date).toLocaleDateString("vi-VN", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
              {planner.end_date
                ? ` – ${new Date(planner.end_date).toLocaleDateString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                  })}`
                : ""}
            </Text>
          </View>
        )}

        {/* Số ngày */}
        {planner?.number_of_days != null && (
          <View style={styles.infoRow}>
            <Ionicons
              name="time-outline"
              size={20}
              color={INVITE_COLORS.primary}
            />
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>{planner.number_of_days}</Text>{" "}
              ngày
            </Text>
          </View>
        )}

        {/* Số người */}
        {planner?.number_of_people != null && (
          <View style={styles.infoRow}>
            <Ionicons
              name="people-outline"
              size={20}
              color={INVITE_COLORS.primary}
            />
            <Text style={styles.infoText}>
              <Text style={styles.infoTextBold}>
                {planner.number_of_people}
              </Text>{" "}
              người
            </Text>
          </View>
        )}

        {/* Phương tiện */}
        {planner?.transportation && (
          <View style={styles.infoRow}>
            <Ionicons
              name={
                TRANSPORT_MAP[planner.transportation]?.icon ?? "car-outline"
              }
              size={20}
              color={INVITE_COLORS.primary}
            />
            <Text style={styles.infoText}>
              {TRANSPORT_MAP[planner.transportation]?.label ??
                planner.transportation}
            </Text>
          </View>
        )}

        {/* Role */}
        <View style={styles.infoRow}>
          <Ionicons
            name="eye-outline"
            size={20}
            color={INVITE_COLORS.primary}
          />
          <Text style={styles.infoText}>
            Vai trò: <Text style={styles.infoTextBold}>Người xem</Text>
          </Text>
        </View>

        {/* Status badges */}
        {isExpired && (
          <View style={[styles.statusBadge, styles.statusExpired]}>
            <Ionicons
              name="time-outline"
              size={16}
              color={INVITE_COLORS.warning}
            />
            <Text style={[styles.statusText, { color: INVITE_COLORS.warning }]}>
              Lời mời đã hết hạn
            </Text>
          </View>
        )}
        {invite.status === "accepted" && (
          <View style={[styles.statusBadge, styles.statusAccepted]}>
            <Ionicons
              name="checkmark-circle-outline"
              size={16}
              color={INVITE_COLORS.success}
            />
            <Text style={[styles.statusText, { color: INVITE_COLORS.success }]}>
              Đã chấp nhận
            </Text>
          </View>
        )}
        {invite.status === "rejected" && (
          <View style={[styles.statusBadge, styles.statusRejected]}>
            <Ionicons
              name="close-circle-outline"
              size={16}
              color={INVITE_COLORS.danger}
            />
            <Text style={[styles.statusText, { color: INVITE_COLORS.danger }]}>
              Đã từ chối
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Action Buttons — fixed bottom */}
      {!isExpired && !isAlreadyResponded && (
        <View
          style={[
            styles.actionBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
          ]}
        >
          <TouchableOpacity
            style={[styles.actionBtn, styles.rejectBtn]}
            onPress={() => handleRespond("reject")}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color={INVITE_COLORS.textMain} />
            ) : (
              <>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color={INVITE_COLORS.textMain}
                />
                <Text style={styles.rejectBtnText}>Từ chối</Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionBtn, styles.acceptBtn]}
            onPress={() => handleRespond("accept")}
            disabled={responding}
          >
            {responding ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons
                  name="checkmark-circle-outline"
                  size={20}
                  color="#fff"
                />
                <Text style={styles.acceptBtnText}>Chấp nhận</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {/* Banner "đã xử lý" — thay thế action bar khi status khác pending */}
      {(isAlreadyResponded || isExpired) && (
        <View
          style={[
            styles.processedBar,
            { paddingBottom: Math.max(insets.bottom, 16) },
            isExpired && styles.processedBarExpired,
            invite.status === "accepted" && styles.processedBarAccepted,
            invite.status === "rejected" && styles.processedBarRejected,
          ]}
        >
          <Ionicons
            name={
              isExpired
                ? "time-outline"
                : invite.status === "accepted"
                  ? "checkmark-circle"
                  : "close-circle"
            }
            size={22}
            color={
              isExpired
                ? INVITE_COLORS.warning
                : invite.status === "accepted"
                  ? INVITE_COLORS.success
                  : INVITE_COLORS.danger
            }
          />
          <View>
            <Text style={styles.processedBarTitle}>
              {isExpired
                ? "Lời mời đã hết hạn"
                : invite.status === "accepted"
                  ? "Lời mời này đã được xử lý"
                  : "Lời mời này đã được xử lý"}
            </Text>
            <Text style={styles.processedBarSub}>
              {isExpired
                ? "Token đã quá 7 ngày, không thể phản hồi."
                : invite.status === "accepted"
                  ? "Bạn đã chấp nhận lời mời này trước đó."
                  : "Bạn đã từ chối lời mời này trước đó."}
            </Text>
          </View>
        </View>
      )}

      <GuestLoginModal
        visible={showGuestLogin}
        onClose={() => setShowGuestLogin(false)}
        onBeforeLogin={handleBeforeLogin}
        message="Bạn cần đăng nhập để phản hồi lời mời tham gia kế hoạch."
      />
    </ImageBackground>
  );
};

export default PlanInvitePreviewScreen;

const styles = StyleSheet.create({
  bg: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: SPACING.lg,
  },
  loadingText: {
    marginTop: SPACING.sm,
    color: INVITE_COLORS.textMuted,
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  // ── Close button ──
  closeBtn: {
    position: "absolute",
    left: SPACING.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "center",
    alignItems: "center",
  },
  // ── Error ──
  errorSection: {
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    marginTop: SPACING.xl,
  },
  errorTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
    textAlign: "center",
  },
  errorSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
    textAlign: "center",
  },
  backButton: {
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm + 4,
    paddingHorizontal: SPACING.xl,
    backgroundColor: INVITE_COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },
  backButtonText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  // ── Scroll ──
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(207,170,58,0.15)",
    borderWidth: 2,
    borderColor: "rgba(207,170,58,0.4)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  inviteLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  planName: {
    fontSize: 26,
    fontWeight: "800",
    color: INVITE_COLORS.textMain,
    textAlign: "center",
    marginBottom: SPACING.md,
    lineHeight: 34,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.xs,
  },
  ownerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: INVITE_COLORS.borderLight,
  },
  ownerAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: INVITE_COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  ownerName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
  },
  ownerNameBold: {
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: INVITE_COLORS.borderLight,
    marginVertical: SPACING.lg,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    marginBottom: SPACING.md,
  },
  infoText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
    fontWeight: "500",
  },
  infoTextBold: {
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
  },
  // ── Status ──
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    marginTop: SPACING.md,
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
  },
  statusExpired: {
    backgroundColor: INVITE_COLORS.warningBg,
    borderColor: "#ffc107",
  },
  statusAccepted: {
    backgroundColor: INVITE_COLORS.successBg,
    borderColor: INVITE_COLORS.success,
  },
  statusRejected: {
    backgroundColor: INVITE_COLORS.dangerBg,
    borderColor: INVITE_COLORS.danger,
  },
  statusText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    fontWeight: "700",
  },
  // ── Action bar ──
  actionBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: "rgba(253,248,240,0.97)",
    borderTopWidth: 1,
    borderTopColor: INVITE_COLORS.borderLight,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.full,
  },
  rejectBtn: {
    backgroundColor: "transparent",
    borderWidth: 2,
    borderColor: INVITE_COLORS.textMain,
  },
  rejectBtnText: {
    color: INVITE_COLORS.textMain,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  acceptBtn: {
    backgroundColor: INVITE_COLORS.primary,
    shadowColor: INVITE_COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 4,
  },
  acceptBtnText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  // ── Processed / Already responded bar ──
  processedBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
    borderTopWidth: 1,
    borderTopColor: INVITE_COLORS.borderLight,
    backgroundColor: "rgba(253,248,240,0.97)",
  },
  processedBarExpired: {
    backgroundColor: "rgba(255,243,205,0.97)",
    borderTopColor: "#ffc107",
  },
  processedBarAccepted: {
    backgroundColor: "rgba(212,237,218,0.97)",
    borderTopColor: INVITE_COLORS.success,
  },
  processedBarRejected: {
    backgroundColor: "rgba(248,215,218,0.97)",
    borderTopColor: INVITE_COLORS.danger,
  },
  processedBarTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
  },
  processedBarSub: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: INVITE_COLORS.textMuted,
    marginTop: 2,
  },
});
