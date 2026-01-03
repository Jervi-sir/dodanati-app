import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import ActionSheet, { SheetProps, SheetManager, ScrollView } from 'react-native-actions-sheet';
import { useOfflineQueueStore } from '@/stores/offline-queue-store';
import { useHazards } from '@/contexts/5-hazard-context';
import { useUI } from '@/contexts/4-ui-context';
import { useLocation } from '@/contexts/3-location-context';
import TrashIcon from '@/assets/icons/trash-icon';
import { useTrans } from '@/hooks/use-trans';

const TRANSLATIONS = {
  sheet_title: { en: 'Pending Reports', fr: 'Signalements en attente', ar: 'تبليغات في الانتظار' },
  subtitle: { en: 'reports to sync', fr: 'signalements à synchroniser', ar: 'تبليغ(ات) للمزامنة' },
  delete: { en: 'Delete', fr: 'Supprimer', ar: 'حذف' },
  delete_all: { en: 'Delete All', fr: 'Tout supprimer', ar: 'حذف الكل' },
  sync: { en: 'Sync', fr: 'Synchroniser', ar: 'مزامنة' },
  later: { en: 'Later', fr: 'Plus tard', ar: 'لاحقاً' },
  alert_delete_title: { en: 'Delete', fr: 'Supprimer', ar: 'حذف' },
  alert_delete_msg: { en: 'Do you really want to delete this pending report?', fr: 'Voulez-vous vraiment supprimer ce signalement en attente ?', ar: 'هل تريد حقًا حذف هذا التبليغ المعلق؟' },
  alert_delete_all_title: { en: 'Delete All', fr: 'Tout supprimer', ar: 'حذف الكل' },
  alert_delete_all_msg: { en: 'Do you really want to delete all pending reports?', fr: 'Voulez-vous vraiment supprimer tous les signalements en attente ?', ar: 'هل تريد حقًا حذف جميع التبليغات المعلقة؟' },
  alert_delete_selected_title: { en: 'Delete Selected', fr: 'Supprimer la sélection', ar: 'حذف المحدد' },
  alert_delete_selected_msg: { en: 'Do you really want to delete selected reports?', fr: 'Voulez-vous vraiment supprimer les signalements sélectionnés ?', ar: 'هل تريد حقًا حذف التبليغات المحددة؟' },
  snackbar_no_reports: { en: 'No reports to sync', fr: 'Aucun signalement à synchroniser', ar: 'لا توجد تبليغات للمزامنة' },
  snackbar_synced: { en: 'reports synced', fr: 'signalements synchronisés', ar: 'تبليغ(ات) تمت مزامنتها' },
  snackbar_failed: { en: 'failures', fr: 'echecs', ar: 'فشل' },
  snackbar_sync_error: { en: 'Sync Error', fr: 'Erreur de synchronisation', ar: 'خطأ في المزامنة' },
  deleted_msg: { en: 'Report deleted', fr: 'Signalement supprimé', ar: 'تم حذف التبليغ' },
  deleted_selected_msg: { en: 'Selected reports deleted', fr: 'Signalements sélectionnés supprimés', ar: 'تم حذف التبليغات المحددة' },
  cleared_msg: { en: 'Queue cleared', fr: 'File d\'attente vidée', ar: 'تم إفراغ قائمة الانتظار' },
  cancel: { en: 'Cancel', fr: 'Annuler', ar: 'إلغاء' },
  time_now: { en: 'Now', fr: 'Maintenant', ar: 'الآن' },
  time_min: { en: 'm ago', fr: 'min', ar: 'ذ' }, // Simplified for template literal usage
  time_hour: { en: 'h ago', fr: 'h', ar: 'س' },
  report_default: { en: 'Report', fr: 'Signalement', ar: 'تبليغ' },
};

const SyncQueueSheet = (props: SheetProps) => {
  const { queue, removeFromQueue, clearQueue } = useOfflineQueueStore();
  const { syncBulkQueuedReports } = useHazards();
  const { showSnackbar } = useUI();
  const { mapRef, setRegion } = useLocation();
  const [syncing, setSyncing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const { t, isRTL, language } = useTrans(TRANSLATIONS);

  // Use styles with RTL support
  const styles = useMemo(() => makeStyles(isRTL), [isRTL]);

  const toggleSelection = (id: string) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  /* ------------------- Handlers ------------------- */
  const handleSyncAll = async () => {
    if (queue.length === 0) {
      showSnackbar(t('snackbar_no_reports'), "Info");
      return;
    }

    setSyncing(true);

    try {
      // Bulk sync all reports in one API call
      const result = await syncBulkQueuedReports(queue);

      // Clear successfully synced items
      if (result.success > 0) {
        await clearQueue();
        showSnackbar(`${result.success} ${t('snackbar_synced')}`, 'OK');
      }

      if (result.failed > 0) {
        showSnackbar(`${result.failed} ${t('snackbar_failed')}`, 'Error');
      }

      // Close sheet if all items synced successfully
      if (result.failed === 0) {
        SheetManager.hide('sync-queue-sheet');
      }
    } catch (error) {
      console.error('Bulk sync failed:', error);
      showSnackbar(t('snackbar_sync_error'), 'Error');
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

    if (minutes < 1) return t('time_now');

    if (language === 'ar') {
      if (minutes < 60) return `منذ ${minutes} د`;
      if (hours < 24) return `منذ ${hours} س`;
    } else if (language === 'fr') {
      if (minutes < 60) return `il y a ${minutes} min`;
      if (hours < 24) return `il y a ${hours} h`;
    } else {
      if (minutes < 60) return `${minutes} m ago`;
      if (hours < 24) return `${hours} h ago`;
    }

    return date.toLocaleDateString(language === 'ar' ? 'ar-DZ' : (language === 'fr' ? 'fr-FR' : 'en-US'), { day: 'numeric', month: 'short' });
  };

  const handleDeleteOne = (id: string) => {
    Alert.alert(
      t('alert_delete_title'),
      t('alert_delete_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            removeFromQueue(id);
            showSnackbar(t('deleted_msg'), 'OK');
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
      t('alert_delete_selected_title'),
      t('alert_delete_selected_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete'),
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach((id) => removeFromQueue(id));
            setSelectedIds(new Set());
            showSnackbar(t('deleted_selected_msg'), 'OK');

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
      t('alert_delete_all_title'),
      t('alert_delete_all_msg'),
      [
        { text: t('cancel'), style: 'cancel' },
        {
          text: t('delete_all'),
          style: 'destructive',
          onPress: async () => {
            await clearQueue();
            setSelectedIds(new Set());
            showSnackbar(t('cleared_msg'), 'OK');
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
          <Text style={styles.title}>{t('sheet_title')}</Text>
          <View style={styles.headerControls}>
            <Text style={styles.subtitle}>
              {queue.length} {t('subtitle')}
            </Text>
            {selectedIds.size > 0 ? (
              <TouchableOpacity
                style={[styles.buttonSecondary, styles.miniButton]}
                onPress={handleDeleteSelected}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, styles.dangerText]}>
                  {t('delete')} ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.buttonSecondary, styles.miniButton]}
                onPress={handleDeleteAll}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, styles.dangerText]}>{t('delete_all')}</Text>
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
                <TouchableOpacity
                  style={styles.deleteButton}
                  onPress={() => handleDeleteOne(report.id)}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <TrashIcon size={18} color="#FF3B30" />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.reportItem}
                  onPress={() => {
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
                      {report.categoryLabel || t('report_default')}
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
            <Text style={styles.buttonTextSecondary}>{t('later')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, syncing && styles.buttonDisabled]}
            onPress={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonTextPrimary}>{t('sync')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ActionSheet>
  );
};

const makeStyles = (isRTL: boolean) => StyleSheet.create({
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
    textAlign: isRTL ? 'right' : 'left',
  },
  headerControls: {
    flexDirection: isRTL ? 'row-reverse' : 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 16
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: isRTL ? 'right' : 'left',
  },
  list: {
    maxHeight: 300,
    marginBottom: 20,
  },
  reportItem: {
    flex: 1,
    padding: 16,
    flexDirection: isRTL ? 'row-reverse' : 'row',
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
    textAlign: isRTL ? 'right' : 'left',
  },
  reportTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textAlign: isRTL ? 'right' : 'left',
  },
  reportNote: {
    fontSize: 14,
    color: '#AEAEB2',
    fontStyle: 'italic',
    textAlign: isRTL ? 'right' : 'left',
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
    flexDirection: isRTL ? 'row-reverse' : 'row',
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
  miniButton: {
    borderColor: '#FF3B30',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100
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
  dangerText: {
    color: '#FF3B30',
    fontSize: 12
  },
  reportItemContainer: {
    backgroundColor: '#2C2C2E',
    borderRadius: 12,
    marginBottom: 12,
    flexDirection: isRTL ? 'row-reverse' : 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  deleteButton: {
    padding: 8,
    marginRight: 8,
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
