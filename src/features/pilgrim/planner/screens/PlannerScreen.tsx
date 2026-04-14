import {
    Ionicons,
    MaterialCommunityIcons,
    MaterialIcons,
} from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    CommonActions,
    useFocusEffect,
    useScrollToTop,
} from "@react-navigation/native";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    ImageBackground,
    Platform,
    StatusBar,
    StyleSheet,
    Text,
    TouchableOpacity,
    View
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import { useAuth } from "../../../../contexts/AuthContext";
import { useConfirm } from "../../../../hooks/useConfirm";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import {
    PlanEntity,
    PlannerMyInvite,
    TransportationType,
} from "../../../../types/pilgrim/planner.types";
import InvitedPlanCard, {
    InvitedPlanUI,
} from "../components/shared/InvitedPlanCard";
import PlanCard, { PlanUI } from "../components/shared/PlanCard";

import { useTranslation } from "react-i18next";
import { emailsMatch } from "../utils/planShare.utils";

// ─── Tab enum ────────────────────────────────────────────────
type PlannerTab = "my" | "invited";

// ─── Animated guest card with floating + icon pulse ──────────
const GuestCardAnimated = ({
  handleLogin,
  t,
}: {
  handleLogin: () => void;
  t: any;
}) => {
  const cardFloat = useRef(new Animated.Value(0)).current;
  const iconPulse = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(cardFloat, {
          toValue: -6,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(cardFloat, {
          toValue: 6,
          duration: 1500,
          useNativeDriver: true,
        }),
      ]),
    ).start();
    Animated.loop(
      Animated.sequence([
        Animated.timing(iconPulse, {
          toValue: 1.15,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(iconPulse, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        paddingHorizontal: SPACING.lg,
        marginTop: SPACING.xl,
      }}
    >
      <Animated.View
        style={[styles.guestCard, { transform: [{ translateY: cardFloat }] }]}
      >
        <Animated.View style={{ transform: [{ scale: iconPulse }] }}>
          <MaterialIcons name="lock-outline" size={48} color="#D4AF37" />
        </Animated.View>
        <Text style={styles.guestTitle}>{t("profile.loginRequired")}</Text>
        <Text style={styles.guestSubtitle}>
          {t("profile.loginRequiredMessage")}
        </Text>
        <TouchableOpacity
          style={styles.guestLoginBtn}
          onPress={handleLogin}
          activeOpacity={0.8}
        >
          <View style={styles.guestLoginInner}>
            <MaterialIcons name="login" size={20} color="#FFFFFF" />
            <Text style={styles.guestLoginText}>
              {t("profile.loginRegister", {
                defaultValue: "Đăng nhập / Đăng ký",
              })}
            </Text>
          </View>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const { width } = Dimensions.get("window");

// ─── Tab bar component ───────────────────────────────────────
const TabBar = ({
  activeTab,
  onTabChange,
  t,
  myCount,
  invitedCount,
}: {
  activeTab: PlannerTab;
  onTabChange: (tab: PlannerTab) => void;
  t: any;
  myCount: number;
  invitedCount: number;
}) => {
  const indicatorAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.spring(indicatorAnim, {
      toValue: activeTab === "my" ? 0 : 1,
      useNativeDriver: true,
      friction: 8,
      tension: 70,
    }).start();
  }, [activeTab]);

  const tabWidth = (width - SPACING.lg * 2 - 8) / 2;

  const translateX = indicatorAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, tabWidth],
  });

  return (
    <View style={styles.tabBarContainer}>
      <View style={styles.tabBarInner}>
        {/* Animated indicator */}
        <Animated.View
          style={[
            styles.tabIndicator,
            {
              width: tabWidth,
              transform: [{ translateX }],
            },
          ]}
        />

        {/* My Plans Tab */}
        <TouchableOpacity
          style={[styles.tabButton]}
          onPress={() => onTabChange("my")}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="map-outline"
              size={18}
              color={activeTab === "my" ? "#4A3110" : "#8B7355"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "my" && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {t("planner.myPlansTab", { defaultValue: "Của tôi" })}
            </Text>
            {myCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "my" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "my" && styles.tabBadgeTextActive,
                  ]}
                >
                  {myCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>

        {/* Invited Plans Tab */}
        <TouchableOpacity
          style={[styles.tabButton]}
          onPress={() => onTabChange("invited")}
          activeOpacity={0.7}
        >
          <View style={styles.tabContent}>
            <Ionicons
              name="mail-outline"
              size={18}
              color={activeTab === "invited" ? "#4A3110" : "#8B7355"}
            />
            <Text
              style={[
                styles.tabLabel,
                activeTab === "invited" && styles.tabLabelActive,
              ]}
              numberOfLines={1}
            >
              {t("planner.invitedPlansTab", { defaultValue: "Được mời" })}
            </Text>
            {invitedCount > 0 && (
              <View
                style={[
                  styles.tabBadge,
                  activeTab === "invited" && styles.tabBadgeActive,
                ]}
              >
                <Text
                  style={[
                    styles.tabBadgeText,
                    activeTab === "invited" && styles.tabBadgeTextActive,
                  ]}
                >
                  {invitedCount}
                </Text>
              </View>
            )}
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const TRANSPORT_TYPES: TransportationType[] = [
  "motorbike",
  "car",
  "bus",
  "train",
  "plane",
  "walk",
  "other",
];

/** Chuẩn hóa chuỗi từ API (có thể khác hoa/thường) → TransportationType. */
function normalizePlannerTransport(raw: unknown): TransportationType {
  if (raw == null || raw === "") return "car";
  const s = String(raw).toLowerCase().trim();
  if (TRANSPORT_TYPES.includes(s as TransportationType))
    return s as TransportationType;
  return "car";
}

// ─── Map PlanEntity → PlanUI helper ──────────────────────────
const mapPlanEntityToUI = (entity: PlanEntity): PlanUI => {
  let totalItems = typeof entity.item_count === "number" ? entity.item_count : 0;

  // Fallback if item_count is 0 but items_by_day is present
  if (totalItems === 0 && entity.items_by_day) {
    totalItems = Object.values(entity.items_by_day).flat().length;
  } else if (totalItems === 0 && entity.items) {
    totalItems = entity.items.length;
  }

  return {
    id: entity.id,
    title: entity.name,
    startDate: entity.start_date,
    endDate: entity.end_date || entity.start_date,
    status: (entity.status as any) || "planning",
    stopCount: totalItems,
    participantCount: entity.number_of_people,
    coverImage: "https://images.unsplash.com/photo-1548625361-e88c60eb83fe",
    isShared: !!entity.share_token,
    transportation: [normalizePlannerTransport(entity.transportation)],
  };
};

const mapInvitedPlanEntityToUI = (entity: PlanEntity): InvitedPlanUI => {
  const base = mapPlanEntityToUI(entity);
  return {
    ...base,
    ownerName: entity.owner?.full_name,
    ownerAvatar: entity.owner?.avatar_url,
    ownerEmail: entity.owner?.email,
    depositAmount: entity.deposit_amount,
    penaltyPercentage: entity.penalty_percentage,
  };
};

const buildPlanPrefill = (plan: {
  id: string;
  title: string;
  status?: string;
  startDate?: string;
  endDate?: string;
  estimatedDays?: number;
  participantCount?: number;
  stopCount?: number;
  transportation?: TransportationType[];
}) => {
  const normalizedTransport =
    Array.isArray(plan.transportation) && plan.transportation.length > 0
      ? plan.transportation[0]
      : "car";

  return {
    id: plan.id,
    name: plan.title,
    status: String(plan.status || "planning"),
    start_date: plan.startDate,
    end_date: plan.endDate,
    number_of_days: Number(plan.estimatedDays || 1),
    number_of_people: Number(plan.participantCount || 1),
    item_count: Number(plan.stopCount || 0),
    transportation: normalizedTransport,
  };
};

const mapMyInviteToInvitedPlanUI = (
  invite: PlannerMyInvite,
): InvitedPlanUI | null => {
  if (!invite.planner) return null;
  const pl = invite.planner;
  const mapped: InvitedPlanUI = {
    id: pl.id,
    title: pl.name,
    startDate: pl.start_date,
    endDate: pl.end_date || pl.start_date,
    status: (pl.status as any) || "planning",
    stopCount: (() => {
      const count = typeof pl.item_count === "number" ? pl.item_count : 0;
      if (count === 0 && pl.items_by_day) {
        return Object.values(pl.items_by_day).flat().length;
      }
      return count;
    })(),
    participantCount: pl.number_of_people || 0,
    coverImage: "https://images.unsplash.com/photo-1548625361-e88c60eb83fe",
    isShared: false,
    transportation: [normalizePlannerTransport(pl.transportation)],
    ownerName: invite.inviter?.full_name,
    ownerAvatar: invite.inviter?.avatar_url,
    ownerEmail: invite.inviter?.email,
    inviteStatus: invite.status,
    inviteToken: invite.token,
    depositAmount: pl.deposit_amount,
    penaltyPercentage: pl.penalty_percentage,
    inviteType: invite.invite_type,
  };
  return mapped;
};

// ─── Empty state for Invited tab ─────────────────────────────
const InvitedEmptyState = ({ t }: { t: any }) => (
  <View style={styles.invitedEmptyContainer}>
    <View style={styles.invitedEmptyIconWrap}>
      <Ionicons
        name="mail-unread-outline"
        size={56}
        color="#C9A96E"
        style={{ opacity: 0.6 }}
      />
    </View>
    <Text style={styles.invitedEmptyTitle}>
      {t("planner.noInvitedPlans", { defaultValue: "Chưa có lời mời nào" })}
    </Text>
    <Text style={styles.invitedEmptySubtitle}>
      {t("planner.noInvitedPlansHint", {
        defaultValue:
          "Khi ai đó mời bạn tham gia kế hoạch hành hương, nó sẽ xuất hiện ở đây.",
      })}
    </Text>
  </View>
);

export const PlannerScreen = ({ navigation, route }: any) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { isGuest, exitGuestMode, logout, user } = useAuth();
  const { confirm } = useConfirm();

  // ── Tab state ──
  const [activeTab, setActiveTab] = useState<PlannerTab>("my");

  useEffect(() => {
    const initial = route?.params?.initialTab as PlannerTab | undefined;
    if (initial === "invited" || initial === "my") {
      setActiveTab(initial);
    }
  }, [route?.params?.initialTab]);

  // Handle Deep Link Token
  useEffect(() => {
    const token = route?.params?.token as string | undefined;
    if (!token) return;

    const processInviteToken = async () => {
      try {
        // If guest, alert to login
        if (isGuest || !user) {
          await AsyncStorage.setItem("pending_invite_token", token);
          const confirmed = await confirm({
            title: t("planner.inviteLoginRequiredTitle", {
              defaultValue: "Yêu cầu đăng nhập",
            }),
            message: t("planner.inviteLoginRequiredBody", {
              defaultValue:
                "Vui lòng đăng nhập để xem và tham gia kế hoạch này.",
            }),
            confirmText: t("common.login", { defaultValue: "Đăng nhập" }),
            cancelText: t("common.cancel", { defaultValue: "Hủy" }),
          });
          if (confirmed) {
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Auth" }],
              }),
            );
          }
          return;
        }

        // Fetch invite details to validate email
        setInvitedLoading(true);
        const res = await pilgrimPlannerApi.getPlanByInviteToken(token);
        if (!res.success || !res.data) {
          Toast.show({
            type: "error",
            text1: "Lỗi",
            text2: "Lời mời không hợp lệ hoặc đã hết hạn",
          });
          setInvitedLoading(false);
          return;
        }

        const inviteEmail = res.data.email?.trim() || "";
        if (
          inviteEmail &&
          user.email &&
          !emailsMatch(inviteEmail, user.email)
        ) {
          const confirmed = await confirm({
            type: "warning",
            title: t("planner.inviteWrongAccountTitle", {
              defaultValue: "Sai tài khoản",
            }),
            message: t("planner.inviteWrongAccountBody", {
              email: inviteEmail,
              defaultValue: `Lời mời gửi tới ${inviteEmail}. Vui lòng đăng nhập đúng email đó.`,
            }),
            confirmText: t("planner.inviteSwitchAccountCta", {
              defaultValue: "Đăng xuất",
            }),
            cancelText: t("common.cancel", { defaultValue: "Hủy" }),
          });
          if (confirmed) {
            await AsyncStorage.setItem("pending_invite_token", token);
            await logout();
            navigation.dispatch(
              CommonActions.reset({
                index: 0,
                routes: [{ name: "Auth" }],
              }),
            );
          }
          setInvitedLoading(false);
          return;
        }

        // Valid! Open the plan detail immediately
        setActiveTab("invited");

        // Clear the token from params so we don't process it again if screen rerenders
        navigation.setParams({ token: undefined });

        const planner = res.data.planner;
        if (!planner) return;

        navigation.navigate("PlanDetailScreen", {
          planId: planner.id,
          inviteToken: token,
          inviteStatus: res.data.status,
          ownerName: planner.owner?.full_name,
          ownerEmail: planner.owner?.email,
          depositAmount: planner.deposit_amount,
          penaltyPercentage: planner.penalty_percentage,
          invitedView: true,
        });
      } catch (e) {
        console.log(e);
      } finally {
        setInvitedLoading(false);
      }
    };

    void processInviteToken();
  }, [route?.params?.token, isGuest, user]);

  // ── My Plans state ──
  const [plans, setPlans] = useState<PlanUI[]>([]);
  const [loading, setLoading] = useState(!isGuest);

  // ── Invited Plans state ──
  const [invitedPlans, setInvitedPlans] = useState<InvitedPlanUI[]>([]);
  const [invitedLoading, setInvitedLoading] = useState(!isGuest);

  // ── Fetch All Plans ──
  const fetchAllPlans = useCallback(async () => {
    try {
      setLoading(true);
      setInvitedLoading(true);
      const [planningRes, lockedRes, ongoingRes, invitesRes] =
        await Promise.all([
          pilgrimPlannerApi.getPlans({
            page: 1,
            limit: 100,
            status: "planning",
          }),
          pilgrimPlannerApi.getPlans({ page: 1, limit: 100, status: "locked" }),
          pilgrimPlannerApi.getPlans({
            page: 1,
            limit: 100,
            status: "ongoing",
          }),
          pilgrimPlannerApi.getMyInvites(),
        ]);

      const activePlanners = [
        ...(planningRes?.data?.planners || []),
        ...(lockedRes?.data?.planners || []),
        ...(ongoingRes?.data?.planners || []),
      ];

      const dedupedActivePlanners = Array.from(
        new Map(activePlanners.map((p) => [p.id, p])).values(),
      );

      let memberPlansData: InvitedPlanUI[] = [];
      if (dedupedActivePlanners.length > 0) {
        const myPlansData: PlanUI[] = [];
        const memberPlans: InvitedPlanUI[] = [];

        dedupedActivePlanners.forEach((entity: PlanEntity) => {
          if (
            entity.user_id === user?.id ||
            (entity.owner && entity.owner.id === user?.id)
          ) {
            myPlansData.push(mapPlanEntityToUI(entity));
          } else {
            // Joined as member/viewer/editor
            memberPlans.push({
              ...mapInvitedPlanEntityToUI(entity),
              inviteStatus: "accepted",
              inviteToken: undefined,
            });
          }
        });

        setPlans(myPlansData);
        memberPlansData = memberPlans;
      }

      const inviteRows = Array.isArray(invitesRes?.data)
        ? invitesRes.data
        : Array.isArray((invitesRes as any)?.data?.invites)
          ? (invitesRes as any).data.invites
          : [];

      if (invitesRes && invitesRes.success && inviteRows.length > 0) {
        const mappedInvites = inviteRows
          .map(mapMyInviteToInvitedPlanUI)
          .filter((v: InvitedPlanUI | null): v is InvitedPlanUI => !!v);
        setInvitedPlans([...mappedInvites, ...memberPlansData]);
      } else {
        setInvitedPlans(memberPlansData);
      }
    } catch (error) {
      console.log("Failed to fetch plans:", error);
    } finally {
      setLoading(false);
      setInvitedLoading(false);
    }
  }, [user?.id]);

  // ── Load Invited Plan for Guest ──
  const loadGuestInvitedPlan = useCallback(async () => {
    try {
      setInvitedLoading(true);
      const token = await AsyncStorage.getItem("pending_invite_token");
      if (token) {
        const res = await pilgrimPlannerApi.getPlanByInviteToken(token);
        if (res.success && res.data && res.data.planner) {
          const planner = res.data.planner;
          const totalItems =
            typeof planner.item_count === "number" ? planner.item_count : 0;

          const mapped: InvitedPlanUI = {
            id: planner.id || "",
            title: planner.name || "",
            startDate: planner.start_date,
            endDate: planner.end_date || planner.start_date,
            status: (planner.status as any) || "planning",
            stopCount: totalItems,
            participantCount: planner.number_of_people || 0,
            coverImage:
              "https://images.unsplash.com/photo-1548625361-e88c60eb83fe",
            isShared: false,
            transportation: [normalizePlannerTransport(planner.transportation)],
            ownerName: planner.owner?.full_name,
            ownerAvatar: planner.owner?.avatar_url,
            ownerEmail: planner.owner?.email,
            depositAmount: planner.deposit_amount,
            penaltyPercentage: planner.penalty_percentage,
            inviteStatus: res.data.status,
            inviteToken: token,
          };

          setInvitedPlans([mapped]);
        } else {
          setInvitedPlans([]);
        }
      } else {
        setInvitedPlans([]);
      }
    } catch (error) {
      console.log("Failed to load guest invite plan:", error);
      setInvitedPlans([]);
    } finally {
      setInvitedLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      navigation.getParent()?.setOptions({ tabBarStyle: undefined });

      if (!isGuest) {
        fetchAllPlans();
      } else {
        loadGuestInvitedPlan();
      }
    }, [fetchAllPlans, loadGuestInvitedPlan, isGuest]),
  );

  const handleLogin = async () => {
    if (isGuest) {
      await exitGuestMode();
    }
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Auth" }],
      }),
    );
  };

  // Animation Values
  const scrollY = useRef(new Animated.Value(0)).current;

  const scrollRef = useRef(null);
  useScrollToTop(scrollRef);

  // Header Animations
  const headerHeight = 60 + insets.top; // Compact header height

  const compactHeaderOpacity = scrollY.interpolate({
    inputRange: [50, 100],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  const largeHeaderOpacity = scrollY.interpolate({
    inputRange: [0, 80],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  const largeHeaderScale = scrollY.interpolate({
    inputRange: [-100, 0],
    outputRange: [1.2, 1],
    extrapolate: "clamp",
  });

  const largeHeaderTranslateY = scrollY.interpolate({
    inputRange: [0, 100],
    outputRange: [0, -50],
    extrapolate: "clamp",
  });

  const navigateToPlanByStatus = useCallback(
    (planId: string, status?: string, extraParams?: Record<string, any>) => {
      const normalized = String(status || "").toLowerCase();
      if (normalized === "ongoing") {
        navigation.navigate("ActiveJourneyScreen", {
          planId,
          ...(extraParams || {}),
        });
        return;
      }
      navigation.navigate("PlanDetailScreen", {
        planId,
        ...(extraParams || {}),
      });
    },
    [navigation],
  );

  // ── Render plan lists ──────
  const renderMyPlans = () => {
    if (loading) {
      return (
        <View style={{ paddingVertical: SPACING.xxl, alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }

    if (plans.length === 0) {
      return (
        <TouchableOpacity
          style={styles.emptyStateCard}
          activeOpacity={0.8}
          onPress={() => navigation.navigate("CreatePlanScreen")}
        >
          <View style={styles.emptyIllustration}>
            <Ionicons
              name="map-outline"
              size={48}
              color={COLORS.textTertiary}
              style={{ opacity: 0.5 }}
            />
            <Ionicons
              name="add-circle-outline"
              size={32}
              color={COLORS.accent}
              style={{ position: "absolute", bottom: -5, right: -5 }}
            />
          </View>
          <View style={styles.emptyTextContainer}>
            <Text style={styles.emptyTitle}>
              {t("planner.planNewJourney", {
                defaultValue: "Lên Kế Hoạch Chuyến Đi Mới",
              })}
            </Text>
            <Text style={styles.emptySubtitle}>
              {t("planner.startJourney", {
                defaultValue: "Bắt đầu hành trình tâm linh tiếp theo của bạn.",
              })}
            </Text>
          </View>
        </TouchableOpacity>
      );
    }

    return plans.map((plan) => (
      <PlanCard
        key={plan.id}
        plan={plan}
        onPress={() =>
          navigateToPlanByStatus(plan.id, plan.status, {
            planPrefill: buildPlanPrefill(plan),
          })
        }
        onShare={() => console.log("Share plan", plan.id)}
        onEdit={() => console.log("Edit plan", plan.id)}
      />
    ));
  };

  const renderInvitedPlans = () => {
    if (invitedLoading) {
      return (
        <View style={{ paddingVertical: SPACING.xxl, alignItems: "center" }}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      );
    }

    if (invitedPlans.length === 0) {
      return <InvitedEmptyState t={t} />;
    }

    return invitedPlans.map((plan) => (
      <InvitedPlanCard
        key={plan.id}
        plan={plan}
        onPress={() => {
          if (plan.inviteToken) {
            navigation.navigate("PlanDetailScreen", {
              planId: plan.id,
              planPrefill: buildPlanPrefill(plan),
              inviteToken: plan.inviteToken,
              inviteStatus: plan.inviteStatus,
              ownerName: plan.ownerName,
              ownerEmail: plan.ownerEmail,
              depositAmount: plan.depositAmount,
              penaltyPercentage: plan.penaltyPercentage,
              inviteType: plan.inviteType,
              invitedView: true,
            });
          } else {
            navigateToPlanByStatus(plan.id, plan.status);
          }
        }}
        onJoin={() => {
          if (!plan.inviteToken) return;
          navigation.navigate("PlanDetailScreen", {
            planId: plan.id,
            planPrefill: buildPlanPrefill(plan),
            inviteToken: plan.inviteToken,
            inviteStatus: plan.inviteStatus,
            ownerName: plan.ownerName,
            ownerEmail: plan.ownerEmail,
            depositAmount: plan.depositAmount,
            penaltyPercentage: plan.penaltyPercentage,
            inviteType: plan.inviteType,
            invitedView: true,
          });
        }}
        onChat={() => {
          navigation.navigate("PlanChatScreen", {
            planId: plan.id,
            planName: plan.title,
          });
        }}
      />
    ));
  };

  return (
    <ImageBackground
      source={require("../../../../../assets/images/bg3.jpg")}
      style={styles.container}
      resizeMode="cover"
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* Compact Header (Collapsing) */}
      <Animated.View
        style={[
          styles.compactHeader,
          {
            height: headerHeight,
            paddingTop: insets.top,
            opacity: compactHeaderOpacity,
          },
        ]}
      >
        <View style={styles.compactHeaderContent}>
          <Text style={styles.compactHeaderTitle}>
            {t("planner.myPlans", { defaultValue: "Kế hoạch của tôi" })}
          </Text>
        </View>
        {/* Border Bottom Line */}
        <View style={styles.compactHeaderBorder} />
      </Animated.View>

      {/* Main Content */}
      <Animated.ScrollView
        ref={scrollRef}
        contentContainerStyle={[
          styles.content,
          { paddingTop: insets.top + 20, paddingBottom: 100 },
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* Large Header Area */}
        <Animated.View
          style={[
            styles.largeHeaderContainer,
            {
              opacity: largeHeaderOpacity,
              transform: [
                { scale: largeHeaderScale },
                { translateY: largeHeaderTranslateY },
              ],
            },
          ]}
        >
          <View>
            <Text style={styles.headerSubtitle}>
              {t("planner.myPlans", { defaultValue: "KẾ HOẠCH CỦA TÔI" })}
            </Text>
            <Text style={styles.headerTitle}>
              {t("planner.dashboardTitle")}
            </Text>
            <View style={styles.headerDecoration} />

            {/* Dove Pattern Overlay */}
            <View style={styles.dovePattern}>
              <MaterialCommunityIcons
                name="bird"
                size={24}
                color={COLORS.textTertiary}
                style={{
                  opacity: 0.1,
                  position: "absolute",
                  top: -10,
                  left: 100,
                }}
              />
              <MaterialCommunityIcons
                name="bird"
                size={18}
                color={COLORS.textTertiary}
                style={{
                  opacity: 0.08,
                  position: "absolute",
                  top: -25,
                  left: 130,
                }}
              />
              <MaterialCommunityIcons
                name="bird"
                size={14}
                color={COLORS.textTertiary}
                style={{
                  opacity: 0.05,
                  position: "absolute",
                  top: -35,
                  left: 155,
                }}
              />
            </View>
          </View>

          {/* Scallop Shell / Compass Watermark */}
          <View style={styles.shellContainer}>
            <Ionicons
              name="compass-outline"
              size={120}
              color={COLORS.textTertiary}
              style={styles.shellIcon}
            />
          </View>
        </Animated.View>

        {/* Tab Bar ALWAYS VISIBLE */}
        <TabBar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          t={t}
          myCount={isGuest ? 0 : plans.length}
          invitedCount={invitedPlans.length}
        />

        {/* Plans List */}
        <View style={{ marginTop: 12 }}>
          {activeTab === "my" ? (
            isGuest ? (
              <GuestCardAnimated handleLogin={handleLogin} t={t} />
            ) : (
              renderMyPlans()
            )
          ) : (
            renderInvitedPlans()
          )}
        </View>
      </Animated.ScrollView>

      {/* FAB - Hidden for guests, only show on My tab */}
      {!isGuest && activeTab === "my" && (
        <TouchableOpacity
          style={styles.fab}
          activeOpacity={0.9}
          onPress={() => navigation.navigate("CreatePlanScreen")}
        >
          <Ionicons name="add" size={32} color={COLORS.textPrimary} />
        </TouchableOpacity>
      )}
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.backgroundSoft,
  },
  // Compact Header
  compactHeader: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    zIndex: 100,
    alignItems: "center",
    justifyContent: "center",
  },
  compactHeaderContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  compactHeaderTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: COLORS.textPrimary,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  compactHeaderBorder: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0,0,0,0.05)",
  },
  // Large Header
  largeHeaderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    paddingBottom: SPACING.md,
    paddingVertical: 4,
    position: "relative",
  },
  headerSubtitle: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.accent,
    letterSpacing: 2,
    textTransform: "uppercase",
    marginBottom: 6,
  },
  headerTitle: {
    fontSize: 42,
    fontFamily: Platform.select({
      ios: "Georgia",
      android: "serif",
      default: "serif",
    }),
    fontWeight: "700",
    color: COLORS.textPrimary,
    lineHeight: 48,
    letterSpacing: -0.5,
  },
  headerDecoration: {
    width: 60,
    height: 4,
    backgroundColor: COLORS.accent,
    borderRadius: 2,
    marginTop: 16,
  },
  dovePattern: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  // Shell Watermark
  shellContainer: {
    position: "absolute",
    right: -20,
    top: -30,
    opacity: 0.15,
    transform: [{ rotate: "-15deg" }],
  },
  shellIcon: {},
  content: {
    paddingHorizontal: SPACING.lg,
  },

  // ── Tab Bar ──────────────────────────────────
  tabBarContainer: {
    marginTop: 4,
    marginBottom: 0,
  },
  tabBarInner: {
    flexDirection: "row",
    backgroundColor: "rgba(245, 230, 200, 0.85)",
    borderRadius: 14,
    padding: 4,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 110, 0.4)",
    position: "relative",
  },
  tabIndicator: {
    position: "absolute",
    top: 4,
    left: 4,
    bottom: 4,
    borderRadius: 11,
    backgroundColor: "#FFFFFF",
    ...SHADOWS.small,
    elevation: 2,
    borderWidth: 1,
    borderColor: "rgba(201, 169, 110, 0.25)",
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1,
  },
  tabContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B7355",
  },
  tabLabelActive: {
    color: "#4A3110",
    fontWeight: "700",
  },
  tabBadge: {
    backgroundColor: "rgba(139, 115, 85, 0.2)",
    borderRadius: 10,
    minWidth: 22,
    height: 22,
    paddingHorizontal: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBadgeActive: {
    backgroundColor: "rgba(212, 175, 55, 0.2)",
  },
  tabBadgeText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#8B7355",
  },
  tabBadgeTextActive: {
    color: "#6B4E0A",
  },

  // ── Empty State ──────────────────────────────
  emptyStateCard: {
    marginTop: SPACING.md,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderWidth: 2,
    borderColor: COLORS.borderMedium,
    borderStyle: "dashed",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    justifyContent: "center",
    gap: SPACING.md,
  },
  emptyIllustration: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  emptyTextContainer: {
    alignItems: "center",
    gap: 4,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "bold",
    color: COLORS.textPrimary,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
  },

  // ── Invited Empty State ──────────────────────
  invitedEmptyContainer: {
    marginTop: SPACING.xl,
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl * 1.5,
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "rgba(201, 169, 110, 0.3)",
    borderStyle: "dashed",
  },
  invitedEmptyIconWrap: {
    width: 90,
    height: 90,
    borderRadius: 45,
    backgroundColor: "rgba(201, 169, 110, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.lg,
  },
  invitedEmptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
    marginBottom: 6,
  },
  invitedEmptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
    paddingHorizontal: SPACING.sm,
  },

  // FAB
  fab: {
    position: "absolute",
    bottom: SPACING.xl,
    right: SPACING.lg,
    width: 64,
    height: 64,
    borderRadius: BORDER_RADIUS.full,
    backgroundColor: COLORS.accent,
    justifyContent: "center",
    alignItems: "center",
    ...SHADOWS.large,
    elevation: 8,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.2)",
  },
  guestCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: BORDER_RADIUS.xl,
    padding: SPACING.xl,
    alignItems: "center",
    gap: SPACING.md,
    ...SHADOWS.medium,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    width: "100%",
  },
  guestTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  guestSubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  guestLoginBtn: {
    borderRadius: 20,
    overflow: "hidden",
    marginTop: SPACING.sm,
  },
  guestLoginInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    paddingHorizontal: 28,
    borderRadius: 20,
    backgroundColor: "#D4AF37",
    gap: 8,
  },
  guestLoginText: {
    color: COLORS.white,
    fontWeight: "700",
    fontSize: 16,
  },
});

export default PlannerScreen;
