import React, { createContext, useContext, useRef, useState } from 'react';

type SnackbarState = {
  visible: boolean;
  message: string;
  ctaLabel?: string;
} | null;

type UIContextType = {
  snackbar: SnackbarState;
  showSnackbar: (message: string, ctaLabel?: string) => void;
  hideSnackbar: () => void;

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

  return (
    <UIContext.Provider
      value={{
        snackbar,
        showSnackbar,
        hideSnackbar,
      }}
    >
      {children}
    </UIContext.Provider>
  );
};
