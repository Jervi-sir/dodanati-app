import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ActionSheet, { SheetProps, SheetManager, ScrollView } from 'react-native-actions-sheet';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { useHazards } from '@/contexts/5-hazard-context';
import { useUI } from '@/contexts/4-ui-context';
import { useLocation } from '@/contexts/3-location-context';
import TrashIcon from '@/assets/icons/trash-icon';

const SyncQueueSheet = (props: SheetProps) => {
  const { queue, removeFromQueue, clearQueue } = useOfflineQueueStore();
  const { syncBulkQueuedReports } = useHazards();
  const { showSnackbar } = useUI();
  const { mapRef, setRegion } = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

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

  const handleDeleteOne = (id: string) => {
    Alert.alert(
      'Supprimer',
      'Voulez-vous vraiment supprimer ce signalement en attente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            removeFromQueue(id);
            showSnackbar('Signalement supprimé', 'OK');
            if (queue.length <= 1) {
              SheetManager.hide('sync-queue-sheet');
            }
          }
        }
      ]
    );
  };

  const handleDeleteSelected = () => {
    Alert.alert(
      'Supprimer la sélection',
      `Voulez-vous vraiment supprimer ${selectedIds.size} signalement(s) ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach((id) => removeFromQueue(id));
            setSelectedIds(new Set());
            showSnackbar(`${selectedIds.size} signalement(s) supprimé(s)`, 'OK');

            // If we deleted everything, close the sheet
            if (queue.length - selectedIds.size <= 0) {
              SheetManager.hide('sync-queue-sheet');
            }
          }
        }
      ]
    );
  };

  const handleDeleteAll = () => {
    Alert.alert(
      'Tout supprimer',
      'Voulez-vous vraiment supprimer TOUS les signalements en attente ?',
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Tout supprimer',
          style: 'destructive',
          onPress: async () => {
            await clearQueue();
            setSelectedIds(new Set());
            showSnackbar('File d\'attente vidée', 'OK');
            SheetManager.hide('sync-queue-sheet');
          }
        }
      ]
    );
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
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <Text style={styles.subtitle}>
              {queue.length} signalement{queue.length > 1 ? 's' : ''} à synchroniser
            </Text>
            {selectedIds.size > 0 ? (
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }]}
                onPress={handleDeleteSelected}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, { color: '#FF3B30', fontSize: 12 }]}>
                  Sup. ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }]}
                onPress={handleDeleteAll}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, { color: '#FF3B30', fontSize: 12 }]}>Tout supprimer</Text>
              </TouchableOpacity>
            )}

          </View>
        </View>

        <ScrollView style={styles.list} showsVerticalScrollIndicator={false}>
          {queue.map((report) => {
            const isSelected = selectedIds.has(report.id);
            return (
              <View
                key={report.id}
                style={[
                  styles.reportItemContainer,
                  isSelected && styles.reportItemContainerSelected
                ]}
              >
                {/* <TouchableOpacity
                  style={styles.checkboxContainer}
                  onPress={() => toggleSelection(report.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
                    {isSelected && <View style={styles.checkboxInner} />}
                  </View>
                </TouchableOpacity> */}

                <TouchableOpacity
                  style={styles.reportItem}
                  onPress={() => {
                    // If in selection mode, toggle selection instead of moving map? 
                    // Or keep dual behavior? Let's keep dual behavior but maybe favor selection if user taps the item body?
                    // User request didn't specify, but standard pattern:
                    // usually tapping item body in "Edit" mode toggles.
                    // But here we are always in "Edit" mode essentially.
                    // Let's keep map navigation on body press, and use checkbox for selection.
                    SheetManager.hide('sync-queue-sheet');
                    const newRegion = {
                      latitude: report.lat,
                      longitude: report.lng,
                      latitudeDelta: 0.005,
                      longitudeDelta: 0.005,
                    };
                    setRegion(newRegion);
                    mapRef.current?.animateToRegion(newRegion, 500);
                  }}
                >
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
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteOne(report.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <TrashIcon size={18} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            );
          })}
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
    flex: 1,
    padding: 16,
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
  reportItemContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  deleteButton: {
    padding: 8,
    marginLeft: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reportItemContainerSelected: {
    backgroundColor: '#3A3A3C',
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  checkboxContainer: {
    padding: 16,
    paddingRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: '#8E8E93',
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxSelected: {
    backgroundColor: '#007AFF',
    borderColor: '#007AFF',
  },
  checkboxInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FFFFFF',
  },
});

export default SyncQueueSheet;
