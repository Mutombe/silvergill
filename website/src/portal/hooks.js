import { useCallback, useEffect, useState, useSyncExternalStore } from 'react';
import * as db from './data/db';
import { isOnline, pendingCount } from './data/bcClient';

/* `db.read` clones on every call, so a raw getSnapshot would return a new
   reference each render and spin useSyncExternalStore forever. Cache the
   snapshot per collection and drop the cache whenever the store changes. */
const snapshots = new Map();
db.subscribe(() => snapshots.clear());

function snapshot(name) {
  if (!snapshots.has(name)) snapshots.set(name, db.read(name));
  return snapshots.get(name);
}

/** Reactive read of a collection — re-renders whenever the store changes. */
export function useCollection(name) {
  return useSyncExternalStore(
    db.subscribe,
    useCallback(() => snapshot(name), [name])
  );
}

/** Live connectivity, driving the field app's offline banner. */
export function useOnlineStatus() {
  const [online, setOnline] = useState(isOnline);

  useEffect(() => {
    const up = () => setOnline(true);
    const down = () => setOnline(false);
    window.addEventListener('online', up);
    window.addEventListener('offline', down);
    return () => {
      window.removeEventListener('online', up);
      window.removeEventListener('offline', down);
    };
  }, []);

  return online;
}

/** Number of records still waiting to reach Business Central. */
export function usePendingSync() {
  // A number is compared by value, so no snapshot cache is needed here.
  return useSyncExternalStore(db.subscribe, pendingCount);
}

/** Lookup helper: build an id → record accessor for a collection. */
export function useLookup(name) {
  const rows = useCollection(name);
  return useCallback((id) => rows.find((r) => r.id === id) || null, [rows]);
}
