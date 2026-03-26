/**
 * Custom hook for Firestore data with client-side sorting
 * Avoids the need for composite indexes while maintaining real-time updates
 */

import { useState, useEffect, useCallback } from 'react';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { toast } from 'react-hot-toast';

interface UseFirestoreDataOptions<T> {
  collectionName: string;
  filters?: Array<{ field: string; operator: any; value: any }>;
  sortBy?: keyof T;
  sortOrder?: 'asc' | 'desc';
  fallbackSortBy?: keyof T;
}

export function useFirestoreData<T>(options: UseFirestoreDataOptions<T>) {
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const {
    collectionName,
    filters = [],
    sortBy,
    sortOrder = 'desc',
    fallbackSortBy
  } = options;

  const sortData = useCallback((items: T[]): T[] => {
    if (!sortBy) return items;

    return [...items].sort((a, b) => {
      const aValue = a[sortBy];
      const bValue = b[sortBy];
      
      // Handle null/undefined values
      if (aValue == null && bValue == null) return 0;
      if (aValue == null) return 1;
      if (bValue == null) return -1;

      let comparison = 0;
      
      // Handle dates
      if (aValue instanceof Date || bValue instanceof Date) {
        const aDate = aValue instanceof Date ? aValue : new Date(aValue as any);
        const bDate = bValue instanceof Date ? bValue : new Date(bValue as any);
        comparison = aDate.getTime() - bDate.getTime();
      }
      // Handle strings
      else if (typeof aValue === 'string' && typeof bValue === 'string') {
        comparison = aValue.localeCompare(bValue);
      }
      // Handle numbers
      else {
        comparison = Number(aValue) - Number(bValue);
      }

      return sortOrder === 'desc' ? -comparison : comparison;
    });
  }, [sortBy, sortOrder]);

  useEffect(() => {
    if (!db) {
      setError('Firestore not initialized');
      setLoading(false);
      return;
    }

    try {
      // Build query without orderBy to avoid index requirements
      let firestoreQuery = query(collection(db, collectionName));
      
      // Apply filters
      filters.forEach(({ field, operator, value }) => {
        firestoreQuery = query(firestoreQuery, where(field, operator, value));
      });

      // Set up real-time listener
      const unsubscribe = onSnapshot(
        firestoreQuery,
        (querySnapshot) => {
          try {
            const items: T[] = [];
            querySnapshot.forEach((doc) => {
              const docData = doc.data();
              items.push({
                id: doc.id,
                ...docData
              } as T);
            });

            // Apply client-side sorting
            const sortedItems = sortData(items);
            setData(sortedItems);
            setLoading(false);
            setError(null);
          } catch (err) {
            console.error('Error processing snapshot:', err);
            setError('Error processing data');
            setLoading(false);
          }
        },
        (snapshotError) => {
          console.error('Firestore snapshot error:', snapshotError);
          setError(snapshotError.message || 'Error loading data');
          setLoading(false);
          
          if (snapshotError.code === 'failed-precondition') {
            toast.error('Firestore configuration error. Please contact administrator.');
          } else {
            toast.error('Error loading data from database');
          }
        }
      );

      return () => unsubscribe();
    } catch (err) {
      console.error('Error setting up Firestore listener:', err);
      setError('Failed to initialize data listener');
      setLoading(false);
    }
  }, [collectionName, filters, sortData]);

  // Manual refresh function
  const refresh = useCallback(async () => {
    if (!db) return;
    
    setLoading(true);
    setError(null);
    
    try {
      // This would be where you implement manual refresh if needed
      // For now, the real-time listener handles updates automatically
    } catch (err) {
      console.error('Error refreshing data:', err);
      setError('Failed to refresh data');
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    data,
    loading,
    error,
    refresh
  };
}

// Specific hooks for common use cases
export function useLoanRequests(status: 'pending' | 'approved' | 'rejected') {
  const sortByField = status === 'pending' ? 'createdAt' : 
                     status === 'approved' ? 'approvedAt' : 'rejectedAt';
  
  return useFirestoreData<any>({
    collectionName: 'loanRequests',
    filters: [{ field: 'status', operator: '==', value: status }],
    sortBy: sortByField as any,
    sortOrder: 'desc',
    fallbackSortBy: 'createdAt'
  });
}

export function useMembers() {
  return useFirestoreData<any>({
    collectionName: 'members',
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
}

export function useUsersWithRole(role: string) {
  return useFirestoreData<any>({
    collectionName: 'users',
    filters: [{ field: 'role', operator: '==', value: role }],
    sortBy: 'createdAt',
    sortOrder: 'desc'
  });
}