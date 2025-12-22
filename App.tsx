import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SheetProvider } from 'react-native-actions-sheet';
import { ThemeProvider } from './contexts/1-theme-context';
import { DeviceProvider } from './contexts/2-device-context';
import { LocationProvider } from './contexts/3-location-context';
import { UIProvider } from './contexts/4-ui-context';
import { HazardProvider } from './contexts/5-hazard-context';
import { RouteProvider } from './contexts/6-route-context';
import { DriveProvider } from './contexts/7-drive-context';
import { MapScreen } from './screens/map-screen';
import { SheetsHost } from './screens/sheets/sheet-host';

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
                    <SheetProvider>
                      <MapScreen />
                      <SheetsHost />
                    </SheetProvider>
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
