// useEmails — loads incoming emails from the existing GET /api/emails endpoint.
// Keeps the list fresh (polling + the global "mailsense:refresh" event) and
// never renders the same record twice.

import { useCallback, useEffect, useRef, useState } from 'react';
import { fetchEmails } from './emailApi';

export default function useEmails({ limit = 100, pollMs = 15000 } = {}) {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [updatedAt, setUpdatedAt] = useState(null);
  const inFlight = useRef(false);

  const load = useCallback(
    async ({ silent = false } = {}) => {
      // Skip overlapping requests so a slow response can never overwrite a newer one.
      if (inFlight.current) return;
      inFlight.current = true;

      if (silent) setRefreshing(true);
      else setLoading(true);

      try {
        const list = await fetchEmails({ limit });
        setEmails(list);
        setError(null);
        setUpdatedAt(new Date());
      } catch (err) {
        setError(
          err?.response?.data?.error ||
            err?.response?.data?.message ||
            err?.message ||
            'Failed to load emails'
        );
      } finally {
        inFlight.current = false;
        setLoading(false);
        setRefreshing(false);
      }
    },
    [limit]
  );

  useEffect(() => {
    load();

    const onRefresh = () => load({ silent: true });
    window.addEventListener('mailsense:refresh', onRefresh);

    const timer = pollMs ? setInterval(() => load({ silent: true }), pollMs) : null;

    return () => {
      window.removeEventListener('mailsense:refresh', onRefresh);
      if (timer) clearInterval(timer);
    };
  }, [load, pollMs]);

  return {
    emails,
    loading,
    refreshing,
    error,
    updatedAt,
    reload: load,
    refresh: () => load({ silent: true }),
  };
}
