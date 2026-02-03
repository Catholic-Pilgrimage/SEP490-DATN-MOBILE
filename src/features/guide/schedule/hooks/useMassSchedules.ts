/**
 * useMassSchedules Hook
 * Complete hook for managing Mass Schedules (Lịch lễ)
 *
 * Features:
 * - CRUD operations
 * - List with filtering and pagination
 * - Optimistic updates
 * - Loading and error states
 * - UI-ready transformed data
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { massScheduleApi } from '../../../../services/api/guide';
import {
  CreateMassScheduleRequest,
  DayOfWeek,
  GetMassSchedulesParams,
  MassSchedule,
  MassSchedulePagination,
  MassScheduleStatus,
  MassScheduleWithUI,
  UpdateMassScheduleRequest,
} from '../../../../types/guide';
import {
  sortByTime,
  transformSchedulesToUI,
} from '../utils/massScheduleUtils';

// ============================================
// TYPES
// ============================================

export interface UseMassSchedulesResult {
  // Data
  schedules: MassScheduleWithUI[];
  rawSchedules: MassSchedule[];
  pagination: MassSchedulePagination | null;

  // States
  loading: boolean;
  refreshing: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  error: string | null;

  // Actions - CRUD
  fetchSchedules: (params?: GetMassSchedulesParams) => Promise<void>;
  createSchedule: (data: CreateMassScheduleRequest) => Promise<MassSchedule | null>;
  updateSchedule: (id: string, data: UpdateMassScheduleRequest) => Promise<MassSchedule | null>;
  deleteSchedule: (id: string) => Promise<boolean>;
  restoreSchedule: (id: string) => Promise<boolean>;

  // Actions - Navigation
  refresh: () => Promise<void>;
  loadMore: () => Promise<void>;
  hasMore: boolean;

  // Filters
  filterByStatus: (status: MassScheduleStatus | 'all') => void;
  filterByDay: (day: DayOfWeek | 'all') => void;
  currentFilters: {
    status: MassScheduleStatus | 'all';
    day: DayOfWeek | 'all';
  };

  // Computed
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  todaySchedules: MassScheduleWithUI[];
}

interface Filters {
  status: MassScheduleStatus | 'all';
  day: DayOfWeek | 'all';
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export const useMassSchedules = (
  initialParams?: GetMassSchedulesParams
): UseMassSchedulesResult => {
  // State
  const [rawSchedules, setRawSchedules] = useState<MassSchedule[]>([]);
  const [pagination, setPagination] = useState<MassSchedulePagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<Filters>({
    status: 'all',
    day: 'all',
  });

  // Current page for pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ============================================
  // FETCH SCHEDULES
  // ============================================

  const fetchSchedules = useCallback(
    async (params?: GetMassSchedulesParams) => {
      setLoading(true);
      setError(null);

      try {
        const queryParams: GetMassSchedulesParams = {
          ...params,
          page: params?.page || 1,
          limit: params?.limit || 20,
          is_active: true,
        };

        // Apply filters
        if (filters.status !== 'all') {
          queryParams.status = filters.status;
        }
        if (filters.day !== 'all') {
          queryParams.day_of_week = filters.day;
        }

        const response = await massScheduleApi.getList(queryParams);

        if (response.success && response.data) {
          if (queryParams.page === 1) {
            setRawSchedules(response.data.data);
          } else {
            // Append for load more
            setRawSchedules((prev) => [...prev, ...response.data.data]);
          }
          setPagination(response.data.pagination);
          setCurrentPage(queryParams.page || 1);
        } else {
          setError('Không thể tải danh sách lịch lễ');
        }
      } catch (err: any) {
        setError(err?.message || 'Không thể tải danh sách lịch lễ');
      } finally {
        setLoading(false);
      }
    },
    [filters]
  );

  // ============================================
  // CREATE SCHEDULE
  // ============================================

  const createSchedule = useCallback(
    async (data: CreateMassScheduleRequest): Promise<MassSchedule | null> => {
      setCreating(true);
      setError(null);

      try {
        const response = await massScheduleApi.create(data);

        if (response.success && response.data) {
          // Add to local state (optimistic)
          setRawSchedules((prev) => [response.data, ...prev]);
          return response.data;
        } else {
          setError('Không thể tạo lịch lễ');
          return null;
        }
      } catch (err: any) {
        const message = err?.response?.data?.message || err?.message || 'Không thể tạo lịch lễ';
        setError(message);
        return null;
      } finally {
        setCreating(false);
      }
    },
    []
  );

  // ============================================
  // UPDATE SCHEDULE
  // ============================================

  const updateSchedule = useCallback(
    async (
      id: string,
      data: UpdateMassScheduleRequest
    ): Promise<MassSchedule | null> => {
      setUpdating(true);
      setError(null);

      try {
        const response = await massScheduleApi.update(id, data);

        if (response.success && response.data) {
          // Update in local state
          setRawSchedules((prev) =>
            prev.map((s) => (s.id === id ? response.data : s))
          );
          return response.data;
        } else {
          setError('Không thể cập nhật lịch lễ');
          return null;
        }
      } catch (err: any) {
        let message = 'Không thể cập nhật lịch lễ';
        
        // Handle specific error cases
        if (err?.response?.status === 403) {
          message = 'Không thể cập nhật lịch lễ đã được duyệt';
        } else if (err?.response?.data?.message) {
          message = err.response.data.message;
        }
        
        setError(message);
        return null;
      } finally {
        setUpdating(false);
      }
    },
    []
  );

  // ============================================
  // DELETE SCHEDULE
  // ============================================

  const deleteSchedule = useCallback(async (id: string): Promise<boolean> => {
    setDeleting(true);
    setError(null);

    try {
      const response = await massScheduleApi.delete(id);

      if (response.success) {
        // Remove from local state (soft delete - filter out)
        setRawSchedules((prev) => prev.filter((s) => s.id !== id));
        return true;
      } else {
        setError('Không thể xóa lịch lễ');
        return false;
      }
    } catch (err: any) {
      let message = 'Không thể xóa lịch lễ';
      
      if (err?.response?.status === 403) {
        message = 'Không thể xóa lịch lễ đã được duyệt';
      } else if (err?.response?.data?.message) {
        message = err.response.data.message;
      }
      
      setError(message);
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  // ============================================
  // RESTORE SCHEDULE
  // ============================================

  const restoreSchedule = useCallback(async (id: string): Promise<boolean> => {
    setUpdating(true);
    setError(null);

    try {
      const response = await massScheduleApi.restore(id);

      if (response.success) {
        // Refresh to get updated data
        await fetchSchedules({ page: 1 });
        return true;
      } else {
        setError('Không thể khôi phục lịch lễ');
        return false;
      }
    } catch (err: any) {
      setError(err?.message || 'Không thể khôi phục lịch lễ');
      return false;
    } finally {
      setUpdating(false);
    }
  }, [fetchSchedules]);

  // ============================================
  // REFRESH & LOAD MORE
  // ============================================

  const refresh = useCallback(async () => {
    setRefreshing(true);
    await fetchSchedules({ page: 1 });
    setRefreshing(false);
  }, [fetchSchedules]);

  const loadMore = useCallback(async () => {
    if (!pagination || currentPage >= pagination.totalPages) return;
    await fetchSchedules({ page: currentPage + 1 });
  }, [fetchSchedules, currentPage, pagination]);

  const hasMore = useMemo(() => {
    if (!pagination) return false;
    return currentPage < pagination.totalPages;
  }, [currentPage, pagination]);

  // ============================================
  // FILTERS
  // ============================================

  const filterByStatus = useCallback((status: MassScheduleStatus | 'all') => {
    setFilters((prev) => ({ ...prev, status }));
  }, []);

  const filterByDay = useCallback((day: DayOfWeek | 'all') => {
    setFilters((prev) => ({ ...prev, day }));
  }, []);

  // Re-fetch when filters change
  useEffect(() => {
    fetchSchedules({ page: 1 });
  }, [filters]); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // TRANSFORMED DATA
  // ============================================

  const schedules = useMemo(() => {
    const sorted = sortByTime(rawSchedules);
    return transformSchedulesToUI(sorted);
  }, [rawSchedules]);

  // Today's schedules
  const todaySchedules = useMemo(() => {
    const today = new Date().getDay() as DayOfWeek;
    return schedules.filter((s) => s.days_of_week.includes(today));
  }, [schedules]);

  // Counts by status
  const pendingCount = useMemo(
    () => rawSchedules.filter((s) => s.status === 'pending').length,
    [rawSchedules]
  );

  const approvedCount = useMemo(
    () => rawSchedules.filter((s) => s.status === 'approved').length,
    [rawSchedules]
  );

  const rejectedCount = useMemo(
    () => rawSchedules.filter((s) => s.status === 'rejected').length,
    [rawSchedules]
  );

  // ============================================
  // INITIAL LOAD
  // ============================================

  useEffect(() => {
    fetchSchedules(initialParams);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ============================================
  // RETURN
  // ============================================

  return {
    // Data
    schedules,
    rawSchedules,
    pagination,

    // States
    loading,
    refreshing,
    creating,
    updating,
    deleting,
    error,

    // Actions - CRUD
    fetchSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    restoreSchedule,

    // Actions - Navigation
    refresh,
    loadMore,
    hasMore,

    // Filters
    filterByStatus,
    filterByDay,
    currentFilters: filters,

    // Computed
    pendingCount,
    approvedCount,
    rejectedCount,
    todaySchedules,
  };
};

export default useMassSchedules;
