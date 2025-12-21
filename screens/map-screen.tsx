// src/screens/MapScreen.tsx
import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView from 'react-native-map-clustering';
import { Marker, Polyline, PROVIDER_GOOGLE, Region } from 'react-native-maps';
import { StatusBar } from 'expo-status-bar';

import { useDevice } from '../contexts/device-context';
import { useLocation } from '../contexts/location-context';
import { useUI } from '../contexts/ui-context';
import { useHazards, RoadHazard } from '../contexts/hazard-context';
import { useRoute } from '../contexts/route-context';
import { AppTheme, useTheme } from '../contexts/theme-context';

import { SnackbarBanner } from './snackbar-banner';
import { HazardReportSheet } from './hazard-report-sheet';
import { HazardDetailSheet } from './hazard-detail-sheet';
import { RouteSummarySection } from './route-summary';
import { MapParamsSheet } from './map-params-sheet';
import { HazardHistorySheet, HazardHistoryItem } from './hazard-history-sheet';
import { ActionFloatingTools } from './action-floating-tools';

// Memoized Marker Component for Performance
const HazardMarker = React.memo(
  ({ hazard, onPress }: { hazard: RoadHazard; onPress: (h: RoadHazard) => void }) => {
    return (
      <Marker
        coordinate={{ latitude: hazard.lat, longitude: hazard.lng }}
        title={hazard.category?.name_fr ?? hazard.category?.name_en ?? 'Danger'}
        description={hazard.note ?? `Signalements: ${hazard.reports_count} • Sévérité: ${hazard.severity}`}
        pinColor={hazard.severity >= 4 ? '#DC2626' : '#F59E0B'}
        onPress={() => onPress(hazard)}
        tracksViewChanges={false} // Major performance boost for static markers
      />
    );
  },
  (prev, next) => prev.hazard.id === next.hazard.id && prev.hazard.reports_count === next.hazard.reports_count
);

const DARK_MAP_STYLE = [
  { elementType: 'geometry', stylers: [{ color: '#202124' }] },
  { elementType: 'labels.text.fill', stylers: [{ color: '#e8eaed' }] },
  { elementType: 'labels.text.stroke', stylers: [{ color: '#202124' }] },
  { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#3c4043' }] },
  { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#1a73e8' }] },
  { featureType: 'poi', elementType: 'geometry', stylers: [{ color: '#303134' }] },
];

export const MapScreen = () => {
  const { mode, theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const { bootLoading } = useDevice();
  const { locationLoading, region, setRegion, mapRef, mapProvider, } = useLocation();
  const {
    hazards, hazardsLoading, categories, categoriesLoading,
    selectedHazard, setSelectedHazard, selectedCategoryId, setSelectedCategoryId, severity, setSeverity,
    note, setNote, handleSubmitHazard,
  } = useHazards();
  const { destination, routeSummary, selectDestination, routeCoords, clearRoute, } = useRoute();
  const {
    snackbar, hideSnackbar, hazardReportActionSheetRef, openReportSheet, closeReportSheet,
    hazardSheetRef, openHazardSheet, closeHazardSheet, paramsSheetRef, historySheetRef, openHistorySheet,
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

  const handleHazardPress = (h: RoadHazard) => {
    setSelectedHazard(h);
    openHazardSheet();
  };

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

      <MapView
        // @ts-ignore
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setRegion(r)}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          selectDestination({ latitude, longitude });
        }}
        userInterfaceStyle={mode}
        customMapStyle={mode === 'dark' ? DARK_MAP_STYLE : []}
        // Clustering Props
        spiralEnabled={false}
        animationEnabled={false} // Smoother on Android
        clusterColor={theme.colors.accent}
      >
        {hazards.map((h) => (
          <HazardMarker key={h.id} hazard={h} onPress={handleHazardPress} />
        ))}

        {destination && (
          <Marker
            coordinate={{
              latitude: destination.lat,
              longitude: destination.lng,
            }}
            title="Destination"
            pinColor="#2563EB"
          />
        )}

        {routeCoords.length > 1 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={getRouteColor()}
            strokeWidth={5}
          />
        )}
      </MapView>

      {/* Action tools */}
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

      <HazardDetailSheet
        actionSheetRef={hazardSheetRef}
        hazard={selectedHazard}
        onClose={closeHazardSheet}
      />

      <MapParamsSheet
        actionSheetRef={paramsSheetRef}
        onShowHistory={() => {
          setTimeout(() => {
            openHistorySheet();
          }, 400);
        }}
      />

      <HazardHistorySheet
        actionSheetRef={historySheetRef}
        onPressItem={handleHistoryItemPress}
      />
    </View>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    loaderOverlay: {
      position: 'absolute',
      top: 0, left: 0, right: 0, bottom: 0,
      zIndex: 10,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: theme.mode === 'light' ? '#FFFFFFDD' : 'rgba(0,0,0,0.55)',
    },
    topRightBadge: {
      position: 'absolute',
      top: 40,
      right: 16,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.card,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },

    paramsButtonText: {
      fontSize: 18,
      color: theme.mode === 'light' ? '#F9FAFB' : '#111827',
    },
  });
