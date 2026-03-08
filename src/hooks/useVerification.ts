import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { VERIFICATION_KEYS } from '../constants/queryKeys';
import { useAuth } from '../contexts/AuthContext';
import verificationApi from '../services/api/pilgrim/verificationApi';
import {
    GuestTransitionRequestPayload,
    GuestVerificationRequestPayload,
    PilgrimTransitionRequestPayload,
    PilgrimVerificationRequestPayload,
} from '../types/pilgrim/verification.types';

export function useVerification() {
    const { isAuthenticated } = useAuth();
    const queryClient = useQueryClient();

    // -- Queries --

    // Get My Verification Request (Pilgrim only)
    const myRequestQuery = useQuery({
        queryKey: VERIFICATION_KEYS.myRequest(),
        queryFn: async () => {
            try {
                const response = await verificationApi.getMyVerificationRequest();
                return response.data;
            } catch (error: any) {
                // If 404, the user might not have any request yet. It's fine to return null.
                if (error.response?.status === 404) {
                    return null;
                }
                throw error;
            }
        },
        enabled: isAuthenticated, // Only fetch if logged in
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: false, // Do not retry multiple times on error
    });

    // -- Mutations --

    const requestGuestVerificationMutation = useMutation({
        mutationFn: (payload: GuestVerificationRequestPayload) => verificationApi.requestGuestVerification(payload),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Đã gửi yêu cầu đăng ký quản lý điểm thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất.'
            });
            queryClient.invalidateQueries({ queryKey: VERIFICATION_KEYS.all });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.';
            Toast.show({ type: 'error', text1: 'Lỗi', text2: message });
        }
    });

    const requestPilgrimVerificationMutation = useMutation({
        mutationFn: (payload: PilgrimVerificationRequestPayload) => verificationApi.requestPilgrimVerification(payload),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Đã gửi yêu cầu đăng ký quản lý điểm thành công. Vui lòng chờ phê duyệt.'
            });
            queryClient.invalidateQueries({ queryKey: VERIFICATION_KEYS.all });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.';
            Toast.show({ type: 'error', text1: 'Lỗi', text2: message });
        }
    });

    const requestGuestTransitionMutation = useMutation({
        mutationFn: (payload: GuestTransitionRequestPayload) => verificationApi.requestGuestTransition(payload),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Đã gửi yêu cầu thay thế Quản lý thành công. Chúng tôi sẽ liên hệ với bạn sớm nhất.'
            });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.';
            Toast.show({ type: 'error', text1: 'Lỗi', text2: message });
        }
    });

    const requestPilgrimTransitionMutation = useMutation({
        mutationFn: (payload: PilgrimTransitionRequestPayload) => verificationApi.requestPilgrimTransition(payload),
        onSuccess: () => {
            Toast.show({
                type: 'success',
                text1: 'Thành công',
                text2: 'Đã gửi yêu cầu thay thế Quản lý thành công. Vui lòng chờ phê duyệt.'
            });
        },
        onError: (error: any) => {
            const message = error.response?.data?.message || 'Có lỗi xảy ra khi gửi yêu cầu. Vui lòng thử lại.';
            Toast.show({ type: 'error', text1: 'Lỗi', text2: message });
        }
    });

    return {
        myRequest: myRequestQuery.data,
        isMyRequestLoading: myRequestQuery.isLoading,
        myRequestError: myRequestQuery.error,
        refetchMyRequest: myRequestQuery.refetch,

        requestGuestVerification: requestGuestVerificationMutation.mutateAsync,
        isRequestingGuestVer: requestGuestVerificationMutation.isPending,

        requestPilgrimVerification: requestPilgrimVerificationMutation.mutateAsync,
        isRequestingPilgrimVer: requestPilgrimVerificationMutation.isPending,

        requestGuestTransition: requestGuestTransitionMutation.mutateAsync,
        isRequestingGuestTrans: requestGuestTransitionMutation.isPending,

        requestPilgrimTransition: requestPilgrimTransitionMutation.mutateAsync,
        isRequestingPilgrimTrans: requestPilgrimTransitionMutation.isPending,
    };
}
