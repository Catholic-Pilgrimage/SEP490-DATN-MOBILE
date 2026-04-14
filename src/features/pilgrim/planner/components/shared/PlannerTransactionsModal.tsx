import { Ionicons } from "@expo/vector-icons";
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
          const parts: string[] = [];
          if (s.total_fund_locked != null) {
            parts.push(
              `${t("planner.txLocked")}: ${formatVnd(s.total_fund_locked)}`,
            );
          }
          if (s.total_penalty_pending != null && s.total_penalty_pending > 0) {
            parts.push(
              `${t("planner.txPenaltyPending")}: ${formatVnd(s.total_penalty_pending)}`,
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
          <TouchableOpacity onPress={onClose} hitSlop={12}>
            <Ionicons name="close" size={26} color={COLORS.textPrimary} />
          </TouchableOpacity>
        </View>

        {summaryLine ? (
          <Text style={styles.summary}>{summaryLine}</Text>
        ) : null}

        {loading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color={COLORS.primary} />
          </View>
        ) : (
          <FlatList
            data={rows}
            keyExtractor={(item, index) => item.id ?? `tx-${index}`}
            contentContainerStyle={styles.listContent}
            ListEmptyComponent={
              <Text style={styles.empty}>
                {t("planner.transactionsEmpty")}
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.card}>
                <View style={styles.cardTop}>
                  <Text style={styles.cardLabel} numberOfLines={2}>
                    {item.label || item.type || "—"}
                  </Text>
                  <Text
                    style={[
                      styles.cardAmount,
                      {
                        color:
                          (item.amount ?? 0) < 0
                            ? COLORS.danger
                            : COLORS.textPrimary,
                      },
                    ]}
                  >
                    {formatVnd(item.amount)}
                  </Text>
                </View>
                {item.status ? (
                  <Text style={styles.cardMeta}>{item.status}</Text>
                ) : null}
                {item.created_at ? (
                  <Text style={styles.cardMeta}>
                    {new Date(item.created_at).toLocaleString("vi-VN")}
                  </Text>
                ) : null}
                {item.wallet?.user?.full_name ? (
                  <Text style={styles.cardMeta} numberOfLines={1}>
                    {item.wallet.user.full_name}
                  </Text>
                ) : null}
              </View>
            )}
          />
        )}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: SPACING.md,
    paddingBottom: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  title: {
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  subtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  summary: {
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  listContent: {
    padding: SPACING.md,
    paddingBottom: SPACING.xl,
  },
  empty: {
    textAlign: "center",
    color: COLORS.textTertiary,
    marginTop: SPACING.xl,
  },
  card: {
    backgroundColor: COLORS.surface0,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.md,
    marginBottom: SPACING.sm,
    ...SHADOWS.small,
  },
  cardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  cardLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: COLORS.textPrimary,
  },
  cardAmount: {
    fontSize: 15,
    fontWeight: "700",
  },
  cardMeta: {
    marginTop: 4,
    fontSize: 12,
    color: COLORS.textSecondary,
  },
});
