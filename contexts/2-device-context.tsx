import React, { createContext, useContext, useEffect, useState } from 'react';
import { Alert, Linking, Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import api, { setAuthToken } from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';

const DEVICE_UUID_KEY = 'roadwatch_device_uuid';
const DEVICE_TOKEN_KEY = 'roadwatch_device_token';
const APP_VERSION = '1.0.0';

type DeviceContextType = {
  isReady: boolean;
  bootLoading: boolean;
  deviceUuid: string | null;
};

const DeviceContext = createContext<DeviceContextType | undefined>(undefined);

export const useDevice = () => {
  const ctx = useContext(DeviceContext);
  if (!ctx) throw new Error('useDevice must be used within <DeviceProvider>');
  return ctx;
};

function generateRandomUuid() {
  return 'dev-' + Math.random().toString(36).slice(2) + '-' + Date.now().toString(36);
}

export const DeviceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [bootLoading, setBootLoading] = useState(true);
  const [deviceUuid, setDeviceUuid] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const bootstrap = async () => {
      try {
        let uuid = await AsyncStorage.getItem(DEVICE_UUID_KEY);
        if (!uuid) {
          uuid = generateRandomUuid();
          await AsyncStorage.setItem(DEVICE_UUID_KEY, uuid);
        }
        setDeviceUuid(uuid);

        const storedToken = await AsyncStorage.getItem(DEVICE_TOKEN_KEY);
        if (storedToken) {
          setAuthToken(storedToken);
        }

        const res = await api.post(buildRoute(ApiRoutes.device.auth), {
          device_uuid: uuid,
          platform: Platform.OS,
          app_version: APP_VERSION,
          device_model: '',
          os_version: '',
          locale: 'fr-DZ',
        });

        const token: string | undefined = res?.data?.data?.access_token;
        if (token) {
          setAuthToken(token);
          await AsyncStorage.setItem(DEVICE_TOKEN_KEY, token);
        }

        // Check for updates
        try {
          const updateRes = await api.get(buildRoute(ApiRoutes.device.checkUpdate), {
            params: {
              version: APP_VERSION,
              platform: Platform.OS
            }
          });

          const { has_update, store_url, latest_version } = updateRes?.data?.data || {};

          if (has_update && store_url) {
            Alert.alert(
              'Mise à jour disponible',
              `Une nouvelle version (${latest_version}) est disponible.`,
              [
                {
                  text: 'Plus tard',
                  style: 'cancel',
                },
                {
                  text: 'Mettre à jour',
                  onPress: () => Linking.openURL(store_url),
                },
              ]
            );
          }
        } catch (e) {
          console.log('Update check failed', e);
        }

      } catch (err) {
        console.error('Device auth error', err);
        Alert.alert('Erreur', "Impossible d'authentifier le device.");
      } finally {
        setBootLoading(false);
        setIsReady(true);
      }
    };

    bootstrap();
  }, []);

  return (
    <DeviceContext.Provider value={{ bootLoading, deviceUuid, isReady }}>
      {children}
    </DeviceContext.Provider>
  );
};
