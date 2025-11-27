import LoanLayout from '@/components/shared/LoanLayout';

export default function AboutPagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}