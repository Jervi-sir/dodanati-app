import React, { createContext, useContext, useState } from 'react';
import { Alert } from 'react-native';
import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useLocation } from './location-context';

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

  const fetchRouteSummary = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
    try {
      const res = await api.get(buildRoute(ApiRoutes.hazardsRouteSummary), {
        params: {
          from_lat: fromLat,
          from_lng: fromLng,
          to_lat: toLat,
          to_lng: toLng,
          corridor_width_m: 80,
        },
        headers: { 'X-Requires-Auth': false },
      });
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
      Alert.alert('Erreur', 'Impossible de calculer le trajet.');
    }
  };

  const fetchRoutePolyline = async (fromLat: number, fromLng: number, toLat: number, toLng: number) => {
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
      }
    } catch (err) {
      console.error('Route polyline error', err);
      setRouteCoords([]);
    }
  };

  const selectDestination = async (coord: { latitude: number; longitude: number }) => {
    const dest = { lat: coord.latitude, lng: coord.longitude };
    setDestination(dest);

    const fromLat = currentLat ?? region.latitude;
    const fromLng = currentLng ?? region.longitude;

    setRouteOrigin({ lat: fromLat, lng: fromLng });
    setRouteLoading(true);

    try {
      await Promise.all([
        fetchRouteSummary(fromLat, fromLng, dest.lat, dest.lng),
        fetchRoutePolyline(fromLat, fromLng, dest.lat, dest.lng),
      ]);
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
