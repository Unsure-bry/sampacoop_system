'use client';

import { useState, useEffect } from 'react';
import { firestore } from '@/lib/firebase';

interface SavingsLeaderboardEntry {
  memberId: string;
  fullName: string;
  role: string;
  totalSavings: number;
}

interface LeaderboardEntry {
  id: string;
  name: string;
  savingsAmount: number;
  rank: number;
}

// Calculate total savings for a member
const calculateMemberSavings = (transactions: any[]): number => {
  return transactions.reduce((total, transaction) => {
    if (transaction.type === 'deposit') {
      return total + (transaction.amount || 0);
    } else if (transaction.type === 'withdrawal') {
      return total - (transaction.amount || 0);
    }
    return total;
  }, 0);
};

export default function SavingsLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch all savings transactions
        const savingsResult = await firestore.getCollection('savings');
        
        if (savingsResult.success && savingsResult.data) {
          const savingsTransactions = savingsResult.data;
          
          // Group transactions by member
          const memberTransactionsMap: Record<string, any[]> = {};
          savingsTransactions.forEach((transaction: any) => {
            if (!memberTransactionsMap[transaction.memberId]) {
              memberTransactionsMap[transaction.memberId] = [];
            }
            memberTransactionsMap[transaction.memberId].push(transaction);
          });

          // Get members data to join with savings
          const membersResult = await firestore.getCollection('members');
          let members: any[] = [];
          if (membersResult.success && membersResult.data) {
            members = membersResult.data;
          }

          // Calculate total savings per member
          const savingsLeaderboardData = Object.entries(memberTransactionsMap)
            .map(([memberId, transactions]) => {
              const member = members.find((m: any) => m.id === memberId);
              const totalSavings = calculateMemberSavings(transactions);
              
              return {
                memberId,
                fullName: member ? `${member.firstName} ${member.lastName}` : 'Unknown',
                role: member?.role || 'Member',
                totalSavings
              };
            })
            .filter((entry: any) => entry.totalSavings > 0) // Exclude members with zero savings
            .sort((a: any, b: any) => b.totalSavings - a.totalSavings) // Sort by total savings (descending)
            .slice(0, 10); // Top 10

          // Convert to the expected format
          const formattedData: LeaderboardEntry[] = savingsLeaderboardData.map((entry: any, index: number) => ({
            id: entry.memberId,
            name: entry.fullName,
            savingsAmount: entry.totalSavings,
            rank: index + 1
          }));

          setLeaderboardData(formattedData);
        }
        
        setLoading(false);
      } catch (error) {
        console.error('Error fetching savings leaderboard data:', error);
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'PHP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-800 mb-4">Savings Leaderboard</h2>
        <div className="space-y-4">
          {[...Array(5)].map((_, index) => (
            <div key={index} className="flex items-center justify-between p-3 animate-pulse">
              <div className="flex items-center space-x-3">
                <div className="h-8 w-8 rounded-full bg-gray-200"></div>
                <div className="h-4 bg-gray-200 rounded w-24"></div>
              </div>
              <div className="h-4 bg-gray-200 rounded w-16"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow p-6">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-medium text-gray-800">Savings Leaderboard</h2>
        <span className="text-xs font-medium text-gray-500">Top 10 Members</span>
      </div>
      
      <div className="space-y-3">
        {leaderboardData.map((member) => (
          <div 
            key={member.id} 
            className={`flex items-center justify-between p-3 rounded-lg transition-all hover:shadow-sm ${
              member.rank === 1 
                ? 'bg-gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' 
                : member.rank === 2 
                  ? 'bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-200' 
                  : member.rank === 3 
                    ? 'bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-200' 
                    : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                member.rank === 1 
                  ? 'bg-yellow-400 text-yellow-900' 
                  : member.rank === 2 
                    ? 'bg-gray-300 text-gray-700' 
                    : member.rank === 3 
                      ? 'bg-amber-600 text-amber-50' 
                      : 'bg-gray-100 text-gray-700'
              }`}>
                {member.rank}
              </div>
              <div>
                <div className="font-medium text-gray-900">{member.name}</div>
              </div>
            </div>
            <div className="font-semibold text-gray-900">
              {formatCurrency(member.savingsAmount)}
            </div>
          </div>
        ))}
      </div>
      
      <div className="mt-4 pt-4 border-t border-gray-100 text-center">
        <button className="text-sm font-medium text-red-600 hover:text-red-800 transition-colors">
          View Full Leaderboard
        </button>
      </div>
    </div>
  );
}