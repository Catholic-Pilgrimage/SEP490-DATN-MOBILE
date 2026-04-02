import React from "react";
import { Text, View } from "react-native";
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
}

export default function InvitePreviewCard({
  ownerName,
  ownerEmail,
  depositAmount,
  penaltyPercentage,
  joinedCount,
  estimatedJoinedCount,
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
      {/* Actions are rendered in PlanDetailScreen (below "Chat nhóm") */}
    </View>
  );
}
