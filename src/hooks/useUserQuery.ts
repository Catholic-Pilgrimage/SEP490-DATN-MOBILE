import { useQuery, useQueryClient } from '@tanstack/react-query';
import { USER_KEYS } from '../constants/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import authApi from '../services/api/shared/authApi';

export function useUserQuery() {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: USER_KEYS.profile,
        queryFn: async () => {
            const response = await authApi.getProfile();
            return response.data;
        },
        enabled: isAuthenticated,
        staleTime: 1000 * 30, // 30 seconds
    });

    return query;
}

export function useInvalidateUserQuery() {
    const queryClient = useQueryClient();

    return () => {
        queryClient.invalidateQueries({ queryKey: USER_KEYS.profile });
    };
}
