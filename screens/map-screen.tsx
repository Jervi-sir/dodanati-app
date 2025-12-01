// src/screens/MapScreen.tsx
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';

import { MapProvider, useMap } from './map-context';
import { BottomButtons } from './bottom-buttons';
import { QuickReportButtons } from './quick-report-buttons';
import { SnackbarBanner } from './snackbar-banner';
import { HazardReportSheet } from './hazard-report-sheet';
import { HazardDetailSheet } from './hazard-detail-sheet';
import { RouteSummarySection } from './route-summary';
import { StatusBar } from 'expo-status-bar';
import { AppTheme, useTheme } from './theme-context';

export const MapScreen = () => {
  return (
    <MapProvider>
      <Content />
    </MapProvider>
  )
}

// Simple dark map style (you can tweak later or paste a full JSON from SnazzyMaps)
const DARK_MAP_STYLE = [
  {
    elementType: 'geometry',
    stylers: [{ color: '#202124' }],
  },
  {
    elementType: 'labels.text.fill',
    stylers: [{ color: '#e8eaed' }],
  },
  {
    elementType: 'labels.text.stroke',
    stylers: [{ color: '#202124' }],
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{ color: '#3c4043' }],
  },
  {
    featureType: 'water',
    elementType: 'geometry',
    stylers: [{ color: '#1a73e8' }],
  },
  {
    featureType: 'poi',
    elementType: 'geometry',
    stylers: [{ color: '#303134' }],
  },
];


const Content = () => {
  const { mode, theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  
  const {
    bootLoading,
    locationLoading,
    hazardsLoading,

    region,
    setRegion,

    hazards,

    recenterOnUser,
    openReportSheet,
    handleQuickReport,

    mapRef,
    openHazardSheet,

    // NEW
    destination,
    routeSummary,
    routeLoading,
    selectDestination,
    routeCoords,
    clearRoute,
    openParamsSheet,
    mapProvider
  } = useMap();


  const isLoading = bootLoading || locationLoading;

  const getRouteColor = () => {
    if (!routeSummary) return '#3B82F6'; // blue default

    const distance = Math.max(routeSummary.distance_km || 0, 0.1);
    const hazardsPerKm = routeSummary.hazards_count / distance;

    if (hazardsPerKm < 0.3) return '#10B981'; // green: mostly safe
    if (hazardsPerKm < 1) return '#F59E0B';   // orange: medium
    return '#EF4444';                         // red: many hazards
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
        ref={mapRef}
        style={StyleSheet.absoluteFillObject}
        provider={mapProvider === 'google' ? PROVIDER_GOOGLE : undefined}  // 👈 NEW
        initialRegion={region}
        showsUserLocation
        showsMyLocationButton={false}
        onRegionChangeComplete={(r) => setRegion(r)}
        onLongPress={(e) => {
          const { latitude, longitude } = e.nativeEvent.coordinate;
          selectDestination({ latitude, longitude });
        }}
        userInterfaceStyle={mode}
        customMapStyle={mode === 'dark' ? DARK_MAP_STYLE : []}  // 👈 this now works
      >
        {hazards.map((h) => (
          <Marker
            key={h.id}
            coordinate={{ latitude: h.lat, longitude: h.lng }}
            title={h.category?.name_fr ?? h.category?.name_en ?? 'Danger'}
            description={
              h.note ??
              `Signalements: ${h.reports_count} • Sévérité: ${h.severity}`
            }
            pinColor={h.severity >= 4 ? '#DC2626' : '#F59E0B'}
            onPress={() => openHazardSheet(h)}
          />
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

      <TouchableOpacity
        style={styles.paramsButton}
        onPress={openParamsSheet}
        activeOpacity={0.8}
      >
        <Text style={styles.paramsButtonText}>⚙️</Text>
      </TouchableOpacity>


      {hazardsLoading && (
        <View style={styles.topRightBadge}>
          <ActivityIndicator size="small" color="#111" />
        </View>
      )}

      {!isLoading && (
        <RouteSummarySection
          routeLoading={routeLoading}
          routeSummary={routeSummary}
          onQuit={clearRoute}
        />
      )}

      <BottomButtons onRecenter={recenterOnUser} onOpenSheet={openReportSheet} />

      <QuickReportButtons disabled={isLoading} onQuickReport={handleQuickReport} />

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
      backgroundColor:
        theme.mode === 'light'
          ? '#FFFFFFDD'
          : 'rgba(0,0,0,0.55)',          // softer dark overlay
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

    paramsButton: {
      position: 'absolute',
      right: 16,
      bottom: 210,
      width: 40,
      height: 40,
      borderRadius: 19,
      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        theme.mode === 'light'
          ? '#111827'        // Dark navy
          : '#F3F4F6',        // Light gray on dark mode

      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.3,
      shadowRadius: 4,
      elevation: 5,
    },

    paramsButtonText: {
      fontSize: 18,
      color:
        theme.mode === 'light'
          ? '#F9FAFB'
          : '#111827',            // reverse contrast in dark mode
    },
  });
