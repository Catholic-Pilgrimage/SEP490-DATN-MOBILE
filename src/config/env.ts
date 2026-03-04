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
  STYLE_URL: `https://maps.vietmap.vn/api/maps/light/styles.json?apikey=${VIETMAP_TILEMAP_KEY}`,
  // Tile URL
  TILE_URL: `https://maps.vietmap.vn/api/tm/{z}/{x}/{y}.png?apikey=${VIETMAP_TILEMAP_KEY}`,
  // Geocoding API
  GEOCODING_URL: "https://maps.vietmap.vn/api/search/v3",
  // Routing API
  ROUTING_URL: "https://maps.vietmap.vn/api/route",
};

// Environment helpers
export const isDevelopment = __DEV__;
export const isProduction = !__DEV__;
