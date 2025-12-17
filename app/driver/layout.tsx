import LoanLayout from '@/components/shared/LoanLayout';

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}