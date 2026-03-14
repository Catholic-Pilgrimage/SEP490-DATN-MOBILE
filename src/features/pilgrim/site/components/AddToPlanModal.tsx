import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    FlatList,
    Image,
    Modal,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
    BORDER_RADIUS,
    COLORS,
    SHADOWS,
    SPACING,
    TYPOGRAPHY,
} from "../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { PlanEntity } from "../../../../types/pilgrim/planner.types";

const { height: SCREEN_HEIGHT } = Dimensions.get("window");

interface AddToPlanModalProps {
  visible: boolean;
  onClose: () => void;
  siteId: string;
  siteName: string;
  siteCoverImage?: string;
}

type Step = "select-plan" | "select-day" | "success" | "error";

export const AddToPlanModal: React.FC<AddToPlanModalProps> = ({
  visible,
  onClose,
  siteId,
  siteName,
  siteCoverImage,
}) => {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>("select-plan");
  const [plans, setPlans] = useState<PlanEntity[]>([]);
  const [loading, setLoading] = useState(false);
  const [adding, setAdding] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<PlanEntity | null>(null);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [errorMsg, setErrorMsg] = useState("");

  // Animations
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;
  const successScale = useRef(new Animated.Value(0)).current;
  const successOpacity = useRef(new Animated.Value(0)).current;

  // Calculate number of days for a plan
  const getPlanDays = useCallback((plan: PlanEntity): number => {
    if (plan.number_of_days && plan.number_of_days > 0)
      return plan.number_of_days;
    if (plan.start_date && plan.end_date) {
      const start = new Date(plan.start_date);
      const end = new Date(plan.end_date);
      const diff =
        Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)) +
        1;
      return Math.max(diff, 1);
    }
    return 1;
  }, []);

  // Fetch plans
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const response = await pilgrimPlannerApi.getPlans({ page: 1, limit: 50 });
      if (response?.success && response.data?.planners) {
        // Only show non-completed, non-cancelled plans
        const activePlans = response.data.planners.filter(
          (p) => p.status !== "completed" && p.status !== "cancelled",
        );
        setPlans(activePlans);
      }
    } catch {
      setPlans([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (visible) {
      setStep("select-plan");
      setSelectedPlan(null);
      setSelectedDay(1);
      setErrorMsg("");
      fetchPlans();

      // Animate in
      Animated.parallel([
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          friction: 8,
          tension: 65,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [visible]);

  const animateClose = (callback?: () => void) => {
    Animated.parallel([
      Animated.timing(overlayOpacity, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: SCREEN_HEIGHT,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      callback?.();
      onClose();
    });
  };

  const handleSelectPlan = (plan: PlanEntity) => {
    setSelectedPlan(plan);
    setSelectedDay(1);
    setStep("select-day");
  };

  const handleAddToPlan = async () => {
    if (!selectedPlan) return;
    setAdding(true);
    try {
      const response = await pilgrimPlannerApi.addPlanItem(selectedPlan.id, {
        site_id: siteId,
        day_number: selectedDay,
      });
      if (response?.success) {
        setStep("success");
        // Animate success
        successScale.setValue(0);
        successOpacity.setValue(0);
        Animated.parallel([
          Animated.spring(successScale, {
            toValue: 1,
            friction: 4,
            tension: 60,
            useNativeDriver: true,
          }),
          Animated.timing(successOpacity, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ]).start();
      } else {
        setErrorMsg("Không thể thêm địa điểm. Vui lòng thử lại.");
        setStep("error");
      }
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        "Không thể thêm địa điểm. Vui lòng thử lại.";
      setErrorMsg(msg);
      setStep("error");
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "draft":
        return { text: "Nháp", color: "#8B7355" };
      case "planned":
        return { text: "Đã lên kế hoạch", color: "#2563EB" };
      case "ongoing":
        return { text: "Đang thực hiện", color: "#16A34A" };
      default:
        return { text: "Nháp", color: "#8B7355" };
    }
  };

  // ──── Plan List Item ────
  const renderPlanItem = ({ item }: { item: PlanEntity }) => {
    const days = getPlanDays(item);
    const status = getStatusLabel(item.status);
    const itemCount = item.items?.length || 0;

    return (
      <TouchableOpacity
        style={styles.planItem}
        onPress={() => handleSelectPlan(item)}
        activeOpacity={0.7}
      >
        <View style={styles.planItemLeft}>
          <View style={styles.planIconCircle}>
            <Ionicons name="map-outline" size={22} color={COLORS.accent} />
          </View>
        </View>
        <View style={styles.planItemContent}>
          <Text style={styles.planItemName} numberOfLines={1}>
            {item.name}
          </Text>
          <View style={styles.planItemMeta}>
            <View style={styles.planMetaRow}>
              <Ionicons
                name="calendar-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={styles.planMetaText}>
                {formatDate(item.start_date)}
                {item.end_date ? ` - ${formatDate(item.end_date)}` : ""}
              </Text>
            </View>
            <View style={styles.planMetaRow}>
              <Ionicons
                name="time-outline"
                size={13}
                color={COLORS.textSecondary}
              />
              <Text style={styles.planMetaText}>{days} ngày</Text>
              {itemCount > 0 && (
                <>
                  <Text style={styles.planMetaDot}>•</Text>
                  <Text style={styles.planMetaText}>{itemCount} điểm</Text>
                </>
              )}
            </View>
          </View>
          <View
            style={[
              styles.statusChip,
              { backgroundColor: status.color + "18" },
            ]}
          >
            <View
              style={[styles.statusDot, { backgroundColor: status.color }]}
            />
            <Text style={[styles.statusText, { color: status.color }]}>
              {status.text}
            </Text>
          </View>
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={COLORS.textTertiary}
        />
      </TouchableOpacity>
    );
  };

  // ──── Day Selector ────
  const renderDaySelector = () => {
    if (!selectedPlan) return null;
    const days = getPlanDays(selectedPlan);
    const dayArray = Array.from({ length: days }, (_, i) => i + 1);

    // Get date label for each day
    const getDayDateLabel = (dayNum: number) => {
      if (!selectedPlan.start_date) return "";
      const d = new Date(selectedPlan.start_date);
      d.setDate(d.getDate() + dayNum - 1);
      return d.toLocaleDateString("vi-VN", {
        weekday: "short",
        day: "2-digit",
        month: "2-digit",
      });
    };

    return (
      <View style={styles.dayGrid}>
        {dayArray.map((day) => {
          const isSelected = selectedDay === day;
          return (
            <TouchableOpacity
              key={day}
              style={[styles.dayChip, isSelected && styles.dayChipSelected]}
              onPress={() => setSelectedDay(day)}
              activeOpacity={0.7}
            >
              <Text
                style={[
                  styles.dayChipNumber,
                  isSelected && styles.dayChipNumberSelected,
                ]}
              >
                Ngày {day}
              </Text>
              <Text
                style={[
                  styles.dayChipDate,
                  isSelected && styles.dayChipDateSelected,
                ]}
              >
                {getDayDateLabel(day)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  // ──── Content by step ────
  const renderContent = () => {
    if (step === "select-plan") {
      return (
        <>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <View style={styles.headerRow}>
              <View style={styles.headerIconCircle}>
                <Ionicons name="add-circle" size={24} color={COLORS.accent} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Thêm vào lịch trình</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {siteName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => animateClose()}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Plan List */}
          {loading ? (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color={COLORS.accent} />
              <Text style={styles.loadingText}>Đang tải kế hoạch...</Text>
            </View>
          ) : plans.length === 0 ? (
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconCircle}>
                <Ionicons
                  name="calendar-outline"
                  size={40}
                  color={COLORS.textTertiary}
                />
              </View>
              <Text style={styles.emptyTitle}>Chưa có kế hoạch nào</Text>
              <Text style={styles.emptySubtitle}>
                Tạo kế hoạch hành hương mới để bắt đầu thêm địa điểm
              </Text>
            </View>
          ) : (
            <FlatList
              data={plans}
              renderItem={renderPlanItem}
              keyExtractor={(item) => item.id}
              contentContainerStyle={styles.planList}
              showsVerticalScrollIndicator={false}
              ItemSeparatorComponent={() => <View style={styles.separator} />}
            />
          )}
        </>
      );
    }

    if (step === "select-day") {
      return (
        <>
          {/* Header */}
          <View style={styles.sheetHeader}>
            <View style={styles.sheetHandle} />
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => setStep("select-plan")}
                style={styles.backBtn}
              >
                <Ionicons
                  name="arrow-back"
                  size={22}
                  color={COLORS.textPrimary}
                />
              </TouchableOpacity>
              <View style={{ flex: 1 }}>
                <Text style={styles.sheetTitle}>Chọn ngày</Text>
                <Text style={styles.sheetSubtitle} numberOfLines={1}>
                  {selectedPlan?.name}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => animateClose()}
                style={styles.closeBtn}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="close" size={22} color={COLORS.textTertiary} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Site Preview */}
          <View style={styles.sitePreview}>
            {siteCoverImage ? (
              <Image
                source={{ uri: siteCoverImage }}
                style={styles.sitePreviewImage}
                resizeMode="cover"
              />
            ) : (
              <View
                style={[styles.sitePreviewImage, styles.sitePreviewPlaceholder]}
              >
                <Ionicons
                  name="image-outline"
                  size={24}
                  color={COLORS.textTertiary}
                />
              </View>
            )}
            <View style={styles.sitePreviewInfo}>
              <Text style={styles.sitePreviewName} numberOfLines={2}>
                {siteName}
              </Text>
              <View style={styles.sitePreviewBadge}>
                <Ionicons name="location" size={12} color={COLORS.accent} />
                <Text style={styles.sitePreviewBadgeText}>
                  Địa điểm hành hương
                </Text>
              </View>
            </View>
          </View>

          {/* Day Selector */}
          <View style={styles.daySelectorContainer}>
            <Text style={styles.daySelectorLabel}>Chọn ngày thêm vào:</Text>
            {renderDaySelector()}
          </View>

          {/* Confirm Button */}
          <View
            style={[
              styles.confirmContainer,
              { paddingBottom: insets.bottom + SPACING.md },
            ]}
          >
            <TouchableOpacity
              style={[styles.confirmBtn, adding && styles.confirmBtnDisabled]}
              onPress={handleAddToPlan}
              disabled={adding}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={
                  adding ? ["#ccc", "#bbb"] : [COLORS.accent, COLORS.accentDark]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.confirmBtnGradient}
              >
                {adding ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="add-circle" size={20} color="#fff" />
                    <Text style={styles.confirmBtnText}>
                      Thêm vào Ngày {selectedDay}
                    </Text>
                  </>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </>
      );
    }

    if (step === "success") {
      return (
        <View style={styles.resultContainer}>
          <Animated.View
            style={[
              styles.successCircle,
              {
                transform: [{ scale: successScale }],
                opacity: successOpacity,
              },
            ]}
          >
            <MaterialIcons name="check-circle" size={64} color="#16A34A" />
          </Animated.View>
          <Text style={styles.resultTitle}>Đã thêm thành công!</Text>
          <Text style={styles.resultSubtitle}>
            <Text style={{ fontWeight: "700" }}>{siteName}</Text> đã được thêm
            vào <Text style={{ fontWeight: "700" }}>{selectedPlan?.name}</Text>{" "}
            - Ngày {selectedDay}
          </Text>
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.resultBtnOutline}
              onPress={() => animateClose()}
            >
              <Text style={styles.resultBtnOutlineText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    if (step === "error") {
      return (
        <View style={styles.resultContainer}>
          <View style={styles.errorCircle}>
            <MaterialIcons
              name="error-outline"
              size={64}
              color={COLORS.danger}
            />
          </View>
          <Text style={styles.resultTitle}>Không thể thêm</Text>
          <Text style={styles.resultSubtitle}>{errorMsg}</Text>
          <View style={styles.resultActions}>
            <TouchableOpacity
              style={styles.resultBtnOutline}
              onPress={() => setStep("select-plan")}
            >
              <Text style={styles.resultBtnOutlineText}>Thử lại</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.resultBtnClose}
              onPress={() => animateClose()}
            >
              <Text style={styles.resultBtnCloseText}>Đóng</Text>
            </TouchableOpacity>
          </View>
        </View>
      );
    }

    return null;
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      statusBarTranslucent
      onRequestClose={() => animateClose()}
    >
      <View style={styles.modalRoot}>
        {/* Overlay */}
        <TouchableWithoutFeedback onPress={() => animateClose()}>
          <Animated.View
            style={[styles.overlay, { opacity: overlayOpacity }]}
          />
        </TouchableWithoutFeedback>

        {/* Bottom Sheet */}
        <Animated.View
          style={[
            styles.sheet,
            {
              transform: [{ translateY: slideAnim }],
              paddingBottom:
                step === "select-day" ? 0 : insets.bottom + SPACING.md,
              maxHeight: SCREEN_HEIGHT * 0.75,
            },
          ]}
        >
          {renderContent()}
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalRoot: {
    flex: 1,
    justifyContent: "flex-end",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  sheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: BORDER_RADIUS.xl,
    borderTopRightRadius: BORDER_RADIUS.xl,
    ...SHADOWS.large,
    overflow: "hidden",
  },

  // Header
  sheetHeader: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    paddingBottom: SPACING.md,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  sheetHandle: {
    width: 36,
    height: 4,
    backgroundColor: COLORS.border,
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: SPACING.md,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.sm,
  },
  headerIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: COLORS.accentSubtle,
    justifyContent: "center",
    alignItems: "center",
  },
  sheetTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
  },
  sheetSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.sm,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },
  backBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
  },

  // Plan List
  planList: {
    paddingHorizontal: SPACING.lg,
    paddingVertical: SPACING.sm,
  },
  planItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: SPACING.md,
    gap: SPACING.sm,
  },
  planItemLeft: {},
  planIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.accentSubtle,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: COLORS.borderLight,
  },
  planItemContent: {
    flex: 1,
  },
  planItemName: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  planItemMeta: {
    gap: 2,
  },
  planMetaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  planMetaText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
  },
  planMetaDot: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textTertiary,
    marginHorizontal: 2,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginTop: 4,
    gap: 4,
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 10,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
  },
  separator: {
    height: 1,
    backgroundColor: COLORS.borderLight,
  },

  // Loading
  loadingContainer: {
    paddingVertical: SPACING.xxl,
    alignItems: "center",
    gap: SPACING.md,
  },
  loadingText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
  },

  // Empty
  emptyContainer: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
  },
  emptyIconCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: COLORS.background,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: SPACING.md,
  },
  emptyTitle: {
    fontSize: TYPOGRAPHY.fontSize.xl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  emptySubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },

  // Site Preview
  sitePreview: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: SPACING.lg,
    marginTop: SPACING.md,
    padding: SPACING.sm,
    backgroundColor: COLORS.background,
    borderRadius: BORDER_RADIUS.md,
    gap: SPACING.sm,
  },
  sitePreviewImage: {
    width: 56,
    height: 56,
    borderRadius: BORDER_RADIUS.sm,
  },
  sitePreviewPlaceholder: {
    backgroundColor: COLORS.borderLight,
    justifyContent: "center",
    alignItems: "center",
  },
  sitePreviewInfo: {
    flex: 1,
  },
  sitePreviewName: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sitePreviewBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  sitePreviewBadgeText: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.accent,
    fontWeight: TYPOGRAPHY.fontWeight.medium,
  },

  // Day Selector
  daySelectorContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.lg,
    flex: 1,
  },
  daySelectorLabel: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  dayGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  dayChip: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.borderMedium,
    minWidth: 90,
    alignItems: "center",
  },
  dayChipSelected: {
    backgroundColor: COLORS.accent + "15",
    borderColor: COLORS.accent,
  },
  dayChipNumber: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textPrimary,
  },
  dayChipNumberSelected: {
    color: COLORS.accentDark,
  },
  dayChipDate: {
    fontSize: TYPOGRAPHY.fontSize.xs,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  dayChipDateSelected: {
    color: COLORS.accentDark,
  },

  // Confirm
  confirmContainer: {
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.md,
  },
  confirmBtn: {
    borderRadius: BORDER_RADIUS.md,
    overflow: "hidden",
  },
  confirmBtnDisabled: {
    opacity: 0.7,
  },
  confirmBtnGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: SPACING.sm,
  },
  confirmBtnText: {
    fontSize: TYPOGRAPHY.fontSize.lg,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: "#fff",
  },

  // Result (success / error)
  resultContainer: {
    paddingVertical: SPACING.xxl,
    paddingHorizontal: SPACING.xl,
    alignItems: "center",
  },
  successCircle: {
    marginBottom: SPACING.lg,
  },
  errorCircle: {
    marginBottom: SPACING.lg,
  },
  resultTitle: {
    fontSize: TYPOGRAPHY.fontSize.xxl,
    fontWeight: TYPOGRAPHY.fontWeight.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.sm,
  },
  resultSubtitle: {
    fontSize: TYPOGRAPHY.fontSize.md,
    color: COLORS.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: SPACING.lg,
    paddingHorizontal: SPACING.md,
  },
  resultActions: {
    flexDirection: "row",
    gap: SPACING.sm,
  },
  resultBtnOutline: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1.5,
    borderColor: COLORS.accent,
  },
  resultBtnOutlineText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.accent,
  },
  resultBtnClose: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.xl,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
  },
  resultBtnCloseText: {
    fontSize: TYPOGRAPHY.fontSize.md,
    fontWeight: TYPOGRAPHY.fontWeight.semibold,
    color: COLORS.textSecondary,
  },
});

export default AddToPlanModal;
