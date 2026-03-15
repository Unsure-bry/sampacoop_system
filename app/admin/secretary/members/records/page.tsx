import { redirect } from 'next/navigation';

export default function SecretaryMembersRedirect() {
  redirect('/admin/members/records');
}
