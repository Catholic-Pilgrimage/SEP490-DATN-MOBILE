import type { PlanEntity, PlanItem } from "../../../../types/pilgrim/planner.types";

/** Chuẩn hóa bổn mạng để so khớp với backend (NFD, đ/Đ, gộp khoảng trắng). */
export function normalizePatronSaint(value: string | undefined | null): string {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\u0111\u0110]/g, (c) => (c === "\u0111" ? "d" : "D"))
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN");
}

export function isGroupJourneyPlan(plan: {
  number_of_people?: number;
  deposit_amount?: number | null;
  penalty_percentage?: number | null;
  viewer_join_status?: string | null;
  is_group_plan?: boolean;
  group_plan?: boolean;
  plan_type?: string;
  mode?: string;
  is_locked?: boolean;
  edit_lock_at?: string | null;
  planner_lock_at?: string | null;
  first_invite_at?: string | null;
  edit_lock_available_at?: string | null;
  can_set_edit_lock_at?: boolean;
  members?: unknown[];
}): boolean {
  const meta = plan as Record<string, unknown>;

  if (meta.is_group_plan === true || meta.group_plan === true) return true;

  const planType = String(meta.plan_type || meta.mode || "")
    .trim()
    .toLowerCase();
  if (planType === "group" || planType === "team") return true;

  if ((plan.number_of_people ?? 1) > 1) return true;

  const joinStatus = String(plan.viewer_join_status || "")
    .trim()
    .toLowerCase();
  if (joinStatus === "joined" || joinStatus === "dropped_out") return true;

  if (Array.isArray(plan.members) && plan.members.length > 0) return true;

  // Group-only financial/lifecycle fields from backend payloads.
  if (plan.deposit_amount != null || plan.penalty_percentage != null) return true;
  if (
    plan.edit_lock_at != null ||
    plan.planner_lock_at != null ||
    plan.first_invite_at != null ||
    plan.edit_lock_available_at != null ||
    typeof plan.can_set_edit_lock_at === "boolean" ||
    typeof plan.is_locked === "boolean"
  ) {
    return true;
  }

  return false;
}

/** Thứ tự điểm như lịch trình: theo ngày (key trong items_by_day) rồi order_index. */
export function getOrderedPlanItems(
  items_by_day?: Record<string, PlanItem[]>,
): PlanItem[] {
  if (!items_by_day || typeof items_by_day !== "object") return [];
  const dayKeys = Object.keys(items_by_day).sort(
    (a, b) => Number(a) - Number(b),
  );
  const out: PlanItem[] = [];
  for (const dk of dayKeys) {
    const dayItems = [...(items_by_day[dk] || [])].sort(
      (x, y) => (x.order_index ?? 0) - (y.order_index ?? 0),
    );
    out.push(...dayItems);
  }
  return out;
}

export type GroupPatronConstraint = {
  /** Hiển thị cho user (chuỗi gốc từ địa điểm đầu). */
  displayPatron: string;
  anchorSiteName: string;
  normalizedPatron: string;
};

/**
 * Kế hoạch nhóm đã có ít nhất một điểm và điểm đầu có bổn mạng → mọi điểm sau phải cùng bổn mạng (theo BE).
 */
export function getGroupPatronConstraintFromPlan(
  plan: PlanEntity | null | undefined,
): GroupPatronConstraint | null {
  if (!plan || !isGroupJourneyPlan(plan)) return null;
  const ordered = getOrderedPlanItems(plan.items_by_day);
  if (!ordered.length) return null;
  const first = ordered[0];
  const patron =
    (first.site as { patron_saint?: string } | undefined)?.patron_saint;
  if (!patron || !String(patron).trim()) return null;
  const displayPatron = String(patron).trim();
  return {
    displayPatron,
    anchorSiteName: first.site?.name || "Địa điểm đầu",
    normalizedPatron: normalizePatronSaint(displayPatron),
  };
}

export function sitePatronMatchesGroup(
  sitePatron: string | undefined | null,
  constraint: GroupPatronConstraint,
): "match" | "mismatch" | "unknown" {
  const raw = sitePatron?.trim();
  if (!raw) return "unknown";
  return normalizePatronSaint(raw) === constraint.normalizedPatron
    ? "match"
    : "mismatch";
}
