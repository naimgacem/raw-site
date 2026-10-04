// Contact links for a customer's phone number (Algerian 0XXXXXXXXX → +213).
export const intl = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return /^0[567]\d{8}$/.test(d) ? `213${d.slice(1)}` : d;
};
export const telHref = (phone: string) => `tel:${phone.replace(/\s/g, "")}`;
export const waHref = (phone: string, text = "") => `https://wa.me/${intl(phone)}${text ? `?text=${encodeURIComponent(text)}` : ""}`;
// "sms:<n>?&body=" opens the composer with text on both iOS and Android
export const smsHref = (phone: string, text = "") => `sms:${phone.replace(/\s/g, "")}${text ? `?&body=${encodeURIComponent(text)}` : ""}`;
export const igHref = (handle: string) => `https://ig.me/m/${handle.replace(/^@+/, "")}`;

/** "0555 12 34 56" */
export const prettyPhone = (phone: string) => {
  const d = phone.replace(/\D/g, "");
  return /^0\d{9}$/.test(d) ? `${d.slice(0, 4)} ${d.slice(4, 6)} ${d.slice(6, 8)} ${d.slice(8)}` : phone;
};
