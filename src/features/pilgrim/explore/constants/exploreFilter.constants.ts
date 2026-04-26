import type { SiteRegion, SiteType } from "../../../../types/pilgrim";

export const EXPLORE_REGIONS: {
  id: string;
  value: SiteRegion | undefined;
}[] = [
  { id: "all", value: undefined },
  { id: "bac", value: "Bac" },
  { id: "trung", value: "Trung" },
  { id: "nam", value: "Nam" },
];

/** "all" = không gửi `type` lên API */
export type ExploreSiteTypeFilter = "all" | SiteType;

export const EXPLORE_SITE_TYPE_OPTIONS: {
  id: ExploreSiteTypeFilter;
  labelKey: string;
  defaultLabel: string;
}[] = [
  { id: "all", labelKey: "explore.filter.typeAll", defaultLabel: "Tất cả" },
  { id: "church", labelKey: "explore.filter.typeChurch", defaultLabel: "Nhà thờ" },
  { id: "shrine", labelKey: "explore.filter.typeShrine", defaultLabel: "Thánh đường phụ" },
  {
    id: "monastery",
    labelKey: "explore.filter.typeMonastery",
    defaultLabel: "Dòng / tu viện",
  },
  { id: "center", labelKey: "explore.filter.typeCenter", defaultLabel: "Trung tâm" },
  { id: "other", labelKey: "explore.filter.typeOther", defaultLabel: "Khác" },
];
