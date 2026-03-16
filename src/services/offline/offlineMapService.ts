/**
 * Offline Map Service - manages lightweight tile packs for planner maps
 */
import * as FileSystem from "expo-file-system/legacy";

import { VIETMAP_CONFIG } from "../../config/map.config";
import type { OfflinePlannerSite } from "./offlinePlannerService";

export interface OfflineMapBounds {
  min_latitude: number;
  max_latitude: number;
  min_longitude: number;
  max_longitude: number;
}

export interface OfflineMapPack {
  directory_uri: string;
  tile_url_template: string;
  min_zoom: number;
  max_zoom: number;
  tile_count: number;
  size_bytes: number;
  downloaded_at: string;
  bounds: OfflineMapBounds;
}

interface TileRequest {
  z: number;
  x: number;
  y: number;
  fileUri: string;
}

interface TileDownloadPlan {
  bounds: OfflineMapBounds;
  requests: TileRequest[];
  minZoom: number;
  maxZoom: number;
}

interface DownloadMapProgress {
  downloaded: number;
  total: number;
}

const MAX_TILE_COUNT = 220;
const MIN_OVERVIEW_ZOOM = 6;
const MAX_DETAIL_ZOOM = 14;
const MERCATOR_MAX_LATITUDE = 85.05112878;

const clampLatitude = (latitude: number) =>
  Math.max(-MERCATOR_MAX_LATITUDE, Math.min(MERCATOR_MAX_LATITUDE, latitude));

const sanitizePlannerId = (plannerId: string) =>
  plannerId.replace(/[^a-zA-Z0-9_-]/g, "_");

const replaceTileParams = (template: string, z: number, x: number, y: number) =>
  template
    .replace(/\{z\}/g, String(z))
    .replace(/\{x\}/g, String(x))
    .replace(/\{y\}/g, String(y));

const longitudeToTileX = (longitude: number, zoom: number) => {
  const scale = 2 ** zoom;
  return Math.floor(((longitude + 180) / 360) * scale);
};

const latitudeToTileY = (latitude: number, zoom: number) => {
  const scale = 2 ** zoom;
  const latitudeRadians = (clampLatitude(latitude) * Math.PI) / 180;
  const mercator =
    Math.log(Math.tan(Math.PI / 4 + latitudeRadians / 2)) / Math.PI;
  return Math.floor(((1 - mercator) / 2) * scale);
};

const clampTileIndex = (index: number, zoom: number) => {
  const maxIndex = 2 ** zoom - 1;
  return Math.max(0, Math.min(maxIndex, index));
};

const getOfflineMapsRootDirectory = () => {
  const baseDirectory = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  if (!baseDirectory) {
    throw new Error("Offline map storage is not available on this device");
  }

  return `${baseDirectory}offline_maps/`;
};

const getPackDirectories = (plannerId: string) => {
  const rootDirectory = getOfflineMapsRootDirectory();
  const sanitizedPlannerId = sanitizePlannerId(plannerId);

  return {
    rootDirectory,
    packDirectory: `${rootDirectory}${sanitizedPlannerId}/`,
    tempDirectory: `${rootDirectory}${sanitizedPlannerId}_tmp/`,
  };
};

const buildBoundsFromSites = (sites: OfflinePlannerSite[]): OfflineMapBounds | null => {
  const coordinates = sites
    .map((site) => ({
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
    }))
    .filter(
      (coordinate) =>
        Number.isFinite(coordinate.latitude) &&
        Number.isFinite(coordinate.longitude),
    );

  if (coordinates.length === 0) {
    return null;
  }

  const latitudes = coordinates.map((coordinate) => coordinate.latitude);
  const longitudes = coordinates.map((coordinate) => coordinate.longitude);
  const minLatitude = Math.min(...latitudes);
  const maxLatitude = Math.max(...latitudes);
  const minLongitude = Math.min(...longitudes);
  const maxLongitude = Math.max(...longitudes);
  const latitudeSpan = maxLatitude - minLatitude;
  const longitudeSpan = maxLongitude - minLongitude;
  const latitudePadding = coordinates.length === 1
    ? 0.02
    : Math.max(latitudeSpan * 0.2, 0.01);
  const longitudePadding = coordinates.length === 1
    ? 0.02
    : Math.max(longitudeSpan * 0.2, 0.01);

  return {
    min_latitude: clampLatitude(minLatitude - latitudePadding),
    max_latitude: clampLatitude(maxLatitude + latitudePadding),
    min_longitude: Math.max(-180, minLongitude - longitudePadding),
    max_longitude: Math.min(180, maxLongitude + longitudePadding),
  };
};

const getOverviewZoomLevels = (bounds: OfflineMapBounds) => {
  const span = Math.max(
    bounds.max_latitude - bounds.min_latitude,
    bounds.max_longitude - bounds.min_longitude,
  );

  let maxOverviewZoom = 11;
  if (span > 5) {
    maxOverviewZoom = 7;
  } else if (span > 2) {
    maxOverviewZoom = 8;
  } else if (span > 1) {
    maxOverviewZoom = 9;
  } else if (span > 0.4) {
    maxOverviewZoom = 10;
  }

  const minOverviewZoom = Math.max(MIN_OVERVIEW_ZOOM, maxOverviewZoom - 2);

  return Array.from(
    { length: maxOverviewZoom - minOverviewZoom + 1 },
    (_, index) => minOverviewZoom + index,
  );
};

const getDetailZoomLevels = (overviewZoomLevels: number[]) => {
  const highestOverviewZoom =
    overviewZoomLevels[overviewZoomLevels.length - 1] ?? MIN_OVERVIEW_ZOOM;
  const minDetailZoom = Math.min(MAX_DETAIL_ZOOM, highestOverviewZoom + 1);
  const maxDetailZoom = Math.min(MAX_DETAIL_ZOOM, minDetailZoom + 2);

  if (minDetailZoom > maxDetailZoom) {
    return [];
  }

  return Array.from(
    { length: maxDetailZoom - minDetailZoom + 1 },
    (_, index) => maxDetailZoom - index,
  );
};

const addTileRequest = (
  requests: TileRequest[],
  requestKeys: Set<string>,
  request: TileRequest,
) => {
  const requestKey = `${request.z}/${request.x}/${request.y}`;

  if (requestKeys.has(requestKey) || requests.length >= MAX_TILE_COUNT) {
    return false;
  }

  requestKeys.add(requestKey);
  requests.push(request);
  return true;
};

const buildTileDownloadPlan = (
  plannerId: string,
  sites: OfflinePlannerSite[],
): TileDownloadPlan | null => {
  const bounds = buildBoundsFromSites(sites);
  if (!bounds) {
    return null;
  }

  const coordinates = sites
    .map((site) => ({
      latitude: Number(site.latitude),
      longitude: Number(site.longitude),
    }))
    .filter(
      (coordinate) =>
        Number.isFinite(coordinate.latitude) &&
        Number.isFinite(coordinate.longitude),
    );

  const { tempDirectory } = getPackDirectories(plannerId);
  const requests: TileRequest[] = [];
  const requestKeys = new Set<string>();
  const overviewZoomLevels = getOverviewZoomLevels(bounds);

  overviewZoomLevels.forEach((zoomLevel) => {
    const minTileX = clampTileIndex(
      longitudeToTileX(bounds.min_longitude, zoomLevel),
      zoomLevel,
    );
    const maxTileX = clampTileIndex(
      longitudeToTileX(bounds.max_longitude, zoomLevel),
      zoomLevel,
    );
    const minTileY = clampTileIndex(
      latitudeToTileY(bounds.max_latitude, zoomLevel),
      zoomLevel,
    );
    const maxTileY = clampTileIndex(
      latitudeToTileY(bounds.min_latitude, zoomLevel),
      zoomLevel,
    );

    for (let tileX = minTileX; tileX <= maxTileX; tileX += 1) {
      for (let tileY = minTileY; tileY <= maxTileY; tileY += 1) {
        const added = addTileRequest(requests, requestKeys, {
          z: zoomLevel,
          x: tileX,
          y: tileY,
          fileUri: `${tempDirectory}tiles/${zoomLevel}/${tileX}/${tileY}.png`,
        });

        if (!added) {
          return;
        }
      }
    }
  });

  const detailZoomLevels = getDetailZoomLevels(overviewZoomLevels);

  detailZoomLevels.forEach((zoomLevel) => {
    const tileRadius = zoomLevel <= 11 ? 1 : 0;

    coordinates.forEach((coordinate) => {
      const centerTileX = clampTileIndex(
        longitudeToTileX(coordinate.longitude, zoomLevel),
        zoomLevel,
      );
      const centerTileY = clampTileIndex(
        latitudeToTileY(coordinate.latitude, zoomLevel),
        zoomLevel,
      );

      for (let deltaX = -tileRadius; deltaX <= tileRadius; deltaX += 1) {
        for (let deltaY = -tileRadius; deltaY <= tileRadius; deltaY += 1) {
          const added = addTileRequest(requests, requestKeys, {
            z: zoomLevel,
            x: clampTileIndex(centerTileX + deltaX, zoomLevel),
            y: clampTileIndex(centerTileY + deltaY, zoomLevel),
            fileUri: `${tempDirectory}tiles/${zoomLevel}/${clampTileIndex(
              centerTileX + deltaX,
              zoomLevel,
            )}/${clampTileIndex(centerTileY + deltaY, zoomLevel)}.png`,
          });

          if (!added) {
            return;
          }
        }
      }
    });
  });

  if (requests.length === 0) {
    return null;
  }

  return {
    bounds,
    requests,
    minZoom: Math.min(...requests.map((request) => request.z)),
    maxZoom: Math.max(...requests.map((request) => request.z)),
  };
};

class OfflineMapService {
  async downloadPlannerMapPack(
    plannerId: string,
    sites: OfflinePlannerSite[],
    onProgress?: (progress: DownloadMapProgress) => void,
  ): Promise<OfflineMapPack | null> {
    const downloadPlan = buildTileDownloadPlan(plannerId, sites);
    if (!downloadPlan) {
      return null;
    }

    const { rootDirectory, packDirectory, tempDirectory } =
      getPackDirectories(plannerId);

    await FileSystem.makeDirectoryAsync(rootDirectory, { intermediates: true });
    await FileSystem.deleteAsync(tempDirectory, { idempotent: true });
    await FileSystem.makeDirectoryAsync(`${tempDirectory}tiles/`, {
      intermediates: true,
    });

    let downloadedTileCount = 0;
    let downloadedSizeBytes = 0;

    for (let index = 0; index < downloadPlan.requests.length; index += 1) {
      const request = downloadPlan.requests[index];

      try {
        await FileSystem.makeDirectoryAsync(
          request.fileUri.slice(0, request.fileUri.lastIndexOf("/") + 1),
          { intermediates: true },
        );

        const remoteTileUrl = replaceTileParams(
          VIETMAP_CONFIG.TILE_URL,
          request.z,
          request.x,
          request.y,
        );
        const downloadResult = await FileSystem.downloadAsync(
          remoteTileUrl,
          request.fileUri,
        );

        if (downloadResult.status === 200) {
          const fileInfo = await FileSystem.getInfoAsync(downloadResult.uri);
          if (fileInfo.exists) {
            downloadedTileCount += 1;
            downloadedSizeBytes +=
              typeof fileInfo.size === "number" ? fileInfo.size : 0;
          }
        } else {
          await FileSystem.deleteAsync(request.fileUri, { idempotent: true });
        }
      } catch (error) {
        console.warn(
          `Failed to download offline tile ${request.z}/${request.x}/${request.y}:`,
          error,
        );
      } finally {
        onProgress?.({
          downloaded: index + 1,
          total: downloadPlan.requests.length,
        });
      }
    }

    if (downloadedTileCount === 0) {
      await FileSystem.deleteAsync(tempDirectory, { idempotent: true });
      return null;
    }

    await FileSystem.deleteAsync(packDirectory, { idempotent: true });
    await FileSystem.moveAsync({
      from: tempDirectory,
      to: packDirectory,
    });

    return {
      directory_uri: packDirectory,
      tile_url_template: `${packDirectory}tiles/{z}/{x}/{y}.png`,
      min_zoom: downloadPlan.minZoom,
      max_zoom: downloadPlan.maxZoom,
      tile_count: downloadedTileCount,
      size_bytes: downloadedSizeBytes,
      downloaded_at: new Date().toISOString(),
      bounds: downloadPlan.bounds,
    };
  }

  async deletePlannerMapPack(plannerId: string, pack?: OfflineMapPack | null) {
    const { packDirectory, tempDirectory } = getPackDirectories(plannerId);

    await FileSystem.deleteAsync(pack?.directory_uri || packDirectory, {
      idempotent: true,
    });
    await FileSystem.deleteAsync(tempDirectory, { idempotent: true });
  }
}

export const offlineMapService = new OfflineMapService();
export default offlineMapService;
