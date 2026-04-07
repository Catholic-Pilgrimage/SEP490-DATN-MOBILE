import { Ionicons } from "@expo/vector-icons";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Image,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
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
import { useFriendship } from "../../profile/hooks/useFriendship";
import { FriendshipListItem } from "../../../../types/pilgrim";
import MemberHistoryList from "../components/shared/MemberHistoryList";

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
  const [searchQuery, setSearchQuery] = useState("");
  const [progressMap, setProgressMap] = useState<Record<string, PlannerProgressMember>>({});
  const [ownerId, setOwnerId] = useState<string | null>(null);
  const [allItems, setAllItems] = useState<any[]>([]);
  const [expandedRowIds, setExpandedRowIds] = useState<Record<string, boolean>>({});
  const [planStatus, setPlanStatus] = useState<string>("");
  const [summary, setSummary] = useState<{
    total_slots?: number;
    current_members?: number;
    available_slots?: number;
  } | null>(null);

  const [sessionSentRequestIds, setSessionSentRequestIds] = useState<Set<string>>(new Set());

  const { friends, pendingRequests, fetchFriends, fetchPendingRequests, sendRequest } = useFriendship();
  const { user: currentUser } = useAuth();

  const safeTopInset = Math.max(insets.top, StatusBar.currentHeight ?? 0);

  const loadMembers = useCallback(async () => {
    if (!planId) return;
    try {
      let planStatusStr: string | undefined;

      try {
        const detailRes = await pilgrimPlannerApi.getPlanDetail(planId);
        if (detailRes?.success && detailRes.data) {
          setOwnerId(detailRes.data.user_id);
          planStatusStr = detailRes.data.status;
          setPlanStatus(planStatusStr || "");

          let items: any[] = [];
          if ((detailRes.data as any).items_by_day) {
             items = Object.values((detailRes.data as any).items_by_day).flat();
          } else if (detailRes.data.items) {
             items = detailRes.data.items;
          }
          setAllItems(items);
        }
      } catch (err) {
        console.warn("Failed to fetch plan detail (might be pending invite)", err);
      }

      const membersRes = await pilgrimPlannerApi.getPlanMembers(planId);

      let progressRes: any = null;
      if (planStatusStr === "ongoing" || planStatusStr === "completed") {
        try {
          progressRes = await pilgrimPlannerApi.getPlannerProgress(planId);
        } catch (e) {
          console.warn("Failed to fetch plan progress", e);
        }
      }

      if (progressRes?.success && progressRes.data?.member_progress) {
        const pMap: Record<string, PlannerProgressMember> = {};
        progressRes.data.member_progress.forEach((p: PlannerProgressMember) => {
          pMap[p.user_id] = p;
        });
        setProgressMap(pMap);
      } else {
        setProgressMap({});
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
      // ... errors handled
    }
  }, [planId]);

  useEffect(() => {
    if (currentUser) {
      fetchFriends();
      fetchPendingRequests();
    }
  }, [currentUser, fetchFriends, fetchPendingRequests]);

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

  const filteredMembers = useMemo(() => {
    if (!searchQuery.trim()) return members;
    const lowerQuery = searchQuery.toLowerCase();
    return members.filter((m) => {
      const nameMatch = m.full_name?.toLowerCase().includes(lowerQuery);
      const emailMatch = m.email?.toLowerCase().includes(lowerQuery);
      return nameMatch || emailMatch;
    });
  }, [members, searchQuery]);

  const handleSendFriendRequest = async (userId: string) => {
    const success = await sendRequest(userId);
    if (success) {
      setSessionSentRequestIds(prev => new Set(prev).add(userId));
    }
  };

  return (
    <View style={[styles.container, { paddingTop: safeTopInset + 10 }]}>
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

      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color={COLORS.textTertiary} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm thành viên..."
          placeholderTextColor={COLORS.textTertiary}
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery("")}>
            <Ionicons name="close-circle" size={20} color={COLORS.textTertiary} />
          </TouchableOpacity>
        )}
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
          ) : filteredMembers.length === 0 ? (
            <View style={styles.empty}>
              <Ionicons name="search" size={34} color={COLORS.textTertiary} />
              <Text style={styles.emptyTitle}>Không tìm thấy kết quả</Text>
              <Text style={styles.emptySub}>
                Không có thành viên nào khớp với tìm kiếm của bạn.
              </Text>
            </View>
          ) : (
            filteredMembers.map((m) => {
              const progress = progressMap[m.id];
              const isOwner = m.id === ownerId;
              const progressPercent = progress?.percent || 0;
              const isRowExpanded = !!expandedRowIds[m.id];
              const canShowProgressDetail = (planStatus === "ongoing" || planStatus === "completed") && progress;

              return (
                <View key={m.id} style={styles.memberCard}>
                  <TouchableOpacity activeOpacity={canShowProgressDetail ? 0.7 : 1} onPress={() => {
                    if (canShowProgressDetail) {
                       setExpandedRowIds(prev => ({ ...prev, [m.id]: !prev[m.id] }));
                    }
                  }}>
                    <View style={styles.memberRow}>
                      <View style={styles.avatar}>
                        {m.avatar_url ? (
                          <Image source={{ uri: m.avatar_url }} style={styles.avatarImage} />
                        ) : (
                          <View style={styles.initialsAvatar}>
                             <Text style={styles.initialsText}>{(() => {
                                const name = m.full_name || "";
                                const parts = name.trim().split(" ");
                                if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
                                return name.substring(0, 2).toUpperCase();
                             })()}</Text>
                          </View>
                        )}
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

                      {m.id !== currentUser?.id && (
                        <View style={styles.actionBtnContainer}>
                          {friends.some(f => f.user.id === m.id) ? (
                             <View style={styles.friendBadge}>
                              <Ionicons name="people" size={14} color={COLORS.success} />
                              <Text style={styles.friendBadgeText}>Bạn bè</Text>
                            </View>
                          ) : (pendingRequests.some(r => r.user.id === m.id) || sessionSentRequestIds.has(m.id)) ? (
                            <View style={styles.pendingBadge}>
                              <Text style={styles.pendingBadgeText}>Đã gửi</Text>
                            </View>
                          ) : (
                            <TouchableOpacity 
                              style={styles.addFriendBtn} 
                              onPress={() => handleSendFriendRequest(m.id)}
                            >
                              <Ionicons name="person-add" size={16} color="#fff" />
                              <Text style={styles.addFriendBtnText}>Kết bạn</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      )}

                      {canShowProgressDetail && (
                        <Ionicons 
                          name={isRowExpanded ? "chevron-up" : "chevron-down"} 
                          size={20} 
                          color={COLORS.textTertiary} 
                          style={{ marginLeft: 8 }} 
                        />
                      )}
                    </View>

                    {progress && progress.total_items > 0 && (
                      <View style={styles.progressSection}>
                        <View style={styles.progressHeader}>
                          <Text style={styles.progressLabel}>Tiến độ check-in</Text>
                          <Text style={styles.progressValue}>
                            {progress.checked_in}/{progress.total_items} ({Math.round(progressPercent)}%)
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
                  </TouchableOpacity>

                  {isRowExpanded && canShowProgressDetail && (
                    <View style={styles.historyList}>
                      <MemberHistoryList allItems={allItems} history={progress.history || []} />
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
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.white,
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.sm,
    paddingHorizontal: SPACING.md,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.border,
    ...SHADOWS.subtle,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 15,
    color: COLORS.textPrimary,
  },
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
  avatarImage: {
    width: "100%",
    height: "100%",
    borderRadius: 22,
  },
  initialsAvatar: {
    flex: 1,
    width: "100%",
    height: "100%",
    borderRadius: 22,
    backgroundColor: '#E5E1D8',
    justifyContent: 'center',
    alignItems: 'center',
  },
  initialsText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#B8860B',
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
  actionBtnContainer: {
    marginLeft: 8,
  },
  addFriendBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 4,
  },
  addFriendBtnText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  friendBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: COLORS.successLight,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 4,
    borderWidth: 1,
    borderColor: COLORS.success,
  },
  friendBadgeText: {
    color: COLORS.success,
    fontSize: 11,
    fontWeight: "700",
  },
  pendingBadge: {
    backgroundColor: "#F3F4F6",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  pendingBadgeText: {
    color: "#6B7280",
    fontSize: 11,
    fontWeight: "600",
  },
  historyList: {
    marginTop: 12,
    gap: 8,
    borderTopWidth: 1,
    borderTopColor: COLORS.borderLight,
    paddingTop: 12,
  },
});

