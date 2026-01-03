import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { useNetworkStatus } from '@/hooks/use-network-status';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { SheetManager } from 'react-native-actions-sheet';

export const OfflineIndicator = () => {
  const { isConnected } = useNetworkStatus();
  const { queue } = useOfflineQueueStore();
  const [slideAnim] = useState(new Animated.Value(-100));

  useEffect(() => {
    if (!isConnected || queue.length > 0) {
      // Slide down
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 50,
        friction: 7,
      }).start();
    } else {
      // Slide up
      Animated.timing(slideAnim, {
        toValue: -100,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [isConnected, queue.length, slideAnim]);

  const handlePress = () => {
    if (queue.length > 0 && isConnected) {
      SheetManager.show('sync-queue-sheet');
    }
  };

  if (isConnected && queue.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateY: slideAnim }] },
      ]}
    >
      <TouchableOpacity
        style={[
          styles.banner,
          !isConnected ? styles.bannerOffline : styles.bannerOnline,
        ]}
        onPress={handlePress}
        activeOpacity={queue.length > 0 && isConnected ? 0.7 : 1}
        disabled={!(queue.length > 0 && isConnected)}
      >
        <View style={styles.content}>
          <View style={{ flexDirection: 'row-reverse', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Text style={styles.text}>
              {!isConnected ? 'غير متصل بالانترنت' : `${queue.length} تبليغ(ات) في الانتظار`}
            </Text>
            <View style={[styles.dot, !isConnected ? styles.dotOffline : styles.dotOnline]} />
          </View>
          {queue.length > 0 && isConnected && (
            <Text style={styles.actionText}>اضغط للمزامنة</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    zIndex: 1000,
    alignItems: 'center', // Center the pill
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
    flexDirection: 'row-reverse'
  },
  bannerOffline: {
    backgroundColor: '#FF3B30',
  },
  bannerOnline: {
    backgroundColor: '#FF9500',
  },
  content: {
    flexDirection: 'column',
    flex: 1
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dotOffline: {
    backgroundColor: '#FFFFFF',
  },
  dotOnline: {
    backgroundColor: '#FFFFFF',
  },
  text: {
    fontSize: 14,
    fontWeight: '600',
    color: '#FFFFFF',
    marginLeft: 8,
    textAlign: 'right',
  },
  actionText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontStyle: 'italic',
    textAlign: 'right',
  },
});
