/**
 * Guide Reviews API
 * Handles review list operations for Local Guide
 *
 * Endpoints:
 * - GET /api/local-guide/reviews - List reviews for assigned site
 */

import { ApiResponse } from "../../../types/api.types";
import {
  GetReviewsParams,
  Review,
  ReviewListData,
  ReviewPagination,
  ReviewReplyRequest,
  ReviewSummary,
} from "../../../types/guide";
import apiHttp from "../apiClient";
import { GUIDE_ENDPOINTS } from "../endpoints";

type RawReview = Record<string, unknown>;
type RawReviewSection = {
  summary?: RawReview;
  reviews?: RawReview[];
  pagination?: RawReview;
};
type RawReviewPayload = {
  site_reviews?: RawReviewSection;
  nearby_place_reviews?: RawReviewSection;
};

interface ReviewReplyTarget {
  reviewId: string;
  targetType?: Review["targetType"];
  nearbyPlaceId?: string;
}

const pickString = (...values: unknown[]) => {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value;
    }
  }

  return undefined;
};

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
};

const normalizePagination = (
  raw?: RawReview,
  fallbackPage = 1,
  fallbackLimit = 10,
): ReviewPagination => {
  const page = toNumber(raw?.page, fallbackPage);
  const limit = toNumber(raw?.limit, fallbackLimit);
  const totalItems = toNumber(raw?.totalItems ?? raw?.total, 0);
  const totalPages = toNumber(
    raw?.totalPages ?? raw?.total_pages,
    limit > 0 ? Math.max(1, Math.ceil(totalItems / limit)) : 1,
  );

  return {
    page,
    limit,
    totalItems,
    totalPages,
  };
};

const normalizeSummary = (raw?: RawReview): ReviewSummary | undefined => {
  if (!raw) return undefined;

  return {
    avgRating: toNumber(raw.avg_rating ?? raw.avgRating, 0),
    totalReviews: toNumber(raw.total_reviews ?? raw.totalReviews, 0),
    ratingDistribution:
      raw.rating_distribution &&
      typeof raw.rating_distribution === "object" &&
      !Array.isArray(raw.rating_distribution)
        ? (raw.rating_distribution as Record<string, number>)
        : undefined,
  };
};

const normalizeReview = (
  raw: RawReview,
  forcedTargetType?: Review["targetType"],
): Review => {
  const reviewer = (raw.reviewer as RawReview | undefined) || undefined;
  const nearbyPlace = (raw.nearby_place as RawReview | undefined) || undefined;
  const site = (raw.site as RawReview | undefined) || undefined;
  const nestedReply =
    (raw.reply as RawReview | undefined) ||
    (raw.response_data as RawReview | undefined) ||
    (raw.responseData as RawReview | undefined) ||
    undefined;

  const nearbyPlaceId = pickString(
    raw.nearby_place_id,
    raw.nearbyPlaceId,
    nearbyPlace?.id,
  );
  const nearbyPlaceName = pickString(
    raw.nearby_place_name,
    raw.nearbyPlaceName,
    nearbyPlace?.name,
  );

  const targetTypeRaw =
    pickString(
      raw.target_type,
      raw.targetType,
      raw.review_type,
      raw.reviewType,
      raw.entity_type,
      raw.entityType,
      raw.scope,
    ) || undefined;

  const targetType: Review["targetType"] =
    forcedTargetType ||
    (targetTypeRaw === "nearby_place" || nearbyPlaceId ? "nearby_place" : "site");

  return {
    id: String(raw.id || ""),
    pilgrimId: String(
      raw.pilgrim_id ||
        raw.pilgrimId ||
        raw.user_id ||
        raw.userId ||
        reviewer?.id ||
        "",
    ),
    pilgrimName: String(
      reviewer?.full_name ||
        reviewer?.fullName ||
        raw.pilgrim_name ||
        raw.pilgrimName ||
        raw.user_name ||
        raw.userName ||
        "Khach hanh huong",
    ),
    pilgrimAvatar: pickString(
      reviewer?.avatar_url,
      reviewer?.avatarUrl,
      raw.pilgrim_avatar,
      raw.pilgrimAvatar,
      raw.user_avatar,
      raw.userAvatar,
    ),
    siteId: String(raw.site_id || raw.siteId || site?.id || ""),
    siteName: String(raw.site_name || raw.siteName || site?.name || ""),
    targetType,
    nearbyPlaceId,
    nearbyPlaceName,
    rating: toNumber(raw.rating, 0),
    content: String(raw.feedback || raw.content || raw.comment || raw.review || ""),
    response: pickString(
      raw.response,
      nestedReply?.response,
      nestedReply?.content,
      raw.reply_content,
      raw.replyContent,
      raw.manager_response,
      raw.managerResponse,
      raw.guide_reply,
      raw.guideReply,
    ),
    createdAt: String(raw.created_at || raw.createdAt || ""),
    responseUpdatedAt: pickString(
      raw.response_updated_at,
      raw.responseUpdatedAt,
      raw.reply_updated_at,
      raw.replyUpdatedAt,
      nestedReply?.updated_at,
      nestedReply?.updatedAt,
      nestedReply?.created_at,
      nestedReply?.createdAt,
    ),
  };
};

const sortReviews = (reviews: Review[], sort?: string) => {
  const mode = (sort || "newest").toLowerCase();
  const sorted = [...reviews];

  sorted.sort((a, b) => {
    const aTime = new Date(a.createdAt).getTime();
    const bTime = new Date(b.createdAt).getTime();

    if (mode === "highest") {
      if (b.rating !== a.rating) {
        return b.rating - a.rating;
      }
      return bTime - aTime;
    }

    if (mode === "lowest") {
      if (a.rating !== b.rating) {
        return a.rating - b.rating;
      }
      return bTime - aTime;
    }

    if (mode === "oldest") {
      return aTime - bTime;
    }

    return bTime - aTime;
  });

  return sorted;
};

const resolveReplyEndpoint = (target: ReviewReplyTarget) =>
  target.targetType === "nearby_place" || target.nearbyPlaceId
    ? GUIDE_ENDPOINTS.LOCAL_GUIDE_REVIEWS.NEARBY_PLACE_REPLY(target.reviewId)
    : GUIDE_ENDPOINTS.LOCAL_GUIDE_REVIEWS.SITE_REPLY(target.reviewId);

export const getReviews = async (
  params?: GetReviewsParams,
): Promise<ApiResponse<ReviewListData>> => {
  const response = await apiHttp.get<ApiResponse<RawReviewPayload>>(
    GUIDE_ENDPOINTS.LOCAL_GUIDE_REVIEWS.LIST,
    { params },
  );
  const payload = response.data;
  const page = Math.max(1, params?.page ?? 1);
  const limit = Math.max(1, params?.limit ?? 10);

  const siteSection = payload.data?.site_reviews;
  const nearbySection = payload.data?.nearby_place_reviews;

  const siteReviews = (siteSection?.reviews ?? []).map((item) =>
    normalizeReview(item, "site"),
  );
  const nearbyPlaceReviews = (nearbySection?.reviews ?? []).map((item) =>
    normalizeReview(item, "nearby_place"),
  );

  const sitePagination = normalizePagination(siteSection?.pagination, page, limit);
  const nearbyPlacePagination = normalizePagination(
    nearbySection?.pagination,
    page,
    limit,
  );
  const siteSummary = normalizeSummary(siteSection?.summary);

  const selectedReviews =
    params?.type === "site"
      ? siteReviews
      : params?.type === "nearby_place"
        ? nearbyPlaceReviews
        : [...siteReviews, ...nearbyPlaceReviews];

  const sortedReviews = sortReviews(selectedReviews, params?.sort);
  const startIndex = (page - 1) * limit;
  const flattenedReviews = sortedReviews.slice(startIndex, startIndex + limit);

  const totalItems =
    params?.type === "site"
      ? sitePagination.totalItems
      : params?.type === "nearby_place"
        ? nearbyPlacePagination.totalItems
        : sitePagination.totalItems + nearbyPlacePagination.totalItems;

  return {
    ...payload,
    data: {
      data: flattenedReviews,
      pagination: {
        page,
        limit,
        totalItems,
        totalPages: Math.max(1, Math.ceil(totalItems / limit)),
      },
      siteReviews,
      nearbyPlaceReviews,
      siteSummary,
      sitePagination,
      nearbyPlacePagination,
    },
  };
};

export const createReply = async (
  target: ReviewReplyTarget,
  data: ReviewReplyRequest,
): Promise<ApiResponse<Review>> => {
  const response = await apiHttp.post<ApiResponse<RawReview>>(
    resolveReplyEndpoint(target),
    { content: data.content },
  );

  return {
    ...response.data,
    data: response.data.data
      ? normalizeReview(response.data.data, target.targetType)
      : undefined,
  };
};

export const updateReply = async (
  target: ReviewReplyTarget,
  data: ReviewReplyRequest,
): Promise<ApiResponse<Review>> => {
  const response = await apiHttp.put<ApiResponse<RawReview>>(
    resolveReplyEndpoint(target),
    { content: data.content },
  );

  return {
    ...response.data,
    data: response.data.data
      ? normalizeReview(response.data.data, target.targetType)
      : undefined,
  };
};

export const deleteReply = async (
  target: ReviewReplyTarget,
): Promise<ApiResponse<null>> => {
  const response = await apiHttp.delete<ApiResponse<null>>(
    resolveReplyEndpoint(target),
  );
  return response.data;
};

const guideReviewApi = {
  getReviews,
  createReply,
  updateReply,
  deleteReply,
};

export default guideReviewApi;
