// On Vercel before Supabase is connected: the site works on its starting data, the admin can look but not save.
import { DEFAULT_COUPONS } from "../site";
import { DbError, NOT_CONNECTED, type Db } from "./index";

const fail = async (): Promise<never> => {
  throw new DbError(NOT_CONNECTED);
};

export function noneDb(): Db {
  return {
    kind: "none",
    getConfig: async () => ({}),
    setConfig: fail,
    createOrder: fail,
    getOrder: async () => null,
    listOrders: async () => [],
    updateOrder: fail,
    deleteOrder: fail,
    createBooking: fail,
    getBooking: async () => null,
    listBookings: async () => [],
    updateBooking: fail,
    deleteBooking: fail,
    countNew: async () => ({ orders: 0, bookings: 0 }),
    listCoupons: async () => DEFAULT_COUPONS,
    getCoupon: async (code) => DEFAULT_COUPONS.find((c) => c.code === code) ?? null,
    saveCoupon: fail,
    deleteCoupon: fail,
    redeemCoupon: async () => {},
    hit: async () => true,
    upload: fail,
    listMedia: async () => [],
    deleteMedia: fail,
    ping: async () => {},
  };
}
