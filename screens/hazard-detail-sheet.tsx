// src/components/map/HazardDetailSheet.tsx
import React, { useMemo } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { Alert } from 'react-native';
import { useHazards } from '../contexts/hazard-context';
import { RoadHazard } from '../contexts/hazard-context';
import { AppTheme, useTheme } from '../contexts/theme-context';


type Props = {
  actionSheetRef: React.RefObject<ActionSheetRef | null>;
  hazard: RoadHazard | null;
  onClose: () => void;
};

export const HazardDetailSheet: React.FC<Props> = ({
  actionSheetRef,
  hazard,
  onClose,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const { deleteHazard } = useHazards();

  const handleDelete = () => {
    if (!hazard) return;
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce signalement ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            onClose();
            deleteHazard(hazard.id);
          }
        },
      ]
    );
  };

  return (
    <ActionSheet
      ref={actionSheetRef}
      gestureEnabled
      indicatorStyle={styles.sheetIndicator}
      containerStyle={styles.sheetContainer}
      safeAreaInsets={{ top: 200, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.container}>
        <Text style={styles.title}>
          {hazard?.category?.name_fr ||
            hazard?.category?.name_en ||
            'Danger routier'}
        </Text>

        {hazard && (
          <>
            <Text style={styles.subtitle}>
              Coordonnées: {hazard.lat.toFixed(5)}, {hazard.lng.toFixed(5)}
            </Text>

            <View style={styles.section}>
              <Text style={styles.label}>Sévérité</Text>
              <Text style={styles.value}>{hazard.severity} / 5</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Signalements</Text>
              <Text style={styles.value}>{hazard.reports_count}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>Dernier signalement</Text>
              <Text style={styles.value}>
                {hazard.last_reported_at || '—'}
              </Text>
            </View>

            {hazard.note ? (
              <View style={styles.section}>
                <Text style={styles.label}>Note</Text>
                <Text style={styles.noteText}>{hazard.note}</Text>
              </View>
            ) : null}
          </>
        )}

        <View style={styles.footer}>
          {(hazard?.is_mine) && (
            <TouchableOpacity
              style={[styles.closeButton, { flex: 1, backgroundColor: '#EF4444', marginBottom: 12 }]}
              onPress={handleDelete}
            >
              <Text style={[styles.closeText, { color: '#fff' }]}>Supprimer</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
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
      color: theme.colors.textMuted,     // adjusts by theme
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
      backgroundColor: theme.colors.accent,  // blue on light/dark
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
      color: theme.colors.background,       // contrast auto inverse
      fontWeight: '500',
      fontSize: 13,
    },
  });
