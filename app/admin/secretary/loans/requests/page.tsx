import { redirect } from 'next/navigation';

export default function SecretaryLoanRequestsRedirect() {
  redirect('/admin/loans/requests');
}
