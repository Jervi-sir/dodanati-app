// src/components/map/MapParamsSheet.tsx
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { SheetProps } from 'react-native-actions-sheet';
import { MapProviderKind, useLocation } from '@/contexts/3-location-context';
import { useTheme, AppTheme, ThemeMode } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';

export const MapParamsSheet: React.FC<SheetProps> = (props) => {
  const { theme, mode, setMode } = useTheme();
  const { mapProvider, setMapProvider, showMapLabels, setShowMapLabels } = useLocation();

  const styles = useMemo(() => makeStyles(theme), [theme]);

  const close = () => {
    // safest in registerable mode (no refs)
    SheetManager.hide(props.sheetId);
  };

  // Optional: allow caller to pass payload: { onShowHistory: () => void }
  const onShowHistory =
    (props.payload as { onShowHistory?: () => void } | undefined)?.onShowHistory;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      safeAreaInsets={{ top: 200, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Paramètres</Text>
        <Text style={styles.sheetSubtitle}>Personnaliser votre carte</Text>
      </View>

      {/* Theme section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Apparence</Text>
        <View style={styles.chipRow}>
          {(['light', 'dark'] as ThemeMode[]).map((value) => {
            const active = mode === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setMode(value)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {value === 'light' ? 'Thème clair' : 'Thème sombre'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Provider section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Moteur de carte</Text>
        <View style={styles.chipRow}>
          {((Platform.OS === 'ios' ? ['google', 'system'] : ['google']) as MapProviderKind[]).map((value) => {
            const active = mapProvider === value;
            return (
              <TouchableOpacity
                key={value}
                onPress={() => setMapProvider(value)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {value === 'system' ? 'Apple Maps' : 'Google Maps'}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Display Options */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Affichage</Text>
        <TouchableOpacity
          style={styles.listItem}
          onPress={() => setShowMapLabels(!showMapLabels)}
          activeOpacity={0.8}
        >
          <View style={styles.listItemTextWrapper}>
            <Text style={styles.listItemTitle}>Noms de lieux</Text>
            <Text style={styles.listItemSubtitle}>
              {showMapLabels ? 'Masquer' : 'Afficher'} les labels sur la carte
            </Text>
          </View>
          <View style={[
            styles.toggleDict,
            showMapLabels && styles.toggleDictActive
          ]}>
            <View style={[
              styles.toggleKnob,
              showMapLabels && styles.toggleKnobActive
            ]} />
          </View>
        </TouchableOpacity>
      </View>

      {/* History */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Données</Text>

        <TouchableOpacity
          style={styles.listItem}
          onPress={() => {
            close();
            // Delay to avoid sheet transition conflicts
            setTimeout(() => {
              SheetManager.show('hazard-history-sheet');
            }, 400);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.listItemTextWrapper}>
            <Text style={styles.listItemTitle}>Historique de mes signalements</Text>
            <Text style={styles.listItemSubtitle}>
              Voir les dangers que vous avez déjà envoyés
            </Text>
          </View>
          <Text style={styles.listItemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Support */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>

        <TouchableOpacity
          style={styles.listItem}
          onPress={() => {
            close();
            // Delay to avoid sheet transition conflicts
            setTimeout(() => {
              SheetManager.show('feedback-sheet');
            }, 400);
          }}
          activeOpacity={0.8}
        >
          <View style={styles.listItemTextWrapper}>
            <Text style={styles.listItemTitle}>Envoyer un avis</Text>
            <Text style={styles.listItemSubtitle}>
              Signaler un bug ou suggérer une idée
            </Text>
          </View>
          <Text style={styles.listItemChevron}>›</Text>
        </TouchableOpacity>
      </View>

      {/* Close */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.closeButton} onPress={close} activeOpacity={0.8}>
          <Text style={styles.closeButtonText}>Fermer</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet >
  );
};

// THEMED STYLES
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetContainer: {
      paddingBottom: 16,
      backgroundColor: theme.colors.background,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
    },
    sheetIndicator: {
      width: 40,
      height: 4,
      borderRadius: 999,
      backgroundColor: theme.colors.border,
      marginTop: 6,
    },

    sheetHeader: {
      paddingHorizontal: 16,
      paddingTop: 10,
      paddingBottom: 8,
    },
    sheetTitle: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    section: {
      paddingHorizontal: 16,
      paddingVertical: 10,
    },
    sectionTitle: {
      fontWeight: '500',
      fontSize: 13,
      marginBottom: 6,
      color: theme.colors.text,
    },

    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
    },
    chipActive: {
      backgroundColor: theme.colors.accent,
    },
    chipText: {
      fontSize: 13,
      color: theme.colors.text,
    },
    chipTextActive: {
      color: theme.colors.background,
      fontWeight: '600',
    },

    listItem: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
    },
    listItemTextWrapper: {
      flex: 1,
    },
    listItemTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    listItemSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    listItemChevron: {
      fontSize: 20,
      color: theme.colors.textMuted,
      marginLeft: 8,
    },

    footer: {
      paddingHorizontal: 16,
      paddingTop: 4,
    },
    closeButton: {
      height: 44,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    closeButtonText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },

    toggleDict: {
      width: 50,
      height: 30,
      borderRadius: 15,
      backgroundColor: theme.colors.border, // inactive
      padding: 2,
    },
    toggleDictActive: {
      backgroundColor: theme.colors.accent,
    },
    toggleKnob: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: 'white',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 2,
      elevation: 2,
    },
    toggleKnobActive: {
      alignSelf: 'flex-end',
    },
  });
