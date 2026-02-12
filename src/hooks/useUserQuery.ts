import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../contexts/AuthContext';
import authApi from '../services/api/shared/authApi';

export const USER_QUERY_KEY = ['user', 'profile'];

export function useUserQuery() {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    const query = useQuery({
        queryKey: USER_QUERY_KEY,
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
        queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
    };
}
