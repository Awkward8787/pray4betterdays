# Pray4BetterDays

Static storefront for pray4betterdays.com. Vite builds the CSS and JS. A prerender step writes one HTML file per route from `src/data/site.json` and `src/data/products.json`. Upload the contents of `dist/` to Hostinger. Production does not run Node. The client never receives a Square access token.

```bash
npm test
npm run build
npm run preview:fixture
```

`npm run build` also runs `scripts/check-dist.ts`. That check fails if a product has no name, if `products.json` or `dist/` contains `[product name]`, or if `dist/` contains the fixture sentinel, a Square secret prefix, `[tax]`, or the Square location id from site config.

`preview:fixture` copies `dist/` to `preview-dist/`. `preview-dist/` is gitignored and is not the site you upload.

## Config

`src/data/site.json` holds the brand, the seller, and the Square location.

| Field | Role |
| --- | --- |
| `brand` | UI name. Pray4BetterDays. |
| `legalName` | Seller. Pray 4 Better Days LLC. Footer, Privacy, and Shipping. |
| `founder` | Aniyla Evans. About credit and footer. |
| `squareLocationId` | Square location for payment links. Change this value if the merchant account moves. |
| `squareLocationName` | Label for that location, for whoever creates the links. |
| `email`, `instagram` | Contact page and contact links stay hidden until one of these is set. |
| `about` | Hidden when empty. The founder credit still shows. |
| `shipWindow`, `refundPolicy`, `cancelPolicy`, `delayPolicy`, `returnsBody`, `shippingBody`, `sizeGuide` | Hidden when empty. The page does not invent these terms. |
| `statementDescriptor` | Name buyers see on a card statement. Hidden until set. Shipping and Privacy only. |
| `squareShareNote`, `hostingNote` | Privacy only, and only when set. |
| `presalePriceCents`, `currency` | Base figure in config. 8500 cents, USD. Published sizes set their own `priceCents`. No former price. |
| `sizes` | S, M, L, XL at 8500. 2XL at 9000. 3XL at 9500. Each `paymentLink` stays null. The live links are `squareUrl` on the product. |
| `shippingCost` | Buyer copy. `Free shipping, US only` on the product and on Shipping. Square collects an address and cannot limit it to the US. |
| `taxIncluded` | True hides the tax line. The total is the size price. The page does not say tax is included. False prints "plus tax". Null prints `[tax]` in preview. `check-dist` rejects `[tax]` in `dist/`. |
| `paymentLinkNote` | Owner note only. Not rendered. The Payment Link has no shipping line item. The seller absorbs processing fees, and fees are never shown to buyers. |
| `timeZone` | Used to print a pre-order end date. |

Current Square location id in config: L951MA40J026G (Valdosta). The built pages do not print it. Page templates do not contain the id. Change `squareLocationId` in this file if the merchant account moves to the LLC.

## Products

`src/data/products.json` lists the Pray 4 Better Days Zip Hoodie (`zip-hoodie`, black, presale). An empty catalog still shows "First drop coming soon." and hides the "Shop hoodies" button. `check-dist` fails if a published product has no name, and it rejects the string `[product name]`.

Prices are integer US cents. S, M, L, and XL are 8500 ($85.00). 2XL is 9000 ($90.00). 3XL is 9500 ($95.00). S is selected by default. Changing size updates the price and `Total $X.00` in an `aria-live="polite"` region and does not move focus. Shipping copy is "Free shipping, US only", so the total equals that size's price. There is no tax line and no former-price field. This drop was never sold at another price, so the page cannot show one. A size with `priceCents: null` uses the color presale price, then the color price. A product with no price at all still shows no price.

`taxIncluded` is true for this drop. That hides the tax line. It is not a claim that the Square charge includes tax. Null still prints `[tax]` in a preview render, and that bracket must not appear in `dist/`.

`squareUrl` on each size is the Square Payment Link for that size and that price. When the field is present, an empty string does not fall through to `paymentLink` or `checkoutUrl`. Omit `squareUrl` only for an older row, which then uses `paymentLink` and then `checkoutUrl`. Any checkout url must be `https` on `square.link`, `checkout.square.site`, or `squareup.com` (subdomains of those hosts count). Any other url leaves the button disabled.

Pre-order and Buy now stay disabled until all of these exist: a price, the ship window (`shipEstimate`), `refundPolicy`, `cancelPolicy`, and a Square link. Returns, delay, and contact are not required. The pre-order note is `Pre-order.` plus the ship window and the cancel policy, and it sits with the line "Your card is charged when you place the pre-order." That line links to `/shipping/` and is printed only when the Pre-order button is actually on. The same charge line, ship window, refund, and cancel copy are on Shipping. A size stays selectable while the button says Coming soon. A size is struck and disabled only when that size's `remaining` is 0, or the product status is `soldout`. There is no run size and no remaining count on this drop.

The Payment Link has no shipping line item. The seller absorbs processing fees. The site never shows those fees.

```json
{
  "name": "",
  "slug": "black-zip",
  "status": "presale",
  "description": "",
  "shipEstimate": "",
  "presaleEndsAt": null,
  "colors": [
    {
      "id": "black",
      "name": "Black",
      "price": null,
      "presalePrice": 8500,
      "currency": "USD",
      "runSize": null,
      "remaining": null,
      "images": { "front": null, "back": null, "side": null, "details": [] },
      "spin": [],
      "sizes": [{ "id": "m", "label": "M", "sku": "", "checkoutUrl": "", "priceCents": 8500, "paymentLink": null, "squareUrl": "", "remaining": null }]
    }
  ]
}
```

`status` is `presale`, `available`, `soldout`, or `comingsoon`. Color ids the page can switch are `black`, `gray`, and `white`. Size ids are `s`, `m`, `l`, `xl`, `2xl`, and `3xl`.

`runSize` renders as "Run of N" only when it is a number above zero. The page does not print a "left" count. `remaining: 0` on a size strikes that size and disables it. A product with `status` `soldout` does the same for every size. There is no countdown. `presaleEndsAt` is printed as a date. If that instant has passed, the button is Pre-order closed (at build time, and again once when the page loads).

A shot may set `"render": true`. That flag is for a generated frame only. See Images.

## Square

Use one payment link per variant (one design, one color, one size). In Square, set the link's `location_id` to `squareLocationId`, the line item `catalog_object_id` to that size's item variation, and `ask_for_shipping_address` to true.

Do not sell a color from one link and collect the size in a custom field. Payment links allow two free-text fields. Those fields do not split inventory, and the buyer can edit them.

Track inventory on the variation. Set a physical count at the configured location for each size. The size counts should add up to that color's `runSize`. Put the same remaining count in `products.json`, and update it as orders come in. Also set the inventory cap on the Square item. This site cannot stop Square from taking another payment on its own.

Square's CreatePaymentLink API does not reliably refuse a payment when tracked inventory hits zero. Links made from the Dashboard "Sell an item" flow do recheck sold-out state. Treat the on-site count as a display, and the Square item as the cap you still have to maintain.

Not built: a server endpoint that copies remaining stock from the Square Inventory API.

No card fields and no Square secrets belong in this repo.

## Images

The first hoodie image is a real front photo, `front-cutout.png`, background removed. Transparent padding is trimmed. Garment pixels stay. It is the hero and the only zoom source. `scripts/optimize.mjs` writes AVIF and WebP at 480, 768, and 1024. It does not upscale, and it does not write a 160w file. Close-ups at 2000px need a new master. Zoom stops at the image's natural width.

Back, side, and the three-quarter view are renders. Set `render` to true on each. The page prints "Render, final may vary" on that image and the alt text starts with "Render:". Three-quarter is a view radio, the same kind as Front, Back, and Side. It is not the hero and it does not zoom. Do not describe a generated frame as a photograph of the finished garment. The PNG masters for those renders are not in the repo.

The homepage shows the turntable, with the first frame visible, and links that image to the product page. The render tag sits under those frames. The product page does not put a turntable frame `src` in the initial HTML.

The 3D view is a control labeled "3D view". It loads `/vendor/model-viewer.min.js` and `hoodie-3d.glb` only after that control is chosen. While it loads, one status line says "Loading 3D view." If the file fails, that same line says "3D view did not load." The line stays in the page and only its text changes. Retry is the next control, not inside that line, and focus returns to the 3D box. The page also says "Arrow keys rotate." The "Render, final may vary" tag sits under the 3D view and the turntable. The script is self-hosted. `environment-image` is `neutral`, so the viewer does not fetch a remote HDR. The GLB is meshopt-compressed and still uses WebP textures. The meshopt decoder is self-hosted at `/vendor/meshopt_decoder.js`. There is no Draco or KTX2 decoder, and the page does not use gstatic. The camera opens on the front. If WebGL is missing, the same control shows the turntable, 24 frames at about 800px, one frame at a time. Those frame paths come from the prefix and the count, and a listed product keeps every frame in `dist/`. Nothing in that view auto-rotates. Arrow keys orbit the model, or step the frames, and the focus ring stays visible. `reveal="immediate"` is not used.

`npm run build` copies a media file into `dist/` only when a built page references it. The listed hoodie keeps the front photo, the render views, the GLB, the 24 turntable frames, and `/vendor/`. An empty catalog still leaves those files and `/vendor/` out of `dist/`. Shop cards show `From` plus the lowest size price, and they do not show a Total line.

## What to provide before launch

- Logo file, if the typed wordmark should be replaced
- A product name for every hoodie that ships. `check-dist` rejects a blank name.
- Contact email or Instagram, before the Contact page should appear
- About text, if any
- Returns policy and delay policy, only when those sentences are real
- `statementDescriptor`, the card-statement name, before Shipping or Privacy should mention it
- What Square shares with the seller, and what the host logs, only if those sentences should be published
- Run size, remaining count, and pre-order end date, only when those facts are real
- A `/thanks/` page, only if the Square links should return there. This site does not have one, and it does not redirect.

## Hostinger

Upload everything inside `dist/`, including `.htaccess`. The server uses `index.html` in each directory. Missing paths use `404.html`. There is no single-page catch-all.
