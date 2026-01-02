// src/screens/MapScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, Dimensions, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { HazardCluster, RoadHazard, useHazards } from '@/contexts/5-hazard-context';
import { useDevice } from '@/contexts/2-device-context';
import { useLocation } from '@/contexts/3-location-context';
import { RouteSummary, useRoute } from '@/contexts/6-route-context';
import { useUI } from '@/contexts/4-ui-context';
import { ActionFloatingTools } from './components/action-floating-tools';
import { HazardMarker } from './components/hazard-marker';
import { SnackbarBanner } from './components/snackbar-banner';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';
import { LocationPuck } from '@/assets/icons/location-puck';

const MAP_WIDTH = Dimensions.get('window').width;

/* -------------------------------------------------------------------------- */
/*                          Client-side "visual" cluster                      */
/*    Groups points that overlap on screen (pixel grid), NO server needed.     */
/* -------------------------------------------------------------------------- */

type ClientCluster = {
  lat: number;
  lng: number;
  count: number;
  ids: number[];
  composition: {
    hasSpeedBump: boolean;
    hasPothole: boolean;
  };
};

function projectToWorldPx(lat: number, lng: number, zoom: number) {
  // Web Mercator projection to world pixels at given zoom
  const sin = Math.sin((lat * Math.PI) / 180);
  const scale = 256 * Math.pow(2, zoom);

  const x = ((lng + 180) / 360) * scale;
  const y = (0.5 - Math.log((1 + sin) / (1 - sin)) / (4 * Math.PI)) * scale;

  return { x, y };
}

function regionToZoom(region: Region, mapWidthPx: number) {
  // Approximate zoom from longitudeDelta
  const lngDelta = Math.max(region.longitudeDelta, 1e-6);
  const zoom = Math.log2((mapWidthPx * 360) / (lngDelta * 256));
  return Math.max(0, Math.min(22, zoom));
}

function clusterHazardsClientSide(params: {
  hazards: RoadHazard[];
  region: Region;
  mapWidthPx: number;
  cellSizePx?: number; // larger => more grouping
}): ClientCluster[] {
  const { hazards, region, mapWidthPx, cellSizePx = 56 } = params;

  const zoom = regionToZoom(region, mapWidthPx);
  const buckets = new Map<string, ClientCluster>();

  for (const h of hazards) {
    const lat = Number(h.lat);
    const lng = Number(h.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const { x, y } = projectToWorldPx(lat, lng, zoom);

    // grid in WORLD pixels (stable as you pan/zoom)
    const gx = Math.floor(x / cellSizePx);
    const gy = Math.floor(y / cellSizePx);
    const key = `${gx}:${gy}`;

    const existing = buckets.get(key);

    const slug = h.category?.slug;
    const isSpeedBump = slug === 'speed_bump';
    const isPothole = slug === 'pothole';

    if (!existing) {
      buckets.set(key, {
        lat,
        lng,
        count: 1,
        ids: [h.id],
        composition: {
          hasSpeedBump: isSpeedBump,
          hasPothole: isPothole
        }
      });
    } else {
      existing.count += 1;
      existing.ids.push(h.id);

      if (isSpeedBump) existing.composition.hasSpeedBump = true;
      if (isPothole) existing.composition.hasPothole = true;

      // incremental average keeps cluster marker centered-ish
      existing.lat = existing.lat + (lat - existing.lat) / existing.count;
      existing.lng = existing.lng + (lng - existing.lng) / existing.count;
    }
  }

  return Array.from(buckets.values());
}

/* -------------------------------------------------------------------------- */

export const MapScreen = () => {
  const { mode, theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { bootLoading } = useDevice();
  const {
    locationLoading,
    region,
    setRegion,
    mapRef,
    mapProvider,
    isSimulatingLocation,
    simulateLocation,
    currentLat,
    currentLng,
    currentHeading,
    setCurrentHeading,
    showMapLabels
  } = useLocation();

  const { hazards, clusters, mode: hazardMode, selectedHazard, setSelectedHazard } = useHazards();

  const { destination, routeSummary, selectDestination, routeCoords } = useRoute();

  const { snackbar, hideSnackbar } = useUI(); // (kept because you had it, even if not used here)

  const isLoading = bootLoading || locationLoading;

  const mapStyle = useMemo(() => {
    let style: any[] = []; // Typed explicitly
    if (mode === 'dark') {
      style = [...DARK_MAP_STYLE];
    }
    if (!showMapLabels) {
      style = [...style, ...CLEAN_MAP_STYLE];
    }
    return style;
  }, [mode, showMapLabels]);

  /* ----------------------- Actionsheet ----------------------- */
  const handleHazardPress = useCallback(
    (h: RoadHazard) => {
      setSelectedHazard(h);
      SheetManager.show('hazard-detail-sheet');
    },
    [setSelectedHazard]
  );

  /* ----------------------- Points -> Client clusters ----------------------- */
  const clusteredFromPoints = useMemo(() => {
    if (hazardMode !== 'points') return { clusters: [] as ClientCluster[], singles: [] as RoadHazard[] };

    const visual = clusterHazardsClientSide({
      hazards,
      region,
      mapWidthPx: MAP_WIDTH,
      cellSizePx: 56, // tweak: 44..72 (bigger => more grouping)
    });

    // Split: clusters (count>1) + singles (count===1)
    const singleIds = new Set<number>();
    for (const c of visual) {
      if (c.count === 1 && c.ids[0] != null) singleIds.add(c.ids[0]);
    }

    return {
      clusters: visual.filter((c) => c.count > 1),
      singles: hazards.filter((h) => singleIds.has(h.id)),
    };
  }, [hazards, hazardMode, region]);

  /* ----------------------- Markers ----------------------- */
  const hazardSingleMarkers = useMemo(() => {
    return clusteredFromPoints.singles.map((h) => {
      const isSelected = selectedHazard?.id === h.id;
      return (
        <Marker
          key={`hazard-${h.id}`}
          coordinate={{ latitude: Number(h.lat), longitude: Number(h.lng) }}
          onPress={() => handleHazardPress(h)}
          zIndex={isSelected ? 999 : 10}
          tracksViewChanges={false}
        >
          <HazardMarker hazard={h} selected={isSelected} />
        </Marker>
      );
    });
  }, [clusteredFromPoints.singles, selectedHazard, handleHazardPress]);

  /* ----------------------- Markers ----------------------- */
  const hazardBubbleMarkers = useMemo(() => {
    // Bubble markers built purely on client grouping
    return clusteredFromPoints.clusters.map((c) => {
      const { hasSpeedBump, hasPothole } = c.composition;
      const isMixed = hasSpeedBump && hasPothole;
      // Stable key based on content IDs rather than unstable coordinates
      const clusterKey = `vcluster-${c.ids.sort((a, b) => a - b).join('-')}`;

      return (
        <Marker
          key={clusterKey}
          coordinate={{ latitude: c.lat, longitude: c.lng }}
          zIndex={20}
          tracksViewChanges={false}
          anchor={{ x: 0.5, y: 0.5 }}
          onPress={() => {
            const next: Region = {
              ...region,
              latitude: c.lat,
              longitude: c.lng,
              latitudeDelta: region.latitudeDelta * 0.5,
              longitudeDelta: region.longitudeDelta * 0.5,
            };
            mapRef.current?.animateToRegion(next, 250);
          }}
        >
          <View style={stylesCluster.bubbleContainer}>
            {isMixed ? (
              <View style={stylesCluster.splitBackground}>
                <View style={[stylesCluster.splitHalf, { backgroundColor: '#EF4444' }]} />
                <View style={[stylesCluster.splitHalf, { backgroundColor: '#F59E0B' }]} />
              </View>
            ) : (
              <View style={[
                stylesCluster.solidBackground,
                { backgroundColor: hasPothole ? '#EF4444' : (hasSpeedBump ? '#F59E0B' : '#2563EB') }
              ]} />
            )}
            <Text style={stylesCluster.count}>{c.count}</Text>
          </View>
        </Marker>
      )
    });
  }, [clusteredFromPoints.clusters, mapRef, region]);

  const serverClusterMarkers = useMemo(() => {
    return clusters.map((c) => (
      <Marker
        key={`cluster-${c.lat}-${c.lng}`}
        coordinate={{ latitude: Number(c.lat), longitude: Number(c.lng) }}
        tracksViewChanges={false}
      >
        <View style={stylesCluster.bubble}>
          <Text style={stylesCluster.count}>{c.count}</Text>
        </View>
      </Marker>
    ));
  }, [clusters]);

  return (
    <View style={styles.container}>
      <StatusBar animated style={mode === 'dark' ? 'light' : 'dark'} />

      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 8 }}>Initialisation…</Text>
        </View>
      )}

      {/* Debug overlay */}
      {/* <View style={{ position: 'absolute', top: 200, left: 20, zIndex: 99 }}>
        <View style={{ backgroundColor: 'red', padding: 10 }}>
          <Text>Hazards: {hazards?.length}</Text>
          <Text>Server Clusters: {clusters?.length}</Text>
          <Text>Mode: {hazardMode}</Text>
          {hazardMode === 'points' && (
            <>
              <Text>Client bubbles: {clusteredFromPoints.clusters.length}</Text>
              <Text>Client singles: {clusteredFromPoints.singles.length}</Text>
            </>
          )}
        </View>
      </View> */}

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={mapStyle}
        showsPointsOfInterest={showMapLabels}
        userInterfaceStyle={mode}
        initialRegion={region}
        onRegionChangeComplete={(r) => {
          // IMPORTANT: region updates cause clustering recalculation (that’s intended)
          setRegion(r);
        }}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
        // showsMyLocationButton={true}
        showsUserLocation={true}
        showsMyLocationButton={false}
        onPress={(e) => {
          if (isSimulatingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            simulateLocation(latitude, longitude);
          }
        }}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          selectDestination({ latitude, longitude });
        }}
      >
        {/* Custom User Marker removed in favor of native showsUserLocation which is more performant */}

        {/* Render logic:
            - hazardMode === 'clusters' => server clusters
            - hazardMode === 'points'   => client bubbles + client singles
        */}
        {hazardMode === 'clusters' ? (
          serverClusterMarkers
        ) : (
          <>
            {hazardBubbleMarkers}
            {hazardSingleMarkers}
          </>
        )}

        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Destination"
            pinColor="#2563EB"
          />
        )}

        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={getRouteColor(routeSummary)}
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Floating tools */}
      <ActionFloatingTools />
      {/* Sheets & Banners */}
      <SnackbarBanner />
    </View>
  );
};

const getRouteColor = (routeSummary: RouteSummary | null) => {
  if (!routeSummary) return '#3B82F6';
  const distance = Math.max(routeSummary.distance_km || 0, 0.1);
  const hazardsPerKm = routeSummary.hazards_count / distance;
  if (hazardsPerKm < 0.3) return '#10B981';
  if (hazardsPerKm < 1) return '#F59E0B';
  return '#EF4444';
};

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#202124' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e8eaed' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202124' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3c4043' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a73e8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#303134' }] },
];

const CLEAN_MAP_STYLE = [
  {
    featureType: "poi",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "transit",
    elementType: "labels",
    stylers: [{ visibility: "off" }]
  },
  {
    featureType: "road",
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }]
  }
];

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },

    loaderOverlay: {
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'light' ? '#FFFFFFDD' : 'rgba(0,0,0,0.55)',
    },
  });

const stylesCluster = StyleSheet.create({
  bubbleContainer: {
    width: 30,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  splitBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 15,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: 'white',
  },
  splitHalf: {
    flex: 1,
    height: '100%',
  },
  solidBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: 'white',
  },
  bubble: {
    minWidth: 34,
    height: 34,
    borderRadius: 17,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(37, 99, 235, 0.92)',
    borderWidth: 2,
    borderColor: 'white',
    zIndex: 999
  },
  count: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
    zIndex: 2,
  },
});
