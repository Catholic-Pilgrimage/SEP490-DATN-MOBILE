/**
 * Pilgrim Wallet API — /api/wallet (WalletController + wallet.validator)
 * GET / — thông tin ví
 * GET /transactions — lịch sử (page, limit, type, status)
 * GET /transactions/:id — chi tiết giao dịch (UUID)
 * POST /withdraw — rút tiền PayOS Chi
 * GET /banks — danh sách ngân hàng
 */

import { ApiResponse } from "../../../types/api.types";
import {
  WalletBankOption,
  WalletInfo,
  WalletTransaction,
  WalletTransactionsQuery,
  WalletTransactionsResult,
  WalletWithdrawRequest,
} from "../../../types/pilgrim/wallet.types";
import apiClient from "../apiClient";
import { PILGRIM_ENDPOINTS } from "../endpoints";

export const getWalletInfo = async (): Promise<ApiResponse<WalletInfo>> => {
  const response = await apiClient.get<ApiResponse<WalletInfo>>(
    PILGRIM_ENDPOINTS.WALLET.INFO,
  );
  return response.data;
};

export const getWalletTransactions = async (
  params?: WalletTransactionsQuery,
): Promise<ApiResponse<WalletTransactionsResult>> => {
  const response = await apiClient.get<ApiResponse<WalletTransactionsResult>>(
    PILGRIM_ENDPOINTS.WALLET.TRANSACTIONS,
    { params },
  );
  return response.data;
};

export const getWalletTransactionById = async (
  id: string,
): Promise<ApiResponse<WalletTransaction>> => {
  const response = await apiClient.get<ApiResponse<WalletTransaction>>(
    PILGRIM_ENDPOINTS.WALLET.TRANSACTION_DETAIL(id),
  );
  return response.data;
};

export const requestWalletWithdrawal = async (
  body: WalletWithdrawRequest,
): Promise<ApiResponse<unknown>> => {
  const response = await apiClient.post<ApiResponse<unknown>>(
    PILGRIM_ENDPOINTS.WALLET.WITHDRAW,
    body,
  );
  return response.data;
};

export const getWalletBanks = async (): Promise<ApiResponse<WalletBankOption[]>> => {
  const response = await apiClient.get<ApiResponse<WalletBankOption[]>>(
    PILGRIM_ENDPOINTS.WALLET.BANKS,
  );
  return response.data;
};

const pilgrimWalletApi = {
  getWalletInfo,
  getWalletTransactions,
  getWalletTransactionById,
  requestWalletWithdrawal,
  getWalletBanks,
};

export default pilgrimWalletApi;
