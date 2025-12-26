import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import * as Speech from 'expo-speech';
import { useKeepAwake } from 'expo-keep-awake';
import * as Location from 'expo-location';
import { getDistance, getRhumbLineBearing } from 'geolib';
import { useHazards } from './5-hazard-context';
import { useLocation } from './3-location-context';
import { ALERT_DISTANCE_METERS, SPEECH_COOLDOWN_MS } from '@/utils/const/app-constants';

type DriveContextType = {
  isDriveMode: boolean;
  toggleDriveMode: () => void;
  startDrive: () => void;
  stopDrive: () => void;
};

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const useDrive = () => {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error('useDrive must be used within <DriveProvider>');
  return ctx;
};


export const DriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mapRef, currentLat, currentLng, locationLoading } = useLocation();
  const { hazards } = useHazards();

  const [isDriveMode, setIsDriveMode] = useState(false);

  // Use a ref for hazards to access latest inside intervals/subscriptions without dependency hell
  const hazardsRef = useRef(hazards);
  useEffect(() => { hazardsRef.current = hazards; }, [hazards]);

  const lastSpeechTime = useRef<Record<number, number>>({});
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);

  // Keep screen on
  useKeepAwake(); // This hook technically enables it globally if component mounted, but we might want conditional.
  // Actually expo-keep-awake hook keeps it awake as long as this component renders.
  // Since this is a global provider, we might want to manually control it or just let it be.
  // Better: use activateKeepAwake / deactivateKeepAwake imperatively if we only want it in drive mode.
  // But for a nav app, keeping awake while the app is open is usually standard. 
  // We'll proceed with imperative control to be safe.

  const startDrive = async () => {
    setIsDriveMode(true);

    // Switch to high accuracy location tracking
    try {
      if (locationSubscription.current) locationSubscription.current.remove();

      locationSubscription.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.BestForNavigation,
          timeInterval: 1000,
          distanceInterval: 10,
        },
        (loc) => {
          const { latitude, longitude, heading, speed } = loc.coords;

          // Update Map Camera
          // We want to tilt and follow
          mapRef.current?.animateCamera({
            center: { latitude, longitude },
            pitch: 60,
            heading: heading || 0,
            zoom: 18, // Close up
          }, { duration: 1000 });

          checkForHazards(latitude, longitude, heading);
        }
      );
    } catch (e) {
      console.error('Failed to start drive tracking', e);
      Alert.alert('Erreur', 'Impossible de lancer le mode conduite.');
      setIsDriveMode(false);
    }
  };

  const stopDrive = () => {
    setIsDriveMode(false);
    if (locationSubscription.current) {
      locationSubscription.current.remove();
      locationSubscription.current = null;
    }

    // Reset camera to standard top-down
    if (currentLat && currentLng) {
      mapRef.current?.animateCamera({
        center: { latitude: currentLat, longitude: currentLng },
        pitch: 0,
        heading: 0,
        zoom: 15,
      }, { duration: 1000 });
    }
  };

  const toggleDriveMode = () => {
    if (isDriveMode) stopDrive();
    else startDrive();
  };

  const checkForHazards = (lat: number, lng: number, heading: number | null) => {
    const list = hazardsRef.current;

    for (const hazard of list) {
      const dist = getDistance(
        { latitude: lat, longitude: lng },
        { latitude: hazard.lat, longitude: hazard.lng }
      );

      if (dist < ALERT_DISTANCE_METERS) {
        // Check cooldown
        const now = Date.now();
        if (lastSpeechTime.current[hazard.id] && now - lastSpeechTime.current[hazard.id] < SPEECH_COOLDOWN_MS) {
          continue;
        }

        // Optional: Check if it's "ahead" of us using bearing
        // Simple check: is the bearing to the hazard similar to our heading?
        // This prevents alerting for hazards behind us.
        let relevant = true;
        if (heading !== null && heading >= 0) {
          const bearingToHazard = getRhumbLineBearing(
            { latitude: lat, longitude: lng },
            { latitude: hazard.lat, longitude: hazard.lng }
          );

          // diff should be within +/- 90 degrees? Maybe 60.
          let diff = Math.abs(bearingToHazard - heading);
          if (diff > 180) diff = 360 - diff;

          if (diff > 90) relevant = false;
        }

        if (relevant) {
          // Speak!
          const type = hazard.category?.name_fr || 'Danger';
          const distanceRounded = Math.round(dist / 10) * 10;

          Speech.speak(`Attention, ${type} dans ${distanceRounded} mètres.`, {
            language: 'fr',
            rate: 1.1
          });

          lastSpeechTime.current[hazard.id] = now;
        }
      }
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (locationSubscription.current) locationSubscription.current.remove();
    };
  }, []);

  return (
    <DriveContext.Provider value={{ isDriveMode, toggleDriveMode, startDrive, stopDrive }}>
      {children}
    </DriveContext.Provider>
  );
};
