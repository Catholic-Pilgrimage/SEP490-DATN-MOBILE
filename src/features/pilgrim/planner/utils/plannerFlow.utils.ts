import type { PlanEntity } from "../../../../types/pilgrim/planner.types";

/** Pha UX — khớp gần với backend (planning / ongoing / completed / cancelled) */
export type PlannerFlowPhase =
  | "design"
  | "group_prep"
  | "ready_start"
  | "pilgrimage"
  | "finished";

export interface PlannerFlowContext {
  phase: PlannerFlowPhase;
  /** Đi một mình */
  isSolo: boolean;
  /** Đã có ít nhất một điểm trong lịch */
  hasItems: boolean;
  /** Ước lượng lịch đủ ngày (theo items_by_day / items) — heuristic */
  scheduleLooksComplete: boolean;
}

function countItems(plan: PlanEntity): number {
  if (plan.items?.length) return plan.items.length;
  if (plan.items_by_day) {
    return Object.values(plan.items_by_day).reduce(
      (n, arr) => n + (Array.isArray(arr) ? arr.length : 0),
      0,
    );
  }
  return 0;
}

/** Export cho UI (card chuẩn bị nhóm, checklist) — heuristic, server vẫn validate. */
export function scheduleCompleteHeuristic(plan: PlanEntity): boolean {
  const n = plan.number_of_days ?? 0;
  if (n <= 0) return false;
  if (!plan.items_by_day) return countItems(plan) >= n;
  for (let d = 1; d <= n; d++) {
    const day = plan.items_by_day[String(d)];
    if (!Array.isArray(day) || day.length === 0) return false;
  }
  return true;
}

/**
 * Gợi ý pha UI — không thay thế validate server.
 */
export function getPlannerFlowContext(plan: PlanEntity): PlannerFlowContext {
  const st = (plan.status || "").toLowerCase();
  const isSolo = (plan.number_of_people ?? 1) <= 1;
  const hasItems = countItems(plan) > 0;
  const scheduleLooksComplete = scheduleCompleteHeuristic(plan);
  const isPlanLocked = st === "locked";

  if (st === "completed" || st === "cancelled") {
    return {
      phase: "finished",
      isSolo,
      hasItems,
      scheduleLooksComplete,
    };
  }

  if (st === "ongoing") {
    return {
      phase: "pilgrimage",
      isSolo,
      hasItems,
      scheduleLooksComplete,
    };
  }

  // planning (default từ BE)
  if (!isSolo) {
    if (scheduleLooksComplete && isPlanLocked) {
      return {
        phase: "ready_start",
        isSolo,
        hasItems,
        scheduleLooksComplete,
      };
    }
    if (hasItems || scheduleLooksComplete) {
      return {
        phase: "group_prep",
        isSolo,
        hasItems,
        scheduleLooksComplete,
      };
    }
  } else {
    if (scheduleLooksComplete && hasItems && isPlanLocked) {
      return {
        phase: "ready_start",
        isSolo,
        hasItems,
        scheduleLooksComplete,
      };
    }
  }

  return {
    phase: "design",
    isSolo,
    hasItems,
    scheduleLooksComplete,
  };
}

/**
 * Gợi ý thời điểm auto chuyển ongoing (BE: 2h trước giờ đến điểm đầu trong ngày start_date).
 * Chỉ mang tính minh họa — server quyết định khi load chi tiết.
 */
export function getAutoStartHint(plan: PlanEntity): string | null {
  const st = (plan.status || "").toLowerCase();
  if (st !== "planning" || !plan.start_date) return null;

  const items = plan.items?.length
    ? [...plan.items].sort(
        (a, b) =>
          (a.leg_number ?? 0) - (b.leg_number ?? 0) ||
          (a.order_index ?? 0) - (b.order_index ?? 0),
      )
    : null;

  const first = items?.[0];
  const time = first?.estimated_time;
  if (!time) {
    return "auto_start_midnight";
  }
  return "auto_start_before_first";
}
