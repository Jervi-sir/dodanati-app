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

  /* ------------------- Handlers ------------------- */
  const handleSyncAll = async () => {
    if (queue.length === 0) {
      showSnackbar('لا توجد تبليغات للمزامنة', 'معلومة');
      return;
    }

    setSyncing(true);

    try {
      // Bulk sync all reports in one API call
      const result = await syncBulkQueuedReports(queue);

      // Clear successfully synced items
      if (result.success > 0) {
        await clearQueue();
        showSnackbar(`تمت مزامنة ${result.success} تبليغ(ات)`, 'حسنا');
      }

      if (result.failed > 0) {
        showSnackbar(`${result.failed} فشل`, 'خطأ');
      }

      // Close sheet if all items synced successfully
      if (result.failed === 0) {
        SheetManager.hide('sync-queue-sheet');
      }
    } catch (error) {
      console.error('Bulk sync failed:', error);
      showSnackbar('خطأ في المزامنة', 'خطأ');
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

    if (minutes < 1) return 'الآن';
    if (minutes < 60) return `منذ ${minutes} د`;
    if (hours < 24) return `منذ ${hours} س`;
    return date.toLocaleDateString('ar-DZ', { day: 'numeric', month: 'short' });
  };

  const handleDeleteOne = (id: string) => {
    Alert.alert(
      'حذف',
      'هل تريد حقًا حذف هذا التبليغ المعلق؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            removeFromQueue(id);
            showSnackbar('تم حذف التبليغ', 'حسنا');
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
      'حذف المحدد',
      `هل تريد حقًا حذف ${selectedIds.size} تبليغ(ات)؟`,
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف',
          style: 'destructive',
          onPress: () => {
            selectedIds.forEach((id) => removeFromQueue(id));
            setSelectedIds(new Set());
            showSnackbar(`تم حذف ${selectedIds.size} تبليغ(ات)`, 'حسنا');

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
      'حذف الكل',
      'هل تريد حقًا حذف جميع التبليغات المعلقة؟',
      [
        { text: 'إلغاء', style: 'cancel' },
        {
          text: 'حذف الكل',
          style: 'destructive',
          onPress: async () => {
            await clearQueue();
            setSelectedIds(new Set());
            showSnackbar('تم إفراغ قائمة الانتظار', 'حسنا');
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
          <Text style={styles.title}>تبليغات في الانتظار</Text>
          <View style={{ flexDirection: 'row-reverse', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
            <Text style={styles.subtitle}>
              {queue.length} تبليغ(ات) للمزامنة
            </Text>
            {selectedIds.size > 0 ? (
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }]}
                onPress={handleDeleteSelected}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, { color: '#FF3B30', fontSize: 12 }]}>
                  حذف ({selectedIds.size})
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.buttonSecondary, { borderColor: '#FF3B30', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 100 }]}
                onPress={handleDeleteAll}
                disabled={syncing}
              >
                <Text style={[styles.buttonTextSecondary, { color: '#FF3B30', fontSize: 12 }]}>حذف الكل</Text>
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
                      {report.categoryLabel || 'تبليغ'}
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
            <Text style={styles.buttonTextSecondary}>لاحقاً</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.button, styles.buttonPrimary, syncing && styles.buttonDisabled]}
            onPress={handleSyncAll}
            disabled={syncing}
          >
            {syncing ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonTextPrimary}>مزامنة</Text>
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
    textAlign: 'right',
  },
  subtitle: {
    fontSize: 14,
    color: '#8E8E93',
    textAlign: 'right',
  },
  list: {
    maxHeight: 300,
    marginBottom: 20,
  },
  reportItem: {
    flex: 1,
    padding: 16,
    flexDirection: 'row-reverse',
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
    textAlign: 'right',
  },
  reportTime: {
    fontSize: 12,
    color: '#8E8E93',
    marginBottom: 4,
    textAlign: 'right',
  },
  reportNote: {
    fontSize: 14,
    color: '#AEAEB2',
    fontStyle: 'italic',
    textAlign: 'right',
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
    flexDirection: 'row-reverse',
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
    flexDirection: 'row-reverse',
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
