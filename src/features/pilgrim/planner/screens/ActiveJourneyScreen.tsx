import { Ionicons } from "@expo/vector-icons";
import React, { useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
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
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../hooks/useAuth";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import PlanHeader from "../components/active-journey/PlanHeader";
import PlanMap from "../components/active-journey/PlanMap";
import TimelineDaySection from "../components/active-journey/TimelineDaySection";
import { useJourneyExecution } from "../hooks/useJourneyExecution";
import { usePlanData } from "../hooks/usePlanData";

type Props = {
  route: { params?: { planId?: string } };
  navigation: any;
};

export default function ActiveJourneyScreen({ route, navigation }: Props) {
  const insets = useSafeAreaInsets();
  const planId = route.params?.planId || "";
  const { user } = useAuth();
  const { plan, loading, error, sortedDays, firstItem, mapPins, mapCenter, refreshPlan } =
    usePlanData(planId);
  const { checkingInItemId, skippingItemId, markingVisitedItemId, checkIn, skipItem, markVisited } =
    useJourneyExecution(planId, refreshPlan);
  const isOwner = useMemo(
    () => !!plan && !!user?.id && String(plan.user_id) === String(user.id),
    [plan, user?.id],
  );
  const completingRef = useRef(false);
  const allStopsHandled = useMemo(() => {
    if (!plan?.items_by_day) return false;
    const items = Object.values(plan.items_by_day).flat();
    if (!items.length) return false;
    return items.every((item) => {
      const st = String(item.status || "").toLowerCase();
      return st === "visited" || st === "skipped";
    });
  }, [plan]);

  useEffect(() => {
    const maybeCompleteJourney = async () => {
      if (!plan?.id || !isOwner) return;
      if (String(plan.status || "").toLowerCase() !== "ongoing") return;
      if (!allStopsHandled) return;
      if (completingRef.current) return;

      try {
        completingRef.current = true;
        const response = await pilgrimPlannerApi.updatePlannerStatus(plan.id, {
          status: "completed",
        });
        if (!response.success) {
          throw new Error(response.message || "Không thể kết thúc chuyến đi");
        }
        Toast.show({
          type: "success",
          text1: "Đã hoàn thành hành trình",
          text2: "Chuyển về trang chi tiết kế hoạch",
        });
        navigation.replace("PlanDetailScreen", { planId: plan.id });
      } catch (e: any) {
        Toast.show({
          type: "error",
          text1: "Không thể chuyển trạng thái hoàn thành",
          text2: e?.message || "Vui lòng thử lại",
        });
      } finally {
        completingRef.current = false;
      }
    };

    void maybeCompleteJourney();
  }, [allStopsHandled, isOwner, navigation, plan]);

  if (loading) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <ActivityIndicator size="large" color={COLORS.accent} />
      </View>
    );
  }

  if (!plan || error) {
    return (
      <View style={[styles.center, { backgroundColor: COLORS.background }]}>
        <Text style={{ color: COLORS.textPrimary, marginBottom: 8 }}>
          {error || "Không tìm thấy hành trình"}
        </Text>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={{ color: COLORS.accent, fontWeight: "700" }}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      <View style={[styles.topBar, { paddingTop: insets.top + 6 }]}>
        <TouchableOpacity style={styles.topBtn} onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.topTitle}>Hành hương thực tế</Text>
        <TouchableOpacity
          style={styles.topBtn}
          onPress={() =>
            navigation.navigate("PlanChatScreen", { planId: plan.id, planName: plan.name })
          }
        >
          <Ionicons name="chatbubbles-outline" size={22} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <PlanHeader plan={plan} firstItem={firstItem} />

        <View style={styles.quickActions}>
          <TouchableOpacity
            style={[styles.quickBtn, styles.checkin]}
            disabled={!firstItem || checkingInItemId === firstItem.id}
            onPress={() => firstItem && checkIn(firstItem)}
          >
            <Ionicons name="checkmark-circle-outline" size={18} color="#166534" />
            <Text style={styles.quickText}>Check-in</Text>
          </TouchableOpacity>
          {isOwner && (
            <TouchableOpacity
              style={[styles.quickBtn, styles.visited]}
              disabled={!firstItem || markingVisitedItemId === firstItem.id}
              onPress={() => firstItem && markVisited(firstItem)}
            >
              <Ionicons name="flag-outline" size={18} color="#92400E" />
              <Text style={styles.quickText}>Đã viếng, sang điểm kế</Text>
            </TouchableOpacity>
          )}
          {isOwner && (
            <TouchableOpacity
              style={[styles.quickBtn, styles.skip]}
              disabled={!firstItem || skippingItemId === firstItem.id}
              onPress={() => firstItem && skipItem(firstItem)}
            >
              <Ionicons name="play-skip-forward-outline" size={18} color="#9A3412" />
              <Text style={styles.quickText}>Bỏ qua điểm</Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.quickBtn, styles.journal]}
            onPress={() =>
              navigation.getParent()?.navigate("Nhat ky", { screen: "CreateJournalScreen" })
            }
          >
            <Ionicons name="book-outline" size={18} color="#9A3412" />
            <Text style={styles.quickText}>Nhật ký</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.sos]}
            onPress={() => navigation.navigate("SOSList")}
          >
            <Ionicons name="warning-outline" size={18} color="#991B1B" />
            <Text style={styles.quickText}>SOS</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.quickBtn, styles.chat]}
            onPress={() =>
              navigation.navigate("PlanChatScreen", { planId: plan.id, planName: plan.name })
            }
          >
            <Ionicons name="chatbubbles-outline" size={18} color="#3730A3" />
            <Text style={styles.quickText}>Chat nhóm</Text>
          </TouchableOpacity>
        </View>

        <PlanMap pins={mapPins} center={mapCenter} showUserLocation height={250} />

        {sortedDays.map((dayKey) => (
          <TimelineDaySection
            key={dayKey}
            dayKey={dayKey}
            items={plan.items_by_day?.[dayKey] || []}
            onPressItem={(item) => {
              if (!isOwner || (plan.status || "").toLowerCase() !== "ongoing") return;
              void skipItem(item);
            }}
          />
        ))}
      </ScrollView>

      <TouchableOpacity
        style={[styles.fab, skippingItemId ? { opacity: 0.6 } : null]}
        onPress={() => navigation.navigate("SOSList")}
      >
        <Ionicons name="warning" size={22} color="#fff" />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  center: { flex: 1, justifyContent: "center", alignItems: "center" },
  topBar: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.15)",
  },
  topTitle: { color: "#fff", fontSize: 16, fontWeight: "700" },
  content: { padding: SPACING.md, paddingBottom: 120 },
  quickActions: {
    marginVertical: SPACING.md,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  quickBtn: {
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
  },
  checkin: { backgroundColor: "#E8F5E9", borderColor: "#A7F3D0" },
  journal: { backgroundColor: "#FFF7ED", borderColor: "#FED7AA" },
  visited: { backgroundColor: "#FFF8E1", borderColor: "#FDE68A" },
  skip: { backgroundColor: "#FFF7ED", borderColor: "#FDBA74" },
  sos: { backgroundColor: "#FEF2F2", borderColor: "#FECACA" },
  chat: { backgroundColor: "#EEF2FF", borderColor: "#C7D2FE" },
  quickText: { marginLeft: 6, fontSize: 13, color: COLORS.textPrimary, fontWeight: "700" },
  fab: {
    position: "absolute",
    right: 18,
    bottom: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#DC2626",
    alignItems: "center",
    justifyContent: "center",
    ...SHADOWS.medium,
  },
});
