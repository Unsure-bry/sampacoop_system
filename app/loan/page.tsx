'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { useRouter } from 'next/navigation';
import { firestore, db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';
import { LoanPlan } from '@/lib/types/loan';
import { ActiveLoans, LoanActions, LoanRecords } from '@/components';
import { collection, query, where, onSnapshot } from 'firebase/firestore';

export default function LoanPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [loanPlans, setLoanPlans] = useState<LoanPlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(true);
  const [hasActiveLoan, setHasActiveLoan] = useState(false);
  const [activeLoanCheckLoading, setActiveLoanCheckLoading] = useState(true);

  // Remove the redirect effect - middleware handles authentication
  // useEffect(() => {
  //   if (!loading && !user) {
  //     router.push('/login');
  //   }
  // }, [user, loading, router]);

  useEffect(() => {
    if (user && !loading) {
      fetchLoanPlans();
    }
  }, [user, loading]);

  // Real-time listener for active loans
  useEffect(() => {
    if (!user?.uid || !db) {
      setActiveLoanCheckLoading(false);
      return;
    }

    setActiveLoanCheckLoading(true);

    // Set up real-time listener for active loans
    const loansQuery = query(
      collection(db, 'loans'),
      where('userId', '==', user.uid),
      where('status', '==', 'active')
    );

    const unsubscribe = onSnapshot(loansQuery, (snapshot) => {
      const hasActive = !snapshot.empty;
      setHasActiveLoan(hasActive);
      setActiveLoanCheckLoading(false);
    }, (error) => {
      console.error('Error listening to active loans:', error);
      setHasActiveLoan(false);
      setActiveLoanCheckLoading(false);
    });

    // Clean up listener on unmount
    return () => unsubscribe();
  }, [user]);

  const fetchLoanPlans = async () => {
    try {
      setPlansLoading(true);
      
      // Check if Firestore is initialized
      if (!firestore) {
        throw new Error('Firestore not initialized');
      }
      
      const result = await firestore.getCollection('loanPlans');
      
      if (result.success && result.data) {
        if (result.data.length === 0) {
          // Create sample loan plans if none exist
          await createSampleLoanPlans();
          // Fetch again after creating sample plans
          const newResult = await firestore.getCollection('loanPlans');
          if (newResult.success && newResult.data) {
            const plansData = newResult.data.map((doc: any) => ({
              id: doc.id,
              ...doc
            }));
            setLoanPlans(plansData);
          }
        } else {
          const plansData = result.data.map((doc: any) => ({
            id: doc.id,
            ...doc
          }));
          setLoanPlans(plansData);
        }
      } else {
        console.error('Failed to load loan plans:', result.error);
        toast.error('Failed to load loan plans. Please try again later.');
      }
    } catch (error: any) {
      console.error('Error fetching loan plans:', error);
      toast.error(`Failed to load loan plans: ${error.message || 'Unknown error'}`);
    } finally {
      setPlansLoading(false);
    }
  };

  const createSampleLoanPlans = async () => {
    try {
     
      const samplePlans = [
        {
          name: 'Regular Loan',
          description: 'Flexible loans for personal needs with competitive rates',
          maxAmount: 5000,
          interestRate: 3,
          termOptions: [1, 2],
        },
        {
          name: 'Emergency Loan',
          description: 'Quick access to funds for unexpected expenses',
          maxAmount: 3000,
          interestRate: 3,
          termOptions: [1, 2],
        }
      ];

      // Create each sample plan
      for (const plan of samplePlans) {
        await firestore.setDocument(
          'loanPlans',
          plan.name.toLowerCase().replace(/\s+/g, '-'),
          plan
        );
      }
      
      toast.success('Sample loan plans created successfully!');
    } catch (error) {
      console.error('Error creating sample loan plans:', error);
      toast.error('Failed to create sample loan plans');
    }
  };

  const handleLoanApplied = () => {
    // Refresh loan plans or show success message
    toast.success('Loan application submitted successfully!');
    // Active loan status is now automatically updated via real-time listener
  };

  if (loading || activeLoanCheckLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-red-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Loan Services</h1>
      
      {/* Use the new LoanActions component */}
      <LoanActions 
        loanPlans={loanPlans} 
        onLoanApplied={handleLoanApplied}
        hasActiveLoan={hasActiveLoan}
      />
      
      <div className="mt-8">
        <ActiveLoans />
      </div>
      
      <div className="mt-8">
        <LoanRecords />
      </div>
    </div>
  );
}