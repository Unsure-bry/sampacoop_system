import LoanLayout from '@/components/shared/LoanLayout';

export default function OperatorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}