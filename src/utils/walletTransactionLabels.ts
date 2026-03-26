import type { TFunction } from "i18next";

const TYPE_FALLBACK_VI: Record<string, string> = {
  withdraw: "Rút tiền",
  escrow_lock: "Giữ cọc kế hoạch",
  escrow_refund: "Hoàn cọc",
  penalty_applied: "Phạt (trừ ví)",
  penalty_received: "Nhận phạt",
  penalty_refunded: "Hoàn phạt",
};

const STATUS_FALLBACK_VI: Record<string, string> = {
  pending: "Đang xử lý",
  completed: "Hoàn tất",
  failed: "Thất bại",
  cancelled: "Đã hủy",
};

export function walletTransactionTypeLabel(
  type: string | undefined,
  t: TFunction,
): string {
  if (!type?.trim()) {
    return t("wallet.txType.unknown", { defaultValue: "Giao dịch" });
  }
  return t(`wallet.txType.${type}`, {
    defaultValue: TYPE_FALLBACK_VI[type] || type,
  });
}

export function walletTransactionStatusLabel(
  status: string | undefined,
  t: TFunction,
): string {
  if (!status?.trim()) {
    return t("wallet.txStatus.unknown", { defaultValue: "—" });
  }
  return t(`wallet.txStatus.${status}`, {
    defaultValue: STATUS_FALLBACK_VI[status] || status,
  });
}

export function walletReferenceContextLabel(
  referenceType: string | undefined,
  t: TFunction,
): string | null {
  if (referenceType === "planner_deposit") {
    return t("wallet.refPlannerDeposit", {
      defaultValue: "Liên quan cọc kế hoạch",
    });
  }
  return null;
}
