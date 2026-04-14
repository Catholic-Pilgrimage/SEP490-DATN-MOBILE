import { Ionicons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import React, { useCallback, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ActivityIndicator,
  Alert,
  Animated,
  FlatList,
  Image,
  ImageBackground,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PanResponder,
  Platform,
  Pressable,
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
  requestWalletTopup,
  requestWalletWithdrawal,
} from "../../../../services/api/pilgrim/walletApi";
import type {
  WalletBankOption,
  WalletInfo,
  WalletTransaction,
  WalletTransactionTypeFilter,
  WalletTransactionsQuery,
} from "../../../../types/pilgrim/wallet.types";
import {
  walletReferenceContextLabel,
  walletTransactionStatusLabel,
  walletTransactionTypeLabel,
} from "../../../../utils/walletTransactionLabels";

// ─── Icon/Color by transaction type ────────────────────────────────────────

const TX_ICON_MAP: Record<string, { icon: string; color: string; bg: string }> =
  {
    withdraw: {
      icon: "arrow-up-circle",
      color: "#DC2626",
      bg: "rgba(220,38,38,0.08)",
    },
    topup: {
      icon: "arrow-down-circle",
      color: "#2563EB",
      bg: "rgba(37,99,235,0.08)",
    },
    escrow_lock: {
      icon: "lock-closed",
      color: "#D97706",
      bg: "rgba(217,119,6,0.08)",
    },
    escrow_refund: {
      icon: "lock-open",
      color: "#059669",
      bg: "rgba(5,150,105,0.08)",
    },
    penalty_applied: {
      icon: "remove-circle",
      color: "#DC2626",
      bg: "rgba(220,38,38,0.08)",
    },
    penalty_received: {
      icon: "add-circle",
      color: "#059669",
      bg: "rgba(5,150,105,0.08)",
    },
    penalty_refunded: {
      icon: "refresh-circle",
      color: "#2563EB",
      bg: "rgba(37,99,235,0.08)",
    },
  };
const TX_DEFAULT_ICON = {
  icon: "swap-horizontal",
  color: COLORS.textSecondary,
  bg: "rgba(0,0,0,0.04)",
};

const getTxMeta = (type?: string) => TX_ICON_MAP[type || ""] || TX_DEFAULT_ICON;

const TX_TYPE_FILTERS: (WalletTransactionTypeFilter | undefined)[] = [
  undefined,
  "topup",
  "withdraw",
  "escrow_lock",
  "escrow_refund",
  "penalty_applied",
  "penalty_received",
  "penalty_refunded",
];

const filterTransactionsByType = (
  list: WalletTransaction[],
  type?: WalletTransactionTypeFilter,
) => (type ? list.filter((tx) => tx.type === type) : list);

// ─── Main Component ────────────────────────────────────────────────────────

const WalletScreen: React.FC = () => {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();

  const [wallet, setWallet] = useState<WalletInfo | null>(null);
  const [allTransactions, setAllTransactions] = useState<WalletTransaction[]>(
    [],
  );
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [screenError, setScreenError] = useState<string | null>(null);
  const [txListWarn, setTxListWarn] = useState<string | null>(null);
  const [selectedTxType, setSelectedTxType] = useState<
    WalletTransactionTypeFilter | undefined
  >(undefined);
  const [txFilterModalOpen, setTxFilterModalOpen] = useState(false);
  const [draftTxType, setDraftTxType] = useState<
    WalletTransactionTypeFilter | undefined
  >(undefined);

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
  const [bankSearch, setBankSearch] = useState("");
  const [withdrawError, setWithdrawError] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailLoading, setDetailLoading] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<WalletTransaction | null>(null);
  const detailSheetTranslateY = React.useRef(new Animated.Value(0)).current;

  // ── Topup state ──
  const [topupOpen, setTopupOpen] = useState(false);
  const [topupAmountStr, setTopupAmountStr] = useState("");
  const [topupSubmitting, setTopupSubmitting] = useState(false);
  const [topupError, setTopupError] = useState<string | null>(null);

  // ── Data loading ──

  const loadAll = useCallback(async (txQuery: WalletTransactionsQuery) => {
    const [wRes, txRes] = await Promise.all([
      getWalletInfo(),
      getWalletTransactions(txQuery),
    ]);

    let walletFailed = true;
    if (wRes.success && wRes.data) {
      setWallet(wRes.data);
      walletFailed = false;
    } else {
      setWallet(null);
    }
    let txItems: WalletTransaction[] = [];
    let txFailed = true;
    if (txRes.success && txRes.data && Array.isArray(txRes.data.transactions)) {
      txItems = txRes.data.transactions;
      setAllTransactions(txItems);
      setTransactions(txItems);
      txFailed = false;
    } else {
      setAllTransactions([]);
      setTransactions([]);
    }
    return {
      walletFailed,
      txFailed,
      walletMessage: wRes.message,
      txMessage: txRes.message,
      txItems,
    };
  }, []);

  const buildTxQuery = (): WalletTransactionsQuery => ({
    page: 1,
    limit: 30,
  });

  const bootstrap = useCallback(async () => {
    setLoading(true);
    setScreenError(null);
    setTxListWarn(null);
    try {
      const r = await loadAll(buildTxQuery());
      if (r.walletFailed)
        setScreenError(
          r.walletMessage ||
            t("wallet.loadFailed", {
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
        );
      else if (r.txFailed)
        setTxListWarn(
          r.txMessage ||
            t("wallet.transactionsLoadFailed", {
              defaultValue:
                "Không tải được lịch sử giao dịch. Kéo xuống để làm mới.",
            }),
        );
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
      const r = await loadAll(buildTxQuery());
      if (!r.txFailed)
        setTransactions(filterTransactionsByType(r.txItems, selectedTxType));
      if (r.walletFailed)
        setScreenError(
          r.walletMessage ||
            t("wallet.loadFailed", {
              defaultValue: "Không tải được ví. Kiểm tra mạng và thử lại.",
            }),
        );
      else {
        setScreenError(null);
        if (r.txFailed)
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
      setRefreshing(false);
    }
  };

  const onChangeTypeFilter = (type?: WalletTransactionTypeFilter) => {
    setSelectedTxType(type);
    setTransactions(filterTransactionsByType(allTransactions, type));
  };

  const openTxFilterModal = () => {
    setDraftTxType(selectedTxType);
    setTxFilterModalOpen(true);
  };

  const applyTxFilter = () => {
    setTxFilterModalOpen(false);
    onChangeTypeFilter(draftTxType);
  };

  // ── Withdraw ──

  const openWithdraw = async () => {
    setWithdrawOpen(true);
    setBanksLoading(true);
    try {
      const res = await getWalletBanks();
      if (res.success && Array.isArray(res.data)) setBanks(res.data);
      else {
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
    setWithdrawError(null);
    const amount = parseFloat(amountStr.replace(/[\s\.,]/g, ""));
    if (!selectedBank) {
      setWithdrawError(
        t("wallet.selectBankRequired", {
          defaultValue: "Vui lòng chọn ngân hàng.",
        }),
      );
      return;
    }
    if (!Number.isFinite(amount) || amount < 2000 || amount > 50_000_000) {
      setWithdrawError(
        t("wallet.withdrawAmountInvalid", {
          defaultValue: "Số tiền rút từ 2.000 đến 50.000.000 ₫.",
        }),
      );
      return;
    }
    if (amount > (wallet?.balance ?? 0)) {
      setWithdrawError(
        t("wallet.balanceInsufficient", {
          defaultValue: "Số dư khả dụng không đủ. Hiện có {{amount}}.",
          amount: fmt(wallet?.balance ?? 0),
        }),
      );
      return;
    }
    const acc = accountNumber.trim();
    const name = accountName.trim();
    if (acc.length < 5 || acc.length > 30) {
      setWithdrawError(
        t("wallet.accountNumberInvalid", {
          defaultValue: "Số tài khoản phải từ 5–30 ký tự.",
        }),
      );
      return;
    }
    if (name.length < 2 || name.length > 100) {
      setWithdrawError(
        t("wallet.accountNameInvalid", {
          defaultValue: "Tên chủ tài khoản phải từ 2–100 ký tự.",
        }),
      );
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
        setWithdrawOpen(false);
        setAmountStr("");
        setAccountNumber("");
        setAccountName("");
        setSelectedBank(null);
        setWithdrawError(null);
        Toast.show({
          type: "success",
          text1: t("common.success", { defaultValue: "Thành công" }),
          text2:
            res.message ||
            t("wallet.withdrawSubmitted", {
              defaultValue: "Đã gửi yêu cầu rút tiền",
            }),
        });
        const afterWithdraw = await loadAll(buildTxQuery());
        if (!afterWithdraw.txFailed) {
          setTransactions(
            filterTransactionsByType(afterWithdraw.txItems, selectedTxType),
          );
        }
      } else {
        let cleanMsg =
          res.message ||
          t("wallet.withdrawFailed", {
            defaultValue: "Rút tiền thất bại. Thử lại sau.",
          });
        if (cleanMsg.includes("HTTP 200") || cleanMsg.includes("code: 607")) {
          cleanMsg = t("wallet.withdrawAccountUnsupported", {
            defaultValue:
              "Tài khoản nhận không đúng hoặc không hỗ trợ nhận tiền.",
          });
        } else {
          cleanMsg = cleanMsg
            .replace(/HTTP \d+,?\s*/g, "")
            .replace(/\(code: \d+\)/g, "")
            .trim();
        }
        Toast.show({
          type: "error",
          text1: t("wallet.transactionFailedTitle", {
            defaultValue: "Giao dịch không thành công",
          }),
          text2: cleanMsg,
        });
      }
    } catch (e: unknown) {
      let cleanMsg =
        e instanceof Error
          ? e.message
          : t("wallet.withdrawFailed", {
              defaultValue: "Rút tiền thất bại. Thử lại sau.",
            });
      if (cleanMsg.includes("HTTP 200") || cleanMsg.includes("code: 607")) {
        cleanMsg = t("wallet.withdrawAccountUnsupported", {
          defaultValue:
            "Tài khoản nhận không đúng hoặc không hỗ trợ nhận tiền.",
        });
      } else {
        cleanMsg = cleanMsg
          .replace(/HTTP \d+,?\s*/g, "")
          .replace(/\(code: \d+\)/g, "")
          .trim();
      }
      Toast.show({
        type: "error",
        text1: t("wallet.transactionFailedTitle", {
          defaultValue: "Giao dịch không thành công",
        }),
        text2: cleanMsg,
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ── Topup ──

  const submitTopup = async () => {
    setTopupError(null);
    const amount = parseFloat(topupAmountStr.replace(/[\s\.,]/g, ""));
    if (!Number.isFinite(amount) || amount < 2000 || amount > 50_000_000) {
      setTopupError(
        t("wallet.topupAmountInvalid", {
          defaultValue: "Số tiền nạp từ 2.000 đến 50.000.000 ₫.",
        }),
      );
      return;
    }
    try {
      setTopupSubmitting(true);
      const res = await requestWalletTopup({ amount });
      if (res.success && res.data?.checkout_url) {
        setTopupOpen(false);
        setTopupAmountStr("");
        setTopupError(null);
        const payUrl = res.data.checkout_url;
        const canOpen = await Linking.canOpenURL(payUrl);
        if (canOpen) {
          await Linking.openURL(payUrl);
          Toast.show({
            type: "info",
            text1: t("wallet.topupPaymentOpened", {
              defaultValue: "Đang mở trang thanh toán",
            }),
            text2: t("wallet.topupPaymentHint", {
              defaultValue: "Quay lại app và kéo làm mới sau khi thanh toán.",
            }),
          });
        } else {
          Alert.alert(
            t("wallet.topupLinkTitle", { defaultValue: "Link thanh toán" }),
            payUrl,
            [{ text: t("common.ok") }],
          );
        }
      } else {
        setTopupError(
          res.message ||
            t("wallet.topupFailed", {
              defaultValue: "Nạp tiền thất bại. Thử lại sau.",
            }),
        );
      }
    } catch (e: unknown) {
      setTopupError(
        e instanceof Error
          ? e.message
          : t("wallet.topupFailed", {
              defaultValue: "Nạp tiền thất bại. Thử lại sau.",
            }),
      );
    } finally {
      setTopupSubmitting(false);
    }
  };

  // ── Formatting helpers ──

  const fmt = (n: number) =>
    `${(Number.isFinite(n) ? n : 0).toLocaleString("vi-VN")} ₫`;
  const formatDateTime = (value?: string) =>
    value ? new Date(value).toLocaleString("vi-VN") : "—";

  const handleAmountInput = (text: string, setter: (val: string) => void) => {
    const numericVal = text.replace(/[^0-9]/g, "");
    if (!numericVal) {
      setter("");
      return;
    }
    const parsed = parseInt(numericVal, 10);
    setter(parsed.toLocaleString("vi-VN"));
  };

  const getStatusTone = (status?: string) => {
    switch (status) {
      case "completed":
        return { bg: "rgba(5, 150, 105, 0.10)", text: "#059669" };
      case "failed":
        return { bg: "rgba(220, 38, 38, 0.10)", text: "#DC2626" };
      case "pending":
        return { bg: "rgba(217, 119, 6, 0.10)", text: "#D97706" };
      case "cancelled":
        return { bg: "rgba(107, 114, 128, 0.10)", text: "#6B7280" };
      default:
        return { bg: "rgba(26, 40, 69, 0.08)", text: COLORS.primary };
    }
  };

  // ── Transaction detail ──

  const resetDetailSheetPosition = useCallback(() => {
    detailSheetTranslateY.stopAnimation();
    detailSheetTranslateY.setValue(0);
  }, [detailSheetTranslateY]);

  const closeDetailModal = useCallback(() => {
    Animated.timing(detailSheetTranslateY, {
      toValue: 420,
      duration: 180,
      useNativeDriver: true,
    }).start(() => {
      setDetailOpen(false);
      detailSheetTranslateY.setValue(0);
    });
  }, [detailSheetTranslateY]);

  const detailSheetPanResponder = React.useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gestureState) =>
        gestureState.dy > 6 &&
        Math.abs(gestureState.dy) > Math.abs(gestureState.dx),
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) {
          detailSheetTranslateY.setValue(gestureState.dy * 0.92);
        }
      },
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 120 || gestureState.vy > 1.15) {
          closeDetailModal();
          return;
        }
        Animated.spring(detailSheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
          mass: 0.9,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(detailSheetTranslateY, {
          toValue: 0,
          useNativeDriver: true,
          damping: 20,
          stiffness: 220,
          mass: 0.9,
        }).start();
      },
    }),
  ).current;

  const openTransactionDetail = async (tx: WalletTransaction) => {
    resetDetailSheetPosition();
    setSelectedTransaction(tx);
    setDetailOpen(true);
    setDetailLoading(true);
    try {
      if (!banks.length) {
        const bankRes = await getWalletBanks();
        if (bankRes.success && Array.isArray(bankRes.data))
          setBanks(bankRes.data);
      }
      const res = await getWalletTransactionById(tx.id);
      if (res.success && res.data) setSelectedTransaction(res.data);
      else
        Toast.show({
          type: "error",
          text1: t("common.error"),
          text2:
            res.message ||
            t("wallet.detailLoadFailed", {
              defaultValue: "Không tải được chi tiết",
            }),
        });
    } catch (e: unknown) {
      Toast.show({
        type: "error",
        text1: t("common.error"),
        text2:
          e instanceof Error
            ? e.message
            : t("wallet.detailLoadFailed", {
                defaultValue: "Không tải được chi tiết",
              }),
      });
    } finally {
      setDetailLoading(false);
    }
  };

  React.useEffect(() => {
    if (detailOpen) resetDetailSheetPosition();
  }, [detailOpen, resetDetailSheetPosition]);

  const findBankMeta = (bankCode?: string) => {
    const n = bankCode?.trim();
    if (!n) return null;
    return (
      banks.find((b) => b.bin === n || b.code === n || b.short_name === n) ||
      null
    );
  };
  const detailBank = findBankMeta(selectedTransaction?.bank_info?.bank_code);

  const canWithdraw = (wallet?.balance ?? 0) >= 2000;

  // ── RENDER ──

  return (
    <ImageBackground
      source={require("../../../../../assets/images/profile-bg.jpg")}
      style={[s.root, { paddingTop: insets.top }]}
      resizeMode="cover"
      fadeDuration={0}
    >
      <StatusBar
        barStyle="dark-content"
        backgroundColor="transparent"
        translucent
      />

      {/* ── Header ── */}
      <View style={s.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={s.backBtn}
          hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
        >
          <Ionicons name="arrow-back" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
        <Text style={s.headerTitle}>
          {t("wallet.title", { defaultValue: "Ví của tôi" })}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      {loading ? (
        <View style={s.centered}>
          <ActivityIndicator size="large" color={COLORS.accent} />
        </View>
      ) : screenError && !wallet ? (
        <View style={[s.centered, { paddingHorizontal: SPACING.xl }]}>
          <Ionicons
            name="cloud-offline-outline"
            size={48}
            color={COLORS.textTertiary}
          />
          <Text style={s.errorTitle}>
            {t("wallet.loadFailedTitle", { defaultValue: "Không tải được ví" })}
          </Text>
          <Text style={s.errorSub}>{screenError}</Text>
          <TouchableOpacity style={s.retryBtn} onPress={() => void bootstrap()}>
            <Text style={s.retryBtnText}>
              {t("wallet.retry", { defaultValue: "Thử lại" })}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={{ paddingBottom: insets.bottom + 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          {/* ─── Balance Card ─── */}
          <View style={s.balanceSection}>
            <View style={s.balanceCard}>
              {/* Top: Available balance */}
              <View style={s.balanceTop}>
                <Text style={s.balanceLabel}>
                  {t("wallet.availableBalance", {
                    defaultValue: "Số dư khả dụng",
                  })}
                </Text>
                <Text style={s.balanceAmount}>{fmt(wallet?.balance ?? 0)}</Text>
              </View>

              {/* Breakdown row */}
              <View style={s.breakdownRow}>
                <View style={s.breakdownItem}>
                  <View
                    style={[s.breakdownDot, { backgroundColor: "#D97706" }]}
                  />
                  <View>
                    <Text style={s.breakdownLabel}>
                      {t("wallet.lockedBalance", {
                        defaultValue: "Đang giữ cọc",
                      })}
                    </Text>
                    <Text style={s.breakdownValue}>
                      {fmt(wallet?.locked_balance ?? 0)}
                    </Text>
                  </View>
                </View>
                <View style={s.breakdownDivider} />
                <View style={s.breakdownItem}>
                  <View
                    style={[s.breakdownDot, { backgroundColor: "#059669" }]}
                  />
                  <View>
                    <Text style={s.breakdownLabel}>
                      {t("wallet.totalBalance", { defaultValue: "Tổng cộng" })}
                    </Text>
                    <Text style={s.breakdownValue}>
                      {fmt(wallet?.total_balance ?? 0)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action buttons row */}
              <View style={s.actionRow}>
                <TouchableOpacity
                  style={[s.actionBtn, s.topupBtn]}
                  onPress={() => {
                    setTopupError(null);
                    setTopupAmountStr("");
                    setTopupOpen(true);
                  }}
                  activeOpacity={0.8}
                >
                  <Ionicons name="add-circle-outline" size={20} color="#fff" />
                  <Text style={s.actionBtnText}>
                    {t("wallet.topupCta", { defaultValue: "Nạp tiền" })}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    s.actionBtn,
                    s.withdrawActionBtn,
                    !canWithdraw && s.withdrawBtnDisabled,
                  ]}
                  onPress={canWithdraw ? openWithdraw : undefined}
                  disabled={!canWithdraw}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="arrow-up-circle-outline"
                    size={20}
                    color={canWithdraw ? "#fff" : "rgba(255,255,255,0.5)"}
                  />
                  <Text
                    style={[s.actionBtnText, !canWithdraw && { opacity: 0.5 }]}
                  >
                    {t("wallet.withdraw", { defaultValue: "Rút tiền" })}
                  </Text>
                </TouchableOpacity>
              </View>

              {!canWithdraw && (
                <Text style={s.withdrawHint}>
                  {t("wallet.withdrawMinHint", {
                    defaultValue: "Cần tối thiểu 2.000 ₫ khả dụng để rút tiền.",
                  })}
                </Text>
              )}
            </View>
          </View>

          {/* ─── Info banner ─── */}
          <View style={s.infoBanner}>
            <Ionicons
              name="information-circle-outline"
              size={18}
              color={COLORS.textSecondary}
              style={{ marginTop: 1 }}
            />
            <Text style={s.infoBannerText}>
              {t("wallet.topUpHintNew", {
                defaultValue:
                  "Nạp tiền qua PayOS. Số dư cũng tăng khi có hoàn cọc hoặc giao dịch liên quan đoàn.",
              })}
            </Text>
          </View>

          {/* ─── Transactions ─── */}
          <View style={s.txSection}>
            <View style={s.sectionHeaderRow}>
              <Text style={s.sectionTitle}>
                {t("wallet.history", { defaultValue: "Lịch sử giao dịch" })}
              </Text>
              <View style={s.sectionHeaderActions}>
                <TouchableOpacity
                  style={[
                    s.headerFilterBtn,
                    selectedTxType && s.headerFilterBtnActive,
                  ]}
                  onPress={openTxFilterModal}
                  activeOpacity={0.85}
                >
                  <Ionicons
                    name="options-outline"
                    size={18}
                    color={
                      selectedTxType ? COLORS.accentDark : COLORS.textSecondary
                    }
                  />
                  {selectedTxType ? <View style={s.filterActiveDot} /> : null}
                </TouchableOpacity>
              </View>
            </View>
            {txListWarn ? <Text style={s.txWarn}>{txListWarn}</Text> : null}
            {transactions.length === 0 && !txListWarn ? (
              <View style={s.emptyState}>
                <Ionicons
                  name="receipt-outline"
                  size={44}
                  color="rgba(201,165,114,0.3)"
                />
                <Text style={s.emptyText}>
                  {t("wallet.noTransactions", {
                    defaultValue: "Chưa có giao dịch",
                  })}
                </Text>
              </View>
            ) : (
              transactions.map((tx) => {
                const meta = getTxMeta(tx.type);
                const tone = getStatusTone(tx.status);
                const refHint = walletReferenceContextLabel(
                  tx.reference_type,
                  t,
                );
                const desc =
                  (tx.description && tx.description.trim()) || refHint || "";
                return (
                  <TouchableOpacity
                    key={tx.id}
                    style={s.txCard}
                    activeOpacity={0.85}
                    onPress={() => void openTransactionDetail(tx)}
                  >
                    <View style={s.txRow}>
                      <View style={[s.txIcon, { backgroundColor: meta.bg }]}>
                        <Ionicons
                          name={meta.icon as any}
                          size={22}
                          color={meta.color}
                        />
                      </View>
                      <View style={s.txContent}>
                        <View style={s.txHeaderRow}>
                          <Text style={s.txType} numberOfLines={1}>
                            {walletTransactionTypeLabel(tx.type, t)}
                          </Text>
                          <View
                            style={[s.txBadge, { backgroundColor: tone.bg }]}
                          >
                            <Text style={[s.txBadgeText, { color: tone.text }]}>
                              {walletTransactionStatusLabel(tx.status, t)}
                            </Text>
                          </View>
                        </View>
                        {desc ? (
                          <Text style={s.txDesc} numberOfLines={2}>
                            {desc}
                          </Text>
                        ) : null}
                        <View style={s.txFooter}>
                          <Text style={s.txAmount}>{fmt(tx.amount)}</Text>
                          <Text style={s.txDate}>
                            {formatDateTime(tx.created_at)}
                          </Text>
                        </View>
                      </View>
                      <Ionicons
                        name="chevron-forward"
                        size={16}
                        color="rgba(201,165,114,0.4)"
                        style={{ marginLeft: 4 }}
                      />
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </ScrollView>
      )}

      {/* ═══════════════════ TRANSACTION FILTER MODAL ═══════════════════ */}
      <Modal
        visible={txFilterModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setTxFilterModalOpen(false)}
      >
        <View style={s.txFilterOverlay}>
          <TouchableOpacity
            activeOpacity={1}
            style={StyleSheet.absoluteFillObject}
            onPress={() => setTxFilterModalOpen(false)}
          />
          <Pressable style={s.txFilterSheet}>
            <View style={s.txFilterHeaderRow}>
              <Text style={s.txFilterTitle}>
                {t("wallet.filterType", { defaultValue: "Lọc theo loại" })}
              </Text>
              <TouchableOpacity onPress={() => setTxFilterModalOpen(false)}>
                <Ionicons name="close" size={20} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>

            {TX_TYPE_FILTERS.map((type) => {
              const isActive = draftTxType === type;
              return (
                <TouchableOpacity
                  key={type || "all"}
                  style={[s.txFilterOption, isActive && s.txFilterOptionActive]}
                  onPress={() => setDraftTxType(type)}
                >
                  <Text
                    style={[
                      s.txFilterOptionText,
                      isActive && s.txFilterOptionTextActive,
                    ]}
                  >
                    {type
                      ? walletTransactionTypeLabel(type, t)
                      : t("wallet.filterAll", { defaultValue: "Tất cả" })}
                  </Text>
                  {isActive ? (
                    <Ionicons
                      name="checkmark"
                      size={18}
                      color={COLORS.accentDark}
                    />
                  ) : null}
                </TouchableOpacity>
              );
            })}

            <SafeAreaView edges={["bottom"]} style={s.txFilterSafeFooter}>
              <View style={s.txFilterFooter}>
                <TouchableOpacity
                  style={s.txFilterResetBtn}
                  onPress={() => setDraftTxType(undefined)}
                >
                  <Text style={s.txFilterResetText}>
                    {t("common.reset", { defaultValue: "Đặt lại" })}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={s.txFilterApplyBtn}
                  onPress={applyTxFilter}
                >
                  <Text style={s.txFilterApplyText}>
                    {t("common.apply", { defaultValue: "Áp dụng" })}
                  </Text>
                </TouchableOpacity>
              </View>
            </SafeAreaView>
          </Pressable>
        </View>
      </Modal>

      {/* ═══════════════════ WITHDRAW MODAL ═══════════════════ */}
      <Modal
        visible={withdrawOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setWithdrawOpen(false)}
      >
        <ImageBackground
          source={require("../../../../../assets/images/profile-bg.jpg")}
          style={[s.modalRoot, { paddingTop: insets.top }]}
          resizeMode="cover"
          fadeDuration={0}
        >
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => setWithdrawOpen(false)}>
              <Text style={s.modalClose}>
                {t("common.cancel", { defaultValue: "Hủy" })}
              </Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>
              {t("wallet.withdraw", { defaultValue: "Rút tiền" })}
            </Text>
            <View style={{ width: 56 }} />
          </View>

          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <ScrollView
              contentContainerStyle={{
                padding: SPACING.lg,
                paddingBottom: Math.max(insets.bottom, 24) + 240,
              }}
              keyboardShouldPersistTaps="handled"
            >
              {/* Available balance reminder */}
              <View style={s.withdrawBalanceCard}>
                <Text style={s.withdrawBalanceLabel}>
                  {t("wallet.available", { defaultValue: "Khả dụng" })}
                </Text>
                <Text style={s.withdrawBalanceAmount}>
                  {fmt(wallet?.balance ?? 0)}
                </Text>
              </View>

              <Text style={s.fieldLabel}>
                {t("wallet.withdrawAmountLabel", {
                  defaultValue: "Số tiền rút (VND)",
                })}
              </Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                placeholder={t("wallet.withdrawAmountPlaceholder", {
                  defaultValue: "Tối thiểu 2.000 ₫",
                })}
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={amountStr}
                onChangeText={(t) => handleAmountInput(t, setAmountStr)}
              />

              <Text style={s.fieldLabel}>
                {t("wallet.bank", { defaultValue: "Ngân hàng" })}
              </Text>
              <TouchableOpacity
                style={s.input}
                onPress={() => setBankPickerOpen(true)}
              >
                {selectedBank ? (
                  <View style={s.selectedBankRow}>
                    {selectedBank.logo ? (
                      <Image
                        source={{ uri: selectedBank.logo }}
                        style={s.bankLogo}
                        resizeMode="contain"
                      />
                    ) : (
                      <View style={s.bankLogoFallback}>
                        <Text style={s.bankLogoFallbackText}>
                          {(selectedBank.short_name || selectedBank.code || "B")
                            .slice(0, 2)
                            .toUpperCase()}
                        </Text>
                      </View>
                    )}
                    <View style={s.selectedBankInfo}>
                      <Text style={s.selectedBankName} numberOfLines={1}>
                        {selectedBank.short_name || selectedBank.name}
                      </Text>
                      <Text style={s.selectedBankCode}>
                        {selectedBank.code}
                      </Text>
                    </View>
                  </View>
                ) : (
                  <Text style={{ color: "rgba(0,0,0,0.25)" }}>
                    {t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" })}
                  </Text>
                )}
              </TouchableOpacity>

              <Text style={s.fieldLabel}>
                {t("wallet.accountNumber", { defaultValue: "Số tài khoản" })}
              </Text>
              <TextInput
                style={s.input}
                value={accountNumber}
                onChangeText={setAccountNumber}
                autoCapitalize="none"
                maxLength={30}
                placeholder={t("wallet.accountNumberPlaceholder", {
                  defaultValue: "Nhập số tài khoản",
                })}
                placeholderTextColor="rgba(0,0,0,0.25)"
              />

              <Text style={s.fieldLabel}>
                {t("wallet.accountName", {
                  defaultValue: "Tên chủ tài khoản",
                })}
              </Text>
              <TextInput
                style={s.input}
                value={accountName}
                onChangeText={(text) => setAccountName(text.toUpperCase())}
                maxLength={100}
                placeholder={t("wallet.accountNamePlaceholder", {
                  defaultValue: "VD: NGUYEN VAN A",
                })}
                placeholderTextColor="rgba(0,0,0,0.25)"
                autoCapitalize="characters"
              />
              <Text style={s.fieldHint}>
                {t("wallet.accountNameHint", {
                  defaultValue:
                    "Viết HOA, KHÔNG DẤU — theo đúng tên trên tài khoản ngân hàng",
                })}
              </Text>

              {/* Inline error */}
              {withdrawError ? (
                <View style={s.inlineError}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={s.inlineErrorText}>{withdrawError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.submitBtn, submitting && { opacity: 0.7 }]}
                disabled={submitting || banksLoading}
                onPress={() => void submitWithdraw()}
              >
                {submitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {t("wallet.withdrawConfirm", {
                      defaultValue: "Xác nhận rút tiền",
                    })}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </ImageBackground>
      </Modal>

      {/* ═══════════════════ TOPUP MODAL ═══════════════════ */}
      <Modal
        visible={topupOpen}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setTopupOpen(false)}
      >
        <ImageBackground
          source={require("../../../../../assets/images/profile-bg.jpg")}
          style={[s.modalRoot, { paddingTop: insets.top }]}
          resizeMode="cover"
          fadeDuration={0}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            style={{ flex: 1 }}
          >
            <View style={s.modalHeader}>
              <TouchableOpacity onPress={() => setTopupOpen(false)}>
                <Text style={[s.modalClose, { color: COLORS.textPrimary }]}>
                  {t("common.cancel", { defaultValue: "Hủy" })}
                </Text>
              </TouchableOpacity>
              <Text style={s.modalTitle}>
                {t("wallet.topupTitle", { defaultValue: "Nạp tiền vào ví" })}
              </Text>
              <View style={{ width: 56 }} />
            </View>

            <ScrollView
              contentContainerStyle={{
                padding: SPACING.lg,
                paddingBottom: Math.max(insets.bottom, 24) + 180,
              }}
              keyboardShouldPersistTaps="always"
              keyboardDismissMode="on-drag"
            >
              {/* Amount */}
              <Text style={s.fieldLabel}>
                {t("wallet.topupAmountLabel", {
                  defaultValue: "Số tiền nạp (VND)",
                })}
              </Text>
              <TextInput
                style={s.input}
                keyboardType="decimal-pad"
                placeholder={t("wallet.topupAmountPlaceholder", {
                  defaultValue: "Tối thiểu 2.000 ₫",
                })}
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={topupAmountStr}
                onChangeText={(t) => handleAmountInput(t, setTopupAmountStr)}
              />

              {/* Quick amount chips — Grid 2x3 */}
              <View style={s.quickAmountRow}>
                {[5000, 10000, 20000].map((val) => {
                  const valStr = val.toLocaleString("vi-VN");
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        s.quickAmountChip,
                        topupAmountStr === valStr && s.quickAmountChipActive,
                      ]}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        Keyboard.dismiss();
                        setTopupAmountStr(valStr);
                      }}
                    >
                      <Text
                        style={[
                          s.quickAmountText,
                          topupAmountStr === valStr && s.quickAmountTextActive,
                        ]}
                      >
                        {(val / 1000).toLocaleString("vi-VN")}K
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <View style={[s.quickAmountRow, { marginTop: 8 }]}>
                {[50000, 100000, 200000].map((val) => {
                  const valStr = val.toLocaleString("vi-VN");
                  return (
                    <TouchableOpacity
                      key={val}
                      style={[
                        s.quickAmountChip,
                        topupAmountStr === valStr && s.quickAmountChipActive,
                      ]}
                      activeOpacity={0.8}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      onPress={() => {
                        Keyboard.dismiss();
                        setTopupAmountStr(valStr);
                      }}
                    >
                      <Text
                        style={[
                          s.quickAmountText,
                          topupAmountStr === valStr && s.quickAmountTextActive,
                        ]}
                      >
                        {(val / 1000).toLocaleString("vi-VN")}K
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Info */}
              <View style={s.topupInfoBox}>
                <Ionicons
                  name="shield-checkmark-outline"
                  size={16}
                  color="#2563EB"
                />
                <Text style={s.topupInfoText}>
                  {t("wallet.topupInfoSecurity", {
                    defaultValue:
                      "Thanh toán an toàn qua PayOS. Số dư được cộng ngay sau khi thanh toán thành công.",
                  })}
                </Text>
              </View>

              {/* Inline error */}
              {topupError ? (
                <View style={s.inlineError}>
                  <Ionicons name="alert-circle" size={16} color="#DC2626" />
                  <Text style={s.inlineErrorText}>{topupError}</Text>
                </View>
              ) : null}

              <TouchableOpacity
                style={[s.topupSubmitBtn, topupSubmitting && { opacity: 0.7 }]}
                disabled={topupSubmitting}
                onPress={() => void submitTopup()}
              >
                {topupSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={s.submitBtnText}>
                    {t("wallet.topupConfirm", { defaultValue: "Nạp tiền" })}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
          </KeyboardAvoidingView>
        </ImageBackground>
      </Modal>

      {/* ═══════════════════ DETAIL MODAL ═══════════════════ */}
      <Modal
        visible={detailOpen}
        animationType="fade"
        transparent
        onRequestClose={closeDetailModal}
      >
        <View style={s.detailOverlay}>
          <TouchableOpacity
            style={StyleSheet.absoluteFillObject}
            activeOpacity={1}
            onPress={closeDetailModal}
          />
          <Animated.View
            style={[
              s.detailSheet,
              { paddingBottom: Math.max(insets.bottom, 16) + 12 },
              { transform: [{ translateY: detailSheetTranslateY }] },
            ]}
          >
            <View
              style={s.detailHandleTouchArea}
              {...detailSheetPanResponder.panHandlers}
            >
              <View style={s.detailHandle} />
            </View>
            <View style={s.detailSheetHeader}>
              <Text style={s.detailSheetTitle}>
                {t("wallet.detailTitle", {
                  defaultValue: "Chi tiết giao dịch",
                })}
              </Text>
              <TouchableOpacity
                style={s.detailCloseBtn}
                onPress={closeDetailModal}
              >
                <Ionicons name="close" size={22} color={COLORS.textSecondary} />
              </TouchableOpacity>
            </View>
            <ScrollView
              contentContainerStyle={s.detailScrollContent}
              showsVerticalScrollIndicator={false}
              nestedScrollEnabled
              keyboardShouldPersistTaps="handled"
            >
              {detailLoading && !selectedTransaction ? (
                <View style={s.centered}>
                  <ActivityIndicator size="large" color={COLORS.accent} />
                </View>
              ) : selectedTransaction ? (
                <>
                  {/* Summary card */}
                  <View style={s.detailSummaryCard}>
                    <View style={s.detailSummaryHeader}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.detailTitle}>
                          {walletTransactionTypeLabel(
                            selectedTransaction.type,
                            t,
                          )}
                        </Text>
                        <Text style={s.detailCodeChip}>
                          {selectedTransaction.code || selectedTransaction.id}
                        </Text>
                      </View>
                      <View
                        style={[
                          s.txBadge,
                          {
                            backgroundColor: getStatusTone(
                              selectedTransaction.status,
                            ).bg,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            s.txBadgeText,
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
                    <Text style={s.detailAmount}>
                      {fmt(selectedTransaction.amount)}
                    </Text>
                    <Text style={s.detailMetaLine}>
                      {formatDateTime(selectedTransaction.created_at)}
                    </Text>
                  </View>

                  {/* Info card */}
                  <View style={s.detailSectionCard}>
                    <Text style={s.detailSectionTitle}>
                      {t("wallet.detailInfo", {
                        defaultValue: "Thông tin giao dịch",
                      })}
                    </Text>
                    <DetailRow
                      label={
                        t("wallet.detailTransactionCode", {
                          defaultValue: "Mã giao dịch",
                        }) as string
                      }
                      value={selectedTransaction.code || selectedTransaction.id}
                    />
                    <DetailRow
                      label={
                        t("wallet.detailReferenceType", {
                          defaultValue: "Loại tham chiếu",
                        }) as string
                      }
                      value={selectedTransaction.reference_type || "—"}
                    />
                    <DetailRow
                      label={
                        t("wallet.detailReferenceCode", {
                          defaultValue: "Mã tham chiếu",
                        }) as string
                      }
                      value={selectedTransaction.reference_id || "—"}
                    />
                    <DetailRow
                      label={
                        t("wallet.detailCreatedAt", {
                          defaultValue: "Tạo lúc",
                        }) as string
                      }
                      value={formatDateTime(selectedTransaction.created_at)}
                    />
                    <DetailRow
                      label={
                        t("wallet.detailUpdatedAt", {
                          defaultValue: "Cập nhật",
                        }) as string
                      }
                      value={formatDateTime(selectedTransaction.updated_at)}
                      last
                    />
                  </View>

                  {/* Description */}
                  {selectedTransaction.description ? (
                    <View style={s.detailSectionCard}>
                      <Text style={s.detailSectionTitle}>
                        {t("wallet.detailDescription", {
                          defaultValue: "Mô tả",
                        })}
                      </Text>
                      <View style={s.detailDescBox}>
                        <Text style={s.detailDescText}>
                          {selectedTransaction.description}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* Bank info */}
                  {selectedTransaction.bank_info ? (
                    <View style={s.detailSectionCard}>
                      <Text style={s.detailSectionTitle}>
                        {t("wallet.detailBankInfo", {
                          defaultValue: "Thông tin nhận tiền",
                        })}
                      </Text>
                      {detailBank ? (
                        <View style={s.detailBankIdentity}>
                          {detailBank.logo ? (
                            <Image
                              source={{ uri: detailBank.logo }}
                              style={s.bankLogo}
                              resizeMode="contain"
                            />
                          ) : (
                            <View style={s.bankLogoFallback}>
                              <Text style={s.bankLogoFallbackText}>
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
                          <View style={{ flex: 1 }}>
                            <Text style={s.detailBankName}>
                              {detailBank.short_name || detailBank.name}
                            </Text>
                            <Text style={s.detailBankCode}>
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
                      {!detailBank ? (
                        <DetailRow
                          label={
                            t("wallet.detailBankCode", {
                              defaultValue: "Mã ngân hàng",
                            }) as string
                          }
                          value={selectedTransaction.bank_info.bank_code || "—"}
                        />
                      ) : null}
                      <DetailRow
                        label={
                          t("wallet.accountNumber", {
                            defaultValue: "Số tài khoản",
                          }) as string
                        }
                        value={
                          selectedTransaction.bank_info.account_number || "—"
                        }
                      />
                      <DetailRow
                        label={
                          t("wallet.detailAccountHolder", {
                            defaultValue: "Chủ tài khoản",
                          }) as string
                        }
                        value={
                          selectedTransaction.bank_info.account_name || "—"
                        }
                        last
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </ScrollView>
          </Animated.View>
        </View>
      </Modal>

      {/* ═══════════════════ BANK PICKER ═══════════════════ */}
      <Modal
        visible={bankPickerOpen}
        animationType="fade"
        transparent
        onRequestClose={() => {
          setBankPickerOpen(false);
          setBankSearch("");
        }}
      >
        <TouchableOpacity
          style={s.pickerOverlay}
          activeOpacity={1}
          onPress={() => {
            setBankPickerOpen(false);
            setBankSearch("");
          }}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => {}}
            style={[
              s.pickerSheet,
              { paddingBottom: Math.max(insets.bottom, 8) },
            ]}
          >
            <View style={s.pickerHandle} />
            <Text style={s.pickerTitle}>
              {t("wallet.selectBank", { defaultValue: "Chọn ngân hàng" })}
            </Text>

            {/* Search */}
            <View style={s.bankSearchWrap}>
              <Ionicons name="search" size={18} color={COLORS.textTertiary} />
              <TextInput
                style={s.bankSearchInput}
                placeholder={t("wallet.searchBankPlaceholder", {
                  defaultValue: "Tìm ngân hàng...",
                })}
                placeholderTextColor="rgba(0,0,0,0.25)"
                value={bankSearch}
                onChangeText={setBankSearch}
                autoCorrect={false}
                returnKeyType="search"
              />
              {bankSearch.length > 0 && (
                <TouchableOpacity
                  onPress={() => setBankSearch("")}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons
                    name="close-circle"
                    size={18}
                    color={COLORS.textTertiary}
                  />
                </TouchableOpacity>
              )}
            </View>

            <FlatList
              data={banks.filter((b) => {
                if (!bankSearch.trim()) return true;
                const q = bankSearch.trim().toLowerCase();
                return (
                  (b.name || "").toLowerCase().includes(q) ||
                  (b.short_name || "").toLowerCase().includes(q) ||
                  (b.code || "").toLowerCase().includes(q) ||
                  (b.bin || "").includes(q)
                );
              })}
              keyExtractor={(b) => b.code + b.bin}
              style={{ maxHeight: 400 }}
              keyboardShouldPersistTaps="handled"
              ListEmptyComponent={
                <View style={{ paddingVertical: 28, alignItems: "center" }}>
                  <Ionicons
                    name="search-outline"
                    size={32}
                    color="rgba(201,165,114,0.3)"
                  />
                  <Text
                    style={{
                      fontSize: 13,
                      color: COLORS.textTertiary,
                      marginTop: 8,
                    }}
                  >
                    {t("wallet.noBanksFound", {
                      defaultValue: "Không tìm thấy ngân hàng",
                    })}
                  </Text>
                </View>
              }
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={s.bankRow}
                  onPress={() => {
                    setSelectedBank(item);
                    setBankPickerOpen(false);
                    setBankSearch("");
                  }}
                >
                  {item.logo ? (
                    <Image
                      source={{ uri: item.logo }}
                      style={s.bankLogo}
                      resizeMode="contain"
                    />
                  ) : (
                    <View style={s.bankLogoFallback}>
                      <Text style={s.bankLogoFallbackText}>
                        {(item.short_name || item.code || "B")
                          .slice(0, 2)
                          .toUpperCase()}
                      </Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={s.bankName}>{item.name}</Text>
                    <Text style={s.bankCode}>
                      {item.short_name || item.code}
                    </Text>
                  </View>
                </TouchableOpacity>
              )}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </ImageBackground>
  );
};

// ─── Sub-components ────────────────────────────────────────────────────────

function DetailRow({
  label,
  value,
  last,
}: {
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[s.detailRow, last && s.detailRowLast]}>
      <Text style={s.detailRowLabel}>{label}</Text>
      <Text style={s.detailRowValue}>{value}</Text>
    </View>
  );
}

// ─── Styles ────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: COLORS.background },

  // Header
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

  // Loading / Error
  centered: { flex: 1, justifyContent: "center", alignItems: "center" },
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

  // ── Balance Card ──
  balanceSection: { paddingHorizontal: SPACING.lg, paddingTop: SPACING.lg },
  balanceCard: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.2)",
    shadowColor: "rgba(201, 165, 114, 0.3)",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceTop: { marginBottom: 16 },
  balanceLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: COLORS.textSecondary,
    marginBottom: 6,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  balanceAmount: { fontSize: 34, fontWeight: "800", color: COLORS.textPrimary },

  breakdownRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(201, 165, 114, 0.06)",
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
  },
  breakdownItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  breakdownDot: { width: 8, height: 8, borderRadius: 4 },
  breakdownLabel: {
    fontSize: 11,
    color: COLORS.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  breakdownValue: {
    fontSize: 14,
    fontWeight: "700",
    color: COLORS.textPrimary,
    marginTop: 2,
  },
  breakdownDivider: {
    width: 1,
    height: 32,
    backgroundColor: "rgba(201, 165, 114, 0.2)",
    marginHorizontal: 12,
  },

  actionRow: {
    flexDirection: "row",
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 14,
    borderRadius: 14,
  },
  topupBtn: {
    backgroundColor: "#2563EB",
  },
  withdrawActionBtn: {
    backgroundColor: COLORS.accent,
  },
  actionBtnText: { color: "#fff", fontWeight: "700", fontSize: 15 },
  withdrawBtnDisabled: { backgroundColor: "rgba(201, 165, 114, 0.35)" },
  withdrawHint: {
    marginTop: 10,
    fontSize: 12,
    color: COLORS.textTertiary,
    textAlign: "center",
    lineHeight: 17,
    paddingHorizontal: 8,
  },

  quickAmountRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  quickAmountChip: {
    flex: 1,
    backgroundColor: "rgba(37, 99, 235, 0.08)",
    borderRadius: 10,
    paddingVertical: 10,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.16)",
  },
  quickAmountChipActive: {
    backgroundColor: "#2563EB",
    borderColor: "#2563EB",
  },
  quickAmountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2563EB",
  },
  quickAmountTextActive: {
    color: "#fff",
  },
  topupInfoBox: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginTop: 16,
    padding: 12,
    backgroundColor: "rgba(37, 99, 235, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.12)",
  },
  topupInfoText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: "#5f5341", // Darkened explicitly from COLORS.textSecondary for higher contrast
  },
  topupSubmitBtn: {
    marginTop: 20,
    backgroundColor: "#2563EB",
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },

  // ── Info banner ──
  infoBanner: {
    flexDirection: "row",
    gap: 8,
    alignItems: "flex-start",
    marginHorizontal: SPACING.lg,
    marginTop: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(201, 165, 114, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.1)",
  },
  infoBannerText: {
    flex: 1,
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.textSecondary,
  },

  // ── Transactions section ──
  txSection: { paddingHorizontal: SPACING.lg, marginTop: 20 },
  sectionHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  sectionHeaderActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: COLORS.textPrimary,
    marginBottom: 14,
  },
  txWarn: { fontSize: 13, color: COLORS.accent, marginBottom: SPACING.sm },
  headerFilterBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.22)",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.92)",
  },
  headerFilterBtnActive: {
    borderColor: COLORS.accent,
    backgroundColor: "rgba(236, 182, 19, 0.16)",
  },
  filterActiveDot: {
    position: "absolute",
    top: 5,
    right: 5,
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: COLORS.accent,
    borderWidth: 1,
    borderColor: "#fff",
  },

  txFilterOverlay: {
    flex: 1,
    backgroundColor: "rgba(17, 24, 39, 0.28)",
    justifyContent: "flex-end",
  },
  txFilterSheet: {
    backgroundColor: "#FFF9EE",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.18)",
    padding: SPACING.lg,
    paddingBottom: Math.max(16, SPACING.md),
  },
  txFilterHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  txFilterTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: COLORS.textPrimary,
  },
  txFilterOption: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.14)",
    backgroundColor: "rgba(255,255,255,0.85)",
    marginTop: 8,
  },
  txFilterOptionActive: {
    backgroundColor: "rgba(236, 182, 19, 0.14)",
    borderColor: COLORS.accent,
  },
  txFilterOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: COLORS.textSecondary,
  },
  txFilterOptionTextActive: {
    color: COLORS.accentDark,
    fontWeight: "700",
  },
  txFilterFooter: {
    flexDirection: "row",
    gap: 10,
    marginTop: 16,
  },
  txFilterSafeFooter: {
    marginTop: 4,
  },
  txFilterResetBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.28)",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.8)",
  },
  txFilterResetText: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: "700",
  },
  txFilterApplyBtn: {
    flex: 1,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    backgroundColor: COLORS.accent,
  },
  txFilterApplyText: {
    fontSize: 14,
    color: COLORS.primaryDark,
    fontWeight: "800",
  },

  emptyState: { alignItems: "center", paddingVertical: 40, gap: 10 },
  emptyText: { fontSize: 14, color: COLORS.textTertiary },

  txCard: {
    marginBottom: 10,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.92)",
    borderWidth: 1,
    borderColor: "rgba(201, 165, 114, 0.12)",
    padding: 14,
  },
  txRow: { flexDirection: "row", alignItems: "center" },
  txIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  txContent: { flex: 1 },
  txHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 8,
  },
  txType: {
    fontWeight: "700",
    color: COLORS.textPrimary,
    fontSize: 14,
    flex: 1,
  },
  txBadge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999 },
  txBadgeText: { fontSize: 11, fontWeight: "700" },
  txDesc: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 4,
    lineHeight: 17,
  },
  txFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
  },
  txAmount: { fontSize: 15, fontWeight: "700", color: COLORS.accentDark },
  txDate: { fontSize: 11, color: COLORS.textTertiary },

  // ── Withdraw modal ──
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

  withdrawBalanceCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(5, 150, 105, 0.06)",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: "rgba(5, 150, 105, 0.12)",
  },
  withdrawBalanceLabel: { fontSize: 13, fontWeight: "600", color: "#059669" },
  withdrawBalanceAmount: { fontSize: 18, fontWeight: "800", color: "#059669" },

  fieldLabel: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.textSecondary,
    marginBottom: 6,
    marginTop: 14,
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  fieldHint: {
    fontSize: 11,
    color: COLORS.textTertiary,
    marginTop: 4,
    lineHeight: 16,
  },
  fieldLabelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  lookupBtn: {
    fontSize: 13,
    fontWeight: "700",
    color: COLORS.accent,
    marginTop: 14,
    marginBottom: 6,
  },
  inlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 14,
    padding: 12,
    backgroundColor: "rgba(220, 38, 38, 0.06)",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.12)",
  },
  inlineErrorText: { flex: 1, fontSize: 13, color: "#DC2626", lineHeight: 19 },
  input: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 13,
    fontSize: 16,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.white,
    justifyContent: "center",
  },

  selectedBankRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  selectedBankInfo: { flex: 1 },
  selectedBankName: {
    fontSize: 15,
    color: COLORS.textPrimary,
    fontWeight: "600",
  },
  selectedBankCode: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },

  submitBtn: {
    marginTop: 24,
    backgroundColor: COLORS.accent,
    paddingVertical: 15,
    borderRadius: 14,
    alignItems: "center",
  },
  submitBtnText: { color: "#fff", fontWeight: "700", fontSize: 16 },

  // ── Bank picker ──
  pickerOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
    justifyContent: "flex-end",
  },
  pickerSheet: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: SPACING.lg,
    maxHeight: "70%",
    paddingTop: 12,
  },
  pickerHandle: {
    alignSelf: "center",
    width: 44,
    height: 5,
    borderRadius: 999,
    backgroundColor: "rgba(0,0,0,0.12)",
    marginBottom: 14,
  },
  pickerTitle: { fontSize: 17, fontWeight: "700", marginBottom: 12 },

  bankSearchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(0,0,0,0.04)",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 12,
  },
  bankSearchInput: {
    flex: 1,
    fontSize: 15,
    color: COLORS.textPrimary,
    paddingVertical: 0,
  },

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
  bankName: { fontSize: 15, color: COLORS.textPrimary },
  bankCode: { fontSize: 12, color: COLORS.textTertiary, marginTop: 2 },

  // ── Detail modal ──
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
  detailHandleTouchArea: {
    alignItems: "center",
    paddingTop: 4,
    paddingBottom: 8,
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
  detailScrollContent: { paddingHorizontal: SPACING.lg, paddingBottom: 8 },

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
  detailTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  detailCodeChip: {
    marginTop: 8,
    alignSelf: "flex-start",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: "rgba(201, 165, 114, 0.12)",
    overflow: "hidden",
    color: COLORS.accentDark,
    fontSize: 12,
    fontWeight: "700",
  },
  detailAmount: {
    fontSize: 28,
    fontWeight: "800",
    color: COLORS.accentDark,
    marginTop: SPACING.md,
  },
  detailMetaLine: { marginTop: 8, fontSize: 13, color: COLORS.textSecondary },

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
  detailRowLast: { borderBottomWidth: 0, paddingBottom: 0 },
  detailRowLabel: {
    fontSize: 12,
    fontWeight: "700",
    color: COLORS.textSecondary,
    textTransform: "uppercase",
    marginBottom: 4,
    letterSpacing: 0.3,
  },
  detailRowValue: { fontSize: 15, lineHeight: 22, color: COLORS.textPrimary },

  detailDescBox: {
    backgroundColor: "rgba(201, 165, 114, 0.08)",
    borderRadius: 14,
    padding: SPACING.md,
  },
  detailDescText: { fontSize: 15, lineHeight: 24, color: COLORS.textPrimary },

  detailBankIdentity: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: SPACING.md,
    marginBottom: 12,
    borderRadius: 16,
    backgroundColor: "rgba(201, 165, 114, 0.08)",
  },
  detailBankName: {
    fontSize: 15,
    fontWeight: "700",
    color: COLORS.textPrimary,
  },
  detailBankCode: { fontSize: 12, color: COLORS.textSecondary, marginTop: 3 },
});

export default WalletScreen;
