import React, { useEffect, useState, useRef } from 'react';
import { StyleSheet, Text, View, Animated, TouchableOpacity, Easing, LayoutChangeEvent } from 'react-native';
import * as Battery from 'expo-battery';
import { getNetworkStats } from '@/utils/api/axios-instance';

let globalStartBatteryLevel: number | null = null;

export const ConsumptionStats = () => {
  const [startLevel, setStartLevel] = useState<number | null>(null);
  const [currentLevel, setCurrentLevel] = useState<number | null>(null);
  const [netStats, setNetStats] = useState({ sent: 0, received: 0 });
  const [isExpanded, setIsExpanded] = useState(false);

  // Animation value: 0 = hidden (translated left), 1 = visible (translated 0)
  const slideAnim = useRef(new Animated.Value(0)).current;
  const [contentWidth, setContentWidth] = useState(120); // fallback width

  useEffect(() => {
    let isMounted = true;

    // Battery
    const updateBattery = async () => {
      try {
        const level = await Battery.getBatteryLevelAsync();
        if (isMounted) {
          // Initialize global start level if needed
          if (globalStartBatteryLevel === null) {
            globalStartBatteryLevel = level;
          }
          setStartLevel(globalStartBatteryLevel);
          setCurrentLevel(level);
        }
      } catch (e) {
        // console.warn('Battery level not available');
      }
    };

    updateBattery();

    const sub = Battery.addBatteryLevelListener(({ batteryLevel }) => {
      if (isMounted) setCurrentLevel(batteryLevel);
    });

    // Network polling (every 1s)
    const interval = setInterval(() => {
      if (isMounted) {
        setNetStats(getNetworkStats());
      }
    }, 1000);

    return () => {
      isMounted = false;
      sub?.remove();
      clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: true,
      easing: Easing.out(Easing.quad),
    }).start();
  }, [isExpanded]);

  const toggle = () => {
    setIsExpanded(!isExpanded);
  };

  const formatBytes = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  // Calculate usage
  const batteryUsage = (startLevel !== null && currentLevel !== null)
    ? Math.max(0, startLevel - currentLevel)
    : 0;

  // Interpolate translation
  // If slideAnim = 0 (collapsed), translateX = -contentWidth
  // If slideAnim = 1 (expanded), translateX = 0
  const translateX = slideAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-contentWidth, 0],
  });

  return (
    <Animated.View
      style={[
        styles.container,
        { transform: [{ translateX }] }
      ]}
    >
      <View
        style={styles.content}
        onLayout={(e: LayoutChangeEvent) => setContentWidth(e.nativeEvent.layout.width)}
      >
        <Text style={styles.label}>APP CONSUMPTION</Text>
        <View style={styles.row}>
          <Text style={styles.text}>Batt Used: </Text>
          <Text style={styles.value}>
            {startLevel !== null ? `${(batteryUsage * 100).toFixed(1)}%` : '--'}
          </Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.text}>Data: </Text>
          <Text style={styles.value}>
            {formatBytes(netStats.received + netStats.sent)}
          </Text>
        </View>
        <Text style={styles.subtext}>
          (↑{formatBytes(netStats.sent)} ↓{formatBytes(netStats.received)})
        </Text>
      </View>

      <TouchableOpacity
        onPress={toggle}
        activeOpacity={0.8}
        style={styles.handle}
      >
        <Text style={styles.handleText}>{isExpanded ? '‹' : '⚡'}</Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 100,
    left: 0,
    flexDirection: 'row',
    alignItems: 'center',
    zIndex: 9999,
  },
  content: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    padding: 8,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.15)',
    minWidth: 100,
  },
  handle: {
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    width: 24,
    height: 40,
    borderTopRightRadius: 8,
    borderBottomRightRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 0,
    borderColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  handleText: {
    color: '#4ADE80',
    fontSize: 14,
    fontWeight: 'bold',
  },
  label: {
    color: '#aaa',
    fontSize: 8,
    marginBottom: 4,
    textTransform: 'uppercase',
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  text: {
    color: '#ddd',
    fontSize: 11,
    fontFamily: 'System',
  },
  value: {
    color: '#4ADE80',
    fontSize: 11,
    fontWeight: '600',
    fontFamily: 'System',
  },
  subtext: {
    color: '#888',
    fontSize: 9,
    marginTop: 2,
  },
});
