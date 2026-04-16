import type { FeedPost } from "../types/post.types";
import { parsePostgresArray } from "./postgresArrayParser";

const normalizeLocationName = (value?: string | null) => {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
};

export const getFeedPostSiteId = (post?: FeedPost | null): string | undefined => {
  if (!post) return undefined;

  return (
    post.site?.id ||
    post.site_id ||
    post.sourceJournal?.site?.id ||
    post.sourceJournal?.resolved_site_id ||
    post.sourceJournal?.site_id ||
    undefined
  );
};

export const getFeedPostLocationName = (
  post?: FeedPost | null,
  fallbackSiteName?: string | null,
): string | undefined => {
  if (!post) return undefined;

  // Prioritize shared_locations for multi-site journals
  const sharedLocations =
    post.shared_locations || post.sourceJournal?.shared_locations;
  if (sharedLocations && sharedLocations.length > 0) {
    return sharedLocations
      .map((loc) => normalizeLocationName(loc.name))
      .filter(Boolean)
      .join(", ");
  }

  return (
    normalizeLocationName(post.site?.name) ||
    normalizeLocationName(post.sourceJournal?.site?.name) ||
    normalizeLocationName(fallbackSiteName)
  );
};

export const getFeedPostPlannerId = (post?: FeedPost | null): string | undefined =>
  post?.planner_id || post?.sourceJournal?.planner_id || undefined;

export const getFeedPostPlannerItemIds = (post?: FeedPost | null): string[] => {
  if (!post?.sourceJournal) return [];

  return Array.from(
    new Set([
      ...parsePostgresArray(post.sourceJournal.planner_item_id),
      ...parsePostgresArray(post.sourceJournal.planner_item_ids),
    ]),
  );
};

export const getFeedPostPlannerLocationName = (
  post?: FeedPost | null,
  plannerItemSiteNamesById: Record<string, string> = {},
): string | undefined => {
  const names = getFeedPostPlannerItemIds(post)
    .map((itemId) => normalizeLocationName(plannerItemSiteNamesById[itemId]))
    .filter((name): name is string => Boolean(name));

  if (!names.length) return undefined;

  return Array.from(new Set(names)).join(", ");
};
