import { useCallback, useEffect, useRef, useState } from 'react';

export default function useAsync(loader, dependencies = [], { immediate = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate);
  const [error, setError] = useState(null);
  const loaderRef = useRef(loader);
  const requestId = useRef(0);

  useEffect(() => {
    loaderRef.current = loader;
  });

  const run = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);

    try {
      const result = await loaderRef.current();
      if (id === requestId.current) {
        setData(result);
        setLoading(false);
      }
      return result;
    } catch (requestError) {
      if (id === requestId.current) {
        setError(requestError);
        setLoading(false);
      }
      return null;
    }
  }, []);

  useEffect(() => {
    if (!immediate) {
      return undefined;
    }

    // eslint-disable-next-line react-hooks/set-state-in-effect
    void run();

    return () => {
      requestId.current += 1;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, dependencies);

  return { data, setData, loading, error, reload: run, setError };
}
