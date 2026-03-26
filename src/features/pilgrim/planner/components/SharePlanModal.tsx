import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import type {
  PlanEntity,
  PlanInvite,
  PlanParticipant,
} from "../../../../types/pilgrim/planner.types";
import {
  buildPlannerInviteDeepLink,
  filterInvitesNeedingAction,
  mapMembersToParticipants,
} from "../utils/planShare.utils";

export interface SharePlanModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  plan: PlanEntity | null;
  isPlanOwner: boolean;
  isOffline: boolean;
  onOfflineRequired: () => void;
}

export const SharePlanModal: React.FC<SharePlanModalProps> = ({
  visible,
  onClose,
  planId,
  plan,
  isPlanOwner,
  isOffline,
  onOfflineRequired,
}) => {
  const { t } = useTranslation();
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PlanInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole] = useState<"viewer">("viewer");
  const [inviting, setInviting] = useState(false);

  const formatInviteStatus = useCallback(
    (status: string) => {
      if (status === "awaiting_payment") {
        return t("planner.inviteStatusAwaitingPayment", {
          defaultValue: "Chờ thanh toán cọc",
        });
      }
      if (status === "pending") {
        return t("planner.inviteStatusPending", {
          defaultValue: "Đang chờ phản hồi",
        });
      }
      return status;
    },
    [t],
  );

  const loadPanel = useCallback(async () => {
    try {
      setLoading(true);
      const memRes = await pilgrimPlannerApi.getPlanMembers(planId);
      if (memRes.success && memRes.data?.members) {
        setParticipants(mapMembersToParticipants(memRes.data.members, plan));
      } else {
        setParticipants([]);
      }

      if (isPlanOwner) {
        const invRes = await pilgrimPlannerApi.getPlanInvites(planId);
        const raw = invRes.success ? (invRes.data?.invites ?? []) : [];
        setPendingInvites(filterInvitesNeedingAction(raw));
      } else {
        setPendingInvites([]);
      }
    } catch (e) {
      console.error("SharePlanModal load:", e);
      setParticipants([]);
      setPendingInvites([]);
    } finally {
      setLoading(false);
    }
  }, [planId, plan, isPlanOwner]);

  useEffect(() => {
    if (!visible) return;
    void loadPanel();
  }, [visible, loadPanel]);

  const shareInviteLink = async (inv: PlanInvite) => {
    const tkn = inv.token?.trim();
    if (!tkn) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.inviteLinkNoToken", {
          defaultValue: "Chưa có liên kết mời cho lời mời này.",
        }),
      });
      return;
    }
    const url = buildPlannerInviteDeepLink(tkn);
    const planName = plan?.name?.trim() ?? "";
    const prefix = planName
      ? t("planner.shareInvitePrefixNamed", {
          planName,
          defaultValue: `Mời tham gia «${planName}»:`,
        })
      : t("planner.shareInvitePrefixGeneric", {
          defaultValue: "Mời tham gia kế hoạch hành hương:",
        });
    try {
      await Share.share({
        message: `${prefix}\n${url}`,
        title: t("planner.sharePlan"),
      });
    } catch {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.shareInviteFailed", {
          defaultValue: "Không thể chia sẻ liên kết.",
        }),
      });
    }
  };

  const submitInvite = async () => {
    if (isOffline) {
      onOfflineRequired();
      return;
    }
    if (!inviteEmail.trim()) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.emailRequired", {
          defaultValue: "Vui lòng nhập email",
        }),
      });
      return;
    }
    try {
      setInviting(true);
      const res = await pilgrimPlannerApi.inviteParticipant(planId, {
        email: inviteEmail.trim().toLowerCase(),
        role: inviteRole,
      });
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: t("planner.inviteSent", {
            defaultValue: "Đã gửi lời mời",
          }),
        });
        setInviteEmail("");
        await loadPanel();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("planner.inviteFailed", { defaultValue: "Gửi lời mời thất bại" }),
        });
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          e instanceof Error
            ? e.message
            : t("planner.inviteFailed", { defaultValue: "Gửi lời mời thất bại" }),
      });
    } finally {
      setInviting(false);
    }
  };

  const crewCount = participants.length + (plan?.owner ? 1 : 0);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.title}>{t("planner.sharePlan")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
        >
          {isPlanOwner && (
            <View style={styles.inviteBlock}>
              <Text style={styles.sectionTitle}>{t("planner.addMember")}</Text>
              <TextInput
                style={styles.emailInput}
                placeholder={t("planner.inviteEmailPlaceholder", {
                  defaultValue: "Email người nhận lời mời",
                })}
                value={inviteEmail}
                onChangeText={setInviteEmail}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!isOffline}
              />
              <Text style={styles.hint}>
                {t("planner.inviteEmailHint", {
                  defaultValue:
                    "Gửi lời mời theo email. Chia sẻ link nhanh bằng nút bên dưới (lời mời đang chờ).",
                })}
              </Text>
              <TouchableOpacity
                style={[
                  styles.inviteBtn,
                  (inviting || isOffline) && styles.inviteBtnDisabled,
                ]}
                onPress={submitInvite}
                disabled={inviting || isOffline}
              >
                {inviting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color="#fff"
                    />
                    <Text style={styles.inviteBtnText}>
                      {t("planner.sendInvite", {
                        defaultValue: "Gửi lời mời",
                      })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <View style={styles.crewBlock}>
            <Text style={styles.sectionTitle}>
              {t("planner.crewTitle", { defaultValue: "Thành viên" })} (
              {crewCount})
            </Text>
            {loading ? (
              <ActivityIndicator
                style={{ marginTop: 20 }}
                color={COLORS.primary}
              />
            ) : (
              <>
                {plan?.owner && (
                  <View style={styles.row}>
                    <View style={styles.avatar}>
                      {plan.owner.avatar_url ? (
                        <Image
                          source={{ uri: plan.owner.avatar_url }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <Ionicons
                          name="person"
                          size={24}
                          color={COLORS.textSecondary}
                        />
                      )}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{plan.owner.full_name}</Text>
                      <Text style={styles.role}>
                        {t("planner.roleOwner", {
                          defaultValue: "Chủ đoàn",
                        })}
                      </Text>
                    </View>
                    <View style={styles.star}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                    </View>
                  </View>
                )}

                {participants.length === 0 ? (
                  <Text style={styles.empty}>
                    {t("planner.noCrewYet", {
                      defaultValue: "Chưa có thành viên khác",
                    })}
                  </Text>
                ) : (
                  participants.map((p) => (
                    <View key={p.id} style={styles.row}>
                      <View style={styles.avatar}>
                        {p.userAvatar ? (
                          <Image
                            source={{ uri: p.userAvatar }}
                            style={styles.avatarImg}
                          />
                        ) : (
                          <Ionicons
                            name="person"
                            size={24}
                            color={COLORS.textSecondary}
                          />
                        )}
                      </View>
                      <View style={styles.rowText}>
                        <Text style={styles.name}>{p.userName}</Text>
                        <Text style={styles.role}>
                          {p.role === "owner"
                            ? t("planner.roleOwner", {
                                defaultValue: "Chủ đoàn",
                              })
                            : p.role === "editor"
                              ? t("planner.roleEditor", {
                                  defaultValue: "Chỉnh sửa",
                                })
                              : t("planner.roleMember", {
                                  defaultValue: "Thành viên",
                                })}
                        </Text>
                      </View>
                      {p.role === "owner" && (
                        <View style={styles.star}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                        </View>
                      )}
                    </View>
                  ))
                )}
              </>
            )}
          </View>

          {isPlanOwner && pendingInvites.length > 0 && (
            <View style={[styles.crewBlock, { marginTop: 8 }]}>
              <Text style={styles.sectionTitle}>
                {t("planner.pendingInvites", {
                  defaultValue: "Lời mời đang chờ",
                })}
              </Text>
              {pendingInvites.map((inv) => (
                <View
                  key={inv.id}
                  style={[styles.row, styles.inviteRow]}
                >
                  <Ionicons
                    name="mail-outline"
                    size={22}
                    color={COLORS.textSecondary}
                    style={{ marginRight: 8 }}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <Text style={styles.name}>{inv.email}</Text>
                    <Text style={styles.role}>
                      {formatInviteStatus(inv.status)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => shareInviteLink(inv)}
                    style={{ padding: 8 }}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    accessibilityRole="button"
                    accessibilityLabel={t("planner.shareInviteLink", {
                      defaultValue: "Chia sẻ link mời",
                    })}
                  >
                    <Ionicons
                      name="share-outline"
                      size={22}
                      color={COLORS.primary}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}
        </ScrollView>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
    paddingTop: 40,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  close: {
    fontSize: 16,
    color: COLORS.primary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  inviteBlock: { marginBottom: SPACING.xl },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emailInput: {
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 16,
    color: COLORS.textPrimary,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.sm,
  },
  hint: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  inviteBtn: {
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  inviteBtnDisabled: { opacity: 0.5 },
  inviteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  crewBlock: { marginTop: SPACING.md },
  empty: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.lg,
    fontStyle: "italic",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    paddingHorizontal: SPACING.sm,
    backgroundColor: COLORS.backgroundCard,
    borderRadius: BORDER_RADIUS.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  inviteRow: {
    backgroundColor: "#F9FAFB",
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: COLORS.background,
    alignItems: "center",
    justifyContent: "center",
    marginRight: SPACING.md,
    overflow: "hidden",
  },
  avatarImg: { width: "100%", height: "100%" },
  rowText: { flex: 1 },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: COLORS.textPrimary,
    marginBottom: 2,
  },
  role: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  star: { padding: SPACING.xs },
});
