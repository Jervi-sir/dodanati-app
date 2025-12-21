// src/components/map/SnackbarBanner.tsx
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppTheme, useTheme } from '../contexts/theme-context';

export type SnackbarState = {
  visible: boolean;
  message: string;
  ctaLabel?: string;
} | null;

type SnackbarBannerProps = {
  snackbar: SnackbarState;
  onPressCta?: () => void;
};

export const SnackbarBanner: React.FC<SnackbarBannerProps> = ({
  snackbar,
  onPressCta,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  if (!snackbar?.visible) return null;

  return (
    <View style={styles.snackbar}>
      <Text style={styles.snackbarText} numberOfLines={2}>
        {snackbar.message}
      </Text>

      {snackbar.ctaLabel && (
        <TouchableOpacity style={styles.snackbarAction} onPress={onPressCta}>
          <Text style={styles.snackbarActionText}>{snackbar.ctaLabel}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    snackbar: {
      position: 'absolute',
      left: 16,
      right: 16,
      bottom: 25,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',

      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 12,

      backgroundColor:
        theme.mode === 'light'
          ? '#111827'            // dark slate bg for strong contrast
          : '#1F2937',           // slightly lighter in dark mode (looks clean)

      shadowColor: '#000',
      shadowOpacity: theme.mode === 'light' ? 0.18 : 0.35,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
      elevation: 5,
    },

    snackbarText: {
      flex: 1,
      marginRight: 8,
      color: theme.colors.success,          // readable in both themes
      fontSize: 13,
    },

    snackbarAction: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,

      backgroundColor:
        theme.mode === 'light'
          ? '#F9FAFB22'            // subtle white overlay
          : '#FFFFFF22',           // similar overlay but brighter for dark mode
    },

    snackbarActionText: {
      color:
        theme.mode === 'light'
          ? '#BFDBFE'             // blue-200
          : '#93C5FD',            // blue-300 (brighter for dark)
      fontSize: 13,
      fontWeight: '600',
    },
  });
