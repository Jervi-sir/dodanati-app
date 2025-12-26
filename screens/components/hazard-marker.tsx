import React from 'react';
import { StyleSheet, View } from 'react-native';
import { RoadHazard } from '@/contexts/5-hazard-context';
import SpeedBumpIcon from '@/assets/icons/speed-bump-icon';
import HoleIcon from '@/assets/icons/hole-icon';

type Props = {
  hazard: RoadHazard;
  selected?: boolean;
};

export const HazardMarker = ({ hazard, selected }: Props) => {
  const slug = hazard.category?.slug;
  const isSpeedBump = slug === 'speed_bump';
  const isPothole = slug === 'pothole';

  // Sizing
  const size = selected ? 32 : 20;
  const iconSize = size * 0.65;

  // Colors
  // Speed bump: Yellow background
  // Pothole: Red background
  let backgroundColor = '#FFFFFF';
  let borderColor = '#FFFFFF';

  if (isSpeedBump) {
    backgroundColor = '#F59E0B'; // Amber 500
    borderColor = '#FFFFFF';
  } else if (isPothole) {
    backgroundColor = '#EF4444'; // Red 500
    borderColor = '#FFFFFF';
  }

  return (
    <View
      style={[
        styles.container,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor,
          borderColor: selected ? '#000000' : borderColor,
          borderWidth: selected ? 3 : 2,
          transform: [{ scale: selected ? 1.1 : 1 }],
        },
      ]}
    >
      {/* Speed bump: Just an orange dot (no icon needed per request "orange dot") */}
      {/* Pothole: Red icon (keep icon for visual clarity) */}
      {isPothole && <HoleIcon type="hole-2" size={iconSize} color="#FFFFFF" />}
      {!isSpeedBump && !isPothole && <View style={styles.fallback} />}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fallback: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: 'white',
  },
});
