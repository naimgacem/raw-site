import { getDb } from "@/lib/db";
import { getCatalogFresh } from "@/lib/catalog";
import { dashboard } from "@/lib/admin-data";
import HomeView from "@/components/admin/HomeView";

export default async function AdminHome() {
  const db = await getDb();
  const [orders, bookings, cat] = await Promise.all([db.listOrders(), db.listBookings(), getCatalogFresh()]);
  return (
    <HomeView
      d={dashboard(orders, bookings)}
      shop={{ ordersOpen: cat.settings.ordersOpen, bookingsOpen: cat.settings.bookingsOpen }}
      empty={orders.length === 0}
      dbKind={db.kind}
    />
  );
}
