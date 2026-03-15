import { redirect } from 'next/navigation';

export default function ChairmanProfileRedirect() {
  redirect('/admin/profile');
}
