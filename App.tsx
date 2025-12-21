import { MapScreen } from './screens/map-screen';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './contexts/theme-context';
import { DeviceProvider } from './contexts/device-context';
import { LocationProvider } from './contexts/location-context';
import { RouteProvider } from './contexts/route-context';
import { DriveProvider } from './contexts/drive-context';
import { HazardProvider } from './contexts/hazard-context';
import { UIProvider } from './contexts/ui-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <DeviceProvider>
          <LocationProvider>
            <UIProvider>
              <HazardProvider>
                <RouteProvider>
                  <DriveProvider>
                    <MapScreen />
                  </DriveProvider>
                </RouteProvider>
              </HazardProvider>
            </UIProvider>
          </LocationProvider>
        </DeviceProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
