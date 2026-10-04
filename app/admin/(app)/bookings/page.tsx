import type { Metadata } from "next";
import { getDb } from "@/lib/db";
import BookingsView from "@/components/admin/BookingsView";

export const metadata: Metadata = { title: "Bookings" };

export default async function BookingsPage({ searchParams }: { searchParams: { s?: string } }) {
  const db = await getDb();
  const bookings = await db.listBookings();
  return <BookingsView bookings={bookings} initial={searchParams.s ?? ""} />;
}
