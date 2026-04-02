import React from "react";
import { Text, TouchableOpacity, View } from "react-native";
import {
  BORDER_RADIUS,
  COLORS,
  SPACING,
} from "../../../../../constants/theme.constants";

interface InvitePreviewCardProps {
  ownerName?: string;
  ownerEmail?: string;
  depositAmount?: number;
  penaltyPercentage?: number;
  joinedCount: number | null;
  estimatedJoinedCount: number;
  responding: boolean;
  onJoin: () => void;
  onReject: () => void;
  onChat: () => void;
}

export default function InvitePreviewCard({
  ownerName,
  ownerEmail,
  depositAmount,
  penaltyPercentage,
  joinedCount,
  estimatedJoinedCount,
  responding,
  onJoin,
  onReject,
  onChat,
}: InvitePreviewCardProps) {
  return (
    <View
      style={{
        marginHorizontal: SPACING.lg,
        marginBottom: SPACING.md,
        padding: SPACING.md,
        borderRadius: BORDER_RADIUS.lg,
        backgroundColor: "#EEF6FF",
        borderWidth: 1,
        borderColor: "#BFDBFE",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary }}>
        Lời mời tham gia nhóm
      </Text>
      <Text style={{ marginTop: 6, color: COLORS.textSecondary }}>
        Trưởng đoàn: {ownerName || "—"}
        {ownerEmail ? ` (${ownerEmail})` : ""}
      </Text>
      <Text style={{ marginTop: 4, color: COLORS.textSecondary }}>
        Tiền cọc:{" "}
        {typeof depositAmount === "number"
          ? `${Math.round(depositAmount).toLocaleString("vi-VN")} ₫`
          : "—"}
      </Text>
      <Text style={{ marginTop: 4, color: COLORS.textSecondary }}>
        Phạt rời nhóm:{" "}
        {typeof penaltyPercentage === "number"
          ? `${Math.round(penaltyPercentage)}%`
          : "0%"}
      </Text>
      <Text style={{ marginTop: 4, color: COLORS.textSecondary }}>
        Thành viên đã tham gia:{" "}
        {joinedCount !== null ? `${joinedCount} người` : `~${estimatedJoinedCount} người`}
      </Text>
      <View style={{ flexDirection: "row", gap: 10, marginTop: SPACING.md }}>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: COLORS.accent,
            borderRadius: BORDER_RADIUS.md,
            paddingVertical: 12,
            alignItems: "center",
            opacity: responding ? 0.6 : 1,
          }}
          onPress={onJoin}
          disabled={responding}
        >
          <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
            Tham gia
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={{
            flex: 1,
            backgroundColor: "#FEE2E2",
            borderRadius: BORDER_RADIUS.md,
            paddingVertical: 12,
            alignItems: "center",
            opacity: responding ? 0.6 : 1,
          }}
          onPress={onReject}
          disabled={responding}
        >
          <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
            Từ chối
          </Text>
        </TouchableOpacity>
      </View>
      <TouchableOpacity
        style={{
          marginTop: 10,
          borderRadius: BORDER_RADIUS.md,
          backgroundColor: "#E2E8F0",
          paddingVertical: 12,
          alignItems: "center",
        }}
        onPress={onChat}
      >
        <Text style={{ fontWeight: "700", color: COLORS.textPrimary }}>
          Chat với trưởng đoàn
        </Text>
      </TouchableOpacity>
    </View>
  );
}
