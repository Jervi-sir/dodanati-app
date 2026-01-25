import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Alert } from "react-native";
import * as Speech from "expo-speech";
import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { getDistance, getRhumbLineBearing } from "geolib";
import { useHazards } from "./5-hazard-context";
import { useLocation } from "./3-location-context";
import { ALERT_DISTANCE_METERS, SPEECH_COOLDOWN_MS } from "@/utils/const/app-constants";

type DriveContextType = {
  isDriveMode: boolean;
  toggleDriveMode: () => void;
  startDrive: () => void;
  stopDrive: () => void;
};

const DriveContext = createContext<DriveContextType | undefined>(undefined);

export const useDrive = () => {
  const ctx = useContext(DriveContext);
  if (!ctx) throw new Error("useDrive must be used within <DriveProvider>");
  return ctx;
};

const clamp360 = (n: number) => ((n % 360) + 360) % 360;

export const DriveProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { mapRef, currentLat, currentLng, currentHeading, locationLoading } = useLocation();
  const { hazards } = useHazards();

  const [isDriveMode, setIsDriveMode] = useState(false);

  // latest hazards without dependency hell
  const hazardsRef = useRef(hazards);
  useEffect(() => {
    hazardsRef.current = hazards;
  }, [hazards]);

  // speech throttles
  const lastSpeechTime = useRef<Record<number, number>>({});
  const lastGlobalSpeechTime = useRef<number>(0);

  // “approaching” logic per hazard: last seen distance
  const lastDistRef = useRef<Record<number, number>>({});

  // throttle hazard checks even if GPS updates faster
  const lastCheckTsRef = useRef(0);

  // enable keep-awake only while drive mode
  useEffect(() => {
    if (!isDriveMode) return;
    let cancelled = false;

    (async () => {
      try {
        await activateKeepAwakeAsync();
      } catch (e) {
        if (!cancelled) console.warn("KeepAwake activate failed", e);
      }
    })();

    return () => {
      cancelled = true;
      try {
        deactivateKeepAwake();
      } catch { }
    };
  }, [isDriveMode]);

  const stopDrive = useCallback(() => {
    setIsDriveMode(false);
    Speech.stop();

    // reset camera to standard
    if (currentLat != null && currentLng != null) {
      mapRef.current?.animateCamera(
        {
          center: { latitude: currentLat, longitude: currentLng },
          pitch: 0,
          heading: 0,
          zoom: 15,
        },
        { duration: 700 }
      );
    }
  }, [currentLat, currentLng, mapRef]);

  const startDrive = useCallback(() => {
    if (locationLoading) {
      Alert.alert("Info", "Localisation en cours… Réessayez dans un instant.");
      return;
    }
    if (currentLat == null || currentLng == null) {
      Alert.alert("Info", "Position non disponible.");
      return;
    }

    // reset per-session state
    lastGlobalSpeechTime.current = 0;
    lastSpeechTime.current = {};
    lastDistRef.current = {};
    lastCheckTsRef.current = 0;

    setIsDriveMode(true);

    // snap camera immediately
    mapRef.current?.animateCamera(
      {
        center: { latitude: currentLat, longitude: currentLng },
        pitch: 60,
        heading: currentHeading ?? 0,
        zoom: 18,
      },
      { duration: 500 }
    );
  }, [locationLoading, currentLat, currentLng, currentHeading, mapRef]);

  const toggleDriveMode = useCallback(() => {
    setIsDriveMode((v) => {
      const next = !v;
      if (!next) {
        // turning off
        Speech.stop();
      }
      return next;
    });
  }, []);

  const speakHazard = useCallback((type: string, distMeters: number) => {
    const rounded = Math.round(distMeters / 10) * 10;
    Speech.stop(); // prevent stacking
    Speech.speak(`Attention, ${type} dans ${rounded} mètres.`, { language: "fr", rate: 1.05 });
  }, []);

  const checkForHazards = useCallback(
    (lat: number, lng: number, heading: number) => {
      const now = Date.now();

      // throttle checks to ~1.4 fps (tune as you like)
      if (now - lastCheckTsRef.current < 700) return;
      lastCheckTsRef.current = now;

      // global throttle (avoid spam)
      if (now - lastGlobalSpeechTime.current < 3000) return;

      const list = hazardsRef.current;
      if (!list || list.length === 0) return;

      let best: { hazardId: number; dist: number; type: string } | null = null;

      for (const hazard of list) {
        if (!hazard.is_active) continue;

        // quick reject: only consider hazards within alert radius
        const dist = getDistance(
          { latitude: lat, longitude: lng },
          { latitude: hazard.lat, longitude: hazard.lng }
        );

        if (dist > ALERT_DISTANCE_METERS) continue;

        // per-hazard cooldown
        const lastSpoke = lastSpeechTime.current[hazard.id];
        if (lastSpoke && now - lastSpoke < SPEECH_COOLDOWN_MS) continue;

        // “ahead” check (FOV)
        const bearingTo = clamp360(
          getRhumbLineBearing(
            { latitude: lat, longitude: lng },
            { latitude: hazard.lat, longitude: hazard.lng }
          )
        );

        let diff = Math.abs(bearingTo - clamp360(heading));
        if (diff > 180) diff = 360 - diff;
        if (diff > 55) continue; // ~110° cone in front; tune 45..70

        // “approaching” check: only warn if distance is decreasing
        const prevDist = lastDistRef.current[hazard.id];
        lastDistRef.current[hazard.id] = dist;

        // if we have a previous sample and we're not getting closer, skip
        if (prevDist != null && dist > prevDist + 5) continue; // +5m tolerance for GPS noise

        const type = hazard.category?.name_fr || "Danger";
        if (!best || dist < best.dist) {
          best = { hazardId: hazard.id, dist, type };
        }
      }

      if (best) {
        speakHazard(best.type, best.dist);
        lastSpeechTime.current[best.hazardId] = now;
        lastGlobalSpeechTime.current = now;
      }
    },
    [speakHazard]
  );

  // ✅ Drive loop: react to existing location/heading updates (no new GPS watcher)
  useEffect(() => {
    if (!isDriveMode) return;
    if (currentLat == null || currentLng == null) return;

    // camera follow (only when driving)
    mapRef.current?.animateCamera(
      {
        center: { latitude: currentLat, longitude: currentLng },
        pitch: 60,
        heading: currentHeading ?? 0,
        zoom: 18,
      },
      { duration: 700 }
    );

    // hazard checks
    checkForHazards(currentLat, currentLng, currentHeading ?? 0);
  }, [isDriveMode, currentLat, currentLng, currentHeading, mapRef, checkForHazards]);

  // if user toggles off via toggleDriveMode state update, ensure cleanup camera, etc.
  useEffect(() => {
    if (!isDriveMode) {
      // when leaving drive mode (including unmount)
      // don't alert; just reset
      if (currentLat != null && currentLng != null) {
        mapRef.current?.animateCamera(
          {
            center: { latitude: currentLat, longitude: currentLng },
            pitch: 0,
            heading: 0,
            zoom: 15,
          },
          { duration: 700 }
        );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isDriveMode]);

  // full cleanup
  useEffect(() => {
    return () => {
      Speech.stop();
      try {
        deactivateKeepAwake();
      } catch { }
    };
  }, []);

  const ctxValue = useMemo(
    () => ({
      isDriveMode,
      toggleDriveMode: () => {
        if (isDriveMode) stopDrive();
        else startDrive();
      },
      startDrive,
      stopDrive,
    }),
    [isDriveMode, startDrive, stopDrive]
  );

  return <DriveContext.Provider value={ctxValue}>{children}</DriveContext.Provider>;
};
