/**
 * useDashboardHome Hook
 * Comprehensive hook for fetching and managing Dashboard Home data
 * 
 * Features:
 * - Site Info with OPEN/CLOSED status (động theo thời gian)
 * - Active Shift detection (chỉ hiển thị khi ON DUTY)
 * - Today's Overview (merged events + schedules với NOW indicator)
 * - SOS pending count with badge
 * - Recent Activity (merged media + events với status)
 * - Notifications with unread count
 * - Pending Badges cho tất cả quick actions
 * 
 * All data processing follows backend analysis recommendations
 */

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import { dashboardHomeApi, guideEventApi, guideMediaApi, guideNearbyPlacesApi, guideSiteApi, massScheduleApi } from '../../../../services/api/guide';
import {
  ActiveShiftInfo,
  DashboardHomeData,
  DashboardHomeErrorState,
  DashboardHomeLoadingState,
  PendingBadges,
  SiteScheduleShift,
  SOSInfo
} from '../../../../types/guide';
import {
  getOpeningHoursForDay,
  getSiteOpenStatus,
  getWeekStartDate,
} from '../../../../utils/dateUtils';
import {
  getActiveShift,
  getActiveShiftDisplay,
  getPendingBadges,
  getRecentActivity,
  getSiteStatusDisplay,
  getSOSInfo,
  getTodayOverview,
} from '../utils/dashboardHomeUtils';

// ============================================
// TYPES
// ============================================

export interface UseDashboardHomeResult {
  // Data
  data: DashboardHomeData;

  // Pending badges (đề xuất cải thiện UI)
  pendingBadges: PendingBadges;

  // Loading states
  loading: DashboardHomeLoadingState;
  isLoading: boolean; // Any loading
  isInitialLoading: boolean; // First load

  // Error states
  errors: DashboardHomeErrorState;
  hasError: boolean;

  // Actions
  refresh: () => Promise<void>;
  refreshSection: (section: keyof DashboardHomeLoadingState) => Promise<void>;

  // Computed values (for convenience)
  isOpen: boolean;
  isOnDuty: boolean;
  hasPendingSOS: boolean;
  pendingSOSCount: number;
  unreadNotificationCount: number;

  // Display helpers (đề xuất cải thiện UI)
  siteStatusDisplay: ReturnType<typeof getSiteStatusDisplay>;
  activeShiftDisplay: ReturnType<typeof getActiveShiftDisplay>;
}

// ============================================
// INITIAL STATES
// ============================================

const initialLoadingState: DashboardHomeLoadingState = {
  siteInfo: true,
  activeShift: true,
  todayOverview: true,
  sosInfo: true,
  recentActivity: true,
  notifications: true,
};

const initialErrorState: DashboardHomeErrorState = {
  siteInfo: null,
  activeShift: null,
  todayOverview: null,
  sosInfo: null,
  recentActivity: null,
  notifications: null,
};

const initialActiveShift: ActiveShiftInfo = {
  isOnDuty: false,
  shift: null,
  startTime: '',
  endTime: '',
};

const initialSOSInfo: SOSInfo = {
  pendingCount: 0,
  hasPending: false,
  latestRequest: null,
};

const initialData: DashboardHomeData = {
  siteInfo: null,
  activeShift: initialActiveShift,
  todayOverview: [],
  sosInfo: initialSOSInfo,
  recentActivity: [],
  notifications: {
    items: [],
    unreadCount: 0,
  },
};

const initialPendingBadges: PendingBadges = {
  sos: 0,
  media: 0,
  events: 0,
  schedules: 0,
  messages: 0,
};

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export const useDashboardHome = (): UseDashboardHomeResult => {
  const queryClient = useQueryClient();
  const weekStart = getWeekStartDate();

  // Queries
  const siteQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.siteInfo(),
    queryFn: async () => {
      const response = await guideSiteApi.getAssignedSite();
      if (!response?.success) throw new Error(response?.message || 'Failed to load site info');
      return response.data;
    },
  });

  const activeShiftQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.activeShift(weekStart),
    queryFn: async () => {
      const response = await dashboardHomeApi.getSiteSchedule(weekStart);
      if (!response?.success) throw new Error(response?.message || 'Failed to load shift info');
      return response?.data; // Returns SiteScheduleData
    },
  });

  const todayOverviewQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.todayOverview(),
    queryFn: async () => {
      const [eventsRes, schedulesRes] = await Promise.all([
        guideEventApi.getEvents({ status: 'approved', is_active: true }),
        massScheduleApi.getList({ status: 'approved', is_active: true }),
      ]);
      return {
        events: eventsRes?.data?.data || [],
        schedules: schedulesRes?.data?.data || [],
      };
    },
  });

  const sosQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.sosInfo(),
    queryFn: async () => {
      const response = await dashboardHomeApi.getSOSRequests({ status: 'pending', limit: 5 });
      if (!response?.success) throw new Error(response?.message || 'Failed to load SOS info');
      return {
        items: response.data?.sosRequests || [],
        total: response.data?.pagination?.totalItems || 0,
      };
    },
    refetchInterval: 30000, // Autorefresh SOS every 30s
    refetchIntervalInBackground: false,
  });

  const recentActivityQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.recentActivity(),
    queryFn: async () => {
      const [mediaRes, eventsRes, nearbyPlacesRes] = await Promise.all([
        guideMediaApi.getMedia({ limit: 2 }),
        guideEventApi.getEvents({ limit: 2 }),
        guideNearbyPlacesApi.getNearbyPlaces(),
      ]);
      return {
        media: mediaRes?.data?.data || [],
        events: eventsRes?.data?.data || [],
        nearbyPlaces: (nearbyPlacesRes?.data?.data || []).slice(0, 2),
      };
    },
  });

  const notificationsQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.notifications(),
    queryFn: async () => {
      const response = await dashboardHomeApi.getNotifications(5);
      if (!response?.success) throw new Error('Failed to load notifications');
      return {
        items: response.data || [],
        unreadCount: response.unreadCount || 0,
      };
    },
    refetchInterval: 60000, // Autorefresh notifications every 60s
    refetchIntervalInBackground: false,
  });

  const pendingCountsQuery = useQuery({
    queryKey: GUIDE_KEYS.dashboard.pendingCounts(),
    queryFn: async () => {
      const [mediaRes, eventsRes, schedulesRes] = await Promise.all([
        guideMediaApi.getMedia({ status: 'pending', limit: 1 }),
        guideEventApi.getEvents({ status: 'pending', limit: 1 }),
        massScheduleApi.getList({ status: 'pending', limit: 1 }),
      ]);
      return {
        media: mediaRes?.data?.pagination?.totalItems || 0,
        events: eventsRes?.data?.pagination?.totalItems || 0,
        schedules: schedulesRes?.data?.pagination?.totalItems || 0,
      };
    },
  });

  // Result of Missing processedSiteInfo restoration
  // Process site info with open/closed status
  const processedSiteInfo = useMemo(() => {
    const rawSite = siteQuery.data;
    if (!rawSite) return null;

    const normalizedOpeningHours = getOpeningHoursForDay(rawSite.opening_hours);
    const openStatus = getSiteOpenStatus(rawSite.opening_hours);

    return {
      id: rawSite.id,
      name: rawSite.name,
      patronSaint: rawSite.patron_saint,
      coverImage: rawSite.cover_image,
      isOpen: openStatus.isOpen,
      openingHours: {
        open: normalizedOpeningHours?.open || '',
        close: normalizedOpeningHours?.close || '',
      },
    };
  }, [siteQuery.data]);

  // Process active shift
  const processedActiveShift = useMemo(() => {
    const rawData = activeShiftQuery.data;

    let allShifts: SiteScheduleShift[] = [];

    if (rawData?.schedule) {
      Object.values(rawData.schedule).forEach((shifts) => {
        if (Array.isArray(shifts)) {
          allShifts = [...allShifts, ...shifts];
        }
      });
    }

    return getActiveShift(allShifts);
  }, [activeShiftQuery.data, weekStart]);

  // Process today's overview
  const processedTodayOverview = useMemo(() => {
    return getTodayOverview(
      todayOverviewQuery.data?.events || [],
      todayOverviewQuery.data?.schedules || []
    );
  }, [todayOverviewQuery.data]);

  // Process SOS info
  const processedSOSInfo = useMemo(() => {
    return getSOSInfo(sosQuery.data?.items || [], sosQuery.data?.total || 0);
  }, [sosQuery.data]);

  // Process recent activity
  const processedRecentActivity = useMemo(() => {
    return getRecentActivity(
      recentActivityQuery.data?.media || [],
      recentActivityQuery.data?.events || [],
      5,
      recentActivityQuery.data?.nearbyPlaces || [],
    );
  }, [recentActivityQuery.data]);

  // Pending badges
  const pendingBadges = useMemo<PendingBadges>(
    () =>
      getPendingBadges({
        sosTotal: sosQuery.data?.total || 0,
        pendingMedia: pendingCountsQuery.data?.media || 0,
        pendingEvents: pendingCountsQuery.data?.events || 0,
        pendingSchedules: pendingCountsQuery.data?.schedules || 0,
        unreadMessages: notificationsQuery.data?.unreadCount || 0,
      }),
    [sosQuery.data, pendingCountsQuery.data, notificationsQuery.data]
  );

  // Site status display
  const siteStatusDisplay = useMemo(
    () => getSiteStatusDisplay(processedSiteInfo?.openingHours ?? null),
    [processedSiteInfo?.openingHours]
  );

  // Active shift display
  const activeShiftDisplay = useMemo(
    () => getActiveShiftDisplay(processedActiveShift),
    [processedActiveShift]
  );

  // ============================================
  // COMBINED STATE
  // ============================================

  const data: DashboardHomeData = useMemo(() => ({
    siteInfo: processedSiteInfo,
    activeShift: processedActiveShift,
    todayOverview: processedTodayOverview,
    sosInfo: processedSOSInfo,
    recentActivity: processedRecentActivity,
    notifications: notificationsQuery.data || { items: [], unreadCount: 0 },
  }), [
    processedSiteInfo,
    processedActiveShift,
    processedTodayOverview,
    processedSOSInfo,
    processedRecentActivity,
    notificationsQuery.data
  ]);

  const loading: DashboardHomeLoadingState = {
    siteInfo: siteQuery.isLoading,
    activeShift: activeShiftQuery.isLoading,
    todayOverview: todayOverviewQuery.isLoading,
    sosInfo: sosQuery.isLoading,
    recentActivity: recentActivityQuery.isLoading,
    notifications: notificationsQuery.isLoading,
  };

  const errors: DashboardHomeErrorState = {
    siteInfo: siteQuery.error ? (siteQuery.error as Error).message : null,
    activeShift: activeShiftQuery.error ? (activeShiftQuery.error as Error).message : null,
    todayOverview: todayOverviewQuery.error ? (todayOverviewQuery.error as Error).message : null,
    sosInfo: sosQuery.error ? (sosQuery.error as Error).message : null,
    recentActivity: recentActivityQuery.error ? (recentActivityQuery.error as Error).message : null,
    notifications: notificationsQuery.error ? (notificationsQuery.error as Error).message : null,
  };

  const isLoading = Object.values(loading).some((v) => v);
  const hasError = Object.values(errors).some((v) => v !== null);

  // ============================================
  // ACTIONS
  // ============================================

  const refresh = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.all() });
  }, [queryClient]);

  const refreshSection = useCallback(async (section: keyof DashboardHomeLoadingState) => {
    switch (section) {
      case 'siteInfo':
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.siteInfo() });
        break;
      case 'activeShift':
        // Note: this invalidates all activeShift queries regardless of weekStart
        // Ideally we pass specific weekStart, but invalidating broad key works
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.activeShift(weekStart) });
        break;
      case 'todayOverview':
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.todayOverview() });
        break;
      case 'sosInfo':
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.sosInfo() });
        break;
      case 'recentActivity':
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.recentActivity() });
        break;
      case 'notifications':
        await queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.dashboard.notifications() });
        break;
    }
  }, [queryClient]);

  return {
    data,
    loading,
    isLoading,
    isInitialLoading: isLoading && !data.siteInfo, // Rough approximation
    errors,
    hasError,
    refresh,
    refreshSection,

    // Pending badges
    pendingBadges,

    // Computed values
    isOpen: processedSiteInfo?.isOpen ?? false,
    isOnDuty: processedActiveShift.isOnDuty,
    hasPendingSOS: processedSOSInfo.hasPending,
    pendingSOSCount: processedSOSInfo.pendingCount,
    unreadNotificationCount: notificationsQuery.data?.unreadCount ?? 0,

    // Display helpers
    siteStatusDisplay,
    activeShiftDisplay,
  };
};

export default useDashboardHome;
