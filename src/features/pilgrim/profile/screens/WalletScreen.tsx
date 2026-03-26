import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { COLORS, SPACING } from "../../../../constants/theme.constants";
import pilgrimWalletApi from "../../../../services/api/pilgrim/walletApi";
import {
  walletReferenceContextLabel,
  walletTransactionStatusLabel,
  walletTransactionTypeLabel,
} from "../../../../utils/walletTransactionLabels";
import type {
  WalletBankOption,
  WalletInfo,
  WalletTransaction,
} from "../../../../types/pilgrim/wallet.types";

const WalletScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [txListWarn, setTxListWarn] = useState<string | null>(null);

  const [withdrawOpen, setWithdrawOpen] = useState(false);
  const [banks, setBanks] = useState<WalletBankOption[]>([]);
  const [bankPickerOpen, setBankPickerOpen] = useState(false);
  const [banksLoading, setBanksLoading] = useState(false);
  const [selectedBank, setSelectedBank] = useState<WalletBankOption | null>(null);
  const [amountStr, setAmountStr] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadAll = useCallback(async () => {
    const [wRes, txRes] = await Promise.all([
      pilgrimWalletApi.getWalletInfo(),
      pilgrimWalletApi.getWalletTransactions({ page: 1, limit: 30 }),
    ]);

    let walletFailed = true;
    if (wRes.success && wRes.data) {
      setWallet(wRes.data);
      walletFailed = false;
    } else {
      setWallet(null);
    }

    let txFailed = true;
    if (
      txRes.success &&
      txRes.data &&
      Array.isArray(txRes.data.transactions)
    ) {
      setTransactions(txRes.data.transactions);
      txFailed = false;
    } else {
      setTransactions([]);
    }

    return {
      walletFailed,
      txFailed,
      walletMessage: wRes.message,
      txMessage: txRes.message,
    };
  }, []);

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setScreenError(null);
    setTxListWarn(null);
    try {
      const r = await loadAll();
      if (r.walletFailed) {
        setScreenError(
          r.walletMessage ||
            t("wallet.loadFailed", {
              defaultValue:
                "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
        );
      } else if (r.txFailed) {
        setTxListWarn(
          r.txMessage ||
            t("wallet.transactionsLoadFailed", {
              defaultValue:
                "Không tải được lịch sử giao dịch. Kéo xuống để làm mới.",
            }),
        );
      }
    } catch (e: unknown) {
      setScreenError(
        e instanceof Error
          ? e.message
          : t("wallet.loadFailed", {
              defaultValue:
                "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
      );
    } finally {
      setLoading(false);
    }
  }, [loadAll, t]);

  React.useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  const onRefresh = async () => {
    setRefreshing(true);
    setTxListWarn(null);
    try {
      const r = await loadAll();
      if (r.walletFailed) {
        setScreenError(
          r.walletMessage ||
            t("wallet.loadFailed", {
              defaultValue:
                "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
        );
      } else {
        setScreenError(null);
        if (r.txFailed) {
          setTxListWarn(
            r.txMessage ||
              t("wallet.transactionsLoadFailed", {
                defaultValue:
                  "Không tải được lịch sử giao dịch. Kéo xuống để làm mới.",
              }),
          );
        }
      }
    } catch (e: unknown) {
      setScreenError(
        e instanceof Error
          ? e.message
          : t("wallet.loadFailed", {
              defaultValue:
                "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
      );
    } finally {
      setRefreshing(false);
    }
  };

  const openWithdraw = async () => {
    setWithdrawOpen(true);
    setBanksLoading(true);
    try {
      const res = await pilgrimWalletApi.getWalletBanks();
      if (res.success && Array.isArray(res.data)) {
        setBanks(res.data);
      } else {
        setBanks([]);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: t("wallet.banksLoadFailed", { defaultValue: "Không tải được danh sách ngân hàng" }),
        });
      }
    } catch {
      setBanks([]);
    } finally {
      setBanksLoading(false);
    }
  };

  const submitWithdraw = async () => {
    const amount = parseFloat(amountStr.replace(/\s/g, "").replace(/,/g, ""));
    if (!selectedBank) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" }),
      });
      return;
    }
    if (!Number.isFinite(amount) || amount < 2000 || amount > 50_000_000) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("wallet.amountRangeInvalid", {
          defaultValue: "Số tiền từ 2.000 đến 50.000.000 ₫",
        }),
      });
      return;
    }
    const acc = accountNumber.trim();
    const name = accountName.trim();
    if (acc.length < 5 || acc.length > 30 || name.length < 2 || name.length > 100) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("wallet.accountFieldsInvalid", {
          defaultValue:
            "Số TK 5–30 ký tự; tên chủ TK 2–100 ký tự (theo hệ thống).",
        }),
      });
      return;
    }
    try {
      setSubmitting(true);
      const res = await pilgrimWalletApi.requestWalletWithdrawal({
        amount,
        account_number: acc,
        account_name: name,
        bank_code: selectedBank.code,
      });
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2: res.message || t("wallet.withdrawSubmitted", { defaultValue: "Đã gửi yêu cầu rút tiền" }),
        });
        setWithdrawOpen(false);
        setAmountStr("");
        setAccountNumber("");
        setAccountName("");
        setSelectedBank(null);
        await loadAll();
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: res.message || t("wallet.withdrawFailed", { defaultValue: "Rút tiền thất bại" }),
        });
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          e instanceof Error
            ? e.message
            : t("wallet.withdrawFailed", { defaultValue: "Rút tiền thất bại" }),
      });
    } finally {
      setSubmitting(false);
    }
  };

  const fmt = (n: number) =>
    `${(Number.isFinite(n) ? n : 0).toLocaleString("vi-VN")} ₫`;

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      <StatusBar barStyle="dark-content" />
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>
          {t("wallet.title", { defaultValue: "Ví của tôi" })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : screenError && !wallet ? (
        <View style={[styles.centered, styles.errorPad]}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={COLORS.textTertiary}
          />
          <Text style={styles.errorTitle}>
            {t("wallet.loadFailedTitle", {
              defaultValue: "Không tải được ví",
            })}
          </Text>
          <Text style={styles.errorSub}>{screenError}</Text>
          <TouchableOpacity
            style={styles.retryBtn}
            onPress={() => void bootstrap()}
          >
            <Text style={styles.retryBtnText}>
              {t("wallet.retry", { defaultValue: "Thử lại" })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{
            padding: SPACING.lg,
            paddingBottom: insets.bottom + 24,
          }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.card}>
            <Text style={styles.cardLabel}>
              {t("wallet.available", { defaultValue: "Khả dụng" })}
            </Text>
            <Text style={styles.balance}>{fmt(wallet?.balance ?? 0)}</Text>
            <View style={styles.rowMeta}>
              <Text style={styles.metaText}>
                {t("wallet.locked", { defaultValue: "Đang giữ" })}:{" "}
                {fmt(wallet?.locked_balance ?? 0)}
              </Text>
              <Text style={styles.metaText}>
                {t("wallet.total", { defaultValue: "Tổng" })}:{" "}
                {fmt(wallet?.total_balance ?? 0)}
              </Text>
            </View>
            <TouchableOpacity style={styles.withdrawBtn} onPress={openWithdraw}>
              <Ionicons name="arrow-down-circle-outline" size={22} color="#fff" />
              <Text style={styles.withdrawBtnText}>
                {t("wallet.withdraw", { defaultValue: "Rút tiền" })}
              </Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.topUpHint}>
            {t("wallet.topUpHint", {
              defaultValue:
                "Số dư tăng khi có hoàn tiền hoặc giao dịch liên quan đoàn. Đặt cọc kế hoạch qua liên kết trong chi tiết kế hoạch — không có nút nạp ví riêng.",
            })}
          </Text>

          <Text style={styles.sectionTitle}>
            {t("wallet.history", { defaultValue: "Lịch sử giao dịch" })}
          </Text>
          {txListWarn ? (
            <Text style={styles.txWarn}>{txListWarn}</Text>
          ) : null}
          {transactions.length === 0 && !txListWarn ? (
            <Text style={styles.empty}>
              {t("wallet.noTransactions", { defaultValue: "Chưa có giao dịch" })}
            </Text>
          ) : (
            transactions.map((tx) => {
              const refHint = walletReferenceContextLabel(
                tx.reference_type,
                t,
              );
              const sub =
                (tx.description && tx.description.trim()) || refHint || "";
              return (
                <View key={tx.id} style={styles.txRow}>
                  <Text style={styles.txType}>
                    {walletTransactionTypeLabel(tx.type, t)}
                  </Text>
                  {sub ? (
                    <Text style={styles.txDesc} numberOfLines={2}>
                      {sub}
                    </Text>
                  ) : null}
                  <Text style={styles.txAmount}>{fmt(tx.amount)}</Text>
                  <Text style={styles.txStatus}>
                    {[
                      walletTransactionStatusLabel(tx.status, t),
                      tx.created_at
                        ? new Date(tx.created_at).toLocaleString("vi-VN")
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" · ")}
                  </Text>
                </View>
              );
            })
          )}
        </ScrollView>
      )}

      <Modal
        visible={withdrawOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWithdrawOpen(false)}
      >
        <View style={[styles.modalRoot, { paddingTop: insets.top }]}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setWithdrawOpen(false)}>
              <Text style={styles.modalClose}>{t("common.cancel")}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {t("wallet.withdraw", { defaultValue: "Rút tiền" })}
            </Text>
            <View style={{ width: 56 }} />
          </View>
          <ScrollView
            contentContainerStyle={{ padding: SPACING.lg, paddingBottom: insets.bottom + 24 }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>{t("wallet.amount", { defaultValue: "Số tiền (VND)" })}</Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="20000"
              value={amountStr}
              onChangeText={setAmountStr}
            />
            <Text style={styles.inputLabel}>{t("wallet.bank", { defaultValue: "Ngân hàng" })}</Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setBankPickerOpen(true)}
            >
              <Text style={{ color: selectedBank ? COLORS.textPrimary : COLORS.textTertiary }}>
                {selectedBank
                  ? `${selectedBank.short_name || selectedBank.name} (${selectedBank.code})`
                  : t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" })}
              </Text>
            </TouchableOpacity>
            <Text style={styles.inputLabel}>
              {t("wallet.accountNumber", { defaultValue: "Số tài khoản" })}
            </Text>
            <TextInput
              style={styles.input}
              value={accountNumber}
              onChangeText={setAccountNumber}
              autoCapitalize="none"
              maxLength={30}
            />
            <Text style={styles.inputLabel}>
              {t("wallet.accountName", { defaultValue: "Tên chủ tài khoản" })}
            </Text>
            <TextInput
              style={styles.input}
              value={accountName}
              onChangeText={setAccountName}
              maxLength={100}
            />
            <TouchableOpacity
              style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
              disabled={submitting || banksLoading}
              onPress={() => void submitWithdraw()}
            >
              {submitting ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitBtnText}>{t("common.confirm")}</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </View>
      </Modal>

      <Modal visible={bankPickerOpen} animationType="fade" transparent>
        <TouchableOpacity
          style={styles.pickerOverlay}
          activeOpacity={1}
          onPress={() => setBankPickerOpen(false)}
        >
          <View style={styles.pickerSheet}>
            <Text style={styles.pickerTitle}>
              {t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" })}
            </Text>
            <FlatList
              data={banks}
              keyExtractor={(b) => b.code + b.bin}
              style={{ maxHeight: 400 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={styles.bankRow}
                  onPress={() => {
                    setSelectedBank(item);
                    setBankPickerOpen(false);
                  }}
                >
                  <Text style={styles.bankName}>{item.name}</Text>
                  <Text style={styles.bankCode}>{item.code}</Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: "center" },
  headerTitle: { fontSize: 18, fontWeight: "700", color: COLORS.textPrimary },
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
  errorPad: { paddingHorizontal: SPACING.xl },
  errorTitle: {
    marginTop: SPACING.md,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
    textAlign: "center",
  },
  errorSub: {
    marginTop: SPACING.sm,
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: "center",
  },
  retryBtn: {
    marginTop: SPACING.lg,
    backgroundColor: COLORS.accent,
    paddingVertical: 12,
    paddingHorizontal: SPACING.xl,
    borderRadius: 12,
  },
  retryBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  card: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: SPACING.lg,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginBottom: SPACING.lg,
  },
  cardLabel: { fontSize: 13, color: COLORS.textSecondary, marginBottom: 4 },
  balance: { fontSize: 28, fontWeight: "800", color: COLORS.textPrimary },
  rowMeta: { marginTop: 12, gap: 4 },
  metaText: { fontSize: 13, color: COLORS.textSecondary },
  withdrawBtn: {
    marginTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
  },
  withdrawBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  topUpHint: {
    fontSize: 13,
    lineHeight: 20,
    color: COLORS.textSecondary,
    marginBottom: SPACING.lg,
    paddingHorizontal: 2,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 12,
  },
  empty: { color: COLORS.textSecondary, fontSize: 14 },
  txWarn: {
    fontSize: 13,
    color: COLORS.accent,
    marginBottom: SPACING.sm,
  },
  txRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  txType: { fontWeight: "600", color: COLORS.textPrimary },
  txDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  txAmount: { fontSize: 15, marginTop: 4, color: COLORS.accent },
  txStatus: { fontSize: 12, color: COLORS.textTertiary, marginTop: 4 },
  modalRoot: { flex: 1, backgroundColor: COLORS.background },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.md,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  modalTitle: { fontSize: 17, fontWeight: "700" },
  modalClose: { fontSize: 16, color: COLORS.accent },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    justifyContent: "center",
  },
  submitBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: SPACING.lg,
    maxHeight: "70%",
  },
  pickerTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },
  bankRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bankName: { fontSize: 15, color: COLORS.textPrimary },
  bankCode: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
});

export default WalletScreen;
