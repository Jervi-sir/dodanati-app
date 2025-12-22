import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
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
  recenterOnUser: () => void;
  mapRef: React.RefObject<MapView | null>;
  mapProvider: MapProviderKind;
  setMapProvider: (p: MapProviderKind) => void;
  isSimulatingLocation: boolean;
  toggleSimulationMode: () => void;
  simulateLocation: (lat: number, lng: number) => void;
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
  const [mapProvider, setMapProvider] = useState<MapProviderKind>('system');
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
      } catch (e) { }
    })();
  }, []);

  const updateMapProvider = async (next: MapProviderKind) => {
    setMapProvider(next);
    await AsyncStorage.setItem('mapProvider', next);
  };

  const toggleSimulationMode = () => setIsSimulatingLocation(!isSimulatingLocation);

  const simulateLocation = (lat: number, lng: number) => {
    setCurrentLat(lat);
    setCurrentLng(lng);
  };

  useEffect(() => {
    let subscriber: Location.LocationSubscription | null = null;

    const startLocationTracking = async () => {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Location', 'Permission rejetée.');
          setLocationLoading(false);
          return;
        }

        // Get initial position quickly
        const initialLoc = await Location.getCurrentPositionAsync({});
        const lat = initialLoc.coords.latitude ?? DEFAULT_LAT;
        const lng = initialLoc.coords.longitude ?? DEFAULT_LNG;

        if (!isSimulatingRef.current) {
          setCurrentLat(lat);
          setCurrentLng(lng);
          const initialRegion = {
            latitude: lat,
            longitude: lng,
            latitudeDelta: 0.03,
            longitudeDelta: 0.03,
          };
          setRegion(initialRegion);

          setTimeout(() => {
            mapRef.current?.animateToRegion(initialRegion, 500);
          }, 300);
        }

        setLocationLoading(false);

        // Start watching
        subscriber = await Location.watchPositionAsync(
          {
            accuracy: Location.Accuracy.High,
            timeInterval: 2000,
            distanceInterval: 10,
          },
          (loc) => {
            if (!isSimulatingRef.current) {
              setCurrentLat(loc.coords.latitude);
              setCurrentLng(loc.coords.longitude);
            }
          }
        );

      } catch (err) {
        console.error('Location error', err);
        setLocationLoading(false);
      }
    };

    startLocationTracking();

    return () => {
      subscriber?.remove();
    };
  }, []);

  const recenterOnUser = useCallback(() => {
    if (currentLat == null || currentLng == null) return;
    const newRegion: Region = {
      latitude: currentLat,
      longitude: currentLng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };
    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
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
      }}
    >
      {children}
    </LocationContext.Provider>
  );
};
