/**
 * Pilgrim Types - Dashboard
 * Type definitions for Pilgrim dashboard overview
 */

export interface PilgrimDashboardJourneyOverview {
  total_checkins: number;
  total_journals: number;
  total_favorites: number;
  pilgrimage_days: number;
  first_checkin_date: string | null;
}

export interface PilgrimDashboardCurrentPlan {
  id: string;
  name: string;
  start_date: string;
  end_date?: string | null;
  total_sites: number;
}

export interface PilgrimDashboardOngoingPlan extends PilgrimDashboardCurrentPlan {
  checked_in_sites: number;
  progress_percentage: number;
}

export interface PilgrimDashboardCurrentPlans {
  ongoing: PilgrimDashboardOngoingPlan | null;
  upcoming: PilgrimDashboardCurrentPlan | null;
}

export interface PilgrimDashboardRecentCheckin {
  site_name: string;
  checkin_date: string;
  has_journal: boolean;
}

export interface PilgrimDashboardRecentJournal {
  id: string;
  title: string;
  site_name: string | null;
  created_at: string;
}

export interface PilgrimDashboardRecentActivity {
  recent_checkins: PilgrimDashboardRecentCheckin[];
  recent_journals: PilgrimDashboardRecentJournal[];
}

export interface PilgrimDashboardStatsByRegion {
  Bac: number;
  Trung: number;
  Nam: number;
}

export interface PilgrimDashboardStatsByType {
  church: number;
  shrine: number;
  monastery: number;
  center: number;
  other: number;
}

export interface PilgrimDashboardOverview {
  journey_overview: PilgrimDashboardJourneyOverview;
  current_plans: PilgrimDashboardCurrentPlans;
  recent_activity: PilgrimDashboardRecentActivity;
  stats_by_region: PilgrimDashboardStatsByRegion;
  stats_by_type: PilgrimDashboardStatsByType;
}
