import { redirect } from 'next/navigation';

export default function BODLoansRedirect() {
  redirect('/admin/loans/records');
}
