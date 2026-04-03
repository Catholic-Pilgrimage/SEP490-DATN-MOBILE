/**
 * Pilgrim wallet — khớp routes/wallet.routes.js + validators/wallet.validator.js
 */

/** Query `type` trên GET /wallet/transactions */
export type WalletTransactionTypeFilter =
  | "withdraw"
  | "escrow_lock"
  | "escrow_refund"
  | "penalty_applied"
  | "penalty_received"
  | "penalty_refunded";

/** Query `status` trên GET /wallet/transactions */
export type WalletTransactionStatusFilter =
  | "pending"
  | "completed"
  | "failed"
  | "cancelled";

export interface WalletInfo {
  id: string;
  balance: number;
  locked_balance: number;
  total_balance: number;
  status?: string;
}

export interface WalletTransaction {
  id: string;
  wallet_id?: string;
  type?: string;
  amount: number;
  status?: string;
  code?: string;
  created_at?: string;
  updated_at?: string;
  /** Mô tả từ BE (nếu có) */
  description?: string;
  reference_type?: string;
  reference_id?: string;
  bank_info?: {
    account_number?: string;
    account_name?: string;
    bank_code?: string;
  } | null;
}

export interface WalletTransactionsResult {
  transactions: WalletTransaction[];
  total: number;
  totalPages: number;
  currentPage: number;
}

export interface WalletBankOption {
  bin: string;
  name: string;
  short_name?: string;
  code: string;
  logo?: string;
}

export interface WalletWithdrawRequest {
  amount: number;
  account_number: string;
  account_name: string;
  bank_code: string;
}

export interface WalletTransactionsQuery {
  page?: number;
  /** BE: 1–100 */
  limit?: number;
  type?: WalletTransactionTypeFilter;
  status?: WalletTransactionStatusFilter;
}
