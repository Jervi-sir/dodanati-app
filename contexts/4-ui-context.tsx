import React, { createContext, useContext, useRef, useState } from 'react';
import { ActionSheetRef } from 'react-native-actions-sheet';

export type SnackbarState = {
  visible: boolean;
  message: string;
  ctaLabel?: string;
} | null;

type UIContextType = {
  snackbar: SnackbarState;
  showSnackbar: (message: string, ctaLabel?: string) => void;
  hideSnackbar: () => void;

  hazardReportActionSheetRef: React.RefObject<ActionSheetRef | null>;
  openReportSheet: () => void;
  closeReportSheet: () => void;

  hazardSheetRef: React.RefObject<ActionSheetRef | null>;
  openHazardSheet: () => void;
  closeHazardSheet: () => void;

  paramsSheetRef: React.RefObject<ActionSheetRef | null>;
  openParamsSheet: () => void;
  closeParamsSheet: () => void;

  historySheetRef: React.RefObject<ActionSheetRef | null>;
  openHistorySheet: () => void;
  closeHistorySheet: () => void;
};

const UIContext = createContext<UIContextType | undefined>(undefined);

export const useUI = () => {
  const ctx = useContext(UIContext);
  if (!ctx) throw new Error('useUI must be used within <UIProvider>');
  return ctx;
};

export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [snackbar, setSnackbar] = useState<SnackbarState>(null);
  const snackbarTimeoutRef = useRef<any>(null);

  const showSnackbar = (message: string, ctaLabel?: string) => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbar({ visible: true, message, ctaLabel });
    snackbarTimeoutRef.current = setTimeout(() => {
      setSnackbar((prev) => (prev ? { ...prev, visible: false } : prev));
    }, 4000);
  };

  const hideSnackbar = () => {
    if (snackbarTimeoutRef.current) clearTimeout(snackbarTimeoutRef.current);
    setSnackbar((prev) => (prev ? { ...prev, visible: false } : prev));
  };

  const hazardReportActionSheetRef = useRef<ActionSheetRef>(null);
  const openReportSheet = () => hazardReportActionSheetRef.current?.show();
  const closeReportSheet = () => hazardReportActionSheetRef.current?.hide();

  const hazardSheetRef = useRef<ActionSheetRef>(null);
  const openHazardSheet = () => hazardSheetRef.current?.show();
  const closeHazardSheet = () => hazardSheetRef.current?.hide();

  const paramsSheetRef = useRef<ActionSheetRef>(null);
  const openParamsSheet = () => paramsSheetRef.current?.show();
  const closeParamsSheet = () => paramsSheetRef.current?.hide();

  const historySheetRef = useRef<ActionSheetRef>(null);
  const openHistorySheet = () => historySheetRef.current?.show();
  const closeHistorySheet = () => historySheetRef.current?.hide();

  return (
    <UIContext.Provider
      value={{
        snackbar,
        showSnackbar,
        hideSnackbar,
        hazardReportActionSheetRef,
        openReportSheet,
        closeReportSheet,
        hazardSheetRef,
        openHazardSheet,
        closeHazardSheet,
        paramsSheetRef,
        openParamsSheet,
        closeParamsSheet,
        historySheetRef,
        openHistorySheet,
        closeHistorySheet,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
