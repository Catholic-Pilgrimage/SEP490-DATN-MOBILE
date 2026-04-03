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
        marginBottom: SPACING.lg,
        padding: SPACING.lg,
        borderRadius: BORDER_RADIUS.xl,
        backgroundColor: "rgba(217, 119, 6, 0.08)",
        borderWidth: 1,
        borderColor: "rgba(217, 119, 6, 0.2)",
      }}
    >
      <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary, marginBottom: 8 }}>
        💌 Lời mời tham gia nhóm
      </Text>
      <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
        <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Trưởng đoàn: </Text>
        {ownerName || "—"}
        {ownerEmail ? ` (${ownerEmail})` : ""}
      </Text>
      <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
        <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Tiền cọc: </Text>
        {depositAmount != null && Number(depositAmount) > 0
          ? `${Math.round(Number(depositAmount)).toLocaleString("vi-VN")} ₫`
          : "Không có"}
      </Text>
      <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
        <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Phạt rời nhóm: </Text>
        {penaltyPercentage != null && Number(penaltyPercentage) > 0
          ? `${Math.round(Number(penaltyPercentage))}%`
          : "Không phạt"}
      </Text>
      <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
        <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Thành viên: </Text>
        {joinedCount !== null ? `${joinedCount} người` : `~${estimatedJoinedCount} người`} dự kiến
      </Text>

      {/* Actions are rendered in PlanDetailScreen (below "Chat nhóm") */}
    </View>
  );
}
