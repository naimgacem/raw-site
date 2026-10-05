# RAW — Royal Art Weaves (v2, mobile)

Mobile-first site for **@royal4rt**. It has a style menu with prices and 3D illustrations, and a shop with **cash-on-delivery to all 58 wilayas** (durags, bonnets, hair care, cuffs).
The layout, the bold display font (**Caesar Dressing**) and the centred logo follow sunviya.com. The colours come from the RAW logo.

Everything is run from the **admin dashboard at `/admin`**: orders, bookings, products, prices, delivery fees, coupons and the site's text.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · raw WebGL for the hero · Supabase (database + photos).

```bash
npm install
npm run dev        # http://localhost:3000  (use your phone, or DevTools mobile view)
                   # admin: http://localhost:3000/admin — password "admin" on your computer
npm run build && npm start
```

On your computer nothing else is needed: the admin saves to a `.data/` folder (not committed). The live site needs Supabase — see **Admin setup**.

## Admin dashboard (`/admin`)
Built for the phone first (bottom tab bar, big buttons, works one-handed) and fine on a laptop. Add it to the home screen and it opens like an app.

| Tab | What you can do |
|---|---|
| **Home** | Orders to confirm / ship / on the road, sales this month, last 14 days, booking requests, upcoming appointments, pause orders or bookings |
| **Orders** | Search and filter by status · one tap to call, WhatsApp or SMS the customer (message pre-written) · Confirm → Hand to courier (tracking number) → Delivered / Returned · “No answer” call counter · warning when a number returned orders before or is blocked · copy details for the courier · private notes · edit or add orders taken by DM/phone · download all orders as a spreadsheet |
| **Bookings** | Requests from the website’s “Book via DM” button, plus appointments you add · set date, time, area, final price, deposit · Done / No-show / Cancel · upcoming agenda by day |
| **Catalog** | Products: photos per colour (upload from the phone), price and “was” price, sold out per colour, hide/show, details, care, reorder, duplicate · Styles: photo, starting price, duration, options with extra prices, included list · Collections and menu categories |
| **More** | Customers (orders, returns, block a number) · Delivery prices (zones, per-wilaya prices, switch a wilaya off, free delivery over an amount) · Coupons (% or DA, minimum order, max uses, last day) · Settings (Instagram, WhatsApp, email, announcement bar, “Good to know” cards, open/closed, password, notifications test) |

Every save is live on the site within a second — no redeploy.

### Admin setup (live site)
1. **Supabase (free):** create a project at [supabase.com](https://supabase.com). Open **SQL Editor → New query**, paste all of [`supabase/schema.sql`](supabase/schema.sql) and press **Run**. It creates the tables, the photo storage and locks everything so only the website’s server can read it.
2. In Supabase → **Project Settings → API**, copy the **Project URL** and the **service_role** key (secret — never share it or put it in a `NEXT_PUBLIC_` variable).
3. In **Vercel → your project → Settings → Environment Variables**, add:
   * `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` (from step 2)
   * `ADMIN_PASSWORD` — your first admin password (change it later in Admin → Settings)
   * optional: `TELEGRAM_BOT_TOKEN` + `TELEGRAM_CHAT_ID` to get each order on Telegram too (see below)
4. **Redeploy** (Vercel → Deployments → ⋯ → Redeploy). Open `https://your-site/admin`, log in, and check Settings → Database says *connected*.

Free Supabase projects pause after a week without activity; `vercel.json` runs a tiny daily check (`/api/cron/keepalive`) so the shop never goes to sleep.

Until Supabase is connected the live site runs on the starting data in `lib/*.ts`, and the admin shows a yellow “not connected” banner.

## Starting content
The first time, the shop and menu come from these files. After that, edit everything in the admin.

| What | File |
|---|---|
| Styles, prices, durations, options | `lib/styles.ts` |
| Products, prices, colours, descriptions | `lib/products.ts` |
| Delivery zones and prices per wilaya | `lib/algeria.ts` |
| Instagram, WhatsApp, announcements, example coupons | `lib/site.ts` |

All starting prices and delivery fees are **placeholders** until the artist confirms them.

## Orders (cash on delivery)
The order form (استمارة الطلب) appears on every product page and on `/checkout` for the bag. It has:

* a coupon code (checked on the server, so the codes aren’t visible in the page)
* a live summary: product price, delivery (or free above your amount), discount, total
* name and phone (Algerian 05/06/07 numbers)
* wilaya (58) and commune (1,541)
* home delivery or stop desk, and the address

`/api/order` recalculates every price on the server, saves the order for the admin, and also sends it to:

* **Telegram (recommended):** every order and booking request arrives on the artist's phone instantly, with a link to it in the admin.
  Set it up from the phone: **Admin → Settings → Notifications** walks through it (create a bot with @BotFather, paste its token, press Start — done).
  Alternatively set `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID` in Vercel.
* **Google Sheets (optional):** set `ORDER_WEBHOOK_URL` to a Google Apps Script web app:
  ```js
  function doPost(e) {
    const o = JSON.parse(e.postData.contents);
    SpreadsheetApp.getActiveSheet().appendRow([o.date, o.id, o.name, o.phone, o.wilayaName, o.commune, o.address, o.delivery, o.items, o.subtotal, o.shipping, o.discount, o.coupon, o.total]);
    return ContentService.createTextOutput("ok");
  }
  ```
  To set it up: Extensions → Apps Script → paste the code → Deploy → Web app → access: anyone.

If the order can’t be saved or sent anywhere, the customer is asked to send it by Instagram DM, so no order is lost. Order, booking and login forms are rate-limited against spam.

## Hero: "The Deep"
The hero is the RAW octopus drawn live by the phone's GPU (`components/deep/`). It sits in murky water with only its eyes clear.
* It blinks, glances around (and sometimes at the *Book* button), follows the visitor's finger, flares on tap, exhales bubbles, and sinks as you scroll away.
* It renders at reduced resolution on purpose, because it's meant to be blurry. It pauses off-screen, gets lighter on slow phones, and falls back to a poster image without WebGL. It shows a still frame when the visitor has reduced motion turned on.
* After changing the look in `shader.ts`, run `node tools/deep-poster.mjs` to refresh `public/media/deep-poster.jpg`.

## Booking (services)
Tap a style, pick options (the price updates live), date, area, name and phone, then **Send booking request**: it goes straight to the admin (and Telegram) — nothing to copy. Clients who prefer Instagram can still DM: the sheet copies the request (with a visible confirmation) and opens the chat. Instagram has no official way to pre-type a DM, so the link also carries `?text=`, which some app versions honour.

## 3D illustrations & tools
Every render is procedural (three.js) and made offline into `public/renders/*.webp`:
```bash
npm run render                 # all illustrations (needs Chrome installed)
npm run render -- art cornrows # just some
npm run weave-video            # "The Weave" loop behind "We come to you" (uses the graphics card; needs: pip install imageio-ffmpeg)
npm run weave-video -- --preview  # three quick stills into tools/out/weave-*.jpg
node tools/deep-poster.mjs     # hero poster from the shader
python tools/logo.py           # logo cut-outs from rawlogo.png
python tools/brand-assets.py   # logo plate + social share image
node tools/shoot-site.mjs      # iPhone-size screenshots of a running site
node tools/shoot-admin.mjs <url> <outDir> /admin /admin/orders@full   # admin screenshots (logs in)
node tools/qa-order.mjs        # walks through hero + order form + checkout
node tools/qa-admin.mjs        # drives the admin: confirm/ship an order, edit a price, upload, coupons, bookings…
```

## Pages
`/` home · `/menu` price list · `/shop` (+ `?c=<collection>`) · `/shop/[slug]` product + order form · `/checkout` bag order form · `/admin` dashboard.

## Deploy
Push to GitHub, import it on Vercel, add the env variables (`.env.example`, and **Admin setup** above). Then put the URL in the Instagram bio.
Commune data comes from [othmanus/algeria-cities](https://github.com/othmanus/algeria-cities) (Ministry of Interior list).
