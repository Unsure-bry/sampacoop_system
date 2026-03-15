import { redirect } from 'next/navigation';

export default function TreasurerMembersRedirect() {
  redirect('/admin/members/records');
}
