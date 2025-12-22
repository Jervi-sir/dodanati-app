// src/screens/MapScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { HazardCluster, RoadHazard, useHazards } from '@/contexts/5-hazard-context';
import { useDevice } from '@/contexts/2-device-context';
import { useLocation } from '@/contexts/3-location-context';
import { useRoute } from '@/contexts/6-route-context';
import { useUI } from '@/contexts/4-ui-context';
import { ActionFloatingTools } from './components/action-floating-tools';
import { SnackbarBanner } from './components/snackbar-banner';
import { HazardReportSheet } from './sheets/hazard-report-sheet';
import { HazardDetailSheet } from './sheets/hazard-detail-sheet';
import { MapParamsSheet } from './sheets/map-params-sheet';
import { HazardHistoryItem, HazardHistorySheet } from './sheets/hazard-history-sheet';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#202124' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e8eaed' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202124' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3c4043' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a73e8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#303134' }] },
];

// --- Memoized Hazard Marker ---
const HazardMarker = React.memo(({ hazard, onPress }: { hazard: RoadHazard; onPress: (h: RoadHazard) => void }) => {
  const [track, setTrack] = React.useState(true);

  React.useEffect(() => {
    const t = setTimeout(() => setTrack(false), 800);
    return () => clearTimeout(t);
  }, []);

  return (
    <Marker
      coordinate={{ latitude: Number(hazard.lat), longitude: Number(hazard.lng) }}
      title={hazard.category?.name_fr ?? hazard.category?.name_en ?? 'Danger'}
      description={hazard.note ?? `Signalements: ${hazard.reports_count} • Sévérité: ${hazard.severity}`}
      pinColor={'#F59E0B'}
      onPress={() => onPress(hazard)}
      tracksViewChanges={track}
    />
  );
});


// --- Memoized Cluster Marker (simple bubble) ---
const ClusterMarker = React.memo(({ c }: { c: HazardCluster }) => {
  return (
    <Marker coordinate={{ latitude: c.lat, longitude: c.lng }} tracksViewChanges={false}>
      <View style={stylesCluster.bubble}>
        <Text style={stylesCluster.count}>{c.count}</Text>
      </View>
    </Marker>
  );
});

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
  } = useLocation();

  const {
    hazards,
    clusters,
    mode: hazardMode,
    setSelectedHazard,
  } = useHazards();

  const { destination, routeSummary, selectDestination, routeCoords, clearRoute } = useRoute();

  const {
    snackbar,
    hideSnackbar,
  } = useUI();

  const isLoading = bootLoading || locationLoading;

  const getRouteColor = () => {
    if (!routeSummary) return '#3B82F6';
    const distance = Math.max(routeSummary.distance_km || 0, 0.1);
    const hazardsPerKm = routeSummary.hazards_count / distance;
    if (hazardsPerKm < 0.3) return '#10B981';
    if (hazardsPerKm < 1) return '#F59E0B';
    return '#EF4444';
  };

  const handleHazardPress = useCallback(
    (h: RoadHazard) => {
      setSelectedHazard(h);
      SheetManager.show('hazard-detail-sheet');
    },
    [setSelectedHazard]
  );

  const hazardMarkers = useMemo(() => {
    return hazards.map((h) => <HazardMarker key={h.id} hazard={h} onPress={handleHazardPress} />);
  }, [hazards, handleHazardPress]);

  const clusterMarkers = useMemo(() => {
    return clusters.map((c, idx) => <ClusterMarker key={`cluster-${idx}-${c.lat}-${c.lng}`} c={c} />);
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

      <MapView
        // @ts-ignore
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation={!isSimulatingLocation}
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setRegion(r)}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          selectDestination({ latitude, longitude });
        }}
        onPress={(e) => {
          if (isSimulatingLocation) {
            const { latitude, longitude } = e.nativeEvent.coordinate;
            simulateLocation(latitude, longitude);
          }
        }}
        userInterfaceStyle={mode}
        customMapStyle={mode === 'dark' ? DARK_MAP_STYLE : []}
      >
        {/* Either clusters or points */}
        {hazardMode === 'clusters' ? clusterMarkers : hazardMarkers}

        {isSimulatingLocation && currentLat && currentLng && (
          <Marker coordinate={{ latitude: currentLat, longitude: currentLng }} title="Ma position simulée" pinColor="purple" />
        )}

        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Destination"
            pinColor="#2563EB"
          />
        )}

        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor={getRouteColor()} strokeWidth={5} />
        )}
      </MapView>

      {/* Floating tools */}
      <ActionFloatingTools />

      {/* Sheets & Banners */}
      <SnackbarBanner
        snackbar={snackbar}
        onPressCta={() => {
          hideSnackbar();
          SheetManager.show('hazard-report-sheet');
        }}
      />

    </View>
  );
};

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
  },
  count: {
    color: 'white',
    fontWeight: '800',
    fontSize: 13,
  },
});
