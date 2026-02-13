import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { GUIDE_KEYS } from '../../../../constants/queryKeys';
import guideSOSApi from '../../../../services/api/guide/sosApi';
import { GuideSOSListParams, ResolveSOSRequest } from '../../../../types/guide/sos.types';

export const useGuideSOSList = (params?: GuideSOSListParams) => {
    return useQuery({
        queryKey: GUIDE_KEYS.sos.list(params),
        queryFn: async () => {
            const response = await guideSOSApi.getGuideSOSList(params);
            return response.data;
        },
        refetchInterval: 10000, // Poll every 10 seconds for "realtime" feel
    });
};

export const useGuideSOSDetail = (id: string) => {
    return useQuery({
        queryKey: GUIDE_KEYS.sos.detail(id),
        queryFn: async () => {
            const response = await guideSOSApi.getGuideSOSDetail(id);
            return response.data;
        },
        refetchInterval: 5000, // Poll detail faster
        enabled: !!id,
    });
};

export const useGuideSOSActions = () => {
    const queryClient = useQueryClient();

    const assignMutation = useMutation({
        mutationFn: (id: string) => guideSOSApi.assignSOS(id),
        onSuccess: (_, id) => {
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.sos.detail(id) });
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.sos.all() });
        },
    });

    const resolveMutation = useMutation({
        mutationFn: ({ id, data }: { id: string; data: ResolveSOSRequest }) =>
            guideSOSApi.resolveSOS(id, data),
        onSuccess: (_, { id }) => {
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.sos.detail(id) });
            queryClient.invalidateQueries({ queryKey: GUIDE_KEYS.sos.all() });
        },
    });

    return {
        assignSOS: assignMutation.mutateAsync,
        resolveSOS: resolveMutation.mutateAsync,
        isAssigning: assignMutation.isPending,
        isResolving: resolveMutation.isPending,
    };
};
