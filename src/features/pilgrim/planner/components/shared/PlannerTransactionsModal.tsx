import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import {
  BORDER_RADIUS,
  COLORS,
  SHADOWS,
  SPACING,
} from "../../../../../constants/theme.constants";
import pilgrimPlannerApi from "../../../../../services/api/pilgrim/plannerApi";
import type { PlannerTransactionEntry } from "../../../../../types/pilgrim/planner.types";
import { getApiErrorMessage } from "../../../../../utils/apiError";
import { plannerTransactionLabel, plannerTransactionStatus } from "../../../../../utils/walletTransactionLabels";

export interface PlannerTransactionsModalProps {
  visible: boolean;
  onClose: () => void;
  planId: string;
  planName?: string;
}

function formatVnd(n: number | undefined) {
  if (n == null || Number.isNaN(n)) return "—";
  return `${Math.round(n).toLocaleString("vi-VN")} ₫`;
}

export const PlannerTransactionsModal: React.FC<
  PlannerTransactionsModalProps
> = ({ visible, onClose, planId, planName }) => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<PlannerTransactionEntry[]>([]);
  const [summaryLine, setSummaryLine] = useState<string | null>(null);
  const [summary, setSummary] = useState<{
    total_fund_locked?: number;
    total_penalty_pending?: number;
    total_penalty_received?: number;
    total_refunded?: number;
  } | null>(null);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const res = await pilgrimPlannerApi.getPlannerTransactions(planId, {
        page: 1,
        limit: 50,
      });
      if (res.success && res.data) {
        const txs = res.data.transactions ?? [];
        setRows(txs);
        const s = res.data.summary;
        if (s) {
          setSummary(s);
          const parts: string[] = [];
          if (s.total_fund_locked != null) {
            parts.push(
              `${t("planner.txLocked", { defaultValue: "Cam kết" })}: ${formatVnd(s.total_fund_locked)}`,
            );
          }
          if (s.total_penalty_pending != null) {
            parts.push(
              `${t("planner.txPenaltyPending", { defaultValue: "Phạt chờ" })}: ${formatVnd(s.total_penalty_pending)}`,
            );
          }
          if (s.total_penalty_received != null) {
            parts.push(
              `${t("planner.txPenaltyReceived", { defaultValue: "Phạt nhận" })}: ${formatVnd(s.total_penalty_received)}`,
            );
          }
          if (s.total_refunded != null) {
            parts.push(
              `${t("planner.txRefunded", { defaultValue: "Đã hoàn" })}: ${formatVnd(s.total_refunded)}`,
            );
          }
          setSummaryLine(parts.length ? parts.join(" · ") : null);
        } else {
          setSummaryLine(null);
        }
      } else {
        setRows([]);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: res.message || t("planner.transactionsLoadFailed"),
        });
      }
    } catch (e) {
      setRows([]);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: getApiErrorMessage(
          e,
          t("planner.transactionsLoadFailed", {
            defaultValue: "Không tải được sao kê.",
          }),
        ),
      });
    } finally {
      setLoading(false);
    }
  }, [planId, t]);

  useEffect(() => {
    if (!visible || !planId) return;
    void load();
  }, [visible, planId, load]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={[styles.root, { paddingTop: insets.top }]}>
        {/* Header with gradient */}
        <LinearGradient
          colors={["#8B6F47", "#C4A882", "#D4AF7A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.headerGradient}
        >
          <View style={styles.header}>
            <View style={{ flex: 1 }}>
              <Text style={styles.title}>
                {t("planner.fundStatementTitle")}
              </Text>
              {planName ? (
                <Text style={styles.subtitle} numberOfLines={1}>
                  {planName}
                </Text>
              ) : null}
            </View>
            <TouchableOpacity onPress={onClose} hitSlop={12} style={styles.closeButton}>
              <Ionicons name="close" size={26} color="#FFFFFF" />
            </TouchableOpacity>
          </View>

          {/* Summary Grid */}
          {summary ? (
            <View style={styles.summaryGrid}>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryItem, { backgroundColor: "rgba(217, 119, 6, 0.25)" }]}>
                  <Ionicons name="lock-closed" size={16} color="#FFFFFF" />
                  <View style={styles.summaryItemText}>
                    <Text style={styles.summaryLabel}>
                      {t("planner.txLocked", { defaultValue: "Cam kết" })}
                    </Text>
                    <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>
                      {formatVnd(summary.total_fund_locked ?? 0)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: "rgba(245, 158, 11, 0.25)" }]}>
                  <Ionicons name="time" size={16} color="#FFFFFF" />
                  <View style={styles.summaryItemText}>
                    <Text style={styles.summaryLabel}>
                      {t("planner.txPenaltyPending", { defaultValue: "Phạt chờ" })}
                    </Text>
                    <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>
                      {formatVnd(summary.total_penalty_pending ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>
              <View style={styles.summaryRow}>
                <View style={[styles.summaryItem, { backgroundColor: "rgba(5, 150, 105, 0.25)" }]}>
                  <Ionicons name="add-circle" size={16} color="#FFFFFF" />
                  <View style={styles.summaryItemText}>
                    <Text style={styles.summaryLabel}>
                      {t("planner.txPenaltyReceived", { defaultValue: "Phạt nhận" })}
                    </Text>
                    <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>
                      {formatVnd(summary.total_penalty_received ?? 0)}
                    </Text>
                  </View>
                </View>
                <View style={[styles.summaryItem, { backgroundColor: "rgba(37, 99, 235, 0.25)" }]}>
                  <Ionicons name="refresh-circle" size={16} color="#FFFFFF" />
                  <View style={styles.summaryItemText}>
                    <Text style={styles.summaryLabel}>
                      {t("planner.txRefunded", { defaultValue: "Đã hoàn" })}
                    </Text>
                    <Text style={[styles.summaryValue, { color: "#FFFFFF" }]}>
                      {formatVnd(summary.total_refunded ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          ) : null}
        </LinearGradient>

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#B8860B" />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, index) => item.id ?? `tx-${index}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="receipt-outline" size={64} color={COLORS.textTertiary} />
                <Text style={styles.empty}>
                  {t("planner.transactionsEmpty")}
                </Text>
              </View>
            }
            renderItem={({ item }) => {
              // Determine if this is a debit (money out) or credit (money in) transaction
              const isDebit = 
                item.type === "penalty_applied" || 
                item.type === "escrow_lock" ||
                (item.amount ?? 0) < 0;
              const isCredit = 
                item.type === "penalty_received" || 
                item.type === "escrow_refund" ||
                item.type === "penalty_refunded" ||
                ((item.amount ?? 0) > 0 && !isDebit);
              
              // Determine icon based on transaction type
              let iconName = "swap-horizontal";
              let iconColor = "#9C6B12";
              let iconBg = "rgba(201, 165, 114, 0.1)";
              
              if (item.type === "escrow_lock") {
                iconName = "lock-closed";
                iconColor = "#D97706";
                iconBg = "rgba(217, 119, 6, 0.08)";
              } else if (item.type === "escrow_refund") {
                iconName = "lock-open";
                iconColor = "#059669";
                iconBg = "rgba(5, 150, 105, 0.08)";
              } else if (item.type === "penalty_applied") {
                iconName = "remove-circle";
                iconColor = "#DC2626";
                iconBg = "rgba(220, 38, 38, 0.08)";
              } else if (item.type === "penalty_received") {
                iconName = "add-circle";
                iconColor = "#059669";
                iconBg = "rgba(5, 150, 105, 0.08)";
              } else if (item.type === "penalty_refunded") {
                iconName = "refresh-circle";
                iconColor = "#2563EB";
                iconBg = "rgba(37, 99, 235, 0.08)";
              } else if (isDebit) {
                iconName = "arrow-down-circle";
                iconColor = "#DC2626";
                iconBg = "rgba(220, 38, 38, 0.08)";
              } else if (isCredit) {
                iconName = "arrow-up-circle";
                iconColor = "#059669";
                iconBg = "rgba(5, 150, 105, 0.08)";
              }
              
              // Display amount with proper sign
              const displayAmount = isDebit ? -(Math.abs(item.amount ?? 0)) : Math.abs(item.amount ?? 0);
              
              return (
                <View style={styles.card}>
                  <LinearGradient
                    colors={
                      isDebit
                        ? ["#FFF8F5", "#FFF9EE"]
                        : isCredit
                          ? ["#F5FFF8", "#FFF9EE"]
                          : ["#FFFCF7", "#FFF9EE"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.cardGradient}
                  >
                    <View style={styles.cardContent}>
                      <View style={styles.cardLeft}>
                        <View
                          style={[
                            styles.iconContainer,
                            { backgroundColor: iconBg },
                          ]}
                        >
                          <Ionicons
                            name={iconName as any}
                            size={24}
                            color={iconColor}
                          />
                        </View>
                        <View style={styles.cardInfo}>
                          <View style={styles.cardTop}>
                            <Text style={styles.cardLabel} numberOfLines={2}>
                              {plannerTransactionLabel(item.label || item.type, t)}
                            </Text>
                            <Text
                              style={[
                                styles.cardAmount,
                                {
                                  color: isDebit
                                    ? "#DC2626"
                                    : isCredit
                                      ? "#059669"
                                      : COLORS.textPrimary,
                                },
                              ]}
                            >
                              {displayAmount < 0 ? "" : "+"}
                              {formatVnd(displayAmount)}
                            </Text>
                          </View>
                          {item.status ? (
                            <View style={styles.statusBadge}>
                              <View
                                style={[
                                  styles.statusDot,
                                  {
                                    backgroundColor:
                                      item.status === "completed"
                                        ? "#10B981"
                                        : item.status === "pending"
                                          ? "#F59E0B"
                                          : "#6B7280",
                                  },
                                ]}
                              />
                              <Text style={styles.statusText}>
                                {plannerTransactionStatus(item.status, t)}
                              </Text>
                            </View>
                          ) : null}
                          <View style={styles.metaRow}>
                            {item.created_at ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="time-outline" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.cardMeta}>
                                  {new Date(item.created_at).toLocaleString("vi-VN", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                    day: "2-digit",
                                    month: "2-digit",
                                    year: "numeric",
                                  })}
                                </Text>
                              </View>
                            ) : null}
                            {item.wallet?.user?.full_name ? (
                              <View style={styles.metaItem}>
                                <Ionicons name="person-outline" size={12} color={COLORS.textSecondary} />
                                <Text style={styles.cardMeta} numberOfLines={1}>
                                  {item.wallet.user.full_name}
                                </Text>
                              </View>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    </View>
                  </LinearGradient>
                </View>
              );
            }}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { 
    flex: 1, 
    backgroundColor: "#FFF9EE",
  },
  headerGradient: {
    paddingBottom: SPACING.md,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  closeButton: {
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    borderRadius: 20,
    padding: 4,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FFFFFF",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: "rgba(255, 255, 255, 0.9)",
  },
  summaryGrid: {
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    gap: SPACING.xs,
  },
  summaryRow: {
    flexDirection: "row",
    gap: SPACING.xs,
  },
  summaryItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: SPACING.xs,
    padding: SPACING.sm,
    borderRadius: BORDER_RADIUS.md,
  },
  summaryItemText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "rgba(255, 255, 255, 0.8)",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryValue: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
  centered: { 
    flex: 1, 
    justifyContent: "center", 
    alignItems: "center",
  },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  emptyContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: SPACING.xl * 2,
  },
  empty: {
    textAlign: "center",
    color: COLORS.textTertiary,
    fontSize: 15,
    marginTop: SPACING.md,
  },
  card: {
    marginBottom: SPACING.md,
    borderRadius: BORDER_RADIUS.lg,
    overflow: "hidden",
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.2)",
    ...SHADOWS.small,
  },
  cardGradient: {
    borderRadius: BORDER_RADIUS.lg,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "flex-start",
    padding: SPACING.md,
    gap: SPACING.sm,
  },
  cardLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  cardInfo: {
    flex: 1,
    gap: 4,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
    marginBottom: 4,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
    lineHeight: 20,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    alignSelf: "flex-start",
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "500",
    color: COLORS.textSecondary,
  },
  metaRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: SPACING.sm,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  cardMeta: {
    fontSize: 12,
    color: COLORS.textSecondary,
  },
  cardAmount: {
    fontSize: 16,
    fontWeight: "700",
    lineHeight: 20,
  },
});
