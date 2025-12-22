// src/screens/MapScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';
import { HazardCluster, RoadHazard, useHazards } from '@/contexts/5-hazard-context';
import { useDevice } from '@/contexts/2-device-context';
import { useLocation } from '@/contexts/3-location-context';
import { RouteSummary, useRoute } from '@/contexts/6-route-context';
import { useUI } from '@/contexts/4-ui-context';
import { ActionFloatingTools } from './components/action-floating-tools';
import { SnackbarBanner } from './components/snackbar-banner';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';



export const MapScreen = () => {
  const { mode, theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { bootLoading } = useDevice();
  const {
    locationLoading, region, setRegion,
    mapRef, mapProvider, isSimulatingLocation,
    simulateLocation, currentLat, currentLng,
  } = useLocation();
  const {
    hazards, clusters, mode: hazardMode, setSelectedHazard,
  } = useHazards();
  const {
    destination, routeSummary, selectDestination, routeCoords, clearRoute
  } = useRoute();
  const {
    snackbar, hideSnackbar,
  } = useUI();

  const isLoading = bootLoading || locationLoading;

  /* ----------------------- Actionsheet ----------------------- */
  const handleHazardPress = useCallback((h: RoadHazard) => {
    setSelectedHazard(h);
    SheetManager.show('hazard-detail-sheet');
  }, [setSelectedHazard]);

  /* ----------------------- Marks ----------------------- */
  const hazardMarkers = useMemo(() => {
    return hazards.map((h) => (
      <Marker
        key={`hazard-${h.id}`}
        coordinate={{ latitude: Number(h.lat), longitude: Number(h.lng) }}
        title={h.category?.name_fr ?? h.category?.name_en ?? 'Danger'}
        description={h.note ?? `Signalements: ${h.reports_count} • Sévérité: ${h.severity}`}
        pinColor="#F59E0B"
        onPress={() => handleHazardPress(h)}
        // ✅ IMPORTANT: don't keep this true forever (perf + flicker)
        tracksViewChanges={false}
      />
    ));
  }, [hazards, handleHazardPress]);

  const clusterMarkers = useMemo(() => {
    return clusters.map((c) => (
      <Marker
        key={`cluster-${c.lat}-${c.lng}`} // ✅ stable key (no idx)
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

      <View style={{ position: 'absolute', top: 200, left: 20, zIndex: 99 }}>
        <View style={{ backgroundColor: 'red', padding: 10 }}>
          <Text>Hazards: {hazards?.length}</Text>
          <Text>Clusters: {clusters?.length}</Text>
          <Text>Mode: {hazardMode}</Text>
        </View>
      </View>

      <MapView
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        customMapStyle={mode === 'dark' ? DARK_MAP_STYLE : []}
        userInterfaceStyle={mode}
        initialRegion={region}
        onRegionChangeComplete={(r) => {
          console.log('region:', JSON.stringify(r, null, 2));
          setRegion(r)
        }}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
        showsMyLocationButton={true}
        showsUserLocation={!isSimulatingLocation}
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
        {isSimulatingLocation && currentLat && currentLng && (
          <Marker coordinate={{ latitude: currentLat, longitude: currentLng }} title="Ma position simulée" pinColor="purple" />
        )}

        {hazardMode === 'clusters' ? clusterMarkers : hazardMarkers}

        {destination && (
          <Marker
            coordinate={{ latitude: destination.lat, longitude: destination.lng }}
            title="Destination"
            pinColor="#2563EB"
          />
        )}
        {routeCoords.length > 1 && (
          <Polyline coordinates={routeCoords} strokeColor={getRouteColor(routeSummary)} strokeWidth={5} />
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
