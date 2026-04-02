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
import type { 
  PlannerMemberApiRow, 
  PlannerProgressMember 
} from "../../../../types/pilgrim/planner.types";
import { useAuth } from "../../../../hooks/useAuth";

type Props = {
  route: { params?: { planId?: string; planName?: string } };
  navigation: any;
};



export default function PlannerMembersScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const planId = route.params?.planId || "";
  const planName = route.params?.planName || "Thành viên";

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [members, setMembers] = useState<PlannerMemberApiRow[]>([]);
  const [progressMap, setProgressMap] = useState<Record<string, PlannerProgressMember>>({});
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total_slots?: number;
    current_members?: number;
    available_slots?: number;
  } | null>(null);

  const safeTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const loadMembers = useCallback(async () => {
    if (!planId) return;
    try {
      const [membersRes, progressRes, detailRes] = await Promise.all([
        pilgrimPlannerApi.getPlanMembers(planId),
        pilgrimPlannerApi.getPlannerProgress(planId),
        pilgrimPlannerApi.getPlanDetail(planId)
      ]);

      if (detailRes.success && detailRes.data) {
        setOwnerId(detailRes.data.user_id);
      }

      if (progressRes.success && progressRes.data?.member_progress) {
        const pMap: Record<string, PlannerProgressMember> = {};
        progressRes.data.member_progress.forEach(p => {
          pMap[p.user_id] = p;
        });
        setProgressMap(pMap);
      }

      if (membersRes.success && membersRes.data?.members) {
        setMembers(membersRes.data.members);
        setSummary({
          total_slots: membersRes.data.total_slots,
          current_members: membersRes.data.current_members,
          available_slots: membersRes.data.available_slots,
        });
      } else {
        setMembers([]);
        setSummary(null);
        Toast.show({
          type: "error",
          text1: "Không thể tải danh sách thành viên",
          text2: membersRes.message || "Vui lòng thử lại",
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
              const progress = progressMap[m.id];
              const isOwner = m.id === ownerId;
              const progressPercent = progress?.percent || 0;

              return (
                <View key={m.id} style={styles.memberCard}>
                  <View style={styles.memberRow}>
                    <View style={styles.avatar}>
                      <Ionicons
                        name="person"
                        size={20}
                        color={COLORS.primary}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <View style={styles.nameRow}>
                        <Text style={styles.memberName} numberOfLines={1}>
                          {m.full_name || "—"}
                        </Text>
                        <View style={[styles.roleBadge, isOwner ? styles.leaderBadge : styles.memberBadge]}>
                          <Text style={[styles.roleBadgeText, isOwner ? styles.leaderBadgeText : styles.memberBadgeText]}>
                            {isOwner ? "Trưởng đoàn" : "Thành viên"}
                          </Text>
                        </View>
                      </View>
                      {m.email ? (
                        <Text style={styles.memberEmail} numberOfLines={1}>
                          {m.email}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  {progress && progress.total_items > 0 && (
                    <View style={styles.progressSection}>
                      <View style={styles.progressHeader}>
                        <Text style={styles.progressLabel}>Tiến độ check-in</Text>
                        <Text style={styles.progressValue}>
                          {progress.checked_in}/{progress.total_items} điểm ({Math.round(progressPercent)}%)
                        </Text>
                      </View>
                      <View style={styles.progressBarBg}>
                        <View 
                          style={[
                            styles.progressBarFill, 
                            { width: `${progressPercent}%` }
                          ]} 
                        />
                      </View>
                    </View>
                  )}
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
  memberCard: {
    padding: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.small,
    marginBottom: 12,
  },
  memberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  nameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
  },
  roleBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    borderWidth: 0.5,
  },
  leaderBadge: {
    backgroundColor: "#FEF3C7", // Nền vàng nhạt
    borderColor: "#D97706", // Viền cam đậm
  },
  memberBadge: {
    backgroundColor: "#F3F4F6", // Nền xám nhạt
    borderColor: "#9CA3AF", // Viền xám
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: "700",
  },
  leaderBadgeText: {
    color: "#92400E",
  },
  memberBadgeText: {
    color: "#4B5563",
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: COLORS.backgroundSoft,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  memberName: { fontSize: 16, fontWeight: "700", color: COLORS.textPrimary },
  memberEmail: { fontSize: 13, color: COLORS.textSecondary, marginTop: 1 },
  progressSection: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  progressLabel: {
    fontSize: 12,
    color: COLORS.textSecondary,
    fontWeight: "600",
  },
  progressValue: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: "700",
  },
  progressBarBg: {
    height: 6,
    backgroundColor: COLORS.backgroundSoft,
    borderRadius: 3,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: COLORS.primary,
    borderRadius: 3,
  },
});

