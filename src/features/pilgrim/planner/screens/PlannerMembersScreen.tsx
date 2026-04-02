import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Toast from "react-native-toast-message";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
  TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import type { PlannerMemberApiRow } from "../../../../types/pilgrim/planner.types";

type Props = {
  route: { params?: { planId?: string; planName?: string } };
  navigation: any;
};

function normalizeMemberStatus(row: PlannerMemberApiRow): string | null {
  const join = String(row.join_status || "").toLowerCase();
  if (join) return join;
  const dep = String(row.deposit_status || "").toLowerCase();
  if (dep) return dep;
  return null;
}

function formatMemberStatusLabel(st: string | null): string | null {
  if (!st) return null;
  if (st === "joined") return "Đã tham gia";
  if (st === "paid") return "Đã đóng cọc";
  if (st === "awaiting_payment") return "Chờ đóng cọc";
  if (st === "pending") return "Đang chờ";
  if (st === "rejected") return "Từ chối";
  return st;
}

export default function PlannerMembersScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const planId = route.params?.planId || "";
  const planName = route.params?.planName || "Thành viên";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<PlannerMemberApiRow[]>([]);
  const [summary, setSummary] = useState<{
    total_slots?: number;
    current_members?: number;
    available_slots?: number;
  } | null>(null);

  const safeTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const loadMembers = useCallback(async () => {
    if (!planId) return;
    try {
      const res = await pilgrimPlannerApi.getPlanMembers(planId);
      if (res.success && res.data?.members) {
        setMembers(res.data.members);
        setSummary({
          total_slots: res.data.total_slots,
          current_members: res.data.current_members,
          available_slots: res.data.available_slots,
        });
      } else {
        setMembers([]);
        setSummary(null);
        Toast.show({
          type: "error",
          text1: "Không thể tải danh sách thành viên",
          text2: res.message || "Vui lòng thử lại",
        });
      }
    } catch (e: any) {
      setMembers([]);
      setSummary(null);
      Toast.show({
        type: "error",
        text1: "Không thể tải danh sách thành viên",
        text2: e?.message || "Vui lòng thử lại",
      });
    }
  }, [planId]);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadMembers();
      setLoading(false);
    })();
  }, [loadMembers]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadMembers();
    setRefreshing(false);
  }, [loadMembers]);

  const statsLine = useMemo(() => {
    if (!summary) return null;
    const cur = summary.current_members ?? members.length;
    const total = summary.total_slots;
    if (typeof total === "number" && total > 0) return `${cur}/${total} người`;
    return `${cur} người`;
  }, [members.length, summary]);

  return (
    <View style={[styles.container, { paddingTop: safeTopInset }]}>
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          accessibilityRole="button"
          accessibilityLabel="Quay lại"
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <View style={{ flex: 1 }}>
          <Text style={styles.title} numberOfLines={1}>
            {planName}
          </Text>
          {statsLine ? <Text style={styles.subtitle}>{statsLine}</Text> : null}
        </View>
      </View>

      {loading ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.content}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {members.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons
                name="people-outline"
                size={34}
                color={COLORS.textTertiary}
              />
              <Text style={styles.emptyTitle}>Chưa có thành viên</Text>
              <Text style={styles.emptySub}>
                Danh sách sẽ hiển thị khi có người tham gia.
              </Text>
            </View>
          ) : (
            members.map((m) => {
              const st = formatMemberStatusLabel(normalizeMemberStatus(m));
              return (
                <View key={m.id} style={styles.memberRow}>
                  <View style={styles.avatar}>
                    <Ionicons
                      name="person"
                      size={16}
                      color={COLORS.primary}
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.memberName} numberOfLines={1}>
                      {m.full_name || "—"}
                    </Text>
                    {m.email ? (
                      <Text style={styles.memberEmail} numberOfLines={1}>
                        {m.email}
                      </Text>
                    ) : null}
                  </View>
                  {st ? (
                    <View style={styles.statusChip}>
                      <Text style={styles.statusChipText}>{st}</Text>
                    </View>
                  ) : null}
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.md,
    gap: 10,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    fontFamily: TYPOGRAPHY.fontFamily.display,
  },
  subtitle: { marginTop: 2, fontSize: 12, color: COLORS.textSecondary },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  content: { padding: SPACING.lg, paddingBottom: SPACING.xl },
  empty: {
    marginTop: SPACING.xl,
    alignItems: "center",
    padding: SPACING.lg,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
    gap: 6,
  },
  emptyTitle: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  emptySub: {
    fontSize: 13,
    textAlign: "center",
    color: COLORS.textSecondary,
    lineHeight: 18,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    marginBottom: 10,
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.accentSubtle,
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.35)",
  },
  memberName: { fontSize: 15, fontWeight: "700", color: COLORS.textPrimary },
  memberEmail: { fontSize: 12, color: COLORS.textSecondary, marginTop: 2 },
  statusChip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(201,162,39,0.14)",
    borderWidth: 1,
    borderColor: "rgba(201,162,39,0.35)",
  },
  statusChipText: { fontSize: 12, fontWeight: "700", color: COLORS.primary },
});

