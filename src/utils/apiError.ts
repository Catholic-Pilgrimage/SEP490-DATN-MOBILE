/**
 * Lấy chuỗi lỗi hiển thị cho user từ lỗi Axios / API / Error thường.
 * Ưu tiên message đã gắn bởi apiClient (transformError), sau đó body thô nếu còn.
 */
export function getApiErrorMessage(
  error: unknown,
  fallback = "Đã xảy ra lỗi không xác định.",
): string {
  if (error && typeof error === "object") {
    const e = error as {
      response?: { data?: unknown };
      message?: string;
    };
    if (typeof e.message === "string" && e.message.trim()) {
      return e.message.trim();
    }
    const raw = e.response?.data;
    let data: unknown = raw;
    if (typeof raw === "string") {
      try {
        data = JSON.parse(raw);
      } catch {
        data = undefined;
      }
    }
    if (data && typeof data === "object") {
      const d = data as {
        message?: unknown;
        error?: string | { message?: unknown };
        title?: string;
        details?: unknown;
        errors?: unknown;
      };
      const fromMsg = normalizeBodyMessage(d.message);
      if (fromMsg) return fromMsg;
      const fromDetails = normalizeDetailMessages(d.details ?? d.errors);
      if (fromDetails) return fromDetails;
      if (typeof d.error === "string" && d.error.trim()) return d.error.trim();
      const fromErr =
        typeof d.error === "object" && d.error !== null
          ? normalizeBodyMessage(
              (d.error as { message?: unknown }).message,
            )
          : null;
      if (fromErr) return fromErr;
      if (typeof d.title === "string" && d.title.trim()) return d.title.trim();
    }
  }
  return fallback;
}

function normalizeBodyMessage(message: unknown): string | null {
  if (typeof message === "string" && message.trim()) return message.trim();
  if (Array.isArray(message)) {
    const parts = message
      .map((item) =>
        typeof item === "string"
          ? item
          : (item as { message?: string })?.message || "",
      )
      .filter(Boolean);
    return parts.length ? parts.join(". ") : null;
  }
  return null;
}

function normalizeDetailMessages(details: unknown): string | null {
  if (!details) return null;

  if (Array.isArray(details)) {
    const parts = details
      .map((item) =>
        typeof item === "string"
          ? item
          : (item as { message?: string; msg?: string })?.message ||
            (item as { msg?: string })?.msg ||
            "",
      )
      .filter(Boolean);
    return parts.length ? parts.join(". ") : null;
  }

  if (typeof details === "object") {
    const parts = Object.values(details as Record<string, unknown>)
      .map((value) => normalizeBodyMessage(value))
      .filter((value): value is string => Boolean(value));
    return parts.length ? parts.join(". ") : null;
  }

  return null;
}
