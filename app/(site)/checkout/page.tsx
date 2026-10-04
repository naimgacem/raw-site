import type { Metadata } from "next";
import CheckoutView from "@/components/CheckoutView";

export const metadata: Metadata = {
  title: "Checkout — cash on delivery",
  robots: { index: false },
};

export default function CheckoutPage() {
  return <CheckoutView />;
}
