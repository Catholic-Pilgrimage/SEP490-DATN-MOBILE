import { useMutation, useQueryClient } from '@tanstack/react-query';
import { FRIENDSHIP_KEYS } from '../constants/queryKeys';
import friendshipApi from '../services/api/pilgrim/friendshipApi';

/**
 * Hook for friendship-related operations
 */
export function useSendFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (addresseeId: string) => friendshipApi.sendFriendRequest(addresseeId),
        onSuccess: () => {
            // Optionally invalidate friendship list if needed
            queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
        },
    });
}

export function useRespondFriendRequest() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: ({ friendshipId, action }: { friendshipId: string; action: 'accept' | 'reject' }) =>
            friendshipApi.respondToFriendRequest(friendshipId, action),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
        },
    });
}

export function useRemoveFriend() {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: (friendId: string) => friendshipApi.removeFriend(friendId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: FRIENDSHIP_KEYS.all });
        },
    });
}
