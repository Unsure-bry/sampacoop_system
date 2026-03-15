import { redirect } from 'next/navigation';

export default function ViceChairmanMembersRedirect() {
  redirect('/admin/members/records');
}
