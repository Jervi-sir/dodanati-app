// src/components/map/BottomButtons.tsx
import React, { useMemo } from 'react';
import { Text, TouchableOpacity, View, StyleSheet } from 'react-native';
import { AppTheme, useTheme } from './theme-context';

type BottomButtonsProps = {
  onRecenter: () => void;
  onOpenSheet: () => void;
};

export const BottomButtons: React.FC<BottomButtonsProps> = ({
  onRecenter,
  onOpenSheet,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  return (
    <View style={styles.bottomButtons}>
      <TouchableOpacity style={styles.fabSmall} onPress={onRecenter}>
        <Text style={styles.fabSmallText}>◎</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.fabMain} onPress={onOpenSheet}>
        <Text style={styles.fabMainText}>Signaler un danger</Text>
      </TouchableOpacity>
    </View>
  )
}

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    bottomButtons: {
      position: 'absolute',
      bottom: 24,
      left: 16,
      right: 16,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
    },

    // Small FAB (Recenter button)
    fabSmall: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.card,       // WHITE on light, DARK CARD on dark
      borderWidth: 1,
      borderColor: theme.colors.border,         // adjusts by theme
      alignItems: 'center',
      justifyContent: 'center',
    },
    fabSmallText: {
      fontSize: 20,
      color: theme.colors.text,                 // readable in both themes
    },

    // Main FAB (Report button)
    fabMain: {
      flex: 1,
      marginLeft: 12,
      height: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.border,     // blue in both modes
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOpacity: theme.mode === 'light' ? 0.25 : 0.5,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 4,
    },
    fabMainText: {
      color: theme.colors.accent,           // always invert text for legibility
      fontWeight: '600',
      fontSize: 15,
    },
  });
