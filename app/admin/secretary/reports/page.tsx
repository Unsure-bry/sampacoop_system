import { redirect } from 'next/navigation';

export default function SecretaryReportsRedirect() {
  redirect('/admin/reports');
}
