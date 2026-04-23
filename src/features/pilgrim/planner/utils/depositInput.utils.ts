/** Khớp BE: deposit_amount VND nguyên; tối thiểu cho nhóm theo quy sản phẩm. */
export const MIN_DEPOSIT_VND = 2000;
/** Khớp BE: tối đa (VND). */
export const MAX_DEPOSIT_VND = 50_000_000;
/** Nhóm: tỷ lệ phạt khi rời sau khi đã chốt (theo quy sản phẩm). */
export const MIN_GROUP_PENALTY_PERCENT = 10;
export const MAX_GROUP_PENALTY_PERCENT = 50;

export function parseVndInteger(input: string): number {
  const t = input.trim().replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
  if (t === "") return NaN;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : NaN;
}

/** Rỗng → 0; ngược lại số nguyên (dùng cho parse, validate riêng cho nhóm). */
export function parsePenaltyPercent(input: string): number {
  const t = input.trim();
  if (t === "") return 0;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : NaN;
}

export function isValidGroupDepositVnd(n: number): boolean {
  if (!Number.isFinite(n)) return false;
  const r = Math.round(n);
  return r >= MIN_DEPOSIT_VND && r <= MAX_DEPOSIT_VND;
}

export function isValidGroupPenaltyPercent(n: number): boolean {
  return (
    Number.isInteger(n) &&
    n >= MIN_GROUP_PENALTY_PERCENT &&
    n <= MAX_GROUP_PENALTY_PERCENT
  );
}
