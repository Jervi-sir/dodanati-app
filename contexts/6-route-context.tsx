import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useLocation } from './3-location-context';
import { useHazards, RoadHazard } from './5-hazard-context';
import { useUI } from './4-ui-context';
import { useNetworkStatus } from '@/hooks/use-network-status';

export type RouteSummaryCategory = {
  category_id: number;
  slug?: string;
  name_en?: string;
  name_fr?: string;
  name_ar?: string;
  count: number;
};

export type RouteSummary = {
  distance_km: number;
  hazards_count: number;
  by_category: RouteSummaryCategory[];
};

export type Destination = { lat: number; lng: number } | null;
export type RouteOrigin = { lat: number; lng: number } | null;

type RouteContextType = {
  destination: Destination;
  routeSummary: RouteSummary | null;
  routeLoading: boolean;
  selectDestination: (coord: { latitude: number; longitude: number }) => void;
  routeOrigin: RouteOrigin;
  routeCoords: { latitude: number; longitude: number }[];
  clearRoute: () => void;
};

const RouteContext = createContext<RouteContextType | undefined>(undefined);

export const useRoute = () => {
  const ctx = useContext(RouteContext);
  if (!ctx) throw new Error('useRoute must be used within <RouteProvider>');
  return ctx;
};

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLat, currentLng, region } = useLocation();
  const { hazards } = useHazards();
  const { showSnackbar } = useUI();
  const { isConnected } = useNetworkStatus();

  const [destination, setDestination] = useState<Destination>(null);
  const [routeOrigin, setRouteOrigin] = useState<RouteOrigin>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  const clearRoute = () => {
    setDestination(null);
    setRouteOrigin(null);
    setRouteSummary(null);
    setRouteCoords([]);
  };

  const fetchRouteSummary = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
    waypoints: { latitude: number; longitude: number }[]
  ) => {
    if (!isConnected) {
      console.log('Offline: calculating route summary locally');
      try {
        const summary = calculateOfflineRouteSummary(hazards, fromLat, fromLng, toLat, toLng, waypoints);
        setRouteSummary(summary);
        showSnackbar('Mode hors ligne : estimation locale', 'Info');
      } catch (e) {
        console.error('Offline summary error', e);
        Alert.alert('Erreur', 'Impossible de calculer le trajet hors ligne.');
      }
      return;
    }

    try {
      const res = await api.post(
        buildRoute(ApiRoutes.hazardsRouteSummary),
        {
          from_lat: fromLat,
          from_lng: fromLng,
          to_lat: toLat,
          to_lng: toLng,
          corridor_width_m: 80,
          waypoints,
        },
        {
          headers: { 'X-Requires-Auth': false },
        }
      );
      const data = res?.data?.data;
      if (data) {
        setRouteSummary({
          distance_km: data.distance_km,
          hazards_count: data.hazards_count,
          by_category: data.by_category ?? [],
        });
      }
    } catch (err) {
      console.error('Route summary error', err);
      // Fallback to offline calculation if API fails
      try {
        const summary = calculateOfflineRouteSummary(hazards, fromLat, fromLng, toLat, toLng, waypoints);
        setRouteSummary(summary);
        showSnackbar('Erreur connexion : estimation locale', 'Info');
      } catch (e) {
        Alert.alert('Erreur', 'Impossible de calculer le trajet.');
      }
    }
  };

  const fetchRoutePolyline = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    // Helper to set fallback straight line
    const setStraightLineFallback = () => {
      const straightLine = [
        { latitude: fromLat, longitude: fromLng },
        { latitude: toLat, longitude: toLng },
      ];
      setRouteCoords(straightLine);
      return straightLine;
    };

    if (!isConnected) {
      return setStraightLineFallback();
    }

    try {
      const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=true`;
      const res = await fetch(url);
      const json = await res.json();

      if (json.routes && json.routes.length > 0) {
        // Map first route
        const coords: [number, number][] = json.routes[0].geometry?.coordinates ?? [];
        const polyline = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
        setRouteCoords(polyline);

        if (json.routes.length > 1) {
          console.log(`Found ${json.routes.length} routes. Future: Analyze them for hazards.`);
        }
        return polyline;
      }
    } catch (err) {
      console.error('Route polyline error', err);
      // Fallback to straight line on error
      return setStraightLineFallback();
    }
    // Fallback if no routes found
    return setStraightLineFallback();
  };

  const selectDestination = async (coord: { latitude: number; longitude: number }) => {
    const dest = { lat: coord.latitude, lng: coord.longitude };
    setDestination(dest);

    const fromLat = currentLat ?? region.latitude;
    const fromLng = currentLng ?? region.longitude;

    setRouteOrigin({ lat: fromLat, lng: fromLng });
    setRouteLoading(true);

    try {
      // 1. Fetch geometry first
      const points = await fetchRoutePolyline(fromLat, fromLng, dest.lat, dest.lng);

      // 2. Fetch summary using geometry
      // 2. Fetch summary using geometry (or empty if failed)
      // Even if points is empty (offline), we call summary to trigger the offline straight-line fallback
      await fetchRouteSummary(fromLat, fromLng, dest.lat, dest.lng, points);
    } finally {
      setRouteLoading(false);
    }
  };

  return (
    <RouteContext.Provider
      value={{
        destination,
        routeSummary,
        routeLoading,
        selectDestination,
        routeOrigin,
        routeCoords,
        clearRoute,
      }}
    >
      {children}
    </RouteContext.Provider>
  );
};

// --- Offline Math Helpers ---

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const distanceToSegmentMeters = (
  pLat: number,
  pLng: number,
  aLat: number,
  aLng: number,
  bLat: number,
  bLng: number
) => {
  const midLat = (pLat + aLat + bLat) / 3.0;
  const mPerDegLat = 111320.0;
  const mPerDegLng = 111320.0 * Math.cos(midLat * (Math.PI / 180));

  const xA = 0;
  const yA = 0;
  const xB = (bLng - aLng) * mPerDegLng;
  const yB = (bLat - aLat) * mPerDegLat;
  const xP = (pLng - aLng) * mPerDegLng;
  const yP = (pLat - aLat) * mPerDegLat;

  const dx = xB - xA;
  const dy = yB - yA;

  const lenSq = dx * dx + dy * dy;
  let t = 0;
  if (lenSq > 0.0001) {
    t = (xP * dx + yP * dy) / lenSq;
    if (t < 0.0) t = 0.0;
    else if (t > 1.0) t = 1.0;
  }

  const nearX = xA + t * dx;
  const nearY = yA + t * dy;
  const distX = xP - nearX;
  const distY = yP - nearY;

  return Math.sqrt(distX * distX + distY * distY);
};

const calculateOfflineRouteSummary = (
  hazards: RoadHazard[],
  fromLat: number,
  fromLng: number,
  toLat: number,
  toLng: number,
  waypoints: { latitude: number; longitude: number }[]
): RouteSummary => {
  const corridorWidthM = 80;

  // 1. Filter hazards within corridor
  const filtered = hazards.filter((h) => {
    if (!h.is_active) return false;

    let minDist = Infinity;

    if (waypoints && waypoints.length > 1) {
      // Check polyline
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];

        // Optimization: Quick bounding box check for segment
        const segMinLat = Math.min(p1.latitude, p2.latitude) - 0.002;
        const segMaxLat = Math.max(p1.latitude, p2.latitude) + 0.002;
        const segMinLng = Math.min(p1.longitude, p2.longitude) - 0.002;
        const segMaxLng = Math.max(p1.longitude, p2.longitude) + 0.002;

        if (h.lat < segMinLat || h.lat > segMaxLat || h.lng < segMinLng || h.lng > segMaxLng) {
          continue;
        }

        const d = distanceToSegmentMeters(h.lat, h.lng, p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        if (d < minDist) minDist = d;
        if (minDist <= corridorWidthM) return true;
      }
    } else {
      // Check straight line (fallback)
      minDist = distanceToSegmentMeters(h.lat, h.lng, fromLat, fromLng, toLat, toLng);
    }

    return minDist <= corridorWidthM;
  });

  // 2. Group by category
  const byCategoryMap = new Map<number, RouteSummaryCategory>();

  filtered.forEach((h) => {
    if (!h.category) return;
    const catId = h.road_hazard_category_id;

    if (!byCategoryMap.has(catId)) {
      byCategoryMap.set(catId, {
        category_id: catId,
        slug: h.category.slug,
        name_en: h.category.name_en,
        name_fr: h.category.name_fr,
        name_ar: h.category.name_ar,
        count: 0,
      });
    }

    const entry = byCategoryMap.get(catId)!;
    entry.count++;
  });

  // 3. Calculate distance
  let distanceKm = 0;
  if (waypoints && waypoints.length > 1) {
    for (let i = 0; i < waypoints.length - 1; i++) {
      distanceKm += getDistanceKm(
        waypoints[i].latitude,
        waypoints[i].longitude,
        waypoints[i + 1].latitude,
        waypoints[i + 1].longitude
      );
    }
  } else {
    distanceKm = getDistanceKm(fromLat, fromLng, toLat, toLng);
  }

  return {
    distance_km: distanceKm,
    hazards_count: filtered.length,
    by_category: Array.from(byCategoryMap.values()),
  };
};
