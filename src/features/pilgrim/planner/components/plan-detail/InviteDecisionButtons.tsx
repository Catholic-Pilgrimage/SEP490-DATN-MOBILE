import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import { BORDER_RADIUS, COLORS, SPACING } from "../../../../../constants/theme.constants";
import { useConfirm } from "../../../../../hooks/useConfirm";

interface InviteDecisionButtonsProps {
  depositAmount?: number | null | undefined;
  respondingInvite: boolean;
  isOffline: boolean;
  handleRejectInvite: () => void;
  handleJoinInvite: () => void;
  /** Friend invite = join immediately, no deposit */
  isFriendInvite?: boolean;
}

export const InviteDecisionButtons: React.FC<InviteDecisionButtonsProps> = ({
  depositAmount,
  respondingInvite,
  isOffline,
  handleRejectInvite,
  handleJoinInvite,
  isFriendInvite = false,
}) => {
  const { confirm } = useConfirm();

  return (
    <View
      style={{
        flexDirection: "row",
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        gap: 12,
      }}
    >
      <TouchableOpacity
        style={{
          flex: 1,
          paddingVertical: 14,
          alignItems: "center",
          opacity: respondingInvite ? 0.6 : 1,
          borderWidth: 1,
          borderColor: "#E5E7EB",
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: "#FFFFFF",
        }}
        onPress={async () => {
          const confirmed = await confirm({
            type: "danger",
            iconName: "close-circle-outline",
            title: "Từ chối lời mời",
            message: "Bạn chắc chắn muốn từ chối lời mời tham gia kế hoạch này? Thao tác này không thể hoàn tác.",
            confirmText: "Từ chối",
            cancelText: "Quay lại",
          });
          if (confirmed) handleRejectInvite();
        }}
        disabled={respondingInvite || isOffline}
        activeOpacity={0.85}
      >
        <Text
          style={{
            fontWeight: "600",
            color: COLORS.textSecondary,
            fontSize: 15,
          }}
        >
          Từ chối
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={{
          flex: 1,
          backgroundColor: COLORS.accent,
          borderRadius: BORDER_RADIUS.md,
          paddingVertical: 14,
          alignItems: "center",
          opacity: respondingInvite ? 0.6 : 1,
        }}
        onPress={async () => {
          // Friend invite: miễn cọc, tham gia ngay
          // External invite: cần cọc, hiển thị số tiền
          const depositText =
            !isFriendInvite && depositAmount != null && Number(depositAmount) > 0
              ? `${Math.round(Number(depositAmount)).toLocaleString("vi-VN")} đ`
              : null;

          const message = isFriendInvite
            ? "Bạn sẽ tham gia kế hoạch này ngay lập tức (miễn cọc vì là bạn bè). Tiếp tục?"
            : depositText
              ? `Bạn sẽ tham gia kế hoạch này và cần thanh toán tiền cọc ${depositText}. Tiếp tục?`
              : "Bạn xác nhận muốn tham gia kế hoạch hành hương này?";

          const confirmed = await confirm({
            type: "info",
            iconName: "checkmark-circle-outline",
            title: "Xác nhận tham gia",
            message,
            confirmText: "Đồng ý",
            cancelText: "Hủy",
          });
          if (confirmed) handleJoinInvite();
        }}
        disabled={respondingInvite || isOffline}
        activeOpacity={0.85}
      >
        <Text
          style={{
            fontWeight: "700",
            color: COLORS.textPrimary,
            fontSize: 15,
          }}
        >
          Tham gia
        </Text>
      </TouchableOpacity>
    </View>
  );
};
