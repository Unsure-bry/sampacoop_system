import { redirect } from 'next/navigation';

export default function BODMembersRedirect() {
  redirect('/admin/members/records');
}
