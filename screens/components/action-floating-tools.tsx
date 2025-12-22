import CarIcon from '@/assets/icons/car-icon';
import CenterMapIcon from '@/assets/icons/center-map-icon';
import HoleIcon from '@/assets/icons/hole-icon';
import SettingsIcon from '@/assets/icons/settings-icon';
import SpeedBumpIcon from '@/assets/icons/speed-bump-icon';
import StopIcon from '@/assets/icons/stop-icon';
import { useTheme } from '@/contexts/1-theme-context';
import { useDevice } from '@/contexts/2-device-context';
import { useLocation } from '@/contexts/3-location-context';
import { useUI } from '@/contexts/4-ui-context';
import { useHazards } from '@/contexts/5-hazard-context';
import { useRoute } from '@/contexts/6-route-context';
import { useDrive } from '@/contexts/7-drive-context';
import React from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RouteSummarySection } from './route-summary';

export const ActionFloatingTools = () => {
  const { openParamsSheet, openReportSheet } = useUI();
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const { isDriveMode, toggleDriveMode } = useDrive();
  const { hazardsLoading, handleQuickReport, mode: hazardMode, totalInRadius, } = useHazards();
  const { bootLoading } = useDevice();
  const { locationLoading, recenterOnUser, isSimulatingLocation, toggleSimulationMode } = useLocation();
  const { routeSummary, routeLoading, clearRoute } = useRoute();

  const isLoading = bootLoading || locationLoading;

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
        position: 'absolute', top: 60, paddingHorizontal: 16,
        flexDirection: 'row', alignItems: 'flex-start', gap: 10
      }}>

        <View style={{ alignItems: 'flex-end', gap: 12, marginBottom: 40, }} pointerEvents="box-none">
          <TouchableOpacity
            style={[
              iconBtnStyle,
              { borderWidth: 2 },
              isDriveMode && { backgroundColor: '#FEF2F2', borderColor: theme.colors.danger }
            ]}
            onPress={toggleDriveMode}
            activeOpacity={0.9}
          >
            {isDriveMode ? <StopIcon size={24} /> : <CarIcon size={26} color={theme.colors.text} />}
          </TouchableOpacity>

          <TouchableOpacity
            style={iconBtnStyle}
            onPress={openParamsSheet}
            activeOpacity={0.8}
          >
            <SettingsIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <View style={{ flex: 1 }}>
          {!isLoading && (
            <RouteSummarySection
              routeLoading={routeLoading}
              routeSummary={routeSummary}
              onQuit={clearRoute}
            />
          )}
        </View>

      </View>
      {/* Bottom Area */}
      <View style={{
        width: '100%',
        alignItems: 'flex-end',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        gap: 10,
      }} pointerEvents="box-none">

        {/* Quick Actions (Inline Row) */}
        <View style={{
          gap: 10,
          paddingBottom: 10,
          alignItems: 'flex-end'
        }}>

          {hazardsLoading && (
            <View style={{
              height: 44,
              width: 44,
              paddingHorizontal: 10,
              paddingVertical: 6,
              borderRadius: 999,
              backgroundColor: theme.colors.card,
              borderWidth: 1,
              borderColor: theme.colors.border,
              justifyContent: 'center',
              alignItems: 'center'
            }}>
              <ActivityIndicator size="small" color={theme.colors.accent} />
            </View>
          )}


          {!isDriveMode && (
            <>
              <TouchableOpacity
                style={quickChipStyle}
                onPress={() => handleQuickReport('speed_bump')}
                disabled={isLoading}
              >
                <SpeedBumpIcon type='bump-2' size={20} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                  Dos-d’âne
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={quickChipStyle}
                onPress={() => handleQuickReport('pothole')}
                disabled={isLoading}
              >
                <HoleIcon type='hole-2' size={20} color={theme.colors.text} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: theme.colors.text }}>
                  حفرة
                </Text>
              </TouchableOpacity>

              {/* Optional: top badge showing total hazards in radius */}
              <View style={{
                alignSelf: 'center',
                zIndex: 20,
                paddingHorizontal: 12,
                paddingVertical: 6,
                borderRadius: 999,
                backgroundColor: theme.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.85)',
                borderWidth: 1,
                borderColor: theme.mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)',
              }}>
                <Text style={{
                  fontSize: 12,
                  color: theme.mode === 'dark' ? '#E5E7EB' : '#111827',
                  fontWeight: '600',
                }}>
                  {hazardMode === 'clusters' ? 'Vue globale' : 'Vue détaillée'} • Total: {totalInRadius}
                </Text>
              </View>


            </>
          )}
        </View>

        {/* Main CTA Row */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>

          <TouchableOpacity
            style={iconBtnStyle}
            onPress={recenterOnUser}
            activeOpacity={0.8}
          >
            <CenterMapIcon size={22} color={theme.colors.text} />
          </TouchableOpacity>

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
            onPress={openReportSheet}
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
