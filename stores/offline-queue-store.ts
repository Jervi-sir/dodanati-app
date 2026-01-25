import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const QUEUE_STORAGE_KEY = 'offline_hazard_queue_v1';

export type QueuedHazardReport = {
  id: string; // Unique temp ID for the queued item
  device_uuid: string;
  road_hazard_category_id: number;
  severity: number;
  note?: string;
  lat: number;
  lng: number;
  platform: string;
  app_version: string;
  locale: string;
  queuedAt: number; // Timestamp when queued
  categorySlug?: string; // For display purposes
  categoryLabel?: string; // For display purposes
};

type OfflineQueueState = {
  queue: QueuedHazardReport[];
  isLoading: boolean;

  // Actions
  loadQueue: () => Promise<void>;
  addToQueue: (report: Omit<QueuedHazardReport, 'id' | 'queuedAt' | 'platform' | 'app_version' | 'locale'>) => Promise<void>;
  removeFromQueue: (id: string) => Promise<void>;
  clearQueue: () => Promise<void>;
  getQueueCount: () => number;
};

export const useOfflineQueueStore = create<OfflineQueueState>((set, get) => ({
  queue: [],
  isLoading: false,

  loadQueue: async () => {
    set({ isLoading: true });
    try {
      const stored = await AsyncStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);

        // Filter out expired items (older than 24 hours)
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const validQueue = parsed.filter((item: QueuedHazardReport) => {
          return (now - item.queuedAt) < oneDay;
        });

        set({ queue: validQueue });

        // Update storage if we filtered anything
        if (validQueue.length !== parsed.length) {
          await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(validQueue));
        }
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  addToQueue: async (report) => {
    const newReport: QueuedHazardReport = {
      ...report,
      id: `temp_${Date.now()}_${Math.random()}`,
      queuedAt: Date.now(),
      platform: Platform.OS,
      app_version: '1.0.0',
      locale: 'fr-DZ',
    };

    const newQueue = [...get().queue, newReport];
    set({ queue: newQueue });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
    }
  },

  removeFromQueue: async (id) => {
    const newQueue = get().queue.filter((item) => item.id !== id);
    set({ queue: newQueue });

    try {
      await AsyncStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(newQueue));
    } catch (error) {
      console.error('Failed to update offline queue:', error);
    }
  },

  clearQueue: async () => {
    set({ queue: [] });
    try {
      await AsyncStorage.removeItem(QUEUE_STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear offline queue:', error);
    }
  },

  getQueueCount: () => {
    return get().queue.length;
  },
}));
