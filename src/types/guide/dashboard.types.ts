/**
 * Guide Types - Dashboard
 * Type definitions for Local Guide dashboard overview
 */

export interface LocalGuideDashboardSite {
  id: string;
  code: string;
  name: string;
  region: string;
  type: string;
  cover_image: string | null;
}

export interface LocalGuideDashboardPersonalStats {
  shifts_completed: number;
  sos_resolved: number;
}

export interface LocalGuideDashboardContributionStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
}

export interface LocalGuideDashboardContributions {
  media: LocalGuideDashboardContributionStats;
  schedules: LocalGuideDashboardContributionStats;
  events: LocalGuideDashboardContributionStats;
  nearby_places: LocalGuideDashboardContributionStats;
}

export interface LocalGuideDashboardSiteOverview {
  pending_sos: number;
  checkins_today: number;
}

export interface LocalGuideDashboardOverview {
  site: LocalGuideDashboardSite;
  personal_stats: LocalGuideDashboardPersonalStats;
  my_contributions: LocalGuideDashboardContributions;
  site_overview: LocalGuideDashboardSiteOverview;
}
