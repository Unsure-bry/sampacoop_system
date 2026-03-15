import { redirect } from 'next/navigation';

export default function TreasurerLoansRedirect() {
  redirect('/admin/loans/records');
}
