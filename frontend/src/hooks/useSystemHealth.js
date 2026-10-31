import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchHealth, fetchReadiness } from '../api/health.api.js';

const initialState = {
  apiStatus: 'checking',
  databaseStatus: 'checking',
  lastCheckedAt: null,
  apiDetails: null,
  databaseDetails: null,
  error: null,
};

export default function useSystemHealth() {
  const [status, setStatus] = useState(initialState);
  const requestId = useRef(0);

  const loadHealth = useCallback(async (signal) => {
    const currentRequestId = ++requestId.current;

    const [healthResult, readinessResult] = await Promise.allSettled([
      fetchHealth({ signal }),
      fetchReadiness({ signal }),
    ]);

    if (signal?.aborted || currentRequestId !== requestId.current) {
      return;
    }

    const apiIsUp = healthResult.status === 'fulfilled';
    let databaseStatus = 'unknown';
    let databaseDetails = null;
    let error = null;

    if (apiIsUp) {
      const readinessIsUp = readinessResult.status === 'fulfilled';
      databaseStatus = readinessIsUp ? 'up' : 'down';
      databaseDetails = readinessIsUp
        ? readinessResult.value?.data?.checks?.database ?? null
        : readinessResult.reason?.checks?.database ?? null;

      if (!readinessIsUp) {
        error =
          readinessResult.reason?.message ??
          'The database readiness check failed.';
      }
    } else {
      error =
        healthResult.reason?.message ??
        'The API health check could not be completed.';
    }

    setStatus({
      apiStatus: apiIsUp ? 'up' : 'down',
      databaseStatus,
      lastCheckedAt: new Date().toISOString(),
      apiDetails: apiIsUp ? healthResult.value?.data ?? null : null,
      databaseDetails,
      error,
    });
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void loadHealth(controller.signal);

    return () => controller.abort();
  }, [loadHealth]);

  const refresh = useCallback(() => {
    setStatus((previousStatus) => ({
      ...previousStatus,
      apiStatus: 'checking',
      databaseStatus: 'checking',
      error: null,
    }));

    return loadHealth();
  }, [loadHealth]);

  return {
    ...status,
    refresh,
  };
}
