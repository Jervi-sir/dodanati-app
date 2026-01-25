// src/components/map/MapParamsSheet.tsx
import React, { useMemo } from 'react';
import { Platform, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import ActionSheet, { ScrollView, SheetProps } from 'react-native-actions-sheet';
import { MapProviderKind, useLocation } from '@/contexts/3-location-context';
import { useTheme, AppTheme, ThemeMode } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';
import { useTrans } from '@/hooks/use-trans';
import { Language } from '@/stores/language-store';

const TRANSLATIONS = {
  settings_title: {
    en: 'Settings',
    fr: 'Paramètres',
    ar: 'الإعدادات',
  },
  settings_subtitle: {
    en: 'Customize your map',
    fr: 'Personnaliser votre carte',
    ar: 'تخصيص الخريطة الخاصة بك',
  },

  // Theme
  appearance: {
    en: 'Appearance',
    fr: 'Apparence',
    ar: 'المظهر',
  },
  theme_light: {
    en: 'Light',
    fr: 'Clair',
    ar: 'فاتح',
  },
  theme_dark: {
    en: 'Dark',
    fr: 'Sombre',
    ar: 'داكن',
  },

  // Language
  language: {
    en: 'Language',
    fr: 'Langue',
    ar: 'اللغة',
  },
  lang_en: { en: 'English', fr: 'Anglais', ar: 'الإنجليزية' },
  lang_fr: { en: 'French', fr: 'Français', ar: 'الفرنسية' },
  lang_ar: { en: 'Arabic', fr: 'Arabe', ar: 'العربية' },

  // Map Provider
  map_provider: {
    en: 'Map Engine',
    fr: 'Moteur de carte',
    ar: 'محرك الخريطة',
  },
  provider_apple: { en: 'Apple Maps', fr: 'Apple Maps', ar: 'Apple Maps' },
  provider_google: { en: 'Google Maps', fr: 'Google Maps', ar: 'Google Maps' },

  // Display
  display: {
    en: 'Display',
    fr: 'Affichage',
    ar: 'العرض',
  },
  place_names: {
    en: 'Place Names',
    fr: 'Noms de lieux',
    ar: 'أسماء الأماكن',
  },
  show_labels: {
    en: 'Show labels on map',
    fr: 'Afficher les labels sur la carte',
    ar: 'إظهار التسميات على الخريطة',
  },
  hide_labels: {
    en: 'Hide labels on map',
    fr: 'Masquer les labels sur la carte',
    ar: 'إخفاء التسميات على الخريطة',
  },

  // Data
  data: {
    en: 'Data',
    fr: 'Données',
    ar: 'البيانات',
  },
  my_reports_history: {
    en: 'My Reports History',
    fr: 'Historique de mes signalements',
    ar: 'سجل تبليغاتي',
  },
  view_sent_hazards: {
    en: 'View hazards you have sent',
    fr: 'Voir les dangers que vous avez déjà envoyés',
    ar: 'عرض المخاطر التي قمت بإرسالها',
  },

  // Support
  support: {
    en: 'Support',
    fr: 'Support',
    ar: 'الدعم',
  },
  send_feedback: {
    en: 'Send Feedback',
    fr: 'Envoyer un avis',
    ar: 'إرسال رأي',
  },
  report_bug: {
    en: 'Report a bug or suggest an idea',
    fr: 'Signaler un bug ou suggérer une idée',
    ar: 'الإبلاغ عن خطأ أو اقتراح فكرة',
  },

  // Footer
  close: {
    en: 'Close',
    fr: 'Fermer',
    ar: 'إغلاق',
  },
};

export const MapParamsSheet: React.FC<SheetProps> = (props) => {
  const { theme, mode, setMode } = useTheme();
  const { mapProvider, setMapProvider, showMapLabels, setShowMapLabels } = useLocation();
  const { t, language, setLanguage, isRTL } = useTrans(TRANSLATIONS);

  const styles = useMemo(() => makeStyles(theme, isRTL), [theme, isRTL]);

  const close = () => {
    SheetManager.hide(props.sheetId);
  };

  const onNavigateToHazard = (props.payload as unknown as { onNavigateToHazard?: (item: any) => void })?.onNavigateToHazard;

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      safeAreaInsets={{ top: 150, left: 0, right: 0, bottom: 0 }}
    >
      <ScrollView>

        <View style={styles.sheetHeader}>
          <Text style={styles.sheetTitle}>{t('settings_title')}</Text>
          <Text style={styles.sheetSubtitle}>{t('settings_subtitle')}</Text>
        </View>

        {/* Language Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('language')}</Text>
          <View style={styles.chipRow}>
            {(['ar', 'en', 'fr'] as Language[]).map((lang) => {
              const active = language === lang;
              return (
                <TouchableOpacity
                  key={lang}
                  onPress={() => setLanguage(lang)}
                  style={[styles.chip, active && styles.chipActive]}
                  activeOpacity={0.8}
                >
                  <Text style={[styles.chipText, active && styles.chipTextActive]}>
                    {lang === 'en' ? t('lang_en') : lang === 'fr' ? t('lang_fr') : t('lang_ar')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Theme section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('appearance')}</Text>
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
                    {value === 'light' ? t('theme_light') : t('theme_dark')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Provider section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('map_provider')}</Text>
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
                    {value === 'system' ? t('provider_apple') : t('provider_google')}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Display Options */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('display')}</Text>
          <TouchableOpacity
            style={styles.listItem}
            onPress={() => setShowMapLabels(!showMapLabels)}
            activeOpacity={0.8}
          >
            <View style={styles.listItemTextWrapper}>
              <Text style={styles.listItemTitle}>{t('place_names')}</Text>
              <Text style={styles.listItemSubtitle}>
                {showMapLabels ? t('hide_labels') : t('show_labels')}
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

        <View style={{ alignSelf: 'center', height: 1.5, width: '69%', backgroundColor: theme.colors.border }} />

        {/* History */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('data')}</Text>

          <TouchableOpacity
            style={styles.listItem}
            onPress={() => {
              close();
              // Delay to avoid sheet transition conflicts
              setTimeout(() => {
                SheetManager.show('hazard-history-sheet', {
                  payload: { onPressItem: onNavigateToHazard }
                } as any);
              }, 400);
            }}
            activeOpacity={0.8}
          >
            <View style={styles.listItemTextWrapper}>
              <Text style={styles.listItemTitle}>{t('my_reports_history')}</Text>
              <Text style={styles.listItemSubtitle}>
                {t('view_sent_hazards')}
              </Text>
            </View>
            <Text style={styles.listItemChevron}>{isRTL ? '‹' : '›'}</Text>
          </TouchableOpacity>
        </View>

        <View style={{ alignSelf: 'center', height: 1.5, width: '69%', backgroundColor: theme.colors.border }} />

        {/* Support */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('support')}</Text>

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
              <Text style={styles.listItemTitle}>{t('send_feedback')}</Text>
              <Text style={styles.listItemSubtitle}>
                {t('report_bug')}
              </Text>
            </View>
            <Text style={styles.listItemChevron}>{isRTL ? '‹' : '›'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
      {/* Close */}
      <View style={styles.footer}>
        <TouchableOpacity style={styles.closeButton} onPress={close} activeOpacity={0.8}>
          <Text style={styles.closeButtonText}>{t('close')}</Text>
        </TouchableOpacity>
      </View>
    </ActionSheet >
  );
};

// THEMED STYLES
const makeStyles = (theme: AppTheme, isRTL: boolean) =>
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
      textAlign: isRTL ? 'right' : 'left',
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textMuted,
      textAlign: isRTL ? 'right' : 'left',
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
      flexDirection: isRTL ? 'row-reverse' : 'row',
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
      textAlign: isRTL ? 'right' : 'left',
    },
    listItemSubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
      marginTop: 2,
      textAlign: isRTL ? 'right' : 'left',
    },
    listItemChevron: {
      fontSize: 20,
      color: theme.colors.textMuted,
      marginLeft: isRTL ? 0 : 8,
      marginRight: isRTL ? 8 : 0,
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
