import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  FlatList,
  Image,
  ImageBackground,
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
import {
  SafeAreaView,
  useSafeAreaInsets,
} from "react-native-safe-area-context";
import Toast from "react-native-toast-message";
import { COLORS, SPACING } from "../../../../constants/theme.constants";
import {
  getWalletBanks,
  getWalletInfo,
  getWalletTransactionById,
  getWalletTransactions,
  requestWalletWithdrawal,
} from "../../../../services/api/pilgrim/walletApi";
import type {
  WalletBankOption,
  WalletInfo,
  WalletTransaction,
} from "../../../../types/pilgrim/wallet.types";
import {
  walletReferenceContextLabel,
  walletTransactionStatusLabel,
  walletTransactionTypeLabel,
} from "../../../../utils/walletTransactionLabels";

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
  const [selectedBank, setSelectedBank] = useState<WalletBankOption | null>(
    null,
  );
  const [amountStr, setAmountStr] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [accountName, setAccountName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);

  const loadAll = useCallback(async () => {
    const [wRes, txRes] = await Promise.all([
      getWalletInfo(),
      getWalletTransactions({ page: 1, limit: 30 }),
    ]);

    let walletFailed = true;
    if (wRes.success && wRes.data) {
      setWallet(wRes.data);
      walletFailed = false;
    } else {
      setWallet(null);
    }

    let txFailed = true;
    if (txRes.success && txRes.data && Array.isArray(txRes.data.transactions)) {
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
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
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
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
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
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
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
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
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
      const res = await getWalletBanks();
      if (res.success && Array.isArray(res.data)) {
        setBanks(res.data);
      } else {
        setBanks([]);
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2: t("wallet.banksLoadFailed", {
            defaultValue: "Không tải được danh sách ngân hàng",
          }),
        });
      }
    } catch {
      setBanks([]);
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2: t("wallet.banksLoadFailed", {
          defaultValue: "Không tải được danh sách ngân hàng",
        }),
      });
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
    if (
      acc.length < 5 ||
      acc.length > 30 ||
      name.length < 2 ||
      name.length > 100
    ) {
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
      const res = await requestWalletWithdrawal({
        amount,
        account_number: acc,
        account_name: name,
        bank_code: selectedBank.bin,
      });
      if (res.success) {
        Toast.show({
          type: "success",
          text1: t("common.success"),
          text2:
            res.message ||
            t("wallet.withdrawSubmitted", {
              defaultValue: "Đã gửi yêu cầu rút tiền",
            }),
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
          text2:
            res.message ||
            t("wallet.withdrawFailed", { defaultValue: "Rút tiền thất bại" }),
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

  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString("vi-VN") : "—";

  const getStatusTone = (status?: string) => {
    switch (status) {
      case "completed":
        return {
          bg: "rgba(82, 196, 26, 0.12)",
          text: "#2E7D32",
        };
      case "failed":
        return {
          bg: "rgba(220, 76, 76, 0.12)",
          text: "#C62828",
        };
      case "pending":
        return {
          bg: "rgba(230, 126, 34, 0.12)",
          text: "#B85C00",
        };
      case "cancelled":
        return {
          bg: "rgba(137, 127, 97, 0.12)",
          text: COLORS.textSecondary,
        };
      default:
        return {
          bg: "rgba(26, 40, 69, 0.08)",
          text: COLORS.primary,
        };
    }
  };

  const openTransactionDetail = async (tx: WalletTransaction) => {
    setSelectedTransaction(tx);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      if (!banks.length) {
        const bankRes = await getWalletBanks();
        if (bankRes.success && Array.isArray(bankRes.data)) {
          setBanks(bankRes.data);
        }
      }
      const res = await getWalletTransactionById(tx.id);
      if (res.success && res.data) {
        setSelectedTransaction(res.data);
      } else {
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("wallet.transactionsLoadFailed", {
              defaultValue: "Không tải được chi tiết giao dịch",
            }),
        });
      }
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          e instanceof Error
            ? e.message
            : t("wallet.transactionsLoadFailed", {
                defaultValue: "Không tải được chi tiết giao dịch",
              }),
      });
    } finally {
      setDetailLoading(false);
    }
  };

  const findBankMeta = (bankCode?: string) => {
    const normalized = bankCode?.trim();
    if (!normalized) {
      return null;
    }

    return (
      banks.find(
        (bank) =>
          bank.bin === normalized ||
          bank.code === normalized ||
          bank.short_name === normalized,
      ) || null
    );
  };

  const detailBank = findBankMeta(selectedTransaction?.bank_info?.bank_code);

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[styles.root, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />
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
              <Ionicons
                name="arrow-down-circle-outline"
                size={22}
                color="#fff"
              />
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
          {txListWarn ? <Text style={styles.txWarn}>{txListWarn}</Text> : null}
          {transactions.length === 0 && !txListWarn ? (
            <Text style={styles.empty}>
              {t("wallet.noTransactions", {
                defaultValue: "Chưa có giao dịch",
              })}
            </Text>
          ) : (
            transactions.map((tx) => {
              const refHint = walletReferenceContextLabel(tx.reference_type, t);
              const sub =
                (tx.description && tx.description.trim()) || refHint || "";
              const tone = getStatusTone(tx.status);
              return (
                <TouchableOpacity
                  key={tx.id}
                  style={styles.txRow}
                  activeOpacity={0.85}
                  onPress={() => void openTransactionDetail(tx)}
                >
                  <View style={styles.txHeaderRow}>
                    <Text style={styles.txType}>
                      {walletTransactionTypeLabel(tx.type, t)}
                    </Text>
                    <View
                      style={[
                        styles.txStatusBadge,
                        { backgroundColor: tone.bg },
                      ]}
                    >
                      <Text
                        style={[styles.txStatusBadgeText, { color: tone.text }]}
                      >
                        {walletTransactionStatusLabel(tx.status, t)}
                      </Text>
                    </View>
                  </View>
                  {tx.code ? (
                    <Text style={styles.txCode}>Mã: {tx.code}</Text>
                  ) : null}
                  {sub ? (
                    <Text style={styles.txDesc} numberOfLines={2}>
                      {sub}
                    </Text>
                  ) : null}
                  <Text style={styles.txAmount}>{fmt(tx.amount)}</Text>
                  <View style={styles.txFooterRow}>
                    <Text style={styles.txStatus}>
                      {formatDateTime(tx.created_at)}
                    </Text>
                    <Ionicons
                      name="chevron-forward"
                      size={16}
                      color={COLORS.textTertiary}
                    />
                  </View>
                </TouchableOpacity>
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
        <ImageBackground
          source={require("../../../../../assets/images/profile-bg.jpg")}
          style={[styles.modalRoot, { paddingTop: insets.top }]}
          resizeMode="cover"
          fadeDuration={0}
        >
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
            contentContainerStyle={{
              padding: SPACING.lg,
              paddingBottom: insets.bottom + 24,
            }}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.inputLabel}>
              {t("wallet.amount", { defaultValue: "Số tiền (VND)" })}
            </Text>
            <TextInput
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="20000"
              value={amountStr}
              onChangeText={setAmountStr}
            />
            <Text style={styles.inputLabel}>
              {t("wallet.bank", { defaultValue: "Ngân hàng" })}
            </Text>
            <TouchableOpacity
              style={styles.input}
              onPress={() => setBankPickerOpen(true)}
            >
              {selectedBank ? (
                <View style={styles.selectedBankRow}>
                  {selectedBank.logo ? (
                    <Image
                      source={{ uri: selectedBank.logo }}
                      style={styles.bankLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.bankLogoFallback}>
                      <Text style={styles.bankLogoFallbackText}>
                        {(selectedBank.short_name || selectedBank.code || "B")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.selectedBankInfo}>
                    <Text style={styles.selectedBankName} numberOfLines={1}>
                      {selectedBank.short_name || selectedBank.name}
                    </Text>
                    <Text style={styles.selectedBankCode}>
                      {selectedBank.code}
                    </Text>
                  </View>
                </View>
              ) : (
                <Text style={{ color: COLORS.textTertiary }}>
                  {t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" })}
                </Text>
              )}
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
        </ImageBackground>
      </Modal>

      <Modal
        visible={detailOpen}
        animationType="fade"
        transparent
        onRequestClose={() => setDetailOpen(false)}
      >
        <TouchableOpacity
          style={styles.detailOverlay}
          activeOpacity={1}
          onPress={() => setDetailOpen(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[
              styles.detailSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
            ]}
          >
            <View style={styles.detailHandle} />
            <View style={styles.detailSheetHeader}>
              <Text style={styles.detailSheetTitle}>
                {t("wallet.transactionDetail", {
                  defaultValue: "Chi tiết giao dịch",
                })}
              </Text>
              <TouchableOpacity
                style={styles.detailCloseBtn}
                onPress={() => setDetailOpen(false)}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
              {/*
              <Text style={styles.modalClose}>{t("common.close", { defaultValue: "Đóng" })}</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>
              {t("wallet.transactionDetail", { defaultValue: "Chi tiết giao dịch" })}
            </Text>
            <View style={{ width: 56 }} />
              */}
            </View>
            <ScrollView
              contentContainerStyle={styles.detailScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {detailLoading && !selectedTransaction ? (
                <View style={styles.centered}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
              ) : selectedTransaction ? (
                <>
                  <View style={styles.detailSummaryCard}>
                    <View style={styles.detailSummaryHeader}>
                      <View style={styles.detailSummaryTextWrap}>
                        <Text style={styles.detailTitle}>
                          {walletTransactionTypeLabel(
                            selectedTransaction.type,
                            t,
                          )}
                        </Text>
                        <Text style={styles.detailCodeChip}>
                          {selectedTransaction.code || selectedTransaction.id}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.txStatusBadge,
                          {
                            backgroundColor: getStatusTone(
                              selectedTransaction.status,
                            ).bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.txStatusBadgeText,
                            {
                              color: getStatusTone(selectedTransaction.status)
                                .text,
                            },
                          ]}
                        >
                          {walletTransactionStatusLabel(
                            selectedTransaction.status,
                            t,
                          )}
                        </Text>
                      </View>
                    </View>
                    <Text style={styles.detailAmount}>
                      {fmt(selectedTransaction.amount)}
                    </Text>
                    <Text style={styles.detailMetaLine}>
                      {formatDateTime(selectedTransaction.created_at)}
                    </Text>
                  </View>

                  <View style={styles.detailSectionCard}>
                    <Text style={styles.detailSectionTitle}>
                      Thông tin giao dịch
                    </Text>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Mã giao dịch</Text>
                      <Text style={styles.detailRowValue}>
                        {selectedTransaction.code || selectedTransaction.id}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Loại tham chiếu</Text>
                      <Text style={styles.detailRowValue}>
                        {selectedTransaction.reference_type || "—"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Mã tham chiếu</Text>
                      <Text style={styles.detailRowValue}>
                        {selectedTransaction.reference_id || "—"}
                      </Text>
                    </View>
                    <View style={styles.detailRow}>
                      <Text style={styles.detailRowLabel}>Tạo lúc</Text>
                      <Text style={styles.detailRowValue}>
                        {formatDateTime(selectedTransaction.created_at)}
                      </Text>
                    </View>
                    <View style={[styles.detailRow, styles.detailRowLast]}>
                      <Text style={styles.detailRowLabel}>Cập nhật</Text>
                      <Text style={styles.detailRowValue}>
                        {formatDateTime(selectedTransaction.updated_at)}
                      </Text>
                    </View>
                  </View>

                  {selectedTransaction.description ? (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>Mô tả</Text>
                      <View style={styles.detailDescriptionBox}>
                        <Text style={styles.detailDescriptionText}>
                          {selectedTransaction.description}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {selectedTransaction.bank_info ? (
                    <View style={styles.detailSectionCard}>
                      <Text style={styles.detailSectionTitle}>
                        Thông tin nhận tiền
                      </Text>
                      {detailBank ? (
                        <View style={styles.detailBankIdentity}>
                          {detailBank.logo ? (
                            <Image
                              source={{ uri: detailBank.logo }}
                              style={styles.bankLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={styles.bankLogoFallback}>
                              <Text style={styles.bankLogoFallbackText}>
                                {(
                                  detailBank.short_name ||
                                  detailBank.code ||
                                  "B"
                                )
                                  .slice(0, 2)
                                  .toUpperCase()}
                              </Text>
                            </View>
                          )}
                          <View style={styles.detailBankMeta}>
                            <Text style={styles.detailBankName}>
                              {detailBank.short_name || detailBank.name}
                            </Text>
                            <Text style={styles.detailBankCode}>
                              {[
                                detailBank.code,
                                selectedTransaction.bank_info.bank_code,
                              ]
                                .filter(Boolean)
                                .join(" • ")}
                            </Text>
                          </View>
                        </View>
                      ) : null}
                      {/*
                    <Text style={styles.detailSectionTitle}>
                      Thông tin nhận tiền
                    </Text>
                    */}
                      {!detailBank ? (
                        <View style={styles.detailRow}>
                          <Text style={styles.detailRowLabel}>
                            Mã ngân hàng
                          </Text>
                          <Text style={styles.detailRowValue}>
                            {selectedTransaction.bank_info.bank_code || "—"}
                          </Text>
                        </View>
                      ) : null}
                      <View style={styles.detailRow}>
                        <Text style={styles.detailRowLabel}>Số tài khoản</Text>
                        <Text style={styles.detailRowValue}>
                          {selectedTransaction.bank_info.account_number || "—"}
                        </Text>
                      </View>
                      <View style={[styles.detailRow, styles.detailRowLast]}>
                        <Text style={styles.detailRowLabel}>Chủ tài khoản</Text>
                        <Text style={styles.detailRowValue}>
                          {selectedTransaction.bank_info.account_name || "—"}
                        </Text>
                      </View>
                    </View>
                  ) : null}
                </>
              ) : null}
              {/*
            {detailLoading && !selectedTransaction ? (
              <View style={styles.centered}>
                <ActivityIndicator size="large" color={COLORS.accent} />
              </View>
            ) : selectedTransaction ? (
              <View style={styles.detailCard}>
                <View style={styles.detailTopRow}>
                  <Text style={styles.detailTitle}>
                    {walletTransactionTypeLabel(selectedTransaction.type, t)}
                  </Text>
                  <View
                    style={[
                      styles.txStatusBadge,
                      {
                        backgroundColor: getStatusTone(selectedTransaction.status).bg,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.txStatusBadgeText,
                        {
                          color: getStatusTone(selectedTransaction.status).text,
                        },
                      ]}
                    >
                      {walletTransactionStatusLabel(selectedTransaction.status, t)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.detailAmount}>{fmt(selectedTransaction.amount)}</Text>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Mã giao dịch</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.code || selectedTransaction.id}
                  </Text>
                </View>

                <View style={styles.detailSection}>
                  <Text style={styles.detailLabel}>Mô tả</Text>
                  <Text style={styles.detailValue}>
                    {selectedTransaction.description || "—"}
                  </Text>
                </View>

                <View style={styles.detailGrid}>
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Loại tham chiếu</Text>
                    <Text style={styles.detailValue}>
                      {selectedTransaction.reference_type || "—"}
                    </Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Mã tham chiếu</Text>
                    <Text style={styles.detailValue}>
                      {selectedTransaction.reference_id || "—"}
                    </Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Tạo lúc</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedTransaction.created_at)}
                    </Text>
                  </View>
                  <View style={styles.detailField}>
                    <Text style={styles.detailLabel}>Cập nhật</Text>
                    <Text style={styles.detailValue}>
                      {formatDateTime(selectedTransaction.updated_at)}
                    </Text>
                  </View>
                </View>

                {selectedTransaction.bank_info ? (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailLabel}>Thông tin nhận tiền</Text>
                    <Text style={styles.detailValue}>
                      {selectedTransaction.bank_info.bank_code || "—"}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {selectedTransaction.bank_info.account_number || "—"}
                    </Text>
                    <Text style={styles.detailSubValue}>
                      {selectedTransaction.bank_info.account_name || "—"}
                    </Text>
                  </View>
                ) : null}
              </View>
            ) : null}
            */}
            </ScrollView>
          </TouchableOpacity>
        </TouchableOpacity>
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
                  {item.logo ? (
                    <Image
                      source={{ uri: item.logo }}
                      style={styles.bankLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={styles.bankLogoFallback}>
                      <Text style={styles.bankLogoFallbackText}>
                        {(item.short_name || item.code || "B")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={styles.bankTextWrap}>
                    <Text style={styles.bankName}>{item.name}</Text>
                    <Text style={styles.bankCode}>
                      {item.short_name || item.code}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
            <SafeAreaView edges={["bottom"]} style={styles.pickerSafeArea} />
          </View>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
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
    padding: SPACING.md,
    marginBottom: SPACING.md,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.14)",
  },
  txHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: SPACING.sm,
  },
  txType: { fontWeight: "600", color: COLORS.textPrimary },
  txStatusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
  },
  txStatusBadgeText: {
    fontSize: 12,
    fontWeight: "700",
  },
  txCode: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 6,
  },
  txDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  txAmount: { fontSize: 15, marginTop: 4, color: COLORS.accent },
  txStatus: { fontSize: 12, color: COLORS.textTertiary, marginTop: 4 },
  txFooterRow: {
    marginTop: 4,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
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
  detailOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.28)",
    justifyContent: "flex-end",
  },
  detailSheet: {
    backgroundColor: "#FFF9EE",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "84%",
    paddingTop: 10,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.18)",
  },
  detailHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(138, 122, 96, 0.28)",
    marginBottom: 14,
  },
  detailSheetHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: SPACING.lg,
    marginBottom: 14,
  },
  detailSheetTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: COLORS.textPrimary,
    flex: 1,
  },
  detailCloseBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.9)",
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.16)",
  },
  detailScrollContent: {
    paddingHorizontal: SPACING.lg,
    paddingBottom: 8,
  },
  detailSummaryCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 22,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.18)",
    padding: SPACING.lg,
  },
  detailSummaryHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: SPACING.sm,
  },
  detailSummaryTextWrap: {
    flex: 1,
  },
  detailCodeChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(201, 165, 114, 0.12)",
    color: COLORS.accentDark,
    fontSize: 12,
    fontWeight: "700",
  },
  detailMetaLine: {
    marginTop: 8,
    fontSize: 13,
    color: COLORS.textSecondary,
  },
  detailSectionCard: {
    marginTop: SPACING.md,
    backgroundColor: "rgba(255,255,255,0.88)",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.14)",
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.md,
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  detailRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(201, 165, 114, 0.14)",
  },
  detailRowLast: {
    borderBottomWidth: 0,
    paddingBottom: 0,
  },
  detailRowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
  },
  detailRowValue: {
    fontSize: 15,
    lineHeight: 22,
    color: COLORS.textPrimary,
  },
  detailDescriptionBox: {
    backgroundColor: "rgba(201, 165, 114, 0.08)",
    borderRadius: 14,
    padding: SPACING.md,
  },
  detailDescriptionText: {
    fontSize: 15,
    lineHeight: 24,
    color: COLORS.textPrimary,
  },
  detailBankIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: SPACING.md,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "rgba(201, 165, 114, 0.08)",
  },
  detailBankMeta: {
    flex: 1,
  },
  detailBankName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  detailBankCode: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 3,
  },
  detailCard: {
    backgroundColor: "rgba(255,255,255,0.9)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.16)",
    padding: SPACING.lg,
  },
  detailTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: SPACING.sm,
  },
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.accentDark,
    marginTop: SPACING.md,
  },
  detailSection: {
    marginTop: SPACING.lg,
    gap: 6,
  },
  detailGrid: {
    marginTop: SPACING.lg,
    gap: SPACING.md,
  },
  detailField: {
    gap: 4,
  },
  detailLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
  },
  detailValue: {
    fontSize: 15,
    color: COLORS.textPrimary,
    lineHeight: 22,
  },
  detailSubValue: {
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },
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
  selectedBankRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  selectedBankInfo: {
    flex: 1,
  },
  selectedBankName: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  selectedBankCode: {
    fontSize: 12,
    color: COLORS.textTertiary,
    marginTop: 2,
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
  pickerSafeArea: {
    backgroundColor: COLORS.white,
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
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
  },
  bankLogo: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "#fff",
  },
  bankLogoFallback: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(201, 165, 114, 0.16)",
    alignItems: "center",
    justifyContent: "center",
  },
  bankLogoFallbackText: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.accentDark,
  },
  bankTextWrap: {
    flex: 1,
  },
  bankName: { fontSize: 15, color: COLORS.textPrimary },
  bankCode: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },
});

export default WalletScreen;
