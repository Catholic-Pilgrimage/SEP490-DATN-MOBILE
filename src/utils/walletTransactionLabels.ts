import type { TFunction } from "i18next";

const TYPE_FALLBACK_VI: Record<string, string> = {
  withdraw: "Rút tiền",
  topup: "Nạp tiền",
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

/**
 * Map planner transaction label from backend to i18n key
 * Backend returns Vietnamese labels, we need to map them to i18n keys
 */
export function plannerTransactionLabel(
  label: string | undefined,
  t: TFunction,
): string {
  if (!label?.trim()) {
    return t("planner.txLabels.unknown", { defaultValue: "Giao dịch" });
  }

  // Map Vietnamese labels from backend to i18n keys
  const labelMap: Record<string, string> = {
    "Đóng tiền cam kết": "deposit_locked",
    "Hoàn cọc": "deposit_refunded",
    "Bị trừ tiền phạt": "penalty_deducted",
    "Owner nhận tiền phạt": "penalty_received",
  };

  const key = labelMap[label];
  if (key) {
    return t(`planner.txLabels.${key}`, { defaultValue: label });
  }

  // Return original label if no mapping found
  return label;
}

/**
 * Map planner transaction status to i18n
 */
export function plannerTransactionStatus(
  status: string | undefined,
  t: TFunction,
): string {
  if (!status?.trim()) {
    return "";
  }

  const statusLower = status.toLowerCase();
  return t(`planner.txStatus.${statusLower}`, { defaultValue: status });
}
