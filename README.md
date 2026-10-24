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
| `email`, `instagram` | Hidden when empty. |
| `about` | Hidden when empty. The founder credit still shows. |
| `shippingBody`, `returnsBody`, `sizeGuide` | Hidden when empty. |
| `timeZone` | Used to print a pre-order end date. |

Current Square location id in config: L951MA40J026G (Valdosta). The built pages do not print it. Page templates do not contain the id. Change `squareLocationId` in this file if the merchant account moves to the LLC.

## Products

`src/data/products.json` ships as `[]`. An empty catalog shows "First drop coming soon." Fill the file, then rebuild. Prices are integer US cents. `null` means the price is unset and the page shows no price. `checkoutUrl` is a Square hosted payment link. An empty string, or any url that is not `http:` or `https:`, leaves the button disabled.

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
      "presalePrice": null,
      "regularPrice": null,
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

`runSize` and `remaining` render only when they are numbers above zero. `remaining: 0` marks that color sold out and disables Buy. There is no countdown. `presaleEndsAt` is printed as a date. If that instant has passed, the button is Pre-order closed (at build time, and again once when the page loads).

## Square

Use one payment link per variant (one design, one color, one size). In Square, set the link's `location_id` to `squareLocationId`, the line item `catalog_object_id` to that size's item variation, and `ask_for_shipping_address` to true.

Do not sell a color from one link and collect the size in a custom field. Payment links allow two free-text fields. Those fields do not split inventory, and the buyer can edit them.

Track inventory on the variation. Set a physical count at the configured location for each size. The size counts should add up to that color's `runSize`. Put the same remaining count in `products.json`, and update it as orders come in. Also set the inventory cap on the Square item. This site cannot stop Square from taking another payment on its own.

Square's CreatePaymentLink API does not reliably refuse a payment when tracked inventory hits zero. Links made from the Dashboard "Sell an item" flow do recheck sold-out state. Treat the on-site count as a display, and the Square item as the cap you still have to maintain.

Not built: a server endpoint that copies remaining stock from the Square Inventory API.

No card fields and no Square secrets belong in this repo.

## Images

The master photo is 1024×1536. The cutout used on the site is 941×1022. `scripts/optimize.mjs` writes AVIF and WebP at 480, 768, and the native width. It does not upscale. Close-ups at 2000px need a new master.

Ghost frames still to supply, for each design and each color: front, back, side, detail crops, and an optional 36-frame spin. The gallery and spin player are already in the page. They stay empty until those files exist.

## What to provide before launch

- Logo file, if the typed wordmark should be replaced
- Product photos from the ghost list, masters at least 2000px wide
- Product names
- Prices in cents
- Sizes, and one Square payment link per size
- Contact email
- Instagram handle
- About text, if any
- Shipping text, returns text, and size-guide measurements
- Run size, remaining count, ship window, and pre-order end date, only when those facts are real

## Hostinger

Upload everything inside `dist/`, including `.htaccess`. The server uses `index.html` in each directory. Missing paths use `404.html`. There is no single-page catch-all.
