import CarIcon from '@/assets/icons/car-icon';
import CenterMapIcon from '@/assets/icons/center-map-icon';
import SettingsIcon from '@/assets/icons/settings-icon';
import StopIcon from '@/assets/icons/stop-icon';
import { useUI } from '@/contexts/4-ui-context';
import { useTheme } from '@/contexts/1-theme-context';
import { useDevice } from '@/contexts/2-device-context';
import { useLocation } from '@/contexts/3-location-context';
import { useHazards } from '@/contexts/5-hazard-context';
import { useRoute } from '@/contexts/6-route-context';
import { useDrive } from '@/contexts/7-drive-context';

import { ActivityIndicator, Animated, PanResponder, Platform, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteSummarySection } from './route-summary';
import { SheetManager } from 'react-native-actions-sheet';
import { OfflineIndicator } from '@/components/offline-indicator';
import { useRef, useState } from 'react';
import SpeedBumpIcon from '@/assets/icons/speed-bump-icon';

export const ActionFloatingTools = () => {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDriveMode, toggleDriveMode } = useDrive();
  const { hazardsLoading, handleQuickReport, mode: hazardMode, totalInRadius, hazardCounts } = useHazards();
  const { bootLoading } = useDevice();
  const { locationLoading, recenterOnUser, isSimulatingLocation, toggleSimulationMode, mapRef } = useLocation();
  const { routeSummary, routeLoading, clearRoute, destination } = useRoute();
  const { showSnackbar } = useUI();

  const pan = useRef(new Animated.Value(0)).current;
  const [containerHeight, setContainerHeight] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (_, gestureState) => Math.abs(gestureState.dy) > 10,
      onPanResponderMove: Animated.event(
        [null, { dy: pan }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        pan.extractOffset();
      },
    })
  ).current;

  const isLoading = bootLoading || locationLoading;

  const limitY = containerHeight > contentHeight ? (containerHeight - contentHeight) / 2 : 0;

  const clampedPan = pan.interpolate({
    inputRange: [-limitY, limitY],
    outputRange: [-limitY, limitY],
    extrapolate: 'clamp',
  });

  // Common styles
  const iconBtnStyle = {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: theme.colors.card,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 4,
  };

  const quickChipStyle = {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    backgroundColor: theme.colors.card,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    gap: 6,
  };
  return (
    <View style={{
      position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
      paddingBottom: insets.bottom, justifyContent: 'flex-end',
    }} pointerEvents="box-none">
      {/* Right Column: Utilities */}
      <View style={{
        paddingTop: Platform.OS === 'ios' ? 55 : 40, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        flex: 1
      }}>
        <View style={{ alignItems: 'flex-end', gap: 12, marginBottom: 40, }} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              iconBtnStyle,
              { borderWidth: 2 },
              isDriveMode && { backgroundColor: '#FEF2F2', borderColor: theme.colors.danger },
              (!isDriveMode && !destination) && { opacity: 0.5 }
            ]}
            onPress={() => {
              if (!isDriveMode && !destination) {
                showSnackbar("Veuillez définir une destination pour démarrer.", "OK"); // French message
                return;
              }
              toggleDriveMode();
            }}
            activeOpacity={0.9}
          >
            {isDriveMode ? <StopIcon size={24} /> : <CarIcon size={26} color={theme.colors.text} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={iconBtnStyle}
            onPress={() => {
              SheetManager.show('map-params-sheet', {
                payload: {
                  onNavigateToHazard: (item: { lat: number, lng: number }) => {
                    mapRef.current?.animateToRegion({
                      latitude: item.lat,
                      longitude: item.lng,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    }, 500);
                  }
                }
              } as any)
            }}
            activeOpacity={0.8}
          >
            <SettingsIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>

          <View style={[iconBtnStyle, { opacity: hazardsLoading ? 1 : 0 }]}>
            <ActivityIndicator size="small" color={theme.colors.accent} />
          </View>
        </View>

        <View style={{ height: '100%', flex: 1, gap: 8 }}>
          <OfflineIndicator />
          {!isLoading && (
            <RouteSummarySection
              routeLoading={routeLoading}
              routeSummary={routeSummary}
              onQuit={clearRoute}
            />
          )}
          {/* Quick Actions (Inline Row) */}
          <View
            style={{ justifyContent: 'center', alignSelf: 'flex-end', flex: 1 }}
            pointerEvents="box-none"
            onLayout={(e) => setContainerHeight(e.nativeEvent.layout.height)}
          >
            <Animated.View
              style={{
                gap: 10,
                paddingBottom: 10,
                alignItems: 'flex-end',
                transform: [{ translateY: clampedPan }],
                alignSelf: 'flex-end'
              }}
              onLayout={(e) => setContentHeight(e.nativeEvent.layout.height)}
              {...panResponder.panHandlers}
            >
              {!isDriveMode && (
                <>
                  {[
                    { id: 'speed_bump', label: 'دودانة', color: '#F59E0B' },
                    { id: 'pothole', label: 'حفرة', color: '#EF4444' },
                  ].map((action) => (
                    <TouchableOpacity
                      key={action.id}
                      style={{
                        flexDirection: 'column',
                        alignItems: 'center',
                        backgroundColor: theme.colors.card,
                        paddingVertical: 12,
                        paddingHorizontal: 4,
                        borderRadius: 16,
                        borderWidth: 1,
                        borderColor: theme.colors.border,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.15,
                        shadowRadius: 5,
                        elevation: 5,
                        gap: 8,
                        width: 70, // Minimum width for consistent tap area
                        justifyContent: 'center'
                      }}
                      onPress={() => handleQuickReport(action.id as any)}
                      disabled={isLoading}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 24,
                        height: 24,
                        borderRadius: 12,
                        backgroundColor: action.color,
                        borderWidth: 2,
                        borderColor: '#FFF',
                        shadowColor: action.color,
                        shadowOpacity: 0.4,
                        shadowRadius: 4,
                        elevation: 2
                      }} />
                      <Text style={{
                        fontSize: 12,
                        fontWeight: '700',
                        color: theme.colors.text,
                        textAlign: 'center',
                        lineHeight: 14
                      }}>
                        {action.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </Animated.View>
          </View>
        </View>
      </View>

      {/* Bottom Area */}
      <View style={{
        width: '100%',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 18,
        gap: 10,
      }} pointerEvents="box-none">
        {/* Optional: top badge showing total hazards in radius */}
        {hazardMode === 'clusters'
          ? null
          : <View style={{
            alignSelf: 'center',
            zIndex: 20,
            paddingHorizontal: 12,
            paddingVertical: 6,
            borderRadius: 999,
            backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
            borderWidth: 1,
            borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
            marginLeft: 'auto'
          }}>
            <Text style={{
              fontSize: 12,
              color: theme.mode === 'dark' ? '#E5E7EB' : '#111827',
              fontWeight: '600',
            }}>
              {`Vue détaillée • Total: ${totalInRadius} (${hazardCounts.speed_bump} 🟠, ${hazardCounts.pothole} 🔴)`}
            </Text>
          </View>
        }
        {/* Main CTA Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginLeft: 'auto' }}>
          <TouchableOpacity
            style={iconBtnStyle}
            onPress={() => recenterOnUser()}
            activeOpacity={0.8}
          >
            <CenterMapIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>

          {/* Change my current location */}
          {/* <TouchableOpacity
            style={[
              iconBtnStyle, { backgroundColor: theme.colors.danger },
              isSimulatingLocation && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
            ]}
            onPress={toggleSimulationMode}
            activeOpacity={0.8}
          >
            <CenterMapIcon size={22} color={isSimulatingLocation ? '#FFF' : theme.colors.text} />
          </TouchableOpacity> */}

          {/* Open sheet for the offline queued */}
          {/* <TouchableOpacity
            style={[
              iconBtnStyle, { backgroundColor: theme.colors.danger },
              isSimulatingLocation && { backgroundColor: theme.colors.success, borderColor: theme.colors.success }
            ]}
            onPress={() => SheetManager.show('sync-queue-sheet')}
            activeOpacity={0.8}
          >
            <SpeedBumpIcon size={22} color={isSimulatingLocation ? '#FFF' : theme.colors.text} />
          </TouchableOpacity> */}

          <TouchableOpacity
            style={{
              height: 44,
              width: 180,
              paddingHorizontal: 24,
              backgroundColor: theme.colors.text,
              borderRadius: 25,
              alignItems: 'center',
              justifyContent: 'center',
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 4,
              elevation: 5,
            }}
            onPress={() => {
              console.log('asd:', JSON.stringify(123, null, 2));
              SheetManager.show('hazard-report-sheet')
            }}
            activeOpacity={0.9}
          >
            <Text style={{
              color: theme.colors.background,
              fontWeight: 'bold',
              fontSize: 15,
            }}>＋ Signaler</Text>
          </TouchableOpacity>

        </View>
      </View>

    </View>
  );
};
