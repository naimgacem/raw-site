// Admin icon set — same 24px grid and 1.8 stroke as the site icons.
type P = { className?: string };
const s = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
const icon = (d: React.ReactNode) =>
  function Icon({ className = "h-5 w-5" }: P) {
    return <svg viewBox="0 0 24 24" className={className} {...s} aria-hidden>{d}</svg>;
  };

export const HomeI = icon(<><path d="M3.5 10.5 12 4l8.5 6.5" /><path d="M5.5 9v10.5h4.5v-5.5h4v5.5h4.5V9" /></>);
export const OrdersI = icon(<><path d="M5 8h14l-1 12.5H6L5 8Z" /><path d="M9 10V6.5a3 3 0 0 1 6 0V10" /></>);
export const CalendarI = icon(<><rect x="3.5" y="5" width="17" height="15.5" rx="3" /><path d="M3.5 10h17M8 3v4M16 3v4" /></>);
export const GridI = icon(<><rect x="4" y="4" width="7" height="7" rx="2" /><rect x="13" y="4" width="7" height="7" rx="2" /><rect x="4" y="13" width="7" height="7" rx="2" /><rect x="13" y="13" width="7" height="7" rx="2" /></>);
export const MoreI = icon(<><circle cx="5.5" cy="12" r="1.3" fill="currentColor" /><circle cx="12" cy="12" r="1.3" fill="currentColor" /><circle cx="18.5" cy="12" r="1.3" fill="currentColor" /></>);
export const UsersI = icon(<><circle cx="9" cy="8.5" r="3.5" /><path d="M2.5 20c0-3.6 2.9-6 6.5-6s6.5 2.4 6.5 6" /><path d="M16 5.2a3.5 3.5 0 0 1 0 6.6M18 14.3c2.1.7 3.5 2.8 3.5 5.7" /></>);
export const TruckI = icon(<><path d="M2.5 6.5h11v10h-11zM13.5 9.5h4l3 3.2v3.8h-7" /><circle cx="6.5" cy="17.5" r="1.8" /><circle cx="17" cy="17.5" r="1.8" /></>);
export const TicketI = icon(<><path d="M3.5 8.5V6.5a1.5 1.5 0 0 1 1.5-1.5h14a1.5 1.5 0 0 1 1.5 1.5v2a3.5 3.5 0 0 0 0 7v2a1.5 1.5 0 0 1-1.5 1.5H5a1.5 1.5 0 0 1-1.5-1.5v-2a3.5 3.5 0 0 0 0-7Z" /><path d="m9.5 14.5 5-5" /><circle cx="9.7" cy="9.7" r=".6" fill="currentColor" /><circle cx="14.3" cy="14.3" r=".6" fill="currentColor" /></>);
export const GearI = icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 13.5a7.6 7.6 0 0 0 0-3l2-1.6-2-3.4-2.4 1a7.5 7.5 0 0 0-2.6-1.5L14 2.5h-4l-.4 2.5A7.5 7.5 0 0 0 7 6.5l-2.4-1-2 3.4 2 1.6a7.6 7.6 0 0 0 0 3l-2 1.6 2 3.4 2.4-1a7.5 7.5 0 0 0 2.6 1.5l.4 2.5h4l.4-2.5a7.5 7.5 0 0 0 2.6-1.5l2.4 1 2-3.4-2-1.6Z" /></>);
export const ExternalI = icon(<><path d="M14 4.5h5.5V10M19.5 4.5 11 13" /><path d="M18 14v4.5a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 4 18.5v-11A1.5 1.5 0 0 1 5.5 6H10" /></>);
export const LogoutI = icon(<><path d="M14.5 4.5h3.5a1.5 1.5 0 0 1 1.5 1.5v12a1.5 1.5 0 0 1-1.5 1.5h-3.5" /><path d="M10 8l-4 4 4 4M6 12h10" /></>);
export const PhoneI = icon(<path d="M7.2 3.8 9 3.5l1.7 4.1-2 1.4a11.4 11.4 0 0 0 6.3 6.3l1.4-2 4.1 1.7-.3 1.8a2.8 2.8 0 0 1-2.9 2.4A14.2 14.2 0 0 1 4.8 6.7a2.8 2.8 0 0 1 2.4-2.9Z" />);
export const WhatsAppI = icon(<><path d="M4 20l1.2-4A8 8 0 1 1 8 18.8L4 20Z" /><path d="M9.2 8.8c.2 2.6 2.5 5 5.4 5.6l1-1.2-1.6-.9-.8.7c-1-.5-1.8-1.3-2.3-2.3l.7-.8-.9-1.6-1.5.5Z" /></>);
export const MessageI = icon(<path d="M4.5 5.5h15a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H9l-4.5 3v-3h0a1 1 0 0 1-1-1v-10a1 1 0 0 1 1-1Z" />);
export const InstagramI = icon(<><rect x="3.5" y="3.5" width="17" height="17" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.3" cy="6.7" r=".6" fill="currentColor" /></>);
export const CopyI = icon(<><rect x="8.5" y="8.5" width="11" height="11" rx="2.5" /><path d="M15.5 8.5V6A1.5 1.5 0 0 0 14 4.5H6A1.5 1.5 0 0 0 4.5 6v8A1.5 1.5 0 0 0 6 15.5h2.5" /></>);
export const BackI = icon(<path d="M15 5l-7 7 7 7" />);
export const NextI = icon(<path d="m9 5 7 7-7 7" />);
export const DownI = icon(<path d="m6 9 6 6 6-6" />);
export const UpI = icon(<path d="m6 15 6-6 6 6" />);
export const TrashI = icon(<><path d="M4.5 7h15M10 11v6M14 11v6" /><path d="M6 7l1 12.5h10L18 7M9 7V4.5h6V7" /></>);
export const EditI = icon(<><path d="M4.5 19.5h4l10-10a2.8 2.8 0 0 0-4-4l-10 10v4Z" /><path d="m13 7 4 4" /></>);
export const EyeI = icon(<><path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" /><circle cx="12" cy="12" r="3" /></>);
export const EyeOffI = icon(<><path d="M4 4l16 16" /><path d="M10 6a9.6 9.6 0 0 1 2-.5C18 5.5 21.5 12 21.5 12a17 17 0 0 1-2.7 3.4M14.1 14.2A3 3 0 0 1 9.8 9.9M6.4 7.6A16.5 16.5 0 0 0 2.5 12S6 18.5 12 18.5a9 9 0 0 0 4-.9" /></>);
export const ImageI = icon(<><rect x="3.5" y="4.5" width="17" height="15" rx="3" /><circle cx="9" cy="10" r="1.8" /><path d="m4 17 4.5-4.5 3.5 3.5 2.5-2.5 5.5 5" /></>);
export const UploadI = icon(<><path d="M12 15.5V4.5M7.5 9 12 4.5 16.5 9" /><path d="M4.5 15v3a1.5 1.5 0 0 0 1.5 1.5h12a1.5 1.5 0 0 0 1.5-1.5v-3" /></>);
export const SearchI = icon(<><circle cx="10.5" cy="10.5" r="6.5" /><path d="m20 20-4.4-4.4" /></>);
export const PlusI = icon(<path d="M12 5v14M5 12h14" />);
export const MinusI = icon(<path d="M5 12h14" />);
export const CheckI = icon(<path d="m5 12.5 4.5 4.5L19 7.5" />);
export const CloseI = icon(<path d="M6 6l12 12M18 6 6 18" />);
export const ClockI = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 7.5V12l3 2" /></>);
export const AlertI = icon(<><path d="M12 4 2.8 19.5h18.4L12 4Z" /><path d="M12 10v4.2M12 17v.3" /></>);
export const InfoI = icon(<><circle cx="12" cy="12" r="8.5" /><path d="M12 11v5M12 8v.3" /></>);
export const DownloadI = icon(<><path d="M12 4.5v11M7.5 11l4.5 4.5 4.5-4.5" /><path d="M4.5 19.5h15" /></>);
export const ShareI = icon(<><path d="M12 15V4.5M8 8.5l4-4 4 4" /><path d="M7 11.5H6A1.5 1.5 0 0 0 4.5 13v5A1.5 1.5 0 0 0 6 19.5h12a1.5 1.5 0 0 0 1.5-1.5v-5a1.5 1.5 0 0 0-1.5-1.5h-1" /></>);
export const PinI = icon(<><path d="M12 21s-6.5-6-6.5-11a6.5 6.5 0 0 1 13 0c0 5-6.5 11-6.5 11Z" /><circle cx="12" cy="10" r="2.3" /></>);
export const UserI = icon(<><circle cx="12" cy="8" r="4" /><path d="M4.5 20.5c0-4 3.4-6.5 7.5-6.5s7.5 2.5 7.5 6.5" /></>);
export const BlockI = icon(<><circle cx="12" cy="12" r="8.5" /><path d="m6 6 12 12" /></>);
export const SparkI = icon(<path d="M12 3.5 13.8 10l6.7 2-6.7 2L12 20.5 10.2 14 3.5 12l6.7-2L12 3.5Z" />);
export const StoreI = icon(<path d="M4 9.5 5.5 4h13L20 9.5M4 9.5h16M4 9.5V20h16V9.5M9.5 20v-5h5v5" />);
export const LockI = icon(<><rect x="5" y="10.5" width="14" height="10" rx="2.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></>);
export const BellI = icon(<><path d="M6 16.5V11a6 6 0 0 1 12 0v5.5l1.5 2h-15l1.5-2Z" /><path d="M10 20.5a2.2 2.2 0 0 0 4 0" /></>);
export const DbI = icon(<><ellipse cx="12" cy="6" rx="7.5" ry="2.8" /><path d="M4.5 6v12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8V6M4.5 12c0 1.5 3.4 2.8 7.5 2.8s7.5-1.3 7.5-2.8" /></>);
export const DragI = icon(<><path d="M8 7h8M8 12h8M8 17h8" /></>);
export const RefreshI = icon(<><path d="M19.5 8.5A8 8 0 0 0 5 7.5M4.5 15.5A8 8 0 0 0 19 16.5" /><path d="M19.5 4v4.5H15M4.5 20v-4.5H9" /></>);
export const TagI = icon(<><path d="M3.5 12.5v-8h8l9 9-8 8-9-9Z" /><circle cx="8" cy="8" r="1.4" /></>);
export const ScissorsI = icon(<><circle cx="6.5" cy="6.5" r="2.5" /><circle cx="6.5" cy="17.5" r="2.5" /><path d="M8.6 8 20 18M8.6 16 20 6" /></>);
export const SpinnerI = ({ className = "h-5 w-5" }: P) => (
  <svg viewBox="0 0 24 24" className={`${className} animate-spin`} fill="none" aria-hidden><circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity=".25" strokeWidth="3" /><path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" /></svg>
);
