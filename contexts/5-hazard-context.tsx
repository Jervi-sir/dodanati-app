import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Region } from 'react-native-maps';

import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useDevice } from './2-device-context';
import { useLocation } from './3-location-context';
import { useUI } from './4-ui-context';

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
  upvotes: 0;
  downvotes: 0;
  reports_count: number;
  last_reported_at: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
  is_mine?: boolean | null;
  category?: {
    id: number;
    name_en: string;
    name_fr: string;
    name_ar: string;
    slug: string;
    icon: string | null;
  };
};

export type HazardCluster = {
  lat: number;
  lng: number;
  count: number;
};

export type NearbyPointsResponse = {
  mode: 'points';
  meta: {
    returned_count: number;
    total_in_radius: number;
    radius_km: number;
    limit: number;
  };
  data: RoadHazard[];
};

export type NearbyClustersResponse = {
  mode: 'clusters';
  meta: {
    total_in_radius: number;
    radius_km: number;
    zoom: number;
    cell_deg: number;
    returned_clusters: number;
    limit: number;
  };
  data: HazardCluster[];
};

export type NearbyResponse = NearbyPointsResponse | NearbyClustersResponse;

type HazardMode = 'points' | 'clusters';

type HazardContextType = {
  // data
  hazards: RoadHazard[];
  clusters: HazardCluster[];
  mode: HazardMode;
  totalInRadius: number;

  categories: RoadHazardCategoryTaxonomyItem[];
  categoriesLoading: boolean;
  hazardsLoading: boolean;

  selectedHazard: RoadHazard | null;
  setSelectedHazard: (h: RoadHazard | null) => void;

  selectedCategoryId: number | null;
  setSelectedCategoryId: (id: number) => void;

  severity: number;
  setSeverity: (s: number) => void;

  note: string;
  setNote: (s: string) => void;

  handleSubmitHazard: () => void;
  handleQuickReport: (slug: 'speed_bump' | 'pothole') => void;

  refreshHazards: () => void;

  deleteHazard: (id: number) => void;
};

const STORAGE_KEY_HAZARDS = 'offline_hazards_cache_v1';
const STORAGE_KEY_CLUSTERS = 'offline_hazard_clusters_cache_v1';

const HazardContext = createContext<HazardContextType | undefined>(undefined);

export const useHazards = () => {
  const ctx = useContext(HazardContext);
  if (!ctx) throw new Error('useHazards must be used within <HazardProvider>');
  return ctx;
};

// Simple haversine distance in km
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// Approx zoom from region longitudeDelta
export const zoomFromRegion = (region: Region) => {
  const angle = Math.max(region.longitudeDelta, 0.000001);
  return Math.round(Math.log2(360 / angle));
};

export const HazardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { deviceUuid } = useDevice();
  const { currentLat, currentLng, region } = useLocation();
  const { showSnackbar, closeReportSheet } = useUI();

  const [categories, setCategories] = useState<RoadHazardCategoryTaxonomyItem[]>([]);
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [clusters, setClusters] = useState<HazardCluster[]>([]);
  const [mode, setMode] = useState<HazardMode>('points');
  const [totalInRadius, setTotalInRadius] = useState(0);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [hazardsLoading, setHazardsLoading] = useState(false);

  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState('');

  // Track last fetch to avoid spamming
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);

  // Offline load (points + clusters)
  useEffect(() => {
    const loadOffline = async () => {
      try {
        const storedHazards = await AsyncStorage.getItem(STORAGE_KEY_HAZARDS);
        if (storedHazards) {
          const parsed = JSON.parse(storedHazards);
          if (Array.isArray(parsed)) setHazards(parsed);
        }

        const storedClusters = await AsyncStorage.getItem(STORAGE_KEY_CLUSTERS);
        if (storedClusters) {
          const parsed = JSON.parse(storedClusters);
          if (Array.isArray(parsed)) setClusters(parsed);
        }
      } catch (e) {
        console.error('Failed to load offline hazards/clusters', e);
      }
    };
    loadOffline();
  }, []);

  const cacheHazards = async (data: RoadHazard[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAZARDS, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache hazards', e);
    }
  };

  const cacheClusters = async (data: HazardCluster[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CLUSTERS, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache clusters', e);
    }
  };

  // Fetch categories (taxonomy)
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get(buildRoute(ApiRoutes.taxonomy.categories), {
          params: { lang: 'fr', fields: 'id,slug,label,icon', active_only: true },
          headers: { 'X-Requires-Auth': false },
        });

        const data = res?.data?.data || [];
        setCategories(data);

        if (data.length && selectedCategoryId == null && data[0]?.id) {
          setSelectedCategoryId(data[0].id);
        }
      } catch (err) {
        console.error('Taxonomy error', err);
      } finally {
        setCategoriesLoading(false);
      }
    };

    loadCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Upsert hazard into points array (used after submit/quick report)
  const upsertHazard = (newHazard: RoadHazard) => {
    setHazards((prev) => {
      const exists = prev.find((h) => h.id === newHazard.id);
      if (exists) return prev.map((h) => (h.id === newHazard.id ? newHazard : h));
      return [newHazard, ...prev];
    });
  };

  // MAIN fetch: returns either points or clusters based on backend mode
  const fetchNearby = useCallback(async (lat: number, lng: number, zoom: number) => {
    setHazardsLoading(true);
    try {
      const res = await api.get(buildRoute(ApiRoutes.hazards.nearby), {
        params: { lat, lng, radius_km: 10, zoom, mode: 'auto' },
        headers: { 'X-Requires-Auth': false },
      });

      const payload: NearbyResponse = res?.data;

      if (payload?.mode === 'points') {
        setMode('points');
        setHazards(payload.data || []);
        setClusters([]); // optional: clear clusters when in points
        setTotalInRadius(payload.meta?.total_in_radius ?? 0);
        cacheHazards(payload.data || []);
      } else if (payload?.mode === 'clusters') {
        setMode('clusters');
        setClusters(payload.data || []);
        // keep hazards as-is or clear them:
        // setHazards([]);
        setTotalInRadius(payload.meta?.total_in_radius ?? 0);
        cacheClusters(payload.data || []);
      } else {
        console.warn('Unknown hazards response', payload);
      }

      lastFetchRef.current = { lat, lng, zoom };
    } catch (err) {
      console.error('Nearby hazards error', err);
    } finally {
      setHazardsLoading(false);
    }
  }, []);

  // Auto fetch on region changes (debounced)
  useEffect(() => {
    if (!region) return;

    const z = zoomFromRegion(region);

    // Avoid fetching if moved < 2km AND zoom unchanged enough
    if (lastFetchRef.current) {
      const dist = getDistanceKm(
        lastFetchRef.current.lat,
        lastFetchRef.current.lng,
        region.latitude,
        region.longitude
      );

      const zoomDiff = Math.abs(lastFetchRef.current.zoom - z);

      // tweak thresholds:
      // - distance threshold
      // - zoom change threshold
      if (dist < 2 && zoomDiff < 1) return;
    }

    const timer = setTimeout(() => {
      fetchNearby(region.latitude, region.longitude, z);
    }, 500);

    return () => clearTimeout(timer);
  }, [region, fetchNearby]);

  const handleSubmitHazard = async () => {
    if (!deviceUuid) {
      Alert.alert('Erreur', 'Device non initialisé.');
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert('Erreur', 'Sélectionnez une catégorie.');
      return;
    }

    const lat = currentLat ?? region.latitude;
    const lng = currentLng ?? region.longitude;

    try {
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

      closeReportSheet();
      showSnackbar('Envoi en cours...');

      const res = await api.post(buildRoute(ApiRoutes.hazards.index), payload);
      const newHazard: RoadHazard = res.data.data;

      // If you're currently in clusters mode, you can still upsert locally,
      // but it won't show unless user zooms in. That's fine.
      upsertHazard(newHazard);

      setNote('');
      setSeverity(3);

      showSnackbar(res.data.meta?.merged ? 'Signalement fusionné.' : 'Signalement ajouté.', 'OK');
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

    const lat = currentLat ?? region.latitude;
    const lng = currentLng ?? region.longitude;

    showSnackbar(slug === 'speed_bump' ? 'Dos-d’âne enregistré.' : 'حفرة enregistré.', 'Ajouter détails');

    try {
      const payload = {
        device_uuid: deviceUuid,
        road_hazard_category_id: category.id,
        severity: 3,
        lat,
        lng,
        platform: Platform.OS,
        app_version: '1.0.0',
        locale: 'fr-DZ',
      };

      const res = await api.post(buildRoute(ApiRoutes.hazards.index), payload);
      upsertHazard(res.data.data);
    } catch (err) {
      console.error('Quick hazard error', err);
    }
  };

  const deleteHazard = async (id: number) => {
    setHazards((prev) => prev.filter((h) => h.id !== id));
    showSnackbar('Signalement supprimé.');

    try {
      await api.delete(buildRoute(ApiRoutes.hazards.delete, { hazard_id: id }));
    } catch (err) {
      console.error('Delete hazard error', err);
      Alert.alert('Erreur', 'Impossible de supprimer le signalement.');

      // refetch after failure
      if (region) {
        const z = zoomFromRegion(region);
        fetchNearby(region.latitude, region.longitude, z);
      }
    }
  };

  const refreshHazards = useCallback(() => {
    if (!region) return;
    const z = zoomFromRegion(region);
    fetchNearby(region.latitude, region.longitude, z);
  }, [region, fetchNearby]);

  return (
    <HazardContext.Provider
      value={{
        hazards,
        clusters,
        mode,
        totalInRadius,

        categories,
        categoriesLoading,
        hazardsLoading,

        selectedHazard,
        setSelectedHazard,

        selectedCategoryId,
        setSelectedCategoryId,

        severity,
        setSeverity,

        note,
        setNote,

        handleSubmitHazard,
        handleQuickReport,

        deleteHazard,
        refreshHazards,
      }}
    >
      {children}
    </HazardContext.Provider>
  );
};
