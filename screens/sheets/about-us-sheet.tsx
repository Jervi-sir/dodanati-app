import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import ActionSheet, { SheetProps } from 'react-native-actions-sheet';
import { useTheme } from '@/contexts/1-theme-context';
import { useTrans } from '@/hooks/use-trans';

const TRANSLATIONS = {
  about_title: {
    en: 'About Dodanati',
    fr: 'À propos de Dodanati',
    ar: 'حول دوداناتي',
  },
  goal_text_1: {
    en: 'This app aims to enable you to',
    fr: 'Cette application vise à vous permettre de',
    ar: 'يهدف هذا التطبيق إلى تمكينك من',
  },
  goal_highlight: {
    en: 'report road hazards',
    fr: 'signaler les dangers de la route',
    ar: 'الإبلاغ عن مخاطر الطرق',
  },
  goal_text_2: {
    en: 'and avoid them.',
    fr: 'et de les éviter.',
    ar: 'وتجنب المرور بها.',
  },
  mission_text: {
    en: 'Since some hazards are ignored, we try to help by providing clear statistics so everyone is aware.',
    fr: 'Comme certains dangers sont ignorés, nous essayons d\'aider en fournissant des statistiques claires pour que tout le monde soit au courant.',
    ar: 'بما أن بعض المخاطر يتم تجاهلها، نحاول المساعدة من خلال توفير إحصائيات واضحة ليكون الجميع على علم.',
  },
  visit_site_btn: {
    en: 'Visit our site',
    fr: 'Visiter notre site',
    ar: 'زيارة موقعنا',
  },
  version_label: {
    en: 'Version',
    fr: 'Version',
    ar: 'الإصدار',
  },
};

export const AboutUsSheet = (props: SheetProps) => {
  const { theme, mode } = useTheme();
  const { t } = useTrans(TRANSLATIONS);

  return (
    <ActionSheet
      id={props.sheetId}
      containerStyle={{
        backgroundColor: theme.colors.card,
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingHorizontal: 24,
      }}
      indicatorStyle={{
        backgroundColor: mode === 'dark' ? '#374151' : '#E5E7EB',
        width: 48,
        marginTop: 12
      }}
      gestureEnabled={true}
    >
      <View style={{ paddingTop: 24, gap: 16 }}>
        <Text style={{
          fontSize: 22,
          fontWeight: '800',
          color: theme.colors.text,
          textAlign: 'center',
          marginBottom: 8
        }}>
          {t('about_title')}
        </Text>

        <View style={styles.paragraphContainer}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {t('goal_text_1')} <Text style={{ fontWeight: '700', color: theme.colors.accent }}>{t('goal_highlight')}</Text> {t('goal_text_2')}
          </Text>
        </View>

        <View style={styles.paragraphContainer}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            {t('mission_text')}
          </Text>
        </View>

        <TouchableOpacity
          style={{
            marginTop: 24,
            backgroundColor: theme.colors.accent,
            paddingVertical: 14,
            borderRadius: 12,
            alignItems: 'center'
          }}
          onPress={() => Linking.openURL('https://dodanati.vercel.app/')}
        >
          <Text style={{
            color: theme.colors.card,
            fontWeight: '700',
            fontSize: 16
          }}>{t('visit_site_btn')}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, opacity: 0.5, fontSize: 13 }}>
            {t('version_label')} 1.0.1
          </Text>
        </View>
      </View>
    </ActionSheet>
  );
};

const styles = StyleSheet.create({
  paragraphContainer: {
    marginBottom: 4,
  },
  text: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    opacity: 0.9,
  }
});
