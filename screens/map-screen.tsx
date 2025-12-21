// src/screens/MapScreen.tsx
import React, { useCallback, useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';

import { useDevice } from '../contexts/device-context';
import { useLocation } from '../contexts/location-context';
import { useUI } from '../contexts/ui-context';
import { useHazards, RoadHazard, HazardCluster } from '../contexts/hazard-context';
import { useRoute } from '../contexts/route-context';
import { AppTheme, useTheme } from '../contexts/theme-context';

import { SnackbarBanner } from './snackbar-banner';
import { HazardReportSheet } from './hazard-report-sheet';
import { HazardDetailSheet } from './hazard-detail-sheet';
import { MapParamsSheet } from './map-params-sheet';
import { HazardHistorySheet, HazardHistoryItem } from './hazard-history-sheet';
import { ActionFloatingTools } from './action-floating-tools';

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#202124' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e8eaed' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202124' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3c4043' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a73e8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#303134' }] },
];

// --- Memoized Hazard Marker ---
const HazardMarker = React.memo(
  ({ hazard, onPress }: { hazard: RoadHazard; onPress: (h: RoadHazard) => void }) => {
    const pinColor = useMemo(() => {
      const slug = hazard.category?.slug;
      if (slug === 'pothole') return '#EF4444';
      if (slug === 'speed_bump') return '#F59E0B';
      return hazard.severity >= 4 ? '#DC2626' : '#F59E0B';
    }, [hazard.category?.slug, hazard.severity]);

    return (
      <Marker
        coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
        title={hazard.category?.name_fr ?? hazard.category?.name_en ?? 'Danger'}
        description={hazard.note ?? `Signalements: ${hazard.reports_count} • Sévérité: ${hazard.severity}`}
        pinColor={pinColor}
        onPress={() => onPress(hazard)}
        tracksViewChanges={false}
      />
    );
  },
  (prev, next) =>
    prev.hazard.id === next.hazard.id &&
    prev.hazard.reports_count === next.hazard.reports_count &&
    prev.hazard.updated_at === next.hazard.updated_at
);

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
    totalInRadius,
    categories,
    categoriesLoading,
    selectedHazard,
    setSelectedHazard,
    selectedCategoryId,
    setSelectedCategoryId,
    severity,
    setSeverity,
    note,
    setNote,
    handleSubmitHazard,
  } = useHazards();

  const { destination, routeSummary, selectDestination, routeCoords, clearRoute } = useRoute();

  const {
    snackbar,
    hideSnackbar,
    hazardReportActionSheetRef,
    openReportSheet,
    closeReportSheet,
    hazardSheetRef,
    openHazardSheet,
    closeHazardSheet,
    paramsSheetRef,
    historySheetRef,
    openHistorySheet,
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
      openHazardSheet();
    },
    [setSelectedHazard, openHazardSheet]
  );

  const hazardMarkers = useMemo(() => {
    return hazards.map((h) => <HazardMarker key={h.id} hazard={h} onPress={handleHazardPress} />);
  }, [hazards, handleHazardPress]);

  const clusterMarkers = useMemo(() => {
    return clusters.map((c, idx) => <ClusterMarker key={`cluster-${idx}-${c.lat}-${c.lng}`} c={c} />);
  }, [clusters]);

  const handleHistoryItemPress = (item: HazardHistoryItem) => {
    historySheetRef.current?.hide();
    clearRoute();

    const newRegion: Region = {
      latitude: item.lat,
      longitude: item.lng,
      latitudeDelta: 0.03,
      longitudeDelta: 0.03,
    };

    setRegion(newRegion);
    mapRef.current?.animateToRegion(newRegion, 500);
  };

  return (
    <View style={styles.container}>
      <StatusBar animated style={mode === 'dark' ? 'light' : 'dark'} />

      {isLoading && (
        <View style={styles.loaderOverlay}>
          <ActivityIndicator size="large" color="#2563EB" />
          <Text style={{ marginTop: 8 }}>Initialisation…</Text>
        </View>
      )}

      {/* Optional: top badge showing total hazards in radius */}
      <View style={styles.topBadge}>
        <Text style={styles.topBadgeText}>
          {hazardMode === 'clusters' ? 'Vue globale' : 'Vue détaillée'} • Total: {totalInRadius}
        </Text>
      </View>

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
          openReportSheet();
        }}
      />

      <HazardReportSheet
        actionSheetRef={hazardReportActionSheetRef}
        region={region}
        categories={categories}
        categoriesLoading={categoriesLoading}
        selectedCategoryId={selectedCategoryId}
        severity={severity}
        note={note}
        submitting={false}
        onChangeCategory={setSelectedCategoryId}
        onChangeSeverity={setSeverity}
        onChangeNote={setNote}
        onSubmit={handleSubmitHazard}
        onCancel={closeReportSheet}
      />

      <HazardDetailSheet actionSheetRef={hazardSheetRef} hazard={selectedHazard} onClose={closeHazardSheet} />

      <MapParamsSheet
        actionSheetRef={paramsSheetRef}
        onShowHistory={() => {
          setTimeout(() => {
            openHistorySheet();
          }, 400);
        }}
      />

      <HazardHistorySheet actionSheetRef={historySheetRef} onPressItem={handleHistoryItemPress} />
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

    topBadge: {
      position: 'absolute',
      top: 10,
      alignSelf: 'center',
      zIndex: 20,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
      borderWidth: 1,
      borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
    },
    topBadgeText: {
      fontSize: 12,
      color: theme.mode === 'dark' ? '#E5E7EB' : '#111827',
      fontWeight: '600',
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
