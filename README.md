# RAW — Royal Art Weaves (v2, mobile)

Mobile-first site for **@royal4rt**. It has a style menu with prices and 3D illustrations, and a shop with **cash-on-delivery to all 58 wilayas** (durags, bonnets, hair care, cuffs).
The layout, the bold display font (**Caesar Dressing**) and the centred logo follow sunviya.com. The colours come from the RAW logo.

**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind · Framer Motion · raw WebGL for the hero.

```bash
npm install
npm run dev        # http://localhost:3000  (use your phone, or DevTools mobile view)
npm run build && npm start
```

## Edit the content

| What | File |
|---|---|
| Styles, **prices (DA)**, durations, options | `lib/styles.ts` |
| Products, **prices (DA)**, colours, descriptions | `lib/products.ts` |
| **Delivery prices per wilaya** (home / stop desk) | `lib/algeria.ts` (the `ZONES` table) |
| Coupon codes | `lib/site.ts` (`COUPONS`; `RAW10` and `ROYAL` are examples) |
| Instagram, WhatsApp number, announcement bar | `lib/site.ts` |

All prices and delivery fees are **placeholders** until the artist confirms them.

## Orders (cash on delivery)
The order form (استمارة الطلب) appears on every product page and on `/checkout` for the bag. It has:

* a coupon code
* a live summary: product price, delivery, discount, total
* name and phone (Algerian 05/06/07 numbers)
* wilaya (58) and commune (1,541)
* home delivery or stop desk, and the address

`/api/order` recalculates every price on the server, then sends the order to:

* **Telegram (recommended):** the order arrives on the artist's phone instantly.
  1. In Telegram, talk to **@BotFather**, send `/newbot` and copy the token.
  2. Send any message to the new bot, then open `https://api.telegram.org/bot<TOKEN>/getUpdates` and copy `chat.id`.
  3. Add `TELEGRAM_BOT_TOKEN` and `TELEGRAM_CHAT_ID`, either in `.env.local` or in Vercel → Settings → Environment Variables.
* **Google Sheets (optional):** set `ORDER_WEBHOOK_URL` to a Google Apps Script web app:
  ```js
  function doPost(e) {
    const o = JSON.parse(e.postData.contents);
    SpreadsheetApp.getActiveSheet().appendRow([o.date, o.id, o.name, o.phone, o.wilayaName, o.commune, o.address, o.delivery, o.items, o.subtotal, o.shipping, o.discount, o.coupon, o.total]);
    return ContentService.createTextOutput("ok");
  }
  ```
  To set it up: Extensions → Apps Script → paste the code → Deploy → Web app → access: anyone.

If neither is configured, the customer still sees a confirmation and is asked to send the order by Instagram DM, so no order is lost. **Configure Telegram before going live.**

## Hero: "The Deep"
The hero is the RAW octopus drawn live by the phone's GPU (`components/deep/`). It sits in murky water with only its eyes clear.
* It blinks, glances around (and sometimes at the *Book* button), follows the visitor's finger, flares on tap, exhales bubbles, and sinks as you scroll away.
* It renders at reduced resolution on purpose, because it's meant to be blurry. It pauses off-screen, gets lighter on slow phones, and falls back to a poster image without WebGL. It shows a still frame when the visitor has reduced motion turned on.
* After changing the look in `shader.ts`, run `node tools/deep-poster.mjs` to refresh `public/media/deep-poster.jpg`.

## Booking (services)
Tap a style, pick options (the price updates live), date and area, then **Book via DM**. The request is copied and Instagram DMs open (`ig.me/m/royal4rt`), so the client just pastes it.

## 3D illustrations
Every render is procedural (three.js) and made offline into `public/renders/*.webp`:
```bash
npm run render                 # all illustrations (needs Chrome installed)
npm run render -- art cornrows # just some
npm run hero-video             # the 3D braids loop behind the "We come to you" banner (needs: pip install imageio-ffmpeg pillow)
node tools/deep-poster.mjs     # hero poster from the shader
python tools/logo.py           # logo cut-outs from rawlogo.png
python tools/brand-assets.py   # logo plate + social share image
node tools/shoot-site.mjs      # iPhone-size screenshots of a running site
node tools/qa-order.mjs        # walks through hero + order form + checkout
```

## Pages
`/` home · `/menu` price list · `/shop` (+ `?c=durags|bonnets|hair-care|accessories`) · `/shop/[slug]` product + order form · `/checkout` bag order form · `/api/order`.

## Deploy
Push to GitHub, import it on Vercel and add the env variables (`.env.example`). Then put the URL in the Instagram bio.
Commune data comes from [othmanus/algeria-cities](https://github.com/othmanus/algeria-cities) (Ministry of Interior list).
