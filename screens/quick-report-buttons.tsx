// src/components/map/QuickReportButtons.tsx
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppTheme, useTheme } from './theme-context';

type QuickReportButtonsProps = {
  disabled: boolean;
  onQuickReport: (slug: 'speed_bump' | 'pothole') => void;
};

export const QuickReportButtons: React.FC<QuickReportButtonsProps> = ({
  disabled,
  onQuickReport,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.quickButtonsContainer}>
      <TouchableOpacity
        style={styles.quickButton}
        onPress={() => onQuickReport('speed_bump')}
        disabled={disabled}
      >
        <Text style={styles.quickButtonEmoji}>⛰️</Text>
        <Text style={styles.quickButtonText}>Dos-d’âne</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.quickButton}
        onPress={() => onQuickReport('pothole')}
        disabled={disabled}
      >
        <Text style={styles.quickButtonEmoji}>🕳️</Text>
        <Text style={styles.quickButtonText}>Nid-de-poule</Text>
      </TouchableOpacity>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    quickButtonsContainer: {
      position: 'absolute',
      right: 16,
      bottom: 96,
      alignItems: 'flex-end',
      gap: 8,
    },

    quickButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,

      backgroundColor: theme.colors.card,     // white in light, dark gray in dark
      borderWidth: 1,
      borderColor: theme.colors.border,       // adjusts automatically

      shadowColor: '#000',
      shadowOpacity: theme.mode === 'light' ? 0.1 : 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 3,
    },

    quickButtonEmoji: {
      fontSize: 16,
      marginRight: 6,
    },

    quickButtonText: {
      fontSize: 13,
      fontWeight: '500',
      color: theme.colors.text,               // auto readable
    },
  });
