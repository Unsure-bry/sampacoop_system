import LoanLayout from '@/components/shared/LoanLayout';

export default function SavingsPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}