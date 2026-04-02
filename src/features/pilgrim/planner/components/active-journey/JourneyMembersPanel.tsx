import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../../services/api/pilgrim/plannerApi";
import type {
  PlanEntity,
  PlannerMemberApiRow,
  PlannerProgressMember,
} from "../../../../../types/pilgrim/planner.types";
import { getInitialsFromFullName } from "../../../../../utils/initials";

type Props = {
  planId: string;
  plan: PlanEntity;
  /** Tăng sau mỗi lần làm mới kế hoạch (check-in / skip) để cập nhật tiến độ đoàn. */
  reloadKey?: number;
};

function joinStatusLabel(
  status: string | undefined,
  t: ReturnType<typeof useTranslation>["t"],
): string | null {
  const s = (status || "joined").toLowerCase();
  if (s === "joined") return null;
  if (s === "kicked")
    return t("planner.memberKicked", "Đã mời ra");
  if (s === "dropped_out" || s === "left")
    return t("planner.memberLeft", "Đã rời nhóm");
  return status || null;
}

export default function JourneyMembersPanel({
  planId,
  plan,
  reloadKey = 0,
}: Props) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(true);
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState<PlannerMemberApiRow[]>([]);
  const [totalSlots, setTotalSlots] = useState<number | undefined>();
  const [currentMembers, setCurrentMembers] = useState<number | undefined>();
  const [progressByUserId, setProgressByUserId] = useState<
    Record<string, PlannerProgressMember>
  >({});

  const ownerId = String(plan.user_id ?? plan.owner?.id ?? "");

  const load = useCallback(async () => {
    if (!planId) return;
    try {
      setLoading(true);
      const [memRes, progRes] = await Promise.all([
        pilgrimPlannerApi.getPlanMembers(planId),
        pilgrimPlannerApi.getPlannerProgress(planId).catch(() => null),
      ]);

      if (memRes.success && memRes.data) {
        setMembers(memRes.data.members ?? []);
        setTotalSlots(memRes.data.total_slots);
        setCurrentMembers(memRes.data.current_members);
      } else {
        setMembers([]);
      }

      if (progRes?.success && progRes.data?.member_progress?.length) {
        const map: Record<string, PlannerProgressMember> = {};
        for (const row of progRes.data.member_progress) {
          map[String(row.user_id)] = row;
        }
        setProgressByUserId(map);
      } else {
        setProgressByUserId({});
      }
    } catch {
      setMembers([]);
      setProgressByUserId({});
    } finally {
      setLoading(false);
    }
  }, [planId]);

  useFocusEffect(
    useCallback(() => {
      void load();
    }, [load, reloadKey]),
  );

  const formatProgress = (userId: string) => {
    const row = progressByUserId[userId];
    if (!row) return null;
    return t("planner.memberProgressLine", {
      percent: Math.round(row.percent ?? 0),
      checked: row.checked_in ?? 0,
      total: row.total_items ?? 0,
      defaultValue: "{{percent}}% · {{checked}}/{{total}} điểm",
    });
  };

  const slotLine =
    totalSlots != null && currentMembers != null
      ? t("planner.journeyMembersSlotLine", {
          current: currentMembers,
          total: totalSlots,
          defaultValue: "{{current}}/{{total}} chỗ trong đoàn",
        })
      : null;

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={() => setExpanded((e) => !e)}
        activeOpacity={0.7}
      >
        <View style={styles.headerLeft}>
          <Ionicons name="people" size={20} color={COLORS.primary} />
          <View style={styles.headerTitles}>
            <Text style={styles.title}>
              {t("planner.journeyMembersTitle", "Thành viên đoàn")}
            </Text>
            {slotLine ? (
              <Text style={styles.subtitle}>{slotLine}</Text>
            ) : null}
          </View>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={22}
          color={COLORS.textSecondary}
        />
      </TouchableOpacity>

      <Text style={styles.hint}>
        {t(
          "planner.journeyMembersOngoingHint",
          "Trong lúc hành trình đang diễn ra, không thể thêm hoặc loại thành viên khỏi đoàn.",
        )}
      </Text>

      {expanded ? (
        loading ? (
          <View style={styles.loader}>
            <ActivityIndicator color={COLORS.accent} />
          </View>
        ) : members.length === 0 ? (
          <Text style={styles.empty}>
            {t("planner.journeyMembersEmpty", "Chưa có dữ liệu thành viên.")}
          </Text>
        ) : (
          <View style={styles.list}>
            {members.map((m) => {
              const id = String(m.id);
              const isOwner = id === ownerId;
              const extra = joinStatusLabel(m.join_status, t);
              const progressLine = formatProgress(id);
              return (
                <View key={id} style={styles.row}>
                  {m.avatar_url ? (
                    <Image
                      source={{ uri: m.avatar_url }}
                      style={styles.avatar}
                    />
                  ) : (
                    <View style={[styles.avatar, styles.avatarPlaceholder]}>
                      <Text style={styles.avatarInitials}>
                        {getInitialsFromFullName(m.full_name || m.email || "?")}
                      </Text>
                    </View>
                  )}
                  <View style={styles.rowBody}>
                    <View style={styles.nameRow}>
                      <Text style={styles.name} numberOfLines={1}>
                        {m.full_name || m.email || "—"}
                      </Text>
                      {isOwner ? (
                        <View style={styles.badgeOwner}>
                          <Text style={styles.badgeOwnerText}>
                            {t("planner.groupLead", "Trưởng đoàn")}
                          </Text>
                        </View>
                      ) : null}
                      {extra ? (
                        <View style={styles.badgeMuted}>
                          <Text style={styles.badgeMutedText}>{extra}</Text>
                        </View>
                      ) : null}
                    </View>
                    {progressLine ? (
                      <Text style={styles.progress}>{progressLine}</Text>
                    ) : null}
                  </View>
                </View>
              );
            })}
          </View>
        )
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    marginTop: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundCard,
    padding: SPACING.md,
    ...SHADOWS.small,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: 8,
  },
  headerTitles: { marginLeft: 10, flex: 1 },
  title: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  subtitle: {
    marginTop: 2,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  hint: {
    marginTop: 10,
    fontSize: 12,
    lineHeight: 17,
    color: COLORS.textSecondary,
    fontStyle: "italic",
  },
  loader: { paddingVertical: 20, alignItems: "center" },
  empty: {
    marginTop: 12,
    fontSize: 13,
    color: COLORS.textTertiary,
  },
  list: { marginTop: 12, gap: 0 },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.border,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#E8E8E8",
  },
  avatarPlaceholder: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.primary + "22",
  },
  avatarInitials: {
    fontSize: 15,
    fontWeight: "800",
    color: COLORS.primary,
  },
  rowBody: { flex: 1, marginLeft: 12, minWidth: 0 },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 6,
  },
  name: {
    flexShrink: 1,
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  badgeOwner: {
    backgroundColor: "rgba(207, 170, 58, 0.2)",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeOwnerText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#8B6914",
    textTransform: "uppercase",
  },
  badgeMuted: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  badgeMutedText: {
    fontSize: 10,
    fontWeight: "700",
    color: COLORS.textSecondary,
  },
  progress: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
});
