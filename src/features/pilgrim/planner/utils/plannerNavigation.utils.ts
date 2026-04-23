import { CommonActions } from "@react-navigation/native";
import type { PlannerInitialTab } from "../../../../navigation/pilgrimNavigation.types";

/**
 * Từ màn ở root stack (vd. PlannerMembers) — về tab Lịch trình, stack chỉ còn PlannerMain.
 * Dùng sau khi rời đoàn lúc kế hoạch còn `planning` (BE 403 nếu vẫn mở PlanDetail).
 */
export function resetToLichTrinhPlannerHome(
  initialTab: PlannerInitialTab = "my",
) {
  return CommonActions.reset({
    index: 0,
    routes: [
      {
        name: "MainTabs" as const,
        state: {
          routes: [
            { name: "Hanh huong" as const },
            { name: "Nhat ky" as const },
            {
              name: "Lich trinh" as const,
              state: {
                index: 0,
                routes: [
                  { name: "PlannerMain" as const, params: { initialTab } },
                ],
              },
            },
            { name: "Cong dong" as const },
            { name: "Ho so" as const },
          ],
          index: 2,
        },
      },
    ],
  });
}

export function isPlanAccessForbiddenError(
  message: string,
  httpStatus?: number,
): boolean {
  if (httpStatus === 403) return true;
  const m = (message || "").toLowerCase();
  return (
    m.includes("không có quyền") ||
    m.includes("forbidden") ||
    /\b403\b/.test(m)
  );
}

/** Từ tab Của tôi: kế hoạch thuộc quyền tạo của user; list đôi khi không gửi `viewer_join_status`. */
export type ActiveJourneyPlannerListContext = {
  isOwnerPlanInMyTab?: boolean;
};

/**
 * Từ tab Lịch trình (thẻ kế hoạch): có đi thẳng tới màn hành trình thật (ActiveJourney) không.
 * Chỉ **owner** hoặc **joined**; `dropped_out` / `kicked` / không phải thành viên tích cực → **PlanDetail**.
 * Tab Của tôi: khi thiếu `viewerJoinStatus` nhưng `isOwnerPlanInMyTab` → coi như owner.
 */
export function shouldOpenActiveJourneyFromPlannerList(
  planStatus: string | undefined,
  viewerJoinStatus: string | null | undefined,
  context?: ActiveJourneyPlannerListContext,
): boolean {
  if (String(planStatus || "").toLowerCase() !== "ongoing") return false;
  const s = String(viewerJoinStatus || "").toLowerCase().trim();
  if (s === "dropped_out" || s === "kicked") return false;
  if (s === "owner" || s === "joined") return true;
  if (context?.isOwnerPlanInMyTab) return true;
  return false;
}

/** Không mở / không hiển thị màn hành trình: đã rời hoặc bị mời ra. */
export function isViewerStatusBlockedFromActiveJourney(
  viewerJoinStatus: string | null | undefined,
): boolean {
  const s = String(viewerJoinStatus || "").toLowerCase().trim();
  return s === "dropped_out" || s === "kicked";
}
