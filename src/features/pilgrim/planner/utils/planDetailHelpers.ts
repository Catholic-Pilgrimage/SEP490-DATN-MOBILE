import Toast from "react-native-toast-message";

/**
 * Extract a user-friendly error message from an Axios/API error response.
 * Falls through multiple common response shapes used by our backend.
 */
export const extractApiErrorMessage = (
  error: any,
  fallback = "Đã xảy ra lỗi",
): string => {
  const respData = error?.response?.data;
  return (
    respData?.error?.message ||
    respData?.message ||
    respData?.error?.details?.[0]?.message ||
    error?.message ||
    fallback
  );
};

/**
 * Show a standard error toast.
 */
export const showErrorToast = (
  t: (key: string, opts?: any) => string,
  text2: string,
  opts?: { visibilityTime?: number },
) => {
  Toast.show({
    type: "error",
    text1: t("common.error"),
    text2,
    ...(opts?.visibilityTime ? { visibilityTime: opts.visibilityTime } : {}),
  });
};

/**
 * Show a standard success toast.
 */
export const showSuccessToast = (
  t: (key: string, opts?: any) => string,
  text2: string,
  opts?: { visibilityTime?: number; text1?: string },
) => {
  Toast.show({
    type: "success",
    text1: opts?.text1 || t("common.success"),
    text2,
    ...(opts?.visibilityTime ? { visibilityTime: opts.visibilityTime } : {}),
  });
};
