import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  LayoutAnimation,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { COLORS, SPACING } from "../../../../../constants/theme.constants";
import type { PlanEntity } from "../../../../../types/pilgrim/planner.types";
import {
  getAutoStartHint,
  getPlannerFlowContext,
  type PlannerFlowPhase,
} from "../../utils/plannerFlow.utils";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const PHASE_ORDER_MAP: Record<PlannerFlowPhase, number> = {
  design: 0,
  group_prep: 1,
  ready_start: 2,
  pilgrimage: 3,
  finished: 4,
};

interface PlannerFlowGuideProps {
  plan: PlanEntity;
}

export const PlannerFlowGuide: React.FC<PlannerFlowGuideProps> = ({ plan }) => {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const ctx = useMemo(() => getPlannerFlowContext(plan), [plan]);
  const autoHint = useMemo(() => getAutoStartHint(plan), [plan]);

  const currentOrder = PHASE_ORDER_MAP[ctx.phase] ?? 0;

  const toggle = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpanded((e) => !e);
  };

  const steps = useMemo(() => {
    const solo = ctx.isSolo;
    const base: {
      phase: PlannerFlowPhase;
      title: string;
      body: string;
    }[] = [
      {
        phase: "design",
        title: t("planner.flow.stepDesignTitle", {
          defaultValue: "1. Lịch trình & địa điểm",
        }),
        body: t("planner.flow.stepDesignBody", {
          defaultValue:
            "Thêm điểm theo từng ngày, giờ dự kiến đến; app gợi ý thời gian di chuyển (Vietmap) — backend kiểm tra tổng thời gian và thứ tự.",
        }),
      },
    ];
    if (!solo) {
      base.push({
        phase: "group_prep",
        title: t("planner.flow.stepGroupTitle", {
          defaultValue: "2. Nhóm & cọc",
        }),
        body: t("planner.flow.stepGroupBody", {
          defaultValue:
            "Hoàn thiện lịch trước, rồi mới chia sẻ / mời email. Thành viên xem lệ phí, phạt %, chat, đồng ý rồi mới đóng cọc. Khi đoàn chốt, trưởng đoàn khóa hành trình — server chặn chỉnh sửa theo quy tắc (join window, v.v.).",
        }),
      });
    }
    base.push({
      phase: "ready_start",
      title: t("planner.flow.stepStartTitle", {
        defaultValue: solo ? "2. Bắt đầu hành trình" : "3. Bắt đầu hành trình",
      }),
      body:
        autoHint === "auto_start_before_first"
          ? t("planner.flow.stepStartBodyAuto", {
              defaultValue:
                "Trong ngày đầu chuyến, bạn có thể bấm Bắt đầu trước giờ đến điểm đầu; hệ thống cũng có thể tự chuyển sớm (khoảng 2 giờ trước giờ đến điểm đầu — theo server).",
            })
          : t("planner.flow.stepStartBodySimple", {
              defaultValue:
                "Khi lịch đã đủ và (nhóm) đã khóa, chuyển sang trạng thái đang thực hiện để check-in.",
            }),
    });
    base.push({
      phase: "pilgrimage",
      title: t("planner.flow.stepPilgrimageTitle", {
        defaultValue: solo ? "3. Trải nghiệm" : "4. Trải nghiệm",
      }),
      body: t("planner.flow.stepPilgrimageBody", {
        defaultValue:
          "Check-in tại điểm (visited), hoặc bỏ qua (skipped) theo thứ tự; có thể gọi hỗ trợ hoặc ghi nhật ký từ địa điểm.",
      }),
    });
    base.push({
      phase: "finished",
      title: t("planner.flow.stepDoneTitle", {
        defaultValue: solo ? "4. Kết thúc" : "5. Kết thúc",
      }),
      body: t("planner.flow.stepDoneBody", {
        defaultValue:
          "Trưởng đoàn / hệ thống đóng chuyến khi các điểm đã visited hoặc skipped. Gợi ý nhóm: mỗi thành viên nên có ít nhất một lần check-in (visited) tại một điểm trong lịch — chi tiết enforcement do server. Nếu không có điểm visited, chuyến có thể ghi nhận hủy/đóng theo server.",
      }),
    });
    return base;
  }, [ctx.isSolo, autoHint, t]);

  const activeLabel = useMemo(() => {
    switch (ctx.phase) {
      case "design":
        return t("planner.flow.badgeDesign", { defaultValue: "Đang lên lịch" });
      case "group_prep":
        return t("planner.flow.badgeGroup", {
          defaultValue: "Chuẩn bị nhóm",
        });
      case "ready_start":
        return t("planner.flow.badgeReady", {
          defaultValue: "Sẵn sàng khởi hành",
        });
      case "pilgrimage":
        return t("planner.flow.badgeLive", {
          defaultValue: "Đang hành hương",
        });
      default:
        return t("planner.flow.badgeDone", { defaultValue: "Đã đóng chuyến" });
    }
  }, [ctx.phase, t]);

  return (
    <View style={styles.wrap}>
      <TouchableOpacity
        style={styles.headerRow}
        onPress={toggle}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel={t("planner.flow.toggleA11y", {
          defaultValue: "Mở hướng dẫn luồng kế hoạch",
        })}
      >
        <View style={styles.badge}>
          <Ionicons name="map-outline" size={16} color={COLORS.primary} />
          <Text style={styles.badgeText}>{activeLabel}</Text>
        </View>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="rgba(255,255,255,0.9)"
        />
      </TouchableOpacity>

      {expanded && (
        <View style={styles.panel}>
          <Text style={styles.panelIntro}>
            {t("planner.flow.intro", {
              defaultValue:
                "Luồng chính: tạo kế hoạch → lịch trình & điểm đến → (nhóm: mời & khóa) → bắt đầu → check-in / bỏ qua điểm → kết thúc.",
            })}
          </Text>
          {steps.map((s, i) => {
            const stepOrder = PHASE_ORDER_MAP[s.phase];
            const done = stepOrder < currentOrder;
            const active = stepOrder === currentOrder;
            return (
              <View key={`${s.phase}-${i}`} style={styles.stepRow}>
                <View
                  style={[
                    styles.dot,
                    done && styles.dotDone,
                    active && styles.dotActive,
                  ]}
                >
                  {done ? (
                    <Ionicons name="checkmark" size={12} color="#fff" />
                  ) : (
                    <Text style={styles.dotNum}>{i + 1}</Text>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text
                    style={[
                      styles.stepTitle,
                      active && styles.stepTitleActive,
                    ]}
                  >
                    {s.title}
                  </Text>
                  <Text style={styles.stepBody}>{s.body}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    width: "100%",
    marginBottom: SPACING.sm,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
  },
  badgeText: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 12,
  },
  panel: {
    marginTop: SPACING.sm,
    padding: SPACING.md,
    backgroundColor: "rgba(0,0,0,0.35)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
  },
  panelIntro: {
    color: "rgba(255,255,255,0.92)",
    fontSize: 13,
    lineHeight: 20,
    marginBottom: SPACING.md,
  },
  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    marginBottom: SPACING.md,
  },
  dot: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "rgba(255,255,255,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  dotDone: {
    backgroundColor: "rgba(34,197,94,0.9)",
  },
  dotActive: {
    backgroundColor: COLORS.accent,
  },
  dotNum: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
  stepTitle: {
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
    fontSize: 13,
  },
  stepTitleActive: {
    color: "#fff",
  },
  stepBody: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
    lineHeight: 18,
    marginTop: 4,
  },
});
