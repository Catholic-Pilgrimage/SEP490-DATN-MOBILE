import type {
  PlanEntity,
  PlanInvite,
  PlanParticipant,
  PlannerMemberApiRow,
} from "../../../../types/pilgrim/planner.types";

export function buildPlannerInviteDeepLink(token: string): string {
  return `pilgrimapp://planners/invite/${token.trim()}`;
}

/** Loại chủ đoàn khỏi danh sách phụ (đã hiển thị card owner riêng). */
export function mapMembersToParticipants(
  members: PlannerMemberApiRow[],
  plan: PlanEntity | null,
): PlanParticipant[] {
  const ownerId = plan?.user_id ?? plan?.owner?.id;
  return members
    .filter((m) => (ownerId ? String(m.id) !== String(ownerId) : true))
    .map((m) => ({
      id: m.id,
      userId: m.id,
      userName: m.full_name || m.email || "—",
      userAvatar: m.avatar_url,
      role: "viewer" as const,
      joinedAt: m.joined_at || "",
    }));
}

export function filterInvitesNeedingAction(invites: PlanInvite[]): PlanInvite[] {
  return invites.filter(
    (inv) =>
      inv.status === "pending" || inv.status === "awaiting_payment",
  );
}
