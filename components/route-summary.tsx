import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { RouteSummary } from '@/contexts/6-route-context';
import { useTrans } from '@/hooks/use-trans';
import React, { useMemo } from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';

const TRANSLATIONS = {
  estimating: { en: 'Estimating, a few seconds...', fr: 'Estimation en cours...', ar: 'جاري التقدير، بضع ثوان...' },
  long_press_hint: {
    en: 'Long press on another point to calculate a new route, or press X to cancel.',
    fr: 'Appuyez longuement sur un autre point pour calculer un nouvel itinéraire, ou appuyez sur X pour annuler.',
    ar: 'اضغط مطولاً على نقطة أخرى في الخريطة لتقدير مسار جديد، أو اضغط على X للإلغاء.',
  },
  route_to_dest: { en: 'Route to destination', fr: 'Itinéraire vers la destination', ar: 'المسار إلى الوجهة' },
  approx_dist: { en: 'Approx distance:', fr: 'Distance approx:', ar: 'المسافة التقريبية :' },
  speed_bump: { en: 'Speed Bumps', fr: 'Dos-d\'âne', ar: 'دودانة' },
  pothole: { en: 'Pothole', fr: 'Nid-de-poule', ar: 'حفرة' },
  calculating: { en: 'Calculating...', fr: 'Calcul en cours...', ar: 'جاري الحساب...' },
  change_route_hint: {
    en: 'Long press to change route or press X to leave.',
    fr: 'Appuyez longuement sur la carte pour changer d\'itinéraire ou appuyez sur X pour quitter.',
    ar: 'اضغط مطولاً على الخريطة لتغيير المسار أو اضغط على X للمغادرة.',
  },
};

type Props = {
  routeSummary: RouteSummary | null;
  routeLoading: boolean;
  onQuit: () => void;
};

export const RouteSummarySection = ({ routeLoading, routeSummary, onQuit }: Props) => {
  const { theme } = useTheme();
  const { t, isRTL } = useTrans(TRANSLATIONS);
  const styles = useMemo(() => makeStyles(theme, isRTL), [theme, isRTL]);

  // If summary is not yet available: show hint involving destination
  if (!routeSummary) {
    return (
      <View style={styles.routeSummaryCard}>
        {routeLoading && (
          <Text style={styles.routeSummarySub}>
            {t('estimating')}
          </Text>
        )}

        {!routeLoading && (
          <Text style={styles.routeSummarySub}>
            {t('long_press_hint')}
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
        style={[styles.quitButton, isRTL ? { left: 10 } : { right: 10 }]}
        activeOpacity={0.7}
        hitSlop={{ top: 10, left: 30, right: 10, bottom: 30 }}
      >
        <Text style={styles.quitButtonText}>✕</Text>
      </TouchableOpacity>

      <Text style={styles.routeSummaryTitle}>{t('route_to_dest')}</Text>
      <Text style={styles.routeSummaryLine}>
        {t('approx_dist')} {routeSummary.distance_km.toFixed(1)} km
      </Text>
      <Text style={styles.routeSummaryLine}>
        {t('speed_bump')} : {speedBumps}
      </Text>
      <Text style={[styles.routeSummaryLine]}>
        {t('pothole')} : {potholes}
      </Text>

      {routeLoading && (
        <Text style={styles.routeSummarySub}>{t('calculating')}</Text>
      )}
      {!routeLoading && (
        <Text style={styles.routeSummarySub}>
          {t('change_route_hint')}
        </Text>
      )}
    </View>
  );
};

const makeStyles = (theme: AppTheme, isRTL: boolean) =>
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
      textAlign: isRTL ? 'right' : 'left',
    },

    routeSummaryLine: {
      color: theme.mode === 'light'
        ? '#E5E7EB'
        : '#D1D5DB',                           // slightly brighter on dark mode
      fontSize: 13,
      textAlign: isRTL ? 'right' : 'left',
    },

    routeSummarySub: {
      color: theme.mode === 'light'
        ? '#9CA3AF'
        : '#9CA3AFCC',                         // more transparent soft gray
      fontSize: 11,
      textAlign: isRTL ? 'right' : 'left',
    },

    quitButton: {
      position: 'absolute',
      top: 6,
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
