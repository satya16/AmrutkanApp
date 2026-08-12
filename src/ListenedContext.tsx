import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { loadListenedMap, saveListenedMap, type ListenedMap } from './storage';

type ListenedContextValue = {
  isListened: (filename: string) => boolean;
  markListened: (filename: string) => void;
  // Raw map, for callers that need to reason about the whole set at once
  // (e.g. the Continue Listening widget finding the first unlistened
  // episode across the library) rather than checking one filename at a
  // time via isListened.
  listenedMap: ListenedMap;
};

const ListenedContext = createContext<ListenedContextValue | null>(null);

export function ListenedProvider({ children }: { children: React.ReactNode }) {
  const [listened, setListened] = useState<ListenedMap>({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    loadListenedMap().then(map => {
      setListened(map);
      setLoaded(true);
    });
  }, []);

  const markListened = useCallback((filename: string) => {
    setListened(prev => {
      if (prev[filename]) return prev;
      const next = { ...prev, [filename]: true as const };
      saveListenedMap(next);
      return next;
    });
  }, []);

  const isListened = useCallback((filename: string) => !!listened[filename], [listened]);

  const value = useMemo<ListenedContextValue>(
    () => ({ isListened, markListened, listenedMap: listened }),
    [isListened, markListened, listened],
  );

  if (!loaded) return null;

  return <ListenedContext.Provider value={value}>{children}</ListenedContext.Provider>;
}

export function useListened(): ListenedContextValue {
  const ctx = useContext(ListenedContext);
  if (!ctx) throw new Error('useListened must be used within ListenedProvider');
  return ctx;
}
