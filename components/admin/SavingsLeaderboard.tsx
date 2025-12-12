'use client';

import { useState, useEffect } from 'react';

interface LeaderboardEntry {
  id: string;
  name: string;
  savingsAmount: number;
  rank: number;
}

export default function SavingsLeaderboard() {
  const [leaderboardData, setLeaderboardData] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  // Mock data - in a real application, this would come from Firestore
  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      const mockData: LeaderboardEntry[] = [
      ];
      setLeaderboardData(mockData);
      setLoading(false);
    }, 800);
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
                ? 'bg- gradient-to-r from-yellow-50 to-yellow-100 border border-yellow-200' 
                : member.rank === 2 
                  ? 'bg- gradient-to-r from-gray-50 to-gray-100 border border-gray-200' 
                  : member.rank === 3 
                    ? 'bg- gradient-to-r from-amber-50 to-amber-100 border border-amber-200' 
                    : 'hover:bg-gray-50'
            }`}
          >
            <div className="flex items-center space-x-3">
              <div className={`flex- shrink-0 h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
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