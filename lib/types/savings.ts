export interface SavingsTransaction {
  id: string;
  memberId: string;
  memberName: string;
  date: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  balance: number;
  remarks: string;
  createdAt: string;
  depositControlNumber?: string;
}

export interface MemberSavings {
  memberId: string;
  memberName: string;
  role: string;
  totalSavings: number;
  status: string;
  lastUpdated: string;
  loanDueDate?: string;
}