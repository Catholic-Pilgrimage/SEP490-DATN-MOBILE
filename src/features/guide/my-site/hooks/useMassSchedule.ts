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

import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCallback, useState } from "react";
import { Alert } from "react-native";
import {
  createMassSchedule,
  deleteMassSchedule,
  getMassSchedules,
  restoreMassSchedule,
  updateMassSchedule,
} from "../../../../services/api/guide";

import { GUIDE_KEYS } from "../../../../constants/queryKeys";
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
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<MassScheduleStatus | "all">("all");

  // Fetch Schedules with Infinite Query
  const {
    data,
    isLoading: loading,
    isRefetching: refreshing,
    fetchNextPage,
    hasNextPage,
    refetch,
    error: queryError,
  } = useInfiniteQuery({
    queryKey: GUIDE_KEYS.schedules({ status: statusFilter, is_active: true }),
    queryFn: async ({ pageParam = 1 }) => {
      const params: any = {
        page: pageParam,
        limit: 20,
        is_active: true,
      };
      if (statusFilter !== "all") {
        params.status = statusFilter;
      }
      const response = await getMassSchedules(params);
      if (!response?.success) throw new Error(response?.message || 'Failed to fetch schedules');
      return response.data; // { data: [], pagination: {} }
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      if (lastPage.pagination.page < lastPage.pagination.totalPages) {
        return lastPage.pagination.page + 1;
      }
      return undefined;
    },
  });

  const schedules = data?.pages.flatMap((page) => page.data || []) || [];
  const lastPage = data?.pages[data.pages.length - 1];
  const pagination = {
    page: lastPage?.pagination?.page || 1,
    limit: lastPage?.pagination?.limit || 20,
    totalItems: lastPage?.pagination?.totalItems || 0,
    totalPages: lastPage?.pagination?.totalPages || 0,
  };

  // Mutations
  const createMutation = useMutation({
    mutationFn: (data: CreateMassScheduleRequest) => createMassSchedule(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
      Alert.alert("Thành công", "Đã tạo lịch lễ mới");
    },
    onError: (err: any) => Alert.alert("Lỗi", err.message || "Không thể tạo lịch lễ"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateMassScheduleRequest }) => updateMassSchedule(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
      Alert.alert("Thành công", "Đã cập nhật lịch lễ");
    },
    onError: (err: any) => Alert.alert("Lỗi", err.message || "Không thể cập nhật lịch lễ"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMassSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
    },
    onError: (err: any) => Alert.alert("Lỗi", err.message || "Không thể xóa lịch lễ"),
  });

  const restoreMutation = useMutation({
    mutationFn: (id: string) => restoreMassSchedule(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.all });
    },
    onError: (err: any) => Alert.alert("Lỗi", err.message || "Không thể khôi phục lịch lễ"),
  });

  // Actions Wrappers
  const loadMore = useCallback(async () => {
    if (hasNextPage) {
      await fetchNextPage();
    }
  }, [hasNextPage, fetchNextPage]);

  const create = useCallback(async (data: CreateMassScheduleRequest) => {
    const res = await createMutation.mutateAsync(data);
    return res?.success ? res.data : null;
  }, [createMutation]);

  const update = useCallback(async (id: string, data: UpdateMassScheduleRequest) => {
    const res = await updateMutation.mutateAsync({ id, data });
    return res?.success ? res.data : null;
  }, [updateMutation]);

  const remove = useCallback(async (id: string) => {
    const res = await deleteMutation.mutateAsync(id);
    return !!res?.success;
  }, [deleteMutation]);

  const restore = useCallback(async (id: string) => {
    const res = await restoreMutation.mutateAsync(id);
    return !!res?.success;
  }, [restoreMutation]);

  const getScheduleById = useCallback((id: string) => {
    return schedules.find((s) => s.id === id);
  }, [schedules]);

  const filteredSchedules = statusFilter === "all"
    ? schedules
    : schedules.filter(s => s.status === statusFilter);

  const handleRefetch = useCallback(async () => {
    await refetch();
  }, [refetch]);

  return {
    schedules,
    filteredSchedules: schedules,
    pagination,
    loading,
    refreshing,
    creating: createMutation.isPending,
    updating: updateMutation.isPending,
    deleting: deleteMutation.isPending,
    error: queryError instanceof Error ? queryError.message : null,
    statusFilter,
    setStatusFilter,
    refetch: handleRefetch,
    loadMore,
    create,
    update,
    remove,
    restore,
    getScheduleById,
    hasMore: !!hasNextPage,
  };
};

export default useMassSchedule;
