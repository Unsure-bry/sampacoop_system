import LoanLayout from '@/components/shared/LoanLayout';

export default function ProfilePagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <LoanLayout>{children}</LoanLayout>;
}