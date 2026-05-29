import Header from '@/components/site/Header'
import VaultExperience from '@/components/vault/VaultExperience'
import SkyBridge from '@/components/vault/SkyBridge'
import ProductWall from '@/components/commerce/ProductWall'
import ShopWall from '@/components/commerce/ShopWall'
import BrandStrip from '@/components/site/BrandStrip'
import FeaturedUnboxing from '@/components/showroom/FeaturedUnboxing'
import { newArrivals, bestSellers, onSale, products } from '@/lib/products'
import Image from 'next/image'
import Link from 'next/link'

function TrustSection() {
  // Divided editorial rail — gold hairlines instead of boxes, mono eyebrow +
  // serif promise + concrete line. Drops the generic monoline icon grid.
  const points = [
    { k: 'Authenticity', title: '100% authentic', desc: 'Every pair verified before it ships to you.' },
    { k: 'Delivery', title: 'Cairo & nationwide', desc: 'Fast delivery on every order.' },
    { k: 'Exchange', title: 'Easy size swaps', desc: 'Hassle-free returns and exchanges.' },
    { k: 'Payment', title: 'Pay in 4', desc: 'Split any order into interest-free installments.' },
  ]

  return (
    <section className="border-y border-vault-border">
      <div className="reveal-up max-w-7xl mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 divide-y divide-vault-border sm:divide-y-0 sm:divide-x">
        {points.map((point) => (
          <div key={point.k} className="px-6 lg:px-8 py-10 flex flex-col gap-3">
            <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-vault-gold/70">
              {point.k}
            </span>
            <p className="font-display text-xl text-vault-cream leading-tight">{point.title}</p>
            <p className="text-sm text-vault-cream/55 leading-relaxed max-w-[28ch]">{point.desc}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoryNav() {
  // Editorial "collections index" — replaces the generic 4-equal-card grid.
  // Left-aligned numbered list, CSS hover-reveal of a representative pair, gold
  // hairline dividers. No card boxes, no trust-eroding "N pairs" counts.
  const cats = [
    { n: '01', label: 'New Drops', line: 'This week’s arrivals', href: '#new-arrivals', img: newArrivals[0]?.image },
    { n: '02', label: 'Best Sellers', line: 'Cairo’s most-wanted', href: '#best-sellers', img: bestSellers[0]?.image },
    { n: '03', label: 'On Sale', line: 'Marked down, still heat', href: '#sale', img: onSale[0]?.image },
    { n: '04', label: 'The Wall', line: 'The full library', href: '#drop-wall', img: products[0]?.image },
  ]

  return (
    <section className="py-20 sm:py-28 px-6 lg:px-8">
      <div className="reveal-up max-w-7xl mx-auto">
        <p className="text-[10px] tracking-[0.4em] uppercase text-vault-gold/70 mb-10">The Collections</p>
        <div className="border-t border-vault-border">
          {cats.map((cat) => (
            <Link
              key={cat.label}
              href={cat.href}
              className="group relative flex items-center justify-between gap-6 border-b border-vault-border py-7 sm:py-9 transition-colors duration-300 hover:bg-vault-surface/40"
            >
              <div className="flex items-baseline gap-5 sm:gap-8 min-w-0">
                <span className="font-mono text-xs text-vault-muted tabular-nums shrink-0 transition-colors duration-300 group-hover:text-vault-gold">
                  {cat.n}
                </span>
                <span className="font-display text-3xl sm:text-5xl font-semibold text-vault-cream leading-none tracking-tight transition-transform duration-300 group-hover:translate-x-2">
                  {cat.label}
                </span>
              </div>
              <span className="hidden md:block text-sm text-vault-cream/55 truncate">{cat.line}</span>
              <div className="flex items-center gap-5 shrink-0 text-vault-gold/50 transition-colors duration-300 group-hover:text-vault-gold">
                {cat.img && (
                  <span className="hidden sm:block relative w-16 h-16 opacity-0 -translate-x-3 transition-all duration-300 group-hover:opacity-100 group-hover:translate-x-0">
                    <Image src={cat.img} alt="" fill sizes="64px" className="object-contain" />
                  </span>
                )}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5 transition-transform duration-300 group-hover:translate-x-1" aria-hidden="true">
                  <path d="M5 12h14M13 6l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  )
}

const STORE_URL = 'https://fitsole.shop'

function Footer() {
  const columns: { heading: string; links: { label: string; href: string; external?: boolean }[] }[] = [
    {
      heading: 'Shop',
      links: [
        { label: 'New Arrivals', href: '#new-arrivals' },
        { label: 'Best Sellers', href: '#best-sellers' },
        { label: 'On Sale', href: '#sale' },
        { label: 'The Wall', href: '#drop-wall' },
        { label: 'Brands', href: '#brands' },
      ],
    },
    {
      heading: 'Help & Info',
      links: [
        { label: 'Authenticity Guarantee', href: STORE_URL, external: true },
        { label: 'Shipping & Delivery', href: STORE_URL, external: true },
        { label: 'Returns & Exchanges', href: STORE_URL, external: true },
        { label: 'Size Guide', href: STORE_URL, external: true },
        { label: 'Track Your Order', href: STORE_URL, external: true },
      ],
    },
  ]

  return (
    <footer className="border-t border-vault-border mt-16 pt-14 pb-12 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10 lg:gap-8">
          {/* Brand */}
          <div>
            <p className="font-display text-2xl sm:text-3xl tracking-[0.2em] text-vault-cream mb-2">FITSOLE</p>
            <p className="text-xs text-vault-muted leading-relaxed max-w-[26ch]">
              Born in Cairo. Built for sneakerheads. Every pair authenticated before it ships.
            </p>
          </div>

          {/* Link columns */}
          {columns.map((col) => (
            <nav key={col.heading} aria-label={col.heading}>
              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-vault-gold/70 mb-4">{col.heading}</p>
              <ul className="flex flex-col gap-2.5">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      {...(l.external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="text-[12px] text-vault-cream/70 hover:text-vault-cream transition-colors duration-200"
                    >
                      {l.label}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}

          {/* Newsletter */}
          <div>
            <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-vault-gold/70 mb-4">The Collective</p>
            <p className="text-xs text-vault-muted leading-relaxed mb-4 max-w-[28ch]">
              Early access to drops, restocks, and Cairo-only releases.
            </p>
            <form action={STORE_URL} target="_blank" className="flex items-center gap-2">
              <input
                type="email"
                name="email"
                required
                placeholder="you@email.com"
                aria-label="Email address"
                className="min-w-0 flex-1 bg-vault-surface border border-vault-border rounded-sm px-3 h-10 text-sm text-vault-cream placeholder:text-vault-muted outline-none focus:border-vault-gold/50 transition-colors"
              />
              <button
                type="submit"
                className="shrink-0 h-10 px-4 text-[11px] tracking-[0.2em] uppercase font-medium bg-vault-gold text-vault-black hover:bg-vault-cream transition-colors duration-200 rounded-sm"
              >
                Join
              </button>
            </form>
          </div>
        </div>

        <div className="vault-gold-line opacity-30 mt-12" />
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-vault-cream/60">
            © 2026 FitSole. All rights reserved. Cairo, Egypt.
          </p>
          <p className="text-[10px] text-vault-cream/60 flex items-center gap-1.5">
            <span className="text-vault-scan">✓</span>
            All products 100% authenticated
          </p>
        </div>
      </div>
    </footer>
  )
}

export default function HomePage() {
  return (
    <>
      <Header />

      <main>
        {/* Vault Walk — the cinematic 3D experience */}
        <VaultExperience />

        {/* Sky-Moment — rises out of the vault's black into a Cairo dawn (procedural
            low-poly skyline + brass cube), bridging the cinematic into the shop. */}
        <SkyBridge />

        {/* Featured drop — cinematic AI unboxing of the hero pair (Nano Banana 2 -> Kling 3.0) */}
        <FeaturedUnboxing />

        {/* Trust signals */}
        <TrustSection />

        {/* Category shortcuts */}
        <CategoryNav />

        {/* Shop by brand */}
        <BrandStrip />

        {/* New Arrivals */}
        <ProductWall
          id="new-arrivals"
          filter="new"
          title="New Arrivals."
          subtitle="Just Dropped"
          limit={8}
          lead
        />

        {/* Best Sellers */}
        <ProductWall
          id="best-sellers"
          filter="best"
          title="Best Sellers."
          subtitle="Community Favorites"
          limit={4}
        />

        {/* Sale */}
        <ProductWall
          id="sale"
          filter="sale"
          title="Sale."
          subtitle="Limited Time"
          limit={4}
        />

        {/* All products / drop wall — filterable by collection + brand */}
        <ShopWall id="drop-wall" title="The Wall." subtitle="All Drops" />
      </main>

      <Footer />
    </>
  )
}
