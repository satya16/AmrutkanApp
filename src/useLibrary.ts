import { useEffect, useState } from 'react';
import { fetchLibrary } from './api';
import { cacheLibrary, loadCachedLibrary } from './storage';
import type { Library } from './types';

type LibraryState = {
  library: Library | null;
  loading: boolean;
  error: string | null;
  isOffline: boolean;
};

// Loads the library once for the whole app (Home/Book/Chapter screens all
// read from this instead of each re-fetching /api/library) and falls back to
// the last cached copy when the network fetch fails, so browsing (though not
// streaming/downloading new episodes) still works offline.
export function useLibrary(): LibraryState {
  const [state, setState] = useState<LibraryState>({
    library: null,
    loading: true,
    error: null,
    isOffline: false,
  });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const cached = await loadCachedLibrary();
      if (cached && !cancelled) {
        setState({ library: cached, loading: false, error: null, isOffline: false });
      }
      try {
        const fresh = await fetchLibrary();
        if (cancelled) return;
        await cacheLibrary(fresh);
        setState({ library: fresh, loading: false, error: null, isOffline: false });
      } catch (err) {
        if (cancelled) return;
        if (cached) {
          setState({ library: cached, loading: false, error: null, isOffline: true });
        } else {
          setState({
            library: null,
            loading: false,
            error: err instanceof Error ? err.message : String(err),
            isOffline: false,
          });
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
