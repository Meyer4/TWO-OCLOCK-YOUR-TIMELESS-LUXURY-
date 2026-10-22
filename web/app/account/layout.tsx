import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import { AccountShell } from '@/components/account/account-shell';

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  if (DEMO) notFound();
  return <AccountShell>{children}</AccountShell>;
}
