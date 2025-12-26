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
          <View style={[styles.dot, !isConnected ? styles.dotOffline : styles.dotOnline]} />
          <Text style={styles.text}>
            {!isConnected ? 'Mode hors ligne' : `${queue.length} signalement${queue.length > 1 ? 's' : ''} en attente`}
          </Text>
          {queue.length > 0 && isConnected && (
            <Text style={styles.actionText}>Appuyez pour synchroniser</Text>
          )}
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    // position: 'absolute',
    // top: 0,
    // left: 0,
    // right: 0,
    // zIndex: 1000,
  },
  banner: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  bannerOffline: {
    backgroundColor: '#FF3B30',
  },
  bannerOnline: {
    backgroundColor: '#FF9500',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
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
    marginRight: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#FFFFFF',
    opacity: 0.8,
    fontStyle: 'italic',
  },
});
