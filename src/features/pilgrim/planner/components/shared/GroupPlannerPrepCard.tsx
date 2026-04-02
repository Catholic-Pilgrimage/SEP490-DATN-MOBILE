import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { useTranslation } from "react-i18next";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import type { PlanEntity } from "../../../../../types/pilgrim/planner.types";
import {
  getPlannerFlowContext,
  scheduleCompleteHeuristic,
} from "../../utils/plannerFlow.utils";

type Props = {
  plan: PlanEntity;
  /** Số bản ghi thành viên có join_status = joined (BE: ≥2 ⇒ nhóm hợp lệ); null = chưa tải */
  joinedMemberCount: number | null;
  onOpenShare: () => void;
  onOpenChat: () => void;
  chatDisabled?: boolean;
};

function StepRow({
  done,
  label,
  sub,
}: {
  done: boolean;
  label: string;
  sub?: string;
}) {
  return (
    <View style={stepStyles.row}>
      <View
        style={[
          stepStyles.badge,
          { backgroundColor: done ? "#D1FAE5" : "#F3F4F6" },
        ]}
      >
        <Ionicons
          name={done ? "checkmark" : "ellipse-outline"}
          size={16}
          color={done ? "#059669" : COLORS.textTertiary}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={stepStyles.label}>{label}</Text>
        {sub ? <Text style={stepStyles.sub}>{sub}</Text> : null}
      </View>
    </View>
  );
}

const stepStyles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: 12,
  },
  badge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  label: { fontSize: 14, fontWeight: "600", color: COLORS.textPrimary },
  sub: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
    lineHeight: 16,
  },
});

/**
 * Card giai đoạn chuẩn bị nhóm: lịch → mời/cọc → khóa → bắt đầu (theo BE).
 */
export const GroupPlannerPrepCard: React.FC<Props> = ({
  plan,
  joinedMemberCount,
  onOpenShare,
  onOpenChat,
  chatDisabled,
}) => {
  const { t } = useTranslation();
  const scheduleOk = scheduleCompleteHeuristic(plan);
  const locked = !!plan.is_locked;
  const ctx = getPlannerFlowContext(plan);
  /** BE: isRealGroup = joinedMemberCount >= 2 (PlannerMember.join_status = joined) */
  const joinedOk =
    joinedMemberCount !== null ? joinedMemberCount >= 2 : null;

  const depositLabel =
    plan.deposit_amount != null && plan.deposit_amount > 0
      ? t("planner.groupDepositSetShort", {
          defaultValue: `Cọc: ${Number(plan.deposit_amount).toLocaleString("vi-VN")}₫`,
        })
      : t("planner.groupDepositUnsetShort", {
          defaultValue: "Cọc: chưa cấu hình trên kế hoạch",
        });

  return (
    <View style={styles.wrap}>
      <View style={styles.titleRow}>
        <Ionicons name="people" size={22} color="#7C3AED" />
        <Text style={styles.title}>
          {t("planner.groupPrepCardTitle", {
            defaultValue: "Chuyến nhóm — chuẩn bị",
          })}
        </Text>
      </View>
      <Text style={styles.intro}>
        {t("planner.groupPrepCardIntro", {
          defaultValue:
            "Hoàn thiện lịch trước, rồi mời qua email / link. Thành viên xem lệ phí, chat, đồng ý và đóng cọc. Cuối cùng trưởng đoàn khóa hành trình khi đoàn đã chốt — server sẽ chặn chỉnh sửa theo quy tắc.",
        })}
      </Text>

      <StepRow
        done={scheduleOk}
        label={t("planner.groupStepSchedule", {
          defaultValue: "1. Lịch trình đủ ngày & điểm",
        })}
        sub={
          scheduleOk
            ? t("planner.groupStepScheduleOk", { defaultValue: "Đã đủ điều kiện (ước lượng)." })
            : t("planner.groupStepScheduleNeed", {
                defaultValue: "Thêm điểm cho mỗi ngày trong chuyến.",
              })
        }
      />
      <StepRow
        done={joinedOk === true}
        label={t("planner.groupStepInvite", {
          defaultValue: "2. Mời & lệ phí",
        })}
        sub={
          joinedOk === false
            ? `${t("planner.groupNeedTwoJoined", {
                defaultValue:
                  "Server yêu cầu ít nhất 2 thành viên đã join (đã đóng cọc / xác nhận).",
              })} · ${depositLabel}`
            : joinedOk === true
              ? `${depositLabel} · ${t("planner.groupJoinedOk", {
                  defaultValue: "Đã đủ điều kiện thành viên (≥2).",
                })}`
              : depositLabel
        }
      />
      {joinedMemberCount !== null ? (
        <Text style={styles.crewHint}>
          {`${t("planner.groupJoinedCountLabel", {
            defaultValue: "Đã join:",
          })} ${joinedMemberCount} (≥2)`}
        </Text>
      ) : null}

      <StepRow
        done={locked}
        label={t("planner.groupStepLock", {
          defaultValue: "3. Khóa hành trình",
        })}
        sub={
          locked
            ? t("planner.groupStepLockOk", { defaultValue: "Đã khóa (theo server)." })
            : t("planner.groupStepLockNeed", {
                defaultValue:
                  "Trong màn chia sẻ — bật khóa khi đoàn đã thống nhất (BE kiểm tra).",
              })
        }
      />

      {ctx.phase === "ready_start" ? (
        <View style={styles.readyPill}>
          <Ionicons name="checkmark-circle" size={18} color="#059669" />
          <Text style={styles.readyText}>
            {t("planner.groupReadyToStart", {
              defaultValue: "Đủ điều kiện ước lượng — có thể bắt đầu hành trình.",
            })}
          </Text>
        </View>
      ) : null}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.btnPrimary} onPress={onOpenShare}>
          <Ionicons name="share-social-outline" size={20} color="#fff" />
          <Text style={styles.btnPrimaryText}>
            {t("planner.groupOpenSharePanel", {
              defaultValue: "Mời & khóa hành trình",
            })}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btnSecondary, chatDisabled && { opacity: 0.5 }]}
          onPress={onOpenChat}
          disabled={chatDisabled}
        >
          <Ionicons name="chatbubbles-outline" size={20} color={COLORS.primary} />
          <Text style={styles.btnSecondaryText}>
            {t("planner.groupOpenChat", { defaultValue: "Chat nhóm" })}
          </Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.footerNote}>
        {t("planner.groupPerMemberVisitNote", {
          defaultValue:
            "Gợi ý: trên chuyến, mỗi thành viên nên có ít nhất một lần check-in (visited) tại một điểm trong lịch — quy tắc chi tiết do server & trưởng đoàn áp dụng.",
        })}
      </Text>
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    marginBottom: SPACING.lg,
    padding: SPACING.md,
    borderRadius: 16,
    backgroundColor: "#FAF5FF",
    borderWidth: 1,
    borderColor: "#E9D5FF",
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  intro: {
    fontSize: 13,
    lineHeight: 19,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },
  crewHint: {
    fontSize: 12,
    color: "#6B21A8",
    marginTop: -4,
    marginBottom: 10,
    marginLeft: 38,
  },
  readyPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#ECFDF5",
    padding: 10,
    borderRadius: 12,
    marginBottom: 12,
  },
  readyText: { flex: 1, fontSize: 13, color: "#047857", fontWeight: "600" },
  actions: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  btnPrimary: {
    flex: 1,
    minWidth: 140,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#7C3AED",
    paddingVertical: 12,
    borderRadius: 12,
  },
  btnPrimaryText: { color: "#fff", fontWeight: "700", fontSize: 14 },
  btnSecondary: {
    flex: 1,
    minWidth: 120,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  btnSecondaryText: {
    color: COLORS.primary,
    fontWeight: "700",
    fontSize: 14,
  },
  footerNote: {
    marginTop: 12,
    fontSize: 11,
    lineHeight: 16,
    color: COLORS.textTertiary,
    fontStyle: "italic",
  },
});
