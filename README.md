# Pray4BetterDays

Static storefront for pray4betterdays.com. Vite builds the CSS and JS. A prerender step writes one HTML file per route from `src/data/site.json` and `src/data/products.json`. Upload the contents of `dist/` to Hostinger. Production does not run Node. The client never receives a Square access token.

```bash
npm test
npm run build
npm run preview:fixture
```

`npm run build` also runs `scripts/check-dist.ts`. That check fails if `products.json` is not `[]`, or if `dist/` contains the fixture sentinel, a Square secret prefix, or the Square location id from site config.

`preview:fixture` copies `dist/` to `preview-dist/` and overlays a coming-soon hoodie so the product page can be reviewed. `preview-dist/` is gitignored and is not the site you upload.

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
| `presalePriceCents`, `currency` | First hoodie pre-sale price. 8500 cents, USD ($85.00). No former price. |
| `shippingCost` | Buyer copy. Currently `Free shipping`. Shown near the price, on the total, and on Shipping. |
| `paymentLinkNote` | Owner note only. Not rendered. The Payment Link has no shipping line item. The seller absorbs processing fees, and fees are never shown to buyers. |
| `timeZone` | Used to print a pre-order end date. |

Current Square location id in config: L951MA40J026G (Valdosta). The built pages do not print it. Page templates do not contain the id. Change `squareLocationId` in this file if the merchant account moves to the LLC.

## Products

`src/data/products.json` ships as `[]`. An empty catalog shows "First drop coming soon." and hides the "Shop hoodies" button. Fill the file, then rebuild. `check-dist` fails if a published product has no name.

Prices are integer US cents. The first hoodie pre-sale price is 8500 cents, USD. The page shows that as $85.00, then `Free shipping`, then a total of $85.00. Shipping adds nothing. There is no former-price field. This drop was never sold at another price, so the page cannot show one. A later product with a `null` price still shows no price.

`checkoutUrl` must be `https` on `square.link`, `checkout.square.site`, or `squareup.com` (subdomains of those hosts count). Any other url leaves the button disabled. There is no Payment Link yet.

Pre-order stays disabled until all of these exist: the price, the ship window (`shipEstimate`), `refundPolicy`, `cancelPolicy`, and `returnsBody`, plus a Square link. The "charged now" line is printed under that price only when the Pre-order button is actually on. Shipping does not say it on its own.

The Payment Link, when it is created, has no shipping line item. The seller absorbs processing fees. The site never shows those fees.

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
      "sizes": [{ "id": "m", "label": "M", "sku": "", "checkoutUrl": "" }]
    }
  ]
}
```

`status` is `presale`, `available`, `soldout`, or `comingsoon`. Color ids the page can switch are `black`, `gray`, and `white`. Size ids are `s`, `m`, `l`, `xl`, `2xl`, and `3xl`.

`runSize` renders as "Run of N" only when it is a number above zero. The page does not print a "left" count. `remaining: 0` marks that color sold out and disables Buy. There is no countdown. `presaleEndsAt` is printed as a date. If that instant has passed, the button is Pre-order closed (at build time, and again once when the page loads).

A shot may set `"render": true`. That flag is for a generated frame only. See Images.

## Square

Use one payment link per variant (one design, one color, one size). In Square, set the link's `location_id` to `squareLocationId`, the line item `catalog_object_id` to that size's item variation, and `ask_for_shipping_address` to true.

Do not sell a color from one link and collect the size in a custom field. Payment links allow two free-text fields. Those fields do not split inventory, and the buyer can edit them.

Track inventory on the variation. Set a physical count at the configured location for each size. The size counts should add up to that color's `runSize`. Put the same remaining count in `products.json`, and update it as orders come in. Also set the inventory cap on the Square item. This site cannot stop Square from taking another payment on its own.

Square's CreatePaymentLink API does not reliably refuse a payment when tracked inventory hits zero. Links made from the Dashboard "Sell an item" flow do recheck sold-out state. Treat the on-site count as a display, and the Square item as the cap you still have to maintain.

Not built: a server endpoint that copies remaining stock from the Square Inventory API.

No card fields and no Square secrets belong in this repo.

## Images

The first hoodie image is a real front photo. Its alt text describes the product. The master is 1024×1536. The cutout on the site is 941×1022, with a transparent background. `scripts/optimize.mjs` writes AVIF and WebP at 480, 768, and the native width. It does not upscale. Close-ups at 2000px need a new master. Zoom stops at the image's natural width.

Each design and color can include a front, a back, a side, detail crops, and an optional spin. Set `render` to true on any generated frame (a back view, a 3D view, or a spin made from the photo). The page then prints "Render, final may vary" on that image and prefixes the alt text with "Render:". A real photo leaves `render` unset. Do not describe a generated frame as a photograph of the finished garment.

## What to provide before launch

- Logo file, if the typed wordmark should be replaced
- A product name for every hoodie that ships. `check-dist` rejects a blank name.
- Sizes, and one Square payment link per size. Do not add a shipping line item. The buyer pays $85.00.
- Contact email or Instagram, before the Contact page should appear
- About text, if any
- Ship window, refund policy, cancel policy, and returns policy, before Pre-order can turn on
- Delay policy, only if you want that paragraph published
- `statementDescriptor`, the card-statement name, before Shipping or Privacy should mention it
- What Square shares with the seller, and what the host logs, only if those sentences should be published
- Run size, remaining count, and pre-order end date, only when those facts are real
- Real photos, plus any generated views with `render` set

## Hostinger

Upload everything inside `dist/`, including `.htaccess`. The server uses `index.html` in each directory. Missing paths use `404.html`. There is no single-page catch-all.
