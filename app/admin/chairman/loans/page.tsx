import { redirect } from 'next/navigation';

export default function ChairmanLoansRedirect() {
  redirect('/admin/loans/records');
}
