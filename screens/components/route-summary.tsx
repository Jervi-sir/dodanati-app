import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { RouteSummary } from '@/contexts/6-route-context';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

type Props = {
  routeSummary: RouteSummary | null;
  routeLoading: boolean;
  onQuit: () => void;
};

export const RouteSummarySection = ({ routeLoading, routeSummary, onQuit }: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  // If summary is not yet available: show hint involving destination
  if (!routeSummary) {
    return (
      <View style={styles.routeSummaryCard}>
        {routeLoading && (
          <Text style={styles.routeSummarySub}>
            Estimation en cours, quelques secondes…
          </Text>
        )}

        {!routeLoading && (
          <Text style={styles.routeSummarySub}>
            Maintiens appuyé sur un autre point de la carte pour estimer un
            nouveau trajet, ou appuie sur la croix pour annuler.
          </Text>
        )}
      </View>
    );
  }

  const speedBumps =
    routeSummary.by_category.find((c) => c.slug === 'speed_bump')?.count ?? 0;
  const potholes =
    routeSummary.by_category.find((c) => c.slug === 'pothole')?.count ?? 0;

  return (
    <View style={styles.routeSummaryCard}>
      <TouchableOpacity
        onPress={onQuit}
        style={styles.quitButton}
        activeOpacity={0.7}
        hitSlop={{ top: 10, left: 30, right: 10, bottom: 30 }}
      >
        <Text style={styles.quitButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.routeSummaryTitle}>Trajet vers la destination</Text>
      <Text style={styles.routeSummaryLine}>
        Distance approx. : {routeSummary.distance_km.toFixed(1)} km
      </Text>
      <Text style={styles.routeSummaryLine}>
        Dos-d’âne : {speedBumps}
      </Text>
      <Text style={[styles.routeSummaryLine]}>
        {potholes} : حفرة
      </Text>

      {routeLoading && (
        <Text style={styles.routeSummarySub}>Calcul en cours…</Text>
      )}
      {!routeLoading && (
        <Text style={styles.routeSummarySub}>
          Long-press sur la carte pour changer ou appuie sur la croix pour quitter ce trajet.
        </Text>
      )}
    </View>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    routeSummaryCard: {
      position: 'relative',

      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,

      backgroundColor:
        theme.mode === 'light'
          ? '#111827EE'         // deep slate with alpha (keeps good contrast on light map)
          : '#020617',        // slightly lighter slate on dark mode (balanced)

      shadowColor: '#000',
      shadowOpacity: theme.mode === 'light' ? 0.25 : 0.4,
      shadowRadius: 6,
      shadowOffset: { width: 0, height: 2 },
      elevation: 5,
    },

    routeSummaryTitle: {
      color: theme.mode === 'light'
        ? '#E5E7EB'
        : '#D1D5DB',
      fontWeight: '600',
      marginBottom: 4,
      fontSize: 14,
    },

    routeSummaryLine: {
      color: theme.mode === 'light'
        ? '#E5E7EB'
        : '#D1D5DB',                           // slightly brighter on dark mode
      fontSize: 13,
    },

    routeSummarySub: {
      color: theme.mode === 'light'
        ? '#9CA3AF'
        : '#9CA3AFCC',                         // more transparent soft gray
      fontSize: 11,
    },

    quitButton: {
      position: 'absolute',
      top: 6,
      right: 6,
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99,

      backgroundColor:
        theme.mode === 'light'
          ? '#374151'         // slate-700
          : '#4B5563',        // slate-600 (brighter for dark mode)
    },

    quitButtonText: {
      color: theme.colors.background,
      fontSize: 14,
      fontWeight: '600',
    },
  });
