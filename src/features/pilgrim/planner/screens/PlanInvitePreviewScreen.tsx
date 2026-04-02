import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CommonActions } from "@react-navigation/native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { LinearGradient } from "expo-linear-gradient";
import type { TFunction } from "i18next";
import React, {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useTranslation } from "react-i18next";
import {
    ActivityIndicator,
    AppState,
    AppStateStatus,
    FlatList,
    Image,
    ImageBackground,
    Linking,
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
import { MapPin, VietmapView } from "../../../../components/map/VietmapView";
import { GuestLoginModal } from "../../../../components/ui/GuestLoginModal";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import {
    resetToPlanDetailWithInvite,
    resetToPlannerInvitesTab,
} from "../../../../navigation/navigationHelpers";
import { RootStackParamList } from "../../../../navigation/RootNavigator";
import { pilgrimPlannerApi } from "../../../../services/api/pilgrim";
import { PlanInvite } from "../../../../types/pilgrim";
import type {
    PlanItem,
    PlannerMessage,
    RespondInviteResponse,
} from "../../../../types/pilgrim/planner.types";
import { emailsMatch } from "../utils/planShare.utils";

const BG_IMAGE = require("../../../../../assets/images/bg1.jpg");

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
const PREVIEW_CHAT_PAGE_SIZE = 20;
const PREVIEW_CHAT_POLL_MS = 8000;

type Props = NativeStackScreenProps<RootStackParamList, "PlanInvitePreview">;

function humanizeInviteApiMessage(raw: string, tr: TFunction): string {
  if (!raw) return "";
  if (raw.includes("Share planner must have a deposit amount configured")) {
    return tr("planner.inviteDepositNotConfigured");
  }
  if (raw.includes("Failed to create payment link")) {
    return tr("planner.invitePaymentLinkFailed");
  }
  return raw;
}

/**
 * Deep link / mở từ email: mặc định `mode: "preview"` — luôn GET preview và so khớp email.
 * — Đúng email → xem trước, Tham gia / thanh toán, vào PlanDetail.
 * — Sai email → chặn, gợi ý đăng xuất & đăng nhập lại (token được giữ trong pending_invite_token).
 * — Guest / chưa đăng nhập → gợi ý đăng nhập đúng email.
 * — `mode: "redirect"`: chỉ lưu token + về tab Được mời (không kiểm tra email — chỉ khi truyền explicit).
 */
const PlanInvitePreviewScreen = ({ route, navigation }: Props) => {
  const { token, mode = "preview" } = route.params;
  const { t } = useTranslation();
  const { isGuest, user, logout } = useAuth();
  const insets = useSafeAreaInsets();

  const [invite, setInvite] = useState<PlanInvite | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showGuestLogin, setShowGuestLogin] = useState(false);
  const [responding, setResponding] = useState(false);
  const [awaitingPayReturn, setAwaitingPayReturn] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const [chatSending, setChatSending] = useState(false);
  const [chatText, setChatText] = useState("");
  const [messages, setMessages] = useState<PlannerMessage[]>([]);
  const joinSuccessShownRef = useRef(false);
  const autoRedirectedRef = useRef(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleBeforeLogin = useCallback(async () => {
    await AsyncStorage.setItem("pending_invite_token", token);
  }, [token]);

  const handleSwitchAccountForInvite = useCallback(async () => {
    try {
      await AsyncStorage.setItem("pending_invite_token", token);
      await logout();
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [{ name: "Auth" }],
        }),
      );
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.inviteSwitchAccountFailed", {
          defaultValue: "Không thể đăng xuất. Thử lại.",
        }),
      });
    }
  }, [logout, navigation, t, token]);

  // Opt-in: lưu token rồi về tab Được mời (bỏ qua màn preview — không dùng cho link email mặc định).
  useEffect(() => {
    if (mode !== "redirect") return;
    void (async () => {
      await handleBeforeLogin();
      resetToPlannerInvitesTab();
    })();
  }, [handleBeforeLogin, mode]);

  if (mode === "redirect") {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: COLORS.background,
        }}
      >
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  const fetchInvitePreview = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await pilgrimPlannerApi.getPlanByInviteToken(token);
      if (res.success && res.data) {
        setInvite(res.data);
      } else {
        setError(res.message || "Không tìm thấy lời mời.");
      }
    } catch (e: unknown) {
      const msg =
        e instanceof Error
          ? e.message
          : "Lời mời không hợp lệ hoặc đã hết hạn.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (mode === "redirect") return;
    void fetchInvitePreview();
  }, [fetchInvitePreview, mode]);

  useEffect(() => {
    joinSuccessShownRef.current = false;
    autoRedirectedRef.current = false;
  }, [token]);

  /** Sau khi mở PayOS / trình duyệt, quay lại app → GET lại token để biết đã thanh toán. */
  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== "active" || !awaitingPayReturn) return;
      void (async () => {
        try {
          const res = await pilgrimPlannerApi.getPlanByInviteToken(token);
          if (!res.success || !res.data) return;
          setInvite(res.data);
          if (res.data.status === "accepted" && !joinSuccessShownRef.current) {
            joinSuccessShownRef.current = true;
            setAwaitingPayReturn(false);
            const pid = res.data.planner_id;
            Toast.show({
              type: "success",
              text1: t("planner.inviteJoinSuccessTitle"),
              text2: t("planner.inviteJoinSuccessBody"),
              visibilityTime: 2800,
              onHide: () => {
                if (pid) resetToPlanDetailWithInvite(pid, token);
              },
            });
          }
        } catch {
          /* ignore */
        }
      })();
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [awaitingPayReturn, token, t]);

  const openPlanInApp = useCallback(() => {
    if (!invite?.planner_id) return;
    resetToPlanDetailWithInvite(invite.planner_id, token);
  }, [invite?.planner_id, token]);

  /**
   * POST /api/planners/invite/:token { action: "accept" } — đồng ý tham gia;
   * BE trả checkout_url (PayOS) hoặc đã trừ ví → sau đó vào PlanDetail.
   */
  const handleJoinPlan = useCallback(async () => {
    if (!invite?.planner_id) return;
    if (invite.status !== "pending" && invite.status !== "awaiting_payment") {
      return;
    }
    try {
      setResponding(true);
      const res = await pilgrimPlannerApi.respondToInvite(token, {
        action: "accept",
      });
      if (!res.success) {
        const raw = res.message || res.error?.message || "";
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            humanizeInviteApiMessage(raw, t) ||
            t("planner.inviteRespondFailed", {
              defaultValue: "Không thể phản hồi lời mời.",
            }),
        });
        return;
      }

      const extra = res.data as RespondInviteResponse | undefined;
      const payUrl = extra?.checkout_url || extra?.payment_url;
      const fromWallet = extra?.paid_from_wallet === true;

      if (fromWallet) {
        Toast.show({
          type: "success",
          text1: t("planner.inviteJoinWalletTitle"),
          text2: extra?.message || res.message,
          visibilityTime: 2800,
          onHide: () => openPlanInApp(),
        });
        return;
      }

      if (payUrl) {
        const can = await Linking.canOpenURL(payUrl);
        if (can) await Linking.openURL(payUrl);
        setAwaitingPayReturn(true);
        Toast.show({
          type: "info",
          text1: t("planner.invitePaymentOpenedTitle"),
          text2: t("planner.invitePaymentOpenedBody"),
          visibilityTime: 5500,
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: t("planner.inviteJoinSuccessTitle"),
        text2: res.message,
        visibilityTime: 2500,
        onHide: () => openPlanInApp(),
      });
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          humanizeInviteApiMessage(raw, t) ||
          t("planner.inviteRespondFailed", {
            defaultValue: "Không thể phản hồi lời mời.",
          }),
      });
    } finally {
      setResponding(false);
    }
  }, [invite, token, openPlanInApp, t]);

  const planner = invite?.planner;
  const itemsByDay = planner?.items_by_day;
  const dayKeys = itemsByDay
    ? Object.keys(itemsByDay).sort((a, b) => Number(a) - Number(b))
    : [];

  const mapPins = useMemo<MapPin[]>(() => {
    if (!itemsByDay) return [];
    const pins: MapPin[] = [];
    Object.entries(itemsByDay).forEach(([day, items]) => {
      items.forEach((item) => {
        const lat = item.site?.latitude;
        const lng = item.site?.longitude;
        if (typeof lat === "number" && typeof lng === "number") {
          pins.push({
            id: `${day}-${item.id}`,
            latitude: lat,
            longitude: lng,
            title: item.site?.name || `Ngày ${day}`,
            subtitle: `Ngày ${day}`,
          });
        }
      });
    });
    return pins;
  }, [itemsByDay]);

  const canUseChat = Boolean(invite?.planner_id && user && !isGuest);
  const previewDepositAmount = planner?.deposit_amount ?? 0;

  const fetchChatPreview = useCallback(async () => {
    if (!invite?.planner_id || !canUseChat) return;
    try {
      setChatLoading(true);
      const res = await pilgrimPlannerApi.getPlanMessages(invite.planner_id, {
        page: 1,
        limit: PREVIEW_CHAT_PAGE_SIZE,
      });
      if (res.success && res.data) {
        setMessages(res.data.messages ?? []);
      }
    } catch {
      // silent in preview
    } finally {
      setChatLoading(false);
    }
  }, [invite?.planner_id, canUseChat]);

  useEffect(() => {
    if (!canUseChat || !invite?.planner_id) return;
    void fetchChatPreview();
  }, [canUseChat, invite?.planner_id, fetchChatPreview]);

  useEffect(() => {
    if (!canUseChat || !invite?.planner_id) return;
    pollRef.current = setInterval(() => {
      void fetchChatPreview();
    }, PREVIEW_CHAT_POLL_MS);
    return () => {
      if (pollRef.current) {
        clearInterval(pollRef.current);
      }
    };
  }, [canUseChat, invite?.planner_id, fetchChatPreview]);

  const handleSendPreviewMessage = useCallback(async () => {
    const content = chatText.trim();
    if (!content || chatSending || !invite?.planner_id || !canUseChat) return;
    setChatSending(true);
    setChatText("");
    try {
      const res = await pilgrimPlannerApi.sendPlanMessage(invite.planner_id, {
        message_type: "text",
        content,
      });
      if (res.success && res.data) {
        setMessages((prev) => [res.data!, ...prev]);
      } else {
        setChatText(content);
      }
    } catch {
      setChatText(content);
    } finally {
      setChatSending(false);
    }
  }, [chatText, chatSending, invite?.planner_id, canUseChat]);

  useEffect(() => {
    if (
      invite?.status === "accepted" &&
      invite?.planner_id &&
      !autoRedirectedRef.current
    ) {
      autoRedirectedRef.current = true;
      resetToPlanDetailWithInvite(invite.planner_id, token);
    }
  }, [invite?.status, invite?.planner_id, token]);

  const commonBg = (
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
  );

  if (loading) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {commonBg}
        <View style={[styles.centered, { paddingTop: insets.top }]}>
          <ActivityIndicator size="large" color={INVITE_COLORS.primary} />
          <Text style={styles.loadingText}>
            {t("planner.inviteLoading", {
              defaultValue: "Đang tải thông tin lời mời...",
            })}
          </Text>
        </View>
      </ImageBackground>
    );
  }

  if (error || !invite) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {commonBg}
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
            <Text style={styles.errorTitle}>
              {t("planner.inviteInvalidTitle", {
                defaultValue: "Lời mời không hợp lệ",
              })}
            </Text>
            <Text style={styles.errorSubtitle}>{error}</Text>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.backButtonText}>
                {t("common.goBack", { defaultValue: "Quay lại" })}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ImageBackground>
    );
  }

  const inviteEmailTrimmed = invite.email?.trim() ?? "";
  const showEmailMismatch =
    Boolean(user?.email) &&
    !isGuest &&
    inviteEmailTrimmed.length > 0 &&
    !emailsMatch(invite.email, user!.email!);

  if (showEmailMismatch) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {commonBg}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={22} color={INVITE_COLORS.textMain} />
        </TouchableOpacity>
        <View
          style={[
            styles.centered,
            { paddingTop: insets.top, paddingHorizontal: SPACING.lg },
          ]}
        >
          <Ionicons
            name="mail-unread-outline"
            size={56}
            color={INVITE_COLORS.warning}
          />
          <Text style={styles.errorTitle}>
            {t("planner.inviteWrongAccountTitle", {
              defaultValue: "Sai tài khoản",
            })}
          </Text>
          <Text style={styles.errorSubtitle}>
            {t("planner.inviteWrongAccountBody", {
              email: invite.email,
              defaultValue: `Lời mời gửi tới ${invite.email}. Vui lòng đăng nhập đúng email đó hoặc đăng xuất và đăng nhập lại.`,
            })}
          </Text>
          <TouchableOpacity
            style={styles.switchAccountCta}
            onPress={() => void handleSwitchAccountForInvite()}
            activeOpacity={0.9}
          >
            <Text style={styles.switchAccountCtaText}>
              {t("planner.inviteSwitchAccountCta", {
                defaultValue: "Đăng xuất và đăng nhập email mời",
              })}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              {t("common.goBack", { defaultValue: "Quay lại" })}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  const needsLogin = isGuest || !user;

  if (needsLogin) {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {commonBg}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 24 },
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.iconWrapper}>
            <Ionicons
              name="mail-unread-outline"
              size={48}
              color={INVITE_COLORS.primary}
            />
          </View>
          <Text style={styles.inviteLabel}>
            {t("planner.inviteYouWereInvited", {
              defaultValue: "Bạn được mời tham gia",
            })}
          </Text>
          <Text style={styles.planName}>
            {planner?.name ??
              t("planner.defaultName", { defaultValue: "Kế hoạch hành hương" })}
          </Text>
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
                {t("planner.by", { defaultValue: "bởi" })}{" "}
                <Text style={styles.ownerNameBold}>
                  {planner.owner.full_name}
                </Text>
              </Text>
            </View>
          )}
          <Text style={styles.guestHint}>
            {t("planner.inviteLoginHint", {
              defaultValue:
                "Đăng nhập bằng đúng email đã nhận lời mời để xem lịch trình nhóm và trò chuyện.",
            })}
          </Text>
          <TouchableOpacity
            style={styles.primaryCta}
            onPress={() => setShowGuestLogin(true)}
            activeOpacity={0.9}
          >
            <Text style={styles.primaryCtaText}>
              {t("auth.login", { defaultValue: "Đăng nhập" })}
            </Text>
          </TouchableOpacity>
        </ScrollView>
        <GuestLoginModal
          visible={showGuestLogin}
          onClose={() => setShowGuestLogin(false)}
          onBeforeLogin={handleBeforeLogin}
          message={t("planner.inviteLoginModalMessage", {
            defaultValue: "Đăng nhập bằng email đã nhận lời mời trong thư.",
          })}
        />
      </ImageBackground>
    );
  }

  if (invite.status === "expired" || invite.status === "rejected") {
    return (
      <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
        <StatusBar
          barStyle="dark-content"
          backgroundColor="transparent"
          translucent
        />
        {commonBg}
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={[styles.closeBtn, { top: insets.top + 8 }]}
        >
          <Ionicons name="close" size={22} color="#fff" />
        </TouchableOpacity>
        <View
          style={[
            styles.centered,
            { paddingTop: insets.top, paddingHorizontal: SPACING.lg },
          ]}
        >
          <Ionicons
            name={
              invite.status === "expired"
                ? "time-outline"
                : "close-circle-outline"
            }
            size={56}
            color={
              invite.status === "expired"
                ? INVITE_COLORS.warning
                : INVITE_COLORS.danger
            }
          />
          <Text style={styles.errorTitle}>
            {invite.status === "expired"
              ? t("planner.inviteExpiredTitle", {
                  defaultValue: "Lời mời đã hết hạn",
                })
              : t("planner.inviteRejectedTitle", {
                  defaultValue: "Lời mời đã bị từ chối",
                })}
          </Text>
          <Text style={styles.errorSubtitle}>{planner?.name ?? ""}</Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Text style={styles.backButtonText}>
              {t("common.goBack", { defaultValue: "Quay lại" })}
            </Text>
          </TouchableOpacity>
        </View>
      </ImageBackground>
    );
  }

  /** Đã đăng nhập đúng email: GET preview; bấm Tham gia → POST accept (+ thanh toán nếu có). */
  return (
    <ImageBackground source={BG_IMAGE} style={styles.bg} resizeMode="cover">
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
      <View style={styles.headerMapWrap}>
        <VietmapView
          initialRegion={
            mapPins[0]
              ? {
                  latitude: mapPins[0].latitude,
                  longitude: mapPins[0].longitude,
                  zoom: 10,
                }
              : undefined
          }
          pins={mapPins}
          scrollEnabled={true}
          showInfoCards={false}
          style={styles.headerMap}
        />
        <LinearGradient
          colors={["rgba(0,0,0,0.5)", "rgba(0,0,0,0.15)", "transparent"]}
          style={[StyleSheet.absoluteFillObject, { zIndex: 1, height: "40%" }]}
          pointerEvents="none"
        />
        <LinearGradient
          colors={["transparent", "rgba(0,0,0,0.25)", "rgba(0,0,0,0.7)"]}
          style={[StyleSheet.absoluteFillObject, { zIndex: 1, top: "55%" }]}
          pointerEvents="none"
        />
      </View>
      <TouchableOpacity
        onPress={() => navigation.goBack()}
        style={[styles.closeBtn, { top: insets.top + 8 }]}
      >
        <Ionicons name="close" size={22} color="#fff" />
      </TouchableOpacity>
      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: insets.top + 280,
            paddingBottom: insets.bottom + 120,
            alignItems: "stretch",
          },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.previewHeroCard}>
          <Text style={styles.previewBadge}>
            {t("planner.invitePreviewOnly", {
              defaultValue: "Xem trước từ link mời (chưa thanh toán)",
            })}
          </Text>
          <Text style={styles.planName}>
            {planner?.name ??
              t("planner.defaultName", { defaultValue: "Kế hoạch hành hương" })}
          </Text>
          <View style={styles.previewMetaRow}>
            <Text style={styles.previewMetaText}>
              {t("planner.dayLabel", { defaultValue: "Ngày" })}:{" "}
              {dayKeys.length || 0}
            </Text>
            <Text style={styles.previewMetaDot}>•</Text>
            <Text style={styles.previewMetaText}>
              {t("planner.peopleCount", { defaultValue: "Số người" })}:{" "}
              {planner?.number_of_people ?? 1}
            </Text>
          </View>
          <View style={styles.previewMetaRow}>
            <Ionicons
              name="wallet-outline"
              size={16}
              color={INVITE_COLORS.primary}
            />
            <Text style={styles.previewMetaText}>
              {t("planner.depositAmount", { defaultValue: "Mức cọc" })}:{" "}
              {previewDepositAmount > 0
                ? `${Math.round(previewDepositAmount).toLocaleString("vi-VN")} ₫`
                : t("planner.noDeposit", { defaultValue: "Không yêu cầu cọc" })}
            </Text>
          </View>
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
                {t("planner.by", { defaultValue: "bởi" })}{" "}
                <Text style={styles.ownerNameBold}>
                  {planner.owner.full_name}
                </Text>
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.sectionTitle}>
          {t("planner.itinerary", { defaultValue: "Lịch trình" })}
        </Text>
        {dayKeys.length === 0 ? (
          <Text style={styles.muted}>
            {t("planner.inviteNoSchedule", {
              defaultValue: "Chưa có chi tiết lịch trình trong bản xem trước.",
            })}
          </Text>
        ) : (
          dayKeys.map((day) => (
            <View key={day} style={styles.dayBlock}>
              <Text style={styles.dayTitle}>
                {t("planner.dayLabel", { defaultValue: "Ngày" })} {day}
              </Text>
              {(itemsByDay![day] as PlanItem[]).map((item) => (
                <View key={item.id} style={styles.itemRow}>
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={INVITE_COLORS.primary}
                  />
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.site?.name ?? "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}

        <View style={styles.chatCard}>
          <View style={styles.chatHeader}>
            <Text style={styles.sectionTitle}>
              {t("planner.previewChatTitle", {
                defaultValue: "Chat với trưởng đoàn",
              })}
            </Text>
            {chatLoading && (
              <ActivityIndicator size="small" color={INVITE_COLORS.primary} />
            )}
          </View>
          {!canUseChat ? (
            <Text style={styles.muted}>
              {t("planner.inviteLoginHint", {
                defaultValue:
                  "Đăng nhập đúng email mời để trò chuyện với trưởng đoàn.",
              })}
            </Text>
          ) : (
            <>
              <View style={styles.chatListBox}>
                {messages.length === 0 ? (
                  <Text style={styles.chatEmpty}>
                    {t("chat.empty", {
                      defaultValue:
                        "Chưa có tin nhắn. Hãy bắt đầu cuộc trò chuyện!",
                    })}
                  </Text>
                ) : (
                  <FlatList
                    data={messages.slice(0, 12)}
                    keyExtractor={(item) => item.id}
                    inverted
                    scrollEnabled={false}
                    renderItem={({ item }) => (
                      <View style={styles.chatMessageRow}>
                        <Text style={styles.chatSender}>
                          {item.user?.full_name ||
                            item.sender?.full_name ||
                            "Ẩn danh"}
                        </Text>
                        <Text style={styles.chatContent}>
                          {item.content || "📷 Hình ảnh"}
                        </Text>
                      </View>
                    )}
                  />
                )}
              </View>
              <View style={styles.chatComposer}>
                <TextInput
                  style={styles.chatInput}
                  value={chatText}
                  onChangeText={setChatText}
                  placeholder={t("chat.placeholder", {
                    defaultValue: "Nhập tin nhắn...",
                  })}
                  placeholderTextColor={COLORS.textTertiary}
                  editable={!chatSending}
                />
                <TouchableOpacity
                  style={[
                    styles.chatSendButton,
                    (!chatText.trim() || chatSending) &&
                      styles.chatSendDisabled,
                  ]}
                  onPress={() => void handleSendPreviewMessage()}
                  disabled={!chatText.trim() || chatSending}
                >
                  {chatSending ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="send" size={18} color="#fff" />
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>

        <Text style={styles.stepHint}>
          {t("planner.inviteNextStepHint", {
            defaultValue:
              "Bấm Tham gia kế hoạch để xác nhận; nếu nhóm có cọc, hệ thống mở thanh toán (PayOS) hoặc ví.",
          })}
        </Text>
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          { paddingBottom: Math.max(insets.bottom, 16) },
        ]}
      >
        {(invite.status === "pending" ||
          invite.status === "awaiting_payment") && (
          <>
            <Text style={styles.joinUsBanner}>
              {t("planner.inviteJoinUsBanner", {
                defaultValue: "Tham gia cùng chúng tôi",
              })}
            </Text>
            <TouchableOpacity
              style={[
                styles.primaryCta,
                styles.ctaFooter,
                responding && { opacity: 0.75 },
              ]}
              onPress={() => void handleJoinPlan()}
              disabled={responding}
              activeOpacity={0.9}
            >
              {responding ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryCtaText}>
                  {t("planner.inviteJoinPlanCta", {
                    defaultValue: "Tham gia kế hoạch",
                  })}
                </Text>
              )}
            </TouchableOpacity>
          </>
        )}
        {/* Không có nút "Mở kế hoạch" ở preview.
            Khi đã accepted/member sẽ tự replace sang PlanDetail qua useEffect. */}
      </View>
    </ImageBackground>
  );
};

export default PlanInvitePreviewScreen;

const styles = StyleSheet.create({
  bg: { flex: 1 },
  headerMapWrap: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 340,
  },
  headerMap: {
    width: "100%",
    height: "100%",
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
  errorSection: {
    alignItems: "center",
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
    marginTop: SPACING.sm,
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
  scrollContent: {
    alignItems: "center",
    paddingHorizontal: SPACING.xl,
  },
  previewHeroCard: {
    alignSelf: "stretch",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: INVITE_COLORS.borderLight,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.md,
    ...SHADOWS.subtle,
  },
  previewMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 6,
    flexWrap: "wrap",
  },
  previewMetaText: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: INVITE_COLORS.textMuted,
    fontWeight: "600",
  },
  previewMetaDot: {
    marginHorizontal: 6,
    color: INVITE_COLORS.textMuted,
  },
  sectionTitle: {
    alignSelf: "stretch",
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
    marginBottom: SPACING.sm,
  },
  mapCard: {
    alignSelf: "stretch",
    backgroundColor: INVITE_COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: INVITE_COLORS.borderLight,
    padding: SPACING.sm,
    marginBottom: SPACING.md,
  },
  map: {
    width: "100%",
    height: 220,
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
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
    marginBottom: SPACING.lg,
  },
  ownerAvatar: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: INVITE_COLORS.borderLight,
    marginRight: SPACING.sm,
  },
  ownerAvatarPlaceholder: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: INVITE_COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
    marginRight: SPACING.sm,
  },
  ownerName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
  },
  ownerNameBold: {
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
  },
  guestHint: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: INVITE_COLORS.textMuted,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.lg,
  },
  primaryCta: {
    backgroundColor: INVITE_COLORS.primary,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl * 2,
    borderRadius: BORDER_RADIUS.full,
    minWidth: 200,
    alignItems: "center",
  },
  primaryCtaText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: TYPOGRAPHY.fontSize.md,
  },
  switchAccountCta: {
    marginTop: SPACING.md,
    marginBottom: SPACING.sm,
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 2,
    borderColor: INVITE_COLORS.primary,
    backgroundColor: "rgba(255,255,255,0.85)",
    alignItems: "center",
    alignSelf: "stretch",
    maxWidth: 340,
  },
  switchAccountCtaText: {
    color: INVITE_COLORS.primary,
    fontWeight: "700",
    fontSize: TYPOGRAPHY.fontSize.md,
    textAlign: "center",
  },
  previewBadge: {
    alignSelf: "center",
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: INVITE_COLORS.primary,
    fontWeight: "700",
    marginBottom: SPACING.sm,
    textAlign: "center",
  },
  divider: {
    width: "60%",
    height: 1,
    backgroundColor: INVITE_COLORS.borderLight,
    marginVertical: SPACING.lg,
    alignSelf: "center",
  },
  dayBlock: {
    alignSelf: "stretch",
    marginBottom: SPACING.md,
    padding: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: INVITE_COLORS.borderLight,
  },
  chatCard: {
    alignSelf: "stretch",
    backgroundColor: INVITE_COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    borderWidth: 1,
    borderColor: INVITE_COLORS.borderLight,
    padding: SPACING.md,
    marginTop: SPACING.sm,
  },
  chatHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chatListBox: {
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.md,
    padding: SPACING.sm,
    minHeight: 110,
  },
  chatEmpty: {
    color: COLORS.textSecondary,
    fontSize: TYPOGRAPHY.fontSize.sm,
    textAlign: "center",
    marginTop: SPACING.sm,
  },
  chatMessageRow: {
    paddingVertical: 6,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  chatSender: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: INVITE_COLORS.primary,
    fontWeight: "700",
  },
  chatContent: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: INVITE_COLORS.textMain,
    marginTop: 2,
  },
  chatComposer: {
    marginTop: SPACING.sm,
    flexDirection: "row",
    alignItems: "center",
  },
  chatInput: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: BORDER_RADIUS.full,
    borderWidth: 1,
    borderColor: COLORS.borderLight,
    paddingHorizontal: SPACING.md,
    paddingVertical: 10,
    color: INVITE_COLORS.textMain,
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  chatSendButton: {
    marginLeft: SPACING.sm,
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: INVITE_COLORS.primary,
    alignItems: "center",
    justifyContent: "center",
  },
  chatSendDisabled: {
    opacity: 0.55,
  },
  dayTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    marginBottom: SPACING.sm,
    color: INVITE_COLORS.textMain,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 4,
  },
  itemName: {
    flex: 1,
    marginLeft: SPACING.sm,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: INVITE_COLORS.textMain,
  },
  muted: {
    alignSelf: "stretch",
    color: INVITE_COLORS.textMuted,
    fontStyle: "italic",
    fontSize: TYPOGRAPHY.fontSize.sm,
  },
  stepHint: {
    alignSelf: "stretch",
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: INVITE_COLORS.textMuted,
    lineHeight: 20,
    marginTop: SPACING.md,
  },
  bottomBar: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: SPACING.md,
    paddingTop: SPACING.md,
    backgroundColor: "rgba(253,248,240,0.98)",
    borderTopWidth: 1,
    borderTopColor: INVITE_COLORS.borderLight,
  },
  joinUsBanner: {
    textAlign: "center",
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: "700",
    color: INVITE_COLORS.textMain,
    marginBottom: SPACING.sm,
  },
  ctaFooter: {
    alignSelf: "stretch",
    width: "100%",
  },
});
