import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert, Platform } from 'react-native';
import * as Location from 'expo-location';
import MapView, { Region } from 'react-native-maps';
import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_LAT = 36.7525;
const DEFAULT_LNG = 3.04197;

export type MapProviderKind = 'system' | 'google';

type LocationContextType = {
  locationLoading: boolean;
  currentLat: number | null;
  currentLng: number | null;
  region: Region;
  setRegion: (r: Region) => void;
  recenterOnUser: (zoom?: number) => void;
  mapRef: React.RefObject<MapView | null>;
  mapProvider: MapProviderKind;
  setMapProvider: (p: MapProviderKind) => void;
  isSimulatingLocation: boolean;
  toggleSimulationMode: () => void;
  simulateLocation: (lat: number, lng: number) => void;

  /** 0..360 degrees */
  currentHeading: number;
  setCurrentHeading: (h: number) => void;

  showMapLabels: boolean;
  setShowMapLabels: (show: boolean) => void;
};

const LocationContext = createContext<LocationContextType | undefined>(undefined);

export const useLocation = () => {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within <LocationProvider>');
  return ctx;
};

export const LocationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [locationLoading, setLocationLoading] = useState(true);
  const [currentLat, setCurrentLat] = useState<number | null>(null);
  const [currentLng, setCurrentLng] = useState<number | null>(null);

  // ✅ heading is ALWAYS a number (0..360)
  const [currentHeading, setCurrentHeading] = useState<number>(0);

  const [mapProvider, setMapProvider] = useState<MapProviderKind>('google');
  const [isSimulatingLocation, setIsSimulatingLocation] = useState(false);

  const [region, setRegion] = useState<Region>({
    latitude: DEFAULT_LAT,
    longitude: DEFAULT_LNG,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });

  const mapRef = useRef<MapView>(null);
  const isSimulatingRef = useRef(isSimulatingLocation);

  useEffect(() => {
    isSimulatingRef.current = isSimulatingLocation;
  }, [isSimulatingLocation]);

  useEffect(() => {
    (async () => {
      try {
        const stored = await AsyncStorage.getItem('mapProvider');
        if (stored && (stored === 'system' || stored === 'google')) {
          setMapProvider(stored as MapProviderKind);
        }
      } catch { }
    })();
  }, []);

  const updateMapProvider = async (next: MapProviderKind) => {
    setMapProvider(next);
    try {
      await AsyncStorage.setItem('mapProvider', next);
    } catch { }
  };

  const [showMapLabels, setShowMapLabels] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const storedLabels = await AsyncStorage.getItem('mapShowLabels');
        if (storedLabels !== null) {
          setShowMapLabels(JSON.parse(storedLabels));
        }
      } catch { }
    })();
  }, []);

  const updateShowMapLabels = async (show: boolean) => {
    setShowMapLabels(show);
    try {
      await AsyncStorage.setItem('mapShowLabels', JSON.stringify(show));
    } catch { }
  };

  const toggleSimulationMode = () => setIsSimulatingLocation((v) => !v);

  const simulateLocation = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
  };

  // ✅ Smooth heading changes (prevents jitter + handles 359->0 wrap)
  const headingRef = useRef(0);
  const smoothHeading = (next: number) => {
    const prev = headingRef.current;
    const alpha = 0.25; // 0.15 smoother, 0.35 more reactive

    let diff = next - prev;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const smoothed = prev + diff * alpha;
    const normalized = (smoothed + 360) % 360;

    headingRef.current = normalized;
    return normalized;
  };

  useEffect(() => {
    let positionSub: Location.LocationSubscription | null = null;
    let headingSub: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      let hasCentered = false;
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Permission rejetée.');
          setLocationLoading(false);
          return;
        }

        // ✅ Compass heading (updates even when standing still)
        try {
          headingSub = await Location.watchHeadingAsync((h) => {
            if (isSimulatingRef.current) return;

            const raw =
              Number.isFinite(h.trueHeading) && h.trueHeading >= 0
                ? h.trueHeading
                : h.magHeading;

            if (Number.isFinite(raw)) {
              setCurrentHeading(smoothHeading(raw));
            }
          });
        } catch (e) {
          console.warn('watchHeadingAsync not available', e);
        }

        // 1. Try Last Known Position (Instant)
        try {
          const lastKnown = await Location.getLastKnownPositionAsync({});
          if (lastKnown && !isSimulatingRef.current) {
            const { latitude, longitude } = lastKnown.coords;
            setCurrentLat(latitude);
            setCurrentLng(longitude);

            const newRegion = {
              latitude,
              longitude,
              latitudeDelta: 0.03,
              longitudeDelta: 0.03,
            };
            setRegion(newRegion);
            // Try explicit animation
            mapRef.current?.animateToRegion(newRegion, 100);

            hasCentered = true;
            setLocationLoading(false);
          }
        } catch (e) {
          console.log("No last known location");
        }

        // 2. Start watching position (Stream)
        // This handles "current" location updates. We don't need to await getCurrentPositionAsync
        // blocking the stream. If we didn't get lastKnown, this will eventually trigger and set coords.
        positionSub = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isSimulatingRef.current) {
              const { latitude, longitude } = loc.coords;
              setCurrentLat(latitude);
              setCurrentLng(longitude);

              if (!hasCentered) {
                const newRegion = {
                  latitude,
                  longitude,
                  latitudeDelta: 0.03,
                  longitudeDelta: 0.03,
                };
                setRegion(newRegion);
                mapRef.current?.animateToRegion(newRegion, 500);
                hasCentered = true;
              }

              // Ensure loading is off once we get *live* data
              setLocationLoading(false);
            }
          }
        );

        // Optional: Force a single high-accuracy update in parallel if needed, 
        // but watchPositionAsync normally fires immediately.

      } catch (err) {
        console.error('Location error', err);
        setLocationLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      positionSub?.remove();
      headingSub?.remove();
    };
  }, []);

  const recenterOnUser = useCallback((zoom?: number) => {
    if (currentLat == null || currentLng == null) return;

    const newRegion: Region = {
      latitude: currentLat,
      longitude: currentLng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };

    setRegion(newRegion);

    mapRef.current?.animateCamera(
      {
        center: {
          latitude: currentLat,
          longitude: currentLng,
        },
        zoom: zoom || 17,
      },
      { duration: 500 }
    );
  }, [currentLat, currentLng]);

  return (
    <LocationContext.Provider
      value={{
        locationLoading,
        currentLat,
        currentLng,
        region,
        setRegion,
        recenterOnUser,
        mapRef,
        mapProvider,
        setMapProvider: updateMapProvider,
        isSimulatingLocation,
        toggleSimulationMode,
        simulateLocation,
        currentHeading,
        setCurrentHeading,
        showMapLabels,
        setShowMapLabels: updateShowMapLabels,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
