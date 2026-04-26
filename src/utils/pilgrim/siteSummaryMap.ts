/**
 * Maps a site object from list/search/featured API (snake_case or mixed) to SiteSummary.
 */
import type { SiteSummary } from "../../types/pilgrim";

export function mapSiteSummaryFromApi(site: any): SiteSummary {
  return {
    id: site.id,
    name: site.name,
    address: site.address,
    coverImage: site.cover_image || site.coverImage || "",
    rating: site.rating || 0,
    reviewCount: site.review_count || site.reviewCount || 0,
    distance: site.distance,
    isFavorite: site.is_favorite || site.isFavorite || false,
    type: site.type,
    region: site.region,
    latitude: site.latitude || 0,
    longitude: site.longitude || 0,
    patronSaint: site.patron_saint || site.patronSaint || undefined,
    openingHours: site.opening_hours || site.openingHours || undefined,
    hasEvents:
      site.has_events === true ||
      site.has_events === "true" ||
      site.hasEvents === true ||
      site.hasEvents === "true" ||
      Number(site.event_count || site.eventCount || site.events_count || 0) > 0,
    eventCount: Number(
      site.event_count || site.eventCount || site.events_count || 0,
    ),
  };
}
