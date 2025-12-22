// src/components/map/HazardReportSheet.tsx
import React, { useMemo } from 'react';
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { Region } from 'react-native-maps';
import ActionSheet, { ActionSheetRef } from 'react-native-actions-sheet';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';

type RoadHazardCategoryTaxonomyItem = {
  id?: number;
  slug?: string;
  label?: string;
  icon?: string | null;
};

type HazardReportSheetProps = {
  actionSheetRef: React.RefObject<ActionSheetRef | null>;
  region: Region;
  categories: RoadHazardCategoryTaxonomyItem[];
  categoriesLoading: boolean;
  selectedCategoryId: number | null;
  severity: number;
  note: string;
  submitting: boolean;
  onChangeCategory: (id: number) => void;
  onChangeSeverity: (lvl: number) => void;
  onChangeNote: (val: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
};

export const HazardReportSheet: React.FC<HazardReportSheetProps> = ({
  actionSheetRef,
  region,
  categories,
  categoriesLoading,
  selectedCategoryId,
  severity,
  note,
  submitting,
  onChangeCategory,
  onChangeSeverity,
  onChangeNote,
  onSubmit,
  onCancel,
}) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  return (
    <ActionSheet
      ref={actionSheetRef}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      safeAreaInsets={{ top: 200, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Signaler un danger</Text>
        <Text style={styles.sheetSubtitle}>
          Position&nbsp;
          <Text style={styles.sheetSubtitleMono}>
            {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
          </Text>
        </Text>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Catégorie</Text>
        {categoriesLoading && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" />
            <Text style={styles.inlineLoaderText}>Chargement…</Text>
          </View>
        )}
        <View style={styles.chipRow}>
          {categories.map((cat) => {
            if (!cat.id) return null;
            const active = selectedCategoryId === cat.id;
            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => onChangeCategory(cat.id!)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat.label || cat.slug}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Sévérité</Text>
        <View style={styles.chipRow}>
          {[1, 2, 3, 4, 5].map((lvl) => {
            const active = severity === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => onChangeSeverity(lvl)}
                style={[styles.chipSmall, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {lvl}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Note */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Note (optionnel)</Text>
        <TextInput
          value={note}
          onChangeText={onChangeNote}
          placeholder="Ex : très haut, invisible la nuit…"
          multiline
          style={styles.textArea}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Submit / cancel */}
      <View style={styles.sheetButtons}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={onSubmit}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? 'Envoi…' : 'Enregistrer le danger'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, submitting && styles.buttonDisabled]}
          onPress={onCancel}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Annuler</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
};
const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetContainer: {
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
    sheetSubtitleMono: {
      fontFamily: Platform.select({
        ios: 'Menlo',
        android: 'monospace',
        default: 'monospace',
      }),
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

    inlineLoader: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 6,
    },
    inlineLoaderText: {
      fontSize: 12,
      color: theme.colors.textMuted,
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
      backgroundColor: theme.colors.accentSoft, // auto: light = gray, dark = gray-700ish
    },
    chipSmall: {
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
    },
    chipActive: {
      backgroundColor: theme.colors.accent, // blue (light+dark)
    },
    chipText: {
      fontSize: 13,
      color: theme.colors.text,
    },
    chipTextActive: {
      color: theme.colors.background,
      fontWeight: '600',
    },

    textArea: {
      minHeight: 80,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.card,
      paddingHorizontal: 12,
      paddingVertical: 10,
      textAlignVertical: 'top',
      fontSize: 14,
      color: theme.colors.text,
    },

    sheetButtons: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 8,
    },

    submitButton: {
      height: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,     // blue everywhere
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonText: {
      color: theme.colors.background,
      fontWeight: '600',
      fontSize: 15,
    },

    cancelButton: {
      height: 44,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'transparent',
    },
    cancelButtonText: {
      color: theme.colors.textMuted,
      fontSize: 14,
      fontWeight: '500',
    },

    buttonDisabled: {
      opacity: 0.6,
    },
  });
