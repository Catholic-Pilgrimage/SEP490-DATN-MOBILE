import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { toastConfig } from "../../../../../config/toast.config";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS
} from "../../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../../services/api/pilgrim/plannerApi";
import type {
  MarkVisitedConfirmationResponse,
  PlanItem,
  PlannerMemberApiRow,
} from "../../../../../types/pilgrim/planner.types";
import { getInitialsFromFullName } from "../../../../../utils/initials";

type MemberStatus = {
  id: string;
  full_name: string;
  avatar_url?: string;
  checked_in: boolean;
};

type Props = {
  visible: boolean;
  onClose: () => void;
  planId: string;
  item: PlanItem | null;
  isLastItem: boolean;
  onCompleted: () => void;
  refreshPlan: () => Promise<void>;
};

/**
 * Modal hiển thị danh sách member đã & chưa check-in tại một điểm.
 * Owner xem danh sách → nhập lý do cho thành viên vắng → xác nhận chốt.
 *
 * Flow:
 * 1. Gọi `updatePlannerItemStatus(visited)` không có `confirm_missed`
 * 2. Nếu BE trả `requires_confirmation` → hiển thị danh sách thành viên vắng
 * 3. Owner nhập lý do → gọi lần 2 với `confirm_missed: true`
 * 4. Nếu tất cả đã check-in → chốt thẳng, không cần xác nhận
 */
export default function MarkVisitedModal({
  visible,
  onClose,
  planId,
  item,
  isLastItem,
  onCompleted,
  refreshPlan,
}: Props) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [members, setMembers] = useState<MemberStatus[]>([]);
  const [missingMembers, setMissingMembers] = useState<
    MarkVisitedConfirmationResponse["missing_members"]
  >([]);
  const [confirmationNeeded, setConfirmationNeeded] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [stats, setStats] = useState<{ checked_in: number; missed: number }>({
    checked_in: 0,
    missed: 0,
  });

  // Load member check-in status for this item
  const loadMemberStatus = useCallback(async () => {
    if (!planId || !item?.id) return;
    try {
      setLoading(true);
      const [membersRes, progressRes] = await Promise.all([
        pilgrimPlannerApi.getPlanMembers(planId),
        pilgrimPlannerApi.getPlannerProgress(planId),
      ]);

      const allMembers: PlannerMemberApiRow[] =
        membersRes.success && membersRes.data?.members
          ? membersRes.data.members
          : [];

      // Build checked-in set for this specific item
      const checkedInUserIds = new Set<string>();
      if (progressRes.success && progressRes.data?.member_progress) {
        for (const mp of progressRes.data.member_progress) {
          const hasCheckedIn = mp.history?.some(
            (h) =>
              h.planner_item_id === item.id && h.status === "checked_in"
          );
          if (hasCheckedIn) {
            checkedInUserIds.add(String(mp.user_id));
          }
        }
      }

      const list: MemberStatus[] = allMembers.map((m) => ({
        id: String(m.id),
        full_name: m.full_name || m.email || "—",
        avatar_url: m.avatar_url,
        checked_in: checkedInUserIds.has(String(m.id)),
      }));

      setMembers(list);

      const checkedCount = list.filter((m) => m.checked_in).length;
      const missedCount = list.filter((m) => !m.checked_in).length;
      setStats({ checked_in: checkedCount, missed: missedCount });
    } catch {
      setMembers([]);
      Toast.show({
        type: "error",
        text1: "Không thể tải danh sách",
        text2: "Không thể lấy thông tin check-in thành viên",
      });
    } finally {
      setLoading(false);
    }
  }, [planId, item?.id]);

  useEffect(() => {
    if (visible && item) {
      setConfirmationNeeded(false);
      setSkipReason("");
      setMissingMembers([]);
      void loadMemberStatus();
    }
  }, [visible, item, loadMemberStatus]);

  const handleSubmit = async () => {
    if (!item?.id) return;
    try {
      setSubmitting(true);

      if (confirmationNeeded) {
        // Step 2: Confirm with reason
        const res = await pilgrimPlannerApi.updatePlannerItemStatus(
          planId,
          item.id,
          {
            status: "visited",
            requires_confirmation: false,
            skip_reason:
              skipReason.trim() ||
              "Trưởng đoàn xác nhận chốt điểm (ghi nhận vắng mặt)",
          }
        );
        if (!res.success) {
          throw new Error(res.message || "Không thể chốt điểm");
        }
        Toast.show({
          type: "success",
          text1: "Đã chốt điểm viếng",
          text2: item.site.name,
        });
        onClose();
        await handleAfterVisited();
      } else {
        // Step 1: Initial attempt
        const res = await pilgrimPlannerApi.updatePlannerItemStatus(
          planId,
          item.id,
          { status: "visited" }
        );
        if (!res.success) {
          throw new Error(res.message || "Không thể chốt điểm");
        }

        const payload = res.data;
        if (
          payload &&
          typeof payload === "object" &&
          "requires_confirmation" in payload &&
          (payload as MarkVisitedConfirmationResponse)
            .requires_confirmation === true
        ) {
          // Need confirmation — show missing members
          const confirmData = payload as MarkVisitedConfirmationResponse;
          setMissingMembers(confirmData.missing_members || []);
          setStats({
            checked_in: confirmData.stats?.checked_in ?? stats.checked_in,
            missed: confirmData.stats?.missed ?? stats.missed,
          });
          setConfirmationNeeded(true);
          return;
        }

        // All members checked in -> success
        Toast.show({
          type: "success",
          text1: "Đã chốt điểm viếng",
          text2: item.site.name,
        });
        onClose();
        await handleAfterVisited();
      }
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Không thể chốt điểm",
        text2: e?.message || "Vui lòng thử lại",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleAfterVisited = async () => {
    if (isLastItem) {
      try {
        const compRes = await pilgrimPlannerApi.updatePlannerStatus(planId, {
          status: "completed",
        });
        if (compRes.success) {
          Toast.show({
            type: "success",
            text1: "Hành trình đã kết thúc!",
            text2: "Trưởng đoàn đã chốt điểm cuối cùng.",
          });
          onCompleted();
          return;
        }
      } catch {
        Toast.show({
          type: "info",
          text1: "Chưa thể kết thúc hành trình",
          text2: "Có thể còn điểm chưa xử lý. Vui lòng thử lại.",
        });
      }
    }
    await refreshPlan();
  };

  if (!item) return null;

  const siteName = item.site?.name || "Địa điểm";
  const checkedInMembers = members.filter((m) => m.checked_in);
  const notCheckedInMembers = members.filter((m) => !m.checked_in);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={-50}
      >
        <Pressable style={styles.overlay} onPress={onClose} />
        <View style={styles.safeAreaWrapper} pointerEvents="box-none">
          <View
            style={[styles.modal, { paddingBottom: insets.bottom + 16 }]}
          >
            {/* Handle */}
            <View style={styles.handleBar} />

          {/* Header */}
          <View style={styles.header}>
            <Ionicons name="flag" size={22} color="#15803D" />
            <Text style={styles.headerTitle}>Chốt điểm viếng</Text>
          </View>
          <Text style={styles.siteName} numberOfLines={1}>
            {siteName}
          </Text>

          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loaderText}>
                Đang tải thông tin thành viên...
              </Text>
            </View>
          ) : (
            <ScrollView
              style={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              bounces={false}
            >
              {/* Stats summary */}
              <View style={styles.statsRow}>
                <View style={[styles.statBox, { backgroundColor: "#ECFDF5" }]}>
                  <Text style={[styles.statNumber, { color: "#15803D" }]}>
                    {stats.checked_in}
                  </Text>
                  <Text style={styles.statLabel}>Đã check-in</Text>
                </View>
                <View style={[styles.statBox, { backgroundColor: "#FEF2F2" }]}>
                  <Text style={[styles.statNumber, { color: "#DC2626" }]}>
                    {stats.missed}
                  </Text>
                  <Text style={styles.statLabel}>Chưa check-in</Text>
                </View>
              </View>

              {/* Checked-in members */}
              {checkedInMembers.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>
                    ✅ Đã check-in ({checkedInMembers.length})
                  </Text>
                  {checkedInMembers.map((m) => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </View>
              )}

              {/* Not checked-in members */}
              {notCheckedInMembers.length > 0 && (
                <View style={styles.section}>
                  <Text style={[styles.sectionTitle, { color: "#DC2626" }]}>
                    ❌ Chưa check-in ({notCheckedInMembers.length})
                  </Text>
                  {notCheckedInMembers.map((m) => (
                    <MemberRow key={m.id} member={m} />
                  ))}
                </View>
              )}

              {/* Reason input — shown when confirmation needed */}
              {(confirmationNeeded || notCheckedInMembers.length > 0) && (
                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>
                    Lý do vắng mặt{" "}
                    <Text style={styles.reasonOptional}>(tùy chọn)</Text>
                  </Text>
                  <TextInput
                    style={styles.reasonInput}
                    placeholder="VD: Thành viên bận việc cá nhân, không kịp đến..."
                    placeholderTextColor={COLORS.textTertiary}
                    multiline
                    numberOfLines={3}
                    textAlignVertical="top"
                    value={skipReason}
                    onChangeText={setSkipReason}
                  />
                </View>
              )}

            </ScrollView>
          )}

          {/* Buttons */}
          <View style={styles.btnRow}>
            <TouchableOpacity
              style={styles.cancelBtn}
              onPress={onClose}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelText}>Hủy</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.confirmBtn,
                (loading || submitting) && styles.confirmBtnDisabled,
              ]}
              disabled={loading || submitting}
              onPress={handleSubmit}
              activeOpacity={0.82}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name="checkmark-circle" size={18} color="#fff" />
                  <Text style={styles.confirmText}>
                    {confirmationNeeded
                      ? "Xác nhận chốt"
                      : "Chốt điểm"}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
          </View>
        </View>
      </KeyboardAvoidingView>
      <Toast config={toastConfig} />
    </Modal>
  );
}

// ─── Small member row component ─────────────────────────
function MemberRow({ member }: { member: MemberStatus }) {
  return (
    <View style={styles.memberRow}>
      {member.avatar_url ? (
        <Image source={{ uri: member.avatar_url }} style={styles.avatar} />
      ) : (
        <View style={[styles.avatar, styles.avatarPlaceholder]}>
          <Text style={styles.avatarInitials}>
            {getInitialsFromFullName(member.full_name)}
          </Text>
        </View>
      )}
      <Text style={styles.memberName} numberOfLines={1}>
        {member.full_name}
      </Text>
      <Ionicons
        name={member.checked_in ? "checkmark-circle" : "close-circle"}
        size={20}
        color={member.checked_in ? "#15803D" : "#DC2626"}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  safeAreaWrapper: {
    flex: 1,
    justifyContent: "flex-end",
  },
  modal: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 20,
    maxHeight: "85%",
  },
  handleBar: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: COLORS.borderMedium,
    alignSelf: "center",
    marginBottom: 12,
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  siteName: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 16,
  },

  // Loader
  loader: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 13,
    color: COLORS.textSecondary,
  },

  // Scroll content
  scrollContent: {
    flexGrow: 0,
    flexShrink: 1,
    marginBottom: 12,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 16,
  },
  statBox: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: "900",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginTop: 2,
  },

  // Sections
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "800",
    color: "#15803D",
    marginBottom: 8,
    letterSpacing: 0.3,
  },

  // Member row
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
    gap: 10,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: "#E8E8E8",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + "22",
  },
  avatarInitials: {
    fontSize: 13,
    fontWeight: "800",
    color: COLORS.primary,
  },
  memberName: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },

  // Reason input
  reasonSection: {
    marginTop: 4,
    marginBottom: 8,
  },
  reasonLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  reasonOptional: {
    fontWeight: "500",
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
  reasonInput: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: COLORS.textPrimary,
    minHeight: 80,
    lineHeight: 20,
  },

  // Buttons
  btnRow: {
    flexDirection: "row",
    gap: 12,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.surface0,
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderMedium,
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  confirmBtn: {
    flex: 2,
    flexDirection: "row",
    paddingVertical: 14,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: "#15803D",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...SHADOWS.small,
  },
  confirmBtnDisabled: {
    opacity: 0.6,
  },
  confirmText: {
    fontSize: 15,
    fontWeight: "800",
    color: "#fff",
  },
});
