# Saffron & Crumbs

Static bakery storefront with a homepage carousel, full catalogue, 14 product detail pages, and a two-column About Us page.

## Local development

Run `npm install`, then `npm run dev` and open http://localhost:5173.

- `npm run build` regenerates catalogue, detail and About Us pages.
- `npm test` runs DOM integration checks for navigation, messages, cart persistence, ingredient isolation and market selection.

## Content and assets

- `data/products.json`: product names, descriptions, images and CAD preview prices.
- `scripts/build-pages.mjs`: shared full-page templates.
- `dist/index.html` and `dist/app.js`: homepage carousel and ingredient animation.
- `dist/store.js`: cart, message options, header sizing, shared dialogs and country selector.
- `dist/assets/catalogue/studio/`: 14 matching transparent product photographs, used by both catalogue and detail pages.
- `dist/assets/founders/`: two enhanced transparent founder portraits and classical-painted eye strips.
- `docs/imagegen-prompts.json`: built-in imagegen prompts and final workspace asset paths.
- `docs/design-notes.md`: retained earlier design notes and generation prompts.

The About Us story is a draft narrative invented at the user's request. No names, locations, founding dates or external business claims have been added.

## Country selector and pricing

The borderless selector beside the cart offers Canada (CAD) and United States (USD), with flag, chevron and selection checkmark. Manual selection persists across pages and reloads. A supplied country hint (`window.SaffronDetectedCountry` or the HTML `data-country` attribute) takes precedence over browser locale/time-zone fallback, while a saved customer choice takes precedence over detection.

CAD product prices and add-on fees are the single source of truth. USD charges are converted once into integer cents using the dated Bank of Canada rate in `data/exchange-rates.json` (2026-10-09: 1 USD = 1.4271 CAD). Update this rate with newly published data; it is a dated reference, not a live quote. Selecting a market recalculates product, assortment, add-on and cart amounts.

A future Shopify integration must fetch market-specific product prices, create/update the cart in the selected country context and retain the market through Shopify checkout where supported. Local placeholder prices must not be used as Shopify market pricing. No Shopify connection or checkout is currently implemented.

## Design behavior

The logo is the home link. The glass header has its own layout space. Hero selection persists on refresh. Pistachios, petals and kaju katli pieces belong only to their respective slides, with an outward burst and gentle float; reduced-motion preferences stop animation. Footer links align left and copyright aligns right. The monogram favicon uses a high-contrast dusty-rose tile.

Product pages show Catalogue breadcrumbs above the title, with a clearly styled clickable link. Optional printed or handwritten calligraphy messages stay with their own cart lines.

WhatsApp chat: the floating launcher opens a compact panel linked to `https://wa.me/14166628709`. It opens the business chat without sending a message automatically. Contact information uses the supplied Mississauga address.

The Diwali box builder uses four editable dropdown slots, accepts repeated flavours, and saves each assortment with its cart line. The price is the sum of individually priced cups plus selected extras, multiplied by box quantity. Stable flavour identifiers and readable breakdowns are stored in line item properties. `SaffronStore.toShopifyCartItems(lineId, config)` prepares individually priced cup components and paid add-on variants using real variant mappings; it rejects unavailable, mismatched-price or mismatched-currency mappings. A fixed-price box variant cannot charge this dynamic assortment, and properties do not change checkout prices. The store must supply actual component/add-on variants and implement grouping/fulfillment for this payload before checkout can be connected. No live Shopify checkout verification is possible in this prototype.
