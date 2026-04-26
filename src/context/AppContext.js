import { React, html } from '../vendor.js';

const { createContext, useCallback, useContext, useMemo, useState } = React;

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [view, setView] = useState('dashboard');
  const [currentRecord, setCurrentRecord] = useState(null);
  const [signedOff, setSignedOff] = useState(() => new Set());

  const openRecord = useCallback((record) => {
    setCurrentRecord(record);
    setView('review');
  }, []);

  const closeRecord = useCallback(() => {
    setCurrentRecord(null);
    setView('dashboard');
  }, []);

  const relabel = useCallback((labelIndex, newType) => {
    setCurrentRecord((rec) => {
      if (!rec) return rec;
      const labels = rec.labels.map((l, i) =>
        i === labelIndex ? { ...l, type: newType } : l,
      );
      const next = { ...rec, labels };
      console.log('[relabel]', { id: rec.id, labelIndex, newType });
      return next;
    });
  }, []);

  const completeSignOff = useCallback((payload) => {
    console.log('[sign-off submitted]', payload);
    setSignedOff((s) => new Set(s).add(payload.recordId));
    setCurrentRecord(null);
    setView('dashboard');
  }, []);

  const value = useMemo(
    () => ({
      view,
      currentRecord,
      signedOff,
      openRecord,
      closeRecord,
      relabel,
      completeSignOff,
    }),
    [view, currentRecord, signedOff, openRecord, closeRecord, relabel, completeSignOff],
  );

  return html`<${AppContext.Provider} value=${value}>${children}<//>`;
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within <AppProvider>');
  return ctx;
}
