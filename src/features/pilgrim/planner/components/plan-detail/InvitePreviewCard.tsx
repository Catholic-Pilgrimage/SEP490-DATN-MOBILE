import React, { useState } from "react";
import { Text, View, TouchableOpacity } from "react-native";
import { Ionicons } from "@expo/vector-icons";
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
  editLockAt?: string | null;
  plannerLockAt?: string | null;
  isEditLocked?: boolean;
  planStatusStr?: string;
  planStartDate?: string | null;
  /** Friend invite = miễn cọc, tham gia ngay */
  isFriendInvite?: boolean;
}

export default function InvitePreviewCard({
  ownerName,
  ownerEmail,
  depositAmount,
  penaltyPercentage,
  joinedCount,
  estimatedJoinedCount,
  editLockAt,
  plannerLockAt,
  isEditLocked,
  planStatusStr,
  planStartDate,
  isFriendInvite = false,
}: InvitePreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  let displayEditLockAt = editLockAt;
  let displayPlannerLockAt = plannerLockAt;

  if (planStartDate) {
    const startDate = new Date(planStartDate);
    if (!editLockAt) {
      displayEditLockAt = new Date(startDate.getTime() - 24 * 60 * 60 * 1000).toISOString();
    }
    if (!plannerLockAt) {
      displayPlannerLockAt = new Date(startDate.getTime() - 12 * 60 * 60 * 1000).toISOString();
    }
  }

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
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsExpanded(!isExpanded)}
        style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: isExpanded ? 8 : 0 }}
      >
        <Text style={{ fontSize: 16, fontWeight: "700", color: COLORS.textPrimary }}>
          💌 Lời mời tham gia nhóm
        </Text>
        <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color={COLORS.textSecondary} />
      </TouchableOpacity>

      {isExpanded && (
        <View>
          <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
            <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Trưởng đoàn: </Text>
            {ownerName || "—"}
            {ownerEmail ? ` (${ownerEmail})` : ""}
          </Text>

          {/* Tiền cọc: bạn bè miễn cọc, external hiện số tiền */}
          <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
            <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Tiền cọc: </Text>
            {isFriendInvite ? (
              <Text style={{ fontWeight: "700", color: "#16A34A" }}>Miễn cọc (bạn bè) ✓</Text>
            ) : depositAmount != null && Number(depositAmount) > 0
              ? `${Math.round(Number(depositAmount)).toLocaleString("vi-VN")} ₫`
              : "Không có"}
          </Text>

          {/* Phạt rời nhóm: ẩn cho friend invite */}
          {!isFriendInvite && (
            <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
              <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Phạt rời nhóm: </Text>
              {penaltyPercentage != null && Number(penaltyPercentage) > 0
                ? `${Math.round(Number(penaltyPercentage))}%`
                : "Không phạt"}
            </Text>
          )}
          <Text style={{ marginTop: 6, color: "#1F2937", fontSize: 14 }}>
            <Text style={{ fontWeight: "600", color: COLORS.textPrimary }}>Thành viên: </Text>
            {joinedCount !== null ? `${joinedCount} người` : `~${estimatedJoinedCount} người`} dự kiến
          </Text>

          {/* Lock Schedule inside Invite Card */}
          <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "rgba(217, 119, 6, 0.15)" }}>
            <Text style={{ fontSize: 14, fontWeight: "700", color: "#B45309", marginBottom: 8 }}>
              ⏱ Lịch trình chốt đoàn
            </Text>
            
            {/* Khoá chỉnh sửa */}
            <View style={{ flexDirection: "row", alignItems: "center", marginBottom: 6 }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: isEditLocked ? "#16A34A" : "#F59E0B", marginRight: 6 }} />
              <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#78350F" }}>Khoá lộ trình: </Text>
                {isEditLocked ? (
                   <Text style={{ fontWeight: "700", color: "#16A34A" }}>Đã khoá ✓</Text>
                ) : displayEditLockAt ? (
                   <Text style={{ fontWeight: "800", color: "#D97706" }}>
                     Tự động lúc {new Date(displayEditLockAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                   </Text>
                ) : (
                   <Text style={{ fontWeight: "600", color: "#6B7280" }}>Tự động (24h trước khai hành)</Text>
                )}
              </Text>
            </View>

            {/* Chốt kế hoạch */}
            <View style={{ flexDirection: "row", alignItems: "center" }}>
              <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: planStatusStr === "locked" ? "#16A34A" : "#F59E0B", marginRight: 6 }} />
              <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
                <Text style={{ fontWeight: "600", color: "#78350F" }}>Chốt danh sách: </Text>
                {planStatusStr === "locked" ? (
                   <Text style={{ fontWeight: "700", color: "#16A34A" }}>Đã chốt ✓</Text>
                ) : displayPlannerLockAt ? (
                   <Text style={{ fontWeight: "800", color: "#D97706" }}>
                     Tự động lúc {new Date(displayPlannerLockAt).toLocaleString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                   </Text>
                ) : (
                   <Text style={{ fontWeight: "600", color: "#6B7280" }}>Tự động (12h trước khai hành)</Text>
                )}
              </Text>
            </View>
            
            <Text style={{ fontSize: 11, color: "#92400E", marginTop: 8, fontStyle: "italic" }}>
              *Bạn cần xác nhận tham gia trước hạn Chốt danh sách này.
            </Text>
          </View>
        </View>
      )}

      {/* Actions are rendered in PlanDetailScreen (below "Chat nhóm") */}
    </View>
  );
}
