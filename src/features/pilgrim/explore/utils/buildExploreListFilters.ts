import type { SearchSitesParams } from "../../../../types/pilgrim";
import {
  EXPLORE_REGIONS,
  type ExploreSiteTypeFilter,
} from "../constants/exploreFilter.constants";

/**
 * Build query params for GET /api/sites on the Khám phá list (and pull-to-refresh / search).
 */
export function buildExploreListFilters(
  regionId: string,
  queryValue: string,
  hasEvents: boolean,
  siteType: ExploreSiteTypeFilter,
): Pick<
  SearchSitesParams,
  "region" | "query" | "search" | "has_events" | "type"
> {
  const region = EXPLORE_REGIONS.find((r) => r.id === regionId)?.value;
  const normalizedQuery = queryValue.trim();
  return {
    region,
    query: normalizedQuery || undefined,
    search: normalizedQuery || undefined,
    has_events: hasEvents ? ("true" as const) : undefined,
    type: siteType === "all" ? undefined : siteType,
  };
}
