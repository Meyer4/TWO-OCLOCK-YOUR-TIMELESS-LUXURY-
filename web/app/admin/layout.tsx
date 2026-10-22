import { notFound } from 'next/navigation';
import { DEMO } from '@/lib/demo/mode';
import type { Metadata } from 'next';
import { AdminShell } from '@/components/admin/admin-shell';

export const metadata: Metadata = { title: 'Studio', robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  if (DEMO) notFound();
  return <AdminShell>{children}</AdminShell>;
}
