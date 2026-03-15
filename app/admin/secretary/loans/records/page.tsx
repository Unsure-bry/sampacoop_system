import { redirect } from 'next/navigation';

export default function SecretaryLoansRedirect() {
  redirect('/admin/loans/records');
}
