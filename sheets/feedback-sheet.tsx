import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Platform } from 'react-native';
import ActionSheet, { SheetProps, SheetManager } from 'react-native-actions-sheet';
import { useTheme, AppTheme } from '@/contexts/1-theme-context';
import { useDevice } from '@/contexts/2-device-context';
import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { useTrans } from '@/hooks/use-trans';

const TRANSLATIONS = {
  sheet_title: {
    en: 'Send Feedback',
    fr: 'Envoyer un avis',
    ar: 'إرسال رأي',
  },
  sheet_subtitle: {
    en: 'Tell us what you like or dislike',
    fr: 'Dites-nous ce que vous aimez ou n\'aimez pas',
    ar: 'أخبرنا بما لا يعجبك أو بما يعجبك',
  },
  email_label: {
    en: 'Email (optional)',
    fr: 'Email (optionnel)',
    ar: 'البريد الإلكتروني (اختياري)',
  },
  email_placeholder: {
    en: 'Example: contact@example.com',
    fr: 'Exemple: contact@example.com',
    ar: 'مثال: contact@example.com',
  },
  message_label: {
    en: 'Your message',
    fr: 'Votre message',
    ar: 'رسالتك',
  },
  message_placeholder: {
    en: 'Describe your problem or suggestion...',
    fr: 'Décrivez votre problème ou suggestion...',
    ar: 'صف مشكلتك أو اقتراحك...',
  },
  submit_btn: {
    en: 'Send',
    fr: 'Envoyer',
    ar: 'إرسال',
  },
  alert_success_title: {
    en: 'Thank you!',
    fr: 'Merci !',
    ar: 'شكراً !',
  },
  alert_success_msg: {
    en: 'Your message has been sent successfully.',
    fr: 'Votre message a été envoyé avec succès.',
    ar: 'تم إرسال رسالتك بنجاح.',
  },
  alert_error_title: {
    en: 'Oops',
    fr: 'Oups',
    ar: 'عفواً',
  },
  alert_error_msg: {
    en: 'An error occurred while sending. Please check your connection.',
    fr: 'Une erreur est survenue lors de l\'envoi. Veuillez vérifier votre connexion.',
    ar: 'حدث خطأ أثناء الإرسال. يرجى التحقق من اتصالك.',
  },
};

export const FeedbackSheet: React.FC<SheetProps> = (props) => {
  const { theme } = useTheme();
  const { deviceUuid } = useDevice();
  const { t, isRTL } = useTrans(TRANSLATIONS);
  const styles = useMemo(() => makeStyles(theme, isRTL), [theme, isRTL]);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const isValid = message.trim().length > 0;

  const handleSubmit = async () => {
    if (!isValid) return;

    setSending(true);

    try {
      await api.post(buildRoute(ApiRoutes.feedback), {
        email: email || undefined,
        message: message,
        device_uuid: deviceUuid,
        meta: {
          platform: Platform.OS,
          version: Platform.Version,
        }
      });
      Alert.alert(t('alert_success_title'), t('alert_success_msg'));
      SheetManager.hide(props.sheetId);
    } catch (e) {
      Alert.alert(t('alert_error_title'), t('alert_error_msg'));
    } finally {
      setSending(false);
    }
  };

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      // Give enough space for keyboard
      keyboardHandlerEnabled={true}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>{t('sheet_title')}</Text>
        <Text style={styles.sheetSubtitle}>
          {t('sheet_subtitle')}
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('email_label')}</Text>
          <TextInput
            style={styles.input}
            placeholder={t('email_placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Message Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>{t('message_label')}</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder={t('message_placeholder')}
            placeholderTextColor={theme.colors.textMuted}
            value={message}
            onChangeText={setMessage}
            multiline
            numberOfLines={5}
            textAlignVertical="top"
          />
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[styles.submitButton, (!isValid || sending) && styles.submitButtonDisabled]}
          onPress={handleSubmit}
          disabled={!isValid || sending}
        >
          {sending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.submitButtonText}>{t('submit_btn')}</Text>
          )}
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
      paddingTop: 16,
      paddingBottom: 8,
    },
    sheetTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: theme.colors.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: isRTL ? 'right' : 'left',
    },

    formContainer: {
      padding: 16,
      gap: 16,
    },
    inputGroup: {
      gap: 8,
    },
    label: {
      fontSize: 14,
      fontWeight: '600',
      color: theme.colors.text,
      textAlign: isRTL ? 'right' : 'left',
    },
    input: {
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 15,
      color: theme.colors.text,
      borderWidth: 1,
      borderColor: theme.colors.border,
      textAlign: isRTL ? 'right' : 'left',
    },
    textArea: {
      minHeight: 120,
    },
    submitButton: {
      marginTop: 8,
      backgroundColor: theme.colors.accent,
      height: 50,
      borderRadius: 25,
      alignItems: 'center',
      justifyContent: 'center',
    },
    submitButtonDisabled: {
      opacity: 0.5,
      backgroundColor: theme.colors.border,
    },
    submitButtonText: {
      color: '#111',
      fontSize: 16,
      fontWeight: '600',
    },
  });
