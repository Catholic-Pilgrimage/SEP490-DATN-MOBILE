/**
 * Environment Configuration
 *
 * Reads from .env file with EXPO_PUBLIC_ prefix
 * Includes fallback values to ensure build doesn't fail
 *
 * Note: API_CONFIG (BASE_URL, TIMEOUT) is defined in api.config.ts
 */

// Vietmap API Configuration
// Console: https://maps.vietmap.vn/console
const VIETMAP_TILEMAP_KEY =
  process.env.EXPO_PUBLIC_VIETMAP_TILEMAP_KEY ||
  "3c6b56cab2559a893244e06142b981787f5392c789195a4a";
const VIETMAP_SERVICES_KEY =
  process.env.EXPO_PUBLIC_VIETMAP_SERVICES_KEY ||
  "d5b3bd4feac2aa13517d1572016d247c8484495fe1c7124b";

// Mapbox token (used to initialize @rnmapbox/maps SDK, tiles loaded from Vietmap)
export const MAPBOX_ACCESS_TOKEN =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ||
  "pk.eyJ1Ijoic2ZyYW5raWUzMDExIiwiYSI6ImNtbWJxbDRpMzBwc3AycHI0cmcyNzF5dDgifQ.Tkj5o8ORerNl8Qmk3Swcmw";

export const VIETMAP_CONFIG = {
  TILEMAP_KEY: VIETMAP_TILEMAP_KEY,
  SERVICES_KEY: VIETMAP_SERVICES_KEY,
  // Map style URLs
  // Vietmap GL style JSON — works with @rnmapbox/maps native SDK (standard Mapbox GL style format)
  STYLE_URL: `https://maps.vietmap.vn/api/maps/light/styles.json?apikey=${VIETMAP_TILEMAP_KEY}`,
  // Mapbox hosted style (requires valid pk. token with map tile scope)
  MAPBOX_STYLE_URL: "mapbox://styles/mapbox/streets-v12",
  // Tile URL
  TILE_URL: `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${VIETMAP_TILEMAP_KEY}`,
  // Search & Geocode API v4 (merged search & geocode)
  SEARCH_URL: "https://maps.vietmap.vn/api/search/v4",
  // Autocomplete API v4 (incremental search)
  AUTOCOMPLETE_URL: "https://maps.vietmap.vn/api/autocomplete/v4",
  // Place Detail API v4 (get coordinates from ref_id)
  PLACE_DETAIL_URL: "https://maps.vietmap.vn/api/place/v4",
  // Reverse Geocoding API v4 (lat/lng → address)
  REVERSE_GEOCODING_URL: "https://maps.vietmap.vn/api/reverse/v4",
  // Routing API
  ROUTING_URL: "https://maps.vietmap.vn/api/route",
};

// Environment helpers
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;
