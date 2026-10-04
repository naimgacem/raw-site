import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db";
import { getCatalogFresh } from "@/lib/catalog";
import BookingDetail from "@/components/admin/BookingDetail";

export const metadata: Metadata = { title: "Booking" };

export default async function BookingPage({ params }: { params: { id: string } }) {
  const id = Number(params.id);
  if (!Number.isInteger(id)) notFound();
  const db = await getDb();
  const [booking, cat] = await Promise.all([db.getBooking(id), getCatalogFresh()]);
  if (!booking) notFound();
  const style = cat.styles.find((s) => s.slug === booking.style);
  return <BookingDetail booking={booking} image={style?.render} />;
}
