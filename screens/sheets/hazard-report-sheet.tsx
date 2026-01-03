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
import ActionSheet, { SheetManager, SheetProps } from 'react-native-actions-sheet';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { useLocation } from '@/contexts/3-location-context';
import { useHazards } from '@/contexts/5-hazard-context';
import { useTrans } from '@/hooks/use-trans';

const TRANSLATIONS = {
  sheet_title: { en: 'Report Hazard', fr: 'Signaler un danger', ar: 'إبلاغ عن خطر' },
  location: { en: 'Location', fr: 'Localisation', ar: 'الموقع' },
  category: { en: 'Category', fr: 'Catégorie', ar: 'الفئة' },
  loading: { en: 'Loading...', fr: 'Chargement...', ar: 'جاري التحميل...' },
  severity: { en: 'Severity', fr: 'Gravité', ar: 'الخطورة' },
  note_label: { en: 'Note (optional)', fr: 'Note (optionnel)', ar: 'ملاحظة (اختياري)' },
  note_placeholder: {
    en: 'Ex: Very high, invisible at night...',
    fr: 'Ex: Très élevé, invisible la nuit...',
    ar: 'مثال: مرتفع جداً، غير مرئي ليلاً...'
  },
  submit_btn: { en: 'Save Hazard', fr: 'Enregistrer le danger', ar: 'حفظ الخطر' },
  sending_btn: { en: 'Sending...', fr: 'Envoi...', ar: 'جاري الإرسال...' },
  cancel: { en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' },
};

export const HazardReportSheet: React.FC<SheetProps> = (props) => {
  const submitting = false;

  const { region } = useLocation();
  const {
    categories,
    categoriesLoading,
    selectedCategoryId,
    setSelectedCategoryId,
    setSeverity,
    severity,
    setNote,
    note,
    handleSubmitHazard,
  } = useHazards();

  const { theme } = useTheme();
  const { t, isRTL, language } = useTrans(TRANSLATIONS);
  const styles = useMemo(() => makeStyles(theme, isRTL), [theme, isRTL]);

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      safeAreaInsets={{ top: 200, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{t('sheet_title')}</Text>
        <Text style={styles.sheetSubtitle}>
          {t('location')}&nbsp;
          <Text style={styles.sheetSubtitleMono}>
            {region.latitude.toFixed(5)}, {region.longitude.toFixed(5)}
          </Text>
        </Text>
      </View>

      {/* Categories */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('category')}</Text>

        {categoriesLoading && (
          <View style={styles.inlineLoader}>
            <ActivityIndicator size="small" />
            <Text style={styles.inlineLoaderText}>{t('loading')}</Text>
          </View>
        )}

        <View style={styles.chipRow}>
          {categories.map((cat) => {
            if (!cat.id) return null;
            const active = selectedCategoryId === cat.id;

            // Pick label based on locale, fallback to cat.label or cat.slug
            let label = language === 'fr' ? cat.name_fr : (language === 'en' ? cat.name_en : cat.name_ar);
            if (!label) label = cat.label || cat.slug;

            return (
              <TouchableOpacity
                key={cat.id}
                onPress={() => setSelectedCategoryId(cat.id!)}
                style={[styles.chip, active && styles.chipActive]}
                activeOpacity={0.8}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Severity */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('severity')}</Text>
        <View style={styles.chipRow}>
          {[1, 2, 3, 4, 5].map((lvl) => {
            const active = severity === lvl;
            return (
              <TouchableOpacity
                key={lvl}
                onPress={() => setSeverity(lvl)}
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
        <Text style={styles.sectionTitle}>{t('note_label')}</Text>
        <TextInput
          value={note}
          onChangeText={setNote}
          placeholder={t('note_placeholder')}
          multiline
          style={styles.textArea}
          placeholderTextColor="#9CA3AF"
        />
      </View>

      {/* Submit / cancel */}
      <View style={styles.sheetButtons}>
        <TouchableOpacity
          style={[styles.submitButton, submitting && styles.buttonDisabled]}
          onPress={handleSubmitHazard}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            {submitting ? t('sending_btn') : t('submit_btn')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.cancelButton, submitting && styles.buttonDisabled]}
          onPress={() => {
            SheetManager.hide('hazard-report-sheet');
          }}
          disabled={submitting}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>{t('cancel')}</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
};

const makeStyles = (theme: AppTheme, isRTL: boolean) =>
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
      textAlign: isRTL ? 'right' : 'left',
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: isRTL ? 'right' : 'left',
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
      textAlign: isRTL ? 'right' : 'left',
    },

    inlineLoader: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      alignItems: 'center',
      marginBottom: 6,
      gap: 6,
    },
    inlineLoaderText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    chipRow: {
      flexDirection: isRTL ? 'row-reverse' : 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    chip: {
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 999,
      backgroundColor: theme.colors.accentSoft,
    },
    chipSmall: {
      paddingHorizontal: 10,
      paddingVertical: 6,
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
      textAlign: isRTL ? 'right' : 'left',
    },

    sheetButtons: {
      paddingHorizontal: 16,
      paddingTop: 6,
      gap: 8,
    },

    submitButton: {
      height: 48,
      borderRadius: 999,
      backgroundColor: theme.colors.accent,
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
