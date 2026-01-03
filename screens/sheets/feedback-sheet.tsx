import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View, ActivityIndicator, Alert, Platform } from 'react-native';
import ActionSheet, { SheetProps, SheetManager } from 'react-native-actions-sheet';
import { useTheme, AppTheme } from '@/contexts/1-theme-context';
import { useDevice } from '@/contexts/2-device-context';
import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';

export const FeedbackSheet: React.FC<SheetProps> = (props) => {
  const { theme } = useTheme();
  const { deviceUuid } = useDevice();
  const styles = useMemo(() => makeStyles(theme), [theme]);
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
      Alert.alert("شكراً !", "تم إرسال رسالتك بنجاح.");
      SheetManager.hide(props.sheetId);
    } catch (e) {
      Alert.alert("عفواً", "حدث خطأ أثناء الإرسال. يرجى التحقق من اتصالك.");
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
        <Text style={styles.sheetTitle}>إرسال رأي</Text>
        <Text style={styles.sheetSubtitle}>
          أخبرنا بما لا يعجبك أو بما يعجبك
        </Text>
      </View>

      <View style={styles.formContainer}>
        {/* Email Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>البريد الإلكتروني (اختياري)</Text>
          <TextInput
            style={styles.input}
            placeholder="مثال: contact@example.com"
            placeholderTextColor={theme.colors.textMuted}
            value={email}
            onChangeText={setEmail}
            autoCapitalize="none"
            keyboardType="email-address"
          />
        </View>

        {/* Message Input */}
        <View style={styles.inputGroup}>
          <Text style={styles.label}>رسالتك</Text>
          <TextInput
            style={[styles.input, styles.textArea]}
            placeholder="صف مشكلتك أو اقتراحك..."
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
            <Text style={styles.submitButtonText}>إرسال</Text>
          )}
        </TouchableOpacity>
      </View>
    </ActionSheet>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetContainer: {
      paddingBottom: 40,
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
      textAlign: 'right',
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 13,
      color: theme.colors.textMuted,
      textAlign: 'right',
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
      textAlign: 'right',
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
      textAlign: 'right',
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
