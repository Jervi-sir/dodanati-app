import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useDevice } from './device-context';
import { useLocation } from './location-context';
import { useUI } from './ui-context';
import { Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  upvotes: 0,
  downvotes: 0,
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

type HazardContextType = {
  hazards: RoadHazard[];
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
}

const STORAGE_KEY_HAZARDS = 'offline_hazards_cache';

const HazardContext = createContext<HazardContextType | undefined>(undefined);

export const useHazards = () => {
  const ctx = useContext(HazardContext);
  if (!ctx) throw new Error('useHazards must be used within <HazardProvider>');
  return ctx;
};

// Simple distance calculation (Haversine approximation for short distances)
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371; // Radius of the earth in km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const HazardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { deviceUuid } = useDevice();
  const { currentLat, currentLng, region } = useLocation();
  const { showSnackbar, closeReportSheet, openReportSheet } = useUI();

  const [categories, setCategories] = useState<RoadHazardCategoryTaxonomyItem[]>([]);
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [hazardsLoading, setHazardsLoading] = useState(false);

  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState('');

  const lastFetchRef = useRef<{ lat: number; lng: number } | null>(null);

  // Load offline hazards on mount
  useEffect(() => {
    const loadOffline = async () => {
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY_HAZARDS);
        if (stored) {
          const parsed = JSON.parse(stored);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setHazards(parsed);
          }
        }
      } catch (e) {
        console.error('Failed to load offline hazards', e);
      }
    };
    loadOffline();
  }, []);

  // Save hazards to offline storage whenever they update (debounced?)
  // We can just save them when we fetch new ones successfully
  const cacheHazards = async (data: RoadHazard[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAZARDS, JSON.stringify(data));
    } catch (e) {
      console.error('Failed to cache hazards', e);
    }
  };

  // Debouncing fetch
  const fetchNearbyHazards = useCallback(async (lat: number, lng: number) => {
    setHazardsLoading(true);
    try {
      const res = await api.get(buildRoute(ApiRoutes.hazards.nearby), {
        params: { lat, lng, radius_km: 10 },
        headers: { 'X-Requires-Auth': false },
      });
      const data: RoadHazard[] = res?.data?.data || [];
      setHazards(data);
      cacheHazards(data); // Cache new data
      lastFetchRef.current = { lat, lng }; // Update last fetch ref
    } catch (err) {
      console.error('Nearby hazards error', err);
    } finally {
      setHazardsLoading(false);
    }
  }, []);

  // Fetch when region changes significantly
  useEffect(() => {
    if (region) {
      // Avoid fetching if we haven't moved far enough (e.g., 2km)
      if (lastFetchRef.current) {
        const dist = getDistanceKm(lastFetchRef.current.lat, lastFetchRef.current.lng, region.latitude, region.longitude);
        // If distance is less than 2km, skip fetch
        if (dist < 2) return;
      }

      const timer = setTimeout(() => {
        fetchNearbyHazards(region.latitude, region.longitude);
      }, 500); // 500ms debounce
      return () => clearTimeout(timer);
    }
  }, [region, fetchNearbyHazards]);

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

    // Optimistic Update can be tricky for new IDs, but we can display a temp marker if needed.
    // For now we will rely on fast server response, but show success immediately?

    // We'll prepare payload
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

      // Close sheet immediately for better UX
      closeReportSheet();
      showSnackbar('Envoi en cours...');

      const res = await api.post(buildRoute(ApiRoutes.hazards.index), payload);
      const newHazard: RoadHazard = res.data.data;

      // Update safely
      upsertHazard(newHazard);
      setNote('');
      setSeverity(3);

      showSnackbar(res.data.meta.merged ? 'Signalement fusionné.' : 'Signalement ajouté.', 'OK');

    } catch (err) {
      console.error('Submit hazard error', err);
      Alert.alert('Erreur', 'Impossible de soumettre le danger.');
      // Ideally rollback optimistic UI here if we had applied it.
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

    // Optimistic: create a fake hazard and add it?
    // Since we don't have ID, maybe just fire and forget.

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
      // Maybe show toast for failure
    }
  };

  const deleteHazard = async (id: number) => {
    // Optimistic delete
    setHazards((prev) => prev.filter((h) => h.id !== id));
    showSnackbar('Signalement supprimé.');

    try {
      // TODO: Implement actual API call to Laravel backend
      await api.delete(buildRoute(ApiRoutes.hazards.delete, { hazard_id: id }));
      console.log('Deleted hazard', id, '(Mock)');
    } catch (err) {
      console.error('Delete hazard error', err);
      Alert.alert('Erreur', 'Impossible de supprimer le signalement.');
      fetchNearbyHazards(region.latitude, region.longitude);
    }
  };

  return (
    <HazardContext.Provider
      value={{
        hazards,
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
        refreshHazards: () => fetchNearbyHazards(region.latitude, region.longitude),
      }}
    >
      {children}
    </HazardContext.Provider>
  );
};
