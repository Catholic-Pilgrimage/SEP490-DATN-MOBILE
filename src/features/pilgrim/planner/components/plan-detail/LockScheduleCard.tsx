import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { ActivityIndicator, Text, TouchableOpacity, View } from "react-native";
import { BORDER_RADIUS } from "../../../../../constants/theme.constants";
import type { PlanEntity } from "../../../../../types/pilgrim/planner.types";

interface LockScheduleCardProps {
  plan: PlanEntity | null;
  planStatusStr: string;
  isPlanOwner: boolean;
  isLockScheduleExpanded: boolean;
  setIsLockScheduleExpanded: (val: boolean) => void;
  handleManualLockEdit: () => void;
  updatingPlanStatus: boolean;
  handleUpdatePlannerStatus: (status: "locked" | "ongoing" | "completed") => void;
  t: (key: string, opts?: any) => string;
}

export const LockScheduleCard: React.FC<LockScheduleCardProps> = ({
  plan,
  planStatusStr,
  isPlanOwner,
  isLockScheduleExpanded,
  setIsLockScheduleExpanded,
  handleManualLockEdit,
  updatingPlanStatus,
  handleUpdatePlannerStatus,
  t,
}) => {
  return (
    <View
      style={{
        marginBottom: 16,
        marginHorizontal: 20,
        backgroundColor: "#F0F4FF",
        borderRadius: BORDER_RADIUS.lg,
        padding: 14,
        borderWidth: 1,
        borderColor: "#D6E0F5",
      }}
    >
      <TouchableOpacity
        activeOpacity={0.7}
        onPress={() => setIsLockScheduleExpanded(!isLockScheduleExpanded)}
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: isLockScheduleExpanded ? 10 : 0,
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center" }}>
          <Ionicons
            name="hourglass-outline"
            size={18}
            color="#2563EB"
            style={{ marginRight: 8 }}
          />
          <Text
            style={{
              fontSize: 14,
              fontWeight: "700",
              color: "#1E40AF",
            }}
          >
            {t("planner.lockScheduleTitle")}
          </Text>
        </View>
        <Ionicons
          name={isLockScheduleExpanded ? "chevron-up" : "chevron-down"}
          size={20}
          color="#64748B"
        />
      </TouchableOpacity>

      {isLockScheduleExpanded && (
        <View>
          {/* Edit Lock */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor: plan?.is_locked ? "#16A34A" : "#F59E0B",
                marginRight: 8,
              }}
            />
            <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#4B5563" }}>{t("planner.editLockLabel")}: </Text>
              {plan?.is_locked ? (
                <Text style={{ fontWeight: "700", color: "#16A34A" }}>{t("planner.lockedSuccess")}</Text>
              ) : plan?.edit_lock_at ? (
                <Text style={{ fontWeight: "800", color: "#D97706" }}>
                  {new Date(plan.edit_lock_at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              ) : (
                <Text style={{ fontWeight: "600", color: "#6B7280" }}>{t("planner.autoLock24h")}</Text>
              )}
            </Text>
          </View>

          {/* Status Lock */}
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginBottom: 6,
            }}
          >
            <View
              style={{
                width: 8,
                height: 8,
                borderRadius: 4,
                backgroundColor:
                  planStatusStr === "locked" ? "#16A34A" : "#F59E0B",
                marginRight: 8,
              }}
            />
            <Text style={{ fontSize: 13, color: "#374151", flex: 1 }}>
              <Text style={{ fontWeight: "600", color: "#4B5563" }}>{t("planner.planLockLabel")}: </Text>
              {planStatusStr === "locked" ? (
                <Text style={{ fontWeight: "700", color: "#16A34A" }}>{t("planner.finalizedSuccess")}</Text>
              ) : (plan as any)?.planner_lock_at ? (
                <Text style={{ fontWeight: "800", color: "#D97706" }}>
                  {new Date((plan as any).planner_lock_at).toLocaleString("vi-VN", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              ) : (
                <Text style={{ fontWeight: "600", color: "#6B7280" }}>{t("planner.autoLock12h")}</Text>
              )}
            </Text>
          </View>

          {/* Hint */}
          {planStatusStr === "planning" && (
            <Text
              style={{
                fontSize: 11,
                color: "#6B7280",
                marginTop: 4,
                lineHeight: 16,
              }}
            >
              {t("planner.lockScheduleHint")}
            </Text>
          )}

          {/* CTA: Khoá lộ trình / Chốt kế hoạch — Gộp vào trong thẻ cho Owner */}
          {isPlanOwner && planStatusStr === "planning" && (
            <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#D6E0F5" }}>
              {!plan?.is_locked ? (
                <TouchableOpacity
                  onPress={handleManualLockEdit}
                  disabled={updatingPlanStatus}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#F59E0B", // Amber/Orange to indicate early action
                    paddingVertical: 12,
                    borderRadius: BORDER_RADIUS.lg,
                    opacity: updatingPlanStatus ? 0.7 : 1,
                  }}
                >
                  {updatingPlanStatus ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <Ionicons
                      name="shield-checkmark-outline"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    {t("planner.lockRouteCta")}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  onPress={() => handleUpdatePlannerStatus("locked")}
                  disabled={updatingPlanStatus}
                  activeOpacity={0.85}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    justifyContent: "center",
                    backgroundColor: "#2563EB", // Blue for final lock plan
                    paddingVertical: 12,
                    borderRadius: BORDER_RADIUS.lg,
                    opacity: updatingPlanStatus ? 0.7 : 1,
                  }}
                >
                  {updatingPlanStatus ? (
                    <ActivityIndicator
                      size="small"
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  ) : (
                    <Ionicons
                      name="flag-outline"
                      size={18}
                      color="#fff"
                      style={{ marginRight: 8 }}
                    />
                  )}
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>
                    {t("planner.lockPlanCta", { defaultValue: "Chốt kế hoạch" })}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};
