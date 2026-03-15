import { redirect } from 'next/navigation';

export default function TreasurerProfileRedirect() {
  redirect('/admin/profile');
}
