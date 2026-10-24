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
  /** Generated or rendered frame. Real photos leave this unset. */
  render?: boolean
}

export interface SizeOption {
  id: string
  label: string
  sku: string
  checkoutUrl: string
  /** Cents for this size. Null falls back to the base price. */
  priceCents?: number | null
  /** Square Payment Link for this size. Null until the link exists. */
  paymentLink?: string | null
  /** Units left. 0 is sold out. Null means the count is not in yet. */
  remaining?: number | null
}

export interface Turntable {
  alt: string
  width: number
  height: number
  prefix: string
  count: number
}

export interface ModelView {
  src: string
  alt: string
  spin: Turntable
}

export interface ConfigSize {
  id: string
  label: string
  priceCents: number
  paymentLink: string | null
}

export interface Colorway {
  id: string
  name: string
  price: number | null
  presalePrice: number | null
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
  /** Generated 3D view. Absent until a model is supplied. */
  model?: ModelView | null
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
  shipWindow: string
  refundPolicy: string
  cancelPolicy: string
  delayPolicy: string
  returnsBody: string
  statementDescriptor: string
  squareShareNote: string
  hostingNote: string
  presalePriceCents: number
  currency: string
  shippingCost: string
  /**
   * True when the size price already includes tax.
   * False when Square adds tax on top.
   * Null until that is known. Preview shows [tax] and does not guess.
   */
  taxIncluded: boolean | null
  sizes: ConfigSize[]
  /** Owner note for the Payment Link. Never rendered. */
  paymentLinkNote: string
  sizeGuide: SizeGuideRow[]
}

export interface PriceView {
  current: string | null
}

export type Cta =
  | { kind: "link"; label: "Pre-order" | "Buy now"; href: string }
  | { kind: "disabled"; label: "Sold out" | "Coming soon" | "Pre-order closed" }
