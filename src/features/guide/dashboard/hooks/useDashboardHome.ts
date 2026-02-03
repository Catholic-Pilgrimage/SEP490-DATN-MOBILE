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

import { useCallback, useEffect, useMemo, useState } from 'react';
import { getWeekStartDate } from '../../../../utils/dateUtils';
import { dashboardHomeApi, guideEventApi, guideMediaApi, guideSiteApi, massScheduleApi } from '../../../../services/api/guide';
import {
  ActiveShiftInfo,
  DashboardHomeData,
  DashboardHomeErrorState,
  DashboardHomeLoadingState,
  MassSchedule,
  NotificationItem,
  PendingBadges,
  RecentActivityItem,
  SiteScheduleShift,
  SOSInfo,
  SOSRequest,
  TodayOverviewItem,
} from '../../../../types/guide';
import { LocalGuideSite } from '../../../../types/guide';
import { EventItem, MediaItem } from '../../../../types/guide';
import {
  getActiveShift,
  getActiveShiftDisplay,
  getPendingBadges,
  getRecentActivity,
  getSiteStatusDisplay,
  getSOSInfo,
  getTodayOverview,
} from '../utils/dashboardHomeUtils';
import { getSiteOpenStatus } from '../../../../utils/dateUtils';

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
  // State
  const [data, setData] = useState<DashboardHomeData>(initialData);
  const [loading, setLoading] = useState<DashboardHomeLoadingState>(initialLoadingState);
  const [errors, setErrors] = useState<DashboardHomeErrorState>(initialErrorState);
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Raw data for processing
  const [rawSite, setRawSite] = useState<LocalGuideSite | null>(null);
  const [rawShifts, setRawShifts] = useState<SiteScheduleShift[]>([]);
  const [rawEvents, setRawEvents] = useState<EventItem[]>([]);
  const [rawSchedules, setRawSchedules] = useState<MassSchedule[]>([]);
  const [rawMedia, setRawMedia] = useState<MediaItem[]>([]);
  const [rawSOS, setRawSOS] = useState<SOSRequest[]>([]);
  const [sosTotal, setSOSTotal] = useState(0);

  // Pending counts for badges (đề xuất cải thiện UI)
  const [pendingMediaCount, setPendingMediaCount] = useState(0);
  const [pendingEventsCount, setPendingEventsCount] = useState(0);
  const [pendingSchedulesCount, setPendingSchedulesCount] = useState(0);

  // ============================================
  // FETCH FUNCTIONS
  // ============================================

  /**
   * Fetch Site Info
   * API: GET /api/local-guide/site
   */
  const fetchSiteInfo = useCallback(async () => {
    setLoading((prev) => ({ ...prev, siteInfo: true }));
    setErrors((prev) => ({ ...prev, siteInfo: null }));

    try {
      const response = await guideSiteApi.getAssignedSite();
      if (response?.success && response?.data) {
        setRawSite(response.data);
      } else {
        setErrors((prev) => ({ ...prev, siteInfo: response?.message || 'Failed to load site info' }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        siteInfo: error?.message || 'Failed to load site info' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, siteInfo: false }));
    }
  }, []);

  /**
   * Fetch Active Shift
   * API: GET /api/local-guide/site-schedule?week_start_date=YYYY-MM-DD
   */
  const fetchActiveShift = useCallback(async () => {
    setLoading((prev) => ({ ...prev, activeShift: true }));
    setErrors((prev) => ({ ...prev, activeShift: null }));

    try {
      const weekStart = getWeekStartDate();
      const response = await dashboardHomeApi.getSiteSchedule(weekStart);
      if (response?.success && response?.data) {
        setRawShifts(response.data);
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        activeShift: error?.message || 'Failed to load shift info' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, activeShift: false }));
    }
  }, []);

  /**
   * Fetch Today's Overview (Events + Schedules)
   * API 1: GET /api/local-guide/events
   * API 2: GET /api/local-guide/schedules
   */
  const fetchTodayOverview = useCallback(async () => {
    setLoading((prev) => ({ ...prev, todayOverview: true }));
    setErrors((prev) => ({ ...prev, todayOverview: null }));

    try {
      const [eventsRes, schedulesRes] = await Promise.all([
        guideEventApi.getEvents({ status: 'approved', is_active: true }),
        massScheduleApi.getList({ status: 'approved', is_active: true }),
      ]);

      if (eventsRes?.success && eventsRes?.data) {
        setRawEvents(eventsRes.data.data || []);
      }
      if (schedulesRes?.success && schedulesRes?.data) {
        setRawSchedules(schedulesRes.data.data || []);
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        todayOverview: error?.message || 'Failed to load overview' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, todayOverview: false }));
    }
  }, []);

  /**
   * Fetch SOS Info
   * API: GET /api/sos/site/list?status=pending
   */
  const fetchSOSInfo = useCallback(async () => {
    setLoading((prev) => ({ ...prev, sosInfo: true }));
    setErrors((prev) => ({ ...prev, sosInfo: null }));

    try {
      const response = await dashboardHomeApi.getSOSRequests({ 
        status: 'pending',
        limit: 5,
      });
      if (response?.success && response?.data) {
        // API returns { data: { sosRequests: [], pagination: {} } }
        setRawSOS(response.data.sosRequests || []);
        setSOSTotal(response.data.pagination?.totalItems || 0);
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        sosInfo: error?.message || 'Failed to load SOS info' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, sosInfo: false }));
    }
  }, []);

  /**
   * Fetch Recent Activity (Media + Events)
   * API 1: GET /api/local-guide/media?limit=3
   * API 2: GET /api/local-guide/events?limit=3
   */
  const fetchRecentActivity = useCallback(async () => {
    setLoading((prev) => ({ ...prev, recentActivity: true }));
    setErrors((prev) => ({ ...prev, recentActivity: null }));

    try {
      const [mediaRes, eventsRes] = await Promise.all([
        guideMediaApi.getMedia({ limit: 3 }),
        guideEventApi.getEvents({ limit: 3 }),
      ]);

      if (mediaRes?.success && mediaRes?.data) {
        setRawMedia(mediaRes.data.data || []);
      }
      if (eventsRes?.success && eventsRes?.data) {
        // Use separate state for recent events to not override today's events
        // Already stored in rawEvents if needed
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        recentActivity: error?.message || 'Failed to load recent activity' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, recentActivity: false }));
    }
  }, []);

  /**
   * Fetch Notifications
   * API: GET /api/notifications?limit=5
   */
  const fetchNotifications = useCallback(async () => {
    setLoading((prev) => ({ ...prev, notifications: true }));
    setErrors((prev) => ({ ...prev, notifications: null }));

    try {
      const response = await dashboardHomeApi.getNotifications(5);
      if (response?.success) {
        setData((prev) => ({
          ...prev,
          notifications: {
            items: response.data || [],
            unreadCount: response.unreadCount || 0,
          },
        }));
      }
    } catch (error: any) {
      setErrors((prev) => ({ 
        ...prev, 
        notifications: error?.message || 'Failed to load notifications' 
      }));
    } finally {
      setLoading((prev) => ({ ...prev, notifications: false }));
    }
  }, []);

  /**
   * Fetch Pending Counts for Badges
   * Đề xuất cải thiện: Thêm dot/badge cho mỗi quick action nếu có pending items
   * 
   * APIs:
   * - GET /api/local-guide/media?status=pending (count)
   * - GET /api/local-guide/events?status=pending (count)  
   * - GET /api/local-guide/schedules?status=pending (count)
   */
  const fetchPendingCounts = useCallback(async () => {
    try {
      const [mediaRes, eventsRes, schedulesRes] = await Promise.all([
        guideMediaApi.getMedia({ status: 'pending', limit: 1 }),
        guideEventApi.getEvents({ status: 'pending', limit: 1 }),
        massScheduleApi.getList({ status: 'pending', limit: 1 }),
      ]);

      // Get counts from data.pagination.totalItems
      if (mediaRes?.success && mediaRes?.data?.pagination) {
        setPendingMediaCount(mediaRes.data.pagination.totalItems || 0);
      }
      if (eventsRes?.success && eventsRes?.data?.pagination) {
        setPendingEventsCount(eventsRes.data.pagination.totalItems || 0);
      }
      if (schedulesRes?.success && schedulesRes?.data?.pagination) {
        setPendingSchedulesCount(schedulesRes.data.pagination.totalItems || 0);
      }
    } catch (error) {
      // Silent fail - badges are optional enhancement
      console.warn('Failed to fetch pending counts:', error);
    }
  }, []);

  // ============================================
  // DATA PROCESSING (MEMOIZED)
  // ============================================

  // Process site info with open/closed status
  const processedSiteInfo = useMemo(() => {
    if (!rawSite) return null;

    const openStatus = getSiteOpenStatus(rawSite.opening_hours);

    return {
      id: rawSite.id,
      name: rawSite.name,
      patronSaint: rawSite.patron_saint,
      coverImage: rawSite.cover_image,
      isOpen: openStatus.isOpen,
      openingHours: {
        open: rawSite.opening_hours?.open || '',
        close: rawSite.opening_hours?.close || '',
      },
    };
  }, [rawSite]);

  // Process active shift
  const processedActiveShift = useMemo(() => {
    return getActiveShift(rawShifts);
  }, [rawShifts]);

  // Process today's overview
  const processedTodayOverview = useMemo(() => {
    return getTodayOverview(rawEvents, rawSchedules);
  }, [rawEvents, rawSchedules]);

  // Process SOS info
  const processedSOSInfo = useMemo(() => {
    return getSOSInfo(rawSOS, sosTotal);
  }, [rawSOS, sosTotal]);

  // Process recent activity
  const processedRecentActivity = useMemo(() => {
    return getRecentActivity(rawMedia, rawEvents, 5);
  }, [rawMedia, rawEvents]);

  // ============================================
  // UPDATE DATA STATE
  // ============================================

  useEffect(() => {
    setData((prev) => ({
      ...prev,
      siteInfo: processedSiteInfo,
      activeShift: processedActiveShift,
      todayOverview: processedTodayOverview,
      sosInfo: processedSOSInfo,
      recentActivity: processedRecentActivity,
    }));
  }, [
    processedSiteInfo,
    processedActiveShift,
    processedTodayOverview,
    processedSOSInfo,
    processedRecentActivity,
  ]);

  // ============================================
  // ACTIONS
  // ============================================

  /**
   * Refresh all data
   */
  const refresh = useCallback(async () => {
    await Promise.all([
      fetchSiteInfo(),
      fetchActiveShift(),
      fetchTodayOverview(),
      fetchSOSInfo(),
      fetchRecentActivity(),
      fetchNotifications(),
      fetchPendingCounts(), // Đề xuất cải thiện UI
    ]);
  }, [
    fetchSiteInfo,
    fetchActiveShift,
    fetchTodayOverview,
    fetchSOSInfo,
    fetchRecentActivity,
    fetchNotifications,
    fetchPendingCounts,
  ]);

  /**
   * Refresh specific section
   */
  const refreshSection = useCallback(
    async (section: keyof DashboardHomeLoadingState) => {
      switch (section) {
        case 'siteInfo':
          await fetchSiteInfo();
          break;
        case 'activeShift':
          await fetchActiveShift();
          break;
        case 'todayOverview':
          await fetchTodayOverview();
          break;
        case 'sosInfo':
          await fetchSOSInfo();
          break;
        case 'recentActivity':
          await fetchRecentActivity();
          break;
        case 'notifications':
          await fetchNotifications();
          break;
      }
    },
    [
      fetchSiteInfo,
      fetchActiveShift,
      fetchTodayOverview,
      fetchSOSInfo,
      fetchRecentActivity,
      fetchNotifications,
    ]
  );

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    const init = async () => {
      await refresh();
      setIsInitialLoad(false);
    };
    init();
  }, [refresh]);

  // ============================================
  // COMPUTED VALUES
  // ============================================

  const isLoading = useMemo(
    () => Object.values(loading).some((v) => v),
    [loading]
  );

  const hasError = useMemo(
    () => Object.values(errors).some((v) => v !== null),
    [errors]
  );

  // Pending badges (đề xuất cải thiện UI)
  const pendingBadges = useMemo<PendingBadges>(
    () =>
      getPendingBadges({
        sosTotal,
        pendingMedia: pendingMediaCount,
        pendingEvents: pendingEventsCount,
        pendingSchedules: pendingSchedulesCount,
        unreadMessages: data.notifications.unreadCount,
      }),
    [sosTotal, pendingMediaCount, pendingEventsCount, pendingSchedulesCount, data.notifications.unreadCount]
  );

  // Site status display (đề xuất: CLOSED badge động)
  const siteStatusDisplay = useMemo(
    () => getSiteStatusDisplay(processedSiteInfo?.openingHours ?? null),
    [processedSiteInfo?.openingHours]
  );

  // Active shift display (đề xuất: chỉ hiển thị khi ON DUTY)
  const activeShiftDisplay = useMemo(
    () => getActiveShiftDisplay(processedActiveShift),
    [processedActiveShift]
  );

  // ============================================
  // RETURN
  // ============================================

  return {
    data,
    loading,
    isLoading,
    isInitialLoading: isInitialLoad && isLoading,
    errors,
    hasError,
    refresh,
    refreshSection,
    
    // Pending badges (đề xuất cải thiện UI)
    pendingBadges,
    
    // Convenience computed values
    isOpen: processedSiteInfo?.isOpen ?? false,
    isOnDuty: processedActiveShift.isOnDuty,
    hasPendingSOS: processedSOSInfo.hasPending,
    pendingSOSCount: processedSOSInfo.pendingCount,
    unreadNotificationCount: data.notifications.unreadCount,
    
    // Display helpers (đề xuất cải thiện UI)
    siteStatusDisplay,
    activeShiftDisplay,
  };
};

export default useDashboardHome;
