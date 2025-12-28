// src/components/map/HazardHistorySheet.tsx
import React, { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import ActionSheet, { FlatList, SheetProps } from 'react-native-actions-sheet';

import api from '@/utils/api/axios-instance';
import { ApiRoutes, buildRoute } from '@/utils/api/api';
import { RoadHazard } from '@/contexts/5-hazard-context';
import { AppTheme, useTheme } from '@/contexts/1-theme-context';
import { SheetManager } from 'react-native-actions-sheet';

export type HazardHistoryItem = {
  id: number;
  hazard_id: number | null;
  category?: {
    id: number;
    slug: string;
    name_en?: string;
    name_fr?: string;
    name_ar?: string;
    icon?: string | null;
  } | null;
  severity: number;
  note?: string | null;
  lat: number;
  lng: number;
  created_at?: string | null;
  hazard?: RoadHazard | null;
};

type Payload = {
  onPressItem?: (item: HazardHistoryItem) => void;
};

export const HazardHistorySheet: React.FC<SheetProps> = (props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);

  const payload = props.payload as Payload | undefined;
  const onPressItem = payload?.onPressItem;

  const [items, setItems] = useState<HazardHistoryItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [page, setPage] = useState(1);
  const [nextPage, setNextPage] = useState<number | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const fetchPage = useCallback(
    async (pageToLoad: number, opts?: { replace?: boolean }) => {
      if (loading || loadingMore || refreshing) return;

      pageToLoad === 1 ? setLoading(true) : setLoadingMore(true);

      try {
        const res = await api.get(buildRoute(ApiRoutes.hazards.history), {
          params: { page: pageToLoad },
        });

        const data: HazardHistoryItem[] = res?.data?.data ?? [];
        const meta = res?.data?.meta ?? {};

        setItems((prev) =>
          pageToLoad === 1 || opts?.replace ? data : [...prev, ...data]
        );
        setPage(pageToLoad);
        setNextPage(meta.next_page ?? null);
      } catch (err) {
        console.error('History fetch error', err);
      } finally {
        setLoading(false);
        setLoadingMore(false);
        setRefreshing(false);
      }
    },
    [loading, loadingMore, refreshing]
  );

  // ✅ registerable: ActionSheet calls this automatically
  const handleOnOpen = () => {
    if (!items.length) fetchPage(1);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPage(1, { replace: true });
  };

  const handleLoadMore = () => {
    if (!nextPage) return;
    fetchPage(nextPage);
  };

  const renderItem = ({ item }: { item: HazardHistoryItem }) => {
    const title =
      item.category?.name_fr ||
      item.category?.name_en ||
      item.category?.slug ||
      'Danger';

    const createdAt = item.created_at?.slice(0, 16).replace('T', ' ') ?? '';

    const isSelected = selectedId === item.id;

    return (
      <TouchableOpacity
        style={[
          styles.row,
          isSelected && {
            backgroundColor: theme.colors.accentSoft,
            borderColor: theme.colors.accent,
            borderWidth: 1
          }
        ]}
        activeOpacity={0.8}
        onPress={() => {
          setSelectedId(item.id);
          onPressItem?.(item);
        }}
      >
        <View style={styles.rowLeft}>
          <View
            style={[
              styles.severityDot,
              { opacity: 0.4 + item.severity * 0.1 },
            ]}
          />
          <View style={{ flex: 1 }}>
            <Text style={styles.rowTitle} numberOfLines={1}>
              {title}
            </Text>
            {!!item.note && (
              <Text style={styles.rowNote} numberOfLines={1}>
                {item.note}
              </Text>
            )}
            <Text style={styles.rowMeta} numberOfLines={1}>
              Sévérité {item.severity} • {createdAt}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const keyExtractor = (item: HazardHistoryItem, index: number) => String(index);

  return (
    <ActionSheet
      id={props.sheetId}
      gestureEnabled
      containerStyle={styles.sheetContainer}
      indicatorStyle={styles.sheetIndicator}
      onOpen={handleOnOpen}
      onClose={() => setSelectedId(null)}
      safeAreaInsets={{ top: Dimensions.get('window').height * 0.55, left: 0, right: 0, bottom: 0 }}
    >
      <View style={styles.sheetHeader}>
        <Text style={styles.sheetTitle}>Mes signalements</Text>
        <Text style={styles.sheetSubtitle}>
          Historique des dangers envoyés avec cet appareil
        </Text>
      </View>

      {loading && !items.length ? (
        <View style={styles.loaderWrapper}>
          <ActivityIndicator />
          <Text style={styles.loaderText}>Chargement…</Text>
        </View>
      ) : items.length === 0 ? (
        <View style={styles.emptyWrapper}>
          <Text style={styles.emptyTitle}>Aucun signalement pour l’instant</Text>
          <Text style={styles.emptySubtitle}>
            Utilisez “Signaler un danger” pour ajouter votre premier point.
          </Text>

          {/* optional close button */}
          <TouchableOpacity
            style={{ marginTop: 12, alignSelf: 'flex-start' }}
            onPress={() => SheetManager.hide(props.sheetId)}
            activeOpacity={0.8}
          >
            <Text style={{ color: theme.colors.textMuted }}>Fermer</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={keyExtractor}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          onEndReachedThreshold={0.3}
          onEndReached={handleLoadMore}
          ListFooterComponent={
            loadingMore ? (
              <View style={styles.footerLoader}>
                <ActivityIndicator size="small" />
              </View>
            ) : (
              <View style={{ height: 230 }} />
            )
          }
        />
      )}
    </ActionSheet>
  );
};

const makeStyles = (theme: AppTheme) =>
  StyleSheet.create({
    sheetContainer: {
      paddingBottom: 8,
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
    },
    sheetSubtitle: {
      marginTop: 4,
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    loaderWrapper: {
      paddingVertical: 20,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    loaderText: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    emptyWrapper: {
      paddingHorizontal: 16,
      paddingVertical: 20,
    },
    emptyTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
      marginBottom: 4,
    },
    emptySubtitle: {
      fontSize: 12,
      color: theme.colors.textMuted,
    },

    listContent: {
      paddingHorizontal: 16,
      paddingBottom: 10,
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 12,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.colors.card,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      flex: 1,
    },
    severityDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
      backgroundColor: theme.colors.danger,
    },
    rowTitle: {
      fontSize: 14,
      fontWeight: '500',
      color: theme.colors.text,
    },
    rowNote: {
      fontSize: 12,
      color: theme.colors.text,
      marginTop: 2,
    },
    rowMeta: {
      fontSize: 11,
      color: theme.colors.textMuted,
      marginTop: 2,
    },
    footerLoader: {
      paddingVertical: 10,
      alignItems: 'center',
    },
  });
