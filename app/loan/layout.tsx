import LoanLayout from '@/components/shared/LoanLayout';

export default function LoanPageLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}