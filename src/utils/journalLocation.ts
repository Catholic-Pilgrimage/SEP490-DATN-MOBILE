import { getPlanDetail } from "../services/api/pilgrim/plannerApi";
import { getSiteDetail } from "../services/api/pilgrim/siteApi";
import type { JournalEntry } from "../types/pilgrim/journal.types";
import { parsePostgresArray } from "./postgresArrayParser";

type JournalLocationSource = Pick<
  JournalEntry,
  "planner_id" | "planner_item_id" | "planner_item_ids" | "site_id" | "site"
> & {
  resolved_site_id?: string | null;
};

export const getJournalPlannerItemIds = (
  journal?: JournalLocationSource | null,
): string[] => {
  if (!journal) return [];

  return Array.from(
    new Set([
      ...parsePostgresArray(journal.planner_item_id),
      ...parsePostgresArray(journal.planner_item_ids),
    ]),
  );
};

export const resolveJournalLocationName = async (
  journal?: JournalLocationSource | null,
): Promise<string | undefined> => {
  if (!journal) return undefined;

  const plannerItemIds = getJournalPlannerItemIds(journal);
  if (plannerItemIds.length > 0 && journal.planner_id) {
    try {
      const response = await getPlanDetail(journal.planner_id);
      const items =
        response.data?.items ||
        Object.values(response.data?.items_by_day || {}).flat();
      const matched = (items as any[]).filter(
        (item) => plannerItemIds.includes(item.id) && item.site?.name,
      );

      if (matched.length > 0) {
        return Array.from(
          new Set(matched.map((item: any) => item.site.name)),
        ).join(", ");
      }

      if (response.data?.name) {
        return response.data.name;
      }
    } catch {
      // Fall through to site-based resolution.
    }
  }

  if (journal.site?.name) {
    return journal.site.name;
  }

  const siteId = journal.resolved_site_id || journal.site_id;
  if (!siteId) {
    return undefined;
  }

  try {
    const response = await getSiteDetail(siteId);
    return response.data?.name || undefined;
  } catch {
    return undefined;
  }
};
