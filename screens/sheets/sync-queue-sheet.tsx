import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, } from 'react-native';
import ActionSheet, { SheetProps, SheetManager, ScrollView } from 'react-native-actions-sheet';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { useHazards } from '@/contexts/5-hazard-context';
import { useUI } from '@/contexts/4-ui-context';

const SyncQueueSheet = (props: SheetProps) => {
  const { queue, removeFromQueue, clearQueue } = useOfflineQueueStore();
  const { syncBulkQueuedReports } = useHazards();
  const { showSnackbar } = useUI();
  const [syncing, setSyncing] = useState(false);

  const handleSyncAll = async () => {
    if (queue.length === 0) {
      showSnackbar('Aucun signalement à synchroniser', 'Info');
      return;
    }

    setSyncing(true);

    try {
      // Bulk sync all reports in one API call
      const result = await syncBulkQueuedReports(queue);

      // Clear successfully synced items
      if (result.success > 0) {
        await clearQueue();
        showSnackbar(`${result.success} signalement(s) synchronisé(s)`, 'OK');
      }

      if (result.failed > 0) {
        showSnackbar(`${result.failed} échec(s)`, 'Erreur');
      }

      // Close sheet if all items synced successfully
      if (result.failed === 0) {
        SheetManager.hide('sync-queue-sheet');
      }
    } catch (error) {
      console.error('Bulk sync failed:', error);
      showSnackbar('Erreur de synchronisation', 'Erreur');
    } finally {
      setSyncing(false);
    }
  };

  const handleDismiss = () => {
    SheetManager.hide('sync-queue-sheet');
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = Date.now();
    const diff = now - timestamp;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 1) return 'À l\'instant';
    if (minutes < 60) return `Il y a ${minutes}m`;
    if (hours < 24) return `Il y a ${hours}h`;
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
  };

  return (
    <ActionSheet
      {...props}
      containerStyle={styles.container}
      // gestureEnabled={!syncing}
      safeAreaInsets={{
        top: 200, left: 0, right: 0, bottom: 0
      }}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Signalements en attente</Text>
          <Text style={styles.subtitle}>
            {queue.length} signalement{queue.length > 1 ? 's' : ''} à synchroniser
          </Text>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {queue.map((report) => (
            <View key={report.id} style={styles.reportItem}>
              <View style={styles.reportDetails}>
                <Text style={styles.reportCategory}>
                  {report.categoryLabel || 'Signalement'}
                </Text>
                <Text style={styles.reportTime}>
                  {formatDate(report.queuedAt)}
                </Text>
                {report.note && (
                  <Text style={styles.reportNote} numberOfLines={1}>
                    {report.note}
                  </Text>
                )}
              </View>
              <View style={styles.severityBadge}>
                <Text style={styles.severityText}>{report.severity}</Text>
              </View>
            </View>
          ))}
        </ScrollView>

        <View style={styles.actions}>
          <TouchableOpacity
            style={[styles.button, styles.buttonSecondary]}
            onPress={handleDismiss}
            disabled={syncing}
          >
            <Text style={styles.buttonTextSecondary}>Plus tard</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, syncing && styles.buttonDisabled]}
            onPress={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonTextPrimary}>Synchroniser</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#1C1C1E',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  content: {
    padding: 20,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
  },
  list: {
    maxHeight: 300,
    marginBottom: 20,
  },
  reportItem: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  reportDetails: {
    flex: 1,
  },
  reportCategory: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  reportTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
  },
  reportNote: {
    fontSize: 14,
    color: '#AEAEB2',
    fontStyle: 'italic',
  },
  severityBadge: {
    backgroundColor: '#FF9500',
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
  },
  severityText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonPrimary: {
    backgroundColor: '#007AFF',
  },
  buttonSecondary: {
    backgroundColor: '#2C2C2E',
    borderWidth: 1,
    borderColor: '#3A3A3C',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonTextPrimary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  buttonTextSecondary: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});

export default SyncQueueSheet;
