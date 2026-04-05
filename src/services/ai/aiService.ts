/**
 * AI Services
 * Shared AI features for both Local Guide and Pilgrim flows.
 */

import { apiClient } from '../api/apiClient';
import { AI_ENDPOINTS } from '../api/endpoints';



export interface SuggestRouteRequest {
  site_ids: string[]; 
  start_date: string; 
  max_days: number; 
  transport_mode: 'car' | 'motorbike' | 'bus' | 'walking';
  priority: 'time' | 'distance' | 'balanced' | 'spiritual';
  number_of_people: number;
  patron_saint?: string;
}

export interface ItineraryItem {
  site_id: string;
  site_name: string;
  day_number: number;
  order_index: number;
  estimated_time: string; 
  rest_duration: string; 
  travel_time_minutes: number;
  note: string;
}

export interface DailyItinerary {
  day_number: number;
  theme: string;
  items: ItineraryItem[];
}

export interface SuggestRouteResponse {
  success: boolean;
  data: {
    planner: {
      name: string;
      estimated_days: number;
      number_of_people: number;
      transportation: string;
      start_date: string;
      end_date: string;
    };
    daily_itinerary: DailyItinerary[];
    summary: string;
    total_estimated_km: number;
    tips: string[];
    metadata: {
      generated_by: string;
      sites_count: number;
      transport_mode: string;
      priority: string;
      compatible_with: string;
    };
  };
  message?: string;
}

export interface GenerateArticleRequest {
  topic?: string; 
  language?: 'vi' | 'en';
  length?: 'short' | 'medium' | 'long';
  style?: 'formal' | 'casual' | 'devotional' | 'historical' | 'storytelling';
}

export interface GenerateArticleResponse {
  success: boolean;
  data: {
    title: string;
    summary: string; 
    content: string;
    tags: string[];
    metadata: {
      generated_by: string;
      language: string;
      length: string;
      style: string;
      topic: string;
    };
  };
  message?: string;
}

export interface SummarizeReviewsRequest {

}

export interface SummarizeReviewsResponse {
  success: boolean;
  data: {
    site_name: string;
    total_reviews: number;
    average_rating: number;
    reviews_analyzed: number; 
    overall_summary: string;
    strengths: string[]; 
    weaknesses: string[]; 
    sentiment: 'positive' | 'neutral' | 'negative';
    highlights: string[]; 
    metadata: {
      generated_by: string;
      language: string;
      reviews_analyzed: number;
    };
  };
  message?: string;
}

export interface SuggestPrayerRequest {
  planner_item_id?: string; 
  planner_id?: string;
  current_text?: string;
  mood?: string; 
  intention?: string;
}

export interface SuggestPrayerResponse {
  success: boolean;
  data: {
    prayer_text: string;
    prayer_type: string;
    context: {
      site_name?: string;
      planner_name?: string;
      detected_mood?: string;
      detected_theme?: string;
    };
    suggestions: string[];
    metadata: {
      generated_by: string;
      language: string;
    };
  };
  message?: string;
}

export interface SuggestEventsRequest {
  current_date?: string;
  count?: number;
}

export interface EventSuggestion {
  name: string;
  name_en: string;
  description: string;
  start_date: string;
  end_date: string;
  start_time: string; 
  end_time: string; 
  location: string;
  category: 'mass' | 'procession' | 'adoration' | 'feast' | 'retreat' | 'pilgrimage' | 'charity' | 'cultural' | 'other';
  relevance: string;
}

export interface SuggestEventsResponse {
  success: boolean;
  data: {
    site_name: string;
    current_date: string;
    liturgical_season: string; 
    liturgical_season_en: string; 
    season_description: string;
    suggestions: EventSuggestion[]; 
    metadata: {
      generated_by: string;
      count: number;
    };
  };
  message?: string;
}

// ============================================
// AI Service Functions
// ============================================

/**
 * AI Route Suggestion (Pilgrim)
 * Pilgrim chọn nhiều địa điểm, AI sẽ sắp xếp lộ trình tối ưu theo ngày
 * @param data - Route suggestion request with site IDs and preferences
 * @returns Optimized daily itinerary with travel times and suggestions
 */
export const suggestRoute = async (
  data: SuggestRouteRequest,
): Promise<SuggestRouteResponse> => {
  const response = await apiClient.post<SuggestRouteResponse>(
    AI_ENDPOINTS.SUGGEST_ROUTE,
    data,
  );
  return response.data;
};

/**
 * AI Article Writer (Local Guide only)
 * Tạo bài viết mô tả địa điểm hành hương với nhiều phong cách
 * @param data - Article generation request with optional topic and style preferences
 * @returns Generated article with title, summary, content, and tags
 */
export const generateArticle = async (
  data: GenerateArticleRequest,
): Promise<GenerateArticleResponse> => {
  const response = await apiClient.post<GenerateArticleResponse>(
    AI_ENDPOINTS.GENERATE_ARTICLE,
    data,
  );
  return response.data;
};

/**
 * AI Review Summarizer (Local Guide only)
 * Tóm tắt đánh giá gần đây
 * @returns AI-generated review summary with insights
 */
export const summarizeReviews = async (): Promise<SummarizeReviewsResponse> => {
  const response = await apiClient.post<SummarizeReviewsResponse>(
    AI_ENDPOINTS.SUMMARIZE_REVIEWS,
  );
  return response.data;
};

/**
 * AI Event Recommender (Local Guide only)
 * Gợi ý sự kiện theo mùa phụng vụ
 * @param data - Optional current_date and count parameters
 * @returns Event suggestions aligned with liturgical season
 */
export const suggestEvents = async (
  data?: SuggestEventsRequest,
): Promise<SuggestEventsResponse> => {
  const response = await apiClient.post<SuggestEventsResponse>(
    AI_ENDPOINTS.SUGGEST_EVENTS,
    data,
  );
  return response.data;
};

/**
 * AI Prayer Suggestion (Pilgrim)
 * Gợi ý lời nguyện cho nhật ký tâm linh
 * @param data - Prayer suggestion request with planner context and current state
 * @returns AI-generated prayer text with context and suggestions
 */
export const suggestPrayer = async (
  data: SuggestPrayerRequest,
): Promise<SuggestPrayerResponse> => {
  const response = await apiClient.post<SuggestPrayerResponse>(
    AI_ENDPOINTS.SUGGEST_PRAYER,
    data,
  );
  return response.data;
};

// Export all AI services
export const aiService = {
  suggestRoute,
  generateArticle,
  summarizeReviews,
  suggestEvents,
  suggestPrayer,
};

export default aiService;
