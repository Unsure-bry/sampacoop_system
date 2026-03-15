import { redirect } from 'next/navigation';

export default function ChairmanMembersRedirect() {
  redirect('/admin/members/records');
}
