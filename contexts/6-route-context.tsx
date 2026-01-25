import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { Alert, Platform } from "react-native";
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { useLocation } from "./3-location-context";
import { useHazards, RoadHazard } from "./5-hazard-context";
import { useUI } from "./4-ui-context";
import { useNetworkStatus } from "@/hooks/use-network-status";

type RouteSummaryCategory = {
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

type Destination = { lat: number; lng: number } | null;
type RouteOrigin = { lat: number; lng: number } | null;

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
  if (!ctx) throw new Error("useRoute must be used within <RouteProvider>");
  return ctx;
};

export const RouteProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { currentLat, currentLng, region } = useLocation(); // region might be null
  const { hazards } = useHazards();
  const { showSnackbar } = useUI();
  const { isConnected } = useNetworkStatus();

  const [destination, setDestination] = useState<Destination>(null);
  const [routeOrigin, setRouteOrigin] = useState<RouteOrigin>(null);
  const [routeSummary, setRouteSummary] = useState<RouteSummary | null>(null);
  const [routeLoading, setRouteLoading] = useState(false);
  const [routeCoords, setRouteCoords] = useState<{ latitude: number; longitude: number }[]>([]);

  // prevent older requests from overwriting state
  const reqIdRef = useRef(0);

  const clearRoute = useCallback(() => {
    reqIdRef.current += 1; // invalidate in-flight
    setDestination(null);
    setRouteOrigin(null);
    setRouteSummary(null);
    setRouteCoords([]);
    setRouteLoading(false);
  }, []);

  const getOrigin = useCallback((): { lat: number; lng: number } | null => {
    if (currentLat != null && currentLng != null) return { lat: currentLat, lng: currentLng };
    if (region) return { lat: region.latitude, lng: region.longitude };
    return null;
  }, [currentLat, currentLng, region]);

  const setStraightLineFallback = useCallback(
    (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
      const straight = [
        { latitude: fromLat, longitude: fromLng },
        { latitude: toLat, longitude: toLng },
      ];
      setRouteCoords(straight);
      return straight;
    },
    []
  );

  const fetchRoutePolyline = useCallback(
    async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
      if (!isConnected) return setStraightLineFallback(fromLat, fromLng, toLat, toLng);

      try {
        // NOTE: OSRM is public; keep it as best-effort
        const url = `https://router.project-osrm.org/route/v1/driving/${fromLng},${fromLat};${toLng},${toLat}?overview=full&geometries=geojson&alternatives=true`;
        const res = await fetch(url);
        const json = await res.json();

        if (json?.routes?.length > 0) {
          const coords: [number, number][] = json.routes[0].geometry?.coordinates ?? [];
          const polyline = coords.map(([lng, lat]) => ({ latitude: lat, longitude: lng }));
          setRouteCoords(polyline.length ? polyline : setStraightLineFallback(fromLat, fromLng, toLat, toLng));
          return polyline.length ? polyline : setStraightLineFallback(fromLat, fromLng, toLat, toLng);
        }
      } catch (err) {
        console.error("Route polyline error", err);
      }

      return setStraightLineFallback(fromLat, fromLng, toLat, toLng);
    },
    [isConnected, setStraightLineFallback]
  );

  const fetchRouteSummary = useCallback(
    async (
      fromLat: number,
      fromLng: number,
      toLat: number,
      toLng: number,
      waypoints: { latitude: number; longitude: number }[]
    ) => {
      // offline first
      if (!isConnected) {
        const summary = calculateOfflineRouteSummary(hazards, fromLat, fromLng, toLat, toLng, waypoints);
        setRouteSummary(summary);
        showSnackbar("Mode hors ligne : estimation locale", "Info");
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
            platform: Platform.OS,
          },
          { headers: { "X-Requires-Auth": false } }
        );

        const data = res?.data?.data;
        if (data) {
          setRouteSummary({
            distance_km: data.distance_km,
            hazards_count: data.hazards_count,
            by_category: data.by_category ?? [],
          });
          return;
        }

        // if empty payload, fallback
        const summary = calculateOfflineRouteSummary(hazards, fromLat, fromLng, toLat, toLng, waypoints);
        setRouteSummary(summary);
        showSnackbar("Estimation locale (réponse vide)", "Info");
      } catch (err) {
        console.error("Route summary error", err);
        // fallback to offline calc
        try {
          const summary = calculateOfflineRouteSummary(hazards, fromLat, fromLng, toLat, toLng, waypoints);
          setRouteSummary(summary);
          showSnackbar("Erreur connexion : estimation locale", "Info");
        } catch {
          Alert.alert("Erreur", "Impossible de calculer le trajet.");
        }
      }
    },
    [isConnected, hazards, showSnackbar]
  );

  const selectDestination = useCallback(
    async (coord: { latitude: number; longitude: number }) => {
      const origin = getOrigin();
      if (!origin) {
        Alert.alert("Erreur", "Localisation non disponible pour le moment.");
        return;
      }

      const dest = { lat: coord.latitude, lng: coord.longitude };
      setDestination(dest);

      setRouteOrigin(origin);
      setRouteLoading(true);
      setRouteSummary(null);

      const myReq = ++reqIdRef.current;

      try {
        const points = await fetchRoutePolyline(origin.lat, origin.lng, dest.lat, dest.lng);

        // ignore if another request started
        if (reqIdRef.current !== myReq) return;

        await fetchRouteSummary(origin.lat, origin.lng, dest.lat, dest.lng, points);

        if (reqIdRef.current !== myReq) return;
      } finally {
        if (reqIdRef.current === myReq) setRouteLoading(false);
      }
    },
    [getOrigin, fetchRoutePolyline, fetchRouteSummary]
  );

  const value = useMemo<RouteContextType>(
    () => ({
      destination,
      routeSummary,
      routeLoading,
      selectDestination,
      routeOrigin,
      routeCoords,
      clearRoute,
    }),
    [destination, routeSummary, routeLoading, selectDestination, routeOrigin, routeCoords, clearRoute]
  );

  return <RouteContext.Provider value={value}>{children}</RouteContext.Provider>;
};

// ---------------- Offline Math Helpers ----------------

const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

const distanceToSegmentMeters = (pLat: number, pLng: number, aLat: number, aLng: number, bLat: number, bLng: number) => {
  const midLat = (pLat + aLat + bLat) / 3.0;
  const mPerDegLat = 111320.0;
  const mPerDegLng = 111320.0 * Math.cos(midLat * (Math.PI / 180));

  const xB = (bLng - aLng) * mPerDegLng;
  const yB = (bLat - aLat) * mPerDegLat;
  const xP = (pLng - aLng) * mPerDegLng;
  const yP = (pLat - aLat) * mPerDegLat;

  const dx = xB;
  const dy = yB;

  const lenSq = dx * dx + dy * dy;

  let t = 0;
  if (lenSq > 0.0001) {
    t = (xP * dx + yP * dy) / lenSq;
    if (t < 0) t = 0;
    else if (t > 1) t = 1;
  }

  const nearX = t * dx;
  const nearY = t * dy;

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

  const filtered = hazards.filter((h) => {
    if (!h.is_active) return false;

    let minDist = Infinity;

    if (waypoints && waypoints.length > 1) {
      for (let i = 0; i < waypoints.length - 1; i++) {
        const p1 = waypoints[i];
        const p2 = waypoints[i + 1];

        // quick bbox (roughly ~200m)
        const segMinLat = Math.min(p1.latitude, p2.latitude) - 0.002;
        const segMaxLat = Math.max(p1.latitude, p2.latitude) + 0.002;
        const segMinLng = Math.min(p1.longitude, p2.longitude) - 0.002;
        const segMaxLng = Math.max(p1.longitude, p2.longitude) + 0.002;

        if (h.lat < segMinLat || h.lat > segMaxLat || h.lng < segMinLng || h.lng > segMaxLng) continue;

        const d = distanceToSegmentMeters(h.lat, h.lng, p1.latitude, p1.longitude, p2.latitude, p2.longitude);
        if (d < minDist) minDist = d;
        if (minDist <= corridorWidthM) return true;
      }
    } else {
      minDist = distanceToSegmentMeters(h.lat, h.lng, fromLat, fromLng, toLat, toLng);
    }

    return minDist <= corridorWidthM;
  });

  const byCategoryMap = new Map<number, RouteSummaryCategory>();
  for (const h of filtered) {
    if (!h.category) continue;
    const catId = h.road_hazard_category_id;

    const existing = byCategoryMap.get(catId);
    if (existing) existing.count += 1;
    else {
      byCategoryMap.set(catId, {
        category_id: catId,
        slug: h.category.slug,
        name_en: h.category.name_en,
        name_fr: h.category.name_fr,
        name_ar: h.category.name_ar,
        count: 1,
      });
    }
  }

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
