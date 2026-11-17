import { useCallback, useEffect, useRef, useState } from 'react';
import { ApiError } from '../api/client';

/**
 * Runs `fetcher` whenever `deps` change. Keeps the previous data visible while a refetch is in flight,
 * and ignores responses that arrive out of order.
 */
export function useFetch<T>(fetcher: () => Promise<T>, deps: unknown[]) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);
  const latest = useRef(0);
  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  useEffect(() => {
    const id = ++latest.current;
    setLoading(true);
    setError(null);
    fetcherRef
      .current()
      .then((result) => id === latest.current && setData(result))
      .catch((err) => id === latest.current && setError(err instanceof ApiError ? err.message : 'Something went wrong.'))
      .finally(() => id === latest.current && setLoading(false));
    return () => {
      latest.current++;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick]);

  const reload = useCallback(() => setTick((t) => t + 1), []);
  return { data, error, loading, reload, setData };
}
