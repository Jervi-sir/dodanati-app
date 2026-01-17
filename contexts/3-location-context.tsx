import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, } from "react";
import { Alert } from "react-native";
import * as Location from "expo-location";
import MapView, { Region } from "react-native-maps";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type MapProviderKind = "system" | "google";

type LocationContextType = {
  locationLoading: boolean;

  currentLat: number | null;
  currentLng: number | null;

  // can be null until we get first location
  region: Region | null;
  setRegion: (r: Region) => void;

  recenterOnUser: (zoom?: number) => void;
  mapRef: React.RefObject<MapView | null>;

  mapProvider: MapProviderKind;
  setMapProvider: (p: MapProviderKind) => void;

  isSimulatingLocation: boolean;
  toggleSimulationMode: () => void;
  simulateLocation: (lat: number, lng: number) => void;

  currentHeading: number;
  setCurrentHeading: (h: number) => void;

  showMapLabels: boolean;
  setShowMapLabels: (show: boolean) => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within <LocationProvider>");
  return ctx;
};

const clamp360 = (n: number) => ((n % 360) + 360) % 360;

const smoothAngle = (prev: number, next: number, alpha: number) => {
  let diff = next - prev;
  if (diff > 180) diff -= 360;
  if (diff < -180) diff += 360;
  return clamp360(prev + diff * alpha);
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mapRef = useRef<MapView>(null);

  const [locationLoading, setLocationLoading] = useState(true);

  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);

  const latRef = useRef<number | null>(null);
  const lngRef = useRef<number | null>(null);

  // starts null (no hardcode)
  const [region, _setRegion] = useState<Region | null>(null);
  const regionRef = useRef<Region | null>(null);

  const setRegion = useCallback((r: Region) => {
    regionRef.current = r;
    _setRegion(r);
  }, []);

  const [currentHeading, setCurrentHeading] = useState(0);
  const headingRef = useRef(0);

  const [isSimulatingLocation, setIsSimulatingLocation] = useState(false);
  const isSimulatingRef = useRef(false);
  const hasCenteredRef = useRef(false);

  const positionSubRef = useRef<Location.LocationSubscription | null>(null);
  const headingSubRef = useRef<Location.LocationSubscription | null>(null);

  const [mapProvider, setMapProviderState] = useState<MapProviderKind>("google");
  const [showMapLabels, setShowMapLabelsState] = useState(true);

  const stopWatchers = useCallback(() => {
    positionSubRef.current?.remove();
    positionSubRef.current = null;
    headingSubRef.current?.remove();
    headingSubRef.current = null;
  }, []);

  const applyCoords = useCallback((lat: number, lng: number) => {
    latRef.current = lat;
    lngRef.current = lng;
    setCurrentLat(lat);
    setCurrentLng(lng);
  }, []);

  const centerOnce = useCallback((lat: number, lng: number, duration: number) => {
    if (hasCenteredRef.current) return;

    const r: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };

    setRegion(r);
    mapRef.current?.animateToRegion(r, duration);
    hasCenteredRef.current = true;
  }, [setRegion]);

  const recenterOnUser = useCallback((zoom?: number) => {
    const lat = latRef.current;
    const lng = lngRef.current;
    if (lat == null || lng == null) return;

    const r: Region = {
      latitude: lat,
      longitude: lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };

    setRegion(r);
    mapRef.current?.animateCamera(
      { center: { latitude: lat, longitude: lng }, zoom: zoom ?? 17 },
      { duration: 500 }
    );
  }, [setRegion]);

  const toggleSimulationMode = useCallback(() => {
    setIsSimulatingLocation((v) => !v);
  }, []);

  const simulateLocation = useCallback(
    (lat: number, lng: number) => {
      setIsSimulatingLocation(true);
      isSimulatingRef.current = true;
      stopWatchers();

      applyCoords(lat, lng);

      const r: Region = {
        latitude: lat,
        longitude: lng,
        latitudeDelta: 0.03,
        longitudeDelta: 0.03,
      };
      setRegion(r);
      mapRef.current?.animateToRegion(r, 350);

      hasCenteredRef.current = true;
      setLocationLoading(false);
    },
    [applyCoords, stopWatchers, setRegion]
  );

  // Persisted settings: keep simple (no extra effects beyond 1 main init)
  const setMapProvider = useCallback(async (p: MapProviderKind) => {
    setMapProviderState(p);
    try {
      await AsyncStorage.setItem("mapProvider", p);
    } catch { }
  }, []);

  const setShowMapLabels = useCallback(async (show: boolean) => {
    setShowMapLabelsState(show);
    try {
      await AsyncStorage.setItem("mapShowLabels", JSON.stringify(show));
    } catch { }
  }, []);

  // ✅ ONE effect: load settings + ask permission + seed lastKnown + start watchers + cleanup
  useEffect(() => {
    let cancelled = false;

    const start = async () => {
      try {
        // load persisted settings (optional, but cheap)
        try {
          const [storedProvider, storedLabels] = await Promise.all([
            AsyncStorage.getItem("mapProvider"),
            AsyncStorage.getItem("mapShowLabels"),
          ]);

          if (!cancelled && (storedProvider === "system" || storedProvider === "google")) {
            setMapProviderState(storedProvider);
          }
          if (!cancelled && storedLabels != null) {
            setShowMapLabelsState(JSON.parse(storedLabels));
          }
        } catch { }

        const { status } = await Location.requestForegroundPermissionsAsync();
        if (cancelled) return;

        if (status !== "granted") {
          Alert.alert("Location", "Permission rejetée.");
          setLocationLoading(false);
          return;
        }

        // seed with last known (fast), but don’t hardcode if missing
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (!cancelled && lastKnown && !isSimulatingRef.current) {
            const { latitude, longitude } = lastKnown.coords;
            applyCoords(latitude, longitude);
            centerOnce(latitude, longitude, 120);
            setLocationLoading(false);
          }
        } catch { }

        // start watchers
        stopWatchers();

        // heading (throttled + smoothed)
        try {
          let lastTs = 0;
          headingSubRef.current = await Location.watchHeadingAsync((h) => {
            if (cancelled || isSimulatingRef.current) return;

            const raw =
              Number.isFinite(h.trueHeading) && h.trueHeading >= 0 ? h.trueHeading : h.magHeading;

            if (!Number.isFinite(raw)) return;

            const now = Date.now();
            if (now - lastTs < 100) return; // 10 fps
            lastTs = now;

            const smoothed = smoothAngle(headingRef.current, raw, 0.22);
            headingRef.current = smoothed;
            setCurrentHeading(smoothed);
          });
        } catch { }

        positionSubRef.current = await Location.watchPositionAsync(
          {
            // Balanced is often more “stable” than High in real life cities
            accuracy: Location.Accuracy.Balanced,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (loc) => {
            if (cancelled || isSimulatingRef.current) return;

            const { latitude, longitude } = loc.coords;
            applyCoords(latitude, longitude);

            // Auto-recenter if out of viewport (Soft Follow)
            const r = regionRef.current;
            if (r && hasCenteredRef.current) {
              const dLat = Math.abs(latitude - r.latitude);
              const dLng = Math.abs(longitude - r.longitude);
              // If user is > 45% of the way to the edge (conservative "in viewport" check)
              const isOutOfView = dLat > (r.latitudeDelta / 2) * 0.90 || dLng > (r.longitudeDelta / 2) * 0.90;

              if (isOutOfView) {
                const newRegion: Region = {
                  ...r,
                  latitude,
                  longitude,
                };
                setRegion(newRegion); // Use setRegion to update both state and ref
                mapRef.current?.animateToRegion(newRegion, 450);
              }
            }

            centerOnce(latitude, longitude, 450);
            setLocationLoading(false);
          }
        );
      } catch (err) {
        console.error("Location error", err);
        setLocationLoading(false);
      }
    };

    start();

    return () => {
      cancelled = true;
      stopWatchers();
    };
  }, [applyCoords, centerOnce, stopWatchers, setRegion]);

  // keep sim ref synced (no extra effect needed; do it inline)
  const setSimulating = useCallback((v: boolean) => {
    isSimulatingRef.current = v;
    setIsSimulatingLocation(v);
  }, []);

  // override toggle to keep ref synced
  const toggleSimulationModeStable = useCallback(() => {
    setSimulating(!isSimulatingRef.current);
    if (isSimulatingRef.current) {
      stopWatchers();
    }
    // when leaving sim mode, simplest is app restart or manual recenter;
    // if you want auto resume watchers, I can add it without extra effects.
  }, [setSimulating, stopWatchers]);

  const value = useMemo<LocationContextType>(
    () => ({
      locationLoading,
      currentLat,
      currentLng,
      region,
      setRegion,
      recenterOnUser,
      mapRef,
      mapProvider,
      setMapProvider,
      isSimulatingLocation,
      toggleSimulationMode: toggleSimulationModeStable,
      simulateLocation,
      currentHeading,
      setCurrentHeading,
      showMapLabels,
      setShowMapLabels,
    }),
    [
      locationLoading,
      currentLat,
      currentLng,
      region,
      setRegion,
      recenterOnUser,
      mapProvider,
      setMapProvider,
      isSimulatingLocation,
      toggleSimulationModeStable,
      simulateLocation,
      currentHeading,
      showMapLabels,
      setShowMapLabels,
    ]
  );

  return <LocationContext.Provider value={value}>{children}</LocationContext.Provider>;
};
