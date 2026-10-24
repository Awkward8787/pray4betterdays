export type Status = "presale" | "available" | "soldout" | "comingsoon"

export interface SourceFile {
  src: string
  width: number
}

export interface Shot {
  alt: string
  width: number
  height: number
  zoom: string
  avif: SourceFile[]
  webp: SourceFile[]
}

export interface SizeOption {
  id: string
  label: string
  sku: string
  checkoutUrl: string
}

export interface Colorway {
  id: string
  name: string
  price: number | null
  presalePrice: number | null
  regularPrice: number | null
  currency: string
  runSize: number | null
  remaining: number | null
  images: {
    front: Shot | null
    back: Shot | null
    side: Shot | null
    details: Shot[]
  }
  spin: Shot[]
  sizes: SizeOption[]
}

export interface Product {
  name: string
  slug: string
  status: Status
  description: string
  shipEstimate: string
  presaleEndsAt: string | null
  colors: Colorway[]
}

export interface SizeGuideRow {
  label: string
  chest: string
  length: string
  sleeve: string
}

export interface Site {
  brand: string
  legalName: string
  founder: string
  year: number
  domain: string
  email: string
  instagram: string
  squareLocationName: string
  squareLocationId: string
  timeZone: string
  about: string
  shippingBody: string
  returnsBody: string
  sizeGuide: SizeGuideRow[]
}

export interface PriceView {
  current: string | null
  compare: string | null
}

export type Cta =
  | { kind: "link"; label: "Pre-order" | "Buy now"; href: string }
  | { kind: "disabled"; label: "Sold out" | "Coming soon" | "Pre-order closed" }
