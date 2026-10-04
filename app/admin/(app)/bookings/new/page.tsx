import type { Metadata } from "next";
import { getCatalogFresh } from "@/lib/catalog";
import BookingEditor from "@/components/admin/BookingEditor";

export const metadata: Metadata = { title: "New booking" };

export default async function NewBookingPage() {
  const cat = await getCatalogFresh();
  return <BookingEditor styles={cat.styles} />;
}
