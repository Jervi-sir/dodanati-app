// src/contexts/MapContext.tsx
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import AsyncStorage from '@react-native-async-storage/async-storage';
import MapView, { Region } from 'react-native-maps';
import { ActionSheetRef } from 'react-native-actions-sheet';

import api, { setAuthToken } from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { HazardDetailSheet } from './hazard-detail-sheet';
import { HazardReportSheet } from './hazard-report-sheet';
import { SnackbarBanner } from './snackbar-banner';
import { MapParamsSheet } from './map-params-sheet';
import { HazardHistoryItem, HazardHistorySheet } from './hazard-history-sheet';

const DEVICE_UUID_KEY = 'roadwatch_device_uuid';
const DEVICE_TOKEN_KEY = 'roadwatch_device_token';

const DEFAULT_LAT = 36.7525;
const DEFAULT_LNG = 3.04197;

export type MapTheme = 'light' | 'dark';
export type MapProviderKind = 'system' | 'google'; // 👈 NEW

export type LangCode = 'en' | 'fr' | 'ar';

type LatLng = {
  latitude: number;
  longitude: number;
};

export type RoadHazardCategoryTaxonomyItem = {
  id?: number;
  slug?: string;
  label?: string;
  icon?: string | null;
};

export type RoadHazard = {
  id: number;
  road_hazard_category_id: number;
  severity: number;
  note: string | null;
  lat: number;
  lng: number;
  reports_count: number;
  last_reported_at: string | null;
  is_active: boolean;
  category?: {
    id: number;
    slug: string;
    name_en: string;
    name_fr: string;
    name_ar: string;
    icon: string | null;
  };
};

export type SnackbarState = {
  visible: boolean;
  message: string;
  ctaLabel?: string;
} | null;

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

type MapContextType = {
  bootLoading: boolean;
  locationLoading: boolean;
  categoriesLoading: boolean;
  hazardsLoading: boolean;

  region: Region;
  setRegion: (r: Region) => void;

  hazards: RoadHazard[];
  categories: RoadHazardCategoryTaxonomyItem[];

  // NEW
  selectedHazard: RoadHazard | null;
  openHazardSheet: (hazard: RoadHazard) => void;
  closeHazardSheet: () => void;
  hazardSheetRef: React.RefObject<ActionSheetRef>;

  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number) => void;

  severity: number;
  setSeverity: (s: number) => void;

  note: string;
  setNote: (txt: string) => void;

  snackbar: SnackbarState;
  hideSnackbar: () => void;

  handleSubmitHazard: () => void;
  handleQuickReport: (slug: 'speed_bump' | 'pothole') => void;

  recenterOnUser: () => void;

  mapRef: React.RefObject<MapView>;
  hazardReportActionSheetRef: React.RefObject<ActionSheetRef>;
  openReportSheet: () => void;
  closeReportSheet: () => void;

  // NEW: destination and route summary
  destination: Destination;
  routeSummary: RouteSummary | null;
  routeLoading: boolean;
  selectDestination: (coord: { latitude: number; longitude: number }) => void;

  routeOrigin: RouteOrigin
  routeCoords: LatLng[];
  clearRoute: () => void;

  mapProvider: MapProviderKind;
  setMapProvider: (p: MapProviderKind) => void;
  updateMapProvider: any;

  openParamsSheet: () => void;
  closeParamsSheet: () => void;
};

const MapContext = createContext<MapContextType | undefined>(undefined);

// 👇 safer hook
export const useMap = () => {
  const ctx = useContext(MapContext);
  if (!ctx) {
    throw new Error('useMap must be used within a <MapProvider>');
  }
  return ctx;
};

/* ---------------------- helpers ---------------------- */

function generateRandomUuid() {
  return (
    'dev-' +
    Math.random().toString(36).slice(2) +
    '-' +
    Date.now().toString(36)
  );
}

export const MapProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [isReady, setIsReady] = useState(false);
  const [bootLoading, setBootLoading] = useState(true);
  const [locationLoading, setLocationLoading] = useState(true);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [hazardsLoading, setHazardsLoading] = useState(false);

  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);

  const [categories, setCategories] = useState<RoadHazardCategoryTaxonomyItem[]>([]);
  const [hazards, setHazards] = useState<RoadHazard[]>([]);

  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState('');

  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);

  const [region, setRegion] = useState<Region>({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const snackbarTimeoutRef = useRef<any>(null);

  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);


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

  /* ----------------------- Action sheets ref ----------------------- */
  const mapRef = useRef<MapView>(null);

  const hazardReportActionSheetRef = useRef<ActionSheetRef>(null);
  const openReportSheet = () => hazardReportActionSheetRef.current?.show();
  const closeReportSheet = () => hazardReportActionSheetRef.current?.hide();

  const hazardSheetRef = useRef<ActionSheetRef>(null);
  const openHazardSheet = (hazard: RoadHazard) => { setSelectedHazard(hazard); hazardSheetRef.current?.show(); };
  const closeHazardSheet = () => { hazardSheetRef.current?.hide(); };

  const paramsSheetRef = useRef<ActionSheetRef>(null);
  const openParamsSheet = () => { paramsSheetRef.current?.show(); };
  const closeParamsSheet = () => { paramsSheetRef.current?.hide(); };

  const historySheetRef = useRef<ActionSheetRef>(null);

  /* ----------------------- Map Provider ----------------------- */
  const [mapProvider, setMapProvider] = useState<MapProviderKind>('system'); // 👈 NEW
  const updateMapProvider = useCallback(async (next: MapProviderKind) => {
    setMapProvider(next);
    try {
      await AsyncStorage.setItem('mapProvider', next);
    } catch (e) {
      // ignore for now or add logger
    }
  }, []);

  useEffect(() => {
    let isMounted = true;

    (async () => {
      try {
        const stored = await AsyncStorage.getItem('mapProvider');
        if (stored && (stored === 'system' || stored === 'google' || stored === 'osm')) {
          if (isMounted) setMapProvider(stored as MapProviderKind);
        }
      } catch (e) {
        // silent fail is fine here
      } finally {
        if (isMounted) setIsReady(true);
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);


  /* ---------------- Snackbar ---------------- */

  const showSnackbar = (message: string, ctaLabel?: string) => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);

    setSnackbar({ visible: true, message, ctaLabel });

    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => (prev ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  const hideSnackbar = () => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbar((prev) => (prev ? { ...prev, visible: false } : prev));
  };

  /* -------------- Device bootstrap -------------- */

  useEffect(() => {
    const bootstrap = async () => {
      try {
        let uuid = await AsyncStorage.getItem(DEVICE_UUID_KEY);
        if (!uuid) {
          uuid = generateRandomUuid();
          await AsyncStorage.setItem(DEVICE_UUID_KEY, uuid);
        }
        setDeviceUuid(uuid);

        const storedToken = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
        if (storedToken) {
          setAuthToken(storedToken);
        }

        const res = await api.post(buildRoute(ApiRoutes.device.auth), {
          device_uuid: uuid,
          platform: Platform.OS,
          app_version: '1.0.0',
          device_model: '',
          os_version: '',
          locale: 'fr-DZ',
        });

        const token: string | undefined = res?.data?.data?.access_token;
        if (token) {
          setAuthToken(token);
          await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
        }
      } catch (err) {
        console.error('Device auth error', err);
        Alert.alert('Erreur', "Impossible d'authentifier le device.");
      } finally {
        setBootLoading(false);
      }
    };

    bootstrap();
  }, []);

  /* ---------------- Location ---------------- */

  useEffect(() => {
    const loadLocation = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Permission rejetée.');
          setLocationLoading(false);
          return;
        }

        const loc = await Location.getCurrentPositionAsync({});
        const lat = loc.coords.latitude ?? DEFAULT_LAT;
        const lng = loc.coords.longitude ?? DEFAULT_LNG;

        setCurrentLat(lat);
        setCurrentLng(lng);

        setRegion((prev) => ({ ...prev, latitude: lat, longitude: lng }));

        setTimeout(() => {
          mapRef.current?.animateToRegion(
            {
              latitude: lat,
              longitude: lng,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            },
            500
          );
        }, 300);
      } catch (err) {
        console.error('Location error', err);
      } finally {
        setLocationLoading(false);
      }
    };

    loadLocation();
  }, []);

  /* ---------------- Categories ---------------- */

  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get(buildRoute(ApiRoutes.taxonomy.categories), {
          params: {
            lang: 'fr',
            fields: 'id,slug,label,icon',
            active_only: true,
          },
          headers: { 'X-Requires-Auth': false },
        });

        const data: RoadHazardCategoryTaxonomyItem[] = res?.data?.data || [];
        setCategories(data);

        if (data.length && selectedCategoryId == null && data[0].id) {
          setSelectedCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Taxonomy error', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
  }, []);

  /* ---------------- Hazards ---------------- */

  const fetchRouteSummary = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) => {
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

  const fetchRoutePolyline = async (
    fromLat: number,
    fromLng: number,
    toLat: number,
    toLng: number,
  ) => {
    try {
      const url =
        `https://router.project-osrm.org/route/v1/driving/` +
        `${fromLng},${fromLat};${toLng},${toLat}` +
        `?overview=full&geometries=geojson`;

      const res = await fetch(url);
      const json = await res.json();

      const coords: [number, number][] =
        json?.routes?.[0]?.geometry?.coordinates ?? [];

      const polyline = coords.map(([lng, lat]) => ({
        latitude: lat,
        longitude: lng,
      }));

      setRouteCoords(polyline);
    } catch (err) {
      console.error('Route polyline error', err);
      // fallback: no crash, just no path
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

  const fetchNearbyHazards = async (lat: number, lng: number) => {
    setHazardsLoading(true);
    try {
      const res = await api.get(buildRoute(ApiRoutes.hazards.nearby), {
        params: { lat, lng, radius_km: 3 },
        headers: { 'X-Requires-Auth': false },
      });

      const data: RoadHazard[] = res?.data?.data || [];
      setHazards(data);
    } catch (err) {
      console.error('Nearby hazards error', err);
    } finally {
      setHazardsLoading(false);
    }
  };

  useEffect(() => {
    if (currentLat != null && currentLng != null) {
      fetchNearbyHazards(currentLat, currentLng);
    }
  }, [currentLat, currentLng]);

  const upsertHazard = (newHazard: RoadHazard) => {
    setHazards((prev) => {
      const exists = prev.find((h) => h.id === newHazard.id);
      if (exists) return prev.map((h) => (h.id === newHazard.id ? newHazard : h));
      return [newHazard, ...prev];
    });
  };

  const handleSubmitHazard = async () => {
    if (!deviceUuid) {
      Alert.alert('Erreur', 'Device non initialisé.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Erreur', 'Sélectionnez une catégorie.');
      return;
    }

    try {
      const lat = currentLat ?? region.latitude;
      const lng = currentLng ?? region.longitude;

      const payload = {
        device_uuid: deviceUuid,
        road_hazard_category_id: selectedCategoryId,
        severity,
        note: note.trim() || undefined,
        lat,
        lng,
        platform: Platform.OS,
        app_version: '1.0.0',
        locale: 'fr-DZ',
      };

      const res = await api.post(buildRoute(ApiRoutes.hazards.index), payload);
      const newHazard: RoadHazard = res.data.data;

      upsertHazard(newHazard);
      setNote('');
      setSeverity(3);

      Alert.alert(
        'Merci',
        res.data.meta.merged
          ? 'Signalement ajouté à un danger existant.'
          : 'Nouveau danger enregistré.'
      );

      closeReportSheet();
    } catch (err) {
      console.error('Submit hazard error', err);
      Alert.alert('Erreur', 'Impossible de soumettre le danger.');
    }
  };

  const handleQuickReport = async (slug: 'speed_bump' | 'pothole') => {
    if (!deviceUuid) {
      Alert.alert('Erreur', 'Device non initialisé.');
      return;
    }

    const category = categories.find((c) => c.slug === slug);
    if (!category?.id) {
      Alert.alert('Erreur', 'Catégorie non chargée.');
      return;
    }

    try {
      const lat = currentLat ?? region.latitude;
      const lng = currentLng ?? region.longitude;

      const payload = {
        device_uuid: deviceUuid,
        road_hazard_category_id: category.id,
        severity: 3,
        note: undefined,
        lat,
        lng,
        platform: Platform.OS,
        app_version: '1.0.0',
        locale: 'fr-DZ',
      };

      const res = await api.post(buildRoute(ApiRoutes.hazards.index), payload);
      const newHazard: RoadHazard = res.data.data;

      upsertHazard(newHazard);

      setSelectedCategoryId(category.id);
      setSeverity(newHazard.severity || 3);
      setNote('');

      showSnackbar(
        slug === 'speed_bump'
          ? 'Dos-d’âne enregistré.'
          : 'Nid-de-poule enregistré.',
        'Ajouter des détails'
      );

      // openReportSheet();
    } catch (err) {
      console.error('Quick hazard error', err);
      Alert.alert('Erreur', 'Impossible de soumettre le danger rapide.');
    }
  };

  const recenterOnUser = () => {
    if (currentLat == null || currentLng == null) return;
    const newRegion: Region = {
      latitude: currentLat,
      longitude: currentLng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  // if(!isReady) return null;

  return (
    <MapContext.Provider
      value={{
        bootLoading,
        locationLoading,
        categoriesLoading,
        hazardsLoading,

        region,
        setRegion,

        hazards,
        categories,

        selectedHazard,
        openHazardSheet,
        closeHazardSheet,
        // @ts-ignore
        hazardSheetRef,

        selectedCategoryId,
        setSelectedCategoryId,

        severity,
        setSeverity,

        note,
        setNote,

        snackbar,
        hideSnackbar,

        handleSubmitHazard,
        handleQuickReport,

        recenterOnUser,

        // @ts-ignore
        mapRef, hazardReportActionSheetRef,
        openReportSheet,
        closeReportSheet,

        // NEW
        destination,
        routeOrigin,
        routeSummary,
        routeLoading,
        selectDestination,

        // NEW
        routeCoords,
        clearRoute,

        openParamsSheet,
        closeParamsSheet,

        mapProvider,
        setMapProvider,
        updateMapProvider,
      }}
    >
      {children}


      <SnackbarBanner
        snackbar={snackbar}
        onPressCta={() => {
          hideSnackbar();
          openReportSheet();
        }}
      />

      <HazardReportSheet
        // @ts-ignore
        actionSheetRef={hazardReportActionSheetRef}
        region={region}
        categories={categories}
        categoriesLoading={categoriesLoading}
        selectedCategoryId={selectedCategoryId}
        severity={severity}
        note={note}
        submitting={false}
        onChangeCategory={setSelectedCategoryId}
        onChangeSeverity={setSeverity}
        onChangeNote={setNote}
        onSubmit={handleSubmitHazard}
        onCancel={closeReportSheet}
      />

      <HazardDetailSheet
        // @ts-ignore
        actionSheetRef={hazardSheetRef}
        hazard={selectedHazard}
        onClose={closeHazardSheet}
      />

      <MapParamsSheet
        // @ts-ignore
        actionSheetRef={paramsSheetRef}
        onShowHistory={() => {
          setTimeout(() => {
            historySheetRef.current?.show();
          }, 400);
        }}
      />

      <HazardHistorySheet
        // @ts-ignore
        actionSheetRef={historySheetRef}
        onPressItem={(item: HazardHistoryItem) => {
          historySheetRef.current?.hide();

          clearRoute(); // optional

          const newRegion: Region = {
            latitude: item.lat,
            longitude: item.lng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          };

          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 500);

          // if (item.hazard) {
          //   openHazardSheet(item.hazard);
          // }
        }}
      />



    </MapContext.Provider>
  );
};
