import React from 'react';
import { StyleSheet, Text, View, Linking, TouchableOpacity } from 'react-native';
import ActionSheet, { SheetProps } from 'react-native-actions-sheet';
import { useTheme } from '@/contexts/1-theme-context';

export const AboutUsSheet = (props: SheetProps) => {
  const { theme, mode } = useTheme();

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
          حول دوداناتي
        </Text>

        <View style={styles.paragraphContainer}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            يهدف هذا التطبيق إلى تمكينك من <Text style={{ fontWeight: '700', color: theme.colors.accent }}>الإبلاغ عن مخاطر الطرق</Text> وتجنب المرور بها.
          </Text>
        </View>

        <View style={styles.paragraphContainer}>
          <Text style={[styles.text, { color: theme.colors.text }]}>
            بما أن بعض المخاطر يتم تجاهلها، نحاول المساعدة من خلال توفير إحصائيات واضحة ليكون الجميع على علم.
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
          onPress={() => Linking.openURL('https://dodanati.vercel.app/')} // Placeholder URL or remove if none
        >
          <Text style={{
            color: theme.colors.card,
            fontWeight: '700',
            fontSize: 16
          }}>زيارة موقعنا</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 16, alignItems: 'center' }}>
          <Text style={{ color: theme.colors.text, opacity: 0.5, fontSize: 13 }}>
            الإصدار 1.0.1
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
