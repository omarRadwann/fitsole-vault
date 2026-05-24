import Header from '@/components/site/Header'
import VaultExperience from '@/components/vault/VaultExperience'
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

function Footer() {
  return (
    <footer className="border-t border-vault-border mt-16 py-12 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row justify-between items-start gap-8 mb-10">
          <div>
            <p className="font-display text-2xl sm:text-3xl tracking-[0.2em] text-vault-cream mb-1">FITSOLE</p>
            <p className="text-xs text-vault-muted">Born in Cairo. Built for Sneakerheads.</p>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4">
            {[
              { label: 'New Arrivals', href: '#new-arrivals' },
              { label: 'Best Sellers', href: '#best-sellers' },
              { label: 'Brands', href: '#brands' },
              { label: 'Sale', href: '#sale' },
              { label: 'Shop All', href: '#drop-wall' },
            ].map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="text-[11px] tracking-[0.15em] uppercase text-vault-muted hover:text-vault-cream transition-colors duration-200"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <div className="vault-gold-line opacity-30" />
        <div className="mt-6 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-[10px] text-vault-cream/60">
            © 2025 FitSole. All rights reserved. Cairo, Egypt.
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
