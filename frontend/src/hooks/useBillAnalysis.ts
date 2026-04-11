import { useState, useEffect, useRef } from 'react';
import { billsApi } from '../api/bills';
import type { Bill } from '../types/bill.types';

const POLL_INTERVAL_MS = 3000;
const MAX_POLLS = 40; // 2 minutes max

export function useBillAnalysis(billId: string | null) {
  const [bill, setBill] = useState<Bill | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pollCount = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopPolling = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setIsPolling(false);
  };

  const fetchBill = async () => {
    if (!billId) return;
    try {
      const res = await billsApi.getBillAnalysis(billId);
      const data = res.data.data;
      setBill(data);

      if (data.status === 'completed' || data.status === 'failed') {
        stopPolling();
      } else if (pollCount.current < MAX_POLLS) {
        pollCount.current += 1;
        timerRef.current = setTimeout(fetchBill, POLL_INTERVAL_MS);
      } else {
        stopPolling();
        setError('Processing is taking longer than expected. Please refresh.');
      }
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to fetch analysis.');
      stopPolling();
    }
  };

  useEffect(() => {
    if (!billId) return;
    pollCount.current = 0;
    setIsPolling(true);
    fetchBill();
    return stopPolling;
  }, [billId]);

  return { bill, isPolling, error };
}
