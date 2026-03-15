import { redirect } from 'next/navigation';

export default function SecretaryProfileRedirect() {
  redirect('/admin/profile');
}
