'use client';

import { useState, useEffect, useCallback } from 'react';
import { firestore } from '@/lib/firebase';
import { getMemberIdByUserId } from '@/lib/savingsService';

export interface CapitalShareInfo {
  requiredAmount: number;
  paidAmount: number;
  remainingBalance: number;
  isFullyPaid: boolean;
  status: 'Paid' | 'Partial' | 'Pending';
}

interface UseCapitalShareReturn {
  capitalShare: CapitalShareInfo;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const REQUIRED_CAPITAL_SHARE = 10000;

export function useCapitalShare(userId: string | undefined): UseCapitalShareReturn {
  const [capitalShare, setCapitalShare] = useState<CapitalShareInfo>({
    requiredAmount: REQUIRED_CAPITAL_SHARE,
    paidAmount: 0,
    remainingBalance: REQUIRED_CAPITAL_SHARE,
    isFullyPaid: false,
    status: 'Pending'
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCapitalShareData = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Get member ID
      const memberId = await getMemberIdByUserId(userId);

      if (!memberId) {
        setCapitalShare({
          requiredAmount: REQUIRED_CAPITAL_SHARE,
          paidAmount: 0,
          remainingBalance: REQUIRED_CAPITAL_SHARE,
          isFullyPaid: false,
          status: 'Pending'
        });
        setLoading(false);
        return;
      }

      // Fetch member data to get capital share info
      const memberResult = await firestore.getDocument('members', memberId);

      if (memberResult.success && memberResult.data) {
        const memberData = memberResult.data as any;
        const paymentInfo = memberData.paymentInfo || {};
        const paidAmount = paymentInfo.capitalShare || 0;
        const remainingBalance = Math.max(0, REQUIRED_CAPITAL_SHARE - paidAmount);

        let status: 'Paid' | 'Partial' | 'Pending';
        if (paidAmount >= REQUIRED_CAPITAL_SHARE) {
          status = 'Paid';
        } else if (paidAmount > 0) {
          status = 'Partial';
        } else {
          status = 'Pending';
        }

        setCapitalShare({
          requiredAmount: REQUIRED_CAPITAL_SHARE,
          paidAmount,
          remainingBalance,
          isFullyPaid: paidAmount >= REQUIRED_CAPITAL_SHARE,
          status
        });
      } else {
        setCapitalShare({
          requiredAmount: REQUIRED_CAPITAL_SHARE,
          paidAmount: 0,
          remainingBalance: REQUIRED_CAPITAL_SHARE,
          isFullyPaid: false,
          status: 'Pending'
        });
      }
    } catch (err) {
      console.error('Error fetching capital share data:', err);
      setError('Failed to load capital share information');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCapitalShareData();
  }, [fetchCapitalShareData]);

  return {
    capitalShare,
    loading,
    error,
    refresh: fetchCapitalShareData
  };
}

export default useCapitalShare;
