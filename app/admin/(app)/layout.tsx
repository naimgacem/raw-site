import AdminShell from "@/components/admin/Shell";
import { requireAdmin } from "@/lib/admin-auth";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

export default async function AdminAppLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();
  const db = await getDb();
  const counts = await db.countNew().catch(() => ({ orders: 0, bookings: 0 }));
  return (
    <AdminShell counts={counts} dbKind={db.kind}>
      {children}
    </AdminShell>
  );
}
