import { redirect } from 'next/navigation';

export default function ManagerLoansRedirect() {
  redirect('/admin/loans/records');
}
