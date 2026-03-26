/** Khớp BE: deposit_amount float 0–50_000_000 (VND nguyên). */
export const MAX_DEPOSIT_VND = 50_000_000;

export function parseVndInteger(input: string): number {
  const t = input.trim().replace(/\s/g, "").replace(/\./g, "").replace(/,/g, "");
  if (t === "") return NaN;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : NaN;
}

/** Rỗng → 0; ngược lại số nguyên 0–100. */
export function parsePenaltyPercent(input: string): number {
  const t = input.trim();
  if (t === "") return 0;
  const n = parseInt(t, 10);
  return Number.isFinite(n) ? n : NaN;
}
