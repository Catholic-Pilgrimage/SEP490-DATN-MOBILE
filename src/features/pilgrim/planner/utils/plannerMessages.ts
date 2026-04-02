/**
 * Chuẩn hóa thông báo lỗi planner từ BE (tiếng Anh) → tiếng Việt cho Toast.
 * Không sửa BE — chỉ lớp hiển thị mobile.
 */
export function translatePlannerStatusError(raw: string | undefined | null): string {
  const m = (raw || "").trim();
  if (!m) return "";

  const lower = m.toLowerCase();

  if (lower.includes("fully locked") || lower.includes("must be fully locked")) {
    return "Nhóm cần khóa hành trình (đủ thành viên và quy tắc server) trước khi bắt đầu.";
  }
  if (lower.includes("at least 2 joined") || lower.includes("realgroup")) {
    return "Cần ít nhất 2 người đã tham gia (owner + thành viên) trước khi bắt đầu chuyến nhóm.";
  }
  if (lower.includes("incomplete schedule") || lower.includes("missing days")) {
    return "Lịch trình chưa đủ: mỗi ngày trong khoảng đi cần có ít nhất một điểm dừng.";
  }
  if (lower.includes("not in planning")) {
    return "Kế hoạch không ở trạng thái đang lên kế hoạch.";
  }
  if (lower.includes("forbidden") || lower.includes("owner")) {
    return "Chỉ chủ đoàn mới thực hiện được thao tác này.";
  }

  return m;
}
