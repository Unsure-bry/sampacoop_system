export interface LoanPlan {
  id: string;
  name: string;
  description: string;
  maxAmount: number;
  interestRate: number;
  termOptions: number[];
  applicableTo: 'Driver' | 'Operator' | 'All Members';
  createdAt?: string;
}

export interface LoanRequest {
  userId: string;
  planId: string;
  planName: string;
  amount: number;
  term: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}