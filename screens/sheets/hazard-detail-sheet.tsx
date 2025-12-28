// src/components/map/HazardDetailSheet.tsx
import React, { useMemo } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { useHazards } from '@/contexts/5-hazard-context';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { useUI } from '@/contexts/4-ui-context';

export const HazardDetailSheet: React.FC<SheetProps> = (props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const {
    selectedHazard,
    deleteHazard,
  } = useHazards();


  const handleDelete = () => {
    if (!selectedHazard) return;

    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            SheetManager.hide('hazard-detail-sheet');
            deleteHazard(selectedHazard.id);
          },
        },
      ]
    );
  };

  return (
    <ActionSheet
      // ✅ registerable sheet
      id={props.sheetId}
      gestureEnabled
      indicatorStyle={styles.sheetIndicator}
      containerStyle={styles.sheetContainer}
      safeAreaInsets={{ top: 200, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>
          {selectedHazard?.category?.name_fr ||
            selectedHazard?.category?.name_en ||
            'Danger routier'}
        </Text>

        {selectedHazard && (
          <>
            <Text style={styles.subtitle}>
              Coordonnées: {selectedHazard.lat.toFixed(5)}, {selectedHazard.lng.toFixed(5)}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Sévérité</Text>
              <Text style={styles.value}>{selectedHazard.severity} / 5</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Signalements</Text>
              <Text style={styles.value}>{selectedHazard.reports_count}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Dernier signalement</Text>
              <Text style={styles.value}>
                {selectedHazard.last_reported_at || '—'}
              </Text>
            </View>

            {selectedHazard.note ? (
              <View style={styles.section}>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.noteText}>{selectedHazard.note}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.footer}>
          {!!selectedHazard?.is_mine && (
            <TouchableOpacity
              style={[
                styles.closeButton,
                { flex: 1, backgroundColor: '#EF4444', marginBottom: 12 },
              ]}
              onPress={handleDelete}
            >
              <Text style={[styles.closeText, { color: '#fff' }]}>Supprimer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={() => SheetManager.hide('hazard-detail-sheet')}>
            <Text style={styles.closeText}>Fermer</Text>
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetContainer: {
      paddingBottom: 8,
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
    container: {
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 12,
      backgroundColor: theme.colors.background,
    },

    title: {
      fontSize: 17,
      fontWeight: '600',
      color: theme.colors.text,
    },

    subtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    section: {
      marginTop: 12,
    },

    label: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginBottom: 2,
    },

    value: {
      fontSize: 14,
      color: theme.colors.text,
      fontWeight: '500',
    },

    noteText: {
      fontSize: 14,
      color: theme.colors.text,
    },

    footer: {
      flexDirection: 'row',
      gap: 16,
      marginTop: 16,
      paddingBottom: 24,
      flex: 1,
    },

    closeButton: {
      flex: 2,
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
      height: 40,
      justifyContent: 'center',
      alignItems: 'center',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: theme.mode === 'light' ? 0.15 : 0.4,
      shadowRadius: 4,
      elevation: 3,
    },

    closeText: {
      color: theme.colors.background,
      fontWeight: '500',
      fontSize: 13,
    },
  });
