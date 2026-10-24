# Design

Pray4BetterDays is a phone-first hoodie lookbook. Buyers arrive from Instagram. The page stays off-black, the garment does the talking, and the wordmark is the logo until a logo file exists.

Dials: energy 3, rhythm 3, motion 1.

## Direction

Hell Fire is the reference for feel: a thin header, a lot of black, and the product larger than the chrome. This site does not copy that shop's logo, artwork, copy, layout, or code.

What is original here: the stacked Pray4 / BetterDays wordmark, the rhinestone praying-hands hoodie, and hosted Square checkout (no bag). The supplied hoodie image is a real front photo, and it is the only zoom source. A generated back, side, three-quarter view, or 3D view is marked with "Render, final may vary", and its alt text starts with "Render:". The page does not present a generated frame as a photograph. The 3D control loads only after it is chosen, shows a loading line and a retry line, says that arrow keys rotate, and does not auto-rotate. Without WebGL it shows the turntable frames instead.

The public story stays empty until it is written in `src/data/site.json`. The About page only credits Aniyla Evans, founder and designer. The seller named in the footer, Privacy, and Shipping is Pray 4 Better Days LLC. The brand in the UI stays Pray4BetterDays.

## Type

Three faces, self-hosted, SIL Open Font License, via Fontsource.

- Pirata One: logo and headings of four words or fewer.
- Archivo: body, prices, buttons, navigation.
- IBM Plex Mono: sizes, SKUs, run counts.

Body size is 1rem. Display size starts at 2.5rem. Measure is 65ch. No script face in the UI.

## Color

Every hex lives in `src/styles/tokens.css`.

- Base `#0b0b0c`, raised `#161618`, text `#f2f2f0`.
- Muted `#9a9a9e` (at least 4.5:1 on base and raised).
- Outline `#8d8d92` for 1px secondary borders.
- Hairline `#2a2a2d` is decorative only. It fails 3:1 against the base, so it is not the only boundary of a control.

Primary buttons are off-white fill with off-black text. Secondary buttons are a 1px outline. Sold out uses an icon plus the words. One static grain overlay sits on the page background. Corners are square.

## Motion

No countdown. No autoplay. Reduced motion keeps every spin frame on the page and drops transitions. The grain does not animate.
