import { redirect } from 'next/navigation';

export default function ViceChairmanLoansRedirect() {
  redirect('/admin/loans/records');
}
