/**
 * Guide Types - Dashboard
 * Type definitions for Local Guide Dashboard feature
 */

// ============================================
// RESPONSE TYPES
// ============================================

/**
 * Dashboard overview statistics
 */
export interface DashboardOverview {
  totalSites: number;
  totalVisitors: number;
  totalReviews: number;
  averageRating: number;
  pendingBookings: number;
  unreadMessages: number;
}

/**
 * Dashboard chart data point
 */
export interface ChartDataPoint {
  date: string;
  count: number;
}

/**
 * Popular site statistics
 */
export interface PopularSite {
  siteId: string;
  name: string;
  visits: number;
}

/**
 * Dashboard statistics with charts
 */
export interface DashboardStatistics {
  visitorsChart: ChartDataPoint[];
  reviewsChart: ChartDataPoint[];
  popularSites: PopularSite[];
}
