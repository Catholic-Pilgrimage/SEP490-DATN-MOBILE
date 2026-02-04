/**
 * useMassSchedule Hook
 * Custom hook for fetching and managing Mass Schedule (Lịch lễ) data
 * 
 * Features:
 * - CRUD operations with proper error handling
 * - Loading states per operation
 * - Filter by status
 * - Refresh functionality
 * - Optimistic updates
 */

import { useCallback, useEffect, useState } from "react";
import { Alert } from "react-native";
import {
  createMassSchedule,
  deleteMassSchedule,
  getMassSchedules,
  restoreMassSchedule,
  updateMassSchedule,
} from "../../../../services/api/guide/massScheduleApi";
import {
  CreateMassScheduleRequest,
  MassSchedule,
  MassScheduleStatus,
  UpdateMassScheduleRequest,
} from "../../../../types/guide";

// ============================================
// TYPES
// ============================================

export interface UseMassScheduleResult {
  // Data
  schedules: MassSchedule[];
  filteredSchedules: MassSchedule[];
  
  // Pagination
  pagination: {
    page: number;
    limit: number;
    totalItems: number;
    totalPages: number;
  };
  
  // Loading states
  loading: boolean;
  refreshing: boolean;
  creating: boolean;
  updating: boolean;
  deleting: boolean;
  
  // Error state
  error: string | null;
  
  // Filter
  statusFilter: MassScheduleStatus | "all";
  setStatusFilter: (status: MassScheduleStatus | "all") => void;
  
  // Actions
  refetch: () => Promise<void>;
  loadMore: () => Promise<void>;
  create: (data: CreateMassScheduleRequest) => Promise<MassSchedule | null>;
  update: (id: string, data: UpdateMassScheduleRequest) => Promise<MassSchedule | null>;
  remove: (id: string) => Promise<boolean>;
  restore: (id: string) => Promise<boolean>;
  
  // Helpers
  getScheduleById: (id: string) => MassSchedule | undefined;
  hasMore: boolean;
}

// ============================================
// HOOK IMPLEMENTATION
// ============================================

export const useMassSchedule = (): UseMassScheduleResult => {
  // Data state
  const [schedules, setSchedules] = useState<MassSchedule[]>([]);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    totalItems: 0,
    totalPages: 0,
  });
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [creating, setCreating] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Error state
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [statusFilter, setStatusFilter] = useState<MassScheduleStatus | "all">("all");

  // ============================================
  // FETCH SCHEDULES
  // ============================================

  const fetchSchedules = useCallback(async (page = 1, isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else if (page === 1) {
        setLoading(true);
      }
      setError(null);

      const params: any = {
        page,
        limit: pagination.limit,
        is_active: true,
      };
      
      // Add status filter if not "all"
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }

      const response = await getMassSchedules(params);

      if (response?.success && response?.data) {
        const newData = response.data.data || [];
        const newPagination = response.data.pagination;

        if (page === 1) {
          setSchedules(newData);
        } else {
          setSchedules(prev => [...prev, ...newData]);
        }

        setPagination({
          page: newPagination.page || page,
          limit: newPagination.limit || pagination.limit,
          totalItems: newPagination.totalItems || 0,
          totalPages: newPagination.totalPages || 0,
        });
      } else {
        setError(response?.message || "Không thể tải danh sách lịch lễ");
      }
    } catch (err: any) {
      console.error("Fetch schedules error:", err);
      setError("Không thể tải danh sách lịch lễ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [statusFilter, pagination.limit]);

  // Initial fetch
  useEffect(() => {
    fetchSchedules(1);
  }, [statusFilter]);

  // ============================================
  // ACTIONS
  // ============================================

  const refetch = useCallback(async () => {
    await fetchSchedules(1, true);
  }, [fetchSchedules]);

  const loadMore = useCallback(async () => {
    if (loading || refreshing || pagination.page >= pagination.totalPages) {
      return;
    }
    await fetchSchedules(pagination.page + 1);
  }, [loading, refreshing, pagination, fetchSchedules]);

  // Create schedule
  const create = useCallback(async (data: CreateMassScheduleRequest): Promise<MassSchedule | null> => {
    try {
      setCreating(true);
      const response = await createMassSchedule(data);

      if (response?.success && response?.data) {
        // Add to local state (optimistic update)
        setSchedules(prev => [response.data, ...prev]);
        setPagination(prev => ({
          ...prev,
          totalItems: prev.totalItems + 1,
        }));
        return response.data;
      } else {
        Alert.alert("Lỗi", response?.message || "Không thể tạo lịch lễ");
        return null;
      }
    } catch (err: any) {
      console.error("Create schedule error:", err);
      const message = err?.response?.data?.message || "Không thể tạo lịch lễ";
      Alert.alert("Lỗi", message);
      return null;
    } finally {
      setCreating(false);
    }
  }, []);

  // Update schedule
  const update = useCallback(async (id: string, data: UpdateMassScheduleRequest): Promise<MassSchedule | null> => {
    try {
      setUpdating(true);
      const response = await updateMassSchedule(id, data);

      if (response?.success && response?.data) {
        // Update local state
        setSchedules(prev => 
          prev.map(s => s.id === id ? response.data : s)
        );
        return response.data;
      } else {
        Alert.alert("Lỗi", response?.message || "Không thể cập nhật lịch lễ");
        return null;
      }
    } catch (err: any) {
      console.error("Update schedule error:", err);
      const message = err?.response?.data?.message || "Không thể cập nhật lịch lễ";
      Alert.alert("Lỗi", message);
      return null;
    } finally {
      setUpdating(false);
    }
  }, []);

  // Delete schedule (soft delete)
  const remove = useCallback(async (id: string): Promise<boolean> => {
    try {
      setDeleting(true);
      const response = await deleteMassSchedule(id);

      if (response?.success) {
        // Remove from local state
        setSchedules(prev => prev.filter(s => s.id !== id));
        setPagination(prev => ({
          ...prev,
          totalItems: Math.max(0, prev.totalItems - 1),
        }));
        return true;
      } else {
        Alert.alert("Lỗi", response?.message || "Không thể xoá lịch lễ");
        return false;
      }
    } catch (err: any) {
      console.error("Delete schedule error:", err);
      const message = err?.response?.data?.message || "Không thể xoá lịch lễ";
      Alert.alert("Lỗi", message);
      return false;
    } finally {
      setDeleting(false);
    }
  }, []);

  // Restore schedule
  const restore = useCallback(async (id: string): Promise<boolean> => {
    try {
      const response = await restoreMassSchedule(id);

      if (response?.success) {
        // Refetch to get updated data
        await refetch();
        return true;
      } else {
        Alert.alert("Lỗi", response?.message || "Không thể khôi phục lịch lễ");
        return false;
      }
    } catch (err: any) {
      console.error("Restore schedule error:", err);
      const message = err?.response?.data?.message || "Không thể khôi phục lịch lễ";
      Alert.alert("Lỗi", message);
      return false;
    }
  }, [refetch]);

  // ============================================
  // HELPERS
  // ============================================

  const getScheduleById = useCallback((id: string): MassSchedule | undefined => {
    return schedules.find(s => s.id === id);
  }, [schedules]);

  const filteredSchedules = statusFilter === "all"
    ? schedules
    : schedules.filter(s => s.status === statusFilter);

  const hasMore = pagination.page < pagination.totalPages;

  return {
    schedules,
    filteredSchedules,
    pagination,
    loading,
    refreshing,
    creating,
    updating,
    deleting,
    error,
    statusFilter,
    setStatusFilter,
    refetch,
    loadMore,
    create,
    update,
    remove,
    restore,
    getScheduleById,
    hasMore,
  };
};

export default useMassSchedule;
