import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useRef, useState } from "react";
import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  AppState,
  AppStateStatus,
  Image,
  Linking,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { COLORS, TYPOGRAPHY } from "../../../../../constants/theme.constants";
import { pilgrimPlannerApi } from "../../../../../services/api/pilgrim";
import type { PlanInvite, PlanItem, RespondInviteResponse } from "../../../../../types/pilgrim";

type Props = {
  invite: PlanInvite;
  inviteToken: string;
  navigation: { goBack: () => void; navigate: (name: string, params?: object) => void };
  onJoined: () => void;
};

function humanizeInviteApiMessage(raw: string, t: TFunction): string {
  if (!raw) return "";
  if (raw.includes("Share planner must have a deposit amount configured")) {
    return t("planner.inviteDepositNotConfigured");
  }
  if (raw.includes("Failed to create payment link")) {
    return t("planner.invitePaymentLinkFailed");
  }
  return raw;
}

/**
 * Khi GET /planners/:id trả Forbidden (chưa joined), hiển thị lịch từ GET invite token
 * và một CTA đóng cọc — không dùng màn hình preview accept/reject riêng.
 */
export default function InvitePlanGate({
  invite,
  inviteToken,
  navigation,
  onJoined,
}: Props) {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [responding, setResponding] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [awaitingPayReturn, setAwaitingPayReturn] = useState(false);
  const joinSuccessShownRef = useRef(false);

  const planner = invite.planner;
  const itemsByDay = planner?.items_by_day;
  const dayKeys = itemsByDay
    ? Object.keys(itemsByDay).sort((a, b) => Number(a) - Number(b))
    : [];

  useEffect(() => {
    joinSuccessShownRef.current = false;
  }, [inviteToken]);

  useEffect(() => {
    const onAppState = (state: AppStateStatus) => {
      if (state !== "active" || !awaitingPayReturn) return;
      void (async () => {
        try {
          const res = await pilgrimPlannerApi.getPlanByInviteToken(inviteToken);
          if (!res.success || !res.data) return;
          if (
            res.data.status === "accepted" &&
            !joinSuccessShownRef.current
          ) {
            joinSuccessShownRef.current = true;
            setAwaitingPayReturn(false);
            Toast.show({
              type: "success",
              text1: t("planner.inviteJoinSuccessTitle"),
              text2: t("planner.inviteJoinSuccessBody"),
              visibilityTime: 2800,
              onHide: () => onJoined(),
            });
          }
        } catch {
          /* ignore */
        }
      })();
    };
    const sub = AppState.addEventListener("change", onAppState);
    return () => sub.remove();
  }, [awaitingPayReturn, inviteToken, onJoined, t]);

  const handleJoinDeposit = useCallback(async () => {
    if (invite.status !== "pending" && invite.status !== "awaiting_payment") {
      Toast.show({
        type: "info",
        text1: t("common.info", { defaultValue: "Thông tin" }),
        text2: t("planner.inviteAlreadyProcessed", {
          defaultValue: "Lời mời đã được xử lý.",
        }),
      });
      return;
    }

    try {
      setResponding(true);
      const res = await pilgrimPlannerApi.respondToInvite(inviteToken, {
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
          onHide: () => onJoined(),
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
        onHide: () => onJoined(),
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
  }, [invite.status, inviteToken, onJoined, t]);

  const handleCancelDeposit = useCallback(async () => {
    if (!invite.planner_id) return;
    setCancelling(true);
    try {
      const res = await pilgrimPlannerApi.cancelPlannerDeposit(
        invite.planner_id,
      );
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("planner.cancelDepositSuccessTitle", {
            defaultValue: "Đã hủy thanh toán cọc",
          }),
          text2:
            res.message ||
            t("planner.cancelDepositSuccessBody", {
              defaultValue: "Bạn có thể thử lại sau.",
            }),
          visibilityTime: 3000,
        });
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("planner.cancelDepositFailed", {
              defaultValue: "Không thể hủy thanh toán cọc.",
            }),
          visibilityTime: 4000,
        });
      }
    } catch (e: unknown) {
      const raw = e instanceof Error ? e.message : "";
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          humanizeInviteApiMessage(raw, t) ||
          t("planner.cancelDepositFailed", {
            defaultValue: "Không thể hủy thanh toán cọc.",
          }),
        visibilityTime: 4000,
      });
    } finally {
      setCancelling(false);
    }
  }, [invite.planner_id, t]);

  const openWalletTab = () => {
    navigation.navigate("Main", {
      screen: "MainTabs",
      params: {
        screen: "Ho so",
        params: { screen: "Wallet" },
      },
    });
  };

  return (
    <View style={styles.root}>
      <StatusBar barStyle="dark-content" />
      <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={12}
        >
          <Ionicons name="chevron-back" size={26} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {planner?.name ?? t("planner.title", { defaultValue: "Kế hoạch" })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 24 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.banner}>
          <Ionicons
            name="mail-outline"
            size={22}
            color={COLORS.accent}
            style={styles.bannerIcon}
          />
          <Text style={styles.bannerText}>
            {t("planner.inviteGateBanner", {
              defaultValue:
                "Bạn đang xem lịch trình qua lời mời. Đóng cọc để tham gia nhóm và dùng chat.",
            })}
          </Text>
        </View>

        {planner?.owner && (
          <View style={styles.ownerRow}>
            {planner.owner.avatar_url ? (
              <Image
                source={{ uri: planner.owner.avatar_url }}
                style={styles.avatar}
              />
            ) : (
              <View style={styles.avatarPh}>
                <Ionicons name="person" size={18} color={COLORS.textTertiary} />
              </View>
            )}
            <Text style={styles.ownerText}>
              {t("planner.byOwner", { defaultValue: "Chủ đoàn" })}:{" "}
              <Text style={styles.ownerBold}>{planner.owner.full_name}</Text>
            </Text>
          </View>
        )}

        {dayKeys.length === 0 ? (
          <Text style={styles.muted}>
            {t("planner.inviteNoSchedule", {
              defaultValue: "Chưa có chi tiết lịch trình trong lời mời.",
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
                    color={COLORS.accent}
                  />
                  <Text style={styles.itemName} numberOfLines={2}>
                    {item.site?.name ?? "—"}
                  </Text>
                </View>
              ))}
            </View>
          ))
        )}
      </ScrollView>

      <View style={[styles.footer, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        {invite.status === "awaiting_payment" && (
          <>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                marginBottom: 10,
              }}
            >
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={openWalletTab}
                activeOpacity={0.85}
              >
                <Text style={styles.secondaryBtnText}>
                  {t("planner.openWallet", { defaultValue: "Mở Ví" })}
                </Text>
                <Ionicons
                  name="wallet-outline"
                  size={20}
                  color={COLORS.accent}
                />
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.secondaryBtn}
                onPress={() => void handleCancelDeposit()}
                disabled={cancelling}
                activeOpacity={0.85}
              >
                <Text
                  style={[styles.secondaryBtnText, { color: "#DC4C4C" }]}
                >
                  {cancelling
                    ? t("common.loading", { defaultValue: "..." })
                    : t("planner.cancelDeposit", {
                        defaultValue: "Hủy cọc",
                      })}
                </Text>
                <Ionicons
                  name="close-circle-outline"
                  size={20}
                  color="#DC4C4C"
                />
              </TouchableOpacity>
            </View>
          </>
        )}
        <TouchableOpacity
          style={[
            styles.primaryBtn,
            (responding || invite.status === "accepted") && styles.primaryBtnDisabled,
          ]}
          onPress={() => void handleJoinDeposit()}
          disabled={responding || invite.status === "accepted"}
          activeOpacity={0.9}
        >
          {responding ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.primaryBtnText}>
              {invite.status === "awaiting_payment"
                ? t("planner.completeDeposit", {
                    defaultValue: "Hoàn tất thanh toán cọc",
                  })
                : invite.status === "accepted"
                  ? t("planner.alreadyMember", {
                      defaultValue: "Đã tham gia — đang tải…",
                    })
                  : t("planner.joinWithDeposit", {
                      defaultValue: "Đóng cọc để tham gia",
                    })}
            </Text>
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingBottom: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  backBtn: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  bannerIcon: { marginRight: 10 },
  banner: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: "rgba(207,170,58,0.12)",
    padding: 12,
    borderRadius: 12,
    marginBottom: 16,
  },
  bannerText: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
  ownerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 10,
  },
  avatar: { width: 40, height: 40, borderRadius: 20 },
  avatarPh: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.border,
    justifyContent: "center",
    alignItems: "center",
  },
  ownerText: { fontSize: TYPOGRAPHY.fontSize.sm, color: COLORS.textSecondary },
  ownerBold: { fontWeight: TYPOGRAPHY.fontWeight.semibold, color: COLORS.textPrimary },
  muted: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  dayBlock: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: COLORS.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  dayTitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    marginBottom: 8,
    color: COLORS.textPrimary,
  },
  itemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 6,
  },
  itemName: {
    flex: 1,
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textPrimary,
  },
  footer: {
    paddingHorizontal: 16,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    backgroundColor: COLORS.background,
  },
  primaryBtn: {
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 48,
  },
  primaryBtnDisabled: { opacity: 0.65 },
  primaryBtnText: {
    color: "#fff",
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 10,
  },
  secondaryBtnText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },
});
