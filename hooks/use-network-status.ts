import { useEffect, useState } from 'react';
import NetInfo, { NetInfoState } from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [isInternetReachable, setIsInternetReachable] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    // Get initial state
    NetInfo.fetch().then((state) => {
      setIsOnline(state.isConnected ?? false);
      setIsInternetReachable(state.isInternetReachable ?? null);
    });

    return () => unsubscribe();
  }, []);

  return {
    isOnline,
    isInternetReachable,
    // Consider internet reachable if we're connected and either reachability is true or unknown
    isConnected: isOnline && (isInternetReachable === null || isInternetReachable === true),
  };
};
