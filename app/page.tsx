import Header from '@/components/site/Header'
import VaultExperience from '@/components/vault/VaultExperience'
import ProductWall from '@/components/commerce/ProductWall'
import ShopWall from '@/components/commerce/ShopWall'
import BrandStrip from '@/components/site/BrandStrip'
import { newArrivals, bestSellers, onSale, products } from '@/lib/products'
import Link from 'next/link'

function TrustSection() {
  const points = [
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
          <path d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.955 11.955 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: '100% Authentic',
      desc: 'Every pair is verified before it reaches you.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
          <path d="M15.59 14.37a6 6 0 01-5.84 7.38v-4.8m5.84-2.58a14.98 14.98 0 006.16-12.12A14.98 14.98 0 009.631 8.41m5.96 5.96a14.926 14.926 0 01-5.841 2.58m-.119-8.54a6 6 0 00-7.381 5.84h4.8m2.581-5.84a14.927 14.927 0 00-2.58 5.84m2.699 2.7c-.103.021-.207.041-.311.06a15.09 15.09 0 01-2.448-2.448 14.9 14.9 0 01.06-.312m-2.24 2.39a4.493 4.493 0 00-1.757 4.306 4.493 4.493 0 004.306-1.758M16.5 9a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Fast Delivery',
      desc: 'Cairo & nationwide delivery on all orders.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
          <path d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Clean Exchange',
      desc: 'Hassle-free returns and size exchanges.',
    },
    {
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="w-5 h-5" aria-hidden="true">
          <path d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
      title: 'Installments',
      desc: 'Split your purchase with easy payment plans.',
    },
  ]

  return (
    <section className="border-y border-vault-border py-14 px-6 lg:px-8">
      <div className="max-w-7xl mx-auto grid grid-cols-2 lg:grid-cols-4 gap-8">
        {points.map((point) => (
          <div key={point.title} className="flex flex-col items-start gap-3">
            <div className="text-vault-gold">{point.icon}</div>
            <div>
              <p className="text-sm font-medium text-vault-cream mb-1">{point.title}</p>
              <p className="text-xs text-vault-muted leading-relaxed">{point.desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

function CategoryNav() {
  const cats = [
    { label: 'New Drops', count: `${newArrivals.length} pairs`, href: '#new-arrivals' },
    { label: 'Best Sellers', count: `${bestSellers.length} pairs`, href: '#best-sellers' },
    { label: 'On Sale', count: `${onSale.length} pairs`, href: '#sale' },
    { label: 'Shop All', count: `${products.length} pairs`, href: '#drop-wall' },
  ]

  return (
    <section className="py-16 px-6 lg:px-8 max-w-7xl mx-auto">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cats.map((cat) => (
          <Link
            key={cat.label}
            href={cat.href}
            className="group flex flex-col gap-2 p-6 bg-vault-surface border border-vault-border rounded hover:border-vault-gold/40 hover:bg-vault-card transition-all duration-200"
          >
            <span className="text-xs tracking-[0.2em] uppercase text-vault-muted group-hover:text-vault-gold transition-colors duration-200">
              Shop
            </span>
            <span className="font-display text-2xl font-semibold text-vault-cream">
              {cat.label}
            </span>
            <span className="text-[11px] text-vault-muted/60">{cat.count}</span>
            <span className="mt-2 text-[10px] tracking-[0.15em] uppercase text-vault-gold/60 group-hover:text-vault-gold transition-colors duration-200">
              Browse →
            </span>
          </Link>
        ))}
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
            <p className="font-display text-lg tracking-[0.2em] text-vault-cream mb-1">FITSOLE</p>
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
          <p className="text-[10px] text-vault-muted/50">
            © 2025 FitSole. All rights reserved. Cairo, Egypt.
          </p>
          <p className="text-[10px] text-vault-muted/50 flex items-center gap-1.5">
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
