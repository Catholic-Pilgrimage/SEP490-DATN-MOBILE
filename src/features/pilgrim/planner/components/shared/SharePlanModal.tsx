import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import { useConfirm } from "../../../../../hooks/useConfirm";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../../services/api/pilgrim/plannerApi";
import type {
  PlanEntity,
  PlanInvite,
  PlanParticipant,
  PlannerProgressMember,
} from "../../../../../types/pilgrim/planner.types";
import { getApiErrorMessage } from "../../../../../utils/apiError";
import { getInitialsFromFullName } from "../../../../../utils/initials";
import {
  buildPlannerInviteDeepLink,
  filterInvitesNeedingAction,
  mapMembersToParticipants,
} from "../../utils/planShare.utils";
import { isGroupJourneyPlan } from "../../utils/planPatronScope.utils";
import { scheduleCompleteHeuristic } from "../../utils/plannerFlow.utils";
import { FriendPickerModal } from "./FriendPickerModal";
import type { FriendshipListItem } from "../../../../../types/pilgrim";
import { useFriendship } from "../../../profile/hooks/useFriendship";
import { useAuth } from "../../../../../hooks/useAuth";

export interface SharePlanModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  plan: PlanEntity | null;
  isPlanOwner: boolean;
  isOffline: boolean;
  onOfflineRequired: () => void;
  /** Sau khi mời / xóa thành viên — đồng bộ lại chi tiết kế hoạch (khóa chỉnh sửa xử lý ở màn planner) */
  onPlanRefresh?: () => void;
}

export const SharePlanModal: React.FC<SharePlanModalProps> = ({
  visible,
  onClose,
  planId,
  plan,
  isPlanOwner,
  isOffline,
  onOfflineRequired,
  onPlanRefresh,
}) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { confirm } = useConfirm();
  const [participants, setParticipants] = useState<PlanParticipant[]>([]);
  const [pendingInvites, setPendingInvites] = useState<PlanInvite[]>([]);
  const [loading, setLoading] = useState(false);
  const [emailChips, setEmailChips] = useState<string[]>([]);
  const [currentEmailText, setCurrentEmailText] = useState("");
  const [inviteRole] = useState<"viewer">("viewer");
  const [inviting, setInviting] = useState(false);
  const [progressByUserId, setProgressByUserId] = useState<
    Record<string, PlannerProgressMember>
  >({});
  const [removingMemberId, setRemovingMemberId] = useState<string | null>(null);
  const [checklistGuideVisible, setChecklistGuideVisible] = useState(false);
  const [showFriendPicker, setShowFriendPicker] = useState(false);

  const { user: currentUser } = useAuth();
  const { friends, fetchFriends } = useFriendship();

  useEffect(() => {
    if (visible && currentUser) {
      fetchFriends();
    }
  }, [visible, currentUser]);

  useEffect(() => {
    if (!visible) setChecklistGuideVisible(false);
  }, [visible]);

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
      const [memRes, progRes] = await Promise.all([
        pilgrimPlannerApi.getPlanMembers(planId),
        pilgrimPlannerApi.getPlannerProgress(planId).catch(() => null),
      ]);

      if (memRes.success && memRes.data?.members) {
        setParticipants(mapMembersToParticipants(memRes.data.members, plan));
      } else {
        setParticipants([]);
      }

      if (progRes?.success && progRes.data?.member_progress?.length) {
        const map: Record<string, PlannerProgressMember> = {};
        for (const row of progRes.data.member_progress) {
          map[row.user_id] = row;
        }
        setProgressByUserId(map);
      } else {
        setProgressByUserId({});
      }

      if (isPlanOwner) {
        const invRes = await pilgrimPlannerApi.getPlanInvites(planId);
        const raw = invRes.success ? (invRes.data?.invites ?? []) : [];
        setPendingInvites(filterInvitesNeedingAction(raw));
      } else {
        setPendingInvites([]);
      }
    } catch (e) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.loadMembersFailed", {
          defaultValue: "Không thể tải danh sách thành viên",
        }),
      });
      setParticipants([]);
      setPendingInvites([]);
      setProgressByUserId({});
    } finally {
      setLoading(false);
    }
  }, [planId, plan, isPlanOwner]);

  const formatProgressLine = (row?: PlannerProgressMember) => {
    if (!row) return null;
    return t("planner.memberProgressLine", {
      percent: Math.round(row.percent ?? 0),
      checked: row.checked_in ?? 0,
      total: row.total_items ?? 0,
      defaultValue: "{{percent}}% · {{checked}}/{{total}} điểm",
    });
  };

  const renderProgressHint = (userId?: string) => {
    const line = userId
      ? formatProgressLine(progressByUserId[userId])
      : null;
    if (!line) return null;
    return <Text style={styles.progressHint}>{line}</Text>;
  };

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
    const allEmails = [...emailChips];
    if (currentEmailText.trim()) {
      allEmails.push(currentEmailText.trim().toLowerCase());
    }
    const emails = Array.from(new Set(allEmails.filter(e => e.length > 0)));

    if (emails.length === 0) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("planner.emailRequired", {
          defaultValue: "Vui lòng nhập ít nhất 1 email",
        }),
      });
      return;
    }
    try {
      setInviting(true);
      let successCount = 0;
      let failCount = 0;
      let lastErrorMessage = "";

      for (const email of emails) {
        try {
          const friendMatch = friends.find(f => f.user.email.toLowerCase() === email.toLowerCase());
          let res;
          
          if (friendMatch) {
            res = await pilgrimPlannerApi.inviteFriend(planId, friendMatch.user.id);
          } else {
            res = await pilgrimPlannerApi.inviteParticipant(planId, {
              email,
              role: inviteRole,
            });
          }
          
          if (res.success) {
            successCount++;
          } else {
            failCount++;
            lastErrorMessage = res.message || t("common.errorUnknown", { defaultValue: "Lỗi không xác định" });
          }
        } catch (e: any) {
          failCount++;
          lastErrorMessage = getApiErrorMessage(e, t("planner.inviteFailed", { defaultValue: "Lời mời thất bại" }));
        }
      }

      if (successCount > 0) {
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: emails.length === 1 
            ? t("planner.inviteSuccess") 
            : t("planner.inviteMultipleSuccess", { count: successCount }),
        });
        setEmailChips([]);
        setCurrentEmailText("");
        await loadPanel();
      }

      if (failCount > 0) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: emails.length === 1 
            ? lastErrorMessage 
            : t("planner.inviteMultipleFail", { count: failCount, message: lastErrorMessage }),
        });
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getApiErrorMessage(
          e,
          t("planner.inviteFailed", { defaultValue: "Gửi lời mời thất bại" }),
        ),
      });
    } finally {
      setInviting(false);
    }
  };

  const handleFriendSelect = async (selected: FriendshipListItem[]) => {
    if (isOffline) {
      onOfflineRequired();
      return;
    }

    setInviting(true);
    let successCount = 0;
    let failCount = 0;
    let lastErrorMessage = "";

    for (const f of selected) {
      try {
        // Friends selected from picker → always use invite-friend API (no deposit required)
        const res = await pilgrimPlannerApi.inviteFriend(planId, f.user.id);
        if (res.success) {
          successCount++;
        } else {
          failCount++;
          lastErrorMessage = res.message || t("common.errorUnknown", { defaultValue: "Lỗi không xác định" });
        }
      } catch (e: any) {
        failCount++;
        lastErrorMessage = getApiErrorMessage(e, t("planner.inviteFailed", { defaultValue: "Lời mời thất bại" }));
      }
    }

    if (successCount > 0) {
      Toast.show({
        type: "success",
        text1: t("planner.inviteSuccess"),
        text2: t("planner.inviteFriendSuccess", { count: successCount }),
      });
      await loadPanel();
    }

    if (failCount > 0) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: selected.length === 1 
          ? lastErrorMessage 
          : t("planner.inviteMultipleFail", { count: failCount, message: lastErrorMessage }),
      });
    }
    setInviting(false);
  };

  const handleEmailTextChange = (text: string) => {
    // If user typed a space, comma, or semicolon, we extract emails
    if (/[,;\s]+/.test(text)) {
      const parts = text.split(/[,;\s]+/).map(p => p.trim().toLowerCase());
      const newChips = parts.filter(p => p.length > 0 && p.includes('@'));
      const invalidOrIncomplete = parts.filter(p => p.length > 0 && !p.includes('@')).join(' ');

      if (newChips.length > 0) {
        setEmailChips(prev => {
          const combined = [...prev, ...newChips];
          return Array.from(new Set(combined)); // unique
        });
      }
      setCurrentEmailText(invalidOrIncomplete);
    } else {
      setCurrentEmailText(text);
    }
  };

  const handleSelectSuggestedFriend = (friend: FriendshipListItem) => {
    const friendEmail = friend.user.email.toLowerCase();
    if (!emailChips.includes(friendEmail)) {
      setEmailChips(prev => [...prev, friendEmail]);
    }
    setCurrentEmailText("");
  };

  // Filter friends based on current text
  const getSuggestions = () => {
    const q = currentEmailText.trim().toLowerCase();
    if (!q) return [];
    
    const alreadyInvited = new Set([
      ...participants.map((p) => (p.userEmail || "").toLowerCase()),
      ...pendingInvites.map((i) => (i.email || "").toLowerCase()),
      ...emailChips
    ]);

    return friends.filter(f => {
      if (alreadyInvited.has(f.user.email.toLowerCase())) return false;
      const name = (f.user.full_name || "").toLowerCase();
      const email = (f.user.email || "").toLowerCase();
      return name.includes(q) || email.includes(q);
    }).slice(0, 4); // show max 4 suggestions
  };

  const suggestions = getSuggestions();

  const handleEmailSubmit = () => {
    const txt = currentEmailText.trim().toLowerCase();
    if (txt) {
      if (!emailChips.includes(txt)) {
        setEmailChips(prev => [...prev, txt]);
      }
      setCurrentEmailText("");
    }
  };

  const removeEmailChip = (emailToRemove: string) => {
    setEmailChips(prev => prev.filter(e => e !== emailToRemove));
  };

  const removeMemberFromPlan = async (p: PlanParticipant) => {
    if (isOffline) {
      onOfflineRequired();
      return;
    }
    try {
      setRemovingMemberId(p.id);
      const res = await pilgrimPlannerApi.removePlanMember(planId, p.userId);
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2: t("planner.memberRemoved", {
            defaultValue: "Đã xóa thành viên khỏi kế hoạch.",
          }),
        });
        await loadPanel();
        onPlanRefresh?.();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("planner.removeMemberFailed", {
              defaultValue: "Không thể xóa thành viên.",
            }),
        });
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getApiErrorMessage(
          e,
          t("planner.removeMemberFailed", {
            defaultValue: "Không thể xóa thành viên.",
          }),
        ),
      });
    } finally {
      setRemovingMemberId(null);
    }
  };

  const confirmRemoveMember = async (p: PlanParticipant) => {
    const confirmed = await confirm({
      type: "warning",
      title: t("planner.removeMemberTitle", { defaultValue: "Xóa thành viên?" }),
      message: t("planner.removeMemberMessage", {
        name: p.userName,
        defaultValue: "Xóa {{name}} khỏi kế hoạch?",
      }),
      confirmText: t("planner.removeMemberConfirm", { defaultValue: "Xóa" }),
      cancelText: t("common.cancel", { defaultValue: "Hủy" }),
    });

    if (confirmed) {
      void removeMemberFromPlan(p);
    }
  };

  const ownerUserId = plan?.owner?.id;
  const participantsOtherThanOwner = ownerUserId
    ? participants.filter((p) => p.userId !== ownerUserId)
    : participants;
  const crewCount =
    (plan?.owner ? 1 : 0) + participantsOtherThanOwner.length;

  const crewCountLabel =
    plan?.number_of_people != null && plan.number_of_people > 0
      ? `${crewCount}/${plan.number_of_people}`
      : String(crewCount);

  /** Chỉ khi không có ai trên roster; khác với “chỉ mới có chủ đoàn”. */
  const showNoCrewPlaceholder = !plan?.owner && participants.length === 0;
  const showWaitingForOthersPlaceholder =
    !showNoCrewPlaceholder && participantsOtherThanOwner.length === 0;

  const inviteHasEmail = emailChips.length > 0 || currentEmailText.trim().length > 0;
  const inviteButtonMuted = !inviteHasEmail && !inviting;

  const checklistGuideTitle = t("planner.shareModalGroupChecklistTitle", {
    defaultValue: "Quy trình chốt đoàn",
  });

  const renderChecklistGuideBody = () => {
    if (!plan) return null;
    const scheduleOk = scheduleCompleteHeuristic(plan);
    return (
      <View style={styles.checklistBlock}>
        <View style={styles.checklistRow}>
          <Ionicons
            name={scheduleOk ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={scheduleOk ? "#10B981" : "#9CA3AF"}
            style={styles.checklistIcon}
          />
          <Text style={styles.checklistText}>
            {t("planner.shareCheckSchedule", {
              defaultValue:
                "Lịch trình: mỗi ngày trong chuyến có ít nhất một điểm (server kiểm tra).",
            })}
          </Text>
        </View>
        <View style={styles.checklistRow}>
          <Ionicons
            name={crewCount > 1 ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={crewCount > 1 ? "#10B981" : "#9CA3AF"}
            style={styles.checklistIcon}
          />
          <Text style={styles.checklistText}>
            {t("planner.shareCheckInvite", {
              defaultValue:
                "Mời email / chia sẻ link — thành viên xem cọc, phạt %, chat rồi đồng ý & thanh toán.",
            })}
          </Text>
        </View>
        <View style={styles.checklistRow}>
          <Ionicons
            name={plan.is_locked ? "checkmark-circle" : "ellipse-outline"}
            size={20}
            color={plan.is_locked ? "#10B981" : "#9CA3AF"}
            style={styles.checklistIcon}
          />
          <Text style={styles.checklistText}>
            {t("planner.shareCheckLock", {
              defaultValue:
                "Khóa chỉnh sửa khi đoàn đã chốt — dùng màn chi tiết kế hoạch. Sau đó server chặn chỉnh sửa theo quy tắc.",
            })}
          </Text>
        </View>
      </View>
    );
  };

  const isGroupPlan = isGroupJourneyPlan(plan || {});

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: Platform.OS === "android" ? insets.top || 20 : 16 }]}>
        <View style={styles.header}>
          <Text style={styles.headerTitle}>{t("planner.sharePlan")}</Text>
          <TouchableOpacity onPress={onClose}>
            <Text style={styles.close}>{t("planner.close")}</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: Math.max(insets.bottom, 16) + 32 }]}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
        >
          {isPlanOwner && (
            <View style={styles.inviteBlock}>
              <View style={styles.sectionTitleRow}>
                <Text style={styles.sectionTitleFlex} numberOfLines={2}>
                  {t("planner.addMember")}
                </Text>
                {isGroupPlan ? (
                  <TouchableOpacity
                    onPress={() => setChecklistGuideVisible(true)}
                    hitSlop={{ top: 8, bottom: 8, left: 4, right: 8 }}
                    style={styles.sectionTitleInfoBtn}
                    accessibilityRole="button"
                    accessibilityLabel={t("planner.checklistGuideA11y", {
                      defaultValue: "Xem hướng dẫn quy trình chốt đoàn",
                    })}
                  >
                    <Ionicons
                      name="information-circle-outline"
                      size={24}
                      color="#B45309"
                    />
                  </TouchableOpacity>
                ) : null}
              </View>
              <View style={{ zIndex: 10, position: 'relative' }}>
                <View style={[styles.emailInputWrap, emailChips.length > 0 && { paddingVertical: 8, height: 'auto' }]}>
                  <Ionicons
                    name="mail-outline"
                    size={20}
                    color={COLORS.textTertiary}
                    style={styles.emailInputIcon}
                  />
                  <View style={{ flex: 1, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center' }}>
                    {emailChips.map((chip, index) => (
                      <View key={`chip-${index}`} style={{ flexDirection: 'row', alignItems: 'center', backgroundColor: '#E0E7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 16, margin: 2, borderWidth: 1, borderColor: '#C7D2FE' }}>
                        <Text style={{ fontSize: 13, color: '#3730A3', fontWeight: '500' }}>{chip}</Text>
                        <TouchableOpacity onPress={() => removeEmailChip(chip)} style={{ marginLeft: 4 }}>
                          <Ionicons name="close-circle" size={16} color="#4F46E5" />
                        </TouchableOpacity>
                      </View>
                    ))}
                    <TextInput
                      style={[styles.emailInputInner, emailChips.length > 0 && { minWidth: 120, marginLeft: 4 }]}
                      placeholder={emailChips.length === 0 ? t("planner.inviteEmailPlaceholder", { defaultValue: "Nhập email hoặc tên bạn bè..." }) : ""}
                      placeholderTextColor={COLORS.textTertiary}
                      value={currentEmailText}
                      onChangeText={handleEmailTextChange}
                      onSubmitEditing={handleEmailSubmit}
                      blurOnSubmit={false}
                      keyboardType="default" // Allow both letters for name and email formatting
                      autoCapitalize="none"
                      editable={!isOffline}
                      returnKeyType="done"
                    />
                  </View>
                  <TouchableOpacity
                    onPress={() => setShowFriendPicker(true)}
                    style={styles.friendPickerBtn}
                    disabled={inviting || isOffline}
                    accessibilityLabel={t("planner.openFriendPicker", { defaultValue: "Mở danh bạ bạn bè" })}
                  >
                    <Ionicons name="person-add-outline" size={26} color={COLORS.primary} />
                  </TouchableOpacity>
                </View>

                {/* Dropdown Suggestions */}
                {suggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    {suggestions.map((f) => (
                      <TouchableOpacity
                        key={f.user.id}
                        style={styles.suggestionItem}
                        onPress={() => handleSelectSuggestedFriend(f)}
                      >
                        <View style={styles.suggestionAvatarBlock}>
                          {f.user.avatar_url ? (
                            <Image source={{ uri: f.user.avatar_url }} style={styles.suggestionAvatar} />
                          ) : (
                            <View style={[styles.suggestionAvatar, styles.suggestionAvatarInitials]}>
                              <Text style={styles.suggestionAvatarText}>
                                {getInitialsFromFullName(f.user.full_name || "")}
                              </Text>
                            </View>
                          )}
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={styles.suggestionName} numberOfLines={1}>{f.user.full_name || "Trống"}</Text>
                          <Text style={styles.suggestionEmail} numberOfLines={1}>{f.user.email}</Text>
                        </View>
                        <Ionicons name="add-circle" size={22} color={COLORS.primary} />
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
              <TouchableOpacity
                style={[
                  styles.inviteBtn,
                  inviteButtonMuted && styles.inviteBtnMuted,
                  (inviting || isOffline) && styles.inviteBtnDisabled,
                ]}
                onPress={submitInvite}
                disabled={inviting || isOffline || !inviteHasEmail}
                accessibilityState={{
                  disabled: inviting || isOffline || !inviteHasEmail,
                }}
              >
                {inviting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons
                      name="person-add-outline"
                      size={20}
                      color={inviteButtonMuted ? "#9CA3AF" : "#fff"}
                    />
                    <Text
                      style={[
                        styles.inviteBtnText,
                        inviteButtonMuted && styles.inviteBtnTextMuted,
                      ]}
                    >
                      {t("planner.sendInvite", {
                        defaultValue: "Gửi lời mời",
                      })}
                    </Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}

          <FriendPickerModal
            visible={showFriendPicker}
            onClose={() => setShowFriendPicker(false)}
            onSelect={handleFriendSelect}
            alreadyInvitedEmails={[
              ...participants.map((p) => (p.userEmail || "").toLowerCase()),
              ...pendingInvites.map((i) => (i.email || "").toLowerCase()),
            ]}
          />

          <View style={styles.crewBlock}>
            <Text style={styles.sectionTitle}>
              {t("planner.crewTitle", { defaultValue: "Thành viên" })} (
              {crewCountLabel})
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
                    <View
                      style={[
                        styles.avatar,
                        !plan.owner.avatar_url && styles.avatarInitialsBg,
                      ]}
                    >
                      {plan.owner.avatar_url ? (
                        <Image
                          source={{ uri: plan.owner.avatar_url }}
                          style={styles.avatarImg}
                        />
                      ) : (
                        <Text style={styles.avatarInitialsText}>
                          {getInitialsFromFullName(plan.owner.full_name || "—")}
                        </Text>
                      )}
                    </View>
                    <View style={styles.rowText}>
                      <Text style={styles.name}>{plan.owner.full_name}</Text>
                      <Text style={styles.role}>
                        {t("planner.roleOwner", {
                          defaultValue: "Chủ đoàn",
                        })}
                      </Text>
                      {renderProgressHint(plan.owner.id)}
                    </View>
                    <View style={styles.star}>
                      <Ionicons name="star" size={16} color="#FFD700" />
                    </View>
                  </View>
                )}

                {showNoCrewPlaceholder || showWaitingForOthersPlaceholder ? (
                  <Text
                    style={[
                      styles.empty,
                      showWaitingForOthersPlaceholder &&
                        styles.emptyWaitingMuted,
                    ]}
                  >
                    {showNoCrewPlaceholder
                      ? t("planner.noCrewYet", {
                          defaultValue: "Chưa có thành viên",
                        })
                      : t("planner.waitingOtherMembers", {
                          defaultValue:
                            "Đang đợi các thành viên khác tham gia…",
                        })}
                  </Text>
                ) : (
                  participants
                    .filter(
                      (p) =>
                        !ownerUserId || p.userId !== ownerUserId,
                    )
                    .map((p) => (
                    <View key={p.id} style={styles.row}>
                      <View
                        style={[
                          styles.avatar,
                          !p.userAvatar && styles.avatarInitialsBg,
                        ]}
                      >
                        {p.userAvatar ? (
                          <Image
                            source={{ uri: p.userAvatar }}
                            style={styles.avatarImg}
                          />
                        ) : (
                          <Text style={styles.avatarInitialsText}>
                            {getInitialsFromFullName(p.userName || "—")}
                          </Text>
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
                        {renderProgressHint(p.userId)}
                      </View>
                      {p.role === "owner" ? (
                        <View style={styles.star}>
                          <Ionicons name="star" size={16} color="#FFD700" />
                        </View>
                      ) : isPlanOwner ? (
                        <TouchableOpacity
                          onPress={() => confirmRemoveMember(p)}
                          disabled={
                            removingMemberId === p.id || isOffline
                          }
                          style={styles.removeMemberBtn}
                          accessibilityRole="button"
                          accessibilityLabel={t("planner.removeMemberA11y", {
                            defaultValue: "Xóa thành viên",
                          })}
                        >
                          {removingMemberId === p.id ? (
                            <ActivityIndicator
                              size="small"
                              color={COLORS.danger}
                            />
                          ) : (
                            <Ionicons
                              name="trash-outline"
                              size={22}
                              color={COLORS.danger}
                            />
                          )}
                        </TouchableOpacity>
                      ) : null}
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

        <Modal
          visible={checklistGuideVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setChecklistGuideVisible(false)}
        >
          <View style={styles.checklistGuideBackdrop}>
            <TouchableOpacity
              style={styles.checklistGuideBackdropTouchable}
              activeOpacity={1}
              onPress={() => setChecklistGuideVisible(false)}
            />
            <View style={styles.checklistGuideCard}>
              <View style={styles.checklistGuideCardHeader}>
                <Text style={styles.checklistGuideCardTitle}>
                  {checklistGuideTitle}
                </Text>
                <TouchableOpacity
                  onPress={() => setChecklistGuideVisible(false)}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  accessibilityRole="button"
                  accessibilityLabel={t("planner.close")}
                >
                  <Ionicons
                    name="close"
                    size={26}
                    color={COLORS.textSecondary}
                  />
                </TouchableOpacity>
              </View>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.checklistGuideScroll}
              >
                {renderChecklistGuideBody()}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
      <Toast config={toastConfig} />
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  headerTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.35,
    color: COLORS.textPrimary,
  },
  close: {
    fontSize: 16,
    color: COLORS.primary,
  },
  scroll: { flex: 1 },
  scrollContent: { padding: 16 },
  checklistBlock: {
    marginBottom: SPACING.lg,
    padding: 16,
    backgroundColor: "rgba(217, 119, 6, 0.08)",
    borderRadius: BORDER_RADIUS.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: "rgba(217, 119, 6, 0.22)",
  },
  checklistRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
  },
  checklistIcon: {
    marginTop: 2,
    marginRight: 8,
  },
  checklistText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: COLORS.textSecondary,
  },
  checklistGuideBackdrop: {
    flex: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  checklistGuideBackdropTouchable: {
    ...StyleSheet.absoluteFillObject,
  },
  checklistGuideCard: {
    width: "100%",
    maxWidth: 400,
    alignSelf: "center",
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    zIndex: 1,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
  },
  checklistGuideCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  checklistGuideCardTitle: {
    flex: 1,
    marginRight: 12,
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  checklistGuideScroll: {
    maxHeight: 420,
  },
  inviteBlock: { marginBottom: SPACING.xl },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    flexWrap: "wrap",
    marginBottom: SPACING.md,
  },
  sectionTitleFlex: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: COLORS.textPrimary,
    flexShrink: 1,
  },
  sectionTitleInfoBtn: {
    marginLeft: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    letterSpacing: -0.1,
    color: COLORS.textPrimary,
    marginBottom: SPACING.md,
  },
  emailInputWrap: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.backgroundCard,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.md,
    paddingHorizontal: 12,
    minHeight: 52,
    marginBottom: SPACING.sm,
  },
  emailInputIcon: {
    marginRight: 8,
  },
  emailInputInner: {
    flex: 1,
    fontSize: 16,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },
  inviteBtn: {
    marginTop: SPACING.sm,
    backgroundColor: COLORS.accent,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.xs,
    paddingVertical: SPACING.md,
    borderRadius: BORDER_RADIUS.md,
    ...SHADOWS.small,
  },
  inviteBtnMuted: {
    backgroundColor: "#E5E7EB",
    shadowOpacity: 0,
    elevation: 0,
  },
  inviteBtnDisabled: { opacity: 0.5 },
  inviteBtnText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  inviteBtnTextMuted: {
    color: "#9CA3AF",
  },
  crewBlock: { marginTop: SPACING.md },
  empty: {
    textAlign: "center",
    color: COLORS.textSecondary,
    fontSize: 14,
    marginTop: SPACING.lg,
    fontStyle: "italic",
  },
  /** Dòng “đang đợi thành viên khác” — nhạt hơn một chút so với “chưa có ai”. */
  emptyWaitingMuted: {
    color: COLORS.textTertiary,
    opacity: 0.95,
  },
  suggestionsContainer: {
    backgroundColor: COLORS.white,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    position: 'absolute',
    top: 56, // Just below the input wrap
    left: 0,
    right: 0,
    zIndex: 999,
    ...SHADOWS.small,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  suggestionAvatarBlock: {
    marginRight: 10,
  },
  suggestionAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  suggestionAvatarInitials: {
    backgroundColor: '#E5E1D8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  suggestionAvatarText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#B8860B',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  suggestionEmail: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
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
  avatarInitialsBg: {
    backgroundColor: "rgba(140, 109, 66, 0.2)",
  },
  avatarInitialsText: {
    fontSize: 17,
    fontWeight: "700",
    color: COLORS.textPrimary,
    letterSpacing: 0.5,
  },
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
  progressHint: {
    fontSize: 12,
    color: "#B45309",
    backgroundColor: "rgba(217, 119, 6, 0.12)",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 100,
    marginTop: 6,
    fontWeight: "600",
    overflow: "hidden",
  },
  star: { padding: SPACING.xs },
  removeMemberBtn: {
    padding: SPACING.sm,
    marginLeft: SPACING.xs,
  },
  friendPickerBtn: {
    padding: SPACING.sm,
    justifyContent: "center",
    alignItems: "center",
  },
});
