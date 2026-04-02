import { useState } from "react";
import { Linking } from "react-native";
import Toast from "react-native-toast-message";
import { TFunction } from "i18next";
import pilgrimPlannerApi from "../../../../services/api/pilgrim/plannerApi";
import { RespondInviteResponse } from "../../../../types/pilgrim/planner.types";

interface UseInvitePlanActionsParams {
  inviteToken?: string;
  planId: string;
  navigation: any;
  t: TFunction;
  isOffline: boolean;
  showConnectionRequiredAlert: () => void;
}

export function useInvitePlanActions({
  inviteToken,
  planId,
  navigation,
  t,
  isOffline,
  showConnectionRequiredAlert,
}: UseInvitePlanActionsParams) {
  const [respondingInvite, setRespondingInvite] = useState(false);

  const handleRejectInvite = async () => {
    if (!inviteToken || respondingInvite) return;
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    try {
      setRespondingInvite(true);
      const response = await pilgrimPlannerApi.respondToInvite(inviteToken, {
        action: "reject",
      });
      if (!response.success) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || "Không thể từ chối lời mời",
        });
        return;
      }

      Toast.show({
        type: "success",
        text1: "Đã từ chối lời mời",
      });
      navigation.goBack();
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error?.message || "Không thể từ chối lời mời",
      });
    } finally {
      setRespondingInvite(false);
    }
  };

  const handleJoinInvite = async () => {
    if (!inviteToken || respondingInvite) return;
    if (isOffline) {
      showConnectionRequiredAlert();
      return;
    }

    try {
      setRespondingInvite(true);
      const response = await pilgrimPlannerApi.respondToInvite(inviteToken, {
        action: "accept",
      });
      if (!response.success) {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: response.message || "Không thể tham gia kế hoạch",
        });
        return;
      }

      const extra = response.data as RespondInviteResponse | undefined;
      const payUrl = extra?.checkout_url || extra?.payment_url;
      const paidFromWallet = extra?.paid_from_wallet === true;

      if (payUrl) {
        const canOpen = await Linking.canOpenURL(payUrl);
        if (canOpen) {
          await Linking.openURL(payUrl);
          Toast.show({
            type: "info",
            text1: "Đã mở trang thanh toán",
            text2: "Thanh toán xong, vào lại kế hoạch để tiếp tục.",
          });
        } else {
          Toast.show({
            type: "error",
            text1: t("common.error"),
            text2: "Không thể mở đường dẫn thanh toán",
          });
        }
        return;
      }

      Toast.show({
        type: "success",
        text1: paidFromWallet ? "Đã tham gia (trừ ví)" : "Tham gia thành công",
      });
      navigation.replace("PlanDetailScreen", { planId });
    } catch (error: any) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: error?.message || "Không thể tham gia kế hoạch",
      });
    } finally {
      setRespondingInvite(false);
    }
  };

  return {
    respondingInvite,
    handleRejectInvite,
    handleJoinInvite,
  };
}
