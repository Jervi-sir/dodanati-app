import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Region } from 'react-native-maps';

import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useDevice } from './2-device-context';
import { useLocation } from './3-location-context';
import { useUI } from './4-ui-context';
import { SheetManager } from 'react-native-actions-sheet';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineQueueStore, QueuedHazardReport } from '@/stores/offline-queue-store';
import { APP_VERSION, CACHE_TTL, CACHE_TTL_MS, DEFAULT_LOCALE, STORAGE_KEY_CACHE_META, STORAGE_KEY_CLUSTERS, STORAGE_KEY_HAZARDS } from '@/utils/const/app-constants';

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
  hazards: RoadHazard[];
  clusters: HazardCluster[];
  mode: HazardMode;
  totalInRadius: number;
  hazardCounts: { speed_bump: number; pothole: number };

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
  syncQueuedReport: (report: QueuedHazardReport) => Promise<void>;
  syncBulkQueuedReports: (
    reports: QueuedHazardReport[]
  ) => Promise<{ success: number; failed: number; results: any[] }>;
};


// ✅ Fallback taxonomy if server taxonomy.categories is missing/empty/fails
const FALLBACK_CATEGORIES: RoadHazardCategoryTaxonomyItem[] = [
  {
    id: 2,
    slug: 'pothole',
    label: 'Nid-de-poule',
    icon: 'pothole',
  },
  {
    id: 1,
    slug: 'speed_bump',
    label: 'Dos d’âne',
    icon: 'speed-bump',
  },
];

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
  const { showSnackbar } = useUI();
  const { isConnected } = useNetworkStatus();
  const { loadQueue, addToQueue, queue } = useOfflineQueueStore();

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

  const hazardCounts = React.useMemo(() => {
    const counts = { speed_bump: 0, pothole: 0 };
    if (mode === 'points') {
      hazards.forEach((h) => {
        if (h.category?.slug === 'speed_bump') counts.speed_bump++;
        if (h.category?.slug === 'pothole') counts.pothole++;
      });
    }
    return counts;
  }, [hazards, mode]);

  // Track last fetch to avoid spamming
  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const hasShownSyncPrompt = useRef(false);

  // Load offline queue on mount
  useEffect(() => {
    loadQueue();
  }, [loadQueue]);

  // Check cache validity and show sync prompt
  useEffect(() => {
    const checkCacheAndQueue = async () => {
      try {
        const metaStr = await AsyncStorage.getItem(STORAGE_KEY_CACHE_META);
        if (metaStr) {
          const meta = JSON.parse(metaStr);
          const now = Date.now();
          if (meta.timestamp && now - meta.timestamp > CACHE_TTL) {
            console.log('Cache expired, will refresh on next fetch');
          }
        }

        if (isConnected && queue.length > 0 && !hasShownSyncPrompt.current) {
          hasShownSyncPrompt.current = true;
          setTimeout(() => {
            SheetManager.show('sync-queue-sheet');
          }, 1000);
        }
      } catch (e) {
        console.error('Failed to check cache metadata', e);
      }
    };

    checkCacheAndQueue();
  }, [isConnected, queue.length]);

  // Offline load (points + clusters) with TTL check
  useEffect(() => {
    const loadOffline = async () => {
      try {
        const metaStr = await AsyncStorage.getItem(STORAGE_KEY_CACHE_META);
        let cacheValid = false;

        if (metaStr) {
          const meta = JSON.parse(metaStr);
          const now = Date.now();
          cacheValid = meta.timestamp && now - meta.timestamp < CACHE_TTL;
        }

        if (cacheValid || !isConnected) {
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
        }
      } catch (e) {
        console.error('Failed to load offline hazards/clusters', e);
      }
    };
    loadOffline();
  }, [isConnected]);

  const cacheHazards = async (data: RoadHazard[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAZARDS, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEY_CACHE_META,
        JSON.stringify({
          timestamp: Date.now(),
          hazardsCount: data.length,
        })
      );
    } catch (e) {
      console.error('Failed to cache hazards', e);
    }
  };

  const cacheClusters = async (data: HazardCluster[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CLUSTERS, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEY_CACHE_META,
        JSON.stringify({
          timestamp: Date.now(),
          clustersCount: data.length,
        })
      );
    } catch (e) {
      console.error('Failed to cache clusters', e);
    }
  };

  // ✅ Fetch categories (taxonomy) with fallback
  useEffect(() => {
    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get(buildRoute(ApiRoutes.taxonomy.categories), {
          params: { lang: 'fr', fields: 'id,slug,label,icon', active_only: true },
          headers: { 'X-Requires-Auth': false },
        });

        const data: RoadHazardCategoryTaxonomyItem[] = res?.data?.data ?? [];

        if (Array.isArray(data) && data.length > 0) {
          setCategories(data);
          if (selectedCategoryId == null && data[0]?.id) {
            setSelectedCategoryId(data[0].id);
          }
        } else {
          console.warn('Taxonomy empty, using fallback categories');
          setCategories(FALLBACK_CATEGORIES);
          if (selectedCategoryId == null) {
            setSelectedCategoryId(FALLBACK_CATEGORIES[0].id!);
          }
        }
      } catch (err) {
        console.error('Taxonomy error, using fallback', err);
        setCategories(FALLBACK_CATEGORIES);
        if (selectedCategoryId == null) {
          setSelectedCategoryId(FALLBACK_CATEGORIES[0].id!);
        }
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

  // Calculate viewport bounds from region
  const calculateViewportBounds = (region: Region) => {
    const latDelta = region.latitudeDelta;
    const lngDelta = region.longitudeDelta;
    return {
      minLat: region.latitude - latDelta / 2,
      maxLat: region.latitude + latDelta / 2,
      minLng: region.longitude - lngDelta / 2,
      maxLng: region.longitude + lngDelta / 2,
    };
  };

  // MAIN fetch: returns either points or clusters based on backend mode
  const fetchNearby = useCallback(
    async (lat: number, lng: number, zoom: number, currentRegion: Region) => {
      if (!isConnected) {
        console.log('Offline mode: using cached data');
        return;
      }

      setHazardsLoading(true);
      try {
        const bounds = calculateViewportBounds(currentRegion);

        const res = await api.get(buildRoute(ApiRoutes.hazards.nearby), {
          params: {
            lat,
            lng,
            zoom,
            mode: 'auto',
            minLat: bounds.minLat,
            maxLat: bounds.maxLat,
            minLng: bounds.minLng,
            maxLng: bounds.maxLng,
          },
          headers: { 'X-Requires-Auth': false },
        });

        const payload: NearbyResponse = res?.data;

        if (payload?.mode === 'points') {
          setMode('points');
          setHazards(payload.data || []);
          setClusters([]);
          setTotalInRadius(payload.meta?.total_in_radius ?? 0);
          cacheHazards(payload.data || []);
        } else if (payload?.mode === 'clusters') {
          setMode('clusters');
          setClusters(payload.data || []);
          setTotalInRadius(payload.meta?.total_in_radius ?? 0);
          cacheClusters(payload.data || []);
        } else {
          console.warn('Unknown hazards response', payload);
        }

        lastFetchRef.current = { lat, lng, zoom };
      } catch (err) {
        console.error('Nearby hazards error', err);
        showSnackbar('Erreur de chargement', 'Erreur');
      } finally {
        setHazardsLoading(false);
      }
    },
    [isConnected, showSnackbar]
  );

  // Auto fetch on region changes (debounced)
  useEffect(() => {
    if (!region) return;

    const z = zoomFromRegion(region);

    if (lastFetchRef.current) {
      const dist = getDistanceKm(
        lastFetchRef.current.lat,
        lastFetchRef.current.lng,
        region.latitude,
        region.longitude
      );

      const zoomDiff = Math.abs(lastFetchRef.current.zoom - z);

      if (dist < 2 && zoomDiff < 1) return;
    }

    const timer = setTimeout(() => {
      fetchNearby(region.latitude, region.longitude, z, region);
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

    const payload = {
      device_uuid: deviceUuid,
      road_hazard_category_id: selectedCategoryId,
      severity,
      note: note.trim() || undefined,
      lat,
      lng,
      platform: Platform.OS,
      app_version: APP_VERSION,
      locale: DEFAULT_LOCALE,
    };

    SheetManager.hide('hazard-report-sheet');

    if (!isConnected) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      await addToQueue({
        ...payload,
        categorySlug: category?.slug,
        categoryLabel: category?.label,
      });

      setNote('');
      setSeverity(3);

      showSnackbar("Signalement mis en file d'attente", 'OK');
      return;
    }

    try {
      showSnackbar('Envoi en cours...');

      const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
      const newHazard: RoadHazard = res.data.data;

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

    if (!isConnected) {
      await addToQueue({
        ...payload,
        categorySlug: category.slug,
        categoryLabel: category.label,
      });
      showSnackbar(slug === 'speed_bump' ? "Dos-d'âne mis en file d'attente" : 'حفرة mis en file d’attente', 'OK');
      return;
    }

    showSnackbar(slug === 'speed_bump' ? "Dos-d'âne enregistré." : 'حفرة enregistré.', 'Ajouter détails');

    try {
      const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
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

      if (region) {
        const z = zoomFromRegion(region);
        fetchNearby(region.latitude, region.longitude, z, region);
      }
    }
  };

  const refreshHazards = useCallback(() => {
    if (!region) return;
    const z = zoomFromRegion(region);
    fetchNearby(region.latitude, region.longitude, z, region);
  }, [region, fetchNearby]);

  // Sync a queued report to the server (single)
  const syncQueuedReport = useCallback(
    async (report: QueuedHazardReport) => {
      if (!isConnected) {
        throw new Error('Cannot sync while offline');
      }

      try {
        const { id, queuedAt, categorySlug, categoryLabel, ...payload } = report;
        const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
        const newHazard: RoadHazard = res.data.data;
        upsertHazard(newHazard);
        return res.data;
      } catch (err) {
        console.error('Sync queued report error', err);
        throw err;
      }
    },
    [isConnected]
  );

  // Bulk sync queued reports to the server
  const syncBulkQueuedReports = useCallback(
    async (reports: QueuedHazardReport[]) => {
      if (!isConnected) {
        throw new Error('Cannot sync while offline');
      }

      if (reports.length === 0) {
        return { success: 0, failed: 0, results: [] };
      }

      try {
        const firstReport = reports[0];

        const items = reports.map((report) => {
          const { id, queuedAt, categorySlug, categoryLabel, device_uuid, platform, app_version, locale, ...item } = report;
          return {
            ...item,
            client_ref: id,
          };
        });

        const payload = {
          device_uuid: firstReport.device_uuid,
          platform: firstReport.platform,
          app_version: firstReport.app_version,
          locale: firstReport.locale,
          items,
        };

        console.log('Bulk sync payload:', payload);

        const res = await api.post(buildRoute(ApiRoutes.hazards.bulk), payload);
        const responseData = res.data;

        if (responseData.data && Array.isArray(responseData.data)) {
          responseData.data.forEach((hazard: RoadHazard) => {
            upsertHazard(hazard);
          });
        }

        return {
          success: responseData.meta?.created_count || reports.length,
          failed: responseData.meta?.failed_count || 0,
          results: responseData.data || [],
        };
      } catch (err) {
        console.error('Bulk sync error', err);
        throw err;
      }
    },
    [isConnected]
  );

  return (
    <HazardContext.Provider
      value={{
        hazards,
        clusters,
        mode,
        totalInRadius,
        hazardCounts,

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
        syncQueuedReport,
        syncBulkQueuedReports,
      }}
    >
      {children}
    </HazardContext.Provider>
  );
};
