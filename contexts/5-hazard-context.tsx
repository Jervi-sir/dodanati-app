import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { Alert, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Region } from "react-native-maps";
import { SheetManager } from "react-native-actions-sheet";
import * as Speech from 'expo-speech';
import api from "@/utils/api/axios-instance";
import { ApiRoutes, buildRoute } from "@/utils/api/api";
import { useDevice } from "./2-device-context";
import { useLocation } from "./3-location-context";
import { useUI } from "./4-ui-context";
import { useNetworkStatus } from "@/hooks/use-network-status";
import { useOfflineQueueStore, QueuedHazardReport } from "@/stores/offline-queue-store";
import { APP_VERSION, CACHE_TTL, DEFAULT_LOCALE, STORAGE_KEY_CACHE_META, STORAGE_KEY_CLUSTERS, STORAGE_KEY_HAZARDS, } from "@/utils/const/app-constants";
import { useTrans } from "@/hooks/use-trans";

const TRANSLATIONS = {
  device_not_init: { en: "Device not initialized.", fr: "Appareil non initialisé.", ar: "الجهاز غير مهيأ." },
  select_category: { en: "Select a category.", fr: "Sélectionnez une catégorie.", ar: "اختر فئة." },
  report_queued: { en: "Report queued", fr: "Signalement mis en file d'attente", ar: "تم وضع التبليغ في الانتظار" },
  speed_bump_queued: { en: "Speed bump queued", fr: "Dos-d'âne mis en file d'attente", ar: "تم وضع المطب في الانتظار" },
  pothole_queued: { en: "Pothole queued", fr: "Nid-de-poule mis en file d'attente", ar: "تم وضع الحفرة في الانتظار" },
  report_saved: { en: "Report saved.", fr: "Signalement enregistré.", ar: "تم حفظ التبليغ." },
  speed_bump_saved: { en: "Speed bump saved.", fr: "Dos-d'âne enregistré.", ar: "تم حفظ المطب." },
  pothole_saved: { en: "Pothole saved.", fr: "Nid-de-poule enregistré.", ar: "تم حفظ الحفرة." },
  add_details: { en: "Add details", fr: "Ajouter détails", ar: "إضافة تفاصيل" },
  sending: { en: "Sending...", fr: "Envoi en cours...", ar: "جاري الإرسال..." },
  report_merged: { en: "Report merged.", fr: "Signalement fusionné.", ar: "تم دمج التبليغ." },
  report_added: { en: "Report added.", fr: "Signalement ajouté.", ar: "تم إضافة التبليغ." },
  submit_error: { en: "Cannot submit hazard.", fr: "Impossible de soumettre le danger.", ar: "تعذر إرسال الخطر." },
  category_not_loaded: { en: "Category not loaded.", fr: "Catégorie non chargée.", ar: "الفئة غير محملة." },
  offline_report_deleted: { en: "Offline report deleted.", fr: "Signalement hors ligne supprimé.", ar: "تم حذف التبليغ غير المتصل." },
  report_deleted: { en: "Report deleted.", fr: "Signalement supprimé.", ar: "تم حذف التبليغ." },
  delete_error: { en: "Cannot delete report.", fr: "Impossible de supprimer le signalement.", ar: "تعذر حذف التبليغ." },
  loading_error: { en: "Loading error", fr: "Erreur de chargement", ar: "خطأ في التحميل" },
  error: { en: "Error", fr: "Erreur", ar: "خطأ" },
  ok: { en: "OK", fr: "OK", ar: "موافق" },
};

type RoadHazardCategoryTaxonomyItem = {
  id?: number;
  slug?: string;
  label?: string;
  icon?: string | null;
  name_en?: string;
  name_fr?: string;
  name_ar?: string;
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
  isOffline?: boolean;
  offlineId?: string;
};

type HazardCluster = { lat: number; lng: number; count: number };

type NearbyPointsResponse = {
  mode: "points";
  meta: { returned_count: number; total_in_radius: number; radius_km: number; limit: number };
  data: RoadHazard[];
};

type NearbyClustersResponse = {
  mode: "clusters";
  meta: { total_in_radius: number; radius_km: number; zoom: number; cell_deg: number; returned_clusters: number; limit: number };
  data: HazardCluster[];
};

type NearbyResponse = NearbyPointsResponse | NearbyClustersResponse;
type HazardMode = "points" | "clusters";

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
  setSelectedCategoryId: (id: number | null) => void;

  severity: number;
  setSeverity: (s: number) => void;

  note: string;
  setNote: (s: string) => void;

  handleSubmitHazard: () => void;
  handleQuickReport: (slug: "speed_bump" | "pothole") => void;

  refreshHazards: () => void;

  deleteHazard: (id: number) => void;

  syncBulkQueuedReports: (
    reports: QueuedHazardReport[]
  ) => Promise<{ success: number; failed: number; results: any[] }>;

  isVoiceEnabled: boolean;
  setIsVoiceEnabled: (enabled: boolean) => void;
};

const HazardContext = createContext<HazardContextType | undefined>(undefined);

export const useHazards = () => {
  const ctx = useContext(HazardContext);
  if (!ctx) throw new Error("useHazards must be used within <HazardProvider>");
  return ctx;
};

// ✅ Fallback taxonomy if server fails
const FALLBACK_CATEGORIES: RoadHazardCategoryTaxonomyItem[] = [
  { id: 2, slug: "pothole", label: "Nid-de-poule", name_fr: "Nid-de-poule", name_en: "Pothole", name_ar: "حفرة", icon: "pothole" },
  { id: 1, slug: "speed_bump", label: "Dos d’âne", name_fr: "Dos d’âne", name_en: "Speed Bump", name_ar: "مطب", icon: "speed-bump" },
];

// distance km
const getDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * (Math.PI / 180)) *
    Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) ** 2;
  return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
};

// zoom approximation
export const zoomFromRegion = (region: Region) => {
  const angle = Math.max(region.longitudeDelta, 0.000001);
  return Math.round(Math.log2(360 / angle));
};

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

// tiny stable debouncer
const useDebouncedCallback = (fn: () => void, delayMs: number) => {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  return useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(fn, delayMs);
  }, [fn, delayMs]);
};

export const HazardProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { deviceUuid } = useDevice();
  const { currentLat, currentLng, region } = useLocation(); // region may be null depending on your location provider
  const { showSnackbar } = useUI();
  const { isConnected } = useNetworkStatus();
  const { loadQueue, addToQueue, removeFromQueue, queue } = useOfflineQueueStore();
  const { t, language } = useTrans(TRANSLATIONS);

  const [categories, setCategories] = useState<RoadHazardCategoryTaxonomyItem[]>([]);
  const [hazards, setHazards] = useState<RoadHazard[]>([]);
  const [clusters, setClusters] = useState<HazardCluster[]>([]);
  const [mode, setMode] = useState<HazardMode>("points");
  const [totalInRadius, setTotalInRadius] = useState(0);

  const [categoriesLoading, setCategoriesLoading] = useState(false);
  const [hazardsLoading, setHazardsLoading] = useState(false);

  const [selectedHazard, setSelectedHazard] = useState<RoadHazard | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null>(null);
  const [severity, setSeverity] = useState(3);
  const [note, setNote] = useState("");
  const [isVoiceEnabled, setIsVoiceEnabled] = useState(false);

  const lastFetchRef = useRef<{ lat: number; lng: number; zoom: number } | null>(null);
  const hasShownSyncPrompt = useRef(false);

  const cacheHazards = useCallback(async (data: RoadHazard[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_HAZARDS, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEY_CACHE_META,
        JSON.stringify({ timestamp: Date.now(), hazardsCount: data.length })
      );
    } catch (e) {
      console.error("Failed to cache hazards", e);
    }
  }, []);

  const cacheClusters = useCallback(async (data: HazardCluster[]) => {
    try {
      await AsyncStorage.setItem(STORAGE_KEY_CLUSTERS, JSON.stringify(data));
      await AsyncStorage.setItem(
        STORAGE_KEY_CACHE_META,
        JSON.stringify({ timestamp: Date.now(), clustersCount: data.length })
      );
    } catch (e) {
      console.error("Failed to cache clusters", e);
    }
  }, []);

  // ✅ init: load queue + offline cache, and show sync prompt once
  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      try {
        await loadQueue();

        // offline load if cache valid OR currently offline
        const metaStr = await AsyncStorage.getItem(STORAGE_KEY_CACHE_META);
        let cacheValid = false;

        if (metaStr) {
          const meta = JSON.parse(metaStr);
          cacheValid = meta?.timestamp && Date.now() - meta.timestamp < CACHE_TTL;
        }

        if (cacheValid || !isConnected) {
          const [storedHazards, storedClusters] = await Promise.all([
            AsyncStorage.getItem(STORAGE_KEY_HAZARDS),
            AsyncStorage.getItem(STORAGE_KEY_CLUSTERS),
          ]);

          if (!cancelled && storedHazards) {
            const parsed = JSON.parse(storedHazards);
            if (Array.isArray(parsed)) setHazards(parsed);
          }

          if (!cancelled && storedClusters) {
            const parsed = JSON.parse(storedClusters);
            if (Array.isArray(parsed)) setClusters(parsed);
          }
        }

        // show sync prompt once when online and queue has items
        if (!cancelled && isConnected && queue.length > 0 && !hasShownSyncPrompt.current) {
          hasShownSyncPrompt.current = true;
          setTimeout(() => SheetManager.show("sync-queue-sheet"), 800);
        }
      } catch (e) {
        console.error("Init hazards failed", e);
      }
    };

    init();
    return () => {
      cancelled = true;
    };
    // IMPORTANT: queue.length is enough here; avoids re-running on queue object identity changes
  }, [loadQueue, isConnected, queue.length]);

  // ✅ taxonomy load (kept separate; low-frequency)
  useEffect(() => {
    let cancelled = false;

    const loadCategories = async () => {
      setCategoriesLoading(true);
      try {
        const res = await api.get(buildRoute(ApiRoutes.taxonomy.categories), {
          params: { lang: "fr", fields: "id,slug,label,icon", active_only: true },
          headers: { "X-Requires-Auth": false },
        });

        const data: RoadHazardCategoryTaxonomyItem[] = res?.data?.data ?? [];

        if (!cancelled && Array.isArray(data) && data.length > 0) {
          setCategories(data);
          setSelectedCategoryId((prev) => prev ?? data[0]?.id ?? null);
        } else if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES);
          setSelectedCategoryId((prev) => prev ?? FALLBACK_CATEGORIES[0].id ?? null);
        }
      } catch (err) {
        console.error("Taxonomy error, using fallback", err);
        if (!cancelled) {
          setCategories(FALLBACK_CATEGORIES);
          setSelectedCategoryId((prev) => prev ?? FALLBACK_CATEGORIES[0].id ?? null);
        }
      } finally {
        if (!cancelled) setCategoriesLoading(false);
      }
    };

    loadCategories();
    return () => {
      cancelled = true;
    };
  }, []);

  const upsertHazard = useCallback((newHazard: RoadHazard) => {
    setHazards((prev) => {
      const i = prev.findIndex((h) => h.id === newHazard.id);
      if (i >= 0) {
        const next = prev.slice();
        next[i] = newHazard;
        return next;
      }
      return [newHazard, ...prev];
    });
  }, []);

  const fetchNearby = useCallback(
    async (lat: number, lng: number, zoom: number, currentRegion: Region) => {
      if (!isConnected) return;

      setHazardsLoading(true);
      try {
        const bounds = calculateViewportBounds(currentRegion);

        const res = await api.get(buildRoute(ApiRoutes.hazards.nearby), {
          params: {
            lat,
            lng,
            zoom,
            mode: "auto",
            ...bounds,
          },
          headers: { "X-Requires-Auth": false },
        });

        const payload: NearbyResponse = res?.data;

        if (payload?.mode === "points") {
          setMode("points");
          setHazards(payload.data || []);
          setClusters([]);
          setTotalInRadius(payload.meta?.total_in_radius ?? 0);
          cacheHazards(payload.data || []);
        } else if (payload?.mode === "clusters") {
          setMode("clusters");
          setClusters(payload.data || []);
          setHazards([]); // optional: keep points empty in cluster mode
          setTotalInRadius(payload.meta?.total_in_radius ?? 0);
          cacheClusters(payload.data || []);
        }

        lastFetchRef.current = { lat, lng, zoom };
      } catch (err) {
        console.error("Nearby hazards error", err);
        showSnackbar(t("loading_error"), t("error"));
      } finally {
        setHazardsLoading(false);
      }
    },
    [isConnected, cacheHazards, cacheClusters, showSnackbar, t]
  );

  // ✅ stable auto-fetch on region changes (debounced)
  const triggerFetch = useDebouncedCallback(() => {
    if (!region) return;
    const z = zoomFromRegion(region);

    if (lastFetchRef.current) {
      const dist = getDistanceKm(lastFetchRef.current.lat, lastFetchRef.current.lng, region.latitude, region.longitude);
      const zoomDiff = Math.abs(lastFetchRef.current.zoom - z);
      if (dist < 2 && zoomDiff < 1) return;
    }

    fetchNearby(region.latitude, region.longitude, z, region);
  }, 500);

  useEffect(() => {
    if (!region) return;
    triggerFetch();
  }, [region, triggerFetch]);

  const refreshHazards = useCallback(() => {
    if (!region) return;
    const z = zoomFromRegion(region);
    fetchNearby(region.latitude, region.longitude, z, region);
  }, [region, fetchNearby]);

  const hazardCounts = useMemo(() => {
    const counts = { speed_bump: 0, pothole: 0 };
    if (mode === "points") {
      for (const h of hazards) {
        if (h.category?.slug === "speed_bump") counts.speed_bump++;
        if (h.category?.slug === "pothole") counts.pothole++;
      }
    }
    return counts;
  }, [hazards, mode]);

  const mergedHazards = useMemo(() => {
    const offlineHazards: RoadHazard[] = queue.map((q) => {
      const tempId = -1 * (q.queuedAt || Date.now());
      return {
        id: tempId,
        lat: q.lat,
        lng: q.lng,
        road_hazard_category_id: q.road_hazard_category_id,
        severity: q.severity,
        note: q.note || null,
        upvotes: 0,
        downvotes: 0,
        reports_count: 0,
        last_reported_at: q.queuedAt ? new Date(q.queuedAt).toISOString() : null,
        is_active: true,
        is_mine: true,
        isOffline: true,
        offlineId: q.id,
        category: {
          id: q.road_hazard_category_id,
          slug: q.categorySlug || "unknown",
          name_en: q.categoryLabel || "Unknown",
          name_fr: q.categoryLabel || "Inconnu",
          name_ar: q.categoryLabel || "Unknown",
          icon: null,
        },
      };
    });
    return [...offlineHazards, ...hazards];
  }, [queue, hazards]);

  const handleSubmitHazard = useCallback(async () => {
    if (!deviceUuid) {
      Alert.alert(t("error"), t("device_not_init"));
      return;
    }
    if (!selectedCategoryId) {
      Alert.alert(t("error"), t("select_category"));
      return;
    }
    if (!region && (currentLat == null || currentLng == null)) {
      Alert.alert(t("error"), t("loading_error"));
      return;
    }

    const lat = currentLat ?? region!.latitude;
    const lng = currentLng ?? region!.longitude;

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

    SheetManager.hide("hazard-report-sheet");

    if (!isConnected) {
      const category = categories.find((c) => c.id === selectedCategoryId);
      await addToQueue({ ...payload, categorySlug: category?.slug, categoryLabel: category?.label });

      setNote("");
      setSeverity(3);
      showSnackbar(t("report_queued"), t("ok"));
      return;
    }

    try {
      showSnackbar(t("sending"));
      const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
      const newHazard: RoadHazard = res.data.data;
      upsertHazard(newHazard);

      setNote("");
      setSeverity(3);

      showSnackbar(res.data.meta?.merged ? t("report_merged") : t("report_added"), t("ok"));
    } catch (err) {
      console.error("Submit hazard error", err);
      Alert.alert(t("error"), t("submit_error"));
    }
  }, [
    deviceUuid,
    selectedCategoryId,
    severity,
    note,
    currentLat,
    currentLng,
    region,
    isConnected,
    categories,
    addToQueue,
    showSnackbar,
    t,
    upsertHazard,
  ]);

  const handleQuickReport = useCallback(
    async (slug: "speed_bump" | "pothole") => {
      if (!deviceUuid) {
        Alert.alert(t("error"), t("device_not_init"));
        return;
      }

      const category = categories.find((c) => c.slug === slug);
      if (!category?.id) {
        Alert.alert(t("error"), t("category_not_loaded"));
        return;
      }

      if (!region && (currentLat == null || currentLng == null)) {
        Alert.alert(t("error"), t("loading_error"));
        return;
      }

      const lat = currentLat ?? region!.latitude;
      const lng = currentLng ?? region!.longitude;

      const payload = {
        device_uuid: deviceUuid,
        road_hazard_category_id: category.id,
        severity: 3,
        lat,
        lng,
        platform: Platform.OS,
        app_version: APP_VERSION,
        locale: DEFAULT_LOCALE,
      };

      // Speech Feedback
      if (isVoiceEnabled) {
        const speechMsg = slug === "speed_bump"
          ? (isConnected ? t("speed_bump_saved") : t("speed_bump_queued"))
          : (isConnected ? t("pothole_saved") : t("pothole_queued"));

        console.log('[Voice Debug] Speaking:', speechMsg);
        Speech.speak(speechMsg, { language: language || 'en' });
      }

      if (!isConnected) {
        await addToQueue({ ...payload, categorySlug: category.slug, categoryLabel: category.label });
        showSnackbar(slug === "speed_bump" ? t("speed_bump_queued") : t("pothole_queued"), t("ok"));
        return;
      }

      showSnackbar(slug === "speed_bump" ? t("speed_bump_saved") : t("pothole_saved"), t("add_details"));

      try {
        const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
        upsertHazard(res.data.data);
      } catch (err) {
        console.error("Quick hazard error", err);
      }
    },
    [deviceUuid, categories, currentLat, currentLng, region, isConnected, addToQueue, showSnackbar, t, upsertHazard, language, isVoiceEnabled]
  );

  // ✅ SIMULATED VOICE LISTENER (Expo Go Workaround)
  // Since 'react-native-voice' (STT) requires a native build and doesn't work in Expo Go,
  // we simulate "hearing" a command every few seconds to demonstrate the hands-free flow.
  useEffect(() => {
    let voiceInterval: NodeJS.Timeout;

    if (isVoiceEnabled) {
      console.log("[Voice] Listening started... (Simulated Mode for Expo Go)");

      voiceInterval = setInterval(() => {
        // 1. Simulate random "words"
        const r = Math.random();
        let heardWord = "";

        if (r > 0.9) heardWord = "speed_bump";
        else if (r > 0.8) heardWord = "pothole";
        else return; // heard nothing/silence

        console.log(`[Voice] Heard command: "${heardWord}"`);

        // 2. Trigger action
        if (heardWord === "speed_bump") handleQuickReport("speed_bump");
        if (heardWord === "pothole") handleQuickReport("pothole");

      }, 8000); // Check every 8 seconds
    } else {
      console.log("[Voice] Listening stopped.");
    }

    return () => {
      if (voiceInterval) clearInterval(voiceInterval);
    };
  }, [isVoiceEnabled, handleQuickReport]);

  const deleteHazard = useCallback(
    async (id: number) => {
      const hazardToDelete = mergedHazards.find((h) => h.id === id);

      if (hazardToDelete?.isOffline && hazardToDelete.offlineId) {
        await removeFromQueue(hazardToDelete.offlineId);
        showSnackbar(t("offline_report_deleted"));
        return;
      }

      setHazards((prev) => prev.filter((h) => h.id !== id));
      showSnackbar(t("report_deleted"));

      try {
        await api.delete(buildRoute(ApiRoutes.hazards.delete, { hazard_id: id }));
      } catch (err) {
        console.error("Delete hazard error", err);
        Alert.alert(t("error"), t("delete_error"));
        refreshHazards();
      }
    },
    [mergedHazards, removeFromQueue, showSnackbar, t, refreshHazards]
  );

  const syncQueuedReport = useCallback(
    async (report: QueuedHazardReport) => {
      if (!isConnected) throw new Error("Cannot sync while offline");

      const { id, queuedAt, categorySlug, categoryLabel, ...payload } = report;
      const res = await api.post(buildRoute(ApiRoutes.hazards.store), payload);
      upsertHazard(res.data.data);
    },
    [isConnected, upsertHazard]
  );

  const syncBulkQueuedReports = useCallback(
    async (reports: QueuedHazardReport[]) => {
      if (!isConnected) throw new Error("Cannot sync while offline");
      if (reports.length === 0) return { success: 0, failed: 0, results: [] };

      const first = reports[0];
      const items = reports.map((r) => {
        const { id, queuedAt, categorySlug, categoryLabel, device_uuid, platform, app_version, locale, ...item } = r;
        return { ...item, client_ref: id };
      });

      const payload = {
        device_uuid: first.device_uuid,
        platform: first.platform,
        app_version: first.app_version,
        locale: first.locale,
        items,
      };

      const res = await api.post(buildRoute(ApiRoutes.hazards.bulk), payload);
      const responseData = res.data;

      if (Array.isArray(responseData.data)) {
        responseData.data.forEach((h: RoadHazard) => upsertHazard(h));
      }

      return {
        success: responseData.meta?.created_count || reports.length,
        failed: responseData.meta?.failed_count || 0,
        results: responseData.data || [],
      };
    },
    [isConnected, upsertHazard]
  );

  const ctxValue = useMemo<HazardContextType>(
    () => ({
      hazards: mergedHazards,
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

      refreshHazards,
      deleteHazard,

      syncQueuedReport,
      syncBulkQueuedReports,

      isVoiceEnabled,
      setIsVoiceEnabled,
    }),
    [
      mergedHazards,
      clusters,
      mode,
      totalInRadius,
      hazardCounts,
      categories,
      categoriesLoading,
      hazardsLoading,
      selectedHazard,
      selectedCategoryId,
      severity,
      note,
      handleSubmitHazard,
      handleQuickReport,
      refreshHazards,
      deleteHazard,
      syncQueuedReport,
      syncBulkQueuedReports,
      isVoiceEnabled,
    ]
  );

  return <HazardContext.Provider value={ctxValue}>{children}</HazardContext.Provider>;
};
