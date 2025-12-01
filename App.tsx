import { MapScreen } from './screens/map-screen';
import { SafeAreaProvider, } from 'react-native-safe-area-context';
import { ThemeProvider } from './screens/theme-context';

export default function App() {
  return (
    <SafeAreaProvider>
      <ThemeProvider>
        <MapScreen />
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
