/**
 * Centralized Favorites Hook
 * 
 * Uses React Query to maintain a single source of truth for favorite site IDs.
 * All screens that need to check/toggle favorites share the same cache,
 * so changes in one screen instantly reflect everywhere.
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Alert } from 'react-native';
import { FAVORITE_KEYS } from '../constants/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import pilgrimSiteApi from '../services/api/pilgrim/siteApi';

/**
 * Hook that provides:
 * - favoriteIds: Set<string> of all favorited site IDs
 * - isFavorite(siteId): check if a site is favorited
 * - toggleFavorite(siteId): add/remove from favorites
 * - isToggling: whether a toggle operation is in progress
 */
export function useFavorites() {
    const { isAuthenticated, isGuest } = useAuth();
    const queryClient = useQueryClient();

    // Query: fetch all favorite site IDs
    const { data: favoriteIds = new Set<string>(), isLoading } = useQuery({
        queryKey: FAVORITE_KEYS.ids(),
        queryFn: async () => {
            try {
                const response = await pilgrimSiteApi.getFavorites({ page: 1, limit: 200 });
                if (response.success && response.data?.sites) {
                    return new Set(response.data.sites.map((s: any) => s.id));
                }
                return new Set<string>();
            } catch {
                return new Set<string>();
            }
        },
        enabled: isAuthenticated && !isGuest,
        staleTime: 1000 * 60 * 5, // 5 minutes
    });

    // Mutation: toggle favorite
    const toggleMutation = useMutation({
        mutationFn: async (siteId: string) => {
            const isCurrentlyFavorite = favoriteIds.has(siteId);
            if (isCurrentlyFavorite) {
                await pilgrimSiteApi.removeFavorite(siteId);
            } else {
                await pilgrimSiteApi.addFavorite(siteId);
            }
            return { siteId, newState: !isCurrentlyFavorite };
        },
        // Optimistic update
        onMutate: async (siteId: string) => {
            // Cancel outgoing queries
            await queryClient.cancelQueries({ queryKey: FAVORITE_KEYS.ids() });

            // Snapshot current value
            const previousIds = queryClient.getQueryData<Set<string>>(FAVORITE_KEYS.ids());

            // Optimistically update
            queryClient.setQueryData<Set<string>>(FAVORITE_KEYS.ids(), (old) => {
                const newSet = new Set(old);
                if (newSet.has(siteId)) {
                    newSet.delete(siteId);
                } else {
                    newSet.add(siteId);
                }
                return newSet;
            });

            return { previousIds };
        },
        onError: (_err, _siteId, context) => {
            // Rollback on error
            if (context?.previousIds) {
                queryClient.setQueryData(FAVORITE_KEYS.ids(), context.previousIds);
            }
            Alert.alert('Lỗi', 'Không thể cập nhật yêu thích. Vui lòng thử lại.');
        },
        onSettled: () => {
            // Refetch to ensure consistency
            queryClient.invalidateQueries({ queryKey: FAVORITE_KEYS.ids() });
        },
    });

    const isFavorite = (siteId: string): boolean => {
        return favoriteIds.has(siteId);
    };

    const toggleFavorite = (siteId: string) => {
        if (!isAuthenticated || isGuest) {
            return false; // Caller should handle auth check
        }
        toggleMutation.mutate(siteId);
        return true;
    };

    return {
        favoriteIds,
        isFavorite,
        toggleFavorite,
        isLoading,
        isToggling: toggleMutation.isPending,
    };
}
