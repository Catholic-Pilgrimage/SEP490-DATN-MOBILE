import type { GuideReviewerInfo } from "../../../types/guide/review-tracking.types";

export const pickFirstNonEmpty = (...values: (string | null | undefined)[]) =>
  values.find((value) => !!value?.trim())?.trim() ?? null;

export const isUuidLike = (value?: string | null) =>
  !!value &&
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value,
  );

export const getGuideReviewerName = (
  reviewer?: GuideReviewerInfo | null,
  reviewedBy?: string | null,
) => {
  const resolvedName = pickFirstNonEmpty(
    reviewer?.full_name,
    reviewer?.fullName,
    reviewer?.display_name,
    reviewer?.displayName,
    reviewer?.name,
  );

  if (resolvedName) return resolvedName;
  if (reviewedBy && !isUuidLike(reviewedBy)) return reviewedBy.trim();

  return null;
};

export const getGuideReviewerEmail = (reviewer?: GuideReviewerInfo | null) =>
  pickFirstNonEmpty(reviewer?.email);

export const formatGuideReviewDateTime = (
  dateString?: string | null,
  locale = "vi-VN",
) => {
  if (!dateString) return null;

  const parsed = new Date(dateString);
  if (Number.isNaN(parsed.getTime())) return null;

  const datePart = parsed.toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
  const timePart = parsed.toLocaleTimeString(locale, {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${datePart} • ${timePart}`;
};
