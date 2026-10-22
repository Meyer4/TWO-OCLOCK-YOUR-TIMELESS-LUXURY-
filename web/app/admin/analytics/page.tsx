import { AnalyticsPanel } from '@/components/admin/admin-dashboard';
import { AdminHeader } from '@/components/admin/admin-shell';
export default function Page() {
  return (
    <div className="space-y-8">
      <AdminHeader eyebrow="Insight" title="Analytics" />
      <AnalyticsPanel />
    </div>
  );
}
