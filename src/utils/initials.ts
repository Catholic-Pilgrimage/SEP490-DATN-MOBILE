/**
 * Chữ ký tắt từ họ tên (VN): chữ đầu mục đầu + chữ đầu mục cuối; một mục thì lấy tối đa 2 ký tự.
 */
export function getInitialsFromFullName(name: string, maxLen = 2): string {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0].charAt(0);
    const b = parts[parts.length - 1].charAt(0);
    return (a + b).toUpperCase();
  }
  return s.slice(0, Math.min(maxLen, s.length)).toUpperCase();
}
